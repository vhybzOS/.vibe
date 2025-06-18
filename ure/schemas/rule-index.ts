/**
 * Rule Index Schema
 *
 * Zod schemas for TOML rule indexes in user projects
 * Defines the structure for .vibe/rules/index.toml
 *
 * @tested_by tests/unit/rule-index.test.ts (Schema validation, type safety, helper functions)
 * @tested_by tests/integration/rule-manager.test.ts (CRUD operations, TOML persistence)
 * @tested_by tests/user/vibe-init.test.ts (End-to-end rule creation workflow)
 */

import { z } from 'zod/v4'

/**
 * Rule metadata schema for index
 */
export const RuleMetadataSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  content_file: z.string().min(1), // Path to .md file
  applies_to: z.array(z.string()).default([]), // Languages/frameworks
  ide_support: z.array(z.enum(['cursor', 'windsurf', 'claude', 'copilot', 'codeium', 'cody', 'tabnine'])).default([]),
  tags: z.array(z.string()).default([]),
  created: z.string().datetime(),
  updated: z.string().datetime().optional(),
})

/**
 * Rule index file schema
 */
export const RuleIndexSchema = z.object({
  meta: z.object({
    version: z.string().default('1.0.0'),
    last_updated: z.string().datetime(),
    rule_count: z.number().int().min(0),
  }),
  rules: z.record(z.string(), RuleMetadataSchema),
})

/**
 * Individual rule content schema (for .md files)
 */
export const RuleContentSchema = z.object({
  content: z.string().min(1),
  examples: z.array(z.object({
    language: z.string(),
    code: z.string(),
    description: z.string().optional(),
  })).default([]),
  metadata: z.object({
    checksum: z.string().optional(),
    last_modified: z.string().datetime().optional(),
  }).optional(),
})

export type RuleMetadata = z.output<typeof RuleMetadataSchema>
export type RuleIndex = z.output<typeof RuleIndexSchema>
export type RuleContent = z.output<typeof RuleContentSchema>

/**
 * Helper function to create new rule metadata
 */
export const createRuleMetadata = (
  id: string,
  name: string,
  contentFile: string,
  options: Partial<RuleMetadata> = {},
): RuleMetadata => ({
  id,
  name,
  content_file: contentFile,
  priority: 'medium',
  applies_to: [],
  ide_support: [],
  tags: [],
  created: new Date().toISOString(),
  ...options,
})

/**
 * Helper function to create empty rule index
 */
export const createEmptyRuleIndex = (): RuleIndex => ({
  meta: {
    version: '1.0.0',
    last_updated: new Date().toISOString(),
    rule_count: 0,
  },
  rules: {},
})
