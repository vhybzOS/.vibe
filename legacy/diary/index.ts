/**
 * Diary System - Clean, functional implementation using Effect-TS
 * Captures and searches architectural decisions and project evolution
 */

import { Effect, pipe } from 'effect'
import { resolve } from '@std/path'
import {
  type Decision,
  DIARY_CATEGORIES,
  type DiaryCategory,
  DiaryEntry,
  DiaryEntrySchema,
  type Impact,
  type Problem,
} from '../schemas/diary.ts'
import { initializeSearch, insertDocument, type SearchDocument, searchDocuments } from '../search/index.ts'
import { createFileSystemError, createParseError, type VibeError } from '../lib/errors.ts'

/**
 * Interface for diary entry creation input
 */
export interface DiaryEntryInput {
  title: string
  category: DiaryCategory
  tags: string[]
  problem: Problem
  decision: Decision
  impact: Impact
}

/**
 * Interface for diary entry updates
 */
export interface DiaryEntryUpdate {
  title?: string
  category?: DiaryCategory
  tags?: string[]
  problem?: Partial<Problem>
  decision?: Partial<Decision>
  impact?: Partial<Impact>
}

/**
 * Interface for diary search query
 */
export interface DiarySearchQuery {
  query?: string
  category?: DiaryCategory
  tags?: string[]
  dateRange?: {
    from: string
    to: string
  }
  limit: number
}

/**
 * Interface for timeline date range
 */
export interface TimelineRange {
  from: string
  to: string
}

/**
 * Interface for conversation data for auto-capture
 */
export interface ConversationData {
  sessionId: string
  tool: string
  messages: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
  timestamp: string
  projectPath: string
}

/**
 * Creates a new diary entry with complete structure
 */
export const createEntry = (
  vibePath: string,
  entryInput: DiaryEntryInput,
) =>
  pipe(
    Effect.sync(() => createDiaryEntry(entryInput, vibePath)),
    Effect.flatMap((entry) =>
      pipe(
        validateDiaryEntry(entry),
        Effect.flatMap(() => saveEntryToFile(vibePath, entry)),
        Effect.flatMap(() => indexDiaryEntry(vibePath, entry)),
        Effect.map(() => entry),
      )
    ),
  )

/**
 * Searches diary entries using the search system
 */
export const searchDiary = (
  vibePath: string,
  query: DiarySearchQuery,
) =>
  pipe(
    initializeSearch(vibePath),
    Effect.flatMap(() => {
      // Convert DiarySearchQuery to SearchQuery format
      const searchQuery = {
        term: query.query || '',
        filters: {
          doc_type: 'diary' as const,
          tags: query.tags && query.tags.length > 0 ? query.tags : undefined,
          date_range: query.dateRange
            ? {
              start: new Date(query.dateRange.from).getTime(),
              end: new Date(query.dateRange.to).getTime(),
            }
            : undefined,
          category: query.category || undefined,
        },
        mode: 'keyword' as const,
        limit: query.limit || 20,
        offset: 0,
      }

      return searchDocuments(searchQuery)
    }),
    Effect.flatMap((response) =>
      pipe(
        // Filter results by relevance score first - lower threshold for filter-only searches
        Effect.sync(() => response.results.filter((result) => query.query ? result.score >= 0.5 : result.score >= 0.1)),
        Effect.flatMap((filteredResults) =>
          Effect.all(
            filteredResults.map((result) => loadEntryFromId(vibePath, result.document.id)),
          )
        ),
        Effect.map((entries) => entries.filter((entry): entry is DiaryEntry => entry !== null)),
      )
    ),
  )

/**
 * Gets timeline entries in chronological order
 */
export const getTimeline = (
  vibePath: string,
  dateRange?: TimelineRange,
) =>
  pipe(
    loadAllEntries(vibePath),
    Effect.map((entries) => {
      let filteredEntries = entries

      // Apply date range filter if provided
      if (dateRange) {
        const fromTime = new Date(dateRange.from).getTime()
        const toTime = new Date(dateRange.to).getTime()

        filteredEntries = entries.filter((entry) => {
          const entryTime = new Date(entry.timestamp).getTime()
          return entryTime >= fromTime && entryTime <= toTime
        })
      }

      // Sort by timestamp (newest first)
      return filteredEntries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    }),
  )

/**
 * Updates an existing diary entry
 */
