import { z } from 'zod/v4'

export const RuleMetadataSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  source: z.enum(['manual', 'auto-generated', 'dependency', 'tool-sync']),
  confidence: z.number().min(0).max(1).default(1.0),
  created: z.string().datetime(),
  updated: z.string().datetime(),
  version: z.string().default('1.0.0'),
})

export const RuleTargetingSchema = z.object({
  languages: z.array(z.string()).default([]),
  frameworks: z.array(z.string()).default([]),
  files: z.array(z.string()).default([]),
  dependencies: z.array(z.string()).optional(),
  contexts: z.array(z.enum(['development', 'testing', 'debugging', 'refactoring'])).default([]),
})

export const RuleExampleSchema = z.object({
  code: z.string(),
  language: z.string(),
  description: z.string(),
  before: z.string().optional(),
  after: z.string().optional(),
})

export const RuleContentSchema = z.object({
  markdown: z.string(),
  examples: z.array(RuleExampleSchema).default([]),
  tags: z.array(z.string()).default([]),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
})

export const RuleCompatibilitySchema = z.object({
  tools: z.array(z.enum(['cursor', 'windsurf', 'claude', 'copilot', 'codeium', 'cody', 'tabnine']))
    .default([]),
  formats: z.record(z.string(), z.string()).default({}), // tool -> compiled format
})

export const RuleApplicationSchema = z.object({
  mode: z.enum(['always', 'context', 'manual']).default('always'),
  conditions: z.array(z.string()).default([]),
  excludeFiles: z.array(z.string()).default([]),
  includeFiles: z.array(z.string()).default([]),
})

export const UniversalRuleSchema = z.object({
  id: z.string().uuid(),
  metadata: RuleMetadataSchema,
  targeting: RuleTargetingSchema,
  content: RuleContentSchema,
  compatibility: RuleCompatibilitySchema,
  application: RuleApplicationSchema,
  generated: z.object({
    auto: z.boolean().default(false),
    fromTool: z.string().optional(),
    confidence: z.number().min(0).max(1).default(1.0),
    reviewRequired: z.boolean().default(false),
  }).optional(),
})

export type UniversalRule = z.output<typeof UniversalRuleSchema>
export type RuleMetadata = z.output<typeof RuleMetadataSchema>
export type RuleTargeting = z.output<typeof RuleTargetingSchema>
export type RuleContent = z.output<typeof RuleContentSchema>
export type RuleCompatibility = z.output<typeof RuleCompatibilitySchema>
export type RuleApplication = z.output<typeof RuleApplicationSchema>
export type RuleExample = z.output<typeof RuleExampleSchema>
