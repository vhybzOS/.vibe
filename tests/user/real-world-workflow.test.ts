/**
 * User Tests - Real-World Workflow Simulation
 * 
 * Tests that simulate complete user workflows from start to finish,
 * creating real project structures and testing the full vibe experience.
 */

import { assert, assertEquals, assertExists } from '@std/assert'
import { afterEach, beforeEach, describe, it } from '@std/testing/bdd'
import { resolve, dirname } from '@std/path'

// Test utilities for real project simulation
async function createProjectDir(): Promise<string> {
  const baseDir = await Deno.makeTempDir({ prefix: 'vibe_user_test_' })
  return resolve(baseDir, 'test-project')
}

async function cleanupProjectDir(path: string): Promise<void> {
  try {
    // Clean up the entire temp directory (parent of project)
    const parentDir = dirname(path)
    await Deno.remove(parentDir, { recursive: true })
  } catch {
    // Ignore cleanup errors
  }
}

async function runVibeCommand(projectPath: string, args: string[]): Promise<{ stdout: string; stderr: string; success: boolean }> {
  const vibeExecutable = resolve(Deno.cwd(), 'vibe')
  
  try {
    const command = new Deno.Command(vibeExecutable, {
      args,
      cwd: projectPath,
      stdout: 'piped',
      stderr: 'piped',
    })
    
    const { success, stdout, stderr } = await command.output()
    
    return {
      stdout: new TextDecoder().decode(stdout),
      stderr: new TextDecoder().decode(stderr),
      success
    }
  } catch (error) {
    return {
      stdout: '',
      stderr: `Failed to run vibe command: ${error instanceof Error ? error.message : String(error)}`,
      success: false
    }
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

describe('User Workflow Tests', () => {
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

  describe('Complete Deno Project Workflow', () => {
    it('should initialize vibe in a new Deno project', async () => {
      // Step 1: Create a realistic Deno project structure
      await Deno.writeTextFile(resolve(projectPath, 'deno.json'), JSON.stringify({
        name: 'my-deno-app',
        version: '1.0.0',
        exports: {
          '.': './mod.ts'
        },
        tasks: {
          start: 'deno run --allow-net mod.ts',
          test: 'deno test --allow-all',
          dev: 'deno run --allow-net --watch mod.ts'
        },
        imports: {
          'hono': 'jsr:@hono/hono@^4.0.0',
          'zod': 'npm:zod@^3.0.0',
          '@std/assert': 'jsr:@std/assert@^1.0.0'
        }
      }, null, 2))

      await Deno.writeTextFile(resolve(projectPath, 'mod.ts'), `
import { Hono } from 'hono'
import { z } from 'zod'

const app = new Hono()

const UserSchema = z.object({
  name: z.string(),
  email: z.string().email()
})

app.get('/', (c) => c.json({ message: 'Hello Deno!' }))

export default app
`)

      await Deno.writeTextFile(resolve(projectPath, 'README.md'), `
# My Deno App

A simple Deno application using Hono and Zod.

## Getting Started

\`\`\`bash
deno task start
\`\`\`
`)

      // Step 2: Run vibe init
      const result = await runVibeCommand(projectPath, ['init'])
      
      // Step 3: Verify command succeeded
      assert(result.success, `vibe init should succeed. stderr: ${result.stderr}`)
      assert(result.stdout.includes('Initialized .vibe'), `Should show success message. stdout: ${result.stdout}`)

      // Step 4: Verify .vibe directory structure was created
      const vibeDir = resolve(projectPath, '.vibe')
      assert(await dirExists(vibeDir), '.vibe directory should exist')
      assert(await dirExists(resolve(vibeDir, 'tools')), 'tools directory should exist')
      assert(await dirExists(resolve(vibeDir, 'rules')), 'rules directory should exist')
      assert(await dirExists(resolve(vibeDir, 'mcp')), 'mcp directory should exist')

      // Step 5: Verify configuration file
      const configPath = resolve(vibeDir, 'config.json')
      assert(await fileExists(configPath), 'config.json should exist')
      
      const configContent = await Deno.readTextFile(configPath)
      const config = JSON.parse(configContent)
      
      assertEquals(config.projectName, 'my-deno-app', 'should use deno.json name')
      assertEquals(config.version, '1.0.0')
      assertExists(config.created)
      assertExists(config.updated)

      // Step 6: Verify tools detection (should be empty since no package.json)
      const toolsPath = resolve(vibeDir, 'tools', 'detected.json')
      assert(await fileExists(toolsPath), 'detected.json should exist')
      
      const toolsContent = await Deno.readTextFile(toolsPath)
      const tools = JSON.parse(toolsContent)
      
      assert(Array.isArray(tools.dependencies), 'should have dependencies array')
      assertEquals(tools.dependencies.length, 0, 'should have no npm dependencies')
    })

    it('should initialize vibe in existing Node.js project', async () => {
      // Step 1: Create a realistic Node.js project structure  
      await Deno.mkdir(resolve(projectPath, 'src'), { recursive: true })
      await Deno.mkdir(resolve(projectPath, 'tests'), { recursive: true })

      await Deno.writeTextFile(resolve(projectPath, 'package.json'), JSON.stringify({
        name: 'my-node-app',
        version: '2.1.0',
        description: 'A Node.js application with Express and TypeScript',
        main: 'dist/index.js',
        scripts: {
          build: 'tsc',
          start: 'node dist/index.js',
          dev: 'ts-node src/index.ts',
          test: 'jest'
        },
        dependencies: {
          'express': '^4.18.0',
          'cors': '^2.8.5',
          'helmet': '^7.0.0',
          'dotenv': '^16.0.0'
        },
        devDependencies: {
          '@types/express': '^4.17.0',
          '@types/cors': '^2.8.0',
          'typescript': '^5.0.0',
          'ts-node': '^10.9.0',
          'jest': '^29.0.0'
        },
        peerDependencies: {
          'mongodb': '^5.0.0'
        }
      }, null, 2))

      await Deno.writeTextFile(resolve(projectPath, 'tsconfig.json'), JSON.stringify({
        compilerOptions: {
          target: 'ES2020',
          module: 'commonjs',
          outDir: './dist',
          rootDir: './src',
          strict: true,
          esModuleInterop: true
        },
        include: ['src/**/*'],
        exclude: ['node_modules', 'dist']
      }, null, 2))

      await Deno.writeTextFile(resolve(projectPath, 'src', 'index.ts'), `
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'

const app = express()
const port = process.env.PORT || 3000

app.use(helmet())
app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
  res.json({ message: 'Hello Node.js!' })
})

app.listen(port, () => {
  console.log(\`Server running on port \${port}\`)
})
`)

      await Deno.writeTextFile(resolve(projectPath, '.env'), 'PORT=3000\nNODE_ENV=development')

      // Step 2: Run vibe init
      const result = await runVibeCommand(projectPath, ['init'])
      
      // Step 3: Verify command succeeded
      assert(result.success, `vibe init should succeed. stderr: ${result.stderr}`)
      assert(result.stdout.includes('my-node-app'), 'Should detect project name from package.json')
      assert(result.stdout.includes('dependencies for future tool extraction'), 'Should detect dependencies')

      // Step 4: Verify dependency detection
      const toolsPath = resolve(projectPath, '.vibe', 'tools', 'detected.json')
      const toolsContent = await Deno.readTextFile(toolsPath)
      const tools = JSON.parse(toolsContent)
      
      // Should detect all dependency types
      const totalDeps = tools.dependencies.length
      assert(totalDeps >= 9, `Should detect at least 9 dependencies, found ${totalDeps}`)
      
      // Check for specific dependencies
      const depNames = tools.dependencies.map((d: any) => d.name)
      assert(depNames.includes('express'), 'Should detect express dependency')
      assert(depNames.includes('typescript'), 'Should detect typescript dev dependency')
      assert(depNames.includes('mongodb'), 'Should detect mongodb peer dependency')
      
      // Check dependency types
      const depTypes = new Set(tools.dependencies.map((d: any) => d.type))
      assert(depTypes.has('dependency'), 'Should have regular dependencies')
      assert(depTypes.has('devDependency'), 'Should have dev dependencies')
      assert(depTypes.has('peerDependency'), 'Should have peer dependencies')

      // Step 5: Verify project configuration
      const configPath = resolve(projectPath, '.vibe', 'config.json')
      const configContent = await Deno.readTextFile(configPath)
      const config = JSON.parse(configContent)
      
      assertEquals(config.projectName, 'my-node-app')
      assertEquals(config.dependencies.length, totalDeps)
      assert(config.settings.autoDiscovery === true)
      assert(config.settings.mcpEnabled === true)
    })

    it('should handle force flag to reinitialize existing project', async () => {
      // Step 1: Create initial project
      await Deno.writeTextFile(resolve(projectPath, 'package.json'), JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
        dependencies: { 'lodash': '^4.17.21' }
      }, null, 2))

      // Step 2: First initialization
      const firstResult = await runVibeCommand(projectPath, ['init'])
      assert(firstResult.success, 'First init should succeed')

      // Step 3: Modify .vibe manually to simulate existing state
      const configPath = resolve(projectPath, '.vibe', 'config.json')
      const oldConfig = JSON.parse(await Deno.readTextFile(configPath))
      oldConfig.customField = 'should be overwritten'
      await Deno.writeTextFile(configPath, JSON.stringify(oldConfig, null, 2))

      // Step 4: Add new dependency and reinitialize with force
      const updatedPackageJson = {
        name: 'test-project',
        version: '1.0.0',
        dependencies: { 
          'lodash': '^4.17.21',
          'express': '^4.18.0'  // New dependency
        }
      }
      await Deno.writeTextFile(resolve(projectPath, 'package.json'), JSON.stringify(updatedPackageJson, null, 2))

      // Step 5: Force reinitialize
      const forceResult = await runVibeCommand(projectPath, ['init', '--force'])
      assert(forceResult.success, 'Force init should succeed')

      // Step 6: Verify new dependency was detected
      const toolsPath = resolve(projectPath, '.vibe', 'tools', 'detected.json')
      const toolsContent = await Deno.readTextFile(toolsPath)
      const tools = JSON.parse(toolsContent)
      
      assertEquals(tools.dependencies.length, 2, 'Should detect both dependencies')
      const depNames = tools.dependencies.map((d: any) => d.name)
      assert(depNames.includes('lodash'), 'Should still have lodash')
      assert(depNames.includes('express'), 'Should detect new express dependency')

      // Step 7: Verify custom field was overwritten
      const newConfigContent = await Deno.readTextFile(configPath)
      const newConfig = JSON.parse(newConfigContent)
      assert(!newConfig.customField, 'Custom field should be removed by force init')
    })
  })

  describe('Error Scenarios', () => {
    it('should provide helpful error messages for permission issues', async () => {
      // This test is more conceptual since we can't easily simulate permission errors
      // in the test environment, but we test the error handling path
      
      // Create a minimal project
      await Deno.writeTextFile(resolve(projectPath, 'package.json'), JSON.stringify({
        name: 'test-project'
      }, null, 2))

      // Test with regular init first to ensure it works
      const result = await runVibeCommand(projectPath, ['init'])
      assert(result.success, 'Regular init should work')
      
      // Verify error handling infrastructure exists
      const { createFileSystemError } = await import('../../lib/errors.ts')
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