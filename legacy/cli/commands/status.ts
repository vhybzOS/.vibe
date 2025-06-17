/**
 * Status command - Shows project .vibe status
 * Clean, functional implementation using Effect-TS
 */

import { Effect, pipe } from 'effect'
import { resolve } from '@std/path'
import { detectAITools, TOOL_CONFIGS } from '../../tools/index.ts'
import { type DetectedTool } from '../../schemas/ai-tool-config.ts'
import { loadRules } from '../../rules/index.ts'
import { type UniversalRule } from '../../schemas/universal-rule.ts'
import { memoryStatsCommand } from './memory.ts'
import { searchStatsCommand } from './search.ts'
import { diaryStatsCommand } from './diary.ts'
import { withVibeDirectory, type CommandFn } from '../base.ts'
import { createCliError, type VibeError } from '../../lib/errors.ts'

/**
 * Core status logic - operates on .vibe directory path
 */
const statusLogic: CommandFn<{ verbose?: boolean }, void> = 
  (vibePath, options) =>
    pipe(
      Effect.log('📊 .vibe Status Report'),
      Effect.flatMap(() => Effect.log('━━━━━━━━━━━━━━━━━━━━━━━━━━')),
      Effect.flatMap(() => showProjectStatus(vibePath, options.verbose || false)),
      Effect.catchAll((error) => Effect.fail(createCliError(error, 'Status check failed', 'status')))
    )

/**
 * Status command that shows comprehensive project information
 */
export const statusCommand = withVibeDirectory(statusLogic)


/**
 * Show comprehensive project status
 */
const showProjectStatus = (vibePath: string, verbose: boolean): Effect.Effect<void, Error | VibeError, never> => {
  const projectPath = vibePath.replace('/.vibe', '')
  return pipe(
    Effect.all([
      getProjectInfo(projectPath),
      getToolsInfo(projectPath),
      getRulesInfo(vibePath), // Use vibePath directly for rules
      getHealthInfo(vibePath), // Use vibePath directly for health
    ]),
    Effect.flatMap(([projectInfo, toolsInfo, rulesInfo, healthInfo]) =>
      pipe(
        Effect.log(`📁 Project: ${projectInfo.name}`),
        Effect.flatMap(() => Effect.log(`📍 Path: ${projectInfo.path}`)),
        Effect.flatMap(() => Effect.log('')),
        Effect.flatMap(() => Effect.log('🤖 Detected AI Tools:')),
        Effect.flatMap(() => showTools(toolsInfo)),
        Effect.flatMap(() => Effect.log('')),
        Effect.flatMap(() => Effect.log('📋 Rules:')),
        Effect.flatMap(() => showRules(rulesInfo)),
        Effect.flatMap(() => Effect.log('')),
        Effect.flatMap(() => Effect.log('💚 Health:')),
        Effect.flatMap(() => showHealth(healthInfo)),
        Effect.flatMap(() => {
          if (verbose) {
            return pipe(
              Effect.log(''),
              Effect.flatMap(() => Effect.log('📊 System Statistics:')),
              Effect.flatMap(() => Effect.log('━━━━━━━━━━━━━━━━━━━━━━━━━━')),
              Effect.flatMap(() => showVerboseStats(projectPath)),
            )
          }
          return Effect.void
        }),
      )
    ),
  )
}

/**
 * Get basic project information
 */
const getProjectInfo = (projectPath: string) =>
  Effect.sync(() => ({
    name: projectPath.split('/').pop() || 'unknown',
    path: projectPath,
  }))

/**
 * Get AI tools information
 */
const getToolsInfo = (projectPath: string) =>
  pipe(
    detectAITools(projectPath),
    Effect.catchAll(() => Effect.succeed([])),
  )

/**
 * Get rules information
 */
const getRulesInfo = (projectPath: string) =>
  pipe(
    loadRules(resolve(projectPath, '.vibe')),
    Effect.catchAll(() => Effect.succeed([])),
  )

/**
 * Get health information
 */
