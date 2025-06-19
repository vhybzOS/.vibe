/**
 * Package Registry Client Service
 *
 * HTTP client for fetching package metadata from npm and JSR registries
 * Adapted from legacy/discovery/manifests/* patterns with Effect-TS
 *
 * @tested_by tests/unit/registry-client.test.ts (HTTP client, API responses, error handling, registry detection, package name extraction)
 * @tested_by tests/integration/vibe-code.test.ts (Registry integration, automatic fallback, domain discovery)
 * @tested_by tests/user/library-documentation.test.ts (End-to-end package resolution for npm and JSR packages)
 */

import { Effect, pipe } from 'effect'
import { createFileSystemError, type VibeError } from '../lib/errors.ts'
import { JsrPackageInfo, JsrPackageInfoSchema, NpmPackageInfo, NpmPackageInfoSchema } from '../schemas/library-cache.ts'

// Add network error type
export interface NetworkError {
  readonly _tag: 'NetworkError'
  message: string
  url: string
  status?: number
  cause?: unknown
}

export const createNetworkError = (
  cause: unknown,
  url: string,
  message: string,
  status?: number,
): NetworkError => ({
  _tag: 'NetworkError',
  message,
  url,
  ...(status !== undefined && { status }),
  cause,
})

type RegistryError = VibeError | NetworkError

/**
 * HTTP client with proper error handling
 */
const fetchJson = <T>(url: string, schema: { parse: (data: unknown) => T }): Effect.Effect<T, RegistryError> =>
  Effect.tryPromise({
    try: async () => {
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return schema.parse(data)
    },
    catch: (error) => {
      if (error instanceof Error) {
        // Try to extract HTTP status from error message
        const statusMatch = error.message.match(/HTTP (\d+):/)
        const status = statusMatch && statusMatch[1] ? parseInt(statusMatch[1]) : undefined

        return createNetworkError(error, url, `Failed to fetch ${url}: ${error.message}`, status)
      }
      return createNetworkError(error, url, `Failed to fetch ${url}`)
    },
  })

/**
 * Fetch package info from npm registry
 */
export const fetchNpmPackageInfo = (packageName: string): Effect.Effect<NpmPackageInfo, RegistryError> => {
  const url = `https://registry.npmjs.org/${packageName}`
  return pipe(
    fetchJson(url, NpmPackageInfoSchema),
    Effect.mapError((error) => {
      // Handle 404s specially for packages that don't exist
      if (error._tag === 'NetworkError' && error.status === 404) {
        return createNetworkError(
          error.cause,
          error.url,
          `Package '${packageName}' not found in npm registry`,
          404,
        )
      }
      return error
    }),
  )
}

/**
 * Fetch package info from JSR registry
 */
export const fetchJsrPackageInfo = (packageName: string): Effect.Effect<JsrPackageInfo, RegistryError> => {
  // Handle both @scope/name and scope/name formats
  const normalizedName = packageName.startsWith('@') ? packageName.slice(1) : packageName
  const url = `https://jsr.io/@${normalizedName}`

  return pipe(
    fetchJson(url, JsrPackageInfoSchema),
    Effect.mapError((error) => {
      // Handle 404s specially for packages that don't exist
      if (error._tag === 'NetworkError' && error.status === 404) {
        return createNetworkError(
          error.cause,
          error.url,
          `Package '${packageName}' not found in JSR registry`,
          404,
        )
      }
      return error
    }),
  )
}

/**
 * Determine registry type from package name/import specifier
 */
export const detectRegistryType = (packageSpec: string): 'npm' | 'jsr' | 'deno' => {
  // Handle Deno import specifiers
  if (packageSpec.startsWith('npm:')) {
    return 'npm'
  }

  if (packageSpec.startsWith('jsr:')) {
    return 'jsr'
  }

  // For bare package names, default to npm (most common)
  // JSR packages typically use @scope/name format, but so do npm scoped packages
  // We'll try npm first, then fallback to JSR if needed
  return 'npm'
}

/**
 * Parsed package specification with structured data
 */
export interface ParsedPackageSpec {
  registry: 'npm' | 'jsr' | 'deno'
  name: string
  version: string
  originalSpec: string
}

/**
 * Parse package specification into structured components
 */
export const parsePackageSpec = (packageSpec: string): ParsedPackageSpec => {
  const originalSpec = packageSpec

  // Handle Deno import prefixes
  if (packageSpec.startsWith('npm:')) {
    const withoutPrefix = packageSpec.slice(4)
    const { name, version } = extractNameAndVersion(withoutPrefix)
    return { registry: 'npm', name, version, originalSpec }
  }

  if (packageSpec.startsWith('jsr:')) {
    const withoutPrefix = packageSpec.slice(4)
    const { name, version } = extractNameAndVersion(withoutPrefix)
    return { registry: 'jsr', name, version, originalSpec }
  }

  // Default to npm registry for bare package names
  const { name, version } = extractNameAndVersion(packageSpec)
  return { registry: 'npm', name, version, originalSpec }
}

/**
 * Extract name and version from package spec (without registry prefix)
 */
function extractNameAndVersion(spec: string): { name: string; version: string } {
  if (spec.startsWith('@')) {
    // Scoped package: @scope/name@version -> @scope/name, version
    const match = spec.match(/^(@[^/]+\/[^@]+)(@(.+))?$/)
    if (match && match[1]) {
      const name = match[1]
      const version = match[3] || 'latest'
      return { name, version }
    }
  } else {
    // Regular package: name@version -> name, version
    const match = spec.match(/^([^@]+)(@(.+))?$/)
    if (match && match[1]) {
      const name = match[1]
      const version = match[3] || 'latest'
      return { name, version }
    }
  }

  // Fallback: treat entire spec as name with latest version
  return { name: spec, version: 'latest' }
}

/**
 * Extract clean package name from import specifier (legacy compatibility)
 * @deprecated Use parsePackageSpec for structured parsing
 */
export const extractPackageName = (packageSpec: string): string => {
  return parsePackageSpec(packageSpec).name
}

/**
 * Fetch package info with automatic registry detection and fallback
 */
export const fetchPackageInfo = (
  packageSpec: string,
): Effect.Effect<{ info: NpmPackageInfo | JsrPackageInfo; registry: 'npm' | 'jsr' }, RegistryError> => {
  const packageName = extractPackageName(packageSpec)
  const primaryRegistry = detectRegistryType(packageSpec)

  if (primaryRegistry === 'npm') {
    return pipe(
      fetchNpmPackageInfo(packageName),
      Effect.map((info) => ({ info, registry: 'npm' as const })),
      // If npm fails with 404, try JSR as fallback
      Effect.catchTag('NetworkError', (error) => {
        if (error.status === 404) {
          return pipe(
            fetchJsrPackageInfo(packageName),
            Effect.map((info) => ({ info, registry: 'jsr' as const })),
          )
        }
        return Effect.fail(error)
      }),
    )
  } else {
    return pipe(
      fetchJsrPackageInfo(packageName),
      Effect.map((info) => ({ info, registry: 'jsr' as const })),
      // If JSR fails with 404, try npm as fallback
      Effect.catchTag('NetworkError', (error) => {
        if (error.status === 404) {
          return pipe(
            fetchNpmPackageInfo(packageName),
            Effect.map((info) => ({ info, registry: 'npm' as const })),
          )
        }
        return Effect.fail(error)
      }),
    )
  }
}
