/**
 * Vibe Daemon Engine
 *
 * This file is the complete, self-contained implementation of the .vibe core engine.
 * It embodies a functional, service-oriented architecture driven by Effect-TS,
 * where every operation is a type-safe, composable, and resilient effect.
 *
 * @version 0.2.0
 * @author Keyvan, Claude, Gemini
 */

// =================================================================
// 1. IMPORTS & DEPENDENCIES
// =================================================================

import { Context, Effect, Layer, pipe } from 'effect'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { dirname, resolve } from '@std/path'
import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'

// =================================================================
// 2. CORE SCHEMAS & TYPES
// =================================================================

const UniversalRuleSchema = z.object({
  id: z.string().uuid(),
  content: z.string(),
  metadata: z.object({ name: z.string() }),
})
const MemorySchema = z.object({ id: z.string().uuid(), content: z.string(), type: z.string() })
const DiaryEntrySchema = z.object({ id: z.string().uuid(), title: z.string(), content: z.string() })
const SearchResultSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  type: z.string(),
  score: z.number(),
})
const ProjectStatusSchema = z.object({
  projectName: z.string(),
  projectPath: z.string(),
  detectedTools: z.array(z.object({ name: z.string(), confidence: z.number() })),
  ruleCount: z.number(),
  memoryCount: z.number(),
  diaryCount: z.number(),
})
const SyncResultSchema = z.object({ syncedFiles: z.array(z.string()) })
const MemoryInputSchema = z.object({ content: z.string(), type: z.string().default('knowledge') })
const DiaryInputSchema = z.object({ title: z.string(), content: z.string() })
const SearchQuerySchema = z.object({ query: z.string(), type: z.array(z.string()).optional() })
const DaemonStatusSchema = z.object({
  isRunning: z.boolean(),
  version: z.string(),
  pid: z.number(),
  uptime: z.string(),
  projectsWatched: z.number(),
  ports: z.object({ http: z.number(), mcp: z.number() }),
})
const ToolConfigSchema = z.object({
  tool: z.string(),
  name: z.string(),
  detection: z.object({ files: z.array(z.string()) }),
})

export type UniversalRule = z.output<typeof UniversalRuleSchema>
export type Memory = z.output<typeof MemorySchema>
export type DiaryEntry = z.output<typeof DiaryEntrySchema>
export type ProjectStatus = z.output<typeof ProjectStatusSchema>
export type SearchResult = z.output<typeof SearchResultSchema>
export type SyncResult = z.output<typeof SyncResultSchema>
export type DaemonStatus = z.output<typeof DaemonStatusSchema>

// =================================================================
// 3. ERROR MODEL
// =================================================================

interface FileSystemError {
  readonly _tag: 'FileSystemError'
  message: string
  path: string
  cause?: unknown
}
interface ParseError {
  readonly _tag: 'ParseError'
  message: string
  cause?: unknown
}
interface NetworkError {
  readonly _tag: 'NetworkError'
  message: string
  url: string
  cause?: unknown
}
interface DiscoveryError {
  readonly _tag: 'DiscoveryError'
  message: string
  cause?: unknown
}
export type VibeError = FileSystemError | ParseError | NetworkError | DiscoveryError

const createFileSystemError = (cause: unknown, path: string, message: string): FileSystemError => ({
  _tag: 'FileSystemError',
  message,
  path,
  cause,
})
const createParseError = (cause: unknown, message: string): ParseError => ({ _tag: 'ParseError', message, cause })
const createNetworkError = (cause: unknown, url: string, message: string): NetworkError => ({
  _tag: 'NetworkError',
  message,
  url,
  cause,
})
const createDiscoveryError = (cause: unknown, message: string): DiscoveryError => ({
  _tag: 'DiscoveryError',
  message,
  cause,
})

// =================================================================
// 4. CORE LIBRARY (Internal Helpers)
// =================================================================

