/**
 * Main entry point for manifest parsing system
 * Auto-registers all available parsers and exports the registry
 */

import { Effect, pipe } from 'effect'
import { resolve } from '@std/path'
import { createDiscoveryError, type VibeError } from '../../lib/errors.ts'
import {
  getAllParsers,
  getParserForFile,
  ManifestParseResult,
  type ManifestParserRegistryState,
  registerParser,
} from './base.ts'
import { npmManifestParser } from './npm.ts'

// Create global registry with all parsers registered
const globalManifestRegistry = registerParser(
  { parsers: new Map() },
  npmManifestParser,
)

// Additional parsers can be added here when needed

/**
 * Discovers and parses all manifest files in a project directory
 */
export const discoverManifests = (projectPath: string) =>
  pipe(
    Effect.log(`🔍 Discovering manifests in ${projectPath}`),
    Effect.flatMap(() => scanForManifestFiles(projectPath)),
    Effect.flatMap((manifestFiles) =>
      Effect.all(
        manifestFiles.map((filePath) => parseManifestFile(filePath)),
      )
    ),
    Effect.map((results) => results.filter(Boolean) as ManifestParseResult[]),
    Effect.tap((results) => Effect.log(`📋 Found ${results.length} valid manifest(s)`)),
  )

/**
 * Scans a directory for known manifest files
 */
const scanForManifestFiles = (projectPath: string) =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        const manifestFiles: string[] = []
        const parsers = getAllParsers(globalManifestRegistry)

        // Collect all supported file names
        const supportedFiles = new Set<string>()
        parsers.forEach((parser) => {
          parser.supportedFiles.forEach((file) => supportedFiles.add(file))
        })

        // Recursively search for manifest files (limited depth for performance)
        await scanDirectory(projectPath, supportedFiles, manifestFiles, 0, 3)

        return manifestFiles
      },
      catch: (error) =>
        createDiscoveryError(
          error,
          `Failed to scan for manifest files: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        ),
    }),
  )

/**
 * Recursively scans directories for manifest files
 */
const scanDirectory = async (
  dirPath: string,
  supportedFiles: Set<string>,
  manifestFiles: string[],
  currentDepth: number,
  maxDepth: number,
): Promise<void> => {
  if (currentDepth >= maxDepth) return

  try {
    for await (const entry of Deno.readDir(dirPath)) {
      const fullPath = resolve(dirPath, entry.name)

      if (entry.isFile && supportedFiles.has(entry.name)) {
        manifestFiles.push(fullPath)
      } else if (entry.isDirectory && !shouldIgnoreDirectory(entry.name)) {
        await scanDirectory(fullPath, supportedFiles, manifestFiles, currentDepth + 1, maxDepth)
      }
    }
  } catch (error) {
    // Ignore permission errors or other directory access issues
    console.warn(`Warning: Could not scan directory ${dirPath}: ${error}`)
  }
}

/**
 * Checks if a directory should be ignored during scanning
 */
const shouldIgnoreDirectory = (dirName: string): boolean => {
  const ignoredDirs = [
    'node_modules',
    '.git',
    '.vibe',
    'dist',
    'build',
    'out',
    'target',
    '__pycache__',
    '.next',
    '.nuxt',
    'coverage',
    '.nyc_output',
    'vendor',
  ]

  return ignoredDirs.includes(dirName) || dirName.startsWith('.')
}

/**
 * Parses a single manifest file using the appropriate parser
 */
const parseManifestFile = (manifestPath: string) =>
  pipe(
    Effect.sync(() => getParserForFile(globalManifestRegistry, manifestPath)),
    Effect.flatMap((parser) => {
      if (!parser) {
        return Effect.succeed(null)
      }

      return pipe(
        parser.canParse(manifestPath),
        Effect.flatMap((canParse) => canParse ? parser.parse(manifestPath) : Effect.succeed(null)),
        Effect.catchAll((error) => {
          console.warn(`Warning: Failed to parse ${manifestPath}: ${error}`)
          return Effect.succeed(null)
        }),
      )
    }),
  )

/**
 * Gets all unique dependencies from multiple manifest results
 */
export const consolidateDependencies = (manifestResults: ManifestParseResult[]) =>
  Effect.sync(() => {
    const dependencyMap = new Map<string, typeof manifestResults[0]['dependencies'][0]>()

    manifestResults.forEach((result) => {
      result.dependencies.forEach((dep) => {
        const key = `${dep.scope ? `@${dep.scope}/` : ''}${dep.name}`

        // If we already have this dependency, prefer production over dev dependencies
        const existing = dependencyMap.get(key)
        if (!existing || (existing.type === 'development' && dep.type === 'production')) {
          dependencyMap.set(key, dep)
        }
      })
    })

    return Array.from(dependencyMap.values())
  })

// Export the global registry for external use
export { globalManifestRegistry }
export type { DetectedDependency, ManifestParseResult } from './base.ts'
