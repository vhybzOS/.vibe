/**
 * Enhanced Autonomous Discovery Service
 * Implements direct discovery and AI inference for dependency rules
 */

import { Effect, pipe } from 'effect'
import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { anthropic } from '@ai-sdk/anthropic'
import { google } from '@ai-sdk/google'
import { cohere } from '@ai-sdk/cohere'
import { z } from 'zod/v4'
import { resolve } from '@std/path'

/**
 * GitHub API response types
 */
interface GitHubFileItem {
  type: 'file' | 'dir'
  name: string
  download_url?: string
  content?: string
}

interface GitHubContentResponse {
  content?: string
  encoding?: string
}

interface DiscoveryResult {
  success: boolean
  rules: DiscoveredRule[]
  metadata?: PackageMetadata
  method: 'repository' | 'homepage' | 'inference'
  source?: string
}
import { ensureDir, VibeError, writeTextFile } from '../../lib/effects.ts'
import { createNetworkError } from '../../lib/errors.ts'
import { DiscoveredRule, extractGitHubRepo, makeHttpRequest, PackageMetadata } from '../../discovery/registries/base.ts'
import { UniversalRule, UniversalRuleSchema } from '../../schemas/universal-rule.ts'
import { getSecret, type SecretProvider } from './secrets_service.ts'
import { parseToolConfig } from '../../tools/parsers.ts'

/**
 * Discovery methods for finding rules
 */
export type DiscoveryMethod = 'direct' | 'inference'

/**
 * Direct discovery result
 */
export interface DirectDiscoveryResult {
  method: 'direct'
  source: 'repository' | 'homepage'
  url: string
  rules: DiscoveredRule[]
  success: boolean
  error?: string
}

/**
 * AI inference result
 */
