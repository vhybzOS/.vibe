/**
 * Search System - Clean, functional implementation using Effect-TS
 * Provides unified semantic search across all .vibe data
 */

import { Effect, pipe } from 'effect'
import { resolve } from '@std/path'
import { createFileSystemError } from '../lib/errors.ts'
import type {
  SearchDocument,
  SearchQuery,
  SearchResponse,
  SearchResult,
} from '../schemas/search.ts'

// Re-export types for external use
export type { SearchDocument, SearchQuery, SearchResponse, SearchResult }

/**
 * In-memory search index - simple and fast for the .vibe use case
 */
interface SearchIndex {
  documents: Map<string, SearchDocument>
  invertedIndex: Map<string, Set<string>> // term -> document IDs
  initialized: boolean
  projectPath: string
}

// Global search indices by project path
const searchIndices = new Map<string, SearchIndex>()

/**
 * Initialize search index for a project
 */
export const initializeSearch = (projectPath: string) =>
  pipe(
    Effect.sync(() => {
      const index: SearchIndex = {
        documents: new Map(),
        invertedIndex: new Map(),
        initialized: true,
        projectPath,
      }

      searchIndices.set(projectPath, index)
      return index
    }),
    Effect.flatMap((index) =>
      pipe(
        loadExistingIndex(projectPath),
        Effect.catchAll(() => Effect.succeed(index)), // If no existing index, use new one
      )
    ),
    Effect.flatMap(() => saveIndexToDisk(projectPath)),
    Effect.map(() => void 0),
  )

/**
 * Insert document into search index
 */
export const insertDocument = (document: SearchDocument) =>
  pipe(
    Effect.sync(() => {
      const index = getSearchIndex(document.metadata.project_path)

      // Add document to index
      index.documents.set(document.id, document)

      // Update inverted index
      updateInvertedIndex(index, document)

      return index
    }),
    Effect.flatMap((index) => saveIndexToDisk(index.projectPath)),
    Effect.map(() => void 0),
  )

/**
 * Insert multiple documents efficiently (batch operation)
 */
export const insertDocuments = (documents: SearchDocument[]) =>
  pipe(
    Effect.sync(() => {
      if (documents.length === 0) return null

      const firstDoc = documents[0]
      if (!firstDoc) return null

      const index = getSearchIndex(firstDoc.metadata.project_path)

      // Add all documents to index
      for (const document of documents) {
        index.documents.set(document.id, document)
        updateInvertedIndex(index, document)
      }

      return index
    }),
    Effect.flatMap((index) => {
      if (!index) return Effect.succeed(void 0)
      return pipe(
        saveIndexToDisk(index.projectPath),
        Effect.map(() => void 0),
      )
    }),
  )

/**
 * Update existing document in search index
 */
export const updateDocument = (id: string, document: SearchDocument) =>
  pipe(
    Effect.sync(() => {
      const index = getSearchIndex(document.metadata.project_path)

      // Remove old document from inverted index
      const oldDoc = index.documents.get(id)
      if (oldDoc) {
        removeFromInvertedIndex(index, oldDoc)
      }

      // Add updated document
      index.documents.set(id, document)
      updateInvertedIndex(index, document)

      return index
    }),
    Effect.flatMap((index) => saveIndexToDisk(index.projectPath)),
    Effect.map(() => void 0),
  )

/**
 * Delete document from search index
 */
export const deleteDocument = (id: string) =>
  pipe(
    Effect.sync(() => {
      // Find the document to get project path
      let targetIndex: SearchIndex | undefined
      let document: SearchDocument | undefined

      for (const index of searchIndices.values()) {
        const doc = index.documents.get(id)
        if (doc) {
          targetIndex = index
          document = doc
          break
        }
      }

      if (!targetIndex || !document) {
        return false
      }

      // Remove from index
      targetIndex.documents.delete(id)
      removeFromInvertedIndex(targetIndex, document)

      return { index: targetIndex, deleted: true }
    }),
    Effect.flatMap((result) => {
      if (typeof result === 'boolean') {
        return Effect.succeed(result)
      }
      return pipe(
        saveIndexToDisk(result.index.projectPath),
        Effect.map(() => result.deleted),
      )
    }),
  )

/**
 * Search documents using the index
 */
