/**
 * User Acceptance Tests for Library Documentation Feature
 *
 * End-to-end tests simulating real user workflows with the `vibe code <package>` command
 * Tests complete functionality from CLI invocation to documentation output
 *
 * @tests_for commands/vibe-code.ts
 * @tests_for Complete library documentation workflow
 */

import { Effect } from 'effect'
import { assertEquals, assertExists } from '@std/assert'
import { resolve } from '@std/path'
import { ensureDir } from '../../lib/fs.ts'

import { vibeCodeCommand } from '../../commands/vibe-code.ts'

// Helper to create realistic test projects
async function createRealProject(
  testName: string,
  config: {
    type: 'node' | 'deno' | 'hybrid'
    dependencies: Record<string, string>
    devDependencies?: Record<string, string>
  },
): Promise<string> {
  const testDir = resolve(Deno.cwd(), 'tests', 'tmp', 'user', testName)
  await Effect.runPromise(ensureDir(testDir))

  if (config.type === 'node' || config.type === 'hybrid') {
    const packageJson = {
      name: `test-${testName}`,
      version: '1.0.0',
      dependencies: config.dependencies,
      devDependencies: config.devDependencies || {},
    }
    await Deno.writeTextFile(
      resolve(testDir, 'package.json'),
      JSON.stringify(packageJson, null, 2),
    )
  }

  if (config.type === 'deno' || config.type === 'hybrid') {
    const denoJson = {
      name: `test-${testName}`,
      version: '0.1.0',
      imports: config.dependencies,
    }
    await Deno.writeTextFile(
      resolve(testDir, 'deno.json'),
      JSON.stringify(denoJson, null, 2),
    )
  }

  return testDir
}

async function cleanupProject(testDir: string): Promise<void> {
  try {
    await Deno.remove(testDir, { recursive: true })
  } catch {
    // Ignore cleanup errors
  }
}

// Mock realistic npm/JSR responses and documentation
const originalFetch = globalThis.fetch

