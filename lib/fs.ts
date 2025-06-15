/**
 * File system utilities with proper Deno patterns
 * Centralizes common file operations with consistent error handling
 */

import { Effect, pipe } from 'effect'
import { resolve, dirname } from '@std/path'
import { readTextFile, writeTextFile, ensureDir, readDir, parseJSON, FileSystemError } from './effects.ts'

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
      catch: (error) => new FileSystemError('Failed to check file existence', filePath, error),
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
      catch: (error) => new FileSystemError('Failed to remove', path, error),
    }),
    Effect.catchTag('FileSystemError', error => {
      // Ignore "not found" errors
      if (error.cause instanceof Deno.errors.NotFound) {
        return Effect.succeed(void 0)
      }
      return Effect.fail(error)
    })
  )