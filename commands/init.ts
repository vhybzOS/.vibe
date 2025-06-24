/**
 * Vibe Init Command - Universal Template System
 * 
 * Template semantics: Copy universal template to project root instead of creating .vibe subdirectory
 * Battle-tested reuse: Effect-TS patterns, error handling, configuration from root
 *
 * @tested_by tests/init-command.test.ts (Template copying, configuration generation, dependency detection)
 * @tested_by tests/vibe-commands.test.ts (Integration with complete workflow, battle-tested patterns reuse)
 */

import { Effect, pipe } from 'effect'
import { resolve, basename } from '@std/path'
import { z } from 'zod/v4'
import { dirExists, ensureDir, fileExists, loadJson, saveJson, readTextFile, writeTextFile } from '../lib/fs/operations.ts'
import { createConfigurationError, createFileSystemError, type VibeError } from '../lib/types/errors.ts'
import {
  type Dependency,
  DependencySchema,
  type ProjectConfig,
  ProjectConfigSchema,
  createDefaultProjectConfig,
} from '../lib/schemas/config.ts'

// Init command options following battle-tested patterns
export const InitOptionsSchema = z.object({
  force: z.boolean().default(false),
  quiet: z.boolean().default(false),
})

export type InitOptions = z.infer<typeof InitOptionsSchema>

// Dependency detection schemas (reused from root patterns)
const PackageJsonSchema = z.object({
  name: z.string().optional(),
  version: z.string().optional(),
  dependencies: z.record(z.string()).optional(),
  devDependencies: z.record(z.string()).optional(),
  peerDependencies: z.record(z.string()).optional(),
}).passthrough()

const DenoJsonSchema = z.object({
  name: z.string().optional(),
  version: z.string().optional(),
  imports: z.record(z.string()).optional(),
  tasks: z.record(z.string()).optional(),
}).passthrough()

// Get project name from manifests or directory (battle-tested pattern)
const getProjectName = (projectPath: string): Effect.Effect<string, VibeError> =>
  pipe(
    // Try package.json first
    Effect.tryPromise({
      try: () => fileExists(resolve(projectPath, 'package.json')),
      catch: (error) => createFileSystemError(error, resolve(projectPath, 'package.json'), 'Failed to check package.json')
    }),
    Effect.flatMap((hasPackageJson) => {
      if (hasPackageJson) {
        return pipe(
          Effect.tryPromise({
            try: () => loadJson(resolve(projectPath, 'package.json')),
            catch: (error) => createFileSystemError(error, resolve(projectPath, 'package.json'), 'Failed to read package.json')
          }),
          Effect.flatMap((pkg) => Effect.try({
            try: () => PackageJsonSchema.parse(pkg),
            catch: (error) => createConfigurationError(error, 'Invalid package.json format')
          })),
          Effect.map((pkg) => pkg.name || basename(projectPath)),
          Effect.catchAll(() => Effect.succeed(basename(projectPath)))
        )
      }
      
      // Try deno.json
      return pipe(
        Effect.tryPromise({
          try: () => fileExists(resolve(projectPath, 'deno.json')),
          catch: (error) => createFileSystemError(error, resolve(projectPath, 'deno.json'), 'Failed to check deno.json')
        }),
        Effect.flatMap((hasDenoJson) => {
          if (hasDenoJson) {
            return pipe(
              Effect.tryPromise({
                try: () => loadJson(resolve(projectPath, 'deno.json')),
                catch: (error) => createFileSystemError(error, resolve(projectPath, 'deno.json'), 'Failed to read deno.json')
              }),
              Effect.flatMap((deno) => Effect.try({
                try: () => DenoJsonSchema.parse(deno),
                catch: (error) => createConfigurationError(error, 'Invalid deno.json format')
              })),
              Effect.map((deno) => deno.name || basename(projectPath)),
              Effect.catchAll(() => Effect.succeed(basename(projectPath)))
            )
          }
          
          // Fallback to directory name
          return Effect.succeed(basename(projectPath))
        })
      )
    })
  )

// Detect dependencies from package.json (battle-tested pattern)
const detectPackageJsonDependencies = (projectPath: string): Effect.Effect<Dependency[], VibeError> =>
  pipe(
    Effect.tryPromise({
      try: () => fileExists(resolve(projectPath, 'package.json')),
      catch: (error) => createFileSystemError(error, resolve(projectPath, 'package.json'), 'Failed to check package.json')
    }),
    Effect.flatMap((exists) => {
      if (!exists) return Effect.succeed([])
      
      return pipe(
        Effect.tryPromise({
          try: () => loadJson(resolve(projectPath, 'package.json')),
          catch: (error) => createFileSystemError(error, resolve(projectPath, 'package.json'), 'Failed to read package.json')
        }),
        Effect.flatMap((pkg) => Effect.try({
          try: () => PackageJsonSchema.parse(pkg),
          catch: (error) => createConfigurationError(error, 'Invalid package.json format')
        })),
        Effect.map((pkg) => {
          const dependencies: Dependency[] = []
          
          // Add regular dependencies
          if (pkg.dependencies) {
            Object.entries(pkg.dependencies).forEach(([name, version]) => {
              dependencies.push({
                name,
                version,
                type: 'dependency',
              })
            })
          }
          
          // Add dev dependencies
          if (pkg.devDependencies) {
            Object.entries(pkg.devDependencies).forEach(([name, version]) => {
              dependencies.push({
                name,
                version,
                type: 'devDependency',
              })
            })
          }
          
          return dependencies
        }),
        Effect.catchAll(() => Effect.succeed([]))
      )
    })
  )

