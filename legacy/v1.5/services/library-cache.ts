/**
 * Library Cache Service
 *
 * Manages the .vibe/libraries/ cache with TOML index and markdown documentation
 * Handles fetching, storing, and retrieving library documentation
 *
 * @tested_by tests/unit/library-cache.test.ts (Cache operations, TOML parsing, file management, metadata handling)
 * @tested_by tests/integration/vibe-code.test.ts (Documentation fetching and caching, cache hits/misses, error states)
 * @tested_by tests/user/library-documentation.test.ts (End-to-end cache workflow with real documentation)
 */

import { Effect, pipe } from 'effect'
import { resolve } from '@std/path'
import { parse as parseToml, stringify as stringifyToml } from '@std/toml'
import { ensureDir, fileExists, readTextFile, writeTextFile } from '../lib/fs.ts'
import { createFileSystemError, createNetworkError, type VibeError } from '../lib/errors.ts'
import {
  createEmptyLibraryCacheIndex,
  createLibraryMetadata,
  discoverLibraryDomain,
  extractApexDomain,
  LibraryCacheIndex,
  LibraryCacheIndexSchema,
  LibraryMetadata,
} from '../schemas/library-cache.ts'
import { fetchPackageInfo, type NetworkError } from './registry-client.ts'

type CacheError = VibeError | NetworkError

/**
 * Get path to library cache directory
 */
const getLibraryCachePath = (projectPath: string): string => resolve(projectPath, '.vibe', 'libraries')

/**
 * Get path to library cache index file
 */
const getLibraryCacheIndexPath = (projectPath: string): string =>
  resolve(getLibraryCachePath(projectPath), 'index.toml')

/**
 * Get path to library documentation file
 */
const getLibraryDocsPath = (projectPath: string, packageName: string): string =>
  resolve(getLibraryCachePath(projectPath), 'docs', packageName, 'README.md')

/**
 * Load library cache index from TOML file
 */
export const loadLibraryCacheIndex = (projectPath: string): Effect.Effect<LibraryCacheIndex, CacheError> => {
  const indexPath = getLibraryCacheIndexPath(projectPath)

  return pipe(
    fileExists(indexPath),
    Effect.flatMap((exists) => {
      if (!exists) {
        // Return empty index if file doesn't exist
        return Effect.succeed(createEmptyLibraryCacheIndex())
      }

      return pipe(
        readTextFile(indexPath),
        Effect.flatMap((content) =>
          Effect.try({
            try: () => {
              const parsed = parseToml(content)
              return LibraryCacheIndexSchema.parse(parsed)
            },
            catch: (error) => createFileSystemError(error, indexPath, 'Failed to parse TOML index'),
          })
        ),
      )
    }),
  )
}

/**
 * Save library cache index to TOML file
 */
export const saveLibraryCacheIndex = (
  projectPath: string,
  index: LibraryCacheIndex,
): Effect.Effect<void, CacheError> => {
  const indexPath = getLibraryCacheIndexPath(projectPath)

  return pipe(
    Effect.try({
      try: () => stringifyToml(index),
      catch: (error) => createFileSystemError(error, indexPath, 'Failed to serialize TOML index'),
    }),
    Effect.flatMap((tomlContent) =>
      pipe(
        ensureDir(getLibraryCachePath(projectPath)),
        Effect.flatMap(() => writeTextFile(indexPath, tomlContent)),
      )
    ),
  )
}

/**
 * Fetch documentation from library website
 */
const fetchLibraryDocumentation = (domain: string): Effect.Effect<string, CacheError> => {
  const url = `https://${domain}/llms.txt`

  return Effect.tryPromise({
    try: async () => {
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.text()
    },
    catch: (error) => {
      if (error instanceof Error) {
        const statusMatch = error.message.match(/HTTP (\d+):/)
        const status = statusMatch && statusMatch[1] ? parseInt(statusMatch[1]) : undefined

        return createNetworkError(
          error,
          url,
          `Failed to fetch documentation from ${url}: ${error.message}`,
          status,
        )
      }
      return createNetworkError(error, url, `Failed to fetch documentation from ${url}`)
    },
  })
}

/**
 * Cache library documentation to file
 */
const cacheLibraryDocumentation = (
  projectPath: string,
  packageName: string,
  content: string,
): Effect.Effect<void, CacheError> => {
  const docsPath = getLibraryDocsPath(projectPath, packageName)

  return pipe(
    ensureDir(resolve(docsPath, '..')),
    Effect.flatMap(() => writeTextFile(docsPath, content)),
  )
}