export interface InferenceResult {
  method: 'inference'
  provider: SecretProvider
  model: string
  rules: DiscoveredRule[]
  success: boolean
  error?: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

/**
 * Enhanced discovery result
 */
export type EnhancedDiscoveryResult = DirectDiscoveryResult | InferenceResult

/**
 * Extracts the apex domain from a URL
 */
const extractApexDomain = (url: string): string | null => {
  try {
    const parsed = new URL(url)
    const parts = parsed.hostname.split('.')
    if (parts.length >= 2) {
      return `${parts[parts.length - 2]}.${parts[parts.length - 1]}`
    }
    return parsed.hostname
  } catch {
    return null
  }
}

/**
 * Attempts direct discovery from package repository
 */
const discoverFromRepository = (metadata: PackageMetadata, projectPath: string) =>
  pipe(
    Effect.sync(() => extractGitHubRepo(metadata.repository)),
    Effect.flatMap((githubRepo) => {
      if (!githubRepo) {
        return Effect.succeed({
          method: 'direct' as const,
          source: 'repository' as const,
          url: '',
          rules: [],
          success: false,
          error: 'No GitHub repository found',
        })
      }

      return pipe(
        getSecret('github', projectPath),
        Effect.flatMap((githubToken) => {
          if (!githubToken) {
            return Effect.succeed({
              method: 'direct' as const,
              source: 'repository' as const,
              url: `https://github.com/${githubRepo}`,
              rules: [],
              success: false,
              error: 'No GitHub token configured',
            })
          }

          return pipe(
            checkRepositoryForRules(githubRepo, githubToken, metadata),
            Effect.map((rules) => ({
              method: 'direct' as const,
              source: 'repository' as const,
              url: `https://github.com/${githubRepo}`,
              rules,
              success: rules.length > 0,
            })),
            Effect.catchAll((error: unknown) =>
              Effect.succeed({
                method: 'direct' as const,
                source: 'repository' as const,
                url: `https://github.com/${githubRepo}`,
                rules: [],
                success: false,
                error: error instanceof Error ? error.message : 'An unknown error occurred',
              })
            ),
          )
        }),
      )
    }),
  )

/**
 * Attempts direct discovery from package homepage by fetching llms.txt
 */
const discoverFromHomepage = (metadata: PackageMetadata) =>
  pipe(
    Effect.sync(() => {
      if (!metadata.homepage) {
        return {
          method: 'direct' as const,
          source: 'homepage' as const,
          url: '',
          rules: [],
          success: false,
          error: 'No homepage URL found',
        }
      }

      const apexDomain = extractApexDomain(metadata.homepage)
      if (!apexDomain) {
        return {
          method: 'direct' as const,
          source: 'homepage' as const,
          url: metadata.homepage,
          rules: [],
          success: false,
          error: 'Could not extract apex domain from homepage',
        }
      }

      return {
        method: 'direct' as const,
        source: 'homepage' as const,
        url: `https://${apexDomain}/llms.txt`,
        rules: [],
        success: false,
      }
    }),
    Effect.flatMap((initial) => {
      if (!initial.success && initial.error) {
        return Effect.succeed(initial)
      }

      return pipe(
        fetchLlmsTxt(initial.url),
        Effect.map((llmsContent) => ({
          ...initial,
          rules: llmsContent ? [createLlmsTxtRule(metadata, llmsContent, initial.url)] : [],
          success: !!llmsContent,
        })),
        Effect.catchAll((error: unknown) =>
          Effect.succeed({
            ...initial,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        ),
      )
    }),
  )

/**
 * Checks GitHub repository for .vibe or .cursorrules files
 */
const checkRepositoryForRules = (githubRepo: string, token: string, metadata: PackageMetadata) =>
  pipe(
    Effect.all([
      makeHttpRequest(`https://api.github.com/repos/${githubRepo}/contents/.vibe`, {
        headers: { Authorization: `token ${token}` },
      }).pipe(Effect.catchAll(() => Effect.succeed(null))),

      makeHttpRequest(`https://api.github.com/repos/${githubRepo}/contents/.cursorrules`, {
        headers: { Authorization: `token ${token}` },
      }).pipe(Effect.catchAll(() => Effect.succeed(null))),
    ]),
    Effect.flatMap(([vibeDir, cursorrules]) => {
      const vibeEffect = vibeDir ? parseVibeDirectory(githubRepo, token, vibeDir, metadata) : Effect.succeed([])
      const cursorruleEffect = cursorrules
        ? parseCursorrules(githubRepo, token, cursorrules, metadata)
        : Effect.succeed([])

      return pipe(
        Effect.all([vibeEffect, cursorruleEffect]),
        Effect.map(([vibeRules, cursorruleRules]) => [...vibeRules, ...cursorruleRules]),
      )
    }),
  )

/**
 * Parses .vibe directory contents from GitHub API response
 */
const parseVibeDirectory = (
  githubRepo: string,
  token: string,
  vibeDir: GitHubFileItem[],
  metadata: PackageMetadata,
) =>
  pipe(
    Effect.sync(() => {
      if (!Array.isArray(vibeDir)) return []
      return vibeDir.filter(
        (item) => item.type === 'file' && item.name.endsWith('.json') && item.download_url,
      )
    }),
    Effect.flatMap((jsonFiles) =>
      Effect.all(
        jsonFiles.map((file) =>
          pipe(
            makeHttpRequest(file.download_url, {}), // download_url is unauthenticated
            Effect.flatMap((content) =>
              Effect.try({
                try: () => UniversalRuleSchema.array().parse(content),
                catch: () => [] as UniversalRule[],
              })
            ),
            Effect.map((rules) => rules.map((rule) => convertUniversalRuleToDiscovered(rule, metadata, 'repository'))),
            Effect.catchAll(() => Effect.succeed([] as DiscoveredRule[])),
          )
        ),
        { concurrency: 3 },
      )
    ),
    Effect.map((results) => results.flat()),
  )

/**
 * Parses .cursorrules file content from GitHub API response
 */
const parseCursorrules = (
  githubRepo: string,
  token: string,
  cursorrules: GitHubContentResponse,
  metadata: PackageMetadata,
) =>
  pipe(
    Effect.succeed(cursorrules?.content),
    Effect.flatMap((base64Content) => {
      if (!base64Content) return Effect.succeed('')
      return Effect.try({
        try: () => atob(base64Content),
        catch: () => '',
      })
    }),
    Effect.flatMap((contentStr) => {
      if (!contentStr) return Effect.succeed([])
      return pipe(
        parseToolConfig('cursor', contentStr),
        Effect.map((rules) => rules.map((rule) => convertUniversalRuleToDiscovered(rule, metadata, 'repository'))),
        Effect.catchAll(() => Effect.succeed([] as DiscoveredRule[])),
      )
    }),
  )

/**
 * Fetches llms.txt from a URL
 */
const fetchLlmsTxt = (url: string) =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        const response = await fetch(url, {
          headers: { 'User-Agent': 'vibe-discovery/1.0.0', Accept: 'text/plain' },
          signal: AbortSignal.timeout(5000),
        })
        if (!response.ok) return null
        return await response.text()
      },
      catch: (error) => createNetworkError(error, `llms.txt fetch failed for ${url}`, url),
    }),
    Effect.catchAll(() => Effect.succeed(null)),
  )