export const updateEntry = (
  vibePath: string,
  id: string,
  updates: DiaryEntryUpdate,
) =>
  pipe(
    loadEntryFromId(vibePath, id),
    Effect.flatMap((entry) => {
      if (!entry) {
        return Effect.fail(createFileSystemError(
          new Error('Entry not found'),
          `${vibePath}/.vibe/diary/${id}.json`,
          'Diary entry not found',
        ))
      }

      const updatedEntry: DiaryEntry = {
        ...entry,
        ...updates,
        problem: updates.problem ? { ...entry.problem, ...updates.problem } : entry.problem,
        decision: updates.decision ? { ...entry.decision, ...updates.decision } : entry.decision,
        impact: updates.impact ? { ...entry.impact, ...updates.impact } : entry.impact,
        timestamp: new Date().toISOString(), // Update timestamp
      }

      return pipe(
        validateDiaryEntry(updatedEntry),
        Effect.flatMap(() => saveEntryToFile(vibePath, updatedEntry)),
        Effect.flatMap(() => indexDiaryEntry(vibePath, updatedEntry)),
        Effect.map(() => updatedEntry),
      )
    }),
  )

/**
 * Deletes a diary entry
 */
export const deleteEntry = (
  vibePath: string,
  id: string,
) =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        const entryPath = resolve(vibePath, '.vibe', 'diary', `${id}.json`)
        await Deno.remove(entryPath)
        return true
      },
      catch: () => false,
    }),
    Effect.catchAll(() => Effect.succeed(false)),
  )

/**
 * Auto-captures decision from conversation data
 */
export const autoCapture = (
  vibePath: string,
  conversationData: ConversationData,
) =>
  pipe(
    Effect.sync(() => analyzeConversationForDecision(conversationData)),
    Effect.flatMap((analysisResult) => {
      if (!analysisResult) {
        return Effect.succeed(null)
      }

      return createEntry(vibePath, analysisResult)
    }),
  )

/**
 * Exports diary entries in specified format
 */
export const exportDiary = (
  vibePath: string,
  format: 'markdown' | 'json',
) =>
  pipe(
    loadAllEntries(vibePath),
    Effect.map((entries) => {
      if (format === 'json') {
        return JSON.stringify(entries, null, 2)
      }

      return exportToMarkdown(entries)
    }),
  )

// ==================== Helper Functions ====================

/**
 * Creates a complete diary entry with all required fields
 */
const createDiaryEntry = (
  entryInput: DiaryEntryInput,
  vibePath: string,
): DiaryEntry => {
  const now = new Date().toISOString()
  const entryId = crypto.randomUUID()

  return {
    id: entryId,
    title: entryInput.title,
    category: entryInput.category,
    tags: entryInput.tags,
    timestamp: now,
    problem: entryInput.problem,
    decision: entryInput.decision,
    impact: entryInput.impact,
  }
}

/**
 * Validates diary entry using schema
 */
const validateDiaryEntry = (entry: DiaryEntry) =>
  Effect.try({
    try: () => DiaryEntrySchema.parse(entry),
    catch: (error) => createParseError(error, 'diary-entry', 'Invalid diary entry schema'),
  })

/**
 * Saves diary entry to JSON file
 */
const saveEntryToFile = (vibePath: string, entry: DiaryEntry) =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        const diaryDir = resolve(vibePath, '.vibe', 'diary')
        await Deno.mkdir(diaryDir, { recursive: true })

        const filePath = resolve(diaryDir, `${entry.id}.json`)
        await Deno.writeTextFile(filePath, JSON.stringify(entry, null, 2))
        return filePath
      },
      catch: (error) => createFileSystemError(error, vibePath, 'Failed to save diary entry'),
    }),
  )

/**
 * Indexes diary entry in the search system
 */
const indexDiaryEntry = (vibePath: string, entry: DiaryEntry) =>
  pipe(
    initializeSearch(vibePath),
    Effect.flatMap(() => {
      const searchableContent = [
        `Title: ${entry.title}`,
        `Category: ${entry.category}`,
        `Problem: ${entry.problem.description}`,
        `Context: ${entry.problem.context}`,
        `Decision: ${entry.decision.chosen}`,
        `Rationale: ${entry.decision.rationale}`,
        `Benefits: ${entry.impact.benefits.join(', ')}`,
        `Risks: ${entry.impact.risks.join(', ')}`,
        `Tags: ${entry.tags.join(', ')}`,
        `Constraints: ${entry.problem.constraints.join(', ')}`,
        ...(entry.decision.alternatives.map((alt) => `Alternative: ${alt.option} - ${alt.reason}`)),
        ...(entry.impact.migrationNotes ? [`Migration: ${entry.impact.migrationNotes}`] : []),
      ].join('\n\n')

      const document: SearchDocument = {
        id: entry.id,
        doc_type: 'diary',
        timestamp: new Date(entry.timestamp).getTime(),
        content: searchableContent,
        tags: entry.tags,
        metadata: {
          project_path: vibePath,
          source: 'diary',
          priority: 'medium', // Default priority for diary entries
          category: entry.category,
          title: entry.title,
        },
      }

      return insertDocument(document)
    }),
  )

