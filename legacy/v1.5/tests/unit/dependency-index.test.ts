/**
 * Dependency Index Schema Tests
 *
 * Tests for ure/schemas/dependency-index.ts
 * Validates dependency metadata schema, manifest schema, and URL patterns
 */

import { assertEquals, assertThrows } from '@std/assert'
import {
  createDependencyMetadata,
  createEmptyDependencyIndex,
  type DependencyIndex,
  DependencyIndexSchema,
  type DependencyMetadata,
  DependencyMetadataSchema,
  LLMS_TXT_PATTERNS,
  ManifestSchema,
  type PackageRegistry,
  PackageRegistrySchema,
} from '../../ure/schemas/dependency-index.ts'

Deno.test('Dependency Index - DependencyMetadataSchema - valid dependency', () => {
  const validDep = {
    name: 'hono',
    version: '4.2.5',
    registry: 'npm' as const,
    homepage: 'https://hono.dev',
    docs_file: 'docs/hono.md',
    llms_txt_url: 'https://hono.dev/llms.txt',
    last_fetched: '2024-01-15T10:00:00Z',
    fetch_status: 'success' as const,
    rules_generated: ['hono_routing', 'hono_middleware'],
    extraction_level: 'fine_grained' as const,
  }

  const result = DependencyMetadataSchema.parse(validDep)
  assertEquals(result.name, 'hono')
  assertEquals(result.version, '4.2.5')
  assertEquals(result.registry, 'npm')
  assertEquals(result.homepage, 'https://hono.dev')
  assertEquals(result.docs_file, 'docs/hono.md')
  assertEquals(result.llms_txt_url, 'https://hono.dev/llms.txt')
  assertEquals(result.fetch_status, 'success')
  assertEquals(result.rules_generated, ['hono_routing', 'hono_middleware'])
  assertEquals(result.extraction_level, 'fine_grained')
})

Deno.test('Dependency Index - DependencyMetadataSchema - minimal valid dependency', () => {
  const minimalDep = {
    name: 'zod',
    version: '3.25.66',
    registry: 'npm' as const,
    docs_file: 'docs/zod.md',
  }

  const result = DependencyMetadataSchema.parse(minimalDep)
  assertEquals(result.name, 'zod')
  assertEquals(result.version, '3.25.66')
  assertEquals(result.registry, 'npm')
  assertEquals(result.docs_file, 'docs/zod.md')
  assertEquals(result.fetch_status, 'pending') // default
  assertEquals(result.rules_generated, []) // default
  assertEquals(result.extraction_level, 'basic') // default
})

Deno.test('Dependency Index - DependencyMetadataSchema - invalid registry', () => {
  const invalidDep = {
    name: 'test-package',
    version: '1.0.0',
    registry: 'invalid-registry',
    docs_file: 'docs/test.md',
  }

  assertThrows(
    () => DependencyMetadataSchema.parse(invalidDep),
    Error,
    'Invalid enum value',
  )
})

Deno.test('Dependency Index - DependencyMetadataSchema - invalid URL format', () => {
  const invalidDep = {
    name: 'test-package',
    version: '1.0.0',
    registry: 'npm' as const,
    docs_file: 'docs/test.md',
    homepage: 'not-a-valid-url',
  }

  assertThrows(
    () => DependencyMetadataSchema.parse(invalidDep),
    Error,
    'Invalid url',
  )
})

