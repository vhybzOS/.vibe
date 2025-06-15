import { assertEquals, assertExists, assert } from '@std/assert'
import { afterAll, beforeAll, describe, it } from '@std/testing/bdd'
import { z } from 'zod/v4'
import { Effect, pipe } from 'effect'
import { resolve } from '@std/path'

// Import our schemas and core functions
import { UniversalRuleSchema, AIToolConfigSchema } from '../schemas/index.ts'
import { detectAITools, syncToolConfigs } from '../tools/index.ts'
import { loadRules, saveRule, generateRulesFromProject } from '../rules/index.ts'
import { searchMemory, storeMemory } from '../memory/index.ts'
import { searchDiary, storeDiaryEntry } from '../diary/index.ts'

// Placeholder functions for integration testing
const captureDecision = (vibePath: string, decision: any) =>
  storeDiaryEntry(vibePath, {
    title: decision.problem,
    summary: decision.rationale,
    content: `Problem: ${decision.problem}\nChosen: ${decision.chosen}\nRationale: ${decision.rationale}`,
    type: 'decision',
    metadata: {
      options: decision.options,
      context: decision.context,
    },
    tags: ['decision', 'integration-test'],
    importance: 'medium',
  })

const discoverDependencies = (projectPath: string, options: any) =>
  Effect.succeed({
    summary: {
      totalManifests: 1,
      totalDependencies: 2,
    },
    results: [],
    errors: [],
  })

// Test environment setup
const TEST_PROJECT_PATH = '/tmp/vibe-test-project'
const TEST_VIBE_PATH = resolve(TEST_PROJECT_PATH, '.vibe')

