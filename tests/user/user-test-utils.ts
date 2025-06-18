/**
 * User Test Utilities
 *
 * Shared utilities for end-to-end user workflow testing
 *
 * @tested_by tests/user/project-setup.test.ts (Utility function validation)
 * @tested_by tests/user/dependency-discovery.test.ts (Validation helper usage)
 */

import { dirname, resolve } from '@std/path'
import { assert, assertEquals, assertExists } from '@std/assert'

// Test utilities for real project simulation
export async function createProjectDir(): Promise<string> {
  const baseDir = await Deno.makeTempDir({ prefix: 'vibe_user_test_' })
  return resolve(baseDir, 'test-project')
}

export async function cleanupProjectDir(path: string): Promise<void> {
  try {
    // Clean up the entire temp directory (parent of project)
    const parentDir = dirname(path)
    await Deno.remove(parentDir, { recursive: true })
  } catch {
    // Ignore cleanup errors
  }
}

export async function runVibeCommand(
  projectPath: string,
  args: string[],
): Promise<{ stdout: string; stderr: string; success: boolean }> {
  // Use deno run instead of compiled binary for cross-platform compatibility
  const cliPath = resolve(Deno.cwd(), 'cli.ts')

  try {
    const command = new Deno.Command('deno', {
      args: ['run', '--allow-all', cliPath, ...args],
      cwd: projectPath,
      stdout: 'piped',
      stderr: 'piped',
    })

    const { success, stdout, stderr } = await command.output()

    return {
      stdout: new TextDecoder().decode(stdout),
      stderr: new TextDecoder().decode(stderr),
      success,
    }
  } catch (error) {
    return {
      stdout: '',
      stderr: `Failed to run vibe command: ${error instanceof Error ? error.message : String(error)}`,
      success: false,
    }
  }
}

export async function fileExists(path: string): Promise<boolean> {
  try {
    const stat = await Deno.stat(path)
    return stat.isFile
  } catch {
    return false
  }
}

export async function dirExists(path: string): Promise<boolean> {
  try {
    const stat = await Deno.stat(path)
    return stat.isDirectory
  } catch {
    return false
  }
}

/**
 * Validates the complete .vibe directory structure matches current implementation
 */
export async function validateVibeStructure(vibePath: string): Promise<void> {
  // Required subdirectories (current P0 implementation + P1/P2 placeholders)
  assert(await dirExists(vibePath), '.vibe directory should exist')
  assert(await dirExists(resolve(vibePath, 'tools')), 'tools directory should exist')
  assert(await dirExists(resolve(vibePath, 'rules')), 'rules directory should exist')
  assert(await dirExists(resolve(vibePath, 'mcp')), 'mcp directory should exist (P1/P2 placeholder)')

  // Required files
  const requiredFiles = [
    'config.json',
    'tools/detected.json',
    'rules/universal.json',
    'mcp/tools.json',
  ]

  for (const file of requiredFiles) {
    const filePath = resolve(vibePath, file)
    assert(await fileExists(filePath), `Required file should exist: ${file}`)
  }
}

/**
 * Validates configuration file quality and structure
 */
export async function validateConfigQuality(configPath: string, expectedProjectName: string): Promise<any> {
  assert(await fileExists(configPath), 'config.json should exist')

  const configContent = await Deno.readTextFile(configPath)
  const config = JSON.parse(configContent)

  // Project metadata should be properly extracted
  assertEquals(config.projectName, expectedProjectName, 'should use correct project name')
  assertExists(config.version, 'should have version')
  assertExists(config.created, 'should have creation timestamp')
  assertExists(config.updated, 'should have updated timestamp')

  // Configuration should include essential settings
  assertExists(config.settings, 'should have settings object')
  assertEquals(typeof config.settings.autoDiscovery, 'boolean', 'should have autoDiscovery setting')
  assertEquals(typeof config.settings.mcpEnabled, 'boolean', 'should have mcpEnabled setting')
  assertExists(config.dependencies, 'should have dependencies array')
  assertEquals(Array.isArray(config.dependencies), true, 'dependencies should be array')

  // Validate timestamps are realistic (within last minute)
  const now = Date.now()
  const created = new Date(config.created).getTime()
  const updated = new Date(config.updated).getTime()
  assert(now - created < 60000, 'created timestamp should be recent')
  assert(now - updated < 60000, 'updated timestamp should be recent')
  assert(updated >= created, 'updated should be >= created')

  return config
}

