/**
 * Template Manager v2 - Enhanced vibe init using proven patterns
 * Reuses battle-tested code from root/commands/init.ts and root/ure/schemas/project-config.ts
 *
 * @tested_by tests/unit/template-system.test.ts
 */

import { Effect, pipe } from 'effect'
import { resolve } from '@std/path'
import { z } from 'zod/v4'
import {
  ensureDir,
  fileExists,
  writeJSONFile,
  writeTextFile,
  readTextFile,
} from '../../ure/lib/fs.ts'
import {
  createFileSystemError,
  createConfigurationError,
  type VibeError,
} from '../../ure/lib/errors.ts'
import {
  ProjectTypeSchema,
  ProjectLanguageSchema,
  ProjectFrameworkSchema,
  PackageManagerSchema,
  type ProjectType,
  type ProjectLanguage,
  type ProjectFramework,
} from '../../ure/schemas/project-config.ts'

/**
 * v2-specific configuration extending the proven schemas
 */
export const AxiorProjectConfigSchema = z.object({
  version: z.string().default('2.0.0'),
  framework: ProjectTypeSchema,
  language: ProjectLanguageSchema,
  axior: z.object({
    surrealdb: z.object({
      path: z.string().default('.vibe/code.db'),
      namespace: z.string().default('axior'),
      database: z.string().default('project'),
    }),
    algorithms: z.object({
      entry_point: z.string().default('main.md'),
      specs_stage: z.string().default('specs-stage.md'),
      development: z.string().default('dev-9step.md'),
      session_management: z.string().default('session-mgmt.md'),
    }),
    context: z.object({
      main_limit: z.number().default(50000),
      subagent_limit: z.number().default(200000),
      compression_target: z.number().default(0.7),
    }),
  }),
  commands: z.record(z.string()),
})

export type AxiorProjectConfig = z.output<typeof AxiorProjectConfigSchema>

/**
 * Template manager using functional patterns - NO CLASSES
 */
/**
 * Detects project type using proven detection logic from root
 */
export const detectProjectType = (projectPath: string): Effect.Effect<ProjectType, VibeError> =>
  pipe(
    // Check for Deno first
    fileExists(resolve(projectPath, 'deno.json')),
    Effect.flatMap((hasDenoJson) => {
      if (hasDenoJson) return Effect.succeed('cli-tool' as ProjectType)
      
      // Check for Node.js
      return pipe(
        fileExists(resolve(projectPath, 'package.json')),
        Effect.map((hasPackageJson) => 
          hasPackageJson ? ('web-app' as ProjectType) : ('library' as ProjectType)
        )
      )
    })
  )

/**
 * Gets framework-specific configuration using proven patterns
 */
export const getFrameworkConfig = (projectType: ProjectType): AxiorProjectConfig => {
  const baseConfig = {
    version: '2.0.0',
    framework: projectType,
    language: 'typescript' as ProjectLanguage,
    axior: {
      surrealdb: {
        path: '.vibe/code.db',
        namespace: 'axior', 
        database: 'project',
      },
      algorithms: {
        entry_point: 'main.md',
        specs_stage: 'specs-stage.md',
        development: 'dev-9step.md',
        session_management: 'session-mgmt.md',
      },
      context: {
        main_limit: 50000,
        subagent_limit: 200000,
        compression_target: 0.7,
      },
    },
    commands: {} as Record<string, string>,
  }

  // Framework-specific command mappings
  switch (projectType) {
    case 'cli-tool':
      baseConfig.commands = {
        test: 'deno test',
        lint: 'deno lint',
        fmt: 'deno fmt',
        check: 'deno check',
      }
      break
    case 'web-app':
      baseConfig.commands = {
        test: 'npm test',
        lint: 'npm run lint', 
        build: 'npm run build',
      }
      break
    default:
      baseConfig.commands = {
        test: 'echo "No test command configured"',
      }
  }

  return baseConfig
}

/**
 * Initializes v2 project using proven file system patterns
 */
