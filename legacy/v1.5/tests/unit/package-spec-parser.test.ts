/**
 * Package Specification Parser Tests
 *
 * Tests for parsePackageSpec function that handles structured parsing
 * of package specifications from various registries and formats
 *
 * @tests_for services/registry-client.ts (parsePackageSpec function)
 */

import { assertEquals } from '@std/assert'

import { extractPackageName, type ParsedPackageSpec, parsePackageSpec } from '../../services/registry-client.ts'

Deno.test('Package Spec Parser Tests', async (t) => {
  await t.step('parsePackageSpec handles npm packages', () => {
    const tests = [
      {
        input: 'npm:hono@^4.0.0',
        expected: {
          registry: 'npm' as const,
          name: 'hono',
          version: '^4.0.0',
          originalSpec: 'npm:hono@^4.0.0',
        },
      },
      {
        input: 'npm:@types/node@^18.0.0',
        expected: {
          registry: 'npm' as const,
          name: '@types/node',
          version: '^18.0.0',
          originalSpec: 'npm:@types/node@^18.0.0',
        },
      },
      {
        input: 'npm:hono',
        expected: {
          registry: 'npm' as const,
          name: 'hono',
          version: 'latest',
          originalSpec: 'npm:hono',
        },
      },
    ]

    for (const test of tests) {
      const result = parsePackageSpec(test.input)
      assertEquals(result, test.expected)
    }
  })

  await t.step('parsePackageSpec handles JSR packages', () => {
    const tests = [
      {
        input: 'jsr:@std/path@^1.0.0',
        expected: {
          registry: 'jsr' as const,
          name: '@std/path',
          version: '^1.0.0',
          originalSpec: 'jsr:@std/path@^1.0.0',
        },
      },
      {
        input: 'jsr:@effect/platform@^0.66.0',
        expected: {
          registry: 'jsr' as const,
          name: '@effect/platform',
          version: '^0.66.0',
          originalSpec: 'jsr:@effect/platform@^0.66.0',
        },
      },
      {
        input: 'jsr:@std/path',
        expected: {
          registry: 'jsr' as const,
          name: '@std/path',
          version: 'latest',
          originalSpec: 'jsr:@std/path',
        },
      },
    ]

    for (const test of tests) {
      const result = parsePackageSpec(test.input)
      assertEquals(result, test.expected)
    }
  })

  await t.step('parsePackageSpec handles bare package names (defaults to npm)', () => {
    const tests = [
      {
        input: 'hono@^4.0.0',
        expected: {
          registry: 'npm' as const,
          name: 'hono',
          version: '^4.0.0',
          originalSpec: 'hono@^4.0.0',
        },
      },
      {
        input: '@types/node@^18.0.0',
        expected: {
          registry: 'npm' as const,
          name: '@types/node',
          version: '^18.0.0',
          originalSpec: '@types/node@^18.0.0',
        },
      },
      {
        input: 'effect',
        expected: {
          registry: 'npm' as const,
          name: 'effect',
          version: 'latest',
          originalSpec: 'effect',
        },
      },
      {
        input: '@types/node',
        expected: {
          registry: 'npm' as const,
          name: '@types/node',
          version: 'latest',
          originalSpec: '@types/node',
        },
      },
    ]

    for (const test of tests) {
      const result = parsePackageSpec(test.input)
      assertEquals(result, test.expected)
    }
  })

  await t.step('parsePackageSpec handles complex version specifiers', () => {
    const tests = [
      {
        input: 'hono@~4.0.0',
        expected: {
          registry: 'npm' as const,
          name: 'hono',
          version: '~4.0.0',
          originalSpec: 'hono@~4.0.0',
        },
      },
      {
        input: 'npm:effect@>=3.0.0 <4.0.0',
        expected: {
          registry: 'npm' as const,
          name: 'effect',
          version: '>=3.0.0 <4.0.0',
          originalSpec: 'npm:effect@>=3.0.0 <4.0.0',
        },
      },
      {
        input: 'jsr:@std/path@1.0.0-beta.1',
        expected: {
          registry: 'jsr' as const,
          name: '@std/path',
          version: '1.0.0-beta.1',
          originalSpec: 'jsr:@std/path@1.0.0-beta.1',
        },
      },
    ]

    for (const test of tests) {
      const result = parsePackageSpec(test.input)
      assertEquals(result, test.expected)
    }
  })

  await t.step('parsePackageSpec handles edge cases', () => {
    const tests = [
      {
        input: '',
        expected: {
          registry: 'npm' as const,
          name: '',
          version: 'latest',
          originalSpec: '',
        },
      },
      {
        input: '@',
        expected: {
          registry: 'npm' as const,
          name: '@',
          version: 'latest',
          originalSpec: '@',
        },
      },
      {
        input: 'npm:',
        expected: {
          registry: 'npm' as const,
          name: '',
          version: 'latest',
          originalSpec: 'npm:',
        },
      },
      {
        input: 'package-with-dashes@1.0.0',
        expected: {
          registry: 'npm' as const,
          name: 'package-with-dashes',
          version: '1.0.0',
          originalSpec: 'package-with-dashes@1.0.0',
        },
      },
    ]

    for (const test of tests) {
      const result = parsePackageSpec(test.input)
      assertEquals(result, test.expected)
    }
  })

  await t.step('extractPackageName provides legacy compatibility', () => {
    const tests = [
      { input: 'npm:hono@^4.0.0', expected: 'hono' },
      { input: 'jsr:@std/path@^1.0.0', expected: '@std/path' },
      { input: '@types/node@^18.0.0', expected: '@types/node' },
      { input: 'effect', expected: 'effect' },
    ]

    for (const test of tests) {
      const result = extractPackageName(test.input)
      assertEquals(result, test.expected)
    }
  })

  await t.step('parsePackageSpec structure validation', () => {
    const result = parsePackageSpec('npm:hono@^4.0.0')

    // Verify all required fields exist
    assertEquals(typeof result.registry, 'string')
    assertEquals(typeof result.name, 'string')
    assertEquals(typeof result.version, 'string')
    assertEquals(typeof result.originalSpec, 'string')

    // Verify registry is valid enum value
    const validRegistries = ['npm', 'jsr', 'deno']
    assertEquals(validRegistries.includes(result.registry), true)

    // Verify originalSpec is preserved
    assertEquals(result.originalSpec, 'npm:hono@^4.0.0')
  })
})