export const searchDocuments = (query: SearchQuery) =>
  pipe(
    Effect.sync(() => {
      // Find relevant indices (for now, search all)
      const allResults: SearchResult[] = []

      for (const index of searchIndices.values()) {
        const indexResults = performSearch(index, query)
        allResults.push(...indexResults)
      }

      // Sort by score (highest first) and timestamp (newest first)
      allResults.sort((a, b) => {
        if (a.score !== b.score) return b.score - a.score
        return b.document.timestamp - a.document.timestamp
      })

      // Apply pagination
      const start = query.offset || 0
      const end = start + (query.limit || 10)
      const paginatedResults = allResults.slice(start, end)

      const response: SearchResponse = {
        results: paginatedResults,
        total: allResults.length,
        query,
        took: 0, // Will be calculated by caller
        max_score: allResults[0]?.score,
      }

      return response
    }),
  )

/**
 * Rebuild search index from stored documents
 */
export const rebuildIndex = (projectPath: string) =>
  pipe(
    Effect.sync(() => {
      const index = getSearchIndex(projectPath)

      // Clear inverted index
      index.invertedIndex.clear()

      // Rebuild from documents
      for (const document of index.documents.values()) {
        updateInvertedIndex(index, document)
      }

      return index
    }),
    Effect.flatMap((index) => saveIndexToDisk(index.projectPath)),
    Effect.map(() => void 0),
  )

/**
 * Clear search index from memory (for testing)
 */
export const clearIndex = (projectPath: string) =>
  Effect.sync(() => {
    searchIndices.delete(projectPath)
  })

// ==================== Helper Functions ====================

/**
 * Get search index for project path
 */
const getSearchIndex = (projectPath: string): SearchIndex => {
  const index = searchIndices.get(projectPath)
  if (!index || !index.initialized) {
    throw new Error(`Search database not initialized for ${projectPath}`)
  }
  return index
}

/**
 * Update inverted index with document terms
 */
const updateInvertedIndex = (index: SearchIndex, document: SearchDocument) => {
  const terms = extractTerms(document)

  for (const term of terms) {
    if (!index.invertedIndex.has(term)) {
      index.invertedIndex.set(term, new Set())
    }
    index.invertedIndex.get(term)!.add(document.id)
  }
}

/**
 * Remove document from inverted index
 */
const removeFromInvertedIndex = (index: SearchIndex, document: SearchDocument) => {
  const terms = extractTerms(document)

  for (const term of terms) {
    const docSet = index.invertedIndex.get(term)
    if (docSet) {
      docSet.delete(document.id)
      if (docSet.size === 0) {
        index.invertedIndex.delete(term)
      }
    }
  }
}

/**
 * Extract searchable terms from document
 */
const extractTerms = (document: SearchDocument): string[] => {
  const terms = new Set<string>()

  // Extract from content
  const contentTerms = document.content
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ') // Keep hyphens for compound terms
    .split(/\s+/)
    .filter((term) => term.length > 2)

  contentTerms.forEach((term) => terms.add(term))

  // Extract from tags
  document.tags.forEach((tag) => terms.add(tag.toLowerCase()))

  // Extract from metadata
  if (document.metadata.title) {
    const titleTerms = document.metadata.title
      .toLowerCase()
      .replace(/[^\w\s-]/g, ' ') // Keep hyphens for compound terms
      .split(/\s+/)
      .filter((term) => term.length > 2)

    titleTerms.forEach((term) => terms.add(term))
  }

  terms.add(document.metadata.category.toLowerCase())
  terms.add(document.metadata.priority)
  terms.add(document.doc_type)

  return Array.from(terms)
}

/**
 * Perform search on index
 */
