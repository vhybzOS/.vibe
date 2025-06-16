/**
 * Memory System - Clean, functional implementation using Effect-TS
 * Stores and retrieves conversational memory with semantic search capabilities
 */

import { Effect, pipe } from 'effect'
import { resolve } from '@std/path'
import { 
  Memory, 
  MemoryQuery, 
  MemorySearchResult,
  MemorySchema,
  MemoryQuerySchema,
  type MemoryContent,
  type MemoryMetadata 
} from '../schemas/memory.ts'
import { 
  initializeSearch, 
  insertDocument, 
  searchDocuments, 
  type SearchDocument 
} from '../search/index.ts'
import { createFileSystemError, createParseError, type VibeError } from '../lib/errors.ts'

/**
 * Interface for memory storage input metadata
 */
export interface MemoryMetadataInput {
  type: Memory['metadata']['type']
  source: Memory['metadata']['source']
  tags: string[]
  importance: Memory['metadata']['importance']
  projectPath?: string
  relatedFiles?: string[]
  associatedRules?: string[]
}

/**
 * Result of storing a memory
 */
export interface MemoryId {
  id: string
  success: boolean
  timestamp: string
}

/**
 * Stores a memory entry with complete metadata and search indexing
 */
export const storeMemory = (
  vibePath: string,
  content: string,
  metadata: MemoryMetadataInput
) =>
  pipe(
    Effect.sync(() => createMemoryEntry(content, metadata, vibePath)),
    Effect.flatMap(memory => 
      pipe(
        saveMemoryToFile(vibePath, memory),
        Effect.flatMap(() => indexMemoryEntry(vibePath, memory)),
        Effect.map(() => ({
          id: memory.metadata.id,
          success: true,
          timestamp: memory.lifecycle.created
        } as MemoryId))
      )
    )
  )

/**
 * Searches memory entries using the search system
 */
export const searchMemory = (
  vibePath: string,
  query: MemoryQuery
) =>
  pipe(
    initializeSearch(vibePath),
    Effect.flatMap(() => {
      // Convert MemoryQuery to SearchQuery format
      const searchQuery = {
        term: query.query || '',
        filters: {
          doc_type: 'memory' as const,
          tags: query.tags.length > 0 ? query.tags : undefined,
          date_range: query.timeRange ? {
            start: query.timeRange.from ? new Date(query.timeRange.from).getTime() : undefined,
            end: query.timeRange.to ? new Date(query.timeRange.to).getTime() : undefined,
          } : undefined,
          priority: query.importance.length > 0 ? query.importance[0] as any : undefined,
        },
        mode: 'keyword' as const,
        limit: query.limit || 20,
        offset: 0,
      }
      
      return searchDocuments(searchQuery)
    }),
    Effect.flatMap(response => 
      pipe(
        Effect.all(
          response.results.map(result => 
            pipe(
              loadMemoryFromId(vibePath, result.document.id),
              Effect.map(memory => memory ? ({
                memory,
                score: result.score,
                matchedFields: ['content'], // Simple implementation
                context: result.document.content.slice(0, 200)
              } as MemorySearchResult) : null)
            )
          )
        ),
        Effect.map(results => results.filter((r): r is MemorySearchResult => r !== null))
      )
    ),
    Effect.map(results => 
      results
        .filter(result => result.score >= query.threshold)
        .filter(result => passesMemoryFilters(result.memory, query))
    )
  )

/**
 * Retrieves a specific memory by ID
 */
export const getMemory = (
  vibePath: string,
  id: string
) =>
  pipe(
    loadMemoryFromId(vibePath, id),
    Effect.catchAll(() => Effect.succeed(null))
  )

/**
 * Deletes a memory entry
 */
export const deleteMemory = (
  vibePath: string,
  id: string
) =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        const memoryPath = resolve(vibePath, '.vibe', 'memory', `${id}.json`)
        await Deno.remove(memoryPath)
        return true
      },
      catch: () => false
    }),
    Effect.catchAll(() => Effect.succeed(false))
  )

/**
 * Updates memory access tracking
 */
export const updateMemoryAccess = (
  vibePath: string,
  id: string
) =>
  pipe(
    loadMemoryFromId(vibePath, id),
    Effect.flatMap(memory => {
      if (!memory) return Effect.succeed(void 0)
      
      const updatedMemory: Memory = {
        ...memory,
        metadata: {
          ...memory.metadata,
          lastAccessed: new Date().toISOString(),
          accessCount: memory.metadata.accessCount + 1
        },
        lifecycle: {
          ...memory.lifecycle,
          updated: new Date().toISOString()
        }
      }
      
      return saveMemoryToFile(vibePath, updatedMemory)
    })
  )

