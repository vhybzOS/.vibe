/**
 * Shared Test Utilities
 *
 * Common helpers for robust test execution across unit, integration, and user tests.
 * Handles directory management, working directory changes, and test isolation.
 */

import { dirname, resolve } from '@std/path'
import { Effect } from 'effect'
import { ensureDir } from '../lib/fs.ts'

/**
 * Test project file interface
 */
export interface ProjectFile {
  name?: string
  version?: string
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
  imports?: Record<string, string>
}

/**
 * Safely get current working directory, falling back to script location if cwd doesn't exist
 * This handles cases where previous tests have deleted the working directory
 */
export function safeGetCwd(fallbackUrl?: string): string {
  try {
    return Deno.cwd()
  } catch {
    // If cwd doesn't exist (deleted by previous test), use the script location or a safe default
    if (fallbackUrl) {
      return dirname(new URL(fallbackUrl).pathname)
    }
    // Ultimate fallback - try to find project root from common test location
    return dirname(dirname(new URL(import.meta.url).pathname))
  }
}

/**
 * Find project root by looking for deno.json, with graceful error handling
 * Works regardless of current working directory state
 */
export async function findProjectRoot(startPath?: string): Promise<string> {
  let projectRoot = startPath || safeGetCwd()

  while (projectRoot !== '/' && projectRoot !== '.') {
    try {
      await Deno.stat(resolve(projectRoot, 'deno.json'))
      return projectRoot
    } catch {
      const parentPath = resolve(projectRoot, '..')

      // Check if we've reached the root (parent path equals current path)
      if (parentPath === projectRoot) {
        break
      }

      projectRoot = parentPath
    }
  }

  // If we can't find deno.json, return the start path as fallback
  return startPath || safeGetCwd()
}

/**
 * Create a test project with specified files in a temporary directory
 * Automatically handles project root detection and directory creation
 */
export async function createTestProject(
  testName: string,
  files: Record<string, ProjectFile>,
  options: {
    testCategory?: 'unit' | 'integration' | 'user'
    isolateDirectory?: boolean
  } = {},
): Promise<string> {
  const { testCategory = 'unit', isolateDirectory = false } = options

  const projectRoot = await findProjectRoot()

  const testDir = isolateDirectory
    ? resolve('/tmp', 'vibe-tests', testCategory, testName)
    : resolve(projectRoot, 'tests', 'tmp', testCategory, testName)

  await Effect.runPromise(ensureDir(testDir))

  for (const [filename, content] of Object.entries(files)) {
    const filePath = resolve(testDir, filename)
    await Effect.runPromise(ensureDir(dirname(filePath))) // Ensure parent directory exists
    await Deno.writeTextFile(filePath, JSON.stringify(content, null, 2))
  }

  return testDir
}

/**
 * Clean up test directories
 * Safely removes directories, ignoring errors if directory doesn't exist
 */
export async function cleanupTestProject(testDir: string): Promise<void> {
  try {
    await Deno.remove(testDir, { recursive: true })
  } catch {
    // Ignore cleanup errors - directory might not exist or be in use
  }
}

/**
 * Safely change directory with automatic restoration
 * Handles cases where directories are deleted during test execution
 */
export async function withDirectory<T>(dir: string, fn: () => Promise<T>): Promise<T> {
  const originalCwd = safeGetCwd()
  try {
    Deno.chdir(dir)
    return await fn()
  } finally {
    try {
      Deno.chdir(originalCwd)
    } catch {
      // If original directory was deleted, change to project root
      const projectRoot = await findProjectRoot()
      Deno.chdir(projectRoot)
    }
  }
}

/**
 * Native Deno API wrapper for directory creation in tests
 * Use this instead of our Effect-TS ensureDir for test setup
 */
export async function ensureDirTest(path: string): Promise<void> {
  try {
    await Deno.mkdir(path, { recursive: true })
  } catch (error) {
    if (!(error instanceof Deno.errors.AlreadyExists)) {
      throw error
    }
  }
}
