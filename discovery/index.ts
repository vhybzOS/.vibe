/**
 * Main entry point for the autonomous discovery system
 * Exports all discovery functionality in a clean, modular API
 */

// Re-export manifest parsing functionality
export {
  discoverManifests,
  consolidateDependencies,
  globalManifestRegistry,
  type ManifestParseResult,
  type DetectedDependency,
} from './manifests/index.ts'

// Re-export registry fetching functionality  
export {
  discoverDependencyRules,
  discoverMultipleDependencies,
  prioritizeRules,
  globalRegistryFetcher,
  type PackageMetadata,
  type DiscoveredRule,
  type RegistryFetchResult,
} from './registries/index.ts'

// Re-export base types for external use
export type { ManifestParser } from './manifests/base.ts'
export type { RegistryFetcher } from './registries/base.ts'