function mockRealisticResponses() {
  globalThis.fetch = async (input: string | URL | Request) => {
    const url = typeof input === 'string' ? input : input.toString()
    // Realistic npm registry responses
    if (url === 'https://registry.npmjs.org/hono') {
      return {
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            name: 'hono',
            'dist-tags': { latest: '4.0.0' },
            description:
              'Fast, Lightweight, Web-framework built on Web Standards for Cloudflare Workers, Deno, Bun, and Node.js',
            homepage: 'https://hono.dev',
            repository: {
              type: 'git',
              url: 'https://github.com/honojs/hono',
            },
          }),
      } as Response
    }

    if (url === 'https://registry.npmjs.org/zod') {
      return {
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            name: 'zod',
            'dist-tags': { latest: '3.22.4' },
            description: 'TypeScript-first schema validation with static type inference',
            homepage: 'https://zod.dev',
            repository: {
              type: 'git',
              url: 'https://github.com/colinhacks/zod',
            },
          }),
      } as Response
    }

    if (url === 'https://registry.npmjs.org/effect') {
      return {
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            name: 'effect',
            'dist-tags': { latest: '3.0.0' },
            description: 'A TypeScript library for building resilient and scalable applications',
            homepage: 'https://effect.website',
            repository: {
              type: 'git',
              url: 'https://github.com/Effect-TS/effect',
            },
          }),
      } as Response
    }

    // JSR registry fallback
    if (url === 'https://jsr.io/@std/path') {
      return {
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            name: 'std/path',
            description: 'Deno standard library path utilities',
            homepage: 'https://deno.land/std/path',
            githubRepository: {
              owner: 'denoland',
              name: 'std',
            },
            latestVersion: '1.0.0',
          }),
      } as Response
    }

    // Realistic documentation responses
    if (url === 'https://hono.dev/llms.txt') {
      return {
        ok: true,
        status: 200,
        text: () =>
          Promise.resolve(`# Hono - Fast Web Framework

Hono is a small, simple, and ultrafast web framework built on Web Standards.

## Quick Start

\`\`\`typescript
import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

export default app
\`\`\`

## Routing

\`\`\`typescript
app.get('/user/:id', (c) => {
  const id = c.req.param('id')
  return c.json({ user: id })
})
\`\`\`

## Middleware

\`\`\`typescript
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'

app.use('*', cors())
app.use('*', logger())
\`\`\`

## Context Helpers

- \`c.req\` - Request object
- \`c.res\` - Response object  
- \`c.json()\` - JSON response
- \`c.text()\` - Text response
- \`c.html()\` - HTML response

Perfect for Cloudflare Workers, Deno, Bun, and Node.js.`),
      } as Response
    }

    if (url === 'https://zod.dev/llms.txt') {
      return {
        ok: true,
        status: 200,
        text: () =>
          Promise.resolve(`# Zod - TypeScript-first Schema Validation

Zod is a TypeScript-first schema declaration and validation library.

## Basic Usage

\`\`\`typescript
import { z } from 'zod'

// Basic schemas
const userSchema = z.object({
  name: z.string(),
  age: z.number().min(0),
  email: z.string().email(),
})

type User = z.infer<typeof userSchema>

// Parsing
const result = userSchema.parse(data)
const safeResult = userSchema.safeParse(data)
\`\`\`

## Common Patterns

\`\`\`typescript
// Optional fields
const schema = z.object({
  name: z.string(),
  nickname: z.string().optional(),
})

// Arrays and records
const stringArray = z.array(z.string())
const userRecord = z.record(z.string(), userSchema)

// Unions and discriminated unions
const unionSchema = z.union([z.string(), z.number()])
const discriminatedUnion = z.discriminatedUnion('type', [
  z.object({ type: z.literal('user'), data: userSchema }),
  z.object({ type: z.literal('admin'), permissions: z.array(z.string()) }),
])
\`\`\`

## Refinements and Transforms

\`\`\`typescript
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .refine(val => /[A-Z]/.test(val), 'Must contain uppercase letter')

const dateSchema = z.string().transform(val => new Date(val))
\`\`\``),
      } as Response
    }

    if (url === 'https://effect.website/llms.txt') {
      return {
        ok: true,
        status: 200,
        text: () =>
          Promise.resolve(`# Effect - Build Better TypeScript

Effect is a powerful TypeScript library designed to help developers easily create complex, synchronous, and asynchronous programs.

## Core Concepts

\`\`\`typescript
import { Effect, pipe } from 'effect'

// Creating Effects
const success = Effect.succeed(42)
const failure = Effect.fail('Something went wrong')
const async = Effect.tryPromise({
  try: () => fetch('/api/data'),
  catch: (error) => new Error('Fetch failed')
})

// Composing Effects
const program = pipe(
  Effect.succeed(1),
  Effect.flatMap(n => Effect.succeed(n + 1)),
  Effect.map(n => n * 2)
)
\`\`\`

## Error Handling

\`\`\`typescript
const safeProgram = pipe(
  riskyOperation(),
  Effect.catchTag('NetworkError', () => Effect.succeed('default')),
  Effect.catchAll(error => Effect.succeed('fallback'))
)
\`\`\`

## Resource Management

\`\`\`typescript
const managedResource = pipe(
  Effect.acquireRelease(
    openFile('data.txt'),
    file => closeFile(file)
  ),
  Effect.flatMap(file => readContent(file))
)
\`\`\`

## Concurrency

\`\`\`typescript
const concurrent = Effect.all([
  fetchUser(1),
  fetchUser(2),
  fetchUser(3)
], { concurrency: 3 })
\`\`\``),
      } as Response
    }

    if (url === 'https://deno.land/llms.txt') {
      return {
        ok: true,
        status: 200,
        text: () =>
          Promise.resolve(`# Deno Standard Library - Path Module

Cross-platform path manipulation utilities for Deno.

## Basic Usage

\`\`\`typescript
import { join, resolve, dirname, basename } from '@std/path'

// Joining paths
const fullPath = join('home', 'user', 'documents', 'file.txt')

// Resolving paths
const absolute = resolve('./relative/path')

// Path components
const dir = dirname('/path/to/file.txt') // '/path/to'
const name = basename('/path/to/file.txt') // 'file.txt'
\`\`\`

## Cross-platform Support

\`\`\`typescript
import { posix, win32 } from '@std/path'

// Force POSIX paths
const posixPath = posix.join('home', 'user', 'file.txt')

// Force Windows paths  
const windowsPath = win32.join('C:', 'Users', 'file.txt')
\`\`\`

## Common Operations

\`\`\`typescript
import { extname, parse, format } from '@std/path'

// File extensions
const ext = extname('file.txt') // '.txt'

// Parse path components
const parsed = parse('/home/user/file.txt')
// { root: '/', dir: '/home/user', base: 'file.txt', ext: '.txt', name: 'file' }

// Format path from components
const formatted = format({
  dir: '/home/user',
  name: 'file',
  ext: '.txt'
})
\`\`\``),
      } as Response
    }

    // 404 for unknown URLs
    return {
      ok: false,
      status: 404,
      statusText: 'Not Found',
    } as Response
  }
}

