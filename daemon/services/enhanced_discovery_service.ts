/**
 * Enhanced Autonomous Discovery Service
 * Implements direct discovery and AI inference for dependency rules
 */

import { Effect, pipe } from 'effect'
import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod/v4'
import { resolve } from '@std/path'
import { match } from 'ts-pattern'
import { VibeError, ensureDir, writeTextFile } from '../../lib/effects.ts'
import { 
  PackageMetadata, 
  DiscoveredRule, 
  makeHttpRequest, 
  extractGitHubRepo 
} from '../../discovery/registries/base.ts'
import { UniversalRuleSchema } from '../../schemas/universal-rule.ts'
import { getSecret } from './secrets_service.ts'

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
  provider: 'openai' | 'anthropic'
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
const discoverFromRepository = (metadata: PackageMetadata) =>
  pipe(
    Effect.sync(() => extractGitHubRepo(metadata.repository)),
    Effect.flatMap(githubRepo => {
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
        getSecret('github'),
        Effect.flatMap(githubToken => {
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
            checkRepositoryForRules(githubRepo, githubToken),
            Effect.map(rules => ({
              method: 'direct' as const,
              source: 'repository' as const,
              url: `https://github.com/${githubRepo}`,
              rules,
              success: rules.length > 0,
            })),
            Effect.catchAll(error => 
              Effect.succeed({
                method: 'direct' as const,
                source: 'repository' as const,
                url: `https://github.com/${githubRepo}`,
                rules: [],
                success: false,
                error: error instanceof Error ? error.message : String(error),
              })
            )
          )
        })
      )
    })
  )

/**
 * Attempts direct discovery from package homepage
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
    Effect.flatMap(initial => {
      if (!initial.success && initial.error) {
        return Effect.succeed(initial)
      }
      
      return pipe(
        fetchLlmsTxt(initial.url),
        Effect.map(llmsContent => ({
          ...initial,
          rules: llmsContent ? [createLlmsTxtRule(metadata, llmsContent, initial.url)] : [],
          success: !!llmsContent,
        })),
        Effect.catchAll(error => 
          Effect.succeed({
            ...initial,
            error: error instanceof Error ? error.message : String(error),
          })
        )
      )
    })
  )

/**
 * Checks GitHub repository for .vibe or .cursorrules files
 */
const checkRepositoryForRules = (githubRepo: string, token: string) =>
  pipe(
    Effect.all([
      // Check for .vibe directory
      makeHttpRequest(`https://api.github.com/repos/${githubRepo}/contents/.vibe`, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }).pipe(
        Effect.catchAll(() => Effect.succeed(null))
      ),
      
      // Check for .cursorrules file
      makeHttpRequest(`https://api.github.com/repos/${githubRepo}/contents/.cursorrules`, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }).pipe(
        Effect.catchAll(() => Effect.succeed(null))
      ),
    ]),
    Effect.flatMap(([vibeDir, cursorrules]) => {
      const rules: DiscoveredRule[] = []
      
      // Parse .vibe directory contents
      const vibeEffect = vibeDir ? parseVibeDirectory(githubRepo, token, vibeDir) : Effect.succeed([])
      
      // Parse .cursorrules file content
      const cursorruleEffect = cursorrules ? parseCursorrules(githubRepo, token, cursorrules) : Effect.succeed([])
      
      return pipe(
        Effect.all([vibeEffect, cursorruleEffect]),
        Effect.map(([vibeRules, cursorruleRules]) => [...vibeRules, ...cursorruleRules])
      )
    })
  )

/**
 * Parses .vibe directory contents from GitHub API response
 */
const parseVibeDirectory = (githubRepo: string, token: string, vibeDir: any) =>
  pipe(
    Effect.sync(() => {
      if (!Array.isArray(vibeDir)) {
        return []
      }
      
      // Find JSON files in .vibe directory
      const jsonFiles = vibeDir.filter((item: any) => 
        item.type === 'file' && item.name.endsWith('.json')
      )
      
      return jsonFiles
    }),
    Effect.flatMap(jsonFiles => 
      Effect.all(
        jsonFiles.map((file: any) =>
          pipe(
            makeHttpRequest(file.download_url, {
              headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
              },
            }),
            Effect.flatMap(content => {
              try {
                const rules = JSON.parse(typeof content === 'string' ? content : JSON.stringify(content))
                if (Array.isArray(rules)) {
                  return Effect.succeed(rules.map((rule: any) => convertUniversalRuleToDiscovered(rule, {
                    name: githubRepo.split('/')[1] || 'unknown',
                    version: 'latest',
                    description: 'Repository rules from .vibe directory',
                  })))
                }
                return Effect.succeed([])
              } catch {
                return Effect.succeed([])
              }
            }),
            Effect.catchAll(() => Effect.succeed([]))
          )
        )
      )
    ),
    Effect.map(results => results.flat())
  )

