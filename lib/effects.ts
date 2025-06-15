/**
 * Common Effect-TS utilities and patterns for the .vibe system
 * Centralizes error handling, logging, and common operations
 */

import { Effect, pipe } from 'effect'

/**
 * Standard error types for the .vibe system
 */
export class VibeError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: unknown
  ) {
    super(message)
    this.name = 'VibeError'
  }
}

export class FileSystemError extends VibeError {
  constructor(message: string, path: string, cause?: unknown) {
    super(`File system error at ${path}: ${message}`, 'FS_ERROR', cause)
  }
}

export class ConfigurationError extends VibeError {
  constructor(message: string, cause?: unknown) {
    super(`Configuration error: ${message}`, 'CONFIG_ERROR', cause)
  }
}

export class ParseError extends VibeError {
  constructor(message: string, content: string, cause?: unknown) {
    super(`Parse error: ${message}`, 'PARSE_ERROR', cause)
  }
}

/**
 * Safely reads a text file with proper error handling
 */
export const readTextFile = (filePath: string) =>
  pipe(
    Effect.tryPromise({
      try: () => Deno.readTextFile(filePath),
      catch: (error) => new FileSystemError('Failed to read file', filePath, error),
    })
  )

/**
 * Safely writes a text file with proper error handling
 */
export const writeTextFile = (filePath: string, content: string) =>
  pipe(
    Effect.tryPromise({
      try: () => Deno.writeTextFile(filePath, content),
      catch: (error) => new FileSystemError('Failed to write file', filePath, error),
    })
  )

/**
 * Safely creates a directory with proper error handling
 */
export const ensureDir = (dirPath: string) =>
  pipe(
    Effect.tryPromise({
      try: () => Deno.mkdir(dirPath, { recursive: true }),
      catch: (error) => new FileSystemError('Failed to create directory', dirPath, error),
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
      catch: (error) => new FileSystemError('Failed to read directory', dirPath, error),
    })
  )

/**
 * Safely parses JSON with proper error handling
 */
export const parseJSON = <T>(content: string, context: string = 'unknown') =>
  pipe(
    Effect.try({
      try: () => JSON.parse(content) as T,
      catch: (error) => new ParseError(`Invalid JSON in ${context}`, content, error),
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
  baseDelay: number = 1000
) =>
  pipe(
    effect,
    Effect.retry({
      times: maxAttempts - 1,
      schedule: (attempt) => Effect.sleep(baseDelay * Math.pow(2, attempt))
    })
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
      Effect.fail(new VibeError(`Operation timed out after ${timeoutMs}ms`, 'TIMEOUT'))
    )
  )