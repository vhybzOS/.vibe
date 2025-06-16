/**
 * File system utilities with proper Deno patterns
 * Centralizes common file operations with consistent error handling
 */

import { Effect, pipe } from 'effect'
import { resolve, dirname } from '@std/path'
import { readTextFile, writeTextFile, ensureDir, readDir, parseJSON } from './effects.ts'
import { createFileSystemError, createConfigurationError, type FileSystemError } from './errors.ts'
import { z } from 'zod/v4'

/**
 * Checks if a file exists
 */
export const fileExists = (filePath: string) =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        try {
          await Deno.stat(filePath)
          return true
        } catch (error) {
          if (error instanceof Deno.errors.NotFound) {
            return false
          }
          throw error
        }
      },
      catch: (error) => createFileSystemError(error, filePath, 'Failed to check file existence'),
    })
  )

/**
 * Safely reads and parses a JSON file
 */
export const readJSONFile = <T>(filePath: string) =>
  pipe(
    readTextFile(filePath),
    Effect.flatMap(content => parseJSON<T>(content, filePath))
  )

/**
 * Safely writes an object as JSON to a file
 */
export const writeJSONFile = <T>(filePath: string, data: T) =>
  pipe(
    ensureDir(dirname(filePath)),
    Effect.flatMap(() => writeTextFile(filePath, JSON.stringify(data, null, 2)))
  )

/**
 * Lists files in a directory with optional filtering
 */
export const listFiles = (
  dirPath: string, 
  filter?: (entry: Deno.DirEntry) => boolean
) =>
  pipe(
    readDir(dirPath),
    Effect.map(entries => 
      entries
        .filter(entry => entry.isFile)
        .filter(filter || (() => true))
        .map(entry => resolve(dirPath, entry.name))
    ),
    Effect.catchAll(() => Effect.succeed([] as string[]))
  )

/**
 * Finds files matching a pattern in a directory tree
 */
export const findFiles = (
  rootPath: string, 
  pattern: (name: string) => boolean,
  maxDepth: number = 10
) =>
  pipe(
    Effect.sync(() => [] as string[]),
    Effect.flatMap(results => searchDirectory(rootPath, pattern, results, 0, maxDepth)),
    Effect.catchAll(() => Effect.succeed([] as string[]))
  )

const searchDirectory = (
  dirPath: string,
  pattern: (name: string) => boolean,
  results: string[],
  currentDepth: number,
  maxDepth: number
): Effect.Effect<string[], FileSystemError> => {
  if (currentDepth >= maxDepth) {
    return Effect.succeed(results)
  }

  return pipe(
    readDir(dirPath),
    Effect.flatMap(entries =>
      Effect.all(
        entries.map(entry => {
          const fullPath = resolve(dirPath, entry.name)
          
          if (entry.isFile && pattern(entry.name)) {
            results.push(fullPath)
            return Effect.succeed(void 0)
          }
          
          if (entry.isDirectory && !entry.name.startsWith('.')) {
            return searchDirectory(fullPath, pattern, results, currentDepth + 1, maxDepth)
              .pipe(Effect.map(() => void 0))
          }
          
          return Effect.succeed(void 0)
        })
      )
    ),
    Effect.map(() => results),
    Effect.catchAll(() => Effect.succeed(results))
  )
}

/**
 * Creates a backup of a file before modification
 */
export const createBackup = (filePath: string) =>
  pipe(
    fileExists(filePath),
    Effect.flatMap(exists => {
      if (!exists) return Effect.succeed(null)
      
      const backupPath = `${filePath}.backup.${Date.now()}`
      return pipe(
        readTextFile(filePath),
        Effect.flatMap(content => writeTextFile(backupPath, content)),
        Effect.map(() => backupPath)
      )
    })
  )

/**
 * Safely removes a file or directory
 */
