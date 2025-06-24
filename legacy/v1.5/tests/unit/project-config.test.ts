/**
 * Project Configuration Schema Tests
 *
 * Tests for ure/schemas/project-config.ts
 * Validates project configuration schema and default generation
 */

import { assertEquals, assertThrows } from '@std/assert'
import {
  createDefaultProjectConfig,
  IDEToolSchema,
  type PackageManager,
  type ProjectConfig,
  ProjectConfigSchema,
  type ProjectFramework,
  ProjectFrameworkSchema,
  type ProjectLanguage,
  ProjectLanguageSchema,
  ProjectStructureSchema,
  ProjectTypeSchema,
  UREConfigSchema,
} from '../../ure/schemas/project-config.ts'

Deno.test('Project Config - ProjectLanguageSchema - valid languages', () => {
  const validLanguages = ['typescript', 'javascript', 'python', 'rust', 'go']

  for (const lang of validLanguages) {
    const result = ProjectLanguageSchema.parse(lang)
    assertEquals(result, lang)
  }
})

Deno.test('Project Config - ProjectLanguageSchema - invalid language', () => {
  assertThrows(
    () => ProjectLanguageSchema.parse('invalid-lang'),
    Error,
    'Invalid enum value',
  )
})

Deno.test('Project Config - ProjectFrameworkSchema - valid frameworks', () => {
  const validFrameworks = ['react', 'vue', 'hono', 'express', 'django']

  for (const framework of validFrameworks) {
    const result = ProjectFrameworkSchema.parse(framework)
    assertEquals(result, framework)
  }
})

Deno.test('Project Config - ProjectTypeSchema - valid types', () => {
  const validTypes = ['web-app', 'cli-tool', 'library', 'api']

  for (const type of validTypes) {
    const result = ProjectTypeSchema.parse(type)
    assertEquals(result, type)
  }
})

Deno.test('Project Config - IDEToolSchema - valid IDE tools', () => {
  const validTools = ['cursor', 'windsurf', 'claude', 'copilot']

  for (const tool of validTools) {
    const result = IDEToolSchema.parse(tool)
    assertEquals(result, tool)
  }
})

Deno.test('Project Config - ProjectStructureSchema - valid structure', () => {
  const validStructure = {
    rootPath: '/home/user/project',
    gitRepository: true,
    packageManagers: ['npm', 'deno'],
    buildTools: ['vite', 'esbuild'],
    testFrameworks: ['vitest', 'deno'],
    linters: ['eslint', 'deno_lint'],
    formatters: ['prettier', 'deno_fmt'],
    directories: {
      source: ['src', 'lib'],
      tests: ['test', '__tests__'],
      docs: ['docs'],
      config: ['.config'],
      assets: ['public', 'assets'],
    },
  }

  const result = ProjectStructureSchema.parse(validStructure)
  assertEquals(result.rootPath, '/home/user/project')
  assertEquals(result.gitRepository, true)
  assertEquals(result.packageManagers, ['npm', 'deno'])
  assertEquals(result.directories.source, ['src', 'lib'])
})

Deno.test('Project Config - ProjectStructureSchema - defaults applied', () => {
  const minimalStructure = {
    rootPath: '/home/user/project',
  }

  const result = ProjectStructureSchema.parse(minimalStructure)
  assertEquals(result.rootPath, '/home/user/project')
  assertEquals(result.gitRepository, true) // default
  assertEquals(result.packageManagers, ['npm']) // default
  assertEquals(result.buildTools, []) // default
  assertEquals(result.directories.source, ['src', 'lib']) // default
})

