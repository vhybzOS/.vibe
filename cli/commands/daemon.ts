/**
 * Daemon command - Manages the vibe daemon
 * Clean, functional implementation using Effect-TS
 */

import { Effect, pipe } from 'effect'

const DAEMON_PORT = 4242
const DAEMON_URL = `http://localhost:${DAEMON_PORT}`

/**
 * Daemon command that manages daemon lifecycle
 */
export const daemonCommand = (
  action: 'start' | 'stop' | 'status' | 'restart' | 'help',
  _options: Record<string, unknown>
) =>
  pipe(
    Effect.log(`🔧 Daemon ${action}...`),
    Effect.flatMap(() => {
      switch (action) {
        case 'status':
          return checkDaemonStatus()
        case 'stop':
          return stopDaemon()
        case 'start':
          return startDaemon()
        case 'restart':
          return restartDaemon()
        case 'help':
          return showDaemonHelp()
        default:
          return Effect.fail(new Error(`Unknown daemon action: ${action}`))
      }
    })
  )

/**
 * Check daemon status
 */
const checkDaemonStatus = () =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        const response = await fetch(`${DAEMON_URL}/status`)
        if (!response.ok) {
          throw new Error('Daemon not responding')
        }
        return await response.json()
      },
      catch: () => null
    }),
    Effect.flatMap((status) => {
      if (status) {
        return pipe(
          Effect.log('✅ Daemon is running'),
          Effect.flatMap(() => Effect.log(`   Port: ${status.port || DAEMON_PORT}`)),
          Effect.flatMap(() => Effect.log(`   PID: ${status.pid || 'unknown'}`)),
          Effect.flatMap(() => Effect.log(`   Started: ${status.startedAt || 'unknown'}`))
        )
      } else {
        return pipe(
          Effect.log('❌ Daemon is not running'),
          Effect.flatMap(() => Effect.log('   Start with: vibe daemon start'))
        )
      }
    })
  )

/**
 * Stop daemon
 */
const stopDaemon = () =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        const response = await fetch(`${DAEMON_URL}/shutdown`, {
          method: 'POST'
        })
        return response.ok
      },
      catch: () => false
    }),
    Effect.flatMap((stopped) => {
      if (stopped) {
        return Effect.log('✅ Daemon stopped successfully')
      } else {
        return pipe(
          Effect.log('⚠️  Could not stop daemon'),
          Effect.flatMap(() => Effect.log('   It may not be running or may have stopped already'))
        )
      }
    })
  )

/**
 * Start daemon
 */
const startDaemon = () =>
  pipe(
    Effect.log('🚀 Starting daemon...'),
    Effect.flatMap(() => Effect.log('   Use: deno task daemon')),
    Effect.flatMap(() => Effect.log('   Or: ./vibe-daemon')),
    Effect.flatMap(() => 
      Effect.tryPromise({
        try: async () => {
          // Check if already running
          const response = await fetch(`${DAEMON_URL}/status`)
          return response.ok
        },
        catch: () => false
      })
    ),
    Effect.flatMap((isRunning) => {
      if (isRunning) {
        return Effect.log('ℹ️  Daemon is already running')
      } else {
        return pipe(
          Effect.log('💡 Start the daemon manually:'),
          Effect.flatMap(() => Effect.log('   deno task daemon'))
        )
      }
    })
  )

/**
 * Restart daemon
 */
const restartDaemon = () =>
  pipe(
    Effect.log('🔄 Restarting daemon...'),
    Effect.flatMap(() => stopDaemon()),
    Effect.flatMap(() => Effect.sleep('1 second')),
    Effect.flatMap(() => startDaemon())
  )

/**
 * Show daemon help
 */
const showDaemonHelp = () =>
  pipe(
    Effect.log(''),
    Effect.flatMap(() => Effect.log('🔧 .vibe Daemon Commands:')),
    Effect.flatMap(() => Effect.log('━━━━━━━━━━━━━━━━━━━━━━━━━━')),
    Effect.flatMap(() => Effect.log('   vibe daemon status   - Check daemon status')),
    Effect.flatMap(() => Effect.log('   vibe daemon start    - Start daemon')),
    Effect.flatMap(() => Effect.log('   vibe daemon stop     - Stop daemon')),
    Effect.flatMap(() => Effect.log('   vibe daemon restart  - Restart daemon')),
    Effect.flatMap(() => Effect.log('   vibe daemon help     - Show this help')),
    Effect.flatMap(() => Effect.log('')),
    Effect.flatMap(() => Effect.log('💡 Manual daemon commands:')),
    Effect.flatMap(() => Effect.log('   deno task daemon     - Start daemon directly')),
    Effect.flatMap(() => Effect.log('   ./vibe-daemon        - Start compiled daemon'))
  )