const performSearch = (index: SearchIndex, query: SearchQuery): SearchResult[] => {
  const searchTerms = query.term
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ') // Keep hyphens for terms like "effect-ts"
    .split(/\s+/)
    .filter((term) => term.length > 2)

  if (searchTerms.length === 0) {
    return []
  }

  // Find matching documents
  const matchingDocs = new Map<string, number>() // docId -> score

  for (const term of searchTerms) {
    // Exact match
    const exactMatches = index.invertedIndex.get(term) || new Set()
    exactMatches.forEach((docId) => {
      matchingDocs.set(docId, (matchingDocs.get(docId) || 0) + 1.0)
    })

    // Partial matches - only for compound terms and more restrictive
    for (const [indexTerm, docIds] of index.invertedIndex.entries()) {
      if (
        indexTerm !== term && (
          // Allow partial matches for compound terms (with hyphens)
          (term.includes('-') && indexTerm.includes(term)) ||
          // Allow prefix matches for longer terms
          (term.length >= 4 && indexTerm.startsWith(term)) ||
          // Allow suffix matches for compound terms
          (term.includes('-') && term.split('-')[1] !== undefined &&
            indexTerm.endsWith(term.split('-')[1]!))
        )
      ) {
        docIds.forEach((docId) => {
          matchingDocs.set(docId, (matchingDocs.get(docId) || 0) + 0.3) // Lower score for partial matches
        })
      }
    }
  }

  // Convert to results and apply filters
  const results: SearchResult[] = []

  for (const [docId, rawScore] of matchingDocs.entries()) {
    const document = index.documents.get(docId)
    if (!document) continue

    // Apply filters
    if (!passesFilters(document, query.filters)) {
      continue
    }

    // Normalize score
    const score = Math.min(rawScore / searchTerms.length, 1.0)

    results.push({
      document,
      score,
      highlights: [], // TODO: Implement highlighting
    })
  }

  return results
}

/**
 * Check if document passes filters
 */
const passesFilters = (document: SearchDocument, filters?: SearchQuery['filters']): boolean => {
  if (!filters) return true

  // Document type filter
  if (filters.doc_type && document.doc_type !== filters.doc_type) {
    return false
  }

  // Tags filter (document must have ALL specified tags)
  if (filters.tags && filters.tags.length > 0) {
    const hasAllTags = filters.tags.every((tag) =>
      document.tags.some((docTag) => docTag.toLowerCase().includes(tag.toLowerCase()))
    )
    if (!hasAllTags) {
      return false
    }
  }

  // Priority filter
  if (filters.priority && document.metadata.priority !== filters.priority) {
    return false
  }

  // Category filter
  if (
    filters.category &&
    !document.metadata.category.toLowerCase().includes(filters.category.toLowerCase())
  ) {
    return false
  }

  // Date range filter
  if (filters.date_range) {
    if (filters.date_range.start && document.timestamp < filters.date_range.start) {
      return false
    }
    if (filters.date_range.end && document.timestamp > filters.date_range.end) {
      return false
    }
  }

  return true
}

/**
 * Load existing index from disk
 */
const loadExistingIndex = (projectPath: string) =>
  Effect.tryPromise({
    try: async () => {
      const indexPath = resolve(projectPath, '.vibe', 'search.index')
      const content = await Deno.readTextFile(indexPath)
      const data = JSON.parse(content)

      const index: SearchIndex = {
        documents: new Map(),
        invertedIndex: new Map(),
        initialized: true,
        projectPath,
      }

      // Restore documents
      if (data.documents) {
        for (const [id, doc] of Object.entries(data.documents)) {
          index.documents.set(id, doc as SearchDocument)
        }
      }

      // Rebuild inverted index
      for (const document of index.documents.values()) {
        updateInvertedIndex(index, document)
      }

      searchIndices.set(projectPath, index)
      return index
    },
    catch: (error) =>
      createFileSystemError(
        error,
        `${projectPath}/.vibe/search.index`,
        'Failed to load search index',
      ),
  })

/**
 * Save index to disk
 */
const saveIndexToDisk = (projectPath: string) =>
  Effect.tryPromise({
    try: async () => {
      const index = searchIndices.get(projectPath)
      if (!index) {
        throw new Error(`No search index found for ${projectPath}`)
      }

      const vibeDir = resolve(projectPath, '.vibe')

      // Ensure .vibe directory exists
      try {
        await Deno.mkdir(vibeDir, { recursive: true })
      } catch {
        // Directory already exists
      }

      const indexPath = resolve(vibeDir, 'search.index')

      // Convert Map to object for serialization
      const data = {
        documents: Object.fromEntries(index.documents.entries()),
        timestamp: Date.now(),
        projectPath,
      }

      await Deno.writeTextFile(indexPath, JSON.stringify(data, null, 2))
      return indexPath
    },
    catch: (error) =>
      createFileSystemError(
        error,
        `${projectPath}/.vibe/search.index`,
        'Failed to save search index',
      ),
  })

/**
 * CONSOLIDATED SEARCH UTILITIES - Previously duplicated across memory/diary modules
 */

/**
 * Create search document for memory entries
 * Consolidates: memory/index.ts (indexMemoryEntry)
 */