/**
 * Creates a rule from llms.txt content
 */
const createLlmsTxtRule = (
  metadata: PackageMetadata,
  content: string,
  url: string,
): DiscoveredRule => ({
  id: `llms-txt-${metadata.name}-${crypto.randomUUID()}`,
  name: `${metadata.name} LLM Documentation`,
  description: `Official LLM-optimized documentation for ${metadata.name} from its homepage.`,
  confidence: 0.9,
  source: 'repository',
  packageName: metadata.name,
  packageVersion: metadata.version,
  category: 'documentation',
  content: {
    markdown: `# ${metadata.name} LLM Documentation\n\n**Source:** ${url}\n\n---\n\n${content}`,
    examples: [],
    tags: ['documentation', 'llms.txt', metadata.name],
  },
  targeting: {
    languages: ['javascript', 'typescript'],
    frameworks: metadata.framework ? [metadata.framework] : [],
    files: [],
    contexts: ['development'],
  },
  discoveredAt: new Date().toISOString(),
})

/**
 * Performs AI inference to generate rules, trying available providers in sequence.
 */
const performInference = (metadata: PackageMetadata, projectPath: string) => {
  const tryProvider = (
    provider: SecretProvider,
    modelGenerator: (
      key: string,
    ) => ReturnType<typeof openai> | ReturnType<typeof anthropic> | ReturnType<typeof google>,
    modelName: string,
  ) =>
    pipe(
      getSecret(provider, projectPath),
      Effect.flatMap((apiKey) => {
        if (!apiKey) {
          return Effect.fail(new Error(`No ${provider} key`))
        }
        return pipe(
          fetchReadmeContent(metadata),
          Effect.flatMap((readmeContent) =>
            generateRulesWithAI(
              metadata,
              readmeContent,
              apiKey,
              modelGenerator(apiKey),
              modelName,
              provider,
            )
          ),
        )
      }),
    )

  return pipe(
    tryProvider('openai', (apiKey) => {
      Deno.env.set('OPENAI_API_KEY', apiKey)
      return openai('gpt-4o-mini')
    }, 'gpt-4o-mini'),
    Effect.orElse(() =>
      tryProvider('anthropic', (apiKey) => {
        Deno.env.set('ANTHROPIC_API_KEY', apiKey)
        return anthropic('claude-3-haiku-20240307')
      }, 'claude-3-haiku')
    ),
    Effect.orElse(() =>
      tryProvider('google', (apiKey) => {
        Deno.env.set('GOOGLE_GENERATIVE_AI_API_KEY', apiKey)
        return google('models/gemini-1.5-flash-latest')
      }, 'gemini-1.5-flash')
    ),
    Effect.orElse(() =>
      tryProvider('cohere', (apiKey) => {
        Deno.env.set('COHERE_API_KEY', apiKey)
        return cohere('command-r')
      }, 'command-r')
    ),
    Effect.catchAll(() =>
      Effect.succeed({
        method: 'inference' as const,
        provider: 'none' as SecretProvider,
        model: 'none',
        rules: [],
        success: false,
        error: 'No suitable AI provider API key is configured. Please set one in the dashboard.',
      })
    ),
  )
}