/**
 * Loads a single diary entry by ID
 */
const loadEntryFromId = (vibePath: string, id: string) =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        const filePath = resolve(vibePath, '.vibe', 'diary', `${id}.json`)
        const content = await Deno.readTextFile(filePath)
        return JSON.parse(content)
      },
      catch: (error) =>
        createFileSystemError(
          error,
          `${vibePath}/.vibe/diary/${id}.json`,
          'Failed to load diary entry',
        ),
    }),
    Effect.flatMap((data) =>
      Effect.try({
        try: () => DiaryEntrySchema.parse(data),
        catch: (error) => createParseError(error, `${id}.json`, 'Invalid diary entry schema'),
      })
    ),
    Effect.catchAll(() => Effect.succeed(null)),
  )

/**
 * Loads all diary entries from storage
 */
const loadAllEntries = (vibePath: string) =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        const diaryDir = resolve(vibePath, '.vibe', 'diary')
        const files = []
        try {
          for await (const entry of Deno.readDir(diaryDir)) {
            if (entry.isFile && entry.name.endsWith('.json')) {
              files.push(resolve(diaryDir, entry.name))
            }
          }
        } catch {
          return [] // Directory doesn't exist
        }
        return files
      },
      catch: () => [],
    }),
    Effect.flatMap((files) =>
      Effect.all(
        files.map(loadSingleEntryFile),
        { concurrency: 10 },
      )
    ),
    Effect.map((entries) => entries.filter((entry): entry is DiaryEntry => entry !== null)),
  )

/**
 * Loads a single diary entry file with error handling
 */
const loadSingleEntryFile = (filePath: string) =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        const content = await Deno.readTextFile(filePath)
        return JSON.parse(content)
      },
      catch: () => null,
    }),
    Effect.flatMap((data) => {
      if (!data) return Effect.succeed(null)

      return Effect.try({
        try: () => DiaryEntrySchema.parse(data),
        catch: () => null,
      })
    }),
    Effect.catchAll(() => Effect.succeed(null)),
  )

/**
 * Analyzes conversation for decision patterns
 */
const analyzeConversationForDecision = (
  conversationData: ConversationData,
): DiaryEntryInput | null => {
  const conversationText = conversationData.messages
    .map((msg) => `${msg.role}: ${msg.content}`)
    .join('\n\n')

  // Simple decision detection patterns
  const decisionPatterns = [
    /should we/i,
    /decided to/i,
    /migration/i,
    /migrate/i,
    /switch to/i,
    /use.*instead/i,
    /better to/i,
    /recommend/i,
    /yes.*effect-ts/i,
  ]

  const hasDecisionPattern = decisionPatterns.some((pattern) => pattern.test(conversationText))

  if (!hasDecisionPattern) {
    return null
  }

  // Auto-detect category based on content
  const category = detectCategory(conversationText)

  // Extract key concepts for title
  const title = extractDecisionTitle(conversationText)

  // Extract tags from content
  const tags = extractTags(conversationText)

  return {
    title,
    category,
    tags,
    problem: {
      description: extractProblemDescription(conversationText),
      context: `Auto-captured from ${conversationData.tool} conversation`,
      constraints: [],
    },
    decision: {
      chosen: extractDecision(conversationText),
      rationale: extractRationale(conversationText),
      alternatives: [],
    },
    impact: {
      benefits: extractBenefits(conversationText),
      risks: extractRisks(conversationText),
      migrationNotes: null,
    },
  }
}

/**
 * Detects category from conversation content
 */
const detectCategory = (content: string): DiaryCategory => {
  const text = content.toLowerCase()

  if (text.includes('architect') || text.includes('design pattern')) return 'architecture'
  if (text.includes('design') || text.includes('interface')) return 'design'
  if (text.includes('technology') || text.includes('library') || text.includes('framework')) {
    return 'technology'
  }
  if (text.includes('process') || text.includes('workflow')) return 'process'

  return 'technology' // Default fallback
}

/**
 * Extracts decision title from conversation
 */
const extractDecisionTitle = (content: string): string => {
  const text = content.toLowerCase()

  // Look for common decision patterns
  const patterns = [
    /migration to ([^.!?]+)/i,
    /switch to ([^.!?]+)/i,
    /use ([^.!?]+)/i,
    /decided to ([^.!?]+)/i,
  ]

  for (const pattern of patterns) {
    const match = content.match(pattern)
    if (match && match[1]) {
      return `Decision: ${match[1].trim()}`
    }
  }

  return 'Auto-captured Decision'
}

/**
 * Extracts tags from conversation content
 */
