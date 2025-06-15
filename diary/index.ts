/**
 * Diary management system for architectural decisions
 * Stores and retrieves decision diary entries with semantic search
 */

import { Effect, pipe } from 'effect'
import { resolve } from '@std/path'
import { DiaryEntry, DiaryEntrySchema } from '../schemas/diary.ts'
import { initializeSearch, insertDocument, searchDocuments, SearchDocument } from '../search/index.ts'
import { readJSONFile, writeJSONFile, listFiles, readTextFile, writeTextFile } from '../lib/fs.ts'
import { logWithContext, VibeError } from '../lib/effects.ts'

/**
 * Search query for diary entries
 */
export interface DiarySearchQuery {
  query: string
  tags?: string[]
  category?: string
  dateRange?: {
    from?: string
    to?: string
  }
  limit?: number
  offset?: number
  threshold?: number
}

/**
 * Stores a diary entry with automatic indexing
 */
export const storeDiaryEntry = (
  vibePath: string,
  entry: Omit<DiaryEntry, 'id' | 'timestamp'>
) =>
  pipe(
    Effect.sync(() => createDiaryEntry(entry)),
    Effect.flatMap(diaryEntry => 
      pipe(
        saveDiaryToFile(vibePath, diaryEntry),
        Effect.flatMap(() => indexDiaryEntry(vibePath, diaryEntry)),
        Effect.flatMap(() => updateMainDiaryFile(vibePath, diaryEntry)),
        Effect.map(() => diaryEntry)
      )
    ),
    Effect.map(entry => ({
      id: entry.id,
      success: true,
      timestamp: entry.timestamp,
    })),
    Effect.tap(() => logWithContext('Diary', 'Diary entry stored and indexed'))
  )

/**
 * Searches diary entries using semantic search
 */
export const searchDiary = (
  vibePath: string,
  query: DiarySearchQuery
) =>
  pipe(
    initializeSearch(resolve(vibePath, '..')),
    Effect.flatMap(() => {
      const searchQuery = {
        term: query.query,
        filters: {
          doc_type: 'diary' as const,
          tags: query.tags?.length ? query.tags : undefined,
          date_range: query.dateRange ? {
            start: query.dateRange.from ? new Date(query.dateRange.from).getTime() : undefined,
            end: query.dateRange.to ? new Date(query.dateRange.to).getTime() : undefined,
          } : undefined,
          category: query.category,
        },
        mode: 'hybrid' as const,
        limit: query.limit || 10,
        offset: query.offset || 0,
      }
      
      return searchDocuments(searchQuery)
    }),
    Effect.map(response => 
      response.results
        .filter(result => result.score >= (query.threshold || 0.1))
        .map(result => convertDocumentToDiaryEntry(result.document))
    ),
    Effect.tap(results => logWithContext('Diary', `Found ${results.length} matching diary entries`))
  )

/**
 * Loads all diary entries from files
 */
export const loadDiaryEntries = (vibePath: string) =>
  pipe(
    listFiles(resolve(vibePath, 'diary', 'entries'), entry => entry.name.endsWith('.json')),
    Effect.flatMap(entryFiles => 
      Effect.all(entryFiles.map(loadSingleDiaryEntry))
    ),
    Effect.map(entries => entries.filter((entry): entry is DiaryEntry => entry !== null)),
    Effect.tap(entries => logWithContext('Diary', `Loaded ${entries.length} diary entries from files`)),
    Effect.catchAll(() => Effect.succeed([] as DiaryEntry[]))
  )

/**
 * Gets the main diary file content
 */
export const getMainDiary = (vibePath: string) =>
  pipe(
    readTextFile(resolve(vibePath, 'diary', 'DIARY.txt')),
    Effect.catchAll(() => Effect.succeed('# Architectural Decision Diary\n\nNo entries yet.\n'))
  )

/**
 * Creates a diary entry with metadata
 */
const createDiaryEntry = (entry: Omit<DiaryEntry, 'id' | 'timestamp'>): DiaryEntry => {
  const now = new Date().toISOString()
  
  return {
    id: crypto.randomUUID(),
    timestamp: now,
    ...entry,
  }
}

/**
 * Saves diary entry to individual JSON file
 */
const saveDiaryToFile = (vibePath: string, entry: DiaryEntry) =>
  pipe(
    Effect.sync(() => {
      const fileName = `${entry.timestamp.split('T')[0]}-${entry.id.slice(0, 8)}.json`
      return resolve(vibePath, 'diary', 'entries', fileName)
    }),
    Effect.flatMap(filePath => writeJSONFile(filePath, entry))
  )

/**
 * Updates the main DIARY.txt file with the new entry
 */
