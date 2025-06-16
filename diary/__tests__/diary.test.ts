/**
 * Diary System Tests - TDD approach
 * Testing diary functionality using the existing functional schema
 */

import { assertEquals, assertExists, assert } from '@std/assert'
import { describe, it, beforeEach, afterEach } from '@std/testing/bdd'
import { resolve } from '@std/path'
import { Effect } from 'effect'

// Import schemas
import {
  DiaryEntrySchema,
  type DiaryEntry,
  type Problem,
  type Decision,
  type Impact,
  type DiaryCategory,
  DIARY_CATEGORIES
} from '../../schemas/diary.ts'

// Import functions to be implemented/rewritten
import {
  createEntry,
  searchDiary,
  getTimeline,
  updateEntry,
  deleteEntry,
  autoCapture,
  exportDiary
} from '../index.ts'

describe('📔 Diary System', () => {
  let testDir: string
  let diaryPath: string

  beforeEach(async () => {
    testDir = await Deno.makeTempDir({ prefix: 'vibe_diary_test_' })
    diaryPath = resolve(testDir, '.vibe')
    await Deno.mkdir(diaryPath, { recursive: true })
  })

  afterEach(async () => {
    try {
      await Deno.remove(testDir, { recursive: true })
    } catch {
      // Ignore cleanup errors
    }
  })

  describe('📝 Entry Creation', () => {
    it('should create diary entry with complete structure', async () => {
      const entryInput = {
        title: 'Migration to Effect-TS',
        category: 'architecture' as DiaryCategory,
        tags: ['effect-ts', 'migration', 'async'],
        problem: {
          description: 'Need better async error handling and composition',
          context: 'Current Promise-based code is hard to compose and debug',
          constraints: ['Must maintain backward compatibility', 'Cannot break existing APIs']
        },
        decision: {
          chosen: 'Migrate to Effect-TS for all async operations',
          rationale: 'Effect-TS provides better error handling, composability, and type safety',
          alternatives: [
            { option: 'Stay with Promises', reason: 'Simpler but lacks composability' },
            { option: 'Use RxJS', reason: 'Good for streams but complex for simple async' }
          ]
        },
        impact: {
          benefits: ['Better error handling', 'More composable code', 'Type safety'],
          risks: ['Learning curve for team', 'Larger bundle size'],
          migrationNotes: 'Migrate incrementally, starting with new features'
        }
      }

      const result = await Effect.runPromise(createEntry(testDir, entryInput))
      
      assertExists(result.id)
      assertEquals(result.title, 'Migration to Effect-TS')
      assertEquals(result.category, 'architecture')
      assert(result.tags.includes('effect-ts'))
      
      // Verify file was created
      const entryFile = resolve(diaryPath, 'diary', `${result.id}.json`)
      const fileExists = await Deno.stat(entryFile).then(() => true).catch(() => false)
      assert(fileExists, 'Diary entry file should be created')
    })

    it('should validate diary categories', async () => {
      const validCategories = ['architecture', 'design', 'technology', 'process']
      
      for (const category of validCategories) {
        const entryInput = {
          title: `Test ${category} decision`,
          category: category as DiaryCategory,
          tags: ['test'],
          problem: {
            description: 'Test problem',
            context: 'Test context',
            constraints: []
          },
          decision: {
            chosen: 'Test decision',
            rationale: 'Test rationale',
            alternatives: []
          },
          impact: {
            benefits: ['Test benefit'],
            risks: ['Test risk'],
            migrationNotes: null
          }
        }

        const result = await Effect.runPromise(createEntry(testDir, entryInput))
        assertEquals(result.category, category)
      }
    })

    it('should auto-generate ID and timestamp', async () => {
      const entryInput = {
        title: 'Test Entry',
        category: 'design' as DiaryCategory,
        tags: ['test'],
        problem: {
          description: 'Test problem',
          context: 'Test context',
          constraints: []
        },
        decision: {
          chosen: 'Test decision',
          rationale: 'Test rationale',
          alternatives: []
        },
        impact: {
          benefits: [],
          risks: [],
          migrationNotes: null
        }
      }

      const result = await Effect.runPromise(createEntry(testDir, entryInput))
      
      assertExists(result.id)
      assertExists(result.timestamp)
      
      const timestamp = new Date(result.timestamp)
      const now = new Date()
      assert(Math.abs(now.getTime() - timestamp.getTime()) < 5000, 'Timestamp should be recent')
    })
  })

  describe('🔍 Diary Search', () => {
    beforeEach(async () => {
      // Insert test diary entries
      const testEntries = [
        {
          title: 'Effect-TS Migration Decision',
          category: 'architecture' as DiaryCategory,
          tags: ['effect-ts', 'async', 'migration'],
          problem: { description: 'Better async handling needed', context: 'Promise limitations', constraints: [] },
          decision: { chosen: 'Effect-TS', rationale: 'Better composition', alternatives: [] },
          impact: { benefits: ['Type safety'], risks: ['Learning curve'], migrationNotes: null }
        },
        {
          title: 'Database Schema Update',
          category: 'data' as DiaryCategory,
          tags: ['database', 'schema', 'migration'],
          problem: { description: 'Schema needs updating', context: 'New requirements', constraints: ['No downtime'] },
          decision: { chosen: 'Incremental migration', rationale: 'Less risk', alternatives: [] },
          impact: { benefits: ['Flexibility'], risks: ['Complexity'], migrationNotes: 'Use migration scripts' }
        },
        {
          title: 'Testing Strategy',
          category: 'testing' as DiaryCategory,
          tags: ['testing', 'strategy', 'quality'],
          problem: { description: 'Need comprehensive testing', context: 'Current gaps', constraints: ['Time limited'] },
          decision: { chosen: 'TDD approach', rationale: 'Better coverage', alternatives: [] },
          impact: { benefits: ['Quality'], risks: ['Slower initially'], migrationNotes: null }
        }
      ]

      for (const entry of testEntries) {
        await Effect.runPromise(createEntry(testDir, entry))
      }
    })

    it('should search by title and content', async () => {
      const results = await Effect.runPromise(searchDiary(testDir, {
        query: 'Effect-TS',
        limit: 10
      }))
      
      assertEquals(results.length, 1)
      assert(results[0], 'Should have first result')
      assertEquals(results[0].title, 'Effect-TS Migration Decision')
    })

    it('should filter by category', async () => {
      const results = await Effect.runPromise(searchDiary(testDir, {
        category: 'architecture',
        limit: 10
      }))
      
      assertEquals(results.length, 1)
      assert(results[0], 'Should have first result')
      assertEquals(results[0].category, 'architecture')
    })

    it('should filter by tags', async () => {
      const results = await Effect.runPromise(searchDiary(testDir, {
        tags: ['migration'],
        limit: 10
      }))
      
      assertEquals(results.length, 2) // Effect-TS and Database entries both have migration tag
      for (const result of results) {
        assert(result.tags.includes('migration'))
      }
    })

    it('should filter by date range', async () => {
      const now = new Date()
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
      
      const results = await Effect.runPromise(searchDiary(testDir, {
        dateRange: {
          from: oneHourAgo.toISOString(),
          to: now.toISOString()
        },
        limit: 10
      }))
      
      assert(results.length > 0, 'Should find recent entries')
      for (const result of results) {
        const entryTime = new Date(result.timestamp)
        assert(entryTime >= oneHourAgo && entryTime <= now)
      }
    })

    it('should handle empty search results', async () => {
      const results = await Effect.runPromise(searchDiary(testDir, {
        query: 'nonexistent-technology-xyz123',
        limit: 10
      }))
      
      assertEquals(results.length, 0)
    })
  })

  describe('📅 Timeline Operations', () => {
    beforeEach(async () => {
      // Create entries with different timestamps
      const entries = [
        { title: 'Recent Decision', category: 'architecture' as DiaryCategory, offset: -1 }, // 1 hour ago
        { title: 'Yesterday Decision', category: 'design' as DiaryCategory, offset: -24 }, // 1 day ago
        { title: 'Old Decision', category: 'technology' as DiaryCategory, offset: -168 } // 1 week ago
      ]

      for (const entry of entries) {
        const timestamp = new Date(Date.now() + entry.offset * 60 * 60 * 1000).toISOString()
        const entryInput = {
          title: entry.title,
          category: entry.category,
          tags: ['timeline-test'],
          problem: { description: 'Test', context: 'Test', constraints: [] },
          decision: { chosen: 'Test', rationale: 'Test', alternatives: [] },
          impact: { benefits: [], risks: [], migrationNotes: null }
        }
        
        // Store with custom timestamp (would need implementation support)
        await Effect.runPromise(createEntry(testDir, entryInput))
      }
    })

    it('should get timeline entries in chronological order', async () => {
      const timeline = await Effect.runPromise(getTimeline(testDir))
      
      assert(timeline.length >= 3, 'Should have at least 3 entries')
      
      // Timeline should be sorted by timestamp (newest first)
      for (let i = 1; i < timeline.length; i++) {
        const prevEntry = timeline[i-1]
        const currEntry = timeline[i]
        assert(prevEntry && currEntry, 'Timeline entries should exist')
        const prevTime = new Date(prevEntry.timestamp)
        const currTime = new Date(currEntry.timestamp)
        assert(prevTime >= currTime, 'Timeline should be sorted newest first')
      }
    })

    it('should filter timeline by date range', async () => {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const now = new Date()
      
      const timeline = await Effect.runPromise(getTimeline(testDir, {
        from: oneDayAgo.toISOString(),
        to: now.toISOString()
      }))
      
      assert(timeline.length > 0, 'Should find recent entries')
      for (const entry of timeline) {
        const entryTime = new Date(entry.timestamp)
        assert(entryTime >= oneDayAgo && entryTime <= now)
      }
    })
  })

  describe('✏️ Entry Management', () => {
    it('should update existing entry', async () => {
      const originalEntry = {
        title: 'Original Title',
        category: 'design' as DiaryCategory,
        tags: ['original'],
        problem: { description: 'Original problem', context: 'Original context', constraints: [] },
        decision: { chosen: 'Original decision', rationale: 'Original rationale', alternatives: [] },
        impact: { benefits: ['Original benefit'], risks: [], migrationNotes: null }
      }

      const created = await Effect.runPromise(createEntry(testDir, originalEntry))
      
      const updates = {
        title: 'Updated Title',
        tags: ['original', 'updated'],
        impact: {
          benefits: ['Original benefit', 'Updated benefit'],
          risks: ['New risk'],
          migrationNotes: 'Added migration notes'
        }
      }

      const updated = await Effect.runPromise(updateEntry(testDir, created.id, updates))
      
      assertEquals(updated.title, 'Updated Title')
      assert(updated.tags.includes('updated'))
      assertEquals(updated.impact.benefits.length, 2)
      assertEquals(updated.impact.migrationNotes, 'Added migration notes')
    })

    it('should delete entry', async () => {
      const entryInput = {
        title: 'Entry to Delete',
        category: 'testing' as DiaryCategory,
        tags: ['delete-test'],
        problem: { description: 'Test', context: 'Test', constraints: [] },
        decision: { chosen: 'Test', rationale: 'Test', alternatives: [] },
        impact: { benefits: [], risks: [], migrationNotes: null }
      }

      const created = await Effect.runPromise(createEntry(testDir, entryInput))
      
      // Verify it exists in timeline
      const timelineBefore = await Effect.runPromise(getTimeline(testDir))
      assert(timelineBefore.some(entry => entry.id === created.id))
      
      // Delete it
      const deleted = await Effect.runPromise(deleteEntry(testDir, created.id))
      assertEquals(deleted, true)
      
      // Verify it's gone from timeline
      const timelineAfter = await Effect.runPromise(getTimeline(testDir))
      assert(!timelineAfter.some(entry => entry.id === created.id))
    })

    it('should return false when deleting non-existent entry', async () => {
      const fakeId = 'nonexistent-id'
      const deleted = await Effect.runPromise(deleteEntry(testDir, fakeId))
      assertEquals(deleted, false)
    })
  })

  describe('🤖 Auto-Capture', () => {
    it('should auto-capture decision from conversation', async () => {
      const conversationData = {
        sessionId: 'test-session-123',
        tool: 'claude',
        messages: [
          { role: 'user' as const, content: 'Should we migrate to Effect-TS for better async handling?' },
          { role: 'assistant' as const, content: 'Yes, Effect-TS would provide better error handling and composability. The main benefits are type safety and better composition. The risks include learning curve and bundle size increase.' }
        ],
        timestamp: new Date().toISOString(),
        projectPath: testDir
      }

      const captured = await Effect.runPromise(autoCapture(testDir, conversationData))
      
      if (captured) {
        assertExists(captured.id)
        assert(captured.title.toLowerCase().includes('effect-ts'))
        assertEquals(captured.category, 'technology') // Should auto-detect category
        assert(captured.tags.length > 0)
        assertExists(captured.problem.description)
        assertExists(captured.decision.chosen)
      }
    })

    it('should return null when no decision is detected', async () => {
      const conversationData = {
        sessionId: 'test-session-456',
        tool: 'claude',
        messages: [
          { role: 'user' as const, content: 'What is the weather today?' },
          { role: 'assistant' as const, content: 'I cannot access current weather information.' }
        ],
        timestamp: new Date().toISOString(),
        projectPath: testDir
      }

      const captured = await Effect.runPromise(autoCapture(testDir, conversationData))
      assertEquals(captured, null)
    })
  })

  describe('📤 Export Functionality', () => {
    beforeEach(async () => {
      // Create sample entries for export
      const entries = [
        {
          title: 'Architecture Decision 1',
          category: 'architecture' as DiaryCategory,
          tags: ['export-test'],
          problem: { description: 'Problem 1', context: 'Context 1', constraints: [] },
          decision: { chosen: 'Decision 1', rationale: 'Rationale 1', alternatives: [] },
          impact: { benefits: ['Benefit 1'], risks: ['Risk 1'], migrationNotes: null }
        },
        {
          title: 'Design Decision 2',
          category: 'design' as DiaryCategory,
          tags: ['export-test'],
          problem: { description: 'Problem 2', context: 'Context 2', constraints: [] },
          decision: { chosen: 'Decision 2', rationale: 'Rationale 2', alternatives: [] },
          impact: { benefits: ['Benefit 2'], risks: [], migrationNotes: 'Migration 2' }
        }
      ]

      for (const entry of entries) {
        await Effect.runPromise(createEntry(testDir, entry))
      }
    })

    it('should export diary to markdown format', async () => {
      const markdown = await Effect.runPromise(exportDiary(testDir, 'markdown'))
      
      assert(markdown.includes('# Decision Diary'), 'Should have title')
      assert(markdown.includes('Architecture Decision 1'), 'Should include entry titles')
      assert(markdown.includes('Design Decision 2'), 'Should include entry titles')
      assert(markdown.includes('## Problem'), 'Should have problem sections')
      assert(markdown.includes('## Decision'), 'Should have decision sections')
      assert(markdown.includes('## Impact'), 'Should have impact sections')
    })

    it('should export diary to JSON format', async () => {
      const jsonString = await Effect.runPromise(exportDiary(testDir, 'json'))
      const exported = JSON.parse(jsonString)
      
      assert(Array.isArray(exported), 'Should be an array')
      assertEquals(exported.length, 2)
      
      for (const entry of exported) {
        assertExists(entry.id)
        assertExists(entry.title)
        assertExists(entry.category)
        assertExists(entry.problem)
        assertExists(entry.decision)
        assertExists(entry.impact)
      }
    })
  })

  describe('🛡️ Error Handling', () => {
    it('should handle invalid diary directory gracefully', async () => {
      const invalidDir = '/nonexistent/path'
      
      try {
        await Effect.runPromise(getTimeline(invalidDir))
        assert(false, 'Should have thrown error for invalid directory')
      } catch (error) {
        assert(error instanceof Error)
        assert(error.message.includes('not found') || error.message.includes('invalid'))
      }
    })

    it('should validate entry data structure', async () => {
      try {
        const invalidEntry = {
          title: '', // Invalid: empty title
          category: 'invalid-category' as any, // Invalid: not in enum
          tags: ['test'],
          problem: { description: 'Test', context: 'Test', constraints: [] },
          decision: { chosen: 'Test', rationale: 'Test', alternatives: [] },
          impact: { benefits: [], risks: [], migrationNotes: null }
        }
        
        await Effect.runPromise(createEntry(testDir, invalidEntry as any))
        assert(false, 'Should have thrown validation error')
      } catch (error) {
        assert(error instanceof Error)
        // Should be a validation error
      }
    })

    it('should handle corrupted diary files gracefully', async () => {
      // Create a corrupted diary file
      const corruptedPath = resolve(diaryPath, 'diary')
      await Deno.mkdir(corruptedPath, { recursive: true })
      await Deno.writeTextFile(resolve(corruptedPath, 'corrupted.json'), 'invalid json content')

      // Timeline should skip corrupted files and continue
      const timeline = await Effect.runPromise(getTimeline(testDir))
      assert(Array.isArray(timeline), 'Should return array even with corrupted files')
    })
  })
})