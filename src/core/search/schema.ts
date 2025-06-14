import { z } from 'zod/v4'

/**
 * Schema for documents stored in the Orama search index
 * Unified format for both diary entries and memory snippets
 */
export const VibeDocumentSchema = z.object({
  id: z.string().uuid().describe('The original UUID of the entry'),
  doc_type: z.enum(['diary', 'memory']).describe('Type of document for filtering'),
  timestamp: z.number().describe('Unix timestamp for sorting'),
  // Fields for keyword search (BM25)
  content: z.string().describe('The main content for text search'),
  tags: z.array(z.string()).default([]).describe('Tags for filtering and search'),
  // Field for vector search - handled by Orama embeddings plugin
  embedding: z.array(z.number()).optional().describe('Vector embedding for semantic search'),
  // Additional metadata
  metadata: z.object({
    project_path: z.string().optional().describe('Associated project path'),
    source: z.string().optional().describe('Source of the document'),
    priority: z.enum(['low', 'medium', 'high']).default('medium'),
    category: z.string().optional().describe('Category or classification'),
  }).default({}).describe('Additional document metadata'),
})

export type VibeDocument = z.output<typeof VibeDocumentSchema>

/**
 * Orama schema configuration for the search database
 * This defines the structure and types for Orama indexing
 */
export const OramaSchemaConfig = {
  id: 'string',
  doc_type: 'enum',
  timestamp: 'number',
  content: 'string',
  tags: 'string[]',
  embedding: 'vector[512]', // Universal Sentence Encoder produces 512-dimensional vectors
  'metadata.project_path': 'string',
  'metadata.source': 'string', 
  'metadata.priority': 'enum',
  'metadata.category': 'string',
} as const

/**
 * Search query parameters for unified search across documents
 */
export const SearchQuerySchema = z.object({
  term: z.string().optional().describe('Text query for keyword search'),
  vector: z.array(z.number()).optional().describe('Vector for semantic similarity search'),
  filters: z.object({
    doc_type: z.enum(['diary', 'memory']).optional(),
    tags: z.array(z.string()).optional(),
    project_path: z.string().optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
    date_range: z.object({
      start: z.number().optional(),
      end: z.number().optional(),
    }).optional(),
  }).default({}).describe('Filters to apply to search results'),
  mode: z.enum(['keyword', 'vector', 'hybrid']).default('hybrid').describe('Search mode'),
  limit: z.number().min(1).max(100).default(10).describe('Maximum number of results'),
  offset: z.number().min(0).default(0).describe('Offset for pagination'),
})

export type SearchQuery = z.output<typeof SearchQuerySchema>

/**
 * Search result structure
 */
export const SearchResultSchema = z.object({
  document: VibeDocumentSchema,
  score: z.number().describe('Relevance score (0-1)'),
  highlights: z.array(z.string()).default([]).describe('Highlighted text snippets'),
})

export type SearchResult = z.output<typeof SearchResultSchema>

/**
 * Complete search response
 */
export const SearchResponseSchema = z.object({
  results: z.array(SearchResultSchema),
  total_count: z.number().describe('Total number of matching documents'),
  query_time_ms: z.number().describe('Time taken to execute the query'),
  facets: z.record(z.string(), z.record(z.string(), z.number())).optional().describe('Faceted search results'),
})

export type SearchResponse = z.output<typeof SearchResponseSchema>