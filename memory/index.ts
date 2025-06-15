/**
 * Memory management system
 * Stores and retrieves conversational memory with semantic search
 */

import { Effect, pipe } from 'effect'
import { resolve } from '@std/path'
import { Memory, MemorySchema, MemorySearchQuery } from '../schemas/memory.ts'
import { initializeSearch, insertDocument, searchDocuments, SearchDocument } from '../search/index.ts'
import { readJSONFile, writeJSONFile, listFiles } from '../lib/fs.ts'
import { logWithContext, VibeError } from '../lib/effects.ts'

/**
 * Stores a memory entry with automatic indexing
 */
export const storeMemory = (
  vibePath: string,
  content: string,
  metadata: {
    type: Memory['type']
    source: Memory['source']
    tags: string[]
    importance: Memory['importance']
  }
) =>
  pipe(
    Effect.sync(() => createMemoryEntry(content, metadata)),
    Effect.flatMap(memory => 
      pipe(
        saveMemoryToFile(vibePath, memory),
        Effect.flatMap(() => indexMemoryEntry(vibePath, memory)),
        Effect.map(() => memory)
      )
    ),
    Effect.map(memory => ({
      id: memory.metadata.id,
      success: true,
      timestamp: memory.metadata.created,
    })),
    Effect.tap(() => logWithContext('Memory', 'Memory stored and indexed'))
  )

/**
 * Searches memory entries using semantic search
 */
