import { Effect, pipe } from 'effect'
import { resolve } from '@std/path'
import { Memory, MemorySchema, MemoryQuery } from '../../schemas/memory.ts'
import { initializeSearchDatabase, insertDocument, searchVibe, SearchQuery } from '../search/index.ts'
import { VibeDocument } from '../search/schema.ts'

/**
 * Searches memory using the unified Orama search system
 * Supports both keyword and semantic search
 * 
 * @param vibePath - Path to the .vibe directory
 * @param query - Memory search query
 * @returns Effect that resolves to search results
 */
export const searchMemory = (
  vibePath: string, 
  query: MemoryQuery
) =>
  pipe(
    initializeSearchDatabase(resolve(vibePath, '..')),
    Effect.flatMap(() => {
      // Convert MemoryQuery to SearchQuery
      const searchQuery: SearchQuery = {
        term: query.query,
        filters: {
          doc_type: 'memory',
          tags: query.tags.length > 0 ? query.tags : undefined,
        },
        mode: 'hybrid',
        limit: query.limit,
        offset: query.offset,
      }
      
      return searchVibe(searchQuery)
    }),
    Effect.map(response => 
      response.results.map(result => ({
        memory: convertDocumentToMemory(result.document),
        score: result.score,
        matchedFields: result.highlights,
      }))
    )
  )

/**
 * Stores a new memory and indexes it for search
 * Saves to both file system and search index
 * 
 * @param vibePath - Path to the .vibe directory
 * @param content - Memory content
 * @param metadata - Memory metadata
 * @returns Effect that resolves when memory is stored and indexed
 */
export const storeMemory = (
  vibePath: string,
  content: string,
  metadata: {
    type: string
    source: any
    tags: string[]
    importance: string
  }
) =>
  pipe(
    Effect.sync(() => createMemory(content, metadata)),
    Effect.flatMap(memory => 
      pipe(
        saveMemory(vibePath, memory),
        Effect.flatMap(() => indexMemory(vibePath, memory)),
        Effect.map(() => memory)
      )
    ),
    Effect.map(savedMemory => ({
      id: savedMemory.metadata.id,
      success: true,
      timestamp: new Date().toISOString(),
    }))
  )

/**
 * Indexes a memory in the search database
 * 
 * @param vibePath - Path to the .vibe directory  
 * @param memory - Memory to index
 * @returns Effect that completes when memory is indexed
 */
const indexMemory = (vibePath: string, memory: Memory) =>
  pipe(
    initializeSearchDatabase(resolve(vibePath, '..')),
    Effect.flatMap(() => {
      const document: VibeDocument = {
        id: memory.metadata.id,
        doc_type: 'memory',
        timestamp: new Date(memory.lifecycle.created).getTime(),
        content: `${memory.content.title}\n\n${memory.content.summary}\n\n${memory.content.content}`,
        tags: memory.metadata.tags,
        metadata: {
          project_path: resolve(vibePath, '..'),
          source: 'memory',
          priority: memory.metadata.importance as 'low' | 'medium' | 'high',
          category: memory.metadata.type,
        },
      }
      
      return insertDocument(document)
    })
  )

/**
 * Converts a VibeDocument back to a Memory object
 * Used when retrieving search results
 * 
 * @param document - Search document to convert
 * @returns Memory object
 */
const convertDocumentToMemory = (document: VibeDocument): Memory => {
  // Parse the content back into title, summary, and content
  const contentParts = document.content.split('\n\n')
  const title = contentParts[0] || ''
  const summary = contentParts[1] || ''
  const content = contentParts.slice(2).join('\n\n') || document.content
  
  return {
    metadata: {
      id: document.id,
      type: document.metadata.category as any || 'note',
      source: {
        timestamp: new Date(document.timestamp).toISOString(),
      },
      tags: document.tags,
      importance: document.metadata.priority || 'medium',
      accessibility: 'project',
      accessCount: 0,
    },
    content: {
      title,
      summary,
      content,
      keywords: document.tags,
      entities: [],
    },
    relationships: {
      relatedMemories: [],
      similarity: {},
      clusters: [],
      topics: document.tags,
    },
    quality: {
      completeness: 1.0,
      accuracy: 1.0,
      relevance: 1.0,
      freshness: 1.0,
    },
    lifecycle: {
      created: new Date(document.timestamp).toISOString(),
      updated: new Date(document.timestamp).toISOString(),
      archived: false,
      version: 1,
    },
  }
}

/**
 * Loads all memories from the file system (legacy function for migration)
 * 
 * @param vibePath - Path to the .vibe directory
 * @returns Effect that resolves to array of memories
 */
