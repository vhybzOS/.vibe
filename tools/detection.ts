/**
 * AI tool detection and configuration management
 * Detects various AI coding assistants and their configurations
 */

import { Effect, pipe } from 'effect'
import { resolve } from '@std/path'
import { fileExists } from '../lib/fs.ts'
import { logWithContext } from '../lib/effects.ts'
import { createFileSystemError, type VibeError } from '../lib/errors.ts'
import { AIToolConfig, AIToolType, DetectedTool } from '../schemas/ai-tool-config.ts'

type ConfigFileInfo = {
  path: string
  exists: boolean
  lastModified?: string | undefined
  size?: number | undefined
  hash?: string | undefined
}

/**
 * Configuration for detecting different AI tools
 */
export const TOOL_CONFIGS: Record<AIToolType, AIToolConfig> = {
  cursor: {
    tool: 'cursor',
    name: 'Cursor',
    detection: {
      files: ['.cursorrules'],
      directories: ['.cursor'],
      priority: 1,
    },
    configFiles: [{
      path: '.cursorrules',
      format: { type: 'markdown', encoding: 'utf-8' },
      required: true,
    }],
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
      files: ['.windsurfrules', '.windsurf.json'],
      directories: ['.windsurf'],
      priority: 2,
    },
    configFiles: [{
      path: '.windsurfrules',
      format: { type: 'yaml', encoding: 'utf-8' },
      required: true,
    }],
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

  claude: {
    tool: 'claude',
    name: 'Claude Desktop',
    detection: {
      files: [],
      directories: ['.claude'],
      priority: 3,
    },
    configFiles: [{
      path: '.claude/commands.md',
      format: { type: 'markdown', encoding: 'utf-8' },
      required: false,
    }],
    capabilities: {
      rules: true,
      commands: true,
      memory: true,
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
      files: ['.github/copilot-instructions.md'],
      directories: ['.github/copilot'],
      priority: 4,
    },
    configFiles: [{
      path: '.github/copilot-instructions.md',
      format: { type: 'markdown', encoding: 'utf-8' },
      required: false,
    }],
    capabilities: {
      rules: true,
      commands: false,
      memory: false,
      context: true,
    },
    syncStrategy: 'append',
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
      priority: 5,
    },
    configFiles: [{
      path: '.codeium/instructions.md',
      format: { type: 'markdown', encoding: 'utf-8' },
      required: false,
    }],
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
      priority: 6,
    },
    configFiles: [{
      path: '.cody/instructions.md',
      format: { type: 'markdown', encoding: 'utf-8' },
      required: false,
    }],
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
      files: ['.tabnine.json'],
      directories: ['.tabnine'],
      priority: 7,
    },
    configFiles: [{
      path: '.tabnine.json',
      format: { type: 'json', encoding: 'utf-8' },
      required: false,
    }],
    capabilities: {
      rules: true,
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

/**
 * Detects AI tools in the given project directory
 */
export const detectAITools = (projectPath: string) =>
  pipe(
    Effect.all(
      Object.values(TOOL_CONFIGS).map((config) => detectSingleTool(projectPath, config)),
    ),
    Effect.map((results) =>
      results
        .filter((result): result is DetectedTool => result !== null)
        .sort((a, b) => b.confidence - a.confidence)
    ),
    Effect.tap((tools) =>
      logWithContext(
        'Detection',
        `Found ${tools.length} AI tools: ${tools.map((t) => t.tool).join(', ')}`,
      )
    ),
  )

/**
 * Detects a single AI tool in the project
 */
const detectSingleTool = (
  projectPath: string,
  config: AIToolConfig,
): Effect.Effect<DetectedTool | null, VibeError> =>
  pipe(
    Effect.all([
      checkConfigFiles(projectPath, config),
      checkConfigDirectories(projectPath, config),
    ]),
    Effect.map(([fileMatches, dirMatches]) => {
      const totalMatches = fileMatches.length + dirMatches.length

      if (totalMatches === 0) {
        return null
      }

      const confidence = calculateConfidence(config, fileMatches, dirMatches)
      const status = determineToolStatus(fileMatches, dirMatches)

      return {
        tool: config.tool,
        confidence,
        status,
        configFiles: fileMatches,
        detectedAt: new Date().toISOString(),
        metadata: {
          directories: dirMatches,
          version: extractVersion(fileMatches),
        },
      } as DetectedTool
    }),
  )

/**
 * Checks for configuration files
 */
const checkConfigFiles = (
  projectPath: string,
  config: AIToolConfig,
): Effect.Effect<ConfigFileInfo[], VibeError> => {
  const checkSingleFile = (file: string): Effect.Effect<ConfigFileInfo, VibeError> => {
    const fullPath = resolve(projectPath, file)
    return pipe(
      fileExists(fullPath),
      Effect.flatMap((exists) => {
        if (!exists) {
          return Effect.fail(
            createFileSystemError(
              `File not found: ${file}`,
              fullPath,
              `Configuration file ${file} does not exist`,
            ),
          )
        }
        return pipe(
          Effect.tryPromise(async () => {
            const stat = await Deno.stat(fullPath)
            return {
              path: file,
              exists: true,
              lastModified: stat.mtime?.toISOString(),
              size: stat.size,
            } as ConfigFileInfo
          }),
          Effect.catchAll(() =>
            Effect.succeed({
              path: file,
              exists: true,
            } as ConfigFileInfo)
          ),
        )
      }),
    )
  }

  return pipe(
    Effect.partition(
      config.detection.files,
      (file) => checkSingleFile(file),
    ),
    Effect.map(([_notFound, existingFiles]) => existingFiles),
  )
}

/**
 * Checks for configuration directories
 */
const checkConfigDirectories = (projectPath: string, config: AIToolConfig) =>
  pipe(
    Effect.all(
      config.detection.directories.map((dir) => {
        const fullPath = resolve(projectPath, dir)
        return pipe(
          fileExists(fullPath),
          Effect.map((exists) => exists ? dir : null),
          Effect.catchAll(() => Effect.succeed(null)),
        )
      }),
    ),
    Effect.map((results) => results.filter((dir): dir is string => dir !== null)),
  )

/**
 * Calculates confidence score for tool detection
 */
const calculateConfidence = (
  config: AIToolConfig,
  fileMatches: ConfigFileInfo[],
  dirMatches: string[],
): number => {
  const requiredFiles = config.configFiles.filter((cf) => cf.required).length
  const foundRequiredFiles =
    fileMatches.filter((file) =>
      config.configFiles.some((cf) => cf.path === file.path && cf.required)
    ).length

  if (requiredFiles > 0 && foundRequiredFiles === 0) {
    return 0.3 // Low confidence if no required files found
  }

  const fileScore = fileMatches.length * 0.4
  const dirScore = dirMatches.length * 0.2
  const requiredBonus = foundRequiredFiles === requiredFiles ? 0.4 : 0

  return Math.min(1.0, fileScore + dirScore + requiredBonus)
}

/**
 * Determines the tool status based on detected files
 */
const determineToolStatus = (
  fileMatches: ConfigFileInfo[],
  dirMatches: string[],
): 'active' | 'configured' | 'partial' => {
  if (fileMatches.length > 0 && dirMatches.length > 0) {
    return 'active'
  } else if (fileMatches.length > 0) {
    return 'configured'
  } else {
    return 'partial'
  }
}

/**
 * Extracts version information from config files (simplified)
 */
const extractVersion = (configFiles: ConfigFileInfo[]): string | undefined => {
  // This is a simplified version - in practice, we'd read and parse the files
  return configFiles.length > 0 ? 'detected' : undefined
}

/**
 * Gets configuration for a specific tool
 */
export const getToolConfig = (tool: AIToolType) => Effect.sync(() => TOOL_CONFIGS[tool])

/**
 * Checks if a tool supports a specific capability
 */
export const toolSupportsCapability = (
  tool: AIToolType,
  capability: keyof AIToolConfig['capabilities'],
) => Effect.sync(() => TOOL_CONFIGS[tool].capabilities[capability])
