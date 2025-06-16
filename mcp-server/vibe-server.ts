/**
 * Modern .vibe MCP Server - Clean implementation for AI tool integration
 */

import { Effect, pipe } from 'effect'
import { resolve } from '@std/path'
import { z } from 'zod/v4'
import { detectAITools } from '../tools/index.ts'
import { loadRules } from '../rules/index.ts'
import { UniversalRule } from '../schemas/universal-rule.ts'
import { MemoryTypeSchema } from '../schemas/memory.ts'
import { DIARY_CATEGORIES } from '../schemas/diary.ts'
import { loadMemories, type MemoryMetadataInput, searchMemory, storeMemory } from '../memory/index.ts'
import { initializeSearch, searchDocuments } from '../search/index.ts'
import { createEntry, type DiaryEntryInput, getTimeline, searchDiary } from '../diary/index.ts'

export class VibeServer {
  private projectPath: string
  private vibePath: string

  constructor(projectPath?: string) {
    this.projectPath = projectPath || Deno.cwd()
    this.vibePath = resolve(this.projectPath, '.vibe')
  }

  async initialize() {
    console.log('🔧 Initializing .vibe MCP server...')
    // Ensure .vibe directory exists
    try {
      await Deno.stat(this.vibePath)
    } catch {
      console.warn('⚠️ .vibe directory not found, some features may be limited')
    }
  }

