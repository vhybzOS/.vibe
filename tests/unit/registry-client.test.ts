/**
 * Registry Client Service Tests
 *
 * Tests HTTP client functionality, API response handling, and error scenarios
 * for npm and JSR package registry integration
 *
 * @tests_for services/registry-client.ts
 */

import { Effect } from 'effect'
import { assertEquals, assertRejects } from '@std/assert'

import {
  createNetworkError,
  detectRegistryType,
  extractPackageName,
  fetchJsrPackageInfo,
  fetchNpmPackageInfo,
  fetchPackageInfo,
} from '../../services/registry-client.ts'
import { JsrPackageInfo, NpmPackageInfo } from '../../schemas/library-cache.ts'

// Mock fetch for testing
const originalFetch = globalThis.fetch

interface MockResponse {
  status: number
  json: () => Promise<NpmPackageInfo | JsrPackageInfo | Record<string, never>>
}

function mockFetch(responses: Record<string, MockResponse>) {
  globalThis.fetch = async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString()
    const response = responses[url.toString()]
    if (!response) {
      throw new Error(`Unexpected fetch to ${url}`)
    }

    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      statusText: response.status === 404 ? 'Not Found' : 'OK',
      json: response.json,
    } as Response
  }
}

function restoreFetch() {
  globalThis.fetch = originalFetch
}

Deno.test('Network Error Creation Tests', async (t) => {
  await t.step('createNetworkError includes all fields', () => {
    const error = createNetworkError(
      new Error('Connection failed'),
      'https://example.com',
      'Test error',
      500,
    )

    assertEquals(error._tag, 'NetworkError')
    assertEquals(error.message, 'Test error')
    assertEquals(error.url, 'https://example.com')
    assertEquals(error.status, 500)
    assertEquals(error.cause instanceof Error, true)
  })

  await t.step('createNetworkError handles optional status', () => {
    const error = createNetworkError(
      'timeout',
      'https://example.com',
      'Timeout error',
    )

    assertEquals(error._tag, 'NetworkError')
    assertEquals(error.message, 'Timeout error')
    assertEquals(error.url, 'https://example.com')
    assertEquals(error.status, undefined)
  })
})

Deno.test('Registry Type Detection Tests', async (t) => {
  await t.step('detectRegistryType identifies npm prefixes', () => {
    assertEquals(detectRegistryType('npm:hono@4.0.0'), 'npm')
    assertEquals(detectRegistryType('npm:@types/node'), 'npm')
  })

  await t.step('detectRegistryType identifies jsr prefixes', () => {
    assertEquals(detectRegistryType('jsr:@std/path'), 'jsr')
    assertEquals(detectRegistryType('jsr:@effect/platform'), 'jsr')
  })

  await t.step('detectRegistryType defaults to npm for bare names', () => {
    assertEquals(detectRegistryType('hono'), 'npm')
    assertEquals(detectRegistryType('@types/node'), 'npm')
    assertEquals(detectRegistryType('effect'), 'npm')
  })
})

Deno.test('Package Name Extraction Tests', async (t) => {
  await t.step('extractPackageName handles Deno prefixes', () => {
    assertEquals(extractPackageName('npm:hono@4.0.0'), 'hono')
    assertEquals(extractPackageName('jsr:@std/path'), '@std/path')
    assertEquals(extractPackageName('npm:@types/node@18.0.0'), '@types/node')
  })

  await t.step('extractPackageName handles version specifiers', () => {
    assertEquals(extractPackageName('hono@4.0.0'), 'hono')
    assertEquals(extractPackageName('effect@3.0.0'), 'effect')
    assertEquals(extractPackageName('@types/node@18.0.0'), '@types/node')
    assertEquals(extractPackageName('@std/path@1.0.0'), '@std/path')
  })

  await t.step('extractPackageName handles bare package names', () => {
    assertEquals(extractPackageName('hono'), 'hono')
    assertEquals(extractPackageName('effect'), 'effect')
    assertEquals(extractPackageName('@types/node'), '@types/node')
    assertEquals(extractPackageName('@std/path'), '@std/path')
  })
})

Deno.test('NPM Registry Tests', async (t) => {
  await t.step('fetchNpmPackageInfo handles successful response', async () => {
    const mockResponse = {
      name: 'hono',
      version: '4.0.0',
      description: 'Web framework for the Edge',
      homepage: 'https://hono.dev',
      repository: {
        type: 'git',
        url: 'https://github.com/honojs/hono',
      },
    }

    mockFetch({
      'https://registry.npmjs.org/hono': {
        status: 200,
        json: async () => mockResponse,
      },
    })

    try {
      const result = await Effect.runPromise(fetchNpmPackageInfo('hono'))
      assertEquals(result.name, 'hono')
      assertEquals(result.version, '4.0.0')
      assertEquals(result.homepage, 'https://hono.dev')
    } finally {
      restoreFetch()
    }
  })

  await t.step('fetchNpmPackageInfo handles 404 errors', async () => {
    mockFetch({
      'https://registry.npmjs.org/nonexistent': {
        status: 404,
        json: async () => ({}),
      },
    })

    try {
      await assertRejects(
        () => Effect.runPromise(fetchNpmPackageInfo('nonexistent')),
        Error,
        "Package 'nonexistent' not found in npm registry",
      )
    } finally {
      restoreFetch()
    }
  })

  await t.step('fetchNpmPackageInfo handles network errors', async () => {
    mockFetch({
      'https://registry.npmjs.org/error-package': {
        status: 500,
        json: async () => {
          throw new Error('Server error')
        },
      },
    })

    try {
      await assertRejects(
        () => Effect.runPromise(fetchNpmPackageInfo('error-package')),
        Error,
        'Failed to fetch',
      )
    } finally {
      restoreFetch()
    }
  })
})

