import { Effect, pipe } from 'effect'
import { z } from 'zod/v4'

export const DaemonConfigSchema = z.object({
  daemon: z.object({
    name: z.string().default('vibe-daemon'),
    version: z.string().default('1.0.0'),
    autoStart: z.boolean().default(true),
    logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    pidFile: z.string().default('/tmp/vibe-daemon.pid'),
    logFile: z.string().default('/tmp/vibe-daemon.log'),
    controlPort: z.number().min(1000).max(65535).default(3002),
  }),
  mcpServer: z.object({
    enabled: z.boolean().default(true),
    port: z.number().min(1000).max(65535).default(3001),
    host: z.string().default('localhost'),
    autoRestart: z.boolean().default(true),
  }),
  fileWatcher: z.object({
    enabled: z.boolean().default(true),
    debounceMs: z.number().min(100).max(10000).default(1000),
    maxProjects: z.number().min(1).max(100).default(10),
  }),
  projects: z.object({
    autoDiscover: z.boolean().default(true),
    maxDepth: z.number().min(1).max(10).default(3),
    ignorePaths: z.array(z.string()).default(['node_modules', '.git', 'dist', 'build']),
    projectScanRoots: z.array(z.string()).default(['~/']),
  }),
})

export type DaemonConfig = z.output<typeof DaemonConfigSchema>

const CONFIG_PATH = '~/.config/vibe/daemon.json'

export const loadDaemonConfig = () =>
  pipe(
    Effect.tryPromise({
      try: () => Deno.readTextFile(expandPath(CONFIG_PATH)),
      catch: () => new Error('Config file not found'),
    }),
    Effect.flatMap(content => 
      Effect.try({
        try: () => JSON.parse(content),
        catch: () => new Error('Invalid JSON in config file'),
      })
    ),
    Effect.flatMap(data => 
      Effect.try({
        try: () => DaemonConfigSchema.parse(data),
        catch: (error) => new Error(`Invalid config schema: ${error}`),
      })
    )
  )

export const saveDaemonConfig = (config: DaemonConfig) =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        const configDir = expandPath('~/.config/vibe')
        await Deno.mkdir(configDir, { recursive: true })
        return configDir
      },
      catch: () => new Error('Failed to create config directory'),
    }),
    Effect.flatMap(() => 
      Effect.tryPromise({
        try: () => Deno.writeTextFile(
          expandPath(CONFIG_PATH),
          JSON.stringify(config, null, 2)
        ),
        catch: () => new Error('Failed to write config file'),
      })
    )
  )

export const getDefaultConfig = (): DaemonConfig => 
  DaemonConfigSchema.parse({})

const expandPath = (path: string): string => {
  if (path.startsWith('~/')) {
    const home = Deno.env.get('HOME') || '/home'
    return path.replace('~', home)
  }
  return path
}