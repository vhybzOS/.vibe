/**
 * Package Detector Service Tests
 *
 * Tests manifest parsing, dependency extraction, and project validation
 * for package.json and deno.json files
 *
 * @tests_for services/package-detector.ts
 */

import { Effect } from 'effect'
import { assertEquals, assertRejects } from '@std/assert'
import { resolve } from '@std/path'
// Use native Deno APIs for test setup
async function ensureDirTest(path: string): Promise<void> {
  try {
    await Deno.mkdir(path, { recursive: true })
  } catch (error) {
    if (!(error instanceof Deno.errors.AlreadyExists)) {
      throw error
    }
  }
}

import {
  type DetectedDependency,
  detectProjectManifests,
  extractAllDependencies,
  validatePackageInProject,
} from '../../services/package-detector.ts'

// Test helper to create temporary test directories
interface ProjectFile {
  name?: string
  version?: string
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
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

  const testDir = resolve(projectRoot, 'tests', 'tmp', 'unit', testName)
  await ensureDirTest(testDir)

  for (const [filename, content] of Object.entries(files)) {
    const filePath = resolve(testDir, filename)
    await ensureDirTest(resolve(filePath, '..')) // Ensure parent directory exists
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

Deno.test('Package.json Detection Tests', async (t) => {
  await t.step('detectProjectManifests finds package.json', async () => {
    const packageJson = {
      name: 'test-project',
      version: '1.0.0',
      dependencies: {
        hono: '^4.0.0',
        zod: '^3.22.0',
      },
      devDependencies: {
        '@types/node': '^18.0.0',
      },
      peerDependencies: {
        typescript: '^5.0.0',
      },
      optionalDependencies: {
        'optional-pkg': '^1.0.0',
      },
    }

    const testDir = await createTestProject('package-json-test', {
      'package.json': packageJson,
    })

    try {
      const manifests = await Effect.runPromise(detectProjectManifests(testDir))
      assertEquals(manifests.length, 1)
      const manifest = manifests[0]!
      assertEquals(manifest.type, 'package.json')
      assertEquals(manifest.dependencies.hono, '^4.0.0')
      assertEquals(manifest.dependencies.zod, '^3.22.0')
      assertEquals(manifest.dependencies.typescript, '^5.0.0') // peer deps included
      assertEquals(manifest.dependencies['optional-pkg'], '^1.0.0') // optional deps included
      assertEquals(manifest.devDependencies['@types/node'], '^18.0.0')
    } finally {
      await cleanupTestProject(testDir)
    }
  })

  await t.step('detectProjectManifests handles missing dependency fields', async () => {
    const packageJson = {
      name: 'minimal-project',
      version: '1.0.0',
    }

    const testDir = await createTestProject('minimal-package-json', {
      'package.json': packageJson,
    })

    try {
      const manifests = await Effect.runPromise(detectProjectManifests(testDir))
      assertEquals(manifests.length, 1)
      const manifest = manifests[0]!
      assertEquals(Object.keys(manifest.dependencies).length, 0)
      assertEquals(Object.keys(manifest.devDependencies).length, 0)
    } finally {
      await cleanupTestProject(testDir)
    }
  })
})

Deno.test('Deno.json Detection Tests', async (t) => {
  await t.step('detectProjectManifests finds deno.json', async () => {
    const denoJson = {
      name: 'deno-project',
      version: '0.1.0',
      imports: {
        hono: 'npm:hono@^4.0.0',
        effect: 'npm:effect@^3.0.0',
        '@std/path': 'jsr:@std/path@^1.0.0',
        './utils.ts': './src/utils.ts', // Should be ignored
        '../config.ts': '../config.ts', // Should be ignored
      },
      dependencies: {
        zod: '^3.22.0',
      },
    }

    const testDir = await createTestProject('deno-json-test', {
      'deno.json': denoJson,
    })

    try {
      const manifests = await Effect.runPromise(detectProjectManifests(testDir))
      assertEquals(manifests.length, 1)
      const manifest = manifests[0]!
      assertEquals(manifest.type, 'deno.json')
      assertEquals(manifest.dependencies.hono, '^4.0.0') // Clean version after parsing
      assertEquals(manifest.dependencies.effect, '^3.0.0') // Clean version after parsing
      assertEquals(manifest.dependencies['@std/path'], '^1.0.0') // Clean version after parsing
      assertEquals(manifest.dependencies.zod, '^3.22.0')
      assertEquals(manifest.dependencies['./utils.ts'], undefined) // Relative imports excluded
      assertEquals(Object.keys(manifest.devDependencies).length, 0) // No dev deps in Deno
    } finally {
      await cleanupTestProject(testDir)
    }
  })

  await t.step('detectProjectManifests handles minimal deno.json', async () => {
    const denoJson = {
      name: 'minimal-deno',
    }

    const testDir = await createTestProject('minimal-deno-json', {
      'deno.json': denoJson,
    })

    try {
      const manifests = await Effect.runPromise(detectProjectManifests(testDir))
      assertEquals(manifests.length, 1)
      const manifest = manifests[0]!
      assertEquals(Object.keys(manifest.dependencies).length, 0)
    } finally {
      await cleanupTestProject(testDir)
    }
  })
})

Deno.test('Multi-Manifest Projects Tests', async (t) => {
  await t.step('detectProjectManifests finds both package.json and deno.json', async () => {
    const packageJson = {
      name: 'hybrid-project',
      dependencies: { hono: '^4.0.0' },
    }

    const denoJson = {
      name: 'hybrid-project',
      imports: { effect: 'npm:effect@^3.0.0' },
    }

    const testDir = await createTestProject('hybrid-project', {
      'package.json': packageJson,
      'deno.json': denoJson,
    })

    try {
      const manifests = await Effect.runPromise(detectProjectManifests(testDir))
      assertEquals(manifests.length, 2)

      const packageManifest = manifests.find((m) => m.type === 'package.json')
      const denoManifest = manifests.find((m) => m.type === 'deno.json')

      assertEquals(packageManifest?.dependencies.hono, '^4.0.0')
      assertEquals(denoManifest?.dependencies.effect, '^3.0.0') // Clean version after parsing
    } finally {
      await cleanupTestProject(testDir)
    }
  })

  await t.step('detectProjectManifests fails when no manifests found', async () => {
    const testDir = await createTestProject('empty-project', {})

    try {
      await assertRejects(
        () => Effect.runPromise(detectProjectManifests(testDir)),
        Error,
        'No package.json or deno.json found',
      )
    } finally {
      await cleanupTestProject(testDir)
    }
  })
})

Deno.test('Dependency Extraction Tests', async (t) => {
  await t.step('extractAllDependencies combines all dependencies', async () => {
    const packageManifest = {
      type: 'package.json' as const,
      path: '/test/package.json',
      dependencies: { hono: '^4.0.0', zod: '^3.22.0' },
      devDependencies: { '@types/node': '^18.0.0' },
    }

    const denoManifest = {
      type: 'deno.json' as const,
      path: '/test/deno.json',
      dependencies: { effect: '^3.0.0' }, // Already parsed by parseDenoJson
      devDependencies: {},
    }

    const dependencies = extractAllDependencies([packageManifest, denoManifest])

    assertEquals(dependencies.length, 4)

    const hono = dependencies.find((d) => d.name === 'hono')
    const zod = dependencies.find((d) => d.name === 'zod')
    const types = dependencies.find((d) => d.name === '@types/node')
    const effect = dependencies.find((d) => d.name === 'effect')

    assertEquals(hono?.type, 'production')
    assertEquals(hono?.source, '/test/package.json')
    assertEquals(zod?.version, '^3.22.0')
    assertEquals(types?.type, 'development')
    assertEquals(effect?.originalSpec, 'effect@^3.0.0') // Reconstructed from clean data
    assertEquals(effect?.registry, 'npm') // Default registry
    assertEquals(effect?.source, '/test/deno.json')
  })

  await t.step('extractAllDependencies handles empty manifests', () => {
    const dependencies = extractAllDependencies([])
    assertEquals(dependencies.length, 0)
  })
})

Deno.test('Package Validation Tests', async (t) => {
  await t.step('validatePackageInProject finds existing package', async () => {
    const packageJson = {
      name: 'test-project',
      dependencies: {
        hono: '^4.0.0',
        zod: '^3.22.0',
      },
    }

    const testDir = await createTestProject('validation-test', {
      'package.json': packageJson,
    })

    try {
      const dependency = await Effect.runPromise(
        validatePackageInProject('hono', testDir),
      )

      assertEquals(dependency.name, 'hono')
      assertEquals(dependency.version, '^4.0.0')
      assertEquals(dependency.type, 'production')
      assertEquals(dependency.originalSpec, 'hono@^4.0.0')
    } finally {
      await cleanupTestProject(testDir)
    }
  })

  await t.step('validatePackageInProject fails for missing package', async () => {
    const packageJson = {
      name: 'test-project',
      dependencies: { hono: '^4.0.0' },
    }

    const testDir = await createTestProject('validation-missing-test', {
      'package.json': packageJson,
    })

    try {
      await assertRejects(
        () => Effect.runPromise(validatePackageInProject('nonexistent', testDir)),
        Error,
        "Package 'nonexistent' not found in project dependencies",
      )
    } finally {
      await cleanupTestProject(testDir)
    }
  })

  await t.step('validatePackageInProject provides helpful error with available packages', async () => {
    const packageJson = {
      name: 'test-project',
      dependencies: { hono: '^4.0.0', zod: '^3.22.0' },
    }

    const testDir = await createTestProject('validation-helpful-test', {
      'package.json': packageJson,
    })

    try {
      await assertRejects(
        () => Effect.runPromise(validatePackageInProject('effect', testDir)),
        Error,
        'Available packages: hono, zod',
      )
    } finally {
      await cleanupTestProject(testDir)
    }
  })

  await t.step('validatePackageInProject handles complex Deno specs', async () => {
    const denoJson = {
      imports: {
        effect: 'npm:effect@^3.0.0',
        '@std/path': 'jsr:@std/path@^1.0.0',
      },
    }

    const testDir = await createTestProject('validation-deno-test', {
      'deno.json': denoJson,
    })

    try {
      const effectDep = await Effect.runPromise(
        validatePackageInProject('effect', testDir),
      )
      const stdDep = await Effect.runPromise(
        validatePackageInProject('@std/path', testDir),
      )

      assertEquals(effectDep.name, 'effect')
      assertEquals(effectDep.originalSpec, 'effect@^3.0.0') // Reconstructed from clean data
      assertEquals(effectDep.registry, 'npm') // Default registry for now
      assertEquals(stdDep.name, '@std/path')
      assertEquals(stdDep.originalSpec, '@std/path@^1.0.0') // Reconstructed from clean data
      assertEquals(stdDep.registry, 'npm') // Default registry for now (would be corrected by registry client)
    } finally {
      await cleanupTestProject(testDir)
    }
  })
})
