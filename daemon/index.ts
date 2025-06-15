#!/usr/bin/env -S deno run --allow-all

import { Effect, pipe } from 'effect'
import { resolve } from '@std/path'
import { startFileWatcher, createDefaultWatcherConfig } from '../src/utils/file-watcher.ts'
import { startMcpServer } from '../src/mcp-server/server.ts'
import { DaemonConfig, loadDaemonConfig, saveDaemonConfig } from '../src/daemon/config.ts'
import { setupSignalHandlers } from '../src/daemon/signals.ts'
import { ensureVibeDirectory } from '../src/daemon/setup.ts'
import { 
  getSecretsStatus, 
  setSecret, 
  validateSecretFormat, 
  type SecretProvider 
} from './services/secrets_service.ts'
import { globalDiscoveryService } from './services/discovery_service.ts'

const DAEMON_VERSION = '1.0.0'
const DAEMON_NAME = 'vibe-daemon'

export interface DaemonState {
  isRunning: boolean
  startedAt: string
  projects: Map<string, ProjectState>
  mcpServer: {
    running: boolean
    port: number
    startedAt?: string
  }
}

export interface ProjectState {
  path: string
  watching: boolean
  lastSync: string
  detectedTools: string[]
  ruleCount: number
}

export class VibeDaemon {
  private state: DaemonState = {
    isRunning: false,
    startedAt: new Date().toISOString(),
    projects: new Map(),
    mcpServer: {
      running: false,
      port: 3001,
    },
  }

  private httpServer?: Deno.HttpServer

  private config: DaemonConfig = {
    daemon: {
      name: DAEMON_NAME,
      version: DAEMON_VERSION,
      autoStart: true,
      logLevel: 'info',
      pidFile: '/tmp/vibe-daemon.pid',
      logFile: '/tmp/vibe-daemon.log',
      controlPort: 4242,
    },
    mcpServer: {
      enabled: true,
      port: 3001,
      host: 'localhost',
      autoRestart: true,
    },
    fileWatcher: {
      enabled: true,
      debounceMs: 1000,
      maxProjects: 10,
    },
    projects: {
      autoDiscover: true,
      maxDepth: 3,
      ignorePaths: ['node_modules', '.git', 'dist', 'build'],
    },
  }

  async start() {
    return pipe(
      Effect.log(`🚀 Starting ${DAEMON_NAME} v${DAEMON_VERSION}...`),
      Effect.flatMap(() => this.loadConfiguration()),
      Effect.flatMap(() => this.setupPidFile()),
      Effect.flatMap(() => this.startHttpServer()),
      Effect.flatMap(() => this.startMcpServer()),
      Effect.flatMap(() => this.discoverProjects()),
      Effect.flatMap(() => this.startFileWatchers()),
      Effect.flatMap(() => this.setupHealthChecks()),
      Effect.tap(() => {
        this.state.isRunning = true
        return Effect.log('✅ Daemon started successfully')
      }),
      Effect.tap(() => this.printStatus()),
      Effect.flatMap(() => this.waitForShutdown()),
      Effect.runPromise
    )
  }

  private loadConfiguration = () =>
    pipe(
      loadDaemonConfig(),
      Effect.map(config => {
        this.config = { ...this.config, ...config }
        return config
      }),
      Effect.tap(() => Effect.log('⚙️  Configuration loaded')),
      Effect.catchAll(() => {
        // Use default config if loading fails
        return pipe(
          Effect.log('ℹ️  Using default configuration'),
          Effect.flatMap(() => saveDaemonConfig(this.config)),
          Effect.map(() => this.config)
        )
      })
    )

