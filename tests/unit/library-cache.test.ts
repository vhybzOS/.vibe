/**
 * Library Cache Schema Tests
 *
 * Validates schema structure, TOML serialization, and type safety
 * for library documentation cache functionality
 *
 * @tests_for schemas/library-cache.ts
 * @tests_for services/library-cache.ts
 */

import { Effect } from 'effect'
import { assertEquals, assertExists, assertThrows } from '@std/assert'
import { parse as parseToml, stringify as stringifyToml } from '@std/toml'

import {
  createEmptyLibraryCacheIndex,
  createLibraryMetadata,
  discoverLibraryDomain,
  extractApexDomain,
  JsrPackageInfoSchema,
  LibraryCacheIndexSchema,
  LibraryMetadataSchema,
  NpmPackageInfoSchema,
} from '../../schemas/library-cache.ts'

Deno.test('Library Cache Schema Tests', async (t) => {
  await t.step('LibraryMetadataSchema validates correct data', () => {
    const validMetadata = {
      name: 'hono',
      version: '4.0.0',
      domain: 'hono.dev',
      registry: 'npm' as const,
      docs_file: 'docs/hono/README.md',
      fetch_status: 'success' as const,
      capabilities: ['routing', 'middleware'],
      extraction_confidence: 'high' as const,
    }

    const result = LibraryMetadataSchema.parse(validMetadata)
    assertEquals(result.name, 'hono')
    assertEquals(result.version, '4.0.0')
    assertEquals(result.domain, 'hono.dev')
    assertEquals(result.capabilities.length, 2)
  })

  await t.step('LibraryMetadataSchema applies defaults', () => {
    const minimalMetadata = {
      name: 'effect',
      version: '3.0.0',
      domain: 'effect.website',
      registry: 'npm' as const,
      docs_file: 'docs/effect/README.md',
    }

    const result = LibraryMetadataSchema.parse(minimalMetadata)
    assertEquals(result.fetch_status, 'pending')
    assertEquals(result.capabilities, [])
    assertEquals(result.extraction_confidence, 'none')
  })

  await t.step('LibraryCacheIndexSchema validates TOML structure', () => {
    const validIndex = {
      meta: {
        version: '1.0.0',
        last_scan: '2024-06-19T10:00:00Z',
        library_count: 2,
        docs_found: 1,
        extraction_enabled: false,
      },
      libraries: {
        hono: {
          name: 'hono',
          version: '4.0.0',
          domain: 'hono.dev',
          registry: 'npm' as const,
          docs_file: 'docs/hono/README.md',
        },
      },
      mappings: {},
    }

    const result = LibraryCacheIndexSchema.parse(validIndex)
    assertEquals(result.meta.library_count, 2)
    assertEquals(result.libraries.hono?.name, 'hono')
    assertExists(result.mappings)
  })

  await t.step('TOML serialization roundtrip works', () => {
    const index = createEmptyLibraryCacheIndex()
    const tomlString = stringifyToml(index)
    const parsed = parseToml(tomlString)
    const validated = LibraryCacheIndexSchema.parse(parsed)

    assertEquals(validated.meta.version, '1.0.0')
    assertEquals(validated.meta.library_count, 0)
    assertEquals(validated.meta.docs_found, 0)
  })
})

Deno.test('Helper Functions Tests', async (t) => {
  await t.step('createLibraryMetadata creates valid metadata', () => {
    const metadata = createLibraryMetadata(
      'zod',
      '3.22.0',
      'zod.dev',
      'npm',
      'docs/zod/README.md',
      { homepage: 'https://zod.dev' },
    )

    assertEquals(metadata.name, 'zod')
    assertEquals(metadata.version, '3.22.0')
    assertEquals(metadata.domain, 'zod.dev')
    assertEquals(metadata.registry, 'npm')
    assertEquals(metadata.homepage, 'https://zod.dev')
    assertEquals(metadata.fetch_status, 'pending')
  })

  await t.step('createEmptyLibraryCacheIndex creates valid structure', () => {
    const index = createEmptyLibraryCacheIndex()

    assertEquals(index.meta.version, '1.0.0')
    assertEquals(index.meta.library_count, 0)
    assertEquals(index.meta.docs_found, 0)
    assertEquals(index.meta.extraction_enabled, false)
    assertEquals(Object.keys(index.libraries).length, 0)
    assertEquals(Object.keys(index.mappings).length, 0)
    assertExists(index.meta.last_scan)
  })

  await t.step('extractApexDomain handles various URL formats', () => {
    assertEquals(extractApexDomain('https://hono.dev'), 'hono.dev')
    assertEquals(extractApexDomain('https://www.zod.dev/docs'), 'zod.dev')
    assertEquals(extractApexDomain('http://effect.website/guide'), 'effect.website')
    assertEquals(extractApexDomain('https://github.com/honojs/hono'), 'github.com')

    // Handles invalid URLs gracefully
    assertEquals(extractApexDomain('not-a-url'), 'not-a-url')
  })

  await t.step('discoverLibraryDomain extracts domains from package info', () => {
    const npmPackage = {
      name: 'hono',
      version: '4.0.0',
      homepage: 'https://hono.dev',
    }
    assertEquals(discoverLibraryDomain(npmPackage), 'hono.dev')

    const jsrPackage = {
      name: 'effect',
      latestVersion: '3.0.0',
      githubRepository: { owner: 'Effect-TS', name: 'effect' },
    }
    assertEquals(discoverLibraryDomain(jsrPackage), 'effect.dev')

    const npmWithRepo = {
      name: 'zod',
      version: '3.22.0',
      repository: {
        type: 'git',
        url: 'https://github.com/colinhacks/zod',
      },
    }
    assertEquals(discoverLibraryDomain(npmWithRepo), 'zod.dev')

    const noHomepage = {
      name: 'unknown',
      version: '1.0.0',
    }
    assertEquals(discoverLibraryDomain(noHomepage), null)
  })
})

Deno.test('Package Info Schema Tests', async (t) => {
  await t.step('NpmPackageInfoSchema validates npm API responses', () => {
    const npmResponse = {
      name: 'hono',
      version: '4.0.0',
      description: 'Web framework for the Edge',
      homepage: 'https://hono.dev',
      repository: {
        type: 'git',
        url: 'https://github.com/honojs/hono',
      },
      versions: { '4.0.0': {} },
    }

    const result = NpmPackageInfoSchema.parse(npmResponse)
    assertEquals(result.name, 'hono')
    assertEquals(result.homepage, 'https://hono.dev')
    assertExists(result.repository)
  })

  await t.step('JsrPackageInfoSchema validates JSR API responses', () => {
    const jsrResponse = {
      name: 'effect',
      description: 'A TypeScript library for building resilient and scalable applications',
      homepage: 'https://effect.website',
      githubRepository: {
        owner: 'Effect-TS',
        name: 'effect',
      },
      latestVersion: '3.0.0',
    }

    const result = JsrPackageInfoSchema.parse(jsrResponse)
    assertEquals(result.name, 'effect')
    assertEquals(result.latestVersion, '3.0.0')
    assertEquals(result.githubRepository?.owner, 'Effect-TS')
  })

  await t.step('Schema validation fails for invalid data', () => {
    assertThrows(
      () => LibraryMetadataSchema.parse({ name: '' }), // Empty name
      Error,
    )

    assertThrows(
      () => LibraryCacheIndexSchema.parse({ meta: {} }), // Missing required fields
      Error,
    )

    assertThrows(
      () => NpmPackageInfoSchema.parse({ version: '1.0.0' }), // Missing name
      Error,
    )
  })
})
