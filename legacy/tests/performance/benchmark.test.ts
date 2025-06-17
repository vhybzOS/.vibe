import { assert, assertEquals } from '@std/assert'
import { beforeAll, describe, it } from '@std/testing/bdd'
import { Effect } from 'effect'

// Import performance-critical functions
import { detectAITools } from '../../tools/detection.ts'
import { UniversalRuleSchema } from '../../schemas/index.ts'

describe('⚡ Performance Benchmarks', () => {
  let testProjectPath: string

  beforeAll(async () => {
    testProjectPath = await Deno.makeTempDir({ prefix: 'vibe-perf-' })

    // Create test files for performance testing
    await Deno.writeTextFile(`${testProjectPath}/.cursorrules`, '# Performance test rules')
    await Deno.writeTextFile(`${testProjectPath}/.windsurfrules`, '# Windsurf rules')
    await Deno.mkdir(`${testProjectPath}/.claude`, { recursive: true })
    await Deno.writeTextFile(`${testProjectPath}/.claude/commands.md`, '# Claude commands')
  })

  describe('🔍 Tool Detection Performance', () => {
    it('⚡ should detect tools within reasonable time', async () => {
      const iterations = 10
      const startTime = performance.now()

      for (let i = 0; i < iterations; i++) {
        await Effect.runPromise(detectAITools(testProjectPath))
      }

      const endTime = performance.now()
      const avgTime = (endTime - startTime) / iterations

      // Should complete within 100ms on average
      assert(avgTime < 100, `Tool detection took ${avgTime.toFixed(2)}ms (should be < 100ms)`)
      console.log(`🏃 Tool detection: ${avgTime.toFixed(2)}ms average`)
    })

    it('📊 should scale linearly with project size', async () => {
      // Test with increasing numbers of config files
      const testSizes = [1, 5, 10, 20]
      const results: number[] = []

      for (const size of testSizes) {
        const tempDir = await Deno.makeTempDir({ prefix: `vibe-scale-${size}-` })

        try {
          // Create multiple config files
          for (let i = 0; i < size; i++) {
            await Deno.writeTextFile(`${tempDir}/.cursorrules${i}`, `# Rules ${i}`)
          }

          const startTime = performance.now()
          await Effect.runPromise(detectAITools(tempDir))
          const endTime = performance.now()

          results.push(endTime - startTime)
        } finally {
          await Deno.remove(tempDir, { recursive: true })
        }
      }

      // Check that performance scales reasonably
      console.log(
        '📈 Scaling results:',
        results.map((r, i) => `${testSizes[i]} files: ${r.toFixed(2)}ms`),
      )

      // Performance shouldn't degrade exponentially
      const firstTime = results[0]
      const lastTime = results[results.length - 1]
      const ratio = (lastTime || 0) / (firstTime || 1)

      assert(ratio < 10, `Performance ratio ${ratio.toFixed(2)}x should be < 10x`)
    })
  })

  describe('📋 Schema Validation Performance', () => {
    it('⚡ should validate schemas quickly', () => {
      const iterations = 1000

      const testRule = {
        id: crypto.randomUUID(),
        metadata: {
          name: 'Performance Test Rule',
          description: 'Testing schema validation performance',
          source: 'manual' as const,
          confidence: 1.0,
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          version: '1.0.0',
        },
        targeting: {
          languages: ['typescript'],
          frameworks: [],
          files: [],
          contexts: [],
        },
        content: {
          markdown: '# Performance test',
          examples: [],
          tags: ['performance'],
          priority: 'medium' as const,
        },
        compatibility: {
          tools: [],
          formats: {},
        },
        application: {
          mode: 'always' as const,
          conditions: [],
          excludeFiles: [],
          includeFiles: [],
        },
      }

      const startTime = performance.now()

      for (let i = 0; i < iterations; i++) {
        const result = UniversalRuleSchema.safeParse(testRule)
        assert(result.success, 'Validation should succeed')
      }

      const endTime = performance.now()
      const totalTime = endTime - startTime
      const avgTime = totalTime / iterations

      // Should validate in < 1ms per schema on average
      assert(avgTime < 1, `Schema validation took ${avgTime.toFixed(3)}ms (should be < 1ms)`)
      console.log(
        `🔬 Schema validation: ${avgTime.toFixed(3)}ms average (${iterations} iterations)`,
      )
    })

    it('🏋️ should handle large schemas efficiently', () => {
      // Create a large rule with many examples and tags
      const largeRule = {
        id: crypto.randomUUID(),
        metadata: {
          name: 'Large Test Rule',
          description: 'A rule with many examples and tags for performance testing',
          source: 'manual' as const,
          confidence: 1.0,
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          version: '1.0.0',
        },
        targeting: {
          languages: Array(50).fill(0).map((_, i) => `language${i}`),
          frameworks: Array(30).fill(0).map((_, i) => `framework${i}`),
          files: Array(100).fill(0).map((_, i) => `file${i}.ts`),
          contexts: ['development', 'testing', 'debugging', 'refactoring'],
        },
        content: {
          markdown: '#'.repeat(10000), // Large markdown content
          examples: Array(20).fill(0).map((_, i) => ({
            code: `const example${i} = "test";`,
            language: 'typescript',
            description: `Example ${i}`,
          })),
          tags: Array(100).fill(0).map((_, i) => `tag${i}`),
          priority: 'medium' as const,
        },
        compatibility: {
          tools: ['cursor', 'windsurf', 'claude'] as const,
          formats: {},
        },
        application: {
          mode: 'always' as const,
          conditions: Array(50).fill(0).map((_, i) => `condition${i}`),
          excludeFiles: [],
          includeFiles: [],
        },
      }

      const startTime = performance.now()
      const result = UniversalRuleSchema.safeParse(largeRule)
      const endTime = performance.now()

      assert(result.success, 'Large schema validation should succeed')

      const validationTime = endTime - startTime
      assert(
        validationTime < 10,
        `Large schema validation took ${validationTime.toFixed(2)}ms (should be < 10ms)`,
      )
      console.log(`🏗️ Large schema validation: ${validationTime.toFixed(2)}ms`)
    })
  })

  describe('💾 File System Performance', () => {
    it('📁 should handle many files efficiently', async () => {
      const fileCount = 100
      const tempDir = await Deno.makeTempDir({ prefix: 'vibe-files-' })

      try {
        // Create many files
        const createStartTime = performance.now()
        const promises = []
        for (let i = 0; i < fileCount; i++) {
          promises.push(Deno.writeTextFile(`${tempDir}/file${i}.txt`, `Content ${i}`))
        }
        await Promise.all(promises)
        const createEndTime = performance.now()

        // Read all files
        const readStartTime = performance.now()
        const readPromises = []
        for (let i = 0; i < fileCount; i++) {
          readPromises.push(Deno.readTextFile(`${tempDir}/file${i}.txt`))
        }
        await Promise.all(readPromises)
        const readEndTime = performance.now()

        const createTime = createEndTime - createStartTime
        const readTime = readEndTime - readStartTime

        console.log(`📝 File creation (${fileCount} files): ${createTime.toFixed(2)}ms`)
        console.log(`📖 File reading (${fileCount} files): ${readTime.toFixed(2)}ms`)

        // Should handle 100 files in reasonable time
        assert(
          createTime < 1000,
          `File creation took ${createTime.toFixed(2)}ms (should be < 1000ms)`,
        )
        assert(readTime < 500, `File reading took ${readTime.toFixed(2)}ms (should be < 500ms)`)
      } finally {
        await Deno.remove(tempDir, { recursive: true })
      }
    })

    it('🔍 should stat files efficiently', async () => {
      const iterations = 100
      const testFile = `${testProjectPath}/.cursorrules`

      const startTime = performance.now()

      for (let i = 0; i < iterations; i++) {
        await Deno.stat(testFile)
      }

      const endTime = performance.now()
      const avgTime = (endTime - startTime) / iterations

      // File stat should be very fast
      assert(avgTime < 1, `File stat took ${avgTime.toFixed(3)}ms (should be < 1ms)`)
      console.log(`📊 File stat: ${avgTime.toFixed(3)}ms average`)
    })
  })

  describe('🧠 Memory Usage', () => {
    it('💾 should maintain reasonable memory usage', async () => {
      const initialMemory = getMemoryUsage()

      // Perform memory-intensive operations
      const operations = []
      for (let i = 0; i < 100; i++) {
        operations.push(detectAITools(testProjectPath))
      }
      await Promise.all(operations)

      // Force garbage collection if available
      if (typeof (globalThis as unknown as { gc?: () => void }).gc === 'function') {
        ;(globalThis as unknown as { gc: () => void }).gc()
      }

      const finalMemory = getMemoryUsage()
      const memoryIncrease = finalMemory - initialMemory

      console.log(
        `🧠 Memory usage: ${initialMemory.toFixed(2)}MB → ${finalMemory.toFixed(2)}MB (+${
          memoryIncrease.toFixed(2)
        }MB)`,
      )

      // Memory increase should be reasonable (< 50MB for test operations)
      assert(memoryIncrease < 50, `Memory increase ${memoryIncrease.toFixed(2)}MB should be < 50MB`)
    })

    it('🔄 should not leak memory over time', async () => {
      const measurements: number[] = []

      // Take multiple measurements over time
      for (let i = 0; i < 10; i++) {
        // Perform some operations
        await Effect.runPromise(detectAITools(testProjectPath))

        // Force GC if available
        if (typeof (globalThis as unknown as { gc?: () => void }).gc === 'function') {
          ;(globalThis as unknown as { gc: () => void }).gc()
        }

        measurements.push(getMemoryUsage())

        // Small delay between measurements
        await new Promise((resolve) => setTimeout(resolve, 10))
      }

      const firstMeasurement = measurements[0]
      const lastMeasurement = measurements[measurements.length - 1]
      const memoryTrend = (lastMeasurement || 0) - (firstMeasurement || 0)

      console.log(
        `📈 Memory trend: ${memoryTrend.toFixed(2)}MB over ${measurements.length} iterations`,
      )

      // Memory usage shouldn't grow significantly over time
      assert(memoryTrend < 10, `Memory trend ${memoryTrend.toFixed(2)}MB should be < 10MB`)
    })
  })

  describe('⚡ Effect Performance', () => {
    it('🔄 should compose Effects efficiently', async () => {
      const iterations = 1000

      const complexEffect = Effect.succeed(1)
        .pipe(
          Effect.flatMap((x) => Effect.succeed(x + 1)),
          Effect.flatMap((x) => Effect.succeed(x * 2)),
          Effect.flatMap((x) => Effect.succeed(x - 1)),
          Effect.map((x) => x.toString()),
          Effect.flatMap((x) => Effect.succeed(parseInt(x))),
          Effect.map((x) => x + 100),
        )

      const startTime = performance.now()

      for (let i = 0; i < iterations; i++) {
        const result = await Effect.runPromise(complexEffect)
        assertEquals(result, 103) // ((1 + 1) * 2 - 1) + 100 = 103
      }

      const endTime = performance.now()
      const avgTime = (endTime - startTime) / iterations

      // Effect composition should be fast
      assert(avgTime < 0.1, `Effect composition took ${avgTime.toFixed(4)}ms (should be < 0.1ms)`)
      console.log(`⚡ Effect composition: ${avgTime.toFixed(4)}ms average`)
    })
  })
})

// Helper function to get current memory usage in MB
function getMemoryUsage(): number {
  const memInfo = Deno.memoryUsage()
  return memInfo.heapUsed / (1024 * 1024) // Convert bytes to MB
}