namespace Lib {
  export const readTextFile = (path: string) =>
    Effect.tryPromise({
      try: () => Deno.readTextFile(path),
      catch: (e) => createFileSystemError(e, path, `Failed to read file`),
    })
  export const writeTextFile = (path: string, content: string) =>
    Effect.tryPromise({
      try: () => Deno.mkdir(dirname(path), { recursive: true }).then(() => Deno.writeTextFile(path, content)),
      catch: (e) => createFileSystemError(e, path, `Failed to write file`),
    })
  export const fileExists = (path: string) =>
    Effect.tryPromise({ try: () => Deno.stat(path).then((s) => s.isFile), catch: () => false })
  export const loadJson = <T>(schema: z.ZodSchema<T>) => (path: string) =>
    pipe(
      readTextFile(path),
      Effect.flatMap((content) =>
        Effect.try({
          try: () => schema.parse(JSON.parse(content)),
          catch: (e) => createParseError(e, `Invalid JSON at ${path}`),
        })
      ),
    )
  export const makeHttpRequest = (url: string) =>
    Effect.tryPromise({
      try: () => fetch(url).then((res) => res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))),
      catch: (e) => createNetworkError(e, url, `Request failed`),
    })
  export const ensureVibeDirectory = (projectPath: string) =>
    pipe(
      Effect.sync(() => resolve(projectPath, '.vibe')),
      Effect.flatMap((vibePath) =>
        Effect.tryPromise({
          try: () => Deno.stat(vibePath).then((s) => s.isDirectory ? vibePath : Promise.reject()),
          catch: (e) => createFileSystemError(e, vibePath, '.vibe directory not found. Run `vibe init` first.'),
        })
      ),
    )
}

// =================================================================
// 5. SERVICE LAYER (The Engine's Public API)
// =================================================================

export namespace SearchService {
  const index = new Map<string, { content: string; type: string; title: string }>()
  export const indexDocument = (doc: { id: string; content: string; type: string; title: string }) =>
    Effect.sync(() => {
      index.set(doc.id, doc)
    })
  export const searchDocuments = (query: { query: string; type?: string[] }) =>
    Effect.sync(() => {
      const results: SearchResult[] = []
      const queryLower = query.query.toLowerCase()
      for (const [id, doc] of index.entries()) {
        if (doc.content.toLowerCase().includes(queryLower) && (!query.type || query.type.includes(doc.type))) {
          results.push({ id, title: doc.title, summary: doc.content.slice(0, 100) + '...', type: doc.type, score: 0.9 })
        }
      }
      return results
    })
}

export namespace VibeEngine {
  const TOOL_CONFIGS = {
    cursor: { tool: 'cursor', name: 'Cursor', detection: { files: ['.cursorrules'] } },
    claude: { tool: 'claude', name: 'Claude', detection: { files: ['.claude/commands.md'] } },
  }

  // --- Foundational Services ---
  export const initializeProject = (projectPath: string, options: { force?: boolean }) =>
    pipe(
      Effect.log(`Initializing vibe in ${projectPath}`),
      Effect.flatMap(() => Lib.writeTextFile(resolve(projectPath, '.vibe', 'config.json'), '{"status":"ok"}')),
      Effect.tap(() => triggerDiscovery(resolve(projectPath, '.vibe')).pipe(Effect.forkDaemon)), // Fork discovery to run in background
    )

  export const getProjectStatus = (vibePath: string) =>
    pipe(
      Effect.all({
        detectedTools: pipe(
          Effect.all(
            Object.values(TOOL_CONFIGS).map((config) =>
              pipe(
                Lib.fileExists(resolve(vibePath, '../', config.detection.files[0])),
                Effect.map((exists) => exists ? { name: config.name, confidence: 0.9 } : null),
              )
            ),
          ),
          Effect.map((results) => results.filter((x): x is { name: string; confidence: number } => x !== null)),
        ),
        ruleCount: Lib.readTextFile(resolve(vibePath, 'rules.json')).pipe(
          Effect.map((c) => JSON.parse(c).length),
          Effect.orElse(() => Effect.succeed(0)),
        ),
        memoryCount: Effect.succeed(0), // Placeholder
        diaryCount: Effect.succeed(0), // Placeholder
      }),
      Effect.map((status) => ({
        projectName: dirname(vibePath).split('/').pop() ?? 'Unknown',
        projectPath: dirname(vibePath),
        ...status,
      })),
    )

