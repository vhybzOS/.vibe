#!/usr/bin/env -S deno run --allow-all

/**
 * .vibe Daemon - Background service for AI tool integration
 */

import { Effect, pipe } from 'effect'
import { 
  getSecretsStatus, 
  setSecretAndInferProvider,
} from './services/secrets_service.ts'
import { startMcpServer } from '../mcp-server/server.ts'

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
        Effect.flatMap(() => this.waitForever())
      )
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
                return new Response(JSON.stringify({
                  daemon: {
                    status: 'running',
                    version: DAEMON_VERSION,
                    startedAt: this.state.startedAt,
                    port: this.state.port,
                    pid: Deno.pid,
                  },
                  mcpServer: this.state.mcpServer,
                }), {
                  headers: { 'Content-Type': 'application/json' },
                })
              
              case '/health':
                return new Response(JSON.stringify({ 
                  status: 'healthy',
                  timestamp: new Date().toISOString(),
                }), {
                  headers: { 'Content-Type': 'application/json' },
                })
              
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
        catch: (error) => new Error(`Failed to start HTTP server: ${error}`),
      }),
      Effect.tap(() => Effect.log(`🌐 HTTP server running on http://localhost:${this.state.port}`))
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
      Effect.catchAll(error => 
        pipe(
          Effect.log(`⚠️ Failed to start MCP server: ${error}`),
          Effect.map(() => undefined) // Continue even if MCP server fails
        )
      )
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
          
        default:
          return new Response('API endpoint not found', { 
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
      }
      
      return new Response('Method not allowed', { 
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    } catch (error) {
      console.error('API request error:', error)
      return new Response(JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }), { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
  }

  private handleGetSecretsStatusAsync = async (req: Request): Promise<Response> => {
    try {
      const result = await Effect.runPromise(getSecretsStatus())
      
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (error) {
      return new Response(JSON.stringify({ 
        error: 'Failed to get secrets status',
        message: error instanceof Error ? error.message : 'Unknown error'
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }

  private handleSetSecret = async (req: Request): Promise<Response> => {
    try {
      const body = await req.json()
      const { apiKey, projectPath } = body

      if (!apiKey || typeof apiKey !== 'string') {
        return new Response(JSON.stringify({ 
          error: 'Missing or invalid apiKey field' 
        }), { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        })
      }

      await Effect.runPromise(setSecretAndInferProvider(apiKey, projectPath))

      return new Response(JSON.stringify({ 
        success: true, 
        message: `API key saved successfully for ${projectPath ? 'project' : 'global'} scope.` 
      }), { 
        headers: { 'Content-Type': 'application/json' } 
      })
    } catch (error) {
      return new Response(JSON.stringify({ 
        error: 'Failed to save secret', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      }), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      })
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
      Effect.log(`🔌 MCP Server: ${this.state.mcpServer.running ? `Running on port ${this.state.mcpServer.port}` : 'Available (not started)'}`),
      Effect.log(`🆔 PID: ${Deno.pid}`),
      Effect.log(''),
      Effect.log('📡 Endpoints:'),
      Effect.log(`   GET  http://localhost:${this.state.port}/status`),
      Effect.log(`   GET  http://localhost:${this.state.port}/health`),
      Effect.log(`   POST http://localhost:${this.state.port}/shutdown`),
      Effect.log(`   GET  http://localhost:${this.state.port}/api/secrets/status`),
      Effect.log(`   POST http://localhost:${this.state.port}/api/secrets`),
      Effect.log(''),
      Effect.log('🛑 Stop: Ctrl+C or POST /shutdown'),
      Effect.log('')
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
      })
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
  
  daemon.start().catch(error => {
    console.error('❌ Daemon failed to start:', error)
    Deno.exit(1)
  })
}