/**
 * Loads all memory entries from storage
 */
export const loadMemories = (vibePath: string) =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        const memoryDir = resolve(vibePath, '.vibe', 'memory')
        const files = []
        try {
          for await (const entry of Deno.readDir(memoryDir)) {
            if (entry.isFile && entry.name.endsWith('.json')) {
              files.push(resolve(memoryDir, entry.name))
            }
          }
        } catch {
          return [] // Directory doesn't exist
        }
        return files
      },
      catch: () => []
    }),
    Effect.flatMap(files => 
      Effect.all(
        files.map(loadSingleMemoryFile),
        { concurrency: 10 }
      )
    ),
    Effect.map(memories => memories.filter((memory): memory is Memory => memory !== null))
  )

// ==================== Helper Functions ====================

/**
 * Creates a complete memory entry with all required metadata
 */
const createMemoryEntry = (
  content: string,
  metadata: MemoryMetadataInput,
  vibePath: string
): Memory => {
  const now = new Date().toISOString()
  const memoryId = crypto.randomUUID()
  
  const memoryMetadata: MemoryMetadata = {
    id: memoryId,
    type: metadata.type,
    source: metadata.source,
    tags: metadata.tags,
    importance: metadata.importance,
    accessibility: 'project',
    expiresAt: undefined,
    lastAccessed: now,
    accessCount: 0
  }

  const memoryContent: MemoryContent = {
    title: generateTitle(content),
    summary: generateSummary(content),
    content,
    structured: undefined,
    embedding: undefined,
    keywords: extractKeywords(content),
    entities: extractEntities(content)
  }

  return {
    metadata: memoryMetadata,
    content: memoryContent,
    relationships: {
      relatedMemories: [],
      similarity: {},
      clusters: [],
      topics: extractTopics(content),
      conversationThread: metadata.source.sessionId
    },
    quality: {
      completeness: calculateCompleteness(content, metadata),
      accuracy: 0.8, // Default assumption
      relevance: 0.8, // Default assumption  
      freshness: 1.0 // Just created
    },
    lifecycle: {
      created: now,
      updated: now,
      lastReviewed: undefined,
      archived: false,
      version: 1
    }
  }
}

/**
 * Saves memory to JSON file
 */
const saveMemoryToFile = (vibePath: string, memory: Memory) =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        const memoryDir = resolve(vibePath, '.vibe', 'memory')
        await Deno.mkdir(memoryDir, { recursive: true })
        
        const filePath = resolve(memoryDir, `${memory.metadata.id}.json`)
        await Deno.writeTextFile(filePath, JSON.stringify(memory, null, 2))
        return filePath
      },
      catch: (error) => createFileSystemError(error, vibePath, 'Failed to save memory file')
    })
  )

/**
 * Indexes memory entry in the search system
 */
const indexMemoryEntry = (vibePath: string, memory: Memory) =>
  pipe(
    initializeSearch(vibePath),
    Effect.flatMap(() => {
      const searchableContent = [
        `Title: ${memory.content.title}`,
        `Summary: ${memory.content.summary}`,
        `Content: ${memory.content.content}`,
        `Keywords: ${memory.content.keywords.join(', ')}`,
        `Type: ${memory.metadata.type}`,
        `Source: ${memory.metadata.source.tool || 'unknown'}`,
        `Tags: ${memory.metadata.tags.join(', ')}`,
        `Topics: ${memory.relationships.topics.join(', ')}`
      ].join('\\n\\n')
      
      const document: SearchDocument = {
        id: memory.metadata.id,
        doc_type: 'memory',
        timestamp: new Date(memory.lifecycle.created).getTime(),
        content: searchableContent,
        tags: memory.metadata.tags,
        metadata: {
          project_path: vibePath,
          source: memory.metadata.source.tool || 'unknown',
          priority: memory.metadata.importance === 'critical' ? 'high' : memory.metadata.importance,
          category: memory.metadata.type,
          title: memory.content.title,
        },
      }
      
      return insertDocument(document)
    })
  )

/**
 * Loads a single memory by ID
 */