  export const syncProject = (vibePath: string) =>
    pipe(
      Lib.writeTextFile(resolve(vibePath, '../', '.cursorrules'), `// Synced at ${new Date().toISOString()}`),
      Effect.map(() => ({ syncedFiles: ['.cursorrules'] })),
    )

  // --- Discovery Service ---
  export const triggerDiscovery = (vibePath: string) =>
    pipe(
      Effect.log(`[Discovery] Starting for ${vibePath}`),
      Lib.loadJson(z.object({ dependencies: z.record(z.string()).optional() }))(
        resolve(vibePath, '../', 'package.json'),
      ),
      Effect.flatMap((pkg) =>
        Effect.forEach(Object.keys(pkg.dependencies ?? {}), discoverDependency, { concurrency: 4 })
      ),
      Effect.tap(() => Effect.log(`[Discovery] Completed for ${vibePath}`)),
      Effect.catchAll((error) => Effect.log(`[Discovery] Failed: ${error.message}`)),
    )

  const discoverDependency = (depName: string) =>
    pipe(
      Effect.log(`[Discovery] Discovering: ${depName}`),
      Lib.makeHttpRequest(`https://registry.npmjs.org/${depName}/latest`),
      Effect.flatMap((pkgInfo) =>
        pipe(
          (pkgInfo as any).readme ?? Effect.fail(createDiscoveryError(null, 'No README found')),
          Effect.flatMap((readme) => generateRulesFromReadme(depName, readme)),
          Effect.tap((rules) =>
            Lib.writeTextFile(resolve(Deno.cwd(), '.vibe/dependencies', `${depName}.json`), JSON.stringify(rules))
          ),
          Effect.catchAll(() => Effect.log(`[Discovery] No rules generated for ${depName}`)),
        )
      ),
    )

  const generateRulesFromReadme = (name: string, readme: string) =>
    pipe(
      Effect.tryPromise({
        try: () =>
          generateObject({
            model: openai('gpt-4o-mini'),
            prompt:
              `Based on this README for "${name}", generate a single, concise rule for an AI assistant on its primary usage pattern:\n\n${
                readme.slice(0, 4000)
              }`,
            schema: z.object({ rule: z.string() }),
          }),
        catch: (e) => createDiscoveryError(e, `AI inference failed for ${name}`),
      }),
      Effect.map(
        (result) => [{
          id: crypto.randomUUID(),
          metadata: { name: `Usage pattern for ${name}` },
          content: result.object.rule,
        }],
      ),
    )

  // --- Search, Memory, & Diary Services ---
  export const searchDocuments = (query: { query: string; type?: string[] }) => SearchService.searchDocuments(query)
  export const searchMemories = (query: { query: string }) =>
    SearchService.searchDocuments({ ...query, type: ['memory'] })
  export const listMemories = (vibePath: string) => Effect.succeed<Memory[]>([])
  export const getDiaryTimeline = (vibePath: string) => Effect.succeed<DiaryEntry[]>([])
  export const addMemory = (vibePath: string, data: { content: string; type: string }) =>
    pipe(
      Effect.sync(() => ({ id: crypto.randomUUID(), ...data })),
      Effect.flatMap((mem) =>
        pipe(
          Lib.writeTextFile(resolve(vibePath, 'memory', `${mem.id}.json`), JSON.stringify(mem)),
          Effect.flatMap(() => SearchService.indexDocument({ ...mem, title: mem.content.slice(0, 30) })),
          Effect.map(() => ({ id: mem.id })),
        )
      ),
    )
  export const addDiaryEntry = (vibePath: string, data: { title: string; content: string }) =>
    pipe(
      Effect.sync(() => ({ id: crypto.randomUUID(), ...data })),
      Effect.flatMap((entry) =>
        pipe(
          Lib.writeTextFile(resolve(vibePath, 'diary', `${entry.id}.json`), JSON.stringify(entry)),
          Effect.flatMap(() => SearchService.indexDocument({ ...entry, type: 'diary' })),
          Effect.map(() => ({ id: entry.id })),
        )
      ),
    )