export const remove = (path: string, recursive: boolean = false) =>
  pipe(
    Effect.tryPromise({
      try: () => Deno.remove(path, { recursive }),
      catch: (error) => createFileSystemError(error, path, 'Failed to remove'),
    }),
    Effect.catchTag('FileSystemError', (error: FileSystemError) => {
      // Ignore "not found" errors
      if (error.error instanceof Deno.errors.NotFound) {
        return Effect.succeed(void 0)
      }
      return Effect.fail(error)
    })
  )

/**
 * CONSOLIDATED PATTERNS - Previously duplicated across modules
 */

/**
 * Loads and validates configuration with schema
 * Consolidates: memory/index.ts, diary/index.ts, daemon/services/secrets_service.ts
 */
export const loadConfig = <T>(
  configPath: string, 
  schema: z.ZodSchema<T>, 
  defaultValue: T
) =>
  pipe(
    fileExists(configPath),
    Effect.flatMap(exists => 
      exists 
        ? pipe(
            readJSONFile<unknown>(configPath),
            Effect.flatMap(data => 
              Effect.try({
                try: () => schema.parse(data),
                catch: (error) => createConfigurationError(error, `Invalid config at ${configPath}`)
              })
            )
          )
        : Effect.succeed(defaultValue)
    )
  )

/**
 * Validates .vibe directory existence
 * Consolidates: CLI commands (export.ts, status.ts, sync.ts, etc.)
 */
export const ensureVibeDirectory = (projectPath: string) =>
  pipe(
    Effect.sync(() => resolve(projectPath, '.vibe')),
    Effect.flatMap(vibePath =>
      pipe(
        Effect.tryPromise({
          try: async () => {
            const stat = await Deno.stat(vibePath)
            return stat.isDirectory
          },
          catch: () => false
        }),
        Effect.flatMap(exists =>
          exists 
            ? Effect.succeed(vibePath)
            : Effect.fail(createFileSystemError(
                new Error('.vibe directory not found'), 
                vibePath, 
                '.vibe not initialized. Run `vibe init` first.'
              ))
        )
      )
    )
  )

/**
 * Loads JSON with schema validation and error recovery
 * Consolidates: memory/index.ts (loadMemoryFromId), diary/index.ts (loadEntryFromId)
 */
export const loadSchemaValidatedJSON = <T>(
  filePath: string, 
  schema: z.ZodSchema<T>
) =>
  pipe(
    readJSONFile<unknown>(filePath),
    Effect.flatMap(data =>
      Effect.try({
        try: () => schema.parse(data),
        catch: (error) => createConfigurationError(error, `Invalid schema in ${filePath}`)
      })
    )
  )

/**
 * Saves data to JSON file with directory creation
 * Consolidates: memory/index.ts (saveMemoryToFile), diary/index.ts (saveEntryToFile)
 */
export const saveJSONWithBackup = <T>(
  filePath: string, 
  data: T, 
  createBackupFlag = false
) =>
  pipe(
    createBackupFlag ? createBackup(filePath) : Effect.succeed(null),
    Effect.flatMap(() => writeJSONFile(filePath, data))
  )

/**
 * Lists all JSON files in a directory
 * Consolidates: memory/index.ts (loadMemories), diary/index.ts (loadEntries)
 */
export const listJSONFiles = (dirPath: string) =>
  listFiles(dirPath, entry => entry.name.endsWith('.json'))

/**
 * Loads all JSON files from directory with schema validation
 * Consolidates: memory/index.ts (loadMemories), diary/index.ts (loadEntries)
 */
export const loadAllJSONFiles = <T>(
  dirPath: string,
  schema: z.ZodSchema<T>
) =>
  pipe(
    listJSONFiles(dirPath),
    Effect.flatMap(filePaths =>
      Effect.all(
        filePaths.map(filePath =>
          pipe(
            loadSchemaValidatedJSON(filePath, schema),
            Effect.catchAll(() => Effect.succeed(null))
          )
        ),
        { concurrency: 10 }
      )
    ),
    Effect.map(results => results.filter((item): item is T => item !== null))
  )