export const initAxiorProject = (
  projectPath: string,
  templatesPath = 'templates'
): Effect.Effect<void, VibeError> => {
  pipe(
    // Detect project type
    detectProjectType(projectPath),
    Effect.flatMap((projectType) =>
      pipe(
        // Ensure project directory exists
        ensureDir(projectPath),
        // Copy base template structure
        Effect.flatMap(() => copyAxiorTemplate(templatesPath, projectPath)),
        // Create framework-specific config
        Effect.flatMap(() => {
          const config = getFrameworkConfig(projectType)
          const configPath = resolve(projectPath, '.vibe', 'config.json')
          return writeJSONFile(configPath, config)
        }),
        // Copy AGENTS.md
        Effect.flatMap(() => {
          const agentsPath = resolve(projectPath, 'AGENTS.md')
          const templateAgentsPath = resolve(templatesPath, 'base', 'AGENTS.md')
          return pipe(
            readTextFile(templateAgentsPath),
            Effect.flatMap((content) => writeTextFile(agentsPath, content))
          )
        }),
        Effect.map(() => {
          console.log(`Initialized Axior OS v2 for ${projectType} project at ${projectPath}`)
        })
      )
    )
  )
}

/**
 * Copies Axior template structure using proven file system utilities
 */
export const copyAxiorTemplate = (
  templatesPath: string,
  targetPath: string
): Effect.Effect<void, VibeError> => {
  const templatePath = resolve(templatesPath, 'base')
  
  return pipe(
    copyDirectory(templatePath, targetPath),
    Effect.catchAll((error) =>
      Effect.fail(createFileSystemError(
        error,
        templatePath,
        `Failed to copy Axior template from ${templatePath}`
      ))
    )
  )
}

/**
 * Recursively copies directory using Effect-TS patterns
 */
const copyDirectory = (
  sourcePath: string,
  targetPath: string
): Effect.Effect<void, VibeError> =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        const entries = []
        for await (const entry of Deno.readDir(sourcePath)) {
          entries.push(entry)
        }
        return entries
      },
      catch: (error) => createFileSystemError(
        error,
        sourcePath,
        `Failed to read template directory: ${sourcePath}`
      ),
    }),
    Effect.flatMap((entries) =>
      Effect.all(
        entries.map((entry) => {
          const sourceEntryPath = resolve(sourcePath, entry.name)
          const targetEntryPath = resolve(targetPath, entry.name)
          
          if (entry.isDirectory) {
            return pipe(
              ensureDir(targetEntryPath),
              Effect.flatMap(() => copyDirectory(sourceEntryPath, targetEntryPath))
            )
          } else {
            return Effect.tryPromise({
              try: () => Deno.copyFile(sourceEntryPath, targetEntryPath),
              catch: (error) => createFileSystemError(
                error,
                sourceEntryPath,
                `Failed to copy file: ${sourceEntryPath}`
              ),
            })
          }
        }),
        { concurrency: 5 }
      )
    ),
    Effect.map(() => void 0)
  )
/**
 * Validates template structure using proven patterns
 */
export const validateAxiorTemplate = (
  templatePath: string
): Effect.Effect<boolean, VibeError> =>
  pipe(
    Effect.all([
      fileExists(resolve(templatePath, 'AGENTS.md')),
      fileExists(resolve(templatePath, '.vibe', 'config.json')),
      fileExists(resolve(templatePath, '.vibe', 'algorithms', 'main.md')),
    ]),
    Effect.map(([hasAgents, hasConfig, hasMainAlgorithm]) => 
      hasAgents && hasConfig && hasMainAlgorithm
    ),
    Effect.catchAll(() => Effect.succeed(false))
  )

/**
 * Lists available templates using functional patterns
 */
export const listAvailableTemplates = (
  templatesPath: string
): Effect.Effect<string[], VibeError> =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        const templates: string[] = []
        for await (const entry of Deno.readDir(templatesPath)) {
          if (entry.isDirectory) {
            templates.push(entry.name)
          }
        }
        return templates
      },
      catch: (error) => createFileSystemError(
        error,
        templatesPath,
        `Failed to list templates: ${templatesPath}`
      ),
    }),
    Effect.flatMap((templateNames) =>
      Effect.all(
        templateNames.map((name) =>
          pipe(
            validateAxiorTemplate(resolve(templatesPath, name)),
            Effect.map((isValid) => ({ name, isValid }))
          )
        )
      )
    ),
    Effect.map((results) => 
      results.filter(({ isValid }) => isValid).map(({ name }) => name)
    ),
    Effect.catchAll(() => Effect.succeed(['base']))
  )