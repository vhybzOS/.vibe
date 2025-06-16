import { z } from 'zod/v4'
import { AIToolTypeSchema, DetectedToolSchema } from './ai-tool-config.ts'

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

export const ProjectStructureSchema = z.object({
  rootPath: z.string(),
  gitRepository: z.boolean(),
  packageManagers: z.array(
    z.enum(['npm', 'yarn', 'pnpm', 'pip', 'poetry', 'cargo', 'go', 'gradle', 'maven']),
  ),
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
  }),
})

export const ProjectConfigSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  type: ProjectTypeSchema,
  languages: z.array(ProjectLanguageSchema),
  frameworks: z.array(ProjectFrameworkSchema).default([]),
  structure: ProjectStructureSchema,
  detectedTools: z.array(DetectedToolSchema).default([]),
  activeTools: z.array(AIToolTypeSchema).default([]),
  preferences: z.object({
    codeStyle: z.string().optional(),
    defaultLanguage: ProjectLanguageSchema.optional(),
    testingStrategy: z.enum(['unit', 'integration', 'e2e', 'mixed']).optional(),
    documentationLevel: z.enum(['minimal', 'standard', 'comprehensive']).default('standard'),
  }),
  metadata: z.object({
    created: z.string().datetime(),
    lastAnalyzed: z.string().datetime(),
    version: z.string().default('1.0.0'),
    vibeVersion: z.string(),
    configPath: z.string(), // Path to .vibe config
  }),
})

export const ProjectAnalysisSchema = z.object({
  structure: ProjectStructureSchema,
  complexity: z.object({
    fileCount: z.number(),
    lineCount: z.number(),
    dependencyCount: z.number(),
    testCoverage: z.number().optional(),
    technicalDebt: z.enum(['low', 'medium', 'high']).optional(),
  }),
  patterns: z.array(z.object({
    name: z.string(),
    type: z.enum(['architectural', 'design', 'naming', 'testing', 'documentation']),
    confidence: z.number().min(0).max(1),
    examples: z.array(z.string()),
    description: z.string(),
  })),
  recommendations: z.array(z.object({
    type: z.enum(['rule', 'structure', 'tooling', 'documentation']),
    title: z.string(),
    description: z.string(),
    priority: z.enum(['low', 'medium', 'high']),
    effort: z.enum(['low', 'medium', 'high']),
    automated: z.boolean().default(false),
  })),
  timestamp: z.string().datetime(),
})

export const VibeConfigSchema = z.object({
  project: ProjectConfigSchema,
  settings: z.object({
    autoSync: z.boolean().default(true),
    watchFiles: z.boolean().default(true),
    generateDocs: z.boolean().default(true),
    captureDecisions: z.boolean().default(true),
    discoverDependencies: z.boolean().default(true),
    mcpServer: z.object({
      enabled: z.boolean().default(true),
      port: z.number().default(3000),
      host: z.string().default('localhost'),
    }),
  }),
  paths: z.object({
    rules: z.string().default('rules'),
    docs: z.string().default('docs'),
    memory: z.string().default('memory'),
    diary: z.string().default('diary'),
    dependencies: z.string().default('dependencies'),
    config: z.string().default('config'),
  }),
  integrations: z.record(
    AIToolTypeSchema,
    z.object({
      enabled: z.boolean(),
      configPath: z.string().optional(),
      lastSync: z.string().datetime().optional(),
      syncStrategy: z.enum(['overwrite', 'merge', 'manual']).default('merge'),
    }),
  ).default(() => ({
    cursor: { enabled: false, syncStrategy: 'merge' as const },
    windsurf: { enabled: false, syncStrategy: 'merge' as const },
    claude: { enabled: false, syncStrategy: 'merge' as const },
    copilot: { enabled: false, syncStrategy: 'merge' as const },
    codeium: { enabled: false, syncStrategy: 'merge' as const },
    cody: { enabled: false, syncStrategy: 'merge' as const },
    tabnine: { enabled: false, syncStrategy: 'merge' as const },
  })),
})

export type ProjectConfig = z.output<typeof ProjectConfigSchema>
export type ProjectStructure = z.output<typeof ProjectStructureSchema>
export type ProjectAnalysis = z.output<typeof ProjectAnalysisSchema>
export type VibeConfig = z.output<typeof VibeConfigSchema>
export type ProjectLanguage = z.output<typeof ProjectLanguageSchema>
export type ProjectFramework = z.output<typeof ProjectFrameworkSchema>
export type ProjectType = z.output<typeof ProjectTypeSchema>
