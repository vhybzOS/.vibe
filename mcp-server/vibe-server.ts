/**
 * Modern .vibe MCP Server - Clean implementation for AI tool integration
 */

import { Effect, pipe } from 'effect'
import { resolve } from '@std/path'
import { z } from 'zod/v4'
import { detectAITools } from '../tools/index.ts'
import { loadRules } from '../rules/index.ts'
import { UniversalRule } from '../schemas/universal-rule.ts'

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
    ]
  }

  private async getProjectContext(args: Record<string, unknown>) {
    const schema = z.object({
      includeRules: z.boolean().default(true),
      includeTools: z.boolean().default(true),
    })
    
    const params = schema.parse(args)
    
    const result: any = {
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
          const [rules, tools] = await Promise.all([
            Effect.runPromise(loadRules(this.vibePath)).catch(() => []),
            Effect.runPromise(detectAITools(this.projectPath)).catch(() => []),
          ])
          
          const status = {
            project: this.projectPath,
            vibePath: this.vibePath,
            rules: { count: rules.length },
            tools: { count: tools.length },
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
        
      default:
        throw new Error(`Unknown vibe resource: ${path}`)
    }
  }
}