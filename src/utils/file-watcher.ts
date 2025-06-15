import { Effect, pipe } from 'effect'
import chokidar from 'chokidar'
import { resolve } from '@std/path'
import { detectAITools, syncToolConfigs } from '../core/tools/index.ts'
import { loadRules } from '../core/rules/index.ts'

export interface FileWatcherConfig {
  projectPath: string
  vibePath: string
  autoSync: boolean
  watchPatterns: string[]
  ignorePatterns: string[]
}

export const startFileWatcher = (config: FileWatcherConfig) =>
  pipe(
    Effect.log('👀 Starting file watcher...'),
    Effect.sync(() => setupWatcher(config)),
    Effect.tap(() => Effect.log('✅ File watcher started')),
    Effect.tap(() => Effect.log(`📂 Watching: ${config.watchPatterns.join(', ')}`)),
    Effect.tap(() => Effect.log(`🚫 Ignoring: ${config.ignorePatterns.join(', ')}`))
  )

const setupWatcher = (config: FileWatcherConfig) => {
  const watcher = chokidar.watch(config.watchPatterns, {
    cwd: config.projectPath,
    ignored: config.ignorePatterns,
    persistent: true,
    ignoreInitial: true,
  })

  // Watch for AI tool config changes
  watcher.on('change', (path) => {
    if (isAIToolConfig(path)) {
      Effect.runFork(handleToolConfigChange(config, path))
    }
  })

  watcher.on('add', (path) => {
    if (isAIToolConfig(path)) {
      Effect.runFork(handleToolConfigAdd(config, path))
    }
  })

  watcher.on('unlink', (path) => {
    if (isAIToolConfig(path)) {
      Effect.runFork(handleToolConfigRemove(config, path))
    }
  })

  // Watch for .vibe rule changes
  watcher.on('change', (path) => {
    if (isVibeRule(path)) {
      Effect.runFork(handleVibeRuleChange(config, path))
    }
  })

  return watcher
}

const isAIToolConfig = (filePath: string): boolean => {
  const aiConfigFiles = [
    '.cursorrules',
    '.windsurfrules',
    '.windsurf/memory.md',
    '.claude/commands.md',
    'copilot-instructions.md',
    '.github/copilot-instructions.md',
    '.codeium/instructions.md',
    '.cody/instructions.md',
    '.tabnine/config.json',
  ]
  
  return aiConfigFiles.some(configFile => 
    filePath.endsWith(configFile) || filePath.includes(configFile)
  )
}

const isVibeRule = (filePath: string): boolean => {
  return filePath.includes('.vibe/rules/') && filePath.endsWith('.json')
}

const handleToolConfigChange = (config: FileWatcherConfig, filePath: string) =>
  pipe(
    Effect.log(`🔄 AI tool config changed: ${filePath}`),
    config.autoSync
      ? performAutoSync(config, `Tool config updated: ${filePath}`)
      : Effect.log('ℹ️  Auto-sync disabled, skipping sync')
  )

const handleToolConfigAdd = (config: FileWatcherConfig, filePath: string) =>
  pipe(
    Effect.log(`➕ AI tool config added: ${filePath}`),
    config.autoSync
      ? performAutoSync(config, `New tool config: ${filePath}`)
      : Effect.log('ℹ️  Auto-sync disabled, skipping sync')
  )

const handleToolConfigRemove = (config: FileWatcherConfig, filePath: string) =>
  pipe(
    Effect.log(`➖ AI tool config removed: ${filePath}`),
    // Don't auto-sync on removal to avoid data loss
    Effect.log('ℹ️  Tool config removed - manual sync recommended')
  )

const handleVibeRuleChange = (config: FileWatcherConfig, filePath: string) =>
  pipe(
    Effect.log(`📝 .vibe rule changed: ${filePath}`),
    config.autoSync
      ? performAutoSync(config, `Rule updated: ${filePath}`)
      : Effect.log('ℹ️  Auto-sync disabled, skipping sync')
  )

const performAutoSync = (config: FileWatcherConfig, reason: string) =>
  pipe(
    Effect.log(`🔄 Auto-syncing (${reason})...`),
    Effect.all([
      detectAITools(config.projectPath),
      loadRules(config.vibePath),
    ]),
    Effect.flatMap(([tools, rules]) => 
      syncToolConfigs(config.projectPath, tools, rules)
    ),
    Effect.tap(result => {
      const successful = result.results.filter(r => r.action !== 'error').length
      return Effect.log(`✅ Auto-sync completed: ${successful} tools updated`)
    }),
    Effect.catchAll(error => 
      Effect.log(`❌ Auto-sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    )
  )

export const createDefaultWatcherConfig = (projectPath: string): FileWatcherConfig => ({
  projectPath,
  vibePath: resolve(projectPath, '.vibe'),
  autoSync: true,
  watchPatterns: [
    // AI tool configs
    '.cursorrules',
    '.windsurfrules',
    '.windsurf/**/*',
    '.claude/**/*',
    'copilot-instructions.md',
    '.github/copilot-instructions.md',
    '.codeium/**/*',
    '.cody/**/*',
    '.tabnine/**/*',
    
    // .vibe files
    '.vibe/rules/**/*.json',
    '.vibe/config.json',
    
    // Dependency manifests
    'package.json',
    'requirements.txt',
    'Cargo.toml',
    'go.mod',
    'Gemfile',
    'composer.json',
    'pom.xml',
    'build.gradle',
  ],
  ignorePatterns: [
    'node_modules/**',
    '.git/**',
    'dist/**',
    'build/**',
    '.vibe/memory/**',
    '.vibe/diary/**',
    '.vibe/docs/**',
    '**/*.log',
    '**/*.tmp',
  ],
})

export const stopFileWatcher = (watcher: chokidar.FSWatcher) =>
  pipe(
    Effect.tryPromise({
      try: () => watcher.close(),
      catch: () => new Error('Failed to stop file watcher'),
    }),
    Effect.tap(() => Effect.log('⏹️  File watcher stopped'))
  )