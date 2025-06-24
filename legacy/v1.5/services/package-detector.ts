/**
 * Package Detector Service
 *
 * Detects and parses dependencies from package.json and deno.json manifests
 * Adapted from legacy/discovery/manifests/* patterns with Effect-TS
 *
 * @tested_by tests/unit/package-detector.test.ts (Manifest parsing, dependency extraction, project validation, multi-manifest handling)
 * @tested_by tests/integration/vibe-code.test.ts (Project dependency discovery, hybrid projects)
 * @tested_by tests/user/library-documentation.test.ts (End-to-end dependency detection in real projects)
 */

import { Effect, pipe } from 'effect'
import { resolve } from '@std/path'
import { z } from 'zod/v4'
import { fileExists, loadJson } from '../lib/fs.ts'
import { createParseError, type VibeError } from '../lib/errors.ts'
import { type ParsedPackageSpec, parsePackageSpec } from './registry-client.ts'
import { type ProjectManifest } from '../schemas/library-cache.ts'
import { extractDependenciesWithRuntime } from './runtime-detector.ts'

// Re-export for use in other services
export type { ProjectManifest }

/**
 * Package.json schema (subset we care about)
 */
const PackageJsonSchema = z.object({
  name: z.string().optional(),
  version: z.string().optional(),
  dependencies: z.record(z.string(), z.string()).default({}),
  devDependencies: z.record(z.string(), z.string()).default({}),
  peerDependencies: z.record(z.string(), z.string()).default({}),
  optionalDependencies: z.record(z.string(), z.string()).default({}),
})

/**
 * Deno.json schema (subset we care about)
 */
const DenoJsonSchema = z.object({
  name: z.string().optional(),
  version: z.string().optional(),
  imports: z.record(z.string(), z.string()).default({}),
  dependencies: z.record(z.string(), z.string()).default({}),
})

/**
 * Detected dependency with structured metadata
 */
export interface DetectedDependency {
  name: string // Clean package name
  version: string // Clean version string
  registry: 'npm' | 'jsr' | 'deno' // Package registry
  originalSpec: string // Original specifier (might include npm:, jsr:, etc.)
  type: 'production' | 'development' | 'peer' | 'optional' | 'import'
  source: string // File path where dependency was found
}

/**
 * Parse package.json and extract dependencies
 */
const parsePackageJson = (manifestPath: string): Effect.Effect<ProjectManifest, VibeError> =>
  pipe(
    loadJson(PackageJsonSchema)(manifestPath),
    Effect.map((pkg) => {
      const dependencies: Record<string, string> = {}
      const devDependencies: Record<string, string> = {}

      // Merge all dependency types into main dependencies for production
      Object.entries(pkg.dependencies || {}).forEach(([name, version]) => {
        dependencies[name] = version
      })

      Object.entries(pkg.peerDependencies || {}).forEach(([name, version]) => {
        dependencies[name] = version
      })

      Object.entries(pkg.optionalDependencies || {}).forEach(([name, version]) => {
        dependencies[name] = version
      })

      // Keep dev dependencies separate
      Object.entries(pkg.devDependencies || {}).forEach(([name, version]) => {
        devDependencies[name] = version
      })

      return {
        type: 'package.json' as const,
        path: manifestPath,
        dependencies,
        devDependencies,
        peerDependencies: pkg.peerDependencies || {},
        optionalDependencies: pkg.optionalDependencies || {},
      }
    }),
  )

/**
 * Parse deno.json and extract dependencies
 */
const parseDenoJson = (manifestPath: string): Effect.Effect<ProjectManifest, VibeError> =>
  pipe(
    loadJson(DenoJsonSchema)(manifestPath),
    Effect.map((deno) => {
      const dependencies: Record<string, string> = {}
      const originalSpecs: Record<string, string> = {}

      // Extract from imports map
      Object.entries(deno.imports || {}).forEach(([alias, spec]) => {
        // Only include external dependencies, not relative imports
        if (!spec.startsWith('./') && !spec.startsWith('../') && !spec.startsWith('/')) {
          const parsed = parsePackageSpec(spec)
          dependencies[parsed.name] = parsed.version
          originalSpecs[parsed.name] = spec // Store original spec for registry detection
        }
      })

      // Extract from dependencies field (if present)
      Object.entries(deno.dependencies || {}).forEach(([name, version]) => {
        dependencies[name] = version
        originalSpecs[name] = `${name}@${version}` // Fallback for dependencies field
      })

      return {
        type: 'deno.json' as const,
        path: manifestPath,
        dependencies,
        devDependencies: {}, // Deno doesn't have dev dependencies concept
        originalSpecs, // Include original specs for proper registry detection
      }
    }),
  )

/**
 * Find and parse project manifest files
 */
export const detectProjectManifests = (projectPath: string): Effect.Effect<ProjectManifest[], VibeError> => {
  const packageJsonPath = resolve(projectPath, 'package.json')
  const denoJsonPath = resolve(projectPath, 'deno.json')

  return pipe(
    Effect.all([
      fileExists(packageJsonPath),
      fileExists(denoJsonPath),
    ]),
    Effect.flatMap(([hasPackageJson, hasDenoJson]) => {
      const parseEffects: Effect.Effect<ProjectManifest, VibeError>[] = []

      if (hasPackageJson) {
        parseEffects.push(parsePackageJson(packageJsonPath))
      }

      if (hasDenoJson) {
        parseEffects.push(parseDenoJson(denoJsonPath))
      }

      if (parseEffects.length === 0) {
        return Effect.fail(
          createParseError(
            null,
            'No manifests found in current directory',
          ),
        )
      }

      // Execute all parsing operations
      return Effect.all(parseEffects)
    }),
  )
}

