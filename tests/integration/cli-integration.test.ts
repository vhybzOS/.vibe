/**
 * Integration Tests for CLI Components
 * 
 * Tests interaction between CLI components, command runner, and file system
 */

import { assert, assertEquals } from '@std/assert'
import { afterEach, beforeEach, describe, it } from '@std/testing/bdd'
import { resolve } from '@std/path'
import { Effect } from 'effect'

// Test utilities
async function createTempDir(): Promise<string> {
  return await Deno.makeTempDir({ prefix: 'vibe_integration_test_' })
}

async function cleanupDir(path: string): Promise<void> {
  try {
    await Deno.remove(path, { recursive: true })
  } catch {
    // Ignore cleanup errors
  }
}

describe('CLI Integration Tests', () => {
  let testDir: string

  beforeEach(async () => {
    testDir = await createTempDir()
    Deno.chdir(testDir)
  })

  afterEach(async () => {
    await cleanupDir(testDir)
  })

  describe('CLI Command Runner', () => {
    it('should be callable from CLI runner', async () => {
      // This tests the CLI integration without running the actual CLI
      const { runCommand } = await import('../../lib/cli.ts')
      
      // Mock command execution
      const mockCommand = Effect.succeed('integration test completed')
      
      // Should not throw
      const result = await Effect.runPromise(runCommand(mockCommand))
      assertEquals(result, 'integration test completed')
    })
  })

  describe('File System Integration', () => {
    it('should handle complex project structures', async () => {
      // Create a complex project structure
      await Deno.mkdir(resolve(testDir, 'src'), { recursive: true })
      await Deno.mkdir(resolve(testDir, 'tests'), { recursive: true })
      await Deno.mkdir(resolve(testDir, 'docs'), { recursive: true })
      
      // Create package.json with dev dependencies
      const packageJson = {
        name: 'complex-project',
        version: '2.1.0',
        dependencies: {
          'hono': '^4.0.0',
          'effect': '^3.0.0'
        },
        devDependencies: {
          '@types/node': '^20.0.0',
          'typescript': '^5.0.0'
        },
        peerDependencies: {
          'zod': '^3.0.0'
        }
      }
      await Deno.writeTextFile(
        resolve(testDir, 'package.json'), 
        JSON.stringify(packageJson, null, 2)
      )
      
      // Create some source files
      await Deno.writeTextFile(resolve(testDir, 'src', 'index.ts'), 'export * from "./lib"')
      await Deno.writeTextFile(resolve(testDir, 'README.md'), '# Complex Project')
      
      const { initCommand } = await import('../../commands/init.ts')
      await Effect.runPromise(initCommand({ force: false, quiet: false }))
      
      // Verify all dependency types were detected
      const toolsPath = resolve(testDir, '.vibe', 'tools', 'detected.json')
      const toolsContent = await Deno.readTextFile(toolsPath)
      const tools = JSON.parse(toolsContent)
      
      assert(tools.dependencies.length >= 5, 'should detect all dependency types')
      
      // Check that different dependency types are present
      const depTypes = new Set(tools.dependencies.map((d: any) => d.type))
      assert(depTypes.has('dependency'), 'should detect regular dependencies')
      assert(depTypes.has('devDependency'), 'should detect dev dependencies')
      assert(depTypes.has('peerDependency'), 'should detect peer dependencies')
    })
  })

  describe('Schema Validation Integration', () => {
    it('should validate all created files against schemas', async () => {
      const { initCommand } = await import('../../commands/init.ts')
      const { ProjectConfigSchema } = await import('../../schemas/config.ts')
      
      await Effect.runPromise(initCommand({ force: false, quiet: false }))
      
      // Validate config.json against schema
      const configPath = resolve(testDir, '.vibe', 'config.json')
      const configContent = await Deno.readTextFile(configPath)
      const config = JSON.parse(configContent)
      
      // Should not throw validation error
      const validatedConfig = ProjectConfigSchema.parse(config)
      
      assertEquals(validatedConfig.projectName, config.projectName)
      assertEquals(validatedConfig.version, '1.0.0')
      assertEquals(validatedConfig.vibeVersion, '1.0.0')
      assert(validatedConfig.settings.autoDiscovery === true)
      assert(validatedConfig.settings.mcpEnabled === true)
    })
  })
})