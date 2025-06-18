/**
 * Dependency Discovery User Tests
 *
 * Validates complete dependency detection workflows across different project types.
 * Tests the "Dependency Discovery" roadmap item: Automatic detection from package.json/deno.json
 *
 * @tests commands/init.ts (Dependency detection during project initialization)
 * @tests ure/schemas/dependency-index.ts (Dependency metadata validation with real data)
 * @tests ure/lib/fs.ts (File system operations for manifest parsing)
 */

import { assert, assertEquals, assertExists } from '@std/assert'
import { afterEach, beforeEach, describe, it } from '@std/testing/bdd'
import { resolve } from '@std/path'
import {
  cleanupProjectDir,
  createProjectDir,
  runVibeCommand,
  validateDependencyDetection,
  validateVibeStructure,
} from './user-test-utils.ts'

describe('Dependency Discovery User Tests', () => {
  let projectPath: string
  let originalCwd: string

  beforeEach(async () => {
    originalCwd = Deno.cwd()
    projectPath = await createProjectDir()
    await Deno.mkdir(projectPath, { recursive: true })
  })

  afterEach(async () => {
    Deno.chdir(originalCwd)
    await cleanupProjectDir(projectPath)
  })

  describe('Package.json Dependency Detection', () => {
    it('should detect regular dependencies correctly', async () => {
      await Deno.writeTextFile(
        resolve(projectPath, 'package.json'),
        JSON.stringify(
          {
            name: 'regular-deps-test',
            version: '1.0.0',
            dependencies: {
              'express': '^4.18.0',
              'lodash': '^4.17.21',
              'axios': '^1.4.0',
            },
          },
          null,
          2,
        ),
      )

      const result = await runVibeCommand(projectPath, ['init'])
      assert(result.success, 'vibe init should succeed')
      assert(result.stdout.includes('3 dependencies'), 'Should report correct dependency count')

      // Validate dependency detection
      const toolsPath = resolve(projectPath, '.vibe', 'tools', 'detected.json')
      const tools = await validateDependencyDetection(toolsPath, 3)

      // All should be categorized as regular dependencies
      const regularDeps = tools.dependencies.filter((d: any) => d.type === 'dependency')
      assertEquals(regularDeps.length, 3, 'All should be regular dependencies')

      // Verify specific dependencies
      const depNames = tools.dependencies.map((d: any) => d.name)
      assert(depNames.includes('express'), 'Should detect express')
      assert(depNames.includes('lodash'), 'Should detect lodash')
      assert(depNames.includes('axios'), 'Should detect axios')

      // Verify versions are correctly extracted
      const expressDep = tools.dependencies.find((d: any) => d.name === 'express')
      assertEquals(expressDep?.version, '^4.18.0', 'Should preserve version range')
    })

    it('should detect dev dependencies correctly', async () => {
      await Deno.writeTextFile(
        resolve(projectPath, 'package.json'),
        JSON.stringify(
          {
            name: 'dev-deps-test',
            version: '1.0.0',
            devDependencies: {
              'typescript': '^5.0.0',
              '@types/node': '^20.0.0',
              'jest': '^29.0.0',
              'eslint': '^8.0.0',
            },
          },
          null,
          2,
        ),
      )

      const result = await runVibeCommand(projectPath, ['init'])
      assert(result.success, 'vibe init should succeed')

      // Validate dependency detection
      const toolsPath = resolve(projectPath, '.vibe', 'tools', 'detected.json')
      const tools = await validateDependencyDetection(toolsPath, 4)

      // All should be categorized as dev dependencies
      const devDeps = tools.dependencies.filter((d: any) => d.type === 'devDependency')
      assertEquals(devDeps.length, 4, 'All should be dev dependencies')

      // Verify specific dev dependencies
      const depNames = tools.dependencies.map((d: any) => d.name)
      assert(depNames.includes('typescript'), 'Should detect typescript')
      assert(depNames.includes('@types/node'), 'Should detect scoped package')
      assert(depNames.includes('jest'), 'Should detect jest')
      assert(depNames.includes('eslint'), 'Should detect eslint')
    })

    it('should detect peer dependencies correctly', async () => {
      await Deno.writeTextFile(
        resolve(projectPath, 'package.json'),
        JSON.stringify(
          {
            name: 'peer-deps-test',
            version: '1.0.0',
            peerDependencies: {
              'react': '^18.0.0',
              'react-dom': '^18.0.0',
            },
          },
          null,
          2,
        ),
      )

      const result = await runVibeCommand(projectPath, ['init'])
      assert(result.success, 'vibe init should succeed')

      // Validate dependency detection
      const toolsPath = resolve(projectPath, '.vibe', 'tools', 'detected.json')
      const tools = await validateDependencyDetection(toolsPath, 2)

      // All should be categorized as peer dependencies
      const peerDeps = tools.dependencies.filter((d: any) => d.type === 'peerDependency')
      assertEquals(peerDeps.length, 2, 'All should be peer dependencies')

      // Verify specific peer dependencies
      const depNames = tools.dependencies.map((d: any) => d.name)
      assert(depNames.includes('react'), 'Should detect react')
      assert(depNames.includes('react-dom'), 'Should detect react-dom')
    })

    it('should handle mixed dependency types correctly', async () => {
      await Deno.writeTextFile(
        resolve(projectPath, 'package.json'),
        JSON.stringify(
          {
            name: 'mixed-deps-test',
            version: '1.0.0',
            dependencies: {
              'express': '^4.18.0',
              'mongoose': '^7.0.0',
            },
            devDependencies: {
              'typescript': '^5.0.0',
              '@types/express': '^4.17.0',
            },
            peerDependencies: {
              'mongoose': '^7.0.0', // Same package in multiple categories
            },
          },
          null,
          2,
        ),
      )

      const result = await runVibeCommand(projectPath, ['init'])
      assert(result.success, 'vibe init should succeed')

      // Validate dependency detection
      const toolsPath = resolve(projectPath, '.vibe', 'tools', 'detected.json')
      const tools = await validateDependencyDetection(toolsPath)

      // Should detect all dependencies (with possible duplicates handled correctly)
      assert(tools.dependencies.length >= 4, 'Should detect at least 4 unique dependencies')

      // Verify categorization
      const depsByType = {
        dependency: tools.dependencies.filter((d: any) => d.type === 'dependency').map((d: any) => d.name),
        devDependency: tools.dependencies.filter((d: any) => d.type === 'devDependency').map((d: any) => d.name),
        peerDependency: tools.dependencies.filter((d: any) => d.type === 'peerDependency').map((d: any) => d.name),
      }

      assert(depsByType.dependency.includes('express'), 'Should detect express as regular dependency')
      assert(depsByType.devDependency.includes('typescript'), 'Should detect typescript as dev dependency')

      // Handle potential duplicate mongoose entries correctly
      assert(
        depsByType.dependency.includes('mongoose') || depsByType.peerDependency.includes('mongoose'),
        'Should detect mongoose in at least one category',
      )
    })

    it('should handle scoped packages correctly', async () => {
      await Deno.writeTextFile(
        resolve(projectPath, 'package.json'),
        JSON.stringify(
          {
            name: 'scoped-deps-test',
            version: '1.0.0',
            dependencies: {
              '@nestjs/core': '^10.0.0',
              '@prisma/client': '^5.0.0',
            },
            devDependencies: {
              '@types/node': '^20.0.0',
              '@typescript-eslint/parser': '^6.0.0',
            },
          },
          null,
          2,
        ),
      )

      const result = await runVibeCommand(projectPath, ['init'])
      assert(result.success, 'vibe init should succeed')

      // Validate dependency detection
      const toolsPath = resolve(projectPath, '.vibe', 'tools', 'detected.json')
      const tools = await validateDependencyDetection(toolsPath, 4)

      // Verify scoped packages are detected correctly
      const depNames = tools.dependencies.map((d: any) => d.name)
      assert(depNames.includes('@nestjs/core'), 'Should detect @nestjs/core')
      assert(depNames.includes('@prisma/client'), 'Should detect @prisma/client')
      assert(depNames.includes('@types/node'), 'Should detect @types/node')
      assert(depNames.includes('@typescript-eslint/parser'), 'Should detect @typescript-eslint/parser')

      // Verify scoped packages have correct names (not mangled)
      const scopedDeps = tools.dependencies.filter((d: any) => d.name.startsWith('@'))
      assertEquals(scopedDeps.length, 4, 'All dependencies should be scoped')
    })
  })

  describe('Complex Dependency Scenarios', () => {
    it('should handle empty package.json correctly', async () => {
      await Deno.writeTextFile(
        resolve(projectPath, 'package.json'),
        JSON.stringify(
          {
            name: 'empty-deps-test',
            version: '1.0.0',
          },
          null,
          2,
        ),
      )

      const result = await runVibeCommand(projectPath, ['init'])
      assert(result.success, 'vibe init should succeed')
      assert(result.stdout.includes('No dependencies detected'), 'Should report no dependencies')

      // Validate empty dependency detection
      const toolsPath = resolve(projectPath, '.vibe', 'tools', 'detected.json')
      const tools = await validateDependencyDetection(toolsPath, 0)
      assertEquals(tools.dependencies.length, 0, 'Should have empty dependencies array')
    })

    it('should handle malformed package.json gracefully', async () => {
      await Deno.writeTextFile(
        resolve(projectPath, 'package.json'),
        '{ "name": "malformed-test", invalid json',
      )

      const result = await runVibeCommand(projectPath, ['init'])

      // Should either fail gracefully or succeed with no dependencies
      if (!result.success) {
        assert(
          result.stderr.includes('package.json') || result.stderr.includes('JSON'),
          'Should mention package.json parsing issue',
        )
      } else {
        assert(result.stdout.includes('No dependencies detected'), 'Should fallback to no dependencies')
      }
    })

    it('should handle large dependency lists efficiently', async () => {
      // Create a large dependency list to test performance
      const largeDependencies: Record<string, string> = {}
      for (let i = 0; i < 100; i++) {
        largeDependencies[`package-${i}`] = `^${i}.0.0`
      }

      await Deno.writeTextFile(
        resolve(projectPath, 'package.json'),
        JSON.stringify(
          {
            name: 'large-deps-test',
            version: '1.0.0',
            dependencies: largeDependencies,
          },
          null,
          2,
        ),
      )

      const startTime = Date.now()
      const result = await runVibeCommand(projectPath, ['init'])
      const duration = Date.now() - startTime

      assert(result.success, 'vibe init should succeed with large dependency list')
      assert(duration < 10000, 'Should complete within 10 seconds')

      // Validate all dependencies were detected
      const toolsPath = resolve(projectPath, '.vibe', 'tools', 'detected.json')
      const tools = await validateDependencyDetection(toolsPath, 100)
      assertEquals(tools.dependencies.length, 100, 'Should detect all 100 dependencies')
    })
  })

  describe('Deno.json Import Detection (Future Enhancement)', () => {
    it('should create valid structure for future deno.json detection', async () => {
      // Current P0 implementation note: Deno.json import detection is planned for future enhancement
      await Deno.writeTextFile(
        resolve(projectPath, 'deno.json'),
        JSON.stringify(
          {
            name: 'deno-imports-test',
            version: '1.0.0',
            imports: {
              'hono': 'jsr:@hono/hono@^4.0.0',
              'zod': 'npm:zod@^3.0.0',
              '@std/assert': 'jsr:@std/assert@^1.0.0',
            },
          },
          null,
          2,
        ),
      )

      const result = await runVibeCommand(projectPath, ['init'])
      assert(result.success, 'vibe init should succeed')

      // Verify structure is ready for when Deno import detection is implemented
      const vibeDir = resolve(projectPath, '.vibe')
      await validateVibeStructure(vibeDir)

      const toolsPath = resolve(projectPath, '.vibe', 'tools', 'detected.json')
      const tools = await validateDependencyDetection(toolsPath, 0)

      // Currently should have no dependencies, but structure should be valid for future enhancement
      assertEquals(tools.dependencies.length, 0, 'Current implementation does not detect deno.json imports yet')
      assert(Array.isArray(tools.dependencies), 'Dependencies array should be ready for future imports')
      assertExists(tools.lastUpdated, 'Should have timestamp for future updates')
    })
  })

  describe('Dependency Metadata Quality', () => {
    it('should preserve exact version specifications', async () => {
      await Deno.writeTextFile(
        resolve(projectPath, 'package.json'),
        JSON.stringify(
          {
            name: 'version-test',
            version: '1.0.0',
            dependencies: {
              'exact-version': '1.2.3',
              'caret-range': '^4.5.6',
              'tilde-range': '~7.8.9',
              'range-spec': '>=10.0.0 <11.0.0',
              'pre-release': '2.0.0-beta.1',
            },
          },
          null,
          2,
        ),
      )

      const result = await runVibeCommand(projectPath, ['init'])
      assert(result.success, 'vibe init should succeed')

      const toolsPath = resolve(projectPath, '.vibe', 'tools', 'detected.json')
      const tools = await validateDependencyDetection(toolsPath, 5)

      // Verify version specifications are preserved exactly
      const depVersions = Object.fromEntries(
        tools.dependencies.map((d: any) => [d.name, d.version]),
      )

      assertEquals(depVersions['exact-version'], '1.2.3', 'Should preserve exact version')
      assertEquals(depVersions['caret-range'], '^4.5.6', 'Should preserve caret range')
      assertEquals(depVersions['tilde-range'], '~7.8.9', 'Should preserve tilde range')
      assertEquals(depVersions['range-spec'], '>=10.0.0 <11.0.0', 'Should preserve range specification')
      assertEquals(depVersions['pre-release'], '2.0.0-beta.1', 'Should preserve pre-release version')
    })

    it('should provide consistent timestamps', async () => {
      await Deno.writeTextFile(
        resolve(projectPath, 'package.json'),
        JSON.stringify(
          {
            name: 'timestamp-test',
            version: '1.0.0',
            dependencies: { 'test-dep': '^1.0.0' },
          },
          null,
          2,
        ),
      )

      const beforeInit = Date.now()
      const result = await runVibeCommand(projectPath, ['init'])
      const afterInit = Date.now()

      assert(result.success, 'vibe init should succeed')

      const toolsPath = resolve(projectPath, '.vibe', 'tools', 'detected.json')
      const tools = await validateDependencyDetection(toolsPath, 1)

      // Verify timestamp is realistic and within expected range
      const lastUpdated = new Date(tools.lastUpdated).getTime()
      assert(lastUpdated >= beforeInit && lastUpdated <= afterInit, 'Timestamp should be within init timeframe')

      // Verify timestamp format is ISO string
      assert(tools.lastUpdated.includes('T'), 'Should use ISO timestamp format')
      assert(tools.lastUpdated.includes('Z') || tools.lastUpdated.includes('+'), 'Should include timezone info')
    })
  })
})