Deno.test('Project Config - UREConfigSchema - valid URE config', () => {
  const validConfig = {
    version: '1.0.0',
    autoGeneration: {
      enabled: true,
      watchFiles: true,
      generateOnInit: true,
    },
    ideIntegration: {
      cursor: {
        enabled: true,
        outputPath: '.cursor/rules',
        gitIgnored: true,
        autoUpdate: true,
      },
      claude: {
        enabled: true,
        outputPath: 'CLAUDE.md',
        gitIgnored: false,
        autoUpdate: true,
      },
    },
    dependencies: {
      autoDiscover: true,
      fetchDocumentation: true,
      extractionLevel: 'fine_grained' as const,
    },
  }

  const result = UREConfigSchema.parse(validConfig)
  assertEquals(result.version, '1.0.0')
  assertEquals(result.autoGeneration.enabled, true)
  assertEquals(result.ideIntegration.cursor?.enabled, true)
  assertEquals(result.ideIntegration.claude?.gitIgnored, false)
  assertEquals(result.dependencies.extractionLevel, 'fine_grained')
})

Deno.test('Project Config - UREConfigSchema - defaults applied', () => {
  const minimalConfig = {}

  const result = UREConfigSchema.parse(minimalConfig)
  assertEquals(result.version, '1.0.0') // default
  assertEquals(result.autoGeneration.enabled, true) // default
  assertEquals(result.autoGeneration.watchFiles, true) // default
  assertEquals(result.dependencies.autoDiscover, true) // default
  assertEquals(result.dependencies.extractionLevel, 'basic') // default
  assertEquals(Object.keys(result.ideIntegration).length, 0) // default empty
})