const updateMainDiaryFile = (vibePath: string, entry: DiaryEntry) =>
  pipe(
    getMainDiary(vibePath),
    Effect.flatMap(currentContent => {
      const dateStr = new Date(entry.timestamp).toLocaleDateString()
      const timeStr = new Date(entry.timestamp).toLocaleTimeString()
      
      const newEntry = `
## ${entry.title} (${dateStr} at ${timeStr})

**Category:** ${entry.category}
**Tags:** ${entry.tags.join(', ')}

### Problem
${entry.problem.description}

**Context:**
${entry.problem.context}

**Constraints:**
${entry.problem.constraints.map(c => `- ${c}`).join('\n')}

### Decision
**Chosen Solution:** ${entry.decision.chosen}

**Rationale:**
${entry.decision.rationale}

**Alternatives Considered:**
${entry.decision.alternatives.map(alt => `- **${alt.option}**: ${alt.reason}`).join('\n')}

### Impact
**Benefits:**
${entry.impact.benefits.map(b => `- ${b}`).join('\n')}

**Risks:**
${entry.impact.risks.map(r => `- ${r}`).join('\n')}

**Migration Notes:**
${entry.impact.migrationNotes || 'No migration required'}

---
`
      
      // Insert at the top, after the header
      const lines = currentContent.split('\n')
      const headerEnd = lines.findIndex(line => line.startsWith('##') || line.startsWith('No entries yet'))
      
      if (headerEnd === -1) {
        // No existing entries, add after header
        const insertPoint = lines.findIndex(line => line.includes('No entries yet'))
        if (insertPoint !== -1) {
          lines.splice(insertPoint, 1, newEntry.trim())
        } else {
          lines.push(newEntry.trim())
        }
      } else {
        // Insert at the beginning of entries
        lines.splice(headerEnd, 0, newEntry.trim())
      }
      
      return writeTextFile(resolve(vibePath, 'diary', 'DIARY.txt'), lines.join('\n'))
    })
  )

/**
 * Indexes diary entry in search database with rich content
 */
const indexDiaryEntry = (vibePath: string, entry: DiaryEntry) =>
  pipe(
    initializeSearch(resolve(vibePath, '..')),
    Effect.flatMap(() => {
      // Create rich, searchable content combining all entry fields
      const searchableContent = [
        `Title: ${entry.title}`,
        `Problem: ${entry.problem.description}`,
        `Context: ${entry.problem.context}`,
        `Constraints: ${entry.problem.constraints.join('. ')}`,
        `Decision: ${entry.decision.chosen}`,
        `Rationale: ${entry.decision.rationale}`,
        `Alternatives: ${entry.decision.alternatives.map(alt => `${alt.option} - ${alt.reason}`).join('. ')}`,
        `Benefits: ${entry.impact.benefits.join('. ')}`,
        `Risks: ${entry.impact.risks.join('. ')}`,
        `Migration: ${entry.impact.migrationNotes || 'No migration required'}`,
      ].join('\n\n')
      
      const document: SearchDocument = {
        id: entry.id,
        doc_type: 'diary',
        timestamp: new Date(entry.timestamp).getTime(),
        content: searchableContent,
        tags: entry.tags,
        metadata: {
          project_path: resolve(vibePath, '..'),
          source: 'diary',
          priority: 'high', // Architectural decisions are high priority
          category: entry.category,
          title: entry.title,
        },
      }
      
      return insertDocument(document)
    })
  )

/**
 * Loads a single diary entry file
 */
const loadSingleDiaryEntry = (filePath: string) =>
  pipe(
    readJSONFile<unknown>(filePath),
    Effect.flatMap(data => 
      Effect.try({
        try: () => DiaryEntrySchema.parse(data),
        catch: (error) => new VibeError(`Invalid diary schema in ${filePath}: ${error}`, 'SCHEMA_ERROR'),
      })
    ),
    Effect.catchAll(error => {
      logWithContext('Diary', `Failed to load ${filePath}: ${error.message}`)
      return Effect.succeed(null)
    })
  )

/**
 * Converts search document back to diary entry
 */
const convertDocumentToDiaryEntry = (document: SearchDocument): DiaryEntry => {
  // This is a simplified conversion - in practice, we'd need to store more structured metadata
  const lines = document.content.split('\n\n')
  
  // Extract basic information from the searchable content
  const title = document.metadata.title || 'Recovered Decision'
  const category = document.metadata.category || 'general'
  
  return {
    id: document.id,
    timestamp: new Date(document.timestamp).toISOString(),
    title,
    category,
    tags: document.tags,
    problem: {
      description: lines.find(l => l.startsWith('Problem:'))?.slice(9) || 'Recovered from search index',
      context: lines.find(l => l.startsWith('Context:'))?.slice(9) || 'Unknown context',
      constraints: [],
    },
    decision: {
      chosen: lines.find(l => l.startsWith('Decision:'))?.slice(10) || 'Unknown decision',
      rationale: lines.find(l => l.startsWith('Rationale:'))?.slice(11) || 'Unknown rationale',
      alternatives: [],
    },
    impact: {
      benefits: [],
      risks: [],
      migrationNotes: lines.find(l => l.startsWith('Migration:'))?.slice(11) || null,
    },
  }
}