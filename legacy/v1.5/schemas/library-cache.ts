/**
 * Library Cache Schema
 *
 * Zod schemas for library documentation cache in user projects
 * Defines the structure for .vibe/libraries/index.toml and docs/
 *
 * @tested_by tests/unit/library-cache.test.ts (Schema validation, type safety, TOML structure, helper functions)
 * @tested_by tests/integration/vibe-code.test.ts (Cache operations, domain discovery integration)
 * @tested_by tests/user/library-documentation.test.ts (End-to-end library documentation workflow)
 */

import { z } from 'zod/v4'

/**
 * Library metadata schema for cache index
 */
export const LibraryMetadataSchema = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
  domain: z.string().min(1), // Apex domain like "hono.dev", "effect.website"
  homepage: z.string().url().optional(),
  llms_txt_url: z.string().url().optional(),
  docs_file: z.string().min(1), // Path relative to .vibe/libraries/docs/{package}/README.md
  last_fetched: z.string().datetime().optional(),
  fetch_status: z.enum(['success', 'failed', 'pending', 'not_found']).default('pending'),
  registry: z.enum(['npm', 'jsr', 'deno']),
  // Future expansion fields for Phase 2
  capabilities: z.array(z.string()).default([]), // e.g., ["route", "middleware", "validation"]
  extraction_confidence: z.enum(['none', 'low', 'medium', 'high']).default('none'),
})

/**
 * Library cache index file schema (.vibe/libraries/index.toml)
 */
export const LibraryCacheIndexSchema = z.object({
  meta: z.object({
    version: z.string().default('1.0.0'),
    last_scan: z.string().datetime(),
    library_count: z.number().int().min(0),
    docs_found: z.number().int().min(0),
    // Future fields for capability extraction
    extraction_enabled: z.boolean().default(false),
  }),
  libraries: z.record(z.string(), LibraryMetadataSchema),
  // Future field for Phase 2: version mappings like zod -> zod/v4
  mappings: z.record(z.string(), z.string()).default({}),
})

/**
 * Package manifest detection result (adapted from legacy)
 */
export const ProjectManifestSchema = z.object({
  type: z.enum(['package.json', 'deno.json']),
  path: z.string(),
  dependencies: z.record(z.string(), z.string()), // name -> version
  devDependencies: z.record(z.string(), z.string()).default({}),
  // Extended fields for comprehensive dependency tracking
  peerDependencies: z.record(z.string(), z.string()).optional(),
  optionalDependencies: z.record(z.string(), z.string()).optional(),
  // For Deno imports, track original specs for registry detection
  originalSpecs: z.record(z.string(), z.string()).optional(),
})

/**
 * Package registry API response schemas
 */
export const NpmPackageInfoSchema = z.object({
  name: z.string(),
  'dist-tags': z.object({
    latest: z.string(),
  }),
  description: z.string().optional(),
  homepage: z.string().url().optional(),
  repository: z.union([
    z.string(),
    z.object({
      type: z.string(),
      url: z.string(),
    }),
  ]).optional(),
  versions: z.record(z.string(), z.any()).optional(),
})

export const JsrPackageInfoSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  homepage: z.string().url().optional(),
  githubRepository: z.object({
    owner: z.string(),
    name: z.string(),
  }).optional(),
  latestVersion: z.string(),
})

export type LibraryMetadata = z.output<typeof LibraryMetadataSchema>
export type LibraryCacheIndex = z.output<typeof LibraryCacheIndexSchema>
export type ProjectManifest = z.output<typeof ProjectManifestSchema>
export type NpmPackageInfo = z.output<typeof NpmPackageInfoSchema>
export type JsrPackageInfo = z.output<typeof JsrPackageInfoSchema>

/**
 * Helper function to create new library metadata
 */
export const createLibraryMetadata = (
  name: string,
  version: string,
  domain: string,
  registry: 'npm' | 'jsr' | 'deno',
  docsFile: string,
  options: Partial<LibraryMetadata> = {},
): LibraryMetadata => ({
  name,
  version,
  domain,
  registry,
  docs_file: docsFile,
  fetch_status: 'pending',
  capabilities: [],
  extraction_confidence: 'none',
  ...options,
})

/**
 * Helper function to create empty library cache index
 */
export const createEmptyLibraryCacheIndex = (): LibraryCacheIndex => ({
  meta: {
    version: '1.0.0',
    last_scan: new Date().toISOString(),
    library_count: 0,
    docs_found: 0,
    extraction_enabled: false,
  },
  libraries: {},
  mappings: {},
})

/**
 * Extract apex domain from URL
 */
export const extractApexDomain = (url: string): string => {
  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname

    // Remove www. prefix if present
    if (hostname.startsWith('www.')) {
      return hostname.substring(4)
    }

    return hostname
  } catch {
    // If URL parsing fails, return the input as-is
    return url
  }
}

/**
 * Common patterns for discovering library websites from package info
 */
export const discoverLibraryDomain = (packageInfo: NpmPackageInfo | JsrPackageInfo): string | null => {
  // Try homepage first
  if ('homepage' in packageInfo && packageInfo.homepage) {
    return extractApexDomain(packageInfo.homepage)
  }

  // Try repository URL
  if ('repository' in packageInfo && packageInfo.repository) {
    const repoUrl = typeof packageInfo.repository === 'string' ? packageInfo.repository : packageInfo.repository.url

    // Convert GitHub repo URLs to potential project sites
    if (repoUrl.includes('github.com')) {
      const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/)
      if (match && match[1] && match[2]) {
        const [, owner, repo] = match
        const cleanRepo = repo.replace(/\.git$/, '')

        // Common patterns for project websites
        const possibleDomains = [
          `${cleanRepo}.dev`,
          `${cleanRepo}.js.org`,
          `${owner}.github.io/${cleanRepo}`,
          `${cleanRepo}.vercel.app`,
        ]

        // For now, return the first possibility
        // TODO: In future phases, we could check which ones actually exist
        return possibleDomains[0] || null
      }
    }
  }

  // For JSR packages, try JSR-specific patterns
  if ('githubRepository' in packageInfo && packageInfo.githubRepository) {
    const { owner, name } = packageInfo.githubRepository
    return `${name}.dev` // Common pattern for modern JS libraries
  }

  return null
}
