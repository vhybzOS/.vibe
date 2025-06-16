/**
 * Diary CLI Commands - Functional implementation using Effect-TS
 * Provides diary management operations for architectural decisions
 */

import { Effect, pipe } from 'effect'
import { resolve } from '@std/path'
import { 
  createEntry, 
  searchDiary, 
  getTimeline, 
  updateEntry, 
  deleteEntry, 
  exportDiary,
  type DiaryEntryInput,
  type DiarySearchQuery,
  type TimelineRange,
  type DiaryEntryUpdate
} from '../../diary/index.ts'
import { type DiaryCategory, DIARY_CATEGORIES, DiarySearchQuerySchema } from '../../schemas/diary.ts'

/**
 * Add diary entry command - creates new architectural decision entry
 */
export const addDiaryCommand = (
  projectPath: string,
  title: string,
  options: {
    category?: string
    tags?: string[]
    problem?: string
    context?: string
    constraints?: string[]
    decision?: string
    rationale?: string
    alternatives?: string[]
    benefits?: string[]
    risks?: string[]
    migrationNotes?: string
  } = {}
) =>
  pipe(
    Effect.log(`📔 Creating diary entry: "${title}"`),
    Effect.flatMap(() => {
      const entryInput: DiaryEntryInput = {
        title,
        category: (options.category as DiaryCategory) || 'decision',
        tags: options.tags || [],
        problem: {
          description: options.problem || 'Problem description needed',
          context: options.context || 'Context information needed',
          constraints: options.constraints || []
        },
        decision: {
          chosen: options.decision || 'Decision details needed',
          rationale: options.rationale || 'Rationale needed',
          alternatives: (options.alternatives || []).map(alt => ({
            option: alt,
            reason: 'Reason not specified'
          }))
        },
        impact: {
          benefits: options.benefits || [],
          risks: options.risks || [],
          migrationNotes: options.migrationNotes || null
        }
      }
      
      return createEntry(projectPath, entryInput)
    }),
    Effect.flatMap(entry => 
      pipe(
        Effect.log(`✅ Diary entry created with ID: ${entry.id}`),
        Effect.flatMap(() => Effect.log(`📅 Created: ${new Date(entry.timestamp).toLocaleString()}`)),
        Effect.flatMap(() => Effect.log(`🏷️ Category: ${entry.category}`)),
        Effect.flatMap(() => Effect.log(`🏷️ Tags: ${entry.tags.join(', ')}`)),
        Effect.map(() => entry)
      )
    )
  )

/**
 * Search diary command - finds diary entries by query
 */
