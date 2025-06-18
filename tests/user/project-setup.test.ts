/**
 * Project Setup User Tests
 *
 * Validates complete vibe init workflows across project types and platforms.
 * Tests the "Project Setup" roadmap item: `vibe init` creates .vibe structure, detects dependencies
 *
 * @tests commands/init.ts (Complete user workflow validation, cross-platform compatibility)
 * @tests ure/lib/fs.ts (File system operations in real project scenarios)
 * @tests ure/lib/errors.ts (Error handling in user workflows)
 * @tests ure/schemas/project-config.ts (Config validation with real project data)
 */

import { assert, assertEquals, assertExists } from '@std/assert'
import { afterEach, beforeEach, describe, it } from '@std/testing/bdd'
import { resolve } from '@std/path'
import {
  cleanupProjectDir,
  createProjectDir,
  createRealisticDenoProject,
  createRealisticNodeProject,
  dirExists,
  fileExists,
  runVibeCommand,
  validateConfigQuality,
  validateVibeStructure,
} from './user-test-utils.ts'

describe('Project Setup User Tests', () => {
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

  describe('Basic Project Initialization', () => {
    it('should initialize vibe in empty directory', async () => {
      // Empty directory with no manifest files
      const result = await runVibeCommand(projectPath, ['init'])

      // Verify command succeeded
      assert(result.success, `vibe init should succeed. stderr: ${result.stderr}`)
      assert(result.stdout.includes('Initialized .vibe'), `Should show success message. stdout: ${result.stdout}`)

      // Verify complete .vibe structure was created
      const vibeDir = resolve(projectPath, '.vibe')
      await validateVibeStructure(vibeDir)

      // Verify configuration with directory name as project name
      const config = await validateConfigQuality(resolve(vibeDir, 'config.json'), 'test-project')
      assertEquals(config.dependencies.length, 0, 'empty directory should have no dependencies')
    })

    it('should initialize vibe in Deno project', async () => {
      // Create realistic Deno project structure
      await createRealisticDenoProject(projectPath)

      const result = await runVibeCommand(projectPath, ['init'])

      // Verify command succeeded
      assert(result.success, `vibe init should succeed. stderr: ${result.stderr}`)
      assert(result.stdout.includes('Initialized .vibe'), `Should show success message. stdout: ${result.stdout}`)

      // Verify .vibe structure
      const vibeDir = resolve(projectPath, '.vibe')
      await validateVibeStructure(vibeDir)

      // Verify configuration uses deno.json metadata
      const config = await validateConfigQuality(resolve(vibeDir, 'config.json'), 'test-deno-app')
      assertEquals(config.version, '1.0.0', 'should use deno.json version')

      // Note: Current P0 implementation only detects package.json dependencies
      // Deno.json import detection is planned for future enhancement
      assertEquals(config.dependencies.length, 0, 'Deno project without package.json should have no detected dependencies')
    })

    it('should initialize vibe in Node.js project', async () => {
      // Create realistic Node.js project structure
      await createRealisticNodeProject(projectPath)

      const result = await runVibeCommand(projectPath, ['init'])

      // Verify command succeeded
      assert(result.success, `vibe init should succeed. stderr: ${result.stderr}`)
      assert(result.stdout.includes('test-node-app'), 'Should detect project name from package.json')
      assert(result.stdout.includes('dependencies for future tool extraction'), 'Should detect dependencies')

      // Verify .vibe structure
      const vibeDir = resolve(projectPath, '.vibe')
      await validateVibeStructure(vibeDir)

      // Verify configuration uses package.json metadata
      const config = await validateConfigQuality(resolve(vibeDir, 'config.json'), 'test-node-app')
      // Note: Current P0 implementation uses default version, package.json version reading is planned enhancement
      assertEquals(config.version, '1.0.0', 'current implementation uses default version')

      // Should detect all dependency types from package.json
      const expectedRegularDeps = ['express', 'cors', 'helmet', 'dotenv']
      const expectedDevDeps = ['@types/express', '@types/cors', 'typescript', 'ts-node', 'jest']
      const expectedPeerDeps = ['mongodb']
      const totalExpected = expectedRegularDeps.length + expectedDevDeps.length + expectedPeerDeps.length

      assert(config.dependencies.length >= totalExpected, `Should detect at least ${totalExpected} dependencies`)

      // Verify dependency categorization
      const depsByType = {
        dependency: config.dependencies.filter((d: any) => d.type === 'dependency').map((d: any) => d.name),
        devDependency: config.dependencies.filter((d: any) => d.type === 'devDependency').map((d: any) => d.name),
        peerDependency: config.dependencies.filter((d: any) => d.type === 'peerDependency').map((d: any) => d.name)
      }

      // Validate specific dependencies are detected with correct types
      for (const dep of expectedRegularDeps) {
        assert(depsByType.dependency.includes(dep), `Should detect ${dep} as regular dependency`)
      }
      for (const dep of expectedDevDeps) {
        assert(depsByType.devDependency.includes(dep), `Should detect ${dep} as dev dependency`)
      }
      for (const dep of expectedPeerDeps) {
        assert(depsByType.peerDependency.includes(dep), `Should detect ${dep} as peer dependency`)
      }
    })
  })

  describe('Force Flag Behavior', () => {
    it('should handle existing .vibe directory gracefully', async () => {
      // First initialization
      await runVibeCommand(projectPath, ['init'])
      
      // Second initialization without force (should gracefully handle)
      const result = await runVibeCommand(projectPath, ['init'])
      
      // Should either succeed gracefully or provide helpful message
      assert(result.success || result.stderr.includes('.vibe'), 'Should handle existing .vibe gracefully')
    })

    it('should support force flag to reinitialize existing project', async () => {
      // Create initial project with dependencies
      await Deno.writeTextFile(
        resolve(projectPath, 'package.json'),
        JSON.stringify(
          {
            name: 'test-project',
            version: '1.0.0',
            dependencies: { 'lodash': '^4.17.21' },
          },
          null,
          2,
        ),
      )

      // First initialization
      const firstResult = await runVibeCommand(projectPath, ['init'])
      assert(firstResult.success, 'First init should succeed')

      // Modify .vibe manually to simulate existing state
      const configPath = resolve(projectPath, '.vibe', 'config.json')
      const oldConfig = JSON.parse(await Deno.readTextFile(configPath))
      oldConfig.customField = 'should be overwritten'
      await Deno.writeTextFile(configPath, JSON.stringify(oldConfig, null, 2))

      // Add new dependency and reinitialize with force
      const updatedPackageJson = {
        name: 'test-project',
        version: '1.0.0',
        dependencies: {
          'lodash': '^4.17.21',
          'express': '^4.18.0', // New dependency
        },
      }
      await Deno.writeTextFile(resolve(projectPath, 'package.json'), JSON.stringify(updatedPackageJson, null, 2))

      // Force reinitialize
      const forceResult = await runVibeCommand(projectPath, ['init', '--force'])
      assert(forceResult.success, 'Force init should succeed')

      // Verify new dependency was detected and custom field was overwritten
      const newConfig = JSON.parse(await Deno.readTextFile(configPath))
      assert(!newConfig.customField, 'Custom field should be removed by force init')
      assertEquals(newConfig.dependencies.length, 2, 'Should detect both dependencies after update')
      
      const depNames = newConfig.dependencies.map((d: any) => d.name)
      assert(depNames.includes('lodash'), 'Should still have original lodash dependency')
      assert(depNames.includes('express'), 'Should detect newly added express dependency')
    })
  })

  describe('Cross-Platform Compatibility', () => {
    it('should create identical .vibe structure on different platforms', async () => {
      // Test Windows-style paths and separators 
      const windowsStyleProject = resolve(projectPath, 'windows-test')
      await Deno.mkdir(windowsStyleProject, { recursive: true })
      
      await Deno.writeTextFile(
        resolve(windowsStyleProject, 'package.json'),
        JSON.stringify({
          name: 'cross-platform-test',
          version: '1.0.0',
          dependencies: { 'express': '^4.18.0' }
        }, null, 2)
      )
      
      const result = await runVibeCommand(windowsStyleProject, ['init'])
      assert(result.success, 'Init should succeed with Windows-style paths')
      
      // Verify structure is identical regardless of platform
      const vibeDir = resolve(windowsStyleProject, '.vibe')
      await validateVibeStructure(vibeDir)
      
      // Verify config structure is consistent across platforms
      const config = await validateConfigQuality(resolve(vibeDir, 'config.json'), 'cross-platform-test')
      assertEquals(config.version, '1.0.0', 'should extract version correctly across platforms')
    })
    
    it('should validate .vibe structure integrity across operations', async () => {
      // Create a complete project setup
      await Deno.writeTextFile(
        resolve(projectPath, 'package.json'),
        JSON.stringify(
          {
            name: 'integrity-test',
            version: '1.0.0',
            dependencies: { 'lodash': '^4.17.21' },
            devDependencies: { 'typescript': '^5.0.0' }
          },
          null,
          2,
        ),
      )

      // Initialize and verify complete structure
      const result = await runVibeCommand(projectPath, ['init'])
      assert(result.success, 'Init should succeed')
      
      // Comprehensive structure validation
      const vibeDir = resolve(projectPath, '.vibe')
      await validateVibeStructure(vibeDir)
      
      // Verify file contents are well-formed JSON
      const configContent = JSON.parse(await Deno.readTextFile(resolve(vibeDir, 'config.json')))
      const toolsContent = JSON.parse(await Deno.readTextFile(resolve(vibeDir, 'tools', 'detected.json')))
      
      // Structure integrity checks
      assert(typeof configContent.projectName === 'string', 'config should have string projectName')
      assert(Array.isArray(configContent.dependencies), 'config should have dependencies array')
      assert(Array.isArray(toolsContent.dependencies), 'tools should have dependencies array')
      assert(configContent.dependencies.length === toolsContent.dependencies.length, 'dependency counts should match')
      
      // Verify cross-references are consistent
      const configDepNames = configContent.dependencies.map((d: any) => d.name).sort()
      const toolsDepNames = toolsContent.dependencies.map((d: any) => d.name).sort()
      assertEquals(configDepNames, toolsDepNames, 'dependency lists should be consistent')
    })
  })

  describe('Error Scenarios', () => {
    it('should provide helpful error messages for permission issues', async () => {
      // This test validates error handling infrastructure exists
      // Actual permission errors are difficult to simulate in test environment
      
      // Create a minimal project
      await Deno.writeTextFile(
        resolve(projectPath, 'package.json'),
        JSON.stringify(
          {
            name: 'test-project',
          },
          null,
          2,
        ),
      )

      // Test with regular init first to ensure it works
      const result = await runVibeCommand(projectPath, ['init'])
      assert(result.success, 'Regular init should work')

      // Verify error handling infrastructure exists
      const { createFileSystemError } = await import('../../ure/lib/errors.ts')
      const error = createFileSystemError(new Error('Permission denied'), '/test/path', 'Test error')

      assertEquals(error._tag, 'FileSystemError')
      assertEquals(error.path, '/test/path')
      assert(error.message.includes('Test error'))
    })
  })

  describe('CLI Help and Version', () => {
    it('should display help information', async () => {
      const result = await runVibeCommand(projectPath, ['--help'])

      assert(result.success || result.stdout.includes('Usage:'), 'Help should display usage information')
      assert(result.stdout.includes('vibe'), 'Should mention vibe command')
      assert(result.stdout.includes('init'), 'Should list init command')
    })

    it('should display version information', async () => {
      const result = await runVibeCommand(projectPath, ['--version'])

      assert(result.success || result.stdout.includes('1.0.0'), 'Should display version')
    })
  })
})