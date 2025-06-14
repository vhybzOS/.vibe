import { Effect, pipe } from 'effect'
import { resolve } from '@std/path'
import { match } from 'ts-pattern'
import { 
  AIToolConfig, 
  AIToolType, 
  DetectedTool, 
  ToolDetectionPattern 
} from '../../schemas/ai-tool-config.ts'

// Tool detection configurations
export const TOOL_CONFIGS: Record<AIToolType, AIToolConfig> = {
  cursor: {
    tool: 'cursor',
    name: 'Cursor',
    detection: {
      files: ['.cursorrules'],
      directories: ['.cursor'],
      priority: 1,
    },
    configFiles: [
      {
        path: '.cursorrules',
        format: { type: 'markdown' },
        required: true,
        description: 'Cursor AI rules and instructions',
      },
    ],
    capabilities: {
      rules: true,
      commands: false,
      memory: false,
      context: true,
    },
    syncStrategy: 'overwrite',
    metadata: {
      conflicts: [],
      customizations: {},
    },
  },
  windsurf: {
    tool: 'windsurf',
    name: 'Windsurf',
    detection: {
      files: ['.windsurfrules', '.windsurf'],
      directories: ['.windsurf'],
      priority: 1,
    },
    configFiles: [
      {
        path: '.windsurfrules',
        format: { type: 'markdown' },
        required: false,
        description: 'Windsurf AI rules and instructions',
      },
      {
        path: '.windsurf/memory.md',
        format: { type: 'markdown' },
        required: false,
        description: 'Windsurf memory file',
      },
    ],
    capabilities: {
      rules: true,
      commands: false,
      memory: true,
      context: true,
    },
    syncStrategy: 'merge',
    metadata: {
      conflicts: [],
      customizations: {},
    },
  },
  claude: {
    tool: 'claude',
    name: 'Claude Desktop',
    detection: {
      files: [],
      directories: ['.claude'],
      priority: 1,
    },
    configFiles: [
      {
        path: '.claude/commands.md',
        format: { type: 'markdown' },
        required: false,
        description: 'Claude custom commands',
      },
    ],
    capabilities: {
      rules: true,
      commands: true,
      memory: false,
      context: true,
    },
    syncStrategy: 'merge',
    metadata: {
      conflicts: [],
      customizations: {},
    },
  },
  copilot: {
    tool: 'copilot',
    name: 'GitHub Copilot',
    detection: {
      files: ['copilot-instructions.md', '.github/copilot-instructions.md'],
      directories: ['.github/copilot'],
      priority: 1,
    },
    configFiles: [
      {
        path: 'copilot-instructions.md',
        format: { type: 'markdown' },
        required: false,
        description: 'GitHub Copilot instructions',
      },
      {
        path: '.github/copilot-instructions.md',
        format: { type: 'markdown' },
        required: false,
        description: 'GitHub Copilot instructions in .github',
      },
    ],
    capabilities: {
      rules: true,
      commands: false,
      memory: false,
      context: true,
    },
    syncStrategy: 'overwrite',
    metadata: {
      conflicts: [],
      customizations: {},
    },
  },
  codeium: {
    tool: 'codeium',
    name: 'Codeium',
    detection: {
      files: ['.codeium/instructions.md'],
      directories: ['.codeium'],
      priority: 1,
    },
    configFiles: [
      {
        path: '.codeium/instructions.md',
        format: { type: 'markdown' },
        required: false,
        description: 'Codeium AI instructions',
      },
    ],
    capabilities: {
      rules: true,
      commands: false,
      memory: false,
      context: true,
    },
    syncStrategy: 'overwrite',
    metadata: {
      conflicts: [],
      customizations: {},
    },
  },
  cody: {
    tool: 'cody',
    name: 'Sourcegraph Cody',
    detection: {
      files: ['.cody/instructions.md'],
      directories: ['.cody'],
      priority: 1,
    },
    configFiles: [
      {
        path: '.cody/instructions.md',
        format: { type: 'markdown' },
        required: false,
        description: 'Cody AI instructions',
      },
    ],
    capabilities: {
      rules: true,
      commands: false,
      memory: false,
      context: true,
    },
    syncStrategy: 'overwrite',
    metadata: {
      conflicts: [],
      customizations: {},
    },
  },
  tabnine: {
    tool: 'tabnine',
    name: 'Tabnine',
    detection: {
      files: ['.tabnine'],
      directories: ['.tabnine'],
      priority: 1,
    },
    configFiles: [
      {
        path: '.tabnine/config.json',
        format: { type: 'json' },
        required: false,
        description: 'Tabnine configuration',
      },
    ],
    capabilities: {
      rules: false,
      commands: false,
      memory: false,
      context: false,
    },
    syncStrategy: 'merge',
    metadata: {
      conflicts: [],
      customizations: {},
    },
  },
}

