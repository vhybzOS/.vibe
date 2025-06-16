/**
 * Memory CLI Commands - Functional implementation using Effect-TS
 * Provides memory management operations for .vibe system
 */

import { Effect, pipe } from 'effect'
import {
  deleteMemory,
  getMemory,
  loadMemories,
  type MemoryMetadataInput,
  searchMemory,
  storeMemory,
} from '../../memory/index.ts'
import { MemoryQuerySchema } from '../../schemas/memory.ts'
import { createCliError } from '../../lib/errors.ts'

/**
 * Add memory command - stores new memory entry
 */
export const addMemoryCommand = (
  projectPath: string,
  content: string,
  options: {
    type?: string
    tags?: string[]
    importance?: string
    source?: string
    sessionId?: string
    relatedFiles?: string[]
  } = {},
) =>
  pipe(
    Effect.log('💾 Adding memory entry...'),
    Effect.flatMap(() => {
      const metadata: MemoryMetadataInput = {
        type: (options.type as
          | 'knowledge'
          | 'conversation'
          | 'decision'
          | 'context'
          | 'preference'
          | 'pattern') ||
          'knowledge',
        source: {
          tool: (options.source as 'cursor' | 'windsurf' | 'claude' | 'copilot') || undefined,
          sessionId: options.sessionId || crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          location: projectPath,
        },
        tags: options.tags || [],
        importance: (options.importance as 'low' | 'medium' | 'high') || 'medium',
        projectPath,
        relatedFiles: options.relatedFiles || [],
        associatedRules: [],
      }

      return storeMemory(projectPath, content, metadata)
    }),
    Effect.flatMap((result) =>
      pipe(
        Effect.log(`✅ Memory stored with ID: ${result.id}`),
        Effect.flatMap(() => Effect.log(`📅 Created: ${new Date(result.timestamp).toLocaleString()}`)),
        Effect.map(() => result),
      )
    ),
  )

/**
 * Search memory command - finds memory entries by query
 */
