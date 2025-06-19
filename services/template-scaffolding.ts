/**
 * Template Scaffolding Service
 *
 * Handles copying project templates and scaffolding new projects from embedded resources
 *
 * @tested_by tests/unit/template-scaffolding.test.ts (Core scaffolding functionality, template mapping, error handling)
 */

import { Effect, pipe } from 'effect'
import { basename, resolve } from '@std/path'
import { z } from 'zod/v4'
import { dirExists, ensureDir, readTextFile, writeTextFile } from '../lib/fs.ts'
import { createConfigurationError, createFileSystemError, type VibeError } from '../lib/errors.ts'
import {
  type SupportedRuntime,
  SupportedRuntimeSchema,
  type TemplateScaffoldOptions,
  TemplateScaffoldOptionsSchema,
} from '../schemas/config.ts'
import { initCommand } from '../commands/init.ts'
import { logInfo, logSuccess } from '../lib/cli.ts'

// Runtime to template directory mapping
const RUNTIME_TEMPLATE_MAP: Record<SupportedRuntime, string> = {
  node: 'node-template',
  deno: 'deno-template',
}

// Get template directory name for runtime
export const getRuntimeTemplate = (runtime: string): Effect.Effect<string, VibeError> =>
  pipe(
    Effect.try({
      try: () => SupportedRuntimeSchema.parse(runtime),
      catch: (e) =>
        createConfigurationError(
          e,
          `Unsupported runtime: ${runtime}. Supported runtimes: ${getSupportedRuntimes().join(', ')}`,
        ),
    }),
    Effect.map((validRuntime) => RUNTIME_TEMPLATE_MAP[validRuntime]),
  )

// Get list of supported runtimes
export const getSupportedRuntimes = (): SupportedRuntime[] => Object.keys(RUNTIME_TEMPLATE_MAP) as SupportedRuntime[]

// Get path to embedded template source
export const getTemplateSourcePath = (templateName: string): string =>
  resolve(import.meta.dirname!, '..', 'vibe-coding-project-starters', templateName)

// Validate template exists in embedded resources
export const validateTemplateExists = (templateName: string): Effect.Effect<string, VibeError> => {
  const templatePath = getTemplateSourcePath(templateName)
  return pipe(
    dirExists(templatePath),
    Effect.flatMap((exists) => {
      if (!exists) {
        return Effect.fail(createFileSystemError(
          new Error(`Template directory not found: ${templatePath}`),
          templatePath,
          `Template not found: ${templateName}`,
        ))
      }
      return Effect.succeed(templatePath)
    }),
  )
}

// List files in template directory
export const listTemplateFiles = (templateName: string): Effect.Effect<string[], VibeError> => {
  const templatePath = getTemplateSourcePath(templateName)
  return pipe(
    validateTemplateExists(templateName),
    Effect.flatMap(() =>
      Effect.tryPromise({
        try: async () => {
          const files: string[] = []
          for await (const entry of Deno.readDir(templatePath)) {
            files.push(entry.name)
          }
          return files
        },
        catch: (e) => createFileSystemError(e, templatePath, 'Failed to list template files'),
      })
    ),
  )
}

// Validate project name format
export const validateProjectName = (projectName: string): Effect.Effect<string, VibeError> =>
  pipe(
    Effect.sync(() => {
      if (!projectName || projectName.trim().length === 0) {
        throw new Error('Project name cannot be empty')
      }
      if (projectName.includes(' ')) {
        throw new Error('Project name cannot contain spaces')
      }
      if (projectName.includes('/') || projectName.includes('\\')) {
        throw new Error('Project name cannot contain path separators')
      }
      return projectName.trim()
    }),
    Effect.catchAll((e) => Effect.fail(createConfigurationError(e, 'Invalid project name'))),
  )

