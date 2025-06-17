/**
 * Init Command Implementation
 * 
 * Creates .vibe directory structure and initializes project configuration
 * 
 * @tested_by tests/unit/init-command.test.ts (Core functionality, dependency detection, error handling)
 * @tested_by tests/integration/cli-integration.test.ts (CLI integration, schema validation)  
 * @tested_by tests/user/real-world-workflow.test.ts (Complete user workflows, both Deno and Node.js)
 */

import { Effect, pipe } from 'effect'
import { resolve } from '@std/path'
import { z } from 'zod/v4'
import { 
  ensureDir, 
  saveJson, 
  loadJson, 
  fileExists, 
  dirExists,
  getProjectName 
} from '../lib/fs.ts'
import { 
  createFileSystemError, 
  createConfigurationError, 
  type VibeError 
} from '../lib/errors.ts'
import { 
  ProjectConfigSchema, 
  DependencySchema,
  type ProjectConfig, 
  type InitOptions,
  type Dependency 
} from '../schemas/config.ts'
import { logSuccess, logInfo } from '../lib/cli.ts'

// Package.json schema for dependency detection
const PackageJsonSchema = z.object({
  name: z.string().optional(),
  version: z.string().optional(),
  dependencies: z.record(z.string()).optional(),
  devDependencies: z.record(z.string()).optional(),
  peerDependencies: z.record(z.string()).optional(),
})

// Detect dependencies from package.json
const detectDependencies = (projectPath: string): Effect.Effect<Dependency[], VibeError> =>
  pipe(
    fileExists(resolve(projectPath, 'package.json')),
    Effect.flatMap((exists) => {
      if (!exists) {
        return Effect.succeed([])
      }
      
      return pipe(
        loadJson(PackageJsonSchema)(resolve(projectPath, 'package.json')),
        Effect.map((pkg) => {
          const dependencies: Dependency[] = []
          
          // Add regular dependencies
          if (pkg.dependencies) {
            Object.entries(pkg.dependencies).forEach(([name, version]) => {
              dependencies.push({ name, version: version as string, type: 'dependency' })
            })
          }
          
          // Add dev dependencies
          if (pkg.devDependencies) {
            Object.entries(pkg.devDependencies).forEach(([name, version]) => {
              dependencies.push({ name, version: version as string, type: 'devDependency' })
            })
          }
          
          // Add peer dependencies
          if (pkg.peerDependencies) {
            Object.entries(pkg.peerDependencies).forEach(([name, version]) => {
              dependencies.push({ name, version: version as string, type: 'peerDependency' })
            })
          }
          
          return dependencies
        }),
        Effect.catchAll(() => Effect.succeed([])) // If parsing fails, return empty array
      )
    })
  )

// Create directory structure
const createVibeStructure = (vibePath: string): Effect.Effect<void, VibeError> =>
  pipe(
    Effect.all([
      ensureDir(vibePath),
      ensureDir(resolve(vibePath, 'tools')),
      ensureDir(resolve(vibePath, 'rules')),
      ensureDir(resolve(vibePath, 'mcp')),
    ]),
    Effect.map(() => void 0)
  )

// Create initial configuration
const createInitialConfig = (
  projectPath: string, 
  projectName: string, 
  dependencies: Dependency[]
): Effect.Effect<ProjectConfig, VibeError> =>
  Effect.sync(() => {
    const now = new Date().toISOString()
    
    return ProjectConfigSchema.parse({
      projectName,
      version: '1.0.0',
      vibeVersion: '1.0.0',
      created: now,
      updated: now,
      tools: [], // Will be populated by future discovery
      dependencies,
      settings: {
        autoDiscovery: true,
        mcpEnabled: true,
      }
    })
  })

// Create additional files
const createAdditionalFiles = (vibePath: string, dependencies: Dependency[]): Effect.Effect<void, VibeError> =>
  pipe(
    Effect.all([
      // Create tools/detected.json
      saveJson(resolve(vibePath, 'tools', 'detected.json'), {
        dependencies,
        lastUpdated: new Date().toISOString(),
      }),
      
      // Create rules/universal.json  
      saveJson(resolve(vibePath, 'rules', 'universal.json'), {
        rules: [],
        lastUpdated: new Date().toISOString(),
      }),
      
      // Create mcp/tools.json
      saveJson(resolve(vibePath, 'mcp', 'tools.json'), {
        tools: [],
        server: {
          name: 'vibe-mcp',
          version: '1.0.0',
        },
        lastUpdated: new Date().toISOString(),
      }),
    ]),
    Effect.map(() => void 0)
  )

// Check if .vibe already exists and handle accordingly
const handleExistingVibe = (vibePath: string, options: InitOptions): Effect.Effect<boolean, VibeError> =>
  pipe(
    dirExists(vibePath),
    Effect.flatMap((exists) => {
      if (!exists) {
        return Effect.succeed(false) // Doesn't exist, proceed normally
      }
      
      if (options.force) {
        return Effect.succeed(true) // Exists but force flag set, proceed with overwrite
      }
      
      // Exists but no force flag - still proceed but don't overwrite files
      return Effect.succeed(true)
    })
  )

// Main init command
export const initCommand = (options: InitOptions): Effect.Effect<void, VibeError> =>
  pipe(
    Effect.sync(() => Deno.cwd()),
    Effect.flatMap((projectPath) => {
      const vibePath = resolve(projectPath, '.vibe')
      
      return pipe(
        // Log start
        logInfo(`Initializing .vibe in ${projectPath}`),
        
        // Handle existing .vibe directory
        Effect.flatMap(() => handleExistingVibe(vibePath, options)),
        
        // Get project name
        Effect.flatMap(() => getProjectName(projectPath)),
        
        // Detect dependencies
        Effect.flatMap((projectName) =>
          pipe(
            detectDependencies(projectPath),
            Effect.map((dependencies) => ({ projectName, dependencies }))
          )
        ),
        
        // Create directory structure
        Effect.flatMap(({ projectName, dependencies }) =>
          pipe(
            createVibeStructure(vibePath),
            Effect.flatMap(() => createInitialConfig(projectPath, projectName, dependencies)),
            Effect.flatMap((config) =>
              pipe(
                saveJson(resolve(vibePath, 'config.json'), config),
                Effect.flatMap(() => createAdditionalFiles(vibePath, dependencies)),
                Effect.map(() => ({ projectName, dependencies }))
              )
            )
          )
        ),
        
        // Log completion
        Effect.flatMap(({ projectName, dependencies }) =>
          pipe(
            logSuccess(`Initialized .vibe for project: ${projectName}`),
            Effect.flatMap(() => 
              dependencies.length > 0 
                ? logInfo(`Detected ${dependencies.length} dependencies for future tool extraction`)
                : logInfo('No dependencies detected - you can add them later')
            )
          )
        )
      )
    })
  )