// Detect dependencies from deno.json (battle-tested pattern)
const detectDenoJsonDependencies = (projectPath: string): Effect.Effect<Dependency[], VibeError> =>
  pipe(
    Effect.tryPromise({
      try: () => fileExists(resolve(projectPath, 'deno.json')),
      catch: (error) => createFileSystemError(error, resolve(projectPath, 'deno.json'), 'Failed to check deno.json')
    }),
    Effect.flatMap((exists) => {
      if (!exists) return Effect.succeed([])
      
      return pipe(
        Effect.tryPromise({
          try: () => loadJson(resolve(projectPath, 'deno.json')),
          catch: (error) => createFileSystemError(error, resolve(projectPath, 'deno.json'), 'Failed to read deno.json')
        }),
        Effect.flatMap((deno) => Effect.try({
          try: () => DenoJsonSchema.parse(deno),
          catch: (error) => createConfigurationError(error, 'Invalid deno.json format')
        })),
        Effect.map((deno) => {
          const dependencies: Dependency[] = []
          
          if (deno.imports) {
            Object.entries(deno.imports).forEach(([name, version]) => {
              dependencies.push({
                name,
                version,
                type: 'dependency',
              })
            })
          }
          
          return dependencies
        }),
        Effect.catchAll(() => Effect.succeed([]))
      )
    })
  )

// Combine all dependency detection methods
const detectAllDependencies = (projectPath: string): Effect.Effect<Dependency[], VibeError> =>
  pipe(
    Effect.all([
      detectPackageJsonDependencies(projectPath),
      detectDenoJsonDependencies(projectPath),
    ]),
    Effect.map(([packageDeps, denoDeps]) => [...packageDeps, ...denoDeps])
  )

// Copy a single file with error handling
const copyFile = (sourcePath: string, destPath: string): Effect.Effect<void, VibeError> =>
  pipe(
    Effect.tryPromise({
      try: () => readTextFile(sourcePath),
      catch: (error) => createFileSystemError(error, sourcePath, 'Failed to read file')
    }),
    Effect.flatMap((content) => Effect.tryPromise({
      try: () => writeTextFile(destPath, content),
      catch: (error) => createFileSystemError(error, destPath, 'Failed to write file')
    })),
    Effect.catchAll((error) =>
      Effect.fail(
        createFileSystemError(
          error,
          sourcePath,
          `Failed to copy file from ${sourcePath} to ${destPath}`
        )
      )
    )
  )

// Recursively copy directory (battle-tested pattern with revolutionary semantics)
const copyDirectory = (sourceDir: string, destDir: string): Effect.Effect<void, VibeError> =>
  pipe(
    Effect.tryPromise({
      try: () => ensureDir(destDir),
      catch: (error) => createFileSystemError(error, destDir, 'Failed to create directory')
    }),
    Effect.flatMap(() =>
      Effect.tryPromise({
        try: async () => {
          for await (const entry of Deno.readDir(sourceDir)) {
            const sourcePath = resolve(sourceDir, entry.name)
            const destPath = resolve(destDir, entry.name)
            
            if (entry.isDirectory) {
              await Effect.runPromise(copyDirectory(sourcePath, destPath))
            } else {
              await Effect.runPromise(copyFile(sourcePath, destPath))
            }
          }
        },
        catch: (error) =>
          createFileSystemError(
            error,
            sourceDir,
            `Failed to copy directory from ${sourceDir} to ${destDir}`
          ),
      })
    )
  )

// Revolutionary: Copy v2/template to project root (.vibe directory)
const copyTemplateToProject = (projectPath: string): Effect.Effect<void, VibeError> => {
  // Get template source path (v2/template)
  const templatePath = resolve(import.meta.dirname!, '..', 'template')
  const vibeDir = resolve(projectPath, '.vibe')
  
  return pipe(
    // Validate template exists
    Effect.tryPromise({
      try: () => dirExists(templatePath),
      catch: (error) => createFileSystemError(error, templatePath, 'Failed to check template directory')
    }),
    Effect.flatMap((exists) => {
      if (!exists) {
        return Effect.fail(
          createFileSystemError(
            new Error(`Template directory not found: ${templatePath}`),
            templatePath,
            'v2/template directory not found'
          )
        )
      }
      return Effect.succeed(templatePath)
    }),
    // Copy template/.vibe to project/.vibe
    Effect.flatMap(() => copyDirectory(resolve(templatePath, '.vibe'), vibeDir))
  )
}