export const searchMemoryCommand = (
  projectPath: string,
  query: string,
  options: {
    type?: string[]
    tags?: string[]
    tool?: string[]
    importance?: string[]
    timeRange?: { from?: string; to?: string }
    limit?: number
    threshold?: number
  } = {},
) =>
  pipe(
    Effect.log(`🔍 Searching memories for: "${query}"`),
    Effect.flatMap(() => {
      const searchQuery = MemoryQuerySchema.parse({
        query,
        type: options.type,
        tags: options.tags,
        tool: options.tool,
        importance: options.importance,
        timeRange: options.timeRange,
        limit: options.limit || 10,
        threshold: options.threshold || 0.1,
        includeArchived: false,
      })

      return searchMemory(projectPath, searchQuery)
    }),
    Effect.flatMap((results) =>
      pipe(
        Effect.log(`📊 Found ${results.length} matching memories:`),
        Effect.flatMap(() => Effect.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')),
        Effect.flatMap(() =>
          Effect.all(
            results.map((result, index) =>
              pipe(
                Effect.log(
                  `${index + 1}. ${result.memory.content.title} (Score: ${result.score.toFixed(2)})`,
                ),
                Effect.flatMap(() =>
                  Effect.log(
                    `   Type: ${result.memory.metadata.type} | Importance: ${result.memory.metadata.importance}`,
                  )
                ),
                Effect.flatMap(() => Effect.log(`   Tags: ${result.memory.metadata.tags.join(', ')}`)),
                Effect.flatMap(() =>
                  Effect.log(
                    `   Created: ${new Date(result.memory.lifecycle.created).toLocaleDateString()}`,
                  )
                ),
                Effect.flatMap(() => Effect.log(`   Summary: ${result.memory.content.summary.slice(0, 100)}...`)),
                Effect.flatMap(() => Effect.log('')),
              )
            ),
          )
        ),
        Effect.map(() => results),
      )
    ),
  )

/**
 * Get memory command - retrieves specific memory by ID
 */
export const getMemoryCommand = (
  projectPath: string,
  memoryId: string,
) =>
  pipe(
    Effect.log(`📖 Retrieving memory: ${memoryId}`),
    Effect.flatMap(() => getMemory(projectPath, memoryId)),
    Effect.flatMap((memory) => {
      if (!memory) {
        return pipe(
          Effect.log(`❌ Memory not found: ${memoryId}`),
          Effect.flatMap(() =>
            Effect.fail(
              createCliError(new Error('Memory not found'), 'Memory not found', 'get-memory'),
            )
          ),
        )
      }

      return pipe(
        Effect.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'),
        Effect.flatMap(() => Effect.log(`📋 Title: ${memory.content.title}`)),
        Effect.flatMap(() => Effect.log(`🏷️  Type: ${memory.metadata.type}`)),
        Effect.flatMap(() => Effect.log(`⭐ Importance: ${memory.metadata.importance}`)),
        Effect.flatMap(() => Effect.log(`🏷️  Tags: ${memory.metadata.tags.join(', ')}`)),
        Effect.flatMap(() => Effect.log(`📅 Created: ${new Date(memory.lifecycle.created).toLocaleString()}`)),
        Effect.flatMap(() => Effect.log(`👁️  Access Count: ${memory.metadata.accessCount}`)),
        Effect.flatMap(() => Effect.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')),
        Effect.flatMap(() => Effect.log('📖 Summary:')),
        Effect.flatMap(() => Effect.log(memory.content.summary)),
        Effect.flatMap(() => Effect.log('')),
        Effect.flatMap(() => Effect.log('📝 Content:')),
        Effect.flatMap(() => Effect.log(memory.content.content)),
        Effect.flatMap(() => Effect.log('')),
        Effect.flatMap(() => Effect.log('🔑 Keywords:')),
        Effect.flatMap(() => Effect.log(memory.content.keywords.join(', '))),
        Effect.map(() => memory),
      )
    }),
  )

/**
 * List memories command - shows all memories with optional filtering
 */
export const listMemoriesCommand = (
  projectPath: string,
  options: {
    type?: string
    importance?: string
    limit?: number
    recent?: boolean
  } = {},
) =>
  pipe(
    Effect.log('📚 Loading memories...'),
    Effect.flatMap(() => loadMemories(projectPath)),
    Effect.flatMap((memories) => {
      let filteredMemories = memories

      // Apply filters
      if (options.type) {
        filteredMemories = filteredMemories.filter((m) => m.metadata.type === options.type)
      }

      if (options.importance) {
        filteredMemories = filteredMemories.filter((m) => m.metadata.importance === options.importance)
      }

      // Sort by creation date (newest first)
      filteredMemories.sort((a, b) => new Date(b.lifecycle.created).getTime() - new Date(a.lifecycle.created).getTime())

      // Apply limit
      if (options.limit) {
        filteredMemories = filteredMemories.slice(0, options.limit)
      }

      return pipe(
        Effect.log(`📊 Found ${filteredMemories.length} memories (${memories.length} total):`),
        Effect.flatMap(() => Effect.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')),
        Effect.flatMap(() =>
          Effect.all(
            filteredMemories.map((memory, index) =>
              pipe(
                Effect.log(`${index + 1}. ${memory.content.title}`),
                Effect.flatMap(() =>
                  Effect.log(
                    `   ID: ${
                      memory.metadata.id.slice(0, 8)
                    }... | Type: ${memory.metadata.type} | Importance: ${memory.metadata.importance}`,
                  )
                ),
                Effect.flatMap(() =>
                  Effect.log(
                    `   Created: ${
                      new Date(memory.lifecycle.created).toLocaleDateString()
                    } | Access Count: ${memory.metadata.accessCount}`,
                  )
                ),
                Effect.flatMap(() => Effect.log(`   Summary: ${memory.content.summary.slice(0, 80)}...`)),
                Effect.flatMap(() => Effect.log('')),
              )
            ),
          )
        ),
        Effect.map(() => filteredMemories),
      )
    }),
  )

/**
 * Delete memory command - removes memory entry
 */
export const deleteMemoryCommand = (
  projectPath: string,
  memoryId: string,
  options: { force?: boolean } = {},
) =>
  pipe(
    Effect.log(`🗑️ Deleting memory: ${memoryId}`),
    Effect.flatMap(() => {
      if (!options.force) {
        return pipe(
          Effect.log('⚠️  Are you sure? This cannot be undone.'),
          Effect.flatMap(() => Effect.log('   Use --force flag to confirm deletion.')),
          Effect.flatMap(() =>
            Effect.fail(
              createCliError(
                new Error('Deletion cancelled'),
                'Deletion cancelled - use --force flag',
                'delete-memory',
              ),
            )
          ),
        )
      }

      return deleteMemory(projectPath, memoryId)
    }),
    Effect.flatMap((deleted) => {
      if (deleted) {
        return Effect.log('✅ Memory deleted successfully')
      } else {
        return pipe(
          Effect.log('❌ Memory not found or could not be deleted'),
          Effect.flatMap(() =>
            Effect.fail(
              createCliError(
                new Error('Memory deletion failed'),
                'Memory deletion failed',
                'delete-memory',
              ),
            )
          ),
        )
      }
    }),
  )

/**
 * Memory stats command - shows memory system statistics
 */
export const memoryStatsCommand = (projectPath: string) =>
  pipe(
    Effect.log('📊 Memory System Statistics'),
    Effect.flatMap(() => Effect.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')),
    Effect.flatMap(() => loadMemories(projectPath)),
    Effect.flatMap((memories) => {
      const stats = {
        total: memories.length,
        byType: {} as Record<string, number>,
        byImportance: {} as Record<string, number>,
        totalAccesses: 0,
        averageContentLength: 0,
        recentCount: 0,
      }

      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

      for (const memory of memories) {
        // Count by type
        stats.byType[memory.metadata.type] = (stats.byType[memory.metadata.type] || 0) + 1

        // Count by importance
        stats.byImportance[memory.metadata.importance] = (stats.byImportance[memory.metadata.importance] || 0) + 1

        // Total accesses
        stats.totalAccesses += memory.metadata.accessCount

        // Content length
        stats.averageContentLength += memory.content.content.length

        // Recent count
        if (new Date(memory.lifecycle.created) > oneWeekAgo) {
          stats.recentCount++
        }
      }

      if (memories.length > 0) {
        stats.averageContentLength = Math.round(stats.averageContentLength / memories.length)
      }

      return pipe(
        Effect.log(`📚 Total memories: ${stats.total}`),
        Effect.flatMap(() => Effect.log(`📈 Recent (last 7 days): ${stats.recentCount}`)),
        Effect.flatMap(() => Effect.log(`👁️  Total accesses: ${stats.totalAccesses}`)),
        Effect.flatMap(() => Effect.log(`📏 Average content length: ${stats.averageContentLength} chars`)),
        Effect.flatMap(() => Effect.log('')),
        Effect.flatMap(() => Effect.log('📊 By Type:')),
        Effect.flatMap(() =>
          Effect.all(
            Object.entries(stats.byType).map(([type, count]) => Effect.log(`   ${type}: ${count}`)),
          )
        ),
        Effect.flatMap(() => Effect.log('')),
        Effect.flatMap(() => Effect.log('⭐ By Importance:')),
        Effect.flatMap(() =>
          Effect.all(
            Object.entries(stats.byImportance).map(([importance, count]) => Effect.log(`   ${importance}: ${count}`)),
          )
        ),
        Effect.map(() => stats),
      )
    }),
  )
