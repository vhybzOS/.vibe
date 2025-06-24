/**
 * Runtime Detector Service
 *
 * Identifies project runtime (Node.js, Deno, hybrid) and provides appropriate
 * package extraction strategies for each runtime type
 *
 * @tested_by tests/unit/runtime-detector.test.ts (Runtime detection, strategy pattern, package extraction)
 */

import { Effect, pipe } from 'effect'
import { resolve } from '@std/path'
import { fileExists } from '../lib/fs.ts'
import { createParseError, type VibeError } from '../lib/errors.ts'
import { type DetectedDependency, detectProjectManifests, type ProjectManifest } from './package-detector.ts'
import { parsePackageSpec } from './registry-client.ts'

/**
 * Runtime types supported by the system
 */
export type RuntimeType = 'nodejs' | 'deno' | 'hybrid'

/**
 * Runtime detection result
 */
export interface RuntimeDetectionResult {
  type: RuntimeType
  manifests: ProjectManifest[]
  primaryRuntime: 'nodejs' | 'deno' // For hybrid projects, which takes precedence
}

/**
 * Package extractor strategy interface
 */
export interface PackageExtractorStrategy {
  extractDependencies(manifests: ProjectManifest[]): DetectedDependency[]
}

/**
 * Node.js package extractor - handles package.json with all dependency types
 */
export class NodePackageExtractor implements PackageExtractorStrategy {
  extractDependencies(manifests: ProjectManifest[]): DetectedDependency[] {
    const dependencies: DetectedDependency[] = []

    for (const manifest of manifests) {
      if (manifest.type !== 'package.json') continue

      // Production dependencies
      Object.entries(manifest.dependencies).forEach(([name, version]) => {
        dependencies.push({
          name,
          version,
          registry: this.detectRegistry(version),
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
          registry: this.detectRegistry(version),
          originalSpec: `${name}@${version}`,
          type: 'development',
          source: manifest.path,
        })
      })

      // Peer dependencies (NEW - was missing in original implementation)
      Object.entries(manifest.peerDependencies || {}).forEach(([name, version]) => {
        dependencies.push({
          name,
          version,
          registry: this.detectRegistry(version),
          originalSpec: `${name}@${version}`,
          type: 'peer',
          source: manifest.path,
        })
      })

      // Optional dependencies (NEW - was missing in original implementation)
      Object.entries(manifest.optionalDependencies || {}).forEach(([name, version]) => {
        dependencies.push({
          name,
          version,
          registry: this.detectRegistry(version),
          originalSpec: `${name}@${version}`,
          type: 'optional',
          source: manifest.path,
        })
      })
    }

    return dependencies
  }

  private detectRegistry(versionSpec: string): 'npm' | 'jsr' | 'deno' {
    // For Node.js, default to npm unless explicitly specified
    if (versionSpec.startsWith('npm:')) return 'npm'
    if (versionSpec.startsWith('jsr:')) return 'jsr'
    if (versionSpec.startsWith('github:')) return 'npm' // GitHub packages go through npm
    return 'npm' // Default for Node.js
  }
}

/**
 * Deno package extractor - handles deno.json imports with proper registry detection
 */
export class DenoPackageExtractor implements PackageExtractorStrategy {
  extractDependencies(manifests: ProjectManifest[]): DetectedDependency[] {
    const dependencies: DetectedDependency[] = []

    for (const manifest of manifests) {
      if (manifest.type !== 'deno.json') continue

      // Extract dependencies (these come from parsed imports)
      Object.entries(manifest.dependencies).forEach(([name, version]) => {
        // We need to track original specs to detect registry properly
        const originalSpec = this.getOriginalSpec(manifest, name, version)

        dependencies.push({
          name,
          version,
          registry: this.detectRegistry(originalSpec),
          originalSpec,
          type: 'import', // Deno uses imports, not traditional dependencies
          source: manifest.path,
        })
      })

      // Deno doesn't typically have devDependencies, but handle if present
      Object.entries(manifest.devDependencies).forEach(([name, version]) => {
        const originalSpec = this.getOriginalSpec(manifest, name, version)

        dependencies.push({
          name,
          version,
          registry: this.detectRegistry(originalSpec),
          originalSpec,
          type: 'development',
          source: manifest.path,
        })
      })
    }

    return dependencies
  }

