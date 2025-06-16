/**
 * Memory System Tests - TDD approach
 * Testing memory functionality using the existing functional schema
 */

import { assertEquals, assertExists, assert } from '@std/assert'
import { describe, it, beforeEach, afterEach } from '@std/testing/bdd'
import { resolve } from '@std/path'
import { Effect } from 'effect'

// Import schemas
import {
  MemorySchema,
  MemoryQuerySchema,
  MemorySearchResultSchema,
  type Memory,
  type MemoryQuery,
  type MemorySearchResult
} from '../../schemas/memory.ts'

// Import functions to be implemented/rewritten
import {
  storeMemory,
  searchMemory,
  getMemory,
  deleteMemory,
  updateMemoryAccess,
  loadMemories
} from '../index.ts'

describe('🧠 Memory System', () => {
  let testDir: string
  let memoryPath: string

  beforeEach(async () => {
    testDir = await Deno.makeTempDir({ prefix: 'vibe_memory_test_' })
    memoryPath = resolve(testDir, '.vibe')
    await Deno.mkdir(memoryPath, { recursive: true })
    
    // Clear search index at start of each test
    try {
      const { clearIndex } = await import('../../search/index.ts')
      await Effect.runPromise(clearIndex(testDir))
    } catch {
      // Ignore if index doesn't exist yet
    }
  })

  afterEach(async () => {
    try {
      // Clear search index to prevent cross-test pollution
      const { clearIndex } = await import('../../search/index.ts')
      await Effect.runPromise(clearIndex(testDir))
      await Deno.remove(testDir, { recursive: true })
    } catch {
      // Ignore cleanup errors
    }
  })

  describe('💾 Memory Storage', () => {
    it('should store memory entry with complete metadata', async () => {
      const content = 'This is a test memory about Effect-TS patterns and functional programming'
      const metadata = {
        type: 'knowledge' as const,
        source: {
          tool: 'claude' as const,
          sessionId: 'test-session-1',
          timestamp: new Date().toISOString(),
          location: '/test/file.ts'
        },
        tags: ['effect-ts', 'functional', 'patterns'],
        importance: 'high' as const,
        projectPath: testDir,
        relatedFiles: ['/test/file.ts'],
        associatedRules: ['rule-1']
      }

      const result = await Effect.runPromise(storeMemory(testDir, content, metadata))
      
      assertExists(result.id)
      assertEquals(result.success, true)
      assertExists(result.timestamp)
      
      // Verify memory file was created
      const memoryFile = resolve(memoryPath, 'memory', `${result.id}.json`)
      const fileExists = await Deno.stat(memoryFile).then(() => true).catch(() => false)
      assert(fileExists, 'Memory file should be created')
    })

    it('should create searchable content with keywords and concepts', async () => {
      const content = 'Learning about Effect-TS error handling and pipe composition for better async workflows'
      const metadata = {
        type: 'knowledge' as const,
        source: {
          timestamp: new Date().toISOString()
        },
        tags: ['effect-ts', 'learning'],
        importance: 'medium' as const,
        projectPath: testDir
      }

      const result = await Effect.runPromise(storeMemory(testDir, content, metadata))
      const memory = await Effect.runPromise(getMemory(testDir, result.id))
      
      assert(memory, 'Memory should exist')
      assert(memory.content.keywords.length > 0, 'Should have extracted keywords')
      assert(memory.content.summary.length > 0, 'Should have generated summary')
      assert(memory.content.keywords.includes('effect-ts'), 'Should include relevant keywords')
    })

    it('should handle different memory types correctly', async () => {
      const memoryTypes = ['conversation', 'decision', 'pattern', 'preference', 'knowledge', 'context'] as const
      const results = []

      for (const type of memoryTypes) {
        const content = `Test ${type} memory content`
        const metadata = {
          type,
          source: { timestamp: new Date().toISOString() },
          tags: [type],
          importance: 'medium' as const,
          projectPath: testDir
        }

        const result = await Effect.runPromise(storeMemory(testDir, content, metadata))
        results.push(result)
      }

      assertEquals(results.length, 6)
      for (const result of results) {
        assert(result.success, 'All memory types should be stored successfully')
      }
    })
  })

  describe('🔍 Memory Search', () => {
    beforeEach(async () => {
      // Insert test memories for search
      const testMemories = [
        {
          content: 'Learning about Effect-TS pipe composition and error handling patterns',
          type: 'knowledge' as const,
          tags: ['effect-ts', 'pipes', 'errors'],
          importance: 'high' as const
        },
        {
          content: 'Decision to migrate from async/await to Effect-TS for better composability',
          type: 'decision' as const,
          tags: ['effect-ts', 'migration', 'async'],
          importance: 'high' as const
        },
        {
          content: 'Conversation about React component patterns and state management',
          type: 'conversation' as const,
          tags: ['react', 'components', 'state'],
          importance: 'medium' as const
        },
        {
          content: 'Pattern for handling complex form validation with functional approaches',
          type: 'pattern' as const,
          tags: ['validation', 'forms', 'functional'],
          importance: 'medium' as const
        }
      ]

      for (const mem of testMemories) {
        const metadata = {
          ...mem,
          source: { timestamp: new Date().toISOString() },
          projectPath: testDir
        }
        await Effect.runPromise(storeMemory(testDir, mem.content, metadata))
      }
    })

    it('should search by text content', async () => {
      const query: MemoryQuery = {
        query: 'Effect-TS',
        type: [],
        tags: [],
        tool: [],
        importance: [],
        limit: 10,
        threshold: 0.5,
        includeArchived: false
      }

      const results = await Effect.runPromise(searchMemory(testDir, query))
      
      
      assert(results.length >= 2, 'Should find at least 2 Effect-TS related memories')
      for (const result of results) {
        assert(
          result.memory.content.content.toLowerCase().includes('effect-ts') ||
          result.memory.metadata.tags.includes('effect-ts'),
          'Results should contain Effect-TS'
        )
      }
    })

    it('should filter by memory type', async () => {
      const query: MemoryQuery = {
        query: 'Effect-TS',
        type: ['decision'],
        tags: [],
        tool: [],
        importance: [],
        limit: 10,
        threshold: 0.7,
        includeArchived: false
      }

      const results = await Effect.runPromise(searchMemory(testDir, query))
      
      assertEquals(results.length, 1)
      assert(results[0], 'Should have first result')
      assertEquals(results[0].memory.metadata.type, 'decision')
    })

    it('should filter by tags', async () => {
      const query: MemoryQuery = {
        query: 'about', // Broad search term to match all documents
        type: [],
        tags: ['react'],
        tool: [],
        importance: [],
        limit: 10,
        threshold: 0.1, // Lower threshold since we're filtering, not searching
        includeArchived: false
      }

      const results = await Effect.runPromise(searchMemory(testDir, query))
      
      
      assertEquals(results.length, 1)
      assert(results[0], 'Should have first result')
      assert(results[0].memory.metadata.tags.includes('react'))
    })

    it('should filter by importance level', async () => {
      const query: MemoryQuery = {
        query: '', // Empty query to search all documents
        type: [],
        tags: [],
        tool: [],
        importance: ['high'],
        limit: 10,
        threshold: 0.1, // Lower threshold since we're filtering, not searching
        includeArchived: false
      }

      const results = await Effect.runPromise(searchMemory(testDir, query))
      
      assert(results.length >= 2, 'Should find high importance memories')
      for (const result of results) {
        assertEquals(result.memory.metadata.importance, 'high')
      }
    })

    it('should filter by time range', async () => {
      const now = new Date()
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
      
      const query: MemoryQuery = {
        query: '', // Empty query to search all documents
        type: [],
        tags: [],
        tool: [],
        importance: [],
        timeRange: {
          from: oneHourAgo.toISOString(),
          to: now.toISOString()
        },
        limit: 10,
        threshold: 0.1, // Lower threshold since we're filtering, not searching
        includeArchived: false
      }

      const results = await Effect.runPromise(searchMemory(testDir, query))
      
      assert(results.length > 0, 'Should find recent memories')
      for (const result of results) {
        const created = new Date(result.memory.lifecycle.created)
        assert(created >= oneHourAgo && created <= now, 'Results should be within time range')
      }
    })

    it('should return results with relevance scores', async () => {
      const query: MemoryQuery = {
        query: 'Effect-TS patterns',
        type: [],
        tags: [],
        tool: [],
        importance: [],
        limit: 10,
        threshold: 0.7,
        includeArchived: false
      }

      const results = await Effect.runPromise(searchMemory(testDir, query))
      
      assert(results.length > 0, 'Should have search results')
      for (const result of results) {
        assert(result.score >= 0 && result.score <= 1, 'Score should be between 0 and 1')
      }
      
      // Results should be sorted by score (highest first)
      for (let i = 1; i < results.length; i++) {
        const prev = results[i-1]
        const curr = results[i]
        assert(prev && curr, 'Should have both results for comparison')
        assert(prev.score >= curr.score, 'Results should be sorted by score')
      }
    })

    it('should handle empty search results', async () => {
      const query: MemoryQuery = {
        query: 'nonexistent-technology-xyz123',
        type: [],
        tags: [],
        tool: [],
        importance: [],
        limit: 10,
        threshold: 0.7,
        includeArchived: false
      }

      const results = await Effect.runPromise(searchMemory(testDir, query))
      assertEquals(results.length, 0)
    })
  })

  describe('📖 Memory Retrieval', () => {
    it('should retrieve specific memory by ID', async () => {
      const content = 'Test memory for retrieval'
      const metadata = {
        type: 'knowledge' as const,
        source: { timestamp: new Date().toISOString() },
        tags: ['test'],
        importance: 'medium' as const,
        projectPath: testDir
      }

      const storeResult = await Effect.runPromise(storeMemory(testDir, content, metadata))
      const memory = await Effect.runPromise(getMemory(testDir, storeResult.id))
      
      assert(memory, 'Memory should exist')
      assertEquals(memory.content.content, content)
      assertEquals(memory.metadata.type, 'knowledge')
      assert(memory.metadata.tags.includes('test'))
    })

    it('should return null for non-existent memory ID', async () => {
      const fakeId = crypto.randomUUID()
      const memory = await Effect.runPromise(getMemory(testDir, fakeId))
      assertEquals(memory, null)
    })

    it('should update access tracking when retrieving memory', async () => {
      const content = 'Memory with access tracking'
      const metadata = {
        type: 'knowledge' as const,
        source: { timestamp: new Date().toISOString() },
        tags: ['access'],
        importance: 'medium' as const,
        projectPath: testDir
      }

      const storeResult = await Effect.runPromise(storeMemory(testDir, content, metadata))
      
      // First access
      const memory1 = await Effect.runPromise(getMemory(testDir, storeResult.id))
      assert(memory1, 'Memory should exist')
      
      // Update access count
      await Effect.runPromise(updateMemoryAccess(testDir, storeResult.id))
      
      // Second access should show updated count
      const memory2 = await Effect.runPromise(getMemory(testDir, storeResult.id))
      assert(memory2, 'Memory should still exist')
      assert(memory2.metadata.accessCount > memory1.metadata.accessCount, 'Access count should increase')
    })
  })

  describe('🗑️ Memory Management', () => {
    it('should delete memory and remove from storage', async () => {
      const content = 'Memory to be deleted'
      const metadata = {
        type: 'knowledge' as const,
        source: { timestamp: new Date().toISOString() },
        tags: ['delete-test'],
        importance: 'low' as const,
        projectPath: testDir
      }

      const storeResult = await Effect.runPromise(storeMemory(testDir, content, metadata))
      
      // Verify it exists
      const memory = await Effect.runPromise(getMemory(testDir, storeResult.id))
      assert(memory, 'Memory should exist before deletion')
      
      // Delete it
      const deleted = await Effect.runPromise(deleteMemory(testDir, storeResult.id))
      assertEquals(deleted, true)
      
      // Verify it's gone
      const deletedMemory = await Effect.runPromise(getMemory(testDir, storeResult.id))
      assertEquals(deletedMemory, null)
    })

    it('should return false when deleting non-existent memory', async () => {
      const fakeId = crypto.randomUUID()
      const deleted = await Effect.runPromise(deleteMemory(testDir, fakeId))
      assertEquals(deleted, false)
    })

    it('should load all memories from storage', async () => {
      // Store multiple memories
      const memories = [
        { content: 'Memory 1', type: 'knowledge' as const },
        { content: 'Memory 2', type: 'decision' as const },
        { content: 'Memory 3', type: 'pattern' as const }
      ]

      const storedIds = []
      for (const mem of memories) {
        const metadata = {
          ...mem,
          source: { timestamp: new Date().toISOString() },
          tags: ['load-test'],
          importance: 'medium' as const,
          projectPath: testDir
        }
        const result = await Effect.runPromise(storeMemory(testDir, mem.content, metadata))
        storedIds.push(result.id)
      }

      // Load all memories
      const loadedMemories = await Effect.runPromise(loadMemories(testDir))
      
      assertEquals(loadedMemories.length, 3)
      for (const memory of loadedMemories) {
        assert(storedIds.some(id => memory.metadata.id === id), 'Loaded memory should match stored ID')
      }
    })
  })

  describe('⚡ Performance', () => {
    it('should handle large numbers of memories efficiently', async () => {
      const startTime = Date.now()
      
      // Store 100 memories
      const promises = Array.from({ length: 100 }, (_, i) => {
        const metadata = {
          type: 'knowledge' as const,
          source: { timestamp: new Date().toISOString() },
          tags: ['performance', `test-${i}`],
          importance: 'medium' as const,
          projectPath: testDir
        }
        return Effect.runPromise(storeMemory(testDir, `Performance test memory ${i}`, metadata))
      })

      await Promise.all(promises)
      const storeTime = Date.now() - startTime
      
      // Search should be fast
      const searchStart = Date.now()
      const query: MemoryQuery = {
        query: 'performance',
        type: [],
        tags: [],
        tool: [],
        importance: [],
        limit: 50,
        threshold: 0.7,
        includeArchived: false
      }
      const results = await Effect.runPromise(searchMemory(testDir, query))
      const searchTime = Date.now() - searchStart

      assert(storeTime < 10000, `Storage should be reasonable: ${storeTime}ms`)
      assert(searchTime < 1000, `Search should be fast: ${searchTime}ms`)
      assert(results.length > 0, 'Should find performance-related memories')
    })
  })

  describe('🛡️ Error Handling', () => {
    it('should handle invalid memory directory gracefully', async () => {
      const invalidDir = '/nonexistent/path'
      
      try {
        await Effect.runPromise(searchMemory(invalidDir, {
          type: [],
          tags: [],
          tool: [],
          importance: [],
          limit: 10,
          threshold: 0.7,
          includeArchived: false
        }))
        assert(false, 'Should have thrown error for invalid directory')
      } catch (error) {
        assert(error instanceof Error)
        assert(error.message.includes('not found') || error.message.includes('initialize'))
      }
    })

    it('should validate memory content and metadata', async () => {
      try {
        const invalidMetadata = {
          type: 'invalid-type' as any,
          source: { timestamp: 'invalid-date' },
          tags: ['test'],
          importance: 'super-high' as any,
          projectPath: testDir
        }
        
        await Effect.runPromise(storeMemory(testDir, '', invalidMetadata))
        assert(false, 'Should have thrown validation error')
      } catch (error) {
        assert(error instanceof Error)
        // Should be a validation error
      }
    })

    it('should handle corrupted memory files gracefully', async () => {
      // Create a corrupted memory file
      const corruptedPath = resolve(memoryPath, 'memory')
      await Deno.mkdir(corruptedPath, { recursive: true })
      await Deno.writeTextFile(resolve(corruptedPath, 'corrupted.json'), 'invalid json content')

      // Load should skip corrupted files and continue
      const memories = await Effect.runPromise(loadMemories(testDir))
      assertEquals(memories.length, 0) // Should be empty but not crash
    })
  })
})