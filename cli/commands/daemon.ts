import { Effect, pipe } from 'effect'

const DAEMON_CONTROL_PORT = 4242

/**
 * Interface for daemon status response
 */
interface DaemonStatusResponse {
  daemon: {
    name: string
    version: string
    isRunning: boolean
    startedAt: string
    pid: number
  }
  mcpServer: {
    running: boolean
    port: number
    startedAt?: string
  }
  projects: Array<{
    path: string
    watching: boolean
    lastSync: string
    detectedTools: string[]
    ruleCount: number
  }>
  config: any
}

/**
 * Attempts to communicate with the daemon via HTTP
 * 
 * @param endpoint - The endpoint to call (/status, /shutdown, etc.)
 * @param method - HTTP method (GET, POST)
 * @returns Effect that resolves to the response data
 */
const callDaemonApi = (endpoint: string, method: string = 'GET') =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        const response = await fetch(`http://localhost:${DAEMON_CONTROL_PORT}${endpoint}`, {
          method,
          signal: AbortSignal.timeout(5000), // 5 second timeout
        })
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        return await response.json()
      },
      catch: (error: unknown) => {
        if (error instanceof Error) {
          if (error.name === 'ConnectionError' || error.message.includes('ECONNREFUSED')) {
            return new Error('Daemon is not running or not responding')
          }
          return error
        }
        return new Error('Unknown error communicating with daemon')
      },
    })
  )

/**
 * Starts the daemon by spawning the vibe-daemon process
 */
const startDaemon = () =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        // First check if daemon is already running
        try {
          await fetch(`http://localhost:${DAEMON_CONTROL_PORT}/health`, { 
            signal: AbortSignal.timeout(1000) 
          })
          throw new Error('Daemon is already running')
        } catch (error) {
          if (error instanceof Error && error.message === 'Daemon is already running') {
            throw error
          }
          // Daemon is not running, proceed to start it
        }
        
        // Try to use the built executable first, fall back to deno run
        let command: Deno.Command
        
        try {
          // Check if built executable exists
          await Deno.stat('./vibe-daemon')
          command = new Deno.Command('./vibe-daemon', {
            stdout: 'null',
            stderr: 'null',
            stdin: 'null',
          })
        } catch {
          // Fall back to deno run if built executable doesn't exist
          command = new Deno.Command(Deno.execPath(), {
            args: ['run', '--allow-all', './daemon.ts'],
            stdout: 'null',
            stderr: 'null',
            stdin: 'null',
          })
        }
        
        const child = command.spawn()
        
        // Give daemon time to start
        await new Promise(resolve => setTimeout(resolve, 3000))
        
        // Check if it's actually running
        const response = await fetch(`http://localhost:${DAEMON_CONTROL_PORT}/health`, {
          signal: AbortSignal.timeout(2000)
        })
        
        if (!response.ok) {
          throw new Error('Daemon started but is not responding properly')
        }
        
        return child
      },
      catch: (error) => error instanceof Error ? error : new Error('Failed to start daemon'),
    })
  )

/**
 * Main daemon command handler
 * 
 * @param action - The action to perform (status, start, stop, restart, help)
 * @param options - Command options
 * @returns Effect that handles the daemon command
 */
