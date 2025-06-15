/**
 * Main entry point for registry fetcher system
 * Auto-registers all available fetchers and exports the registry
 */

import { Effect, pipe } from 'effect'
import { VibeError } from '../../lib/effects.ts'
import {
  RegistryFetcherRegistry,
  RegistryFetchResult,
  PackageMetadata,
  DiscoveredRule,
  globalRegistryFetcher,
} from './base.ts'
import { NpmRegistryFetcher } from './npm.ts'
import type { DetectedDependency } from '../manifests/index.ts'

// Auto-register all fetchers
globalRegistryFetcher.register(new NpmRegistryFetcher())

// TODO: Add more fetchers as needed
// globalRegistryFetcher.register(new PypiRegistryFetcher())
// globalRegistryFetcher.register(new CargoRegistryFetcher())

/**
 * Fetches metadata and discovers rules for a single dependency
 */
export const discoverDependencyRules = (dependency: DetectedDependency) =>
  pipe(
    Effect.log(`🔍 Processing dependency: ${dependency.name}@${dependency.version}`),
    Effect.flatMap(() => {
      // Determine package type from dependency source
      const packageType = determinePackageType(dependency)
      const fetcher = globalRegistryFetcher.getFetcherForPackage(dependency.name, packageType)
      
      if (!fetcher) {
        return Effect.succeed({
          dependency,
          metadata: null,
          rules: [],
          error: 'No suitable fetcher found',
        })
      }
      
      return pipe(
        fetcher.fetchPackageMetadata(dependency.name, dependency.version),
        Effect.flatMap(metadata => 
          fetcher.discoverRules(metadata).pipe(
            Effect.map(rules => ({
              dependency,
              metadata,
              rules,
              error: null,
            }))
          )
        ),
        Effect.catchAll(error => 
          Effect.succeed({
            dependency,
            metadata: null,
            rules: [],
            error: error instanceof VibeError ? error.message : 'Unknown error',
          })
        )
      )
    })
  )

/**
 * Batch processes multiple dependencies for rule discovery
 */
export const discoverMultipleDependencies = (dependencies: DetectedDependency[]) =>
  pipe(
    Effect.log(`🔄 Processing ${dependencies.length} dependencies`),
    Effect.flatMap(() =>
      Effect.all(
        dependencies.map(dep => discoverDependencyRules(dep)),
        { concurrency: 5 } // Limit concurrent requests to avoid rate limiting
      )
    ),
    Effect.map(results => {
      const successful = results.filter((r: any) => r.metadata && r.rules.length > 0)
      const failed = results.filter((r: any) => r.error)
      
      return {
        successful,
        failed,
        totalRules: successful.reduce((sum: number, r: any) => sum + r.rules.length, 0),
        stats: {
          processed: results.length,
          successful: successful.length,
          failed: failed.length,
          totalRules: successful.reduce((sum: number, r: any) => sum + r.rules.length, 0),
        }
      }
    }),
    Effect.tap(results => 
      Effect.log(`✅ Discovered ${results.totalRules} rules from ${results.successful.length}/${dependencies.length} dependencies`)
    )
  )

/**
 * Determines the package type from a dependency
 */
const determinePackageType = (dependency: DetectedDependency): string => {
  // Check the source file to determine package type
  const source = dependency.source.toLowerCase()
  
  if (source.includes('package.json')) {
    return 'npm'
  } else if (source.includes('requirements.txt') || source.includes('pyproject.toml')) {
    return 'python'
  } else if (source.includes('cargo.toml')) {
    return 'rust'
  } else if (source.includes('composer.json')) {
    return 'php'
  } else if (source.includes('go.mod')) {
    return 'go'
  }
  
  // Default to npm for now
  return 'npm'
}

/**
 * Filters and prioritizes discovered rules
 */
export const prioritizeRules = (rules: DiscoveredRule[]) =>
  Effect.sync(() => {
    // Sort by confidence (higher first), then by category priority
    const categoryPriority = {
      'framework': 10,
      'language': 9,
      'testing': 8,
      'build': 7,
      'tooling': 6,
      'documentation': 5,
    } as const
    
    return rules
      .sort((a, b) => {
        // First sort by confidence
        if (a.confidence !== b.confidence) {
          return b.confidence - a.confidence
        }
        
        // Then by category priority
        const aPriority = categoryPriority[a.category as keyof typeof categoryPriority] || 0
        const bPriority = categoryPriority[b.category as keyof typeof categoryPriority] || 0
        
        return bPriority - aPriority
      })
      // Remove duplicates based on similar content
      .filter((rule, index, array) => {
        return !array.slice(0, index).some(existing => 
          existing.name === rule.name && 
          existing.packageName === rule.packageName
        )
      })
  })

/**
 * Creates a cache-friendly result
 */
export const createCacheableResult = (
  dependency: DetectedDependency,
  metadata: PackageMetadata | null,
  rules: DiscoveredRule[]
): RegistryFetchResult => ({
  package: metadata!,
  rules,
  rawData: { dependency },
  fetchedAt: new Date().toISOString(),
  cacheKey: `${dependency.name}:${dependency.version}`,
})

// Export the global registry for external use
export { globalRegistryFetcher }
export type { 
  PackageMetadata, 
  DiscoveredRule, 
  RegistryFetchResult 
} from './base.ts'