export const searchDiaryCommand = (
  projectPath: string,
  query: string,
  options: {
    category?: string
    tags?: string[]
    since?: string
    until?: string
    limit?: number
  } = {}
) =>
  pipe(
    Effect.log(`🔍 Searching diary for: "${query}"`),
    Effect.flatMap(() => {
      const searchQuery: DiarySearchQuery = {
        query: query || undefined,
        category: options.category,
        tags: options.tags,
        dateRange: (options.since || options.until) ? {
          from: options.since || new Date(0).toISOString(),
          to: options.until || new Date().toISOString()
        } : undefined,
        limit: options.limit || 10
      }
      
      return searchDiary(projectPath, searchQuery)
    }),
    Effect.flatMap(results => 
      pipe(
        Effect.log(`📊 Found ${results.length} diary entries:`),
        Effect.flatMap(() => Effect.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')),
        Effect.flatMap(() => 
          Effect.all(
            results.map((entry, index) =>
              pipe(
                Effect.log(`${index + 1}. ${entry.title}`),
                Effect.flatMap(() => Effect.log(`   Category: ${entry.category} | Tags: ${entry.tags.join(', ')}`)),
                Effect.flatMap(() => Effect.log(`   Created: ${new Date(entry.timestamp).toLocaleDateString()}`)),
                Effect.flatMap(() => Effect.log(`   Problem: ${entry.problem.description.slice(0, 80)}...`)),
                Effect.flatMap(() => Effect.log(`   Decision: ${entry.decision.chosen.slice(0, 80)}...`)),
                Effect.flatMap(() => Effect.log(''))
              )
            )
          )
        ),
        Effect.map(() => results)
      )
    )
  )

/**
 * Timeline command - shows diary entries in chronological order
 */
export const timelineCommand = (
  projectPath: string,
  options: {
    since?: string
    until?: string
    limit?: number
    category?: string
  } = {}
) =>
  pipe(
    Effect.log('📅 Generating diary timeline...'),
    Effect.flatMap(() => {
      const dateRange: TimelineRange | undefined = (options.since || options.until) ? {
        from: options.since || new Date(0).toISOString(),
        to: options.until || new Date().toISOString()
      } : undefined
      
      return getTimeline(projectPath, dateRange)
    }),
    Effect.flatMap(entries => {
      // Apply additional filters
      let filteredEntries = entries
      
      if (options.category) {
        filteredEntries = entries.filter(entry => entry.category === options.category)
      }
      
      if (options.limit) {
        filteredEntries = filteredEntries.slice(0, options.limit)
      }
      
      return pipe(
        Effect.log(`📊 Timeline: ${filteredEntries.length} entries (${entries.length} total)`),
        Effect.flatMap(() => Effect.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')),
        Effect.flatMap(() => 
          Effect.all(
            filteredEntries.map((entry, index) =>
              pipe(
                Effect.log(`${index + 1}. [${new Date(entry.timestamp).toLocaleDateString()}] ${entry.title}`),
                Effect.flatMap(() => Effect.log(`   📂 ${entry.category} | 🏷️ ${entry.tags.join(', ')}`)),
                Effect.flatMap(() => Effect.log(`   💡 ${entry.decision.chosen.slice(0, 100)}...`)),
                Effect.flatMap(() => Effect.log(''))
              )
            )
          )
        ),
        Effect.map(() => filteredEntries)
      )
    })
  )

/**
 * Get diary entry command - retrieves specific entry by ID
 */
export const getDiaryCommand = (
  projectPath: string,
  entryId: string
) =>
  pipe(
    Effect.log(`📖 Retrieving diary entry: ${entryId}`),
    Effect.flatMap(() => {
      // Search for the entry by ID using timeline (since we don't have a direct get function)
      return getTimeline(projectPath)
    }),
    Effect.flatMap(entries => {
      const entry = entries.find(e => e.id === entryId || e.id.startsWith(entryId))
      
      if (!entry) {
        return pipe(
          Effect.log(`❌ Diary entry not found: ${entryId}`),
          Effect.flatMap(() => Effect.fail(new Error('Diary entry not found')))
        )
      }
      
      return pipe(
        Effect.all([
          Effect.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'),
          Effect.log(`📋 Title: ${entry.title}`),
          Effect.log(`🏷️ Category: ${entry.category}`),
          Effect.log(`🏷️ Tags: ${entry.tags.join(', ')}`),
          Effect.log(`📅 Created: ${new Date(entry.timestamp).toLocaleString()}`),
          Effect.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'),
          Effect.log('🔴 Problem:'),
          Effect.log(`Description: ${entry.problem.description}`),
          Effect.log(`Context: ${entry.problem.context}`)
        ], { discard: true }),
        Effect.flatMap(() => {
          if (entry.problem.constraints.length > 0) {
            return pipe(
              Effect.log('Constraints:'),
              Effect.flatMap(() => Effect.all(
                entry.problem.constraints.map(constraint => Effect.log(`- ${constraint}`)),
                { discard: true }
              ))
            )
          }
          return Effect.void
        }),
        Effect.flatMap(() => Effect.all([
          Effect.log(''),
          Effect.log('✅ Decision:'),
          Effect.log(`Chosen: ${entry.decision.chosen}`),
          Effect.log(`Rationale: ${entry.decision.rationale}`)
        ], { discard: true })),
        Effect.flatMap(() => {
          if (entry.decision.alternatives.length > 0) {
            return pipe(
              Effect.log('Alternatives:'),
              Effect.flatMap(() => Effect.all(
                entry.decision.alternatives.map(alt => Effect.log(`- ${alt.option}: ${alt.reason}`)),
                { discard: true }
              ))
            )
          }
          return Effect.void
        }),
        Effect.flatMap(() => Effect.log('')),
        Effect.flatMap(() => Effect.log('📊 Impact:')),
        Effect.flatMap(() => {
          if (entry.impact.benefits.length > 0) {
            return pipe(
              Effect.log('Benefits:'),
              Effect.flatMap(() => Effect.all(
                entry.impact.benefits.map(benefit => Effect.log(`+ ${benefit}`)),
                { discard: true }
              ))
            )
          }
          return Effect.void
        }),
        Effect.flatMap(() => {
          if (entry.impact.risks.length > 0) {
            return pipe(
              Effect.log('Risks:'),
              Effect.flatMap(() => Effect.all(
                entry.impact.risks.map(risk => Effect.log(`- ${risk}`)),
                { discard: true }
              ))
            )
          }
          return Effect.void
        }),
        Effect.flatMap(() => {
          if (entry.impact.migrationNotes) {
            return Effect.log(`Migration Notes: ${entry.impact.migrationNotes}`)
          }
          return Effect.void
        }),
        Effect.map(() => entry)
      )
    })
  )

/**
 * Update diary entry command - updates existing entry
 */
export const updateDiaryCommand = (
  projectPath: string,
  entryId: string,
  updates: {
    title?: string
    category?: string
    tags?: string[]
    problem?: string
    context?: string
    decision?: string
    rationale?: string
    benefits?: string[]
    risks?: string[]
    migrationNotes?: string
  } = {}
) =>
  pipe(
    Effect.log(`✏️ Updating diary entry: ${entryId}`),
    Effect.flatMap(() => {
      const entryUpdates: DiaryEntryUpdate = {}
      
      if (updates.title) entryUpdates.title = updates.title
      if (updates.category) entryUpdates.category = updates.category as DiaryCategory
      if (updates.tags) entryUpdates.tags = updates.tags
      
      if (updates.problem || updates.context) {
        entryUpdates.problem = {}
        if (updates.problem) entryUpdates.problem.description = updates.problem
        if (updates.context) entryUpdates.problem.context = updates.context
      }
      
      if (updates.decision || updates.rationale) {
        entryUpdates.decision = {}
        if (updates.decision) entryUpdates.decision.chosen = updates.decision
        if (updates.rationale) entryUpdates.decision.rationale = updates.rationale
      }
      
      if (updates.benefits || updates.risks || updates.migrationNotes) {
        entryUpdates.impact = {}
        if (updates.benefits) entryUpdates.impact.benefits = updates.benefits
        if (updates.risks) entryUpdates.impact.risks = updates.risks
        if (updates.migrationNotes) entryUpdates.impact.migrationNotes = updates.migrationNotes
      }
      
      return updateEntry(projectPath, entryId, entryUpdates)
    }),
    Effect.flatMap(updatedEntry => 
      pipe(
        Effect.log('✅ Diary entry updated successfully'),
        Effect.flatMap(() => Effect.log(`📋 Title: ${updatedEntry.title}`)),
        Effect.flatMap(() => Effect.log(`📅 Updated: ${new Date(updatedEntry.timestamp).toLocaleString()}`)),
        Effect.map(() => updatedEntry)
      )
    )
  )

/**
 * Delete diary entry command - removes entry
 */
export const deleteDiaryCommand = (
  projectPath: string,
  entryId: string,
  options: { force?: boolean } = {}
) =>
  pipe(
    Effect.log(`🗑️ Deleting diary entry: ${entryId}`),
    Effect.flatMap(() => {
      if (!options.force) {
        return pipe(
          Effect.log('⚠️ Are you sure? This cannot be undone.'),
          Effect.flatMap(() => Effect.log('   Use --force flag to confirm deletion.')),
          Effect.flatMap(() => Effect.fail(new Error('Deletion cancelled - use --force flag')))
        )
      }
      
      return deleteEntry(projectPath, entryId)
    }),
    Effect.flatMap(deleted => {
      if (deleted) {
        return Effect.log('✅ Diary entry deleted successfully')
      } else {
        return pipe(
          Effect.log('❌ Diary entry not found or could not be deleted'),
          Effect.flatMap(() => Effect.fail(new Error('Diary entry deletion failed')))
        )
      }
    })
  )

/**
 * Export diary command - exports diary in specified format
 */
export const exportDiaryCommand = (
  projectPath: string,
  options: {
    format?: 'markdown' | 'json'
    output?: string
  } = {}
) =>
  pipe(
    Effect.log('📤 Exporting diary...'),
    Effect.flatMap(() => {
      const format = options.format || 'markdown'
      return exportDiary(projectPath, format)
    }),
    Effect.flatMap(content => {
      if (options.output) {
        return pipe(
          Effect.tryPromise({
            try: async () => {
              await Deno.writeTextFile(options.output!, content)
              return options.output!
            },
            catch: (error) => new Error(`Failed to write export file: ${error}`)
          }),
          Effect.flatMap(filePath => Effect.log(`✅ Diary exported to: ${filePath}`))
        )
      } else {
        return pipe(
          Effect.log('📄 Diary Export:'),
          Effect.flatMap(() => Effect.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')),
          Effect.flatMap(() => Effect.log(content))
        )
      }
    })
  )

/**
 * List diary categories command - shows available categories
 */
export const listCategoriesCommand = () =>
  pipe(
    Effect.log('📂 Available Diary Categories:'),
    Effect.flatMap(() => Effect.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')),
    Effect.flatMap(() => Effect.all(
      DIARY_CATEGORIES.map((category, index) =>
        Effect.log(`${index + 1}. ${category}`)
      )
    )),
    Effect.flatMap(() => Effect.log('')),
    Effect.flatMap(() => Effect.log('Usage: vibe diary add "Title" --category=<category>'))
  )

/**
 * Diary stats command - shows diary system statistics
 */
export const diaryStatsCommand = (projectPath: string) =>
  pipe(
    Effect.log('📊 Diary System Statistics'),
    Effect.flatMap(() => Effect.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')),
    Effect.flatMap(() => getTimeline(projectPath)),
    Effect.flatMap(entries => {
      const stats = {
        total: entries.length,
        byCategory: {} as Record<string, number>,
        recent: 0,
        thisMonth: 0,
        averageTagsPerEntry: 0
      }
      
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      let totalTags = 0
      
      for (const entry of entries) {
        // Count by category
        stats.byCategory[entry.category] = (stats.byCategory[entry.category] || 0) + 1
        
        // Count recent entries
        const entryDate = new Date(entry.timestamp)
        if (entryDate > oneWeekAgo) {
          stats.recent++
        }
        if (entryDate > oneMonthAgo) {
          stats.thisMonth++
        }
        
        // Count tags
        totalTags += entry.tags.length
      }
      
      if (entries.length > 0) {
        stats.averageTagsPerEntry = Math.round((totalTags / entries.length) * 10) / 10
      }
      
      return pipe(
        Effect.log(`📚 Total entries: ${stats.total}`),
        Effect.flatMap(() => Effect.log(`📈 Recent (last 7 days): ${stats.recent}`)),
        Effect.flatMap(() => Effect.log(`📅 This month: ${stats.thisMonth}`)),
        Effect.flatMap(() => Effect.log(`🏷️ Average tags per entry: ${stats.averageTagsPerEntry}`)),
        Effect.flatMap(() => Effect.log('')),
        Effect.flatMap(() => Effect.log('📂 By Category:')),
        Effect.flatMap(() => Effect.all(
          Object.entries(stats.byCategory).map(([category, count]) =>
            Effect.log(`   ${category}: ${count}`)
          )
        )),
        Effect.map(() => stats)
      )
    })
  )