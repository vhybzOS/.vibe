import { Effect, pipe } from 'effect'
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { Memory, MemorySchema, MemoryQuery } from '../../schemas/memory.js'

export const searchMemory = (
  vibePath: string, 
  query: MemoryQuery
) =>
  pipe(
    loadMemories(vibePath),
    Effect.map(memories => 
      memories
        .filter(memory => matchesQuery(memory, query))
        .slice(query.offset, query.offset + query.limit)
        .map(memory => ({
          memory,
          score: calculateRelevanceScore(memory, query),
          matchedFields: getMatchedFields(memory, query),
        }))
    ),
    Effect.map(results => 
      results.sort((a, b) => b.score - a.score)
    )
  )

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
    Effect.flatMap(memory => saveMemory(vibePath, memory)),
    Effect.map(savedMemory => ({
      id: savedMemory.metadata.id,
      success: true,
      timestamp: new Date().toISOString(),
    }))
  )

const loadMemories = (vibePath: string) =>
  pipe(
    Effect.tryPromise({
      try: () => readdir(resolve(vibePath, 'memory')),
      catch: () => new Error('Failed to read memory directory'),
    }),
    Effect.flatMap(files => 
      Effect.all(
        files
          .filter(file => file.endsWith('.json'))
          .map(file => loadMemory(resolve(vibePath, 'memory', file)))
      )
    ),
    Effect.map(memories => memories.filter(Boolean) as Memory[]),
    Effect.catchAll(() => Effect.succeed([] as Memory[]))
  )

const loadMemory = (filePath: string) =>
  pipe(
    Effect.tryPromise({
      try: () => readFile(filePath, 'utf-8'),
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

const saveMemory = (vibePath: string, memory: Memory) =>
  pipe(
    Effect.tryPromise({
      try: () => mkdir(resolve(vibePath, 'memory'), { recursive: true }),
      catch: () => new Error('Failed to create memory directory'),
    }),
    Effect.flatMap(() => {
      const fileName = `${memory.metadata.id}.json`
      const filePath = resolve(vibePath, 'memory', fileName)
      
      return Effect.tryPromise({
        try: () => writeFile(filePath, JSON.stringify(memory, null, 2), 'utf-8'),
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

const matchesQuery = (memory: Memory, query: MemoryQuery): boolean => {
  // Simplified matching - in production, this would use embeddings and semantic search
  if (query.query) {
    const searchText = query.query.toLowerCase()
    if (!memory.content.content.toLowerCase().includes(searchText) &&
        !memory.content.title.toLowerCase().includes(searchText) &&
        !memory.content.summary.toLowerCase().includes(searchText)) {
      return false
    }
  }
  
  if (query.type.length > 0 && !query.type.includes(memory.metadata.type)) {
    return false
  }
  
  if (query.tags.length > 0 && !query.tags.some(tag => memory.metadata.tags.includes(tag))) {
    return false
  }
  
  return true
}

const calculateRelevanceScore = (memory: Memory, query: MemoryQuery): number => {
  // Simplified scoring - in production, this would use semantic similarity
  let score = 0.5
  
  if (query.query) {
    const searchText = query.query.toLowerCase()
    if (memory.content.title.toLowerCase().includes(searchText)) score += 0.3
    if (memory.content.summary.toLowerCase().includes(searchText)) score += 0.2
    if (memory.content.content.toLowerCase().includes(searchText)) score += 0.1
  }
  
  return Math.min(score, 1.0)
}

const getMatchedFields = (memory: Memory, query: MemoryQuery): string[] => {
  const fields: string[] = []
  
  if (query.query) {
    const searchText = query.query.toLowerCase()
    if (memory.content.title.toLowerCase().includes(searchText)) fields.push('title')
    if (memory.content.summary.toLowerCase().includes(searchText)) fields.push('summary')
    if (memory.content.content.toLowerCase().includes(searchText)) fields.push('content')
  }
  
  return fields
}

const extractTitle = (content: string): string => {
  const lines = content.split('\n')
  const firstLine = lines[0]?.trim()
  
  if (firstLine && firstLine.length > 0 && firstLine.length < 100) {
    return firstLine.replace(/^#+\s*/, '') // Remove markdown headers
  }
  
  return content.slice(0, 50) + (content.length > 50 ? '...' : '')
}

const generateSummary = (content: string): string => {
  // Simplified summary - in production, this would use LLM or extractive summarization
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0)
  return sentences.slice(0, 2).join('. ') + (sentences.length > 2 ? '.' : '')
}

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