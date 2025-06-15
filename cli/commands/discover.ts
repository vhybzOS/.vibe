import { Effect, pipe } from 'effect'
import { discoverDependencies } from '../../core/docs/index.js'

export const discoverCommand = (
  projectPath: string,
  options: { forceRefresh?: boolean }
) =>
  pipe(
    Effect.log('🔍 Discovering project dependencies...'),
    discoverDependencies(projectPath, {
      forceRefresh: options.forceRefresh || false,
    }),
    Effect.tap(result => 
      Effect.log(`✅ Analyzed ${result.summary.totalManifests} manifest file(s)`)
    ),
    Effect.tap(result => 
      Effect.log(`📦 Found ${result.summary.totalDependencies} total dependencies`)
    ),
    Effect.tap(result => 
      Effect.log(`📚 Successfully discovered docs for ${result.summary.totalDiscovered} dependencies`)
    ),
    Effect.tap(result => 
      result.summary.totalFailed > 0
        ? Effect.log(`⚠️  Failed to discover docs for ${result.summary.totalFailed} dependencies`)
        : Effect.succeed(null)
    ),
    Effect.flatMap(result => 
      result.results.length > 0
        ? displayDiscoveryDetails(result.results)
        : Effect.log('ℹ️  No dependency manifests found')
    ),
    Effect.catchAll(error => 
      Effect.log(`❌ Discovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    )
  )

const displayDiscoveryDetails = (results: any[]) =>
  pipe(
    Effect.log(''),
    Effect.log('📋 Discovery Details:'),
    Effect.all(
      results.map(result => 
        pipe(
          Effect.log(`  📄 ${result.manifest.type}:`),
          Effect.log(`    📦 ${result.statistics.totalDependencies} dependencies`),
          Effect.log(`    ✅ ${result.statistics.successfulDiscoveries} discovered`),
          Effect.log(`    ❌ ${result.statistics.failedDiscoveries} failed`),
          result.discovered.length > 0
            ? Effect.all(
                result.discovered.slice(0, 5).map((dep: any) => 
                  Effect.log(`      📚 ${dep.package.name}@${dep.package.version}`)
                )
              )
            : Effect.succeed([]),
          result.discovered.length > 5
            ? Effect.log(`      ... and ${result.discovered.length - 5} more`)
            : Effect.succeed(null)
        )
      )
    ),
    Effect.log('')
  )