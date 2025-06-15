import { Effect, pipe } from 'effect'
import { resolve } from '@std/path'
import { detectAITools, importToolConfig } from '../../tools/index.ts'
import { saveRule } from '../../rules/index.ts'
import { VibeConfig, VibeConfigSchema } from '../../schemas/project.ts'
import { setSecret, setSecretAndInferProvider } from '../../daemon/services/secrets_service.ts'
import { readTextFile } from '../../lib/effects.ts'

export const initCommand = (
  projectPath: string,
  options: { force?: boolean; mcp?: boolean }
) =>
  pipe(
    checkExistingVibe(projectPath, options.force || false),
    Effect.flatMap(() => createVibeDirectory(projectPath)),
    Effect.flatMap(() => detectAndImportExistingConfigs(projectPath)),
    Effect.flatMap(() => createDefaultConfig(projectPath)),
    Effect.flatMap(() => createInitialDirectories(projectPath)),
    Effect.flatMap(() => bootstrapProjectSecrets(projectPath)),
    Effect.tap(() => Effect.log('✅ .vibe initialized successfully!')),
    Effect.tap(() => Effect.log('📚 Run `dotvibe status` to see detected AI tools')),
    Effect.tap(() => Effect.log('🚀 Run `dotvibe mcp-server` to start the MCP server'))
  )

const checkExistingVibe = (projectPath: string, force: boolean) =>
  pipe(
    Effect.tryPromise({
      try: () => Deno.stat(resolve(projectPath, '.vibe')),
      catch: () => new Error('No existing .vibe directory'),
    }),
    Effect.flatMap(() => 
      force 
        ? Effect.log('🔄 Overwriting existing .vibe directory...')
        : Effect.fail(new Error('.vibe directory already exists. Use --force to overwrite.'))
    ),
    Effect.catchAll(() => Effect.succeed(undefined)) // No existing directory is fine
  )

const createVibeDirectory = (projectPath: string) =>
  pipe(
    Effect.tryPromise({
      try: () => Deno.mkdir(resolve(projectPath, '.vibe'), { recursive: true }),
      catch: () => new Error('Failed to create .vibe directory'),
    }),
    Effect.tap(() => Effect.log('📁 Created .vibe directory'))
  )

const detectAndImportExistingConfigs = (projectPath: string) =>
  pipe(
    detectAITools(projectPath),
    Effect.tap(tools => 
      tools.length > 0 
        ? Effect.log(`🔍 Detected ${tools.length} AI tool(s): ${tools.map(t => t.tool).join(', ')}`)
        : Effect.log('ℹ️  No existing AI tool configurations detected')
    ),
    Effect.flatMap(tools => 
      Effect.all(
        tools.map(tool => 
          importExistingToolConfig(projectPath, tool.tool)
        )
      )
    ),
    Effect.map(imported => imported.filter(Boolean))
  )

const importExistingToolConfig = (projectPath: string, tool: string) =>
  pipe(
    // Try to find and import existing config files
    Effect.succeed(null), // Simplified - would actually import real configs
    Effect.catchAll(() => Effect.succeed(null))
  )

const createDefaultConfig = (projectPath: string) =>
  pipe(
    Effect.sync(() => generateDefaultConfig(projectPath)),
    Effect.flatMap(config => 
      Effect.tryPromise({
        try: () => Deno.writeTextFile(
          resolve(projectPath, '.vibe', 'config.json'),
          JSON.stringify(config, null, 2)
        ),
        catch: () => new Error('Failed to write config file'),
      })
    ),
    Effect.tap(() => Effect.log('⚙️  Created default configuration'))
  )

const createInitialDirectories = (projectPath: string) =>
  pipe(
    Effect.all([
      createDirectory(projectPath, '.vibe/rules'),
      createDirectory(projectPath, '.vibe/docs'),
      createDirectory(projectPath, '.vibe/memory'),
      createDirectory(projectPath, '.vibe/diary'),
      createDirectory(projectPath, '.vibe/dependencies'),
    ]),
    Effect.tap(() => Effect.log('📂 Created directory structure'))
  )

const createDirectory = (projectPath: string, dirPath: string) =>
  Effect.tryPromise({
    try: () => Deno.mkdir(resolve(projectPath, dirPath), { recursive: true }),
    catch: () => new Error(`Failed to create directory: ${dirPath}`),
  })

const bootstrapProjectSecrets = (projectPath: string) => {
  const ENV_MAPPING: Record<string, 'llm' | 'github'> = {
    'OPENAI_API_KEY': 'llm', 'ANTHROPIC_API_KEY': 'llm', 'GOOGLE_API_KEY': 'llm', 'COHERE_API_KEY': 'llm',
    'GITHUB_TOKEN': 'github'
  };

  return pipe(
    readTextFile(resolve(projectPath, '.env')),
    Effect.map(content => {
      const secretsToSet: Effect.Effect<void, Error | any>[] = [];
      for (const line of content.split('\n')) {
        if (!line.trim() || line.startsWith('#') || !line.includes('=')) continue;
        const [key, ...valueParts] = line.split('=');
        const value = valueParts.join('=').trim().replace(/^['"]|['"]$/g, '');
        if (ENV_MAPPING[key] === 'llm' && value) {
          secretsToSet.push(setSecretAndInferProvider(value, projectPath));
        } else if (ENV_MAPPING[key] === 'github' && value) {
          secretsToSet.push(setSecret('github', value, projectPath));
        }
      }
      return secretsToSet;
    }),
    Effect.flatMap(effects => Effect.all(effects, { discard: true, concurrency: 'unbounded' })),
    Effect.tap(() => Effect.log('✨ Bootstrapped secrets from project .env file into ./.vibe/secrets.json')),
    Effect.catchAll(() => Effect.succeed(void 0)) // Gracefully ignore if .env doesn't exist or fails to parse
  );
};

const generateDefaultConfig = (projectPath: string): VibeConfig => ({
  project: {
    name: projectPath.split('/').pop() || 'unnamed-project',
    description: 'Auto-generated project configuration',
    type: 'web-app',
    languages: ['typescript'],
    frameworks: [],
    structure: {
      rootPath: projectPath,
      gitRepository: true, // Assume git repo
      packageManagers: ['npm'],
      buildTools: [],
      testFrameworks: [],
      linters: [],
      formatters: [],
      directories: {
        source: ['src'],
        tests: ['test', 'tests'],
        docs: ['docs'],
        config: ['config', '.config'],
        assets: ['assets', 'public'],
      },
    },
    detectedTools: [],
    activeTools: [],
    preferences: {
      documentationLevel: 'standard',
    },
    metadata: {
      created: new Date().toISOString(),
      lastAnalyzed: new Date().toISOString(),
      version: '1.0.0',
      vibeVersion: '1.0.0',
      configPath: resolve(projectPath, '.vibe'),
    },
  },
  settings: {
    autoSync: true,
    watchFiles: true,
    generateDocs: true,
    captureDecisions: true,
    discoverDependencies: true,
    mcpServer: {
      enabled: true,
      port: 3000,
      host: 'localhost',
    },
  },
  paths: {
    rules: 'rules',
    docs: 'docs',
    memory: 'memory',
    diary: 'diary',
    dependencies: 'dependencies',
    config: 'config',
  },
  integrations: {},
})