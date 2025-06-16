/**
 * Main entry point for the autonomous discovery system
 * Exports manifest parsing functionality (registries removed as per PRD)
 */

// Re-export manifest parsing functionality
export {
  discoverManifests,
  consolidateDependencies,
  globalManifestRegistry,
  type ManifestParseResult,
  type DetectedDependency,
} from './manifests/index.ts'

// Re-export base types for external use
export type { ManifestParser } from './manifests/base.ts'

// Note: Registry functionality removed as per PRD.md requirements