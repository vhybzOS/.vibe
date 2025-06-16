/**
 * Base manifest parser interface and types for the autonomous discovery system
 * Supports extensible parsers for different package managers and project types
 */

import { Effect } from 'effect'
import { createParseError, type VibeError } from '../../lib/errors.ts'

/**
 * Detected dependency from a manifest file
 */
export interface DetectedDependency {
  name: string
  version: string
  type: 'production' | 'development' | 'peer' | 'optional'
  scope?: string
  registry?: string
  source: string // which manifest file it came from
}

/**
 * Parsed manifest result containing all detected dependencies
 */
export interface ManifestParseResult {
  manifestType: string
  manifestPath: string
  projectName?: string
  projectVersion?: string
  dependencies: DetectedDependency[]
  metadata: {
    packageManager: string
    lockFileExists: boolean
    parsedAt: string
    confidence: number
  }
}

/**
 * Base interface for all manifest parsers
 */
export interface ManifestParser {
  readonly type: string
  readonly supportedFiles: readonly string[]
  readonly packageManager: string

  /**
   * Check if this parser can handle the given manifest file
   */
  canParse(manifestPath: string): Effect.Effect<boolean, VibeError>

  /**
   * Parse the manifest file and extract dependencies
   */
  parse(manifestPath: string): Effect.Effect<ManifestParseResult, VibeError>

  /**
   * Get additional metadata about the project from the manifest
   */
  getProjectMetadata(manifestPath: string): Effect.Effect<Record<string, unknown>, VibeError>
}

/**
 * Registry state for manifest parsers (functional)
 */
export interface ManifestParserRegistryState {
  readonly parsers: ReadonlyMap<string, ManifestParser>
}

/**
 * Creates an empty manifest parser registry state
 */
export const createManifestParserRegistry = (): ManifestParserRegistryState => ({
  parsers: new Map<string, ManifestParser>(),
})

/**
 * Registers a parser in the registry state
 */
export const registerParser = (
  state: ManifestParserRegistryState,
  parser: ManifestParser,
): ManifestParserRegistryState => ({
  parsers: new Map(state.parsers).set(parser.type, parser),
})

/**
 * Gets a parser by type from the registry state
 */
export const getParser = (
  state: ManifestParserRegistryState,
  type: string,
): ManifestParser | undefined => {
  return state.parsers.get(type)
}

/**
 * Gets all parsers from the registry state
 */
export const getAllParsers = (state: ManifestParserRegistryState): ManifestParser[] => {
  return Array.from(state.parsers.values())
}

/**
 * Gets the appropriate parser for a file path
 */
export const getParserForFile = (
  state: ManifestParserRegistryState,
  filePath: string,
): ManifestParser | undefined => {
  const fileName = filePath.split('/').pop() || ''

  for (const parser of state.parsers.values()) {
    if (parser.supportedFiles.includes(fileName)) {
      return parser
    }
  }

  return undefined
}

/**
 * Utility functions for manifest parsing
 */
export const parseJsonSafely = (content: string) =>
  Effect.try({
    try: () => JSON.parse(content),
    catch: (error) =>
      createParseError(
        error,
        content,
        `Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ),
  })

export const parseTomlSafely = (content: string) =>
  Effect.tryPromise({
    try: async () => {
      // Dynamic import for TOML parsing
      const { parse } = await import('@ltd/j-toml')
      return parse(content)
    },
    catch: (error) =>
      createParseError(
        error,
        content,
        `Failed to parse TOML: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ),
  })

/**
 * Normalize package name for consistent handling
 */
export const normalizePackageName = (name: string): { scope?: string; name: string } => {
  if (name.startsWith('@')) {
    const [scope, packageName] = name.split('/')
    if (scope && packageName) {
      return { scope: scope.substring(1), name: packageName }
    }
  }
  return { name }
}

/**
 * Create a default global registry instance
 */
export const globalManifestRegistry = createManifestParserRegistry()