  private getOriginalSpec(manifest: ProjectManifest, name: string, version: string): string {
    // Check if manifest has originalSpecs tracking (enhanced version)
    if ('originalSpecs' in manifest && manifest.originalSpecs?.[name]) {
      return manifest.originalSpecs[name]
    }

    // Fallback: reconstruct from name and version
    // This is a best guess for now - we'll enhance parseDenoJson to track original specs
    return `${name}@${version}`
  }

  private detectRegistry(originalSpec: string): 'npm' | 'jsr' | 'deno' {
    // Parse the original spec to determine registry
    if (originalSpec.startsWith('npm:')) return 'npm'
    if (originalSpec.startsWith('jsr:')) return 'jsr'
    if (originalSpec.startsWith('https://deno.land/')) return 'deno'

    // For Deno, bare specifiers default to JSR
    return 'jsr'
  }
}

/**
 * Runtime detector service
 */
export class RuntimeDetector {
  /**
   * Detect the runtime type of a project
   */
  detectRuntime(projectPath: string): Effect.Effect<RuntimeDetectionResult, VibeError> {
    const packageJsonPath = resolve(projectPath, 'package.json')
    const denoJsonPath = resolve(projectPath, 'deno.json')

    return pipe(
      Effect.all([
        fileExists(packageJsonPath),
        fileExists(denoJsonPath),
      ]),
      Effect.flatMap(([hasPackageJson, hasDenoJson]) => {
        if (!hasPackageJson && !hasDenoJson) {
          return Effect.fail(
            createParseError(
              null,
              `No package.json or deno.json found in ${projectPath}`,
            ),
          )
        }

        // Determine runtime type
        let type: RuntimeType
        let primaryRuntime: 'nodejs' | 'deno'

        if (hasPackageJson && hasDenoJson) {
          type = 'hybrid'
          // For hybrid projects, prefer Deno if deno.json has imports
          primaryRuntime = 'deno' // Can be made smarter later
        } else if (hasPackageJson) {
          type = 'nodejs'
          primaryRuntime = 'nodejs'
        } else {
          type = 'deno'
          primaryRuntime = 'deno'
        }

        // Load manifests
        return pipe(
          detectProjectManifests(projectPath),
          Effect.map((manifests) => ({
            type,
            manifests,
            primaryRuntime,
          })),
        )
      }),
    )
  }

  /**
   * Get appropriate package extractor for detected runtime
   */
  getExtractor(runtime: RuntimeDetectionResult): PackageExtractorStrategy {
    if (runtime.type === 'nodejs') {
      return new NodePackageExtractor()
    } else if (runtime.type === 'deno') {
      return new DenoPackageExtractor()
    } else {
      // Hybrid: use both extractors
      return new HybridPackageExtractor()
    }
  }
}

/**
 * Hybrid package extractor - combines Node.js and Deno strategies
 */
class HybridPackageExtractor implements PackageExtractorStrategy {
  private nodeExtractor = new NodePackageExtractor()
  private denoExtractor = new DenoPackageExtractor()

  extractDependencies(manifests: ProjectManifest[]): DetectedDependency[] {
    const nodeManifests = manifests.filter((m) => m.type === 'package.json')
    const denoManifests = manifests.filter((m) => m.type === 'deno.json')

    return [
      ...this.nodeExtractor.extractDependencies(nodeManifests),
      ...this.denoExtractor.extractDependencies(denoManifests),
    ]
  }
}

/**
 * Enhanced dependency extraction using runtime detection
 * This replaces the generic extractAllDependencies function
 */
export const extractDependenciesWithRuntime = (
  projectPath: string,
): Effect.Effect<DetectedDependency[], VibeError> =>
  pipe(
    new RuntimeDetector().detectRuntime(projectPath),
    Effect.map((runtime) => {
      const extractor = new RuntimeDetector().getExtractor(runtime)
      return extractor.extractDependencies(runtime.manifests)
    }),
  )
