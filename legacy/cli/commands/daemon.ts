/**
 * Daemon command - Manages the vibe daemon
 * Clean, functional implementation using Effect-TS
 */

import { Effect, pipe } from 'effect'
import { createCliError, type VibeError } from '../../lib/errors.ts'
import { type CommandFn } from '../base.ts'

const DAEMON_PORT = 4242
const DAEMON_URL = `http://localhost:${DAEMON_PORT}`

/**
 * Core daemon logic - daemon management doesn't require .vibe directory
 */
const daemonLogic: CommandFn<{ action: 'start' | 'stop' | 'status' | 'restart' | 'help' }, void> = 
  (_projectPath, options) =>
    pipe(
      Effect.log(`🔧 Daemon ${options.action}...`),
      Effect.flatMap(() => {
        switch (options.action) {
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
            return Effect.fail(new Error(`Unknown daemon action: ${options.action}`))
        }
      }),
      Effect.catchAll((error) => Effect.fail(createCliError(error, 'Daemon operation failed', 'daemon')))
    )

/**
 * Daemon command - doesn't use withVibeDirectory since it's global daemon management
 */
export const daemonCommand = (
  action: 'start' | 'stop' | 'status' | 'restart' | 'help',
  _options: Record<string, unknown>,
): Effect.Effect<void, Error | VibeError, never> =>
  daemonLogic('', { action })

/**
 * Check daemon status
 */
const checkDaemonStatus = (): Effect.Effect<void, Error | VibeError, never> =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        const response = await fetch(`${DAEMON_URL}/status`)
        if (!response.ok) {
          throw new Error('Daemon not responding')
        }
        return await response.json()
      },
      catch: (error) => new Error(`Failed to check daemon status: ${error}`),
    }),
    Effect.flatMap((status) =>
      pipe(
        Effect.log('✅ Daemon is running'),
        Effect.flatMap(() => Effect.log(`   Port: ${status.port || DAEMON_PORT}`)),
        Effect.flatMap(() => Effect.log(`   PID: ${status.pid || 'unknown'}`)),
        Effect.flatMap(() => Effect.log(`   Started: ${status.startedAt || 'unknown'}`)),
      )
    ),
    Effect.catchAll(() => 
      pipe(
        Effect.log('❌ Daemon is not running'),
        Effect.flatMap(() => Effect.log('   Start with: vibe daemon start')),
      )
    ),
  )

/**
 * Stop daemon
 */
const stopDaemon = (): Effect.Effect<void, Error | VibeError, never> =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        const response = await fetch(`${DAEMON_URL}/shutdown`, {
          method: 'POST',
        })
        return response.ok
      },
      catch: (error) => new Error(`Failed to stop daemon: ${error}`),
    }),
    Effect.flatMap((stopped) => {
      if (stopped) {
        return Effect.log('✅ Daemon stopped successfully')
      } else {
        return pipe(
          Effect.log('⚠️  Could not stop daemon'),
          Effect.flatMap(() => Effect.log('   It may not be running or may have stopped already')),
        )
      }
    }),
  )

/**
 * Start daemon
 */
const startDaemon = (): Effect.Effect<void, Error | VibeError, never> =>
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
        catch: (error) => new Error(`Failed to check daemon status: ${error}`),
      }).pipe(
        Effect.catchAll(() => Effect.succeed(false)) // If check fails, assume not running
      )
    ),
    Effect.flatMap((isRunning) => {
      if (isRunning) {
        return Effect.log('ℹ️  Daemon is already running')
      } else {
        return pipe(
          Effect.log('💡 Start the daemon manually:'),
          Effect.flatMap(() => Effect.log('   deno task daemon')),
        )
      }
    }),
  )

/**
 * Restart daemon
 */
const restartDaemon = (): Effect.Effect<void, Error | VibeError, never> =>
  pipe(
    Effect.log('🔄 Restarting daemon...'),
    Effect.flatMap(() => stopDaemon()),
    Effect.flatMap(() => Effect.sleep('1 second')),
    Effect.flatMap(() => startDaemon()),
  )

/**
 * Show daemon help
 */
const showDaemonHelp = (): Effect.Effect<void, Error | VibeError, never> =>
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
    Effect.flatMap(() => Effect.log('   ./vibe-daemon        - Start compiled daemon')),
  )
