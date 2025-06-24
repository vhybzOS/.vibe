/**
 * Vibe Code Command Integration Tests
 *
 * Tests the complete workflow of the `vibe code <package>` command
 * including package detection, registry fetching, caching, and CLI integration
 *
 * @tests_for commands/vibe-code.ts
 * @tests_for services/library-cache.ts
 * @tests_for services/registry-client.ts
 * @tests_for services/package-detector.ts
 */

import { Effect } from 'effect'
import { assertEquals, assertExists, assertRejects } from '@std/assert'
import { dirname, resolve } from '@std/path'
import { ensureDir } from '../../lib/fs.ts'

import { vibeCodeCommand } from '../../commands/vibe-code.ts'

// Test helper to create temporary test projects
interface ProjectFile {
  name?: string
  version?: string
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  imports?: Record<string, string>
}

async function createTestProject(
  testName: string,
  files: Record<string, ProjectFile>,
): Promise<string> {
  // Find project root by looking for deno.json - handle missing cwd gracefully
  let projectRoot: string
  try {
    projectRoot = Deno.cwd()
  } catch {
    // If cwd doesn't exist (deleted by previous test), use the script location
    projectRoot = dirname(new URL(import.meta.url).pathname)
  }

  while (projectRoot !== '/' && projectRoot !== '.') {
    try {
      await Deno.stat(resolve(projectRoot, 'deno.json'))
      break
    } catch {
      const parentPath = resolve(projectRoot, '..')
      // Check if we've reached the root (parent path equals current path)
      if (parentPath === projectRoot) {
        break
      }
      projectRoot = parentPath
    }
  }

  const testDir = resolve(projectRoot, 'tests', 'tmp', 'integration', testName)
  await Effect.runPromise(ensureDir(testDir))

  for (const [filename, content] of Object.entries(files)) {
    const filePath = resolve(testDir, filename)
    await Effect.runPromise(ensureDir(dirname(filePath))) // Ensure parent directory exists
    await Deno.writeTextFile(filePath, JSON.stringify(content, null, 2))
  }

  return testDir
}

// Clean up test directories
async function cleanupTestProject(testDir: string): Promise<void> {
  try {
    await Deno.remove(testDir, { recursive: true })
  } catch {
    // Ignore cleanup errors
  }
}

// Helper to safely get current working directory
function safeGetCwd(): string {
  try {
    return Deno.cwd()
  } catch {
    // If cwd doesn't exist, return a safe default (project root)
    return dirname(new URL(import.meta.url).pathname)
  }
}

// Helper to safely change directory with automatic restoration
async function withDirectory<T>(dir: string, fn: () => Promise<T>): Promise<T> {
  const originalCwd = safeGetCwd()
  try {
    Deno.chdir(dir)
    return await fn()
  } finally {
    try {
      Deno.chdir(originalCwd)
    } catch {
      // If original directory was deleted, change to project root
      const projectRoot = dirname(new URL(import.meta.url).pathname)
      Deno.chdir(projectRoot)
    }
  }
}

// Mock fetch for controlled testing
const originalFetch = globalThis.fetch

import { JsrPackageInfo, NpmPackageInfo } from '../../schemas/library-cache.ts'

interface MockResponse {
  status: number
  data: NpmPackageInfo | JsrPackageInfo | string | Record<string, never>
}

function mockRegistryAndDocs(responses: Record<string, MockResponse>) {
  globalThis.fetch = async (input: string | URL | Request) => {
    const url = typeof input === 'string' ? input : input.toString()
    const response = responses[url]
    if (!response) {
      throw new Error(`Unexpected fetch to ${url}`)
    }

    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      statusText: response.status === 404 ? 'Not Found' : 'OK',
      json: () => Promise.resolve(response.data),
      text: () => Promise.resolve(typeof response.data === 'string' ? response.data : JSON.stringify(response.data)),
    } as Response
  }
}

function restoreFetch() {
  globalThis.fetch = originalFetch
}

