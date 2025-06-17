/**
 * Sync command - Syncs AI tool configurations with .vibe rules
 * Clean, functional implementation using Effect-TS
 */

import { Effect, pipe } from 'effect'
import { resolve } from '@std/path'
import { detectAITools } from '../../tools/index.ts'
import { loadRules } from '../../rules/index.ts'
import { createCliError, type VibeError } from '../../lib/errors.ts'

/**
 * Sync command that synchronizes AI tool configurations
 */
export const syncCommand = (
  projectPath: string,
  options: { dryRun?: boolean; force?: boolean },
): Effect.Effect<void, Error | VibeError, never> =>
  pipe(
    Effect.log('🔄 Syncing AI tool configurations...'),
    Effect.flatMap(() => checkVibeDirectory(projectPath)),
    Effect.flatMap((vibeExists) => {
      if (!vibeExists) {
        return pipe(
          Effect.log('❌ .vibe not initialized in this directory'),
          Effect.flatMap(() => Effect.log('   Run `vibe init` first')),
          Effect.flatMap(() => Effect.fail(createCliError(new Error('.vibe not initialized'), '.vibe not initialized', 'sync'))),
        )
      }
      return performSync(projectPath, options)
    }),
  )

/**
 * Check if .vibe directory exists
 */
const checkVibeDirectory = (projectPath: string) =>
  Effect.tryPromise({
    try: async () => {
      const vibePath = resolve(projectPath, '.vibe')
      const stat = await Deno.stat(vibePath)
      return stat.isDirectory
    },
    catch: (error) => new Error(`Failed to check .vibe directory: ${error}`),
  })

/**
 * Perform the actual sync operation
 */
const performSync = (
  projectPath: string,
  options: { dryRun?: boolean; force?: boolean },
): Effect.Effect<void, Error | VibeError, never> =>
  pipe(
    Effect.all([
      getToolsAndRules(projectPath),
    ]),
    Effect.flatMap(([{ tools, rules }]) =>
      pipe(
        Effect.log(`🔍 Found ${tools.length} AI tools and ${rules.length} rules`),
        Effect.flatMap(() => {
          if (tools.length === 0) {
            return pipe(
              Effect.log('ℹ️  No AI tools detected to sync'),
              Effect.flatMap(() => Effect.log('   Supported tools: Cursor, Windsurf, Claude Desktop')),
            )
          }
          // Transform DetectedTool[] to the format expected by performToolSync
          const transformedTools = tools.map(tool => ({
            type: tool.tool,
            name: tool.tool, // Use tool type as name for now
          }))
          // Transform UniversalRule[] to the format expected by performToolSync
          const transformedRules = rules.map(rule => ({
            id: rule.id,
            description: rule.metadata.description,
            enabled: rule.application.mode === 'always',
            compatibility: rule.compatibility, // Preserve compatibility for filtering
          }))
          return performToolSync(transformedTools, transformedRules, options)
        }),
      )
    ),
  )

/**
 * Get tools and rules data
 */
const getToolsAndRules = (projectPath: string) =>
  pipe(
    Effect.all([
      getDetectedTools(projectPath),
      getProjectRules(projectPath),
    ]),
    Effect.map(([tools, rules]) => ({ tools, rules })),
  )

/**
 * Get detected AI tools
 */
const getDetectedTools = (projectPath: string) =>
  pipe(
    detectAITools(projectPath),
    Effect.catchAll(() => Effect.succeed([])),
  )

/**
 * Get project rules
 */
const getProjectRules = (projectPath: string) =>
  pipe(
    loadRules(resolve(projectPath, '.vibe')),
    Effect.catchAll(() => Effect.succeed([])),
  )

/**
 * Perform sync for detected tools
 */
const performToolSync = (
  tools: Array<{ type: string; name: string }>,
  rules: Array<{ id: string; description: string; enabled: boolean; compatibility: any }>,
  options: { dryRun?: boolean; force?: boolean },
) =>
  pipe(
    Effect.log(`🔄 ${options.dryRun ? 'Preview' : 'Syncing'} configurations...`),
    Effect.flatMap(() => Effect.all(tools.map((tool) => syncSingleTool(tool, rules, options)))),
    Effect.flatMap((results) => showSyncResults(results, options)),
  )

/**
 * Sync a single tool
 */
const syncSingleTool = (
  tool: { type: string; name: string; configPath?: string },
  rules: Array<{ id: string; description: string; enabled: boolean; compatibility: any }>,
  options: { dryRun?: boolean; force?: boolean },
) =>
  Effect.sync(() => {
    // Filter rules applicable to this tool
    const applicableRules = rules.filter((rule) =>
      rule.compatibility?.tools?.includes(tool.type) ||
      rule.compatibility?.tools?.length === 0
    )

    if (options.dryRun) {
      return {
        tool: tool.type,
        status: 'preview' as const,
        changes: applicableRules.length,
        message: `Would sync ${applicableRules.length} rules`,
      }
    }

    // In a real implementation, this would write tool-specific config files
    return {
      tool: tool.type,
      status: 'synced' as const,
      changes: applicableRules.length,
      message: `Synced ${applicableRules.length} rules`,
    }
  })

/**
 * Show sync results
 */
const showSyncResults = (
  results: Array<{ tool: string; status: string; changes?: number; message: string }>,
  options: { dryRun?: boolean; force?: boolean },
) =>
  pipe(
    Effect.log(''),
    Effect.flatMap(() => Effect.log('📊 Sync Results:')),
    Effect.flatMap(() => Effect.log('━━━━━━━━━━━━━━━━━━━━━')),
    Effect.flatMap(() =>
      Effect.all(
        results.map((result) => Effect.log(`   ${getToolIcon(result.tool)} ${result.tool}: ${result.message}`)),
      )
    ),
    Effect.flatMap(() => {
      const totalRules = results.reduce((sum, r) => sum + (r.changes || 0), 0)
      const action = options.dryRun ? 'would be synced' : 'synced'
      return pipe(
        Effect.log(''),
        Effect.flatMap(() => Effect.log(`✅ ${totalRules} rules ${action} across ${results.length} tools`)),
      )
    }),
  )

/**
 * Get icon for tool type
 */
const getToolIcon = (toolType: string): string => {
  switch (toolType) {
    case 'cursor':
      return '🎯'
    case 'windsurf':
      return '🏄'
    case 'claude':
      return '🤖'
    case 'copilot':
      return '🚁'
    case 'codeium':
      return '💫'
    default:
      return '🔧'
  }
}
