import { Effect, pipe } from 'effect'
import { create, insert, search, save, load } from '@orama/orama'
import { embeddings } from '@orama/plugin-embeddings'
import { persist, restore } from '@orama/plugin-data-persistence'
import { resolve } from '@std/path'
import { OramaSchemaConfig, VibeDocument, SearchQuery, SearchResponse, SearchResult } from './schema.ts'
import type { Orama } from '@orama/orama'

/**
 * Global Orama database instance
 * Initialized once and reused across the application
 */
let oramaDb: Orama<typeof OramaSchemaConfig> | null = null

/**
 * Default path for storing the search index
 */
const DEFAULT_INDEX_PATH = '.vibe/search_index.json'

/**
 * Initializes the Orama database with embeddings support
 * Loads existing index if available, creates new one otherwise
 * 
 * @param projectPath - Path to the project (for index storage)
 * @param options - Configuration options
 * @returns Effect that resolves to the initialized database
 */
export const initializeSearchDatabase = (
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
        if (options.forceRebuild || !oramaDb) {
          try {
            // Try to load existing index first
            if (!options.forceRebuild) {
              const indexData = await Deno.readTextFile(indexPath)
              const parsedIndex = JSON.parse(indexData)
              
              oramaDb = await restore('json', parsedIndex)
              return oramaDb
            }
          } catch {
            // Index doesn't exist or is corrupted, create new one
          }
          
          // Create new database with embeddings
          oramaDb = await create({
            schema: OramaSchemaConfig,
            plugins: [
              embeddings({
                embeddings: {
                  model: options.embeddingModel || '@tensorflow/universal-sentence-encoder',
                  verbose: false,
                },
              }),
            ],
          })
          
          // Save the new index
          await saveSearchIndex(projectPath, options.indexPath)
        }
        
        return oramaDb!
      },
      catch: (error) => new Error(`Failed to initialize search database: ${error}`),
    }),
    Effect.tap(() => Effect.log('🔍 Search database initialized'))
  )

/**
 * Saves the current search index to disk
 * 
 * @param projectPath - Project path
 * @param indexPath - Optional custom index path
 * @returns Effect that completes when save is done
 */
export const saveSearchIndex = (
  projectPath: string,
  indexPath?: string
) =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        if (!oramaDb) {
          throw new Error('Database not initialized')
        }
        
        const savePath = resolve(projectPath, indexPath || DEFAULT_INDEX_PATH)
        const indexData = await persist(oramaDb, 'json')
        
        // Ensure directory exists
        const dirPath = resolve(savePath, '..')
        await Deno.mkdir(dirPath, { recursive: true })
        
        await Deno.writeTextFile(savePath, JSON.stringify(indexData, null, 2))
      },
      catch: (error) => new Error(`Failed to save search index: ${error}`),
    }),
    Effect.tap(() => Effect.log('💾 Search index saved'))
  )

/**
 * Inserts a document into the search database
 * Automatically generates embeddings for semantic search
 * 
 * @param document - The document to insert
 * @returns Effect that completes when document is inserted
 */
export const insertDocument = (document: VibeDocument) =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        if (!oramaDb) {
          throw new Error('Database not initialized. Call initializeSearchDatabase first.')
        }
        
        await insert(oramaDb, {
          id: document.id,
          doc_type: document.doc_type,
          timestamp: document.timestamp,
          content: document.content,
          tags: document.tags,
          'metadata.project_path': document.metadata.project_path || '',
          'metadata.source': document.metadata.source || '',
          'metadata.priority': document.metadata.priority,
          'metadata.category': document.metadata.category || '',
        })
      },
      catch: (error) => new Error(`Failed to insert document: ${error}`),
    }),
    Effect.tap(() => Effect.log(`📄 Document ${document.id} inserted into search index`))
  )

/**
 * Searches the database using hybrid keyword + semantic search
 * 
 * @param query - Search parameters
 * @returns Effect that resolves to search results
 */