  // --- Daemon Management ---
  export const manageDaemon = (options: { action: 'start' | 'stop' | 'status' }) =>
    Effect.sync(() => {
      // This function would interact with the OS process manager.
      // For this implementation, it logs actions and returns mock status.
      console.log(`[DaemonControl] Action: ${options.action}`)
      if (options.action === 'status') {
        return {
          isRunning: true,
          version: '2.0.0',
          pid: Deno.pid,
          uptime: '1h',
          projectsWatched: 1,
          ports: { http: 4242, mcp: 4243 },
        }
      }
    })
}

// =================================================================
// 6. DAEMON (HTTP Server)
// =================================================================

const app = new Hono()
app.use('*', logger())
app.use('/api/*', cors())

app.get(
  '/api/status',
  (c) =>
    pipe(
      VibeEngine.getProjectStatus(resolve(Deno.cwd(), '.vibe')),
      Effect.map((s) => c.json(s)),
      Effect.catchAll((e) => Effect.succeed(c.json({ error: e.message }, 500))),
      Effect.runPromise,
    ),
)
app.post(
  '/api/init',
  zValidator('json', z.object({ path: z.string() })),
  (c) =>
    pipe(
      VibeEngine.initializeProject(c.req.valid('json').path, {}),
      Effect.map(() => c.json({ success: true })),
      Effect.catchAll((e) => Effect.succeed(c.json({ error: e.message }, 500))),
      Effect.runPromise,
    ),
)
app.get(
  '/api/search',
  zValidator('query', SearchQuerySchema),
  (c) => pipe(VibeEngine.searchDocuments(c.req.valid('query')), Effect.map((res) => c.json(res)), Effect.runPromise),
)
app.post(
  '/api/memory',
  zValidator('json', MemoryInputSchema),
  (c) =>
    pipe(
      Lib.ensureVibeDirectory(Deno.cwd()),
      Effect.flatMap((path) => VibeEngine.addMemory(path, c.req.valid('json'))),
      Effect.map((res) => c.json(res, 201)),
      Effect.catchAll((e) => Effect.succeed(c.json({ error: e.message }, 500))),
      Effect.runPromise,
    ),
)
app.post(
  '/api/diary',
  zValidator('json', DiaryInputSchema),
  (c) =>
    pipe(
      Lib.ensureVibeDirectory(Deno.cwd()),
      Effect.flatMap((path) => VibeEngine.addDiaryEntry(path, c.req.valid('json'))),
      Effect.map((res) => c.json(res, 201)),
      Effect.catchAll((e) => Effect.succeed(c.json({ error: e.message }, 500))),
      Effect.runPromise,
    ),
)
app.get('/health', (c) => c.text('OK'))

// =================================================================
// 7. MAIN EXECUTION BLOCK
// =================================================================

if (import.meta.main) {
  const startTime = Date.now()
  console.log('🔥 \x1b[35mStarting Vibe Daemon Engine...\x1b[0m')

  // Handle graceful shutdown
  const shutdown = () => {
    console.log('\n🛑 \x1b[35mShutting down Vibe Daemon...\x1b[0m')
    Deno.exit(0)
  }
  Deno.addSignalListener('SIGINT', shutdown)
  Deno.addSignalListener('SIGTERM', shutdown)

  Deno.serve({
    port: 4242,
    onListen: ({ hostname, port }) => {
      console.log(`✅ \x1b[32mDaemon is alive and listening at\x1b[0m \x1b[36mhttp://${hostname}:${port}\x1b[0m`)
      console.log(`   \x1b[90m(Started in ${Date.now() - startTime}ms)\x1b[0m`)
    },
  }, app.fetch)
}
