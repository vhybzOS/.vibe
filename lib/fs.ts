/**
 * File System Utilities with Effect-TS
 *
 * Based on legacy/v0.2 Lib namespace patterns - provides composable file operations
 *
 * @tested_by tests/unit/init-command.test.ts (File operations: readTextFile, writeTextFile, fileExists, dirExists)
 * @tested_by tests/integration/cli-integration.test.ts (Project detection: getProjectName, findProjectRoot, loadJson)
 * @tested_by tests/user/real-world-workflow.test.ts (Real-world file operations with both package.json and deno.json)
 */

import { Effect, pipe } from 'effect'
import { dirname, resolve } from '@std/path'
import { z } from 'zod/v4'
import { createFileSystemError, createParseError, type VibeError } from './errors.ts'

// Basic file operations
export const readTextFile = (path: string): Effect.Effect<string, VibeError> =>
  Effect.tryPromise({
    try: () => Deno.readTextFile(path),
    catch: (e) => createFileSystemError(e, path, 'Failed to read file'),
  })

export const writeTextFile = (path: string, content: string): Effect.Effect<void, VibeError> =>
  Effect.tryPromise({
    try: () => Deno.mkdir(dirname(path), { recursive: true }).then(() => Deno.writeTextFile(path, content)),
    catch: (e) => createFileSystemError(e, path, 'Failed to write file'),
  })

export const fileExists = (path: string): Effect.Effect<boolean, VibeError> =>
  pipe(
    Effect.tryPromise({
      try: () => Deno.stat(path).then((s) => s.isFile),
      catch: (e) => createFileSystemError(e, path, 'Failed to check if file exists'),
    }),
    Effect.catchAll(() => Effect.succeed(false)),
  )

export const dirExists = (path: string): Effect.Effect<boolean, VibeError> =>
  pipe(
    Effect.tryPromise({
      try: () => Deno.stat(path).then((s) => s.isDirectory),
      catch: (e) => createFileSystemError(e, path, 'Failed to check if directory exists'),
    }),
    Effect.catchAll(() => Effect.succeed(false)),
  )

export const ensureDir = (path: string): Effect.Effect<void, VibeError> =>
  Effect.tryPromise({
    try: () => Deno.mkdir(path, { recursive: true }),
    catch: (e) => createFileSystemError(e, path, 'Failed to create directory'),
  })

// JSON operations with schema validation
export const loadJson = <T>(schema: z.ZodSchema<T>) => (path: string): Effect.Effect<T, VibeError> =>
  pipe(
    readTextFile(path),
    Effect.flatMap((content) =>
      Effect.try({
        try: () => schema.parse(JSON.parse(content)),
        catch: (e) => createParseError(e, `Invalid JSON at ${path}`),
      })
    ),
  )

export const saveJson = <T>(path: string, data: T): Effect.Effect<void, VibeError> =>
  writeTextFile(path, JSON.stringify(data, null, 2))

// Project detection utilities
export const findProjectRoot = (startPath: string): Effect.Effect<string, VibeError> =>
  pipe(
    Effect.sync(() => startPath),
    Effect.flatMap((currentPath) =>
      pipe(
        fileExists(resolve(currentPath, 'package.json')),
        Effect.flatMap((hasPackageJson) => {
          if (hasPackageJson) {
            return Effect.succeed(currentPath)
          }

          const parentPath = dirname(currentPath)
          if (parentPath === currentPath) {
            // Reached root directory
            return Effect.succeed(startPath) // Use original path as fallback
          }

          return findProjectRoot(parentPath)
        }),
      )
    ),
  )

export const getProjectName = (projectPath: string): Effect.Effect<string, VibeError> =>
  pipe(
    fileExists(resolve(projectPath, 'package.json')),
    Effect.flatMap((hasPackageJson) => {
      if (hasPackageJson) {
        return pipe(
          loadJson(z.object({ name: z.string().optional() }))(resolve(projectPath, 'package.json')),
          Effect.map((pkg) => pkg.name || projectPath.split('/').pop() || 'unnamed-project'),
          Effect.catchAll(() => Effect.succeed(projectPath.split('/').pop() || 'unnamed-project')),
        )
      }

      // Check for deno.json if no package.json
      return pipe(
        fileExists(resolve(projectPath, 'deno.json')),
        Effect.flatMap((hasDenoJson) => {
          if (!hasDenoJson) {
            // Use directory name as fallback
            return Effect.succeed(projectPath.split('/').pop() || 'unnamed-project')
          }

          return pipe(
            loadJson(z.object({ name: z.string().optional() }))(resolve(projectPath, 'deno.json')),
            Effect.map((deno) => deno.name || projectPath.split('/').pop() || 'unnamed-project'),
            Effect.catchAll(() => Effect.succeed(projectPath.split('/').pop() || 'unnamed-project')),
          )
        }),
      )
    }),
  )
