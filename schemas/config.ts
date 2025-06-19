/**
 * Configuration Schemas for .vibe
 *
 * Based on legacy schema patterns with Zod v4
 *
 * @tested_by tests/unit/init-command.test.ts (Schema validation: ProjectConfig, InitOptions, Dependencies)
 * @tested_by tests/integration/cli-integration.test.ts (Schema integration: cross-component validation)
 * @tested_by tests/user/real-world-workflow.test.ts (Real-world schema usage with complex projects)
 */

import { z } from 'zod/v4'

// Tool detection schema
export const DetectedToolSchema = z.object({
  name: z.string(),
  version: z.string().optional(),
  type: z.enum(['dependency', 'devDependency', 'peerDependency']).default('dependency'),
  source: z.string(), // package.json, etc.
})

export const DependencySchema = z.object({
  name: z.string(),
  version: z.string(),
  type: z.enum(['dependency', 'devDependency', 'peerDependency']).default('dependency'),
})

// Main project configuration schema
export const ProjectConfigSchema = z.object({
  projectName: z.string(),
  version: z.string().default('1.0.0'),
  vibeVersion: z.string().default('1.0.0'),
  created: z.string(), // ISO timestamp
  updated: z.string(), // ISO timestamp
  tools: z.array(DetectedToolSchema).default([]),
  dependencies: z.array(DependencySchema).default([]),
  settings: z.object({
    autoDiscovery: z.boolean().default(true),
    mcpEnabled: z.boolean().default(true),
  }).default({}),
})

// Command options schemas
export const InitOptionsSchema = z.object({
  force: z.boolean().optional().default(false),
  quiet: z.boolean().optional().default(false),
})

// Template scaffolding schemas
export const SupportedRuntimeSchema = z.enum(['node', 'deno'])

export const TemplateScaffoldOptionsSchema = z.object({
  runtime: SupportedRuntimeSchema,
  projectName: z.string().min(1, 'Project name cannot be empty'),
  targetDirectory: z.string(),
  force: z.boolean().optional().default(false),
})

// Export types using z.output for Zod v4
export type ProjectConfig = z.output<typeof ProjectConfigSchema>
export type DetectedTool = z.output<typeof DetectedToolSchema>
export type Dependency = z.output<typeof DependencySchema>
export type InitOptions = z.output<typeof InitOptionsSchema>
export type SupportedRuntime = z.output<typeof SupportedRuntimeSchema>
export type TemplateScaffoldOptions = z.output<typeof TemplateScaffoldOptionsSchema>