/**
 * Parses .cursorrules file content from GitHub API response
 */
const parseCursorrules = (githubRepo: string, token: string, cursorrules: any) =>
  pipe(
    Effect.sync(() => cursorrules.download_url),
    Effect.flatMap(downloadUrl =>
      makeHttpRequest(downloadUrl, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      })
    ),
    Effect.flatMap(content => {
      try {
        const contentStr = typeof content === 'string' ? content : JSON.stringify(content)
        // Import parseToolConfig function
        return pipe(
          Effect.tryPromise(async () => {
            const { parseToolConfig } = await import('../../tools/parsers.ts')
            return parseToolConfig('cursor', contentStr)
          }),
          Effect.map(rules => rules.map(rule => convertUniversalRuleToDiscovered(rule, {
            name: githubRepo.split('/')[1] || 'unknown',
            version: 'latest',
            description: 'Repository rules from .cursorrules',
          }))),
          Effect.catchAll(() => Effect.succeed([
            createRepositoryRule(githubRepo, 'Found .cursorrules file but failed to parse')
          ]))
        )
      } catch {
        return Effect.succeed([
          createRepositoryRule(githubRepo, 'Found .cursorrules file but failed to parse')
        ])
      }
    }),
    Effect.catchAll(() => Effect.succeed([]))
  )

/**
 * Fetches llms.txt from a URL
 */
const fetchLlmsTxt = (url: string) =>
  pipe(
    makeHttpRequest(url),
    Effect.map(response => {
      if (typeof response === 'string') {
        return response
      }
      return null
    }),
    Effect.catchAll(() => Effect.succeed(null))
  )

/**
 * Creates a rule from llms.txt content
 */
const createLlmsTxtRule = (metadata: PackageMetadata, content: string, url: string): DiscoveredRule => ({
  id: `llms-txt-${metadata.name}-${crypto.randomUUID()}`,
  name: `${metadata.name} LLM Documentation`,
  description: `Official LLM-optimized documentation for ${metadata.name}`,
  confidence: 0.9,
  source: 'repository',
  packageName: metadata.name,
  packageVersion: metadata.version,
  category: 'documentation',
  content: {
    markdown: `# ${metadata.name} LLM Documentation

## Source
${url}

## Content
${content}`,
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
 * Creates a rule from repository discovery
 */
const createRepositoryRule = (githubRepo: string, description: string): DiscoveredRule => ({
  id: `repo-${githubRepo.replace('/', '-')}-${crypto.randomUUID()}`,
  name: `Repository Configuration`,
  description,
  confidence: 0.7,
  source: 'repository',
  packageName: githubRepo.split('/')[1] || 'unknown',
  packageVersion: 'latest',
  category: 'configuration',
  content: {
    markdown: `# Repository Configuration

## Repository
https://github.com/${githubRepo}

## Description
${description}`,
    examples: [],
    tags: ['repository', 'configuration'],
  },
  targeting: {
    languages: ['javascript', 'typescript'],
    frameworks: [],
    files: [],
    contexts: ['development'],
  },
  discoveredAt: new Date().toISOString(),
})

/**
 * Performs AI inference to generate rules
 */
const performInference = (metadata: PackageMetadata) =>
  pipe(
    getSecret('openai'),
    Effect.flatMap(openaiKey => {
      if (!openaiKey) {
        return Effect.succeed({
          method: 'inference' as const,
          provider: 'openai' as const,
          model: 'gpt-4o-mini',
          rules: [],
          success: false,
          error: 'No OpenAI API key configured',
        })
      }
      
      return pipe(
        fetchReadmeContent(metadata),
        Effect.flatMap(readmeContent => 
          generateRulesWithAI(metadata, readmeContent, openaiKey)
        ),
        Effect.catchAll(error => 
          Effect.succeed({
            method: 'inference' as const,
            provider: 'openai' as const,
            model: 'gpt-4o-mini',
            rules: [],
            success: false,
            error: error instanceof Error ? error.message : String(error),
          })
        )
      )
    })
  )

/**
 * Fetches README content from GitHub
 */
const fetchReadmeContent = (metadata: PackageMetadata) =>
  pipe(
    Effect.sync(() => extractGitHubRepo(metadata.repository)),
    Effect.flatMap(githubRepo => {
      if (!githubRepo) {
        return Effect.succeed('')
      }
      
      return pipe(
        makeHttpRequest(`https://api.github.com/repos/${githubRepo}/readme`, {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
          },
        }),
        Effect.map((response: any) => {
          if (response.content && response.encoding === 'base64') {
            return atob(response.content)
          }
          return ''
        }),
        Effect.catchAll(() => Effect.succeed(''))
      )
    })
  )

/**
 * Generates rules using AI
 */
const generateRulesWithAI = (metadata: PackageMetadata, readmeContent: string, apiKey: string) =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        const prompt = `You are an expert software developer creating a set of rules for an AI pair programmer. 

Based on the following documentation for the '${metadata.name}' library, generate an array of 3-5 high-quality UniversalRule objects in valid JSON format.

## Package Information
- Name: ${metadata.name}
- Version: ${metadata.version}
- Description: ${metadata.description || 'No description available'}
- Homepage: ${metadata.homepage || 'No homepage available'}

## README Content
${readmeContent.slice(0, 8000)} // Truncate to avoid token limits

## Instructions
Create rules that provide:
1. Installation and setup guidance
2. Best practices for using this library
3. Common patterns and examples
4. Integration tips with other tools
5. Performance considerations if applicable

Each rule should be practical, actionable, and specific to this library. Focus on real-world usage scenarios.`

        const model = openai('gpt-4o-mini', { apiKey })
        
        const result = await generateObject({
          model,
          prompt,
          schema: z.array(UniversalRuleSchema),
        })

        return {
          method: 'inference' as const,
          provider: 'openai' as const,
          model: 'gpt-4o-mini',
          rules: (result.object as any[]).map((rule: any) => convertUniversalRuleToDiscovered(rule, metadata)),
          success: true,
          usage: {
            promptTokens: result.usage?.promptTokens || 0,
            completionTokens: result.usage?.completionTokens || 0,
            totalTokens: result.usage?.totalTokens || 0,
          },
        }
      },
      catch: (error) => new Error(`AI inference failed: ${error instanceof Error ? error.message : String(error)}`),
    })
  )

