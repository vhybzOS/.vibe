/**
 * CLI Command Base Utilities
 * Consolidates common patterns across CLI commands to reduce duplication
 */

import { Effect, pipe } from 'effect'
import { ensureVibeDirectory } from '../lib/fs.ts'
import { createCliError, type VibeError } from '../lib/errors.ts'

/**
 * Command function type
 */
export type CommandFunction<T = unknown, R = unknown> = (
  projectPath: string,
  options: T,
) => Effect.Effect<R, Error | VibeError, never>

/**
 * Simplified command function type for the new pattern
 */
export type CommandFn<O, R> = (projectPath: string, options: O) => Effect.Effect<R, Error | VibeError, never>

/**
 * Higher-order function that ensures .vibe directory exists before running command
 * Consolidates: export.ts, status.ts, sync.ts, generate.ts, etc.
 */
export const withVibeDirectory = <T, R>(
  command: CommandFunction<T, R>,
) =>
(projectPath: string, options: T) =>
  pipe(
    ensureVibeDirectory(projectPath),
    Effect.mapError((error) => createCliError(error, '.vibe directory check failed', 'cli')),
    Effect.flatMap((vibePath) =>
      command(vibePath, options).pipe(
        Effect.catchAll((error) => Effect.fail(createCliError(error, `Command failed`, 'cli'))),
      )
    ),
  )

/**
 * Standard error handling for CLI commands
 * Provides consistent error formatting and logging
 */
export const withErrorHandling = <T, R>(
  command: CommandFunction<T, R>,
) =>
(projectPath: string, options: T) =>
  pipe(
    command(projectPath, options),
    Effect.catchAll((error) => {
      // Log error for debugging
      const errorMessage = error instanceof Error ? error.message : String(error)
      return pipe(
        Effect.log(`❌ Command failed: ${errorMessage}`),
        Effect.flatMap(() => Effect.fail(error)),
      )
    }),
  )


/**
 * Success message helper for consistent CLI output
 */
export const logSuccess = (message: string) => Effect.log(`✅ ${message}`)

/**
 * Warning message helper for consistent CLI output
 */
export const logWarning = (message: string) => Effect.log(`⚠️  ${message}`)

/**
 * Info message helper for consistent CLI output
 */
export const logInfo = (message: string) => Effect.log(`ℹ️  ${message}`)

/**
 * Standard error message formatting for CLI consistency
 */
export const formatCliError = (error: Error | VibeError): string =>
  '_tag' in error ? `[${error._tag}] ${error.message}` : error.message
