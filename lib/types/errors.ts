/**
 * Error Types - Production Ready
 * 
 * Tagged union error system for v2 commands
 */

export interface FileSystemError {
  readonly _tag: 'FileSystemError'
  readonly message: string
  readonly path?: string
  readonly operation?: string
}

export interface ConfigurationError {
  readonly _tag: 'ConfigurationError'
  readonly message: string
  readonly field?: string
}

export interface NetworkError {
  readonly _tag: 'NetworkError'
  readonly message: string
  readonly url?: string
}

export interface ParseError {
  readonly _tag: 'ParseError'
  readonly message: string
  readonly input?: string
}

export interface CliError {
  readonly _tag: 'CliError'
  readonly message: string
  readonly command?: string
}

export type VibeError = 
  | FileSystemError 
  | ConfigurationError 
  | NetworkError 
  | ParseError 
  | CliError

export const createFileSystemError = (
  error: unknown,
  path?: string,
  operation?: string
): FileSystemError => ({
  _tag: 'FileSystemError',
  message: error instanceof Error ? error.message : String(error),
  path,
  operation,
})

export const createConfigurationError = (
  error: unknown,
  field?: string
): ConfigurationError => ({
  _tag: 'ConfigurationError',
  message: error instanceof Error ? error.message : String(error),
  field,
})

export const createNetworkError = (
  error: unknown,
  url?: string
): NetworkError => ({
  _tag: 'NetworkError',
  message: error instanceof Error ? error.message : String(error),
  url,
})

export const createParseError = (
  error: unknown,
  input?: string
): ParseError => ({
  _tag: 'ParseError',
  message: error instanceof Error ? error.message : String(error),
  input,
})

export const createCliError = (
  error: unknown,
  command?: string
): CliError => ({
  _tag: 'CliError',
  message: error instanceof Error ? error.message : String(error),
  command,
})