// Create project configuration (battle-tested pattern)
const createProjectConfiguration = (
  projectPath: string,
  projectName: string,
  dependencies: Dependency[]
): Effect.Effect<void, VibeError> => {
  const configPath = resolve(projectPath, '.vibe', 'config.json')
  
  const config: ProjectConfig = {
    ...createDefaultProjectConfig(),
    projectName,
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    dependencies,
    settings: {
      autoDiscovery: true,
      mcpEnabled: true,
    },
  }
  
  return pipe(
    // Validate configuration with schema
    Effect.try({
      try: () => ProjectConfigSchema.parse(config),
      catch: (error) =>
        createConfigurationError(
          error,
          'Failed to validate project configuration'
        ),
    }),
    Effect.flatMap((validConfig) => Effect.tryPromise({
      try: () => saveJson(configPath, validConfig),
      catch: (error) => createFileSystemError(error, configPath, 'Failed to save configuration')
    }))
  )
}

// Initialize SurrealDB code.db at project level (revolutionary approach)
const initializeSurrealDB = (projectPath: string): Effect.Effect<void, VibeError> => {
  const codeDbPath = resolve(projectPath, '.vibe', 'code.db')
  
  return pipe(
    Effect.tryPromise({
      try: () => ensureDir(resolve(projectPath, '.vibe')),
      catch: (error) => createFileSystemError(error, resolve(projectPath, '.vibe'), 'Failed to create .vibe directory')
    }),
    Effect.flatMap(() =>
      Effect.tryPromise({
        try: () => writeTextFile(codeDbPath, ''),
        catch: (error) => createFileSystemError(error, codeDbPath, 'Failed to create code.db file')
      })
    ),
    Effect.catchAll((error) =>
      Effect.fail(
        createFileSystemError(
          error,
          codeDbPath,
          'Failed to initialize SurrealDB code.db file'
        )
      )
    )
  )
}

// Check if .vibe directory already exists
const checkExistingVibeDirectory = (projectPath: string, force: boolean): Effect.Effect<void, VibeError> => {
  const vibeDir = resolve(projectPath, '.vibe')
  
  return pipe(
    Effect.tryPromise({
      try: () => dirExists(vibeDir),
      catch: (error) => createFileSystemError(error, vibeDir, 'Failed to check .vibe directory')
    }),
    Effect.flatMap((exists) => {
      if (exists && !force) {
        return Effect.fail(
          createFileSystemError(
            new Error('.vibe directory already exists'),
            vibeDir,
            '.vibe directory already exists. Use --force to overwrite.'
          )
        )
      }
      return Effect.succeed(void 0)
    })
  )
}

// Main init command implementation
export const initCommand = (options: InitOptions = {}): Effect.Effect<void, VibeError> => {
  const { force = false, quiet = false } = options
  const projectPath = Deno.cwd()
  
  
  return pipe(
    // Validate options
    Effect.try({
      try: () => InitOptionsSchema.parse(options),
      catch: (error) =>
        createConfigurationError(error, 'Invalid init command options'),
    }),
    
    // Check for existing .vibe directory
    Effect.flatMap(() => checkExistingVibeDirectory(projectPath, force)),
    
    // Get project information
    Effect.flatMap(() =>
      Effect.all({
        projectName: getProjectName(projectPath),
        dependencies: detectAllDependencies(projectPath),
      })
    ),
    
    // Execute initialization steps
    Effect.flatMap(({ projectName, dependencies }) =>
      pipe(
        Effect.succeed(void 0),
        
        // Step 1: Copy template to project (revolutionary semantics)
        Effect.flatMap(() => {
          if (!quiet) console.log(`Initializing .vibe directory with v2 template...`)
          return copyTemplateToProject(projectPath)
        }),
        
        // Step 2: Create configuration
        Effect.flatMap(() => {
          if (!quiet) console.log(`Creating project configuration for '${projectName}'...`)
          return createProjectConfiguration(projectPath, projectName, dependencies)
        }),
        
        // Step 3: Initialize SurrealDB
        Effect.flatMap(() => initializeSurrealDB(projectPath)),
      )
    )
  )
}

// CLI-friendly wrapper for the init command
export const executeInitCommand = (args: string[]): Effect.Effect<void, VibeError> => {
  // Parse CLI arguments
  const force = args.includes('--force') || args.includes('-f')
  const quiet = args.includes('--quiet') || args.includes('-q')
  
  return initCommand({ force, quiet })
}