import { z } from 'zod/v4'
import { UniversalRuleSchema } from './universal-rule.ts'
import { DiaryEntrySchema } from './diary.ts'
import { DependencyDocSchema } from './dependency-doc.ts'
import { MemorySchema } from './memory.ts'

export const AgentFileMetadataSchema = z.object({
  version: z.literal('1.0.0'),
  created: z.string().datetime(),
  updated: z.string().datetime(),
  schema: z.literal('dotvibe-compatible'),
  generator: z.literal('dotvibe'),
  project: z.object({
    name: z.string(),
    path: z.string(),
    languages: z.array(z.string()),
    frameworks: z.array(z.string()),
    description: z.string().optional(),
  }),
  statistics: z.object({
    totalRules: z.number(),
    totalDecisions: z.number(),
    totalMemories: z.number(),
    totalDependencies: z.number(),
    lastActivity: z.string().datetime(),
  }),
})

export const AgentConfigurationSchema = z.object({
  name: z.string(),
  description: z.string(),
  capabilities: z.array(z.enum([
    'code-analysis',
    'rule-application', 
    'decision-tracking',
    'memory-management',
    'dependency-awareness',
    'context-injection',
  ])),
  preferences: z.object({
    codeStyle: z.string().optional(),
    verbosity: z.enum(['minimal', 'normal', 'detailed']).default('normal'),
    autoApplyRules: z.boolean().default(true),
    trackDecisions: z.boolean().default(true),
    suggestImprovements: z.boolean().default(true),
  }),
  constraints: z.array(z.string()).default([]),
})

export const RuleCollectionSchema = z.object({
  active: z.array(z.string()), // Rule names that are currently active
  compiled: z.array(UniversalRuleSchema),
  generated: z.array(UniversalRuleSchema), // Auto-generated rules
  deprecated: z.array(z.string()).default([]), // Rule IDs that are deprecated
  conflicts: z.array(z.object({
    ruleIds: z.array(z.string()),
    description: z.string(),
    resolution: z.enum(['manual', 'automatic', 'ignored']).default('manual'),
  })).default([]),
})

export const DocumentationCollectionSchema = z.object({
  llms_txt: z.string(),
  llms_full_txt: z.string().optional(),
  dependency_docs: z.record(z.string(), z.string()), // package name -> docs
  custom_docs: z.array(z.object({
    title: z.string(),
    content: z.string(),
    type: z.enum(['guide', 'reference', 'tutorial', 'api']),
    lastUpdated: z.string().datetime(),
  })).default([]),
  metadata: z.object({
    lastGenerated: z.string().datetime(),
    tokensUsed: z.number().optional(),
    generationMethod: z.enum(['automatic', 'manual', 'hybrid']),
  }),
})

export const MemoryCollectionSchema = z.object({
  conversations: z.array(MemorySchema),
  decisions: z.array(DiaryEntrySchema),
  patterns: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    examples: z.array(z.string()),
    confidence: z.number().min(0).max(1),
    occurrences: z.number(),
    lastSeen: z.string().datetime(),
  })),
  context: z.record(z.string(), z.unknown()), // Flexible context storage
  statistics: z.object({
    totalInteractions: z.number(),
    avgSessionLength: z.number(),
    topTopics: z.array(z.string()),
    lastActivity: z.string().datetime(),
  }),
})

export const AgentFileSchema = z.object({
  metadata: AgentFileMetadataSchema,
  agent: AgentConfigurationSchema,
  rules: RuleCollectionSchema,
  documentation: DocumentationCollectionSchema,
  memory: MemoryCollectionSchema,
  dependencies: z.array(DependencyDocSchema),
  integrations: z.object({
    tools: z.array(z.string()), // List of integrated AI tools
    mcpServerUrl: z.string().optional(),
    syncSettings: z.record(z.string(), z.unknown()).default({}),
  }),
  export: z.object({
    exportedAt: z.string().datetime(),
    exportVersion: z.string(),
    includeMemories: z.boolean(),
    includeDecisions: z.boolean(),
    includeDependencies: z.boolean(),
    format: z.enum(['full', 'minimal', 'rules-only']).default('full'),
  }),
})

export const AgentFileImportSchema = z.object({
  source: z.string(), // File path or URL
  format: z.enum(['dotvibe', 'agent-file', 'cursor-rules', 'windsurf-rules']),
  options: z.object({
    mergeStrategy: z.enum(['replace', 'merge', 'append']).default('merge'),
    preserveIds: z.boolean().default(false),
    validateSchema: z.boolean().default(true),
    backupExisting: z.boolean().default(true),
  }),
})

export type AgentFile = z.output<typeof AgentFileSchema>
export type AgentFileMetadata = z.output<typeof AgentFileMetadataSchema>
export type AgentConfiguration = z.output<typeof AgentConfigurationSchema>
export type RuleCollection = z.output<typeof RuleCollectionSchema>
export type DocumentationCollection = z.output<typeof DocumentationCollectionSchema>
export type MemoryCollection = z.output<typeof MemoryCollectionSchema>
export type AgentFileImport = z.output<typeof AgentFileImportSchema>