Deno.test('Dependency Index - DependencyIndexSchema - valid complete index', () => {
  const validIndex = {
    meta: {
      version: '1.0.0',
      last_scan: '2024-01-15T10:30:00Z',
      dependency_count: 2,
      llms_docs_found: 1,
      extraction_enabled: true,
    },
    dependencies: {
      'hono': {
        name: 'hono',
        version: '4.2.5',
        registry: 'npm' as const,
        docs_file: 'docs/hono.md',
        fetch_status: 'success' as const,
        rules_generated: [],
        extraction_level: 'basic' as const,
      },
      'effect': {
        name: 'effect',
        version: '3.16.7',
        registry: 'npm' as const,
        docs_file: 'docs/effect.md',
        fetch_status: 'failed' as const,
        rules_generated: [],
        extraction_level: 'basic' as const,
      },
    },
  }

  const result = DependencyIndexSchema.parse(validIndex)
  assertEquals(result.meta.dependency_count, 2)
  assertEquals(result.meta.llms_docs_found, 1)
  assertEquals(result.meta.extraction_enabled, true)
  assertEquals(Object.keys(result.dependencies).length, 2)
  assertEquals(result.dependencies.hono?.name, 'hono')
  assertEquals(result.dependencies.effect?.fetch_status, 'failed')
})

Deno.test('Dependency Index - DependencyIndexSchema - empty dependencies', () => {
  const emptyIndex = {
    meta: {
      version: '1.0.0',
      last_scan: '2024-01-15T10:30:00Z',
      dependency_count: 0,
      llms_docs_found: 0,
      extraction_enabled: false,
    },
    dependencies: {},
  }

  const result = DependencyIndexSchema.parse(emptyIndex)
  assertEquals(result.meta.dependency_count, 0)
  assertEquals(result.meta.llms_docs_found, 0)
  assertEquals(result.meta.extraction_enabled, false)
  assertEquals(Object.keys(result.dependencies).length, 0)
})

Deno.test('Dependency Index - ManifestSchema - package.json manifest', () => {
  const packageManifest = {
    type: 'package.json' as const,
    path: './package.json',
    dependencies: {
      'hono': '^4.2.5',
      'effect': '^3.16.7',
    },
    devDependencies: {
      'typescript': '^5.0.0',
      '@types/node': '^20.0.0',
    },
  }

  const result = ManifestSchema.parse(packageManifest)
  assertEquals(result.type, 'package.json')
  assertEquals(result.path, './package.json')
  assertEquals(result.dependencies.hono, '^4.2.5')
  assertEquals(result.devDependencies?.typescript, '^5.0.0')
})

Deno.test('Dependency Index - ManifestSchema - deno.json manifest', () => {
  const denoManifest = {
    type: 'deno.json' as const,
    path: './deno.json',
    dependencies: {
      'effect': 'npm:effect@3.16.7',
      'zod/v4': 'npm:zod@3.25.66',
    },
  }

  const result = ManifestSchema.parse(denoManifest)
  assertEquals(result.type, 'deno.json')
  assertEquals(result.dependencies.effect, 'npm:effect@3.16.7')
  assertEquals(result.devDependencies, {}) // default
})

Deno.test('Dependency Index - ManifestSchema - invalid manifest type', () => {
  const invalidManifest = {
    type: 'invalid.json',
    path: './invalid.json',
    dependencies: {},
  }

  assertThrows(
    () => ManifestSchema.parse(invalidManifest),
    Error,
    'Invalid enum value',
  )
})

Deno.test('Dependency Index - PackageRegistrySchema - all valid registries', () => {
  const validRegistries = [
    'npm',
    'pypi',
    'crates',
    'go',
    'rubygems',
    'maven',
    'nuget',
    'composer',
    'hex',
    'pub',
    'deno',
  ]

  for (const registry of validRegistries) {
    const result = PackageRegistrySchema.parse(registry)
    assertEquals(result, registry)
  }
})

Deno.test('Dependency Index - createDependencyMetadata helper - with options', () => {
  const result = createDependencyMetadata(
    'hono',
    '4.2.5',
    'npm',
    'docs/hono.md',
    {
      homepage: 'https://hono.dev',
      llms_txt_url: 'https://hono.dev/llms.txt',
      fetch_status: 'success',
      rules_generated: ['hono_routing'],
      extraction_level: 'fine_grained',
    },
  )

  assertEquals(result.name, 'hono')
  assertEquals(result.version, '4.2.5')
  assertEquals(result.registry, 'npm')
  assertEquals(result.docs_file, 'docs/hono.md')
  assertEquals(result.homepage, 'https://hono.dev')
  assertEquals(result.fetch_status, 'success')
  assertEquals(result.extraction_level, 'fine_grained')
})

