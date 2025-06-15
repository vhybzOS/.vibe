/**
 * Semantic search system using Orama
 * Provides unified search across all .vibe content types
 */

import { Effect, pipe } from 'effect'
import { create, insert, search, save, load } from '@orama/orama'
import { pluginEmbeddings } from '@orama/plugin-embeddings'
import { persist, restore } from '@orama/plugin-data-persistence'
import { resolve } from '@std/path'
import { readTextFile, writeTextFile, ensureDir, logWithContext } from '../lib/effects.ts'
import type { VibeError } from '../lib/errors.ts'
import { fileExists } from '../lib/fs.ts'
import type { Orama } from '@orama/orama'

/**
 * Schema configuration for the search database
 */
export const SearchSchemaConfig = {
  id: 'string',
  doc_type: 'enum',
  timestamp: 'number',
  content: 'string', 
  tags: 'string[]',
  metadata: {
    project_path: 'string',
    source: 'string',
    priority: 'string',
    category: 'string',
  },
} as const

/**
 * Document types that can be searched
 */
export type DocType = 'rule' | 'memory' | 'diary' | 'dependency' | 'config'

/**
 * Structure for documents stored in the search index
 */
export interface SearchDocument {
  id: string
  doc_type: DocType
  timestamp: number
  content: string
  tags: string[]
  metadata: {
    project_path: string
    source: string
    priority: 'low' | 'medium' | 'high'
    category: string
  }
}

/**
 * Search query configuration
 */
export interface SearchQuery {
  term: string
  filters?: {
    doc_type?: DocType
    tags?: string[]
    date_range?: {
      start?: number
      end?: number
    }
    priority?: 'low' | 'medium' | 'high'
  }
  mode?: 'fulltext' | 'vector' | 'hybrid'
  limit?: number
  offset?: number
}

/**
 * Search result with score and context
 */
export interface SearchResult {
  document: SearchDocument
  score: number
  highlights?: string[]
}

/**
 * Search response with metadata
 */
export interface SearchResponse {
  results: SearchResult[]
  count: number
  took: number
  query: SearchQuery
}

/**
 * Global search database instance
 */
let searchDatabase: Orama<typeof SearchSchemaConfig> | null = null

/**
 * Default path for storing the search index
 */
const DEFAULT_INDEX_PATH = '.vibe/search_index.json'

/**
 * Initializes the search database with embeddings support
 */
export const initializeSearch = (
  projectPath: string,
  options: {
    indexPath?: string
    embeddingModel?: string
    forceRebuild?: boolean
  } = {}
) =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        const indexPath = resolve(projectPath, options.indexPath || DEFAULT_INDEX_PATH)
        
        // If forcing rebuild or no existing database, create new one
        if (options.forceRebuild || !searchDatabase) {
          try {
            // Try to load existing index first
            if (!options.forceRebuild) {
              const indexExists = await fileExists(indexPath).pipe(Effect.runPromise)
              if (indexExists) {
                const indexData = await readTextFile(indexPath).pipe(Effect.runPromise)
                const parsedIndex = JSON.parse(indexData)
                
                searchDatabase = await restore('json', parsedIndex)
                return searchDatabase
              }
            }
          } catch {
            // Index doesn't exist or is corrupted, create new one
          }
          
          // Create new database with embeddings
          searchDatabase = await create({
            schema: SearchSchemaConfig,
            plugins: [
              pluginEmbeddings({
                embeddings: {
                  model: options.embeddingModel || '@tensorflow/universal-sentence-encoder',
                  verbose: false,
                },
              }),
            ],
          })
          
          // Save the new index
          await saveSearchIndex(projectPath, options.indexPath).pipe(Effect.runPromise)
        }
        
        return searchDatabase!
      },
      catch: (error) => new VibeError(`Failed to initialize search database: ${error}`, 'SEARCH_INIT'),
    }),
    Effect.tap(() => logWithContext('Search', 'Database initialized'))
  )

/**
 * Inserts a document into the search index
 */
export const insertDocument = (document: SearchDocument) =>
  pipe(
    Effect.sync(() => {
      if (!searchDatabase) {
        throw new VibeError('Search database not initialized', 'SEARCH_NOT_INIT')
      }
      return searchDatabase
    }),
    Effect.flatMap(db =>
      Effect.tryPromise({
        try: () => insert(db, document),
        catch: (error) => new VibeError(`Failed to insert document: ${error}`, 'SEARCH_INSERT'),
      })
    ),
    Effect.tap(() => logWithContext('Search', `Document ${document.id} inserted`))
  )

/**
 * Searches the database with the given query
 */
export const searchDocuments = (query: SearchQuery) =>
  pipe(
    Effect.sync(() => {
      if (!searchDatabase) {
        throw new VibeError('Search database not initialized', 'SEARCH_NOT_INIT')
      }
      return searchDatabase
    }),
    Effect.flatMap(db =>
      Effect.tryPromise({
        try: async () => {
          const startTime = performance.now()
          
          // Build search options
          const searchOptions: any = {
            term: query.term,
            properties: ['content', 'tags'],
            limit: query.limit || 10,
            offset: query.offset || 0,
          }
          
          // Add filters if specified
          if (query.filters) {
            searchOptions.where = {}
            
            if (query.filters.doc_type) {
              searchOptions.where.doc_type = query.filters.doc_type
            }
            
            if (query.filters.priority) {
              searchOptions.where['metadata.priority'] = query.filters.priority
            }
            
            if (query.filters.date_range) {
              const dateFilter: any = {}
              if (query.filters.date_range.start) {
                dateFilter.gte = query.filters.date_range.start
              }
              if (query.filters.date_range.end) {
                dateFilter.lte = query.filters.date_range.end
              }
              searchOptions.where.timestamp = dateFilter
            }
          }
          
          // Perform search
          const result = await search(db, searchOptions)
          const took = performance.now() - startTime
          
          // Transform results
          const searchResults: SearchResult[] = (result.hits || []).map((hit: any) => ({
            document: hit.document as SearchDocument,
            score: hit.score || 0,
            highlights: hit.highlights || [],
          }))
          
          return {
            results: searchResults,
            count: result.count || 0,
            took: Math.round(took * 100) / 100,
            query,
          } as SearchResponse
        },
        catch: (error) => new VibeError(`Search failed: ${error}`, 'SEARCH_FAILED'),
      })
    )
  )

/**
 * Saves the current search index to disk
 */
export const saveSearchIndex = (
  projectPath: string,
  indexPath?: string
) =>
  pipe(
    Effect.sync(() => {
      if (!searchDatabase) {
        throw new VibeError('Search database not initialized', 'SEARCH_NOT_INIT')
      }
      return searchDatabase
    }),
    Effect.flatMap(db =>
      Effect.tryPromise({
        try: async () => {
          const indexData = await save(db, 'json')
          const fullPath = resolve(projectPath, indexPath || DEFAULT_INDEX_PATH)
          
          await ensureDir(fullPath.split('/').slice(0, -1).join('/')).pipe(Effect.runPromise)
          await writeTextFile(fullPath, JSON.stringify(indexData)).pipe(Effect.runPromise)
          
          return fullPath
        },
        catch: (error) => new VibeError(`Failed to save search index: ${error}`, 'SEARCH_SAVE'),
      })
    ),
    Effect.tap(path => logWithContext('Search', `Index saved to ${path}`))
  )

/**
 * Clears all documents from the search index
 */
export const clearIndex = () =>
  pipe(
    Effect.sync(() => {
      searchDatabase = null
    }),
    Effect.tap(() => logWithContext('Search', 'Index cleared'))
  )