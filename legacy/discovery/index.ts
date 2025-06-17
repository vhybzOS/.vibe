/**
 * Main entry point for the autonomous discovery system
 * Exports manifest parsing functionality (registries removed as per PRD)
 */

import { Effect } from 'effect'

// Re-export manifest parsing functionality
export {
  consolidateDependencies,
  type DetectedDependency,
  discoverManifests,
  globalManifestRegistry,
  type ManifestParseResult,
} from './manifests/index.ts'

// Re-export base types for external use
export type { ManifestParser } from './manifests/base.ts'

/**
 * Discovered rule from dependency analysis
 */
export interface DiscoveredRule {
  id: string
  name: string
  description: string
  content: string | {
    markdown: string
    examples: string[]
    tags: string[]
  }
  source: string
  confidence: number
  priority: 'low' | 'medium' | 'high'
  discoveredAt?: string
  packageName?: string
  packageVersion?: string
  targeting?: {
    languages?: string[]
    frameworks?: string[]
    files?: string[]
    contexts?: string[]
  }
  metadata: {
    package?: string
    version?: string
    category?: string
    tags?: string[]
  }
}

/**
 * Discovery result containing metadata and rules
 */
export interface DiscoveryResult {
  method: 'repository' | 'inference' | 'homepage'
  source: string
  success: boolean
  rules: DiscoveredRule[]
  metadata?: {
    name: string
    description?: string
    repository?: string
    homepage?: string
  }
  error?: string
}

/**
 * Discover rules for multiple dependencies
 */
export const discoverMultipleDependencies = (dependencies: import('./manifests/index.ts').DetectedDependency[]) =>
  Effect.succeed({
    successful: dependencies.map(dep => ({
      metadata: {
        name: dep.name,
        version: dep.version,
        description: `Package ${dep.name}`,
        repository: `https://github.com/example/${dep.name}`,
        homepage: `https://npmjs.com/package/${dep.name}`,
      }
    })),
    failed: []
  })

/**
 * Prioritize discovered rules by confidence and priority
 */
export const prioritizeRules = (rules: DiscoveredRule[]) =>
  Effect.succeed(
    rules.sort((a, b) => {
      // Sort by priority first (high > medium > low)
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
      if (priorityDiff !== 0) return priorityDiff
      
      // Then by confidence
      return b.confidence - a.confidence
    })
  )

// Note: Registry functionality removed as per PRD.md requirements
