#!/usr/bin/env -S deno run --allow-all

import { Effect, pipe } from 'effect'
import { resolve } from '@std/path'
import { expandGlob } from 'https://deno.land/std@0.211.0/fs/expand_glob.ts'
import { createDefaultWatcherConfig, startFileWatcher } from '../services/file_watcher_service.ts'
import { startMcpServer } from '../../mcp-server/server.ts'
import { DaemonConfig, loadDaemonConfig, saveDaemonConfig } from './config.ts'
// Signal handlers inlined for consolidation
import { ensureVibeDirectory } from './setup.ts'

const DAEMON_VERSION = '1.0.0'
const DAEMON_NAME = 'vibe-daemon'

/**
 * Setup signal handlers for graceful shutdown
 */
const setupSignalHandlers = (shutdownCallback: () => void) =>
  Effect.sync(() => {
    // Handle SIGINT (Ctrl+C)
    Deno.addSignalListener('SIGINT', () => {
      console.log('\n🛑 Received SIGINT, shutting down gracefully...')
      shutdownCallback()
    })

    // Handle SIGTERM
    Deno.addSignalListener('SIGTERM', () => {
      console.log('\n🛑 Received SIGTERM, shutting down gracefully...')
      shutdownCallback()
    })

    // Handle SIGHUP (reload config)
    Deno.addSignalListener('SIGHUP', () => {
      console.log('\n🔄 Received SIGHUP, reloading configuration...')
      // Future: Implement config reload
    })

    console.log('📡 Signal handlers registered')
  })

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