export const searchMemory = (
  vibePath: string,
  query: MemorySearchQuery
) =>
  pipe(
    initializeSearch(resolve(vibePath, '..')),
    Effect.flatMap(() => {
      const searchQuery = {
        term: query.query,
        filters: {
          doc_type: 'memory' as const,
          tags: query.tags?.length ? query.tags : undefined,
          date_range: query.dateRange ? {
            start: query.dateRange.from ? new Date(query.dateRange.from).getTime() : undefined,
            end: query.dateRange.to ? new Date(query.dateRange.to).getTime() : undefined,
          } : undefined,
          priority: query.importance,
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
        .map(result => convertDocumentToMemory(result.document))
    ),
    Effect.tap(results => logWithContext('Memory', `Found ${results.length} matching memories`))
  )

/**
 * Loads all memory entries from files (for migration/backup)
 */
export const loadMemories = (vibePath: string) =>
  pipe(
    listFiles(resolve(vibePath, 'memory'), entry => entry.name.endsWith('.json')),
    Effect.flatMap(memoryFiles => 
      Effect.all(memoryFiles.map(loadSingleMemory))
    ),
    Effect.map(memories => memories.filter((memory): memory is Memory => memory !== null)),
    Effect.tap(memories => logWithContext('Memory', `Loaded ${memories.length} memories from files`)),
    Effect.catchAll(() => Effect.succeed([] as Memory[]))
  )

/**
 * Creates a memory entry with metadata
 */
const createMemoryEntry = (
  content: string,
  metadata: {
    type: Memory['type']
    source: Memory['source']
    tags: string[]
    importance: Memory['importance']
  }
): Memory => {
  const now = new Date().toISOString()
  
  return {
    id: crypto.randomUUID(),
    content,
    type: metadata.type,
    source: metadata.source,
    metadata: {
      id: crypto.randomUUID(),
      tags: metadata.tags,
      importance: metadata.importance,
      created: now,
      lastAccessed: now,
      accessCount: 0,
      context: {
        projectPath: '',
        relatedFiles: [],
        associatedRules: [],
      },
    },
    searchable: {
      keywords: extractKeywords(content),
      concepts: extractConcepts(content),
      summary: generateSummary(content),
    },
  }
}

/**
 * Saves memory to file system
 */
const saveMemoryToFile = (vibePath: string, memory: Memory) =>
  pipe(
    Effect.sync(() => {
      const fileName = `${memory.id}.json`
      return resolve(vibePath, 'memory', fileName)
    }),
    Effect.flatMap(filePath => writeJSONFile(filePath, memory))
  )

/**
 * Indexes memory entry in search database with rich, searchable content
 */
const indexMemoryEntry = (vibePath: string, memory: Memory) =>
  pipe(
    initializeSearch(resolve(vibePath, '..')),
    Effect.flatMap(() => {
      // Create rich, searchable content combining title, summary, and content
      const searchableContent = [
        `Title: ${memory.id}`, // Could be enhanced with actual title if available
        `Summary: ${memory.searchable.summary}`,
        `Content: ${memory.content}`,
        `Keywords: ${memory.searchable.keywords.join(', ')}`,
        `Concepts: ${memory.searchable.concepts.join(', ')}`,
        `Type: ${memory.type}`,
        `Source: ${memory.source.tool || 'unknown'}`,
        `Tags: ${memory.metadata.tags.join(', ')}`,
      ].join('\n\n')
      
      const document: SearchDocument = {
        id: memory.id,
        doc_type: 'memory',
        timestamp: new Date(memory.metadata.created).getTime(),
        content: searchableContent,
        tags: memory.metadata.tags,
        metadata: {
          project_path: resolve(vibePath, '..'),
          source: memory.source.tool || 'unknown',
          priority: memory.metadata.importance,
          category: memory.type,
          title: `Memory ${memory.id.slice(0, 8)}`, // Short identifier as title
        },
      }
      
      return insertDocument(document)
    })
  )

/**
 * Loads a single memory file
 */
const loadSingleMemory = (filePath: string) =>
  pipe(
    readJSONFile<unknown>(filePath),
    Effect.flatMap(data => 
      Effect.try({
        try: () => MemorySchema.parse(data),
        catch: (error) => new VibeError(`Invalid memory schema in ${filePath}: ${error}`, 'SCHEMA_ERROR'),
      })
    ),
    Effect.catchAll(error => {
      logWithContext('Memory', `Failed to load ${filePath}: ${error.message}`)
      return Effect.succeed(null)
    })
  )

/**
 * Converts search document back to memory entry
 */
const convertDocumentToMemory = (document: SearchDocument): Memory => {
  // This is a simplified conversion - in practice, we'd store more metadata
  const contentParts = document.content.split('\n\nKeywords:')
  const mainContent = contentParts[0] || ''
  
  return {
    id: document.id,
    content: mainContent,
    type: document.metadata.category as Memory['type'],
    source: {
      tool: document.metadata.source,
      sessionId: 'recovered',
    },
    metadata: {
      id: document.id,
      tags: document.tags,
      importance: document.metadata.priority as Memory['importance'],
      created: new Date(document.timestamp).toISOString(),
      lastAccessed: new Date().toISOString(),
      accessCount: 1,
      context: {
        projectPath: document.metadata.project_path,
        relatedFiles: [],
        associatedRules: [],
      },
    },
    searchable: {
      keywords: document.tags,
      concepts: [],
      summary: 'Recovered from search index',
    },
  }
}

/**
 * Extracts keywords from content
 */
const extractKeywords = (content: string): string[] => {
  // Simplified keyword extraction
  const words = content.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3)
  
  const uniqueWords = Array.from(new Set(words))
  return uniqueWords.slice(0, 10) // Top 10 keywords
}

/**
 * Extracts concepts from content
 */
const extractConcepts = (content: string): string[] => {
  // Simplified concept extraction
  const concepts: string[] = []
  const text = content.toLowerCase()
  
  const conceptPatterns = [
    'architecture', 'design', 'pattern', 'implementation',
    'testing', 'security', 'performance', 'optimization',
    'debugging', 'refactoring', 'documentation'
  ]
  
  for (const concept of conceptPatterns) {
    if (text.includes(concept)) {
      concepts.push(concept)
    }
  }
  
  return concepts
}

/**
 * Generates a summary of the content
 */
const generateSummary = (content: string): string => {
  // Simplified summarization - take first sentence or up to 100 chars
  const firstSentence = content.split(/[.!?]/)[0]?.trim()
  if (firstSentence && firstSentence.length < 150) {
    return firstSentence + '.'
  }
  
  return content.slice(0, 100) + (content.length > 100 ? '...' : '')
}