/**
 * Validates dependency detection file structure and content
 */
export async function validateDependencyDetection(toolsPath: string, expectedCount?: number): Promise<any> {
  assert(await fileExists(toolsPath), 'detected.json should exist')

  const toolsContent = await Deno.readTextFile(toolsPath)
  const tools = JSON.parse(toolsContent)

  assert(Array.isArray(tools.dependencies), 'should have dependencies array')
  assertExists(tools.lastUpdated, 'should have lastUpdated timestamp')

  if (expectedCount !== undefined) {
    assertEquals(tools.dependencies.length, expectedCount, `should detect ${expectedCount} dependencies`)
  }

  // Verify dependency data structure for each detected dependency
  for (const dep of tools.dependencies) {
    assertExists(dep.name, 'dependency should have name')
    assertExists(dep.version, 'dependency should have version')
    assertExists(dep.type, 'dependency should have type')
    assert(['dependency', 'devDependency', 'peerDependency'].includes(dep.type), 'type should be valid')
  }

  // Verify dependencies array structure is valid even when empty
  const structureValid = Array.isArray(tools.dependencies) &&
    typeof tools.lastUpdated === 'string' &&
    tools.lastUpdated.includes('T') // ISO timestamp format
  assert(structureValid, 'tools structure should be valid')

  return tools
}

/**
 * Creates a realistic Node.js project structure for testing
 */
export async function createRealisticNodeProject(projectPath: string): Promise<void> {
  await Deno.mkdir(resolve(projectPath, 'src'), { recursive: true })
  await Deno.mkdir(resolve(projectPath, 'tests'), { recursive: true })

  await Deno.writeTextFile(
    resolve(projectPath, 'package.json'),
    JSON.stringify(
      {
        name: 'test-node-app',
        version: '2.1.0',
        description: 'A Node.js application with Express and TypeScript',
        main: 'dist/index.js',
        scripts: {
          build: 'tsc',
          start: 'node dist/index.js',
          dev: 'ts-node src/index.ts',
          test: 'jest',
        },
        dependencies: {
          'express': '^4.18.0',
          'cors': '^2.8.5',
          'helmet': '^7.0.0',
          'dotenv': '^16.0.0',
        },
        devDependencies: {
          '@types/express': '^4.17.0',
          '@types/cors': '^2.8.0',
          'typescript': '^5.0.0',
          'ts-node': '^10.9.0',
          'jest': '^29.0.0',
        },
        peerDependencies: {
          'mongodb': '^5.0.0',
        },
      },
      null,
      2,
    ),
  )

  await Deno.writeTextFile(
    resolve(projectPath, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2020',
          module: 'commonjs',
          outDir: './dist',
          rootDir: './src',
          strict: true,
          esModuleInterop: true,
        },
        include: ['src/**/*'],
        exclude: ['node_modules', 'dist'],
      },
      null,
      2,
    ),
  )

  await Deno.writeTextFile(
    resolve(projectPath, 'src', 'index.ts'),
    `
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
`,
  )

  await Deno.writeTextFile(resolve(projectPath, '.env'), 'PORT=3000\\nNODE_ENV=development')
}

/**
 * Creates a realistic Deno project structure for testing
 */
export async function createRealisticDenoProject(projectPath: string): Promise<void> {
  await Deno.writeTextFile(
    resolve(projectPath, 'deno.json'),
    JSON.stringify(
      {
        name: 'test-deno-app',
        version: '1.0.0',
        exports: {
          '.': './mod.ts',
        },
        tasks: {
          start: 'deno run --allow-net mod.ts',
          test: 'deno test --allow-all',
          dev: 'deno run --allow-net --watch mod.ts',
        },
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

  await Deno.writeTextFile(
    resolve(projectPath, 'mod.ts'),
    `
import { Hono } from 'hono'
import { z } from 'zod'

const app = new Hono()

const UserSchema = z.object({
  name: z.string(),
  email: z.string().email()
})

app.get('/', (c) => c.json({ message: 'Hello Deno!' }))

export default app
`,
  )

  await Deno.writeTextFile(
    resolve(projectPath, 'README.md'),
    `
# Test Deno App

A simple Deno application using Hono and Zod.

## Getting Started

\`\`\`bash
deno task start
\`\`\`
`,
  )
}
