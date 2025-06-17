/**
 * Discover command - Starts dependency discovery via daemon
 * Clean, functional implementation using Effect-TS
 */

import { Effect, pipe } from 'effect'
import { withVibeDirectory, type CommandFn } from '../base.ts'
import { createCliError, type VibeError } from '../../lib/errors.ts'

const DAEMON_PORT = 4242

/**
 * Core discovery logic - operates on .vibe directory path
 */
const discoverLogic: CommandFn<{ forceRefresh?: boolean }, void> = 
  (vibePath, options) =>
    pipe(
      Effect.log('🔍 Starting autonomous discovery via daemon...'),
      Effect.sync(() => vibePath.replace('/.vibe', '')), // Get project path from vibe path
      Effect.flatMap((projectPath) => startDiscoverySession(projectPath, options)),
      Effect.flatMap((sessionId) =>
        pipe(
          Effect.log(`📊 Discovery session started: ${sessionId}`),
          Effect.flatMap(() => Effect.log('✅ Discovery initiated successfully')),
        )
      ),
      Effect.catchAll((error) => Effect.fail(createCliError(error, 'Discovery failed', 'discover')))
    )

/**
 * Discovery command that starts discovery session via daemon API
 */
export const discoverCommand = withVibeDirectory(discoverLogic)

/**
 * Start discovery session via daemon API
 */
const startDiscoverySession = (
  projectPath: string,
  options: { forceRefresh?: boolean },
): Effect.Effect<string, Error | VibeError, never> =>
  Effect.tryPromise({
    try: async () => {
      const url = `http://localhost:${DAEMON_PORT}/api/discovery/start`
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectPath,
          forceRefresh: options.forceRefresh || false,
        }),
      })

      if (!response.ok) {
        throw new Error(`Daemon API error: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error('Discovery session failed to start')
      }

      return result.sessionId || 'unknown'
    },
    catch: (error) => {
      if (error instanceof Error) {
        if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch')) {
          return new Error('Daemon not running. Start with `vibe daemon` first.')
        }
        return error
      }
      return new Error('Failed to start discovery session')
    },
  })
