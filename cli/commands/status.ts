/**
 * Status command - Shows project .vibe status
 * Clean, functional implementation using Effect-TS
 */

import { Effect, pipe } from 'effect'
import { resolve } from '@std/path'
import { detectAITools } from '../../tools/index.ts'
import { loadRules } from '../../rules/index.ts'
import { memoryStatsCommand } from './memory.ts'
import { searchStatsCommand } from './search.ts'
import { diaryStatsCommand } from './diary.ts'

/**
 * Status command that shows comprehensive project information
 */
export const statusCommand = (
  projectPath: string, 
  options: { verbose?: boolean } = {}
) =>
  pipe(
    Effect.log('📊 .vibe Status Report'),
    Effect.flatMap(() => Effect.log('━━━━━━━━━━━━━━━━━━━━━━━━━━')),
    Effect.flatMap(() => checkVibeDirectory(projectPath)),
    Effect.flatMap((vibeExists) => {
      if (!vibeExists) {
        return pipe(
          Effect.log('❌ .vibe not initialized in this directory'),
          Effect.flatMap(() => Effect.log('   Run `vibe init` to get started')),
          Effect.flatMap(() => Effect.fail(new Error('.vibe not initialized')))
        )
      }
      return pipe(
        showProjectStatus(projectPath, options.verbose || false),
        Effect.catchAll(() => Effect.fail(new Error('Status check failed')))
      )
    })
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
    catch: () => false
  })

/**
 * Show comprehensive project status
 */
const showProjectStatus = (projectPath: string, verbose: boolean) =>
  pipe(
    Effect.all([
      getProjectInfo(projectPath),
      getToolsInfo(projectPath),
      getRulesInfo(projectPath),
      getHealthInfo(projectPath)
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
              Effect.flatMap(() => showVerboseStats(projectPath))
            )
          }
          return Effect.void
        })
      )
    )
  )

/**
 * Get basic project information
 */
const getProjectInfo = (projectPath: string) =>
  Effect.sync(() => ({
    name: projectPath.split('/').pop() || 'unknown',
    path: projectPath
  }))

/**
 * Get AI tools information
 */
const getToolsInfo = (projectPath: string) =>
  pipe(
    detectAITools(projectPath),
    Effect.catchAll(() => Effect.succeed([]))
  )

/**
 * Get rules information
 */
const getRulesInfo = (projectPath: string) =>
  pipe(
    loadRules(resolve(projectPath, '.vibe')),
    Effect.catchAll(() => Effect.succeed([]))
  )

/**
 * Get health information
 */
const getHealthInfo = (projectPath: string) =>
  pipe(
    Effect.all([
      checkFile(resolve(projectPath, '.vibe', 'config.json')),
      checkFile(resolve(projectPath, '.vibe', 'secrets.json')),
      checkDirectory(resolve(projectPath, '.vibe', 'rules')),
      checkDirectory(resolve(projectPath, '.vibe', 'memory')),
      checkDirectory(resolve(projectPath, '.vibe', 'diary'))
    ]),
    Effect.map(([configExists, secretsExists, rulesExists, memoryExists, diaryExists]) => ({
      configExists,
      secretsExists,
      rulesExists,
      memoryExists,
      diaryExists
    }))
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
    catch: () => false
  })

/**
 * Check if directory exists
 */
const checkDirectory = (path: string) =>
  Effect.tryPromise({
    try: async () => {
      const stat = await Deno.stat(path)
      return stat.isDirectory
    },
    catch: () => false
  })

/**
 * Display tools information
 */
const showTools = (tools: Array<{ type: string; name: string; version?: string; configPath?: string }>) =>
  tools.length === 0
    ? Effect.log('   No AI tools detected')
    : Effect.all(tools.map(tool => 
        Effect.log(`   ✅ ${tool.name} (${tool.type})`)
      ))

/**
 * Display rules information
 */
const showRules = (rules: Array<{ id: string; description: string; enabled: boolean }>) =>
  pipe(
    Effect.log(`   📊 Total: ${rules.length}`),
    Effect.flatMap(() => {
      const activeRules = rules.filter(r => r.application?.mode === 'always')
      return Effect.log(`   ⚡ Active: ${activeRules.length}`)
    })
  )

/**
 * Display health information
 */
const showHealth = (health: { status: string; uptime?: number; errors?: string[] }) =>
  pipe(
    Effect.log(`   ⚙️  Configuration: ${health.configExists ? '✅ OK' : '❌ Missing'}`),
    Effect.flatMap(() => Effect.log(`   🔐 Secrets: ${health.secretsExists ? '✅ OK' : '⚠️  Not configured'}`)),
    Effect.flatMap(() => Effect.log(`   📋 Rules: ${health.rulesExists ? '✅ OK' : '❌ Missing'}`)),
    Effect.flatMap(() => Effect.log(`   💾 Memory: ${health.memoryExists ? '✅ OK' : '❌ Missing'}`)),
    Effect.flatMap(() => Effect.log(`   📔 Diary: ${health.diaryExists ? '✅ OK' : '❌ Missing'}`))
  )

/**
 * Show verbose statistics for memory, search, and diary systems
 */
const showVerboseStats = (projectPath: string) =>
  pipe(
    Effect.log(''),
    Effect.flatMap(() => Effect.log('💾 Memory System:')),
    Effect.flatMap(() => memoryStatsCommand(projectPath).pipe(
      Effect.catchAll(() => Effect.log('   ❌ Memory system not available'))
    )),
    Effect.flatMap(() => Effect.log('')),
    Effect.flatMap(() => Effect.log('🔍 Search System:')),
    Effect.flatMap(() => searchStatsCommand(projectPath).pipe(
      Effect.catchAll(() => Effect.log('   ❌ Search system not available'))
    )),
    Effect.flatMap(() => Effect.log('')),
    Effect.flatMap(() => Effect.log('📔 Diary System:')),
    Effect.flatMap(() => diaryStatsCommand(projectPath).pipe(
      Effect.catchAll(() => Effect.log('   ❌ Diary system not available'))
    ))
  )