/**
 * Get library metadata from cache, discovering domain if needed
 */
export const getLibraryMetadata = (
  projectPath: string,
  packageName: string,
  version: string,
): Effect.Effect<LibraryMetadata, CacheError> =>
  pipe(
    loadLibraryCacheIndex(projectPath),
    Effect.flatMap((index) => {
      const cached = index.libraries[packageName]
      if (cached) {
        return Effect.succeed(cached)
      }

      // Not cached, need to discover domain from package registry
      return pipe(
        fetchPackageInfo(packageName),
        Effect.flatMap(({ info, registry }) => {
          const domain = discoverLibraryDomain(info)
          if (!domain) {
            return Effect.fail(
              createNetworkError(
                null,
                packageName,
                `Could not discover library domain for package '${packageName}'`,
              ),
            )
          }

          const metadata = createLibraryMetadata(
            packageName,
            version,
            domain,
            registry,
            `docs/${packageName}/README.md`,
            {
              homepage: 'homepage' in info ? info.homepage : undefined,
              llms_txt_url: `https://${domain}/llms.txt`,
            },
          )

          // Update cache index
          const updatedIndex: LibraryCacheIndex = {
            ...index,
            meta: {
              ...index.meta,
              library_count: index.meta.library_count + 1,
              last_scan: new Date().toISOString(),
            },
            libraries: {
              ...index.libraries,
              [packageName]: metadata,
            },
          }

          return pipe(
            saveLibraryCacheIndex(projectPath, updatedIndex),
            Effect.map(() => metadata),
          )
        }),
      )
    }),
  )

/**
 * Fetch and cache library documentation
 */
export const fetchAndCacheLibraryDocs = (
  projectPath: string,
  packageName: string,
  version: string,
): Effect.Effect<string, CacheError> =>
  pipe(
    getLibraryMetadata(projectPath, packageName, version),
    Effect.flatMap((metadata) =>
      pipe(
        fetchLibraryDocumentation(metadata.domain),
        Effect.flatMap((content) =>
          pipe(
            cacheLibraryDocumentation(projectPath, packageName, content),
            Effect.flatMap(() =>
              // Update metadata with successful fetch
              pipe(
                loadLibraryCacheIndex(projectPath),
                Effect.flatMap((index) => {
                  const updatedMetadata: LibraryMetadata = {
                    ...metadata,
                    fetch_status: 'success',
                    last_fetched: new Date().toISOString(),
                  }

                  const updatedIndex: LibraryCacheIndex = {
                    ...index,
                    meta: {
                      ...index.meta,
                      docs_found: index.meta.docs_found + 1,
                      last_scan: new Date().toISOString(),
                    },
                    libraries: {
                      ...index.libraries,
                      [packageName]: updatedMetadata,
                    },
                  }

                  return saveLibraryCacheIndex(projectPath, updatedIndex)
                }),
                Effect.map(() => content),
              )
            ),
          )
        ),
        Effect.catchAll((error) =>
          // Update metadata with failed fetch
          pipe(
            loadLibraryCacheIndex(projectPath),
            Effect.flatMap((index) => {
              const updatedMetadata: LibraryMetadata = {
                ...metadata,
                fetch_status: error._tag === 'NetworkError' && error.status === 404 ? 'not_found' : 'failed',
                last_fetched: new Date().toISOString(),
              }

              const updatedIndex: LibraryCacheIndex = {
                ...index,
                libraries: {
                  ...index.libraries,
                  [packageName]: updatedMetadata,
                },
              }

              return pipe(
                saveLibraryCacheIndex(projectPath, updatedIndex),
                Effect.flatMap(() => Effect.fail(error)),
              )
            }),
          )
        ),
      )
    ),
  )

/**
 * Get cached library documentation (if exists)
 */
export const getCachedLibraryDocs = (
  projectPath: string,
  packageName: string,
): Effect.Effect<string, CacheError> => {
  const docsPath = getLibraryDocsPath(projectPath, packageName)

  return pipe(
    fileExists(docsPath),
    Effect.flatMap((exists) => {
      if (!exists) {
        return Effect.fail(
          createFileSystemError(
            null,
            docsPath,
            `No cached documentation found for package '${packageName}'`,
          ),
        )
      }

      return readTextFile(docsPath)
    }),
  )
}
