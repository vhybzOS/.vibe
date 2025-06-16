/**
 * Discover command - Starts dependency discovery via daemon
 * Clean, functional implementation using Effect-TS
 */

import { Effect, pipe } from 'effect'

const DAEMON_PORT = 4242

/**
 * Discovery command that starts discovery session via daemon API
 */
export const discoverCommand = (
  projectPath: string,
  options: { forceRefresh?: boolean },
) =>
  pipe(
    Effect.log('🔍 Starting autonomous discovery via daemon...'),
    Effect.flatMap(() => startDiscoverySession(projectPath, options)),
    Effect.flatMap((sessionId) =>
      pipe(
        Effect.log(`📊 Discovery session started: ${sessionId}`),
        Effect.flatMap(() => Effect.log('✅ Discovery initiated successfully')),
      )
    ),
    Effect.catchAll((error) =>
      pipe(
        Effect.log('❌ Discovery failed:'),
        Effect.flatMap(() => Effect.log(`   ${error instanceof Error ? error.message : 'Unknown error'}`)),
        Effect.flatMap(() => Effect.fail(error)),
      )
    ),
  )

/**
 * Start discovery session via daemon API
 */
const startDiscoverySession = (
  projectPath: string,
  options: { forceRefresh?: boolean },
) =>
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