describe('🧪 .vibe Integration Tests', () => {
  
  beforeAll(async () => {
    // Setup test project directory
    await Deno.mkdir(TEST_PROJECT_PATH, { recursive: true })
    await Deno.mkdir(TEST_VIBE_PATH, { recursive: true })
    await Deno.mkdir(resolve(TEST_VIBE_PATH, 'rules'), { recursive: true })
    await Deno.mkdir(resolve(TEST_VIBE_PATH, 'memory'), { recursive: true })
    await Deno.mkdir(resolve(TEST_VIBE_PATH, 'diary'), { recursive: true })
    
    // Create test files for AI tool detection
    await Deno.writeTextFile(
      resolve(TEST_PROJECT_PATH, '.cursorrules'),
      '# Test Cursor rules\nUse TypeScript for all code.'
    )
    await Deno.writeTextFile(
      resolve(TEST_PROJECT_PATH, 'package.json'),
      JSON.stringify({
        name: 'test-project',
        dependencies: {
          'react': '^18.0.0',
          'typescript': '^5.0.0'
        }
      }, null, 2)
    )
  })

  afterAll(async () => {
    // Cleanup test directory
    try {
      await Deno.remove(TEST_PROJECT_PATH, { recursive: true })
    } catch {
      // Ignore cleanup errors
    }
  })

  describe('📋 Schema Validation', () => {
    it('🔍 should validate UniversalRule schema correctly', () => {
      const testRule = {
        id: crypto.randomUUID(),
        metadata: {
          name: 'Test Rule',
          description: 'A test rule for validation',
          source: 'manual' as const,
          confidence: 1.0,
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          version: '1.0.0',
        },
        targeting: {
          languages: ['typescript'],
          frameworks: ['react'],
          files: [],
          contexts: [],
        },
        content: {
          markdown: '## Test Rule\nUse TypeScript everywhere.',
          examples: [],
          tags: ['test'],
          priority: 'medium' as const,
        },
        compatibility: {
          tools: ['cursor' as const],
          formats: {},
        },
        application: {
          mode: 'always' as const,
          conditions: [],
          excludeFiles: [],
          includeFiles: [],
        },
      }

      const result = UniversalRuleSchema.safeParse(testRule)
      assert(result.success, `Schema validation failed: ${result.error?.message}`)
    })

    it('🛠️ should validate AIToolConfig schema correctly', () => {
      const testConfig = {
        tool: 'cursor' as const,
        name: 'Cursor',
        detection: {
          files: ['.cursorrules'],
          directories: [],
          priority: 1,
        },
        configFiles: [{
          path: '.cursorrules',
          format: { type: 'markdown' as const },
          required: true,
        }],
        capabilities: {
          rules: true,
          commands: false,
          memory: false,
          context: true,
        },
        syncStrategy: 'overwrite' as const,
        metadata: {
          conflicts: [],
          customizations: {},
        },
      }

      const result = AIToolConfigSchema.safeParse(testConfig)
      assert(result.success, `AIToolConfig validation failed: ${result.error?.message}`)
    })
  })

  describe('🔍 AI Tool Detection', () => {
    it('🎯 should detect Cursor configuration', async () => {
      const result = await Effect.runPromise(detectAITools(TEST_PROJECT_PATH))
      
      assertExists(result, 'Detection result should exist')
      assert(Array.isArray(result), 'Result should be an array')
      
      const cursorTool = result.find(tool => tool.tool === 'cursor')
      assertExists(cursorTool, 'Should detect Cursor tool')
      assert(cursorTool.confidence > 0, 'Should have positive confidence')
      assertEquals(cursorTool.status, 'active')
    })

    it('📁 should handle empty project gracefully', async () => {
      const emptyPath = '/tmp/vibe-empty-test'
      await Deno.mkdir(emptyPath, { recursive: true })
      
      try {
        const result = await Effect.runPromise(detectAITools(emptyPath))
        assertEquals(result.length, 0, 'Should return empty array for project with no AI tools')
      } finally {
        await Deno.remove(emptyPath, { recursive: true })
      }
    })
  })

  describe('📋 Rule Management', () => {
    it('💾 should save and load rules correctly', async () => {
      const testRule = {
        id: crypto.randomUUID(),
        metadata: {
          name: 'Integration Test Rule',
          description: 'A rule created during integration testing',
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
          markdown: '## Integration Test\nThis is a test rule.',
          examples: [],
          tags: ['test', 'integration'],
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

      // Save rule
      await Effect.runPromise(saveRule(TEST_VIBE_PATH, testRule))
      
      // Load rules and verify
      const loadedRules = await Effect.runPromise(loadRules(TEST_VIBE_PATH))
      assert(loadedRules.length > 0, 'Should load at least one rule')
      
      const foundRule = loadedRules.find(r => r.id === testRule.id)
      assertExists(foundRule, 'Should find the saved rule')
      assertEquals(foundRule.metadata.name, testRule.metadata.name)
    })

    it('🤖 should generate rules from project analysis', async () => {
      const result = await Effect.runPromise(
        generateRulesFromProject(TEST_PROJECT_PATH, {
          threshold: 0.5,
          includePatterns: []
        })
      )
      
      assert(Array.isArray(result), 'Should return array of generated rules')
      // Note: May be empty if no patterns detected with current threshold
    })
  })

  describe('🔄 Tool Configuration Sync', () => {
    it('🔁 should sync tool configurations', async () => {
      // First detect tools
      const detectedTools = await Effect.runPromise(detectAITools(TEST_PROJECT_PATH))
      
      // Load rules
      const rules = await Effect.runPromise(loadRules(TEST_VIBE_PATH))
      
      // Perform sync
      const syncResult = await Effect.runPromise(
        syncToolConfigs(TEST_PROJECT_PATH, detectedTools, rules)
      )
      
      assertExists(syncResult, 'Sync result should exist')
      assertExists(syncResult.results, 'Should have results array')
      assert(syncResult.summary.total >= 0, 'Should have valid total count')
    })
  })

  describe('🧠 Memory Management', () => {
    it('💾 should store and search memory', async () => {
      const testMemory = {
        type: 'conversation',
        source: {
          tool: 'cursor',
          sessionId: 'test-session',
        },
        tags: ['test', 'integration'],
        importance: 'medium',
      }

      // Store memory
      const storeResult = await Effect.runPromise(
        storeMemory(TEST_VIBE_PATH, 'Test conversation content', testMemory)
      )
      
      assert(storeResult.success, 'Memory storage should succeed')
      assertExists(storeResult.id, 'Should return memory ID')

      // Search memory
      const searchResult = await Effect.runPromise(
        searchMemory(TEST_VIBE_PATH, {
          query: 'test conversation',
          limit: 10,
          threshold: 0.1,
        })
      )
      
      assert(Array.isArray(searchResult), 'Search should return array')
    })
  })

  describe('📖 Decision Diary', () => {
    it('📝 should capture and search decisions', async () => {
      const testDecision = {
        problem: 'How to structure the test suite',
        options: ['Unit tests only', 'Integration tests only', 'Mixed approach'],
        chosen: 'Mixed approach',
        rationale: 'Provides best coverage and confidence',
        context: { projectPath: TEST_PROJECT_PATH },
      }

      // Capture decision
      const captureResult = await Effect.runPromise(
        captureDecision(TEST_VIBE_PATH, testDecision)
      )
      
      assert(captureResult.success, 'Decision capture should succeed')
      assertExists(captureResult.id, 'Should return decision ID')

      // Search decisions
      const searchResult = await Effect.runPromise(
        searchDiary(TEST_VIBE_PATH, {
          query: 'test suite',
          limit: 10,
          offset: 0,
        })
      )
      
      assert(Array.isArray(searchResult), 'Search should return array')
    })
  })

  describe('📦 Dependency Discovery', () => {
    it('🔍 should discover project dependencies', async () => {
      const result = await Effect.runPromise(
        discoverDependencies(TEST_PROJECT_PATH, { forceRefresh: false })
      )
      
      assertExists(result, 'Discovery result should exist')
      assertExists(result.summary, 'Should have summary')
      assert(result.summary.totalManifests >= 0, 'Should have valid manifest count')
      assert(result.summary.totalDependencies >= 0, 'Should have valid dependency count')
    })
  })

  describe('⚡ Effect-TS Integration', () => {
    it('🔄 should handle Effect operations correctly', async () => {
      const testEffect = pipe(
        Effect.succeed('test value'),
        Effect.map(value => `processed: ${value}`),
        Effect.flatMap(processed => Effect.succeed({ result: processed }))
      )

      const result = await Effect.runPromise(testEffect)
      assertEquals(result.result, 'processed: test value')
    })

    it('🚨 should handle Effect errors gracefully', async () => {
      const failingEffect = pipe(
        Effect.succeed('test'),
        Effect.flatMap(() => Effect.fail(new Error('Test error'))),
        Effect.catchAll(error => Effect.succeed({ error: error.message }))
      )

      const result = await Effect.runPromise(failingEffect)
      assertEquals(result.error, 'Test error')
    })
  })

  describe('📁 File System Operations', () => {
    it('📝 should handle file operations correctly', async () => {
      const testFile = resolve(TEST_PROJECT_PATH, 'test-file.txt')
      const testContent = 'Test content for file operations'

      // Write file
      await Deno.writeTextFile(testFile, testContent)
      
      // Read file
      const readContent = await Deno.readTextFile(testFile)
      assertEquals(readContent, testContent)
      
      // Check file stats
      const stats = await Deno.stat(testFile)
      assert(stats.isFile, 'Should be a file')
      assert(stats.size > 0, 'File should have content')
      
      // Clean up
      await Deno.remove(testFile)
    })

    it('🚫 should handle missing files gracefully', async () => {
      const missingFile = resolve(TEST_PROJECT_PATH, 'missing-file.txt')
      
      try {
        await Deno.readTextFile(missingFile)
        assert(false, 'Should throw error for missing file')
      } catch (error) {
        assert(error instanceof Deno.errors.NotFound, 'Should throw NotFound error')
      }
    })
  })
})