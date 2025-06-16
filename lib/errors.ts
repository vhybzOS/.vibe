/**
 * Functional error system using tagged unions
 * NO CLASSES - uses pure data structures for type-safe error handling
 */

/**
 * File system error, tagged with `tag: 'FileSystemError'`
 */
export interface FileSystemError {
  readonly _tag: 'FileSystemError'
  readonly error: unknown
  readonly path: string
  readonly message: string
}

/**
 * Configuration error, tagged with `_tag: 'ConfigurationError'`
 */
export interface ConfigurationError {
  readonly _tag: 'ConfigurationError'
  readonly error: unknown
  readonly message: string
}

/**
 * Parsing error, tagged with `_tag: 'ParseError'`
 */
export interface ParseError {
  readonly _tag: 'ParseError'
  readonly error: unknown
  readonly content: string
  readonly message: string
}

/**
 * Network/HTTP error, tagged with `_tag: 'NetworkError'`
 */
export interface NetworkError {
  readonly _tag: 'NetworkError'
  readonly error: unknown
  readonly url?: string
  readonly message: string
}

/**
 * Cryptography error, tagged with `_tag: 'CryptoError'`
 */
export interface CryptoError {
  readonly _tag: 'CryptoError'
  readonly error: unknown
  readonly message: string
}

/**
 * Discovery error, tagged with `_tag: 'DiscoveryError'`
 */
export interface DiscoveryError {
  readonly _tag: 'DiscoveryError'
  readonly error: unknown
  readonly message: string
}

/**
 * Version error, tagged with `_tag: 'VersionError'`
 */
export interface VersionError {
  readonly _tag: 'VersionError'
  readonly version: string
  readonly message: string
}

/**
 * Timeout error, tagged with `_tag: 'TimeoutError'`
 */
export interface TimeoutError {
  readonly _tag: 'TimeoutError'
  readonly timeoutMs: number
  readonly message: string
}

/**
 * Daemon service error, tagged with `_tag: 'DaemonError'`
 */
export interface DaemonError {
  readonly _tag: 'DaemonError'
  readonly error: unknown
  readonly message: string
  readonly component: string
}

/**
 * MCP protocol error, tagged with `_tag: 'McpError'`
 */
export interface McpError {
  readonly _tag: 'McpError'
  readonly error: unknown
  readonly message: string
  readonly operation: string
}

/**
 * CLI command error, tagged with `_tag: 'CliError'`
 */
export interface CliError {
  readonly _tag: 'CliError'
  readonly error: unknown
  readonly message: string
  readonly command: string
}

/**
 * Union of all possible application-level errors
 * This allows for exhaustive, type-safe error handling
 */
export type VibeError = 
  | FileSystemError 
  | ConfigurationError 
  | ParseError 
  | NetworkError 
  | CryptoError 
  | DiscoveryError 
  | VersionError 
  | TimeoutError
  | DaemonError
  | McpError
  | CliError

/**
 * Helper functions to create errors in a functional way
 */
export const createFileSystemError = (
  error: unknown,
  path: string,
  message: string
): FileSystemError => ({
  _tag: 'FileSystemError',
  error,
  path,
  message,
})

export const createConfigurationError = (
  error: unknown,
  message: string
): ConfigurationError => ({
  _tag: 'ConfigurationError',
  error,
  message,
})

export const createParseError = (
  error: unknown,
  content: string,
  message: string
): ParseError => ({
  _tag: 'ParseError',
  error,
  content,
  message,
})

export const createNetworkError = (
  error: unknown,
  message: string,
  url?: string
): NetworkError => ({
  _tag: 'NetworkError',
  error,
  ...(url && { url }),
  message,
})

export const createCryptoError = (
  error: unknown,
  message: string
): CryptoError => ({
  _tag: 'CryptoError',
  error,
  message,
})

export const createDiscoveryError = (
  error: unknown,
  message: string
): DiscoveryError => ({
  _tag: 'DiscoveryError',
  error,
  message,
})

export const createVersionError = (
  version: string,
  message: string
): VersionError => ({
  _tag: 'VersionError',
  version,
  message,
})

export const createTimeoutError = (
  timeoutMs: number,
  message: string
): TimeoutError => ({
  _tag: 'TimeoutError',
  timeoutMs,
  message,
})

export const createDaemonError = (
  error: unknown,
  message: string,
  component: string
): DaemonError => ({
  _tag: 'DaemonError',
  error,
  message,
  component,
})

export const createMcpError = (
  error: unknown,
  message: string,
  operation: string
): McpError => ({
  _tag: 'McpError',
  error,
  message,
  operation,
})

export const createCliError = (
  error: unknown,
  message: string,
  command: string
): CliError => ({
  _tag: 'CliError',
  error,
  message,
  command,
})