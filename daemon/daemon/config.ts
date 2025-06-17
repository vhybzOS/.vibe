import { Effect, pipe } from 'effect'
import { z } from 'zod/v4'
import { loadConfig, saveJSONWithBackup } from '../../lib/fs.ts'

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
    maxProjects: z.number().min(1).max(100).default(10),
    ignorePaths: z.array(z.string()).default(['node_modules', '.git', 'dist', 'build']),
    projectScanRoots: z.array(z.string()).default(['~/']),
  }),
})

export type DaemonConfig = z.output<typeof DaemonConfigSchema>

const CONFIG_PATH = '~/.config/vibe/daemon.json'

export const loadDaemonConfig = () => loadConfig(expandPath(CONFIG_PATH), DaemonConfigSchema, getDefaultConfig())

export const saveDaemonConfig = (config: DaemonConfig) => saveJSONWithBackup(expandPath(CONFIG_PATH), config)

export const getDefaultConfig = (): DaemonConfig => DaemonConfigSchema.parse({})

const expandPath = (path: string): string => {
  if (path.startsWith('~/')) {
    const home = Deno.env.get('HOME') || '/home'
    return path.replace('~', home)
  }
  return path
}
