/**
 * Export command - Exports .vibe data to AgentFile format
 * Clean, functional implementation using Effect-TS
 */

import { Effect, pipe } from 'effect'
import { resolve } from '@std/path'
import { loadMemories } from '../../memory/index.ts'
import { getTimeline } from '../../diary/index.ts'
import { loadRules } from '../../rules/index.ts'
import { withVibeDirectory, type CommandFn } from '../base.ts'
import { loadConfig as loadConfigFromFs } from '../../lib/fs.ts'
import { createCliError, type VibeError } from '../../lib/errors.ts'
import { type UniversalRule } from '../../schemas/universal-rule.ts'
import { type Memory } from '../../schemas/memory.ts'
import { type DiaryEntry } from '../../schemas/diary.ts'
import { type VibeConfig } from '../../schemas/project.ts'

/**
 * Core export logic - operates on .vibe directory path
 */
const exportLogic: CommandFn<{ output?: string; format?: string }, void> = 
  (vibePath, options) =>
    pipe(
      Effect.log('📤 Exporting .vibe data...'),
      Effect.flatMap(() => performExport(vibePath, options))
    )

/**
 * Export command that exports .vibe data to AgentFile format
 */
export const exportCommand = withVibeDirectory(exportLogic)


/**
 * Perform the export operation
 */
const performExport = (
  vibePath: string,
  options: { output?: string; format?: string },
): Effect.Effect<void, Error | VibeError, never> =>
  pipe(
    Effect.log(`📊 Collecting data from ${vibePath}`),
    Effect.flatMap(() => collectVibeData(vibePath)),
    Effect.flatMap((data) => formatExportData(data, options)),
    Effect.flatMap((formattedData) => writeExportFile(formattedData, vibePath, options)),
    Effect.flatMap((outputPath) => showExportResults(outputPath, options)),
  )

/**
 * Collect .vibe data
 */
const collectVibeData = (vibePath: string) =>
  pipe(
    Effect.sync(() => ({
      projectName: vibePath.split('/').slice(-2, -1)[0] || 'unknown',
      projectPath: vibePath.replace('/.vibe', ''),
    })),
    Effect.flatMap(({ projectName, projectPath }) =>
      Effect.all([
        loadRules(vibePath).pipe(Effect.catchAll(() => Effect.succeed([]))),
        loadMemories(projectPath).pipe(Effect.catchAll(() => Effect.succeed([]))),
        getTimeline(projectPath).pipe(Effect.catchAll(() => Effect.succeed([]))),
        loadConfigFile(vibePath).pipe(
          Effect.catchAll(() => Effect.succeed({ version: '1.0.0', tools: [] })),
        ),
      ]).pipe(
        Effect.map(([rules, memory, diary, config]) => ({
          project: {
            name: projectName,
            path: projectPath,
            exportedAt: new Date().toISOString(),
          },
          rules,
          memory,
          diary,
          config,
        })),
      )
    ),
  )

/**
 * Load configuration file
 */
const loadConfigFile = (vibePath: string) =>
  Effect.tryPromise({
    try: async () => {
      const configPath = resolve(vibePath, 'config.json')
      const content = await Deno.readTextFile(configPath)
      return JSON.parse(content)
    },
    catch: () => ({ version: '1.0.0', tools: [] }),
  })

/**
 * Format data according to export format
 */
const formatExportData = (
  data: {
    project: { name: string; path: string; exportedAt: string }
    rules: UniversalRule[]
    memory: Memory[]
    diary: DiaryEntry[]
    config: VibeConfig | { version: string; tools: unknown[] }
  },
  options: { format?: string },
) =>
  Effect.sync(() => {
    const format = options.format || 'full'

    switch (format) {
      case 'rules-only':
        return {
          agentfile_version: '1.0',
          name: data.project.name,
          rules: data.rules.map(rule => ({
            id: rule.id,
            description: rule.metadata.description,
          })),
          exported: data.project.exportedAt,
        }

      case 'memory-only':
        return {
          agentfile_version: '1.0',
          name: data.project.name,
          memory: data.memory.map(memory => ({
            id: memory.metadata.id,
            content: memory.content.summary || memory.content.content,
          })),
          exported: data.project.exportedAt,
        }

      case 'diary-only':
        return {
          agentfile_version: '1.0',
          name: data.project.name,
          diary: data.diary.map(entry => ({
            id: entry.id,
            title: entry.title,
          })),
          exported: data.project.exportedAt,
        }

      case 'full':
      default:
        return {
          agentfile_version: '1.0',
          name: data.project.name,
          description: `Exported .vibe configuration for ${data.project.name}`,
          rules: data.rules.map(rule => ({
            id: rule.id,
            description: rule.metadata.description,
          })),
          memory: data.memory.map(memory => ({
            id: memory.metadata.id,
            content: memory.content.summary || memory.content.content,
          })),
          diary: data.diary.map(entry => ({
            id: entry.id,
            title: entry.title,
          })),
          config: data.config,
          exported: data.project.exportedAt,
        }
    }
  })

/**
 * Write export file
 */
const writeExportFile = (
  data: {
    agentfile_version: string
    name: string
    description?: string
    rules?: Array<{ id: string; description: string }>
    memory?: Array<{ id: string; content: string }>
    diary?: Array<{ id: string; title: string }>
    config?: VibeConfig | { version: string; tools: unknown[] }
    exported: string
  },
  vibePath: string,
  options: { output?: string },
) =>
  Effect.tryPromise({
    try: async () => {
      const projectPath = vibePath.replace('/.vibe', '')
      const outputPath = options.output || resolve(projectPath, '.vibe.af.json')
      const content = JSON.stringify(data, null, 2)

      await Deno.writeTextFile(outputPath, content)
      return outputPath
    },
    catch: (error) => createCliError(new Error(`Failed to write export file: ${error}`), 'Export failed', 'export'),
  })

/**
 * Show export results
 */
const showExportResults = (outputPath: string, options: { format?: string }) =>
  pipe(
    Effect.log(''),
    Effect.flatMap(() => Effect.log('📊 Export Results:')),
    Effect.flatMap(() => Effect.log('━━━━━━━━━━━━━━━━━━━━')),
    Effect.flatMap(() => Effect.log(`   ✅ File: ${outputPath}`)),
    Effect.flatMap(() => Effect.log(`   📄 Format: ${options.format || 'full'}`)),
    Effect.flatMap(() => getFileSize(outputPath)),
    Effect.flatMap((size) => Effect.log(`   📦 Size: ${formatBytes(size)}`)),
    Effect.flatMap(() => Effect.log('')),
    Effect.flatMap(() => Effect.log('💡 Use this file with AI assistants that support AgentFile format')),
  )

/**
 * Get file size
 */
const getFileSize = (path: string) =>
  Effect.tryPromise({
    try: async () => {
      const stat = await Deno.stat(path)
      return stat.size
    },
    catch: (error) => createCliError(error, `Failed to get file size: ${path}`, 'export'),
  }).pipe(
    Effect.catchAll(() => Effect.succeed(0)) // Fallback to 0 if file size check fails
  )

/**
 * Format bytes to human readable
 */
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}
