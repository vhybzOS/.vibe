/**
 * Tagged Union Error Types for .vibe
 * 
 * Based on legacy/v0.2 patterns - provides type-safe, composable error handling
 */

export interface FileSystemError {
  readonly _tag: 'FileSystemError'
  message: string
  path: string
  cause?: unknown
}

export interface ParseError {
  readonly _tag: 'ParseError'
  message: string
  cause?: unknown
}

export interface ConfigurationError {
  readonly _tag: 'ConfigurationError'
  message: string
  cause?: unknown
}

export interface CliError {
  readonly _tag: 'CliError'
  message: string
  command: string
  cause?: unknown
}

export type VibeError = FileSystemError | ParseError | ConfigurationError | CliError

// Error creators
export const createFileSystemError = (cause: unknown, path: string, message: string): FileSystemError => ({
  _tag: 'FileSystemError',
  message,
  path,
  cause,
})

export const createParseError = (cause: unknown, message: string): ParseError => ({
  _tag: 'ParseError',
  message,
  cause,
})

export const createConfigurationError = (cause: unknown, message: string): ConfigurationError => ({
  _tag: 'ConfigurationError',
  message,
  cause,
})

export const createCliError = (cause: unknown, message: string, command: string): CliError => ({
  _tag: 'CliError',
  message,
  command,
  cause,
})

// Error type guards
export const isVibeError = (error: unknown): error is VibeError => {
  return typeof error === 'object' && error !== null && '_tag' in error
}

// Error message formatting
export const formatError = (error: VibeError | Error): string => {
  if (isVibeError(error)) {
    return `[${error._tag}] ${error.message}`
  }
  return error.message
}