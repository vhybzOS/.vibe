/**
 * CLI Command Base Utilities
 * Consolidates common patterns across CLI commands to reduce duplication
 */

import { Effect, pipe } from 'effect'
import { ensureVibeDirectory } from '../lib/fs.ts'
import { createCliError } from '../lib/errors.ts'

/**
 * Command function type
 */
export type CommandFunction<T = unknown, R = unknown> = (
  projectPath: string,
  options: T
) => Effect.Effect<R, Error>

/**
 * Higher-order function that ensures .vibe directory exists before running command
 * Consolidates: export.ts, status.ts, sync.ts, generate.ts, etc.
 */
export const withVibeDirectory = <T, R>(
  command: CommandFunction<T, R>
) => (projectPath: string, options: T) =>
  pipe(
    ensureVibeDirectory(projectPath),
    Effect.flatMap(vibePath =>
      command(vibePath, options).pipe(
        Effect.catchAll(error =>
          Effect.fail(createCliError(error, `Command failed`, 'cli'))
        )
      )
    )
  )

/**
 * Standard error handling for CLI commands
 * Provides consistent error formatting and logging
 */
export const withErrorHandling = <T, R>(
  command: CommandFunction<T, R>
) => (projectPath: string, options: T) =>
  pipe(
    command(projectPath, options),
    Effect.catchAll(error => {
      // Log error for debugging
      const errorMessage = error instanceof Error ? error.message : String(error)
      return pipe(
        Effect.log(`❌ Command failed: ${errorMessage}`),
        Effect.flatMap(() => Effect.fail(error))
      )
    })
  )

/**
 * Combines vibe directory check and error handling
 * Most CLI commands should use this wrapper
 */
export const withStandardPrerequisites = <T, R>(
  command: CommandFunction<T, R>
) => withErrorHandling(withVibeDirectory(command))

/**
 * Success message helper for consistent CLI output
 */
export const logSuccess = (message: string) =>
  Effect.log(`✅ ${message}`)

/**
 * Warning message helper for consistent CLI output
 */
export const logWarning = (message: string) =>
  Effect.log(`⚠️  ${message}`)

/**
 * Info message helper for consistent CLI output
 */
export const logInfo = (message: string) =>
  Effect.log(`ℹ️  ${message}`)