  async handleToolCall(name: string, args: Record<string, unknown>) {
    try {
      switch (name) {
        case 'get-project-context':
          return await this.getProjectContext(args)
        case 'get-rules':
          return await this.getRules(args)
        case 'get-tools':
          return await this.getDetectedTools(args)

        // Memory tools
        case 'search-memory':
          return await this.searchMemory(args)
        case 'add-memory':
          return await this.addMemory(args)
        case 'list-memories':
          return await this.listMemories(args)

        // Search tools
        case 'global-search':
          return await this.globalSearch(args)

        // Diary tools
        case 'search-diary':
          return await this.searchDiary(args)
        case 'add-diary-entry':
          return await this.addDiaryEntry(args)
        case 'get-diary-timeline':
          return await this.getDiaryTimeline(args)

        default:
          throw new Error(`Unknown tool: ${name}`)
      }
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        tool: name,
        timestamp: new Date().toISOString(),
      }
    }
  }

  async handleResourceRead(uri: string) {
    const [scheme, path] = uri.split('://', 2)

    if (scheme === 'vibe' && path) {
      return await this.readVibeResource(path)
    }

    throw new Error(`Unsupported resource scheme: ${scheme}`)
  }

  async listResources() {
    return [
      {
        uri: 'vibe://rules',
        name: 'Active Rules',
        description: 'Currently active universal rules for this project',
        mimeType: 'application/json',
      },
      {
        uri: 'vibe://tools',
        name: 'Detected AI Tools',
        description: 'AI coding tools detected in this project',
        mimeType: 'application/json',
      },
      {
        uri: 'vibe://status',
        name: 'Project Status',
        description: 'Overall .vibe project status and configuration',
        mimeType: 'application/json',
      },
      {
        uri: 'vibe://memory/recent',
        name: 'Recent Memory Entries',
        description: 'Recently stored memory entries and conversations',
        mimeType: 'application/json',
      },
      {
        uri: 'vibe://diary/timeline',
        name: 'Decision Diary Timeline',
        description: 'Chronological timeline of architectural decisions',
        mimeType: 'application/json',
      },
      {
        uri: 'vibe://search/index',
        name: 'Search Index Status',
        description: 'Current search index statistics and status',
        mimeType: 'application/json',
      },
    ]
  }

  async listTools() {
    return [
      {
        name: 'get-project-context',
        description: 'Get comprehensive project context including rules and detected tools',
        inputSchema: {
          type: 'object',
          properties: {
            includeRules: { type: 'boolean', default: true },
            includeTools: { type: 'boolean', default: true },
          },
        },
      },
      {
        name: 'get-rules',
        description: 'Get all universal rules for this project',
        inputSchema: {
          type: 'object',
          properties: {
            activeOnly: { type: 'boolean', default: false },
          },
        },
      },
      {
        name: 'get-tools',
        description: 'Get detected AI tools and their configurations',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },

      // Memory tools
      {
        name: 'search-memory',
        description: 'Search through stored memory entries with semantic matching',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query text' },
            type: {
              type: 'array',
              items: { type: 'string' },
              description: 'Memory types to filter by',
            },
            tags: { type: 'array', items: { type: 'string' }, description: 'Tags to filter by' },
            limit: { type: 'number', default: 10, description: 'Maximum number of results' },
          },
          required: ['query'],
        },
      },
      {
        name: 'add-memory',
        description: 'Store a new memory entry for future reference',
        inputSchema: {
          type: 'object',
          properties: {
            content: { type: 'string', description: 'Memory content to store' },
            type: {
              type: 'string',
              default: 'knowledge',
              description: 'Type of memory (conversation, decision, pattern, etc.)',
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Tags for categorization',
            },
            importance: {
              type: 'string',
              default: 'medium',
              description: 'Importance level (low, medium, high)',
            },
          },
          required: ['content'],
        },
      },
      {
        name: 'list-memories',
        description: 'List stored memory entries with optional filtering',
        inputSchema: {
          type: 'object',
          properties: {
            type: { type: 'string', description: 'Filter by memory type' },
            limit: { type: 'number', default: 20, description: 'Maximum number of results' },
          },
        },
      },

      // Search tools
      {
        name: 'global-search',
        description: 'Search across all .vibe data (memory, diary, rules)',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query text' },
            type: {
              type: 'array',
              items: { type: 'string' },
              description: 'Document types to search (memory, diary, rule)',
            },
            limit: { type: 'number', default: 10, description: 'Maximum number of results' },
          },
          required: ['query'],
        },
      },

      // Diary tools
      {
        name: 'search-diary',
        description: 'Search through architectural decision diary entries',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query text' },
            category: {
              type: 'string',
              description: 'Category to filter by (architecture, design, technology, process)',
            },
            tags: { type: 'array', items: { type: 'string' }, description: 'Tags to filter by' },
            limit: { type: 'number', default: 10, description: 'Maximum number of results' },
          },
          required: ['query'],
        },
      },
      {
        name: 'add-diary-entry',
        description: 'Add a new architectural decision to the diary',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Decision title' },
            category: {
              type: 'string',
              default: 'decision',
              description: 'Category (architecture, design, technology, process)',
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Tags for categorization',
            },
            problem: {
              type: 'object',
              properties: {
                description: { type: 'string', description: 'Problem description' },
                context: { type: 'string', description: 'Context information' },
                constraints: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Constraints list',
                },
              },
              required: ['description', 'context'],
            },
            decision: {
              type: 'object',
              properties: {
                chosen: { type: 'string', description: 'Chosen decision' },
                rationale: { type: 'string', description: 'Decision rationale' },
                alternatives: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Alternative options considered',
                },
              },
              required: ['chosen', 'rationale'],
            },
          },
          required: ['title', 'problem', 'decision'],
        },
      },
      {
        name: 'get-diary-timeline',
        description: 'Get chronological timeline of diary entries',
        inputSchema: {
          type: 'object',
          properties: {
            since: { type: 'string', description: 'Start date (ISO string)' },
            until: { type: 'string', description: 'End date (ISO string)' },
            limit: { type: 'number', default: 20, description: 'Maximum number of results' },
          },
        },
      },
    ]
  }

  private async getProjectContext(args: Record<string, unknown>) {
    const schema = z.object({
      includeRules: z.boolean().default(true),
      includeTools: z.boolean().default(true),
    })

    const params = schema.parse(args)

    interface StatusResult {
      project: {
        path: string
        vibePath: string
        timestamp: string
      }
      rules?: {
        total: number
        items: UniversalRule[]
      }
      tools?: {
        detected: Awaited<ReturnType<typeof detectAITools>>
        active: Awaited<ReturnType<typeof detectAITools>>
      }
    }

    const result: StatusResult = {
      project: {
        path: this.projectPath,
        vibePath: this.vibePath,
        timestamp: new Date().toISOString(),
      },
    }

    if (params.includeRules) {
      try {
        const rules = await Effect.runPromise(loadRules(this.vibePath))
        result.rules = {
          total: rules.length,
          active: rules.filter((r: UniversalRule) => r.application.mode === 'always'),
          byPriority: {
            high: rules.filter((r: UniversalRule) => r.content.priority === 'high'),
            medium: rules.filter((r: UniversalRule) => r.content.priority === 'medium'),
            low: rules.filter((r: UniversalRule) => r.content.priority === 'low'),
          },
        }
      } catch (error) {
        result.rules = { error: 'Failed to load rules', details: error }
      }
    }

    if (params.includeTools) {
      try {
        const tools = await Effect.runPromise(detectAITools(this.projectPath))
        result.tools = {
          detected: tools,
          count: tools.length,
        }
      } catch (error) {
        result.tools = { error: 'Failed to detect tools', details: error }
      }
    }

    return result
  }

  private async getRules(args: Record<string, unknown>) {
    const schema = z.object({
      activeOnly: z.boolean().default(false),
    })

    const params = schema.parse(args)

    try {
      const rules = await Effect.runPromise(loadRules(this.vibePath))

      if (params.activeOnly) {
        return rules.filter((r: UniversalRule) => r.application.mode === 'always')
      }

      return rules
    } catch (error) {
      return {
        error: 'Failed to load rules',
        details: error instanceof Error ? error.message : error,
      }
    }
  }

  private async getDetectedTools(args: Record<string, unknown>) {
    try {
      const tools = await Effect.runPromise(detectAITools(this.projectPath))
      return {
        tools,
        count: tools.length,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      return {
        error: 'Failed to detect AI tools',
        details: error instanceof Error ? error.message : error,
      }
    }
  }

  private async readVibeResource(path: string) {
    switch (path) {
      case 'rules':
        try {
          const rules = await Effect.runPromise(loadRules(this.vibePath))
          return {
            content: JSON.stringify(rules, null, 2),
            mimeType: 'application/json',
          }
        } catch (error) {
          return {
            content: JSON.stringify({ error: 'Failed to load rules', details: error }, null, 2),
            mimeType: 'application/json',
          }
        }

      case 'tools':
        try {
          const tools = await Effect.runPromise(detectAITools(this.projectPath))
          return {
            content: JSON.stringify(tools, null, 2),
            mimeType: 'application/json',
          }
        } catch (error) {
          return {
            content: JSON.stringify({ error: 'Failed to detect tools', details: error }, null, 2),
            mimeType: 'application/json',
          }
        }

      case 'status':
        try {
          const [rules, tools, memories, timeline] = await Promise.all([
            Effect.runPromise(loadRules(this.vibePath)).catch(() => []),
            Effect.runPromise(detectAITools(this.projectPath)).catch(() => []),
            Effect.runPromise(loadMemories(this.projectPath)).catch(() => []),
            Effect.runPromise(getTimeline(this.projectPath)).catch(() => []),
          ])

          const status = {
            project: this.projectPath,
            vibePath: this.vibePath,
            rules: { count: rules.length },
            tools: { count: tools.length },
            memory: { count: memories.length },
            diary: { count: timeline.length },
            timestamp: new Date().toISOString(),
          }

          return {
            content: JSON.stringify(status, null, 2),
            mimeType: 'application/json',
          }
        } catch (error) {
          return {
            content: JSON.stringify({ error: 'Failed to get status', details: error }, null, 2),
            mimeType: 'application/json',
          }
        }

      case 'memory/recent':
        try {
          const memories = await Effect.runPromise(loadMemories(this.projectPath))
          const recent = memories
            .sort((a, b) => new Date(b.lifecycle.created).getTime() - new Date(a.lifecycle.created).getTime())
            .slice(0, 10)

          return {
            content: JSON.stringify(recent, null, 2),
            mimeType: 'application/json',
          }
        } catch (error) {
          return {
            content: JSON.stringify(
              { error: 'Failed to load recent memories', details: error },
              null,
              2,
            ),
            mimeType: 'application/json',
          }
        }

      case 'diary/timeline':
        try {
          const timeline = await Effect.runPromise(getTimeline(this.projectPath))
          const recent = timeline.slice(0, 20)

          return {
            content: JSON.stringify(recent, null, 2),
            mimeType: 'application/json',
          }
        } catch (error) {
          return {
            content: JSON.stringify(
              { error: 'Failed to load diary timeline', details: error },
              null,
              2,
            ),
            mimeType: 'application/json',
          }
        }

      case 'search/index':
        try {
          await Effect.runPromise(initializeSearch(this.projectPath))

          // Get index stats by performing a broad search
          const searchResult = await Effect.runPromise(searchDocuments({
            term: '*',
            filters: {},
            mode: 'keyword' as const,
            limit: 1000,
            offset: 0,
          }))

          const stats = {
            totalDocuments: searchResult.total,
            indexed: searchResult.results.length,
            byType: {} as Record<string, number>,
            timestamp: new Date().toISOString(),
          }

          // Count by document type
          for (const result of searchResult.results) {
            const type = result.document.doc_type
            stats.byType[type] = (stats.byType[type] || 0) + 1
          }

          return {
            content: JSON.stringify(stats, null, 2),
            mimeType: 'application/json',
          }
        } catch (error) {
          return {
            content: JSON.stringify(
              { error: 'Failed to get search index status', details: error },
              null,
              2,
            ),
            mimeType: 'application/json',
          }
        }

      default:
        throw new Error(`Unknown vibe resource: ${path}`)
    }
  }

  // ===================== Memory Tool Methods =====================

  private async searchMemory(args: Record<string, unknown>) {
    const schema = z.object({
      query: z.string(),
      type: z.array(z.string()).optional(),
      tags: z.array(z.string()).optional(),
      limit: z.number().default(10),
    })

    const params = schema.parse(args)

    try {
      const searchQuery = {
        query: params.query,
        type: params.type || [],
        tags: params.tags || [],
        tool: [],
        importance: [],
        timeRange: {},
        limit: params.limit,
        threshold: 0.1,
        includeArchived: false,
      }

      const results = await Effect.runPromise(searchMemory(this.projectPath, searchQuery))

      return {
        success: true,
        results: results.map((r) => ({
          memory: r.memory,
          score: r.score,
        })),
        total: results.length,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      return {
        error: 'Failed to search memory',
        details: error instanceof Error ? error.message : error,
        timestamp: new Date().toISOString(),
      }
    }
  }

  private async addMemory(args: Record<string, unknown>) {
    const schema = z.object({
      content: z.string(),
      type: z.string().default('knowledge'),
      tags: z.array(z.string()).default([]),
      importance: z.string().default('medium'),
    })

    const params = schema.parse(args)

    try {
      const metadata: MemoryMetadataInput = {
        type: MemoryTypeSchema.parse(params.type),
        source: {
          tool: 'mcp',
          sessionId: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          location: this.projectPath,
        },
        tags: params.tags,
        importance: z.enum(['low', 'medium', 'high', 'critical']).parse(params.importance),
        projectPath: this.projectPath,
        relatedFiles: [],
        associatedRules: [],
      }

      const result = await Effect.runPromise(
        storeMemory(this.projectPath, params.content, metadata),
      )

      return {
        success: true,
        memoryId: result.id,
        message: 'Memory stored successfully',
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      return {
        error: 'Failed to add memory',
        details: error instanceof Error ? error.message : error,
        timestamp: new Date().toISOString(),
      }
    }
  }

  private async listMemories(args: Record<string, unknown>) {
    const schema = z.object({
      type: z.string().optional(),
      limit: z.number().default(20),
    })

    const params = schema.parse(args)

    try {
      const memories = await Effect.runPromise(loadMemories(this.projectPath))

      let filtered = memories
      if (params.type) {
        filtered = memories.filter((m) => m.metadata.type === params.type)
      }

      // Sort by creation date (newest first) and limit
      const result = filtered
        .sort((a, b) => new Date(b.lifecycle.created).getTime() - new Date(a.lifecycle.created).getTime())
        .slice(0, params.limit)

      return {
        success: true,
        memories: result,
        total: result.length,
        filtered: filtered.length,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      return {
        error: 'Failed to list memories',
        details: error instanceof Error ? error.message : error,
        timestamp: new Date().toISOString(),
      }
    }
  }

  // ===================== Search Tool Methods =====================

  private async globalSearch(args: Record<string, unknown>) {
    const schema = z.object({
      query: z.string(),
      type: z.array(z.string()).optional(),
      limit: z.number().default(10),
    })

    const params = schema.parse(args)

    try {
      await Effect.runPromise(initializeSearch(this.projectPath))

      const searchQuery = {
        term: params.query,
        filters: {
          doc_type: params.type?.[0]
            ? z.enum(['memory', 'diary', 'rule', 'dependency']).parse(params.type[0])
            : undefined,
          tags: undefined,
          date_range: undefined,
          priority: undefined,
          category: undefined,
        },
        mode: 'keyword' as const,
        limit: params.limit,
        offset: 0,
      }

      const results = await Effect.runPromise(searchDocuments(searchQuery))

      return {
        success: true,
        results: results.results,
        total: results.total,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      return {
        error: 'Failed to perform global search',
        details: error instanceof Error ? error.message : error,
        timestamp: new Date().toISOString(),
      }
    }
  }

  // ===================== Diary Tool Methods =====================

  private async searchDiary(args: Record<string, unknown>) {
    const schema = z.object({
      query: z.string(),
      category: z.string().optional(),
      tags: z.array(z.string()).optional(),
      limit: z.number().default(10),
    })

    const params = schema.parse(args)

    try {
      const searchQuery = {
        query: params.query,
        category: z.enum(DIARY_CATEGORIES).parse(params.category),
        tags: params.tags,
        dateRange: undefined,
        limit: params.limit,
      }

      const results = await Effect.runPromise(searchDiary(this.projectPath, searchQuery))

      return {
        success: true,
        results,
        total: results.length,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      return {
        error: 'Failed to search diary',
        details: error instanceof Error ? error.message : error,
        timestamp: new Date().toISOString(),
      }
    }
  }

  private async addDiaryEntry(args: Record<string, unknown>) {
    const schema = z.object({
      title: z.string(),
      category: z.string().default('decision'),
      tags: z.array(z.string()).default([]),
      problem: z.object({
        description: z.string(),
        context: z.string(),
        constraints: z.array(z.string()).default([]),
      }),
      decision: z.object({
        chosen: z.string(),
        rationale: z.string(),
        alternatives: z.array(z.string()).default([]),
      }),
    })

    const params = schema.parse(args)

    try {
      const diaryEntry: DiaryEntryInput = {
        title: params.title,
        category: z.enum(DIARY_CATEGORIES).parse(params.category),
        tags: params.tags,
        problem: {
          description: params.problem.description,
          context: params.problem.context,
          constraints: params.problem.constraints,
        },
        decision: {
          chosen: params.decision.chosen,
          rationale: params.decision.rationale,
          alternatives: params.decision.alternatives.map((alt) => ({
            option: alt,
            reason: 'Alternative option',
          })),
        },
        impact: {
          benefits: [],
          risks: [],
          migrationNotes: null,
        },
      }

      const result = await Effect.runPromise(createEntry(this.projectPath, diaryEntry))

      return {
        success: true,
        entry: result,
        message: 'Diary entry created successfully',
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      return {
        error: 'Failed to add diary entry',
        details: error instanceof Error ? error.message : error,
        timestamp: new Date().toISOString(),
      }
    }
  }

  private async getDiaryTimeline(args: Record<string, unknown>) {
    const schema = z.object({
      since: z.string().optional(),
      until: z.string().optional(),
      limit: z.number().default(20),
    })

    const params = schema.parse(args)

    try {
      const dateRange = (params.since || params.until)
        ? {
          from: params.since || new Date(0).toISOString(),
          to: params.until || new Date().toISOString(),
        }
        : undefined

      const timeline = await Effect.runPromise(getTimeline(this.projectPath, dateRange))
      const result = timeline.slice(0, params.limit)

      return {
        success: true,
        timeline: result,
        total: result.length,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      return {
        error: 'Failed to get diary timeline',
        details: error instanceof Error ? error.message : error,
        timestamp: new Date().toISOString(),
      }
    }
  }
}
