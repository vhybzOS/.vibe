/**
 * Generation Tracking Schema
 *
 * Zod schemas for tracking generated files in user projects
 * Defines the structure for .vibe/generated/files.toml
 *
 * @tested_by tests/unit/generation.test.ts (Schema validation, checksum tracking, helper functions)
 * @tested_by tests/integration/file-generator.test.ts (File generation tracking, context building)
 * @tested_by tests/user/file-watching.test.ts (End-to-end file change detection and regeneration)
 */

import { z } from 'zod/v4'

/**
 * Generated file metadata
 */
export const GeneratedFileSchema = z.object({
  path: z.string().min(1), // Relative to project root
  generator: z.string().min(1), // Which transformer generated this
  sourceFiles: z.array(z.string()).default([]), // Source files that influence this output
  checksum: z.string().optional(), // File content hash
  lastGenerated: z.string().datetime(),
  template: z.string().optional(), // Template used to generate
  ideType: z.enum(['cursor', 'windsurf', 'claude', 'agents', 'other']).optional(),
})

/**
 * Generation tracking file schema
 */
export const GenerationTrackingSchema = z.object({
  meta: z.object({
    version: z.string().default('1.0.0'),
    lastGeneration: z.string().datetime(),
    generatedFileCount: z.number().int().min(0),
    ureVersion: z.string(),
  }),
  files: z.record(z.string(), GeneratedFileSchema), // filename -> metadata
  templates: z.object({
    lastUpdated: z.string().datetime().optional(),
    version: z.string().optional(),
  }).optional(),
})

/**
 * Generation context for templates
 */
export const GenerationContextSchema = z.object({
  project: z.object({
    name: z.string(),
    type: z.string(),
    languages: z.array(z.string()),
    frameworks: z.array(z.string()),
  }),
  rules: z.array(z.object({
    id: z.string(),
    name: z.string(),
    priority: z.string(),
    content: z.string(),
    tags: z.array(z.string()),
    appliesTo: z.array(z.string()),
  })),
  dependencies: z.array(z.object({
    name: z.string(),
    version: z.string(),
    registry: z.string(),
    documentation: z.string().optional(),
  })),
  generation: z.object({
    timestamp: z.string().datetime(),
    ureVersion: z.string(),
    templateVersion: z.string().optional(),
  }),
})

export type GeneratedFile = z.output<typeof GeneratedFileSchema>
export type GenerationTracking = z.output<typeof GenerationTrackingSchema>
export type GenerationContext = z.output<typeof GenerationContextSchema>

/**
 * Helper function to create new generated file metadata
 */
export const createGeneratedFileMetadata = (
  path: string,
  generator: string,
  options: Partial<GeneratedFile> = {},
): GeneratedFile => ({
  path,
  generator,
  sourceFiles: [],
  lastGenerated: new Date().toISOString(),
  ...options,
})

/**
 * Helper function to create empty generation tracking
 */
export const createEmptyGenerationTracking = (ureVersion: string): GenerationTracking => ({
  meta: {
    version: '1.0.0',
    lastGeneration: new Date().toISOString(),
    generatedFileCount: 0,
    ureVersion,
  },
  files: {},
  templates: {
    lastUpdated: new Date().toISOString(),
    version: '1.0.0',
  },
})

/**
 * Calculate checksum for file content
 */
export const calculateChecksum = async (content: string): Promise<string> => {
  const encoder = new TextEncoder()
  const data = encoder.encode(content)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}
