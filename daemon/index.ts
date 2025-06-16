#!/usr/bin/env -S deno run --allow-all

/**
 * .vibe Daemon - Background service for AI tool integration
 */

import { Effect, pipe } from 'effect'
import { z } from 'zod/v4'
import { createDaemonError } from '../lib/errors.ts'
import { getSecretsStatus, setSecretAndInferProvider } from './services/secrets_service.ts'
import { startMcpServer } from '../mcp-server/server.ts'
import {
  deleteMemory,
  getMemory,
  loadMemories,
  type MemoryMetadataInput,
  searchMemory,
  storeMemory,
} from '../memory/index.ts'
import { initializeSearch, insertDocument, searchDocuments, type SearchQuery } from '../search/index.ts'
import {
  createEntry,
  deleteEntry,
  type DiaryEntryInput,
  getTimeline,
  searchDiary,
  updateEntry,
} from '../diary/index.ts'

const DAEMON_VERSION = '1.0.0'
const DEFAULT_PORT = 4242

interface DaemonState {
  isRunning: boolean
  startedAt: string
  port: number
  mcpServer: {
    running: boolean
    port: number
    startedAt?: string
  }
}

export class VibeDaemon {
  private state: DaemonState = {
    isRunning: false,
    startedAt: new Date().toISOString(),
    port: DEFAULT_PORT,
    mcpServer: {
      running: false,
      port: 3001,
    },
  }

  private httpServer?: Deno.HttpServer

  start() {
    return Effect.runPromise(
      pipe(
        Effect.log(`🚀 Starting vibe-daemon v${DAEMON_VERSION}...`),
        Effect.flatMap(() => this.startHttpServer()),
        Effect.tap(() => {
          this.state.isRunning = true
          return Effect.log('✅ Daemon started successfully')
        }),
        Effect.tap(() => this.printStatus()),
        Effect.flatMap(() => this.waitForever()),
      ),
    )
  }

  private startHttpServer = () =>
    pipe(
      Effect.tryPromise({
        try: async () => {
          const handler = async (req: Request): Promise<Response> => {
            const url = new URL(req.url)

            // Handle API routes
            if (url.pathname.startsWith('/api/')) {
              return await this.handleApiRequest(req, url)
            }

            // Handle basic routes
            switch (url.pathname) {
              case '/':
              case '/status':
                return new Response(
                  JSON.stringify({
                    daemon: {
                      status: 'running',
                      version: DAEMON_VERSION,
                      startedAt: this.state.startedAt,
                      port: this.state.port,
                      pid: Deno.pid,
                    },
                    mcpServer: this.state.mcpServer,
                  }),
                  {
                    headers: { 'Content-Type': 'application/json' },
                  },
                )

              case '/health':
                return new Response(
                  JSON.stringify({
                    status: 'healthy',
                    timestamp: new Date().toISOString(),
                  }),
                  {
                    headers: { 'Content-Type': 'application/json' },
                  },
                )

              case '/shutdown':
                if (req.method === 'POST') {
                  setTimeout(() => {
                    console.log('🛑 Shutdown requested via API')
                    Deno.exit(0)
                  }, 100)
                  return new Response(JSON.stringify({ message: 'Shutdown initiated' }), {
                    headers: { 'Content-Type': 'application/json' },
                  })
                }
                return new Response('Method not allowed', { status: 405 })

              default:
                return new Response('Vibe Daemon is running', { status: 200 })
            }
          }

          this.httpServer = Deno.serve({
            port: this.state.port,
            hostname: 'localhost',
          }, handler)

          return this.httpServer
        },
        catch: (error) => createDaemonError(error, 'Failed to start HTTP server', 'http-server'),
      }),
      Effect.tap(() => Effect.log(`🌐 HTTP server running on http://localhost:${this.state.port}`)),
    )

  private startMcpServer = () =>
    pipe(
      Effect.log('🔌 Starting MCP server...'),
      startMcpServer({
        enabled: true,
        port: this.state.mcpServer.port,
        host: 'localhost',
        autoRestart: true,
      }),
      Effect.tap(() => {
        this.state.mcpServer.running = true
        this.state.mcpServer.startedAt = new Date().toISOString()
        return Effect.log(`✅ MCP server running on port ${this.state.mcpServer.port}`)
      }),
      Effect.catchAll((error) =>
        pipe(
          Effect.log(`⚠️ Failed to start MCP server: ${error}`),
          Effect.map(() => undefined), // Continue even if MCP server fails
        )
      ),
    )