/**
 * Fetches README content from GitHub
 */
const fetchReadmeContent = (metadata: PackageMetadata) =>
  pipe(
    Effect.sync(() => extractGitHubRepo(metadata.repository)),
    Effect.flatMap((githubRepo) => {
      if (!githubRepo) return Effect.succeed('')
      return pipe(
        makeHttpRequest(`https://api.github.com/repos/${githubRepo}/readme`),
        Effect.map((
          response: GitHubContentResponse,
        ) => (response.content ? atob(response.content) : '')),
        Effect.catchAll(() => Effect.succeed('')),
      )
    }),
  )

/**
 * Generates rules using AI with Vercel AI SDK
 */
const generateRulesWithAI = (
  metadata: PackageMetadata,
  readmeContent: string,
  apiKey: string,
  model: ReturnType<typeof openai> | ReturnType<typeof anthropic> | ReturnType<typeof google>,
  modelName: string,
  provider: SecretProvider,
) =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        const prompt =
          `You are an expert-level software developer and technical writer tasked with creating a set of rules for an AI pair programming assistant. Your goal is to provide high-quality, actionable guidance for using a specific software library.

You must generate a valid JSON array of 'UniversalRule' objects based on the provided package information and its README.

**Package Information:**
- **Name:** ${metadata.name}
- **Version:** ${metadata.version}
- **Description:** ${metadata.description || 'No description available'}
- **Homepage:** ${metadata.homepage || 'No homepage available'}

**README Content:**
\`\`\`
${readmeContent.slice(0, 8000)}
\`\`\`

**Instructions:**

1.  **Analyze:** Carefully read the package information and README to understand the library's purpose, key features, and primary use cases.
2.  **Generate Rules:** Create an array of 3 to 5 \`UniversalRule\` objects. Each rule should cover a distinct, important aspect of the library.
3.  **Rule Content:**
    *   **Best Practices:** What are the recommended ways to use the library?
    *   **Common Patterns:** Provide clear examples for common tasks.
    *   **Installation & Setup:** Guide the user on how to get started.
    *   **Integration:** How does it work with other tools or frameworks (e.g., React, Express, etc.)?
    *   **Pitfalls:** What are common mistakes to avoid?
4.  **Format:** The output MUST be a valid JSON array conforming to the provided Zod schema for \`UniversalRule\`. Do not include any text or explanations outside of the JSON array.

**Structural Guide (Inspired by good LLM documentation):**

Good rules are structured like mini-documentation pages. Use Markdown effectively. For example:

\`\`\`markdown
# Main Topic (e.g., Using Hooks)

A brief explanation of the concept.

## Key Sub-topic (e.g., \`useExampleHook\`)

Description of the sub-topic.

### Usage
\`\`\`typescript
// A clear, concise code example
const value = useExampleHook();
\`\`\`

### Best Practices
- Guideline 1
- Guideline 2
\`\`\`

---

Now, generate the JSON array of UniversalRule objects for the '${metadata.name}' library.`

        const { object, usage } = await generateObject({
          model,
          prompt,
          schema: z.array(UniversalRuleSchema),
        })

        return {
          method: 'inference' as const,
          provider: provider,
          model: modelName,
          rules: (object as UniversalRule[]).map((rule) =>
            convertUniversalRuleToDiscovered(rule, metadata, 'inference')
          ),
          success: true,
          usage: {
            promptTokens: usage.promptTokens,
            completionTokens: usage.completionTokens,
            totalTokens: usage.totalTokens,
          },
        }
      },
      catch: (error) => new Error(`AI inference failed: ${error instanceof Error ? error.message : String(error)}`),
    }),
  )