Deno.test('JSR Registry Tests', async (t) => {
  await t.step('fetchJsrPackageInfo handles successful response', async () => {
    const mockResponse = {
      name: 'effect',
      description: 'A TypeScript library for building resilient applications',
      homepage: 'https://effect.website',
      githubRepository: {
        owner: 'Effect-TS',
        name: 'effect',
      },
      latestVersion: '3.0.0',
    }

    mockFetch({
      'https://jsr.io/@effect': {
        status: 200,
        json: async () => mockResponse,
      },
    })

    try {
      const result = await Effect.runPromise(fetchJsrPackageInfo('effect'))
      assertEquals(result.name, 'effect')
      assertEquals(result.latestVersion, '3.0.0')
      assertEquals(result.homepage, 'https://effect.website')
    } finally {
      restoreFetch()
    }
  })

  await t.step('fetchJsrPackageInfo handles scoped packages', async () => {
    const mockResponse = {
      name: 'std/path',
      latestVersion: '1.0.0',
    }

    mockFetch({
      'https://jsr.io/@std/path': {
        status: 200,
        json: async () => mockResponse,
      },
    })

    try {
      const result = await Effect.runPromise(fetchJsrPackageInfo('@std/path'))
      assertEquals(result.name, 'std/path')
    } finally {
      restoreFetch()
    }
  })

  await t.step('fetchJsrPackageInfo handles 404 errors', async () => {
    mockFetch({
      'https://jsr.io/@nonexistent': {
        status: 404,
        json: async () => ({}),
      },
    })

    try {
      await assertRejects(
        () => Effect.runPromise(fetchJsrPackageInfo('nonexistent')),
        Error,
        "Package 'nonexistent' not found in JSR registry",
      )
    } finally {
      restoreFetch()
    }
  })
})

Deno.test('Unified Package Info Fetching Tests', async (t) => {
  await t.step('fetchPackageInfo tries npm first, falls back to JSR', async () => {
    const jsrResponse = {
      name: 'some-package',
      latestVersion: '1.0.0',
    }

    mockFetch({
      'https://registry.npmjs.org/some-package': {
        status: 404,
        json: async () => ({}),
      },
      'https://jsr.io/@some-package': {
        status: 200,
        json: async () => jsrResponse,
      },
    })

    try {
      const result = await Effect.runPromise(fetchPackageInfo('some-package'))
      assertEquals(result.registry, 'jsr')
      assertEquals(result.info.name, 'some-package')
    } finally {
      restoreFetch()
    }
  })

  await t.step('fetchPackageInfo respects npm: prefix', async () => {
    const npmResponse = {
      name: 'hono',
      version: '4.0.0',
      homepage: 'https://hono.dev',
    }

    mockFetch({
      'https://registry.npmjs.org/hono': { // Note: extractPackageName removes @4.0.0
        status: 200,
        json: async () => npmResponse,
      },
    })

    try {
      const result = await Effect.runPromise(fetchPackageInfo('npm:hono@4.0.0'))
      assertEquals(result.registry, 'npm')
      assertEquals(result.info.name, 'hono')
    } finally {
      restoreFetch()
    }
  })

  await t.step('fetchPackageInfo respects jsr: prefix', async () => {
    const jsrResponse = {
      name: 'std/path',
      latestVersion: '1.0.0',
    }

    mockFetch({
      'https://jsr.io/@std/path': {
        status: 200,
        json: async () => jsrResponse,
      },
    })

    try {
      const result = await Effect.runPromise(fetchPackageInfo('jsr:@std/path'))
      assertEquals(result.registry, 'jsr')
      assertEquals(result.info.name, 'std/path')
    } finally {
      restoreFetch()
    }
  })

  await t.step('fetchPackageInfo fails when both registries fail', async () => {
    mockFetch({
      'https://registry.npmjs.org/truly-nonexistent': {
        status: 404,
        json: async () => ({}),
      },
      'https://jsr.io/@truly-nonexistent': {
        status: 404,
        json: async () => ({}),
      },
    })

    try {
      await assertRejects(
        () => Effect.runPromise(fetchPackageInfo('truly-nonexistent')),
        Error,
        'not found',
      )
    } finally {
      restoreFetch()
    }
  })
})
