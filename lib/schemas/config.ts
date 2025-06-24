/**
 * Configuration Schemas - Production Ready
 * 
 * Zod schemas for v2 project configuration
 */

import { z } from 'zod/v4'

export const DependencySchema = z.object({
  name: z.string(),
  version: z.string(),
  type: z.enum(['dependency', 'devDependency', 'peerDependency']),
})

export type Dependency = z.infer<typeof DependencySchema>

export const ProjectConfigSchema = z.object({
  projectName: z.string().min(1),
  version: z.string().min(1),
  vibeVersion: z.string().min(1),
  created: z.string().datetime(),
  updated: z.string().datetime(),
  tools: z.array(z.string()).default([]),
  dependencies: z.array(DependencySchema).default([]),
  settings: z.object({
    autoDiscovery: z.boolean().default(true),
    mcpEnabled: z.boolean().default(true),
  }).default({}),
})

export type ProjectConfig = z.infer<typeof ProjectConfigSchema>

export function createDefaultProjectConfig(
  projectName: string,
  dependencies: Dependency[] = []
): ProjectConfig {
  const now = new Date().toISOString()
  
  return {
    projectName,
    version: '1.0.0',
    vibeVersion: '2.0.0',
    created: now,
    updated: now,
    tools: [],
    dependencies,
    settings: {
      autoDiscovery: true,
      mcpEnabled: true,
    },
  }
}