  private handleApiRequest = async (req: Request, url: URL): Promise<Response> => {
    const path = url.pathname

    // CORS headers for development
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }

    try {
      switch (path) {
        case '/api/secrets/status':
          if (req.method === 'GET') {
            return await this.handleGetSecretsStatusAsync(req)
          }
          break

        case '/api/secrets':
          if (req.method === 'POST') {
            return await this.handleSetSecret(req)
          }
          break

        // Memory API endpoints
        case '/api/memory/search':
          if (req.method === 'GET') {
            return await this.handleMemorySearch(req, url)
          }
          break

        case '/api/memory':
          if (req.method === 'GET') {
            return await this.handleMemoryList(req, url)
          } else if (req.method === 'POST') {
            return await this.handleMemoryCreate(req, url)
          }
          break

        // Search API endpoints
        case '/api/search':
          if (req.method === 'GET') {
            return await this.handleGlobalSearch(req, url)
          }
          break

        case '/api/search/reindex':
          if (req.method === 'POST') {
            return await this.handleSearchReindex(req, url)
          }
          break

        // Diary API endpoints
        case '/api/diary/timeline':
          if (req.method === 'GET') {
            return await this.handleDiaryTimeline(req, url)
          }
          break

        case '/api/diary':
          if (req.method === 'POST') {
            return await this.handleDiaryCreate(req, url)
          }
          break

        case '/api/diary/capture':
          if (req.method === 'POST') {
            return await this.handleDiaryAutoCapture(req, url)
          }
          break

        default:
          // Handle dynamic routes with IDs
          if (path.startsWith('/api/memory/') && path.split('/').length === 4) {
            const memoryId = path.split('/')[3]
            if (req.method === 'GET') {
              return await this.handleMemoryGet(req, url, memoryId)
            } else if (req.method === 'DELETE') {
              return await this.handleMemoryDelete(req, url, memoryId)
            }
          } else if (path.startsWith('/api/diary/') && path.split('/').length === 4) {
            const diaryId = path.split('/')[3]
            if (req.method === 'GET') {
              return await this.handleDiaryGet(req, url, diaryId)
            } else if (req.method === 'DELETE') {
              return await this.handleDiaryDelete(req, url, diaryId)
            }
          }

          return new Response('API endpoint not found', {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
      }

      return new Response('Method not allowed', {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } catch (error) {
      console.error('API request error:', error)
      return new Response(
        JSON.stringify({
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }
  }

  private handleGetSecretsStatusAsync = async (req: Request): Promise<Response> => {
    try {
      const result = await Effect.runPromise(getSecretsStatus())

      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: 'Failed to get secrets status',
          message: error instanceof Error ? error.message : 'Unknown error',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }
  }

  private handleSetSecret = async (req: Request): Promise<Response> => {
    try {
      const body = await req.json()
      const { apiKey, projectPath } = body

      if (!apiKey || typeof apiKey !== 'string') {
        return new Response(
          JSON.stringify({
            error: 'Missing or invalid apiKey field',
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      }

      await Effect.runPromise(setSecretAndInferProvider(apiKey, projectPath))

      return new Response(
        JSON.stringify({
          success: true,
          message: `API key saved successfully for ${projectPath ? 'project' : 'global'} scope.`,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        },
      )
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: 'Failed to save secret',
          message: error instanceof Error ? error.message : 'Unknown error',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }
  }

  // ===================== Memory API Handlers =====================

  private handleMemorySearch = async (req: Request, url: URL): Promise<Response> => {
    try {
      const searchParams = url.searchParams
      const query = searchParams.get('q') || searchParams.get('query') || ''
      const projectPath = searchParams.get('path') || Deno.cwd()
      const limit = parseInt(searchParams.get('limit') || '10')
      const type = searchParams.get('type')?.split(',') || []
      const tags = searchParams.get('tags')?.split(',') || []

      const searchQuery = {
        query,
        type,
        tags,
        tool: [],
        importance: [],
        timeRange: {},
        limit,
        threshold: 0.1,
        includeArchived: false,
      }

      const results = await Effect.runPromise(searchMemory(projectPath, searchQuery))

      return new Response(
        JSON.stringify({
          success: true,
          results: results.map((r) => ({
            memory: r.memory,
            score: r.score,
          })),
          total: results.length,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        },
      )
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: 'Failed to search memory',
          message: error instanceof Error ? error.message : 'Unknown error',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }
  }

  private handleMemoryList = async (req: Request, url: URL): Promise<Response> => {
    try {
      const searchParams = url.searchParams
      const projectPath = searchParams.get('path') || Deno.cwd()

      const memories = await Effect.runPromise(loadMemories(projectPath))

      return new Response(
        JSON.stringify({
          success: true,
          memories,
          total: memories.length,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        },
      )
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: 'Failed to list memories',
          message: error instanceof Error ? error.message : 'Unknown error',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }
  }

  private handleMemoryCreate = async (req: Request, url: URL): Promise<Response> => {
    try {
      const body = await req.json()
      const { content, metadata, projectPath } = body

      if (!content || typeof content !== 'string') {
        return new Response(
          JSON.stringify({
            error: 'Missing or invalid content field',
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      }

      const memoryMetadata: MemoryMetadataInput = {
        type: metadata?.type || 'knowledge',
        source: metadata?.source || {
          tool: undefined,
          sessionId: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          location: projectPath || Deno.cwd(),
        },
        tags: metadata?.tags || [],
        importance: metadata?.importance || 'medium',
        projectPath: projectPath || Deno.cwd(),
        relatedFiles: metadata?.relatedFiles || [],
        associatedRules: metadata?.associatedRules || [],
      }

      const result = await Effect.runPromise(
        storeMemory(projectPath || Deno.cwd(), content, memoryMetadata),
      )

      return new Response(
        JSON.stringify({
          success: true,
          memoryId: result.id,
          message: 'Memory created successfully',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        },
      )
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: 'Failed to create memory',
          message: error instanceof Error ? error.message : 'Unknown error',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }
  }

  private handleMemoryGet = async (req: Request, url: URL, memoryId: string): Promise<Response> => {
    try {
      const searchParams = url.searchParams
      const projectPath = searchParams.get('path') || Deno.cwd()

      const memory = await Effect.runPromise(getMemory(projectPath, memoryId))

      if (!memory) {
        return new Response(
          JSON.stringify({
            error: 'Memory not found',
          }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      }

      return new Response(
        JSON.stringify({
          success: true,
          memory,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        },
      )
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: 'Failed to get memory',
          message: error instanceof Error ? error.message : 'Unknown error',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }
  }

  private handleMemoryDelete = async (
    req: Request,
    url: URL,
    memoryId: string,
  ): Promise<Response> => {
    try {
      const searchParams = url.searchParams
      const projectPath = searchParams.get('path') || Deno.cwd()

      const deleted = await Effect.runPromise(deleteMemory(projectPath, memoryId))

      if (!deleted) {
        return new Response(
          JSON.stringify({
            error: 'Memory not found or could not be deleted',
          }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Memory deleted successfully',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        },
      )
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: 'Failed to delete memory',
          message: error instanceof Error ? error.message : 'Unknown error',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }
  }

  // ===================== Search API Handlers =====================

  private handleGlobalSearch = async (req: Request, url: URL): Promise<Response> => {
    try {
      const searchParams = url.searchParams
      const term = searchParams.get('q') || searchParams.get('query') || ''
      const projectPath = searchParams.get('path') || Deno.cwd()
      const limit = parseInt(searchParams.get('limit') || '10')
      const type = searchParams.get('type')?.split(',')
      const tags = searchParams.get('tags')?.split(',')

      const searchQuery: SearchQuery = {
        term,
        filters: {
          doc_type: type?.[0] ? z.enum(['memory', 'diary', 'rule', 'dependency']).parse(type[0]) : undefined,
          tags,
          date_range: undefined,
          priority: undefined,
          category: undefined,
        },
        mode: 'keyword' as const,
        limit,
        offset: 0,
      }

      await Effect.runPromise(initializeSearch(projectPath))
      const results = await Effect.runPromise(searchDocuments(searchQuery))

      return new Response(
        JSON.stringify({
          success: true,
          results: results.results,
          total: results.total,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        },
      )
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: 'Failed to perform global search',
          message: error instanceof Error ? error.message : 'Unknown error',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }
  }

  private handleSearchReindex = async (req: Request, url: URL): Promise<Response> => {
    try {
      const searchParams = url.searchParams
      const projectPath = searchParams.get('path') || Deno.cwd()

      await Effect.runPromise(initializeSearch(projectPath))

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Search index rebuilt successfully',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        },
      )
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: 'Failed to rebuild search index',
          message: error instanceof Error ? error.message : 'Unknown error',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }
  }

  // ===================== Diary API Handlers =====================

  private handleDiaryTimeline = async (req: Request, url: URL): Promise<Response> => {
    try {
      const searchParams = url.searchParams
      const projectPath = searchParams.get('path') || Deno.cwd()
      const since = searchParams.get('since')
      const until = searchParams.get('until')

      const dateRange = (since || until)
        ? {
          from: since || new Date(0).toISOString(),
          to: until || new Date().toISOString(),
        }
        : undefined

      const timeline = await Effect.runPromise(getTimeline(projectPath, dateRange))

      return new Response(
        JSON.stringify({
          success: true,
          timeline,
          total: timeline.length,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        },
      )
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: 'Failed to get diary timeline',
          message: error instanceof Error ? error.message : 'Unknown error',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }
  }

  private handleDiaryCreate = async (req: Request, url: URL): Promise<Response> => {
    try {
      const body = await req.json()
      const { entry, projectPath } = body

      if (!entry || !entry.title) {
        return new Response(
          JSON.stringify({
            error: 'Missing or invalid entry data - title is required',
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      }

      const diaryEntry: DiaryEntryInput = {
        title: entry.title,
        category: entry.category || 'decision',
        tags: entry.tags || [],
        problem: entry.problem || {
          description: 'Problem description needed',
          context: 'Context information needed',
          constraints: [],
        },
        decision: entry.decision || {
          chosen: 'Decision details needed',
          rationale: 'Rationale needed',
          alternatives: [],
        },
        impact: entry.impact || {
          benefits: [],
          risks: [],
          migrationNotes: null,
        },
      }

      const result = await Effect.runPromise(createEntry(projectPath || Deno.cwd(), diaryEntry))

      return new Response(
        JSON.stringify({
          success: true,
          entry: result,
          message: 'Diary entry created successfully',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        },
      )
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: 'Failed to create diary entry',
          message: error instanceof Error ? error.message : 'Unknown error',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }
  }

  private handleDiaryGet = async (req: Request, url: URL, diaryId: string): Promise<Response> => {
    try {
      const searchParams = url.searchParams
      const projectPath = searchParams.get('path') || Deno.cwd()

      const timeline = await Effect.runPromise(getTimeline(projectPath))
      const entry = timeline.find((e) => e.id === diaryId || e.id.startsWith(diaryId))

      if (!entry) {
        return new Response(
          JSON.stringify({
            error: 'Diary entry not found',
          }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      }

      return new Response(
        JSON.stringify({
          success: true,
          entry,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        },
      )
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: 'Failed to get diary entry',
          message: error instanceof Error ? error.message : 'Unknown error',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }
  }

  private handleDiaryDelete = async (
    req: Request,
    url: URL,
    diaryId: string,
  ): Promise<Response> => {
    try {
      const searchParams = url.searchParams
      const projectPath = searchParams.get('path') || Deno.cwd()

      const deleted = await Effect.runPromise(deleteEntry(projectPath, diaryId))

      if (!deleted) {
        return new Response(
          JSON.stringify({
            error: 'Diary entry not found or could not be deleted',
          }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Diary entry deleted successfully',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        },
      )
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: 'Failed to delete diary entry',
          message: error instanceof Error ? error.message : 'Unknown error',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }
  }

  private handleDiaryAutoCapture = async (req: Request, url: URL): Promise<Response> => {
    try {
      const body = await req.json()
      const { conversationData, projectPath } = body

      if (!conversationData || !conversationData.messages) {
        return new Response(
          JSON.stringify({
            error: 'Missing or invalid conversation data',
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      }

      // Note: autoCapture is not implemented in the diary module yet
      return new Response(
        JSON.stringify({
          success: true,
          captured: null,
          message: 'Auto-capture functionality not yet implemented',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        },
      )
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: 'Failed to auto-capture diary entry',
          message: error instanceof Error ? error.message : 'Unknown error',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }
  }

  private printStatus = () =>
    Effect.all([
      Effect.log(''),
      Effect.log('📊 Vibe Daemon Status:'),
      Effect.log('━━━━━━━━━━━━━━━━━━━━━━━━━━'),
      Effect.log(`🚀 Status: ${this.state.isRunning ? 'Running' : 'Stopped'}`),
      Effect.log(`📅 Started: ${new Date(this.state.startedAt).toLocaleString()}`),
      Effect.log(`🌐 Port: ${this.state.port}`),
      Effect.log(
        `🔌 MCP Server: ${
          this.state.mcpServer.running ? `Running on port ${this.state.mcpServer.port}` : 'Available (not started)'
        }`,
      ),
      Effect.log(`🆔 PID: ${Deno.pid}`),
      Effect.log(''),
      Effect.log('📡 Endpoints:'),
      Effect.log(`   GET  http://localhost:${this.state.port}/status`),
      Effect.log(`   GET  http://localhost:${this.state.port}/health`),
      Effect.log(`   POST http://localhost:${this.state.port}/shutdown`),
      Effect.log(`   GET  http://localhost:${this.state.port}/api/secrets/status`),
      Effect.log(`   POST http://localhost:${this.state.port}/api/secrets`),
      Effect.log(''),
      Effect.log('📡 Memory API:'),
      Effect.log(`   GET  http://localhost:${this.state.port}/api/memory/search?q=<query>`),
      Effect.log(`   GET  http://localhost:${this.state.port}/api/memory`),
      Effect.log(`   POST http://localhost:${this.state.port}/api/memory`),
      Effect.log(`   GET  http://localhost:${this.state.port}/api/memory/<id>`),
      Effect.log(`   DEL  http://localhost:${this.state.port}/api/memory/<id>`),
      Effect.log(''),
      Effect.log('📡 Search API:'),
      Effect.log(`   GET  http://localhost:${this.state.port}/api/search?q=<query>`),
      Effect.log(`   POST http://localhost:${this.state.port}/api/search/reindex`),
      Effect.log(''),
      Effect.log('📡 Diary API:'),
      Effect.log(`   GET  http://localhost:${this.state.port}/api/diary/timeline`),
      Effect.log(`   POST http://localhost:${this.state.port}/api/diary`),
      Effect.log(`   GET  http://localhost:${this.state.port}/api/diary/<id>`),
      Effect.log(`   DEL  http://localhost:${this.state.port}/api/diary/<id>`),
      Effect.log(`   POST http://localhost:${this.state.port}/api/diary/capture`),
      Effect.log(''),
      Effect.log('🛑 Stop: Ctrl+C or POST /shutdown'),
      Effect.log(''),
    ], { discard: true })

  private waitForever = () =>
    pipe(
      Effect.async<never, never, void>((resume) => {
        // Set up signal handlers
        const handleSignal = () => {
          console.log('\n🛑 Received shutdown signal')
          this.shutdown().then(() => resume(Effect.void))
        }

        Deno.addSignalListener('SIGINT', handleSignal)
        Deno.addSignalListener('SIGTERM', handleSignal)

        // Keep running
      }),
    )

  private async shutdown() {
    console.log('🛑 Shutting down daemon...')

    if (this.httpServer) {
      await this.httpServer.shutdown()
    }

    console.log('✅ Daemon stopped')
    Deno.exit(0)
  }
}

// Main entry point
if (import.meta.main) {
  const daemon = new VibeDaemon()

  daemon.start().catch((error) => {
    console.error('❌ Daemon failed to start:', error)
    Deno.exit(1)
  })
}