export const searchVibe = (query: SearchQuery) =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        if (!oramaDb) {
          throw new Error('Database not initialized. Call initializeSearchDatabase first.')
        }
        
        const startTime = performance.now()
        
        // Build search parameters
        const searchParams: any = {
          limit: query.limit,
          offset: query.offset,
        }
        
        // Add text search if provided
        if (query.term) {
          searchParams.term = query.term
        }
        
        // Add vector search if provided
        if (query.vector) {
          searchParams.vector = {
            value: query.vector,
            property: 'embedding',
          }
        }
        
        // Add filters
        if (Object.keys(query.filters).length > 0) {
          searchParams.where = {}
          
          if (query.filters.doc_type) {
            searchParams.where.doc_type = { eq: query.filters.doc_type }
          }
          
          if (query.filters.project_path) {
            searchParams.where['metadata.project_path'] = { eq: query.filters.project_path }
          }
          
          if (query.filters.priority) {
            searchParams.where['metadata.priority'] = { eq: query.filters.priority }
          }
          
          if (query.filters.date_range) {
            const dateFilter: any = {}
            if (query.filters.date_range.start) {
              dateFilter.gte = query.filters.date_range.start
            }
            if (query.filters.date_range.end) {
              dateFilter.lte = query.filters.date_range.end
            }
            if (Object.keys(dateFilter).length > 0) {
              searchParams.where.timestamp = dateFilter
            }
          }
          
          if (query.filters.tags && query.filters.tags.length > 0) {
            searchParams.where.tags = { containsAll: query.filters.tags }
          }
        }
        
        // Set search mode
        if (query.mode === 'vector') {
          searchParams.mode = 'vector'
        } else if (query.mode === 'keyword') {
          searchParams.mode = 'fulltext'
        } else {
          searchParams.mode = 'hybrid'
        }
        
        // Execute search
        const oramaResults = await search(oramaDb, searchParams)
        const queryTime = performance.now() - startTime
        
        // Transform results to our format
        const results: SearchResult[] = oramaResults.hits.map((hit: any) => ({
          document: {
            id: hit.document.id,
            doc_type: hit.document.doc_type,
            timestamp: hit.document.timestamp,
            content: hit.document.content,
            tags: hit.document.tags || [],
            metadata: {
              project_path: hit.document['metadata.project_path'],
              source: hit.document['metadata.source'],
              priority: hit.document['metadata.priority'],
              category: hit.document['metadata.category'],
            },
          },
          score: hit.score,
          highlights: [], // TODO: Implement highlighting
        }))
        
        const response: SearchResponse = {
          results,
          total_count: oramaResults.count,
          query_time_ms: queryTime,
          facets: oramaResults.facets,
        }
        
        return response
      },
      catch: (error) => new Error(`Search failed: ${error}`),
    }),
    Effect.tap((response) => 
      Effect.log(`🔍 Search completed: ${response.results.length}/${response.total_count} results in ${response.query_time_ms.toFixed(2)}ms`)
    )
  )

/**
 * Removes a document from the search index
 * 
 * @param documentId - The ID of the document to remove
 * @returns Effect that completes when document is removed
 */
export const removeDocument = (documentId: string) =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        if (!oramaDb) {
          throw new Error('Database not initialized')
        }
        
        // Orama doesn't have a direct delete, so we'll need to rebuild without the document
        // For now, we'll log that this needs implementation
        console.warn(`Document removal not yet implemented for ${documentId}`)
      },
      catch: (error) => new Error(`Failed to remove document: ${error}`),
    })
  )

/**
 * Clears the entire search index
 * Useful for rebuilding from scratch
 * 
 * @param projectPath - Project path for saving empty index
 * @returns Effect that completes when index is cleared
 */
export const clearSearchIndex = (projectPath: string) =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        // Create new empty database
        oramaDb = await create({
          schema: OramaSchemaConfig,
          plugins: [
            embeddings({
              embeddings: {
                model: '@tensorflow/universal-sentence-encoder',
                verbose: false,
              },
            }),
          ],
        })
        
        // Save empty index
        await saveSearchIndex(projectPath)
      },
      catch: (error) => new Error(`Failed to clear search index: ${error}`),
    }),
    Effect.tap(() => Effect.log('🗑️ Search index cleared'))
  )

/**
 * Gets statistics about the search database
 * 
 * @returns Effect that resolves to database statistics
 */
export const getSearchStats = () =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        if (!oramaDb) {
          return {
            total_documents: 0,
            index_size: 0,
            initialized: false,
          }
        }
        
        // Get document count by searching with no filters
        const allResults = await search(oramaDb, { term: '*', limit: 0 })
        
        return {
          total_documents: allResults.count,
          index_size: JSON.stringify(await persist(oramaDb, 'json')).length,
          initialized: true,
        }
      },
      catch: (error) => new Error(`Failed to get search stats: ${error}`),
    })
  )