const extractTags = (content: string): string[] => {
  const text = content.toLowerCase()
  const tags = []

  const techPatterns = [
    'effect-ts',
    'react',
    'typescript',
    'javascript',
    'async',
    'await',
    'migration',
    'testing',
    'performance',
    'security',
    'api',
    'database',
  ]

  for (const tech of techPatterns) {
    if (text.includes(tech)) {
      tags.push(tech)
    }
  }

  return tags.slice(0, 5) // Limit to 5 tags
}

/**
 * Extracts problem description from conversation
 */
const extractProblemDescription = (content: string): string => {
  const lines = content.split('\n')
  const userMessages = lines.filter((line) => line.startsWith('user:'))

  if (userMessages.length > 0) {
    const firstMessage = userMessages[0]
    if (firstMessage) {
      return firstMessage.replace('user:', '').trim().slice(0, 200)
    }
  }

  return 'Problem extracted from conversation'
}

/**
 * Extracts decision from conversation
 */
const extractDecision = (content: string): string => {
  const assistantMessages = content.split('\n')
    .filter((line) => line.startsWith('assistant:'))

  if (assistantMessages.length > 0) {
    const firstMessage = assistantMessages[0]
    if (firstMessage) {
      const firstResponse = firstMessage.replace('assistant:', '').trim()
      return firstResponse.slice(0, 100) + (firstResponse.length > 100 ? '...' : '')
    }
  }

  return 'Decision captured from conversation'
}

/**
 * Extracts rationale from conversation
 */
const extractRationale = (content: string): string => {
  const text = content.toLowerCase()

  if (text.includes('because')) {
    const becauseMatch = content.match(/because ([^.!?]+)/i)
    if (becauseMatch && becauseMatch[1]) {
      return becauseMatch[1].trim()
    }
  }

  return 'Rationale from conversation analysis'
}

/**
 * Extracts benefits from conversation
 */
const extractBenefits = (content: string): string[] => {
  const text = content.toLowerCase()
  const benefits = []

  if (text.includes('better')) benefits.push('Better approach')
  if (text.includes('performance')) benefits.push('Performance improvement')
  if (text.includes('type safety')) benefits.push('Type safety')
  if (text.includes('composable')) benefits.push('Better composability')

  return benefits.slice(0, 3)
}

/**
 * Extracts risks from conversation
 */
const extractRisks = (content: string): string[] => {
  const text = content.toLowerCase()
  const risks = []

  if (text.includes('learning curve')) risks.push('Learning curve')
  if (text.includes('breaking change')) risks.push('Breaking changes')
  if (text.includes('migration')) risks.push('Migration complexity')

  return risks.slice(0, 3)
}

/**
 * Exports diary entries to markdown format
 */
const exportToMarkdown = (entries: DiaryEntry[]): string => {
  const sortedEntries = entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  let markdown = '# Decision Diary\n\n'
  markdown += `Generated on ${new Date().toISOString()}\n\n`

  for (const entry of sortedEntries) {
    markdown += `## ${entry.title}\n\n`
    markdown += `**Category**: ${entry.category}  \n`
    markdown += `**Date**: ${new Date(entry.timestamp).toLocaleDateString()}  \n`
    markdown += `**Tags**: ${entry.tags.join(', ')}\n\n`

    markdown += `### Problem\n\n`
    markdown += `${entry.problem.description}\n\n`
    markdown += `**Context**: ${entry.problem.context}\n\n`

    if (entry.problem.constraints.length > 0) {
      markdown += `**Constraints**:\n`
      for (const constraint of entry.problem.constraints) {
        markdown += `- ${constraint}\n`
      }
      markdown += `\n`
    }

    markdown += `### Decision\n\n`
    markdown += `**Chosen**: ${entry.decision.chosen}\n\n`
    markdown += `**Rationale**: ${entry.decision.rationale}\n\n`

    if (entry.decision.alternatives.length > 0) {
      markdown += `**Alternatives Considered**:\n`
      for (const alt of entry.decision.alternatives) {
        markdown += `- **${alt.option}**: ${alt.reason}\n`
      }
      markdown += `\n`
    }

    markdown += `### Impact\n\n`

    if (entry.impact.benefits.length > 0) {
      markdown += `**Benefits**:\n`
      for (const benefit of entry.impact.benefits) {
        markdown += `- ${benefit}\n`
      }
      markdown += `\n`
    }

    if (entry.impact.risks.length > 0) {
      markdown += `**Risks**:\n`
      for (const risk of entry.impact.risks) {
        markdown += `- ${risk}\n`
      }
      markdown += `\n`
    }

    if (entry.impact.migrationNotes) {
      markdown += `**Migration Notes**: ${entry.impact.migrationNotes}\n\n`
    }

    markdown += `---\n\n`
  }

  return markdown
}
