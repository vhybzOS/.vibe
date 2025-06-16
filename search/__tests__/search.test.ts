/**
 * Search System Tests - TDD approach
 * Testing the search functionality before implementation
 */

import { assertEquals, assert } from '@std/assert'
import { describe, it, beforeEach, afterEach } from '@std/testing/bdd'
import { resolve } from '@std/path'
import { Effect } from 'effect'


// Import functions to be implemented
import {
  initializeSearch,
  insertDocument,
  insertDocuments,
  updateDocument,
  deleteDocument,
  searchDocuments,
  rebuildIndex,
  clearIndex
} from '../index.ts'

describe('🔍 Search System', () => {
  let testDir: string
  let searchPath: string

  beforeEach(async () => {
    testDir = await Deno.makeTempDir({ prefix: 'vibe_search_test_' })
    searchPath = resolve(testDir, '.vibe')
    await Deno.mkdir(searchPath, { recursive: true })
  })

  afterEach(async () => {
    try {
      // Clear in-memory index first
      await Effect.runPromise(clearIndex(testDir))
      // Then remove filesystem
      await Deno.remove(testDir, { recursive: true })
    } catch {
      // Ignore cleanup errors
    }
  })

  describe('🏗️ Index Management', () => {
    it('should initialize search index', async () => {
      const _result = await Effect.runPromise(initializeSearch(testDir))
      
      // Should create search index files
      const indexExists = await Deno.stat(resolve(searchPath, 'search.index')).then(() => true).catch(() => false)
      assert(indexExists, 'Search index file should be created')
    })

    it('should rebuild index from existing documents', async () => {
      // Setup: Initialize and add some documents
      await Effect.runPromise(initializeSearch(testDir))
      
      const testDoc = {
        id: 'test-doc-1',
        doc_type: 'memory' as const,
        timestamp: Date.now(),
        content: 'Test document content for indexing',
        tags: ['test', 'indexing'],
        metadata: {
          project_path: testDir,
          source: 'test',
          priority: 'medium' as const,
          category: 'test',
          title: 'Test Document'
        }
      }
      
      await Effect.runPromise(insertDocument(testDoc))
      
      // Test: Rebuild index
      const _result = await Effect.runPromise(rebuildIndex(testDir))
      
      // Verify: Should be able to search after rebuild
      const searchQuery = {
        term: 'document',
        filters: {},
        mode: 'keyword' as const,
        limit: 10,
        offset: 0
      }
      
      const searchResult = await Effect.runPromise(searchDocuments(searchQuery))
      assert(searchResult.results.length > 0, 'Should find documents after rebuild')
    })
  })

  describe('📄 Document Operations', () => {
    beforeEach(async () => {
      await Effect.runPromise(initializeSearch(testDir))
    })

    it('should insert document and make it searchable', async () => {
      const testDoc = {
        id: 'test-memory-1',
        doc_type: 'memory' as const,
        timestamp: Date.now(),
        content: 'This is a test memory about Effect-TS patterns',
        tags: ['effect-ts', 'patterns', 'functional'],
        metadata: {
          project_path: testDir,
          source: 'test',
          priority: 'high' as const,
          category: 'learning',
          title: 'Effect-TS Learning'
        }
      }

      // Insert document
      await Effect.runPromise(insertDocument(testDoc))

      // Search for it
      const searchQuery = {
        term: 'Effect-TS',
        filters: {},
        mode: 'keyword' as const,
        limit: 10,
        offset: 0
      }

      const result = await Effect.runPromise(searchDocuments(searchQuery))
      
      assertEquals(result.results.length, 1)
      assert(result.results[0], 'Should have first result')
      assertEquals(result.results[0].document.id, 'test-memory-1')
      assert(result.results[0].score > 0, 'Should have relevance score')
    })

    it('should update existing document', async () => {
      const originalDoc = {
        id: 'update-test-1',
        doc_type: 'diary' as const,
        timestamp: Date.now(),
        content: 'Original content about React patterns',
        tags: ['react'],
        metadata: {
          project_path: testDir,
          source: 'test',
          priority: 'medium' as const,
          category: 'decision'
        }
      }

      const updatedDoc = {
        ...originalDoc,
        content: 'Updated content about Effect-TS and React patterns',
        tags: ['react', 'effect-ts']
      }

      // Insert then update
      await Effect.runPromise(insertDocument(originalDoc))
      await Effect.runPromise(updateDocument('update-test-1', updatedDoc))

      // Search should find updated content
      const searchQuery = {
        term: 'Effect-TS',
        filters: {},
        mode: 'keyword' as const,
        limit: 10,
        offset: 0
      }

      const result = await Effect.runPromise(searchDocuments(searchQuery))
      assertEquals(result.results.length, 1)
      assert(result.results[0], 'Should have first result')
      assert(result.results[0].document.content.includes('Updated content'))
    })

    it('should delete document from search index', async () => {
      const testDoc = {
        id: 'delete-test-1',
        doc_type: 'memory' as const,
        timestamp: Date.now(),
        content: 'Document to be deleted',
        tags: ['delete-test'],
        metadata: {
          project_path: testDir,
          source: 'test',
          priority: 'low' as const,
          category: 'test'
        }
      }

      // Insert and verify it exists
      await Effect.runPromise(insertDocument(testDoc))
      
      let searchResult = await Effect.runPromise(searchDocuments({
        term: 'deleted',
        filters: {},
        mode: 'keyword' as const,
        limit: 10,
        offset: 0
      }))
      assertEquals(searchResult.results.length, 1)

      // Delete and verify it's gone
      const deleted = await Effect.runPromise(deleteDocument('delete-test-1'))
      assertEquals(deleted, true)

      searchResult = await Effect.runPromise(searchDocuments({
        term: 'deleted',
        filters: {},
        mode: 'keyword' as const,
        limit: 10,
        offset: 0
      }))
      assertEquals(searchResult.results.length, 0)
    })
  })

  describe('🔍 Search Functionality', () => {
    beforeEach(async () => {
      await Effect.runPromise(initializeSearch(testDir))
      
      // Insert test documents
      const testDocs = [
        {
          id: 'memory-1',
          doc_type: 'memory' as const,
          timestamp: Date.now() - 1000,
          content: 'Learning about Effect-TS error handling patterns',
          tags: ['effect-ts', 'errors', 'patterns'],
          metadata: {
            project_path: testDir,
            source: 'test',
            priority: 'high' as const,
            category: 'learning'
          }
        },
        {
          id: 'diary-1',
          doc_type: 'diary' as const,
          timestamp: Date.now() - 500,
          content: 'Decision to migrate from async/await to Effect-TS',
          tags: ['decision', 'migration', 'effect-ts'],
          metadata: {
            project_path: testDir,
            source: 'test',
            priority: 'high' as const,
            category: 'decision'
          }
        },
        {
          id: 'rule-1',
          doc_type: 'rule' as const,
          timestamp: Date.now(),
          content: 'Always use Effect-TS for async operations',
          tags: ['rule', 'effect-ts', 'async'],
          metadata: {
            project_path: testDir,
            source: 'test',
            priority: 'medium' as const,
            category: 'coding-standard'
          }
        }
      ]

      for (const doc of testDocs) {
        await Effect.runPromise(insertDocument(doc))
      }
    })

    it('should perform keyword search', async () => {
      const searchQuery = {
        term: 'Effect-TS',
        filters: {},
        mode: 'keyword' as const,
        limit: 10,
        offset: 0
      }

      const result = await Effect.runPromise(searchDocuments(searchQuery))
      
      assertEquals(result.results.length, 3)
      
      // Results should be sorted by relevance/timestamp
      assert(result.results[0] && result.results[1], 'Should have at least 2 results')
      assert(result.results[0].score >= result.results[1].score)
      
      // All results should contain the search term
      for (const item of result.results) {
        assert(
          item.document.content.toLowerCase().includes('effect-ts') ||
          item.document.tags.some(tag => tag.toLowerCase().includes('effect-ts'))
        )
      }
    })

    it('should filter by document type', async () => {
      const searchQuery = {
        term: 'Effect-TS',
        filters: {
          doc_type: 'memory' as const
        },
        mode: 'keyword' as const,
        limit: 10,
        offset: 0
      }

      const result = await Effect.runPromise(searchDocuments(searchQuery))
      
      assertEquals(result.results.length, 1)
      assert(result.results[0], 'Should have first result')
      assertEquals(result.results[0].document.doc_type, 'memory')
      assertEquals(result.results[0].document.id, 'memory-1')
    })

    it('should filter by tags', async () => {
      const searchQuery = {
        term: 'Effect-TS',
        filters: {
          tags: ['decision']
        },
        mode: 'keyword' as const,
        limit: 10,
        offset: 0
      }

      const result = await Effect.runPromise(searchDocuments(searchQuery))
      
      assertEquals(result.results.length, 1)
      assert(result.results[0], 'Should have first result')
      assertEquals(result.results[0].document.id, 'diary-1')
      assert(result.results[0].document.tags.includes('decision'))
    })

    it('should filter by priority', async () => {
      const searchQuery = {
        term: 'Effect-TS',
        filters: {
          priority: 'high' as const
        },
        mode: 'keyword' as const,
        limit: 10,
        offset: 0
      }

      const result = await Effect.runPromise(searchDocuments(searchQuery))
      
      assertEquals(result.results.length, 2)
      for (const item of result.results) {
        assertEquals(item.document.metadata.priority, 'high')
      }
    })

    it('should filter by date range', async () => {
      const now = Date.now()
      const recentThreshold = now - 600 // Last 600ms
      
      const searchQuery = {
        term: 'Effect-TS',
        filters: {
          date_range: {
            start: recentThreshold
          }
        },
        mode: 'keyword' as const,
        limit: 10,
        offset: 0
      }

      const result = await Effect.runPromise(searchDocuments(searchQuery))
      
      // Should only find recent documents
      assert(result.results.length <= 2)
      for (const item of result.results) {
        assert(item.document.timestamp >= recentThreshold)
      }
    })

    it('should handle pagination', async () => {
      // Test with limit and offset
      const query1 = {
        term: 'Effect-TS',
        filters: {},
        mode: 'keyword' as const,
        limit: 2,
        offset: 0
      }

      const query2 = {
        term: 'Effect-TS',
        filters: {},
        mode: 'keyword' as const,
        limit: 2,
        offset: 2
      }

      const result1 = await Effect.runPromise(searchDocuments(query1))
      const result2 = await Effect.runPromise(searchDocuments(query2))

      assertEquals(result1.results.length, 2)
      assertEquals(result2.results.length, 1)
      
      // Should not have duplicate results
      const ids1 = result1.results.map(r => r.document.id)
      const ids2 = result2.results.map(r => r.document.id)
      const intersection = ids1.filter(id => ids2.includes(id))
      assertEquals(intersection.length, 0)
    })

    it('should return empty results for no matches', async () => {
      const searchQuery = {
        term: 'nonexistent-term-xyz123',
        filters: {},
        mode: 'keyword' as const,
        limit: 10,
        offset: 0
      }

      const result = await Effect.runPromise(searchDocuments(searchQuery))
      assertEquals(result.results.length, 0)
      assertEquals(result.total, 0)
    })
  })

  describe('⚡ Performance', () => {
    it('should handle large document sets efficiently', async () => {
      await Effect.runPromise(initializeSearch(testDir))
      
      // Insert 1000 test documents
      const docs = Array.from({ length: 1000 }, (_, i) => ({
        id: `perf-doc-${i}`,
        doc_type: 'memory' as const,
        timestamp: Date.now() - Math.random() * 1000000,
        content: `Performance test document ${i} with Effect-TS patterns and ${Math.random() > 0.5 ? 'important' : 'regular'} content`,
        tags: ['performance', 'test', i % 2 === 0 ? 'even' : 'odd'],
        metadata: {
          project_path: testDir,
          source: 'perf-test',
          priority: i % 3 === 0 ? 'high' as const : 'medium' as const,
          category: 'test'
        }
      }))

      // Measure insertion time using batch operation
      const insertStart = Date.now()
      await Effect.runPromise(insertDocuments(docs))
      const insertTime = Date.now() - insertStart
      
      // Should insert 1000 docs in reasonable time (< 5 seconds)
      assert(insertTime < 5000, `Insertion too slow: ${insertTime}ms`)

      // Measure search time
      const searchStart = Date.now()
      const result = await Effect.runPromise(searchDocuments({
        term: 'Effect-TS',
        filters: {},
        mode: 'keyword' as const,
        limit: 50,
        offset: 0
      }))
      const searchTime = Date.now() - searchStart

      // Search should be sub-100ms as per PRD requirement
      assert(searchTime < 100, `Search too slow: ${searchTime}ms`)
      assert(result.results.length > 0, 'Should find results')
    })
  })

  describe('🛡️ Error Handling', () => {
    it('should handle missing search index gracefully', async () => {
      // Try to search without initializing
      const searchQuery = {
        term: 'test',
        filters: {},
        mode: 'keyword' as const,
        limit: 10,
        offset: 0
      }

      try {
        await Effect.runPromise(searchDocuments(searchQuery))
        assert(false, 'Should have thrown error for missing index')
      } catch (error) {
        assert(error instanceof Error)
        assert(error.message.includes('not initialized') || error.message.includes('index'))
      }
    })

    it('should handle invalid document IDs', async () => {
      await Effect.runPromise(initializeSearch(testDir))
      
      const result = await Effect.runPromise(deleteDocument('nonexistent-id'))
      assertEquals(result, false)
    })

    it('should validate search query parameters', async () => {
      await Effect.runPromise(initializeSearch(testDir))
      
      // Invalid limit
      try {
        await Effect.runPromise(searchDocuments({
          term: 'test',
          filters: {},
          mode: 'keyword' as const,
          limit: 0, // Invalid
          offset: 0
        }))
        assert(false, 'Should validate limit > 0')
      } catch (error) {
        assert(error instanceof Error)
      }
    })
  })
})