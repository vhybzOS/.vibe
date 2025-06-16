/**
 * NPM package.json manifest parser
 * Handles Node.js projects with package.json files
 */

import { Effect, pipe } from 'effect'
import { resolve } from '@std/path'
import { readTextFile } from '../../lib/effects.ts'
import { createFileSystemError, type VibeError } from '../../lib/errors.ts'
import {
  DetectedDependency,
  ManifestParser,
  ManifestParseResult,
  normalizePackageName,
  parseJsonSafely,
} from './base.ts'

interface PackageJson {
  name?: string
  version?: string
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
  scripts?: Record<string, string>
  engines?: Record<string, string>
  repository?: string | { type: string; url: string }
  [key: string]: unknown
}

/**
 * NPM manifest parser implementation (functional)
 */
const npmParserType = 'npm'
const npmSupportedFiles = ['package.json'] as const
const npmPackageManager = 'npm'

const fileExists = (path: string) =>
  Effect.tryPromise({
    try: async () => {
      try {
        await Deno.stat(path)
        return true
      } catch {
        return false
      }
    },
    catch: (error) =>
      createFileSystemError(
        error,
        path,
        'Failed to check file existence',
      ),
  })

const canParseNpm = (manifestPath: string) =>
  pipe(
    Effect.sync(() => manifestPath.endsWith('package.json')),
    Effect.flatMap((isPackageJson) =>
      isPackageJson ? fileExists(manifestPath) : Effect.succeed(false)
    ),
  )

const extractDependencies = (packageJson: PackageJson, manifestPath: string) =>
  Effect.sync(() => {
    const dependencies: DetectedDependency[] = []

    // Production dependencies
    if (packageJson.dependencies) {
      for (const [name, version] of Object.entries(packageJson.dependencies)) {
        const normalized = normalizePackageName(name)
        dependencies.push({
          name: normalized.name,
          version,
          type: 'production',
          ...(normalized.scope && { scope: normalized.scope }),
          source: manifestPath,
        })
      }
    }

    // Development dependencies
    if (packageJson.devDependencies) {
      for (const [name, version] of Object.entries(packageJson.devDependencies)) {
        const normalized = normalizePackageName(name)
        dependencies.push({
          name: normalized.name,
          version,
          type: 'development',
          ...(normalized.scope && { scope: normalized.scope }),
          source: manifestPath,
        })
      }
    }

    // Peer dependencies
    if (packageJson.peerDependencies) {
      for (const [name, version] of Object.entries(packageJson.peerDependencies)) {
        const normalized = normalizePackageName(name)
        dependencies.push({
          name: normalized.name,
          version,
          type: 'peer',
          ...(normalized.scope && { scope: normalized.scope }),
          source: manifestPath,
        })
      }
    }

    // Optional dependencies
    if (packageJson.optionalDependencies) {
      for (const [name, version] of Object.entries(packageJson.optionalDependencies)) {
        const normalized = normalizePackageName(name)
        dependencies.push({
          name: normalized.name,
          version,
          type: 'optional',
          ...(normalized.scope && { scope: normalized.scope }),
          source: manifestPath,
        })
      }
    }

    return dependencies
  })

const checkLockFileExists = (manifestPath: string) => {
  const manifestDir = resolve(manifestPath, '..')
  return pipe(
    Effect.all([
      fileExists(resolve(manifestDir, 'package-lock.json')),
      fileExists(resolve(manifestDir, 'npm-shrinkwrap.json')),
      fileExists(resolve(manifestDir, 'yarn.lock')),
      fileExists(resolve(manifestDir, 'pnpm-lock.yaml')),
    ]),
    Effect.map(([npmLock, shrinkwrap, yarnLock, pnpmLock]) =>
      npmLock || shrinkwrap || yarnLock || pnpmLock
    ),
    Effect.catchAll(() => Effect.succeed(false)),
  )
}

const calculateConfidence = (
  dependencies: DetectedDependency[],
  lockFileExists: boolean,
): number => {
  let confidence = 0.8 // Base confidence for valid package.json

  // Boost confidence if we have dependencies
  if (dependencies.length > 0) {
    confidence += 0.1
  }

  // Boost confidence if lock file exists
  if (lockFileExists) {
    confidence += 0.1
  }

  return Math.min(confidence, 1.0)
}

const createParseResult = (dependencies: DetectedDependency[], manifestPath: string) =>
  pipe(
    checkLockFileExists(manifestPath),
    Effect.map((lockFileExists) => ({
      manifestType: npmParserType,
      manifestPath,
      dependencies,
      metadata: {
        packageManager: npmPackageManager,
        lockFileExists,
        parsedAt: new Date().toISOString(),
        confidence: calculateConfidence(dependencies, lockFileExists),
      },
    } satisfies ManifestParseResult)),
  )

const parseNpm = (manifestPath: string) =>
  pipe(
    readTextFile(manifestPath),
    Effect.flatMap((content) => parseJsonSafely(content)),
    Effect.flatMap((packageJson) => extractDependencies(packageJson as PackageJson, manifestPath)),
    Effect.flatMap((dependencies) => createParseResult(dependencies, manifestPath)),
  )

const getProjectMetadataNpm = (manifestPath: string) =>
  pipe(
    readTextFile(manifestPath),
    Effect.flatMap((content) => parseJsonSafely(content)),
    Effect.map((packageJson) => {
      const pkg = packageJson as PackageJson
      return {
        projectName: pkg.name,
        projectVersion: pkg.version,
        scripts: pkg.scripts || {},
        engines: pkg.engines || {},
        repository: pkg.repository,
        hasLockFile: false, // Will be set by the discovery service
      }
    }),
  )

/**
 * NPM manifest parser (functional implementation)
 */
export const npmManifestParser: ManifestParser = {
  type: npmParserType,
  supportedFiles: npmSupportedFiles,
  packageManager: npmPackageManager,
  canParse: canParseNpm,
  parse: parseNpm,
  getProjectMetadata: getProjectMetadataNpm,
}
