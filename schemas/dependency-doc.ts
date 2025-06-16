import { z } from 'zod/v4'

export const PackageRegistrySchema = z.enum([
  'npm',
  'pypi',
  'crates',
  'go',
  'rubygems',
  'maven',
  'nuget',
  'composer',
  'packagist',
  'hex',
  'pub',
  'cocoapods',
  'carthage',
  'swift',
])

export const PackageInfoSchema = z.object({
  name: z.string(),
  version: z.string(),
  registry: PackageRegistrySchema,
  homepage: z.string().url().optional(),
  repository: z.string().url().optional(),
  documentation: z.string().url().optional(),
  license: z.string().optional(),
  description: z.string().optional(),
})

export const DocumentationSourceSchema = z.object({
  url: z.string().url(),
  type: z.enum(['llms-txt', 'readme', 'docs', 'api-reference', 'examples']),
  content: z.string(),
  contentType: z.string().default('text/markdown'),
  lastFetched: z.string().datetime(),
  etag: z.string().optional(),
  size: z.number(),
  hash: z.string(),
})

export const APIPatternSchema = z.object({
  pattern: z.string(),
  description: z.string(),
  category: z.enum([
    'initialization',
    'configuration',
    'method-call',
    'event-handling',
    'error-handling',
    'lifecycle',
  ]),
  examples: z.array(z.object({
    code: z.string(),
    language: z.string(),
    context: z.string().optional(),
  })),
  confidence: z.number().min(0).max(1).default(1.0),
})

export const DependencyDocSchema = z.object({
  package: PackageInfoSchema,
  documentation: z.array(DocumentationSourceSchema),
  discoveryMetadata: z.object({
    discoveredAt: z.string().datetime(),
    lastUpdated: z.string().datetime(),
    updateFrequency: z.enum(['never', 'daily', 'weekly', 'monthly']).default('weekly'),
    discoveryMethod: z.enum(['url-pattern', 'registry-metadata', 'manual', 'recommendation']),
    failedAttempts: z.array(z.object({
      url: z.string().url(),
      error: z.string(),
      timestamp: z.string().datetime(),
    })).default([]),
  }),
  apiPatterns: z.array(APIPatternSchema).default([]),
  generatedRules: z.array(z.string()).default([]), // Rule IDs
  integrationNotes: z.object({
    commonUseCases: z.array(z.string()).default([]),
    bestPractices: z.array(z.string()).default([]),
    knownIssues: z.array(z.string()).default([]),
    alternatives: z.array(z.string()).default([]),
  }),
})

export const DependencyManifestSchema = z.object({
  type: z.enum([
    'package.json',
    'requirements.txt',
    'Cargo.toml',
    'go.mod',
    'Gemfile',
    'composer.json',
    'pom.xml',
    'build.gradle',
    'pubspec.yaml',
    'mix.exs',
    'Podfile',
  ]),
  path: z.string(),
  dependencies: z.record(z.string(), z.string()), // name -> version
  devDependencies: z.record(z.string(), z.string()).default({}),
  peerDependencies: z.record(z.string(), z.string()).default({}),
  lastModified: z.string().datetime(),
  hash: z.string(),
})

export const DependencyDiscoveryResultSchema = z.object({
  manifest: DependencyManifestSchema,
  discovered: z.array(DependencyDocSchema),
  failed: z.array(z.object({
    packageName: z.string(),
    error: z.string(),
    attempts: z.number(),
  })),
  statistics: z.object({
    totalDependencies: z.number(),
    successfulDiscoveries: z.number(),
    failedDiscoveries: z.number(),
    duplicatePackages: z.number(),
    processingTime: z.number(), // milliseconds
  }),
  timestamp: z.string().datetime(),
})

export type DependencyDoc = z.output<typeof DependencyDocSchema>
export type PackageInfo = z.output<typeof PackageInfoSchema>
export type DocumentationSource = z.output<typeof DocumentationSourceSchema>
export type APIPattern = z.output<typeof APIPatternSchema>
export type DependencyManifest = z.output<typeof DependencyManifestSchema>
export type DependencyDiscoveryResult = z.output<typeof DependencyDiscoveryResultSchema>
export type PackageRegistry = z.output<typeof PackageRegistrySchema>
