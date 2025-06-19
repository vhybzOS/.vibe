/**
 * Vibe Code Command Implementation
 *
 * Fetches library documentation from {domain}/llms.txt and prints to stdout
 * Implements caching for fast subsequent access
 *
 * @tested_by tests/unit/vibe-code.test.ts (Command logic, cache integration, error handling)
 * @tested_by tests/integration/vibe-code.test.ts (Full workflow, registry client integration)
 * @tested_by tests/user/library-documentation.test.ts (End-to-end user scenarios)
 */

import { Effect, pipe } from 'effect'
import { findProjectRoot } from '../lib/fs.ts'
import { createCliError, type VibeError } from '../lib/errors.ts'
import { validatePackageInProject } from '../services/package-detector.ts'
import { fetchAndCacheLibraryDocs, getCachedLibraryDocs } from '../services/library-cache.ts'
import { type NetworkError } from '../services/registry-client.ts'

type VibeCodeError = VibeError | NetworkError

/**
 * Main vibe code command implementation
 */
export const vibeCodeCommand = (packageName: string): Effect.Effect<string, VibeCodeError> =>
  pipe(
    // Find project root directory
    findProjectRoot(Deno.cwd()),
    Effect.flatMap((projectPath) =>
      pipe(
        // Validate package exists in project dependencies
        validatePackageInProject(packageName, projectPath),
        Effect.flatMap((dependency) =>
          pipe(
            // Try to get cached documentation first
            getCachedLibraryDocs(projectPath, packageName),
            Effect.catchAll(() =>
              // If not cached, fetch and cache documentation
              fetchAndCacheLibraryDocs(projectPath, packageName, dependency.version)
            ),
          )
        ),
      )
    ),
    Effect.mapError((error) => {
      // Convert NetworkError and other errors to CliError for consistent user experience
      if (error._tag === 'NetworkError') {
        if (error.status === 404) {
          return createCliError(
            error,
            `Documentation not found for package '${packageName}'. The package may not provide llms.txt documentation.`,
            'vibe-code',
          )
        }
        return createCliError(
          error,
          `Network error while fetching documentation for '${packageName}': ${error.message}`,
          'vibe-code',
        )
      }

      if (error._tag === 'ParseError') {
        return createCliError(
          error,
          `Package '${packageName}' not found in project dependencies. Make sure it's listed in package.json or deno.json.`,
          'vibe-code',
        )
      }

      return error
    }),
  )

/**
 * Print documentation to stdout (for CLI usage)
 */
export const printLibraryDocs = (content: string): Effect.Effect<void, never> =>
  Effect.sync(() => {
    console.log(content)
  })

/**
 * Complete vibe code workflow: fetch and print
 */
export const executeVibeCode = (packageName: string): Effect.Effect<void, VibeCodeError> =>
  pipe(
    vibeCodeCommand(packageName),
    Effect.flatMap(printLibraryDocs),
  )