Deno.test('Project Config - ProjectConfigSchema - valid complete config', () => {
  const validConfig = {
    project: {
      name: 'my-awesome-project',
      description: 'A test project',
      type: 'web-app' as const,
      languages: ['typescript', 'javascript'] as const,
      frameworks: ['react', 'hono'] as const,
      structure: {
        rootPath: '/home/user/project',
        gitRepository: true,
        packageManagers: ['npm'],
        buildTools: [],
        testFrameworks: [],
        linters: [],
        formatters: [],
        directories: {
          source: ['src'],
          tests: ['test'],
          docs: ['docs'],
          config: ['.config'],
          assets: ['public'],
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
      ideIntegration: {},
      dependencies: {
        autoDiscover: true,
        fetchDocumentation: true,
        extractionLevel: 'basic' as const,
      },
    },
    metadata: {
      created: '2024-01-15T10:00:00Z',
      lastModified: '2024-01-15T10:30:00Z',
      version: '1.0.0',
      vibeVersion: '0.2.1',
      configPath: '/home/user/project/.vibe',
    },
  }

  const result = ProjectConfigSchema.parse(validConfig)
  assertEquals(result.project.name, 'my-awesome-project')
  assertEquals(result.project.languages, ['typescript', 'javascript'])
  assertEquals(result.ure.version, '1.0.0')
  assertEquals(result.metadata.vibeVersion, '0.2.1')
})

Deno.test('Project Config - ProjectConfigSchema - missing required fields', () => {
  const invalidConfig = {
    project: {
      name: 'test-project',
      type: 'web-app',
      // missing languages and structure
    },
    ure: {},
    metadata: {
      created: '2024-01-15T10:00:00Z',
      lastModified: '2024-01-15T10:30:00Z',
      version: '1.0.0',
      vibeVersion: '0.2.1',
      configPath: '/home/user/project/.vibe',
    },
  }

  assertThrows(
    () => ProjectConfigSchema.parse(invalidConfig),
    Error,
    'Required',
  )
})

Deno.test('Project Config - createDefaultProjectConfig - basic project', () => {
  const projectPath = '/home/user/my-project'
  const vibeVersion = '0.2.1'

  const result = createDefaultProjectConfig(projectPath, vibeVersion)

  assertEquals(result.project.name, 'my-project') // derived from path
  assertEquals(result.project.type, 'web-app')
  assertEquals(result.project.languages, ['typescript'])
  assertEquals(result.project.structure.rootPath, projectPath)
  assertEquals(result.ure.version, '1.0.0')
  assertEquals(result.ure.ideIntegration.cursor?.enabled, false)
  assertEquals(result.ure.ideIntegration.claude?.enabled, true)
  assertEquals(result.ure.ideIntegration.claude?.gitIgnored, false) // CLAUDE.md is committed
  assertEquals(result.metadata.vibeVersion, vibeVersion)
  assertEquals(result.metadata.configPath, `${projectPath}/.vibe`)

  // Should have generated timestamps
  assertEquals(typeof result.metadata.created, 'string')
  assertEquals(typeof result.metadata.lastModified, 'string')
  assertEquals(result.metadata.created.includes('T'), true)
})

Deno.test('Project Config - createDefaultProjectConfig - with overrides', () => {
  const projectPath = '/home/user/api-project'
  const vibeVersion = '0.2.1'
  const overrides = {
    project: {
      name: 'Custom API Project',
      type: 'api' as const,
      languages: ['typescript', 'python'] as ProjectLanguage[],
      frameworks: ['hono', 'fastapi'] as ProjectFramework[],
      structure: {
        rootPath: projectPath,
        gitRepository: true,
        packageManagers: ['deno', 'pip'] as PackageManager[],
        buildTools: [],
        testFrameworks: [],
        linters: [],
        formatters: [],
        directories: {
          source: ['src', 'api'],
          tests: ['tests'],
          docs: ['docs'],
          config: ['config'],
          assets: ['static'],
        },
      },
    },
  }

  const result = createDefaultProjectConfig(projectPath, vibeVersion, overrides)

  assertEquals(result.project.name, 'Custom API Project')
  assertEquals(result.project.type, 'api')
  assertEquals(result.project.languages, ['typescript', 'python'])
  assertEquals(result.project.frameworks, ['hono', 'fastapi'])
  assertEquals(result.project.structure.packageManagers, ['deno', 'pip'])
  assertEquals(result.project.structure.directories.source, ['src', 'api'])

  // URE config should still have defaults
  assertEquals(result.ure.version, '1.0.0')
  assertEquals(result.ure.dependencies.extractionLevel, 'basic')
})

Deno.test('Project Config - createDefaultProjectConfig - empty project path', () => {
  const projectPath = ''
  const vibeVersion = '0.2.1'

  const result = createDefaultProjectConfig(projectPath, vibeVersion)

  assertEquals(result.project.name, 'unnamed-project') // fallback
  assertEquals(result.project.structure.rootPath, '')
  assertEquals(result.metadata.configPath, '/.vibe')
})

Deno.test('Project Config - createDefaultProjectConfig - complex project path', () => {
  const projectPath = '/home/user/projects/complex-project-name'
  const vibeVersion = '0.2.1'

  const result = createDefaultProjectConfig(projectPath, vibeVersion)

  assertEquals(result.project.name, 'complex-project-name') // last path segment
  assertEquals(result.project.structure.rootPath, projectPath)
  assertEquals(result.metadata.configPath, `${projectPath}/.vibe`)
})

Deno.test('Project Config - UREConfigSchema - invalid extraction level', () => {
  const invalidConfig = {
    dependencies: {
      extractionLevel: 'invalid-level',
    },
  }

  assertThrows(
    () => UREConfigSchema.parse(invalidConfig),
    Error,
    'Invalid enum value',
  )
})

Deno.test('Project Config - ProjectConfigSchema - invalid datetime format', () => {
  const invalidConfig = {
    project: {
      name: 'test-project',
      type: 'web-app' as const,
      languages: ['typescript'] as const,
      structure: {
        rootPath: '/test',
        directories: {
          source: ['src'],
          tests: ['test'],
          docs: ['docs'],
          config: ['config'],
          assets: ['assets'],
        },
      },
    },
    ure: {},
    metadata: {
      created: 'invalid-date',
      lastModified: '2024-01-15T10:30:00Z',
      version: '1.0.0',
      vibeVersion: '0.2.1',
      configPath: '/test/.vibe',
    },
  }

  assertThrows(
    () => ProjectConfigSchema.parse(invalidConfig),
    Error,
    'Invalid datetime',
  )
})