  /**
   * Starts the unified HTTP server for dashboard, API, and control endpoints
   * Serves on port 4242 and handles Fresh dashboard, secrets API, and status endpoints
   */
  private startHttpServer = () =>
    pipe(
      Effect.tryPromise({
        try: async () => {
          const handler = (req: Request): Response => {
            const url = new URL(req.url)
            
            // Handle API routes
            if (url.pathname.startsWith('/api/')) {
              return this.handleApiRequest(req, url)
            }
            
            // Legacy status endpoints (for backward compatibility)
            switch (url.pathname) {
              case '/status':
                return this.handleStatusRequest()
              
              case '/shutdown':
                if (req.method === 'POST') {
                  return this.handleShutdownRequest()
                }
                return new Response('Method not allowed', { status: 405 })
              
              case '/health':
                return new Response(JSON.stringify({ 
                  status: 'healthy',
                  timestamp: new Date().toISOString(),
                }), {
                  headers: { 'Content-Type': 'application/json' },
                })
              
              default:
                // TODO: In Phase 2, this will handle Fresh dashboard routes
                return new Response('Dashboard coming soon...', { status: 200 })
            }
          }
          
          this.httpServer = Deno.serve({
            port: this.config.daemon.controlPort,
            hostname: 'localhost',
          }, handler)
          
          return this.httpServer
        },
        catch: (error) => new Error(`Failed to start HTTP server: ${error}`),
      }),
      Effect.tap(() => Effect.log(`🌐 Dashboard server running on http://localhost:${this.config.daemon.controlPort}`))
    )

  /**
   * Handles API requests for the new dashboard and autonomous features
   */
  private handleApiRequest = (req: Request, url: URL): Response => {
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
            return this.handleGetSecretsStatus()
          }
          break
          
        case '/api/secrets':
          if (req.method === 'POST') {
            return this.handleSetSecret(req)
          }
          break
          
        case '/api/project/status':
          if (req.method === 'GET') {
            return this.handleGetProjectStatus()
          }
          break
          
        case '/api/discovery/start':
          if (req.method === 'POST') {
            return this.handleStartDiscovery(req)
          }
          break
          
        case '/api/discovery/status':
          if (req.method === 'GET') {
            return this.handleGetDiscoveryStatus(url)
          }
          break
          
