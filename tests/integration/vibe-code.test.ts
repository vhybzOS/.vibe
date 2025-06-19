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
  // Find project root by looking for deno.json - this works regardless of cwd
  let projectRoot = Deno.cwd()
  while (projectRoot !== '/' && projectRoot !== '.') {
    try {
      await Deno.stat(resolve(projectRoot, 'deno.json'))
      break
    } catch {
      projectRoot = resolve(projectRoot, '..')
    }
  }

  const testDir = resolve(projectRoot, 'tests', 'tmp', 'integration', testName)
  await ensureDir(testDir)

  for (const [filename, content] of Object.entries(files)) {
    const filePath = resolve(testDir, filename)
    await ensureDir(dirname(filePath)) // Ensure parent directory exists
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
      version: '4.0.0',
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

    try {
      // Change to test directory for the command
      const originalCwd = Deno.cwd()
      Deno.chdir(testDir)

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

      // Restore working directory
      Deno.chdir(originalCwd)
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
      version: '3.22.0',
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

    try {
      const originalCwd = Deno.cwd()
      Deno.chdir(testDir)

      // First call - should fetch and cache
      const result1 = await Effect.runPromise(vibeCodeCommand('zod'))
      assertEquals(result1, docsContent)

      // Second call - should use cache (no additional fetches)
      const result2 = await Effect.runPromise(vibeCodeCommand('zod'))
      assertEquals(result2, docsContent)

      // Verify cache was used (only registry + docs fetch, no second docs fetch)
      assertEquals(fetchCount, 2)

      Deno.chdir(originalCwd)
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

    try {
      const originalCwd = Deno.cwd()
      Deno.chdir(testDir)

      const result = await Effect.runPromise(vibeCodeCommand('@std/path'))
      assertEquals(result, docsContent)

      Deno.chdir(originalCwd)
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

    try {
      const originalCwd = Deno.cwd()
      Deno.chdir(testDir)

      await assertRejects(
        () => Effect.runPromise(vibeCodeCommand('nonexistent')),
        Error,
        "Package 'nonexistent' not found in project dependencies",
      )

      Deno.chdir(originalCwd)
    } finally {
      await cleanupTestProject(testDir)
    }
  })

  await t.step('Error handling: no project manifests', async () => {
    const testDir = await createTestProject('no-manifests', {})

    try {
      const originalCwd = Deno.cwd()
      Deno.chdir(testDir)

      await assertRejects(
        () => Effect.runPromise(vibeCodeCommand('nonexistent-package')),
        Error,
        'No package.json or deno.json found',
      )

      Deno.chdir(originalCwd)
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

    try {
      const originalCwd = Deno.cwd()
      Deno.chdir(testDir)

      await assertRejects(
        () => Effect.runPromise(vibeCodeCommand('totally-fake-package')),
        Error,
        'not found',
      )

      Deno.chdir(originalCwd)
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
      version: '1.0.0',
      homepage: 'https://example.com',
    }

    mockRegistryAndDocs({
      'https://registry.npmjs.org/no-docs-package': { status: 200, data: npmResponse },
      'https://example.com/llms.txt': { status: 404, data: {} },
    })

    const testDir = await createTestProject('no-docs', {
      'package.json': packageJson,
    })

    try {
      const originalCwd = Deno.cwd()
      Deno.chdir(testDir)

      await assertRejects(
        () => Effect.runPromise(vibeCodeCommand('no-docs-package')),
        Error,
        'Failed to fetch documentation',
      )

      Deno.chdir(originalCwd)
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
      version: '4.0.0',
      homepage: 'https://hono.dev',
    }

    const effectResponse = {
      name: 'effect',
      version: '3.0.0',
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

    try {
      const originalCwd = Deno.cwd()
      Deno.chdir(testDir)

      // Test both packages are accessible
      const honoResult = await Effect.runPromise(vibeCodeCommand('hono'))
      const effectResult = await Effect.runPromise(vibeCodeCommand('effect'))

      assertEquals(honoResult, honoDocsContent)
      assertEquals(effectResult, effectDocsContent)

      Deno.chdir(originalCwd)
    } finally {
      restoreFetch()
      await cleanupTestProject(testDir)
    }
  })
})