const getHealthInfo = (vibePath: string) =>
  pipe(
    Effect.all([
      checkFile(resolve(vibePath, 'config.json')),
      checkFile(resolve(vibePath, 'secrets.json')),
      checkDirectory(resolve(vibePath, 'rules')),
      checkDirectory(resolve(vibePath, 'memory')),
      checkDirectory(resolve(vibePath, 'diary')),
    ]),
    Effect.map(([configExists, secretsExists, rulesExists, memoryExists, diaryExists]) => ({
      configExists,
      secretsExists,
      rulesExists,
      memoryExists,
      diaryExists,
    })),
  )

/**
 * Check if file exists
 */
const checkFile = (path: string) =>
  Effect.tryPromise({
    try: async () => {
      const stat = await Deno.stat(path)
      return stat.isFile
    },
    catch: (error) => createCliError(error, `Failed to check file: ${path}`, 'status'),
  }).pipe(Effect.catchAll(() => Effect.succeed(false)))

/**
 * Check if directory exists
 */
const checkDirectory = (path: string) =>
  Effect.tryPromise({
    try: async () => {
      const stat = await Deno.stat(path)
      return stat.isDirectory
    },
    catch: (error) => createCliError(error, `Failed to check directory: ${path}`, 'status'),
  }).pipe(Effect.catchAll(() => Effect.succeed(false)))

/**
 * Display tools information
 */
const showTools = (tools: DetectedTool[]) =>
  tools.length === 0 ? Effect.log('   No AI tools detected') : Effect.all(tools.map((tool) => {
    const name = TOOL_CONFIGS[tool.tool]?.name || tool.tool
    const status = tool.status === 'active' ? '✅' : tool.status === 'inactive' ? '⚠️' : '❌'
    return Effect.log(`   ${status} ${name} (${tool.tool}) - ${Math.round(tool.confidence * 100)}%`)
  }))

/**
 * Display rules information
 */
const showRules = (rules: UniversalRule[]) =>
  pipe(
    Effect.log(`   📊 Total: ${rules.length}`),
    Effect.flatMap(() => {
      const activeRules = rules.filter((r) => r.application?.mode === 'always')
      return Effect.log(`   ⚡ Active: ${activeRules.length}`)
    }),
  )

/**
 * Display health information
 */
const showHealth = (health: {
  configExists: boolean
  secretsExists: boolean
  rulesExists: boolean
  memoryExists: boolean
  diaryExists: boolean
}) =>
  pipe(
    Effect.log(`   ⚙️  Configuration: ${health.configExists ? '✅ OK' : '❌ Missing'}`),
    Effect.flatMap(() => Effect.log(`   🔐 Secrets: ${health.secretsExists ? '✅ OK' : '⚠️  Not configured'}`)),
    Effect.flatMap(() => Effect.log(`   📋 Rules: ${health.rulesExists ? '✅ OK' : '❌ Missing'}`)),
    Effect.flatMap(() => Effect.log(`   💾 Memory: ${health.memoryExists ? '✅ OK' : '❌ Missing'}`)),
    Effect.flatMap(() => Effect.log(`   📔 Diary: ${health.diaryExists ? '✅ OK' : '❌ Missing'}`)),
  )

/**
 * Show verbose statistics for memory, search, and diary systems
 */
const showVerboseStats = (projectPath: string) =>
  pipe(
    Effect.log(''),
    Effect.flatMap(() => Effect.log('💾 Memory System:')),
    Effect.flatMap(() =>
      memoryStatsCommand(projectPath).pipe(
        Effect.catchAll(() => Effect.log('   ❌ Memory system not available')),
      )
    ),
    Effect.flatMap(() => Effect.log('')),
    Effect.flatMap(() => Effect.log('🔍 Search System:')),
    Effect.flatMap(() =>
      searchStatsCommand(projectPath).pipe(
        Effect.catchAll(() => Effect.log('   ❌ Search system not available')),
      )
    ),
    Effect.flatMap(() => Effect.log('')),
    Effect.flatMap(() => Effect.log('📔 Diary System:')),
    Effect.flatMap(() =>
      diaryStatsCommand(projectPath).pipe(
        Effect.catchAll(() => Effect.log('   ❌ Diary system not available')),
      )
    ),
  )