export const createMemorySearchDocument = (memory: {
  metadata: {
    id: string
    type: string
    source: { tool?: string | undefined }
    tags: string[]
    importance: string
  }
  content: { title: string; summary: string; content: string; keywords: string[] }
  relationships: { topics: string[] }
  lifecycle: { created: string }
}, vibePath: string): SearchDocument => ({
  id: memory.metadata.id,
  doc_type: 'memory',
  timestamp: new Date(memory.lifecycle.created).getTime(),
  content: [
    `Title: ${memory.content.title}`,
    `Summary: ${memory.content.summary}`,
    `Content: ${memory.content.content}`,
    `Keywords: ${memory.content.keywords.join(', ')}`,
    `Type: ${memory.metadata.type}`,
    `Source: ${memory.metadata.source.tool || 'unknown'}`,
    `Tags: ${memory.metadata.tags.join(', ')}`,
    `Topics: ${memory.relationships.topics.join(', ')}`,
  ].join('\\n\\n'),
  tags: memory.metadata.tags,
  metadata: {
    project_path: vibePath,
    source: memory.metadata.source.tool || 'unknown',
    priority: memory.metadata.importance === 'critical' ? 'high' : (memory.metadata.importance as 'low' | 'medium' | 'high'),
    category: memory.metadata.type,
    title: memory.content.title,
  },
})

/**
 * Create search document for diary entries
 * Consolidates: diary/index.ts (indexDiaryEntry)
 */
export const createDiarySearchDocument = (entry: {
  id: string
  title: string
  category: string
  tags: string[]
  timestamp: string
  problem: { description: string; context: string }
  decision: { chosen: string; rationale: string }
  impact: { benefits: string[]; risks: string[] }
}, vibePath: string): SearchDocument => ({
  id: entry.id,
  doc_type: 'diary',
  timestamp: new Date(entry.timestamp).getTime(),
  content: [
    `Title: ${entry.title}`,
    `Category: ${entry.category}`,
    `Problem: ${entry.problem.description}`,
    `Context: ${entry.problem.context}`,
    `Decision: ${entry.decision.chosen}`,
    `Rationale: ${entry.decision.rationale}`,
    `Benefits: ${entry.impact.benefits.join(', ')}`,
    `Risks: ${entry.impact.risks.join(', ')}`,
    `Tags: ${entry.tags.join(', ')}`,
  ].join('\\n\\n'),
  tags: entry.tags,
  metadata: {
    project_path: vibePath,
    source: 'diary',
    priority: 'medium' as const,
    category: entry.category,
    title: entry.title,
  },
})

/**
 * Convert memory query to search query format
 * Consolidates: memory/index.ts (searchMemory query conversion)
 */
export const convertMemoryQueryToSearch = (query: {
  query?: string | undefined
  tags: string[]
  timeRange?: { from?: string | undefined; to?: string | undefined } | undefined
  importance: string[]
  limit?: number
  type: string[]
  tool: string[]
}): SearchQuery => ({
  term: query.query || '',
  filters: {
    doc_type: 'memory' as const,
    tags: query.tags.length > 0 ? query.tags : undefined,
    date_range: query.timeRange
      ? {
        start: query.timeRange.from ? new Date(query.timeRange.from).getTime() : undefined,
        end: query.timeRange.to ? new Date(query.timeRange.to).getTime() : undefined,
      }
      : undefined,
    priority: query.importance.length > 0
      ? query.importance[0] as 'low' | 'medium' | 'high'
      : undefined,
  },
  mode: 'keyword' as const,
  limit: query.limit || 20,
  offset: 0,
})

/**
 * Convert diary query to search query format
 * Consolidates: diary/index.ts (searchEntries query conversion)
 */
export const convertDiaryQueryToSearch = (query: {
  query?: string
  category?: string
  tags?: string[]
  dateRange?: { from?: string; to?: string }
  limit?: number
}): SearchQuery => ({
  term: query.query || '',
  filters: {
    doc_type: 'diary' as const,
    tags: query.tags,
    date_range: query.dateRange
      ? {
        start: query.dateRange.from ? new Date(query.dateRange.from).getTime() : undefined,
        end: query.dateRange.to ? new Date(query.dateRange.to).getTime() : undefined,
      }
      : undefined,
    category: query.category,
  },
  mode: 'keyword' as const,
  limit: query.limit || 20,
  offset: 0,
})