export const daemonCommand = (
  action: string,
  options: Record<string, unknown>
) => {
  switch (action) {
    case 'status':
      return pipe(
        callDaemonApi('/status'),
        Effect.flatMap((status: DaemonStatusResponse) =>
          pipe(
            Effect.log('📊 Daemon Status Report'),
            Effect.log('━━━━━━━━━━━━━━━━━━━━━━━━━━'),
            Effect.log(''),
            Effect.log(`🤖 Daemon: ${status.daemon.name} v${status.daemon.version}`),
            Effect.log(`📊 Status: ${status.daemon.isRunning ? '🟢 Running' : '🔴 Stopped'}`),
            Effect.log(`🔢 PID: ${status.daemon.pid}`),
            Effect.log(`📅 Started: ${new Date(status.daemon.startedAt).toLocaleString()}`),
            Effect.log(''),
            Effect.log(`🔌 MCP Server: ${status.mcpServer.running ? `🟢 Running on port ${status.mcpServer.port}` : '🔴 Stopped'}`),
            status.mcpServer.startedAt 
              ? Effect.log(`   Started: ${new Date(status.mcpServer.startedAt).toLocaleString()}`)
              : Effect.succeed(void 0),
            Effect.log(''),
            Effect.log(`📂 Projects: ${status.projects.length} detected`),
            Effect.all(
              status.projects.map(project =>
                pipe(
                  Effect.log(`   📁 ${project.path}`),
                  Effect.log(`      👀 Watching: ${project.watching ? '✅' : '❌'}`),
                  Effect.log(`      🔧 Tools: ${project.detectedTools.join(', ') || 'None'}`),
                  Effect.log(`      📝 Rules: ${project.ruleCount}`),
                  Effect.log(`      🔄 Last sync: ${new Date(project.lastSync).toLocaleString()}`)
                )
              )
            ),
            status.projects.length === 0 
              ? Effect.log('   No projects found. Initialize with: vibe init')
              : Effect.succeed(void 0),
            Effect.log('')
          )
        ),
        Effect.catchAll((error) =>
          pipe(
            Effect.log('❌ Cannot connect to daemon'),
            Effect.log(`   ${error.message}`),
            Effect.log(''),
            Effect.log('💡 To start the daemon: vibe daemon start'),
            Effect.log('💡 Or run directly: vibe-daemon')
          )
        )
      )
      
    case 'stop':
      return pipe(
        callDaemonApi('/shutdown', 'POST'),
        Effect.flatMap(() =>
          pipe(
            Effect.log('🛑 Shutdown request sent to daemon'),
            Effect.log('⏳ Waiting for graceful shutdown...'),
            // Wait a moment for shutdown
            Effect.sleep(2000),
            Effect.log('✅ Daemon stopped')
          )
        ),
        Effect.catchAll((error) =>
          pipe(
            Effect.log('❌ Failed to stop daemon'),
            Effect.log(`   ${error.message}`),
            Effect.log(''),
            Effect.log('💡 Try: pkill vibe-daemon')
          )
        )
      )
      
    case 'start':
      return pipe(
        startDaemon(),
        Effect.flatMap(() =>
          pipe(
            Effect.log('🚀 Daemon started successfully'),
            Effect.log('✅ Control server available'),
            Effect.log('🔌 MCP server initializing...'),
            Effect.log(''),
            Effect.log('📊 Check status: vibe daemon status'),
            Effect.log('🛑 Stop daemon: vibe daemon stop')
          )
        ),
        Effect.catchAll((error) =>
          pipe(
            Effect.log('❌ Failed to start daemon'),
            Effect.log(`   ${error.message}`),
            Effect.log(''),
            Effect.log('💡 Try running directly: vibe-daemon'),
            Effect.log('💡 Check logs: tail -f /tmp/vibe-daemon.log')
          )
        )
      )
      
    case 'restart':
      return pipe(
        callDaemonApi('/shutdown', 'POST'),
        Effect.flatMap(() => Effect.sleep(3000)), // Wait for shutdown
        Effect.flatMap(() => startDaemon()),
        Effect.flatMap(() =>
          pipe(
            Effect.log('🔄 Daemon restarted successfully'),
            Effect.log('📊 Check status: vibe daemon status')
          )
        ),
        Effect.catchAll((error) =>
          pipe(
            Effect.log('❌ Failed to restart daemon'),
            Effect.log(`   ${error.message}`)
          )
        )
      )
      
    case 'help':
    default:
      return pipe(
        Effect.log('🤖 Vibe Daemon Management'),
        Effect.log('━━━━━━━━━━━━━━━━━━━━━━━━━━'),
        Effect.log(''),
        Effect.log('Commands:'),
        Effect.log('  vibe daemon status   Show daemon status and health'),
        Effect.log('  vibe daemon start    Start the daemon'),
        Effect.log('  vibe daemon stop     Stop the daemon gracefully'),
        Effect.log('  vibe daemon restart  Restart the daemon'),
        Effect.log(''),
        Effect.log('Direct usage:'),
        Effect.log('  vibe-daemon          Start daemon directly'),
        Effect.log(''),
        Effect.log('System service:'),
        Effect.log('  # Copy vibe-daemon to /usr/local/bin/'),
        Effect.log('  # systemctl --user enable vibe-daemon.service'),
        Effect.log('  # systemctl --user start vibe-daemon.service'),
        Effect.log('')
      )
  }
}