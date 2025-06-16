/**
 * Export command - Exports .vibe data to AgentFile format
 * Clean, functional implementation using Effect-TS
 */

import { Effect, pipe } from 'effect'
import { resolve } from '@std/path'

/**
 * Export command that exports .vibe data to AgentFile format
 */
export const exportCommand = (
  projectPath: string,
  options: { output?: string; format?: string }
) =>
  pipe(
    Effect.log('📤 Exporting .vibe data...'),
    Effect.flatMap(() => checkVibeDirectory(projectPath)),
    Effect.flatMap((vibeExists) => {
      if (!vibeExists) {
        return pipe(
          Effect.log('❌ .vibe not initialized in this directory'),
          Effect.flatMap(() => Effect.log('   Run `vibe init` first')),
          Effect.flatMap(() => Effect.fail(new Error('.vibe not initialized')))
        )
      }
      return performExport(projectPath, options)
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
 * Perform the export operation
 */
const performExport = (
  projectPath: string,
  options: { output?: string; format?: string }
) =>
  pipe(
    Effect.log(`📊 Collecting data from ${projectPath}/.vibe`),
    Effect.flatMap(() => collectVibeData(projectPath)),
    Effect.flatMap((data) => formatExportData(data, options)),
    Effect.flatMap((formattedData) => writeExportFile(formattedData, projectPath, options)),
    Effect.flatMap((outputPath) => showExportResults(outputPath, options))
  )

/**
 * Collect .vibe data
 */
const collectVibeData = (projectPath: string) =>
  Effect.sync(() => {
    // In a real implementation, this would:
    // - Load all rules from .vibe/rules/
    // - Load memory entries from .vibe/memory/
    // - Load diary entries from .vibe/diary/
    // - Load configuration from .vibe/config.json
    
    const projectName = projectPath.split('/').pop() || 'unknown'
    
    return {
      project: {
        name: projectName,
        path: projectPath,
        exportedAt: new Date().toISOString()
      },
      rules: [],
      memory: [],
      diary: [],
      config: {
        version: '1.0.0',
        tools: []
      }
    }
  })

/**
 * Format data according to export format
 */
const formatExportData = (data: any, options: { format?: string }) =>
  Effect.sync(() => {
    const format = options.format || 'full'
    
    switch (format) {
      case 'rules-only':
        return {
          agentfile_version: '1.0',
          name: data.project.name,
          rules: data.rules,
          exported: data.project.exportedAt
        }
      
      case 'memory-only':
        return {
          agentfile_version: '1.0',
          name: data.project.name,
          memory: data.memory,
          exported: data.project.exportedAt
        }
      
      case 'full':
      default:
        return {
          agentfile_version: '1.0',
          name: data.project.name,
          description: `Exported .vibe configuration for ${data.project.name}`,
          rules: data.rules,
          memory: data.memory,
          diary: data.diary,
          config: data.config,
          exported: data.project.exportedAt
        }
    }
  })

/**
 * Write export file
 */
const writeExportFile = (
  data: any,
  projectPath: string,
  options: { output?: string }
) =>
  Effect.tryPromise({
    try: async () => {
      const outputPath = options.output || resolve(projectPath, '.vibe.af.json')
      const content = JSON.stringify(data, null, 2)
      
      await Deno.writeTextFile(outputPath, content)
      return outputPath
    },
    catch: (error) => new Error(`Failed to write export file: ${error}`)
  })

/**
 * Show export results
 */
const showExportResults = (outputPath: string, options: any) =>
  pipe(
    Effect.log(''),
    Effect.flatMap(() => Effect.log('📊 Export Results:')),
    Effect.flatMap(() => Effect.log('━━━━━━━━━━━━━━━━━━━━')),
    Effect.flatMap(() => Effect.log(`   ✅ File: ${outputPath}`)),
    Effect.flatMap(() => Effect.log(`   📄 Format: ${options.format || 'full'}`)),
    Effect.flatMap(() => getFileSize(outputPath)),
    Effect.flatMap((size) => Effect.log(`   📦 Size: ${formatBytes(size)}`)),
    Effect.flatMap(() => Effect.log('')),
    Effect.flatMap(() => Effect.log('💡 Use this file with AI assistants that support AgentFile format'))
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
    catch: () => 0
  })

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