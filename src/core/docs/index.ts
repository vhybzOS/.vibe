import { Effect, pipe } from 'effect'
import { DependencyDiscoveryResult, DependencyManifest, DependencyDoc } from '../../schemas/dependency-doc.ts'
import { parse as parseToml } from '@ltd/j-toml'
import { resolve } from '@std/path'

/**
 * Discovers dependencies and their documentation from project manifests
 * 
 * @param projectPath - The path to the project to analyze
 * @param options - Configuration options for dependency discovery
 * @returns Effect that resolves to combined discovery results
 */
export const discoverDependencies = (
  projectPath: string,
  options: { forceRefresh: boolean }
) =>
  pipe(
    analyzeDependencyManifests(projectPath),
    Effect.flatMap(manifests => 
      Effect.all(
        manifests.map(manifest => 
          discoverDependencyDocs(manifest, options)
        )
      )
    ),
    Effect.map(results => combineDiscoveryResults(results))
  )

const analyzeDependencyManifests = (projectPath: string) =>
  pipe(
    Effect.all([
      analyzePackageJson(projectPath),
      analyzeRequirementsTxt(projectPath),
      analyzeCargoToml(projectPath),
      analyzeGoMod(projectPath),
    ]),
    Effect.map(manifests => manifests.filter(Boolean) as DependencyManifest[])
  )

/**
 * Analyzes package.json for Node.js dependencies
 * 
 * @param projectPath - The project path to search
 * @returns Effect that resolves to DependencyManifest or null if not found
 */
const analyzePackageJson = (projectPath: string) =>
  pipe(
    Effect.tryPromise({
      try: () => Deno.readTextFile(resolve(projectPath, 'package.json')),
      catch: () => new Error('No package.json found'),
    }),
    Effect.flatMap(content => 
      Effect.try({
        try: () => JSON.parse(content),
        catch: () => new Error('Invalid package.json'),
      })
    ),
    Effect.map(pkg => ({
      type: 'package.json' as const,
      path: resolve(projectPath, 'package.json'),
      dependencies: pkg.dependencies || {},
      devDependencies: pkg.devDependencies || {},
      peerDependencies: pkg.peerDependencies || {},
      lastModified: new Date().toISOString(),
      hash: generateHashSync(JSON.stringify(pkg)),
    } satisfies DependencyManifest)),
    Effect.catchAll(() => Effect.succeed(null))
  )

/**
 * Analyzes requirements.txt for Python dependencies
 * 
 * @param projectPath - The project path to search
 * @returns Effect that resolves to DependencyManifest or null if not found
 */
const analyzeRequirementsTxt = (projectPath: string) =>
  pipe(
    Effect.tryPromise({
      try: () => Deno.readTextFile(resolve(projectPath, 'requirements.txt')),
      catch: () => new Error('No requirements.txt found'),
    }),
    Effect.map(content => {
      const dependencies = parsePythonRequirements(content)
      return {
        type: 'requirements.txt' as const,
        path: resolve(projectPath, 'requirements.txt'),
        dependencies,
        devDependencies: {},
        peerDependencies: {},
        lastModified: new Date().toISOString(),
        hash: generateHashSync(content),
      } satisfies DependencyManifest
    }),
    Effect.catchAll(() => Effect.succeed(null))
  )

/**
 * Analyzes Cargo.toml for Rust dependencies using proper TOML parser
 * 
 * @param projectPath - The project path to search
 * @returns Effect that resolves to DependencyManifest or null if not found
 */
const analyzeCargoToml = (projectPath: string) =>
  pipe(
    Effect.tryPromise({
      try: () => Deno.readTextFile(resolve(projectPath, 'Cargo.toml')),
      catch: () => new Error('No Cargo.toml found'),
    }),
    Effect.map(content => {
      const dependencies = parseCargoToml(content)
      return {
        type: 'Cargo.toml' as const,
        path: resolve(projectPath, 'Cargo.toml'),
        dependencies,
        devDependencies: {},
        peerDependencies: {},
        lastModified: new Date().toISOString(),
        hash: generateHashSync(content),
      } satisfies DependencyManifest
    }),
    Effect.catchAll(() => Effect.succeed(null))
  )

/**
 * Analyzes go.mod for Go dependencies
 * 
 * @param projectPath - The project path to search
 * @returns Effect that resolves to DependencyManifest or null if not found
 */
const analyzeGoMod = (projectPath: string) =>
  pipe(
    Effect.tryPromise({
      try: () => Deno.readTextFile(resolve(projectPath, 'go.mod')),
      catch: () => new Error('No go.mod found'),
    }),
    Effect.map(content => {
      const dependencies = parseGoMod(content)
      return {
        type: 'go.mod' as const,
        path: resolve(projectPath, 'go.mod'),
        dependencies,
        devDependencies: {},
        peerDependencies: {},
        lastModified: new Date().toISOString(),
        hash: generateHashSync(content),
      } satisfies DependencyManifest
    }),
    Effect.catchAll(() => Effect.succeed(null))
  )