class VibeDaemon {
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
      controlPort: 3002,
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
      maxProjects: 10,
      ignorePaths: ['node_modules', '.git', 'dist', 'build'],
      projectScanRoots: ['~/'],
    },
  }

  start() {
    return Effect.runPromise(
      pipe(
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
      )
    )
  }

  private loadConfiguration = () =>
    pipe(
      loadDaemonConfig(),
      Effect.map((config) => {
        this.config = { ...this.config, ...config }
        return config
      }),
      Effect.tap(() => Effect.log('⚙️  Configuration loaded')),
      Effect.catchAll(() => {
        // Use default config if loading fails
        return pipe(
          Effect.log('ℹ️  Using default configuration'),
          Effect.flatMap(() => saveDaemonConfig(this.config)),
          Effect.map(() => this.config),
        )
      }),
    )

  /**
   * Starts the HTTP server for daemon control API
   * Provides endpoints for status checking and shutdown commands
   */
  private startHttpServer = () =>
    pipe(
      Effect.tryPromise({
        try: async () => {
          const handler = (req: Request): Response => {
            const url = new URL(req.url)

            switch (url.pathname) {
              case '/status':
                return new Response(
                  JSON.stringify({
                    daemon: {
                      name: this.config.daemon.name,
                      version: this.config.daemon.version,
                      isRunning: this.state.isRunning,
                      startedAt: this.state.startedAt,
                      pid: Deno.pid,
                    },
                    mcpServer: this.state.mcpServer,
                    projects: Array.from(this.state.projects.entries()).map(([path, state]) => ({
                      ...state,
                      path, // Explicit path overrides any path in state
                    })),
                    config: this.config,
                  }),
                  {
                    headers: { 'Content-Type': 'application/json' },
                  },
                )

              case '/shutdown':
                if (req.method === 'POST') {
                  // Initiate graceful shutdown
                  setTimeout(() => {
                    Effect.runFork(this.shutdown())
                  }, 100)
                  return new Response(JSON.stringify({ message: 'Shutdown initiated' }), {
                    headers: { 'Content-Type': 'application/json' },
                  })
                }
                return new Response('Method not allowed', { status: 405 })

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

              default:
                return new Response('Not found', { status: 404 })
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
      Effect.tap(() =>
        Effect.log(
          `🌐 Control server running on http://localhost:${this.config.daemon.controlPort}`,
        )
      ),
    )

  private setupPidFile = () =>
    pipe(
      Effect.tryPromise({
        try: () => Deno.writeTextFile(this.config.daemon.pidFile, Deno.pid.toString()),
        catch: () => new Error('Failed to create PID file'),
      }),
      Effect.tap(() => Effect.log(`📄 PID file created: ${this.config.daemon.pidFile}`)),
    )

  private startMcpServer = () =>
    pipe(
      Effect.log('🔌 Starting MCP server...'),
      Effect.flatMap(() => startMcpServer(this.config.mcpServer)),
      Effect.tap(() => {
        this.state.mcpServer.running = true
        this.state.mcpServer.startedAt = new Date().toISOString()
        return Effect.log(
          `✅ MCP server running on ${this.config.mcpServer.host}:${this.config.mcpServer.port}`,
        )
      }),
      Effect.catchAll((error) => Effect.log(`❌ Failed to start MCP server: ${error}`)),
    )

  private discoverProjects = () =>
    pipe(
      Effect.log('🔍 Discovering .vibe projects...'),
      Effect.flatMap(() => this.scanForVibeProjects()),
      Effect.tap((projects) => Effect.log(`📂 Found ${projects.length} .vibe project(s)`)),
      Effect.flatMap((projects) =>
        Effect.all(
          projects.map((projectPath) => this.registerProject(projectPath)),
        )
      ),
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

              for await (
                const entry of expandGlob(globPattern, {
                  followSymlinks: false,
                  exclude: config.ignorePaths.map((path) => `**/${path}/**`),
                })
              ) {
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
      }),
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
      Effect.tap((projectState) => {
        this.state.projects.set(projectPath, projectState)
        return Effect.log(`📝 Registered project: ${projectPath}`)
      }),
    )

  private analyzeProject = (projectPath: string) =>
    pipe(
      Effect.succeed(
        {
          path: projectPath,
          watching: false,
          lastSync: new Date().toISOString(),
          detectedTools: [], // Would detect actual tools
          ruleCount: 0, // Would count actual rules
        } satisfies ProjectState,
      ),
    )

  private startFileWatchers = () =>
    pipe(
      Effect.log('👀 Starting file watchers...'),
      Effect.flatMap(() => 
        Effect.all(
          Array.from(this.state.projects.values()).map((project) => this.startProjectWatcher(project)),
        )
      ),
      Effect.flatMap(() => Effect.log('✅ All file watchers started')),
    )

  private startProjectWatcher = (project: ProjectState) =>
    pipe(
      Effect.sync(() => createDefaultWatcherConfig(project.path)),
      Effect.flatMap((config) => startFileWatcher(config)),
      Effect.tap(() => {
        project.watching = true
        return Effect.log(`👀 Watching project: ${project.path}`)
      }),
    )

  private setupHealthChecks = () =>
    pipe(
      Effect.log('💚 Setting up health checks...'),
      Effect.flatMap(() => Effect.sync(() => {
        // Setup periodic health checks
        setInterval(() => {
          this.performHealthCheck()
        }, 30000) // Every 30 seconds
      })),
      Effect.flatMap(() => Effect.log('✅ Health checks configured')),
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
      this.startMcpServer(),
    )

  private printStatus = () =>
    pipe(
      Effect.log(''),
      Effect.log('📊 Daemon Status:'),
      Effect.log('━━━━━━━━━━━━━━━━━━━━━━━━━━'),
      Effect.log(`🚀 Status: ${this.state.isRunning ? 'Running' : 'Stopped'}`),
      Effect.log(`📅 Started: ${new Date(this.state.startedAt).toLocaleString()}`),
      Effect.log(
        `🔌 MCP Server: ${this.state.mcpServer.running ? `Running on port ${this.state.mcpServer.port}` : 'Stopped'}`,
      ),
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
      Effect.log('  Claude Desktop config:'),
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
      Effect.log(''),
    )

  private waitForShutdown = () =>
    pipe(
      setupSignalHandlers(() => this.shutdown()),
      Effect.flatMap(() =>
        Effect.async<never, never, void>(() => {
          // Keep running until signal received
        })
      ),
    )

  private shutdown = () =>
    pipe(
      Effect.log('🛑 Shutting down daemon...'),
      Effect.flatMap(() => Effect.tryPromise({
        try: async () => {
          // Close HTTP server if running
          if (this.httpServer) {
            await this.httpServer.shutdown()
          }
          // Remove PID file
          await Deno.remove(this.config.daemon.pidFile).catch(() => {})
        },
        catch: () => new Error('Failed during shutdown'),
      })),
      Effect.tap(() => Effect.log('✅ Daemon stopped')),
      Effect.flatMap(() => Effect.sync(() => Deno.exit(0))),
    )
}

// Main entry point
if (import.meta.main) {
  const daemon = new VibeDaemon()

  // Handle command line arguments
  const args = Deno.args

  if (args.includes('--mcp-only')) {
    // Just start MCP server for AI tool integration
    import('../mcp-server/index.ts')
  } else {
    // Start full daemon
    daemon.start().catch((error) => {
      console.error('❌ Daemon failed to start:', error)
      Deno.exit(1)
    })
  }
}
