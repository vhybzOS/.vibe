import { z } from 'zod/v4'

export const AIToolTypeSchema = z.enum([
  'cursor',
  'windsurf',
  'claude',
  'copilot',
  'codeium',
  'cody',
  'tabnine',
])

export const ToolDetectionPatternSchema = z.object({
  files: z.array(z.string()),
  directories: z.array(z.string()).default([]),
  content: z.record(z.string(), z.string()).optional(), // file -> content pattern
  priority: z.number().default(1),
})

export const ToolConfigFormatSchema = z.object({
  type: z.enum(['json', 'yaml', 'markdown', 'text', 'toml']),
  encoding: z.string().default('utf-8'),
  template: z.string().optional(),
  parser: z.string().optional(), // function name for custom parsing
})

export const AIToolConfigSchema = z.object({
  tool: AIToolTypeSchema,
  name: z.string(),
  detection: ToolDetectionPatternSchema,
  configFiles: z.array(z.object({
    path: z.string(),
    format: ToolConfigFormatSchema,
    required: z.boolean().default(false),
    description: z.string().optional(),
  })),
  capabilities: z.object({
    rules: z.boolean().default(true),
    commands: z.boolean().default(false),
    memory: z.boolean().default(false),
    context: z.boolean().default(true),
  }),
  syncStrategy: z.enum(['overwrite', 'merge', 'append']).default('overwrite'),
  metadata: z.object({
    version: z.string().optional(),
    lastSync: z.string().datetime().optional(),
    conflicts: z.array(z.string()).default([]),
    customizations: z.record(z.string(), z.unknown()).default({}),
  }),
})

export const DetectedToolSchema = z.object({
  tool: AIToolTypeSchema,
  configFiles: z.array(z.object({
    path: z.string(),
    exists: z.boolean(),
    lastModified: z.string().datetime().optional(),
    size: z.number().optional(),
    hash: z.string().optional(),
  })),
  confidence: z.number().min(0).max(1),
  detectedAt: z.string().datetime(),
  status: z.enum(['active', 'inactive', 'deprecated', 'unsupported']).default('active'),
})

export const ToolSyncResultSchema = z.object({
  tool: AIToolTypeSchema,
  action: z.enum(['created', 'updated', 'deleted', 'skipped', 'error']),
  files: z.array(z.object({
    path: z.string(),
    action: z.enum(['created', 'updated', 'deleted', 'skipped']),
    error: z.string().optional(),
  })),
  timestamp: z.string().datetime(),
  conflicts: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
})

export type AIToolType = z.output<typeof AIToolTypeSchema>
export type AIToolConfig = z.output<typeof AIToolConfigSchema>
export type DetectedTool = z.output<typeof DetectedToolSchema>
export type ToolSyncResult = z.output<typeof ToolSyncResultSchema>
export type ToolDetectionPattern = z.output<typeof ToolDetectionPatternSchema>
export type ToolConfigFormat = z.output<typeof ToolConfigFormatSchema>
