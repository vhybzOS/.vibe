/**
 * Search System Schemas - Zod v4
 * Defines all search-related data structures
 */

import { z } from 'zod/v4'

export const SearchDocumentSchema = z.object({
  id: z.string().uuid(),
  doc_type: z.enum(['memory', 'diary', 'rule', 'dependency']),
  timestamp: z.number(), // Unix timestamp for sorting
  content: z.string(),
  tags: z.array(z.string()),
  metadata: z.object({
    project_path: z.string(),
    source: z.string(),
    priority: z.enum(['low', 'medium', 'high']),
    category: z.string(),
    title: z.string().optional()
  })
})

export const SearchQuerySchema = z.object({
  term: z.string().min(1),
  filters: z.object({
    doc_type: z.enum(['memory', 'diary', 'rule', 'dependency']).optional(),
    tags: z.array(z.string()).optional(),
    date_range: z.object({
      start: z.number().optional(),
      end: z.number().optional()
    }).optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
    category: z.string().optional()
  }).optional(),
  mode: z.enum(['keyword', 'semantic', 'hybrid']).default('keyword'),
  limit: z.number().min(1).max(100).default(10),
  offset: z.number().min(0).default(0)
})

export const SearchResultSchema = z.object({
  document: SearchDocumentSchema,
  score: z.number().min(0).max(1),
  highlights: z.array(z.string()).optional()
})

export const SearchResponseSchema = z.object({
  results: z.array(SearchResultSchema),
  total: z.number().min(0),
  query: SearchQuerySchema,
  took: z.number().min(0), // Search time in milliseconds
  max_score: z.number().min(0).max(1).optional()
})

// Export types
export type SearchDocument = z.output<typeof SearchDocumentSchema>
export type SearchQuery = z.output<typeof SearchQuerySchema>
export type SearchResult = z.output<typeof SearchResultSchema>
export type SearchResponse = z.output<typeof SearchResponseSchema>