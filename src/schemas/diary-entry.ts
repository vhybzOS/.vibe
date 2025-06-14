import { z } from 'zod/v4'
import { AIToolTypeSchema } from './ai-tool-config.ts'

export const DecisionContextSchema = z.object({
  sessionId: z.string(),
  participants: z.array(z.string()).default(['user', 'assistant']),
  topic: z.string(),
  tool: AIToolTypeSchema,
  projectPath: z.string().optional(),
})

export const DecisionProblemSchema = z.object({
  description: z.string(),
  domain: z.enum(['architecture', 'implementation', 'design', 'performance', 'security', 'testing', 'deployment', 'tooling']),
  complexity: z.enum(['simple', 'moderate', 'complex', 'critical']),
  urgency: z.enum(['low', 'medium', 'high', 'critical']),
  scope: z.enum(['component', 'feature', 'module', 'system', 'project']),
})

export const DecisionExplorationSchema = z.object({
  options: z.array(z.object({
    name: z.string(),
    description: z.string(),
    pros: z.array(z.string()).default([]),
    cons: z.array(z.string()).default([]),
    effort: z.enum(['low', 'medium', 'high']).optional(),
    risk: z.enum(['low', 'medium', 'high']).optional(),
  })),
  considerations: z.array(z.string()).default([]),
  constraints: z.array(z.string()).default([]),
  assumptions: z.array(z.string()).default([]),
})

export const DecisionResultSchema = z.object({
  chosen: z.string(),
  rationale: z.string(),
  confidence: z.enum(['low', 'medium', 'high']),
  reversibility: z.enum(['irreversible', 'difficult', 'moderate', 'easy']),
  impact: z.object({
    scope: z.enum(['local', 'module', 'system', 'ecosystem']),
    timeframe: z.enum(['immediate', 'short-term', 'long-term']),
    risk: z.enum(['low', 'medium', 'high']),
  }),
})

export const DecisionImplementationSchema = z.object({
  notes: z.string().optional(),
  followUpActions: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  successCriteria: z.array(z.string()).default([]),
  timeline: z.string().optional(),
  dependencies: z.array(z.string()).default([]),
})

export const DecisionRelationshipSchema = z.object({
  relatedDecisions: z.array(z.string()).default([]), // decision IDs
  supersedes: z.array(z.string()).default([]),
  supersededBy: z.string().optional(),
  influences: z.array(z.string()).default([]),
  influencedBy: z.array(z.string()).default([]),
})

export const DiaryEntrySchema = z.object({
  id: z.string().uuid(),
  timestamp: z.string().datetime(),
  context: DecisionContextSchema,
  problem: DecisionProblemSchema,
  exploration: DecisionExplorationSchema,
  decision: DecisionResultSchema,
  implementation: DecisionImplementationSchema,
  relationships: DecisionRelationshipSchema,
  metadata: z.object({
    tags: z.array(z.string()).default([]),
    category: z.string().optional(),
    source: z.enum(['conversation', 'commit', 'manual', 'imported']),
    extractionConfidence: z.number().min(0).max(1),
    lastUpdated: z.string().datetime(),
    archived: z.boolean().default(false),
    starred: z.boolean().default(false),
  }),
})

export const DiarySearchQuerySchema = z.object({
  query: z.string().optional(),
  tags: z.array(z.string()).default([]),
  domain: z.array(z.string()).default([]),
  dateRange: z.object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  }).optional(),
  tool: z.array(AIToolTypeSchema).default([]),
  confidence: z.enum(['any', 'high-only']).default('any'),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
})

export type DiaryEntry = z.output<typeof DiaryEntrySchema>
export type DecisionContext = z.output<typeof DecisionContextSchema>
export type DecisionProblem = z.output<typeof DecisionProblemSchema>
export type DecisionExploration = z.output<typeof DecisionExplorationSchema>
export type DecisionResult = z.output<typeof DecisionResultSchema>
export type DecisionImplementation = z.output<typeof DecisionImplementationSchema>
export type DecisionRelationship = z.output<typeof DecisionRelationshipSchema>
export type DiarySearchQuery = z.output<typeof DiarySearchQuerySchema>