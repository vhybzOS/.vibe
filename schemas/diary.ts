/**
 * Diary entry schema for architectural decisions
 * Compatible with DIARY.txt format and searchable storage
 */

import { z } from 'zod/v4'

/**
 * Schema for alternative decisions that were considered
 */
export const AlternativeSchema = z.object({
  option: z.string(),
  reason: z.string(),
})

/**
 * Schema for the problem being solved
 */
export const ProblemSchema = z.object({
  description: z.string(),
  context: z.string(),
  constraints: z.array(z.string()),
})

/**
 * Schema for the decision made
 */
export const DecisionSchema = z.object({
  chosen: z.string(),
  rationale: z.string(),
  alternatives: z.array(AlternativeSchema),
})

/**
 * Schema for the impact of the decision
 */
export const ImpactSchema = z.object({
  benefits: z.array(z.string()),
  risks: z.array(z.string()),
  migrationNotes: z.string().nullable(),
})

/**
 * Common diary categories
 */
export const DIARY_CATEGORIES = [
  'architecture',
  'design',
  'technology',
  'process',
  'security',
  'performance',
  'testing',
  'deployment',
  'data',
  'integration',
  'refactoring',
  'documentation',
] as const

export type DiaryCategory = typeof DIARY_CATEGORIES[number]

/**
 * Complete diary entry schema
 */
export const DiaryEntrySchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  title: z.string(),
  category: z.enum(DIARY_CATEGORIES),
  tags: z.array(z.string()),
  problem: ProblemSchema,
  decision: DecisionSchema,
  impact: ImpactSchema,
})

/**
 * Schema for diary search queries
 */
export const DiarySearchQuerySchema = z.object({
  query: z.string().optional(),
  category: z.enum(DIARY_CATEGORIES).optional(),
  tags: z.array(z.string()).optional(),
  dateRange: z.object({
    from: z.string(),
    to: z.string(),
  }).optional(),
  limit: z.number().default(10),
})

/**
 * TypeScript types derived from schemas
 */
export type Alternative = z.output<typeof AlternativeSchema>
export type Problem = z.output<typeof ProblemSchema>
export type Decision = z.output<typeof DecisionSchema>
export type Impact = z.output<typeof ImpactSchema>
export type DiaryEntry = z.output<typeof DiaryEntrySchema>
export type DiarySearchQuery = z.output<typeof DiarySearchQuerySchema>