import { Effect, pipe } from 'effect'
import { resolve } from '@std/path'
import { z } from 'zod'
import { detectAITools, syncToolConfigs } from '../core/tools/index.js'
import { loadRules, saveRule, generateRulesFromProject } from '../core/rules/index.js'
import { searchMemory, storeMemory } from '../core/memory/index.js'
import { searchDiary, captureDcision } from '../core/diary/index.js'
import { discoverDependencies } from '../core/docs/index.js'
import { UniversalRule } from '../schemas/universal-rule.js'
import { DiaryEntry } from '../schemas/diary-entry.js'
import { Memory } from '../schemas/memory.js'

export class VibeServer {
  private projectPath: string = process.cwd()
  private vibePath: string = resolve(this.projectPath, '.vibe')

  async initialize() {
    // Initialize server state
    console.error('🔧 Initializing .vibe server...')
  }

  async handleToolCall(name: string, args: Record<string, unknown>) {
    return pipe(
      Effect.sync(() => ({ name, args })),
      Effect.flatMap(({ name, args }) => {
        switch (name) {
          case 'get-project-context':
            return this.getProjectContext(args)
          case 'search-memory':
            return this.searchMemory(args)
          case 'capture-decision':
            return this.captureDecision(args)
          case 'sync-tool-configs':
            return this.syncToolConfigs(args)
          case 'discover-dependencies':
            return this.discoverDependencies(args)
          case 'generate-rules':
            return this.generateRules(args)
          default:
            return Effect.fail(new Error(`Unknown tool: ${name}`))
        }
      }),
      Effect.runPromise
    )
  }

  async handleResourceRead(uri: string) {
    const [scheme, path] = uri.split('://', 2)
    
    if (scheme === 'vibe') {
      return this.readVibeResource(path)
    }
    
    throw new Error(`Unsupported resource scheme: ${scheme}`)
  }

  async listResources() {
    return [
      {
        uri: 'vibe://rules',
        name: 'Active Rules',
        description: 'Currently active universal rules',
        mimeType: 'application/json',
      },
      {
        uri: 'vibe://diary',
        name: 'Decision Diary',
        description: 'Captured architectural decisions',
        mimeType: 'application/json',
      },
      {
        uri: 'vibe://memory',
        name: 'Conversation Memory',
        description: 'Stored conversation history and context',
        mimeType: 'application/json',
      },
      {
        uri: 'vibe://docs',
        name: 'Project Documentation',
        description: 'Auto-generated llms.txt and documentation',
        mimeType: 'text/markdown',
      },
      {
        uri: 'vibe://tools',
        name: 'Detected AI Tools',
        description: 'Detected AI coding tools and their configurations',
        mimeType: 'application/json',
      },
    ]
  }

  async listTools() {
    return [
      {
        name: 'get-project-context',
        description: 'Get current project context including rules, tools, and recent activity',
        inputSchema: {
          type: 'object',
          properties: {
            includeRules: { type: 'boolean', default: true },
            includeMemory: { type: 'boolean', default: false },
            includeDecisions: { type: 'boolean', default: false },
          },
        },
      },
      {
        name: 'search-memory',
        description: 'Search conversation memory and context',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            limit: { type: 'integer', default: 10 },
            threshold: { type: 'number', default: 0.7 },
          },
          required: ['query'],
        },
      },
      {
        name: 'capture-decision',
        description: 'Capture an architectural decision from conversation',
        inputSchema: {
          type: 'object',
          properties: {
            problem: { type: 'string' },
            options: { type: 'array', items: { type: 'string' } },
            chosen: { type: 'string' },
            rationale: { type: 'string' },
            context: { type: 'object' },
          },
          required: ['problem', 'chosen', 'rationale'],
        },
      },
      {
        name: 'sync-tool-configs',
        description: 'Synchronize AI tool configurations with .vibe rules',
        inputSchema: {
          type: 'object',
          properties: {
            force: { type: 'boolean', default: false },
            dryRun: { type: 'boolean', default: false },
          },
        },
      },
      {
        name: 'discover-dependencies',
        description: 'Discover and fetch documentation from project dependencies',
        inputSchema: {
          type: 'object',
          properties: {
            forceRefresh: { type: 'boolean', default: false },
          },
        },
      },
      {
        name: 'generate-rules',
        description: 'Generate rules from project analysis',
        inputSchema: {
          type: 'object',
          properties: {
            threshold: { type: 'number', default: 0.8 },
            includePatterns: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    ]
  }

  private getProjectContext = (args: Record<string, unknown>) =>
    pipe(
      Effect.all([
        detectAITools(this.projectPath),
        loadRules(this.vibePath),
      ]),
      Effect.map(([detectedTools, rules]) => ({
        project: {
          path: this.projectPath,
          vibePath: this.vibePath,
        },
        tools: {
          detected: detectedTools,
          active: detectedTools.filter(t => t.status === 'active'),
        },
        rules: {
          total: rules.length,
          active: rules.filter(r => r.application.mode === 'always'),
          byTool: detectedTools.reduce((acc, tool) => {
            acc[tool.tool] = rules.filter(r => 
              r.compatibility.tools.includes(tool.tool)
            )
            return acc
          }, {} as Record<string, UniversalRule[]>),
        },
        timestamp: new Date().toISOString(),
      }))
    )

  private searchMemory = (args: Record<string, unknown>) => {
    const schema = z.object({
      query: z.string(),
      limit: z.number().default(10),
      threshold: z.number().default(0.7),
    })
    
    return pipe(
      Effect.try(() => schema.parse(args)),
      Effect.flatMap(params => searchMemory(this.vibePath, params))
    )
  }

  private captureDecision = (args: Record<string, unknown>) => {
    const schema = z.object({
      problem: z.string(),
      options: z.array(z.string()).default([]),
      chosen: z.string(),
      rationale: z.string(),
      context: z.record(z.unknown()).default({}),
    })
    
    return pipe(
      Effect.try(() => schema.parse(args)),
      Effect.flatMap(params => captureDcision(this.vibePath, params))
    )
  }

  private syncToolConfigs = (args: Record<string, unknown>) =>
    pipe(
      Effect.all([
        detectAITools(this.projectPath),
        loadRules(this.vibePath),
      ]),
      Effect.flatMap(([detectedTools, rules]) => 
        syncToolConfigs(this.projectPath, detectedTools, rules)
      )
    )

  private discoverDependencies = (args: Record<string, unknown>) => {
    const schema = z.object({
      forceRefresh: z.boolean().default(false),
    })
    
    return pipe(
      Effect.try(() => schema.parse(args)),
      Effect.flatMap(params => discoverDependencies(this.projectPath, params))
    )
  }

  private generateRules = (args: Record<string, unknown>) => {
    const schema = z.object({
      threshold: z.number().default(0.8),
      includePatterns: z.array(z.string()).default([]),
    })
    
    return pipe(
      Effect.try(() => schema.parse(args)),
      Effect.flatMap(params => generateRulesFromProject(this.projectPath, params))
    )
  }

  private async readVibeResource(path: string) {
    switch (path) {
      case 'rules':
        return {
          content: JSON.stringify(await Effect.runPromise(loadRules(this.vibePath)), null, 2),
          mimeType: 'application/json',
        }
      case 'tools':
        return {
          content: JSON.stringify(await Effect.runPromise(detectAITools(this.projectPath)), null, 2),
          mimeType: 'application/json',
        }
      default:
        throw new Error(`Unknown vibe resource: ${path}`)
    }
  }
}