        case '/api/events':
          if (req.method === 'GET') {
            return this.handleEventStream(req)
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

  /**
   * Handles GET /api/secrets/status
   * Returns which secrets are configured without revealing values
   */
  private handleGetSecretsStatus = (): Response => {
    const statusEffect = getSecretsStatus()
    
    // Since we're in a sync context, we need to run the effect synchronously
    // In a real implementation, we'd want to make this async
    try {
      let result: any = null
      let error: any = null
      
      Effect.runPromise(statusEffect)
        .then(status => { result = status })
        .catch(err => { error = err })
      
      // Simple busy wait for the effect to complete (not ideal, but works for now)
      const start = Date.now()
      while (result === null && error === null && Date.now() - start < 1000) {
        // Wait briefly
      }
      
      if (error) {
        throw error
      }
      
      if (result === null) {
        throw new Error('Request timeout')
      }
      
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

  /**
   * Handles POST /api/secrets
   * Sets a secret for a specific provider
   */
  private handleSetSecret = async (req: Request): Promise<Response> => {
    try {
      const body = await req.json()
      const { provider, apiKey } = body
      
      if (!provider || !apiKey) {
        return new Response(JSON.stringify({
          error: 'Missing required fields',
          message: 'Both provider and apiKey are required'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      
      // Validate provider
      const validProviders: SecretProvider[] = ['openai', 'anthropic', 'github', 'gitlab', 'google', 'azure']
      if (!validProviders.includes(provider)) {
        return new Response(JSON.stringify({
          error: 'Invalid provider',
          message: `Provider must be one of: ${validProviders.join(', ')}`
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      
      // Validate secret format
      if (!validateSecretFormat(provider, apiKey)) {
        return new Response(JSON.stringify({
          error: 'Invalid secret format',
          message: `The provided ${provider} API key format is invalid`
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      
      // Save the secret
      await Effect.runPromise(setSecret(provider, apiKey))
      
      return new Response(JSON.stringify({
        success: true,
        message: `${provider} API key saved successfully`
      }), {
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Failed to save secret',
        message: error instanceof Error ? error.message : 'Unknown error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  /**
   * Handles GET /api/project/status
   * Returns detailed project status information
   */
  private handleGetProjectStatus = (): Response => {
    const projectsArray = Array.from(this.state.projects.entries()).map(([path, state]) => ({
      path,
      ...state,
    }))
    
    return new Response(JSON.stringify({
      daemon: {
        name: this.config.daemon.name,
        version: this.config.daemon.version,
        isRunning: this.state.isRunning,
        startedAt: this.state.startedAt,
        pid: Deno.pid,
      },
      mcpServer: this.state.mcpServer,
      projects: projectsArray,
      config: this.config,
    }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  /**
   * Handles legacy status endpoint
   */
  private handleStatusRequest = (): Response => {
    return this.handleGetProjectStatus()
  }

  /**
   * Handles shutdown request
   */
  private handleShutdownRequest = (): Response => {
    setTimeout(() => {
      Effect.runFork(this.shutdown())
    }, 100)
    return new Response(JSON.stringify({ message: 'Shutdown initiated' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  /**
   * Handles POST /api/discovery/start
   * Starts autonomous discovery for a project
   */
  private handleStartDiscovery = async (req: Request): Promise<Response> => {
    try {
      const body = await req.json()
      const { projectPath } = body
      
      if (!projectPath) {
        return new Response(JSON.stringify({
          error: 'Missing required field',
          message: 'projectPath is required'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      
      // Start discovery asynchronously
      const result = await Effect.runPromise(
        globalDiscoveryService.startDiscovery(projectPath)
      )
      
      return new Response(JSON.stringify({
        success: true,
        sessionId: result.sessionId,
        message: 'Discovery started successfully'
      }), {
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Failed to start discovery',
        message: error instanceof Error ? error.message : 'Unknown error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  /**
   * Handles GET /api/discovery/status?sessionId=xxx
   * Gets discovery session status
   */
  private handleGetDiscoveryStatus = async (url: URL): Promise<Response> => {
    try {
      const sessionId = url.searchParams.get('sessionId')
      
      if (!sessionId) {
        // Return all sessions if no specific session requested
        const allSessions = await Effect.runPromise(
          globalDiscoveryService.getAllSessions()
        )
        
        return new Response(JSON.stringify({
          sessions: allSessions
        }), {
          headers: { 'Content-Type': 'application/json' },
        })
      }
      
      const session = await Effect.runPromise(
        globalDiscoveryService.getSession(sessionId)
      )
      
      if (!session) {
        return new Response(JSON.stringify({
          error: 'Session not found',
          sessionId
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      
      return new Response(JSON.stringify(session), {
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Failed to get discovery status',
        message: error instanceof Error ? error.message : 'Unknown error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  /**
   * Handles GET /api/events
   * Server-Sent Events endpoint for real-time updates
   */
  private handleEventStream = (req: Request): Response => {
    const { readable, writable } = new TransformStream()
    const writer = writable.getWriter()
    
    // Set up SSE headers
    const headers = new Headers({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    })
    
    // Send initial connection event
    writer.write(new TextEncoder().encode('data: {"type":"connected","timestamp":"' + new Date().toISOString() + '"}\n\n'))
    
    // Set up event listeners for discovery events
    const discoveryListener = (event: any) => {
      const data = JSON.stringify({
        type: 'discovery',
        ...event,
        timestamp: new Date().toISOString(),
      })
      writer.write(new TextEncoder().encode(`data: ${data}\n\n`))
    }
    
    // Subscribe to all discovery events
    Effect.runSync(globalDiscoveryService.subscribe('discovery:started', discoveryListener))
    Effect.runSync(globalDiscoveryService.subscribe('discovery:progress', discoveryListener))
    Effect.runSync(globalDiscoveryService.subscribe('discovery:manifests', discoveryListener))
    Effect.runSync(globalDiscoveryService.subscribe('discovery:dependencies', discoveryListener))
    Effect.runSync(globalDiscoveryService.subscribe('discovery:rules', discoveryListener))
    Effect.runSync(globalDiscoveryService.subscribe('discovery:converted', discoveryListener))
    Effect.runSync(globalDiscoveryService.subscribe('discovery:completed', discoveryListener))
    Effect.runSync(globalDiscoveryService.subscribe('discovery:error', discoveryListener))
    
    // Send periodic heartbeat to keep connection alive
    const heartbeatInterval = setInterval(() => {
      try {
        writer.write(new TextEncoder().encode('data: {"type":"heartbeat","timestamp":"' + new Date().toISOString() + '"}\n\n'))
      } catch (error) {
        // Connection closed, clean up
        clearInterval(heartbeatInterval)
      }
    }, 30000) // Every 30 seconds
    
    // Clean up when the connection is closed
    req.signal?.addEventListener('abort', () => {
      clearInterval(heartbeatInterval)
      writer.close()
    })
    
    return new Response(readable, { headers })
  }

  private setupPidFile = () =>
    pipe(
      Effect.tryPromise({
        try: () => Deno.writeTextFile(this.config.daemon.pidFile, Deno.pid.toString()),
        catch: () => new Error('Failed to create PID file'),
      }),
      Effect.tap(() => Effect.log(`📄 PID file created: ${this.config.daemon.pidFile}`))
    )

  private startMcpServer = () =>
    pipe(
      Effect.log('🔌 Starting MCP server...'),
      startMcpServer(this.config.mcpServer),
      Effect.tap(() => {
        this.state.mcpServer.running = true
        this.state.mcpServer.startedAt = new Date().toISOString()
        return Effect.log(`✅ MCP server running on ${this.config.mcpServer.host}:${this.config.mcpServer.port}`)
      }),
      Effect.catchAll(error => 
        Effect.log(`❌ Failed to start MCP server: ${error}`)
      )
    )

  private discoverProjects = () =>
    pipe(
      Effect.log('🔍 Discovering .vibe projects...'),
      this.scanForVibeProjects(),
      Effect.tap(projects => 
        Effect.log(`📂 Found ${projects.length} .vibe project(s)`)
      ),
      Effect.flatMap(projects => 
        Effect.all(
          projects.map(projectPath => 
            this.registerProject(projectPath)
          )
        )
      )
    )

  /**
   * Scans configured root directories for .vibe projects using expandGlob
   * Respects maxDepth and ignorePaths configuration settings
   * 
   * @returns Effect that resolves to array of project paths
   */
  private scanForVibeProjects = () =>
    pipe(
      Effect.tryPromise({
        try: async () => {
          const projects: string[] = []
          const config = this.config.projects
          
          for (const scanRoot of config.projectScanRoots) {
            const expandedRoot = this.expandPath(scanRoot)
            
            try {
              // Check if scan root exists
              const rootStat = await Deno.stat(expandedRoot)
              if (!rootStat.isDirectory) continue
              
              // Use expandGlob to recursively search for .vibe directories
              const globPattern = `${expandedRoot}/**/.vibe`
              
              for await (const entry of Deno.expandGlob(globPattern, {
                maxDepth: config.maxDepth,
                followSymlinks: false,
                exclude: config.ignorePaths.map(path => `**/${path}/**`),
              })) {
                if (entry.isDirectory) {
                  // Get the parent directory (the actual project directory)
                  const projectPath = resolve(entry.path, '..')
                  
                  // Avoid duplicates and validate it's actually a .vibe project
                  if (!projects.includes(projectPath)) {
                    try {
                      const vibeConfigPath = resolve(projectPath, '.vibe', 'config.json')
                      await Deno.stat(vibeConfigPath)
                      projects.push(projectPath)
                    } catch {
                      // Not a valid .vibe project (no config.json), skip
                    }
                  }
                }
              }
            } catch (error) {
              console.warn(`Failed to scan ${expandedRoot}: ${error}`)
              continue
            }
          }
          
          return projects.slice(0, config.maxProjects) // Respect maxProjects limit
        },
        catch: (error) => new Error(`Failed to scan for projects: ${error}`),
      })
    )

  /**
   * Expands path with home directory if it starts with ~
   * 
   * @param path - Path to expand
   * @returns Expanded absolute path
   */
  private expandPath = (path: string): string => {
    if (path.startsWith('~/')) {
      const home = Deno.env.get('HOME') || Deno.env.get('USERPROFILE') || '/home'
      return path.replace('~', home)
    }
    return path
  }

  private registerProject = (projectPath: string) =>
    pipe(
      ensureVibeDirectory(projectPath),
      Effect.flatMap(() => this.analyzeProject(projectPath)),
      Effect.tap(projectState => {
        this.state.projects.set(projectPath, projectState)
        return Effect.log(`📝 Registered project: ${projectPath}`)
      })
    )

  private analyzeProject = (projectPath: string) =>
    pipe(
      Effect.succeed({
        path: projectPath,
        watching: false,
        lastSync: new Date().toISOString(),
        detectedTools: [], // Would detect actual tools
        ruleCount: 0, // Would count actual rules
      } satisfies ProjectState)
    )

  private startFileWatchers = () =>
    pipe(
      Effect.log('👀 Starting file watchers...'),
      Effect.all(
        Array.from(this.state.projects.values()).map(project => 
          this.startProjectWatcher(project)
        )
      ),
      Effect.tap(() => Effect.log('✅ All file watchers started'))
    )

  private startProjectWatcher = (project: ProjectState) =>
    pipe(
      Effect.sync(() => createDefaultWatcherConfig(project.path)),
      Effect.flatMap(config => startFileWatcher(config)),
      Effect.tap(() => {
        project.watching = true
        return Effect.log(`👀 Watching project: ${project.path}`)
      })
    )

  private setupHealthChecks = () =>
    pipe(
      Effect.log('💚 Setting up health checks...'),
      Effect.sync(() => {
        // Setup periodic health checks
        setInterval(() => {
          this.performHealthCheck()
        }, 30000) // Every 30 seconds
      }),
      Effect.tap(() => Effect.log('✅ Health checks configured'))
    )

  private performHealthCheck = () => {
    // Check MCP server health
    if (this.config.mcpServer.enabled && !this.state.mcpServer.running) {
      console.error('⚠️  MCP server is down, attempting restart...')
      Effect.runFork(this.restartMcpServer())
    }

    // Check project watchers
    for (const [path, project] of this.state.projects) {
      if (!project.watching) {
        console.error(`⚠️  File watcher stopped for ${path}, restarting...`)
        Effect.runFork(this.startProjectWatcher(project))
      }
    }
  }

  private restartMcpServer = () =>
    pipe(
      Effect.log('🔄 Restarting MCP server...'),
      this.startMcpServer()
    )

  private printStatus = () =>
    pipe(
      Effect.log(''),
      Effect.log('📊 Daemon Status:'),
      Effect.log('━━━━━━━━━━━━━━━━━━━━━━━━━━'),
      Effect.log(`🚀 Status: ${this.state.isRunning ? 'Running' : 'Stopped'}`),
      Effect.log(`📅 Started: ${new Date(this.state.startedAt).toLocaleString()}`),
      Effect.log(`🔌 MCP Server: ${this.state.mcpServer.running ? `Running on port ${this.state.mcpServer.port}` : 'Stopped'}`),
      Effect.log(`📂 Projects: ${this.state.projects.size}`),
      Effect.log(''),
      Effect.log('🔗 To connect AI tools, add this MCP server configuration:'),
      Effect.log(''),
      Effect.log('  Cursor (.cursor/config.json):'),
      Effect.log('  {'),
      Effect.log('    "mcpServers": {'),
      Effect.log('      "vibe": {'),
      Effect.log('        "command": "vibe",'),
      Effect.log('        "args": ["daemon", "--mcp-only"]'),
      Effect.log('      }'),
      Effect.log('    }'),
      Effect.log('  }'),
      Effect.log(''),
      Effect.log('  Claude Desktop (~/.config/claude/claude_desktop_config.json):'),
      Effect.log('  {'),
      Effect.log('    "mcpServers": {'),
      Effect.log('      "vibe": {'),
      Effect.log('        "command": "vibe-daemon",'),
      Effect.log('        "args": ["--mcp-only"]'),
      Effect.log('      }'),
      Effect.log('    }'),
      Effect.log('  }'),
      Effect.log(''),
      Effect.log('📄 Logs: tail -f /tmp/vibe-daemon.log'),
      Effect.log('🛑 Stop: pkill vibe-daemon'),
      Effect.log('')
    )

  private waitForShutdown = () =>
    pipe(
      setupSignalHandlers(() => this.shutdown()),
      Effect.flatMap(() => 
        Effect.async<never, never, void>(() => {
          // Keep running until signal received
        })
      )
    )

  private shutdown = () =>
    pipe(
      Effect.log('🛑 Shutting down daemon...'),
      Effect.tryPromise({
        try: async () => {
          // Close HTTP server if running
          if (this.httpServer) {
            await this.httpServer.shutdown()
          }
          // Remove PID file
          await Deno.remove(this.config.daemon.pidFile).catch(() => {})
        },
        catch: () => new Error('Failed during shutdown'),
      }),
      Effect.tap(() => Effect.log('✅ Daemon stopped')),
      Effect.flatMap(() => Effect.sync(() => Deno.exit(0)))
    )
}

// Main entry point
if (import.meta.main) {
  const daemon = new VibeDaemon()
  
  // Handle command line arguments
  const args = Deno.args
  
  if (args.includes('--mcp-only')) {
    // Just start MCP server for AI tool integration
    import('../src/mcp-server/index.ts')
  } else {
    // Start full daemon
    daemon.start().catch(error => {
      console.error('❌ Daemon failed to start:', error)
      Deno.exit(1)
    })
  }
}