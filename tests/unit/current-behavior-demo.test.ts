/**
 * Current Broken Behavior Demonstration
 *
 * Tests to demonstrate that current extractAllDependencies doesn't work with Deno imports
 */

import { assertEquals, assertExists } from '@std/assert'
import { extractAllDependencies } from '../../services/package-detector.ts'

Deno.test('Current Broken Behavior - Deno Import Detection', async (t) => {
  await t.step('extractAllDependencies processes Deno manifest dependencies', async () => {
    // Simulate what parseDenoJson produces for our actual deno.json
    const denoManifest = {
      type: 'deno.json' as const,
      path: '/test/deno.json',
      dependencies: {
        // These are what parseDenoJson extracts from our imports
        'effect': '^3.16.7', // from npm:effect@3.16.7
        'commander': '^12.1.0', // from npm:commander@12.1.0
        '@std/path': '^1.0.8', // from jsr:@std/path@^1.0.8
        'zod': '^3.25.66', // from npm:zod@3.25.66 (mapped as zod/v4)
      },
      devDependencies: {},
    }

    console.log('Testing with Deno manifest:', denoManifest)

    const dependencies = extractAllDependencies([denoManifest])

    console.log('Current implementation found:', dependencies.length, 'dependencies')
    console.log('Dependencies found:')
    dependencies.forEach((dep) => {
      console.log(`  - ${dep.name}@${dep.version} (${dep.registry}, ${dep.type})`)
    })

    // This should find 4 dependencies from our Deno manifest
    assertEquals(dependencies.length, 4)

    // Check specific dependencies are found
    const effectDep = dependencies.find((d) => d.name === 'effect')
    assertExists(effectDep, 'Should find effect dependency')
    assertEquals(effectDep!.version, '^3.16.7')

    const stdPathDep = dependencies.find((d) => d.name === '@std/path')
    assertExists(stdPathDep, 'Should find @std/path dependency')
    assertEquals(stdPathDep!.version, '^1.0.8')

    // The problem we expect to find: all registries default to 'npm'
    const registries = [...new Set(dependencies.map((d) => d.registry))]
    console.log('Registries detected:', registries)
    // This shows the bug - should have both 'npm' and 'jsr' but will only show 'npm'
  })

  await t.step('extractAllDependencies ignores missing dependency types', async () => {
    // Test with package.json that has peer and optional dependencies
    const packageManifest = {
      type: 'package.json' as const,
      path: '/test/package.json',
      dependencies: { express: '^4.18.0' },
      devDependencies: { typescript: '^5.0.0' },
      peerDependencies: { react: '^18.0.0' }, // This should be ignored by current impl
      optionalDependencies: { 'optional-pkg': '^1.0.0' }, // This should be ignored by current impl
    }

    const dependencies = extractAllDependencies([packageManifest])

    console.log('Package.json dependencies found:', dependencies.length)
    console.log('Types found:', dependencies.map((d) => d.type))

    // Current implementation only handles dependencies and devDependencies
    assertEquals(dependencies.length, 2) // Should be 4 if it handled all types

    const types = [...new Set(dependencies.map((d) => d.type))]
    assertEquals(types.sort(), ['development', 'production']) // Missing 'peer' and 'optional'
  })
})
