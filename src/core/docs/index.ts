import { Effect, pipe } from 'effect'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { DependencyDiscoveryResult, DependencyManifest, DependencyDoc } from '../../schemas/dependency-doc.js'

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

const analyzePackageJson = (projectPath: string) =>
  pipe(
    Effect.tryPromise({
      try: () => readFile(resolve(projectPath, 'package.json'), 'utf-8'),
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
      hash: generateHash(JSON.stringify(pkg)),
    } satisfies DependencyManifest)),
    Effect.catchAll(() => Effect.succeed(null))
  )

const analyzeRequirementsTxt = (projectPath: string) =>
  pipe(
    Effect.tryPromise({
      try: () => readFile(resolve(projectPath, 'requirements.txt'), 'utf-8'),
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
        hash: generateHash(content),
      } satisfies DependencyManifest
    }),
    Effect.catchAll(() => Effect.succeed(null))
  )

const analyzeCargoToml = (projectPath: string) =>
  pipe(
    Effect.tryPromise({
      try: () => readFile(resolve(projectPath, 'Cargo.toml'), 'utf-8'),
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
        hash: generateHash(content),
      } satisfies DependencyManifest
    }),
    Effect.catchAll(() => Effect.succeed(null))
  )

const analyzeGoMod = (projectPath: string) =>
  pipe(
    Effect.tryPromise({
      try: () => readFile(resolve(projectPath, 'go.mod'), 'utf-8'),
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
        hash: generateHash(content),
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
          hash: generateHash(content),
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

const parseCargoToml = (content: string): Record<string, string> => {
  // Simplified TOML parsing - in production, use a proper TOML parser
  const dependencies: Record<string, string> = {}
  const lines = content.split('\n')
  let inDependencies = false
  
  for (const line of lines) {
    const trimmed = line.trim()
    
    if (trimmed === '[dependencies]') {
      inDependencies = true
      continue
    }
    
    if (trimmed.startsWith('[') && trimmed !== '[dependencies]') {
      inDependencies = false
      continue
    }
    
    if (inDependencies && trimmed.includes('=')) {
      const [name, version] = trimmed.split('=').map(s => s.trim().replace(/"/g, ''))
      if (name && version) {
        dependencies[name] = version
      }
    }
  }
  
  return dependencies
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

const generateHash = (content: string): string => {
  // Simple hash function - in production, use crypto.createHash
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return hash.toString(36)
}