Deno.test('Dependency Index - createDependencyMetadata helper - minimal options', () => {
  const result = createDependencyMetadata(
    'zod',
    '3.25.66',
    'npm',
    'docs/zod.md',
  )

  assertEquals(result.name, 'zod')
  assertEquals(result.version, '3.25.66')
  assertEquals(result.registry, 'npm')
  assertEquals(result.docs_file, 'docs/zod.md')
  assertEquals(result.fetch_status, 'pending') // default
  assertEquals(result.rules_generated, []) // default
  assertEquals(result.extraction_level, 'basic') // default
})

Deno.test('Dependency Index - createEmptyDependencyIndex helper', () => {
  const result = createEmptyDependencyIndex()

  assertEquals(result.meta.version, '1.0.0')
  assertEquals(result.meta.dependency_count, 0)
  assertEquals(result.meta.llms_docs_found, 0)
  assertEquals(result.meta.extraction_enabled, false)
  assertEquals(Object.keys(result.dependencies).length, 0)

  // Should have generated ISO date string
  assertEquals(typeof result.meta.last_scan, 'string')
  assertEquals(result.meta.last_scan.includes('T'), true)
  assertEquals(result.meta.last_scan.includes('Z'), true)
})

Deno.test('Dependency Index - LLMS_TXT_PATTERNS - npm patterns', () => {
  const patterns = LLMS_TXT_PATTERNS.npm('hono')

  assertEquals(patterns.length, 3)
  assertEquals(patterns[0], 'https://www.npmjs.com/package/hono/llms.txt')
  assertEquals(patterns[1], 'https://hono.dev/llms.txt')
  assertEquals(patterns[2], 'https://hono.js.org/llms.txt')
})

Deno.test('Dependency Index - LLMS_TXT_PATTERNS - deno patterns', () => {
  const patterns = LLMS_TXT_PATTERNS.deno('oak')

  assertEquals(patterns.length, 2)
  assertEquals(patterns[0], 'https://deno.land/x/oak/llms.txt')
  assertEquals(patterns[1], 'https://jsr.io/@oak/oak/llms.txt')
})

Deno.test('Dependency Index - LLMS_TXT_PATTERNS - scoped npm package', () => {
  const patterns = LLMS_TXT_PATTERNS.npm('@scope/package')

  assertEquals(patterns.length, 3)
  assertEquals(patterns[0], 'https://www.npmjs.com/package/@scope/package/llms.txt')
  assertEquals(patterns[1], 'https://@scope/package.dev/llms.txt')
  assertEquals(patterns[2], 'https://@scope/package.js.org/llms.txt')
})

Deno.test('Dependency Index - LLMS_TXT_PATTERNS - pypi patterns', () => {
  const patterns = LLMS_TXT_PATTERNS.pypi('fastapi')

  assertEquals(patterns.length, 2)
  assertEquals(patterns[0], 'https://pypi.org/project/fastapi/llms.txt')
  assertEquals(patterns[1], 'https://fastapi.readthedocs.io/llms.txt')
})

Deno.test('Dependency Index - LLMS_TXT_PATTERNS - crates patterns', () => {
  const patterns = LLMS_TXT_PATTERNS.crates('serde')

  assertEquals(patterns.length, 2)
  assertEquals(patterns[0], 'https://crates.io/crates/serde/llms.txt')
  assertEquals(patterns[1], 'https://docs.rs/serde/llms.txt')
})

Deno.test('Dependency Index - LLMS_TXT_PATTERNS - go patterns', () => {
  const patterns = LLMS_TXT_PATTERNS.go('github.com/gin-gonic/gin')

  assertEquals(patterns.length, 2)
  assertEquals(patterns[0], 'https://pkg.go.dev/github.com/gin-gonic/gin/llms.txt')
  assertEquals(patterns[1], 'https://github.com/gin-gonic/gin/llms.txt')
})