/**
 * Converts a UniversalRule to a DiscoveredRule for consistency
 */
const convertUniversalRuleToDiscovered = (rule: any, metadata: PackageMetadata): DiscoveredRule => ({
  id: rule.id,
  name: rule.metadata.name,
  description: rule.metadata.description,
  confidence: rule.metadata.confidence || 0.8,
  source: 'inference',
  packageName: metadata.name,
  packageVersion: metadata.version,
  category: 'ai-generated',
  content: {
    markdown: rule.content.markdown,
    examples: rule.content.examples || [],
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
export const enhancedDiscoverRules = (metadata: PackageMetadata) =>
  pipe(
    Effect.log(`🔍 Starting enhanced discovery for ${metadata.name}`),
    
    // Try direct discovery methods
    Effect.flatMap(() => 
      Effect.all([
        discoverFromRepository(metadata),
        discoverFromHomepage(metadata),
      ])
    ),
    
    Effect.flatMap(([repoResult, homepageResult]) => {
      const directRules = [
        ...repoResult.rules,
        ...homepageResult.rules,
      ]
      
      // If we found rules via direct discovery, use them
      if (directRules.length > 0) {
        return Effect.succeed({
          method: 'direct' as const,
          results: [repoResult, homepageResult],
          rules: directRules,
          success: true,
        })
      }
      
      // Otherwise, try AI inference
      return pipe(
        performInference(metadata),
        Effect.map(inferenceResult => ({
          method: 'inference' as const,
          results: [repoResult, homepageResult, inferenceResult],
          rules: inferenceResult.rules,
          success: inferenceResult.success,
        }))
      )
    }),
    
    Effect.tap(result => 
      Effect.log(`📋 Enhanced discovery completed for ${metadata.name}: ${result.rules.length} rules found via ${result.method}`)
    )
  )

/**
 * Caches enhanced discovery results
 */
export const cacheEnhancedResults = (
  metadata: PackageMetadata, 
  results: EnhancedDiscoveryResult[], 
  projectPath: string
) =>
  pipe(
    Effect.sync(() => resolve(projectPath, '.vibe', 'dependencies', metadata.name, metadata.version)),
    Effect.flatMap(cacheDir => ensureDir(cacheDir)),
    Effect.flatMap(() => {
      const cacheDir = resolve(projectPath, '.vibe', 'dependencies', metadata.name, metadata.version)
      
      return Effect.all([
        // Cache discovery results
        writeTextFile(
          resolve(cacheDir, 'discovery-results.json'),
          JSON.stringify(results, null, 2)
        ),
        
        // Cache metadata
        writeTextFile(
          resolve(cacheDir, 'metadata.json'),
          JSON.stringify(metadata, null, 2)
        ),
        
        // Cache timestamp
        writeTextFile(
          resolve(cacheDir, 'cached-at.txt'),
          new Date().toISOString()
        ),
      ])
    }),
    Effect.tap(() => 
      Effect.log(`💾 Cached enhanced discovery results for ${metadata.name}@${metadata.version}`)
    )
  )