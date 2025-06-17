/**
 * CLI Utilities and Command Runner
 * 
 * Based on legacy/v0.2 CLI patterns - provides Effect-TS command execution
 */

import { Effect, pipe } from 'effect'
import { formatError, type VibeError } from './errors.ts'

// Command runner with proper error handling
export const runCommand = <T>(command: Effect.Effect<T, VibeError | Error>): Effect.Effect<T, never> =>
  pipe(
    command,
    Effect.catchAll((error) =>
      pipe(
        Effect.sync(() => {
          const message = formatError(error instanceof Error ? error : error)
          console.error(`❌ ${message}`)
          
          // Show debug info in debug mode
          if (Deno.env.get('VIBE_DEBUG') && error instanceof Error && error.cause) {
            console.error('Debug info:', error.cause)
          }
        }),
        Effect.flatMap(() => Effect.sync(() => Deno.exit(1)))
      )
    )
  )

// Command success logging
export const logSuccess = (message: string): Effect.Effect<void, never> =>
  Effect.sync(() => console.log(`✅ ${message}`))

export const logInfo = (message: string): Effect.Effect<void, never> =>
  Effect.sync(() => console.log(`ℹ️  ${message}`))

export const logWarning = (message: string): Effect.Effect<void, never> =>
  Effect.sync(() => console.log(`⚠️  ${message}`))