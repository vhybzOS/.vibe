/**
 * Dependency Index Schema
 *
 * Zod schemas for TOML dependency indexes in user projects
 * Defines the structure for .vibe/dependencies/index.toml
 *
 * @tested_by tests/unit/dependency-index.test.ts (Schema validation, type safety, URL patterns)
 * @tested_by tests/integration/dependency-fetcher.test.ts (Fetching and storage, manifest parsing)
 * @tested_by tests/user/vibe-code.test.ts (End-to-end dependency resolution workflow)
 */

import { z } from 'zod/v4'

/**
 * Package registry types
 */
export const PackageRegistrySchema = z.enum([
  'npm',
  'pypi',
  'crates',
  'go',
  'rubygems',
  'maven',
  'nuget',
  'composer',
  'hex',
  'pub',
  'deno',
])

/**
 * Dependency metadata schema for index
 */
export const DependencyMetadataSchema = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
  registry: PackageRegistrySchema,
  homepage: z.string().url().optional(),
  docs_file: z.string().min(1), // Path to .md file with llms.txt content
  llms_txt_url: z.string().url().optional(),
  last_fetched: z.string().datetime().optional(),
  fetch_status: z.enum(['success', 'failed', 'pending']).default('pending'),
  rules_generated: z.array(z.string()).default([]), // Rule IDs generated from this dependency
  extraction_level: z.enum(['basic', 'fine_grained']).default('basic'), // For future P1 feature
})

/**
 * Dependency index file schema
 */
export const DependencyIndexSchema = z.object({
  meta: z.object({
    version: z.string().default('1.0.0'),
    last_scan: z.string().datetime(),
    dependency_count: z.number().int().min(0),
    llms_docs_found: z.number().int().min(0),
    extraction_enabled: z.boolean().default(false), // For future P1 feature
  }),
  dependencies: z.record(z.string(), DependencyMetadataSchema),
})

/**
 * Dependency manifest detection result
 */
export const ManifestSchema = z.object({
  type: z.enum([
    'package.json',
    'deno.json',
    'requirements.txt',
    'Cargo.toml',
    'go.mod',
    'Gemfile',
    'composer.json',
    'pom.xml',
    'pubspec.yaml',
  ]),
  path: z.string(),
  dependencies: z.record(z.string(), z.string()), // name -> version
  devDependencies: z.record(z.string(), z.string()).default({}),
})

export type DependencyMetadata = z.output<typeof DependencyMetadataSchema>
export type DependencyIndex = z.output<typeof DependencyIndexSchema>
export type Manifest = z.output<typeof ManifestSchema>
export type PackageRegistry = z.output<typeof PackageRegistrySchema>

/**
 * Helper function to create new dependency metadata
 */
export const createDependencyMetadata = (
  name: string,
  version: string,
  registry: PackageRegistry,
  docsFile: string,
  options: Partial<DependencyMetadata> = {},
): DependencyMetadata => ({
  name,
  version,
  registry,
  docs_file: docsFile,
  fetch_status: 'pending',
  rules_generated: [],
  extraction_level: 'basic',
  ...options,
})

/**
 * Helper function to create empty dependency index
 */
export const createEmptyDependencyIndex = (): DependencyIndex => ({
  meta: {
    version: '1.0.0',
    last_scan: new Date().toISOString(),
    dependency_count: 0,
    llms_docs_found: 0,
    extraction_enabled: false,
  },
  dependencies: {},
})

/**
 * Common llms.txt URL patterns for popular registries
 */
export const LLMS_TXT_PATTERNS: Record<PackageRegistry, (name: string) => string[]> = {
  npm: (name) => [
    `https://www.npmjs.com/package/${name}/llms.txt`,
    `https://${name}.dev/llms.txt`,
    `https://${name}.js.org/llms.txt`,
  ],
  deno: (name) => [
    `https://deno.land/x/${name}/llms.txt`,
    `https://jsr.io/@${name.split('/')[0]}/${name.split('/')[1] || name}/llms.txt`,
  ],
  pypi: (name) => [
    `https://pypi.org/project/${name}/llms.txt`,
    `https://${name}.readthedocs.io/llms.txt`,
  ],
  crates: (name) => [
    `https://crates.io/crates/${name}/llms.txt`,
    `https://docs.rs/${name}/llms.txt`,
  ],
  go: (name) => [
    `https://pkg.go.dev/${name}/llms.txt`,
    `https://${name}/llms.txt`,
  ],
  rubygems: (name) => [
    `https://rubygems.org/gems/${name}/llms.txt`,
  ],
  maven: (name) => [
    `https://mvnrepository.com/artifact/${name}/llms.txt`,
  ],
  nuget: (name) => [
    `https://www.nuget.org/packages/${name}/llms.txt`,
  ],
  composer: (name) => [
    `https://packagist.org/packages/${name}/llms.txt`,
  ],
  hex: (name) => [
    `https://hex.pm/packages/${name}/llms.txt`,
  ],
  pub: (name) => [
    `https://pub.dev/packages/${name}/llms.txt`,
  ],
}