// Validate project path doesn't already exist
export const validateProjectPath = (projectPath: string): Effect.Effect<string, VibeError> =>
  pipe(
    dirExists(projectPath),
    Effect.flatMap((exists) => {
      if (exists) {
        return Effect.fail(createFileSystemError(
          new Error(`Directory already exists: ${basename(projectPath)}`),
          projectPath,
          `Directory already exists: ${basename(projectPath)}`,
        ))
      }
      return Effect.succeed(projectPath)
    }),
  )

// Copy a single file from template to destination
const copyFile = (sourcePath: string, destPath: string): Effect.Effect<void, VibeError> =>
  pipe(
    readTextFile(sourcePath),
    Effect.flatMap((content) => writeTextFile(destPath, content)),
  )

// Recursively copy template directory
export const copyTemplate = (templateName: string, destinationPath: string): Effect.Effect<void, VibeError> => {
  const templatePath = getTemplateSourcePath(templateName)

  const copyRecursive = (srcDir: string, destDir: string): Effect.Effect<void, VibeError> =>
    pipe(
      ensureDir(destDir),
      Effect.flatMap(() =>
        Effect.tryPromise({
          try: async () => {
            for await (const entry of Deno.readDir(srcDir)) {
              const srcPath = resolve(srcDir, entry.name)
              const destPath = resolve(destDir, entry.name)

              if (entry.isDirectory) {
                await Effect.runPromise(copyRecursive(srcPath, destPath))
              } else {
                await Effect.runPromise(copyFile(srcPath, destPath))
              }
            }
          },
          catch: (e) => createFileSystemError(e, srcDir, 'Failed to copy template files'),
        })
      ),
    )

  return pipe(
    validateTemplateExists(templateName),
    Effect.flatMap(() => copyRecursive(templatePath, destinationPath)),
  )
}

// Main scaffolding function that coordinates the entire process
export const scaffoldProject = (
  runtime: string,
  projectName: string,
  targetDirectory: string,
): Effect.Effect<void, VibeError> => {
  const projectPath = resolve(targetDirectory, projectName)

  return pipe(
    // Validate inputs
    validateProjectName(projectName),
    Effect.flatMap(() => validateProjectPath(projectPath)),
    Effect.flatMap(() => getRuntimeTemplate(runtime)),
    // Copy template
    Effect.flatMap((templateName) =>
      pipe(
        logInfo(`Creating project '${projectName}' from ${runtime} template...`),
        Effect.flatMap(() => copyTemplate(templateName, projectPath)),
        Effect.flatMap(() => logSuccess(`Template copied to ${projectPath}`)),
      )
    ),
    // Initialize .vibe in the new project
    Effect.flatMap(() =>
      pipe(
        Effect.sync(() => {
          const originalCwd = Deno.cwd()
          Deno.chdir(projectPath)
          return originalCwd
        }),
        Effect.flatMap((originalCwd) =>
          pipe(
            logInfo('Initializing .vibe directory...'),
            Effect.flatMap(() => initCommand({ force: false, quiet: false })),
            Effect.flatMap(() => logSuccess(`Project '${projectName}' scaffolded successfully!`)),
            Effect.flatMap(() => Effect.sync(() => Deno.chdir(originalCwd))),
          )
        ),
      )
    ),
  )
}

// Interactive project name prompting
export const promptForProjectName = (): Effect.Effect<string, VibeError> =>
  Effect.tryPromise({
    try: async () => {
      const input = prompt('Enter project name:')
      if (!input) {
        throw new Error('Project name is required')
      }
      return input.trim()
    },
    catch: (e) => createConfigurationError(e, 'Failed to get project name input'),
  })

// Main entry point for template scaffolding command
export const executeTemplateScaffolding = (
  runtime: string,
  projectName?: string,
): Effect.Effect<void, VibeError> => {
  const targetDirectory = Deno.cwd()

  return pipe(
    // Get project name (from argument or prompt)
    projectName ? Effect.succeed(projectName) : promptForProjectName(),
    // Execute scaffolding
    Effect.flatMap((name) => scaffoldProject(runtime, name, targetDirectory)),
  )
}