/**
 * Converts a UniversalRule to a DiscoveredRule for consistency
 */
const convertUniversalRuleToDiscovered = (
  rule: UniversalRule,
  metadata: PackageMetadata,
  source: 'inference' | 'repository',
): DiscoveredRule => ({
  id: rule.id || crypto.randomUUID(),
  name: rule.metadata.name,
  description: rule.metadata.description,
  confidence: rule.metadata.confidence || (source === 'repository' ? 0.95 : 0.8),
  source: source,
  packageName: metadata.name,
  packageVersion: metadata.version,
  framework: metadata.framework,
  category: source === 'repository' ? 'configuration' : 'ai-generated',
  content: {
    markdown: rule.content.markdown,
    examples: (rule.content.examples || []).map((ex) => ({
      title: ex.description || 'Code Example',
      code: ex.code,
      language: ex.language,
    })),
    tags: rule.content.tags || [],
  },
  targeting: {
    languages: rule.targeting.languages || ['javascript', 'typescript'],
    frameworks: rule.targeting.frameworks || [],
    files: rule.targeting.files || [],
    contexts: rule.targeting.contexts || ['development'],
  },
  discoveredAt: new Date().toISOString(),
})

/**
 * Enhanced discovery function that tries direct discovery first, then inference
 */
export const enhancedDiscoverRules = (metadata: PackageMetadata, projectPath: string) =>
  pipe(
    Effect.log(`🔍 Starting enhanced discovery for ${metadata.name} in project ${projectPath}`),
    Effect.flatMap(() =>
      Effect.all([
        discoverFromRepository(metadata, projectPath),
        discoverFromHomepage(metadata),
      ])
    ),
    Effect.flatMap(([repoResult, homepageResult]: [DiscoveryResult, DiscoveryResult]) => {
      const directRules = [...repoResult.rules, ...homepageResult.rules]
      const anyDirectSuccess = repoResult.success || homepageResult.success

      if (anyDirectSuccess || directRules.length > 0) {
        return Effect.succeed({
          method: 'direct' as const,
          results: [repoResult, homepageResult],
          rules: directRules,
          success: true,
        })
      }

      return pipe(
        performInference(metadata, projectPath),
        Effect.map((inferenceResult) => ({
          method: 'inference' as const,
          results: [repoResult, homepageResult, inferenceResult],
          rules: inferenceResult.rules,
          success: inferenceResult.success,
        })),
      )
    }),
    Effect.tap((result: { method: string; results: DiscoveryResult[]; rules: DiscoveredRule[] }) =>
      Effect.log(
        `📋 Enhanced discovery for ${metadata.name}: ${result.rules.length} rules found via ${result.method}`,
      )
    ),
  )

/**
 * Caches enhanced discovery results
 */
export const cacheEnhancedResults = (
  metadata: PackageMetadata,
  results: EnhancedDiscoveryResult[],
  projectPath: string,
) =>
  pipe(
    Effect.sync(() => resolve(projectPath, '.vibe', 'dependencies', metadata.name, metadata.version)),
    Effect.flatMap((cacheDir) =>
      pipe(
        ensureDir(cacheDir),
        Effect.flatMap(() =>
          Effect.all([
            writeTextFile(
              resolve(cacheDir, 'discovery-results.json'),
              JSON.stringify(results, null, 2),
            ),
            writeTextFile(resolve(cacheDir, 'metadata.json'), JSON.stringify(metadata, null, 2)),
            writeTextFile(resolve(cacheDir, 'cached-at.txt'), new Date().toISOString()),
          ])
        ),
      )
    ),
    Effect.tap(() => Effect.log(`💾 Cached enhanced discovery results for ${metadata.name}@${metadata.version}`)),
  )