const loadMemoryFromId = (vibePath: string, id: string) =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        const filePath = resolve(vibePath, '.vibe', 'memory', `${id}.json`)
        const content = await Deno.readTextFile(filePath)
        return JSON.parse(content)
      },
      catch: (error) => createFileSystemError(error, `${vibePath}/.vibe/memory/${id}.json`, 'Failed to load memory')
    }),
    Effect.flatMap(data => 
      Effect.try({
        try: () => MemorySchema.parse(data),
        catch: (error) => createParseError(error, `${id}.json`, 'Invalid memory schema')
      })
    )
  )

/**
 * Loads a single memory file with error handling
 */
const loadSingleMemoryFile = (filePath: string) =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        const content = await Deno.readTextFile(filePath)
        return JSON.parse(content)
      },
      catch: () => null
    }),
    Effect.flatMap(data => {
      if (!data) return Effect.succeed(null)
      
      return Effect.try({
        try: () => MemorySchema.parse(data),
        catch: () => null
      })
    }),
    Effect.catchAll(() => Effect.succeed(null))
  )

/**
 * Checks if memory passes additional query filters
 */
const passesMemoryFilters = (memory: Memory, query: MemoryQuery): boolean => {
  // Filter by type
  if (query.type.length > 0 && !query.type.includes(memory.metadata.type)) {
    return false
  }
  
  // Filter by tool
  if (query.tool.length > 0 && memory.metadata.source.tool && 
      !query.tool.includes(memory.metadata.source.tool)) {
    return false
  }
  
  // Filter by importance
  if (query.importance.length > 0 && !query.importance.includes(memory.metadata.importance)) {
    return false
  }
  
  // Filter archived
  if (!query.includeArchived && memory.lifecycle.archived) {
    return false
  }
  
  return true
}

// ==================== Content Analysis Functions ====================

/**
 * Generates a title from content
 */
const generateTitle = (content: string): string => {
  const firstSentence = content.split(/[.!?]/)[0]?.trim()
  if (firstSentence && firstSentence.length < 60) {
    return firstSentence
  }
  return content.slice(0, 50).trim() + (content.length > 50 ? '...' : '')
}

/**
 * Generates a summary from content
 */
const generateSummary = (content: string): string => {
  const sentences = content.split(/[.!?]/).filter(s => s.trim().length > 0)
  if (sentences.length <= 2) {
    return content
  }
  return sentences.slice(0, 2).join('. ').trim() + '.'
}

/**
 * Extracts keywords from content
 */
const extractKeywords = (content: string): string[] => {
  const words = content.toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3)
    .filter(word => !['this', 'that', 'with', 'from', 'they', 'have', 'will', 'been', 'were'].includes(word))
  
  const uniqueWords = Array.from(new Set(words))
  return uniqueWords.slice(0, 10)
}

/**
 * Extracts entities from content (simplified)
 */
const extractEntities = (content: string) => {
  const entities = []
  const text = content.toLowerCase()
  
  // Simple pattern matching for common entities
  const patterns = [
    { pattern: /effect-ts|effect/g, type: 'library' as const },
    { pattern: /react|vue|angular/g, type: 'library' as const },
    { pattern: /typescript|javascript/g, type: 'concept' as const },
    { pattern: /\.ts|\.js|\.tsx|\.jsx/g, type: 'file' as const },
  ]
  
  for (const { pattern, type } of patterns) {
    const matches = text.match(pattern)
    if (matches) {
      for (const match of matches) {
        entities.push({
          name: match,
          type,
          relevance: 0.8
        })
      }
    }
  }
  
  return entities.slice(0, 5) // Limit to 5 entities
}

/**
 * Extracts topics from content
 */
const extractTopics = (content: string): string[] => {
  const topics = []
  const text = content.toLowerCase()
  
  const topicPatterns = [
    'programming', 'development', 'architecture', 'design',
    'testing', 'debugging', 'performance', 'security',
    'frontend', 'backend', 'database', 'api'
  ]
  
  for (const topic of topicPatterns) {
    if (text.includes(topic)) {
      topics.push(topic)
    }
  }
  
  return topics.slice(0, 3)
}

/**
 * Calculates completeness score based on content and metadata
 */
const calculateCompleteness = (content: string, metadata: MemoryMetadataInput): number => {
  let score = 0
  
  // Content length
  if (content.length > 50) score += 0.3
  if (content.length > 200) score += 0.2
  
  // Metadata completeness
  if (metadata.tags.length > 0) score += 0.2
  if (metadata.source.tool) score += 0.1
  if (metadata.source.sessionId) score += 0.1
  if (metadata.source.location) score += 0.1
  
  return Math.min(score, 1.0)
}