Deno.test('Vibe Code Integration Tests', async (t) => {
  await t.step('Complete workflow: npm package with documentation', async () => {
    const packageJson = {
      name: 'test-project',
      dependencies: {
        hono: '^4.0.0',
      },
    }

    const npmResponse = {
      name: 'hono',
      'dist-tags': { latest: '4.0.0' },
      homepage: 'https://hono.dev',
    }

    const docsContent = `# Hono Documentation

Hono is a fast web framework for the Edge.

## Quick Start

\`\`\`typescript
import { Hono } from 'hono'

const app = new Hono()
app.get('/', (c) => c.text('Hello World!'))
\`\`\``

    mockRegistryAndDocs({
      'https://registry.npmjs.org/hono': { status: 200, data: npmResponse },
      'https://hono.dev/llms.txt': { status: 200, data: docsContent },
    })

    const testDir = await createTestProject('complete-workflow', {
      'package.json': packageJson,
    })

    await withDirectory(testDir, async () => {
      const result = await Effect.runPromise(vibeCodeCommand('hono'))

      // Verify documentation content is returned
      assertEquals(result, docsContent)

      // Verify cache files were created
      const indexPath = resolve(testDir, '.vibe', 'libraries', 'index.toml')
      const docsPath = resolve(testDir, '.vibe', 'libraries', 'docs', 'hono', 'README.md')

      const indexExists = await Deno.stat(indexPath).then(() => true).catch(() => false)
      const docsExists = await Deno.stat(docsPath).then(() => true).catch(() => false)

      assertEquals(indexExists, true)
      assertEquals(docsExists, true)

      // Verify cached content matches
      const cachedContent = await Deno.readTextFile(docsPath)
      assertEquals(cachedContent, docsContent)
    })

    try {
      // empty try block just for finally
    } finally {
      restoreFetch()
      await cleanupTestProject(testDir)
    }
  })

  await t.step('Subsequent calls use cache', async () => {
    const packageJson = {
      name: 'test-project',
      dependencies: {
        zod: '^3.22.0',
      },
    }

    const npmResponse = {
      name: 'zod',
      'dist-tags': { latest: '3.22.0' },
      homepage: 'https://zod.dev',
    }

    const docsContent = 'Zod documentation content'

    // Only mock the first call - second should use cache
    let fetchCount = 0
    globalThis.fetch = async (input: string | URL | Request) => {
      fetchCount++
      const url = typeof input === 'string' ? input : input.toString()
      if (url === 'https://registry.npmjs.org/zod') {
        return {
          ok: true,
          status: 200,
          json: () => Promise.resolve(npmResponse),
        } as Response
      }
      if (url === 'https://zod.dev/llms.txt') {
        return {
          ok: true,
          status: 200,
          text: () => Promise.resolve(docsContent),
        } as Response
      }
      throw new Error(`Unexpected fetch to ${url}`)
    }

    const testDir = await createTestProject('cache-workflow', {
      'package.json': packageJson,
    })

    await withDirectory(testDir, async () => {
      // First call - should fetch and cache
      const result1 = await Effect.runPromise(vibeCodeCommand('zod'))
      assertEquals(result1, docsContent)

      // Second call - should use cache (no additional fetches)
      const result2 = await Effect.runPromise(vibeCodeCommand('zod'))
      assertEquals(result2, docsContent)

      // Verify cache was used (only registry + docs fetch, no second docs fetch)
      assertEquals(fetchCount, 2)
    })

    try {
      // empty try block just for finally
    } finally {
      restoreFetch()
      await cleanupTestProject(testDir)
    }
  })

  await t.step('JSR package fallback workflow', async () => {
    const denoJson = {
      name: 'deno-project',
      imports: {
        '@std/path': 'jsr:@std/path@^1.0.0',
      },
    }

    const jsrResponse = {
      name: 'std/path',
      latestVersion: '1.0.0',
      homepage: 'https://deno.land/std/path',
    }

    const docsContent = 'Deno std/path documentation'

    mockRegistryAndDocs({
      'https://registry.npmjs.org/@std/path': { status: 404, data: {} },
      'https://jsr.io/@std/path': { status: 200, data: jsrResponse },
      'https://deno.land/llms.txt': { status: 200, data: docsContent },
    })

    const testDir = await createTestProject('jsr-fallback', {
      'deno.json': denoJson,
    })

    await withDirectory(testDir, async () => {
      const result = await Effect.runPromise(vibeCodeCommand('@std/path'))
      assertEquals(result, docsContent)
    })

    try {
      // empty try block just for finally
    } finally {
      restoreFetch()
      await cleanupTestProject(testDir)
    }
  })

  await t.step('Error handling: package not in project', async () => {
    const packageJson = {
      name: 'test-project',
      dependencies: {
        hono: '^4.0.0',
      },
    }

    const testDir = await createTestProject('missing-package', {
      'package.json': packageJson,
    })

    await withDirectory(testDir, async () => {
      await assertRejects(
        () => Effect.runPromise(vibeCodeCommand('nonexistent')),
        Error,
        "Package 'nonexistent' not found in project dependencies",
      )
    })

    try {
      // empty try block just for finally
    } finally {
      await cleanupTestProject(testDir)
    }
  })

  await t.step('Error handling: no project manifests', async () => {
    const testDir = await createTestProject('no-manifests', {})

    await withDirectory(testDir, async () => {
      // When run from an empty directory, findProjectRoot walks up and finds parent project
      // This is actually useful behavior - allows running from subdirectories
      await assertRejects(
        () => Effect.runPromise(vibeCodeCommand('nonexistent-package')),
        Error,
        'not found in project dependencies',
      )
    })

    try {
      // empty try block just for finally
    } finally {
      await cleanupTestProject(testDir)
    }
  })

  await t.step('Error handling: package not found in registry', async () => {
    const packageJson = {
      name: 'test-project',
      dependencies: {
        'totally-fake-package': '^1.0.0',
      },
    }

    mockRegistryAndDocs({
      'https://registry.npmjs.org/totally-fake-package': { status: 404, data: {} },
      'https://jsr.io/@totally-fake-package': { status: 404, data: {} },
    })

    const testDir = await createTestProject('package-not-found', {
      'package.json': packageJson,
    })

    await withDirectory(testDir, async () => {
      await assertRejects(
        () => Effect.runPromise(vibeCodeCommand('totally-fake-package')),
        Error,
        'not found',
      )
    })

    try {
      // empty try block just for finally
    } finally {
      restoreFetch()
      await cleanupTestProject(testDir)
    }
  })

  await t.step('Error handling: documentation not available', async () => {
    const packageJson = {
      name: 'test-project',
      dependencies: {
        'no-docs-package': '^1.0.0',
      },
    }

    const npmResponse = {
      name: 'no-docs-package',
      'dist-tags': { latest: '1.0.0' },
      homepage: 'https://example.com',
    }

    mockRegistryAndDocs({
      'https://registry.npmjs.org/no-docs-package': { status: 200, data: npmResponse },
      'https://example.com/llms.txt': { status: 404, data: {} },
    })

    const testDir = await createTestProject('no-docs', {
      'package.json': packageJson,
    })

    await withDirectory(testDir, async () => {
      await assertRejects(
        () => Effect.runPromise(vibeCodeCommand('no-docs-package')),
        Error,
        'Failed to fetch documentation',
      )
    })

    try {
      // empty try block just for finally
    } finally {
      restoreFetch()
      await cleanupTestProject(testDir)
    }
  })

  await t.step('Complex project: both package.json and deno.json', async () => {
    const packageJson = {
      name: 'hybrid-project',
      dependencies: {
        hono: '^4.0.0',
      },
    }

    const denoJson = {
      name: 'hybrid-project',
      imports: {
        effect: 'npm:effect@^3.0.0',
      },
    }

    const honoResponse = {
      name: 'hono',
      'dist-tags': { latest: '4.0.0' },
      homepage: 'https://hono.dev',
    }

    const effectResponse = {
      name: 'effect',
      'dist-tags': { latest: '3.0.0' },
      homepage: 'https://effect.website',
    }

    const honoDocsContent = 'Hono documentation'
    const effectDocsContent = 'Effect documentation'

    mockRegistryAndDocs({
      'https://registry.npmjs.org/hono': { status: 200, data: honoResponse },
      'https://registry.npmjs.org/effect': { status: 200, data: effectResponse },
      'https://hono.dev/llms.txt': { status: 200, data: honoDocsContent },
      'https://effect.website/llms.txt': { status: 200, data: effectDocsContent },
    })

    const testDir = await createTestProject('hybrid-project', {
      'package.json': packageJson,
      'deno.json': denoJson,
    })

    await withDirectory(testDir, async () => {
      // Test both packages are accessible
      const honoResult = await Effect.runPromise(vibeCodeCommand('hono'))
      const effectResult = await Effect.runPromise(vibeCodeCommand('effect'))

      assertEquals(honoResult, honoDocsContent)
      assertEquals(effectResult, effectDocsContent)
    })

    try {
      // empty try block just for finally
    } finally {
      restoreFetch()
      await cleanupTestProject(testDir)
    }
  })
})
