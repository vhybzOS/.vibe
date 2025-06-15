import { assertEquals, assertExists, assert } from 'jsr:@std/assert'
import { describe, it, beforeEach, afterEach } from 'jsr:@std/testing/bdd'
import { Effect } from 'effect'
import { NpmRegistryFetcher } from '../../discovery/registries/npm.ts'
import { npmManifestParser } from '../../discovery/manifests/npm.ts'

describe('🔍 Discovery Unit Tests', () => {
  describe('📦 NPM Registry Fetcher', () => {
    let fetcher: NpmRegistryFetcher

    beforeEach(() => {
      fetcher = new NpmRegistryFetcher()
    })

    it('should identify supported package types', () => {
      assertEquals(fetcher.canFetch('react', 'npm'), true)
      assertEquals(fetcher.canFetch('react', 'node'), true)
      assertEquals(fetcher.canFetch('react', 'pypi'), false)
    })

    it('should generate correct cache keys', () => {
      const cacheKey = fetcher.getCacheKey('react', '18.0.0')
      assertEquals(cacheKey, 'npm:react:18.0.0')
    })

    it('should handle package metadata with mocked fetch', async () => {
      // Mock fetch to return sample npm registry data
      const originalFetch = globalThis.fetch
      globalThis.fetch = () => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          'dist-tags': { latest: '18.2.0' },
          versions: {
            '18.2.0': {
              name: 'react',
              version: '18.2.0',
              description: 'React is a JavaScript library for building user interfaces.',
              repository: { type: 'git', url: 'https://github.com/facebook/react.git' },
              keywords: ['react', 'ui', 'frontend'],
              license: 'MIT',
              maintainers: [{ name: 'reactjs', email: 'hello@reactjs.org' }],
              dependencies: {},
              engines: { node: '>=14' }
            }
          },
          time: {
            '18.2.0': '2023-06-15T10:30:00.000Z'
          }
        })
      } as any)

      try {
        const result = await Effect.runPromise(
          fetcher.fetchPackageMetadata('react', '18.2.0')
        )

        assertExists(result)
        assertEquals(result.name, 'react')
        assertEquals(result.version, '18.2.0')
        assertEquals(result.description, 'React is a JavaScript library for building user interfaces.')
        assertEquals(result.license, 'MIT')
        assert(Array.isArray(result.keywords))
        assert(result.keywords!.includes('react'))
        assertExists(result.repository)
        assertEquals(result.repository!.type, 'git')
        assertEquals(result.repository!.url, 'https://github.com/facebook/react.git')
      } finally {
        globalThis.fetch = originalFetch
      }
    })

    it('should discover framework rules for React', async () => {
      const mockMetadata = {
        name: 'react',
        version: '18.2.0',
        description: 'React is a JavaScript library for building user interfaces.',
        framework: 'react',
        keywords: ['react', 'ui', 'frontend'],
        publishedAt: '2023-06-15T10:30:00.000Z'
      }

      const rules = await Effect.runPromise(
        fetcher.discoverRules(mockMetadata)
      )

      assert(rules.length > 0)
      
      // Should have at least React-specific rules
      const reactRule = rules.find(rule => rule.name.includes('React'))
      assertExists(reactRule)
      assertEquals(reactRule.framework, 'react')
      assertEquals(reactRule.category, 'framework')
      assert(reactRule.confidence >= 0.8)
      assert(reactRule.content.markdown.includes('React'))
      assert(reactRule.targeting.frameworks.includes('react'))
    })

    it('should discover testing rules for testing libraries', async () => {
      const mockMetadata = {
        name: 'jest',
        version: '29.0.0',
        description: 'JavaScript testing framework',
        keywords: ['test', 'testing', 'jest'],
        publishedAt: '2023-06-15T10:30:00.000Z'
      }

      const rules = await Effect.runPromise(
        fetcher.discoverRules(mockMetadata)
      )

      const testingRule = rules.find(rule => rule.category === 'testing')
      assertExists(testingRule)
      assertEquals(testingRule.packageName, 'jest')
      assert(testingRule.name.includes('Testing'))
      assert(testingRule.content.tags.includes('testing'))
      assert(testingRule.targeting.contexts.includes('testing'))
    })

    it('should discover build tool rules', async () => {
      const mockMetadata = {
        name: 'webpack',
        version: '5.0.0',
        description: 'A bundler for javascript and friends',
        keywords: ['bundler', 'webpack', 'build'],
        publishedAt: '2023-06-15T10:30:00.000Z'
      }

      const rules = await Effect.runPromise(
        fetcher.discoverRules(mockMetadata)
      )

      const buildRule = rules.find(rule => rule.category === 'build')
      assertExists(buildRule)
      assertEquals(buildRule.packageName, 'webpack')
      assert(buildRule.name.includes('Build Configuration'))
      assert(buildRule.content.tags.includes('build'))
    })

    it('should handle registry errors gracefully', async () => {
      // Mock fetch to simulate network error
      const originalFetch = globalThis.fetch
      globalThis.fetch = () => Promise.reject(new Error('Network error'))

      try {
        await Effect.runPromise(
          fetcher.fetchPackageMetadata('nonexistent-package')
        )
        
        // Should not reach here
        assert(false, 'Should have thrown an error')
      } catch (error) {
        // Effect-TS wraps our errors, so we need to check the structure
        assert(error !== null && typeof error === 'object')
        // The error might be wrapped in Effect's error structure
        assert(String(error).includes('Network error') || String(error).includes('Failed'))
      } finally {
        globalThis.fetch = originalFetch
      }
    })
  })

  describe('📄 NPM Manifest Parser', () => {
    let testProjectPath: string

    beforeEach(async () => {
      testProjectPath = await Deno.makeTempDir({ prefix: 'vibe-discovery-test-' })
    })

    afterEach(async () => {
      try {
        await Deno.remove(testProjectPath, { recursive: true })
      } catch {
        // Ignore cleanup errors
      }
    })

    it('should identify package.json files', async () => {
      const packageJsonPath = `${testProjectPath}/package.json`
      await Deno.writeTextFile(packageJsonPath, JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
        dependencies: { react: '^18.0.0' }
      }))

      const canParse = await Effect.runPromise(
        npmManifestParser.canParse(packageJsonPath)
      )

      assertEquals(canParse, true)
    })

    it('should reject non-package.json files', async () => {
      const nonPackageJsonPath = `${testProjectPath}/some-other-file.json`
      await Deno.writeTextFile(nonPackageJsonPath, '{}')

      const canParse = await Effect.runPromise(
        npmManifestParser.canParse(nonPackageJsonPath)
      )

      assertEquals(canParse, false)
    })

    it('should parse all dependency types correctly', async () => {
      const packageJsonPath = `${testProjectPath}/package.json`
      const packageJsonContent = {
        name: 'test-project',
        version: '1.0.0',
        dependencies: {
          'react': '^18.0.0',
          '@types/node': '^18.0.0'
        },
        devDependencies: {
          'typescript': '^5.0.0',
          'jest': '^29.0.0'
        },
        peerDependencies: {
          'react-dom': '^18.0.0'
        },
        optionalDependencies: {
          'fsevents': '^2.3.0'
        }
      }

      await Deno.writeTextFile(packageJsonPath, JSON.stringify(packageJsonContent, null, 2))

      const result = await Effect.runPromise(
        npmManifestParser.parse(packageJsonPath)
      )

      assertEquals(result.manifestType, 'npm')
      assertEquals(result.manifestPath, packageJsonPath)
      assertEquals(result.metadata.packageManager, 'npm')
      
      // Check production dependencies
      const prodDeps = result.dependencies.filter(dep => dep.type === 'production')
      assertEquals(prodDeps.length, 2)
      assert(prodDeps.some(dep => dep.name === 'react' && dep.version === '^18.0.0'))
      assert(prodDeps.some(dep => dep.name === 'node' && dep.scope === 'types' && dep.version === '^18.0.0'))

      // Check development dependencies
      const devDeps = result.dependencies.filter(dep => dep.type === 'development')
      assertEquals(devDeps.length, 2)
      assert(devDeps.some(dep => dep.name === 'typescript' && dep.version === '^5.0.0'))
      assert(devDeps.some(dep => dep.name === 'jest' && dep.version === '^29.0.0'))

      // Check peer dependencies
      const peerDeps = result.dependencies.filter(dep => dep.type === 'peer')
      assertEquals(peerDeps.length, 1)
      assert(peerDeps.some(dep => dep.name === 'react-dom' && dep.version === '^18.0.0'))

      // Check optional dependencies
      const optionalDeps = result.dependencies.filter(dep => dep.type === 'optional')
      assertEquals(optionalDeps.length, 1)
      assert(optionalDeps.some(dep => dep.name === 'fsevents' && dep.version === '^2.3.0'))
    })

    it('should handle scoped package names correctly', async () => {
      const packageJsonPath = `${testProjectPath}/package.json`
      const packageJsonContent = {
        name: 'test-project',
        version: '1.0.0',
        dependencies: {
          '@typescript-eslint/parser': '^5.0.0',
          '@babel/core': '^7.0.0'
        }
      }

      await Deno.writeTextFile(packageJsonPath, JSON.stringify(packageJsonContent, null, 2))

      const result = await Effect.runPromise(
        npmManifestParser.parse(packageJsonPath)
      )

      const tsEslintDep = result.dependencies.find(dep => dep.name === 'parser' && dep.scope === 'typescript-eslint')
      assertExists(tsEslintDep)
      assertEquals(tsEslintDep.scope, 'typescript-eslint')
      assertEquals(tsEslintDep.version, '^5.0.0')

      const babelDep = result.dependencies.find(dep => dep.name === 'core' && dep.scope === 'babel')
      assertExists(babelDep)
      assertEquals(babelDep.scope, 'babel')
      assertEquals(babelDep.version, '^7.0.0')
    })

    it('should detect lock files and adjust confidence', async () => {
      const packageJsonPath = `${testProjectPath}/package.json`
      const packageLockPath = `${testProjectPath}/package-lock.json`

      await Deno.writeTextFile(packageJsonPath, JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
        dependencies: { react: '^18.0.0' }
      }))

      // Without lock file
      const resultWithoutLock = await Effect.runPromise(
        npmManifestParser.parse(packageJsonPath)
      )
      
      const confidenceWithoutLock = resultWithoutLock.metadata.confidence

      // With lock file
      await Deno.writeTextFile(packageLockPath, JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
        lockfileVersion: 2,
        requires: true,
        packages: {}
      }))

      const resultWithLock = await Effect.runPromise(
        npmManifestParser.parse(packageJsonPath)
      )

      const confidenceWithLock = resultWithLock.metadata.confidence

      // Confidence should be higher with lock file
      assert(confidenceWithLock > confidenceWithoutLock)
      assertEquals(resultWithLock.metadata.lockFileExists, true)
    })

    it('should extract project metadata correctly', async () => {
      const packageJsonPath = `${testProjectPath}/package.json`
      const packageJsonContent = {
        name: 'my-awesome-project',
        version: '2.1.0',
        scripts: {
          start: 'node index.js',
          test: 'jest',
          build: 'webpack'
        },
        engines: {
          node: '>=18.0.0',
          npm: '>=8.0.0'
        },
        repository: {
          type: 'git',
          url: 'https://github.com/user/my-awesome-project.git'
        }
      }

      await Deno.writeTextFile(packageJsonPath, JSON.stringify(packageJsonContent, null, 2))

      const metadata = await Effect.runPromise(
        npmManifestParser.getProjectMetadata(packageJsonPath)
      )

      assertEquals(metadata.projectName, 'my-awesome-project')
      assertEquals(metadata.projectVersion, '2.1.0')
      assertEquals((metadata.scripts as Record<string, string>).start, 'node index.js')
      assertEquals((metadata.scripts as Record<string, string>).test, 'jest')
      assertEquals((metadata.scripts as Record<string, string>).build, 'webpack')
      assertEquals((metadata.engines as Record<string, string>).node, '>=18.0.0')
      assertEquals((metadata.engines as Record<string, string>).npm, '>=8.0.0')
      assertExists(metadata.repository)
      assertEquals((metadata.repository as any).type, 'git')
      assertEquals((metadata.repository as any).url, 'https://github.com/user/my-awesome-project.git')
    })

    it('should handle malformed JSON gracefully', async () => {
      const packageJsonPath = `${testProjectPath}/package.json`
      await Deno.writeTextFile(packageJsonPath, '{ invalid json content }')

      try {
        await Effect.runPromise(
          npmManifestParser.parse(packageJsonPath)
        )
        assert(false, 'Should have thrown an error for malformed JSON')
      } catch (error) {
        assert(error instanceof Error)
        assert(error.message.includes('JSON') || error.message.includes('parse'))
      }
    })

    it('should handle empty package.json', async () => {
      const packageJsonPath = `${testProjectPath}/package.json`
      await Deno.writeTextFile(packageJsonPath, '{}')

      const result = await Effect.runPromise(
        npmManifestParser.parse(packageJsonPath)
      )

      assertEquals(result.manifestType, 'npm')
      assertEquals(result.dependencies.length, 0)
      assertEquals(result.metadata.packageManager, 'npm')
      // Should still have reasonable confidence for valid JSON
      assert(result.metadata.confidence >= 0.8)
    })
  })
})