export const detectAITools = (projectPath: string) =>
  pipe(
    Effect.all(
      Object.values(TOOL_CONFIGS).map(config => 
        detectTool(projectPath, config)
      )
    ),
    Effect.map(results => results.filter(Boolean) as DetectedTool[]),
    Effect.map(detected => detected.sort((a, b) => b.confidence - a.confidence))
  )

const detectTool = (projectPath: string, config: AIToolConfig) =>
  pipe(
    Effect.all([
      checkFiles(projectPath, config.detection.files),
      checkDirectories(projectPath, config.detection.directories),
    ]),
    Effect.map(([fileResults, dirResults]) => {
      const allResults = [...fileResults, ...dirResults]
      const existingFiles = allResults.filter(r => r.exists)
      
      if (existingFiles.length === 0) {
        return null
      }

      const confidence = calculateConfidence(existingFiles, config.detection)
      
      return {
        tool: config.tool,
        configFiles: existingFiles,
        confidence,
        detectedAt: new Date().toISOString(),
        status: 'active' as const,
      } satisfies DetectedTool
    })
  )

const checkFiles = (projectPath: string, files: string[]) =>
  pipe(
    Effect.all(
      files.map(filePath => 
        checkPath(resolve(projectPath, filePath), 'file')
      )
    )
  )

const checkDirectories = (projectPath: string, directories: string[]) =>
  pipe(
    Effect.all(
      directories.map(dirPath => 
        checkPath(resolve(projectPath, dirPath), 'directory')
      )
    )
  )

const checkPath = (fullPath: string, type: 'file' | 'directory') =>
  pipe(
    Effect.tryPromise({
      try: async () => await Deno.stat(fullPath),
      catch: () => new Error(`Failed to stat ${fullPath}`),
    }),
    Effect.map(stats => ({
      path: fullPath,
      exists: true,
      lastModified: stats.mtime?.toISOString() || new Date().toISOString(),
      size: type === 'file' ? stats.size : undefined,
    })),
    Effect.catchAll(() => 
      Effect.succeed({
        path: fullPath,
        exists: false,
        lastModified: undefined,
        size: undefined,
      })
    )
  )

const calculateConfidence = (
  existingFiles: Array<{ path: string; exists: boolean }>,
  detection: ToolDetectionPattern
): number => {
  const totalPossible = detection.files.length + detection.directories.length
  const found = existingFiles.length
  
  return Math.min(found / Math.max(totalPossible, 1), 1.0)
}

export const parseToolConfig = (tool: AIToolType, configPath: string) =>
  pipe(
    Effect.tryPromise({
      try: () => Deno.readTextFile(configPath),
      catch: () => new Error(`Failed to read ${configPath}`),
    }),
    Effect.flatMap(content => 
      match(tool)
        .with('cursor', () => parseCursorRules(content))
        .with('windsurf', () => parseWindsurfRules(content))
        .with('claude', () => parseClaudeCommands(content))
        .with('copilot', () => parseCopilotInstructions(content))
        .with('codeium', () => parseCodeiumInstructions(content))
        .with('cody', () => parseCodyInstructions(content))
        .with('tabnine', () => parseTabnineConfig(content))
        .exhaustive()
    )
  )

const parseCursorRules = (content: string) =>
  Effect.succeed({
    type: 'rules' as const,
    content: content.trim(),
    metadata: {
      format: 'markdown',
      tool: 'cursor' as const,
    },
  })

const parseWindsurfRules = (content: string) =>
  Effect.succeed({
    type: 'rules' as const,
    content: content.trim(),
    metadata: {
      format: 'markdown',
      tool: 'windsurf' as const,
    },
  })

const parseClaudeCommands = (content: string) =>
  Effect.succeed({
    type: 'commands' as const,
    content: content.trim(),
    metadata: {
      format: 'markdown',
      tool: 'claude' as const,
    },
  })

const parseCopilotInstructions = (content: string) =>
  Effect.succeed({
    type: 'rules' as const,
    content: content.trim(),
    metadata: {
      format: 'markdown',
      tool: 'copilot' as const,
    },
  })

const parseCodeiumInstructions = (content: string) =>
  Effect.succeed({
    type: 'rules' as const,
    content: content.trim(),
    metadata: {  
      format: 'markdown',
      tool: 'codeium' as const,
    },
  })

const parseCodyInstructions = (content: string) =>
  Effect.succeed({
    type: 'rules' as const,
    content: content.trim(),
    metadata: {
      format: 'markdown',
      tool: 'cody' as const,
    },
  })

const parseTabnineConfig = (content: string) =>
  pipe(
    Effect.try({
      try: () => JSON.parse(content),
      catch: () => new Error('Invalid JSON in Tabnine config'),
    }),
    Effect.map(config => ({
      type: 'config' as const,
      content: config,
      metadata: {
        format: 'json',
        tool: 'tabnine' as const,
      },
    }))
  )