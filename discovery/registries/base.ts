/**
 * Base registry fetcher interface for retrieving package metadata and rules
 * Supports extensible fetchers for different package registries (npm, PyPI, etc.)
 */

import { Effect } from 'effect'
import { createNetworkError, type VibeError } from '../../lib/errors.ts'

/**
 * Package metadata from a registry
 */
export interface PackageMetadata {
  name: string
  version: string
  description?: string
  homepage?: string
  repository?: {
    type: string
    url: string
  }
  license?: string
  keywords?: string[]
  maintainers?: Array<{
    name: string
    email?: string
  }>
  dependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  engines?: Record<string, string>
  publishedAt: string
  popularity?: {
    downloads: number
    stars: number
    forks?: number
  }
  framework?: string
  category?: string
}

/**
 * Discovered rule from package metadata
 */
export interface DiscoveredRule {
  id: string
  name: string
  description: string
  confidence: number
  source: 'registry' | 'repository' | 'inference'
  packageName: string
  packageVersion: string
  framework?: string | undefined
  category: string
  content: {
    markdown: string
    examples: Array<{
      title: string
      code: string
      language: string
    }>
    tags: string[]
  }
  targeting: {
    languages: string[]
    frameworks: string[]
    files: string[]
    contexts: string[]
  }
  discoveredAt: string
}

/**
 * Registry fetcher result
 */
export interface RegistryFetchResult {
  package: PackageMetadata
  rules: DiscoveredRule[]
  rawData: Record<string, unknown>
  fetchedAt: string
  cacheKey: string
}

/**
 * Base interface for registry fetchers
 */
export interface RegistryFetcher {
  readonly name: string
  readonly supportedPackageTypes: readonly string[]
  readonly baseUrl: string
  
  /**
   * Check if this fetcher can handle the given package
   */
  canFetch(packageName: string, packageType: string): boolean
  
  /**
   * Fetch package metadata from the registry
   */
  fetchPackageMetadata(packageName: string, version?: string): Effect.Effect<PackageMetadata, VibeError>
  
  /**
   * Discover rules from package metadata and repository
   */
  discoverRules(packageMetadata: PackageMetadata): Effect.Effect<DiscoveredRule[], VibeError>
  
  /**
   * Get the cache key for a package
   */
  getCacheKey(packageName: string, version: string): string
}

/**
 * Registry state for registry fetchers (functional)
 */
export interface RegistryFetcherRegistryState {
  readonly fetchers: ReadonlyMap<string, RegistryFetcher>
}

/**
 * Creates an empty registry fetcher registry state
 */
export const createRegistryFetcherRegistry = (): RegistryFetcherRegistryState => ({
  fetchers: new Map<string, RegistryFetcher>()
})

/**
 * Registers a fetcher in the registry state
 */
export const registerFetcher = (
  state: RegistryFetcherRegistryState, 
  fetcher: RegistryFetcher
): RegistryFetcherRegistryState => ({
  fetchers: new Map(state.fetchers).set(fetcher.name, fetcher)
})

/**
 * Gets a fetcher by name from the registry state
 */
export const getFetcher = (
  state: RegistryFetcherRegistryState, 
  name: string
): RegistryFetcher | undefined => {
  return state.fetchers.get(name)
}

/**
 * Gets all fetchers from the registry state
 */
export const getAllFetchers = (state: RegistryFetcherRegistryState): RegistryFetcher[] => {
  return Array.from(state.fetchers.values())
}

/**
 * Gets the appropriate fetcher for a package
 */
export const getFetcherForPackage = (
  state: RegistryFetcherRegistryState, 
  packageName: string, 
  packageType: string
): RegistryFetcher | undefined => {
  for (const fetcher of state.fetchers.values()) {
    if (fetcher.canFetch(packageName, packageType)) {
      return fetcher
    }
  }
  return undefined
}

/**
 * Utility functions for registry operations
 */
export const makeHttpRequest = (url: string, options: RequestInit = {}) =>
  Effect.tryPromise({
    try: async () => {
      const response = await fetch(url, {
        ...options,
        headers: {
          'User-Agent': 'vibe-discovery/1.0.0',
          'Accept': 'application/json',
          ...options.headers,
        },
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      return response.json()
    },
    catch: (error) => createNetworkError(
      error,
      `HTTP request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      url
    ),
  })

/**
 * Extract GitHub repository info from various URL formats
 */
export const extractGitHubRepo = (repoUrl?: string | { type: string; url: string }): string | null => {
  if (!repoUrl) return null
  
  const url = typeof repoUrl === 'string' ? repoUrl : repoUrl.url
  
  // Handle various GitHub URL formats
  const githubRegex = /github\.com[\/:]([^\/]+)\/([^\/\s#]+)/i
  const match = url.match(githubRegex)
  
  if (match) {
    const [, owner, repo] = match
    if (owner && repo) {
      return `${owner}/${repo.replace(/\.git$/, '')}`
    }
  }
  
  return null
}

/**
 * Infer framework from package name and metadata
 */
export const inferFramework = (packageName: string, metadata: PackageMetadata): string | undefined => {
  const name = packageName.toLowerCase()
  const keywords = (metadata.keywords || []).map(k => k.toLowerCase())
  const description = (metadata.description || '').toLowerCase()
  
  // React ecosystem
  if (name.includes('react') || keywords.includes('react') || description.includes('react')) {
    return 'react'
  }
  
  // Vue ecosystem
  if (name.includes('vue') || keywords.includes('vue') || description.includes('vue')) {
    return 'vue'
  }
  
  // Angular ecosystem
  if (name.includes('angular') || keywords.includes('angular') || description.includes('angular')) {
    return 'angular'
  }
  
  // Next.js
  if (name.includes('next') || keywords.includes('nextjs') || description.includes('next.js')) {
    return 'nextjs'
  }
  
  // Express
  if (name.includes('express') || keywords.includes('express') || description.includes('express')) {
    return 'express'
  }
  
  // Testing frameworks
  if (keywords.includes('testing') || keywords.includes('jest') || keywords.includes('mocha')) {
    return 'testing'
  }
  
  return undefined
}

/**
 * Create a default global registry instance
 */
export const globalRegistryFetcher = createRegistryFetcherRegistry()