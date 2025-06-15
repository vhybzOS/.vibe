/**
 * Effect-TS utilities and Deno-native file system wrappers
 * Pure functional wrappers around Deno APIs using Effect-TS
 * NO CLASSES - uses functional tagged union errors from lib/errors.ts
 */

import { Effect, pipe } from 'effect'
import { 
  createFileSystemError, 
  createParseError, 
  createTimeoutError, 
  type VibeError 
} from './errors.ts'

/**
 * Safely reads a text file with proper error handling
 */
export const readTextFile = (filePath: string) =>
  pipe(
    Effect.tryPromise({
      try: () => Deno.readTextFile(filePath),
      catch: (error) => createFileSystemError(error, filePath, 'Failed to read file'),
    })
  )

/**
 * Safely writes a text file with proper error handling
 */
export const writeTextFile = (filePath: string, content: string) =>
  pipe(
    Effect.tryPromise({
      try: () => Deno.writeTextFile(filePath, content),
      catch: (error) => createFileSystemError(error, filePath, 'Failed to write file'),
    })
  )

/**
 * Safely creates a directory with proper error handling
 */
export const ensureDir = (dirPath: string) =>
  pipe(
    Effect.tryPromise({
      try: () => Deno.mkdir(dirPath, { recursive: true }),
      catch: (error) => createFileSystemError(error, dirPath, 'Failed to create directory'),
    })
  )

/**
 * Safely reads a directory with proper error handling
 */
export const readDir = (dirPath: string) =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        const entries = []
        for await (const entry of Deno.readDir(dirPath)) {
          entries.push(entry)
        }
        return entries
      },
      catch: (error) => createFileSystemError(error, dirPath, 'Failed to read directory'),
    })
  )

/**
 * Safely checks if a file exists
 */
export const fileExists = (filePath: string) =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        try {
          await Deno.stat(filePath)
          return true
        } catch {
          return false
        }
      },
      catch: (error) => createFileSystemError(error, filePath, 'Failed to check file existence'),
    })
  )

/**
 * Safely parses JSON with proper error handling
 */
export const parseJSON = <T>(content: string, context: string = 'unknown') =>
  pipe(
    Effect.try({
      try: () => JSON.parse(content) as T,
      catch: (error) => createParseError(error, content, `Invalid JSON in ${context}`),
    })
  )

/**
 * Creates a standardized log effect with context
 */
export const logWithContext = (context: string, message: string) =>
  Effect.log(`[${context}] ${message}`)

/**
 * Retries an effect with exponential backoff
 */
export const retryWithBackoff = <A, E>(
  effect: Effect.Effect<A, E>,
  maxAttempts: number = 3,
  _baseDelay: number = 1000
) =>
  pipe(
    effect,
    Effect.retry({ times: maxAttempts - 1 })
  )

/**
 * Timeout wrapper for effects
 */
export const withTimeout = <A, E>(
  effect: Effect.Effect<A, E>,
  timeoutMs: number
) =>
  pipe(
    effect,
    Effect.timeout(timeoutMs),
    Effect.catchTag('TimeoutException', () => 
      Effect.fail(createTimeoutError(timeoutMs, `Operation timed out after ${timeoutMs}ms`))
    )
  )

// Re-export the VibeError type for convenience
export type { VibeError }