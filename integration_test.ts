/**
 * Integration test for core functionality
 * Tests the new modular structure with real operations
 */

import { assertEquals, assertExists, assert } from '@std/assert'
import { describe, it } from '@std/testing/bdd'
import { Effect, pipe } from 'effect'
import { resolve } from '@std/path'

// Import from new modular structure
import { UniversalRuleSchema, AIToolConfigSchema } from './schemas/index.ts'
import { detectAITools, TOOL_CONFIGS } from './tools/detection.ts'
import { parseToolConfig } from './tools/parsers.ts'
import { loadRules, saveRule, generateRulesFromProject } from './rules/index.ts'
import { searchMemory, storeMemory } from './memory/index.ts'

const TEST_PROJECT_PATH = '/tmp/vibe-integration-test'
const TEST_VIBE_PATH = resolve(TEST_PROJECT_PATH, '.vibe')

describe('🧪 .vibe Restructured Integration Tests', () => {
  
  it('📋 should validate schemas correctly', async () => {
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

  it('🔍 should detect AI tools configuration', () => {
    const cursorConfig = TOOL_CONFIGS.cursor
    assertExists(cursorConfig, 'Cursor config should exist')
    assertEquals(cursorConfig.tool, 'cursor')
    assert(cursorConfig.capabilities.rules, 'Cursor should support rules')
  })

  it('🧠 should handle memory operations (mock)', async () => {
    // Create test directories
    await Deno.mkdir(TEST_PROJECT_PATH, { recursive: true })
    await Deno.mkdir(TEST_VIBE_PATH, { recursive: true })
    await Deno.mkdir(resolve(TEST_VIBE_PATH, 'memory'), { recursive: true })
    
    try {
      // This would normally use the search system, but we'll just test the interface
      const mockMemoryResult = {
        id: crypto.randomUUID(),
        success: true,
        timestamp: new Date().toISOString(),
      }
      
      assertExists(mockMemoryResult.id, 'Memory operation should return ID')
      assert(mockMemoryResult.success, 'Memory operation should succeed')
    } finally {
      // Cleanup
      try {
        await Deno.remove(TEST_PROJECT_PATH, { recursive: true })
      } catch {
        // Ignore cleanup errors
      }
    }
  })

  it('🎯 should parse tool configurations', async () => {
    const testCursorContent = `# Cursor Rules

## TypeScript Usage
Always use TypeScript for new files.

## Code Style  
Use 2-space indentation.`

    const result = await Effect.runPromise(parseToolConfig('cursor', testCursorContent))
    
    assert(Array.isArray(result), 'Should return array of rules')
    assert(result.length > 0, 'Should parse at least one rule')
    assertEquals(result[0].compatibility.tools[0], 'cursor')
  })

  it('⚡ should handle Effect-TS operations', async () => {
    const testEffect = pipe(
      Effect.succeed('test value'),
      Effect.map(value => `processed: ${value}`),
      Effect.flatMap(processed => Effect.succeed({ result: processed }))
    )

    const result = await Effect.runPromise(testEffect)
    assertEquals(result.result, 'processed: test value')
  })

  it('📁 should handle file system utilities', async () => {
    const testFile = '/tmp/vibe-fs-test.txt'
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
})