/**
 * Project Configuration Schema
 *
 * Enhanced project configuration schema based on legacy/schemas/project.ts
 * Defines the structure for .vibe/config.json in user projects
 *
 * @tested_by tests/unit/project-config.test.ts (Schema validation, defaults, helper functions)
 * @tested_by tests/integration/init-command.test.ts (Project initialization, config generation)
 * @tested_by tests/user/vibe-init.test.ts (End-to-end project setup workflow)
 */

import { z } from 'zod/v4'

/**
 * Supported programming languages
 */
export const ProjectLanguageSchema = z.enum([
  'typescript',
  'javascript',
  'python',
  'rust',
  'go',
  'java',
  'csharp',
  'cpp',
  'c',
  'php',
  'ruby',
  'swift',
  'kotlin',
  'scala',
  'dart',
  'elixir',
  'clojure',
  'haskell',
  'ocaml',
  'fsharp',
])

/**
 * Supported frameworks
 */
export const ProjectFrameworkSchema = z.enum([
  'react',
  'vue',
  'angular',
  'svelte',
  'nextjs',
  'nuxtjs',
  'express',
  'fastify',
  'nestjs',
  'hono',
  'oak',
  'django',
  'flask',
  'fastapi',
  'rails',
  'laravel',
  'spring',
  'actix',
  'gin',
  'fiber',
  'echo',
])

/**
 * Project types
 */
export const ProjectTypeSchema = z.enum([
  'web-app',
  'mobile-app',
  'desktop-app',
  'cli-tool',
  'library',
  'api',
  'microservice',
  'monolith',
  'game',
  'ml-project',
  'data-science',
  'devops',
  'infrastructure',
])

/**
 * Package manager types
 */
export const PackageManagerSchema = z.enum([
  'npm',
  'yarn',
  'pnpm',
  'deno',
  'pip',
  'poetry',
  'cargo',
  'go',
  'gradle',
  'maven',
])

/**
 * IDE tool types
 */
export const IDEToolSchema = z.enum([
  'cursor',
  'windsurf',
  'claude',
  'copilot',
  'codeium',
  'cody',
  'tabnine',
])

/**
 * Project structure configuration
 */
export const ProjectStructureSchema = z.object({
  rootPath: z.string(),
  gitRepository: z.boolean().default(true),
  packageManagers: z.array(PackageManagerSchema).default(['npm']),
  buildTools: z.array(z.string()).default([]),
  testFrameworks: z.array(z.string()).default([]),
  linters: z.array(z.string()).default([]),
  formatters: z.array(z.string()).default([]),
  directories: z.object({
    source: z.array(z.string()).default(['src', 'lib']),
    tests: z.array(z.string()).default(['test', 'tests', '__tests__']),
    docs: z.array(z.string()).default(['docs', 'documentation']),
    config: z.array(z.string()).default(['config', '.config']),
    assets: z.array(z.string()).default(['assets', 'public', 'static']),
  }).default({}),
})

/**
 * URE-specific configuration
 */
export const UREConfigSchema = z.object({
  version: z.string().default('1.0.0'),
  autoGeneration: z.object({
    enabled: z.boolean().default(true),
    watchFiles: z.boolean().default(true),
    generateOnInit: z.boolean().default(true),
  }).default({}),
  ideIntegration: z.record(
    IDEToolSchema,
    z.object({
      enabled: z.boolean().default(false),
      outputPath: z.string().optional(),
      gitIgnored: z.boolean().default(true),
      autoUpdate: z.boolean().default(true),
    }),
  ).default({}),
  dependencies: z.object({
    autoDiscover: z.boolean().default(true),
    fetchDocumentation: z.boolean().default(true),
    extractionLevel: z.enum(['basic', 'fine_grained']).default('basic'),
  }).default({}),
})

/**
 * Complete project configuration schema
 */
export const ProjectConfigSchema = z.object({
  project: z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    type: ProjectTypeSchema,
    languages: z.array(ProjectLanguageSchema).min(1),
    frameworks: z.array(ProjectFrameworkSchema).default([]),
    structure: ProjectStructureSchema,
  }),
  ure: UREConfigSchema,
  metadata: z.object({
    created: z.string().datetime(),
    lastModified: z.string().datetime(),
    version: z.string().default('1.0.0'),
    vibeVersion: z.string(),
    configPath: z.string(), // Path to .vibe directory
  }),
})

export type ProjectLanguage = z.output<typeof ProjectLanguageSchema>
export type ProjectFramework = z.output<typeof ProjectFrameworkSchema>
export type ProjectType = z.output<typeof ProjectTypeSchema>
export type PackageManager = z.output<typeof PackageManagerSchema>
export type IDETool = z.output<typeof IDEToolSchema>
export type ProjectStructure = z.output<typeof ProjectStructureSchema>
export type UREConfig = z.output<typeof UREConfigSchema>
export type ProjectConfig = z.output<typeof ProjectConfigSchema>

/**
 * Helper function to create default project config
 */
export const createDefaultProjectConfig = (
  projectPath: string,
  vibeVersion: string,
  overrides: Partial<ProjectConfig> = {},
): ProjectConfig => {
  const projectName = projectPath.split('/').pop() || 'unnamed-project'

  return {
    project: {
      name: projectName,
      description: 'Auto-generated project configuration',
      type: 'web-app',
      languages: ['typescript'],
      frameworks: [],
      structure: {
        rootPath: projectPath,
        gitRepository: true,
        packageManagers: ['npm'],
        buildTools: [],
        testFrameworks: [],
        linters: [],
        formatters: [],
        directories: {
          source: ['src'],
          tests: ['test', 'tests'],
          docs: ['docs'],
          config: ['config', '.config'],
          assets: ['assets', 'public'],
        },
      },
    },
    ure: {
      version: '1.0.0',
      autoGeneration: {
        enabled: true,
        watchFiles: true,
        generateOnInit: true,
      },
      ideIntegration: {
        cursor: { enabled: false, gitIgnored: true, autoUpdate: true },
        windsurf: { enabled: false, gitIgnored: true, autoUpdate: true },
        claude: { enabled: true, gitIgnored: false, autoUpdate: true }, // CLAUDE.md is committed
      },
      dependencies: {
        autoDiscover: true,
        fetchDocumentation: true,
        extractionLevel: 'basic',
      },
    },
    metadata: {
      created: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      version: '1.0.0',
      vibeVersion,
      configPath: `${projectPath}/.vibe`,
    },
    ...overrides,
  }
}