const discoverDependencyDocs = (
  manifest: DependencyManifest,
  options: { forceRefresh: boolean }
) =>
  pipe(
    Effect.all(
      Object.keys(manifest.dependencies).map(packageName => 
        discoverPackageDocs(packageName, manifest.dependencies[packageName], manifest.type)
      )
    ),
    Effect.map(discovered => ({
      manifest,
      discovered: discovered.filter(Boolean) as DependencyDoc[],
      failed: [], // TODO: Track failed discoveries
      statistics: {
        totalDependencies: Object.keys(manifest.dependencies).length,
        successfulDiscoveries: discovered.filter(Boolean).length,
        failedDiscoveries: discovered.filter(d => !d).length,
        duplicatePackages: 0,
        processingTime: 0,
      },
      timestamp: new Date().toISOString(),
    } satisfies DependencyDiscoveryResult))
  )

const discoverPackageDocs = (
  packageName: string,
  version: string,
  manifestType: string
) =>
  pipe(
    Effect.all([
      tryFetchDocumentation(`https://registry.npmjs.org/${packageName}`),
      tryFetchDocumentation(`https://${packageName}.dev/llms.txt`),
      tryFetchDocumentation(`https://docs.${packageName}.dev/llms.txt`),
    ]),
    Effect.map(([registry, direct, docs]) => {
      const documentation = [registry, direct, docs].filter(Boolean)
      
      if (documentation.length === 0) return null
      
      return {
        package: {
          name: packageName,
          version,
          registry: inferRegistry(manifestType),
          homepage: extractHomepage(registry),
        },
        documentation,
        discoveryMetadata: {
          discoveredAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
          updateFrequency: 'weekly',
          discoveryMethod: 'url-pattern',
          failedAttempts: [],
        },
        apiPatterns: [],
        generatedRules: [],
        integrationNotes: {
          commonUseCases: [],
          bestPractices: [],
          knownIssues: [],
          alternatives: [],
        },
      } satisfies DependencyDoc
    }),
    Effect.catchAll(() => Effect.succeed(null))
  )

const tryFetchDocumentation = (url: string) =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        const response = await fetch(url)
        if (!response.ok) return null
        
        const content = await response.text()
        return {
          url,
          type: 'llms-txt' as const,
          content,
          contentType: response.headers.get('content-type') || 'text/plain',
          lastFetched: new Date().toISOString(),
          etag: response.headers.get('etag') || undefined,
          size: content.length,
          hash: generateHashSync(content),
        }
      },
      catch: () => new Error(`Failed to fetch ${url}`),
    }),
    Effect.catchAll(() => Effect.succeed(null))
  )

const combineDiscoveryResults = (results: DependencyDiscoveryResult[]) => ({
  results,
  summary: {
    totalManifests: results.length,
    totalDependencies: results.reduce((sum, r) => sum + r.statistics.totalDependencies, 0),
    totalDiscovered: results.reduce((sum, r) => sum + r.statistics.successfulDiscoveries, 0),
    totalFailed: results.reduce((sum, r) => sum + r.statistics.failedDiscoveries, 0),
  },
  timestamp: new Date().toISOString(),
})

// Helper functions
const parsePythonRequirements = (content: string): Record<string, string> => {
  const dependencies: Record<string, string> = {}
  
  content.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const [name, version] = trimmed.split(/[=><~!]/)[0]?.split('==') || [trimmed, '*']
      if (name) {
        dependencies[name] = version || '*'
      }
    }
  })
  
  return dependencies
}

/**
 * Parses Cargo.toml using proper TOML parser to extract dependencies
 * 
 * @param content - The TOML file content
 * @returns Record of dependency names to versions
 */
const parseCargoToml = (content: string): Record<string, string> => {
  try {
    const parsed = parseToml(content) as any
    const dependencies: Record<string, string> = {}
    
    // Extract regular dependencies
    if (parsed.dependencies && typeof parsed.dependencies === 'object') {
      for (const [name, value] of Object.entries(parsed.dependencies)) {
        if (typeof value === 'string') {
          dependencies[name] = value
        } else if (typeof value === 'object' && value !== null && 'version' in value) {
          dependencies[name] = (value as any).version
        }
      }
    }
    
    return dependencies
  } catch (error) {
    console.warn(`Failed to parse Cargo.toml: ${error}`)
    return {}
  }
}

const parseGoMod = (content: string): Record<string, string> => {
  const dependencies: Record<string, string> = {}
  const lines = content.split('\n')
  
  for (const line of lines) {
    const trimmed = line.trim()
    
    if (trimmed.startsWith('require ') || (trimmed.includes(' v') && !trimmed.startsWith('module'))) {
      const parts = trimmed.replace('require ', '').split(' ')
      if (parts.length >= 2) {
        const name = parts[0]
        const version = parts[1]
        dependencies[name] = version
      }
    }
  }
  
  return dependencies
}

const inferRegistry = (manifestType: string): any => {
  switch (manifestType) {
    case 'package.json': return 'npm'
    case 'requirements.txt': return 'pypi'
    case 'Cargo.toml': return 'crates'
    case 'go.mod': return 'go'
    default: return 'npm'
  }
}

const extractHomepage = (registryData: any): string | undefined => {
  // Extract homepage from registry metadata
  return registryData?.homepage
}

/**
 * Generates a SHA-256 hash of the given content using Web Crypto API
 * 
 * @param content - The content to hash
 * @returns Hex-encoded SHA-256 hash
 */
const generateHash = async (content: string): Promise<string> => {
  const encoder = new TextEncoder()
  const data = encoder.encode(content)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Synchronous hash generation for backwards compatibility
 * Falls back to simple hash when crypto operations can't be awaited
 * 
 * @param content - The content to hash
 * @returns Simple hash string
 */
const generateHashSync = (content: string): string => {
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return hash.toString(36)
}