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
import { dirExists, ensureDir, loadJson, readTextFile, saveJson, writeTextFile } from '../lib/fs.ts'
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

// Manifest file schemas for validation and type safety
const PackageJsonSchema = z.object({
  name: z.string(),
  version: z.string().optional(),
  description: z.string().optional(),
  type: z.string().optional(),
  main: z.string().optional(),
  scripts: z.record(z.string()).optional(),
  dependencies: z.record(z.string()).optional(),
  devDependencies: z.record(z.string()).optional(),
  peerDependencies: z.record(z.string()).optional(),
  engines: z.record(z.string()).optional(),
}).passthrough() // Allow additional properties

const DenoJsonSchema = z.object({
  name: z.string(),
  version: z.string().optional(),
  exports: z.record(z.string()).optional(),
  tasks: z.record(z.string()).optional(),
  imports: z.record(z.string()).optional(),
  compilerOptions: z.record(z.any()).optional(),
  fmt: z.record(z.any()).optional(),
  lint: z.record(z.any()).optional(),
  exclude: z.array(z.string()).optional(),
}).passthrough() // Allow additional properties

// Generic manifest updater function type - extensible for any file format
type ManifestUpdater = (projectPath: string, projectName: string) => Effect.Effect<void, VibeError>

// Node.js manifest updater - updates package.json name field
const updateNodeManifest: ManifestUpdater = (projectPath: string, projectName: string) =>
  pipe(
    loadJson(PackageJsonSchema)(resolve(projectPath, 'package.json')),
    Effect.map((pkg) => ({ ...pkg, name: projectName })),
    Effect.flatMap((updatedPkg) => saveJson(resolve(projectPath, 'package.json'), updatedPkg)),
    Effect.catchAll(() =>
      Effect.fail(
        createFileSystemError(
          new Error('Failed to update package.json'),
          resolve(projectPath, 'package.json'),
          'Could not update project name in package.json',
        ),
      )
    ),
  )

// Deno manifest updater - updates deno.json name field
const updateDenoManifest: ManifestUpdater = (projectPath: string, projectName: string) =>
  pipe(
    loadJson(DenoJsonSchema)(resolve(projectPath, 'deno.json')),
    Effect.map((deno) => ({ ...deno, name: projectName })),
    Effect.flatMap((updatedDeno) => saveJson(resolve(projectPath, 'deno.json'), updatedDeno)),
    Effect.catchAll(() =>
      Effect.fail(
        createFileSystemError(
          new Error('Failed to update deno.json'),
          resolve(projectPath, 'deno.json'),
          'Could not update project name in deno.json',
        ),
      )
    ),
  )

// Future: Python manifest updater - updates project name in requirements.txt or pyproject.toml
// const updatePythonManifest: ManifestUpdater = (projectPath: string, projectName: string) =>
//   pipe(
//     readTextFile(resolve(projectPath, 'pyproject.toml')),
//     Effect.map(content => content.replace(/name\s*=\s*"[^"]*"/, `name = "${projectName}"`)),
//     Effect.flatMap(content => writeTextFile(resolve(projectPath, 'pyproject.toml'), content))
//   )

// Runtime to manifest updater mapping - extensible for future runtimes
const MANIFEST_UPDATERS: Record<SupportedRuntime, ManifestUpdater> = {
  node: updateNodeManifest,
  deno: updateDenoManifest,
}

// Main function to update project manifest for any runtime
export const updateProjectManifest = (
  runtime: SupportedRuntime,
  projectPath: string,
  projectName: string,
): Effect.Effect<void, VibeError> =>
  pipe(
    Effect.sync(() => MANIFEST_UPDATERS[runtime]),
    Effect.flatMap((updater) => updater(projectPath, projectName)),
    Effect.flatMap(() => logInfo(`Updated ${runtime} manifest with project name: ${projectName}`)),
  )

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
const copyFile = (sourcePath: string, destPath: string): Effect.Effect<void, VibeError> => {
  // Handle .template files by removing the .template extension in destination
  const finalDestPath = destPath.endsWith('.template') ? destPath.slice(0, -9) : destPath

  return pipe(
    readTextFile(sourcePath),
    Effect.flatMap((content) => writeTextFile(finalDestPath, content)),
  )
}

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
        // Update manifest with project name
        Effect.flatMap(() =>
          pipe(
            Effect.try({
              try: () => SupportedRuntimeSchema.parse(runtime),
              catch: (e) => createConfigurationError(e, `Invalid runtime for manifest update: ${runtime}`),
            }),
            Effect.flatMap((validRuntime) => updateProjectManifest(validRuntime, projectPath, projectName)),
          )
        ),
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