function restoreFetch() {
  globalThis.fetch = originalFetch
}

Deno.test('User Acceptance Tests - Library Documentation', async (t) => {
  await t.step('User Story: Node.js developer wants Hono documentation', async () => {
    // Given: A Node.js project with Hono dependency
    const testDir = await createRealProject('node-hono', {
      type: 'node',
      dependencies: {
        'hono': '^4.0.0',
      },
      devDependencies: {
        '@types/node': '^18.0.0',
      },
    })

    mockRealisticResponses()

    try {
      const originalCwd = Deno.cwd()
      Deno.chdir(testDir)

      // When: User runs `vibe code hono`
      const documentation = await Effect.runPromise(vibeCodeCommand('hono'))

      // Then: Fresh Hono documentation is displayed
      assertExists(documentation)
      assertEquals(documentation.includes('# Hono - Fast Web Framework'), true)
      assertEquals(documentation.includes('Quick Start'), true)
      assertEquals(documentation.includes('Routing'), true)
      assertEquals(documentation.includes('Middleware'), true)

      // And: Documentation is cached for future use
      const cacheExists = await Deno.stat(resolve(testDir, '.vibe', 'libraries', 'docs', 'hono', 'README.md'))
        .then(() => true)
        .catch(() => false)
      assertEquals(cacheExists, true)

      // And: Cache index is updated
      const indexExists = await Deno.stat(resolve(testDir, '.vibe', 'libraries', 'index.toml'))
        .then(() => true)
        .catch(() => false)
      assertEquals(indexExists, true)

      Deno.chdir(originalCwd)
    } finally {
      restoreFetch()
      await cleanupProject(testDir)
    }
  })

  await t.step('User Story: Deno developer wants standard library documentation', async () => {
    // Given: A Deno project with std/path import
    const testDir = await createRealProject('deno-std', {
      type: 'deno',
      dependencies: {
        '@std/path': 'jsr:@std/path@^1.0.0',
      },
    })

    mockRealisticResponses()

    try {
      const originalCwd = Deno.cwd()
      Deno.chdir(testDir)

      // When: User runs `vibe code @std/path`
      const documentation = await Effect.runPromise(vibeCodeCommand('@std/path'))

      // Then: Fresh std/path documentation is displayed
      assertExists(documentation)
      assertEquals(documentation.includes('# Deno Standard Library - Path Module'), true)
      assertEquals(documentation.includes('Cross-platform path manipulation'), true)
      assertEquals(documentation.includes('Basic Usage'), true)

      Deno.chdir(originalCwd)
    } finally {
      restoreFetch()
      await cleanupProject(testDir)
    }
  })

  await t.step('User Story: Developer wants multiple libraries in succession', async () => {
    // Given: A hybrid project with multiple dependencies
    const testDir = await createRealProject('multi-lib', {
      type: 'hybrid',
      dependencies: {
        'zod': '^3.22.0',
        'effect': '^3.0.0',
      },
    })

    mockRealisticResponses()

    try {
      const originalCwd = Deno.cwd()
      Deno.chdir(testDir)

      // When: User runs multiple `vibe code` commands
      const zodDocs = await Effect.runPromise(vibeCodeCommand('zod'))
      const effectDocs = await Effect.runPromise(vibeCodeCommand('effect'))

      // Then: Each library's documentation is returned correctly
      assertEquals(zodDocs.includes('# Zod - TypeScript-first Schema Validation'), true)
      assertEquals(zodDocs.includes('Basic Usage'), true)
      assertEquals(zodDocs.includes('safeParse'), true)

      assertEquals(effectDocs.includes('# Effect - Build Better TypeScript'), true)
      assertEquals(effectDocs.includes('Core Concepts'), true)
      assertEquals(effectDocs.includes('pipe'), true)

      // And: Both are cached independently
      const zodCacheExists = await Deno.stat(resolve(testDir, '.vibe', 'libraries', 'docs', 'zod', 'README.md'))
        .then(() => true)
        .catch(() => false)
      const effectCacheExists = await Deno.stat(resolve(testDir, '.vibe', 'libraries', 'docs', 'effect', 'README.md'))
        .then(() => true)
        .catch(() => false)

      assertEquals(zodCacheExists, true)
      assertEquals(effectCacheExists, true)

      Deno.chdir(originalCwd)
    } finally {
      restoreFetch()
      await cleanupProject(testDir)
    }
  })

  await t.step('User Story: Developer runs same command twice (cache hit)', async () => {
    // Given: A project with Hono already cached
    const testDir = await createRealProject('cache-test', {
      type: 'node',
      dependencies: {
        'hono': '^4.0.0',
      },
    })

    let fetchCount = 0
    mockRealisticResponses()

    // Override to track fetch count
    const originalMockFetch = globalThis.fetch
    globalThis.fetch = async (input: string | URL | Request, init?: RequestInit) => {
      fetchCount++
      return await originalMockFetch(input, init)
    }

    try {
      const originalCwd = Deno.cwd()
      Deno.chdir(testDir)

      // When: User runs `vibe code hono` twice
      const firstCall = await Effect.runPromise(vibeCodeCommand('hono'))
      const secondCall = await Effect.runPromise(vibeCodeCommand('hono'))

      // Then: Both calls return same documentation
      assertEquals(firstCall, secondCall)
      assertEquals(firstCall.includes('# Hono - Fast Web Framework'), true)

      // And: Documentation endpoint is only fetched once (cache hit on second call)
      // Note: First call = registry fetch + docs fetch, second call = no fetches (cache hit)
      assertEquals(fetchCount, 2) // Only registry.npmjs.org/hono + hono.dev/llms.txt

      Deno.chdir(originalCwd)
    } finally {
      restoreFetch()
      await cleanupProject(testDir)
    }
  })

  await t.step('User Story: Developer in project without manifests gets helpful error', async () => {
    // Given: An empty directory with no package.json or deno.json
    const testDir = await createRealProject('empty-project', {
      type: 'node', // Will not actually create files
      dependencies: {},
    })

    // Remove the package.json that createRealProject created
    await Deno.remove(resolve(testDir, 'package.json')).catch(() => {})

    try {
      const originalCwd = Deno.cwd()
      Deno.chdir(testDir)

      // When: User runs `vibe code hono`
      let errorCaught = false
      let errorMessage = ''

      try {
        await Effect.runPromise(vibeCodeCommand('hono'))
      } catch (error) {
        errorCaught = true
        errorMessage = error instanceof Error ? error.message : String(error)
      }

      // Then: Helpful error message is displayed (finds parent project but package not in deps)
      assertEquals(errorCaught, true)
      assertEquals(errorMessage.includes('not found in project dependencies'), true)

      Deno.chdir(originalCwd)
    } finally {
      await cleanupProject(testDir)
    }
  })

  await t.step('User Story: Developer requests package not in project dependencies', async () => {
    // Given: A project with limited dependencies
    const testDir = await createRealProject('limited-deps', {
      type: 'node',
      dependencies: {
        'hono': '^4.0.0',
      },
    })

    try {
      const originalCwd = Deno.cwd()
      Deno.chdir(testDir)

      // When: User runs `vibe code zod` (not in dependencies)
      let errorCaught = false
      let errorMessage = ''

      try {
        await Effect.runPromise(vibeCodeCommand('zod'))
      } catch (error) {
        errorCaught = true
        errorMessage = error instanceof Error ? error.message : String(error)
      }

      // Then: Helpful error with available packages is displayed
      assertEquals(errorCaught, true)
      assertEquals(errorMessage.includes("Package 'zod' not found in project dependencies"), true)
      assertEquals(errorMessage.includes('Available packages: hono'), true)

      Deno.chdir(originalCwd)
    } finally {
      await cleanupProject(testDir)
    }
  })
})