const loadMemories = (vibePath: string) =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        const memoryDir = resolve(vibePath, 'memory')
        const files = []
        
        try {
          for await (const entry of Deno.readDir(memoryDir)) {
            if (entry.isFile && entry.name.endsWith('.json')) {
              files.push(entry.name)
            }
          }
        } catch {
          return [] // Directory doesn't exist
        }
        
        return files
      },
      catch: () => new Error('Failed to read memory directory'),
    }),
    Effect.flatMap(files => 
      Effect.all(
        files.map(file => loadMemory(resolve(vibePath, 'memory', file)))
      )
    ),
    Effect.map(memories => memories.filter(Boolean) as Memory[]),
    Effect.catchAll(() => Effect.succeed([] as Memory[]))
  )

/**
 * Loads a single memory from file (legacy function for migration)
 * 
 * @param filePath - Path to the memory file
 * @returns Effect that resolves to Memory or null
 */
const loadMemory = (filePath: string) =>
  pipe(
    Effect.tryPromise({
      try: () => Deno.readTextFile(filePath),
      catch: () => new Error(`Failed to read memory file: ${filePath}`),
    }),
    Effect.flatMap(content => 
      Effect.try({
        try: () => JSON.parse(content),
        catch: () => new Error(`Invalid JSON in memory file: ${filePath}`),
      })
    ),
    Effect.flatMap(data => 
      Effect.try({
        try: () => MemorySchema.parse(data),
        catch: (error) => new Error(`Invalid memory schema: ${error}`),
      })
    ),
    Effect.catchAll(() => Effect.succeed(null))
  )

/**
 * Saves a memory to the file system
 * 
 * @param vibePath - Path to the .vibe directory
 * @param memory - Memory to save
 * @returns Effect that resolves when memory is saved
 */
const saveMemory = (vibePath: string, memory: Memory) =>
  pipe(
    Effect.tryPromise({
      try: () => Deno.mkdir(resolve(vibePath, 'memory'), { recursive: true }),
      catch: () => new Error('Failed to create memory directory'),
    }),
    Effect.flatMap(() => {
      const fileName = `${memory.metadata.id}.json`
      const filePath = resolve(vibePath, 'memory', fileName)
      
      return Effect.tryPromise({
        try: () => Deno.writeTextFile(filePath, JSON.stringify(memory, null, 2)),
        catch: () => new Error(`Failed to save memory: ${filePath}`),
      })
    }),
    Effect.map(() => memory)
  )

const createMemory = (
  content: string, 
  metadata: {
    type: string
    source: any
    tags: string[]
    importance: string
  }
): Memory => ({
  metadata: {
    id: crypto.randomUUID(),
    type: metadata.type as any,
    source: {
      timestamp: new Date().toISOString(),
      ...metadata.source,
    },
    tags: metadata.tags,
    importance: metadata.importance as any,
    accessibility: 'project',
    accessCount: 0,
  },
  content: {
    title: extractTitle(content),
    summary: generateSummary(content),
    content,
    keywords: extractKeywords(content),
    entities: [],
  },
  relationships: {
    relatedMemories: [],
    similarity: {},
    clusters: [],
    topics: metadata.tags,
  },
  quality: {
    completeness: 1.0,
    accuracy: 1.0,
    relevance: 1.0,
    freshness: 1.0,
  },
  lifecycle: {
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    archived: false,
    version: 1,
  },
})

/**
 * Extracts a title from content (first line or truncated content)
 * 
 * @param content - The content to extract title from
 * @returns Extracted title
 */
const extractTitle = (content: string): string => {
  const lines = content.split('\n')
  const firstLine = lines[0]?.trim()
  
  if (firstLine && firstLine.length > 0 && firstLine.length < 100) {
    return firstLine.replace(/^#+\s*/, '') // Remove markdown headers
  }
  
  return content.slice(0, 50) + (content.length > 50 ? '...' : '')
}

/**
 * Generates a simple summary from content (first two sentences)
 * 
 * @param content - The content to summarize
 * @returns Generated summary
 */
const generateSummary = (content: string): string => {
  // Simplified summary - in production, this would use LLM or extractive summarization
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0)
  return sentences.slice(0, 2).join('. ') + (sentences.length > 2 ? '.' : '')
}

/**
 * Extracts keywords from content using simple frequency analysis
 * 
 * @param content - The content to extract keywords from
 * @returns Array of keywords
 */
const extractKeywords = (content: string): string[] => {
  // Simplified keyword extraction - in production, this would use NLP
  const words = content.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3)
  
  const wordCount = words.reduce((acc, word) => {
    acc[word] = (acc[word] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  return Object.entries(wordCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([word]) => word)
}