/**
 * Extract all dependencies with metadata from manifests
 * Legacy compatibility function - now delegates to runtime-specific extractors
 * TODO: Replace direct calls with extractDependenciesWithRuntime for full Effect-TS integration
 */
export const extractAllDependencies = (manifests: ProjectManifest[]): DetectedDependency[] => {
  // For minimal implementation, use strategy pattern without full Effect integration
  // This maintains backward compatibility while fixing the core issues

  // Determine runtime type based on manifest types
  const hasPackageJson = manifests.some((m) => m.type === 'package.json')
  const hasDenoJson = manifests.some((m) => m.type === 'deno.json')

  // Use the appropriate extractor strategy directly
  if (hasPackageJson && hasDenoJson) {
    // Hybrid: combine both strategies
    const nodeManifests = manifests.filter((m) => m.type === 'package.json')
    const denoManifests = manifests.filter((m) => m.type === 'deno.json')

    return [
      ...extractWithNodeStrategy(nodeManifests),
      ...extractWithDenoStrategy(denoManifests),
    ]
  } else if (hasPackageJson) {
    return extractWithNodeStrategy(manifests)
  } else {
    return extractWithDenoStrategy(manifests)
  }
}

/**
 * Extract dependencies using Node.js strategy (handles all dependency types)
 */
function extractWithNodeStrategy(manifests: ProjectManifest[]): DetectedDependency[] {
  const dependencies: DetectedDependency[] = []

  for (const manifest of manifests) {
    if (manifest.type !== 'package.json') continue

    // We need to access the original package.json data to get all dependency types
    // For now, use the existing approach but fix registry detection

    // Production dependencies
    Object.entries(manifest.dependencies).forEach(([name, version]) => {
      dependencies.push({
        name,
        version,
        registry: detectNodeRegistry(version),
        originalSpec: `${name}@${version}`,
        type: 'production',
        source: manifest.path,
      })
    })

    // Development dependencies
    Object.entries(manifest.devDependencies).forEach(([name, version]) => {
      dependencies.push({
        name,
        version,
        registry: detectNodeRegistry(version),
        originalSpec: `${name}@${version}`,
        type: 'development',
        source: manifest.path,
      })
    })
  }

  return dependencies
}

/**
 * Extract dependencies using Deno strategy (proper registry detection)
 */
function extractWithDenoStrategy(manifests: ProjectManifest[]): DetectedDependency[] {
  const dependencies: DetectedDependency[] = []

  for (const manifest of manifests) {
    if (manifest.type !== 'deno.json') continue

    // For Deno imports, use the original specs for proper registry detection
    Object.entries(manifest.dependencies).forEach(([name, version]) => {
      // Use the stored original spec if available, otherwise reconstruct
      const originalSpec = manifest.originalSpecs?.[name] || `${name}@${version}`

      dependencies.push({
        name,
        version,
        registry: detectDenoRegistry(originalSpec, name),
        originalSpec,
        type: 'import', // Deno uses imports, not traditional dependencies
        source: manifest.path,
      })
    })

    Object.entries(manifest.devDependencies).forEach(([name, version]) => {
      // Use the stored original spec if available, otherwise reconstruct
      const originalSpec = manifest.originalSpecs?.[name] || `${name}@${version}`

      dependencies.push({
        name,
        version,
        registry: detectDenoRegistry(originalSpec, name),
        originalSpec,
        type: 'development',
        source: manifest.path,
      })
    })
  }

  return dependencies
}

/**
 * Detect registry for Node.js packages
 */
function detectNodeRegistry(versionSpec: string): 'npm' | 'jsr' | 'deno' {
  if (versionSpec.startsWith('npm:')) return 'npm'
  if (versionSpec.startsWith('jsr:')) return 'jsr'
  if (versionSpec.startsWith('github:')) return 'npm' // GitHub packages go through npm
  return 'npm' // Default for Node.js
}

/**
 * Detect registry for Deno packages
 */
function detectDenoRegistry(originalSpec: string, name: string): 'npm' | 'jsr' | 'deno' {
  if (originalSpec.startsWith('npm:')) return 'npm'
  if (originalSpec.startsWith('jsr:')) return 'jsr'
  if (originalSpec.startsWith('https://deno.land/')) return 'deno'

  // For Deno, JSR packages often start with @std/ or other scoped names
  if (name.startsWith('@std/') || name.startsWith('@deno/')) {
    return 'jsr'
  }

  // Default to JSR for Deno bare specifiers
  return 'jsr'
}

/**
 * Check if a package exists in project dependencies
 * Now uses the full runtime detection system
 */
export const validatePackageInProject = (
  packageName: string,
  projectPath: string,
): Effect.Effect<DetectedDependency, VibeError> =>
  pipe(
    extractDependenciesWithRuntime(projectPath),
    Effect.flatMap((dependencies) => {
      const found = dependencies.find((dep) => dep.name === packageName)
      if (!found) {
        return Effect.fail(
          createParseError(
            null,
            `Package '${packageName}' not found in project dependencies. Available packages: ${
              dependencies.map((d) => d.name).join(', ')
            }`,
          ),
        )
      }
      return Effect.succeed(found)
    }),
  )
