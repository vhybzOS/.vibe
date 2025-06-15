import { Effect, pipe } from 'effect'
import { detectAITools, syncToolConfigs } from '../../tools/index.ts'
import { loadRules } from '../../rules/index.ts'
import { resolve } from '@std/path'

export const syncCommand = (
  projectPath: string,
  options: { dryRun?: boolean; force?: boolean }
) =>
  pipe(
    Effect.log('🔍 Detecting AI tools...'),
    Effect.flatMap(() => detectAITools(projectPath)),
    Effect.tap(tools => 
      tools.length > 0
        ? Effect.log(`✅ Found ${tools.length} AI tool(s): ${tools.map(t => t.tool).join(', ')}`)
        : Effect.log('ℹ️  No AI tools detected')
    ),
    Effect.flatMap(tools => 
      pipe(
        Effect.log('📋 Loading .vibe rules...'),
        Effect.flatMap(() => loadRules(resolve(projectPath, '.vibe'))),
        Effect.tap(rules => Effect.log(`✅ Loaded ${rules.length} rule(s)`)),
        Effect.flatMap(rules => {
          if (options.dryRun) {
            return showSyncPreview(projectPath, tools, rules)
          } else {
            return performSync(projectPath, tools, rules, options.force || false)
          }
        })
      )
    )
  )

const showSyncPreview = (projectPath: string, tools: any[], rules: any[]) =>
  pipe(
    Effect.log('🔍 Sync Preview (Dry Run):'),
    Effect.all(
      tools.map(tool => 
        Effect.log(`  📄 Would sync ${rules.length} rules to ${tool.tool}`)
      )
    ),
    Effect.tap(() => Effect.log('💡 Run without --dry-run to perform actual sync'))
  )

const performSync = (projectPath: string, tools: any[], rules: any[], force: boolean) =>
  pipe(
    Effect.log('🔄 Syncing tool configurations...'),
    syncToolConfigs(projectPath, tools, rules),
    Effect.tap(result => {
      const successful = result.results.filter(r => r.action !== 'error').length
      const failed = result.results.filter(r => r.action === 'error').length
      
      return pipe(
        Effect.log(`✅ Sync completed: ${successful} successful, ${failed} failed`),
        Effect.flatMap(() => 
          result.results.length > 0
            ? Effect.all(
                result.results.map(r => 
                  Effect.log(`  ${r.action === 'error' ? '❌' : '✅'} ${r.tool}: ${r.files.length} file(s)`)
                )
              )
            : Effect.succeed([])
        )
      )
    }),
    Effect.catchAll(error => 
      Effect.log(`❌ Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    )
  )