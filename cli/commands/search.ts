/**
 * Global Search CLI Commands - Functional implementation using Effect-TS
 * Provides unified search across all .vibe data (memory, diary, rules)
 */

import { Effect, pipe } from 'effect'
import { searchDocuments, initializeSearch } from '../../search/index.ts'

/**
 * Global search command - searches across all .vibe data
 */
export const globalSearchCommand = (
  projectPath: string,
  query: string,
  options: {
    type?: string[]
    tags?: string[]
    priority?: string
    category?: string
    since?: string
    limit?: number
    format?: 'summary' | 'detailed'
  } = {}
) =>
  pipe(
    Effect.log(`🔍 Global search for: "${query}"`),
    Effect.flatMap(() => initializeSearch(projectPath)),
    Effect.flatMap(() => {
      const searchQuery = {
        term: query,
        filters: {
          doc_type: options.type?.[0] as 'memory' | 'diary' | 'rule' | 'dependency' | undefined,
          tags: options.tags,
          priority: options.priority as 'low' | 'medium' | 'high' | undefined,
          category: options.category,
          date_range: options.since ? {
            start: new Date(options.since).getTime(),
            end: Date.now()
          } : undefined,
        },
        mode: 'keyword' as const,
        limit: options.limit || 20,
        offset: 0,
      }
      
      return searchDocuments(searchQuery)
    }),
    Effect.flatMap(response => {
      const { results, total } = response
      
      return pipe(
        Effect.log(`📊 Found ${results.length} results (${total} total):`),
        Effect.flatMap(() => Effect.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')),
        Effect.flatMap(() => 
          Effect.all(
            results.map((result, index) => {
              const doc = result.document
              const formattedDate = new Date(doc.timestamp).toLocaleDateString()
              
              if (options.format === 'detailed') {
                return pipe(
                  Effect.log(`${index + 1}. ${doc.metadata.title || doc.id.slice(0, 8)}... (Score: ${result.score.toFixed(2)})`),
                  Effect.flatMap(() => Effect.log(`   📂 Type: ${doc.doc_type} | 🏷️ Category: ${doc.metadata.category}`)),
                  Effect.flatMap(() => Effect.log(`   📅 Date: ${formattedDate} | ⭐ Priority: ${doc.metadata.priority}`)),
                  Effect.flatMap(() => Effect.log(`   🏷️ Tags: ${doc.tags.join(', ')}`)),
                  Effect.flatMap(() => Effect.log(`   📝 Content: ${doc.content.slice(0, 150)}...`)),
                  Effect.flatMap(() => Effect.log(''))
                )
              } else {
                return pipe(
                  Effect.log(`${index + 1}. [${doc.doc_type}] ${doc.metadata.title || doc.id.slice(0, 8)}... (${result.score.toFixed(2)})`),
                  Effect.flatMap(() => Effect.log(`   ${formattedDate} | ${doc.content.slice(0, 80)}...`)),
                  Effect.flatMap(() => Effect.log(''))
                )
              }
            })
          )
        ),
        Effect.map(() => response)
      )
    })
  )

/**
 * Search by type command - focused search within specific data types
 */
export const searchByTypeCommand = (
  projectPath: string,
  type: 'memory' | 'diary' | 'rule' | 'dependency',
  query: string,
  options: {
    tags?: string[]
    limit?: number
    detailed?: boolean
  } = {}
) =>
  pipe(
    Effect.log(`🔍 Searching ${type} for: "${query}"`),
    Effect.flatMap(() => globalSearchCommand(projectPath, query, {
      type: [type],
      ...(options.tags && { tags: options.tags }),
      ...(options.limit && { limit: options.limit }),
      format: options.detailed ? 'detailed' : 'summary'
    }))
  )

/**
 * Recent search command - shows recently created/modified content
 */
export const recentSearchCommand = (
  projectPath: string,
  options: {
    days?: number
    type?: string[]
    limit?: number
  } = {}
) =>
  pipe(
    Effect.log(`📅 Searching recent content (last ${options.days || 7} days)`),
    Effect.flatMap(() => {
      const daysAgo = new Date(Date.now() - (options.days || 7) * 24 * 60 * 60 * 1000)
      
      return globalSearchCommand(projectPath, '*', {
        ...(options.type && { type: options.type }),
        since: daysAgo.toISOString(),
        limit: options.limit || 20,
        format: 'summary'
      })
    })
  )

/**
 * Search stats command - shows search index statistics
 */
export const searchStatsCommand = (projectPath: string) =>
  pipe(
    Effect.log('📊 Search Index Statistics'),
    Effect.flatMap(() => Effect.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')),
    Effect.flatMap(() => initializeSearch(projectPath)),
    Effect.flatMap(() => {
      // Get a broad search to understand index contents
      return searchDocuments({
        term: '*',
        filters: {},
        mode: 'keyword' as const,
        limit: 1000,
        offset: 0,
      })
    }),
    Effect.flatMap(response => {
      const stats = {
        total: response.total,
        byType: {} as Record<string, number>,
        byCategory: {} as Record<string, number>,
        byPriority: {} as Record<string, number>,
        averageScore: 0
      }
      
      for (const result of response.results) {
        const doc = result.document
        
        // Count by type
        stats.byType[doc.doc_type] = (stats.byType[doc.doc_type] || 0) + 1
        
        // Count by category
        if (doc.metadata.category) {
          stats.byCategory[doc.metadata.category] = (stats.byCategory[doc.metadata.category] || 0) + 1
        }
        
        // Count by priority
        stats.byPriority[doc.metadata.priority] = (stats.byPriority[doc.metadata.priority] || 0) + 1
        
        // Average score
        stats.averageScore += result.score
      }
      
      if (response.results.length > 0) {
        stats.averageScore = stats.averageScore / response.results.length
      }
      
      return pipe(
        Effect.log(`📚 Total indexed documents: ${stats.total}`),
        Effect.flatMap(() => Effect.log(`📊 Average relevance score: ${stats.averageScore.toFixed(3)}`)),
        Effect.flatMap(() => Effect.log('')),
        Effect.flatMap(() => Effect.log('📂 By Document Type:')),
        Effect.flatMap(() => Effect.all(
          Object.entries(stats.byType).map(([type, count]) =>
            Effect.log(`   ${type}: ${count}`)
          )
        )),
        Effect.flatMap(() => Effect.log('')),
        Effect.flatMap(() => Effect.log('🏷️ By Category:')),
        Effect.flatMap(() => Effect.all(
          Object.entries(stats.byCategory).map(([category, count]) =>
            Effect.log(`   ${category}: ${count}`)
          )
        )),
        Effect.flatMap(() => Effect.log('')),
        Effect.flatMap(() => Effect.log('⭐ By Priority:')),
        Effect.flatMap(() => Effect.all(
          Object.entries(stats.byPriority).map(([priority, count]) =>
            Effect.log(`   ${priority}: ${count}`)
          )
        )),
        Effect.map(() => stats)
      )
    })
  )

/**
 * Reindex command - rebuilds the search index
 */
export const reindexCommand = (projectPath: string) =>
  pipe(
    Effect.log('🔄 Rebuilding search index...'),
    Effect.flatMap(() => initializeSearch(projectPath)),
    Effect.flatMap(() => Effect.log('✅ Search index rebuilt successfully')),
    Effect.flatMap(() => searchStatsCommand(projectPath))
  )