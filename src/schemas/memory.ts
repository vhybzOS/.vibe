import { z } from 'zod/v4'
import { AIToolTypeSchema } from './ai-tool-config.ts'

export const MemoryTypeSchema = z.enum([
  'conversation',
  'decision',
  'pattern',
  'context',
  'preference',
  'knowledge',
])

export const MemoryMetadataSchema = z.object({
  id: z.string().uuid(),
  type: MemoryTypeSchema,
  source: z.object({
    tool: AIToolTypeSchema.optional(),
    sessionId: z.string().optional(),
    timestamp: z.string().datetime(),
    location: z.string().optional(), // file path, URL, etc.
  }),
  tags: z.array(z.string()).default([]),
  importance: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  accessibility: z.enum(['private', 'project', 'global']).default('project'),
  expiresAt: z.string().datetime().optional(),
  lastAccessed: z.string().datetime().optional(),
  accessCount: z.number().default(0),
})

export const MemoryContentSchema = z.object({
  title: z.string(),
  summary: z.string(),
  content: z.string(),
  structured: z.record(z.string(), z.unknown()).optional(),
  embedding: z.array(z.number()).optional(), // Vector embedding
  keywords: z.array(z.string()).default([]),
  entities: z.array(z.object({
    name: z.string(),
    type: z.enum(['person', 'tool', 'concept', 'file', 'function', 'library']),
    relevance: z.number().min(0).max(1),
  })).default([]),
})

export const MemoryRelationshipSchema = z.object({
  relatedMemories: z.array(z.string()).default([]), // memory IDs
  similarity: z.record(z.string(), z.number()).default({}), // memory ID -> similarity score
  clusters: z.array(z.string()).default([]), // cluster IDs
  topics: z.array(z.string()).default([]),
  conversationThread: z.string().optional(),
})

export const MemorySchema = z.object({
  metadata: MemoryMetadataSchema,
  content: MemoryContentSchema,
  relationships: MemoryRelationshipSchema,
  quality: z.object({
    completeness: z.number().min(0).max(1),
    accuracy: z.number().min(0).max(1),
    relevance: z.number().min(0).max(1),
    freshness: z.number().min(0).max(1),
  }),
  lifecycle: z.object({
    created: z.string().datetime(),
    updated: z.string().datetime(),
    lastReviewed: z.string().datetime().optional(),
    archived: z.boolean().default(false),
    version: z.number().default(1),
  }),
})

export const MemoryQuerySchema = z.object({
  query: z.string().optional(),
  type: z.array(MemoryTypeSchema).default([]),
  tags: z.array(z.string()).default([]),
  timeRange: z.object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  }).optional(),
  tool: z.array(AIToolTypeSchema).default([]),
  importance: z.array(z.enum(['low', 'medium', 'high', 'critical'])).default([]),
  limit: z.number().min(1).max(100).default(20),
  threshold: z.number().min(0).max(1).default(0.7), // similarity threshold
  includeArchived: z.boolean().default(false),
})

export const MemorySearchResultSchema = z.object({
  memory: MemorySchema,
  score: z.number().min(0).max(1),
  matchedFields: z.array(z.string()),
  context: z.string().optional(),
})

export const ConversationMemorySchema = z.object({
  sessionId: z.string(),
  tool: AIToolTypeSchema,
  startTime: z.string().datetime(),
  endTime: z.string().datetime().optional(),
  participants: z.array(z.string()),
  messageCount: z.number(),
  topics: z.array(z.string()),
  decisions: z.array(z.string()).default([]), // Decision IDs
  artifacts: z.array(z.object({
    type: z.enum(['code', 'file', 'documentation', 'configuration']),
    path: z.string().optional(),
    content: z.string().optional(),
    description: z.string(),
  })).default([]),
  summary: z.string().optional(),
  importance: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
})

export type Memory = z.output<typeof MemorySchema>
export type MemoryMetadata = z.output<typeof MemoryMetadataSchema>
export type MemoryContent = z.output<typeof MemoryContentSchema>
export type MemoryRelationship = z.output<typeof MemoryRelationshipSchema>
export type MemoryQuery = z.output<typeof MemoryQuerySchema>
export type MemorySearchResult = z.output<typeof MemorySearchResultSchema>
export type ConversationMemory = z.output<typeof ConversationMemorySchema>
export type MemoryType = z.output<typeof MemoryTypeSchema>