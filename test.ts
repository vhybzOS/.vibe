/**
 * Test Suite for .vibe CLI
 * 
 * Following TDD principles - these tests define the expected behavior
 * of our `vibe init` command and supporting infrastructure.
 */

import { assert, assertEquals, assertExists } from '@std/assert'
import { afterEach, beforeEach, describe, it } from '@std/testing/bdd'
import { resolve } from '@std/path'
import { Effect } from 'effect'

// Test utilities
async function createTempDir(): Promise<string> {
  return await Deno.makeTempDir({ prefix: 'vibe_test_' })
}

async function cleanupDir(path: string): Promise<void> {
  try {
    await Deno.remove(path, { recursive: true })
  } catch {
    // Ignore cleanup errors
  }
}

async function fileExists(path: string): Promise<boolean> {
  try {
    const stat = await Deno.stat(path)
    return stat.isFile
  } catch {
    return false
  }
}

async function dirExists(path: string): Promise<boolean> {
  try {
    const stat = await Deno.stat(path)
    return stat.isDirectory
  } catch {
    return false
  }
}

describe('Vibe Init Command', () => {
  let testDir: string

  beforeEach(async () => {
    testDir = await createTempDir()
    // Change to test directory for each test
    Deno.chdir(testDir)
  })

  afterEach(async () => {
    await cleanupDir(testDir)
  })

  describe('Basic Functionality', () => {
    it('should create .vibe directory structure', async () => {
      // Import our init command (to be implemented)
      const { initCommand } = await import('./commands/init.ts')
      
      // Run the init command
      await Effect.runPromise(initCommand({ force: false, quiet: false }))
      
      // Verify .vibe directory was created
      const vibeDir = resolve(testDir, '.vibe')
      assert(await dirExists(vibeDir), '.vibe directory should be created')
      
      // Verify subdirectories
      assert(await dirExists(resolve(vibeDir, 'tools')), 'tools directory should be created')
      assert(await dirExists(resolve(vibeDir, 'rules')), 'rules directory should be created')
      assert(await dirExists(resolve(vibeDir, 'mcp')), 'mcp directory should be created')
    })

    it('should create config.json with project metadata', async () => {
      const { initCommand } = await import('./commands/init.ts')
      
      await Effect.runPromise(initCommand({ force: false, quiet: false }))
      
      const configPath = resolve(testDir, '.vibe', 'config.json')
      assert(await fileExists(configPath), 'config.json should be created')
      
      const configContent = await Deno.readTextFile(configPath)
      const config = JSON.parse(configContent)
      
      assertExists(config.projectName, 'config should have projectName')
      assertExists(config.version, 'config should have version')
      assertExists(config.tools, 'config should have tools array')
    })

    it('should detect package.json dependencies if present', async () => {
      // Create a mock package.json
      const packageJson = {
        name: 'test-project',
        version: '1.0.0',
        dependencies: {
          'express': '^4.18.0',
          'lodash': '^4.17.21'
        }
      }
      await Deno.writeTextFile(
        resolve(testDir, 'package.json'), 
        JSON.stringify(packageJson, null, 2)
      )
      
      const { initCommand } = await import('./commands/init.ts')
      await Effect.runPromise(initCommand({ force: false, quiet: false }))
      
      const toolsPath = resolve(testDir, '.vibe', 'tools', 'detected.json')
      assert(await fileExists(toolsPath), 'detected.json should be created')
      
      const toolsContent = await Deno.readTextFile(toolsPath)
      const tools = JSON.parse(toolsContent)
      
      assert(Array.isArray(tools.dependencies), 'tools should have dependencies array')
      assertEquals(tools.dependencies.length, 2, 'should detect 2 dependencies')
    })

    it('should work in directory without package.json', async () => {
      const { initCommand } = await import('./commands/init.ts')
      
      // Should not throw error
      await Effect.runPromise(initCommand({ force: false, quiet: false }))
      
      const configPath = resolve(testDir, '.vibe', 'config.json')
      assert(await fileExists(configPath), 'config.json should still be created')
      
      const configContent = await Deno.readTextFile(configPath)
      const config = JSON.parse(configContent)
      
      assertEquals(config.tools.length, 0, 'tools array should be empty')
    })
  })

  describe('Error Handling', () => {
    it('should handle existing .vibe directory gracefully', async () => {
      // Create .vibe directory first
      await Deno.mkdir(resolve(testDir, '.vibe'))
      
      const { initCommand } = await import('./commands/init.ts')
      
      // Should handle existing directory without error
      await Effect.runPromise(initCommand({ force: false, quiet: false }))
      
      // Should still work
      const configPath = resolve(testDir, '.vibe', 'config.json')
      assert(await fileExists(configPath), 'config.json should be created even with existing .vibe')
    })

    it('should support force flag to overwrite existing .vibe', async () => {
      // Create .vibe with existing config
      const vibeDir = resolve(testDir, '.vibe')
      await Deno.mkdir(vibeDir)
      await Deno.writeTextFile(resolve(vibeDir, 'config.json'), '{"old": "config"}')
      
      const { initCommand } = await import('./commands/init.ts')
      
      // Run with force flag
      await Effect.runPromise(initCommand({ force: true, quiet: false }))
      
      const configContent = await Deno.readTextFile(resolve(vibeDir, 'config.json'))
      const config = JSON.parse(configContent)
      
      assert(!config.old, 'old config should be overwritten')
      assertExists(config.projectName, 'new config should be present')
    })
  })

  describe('CLI Integration', () => {
    it('should be callable from CLI runner', async () => {
      // This tests the CLI integration without running the actual CLI
      const { runCommand } = await import('./lib/cli.ts')
      
      // Mock command execution
      const mockCommand = Effect.succeed('init completed')
      
      // Should not throw
      await Effect.runPromise(runCommand(mockCommand))
    })
  })
})