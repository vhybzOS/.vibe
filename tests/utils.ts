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
  console.log(`[DEBUG-WIN] findProjectRoot START - ${startPath} - ${new Date().toISOString()}`)
  let projectRoot = startPath || safeGetCwd()
  console.log(`[DEBUG-WIN] Initial project root: ${projectRoot} - ${new Date().toISOString()}`)

  while (projectRoot !== '/' && projectRoot !== '.') {
    try {
      console.log(`[DEBUG-WIN] Checking for deno.json in: ${projectRoot} - ${new Date().toISOString()}`)
      await Deno.stat(resolve(projectRoot, 'deno.json'))
      console.log(`[DEBUG-WIN] Found deno.json, returning: ${projectRoot} - ${new Date().toISOString()}`)
      return projectRoot
    } catch {
      const parentPath = resolve(projectRoot, '..')
      console.log(`[DEBUG-WIN] Moving up to parent: ${parentPath} - ${new Date().toISOString()}`)

      // Check if we've reached the root (parent path equals current path)
      if (parentPath === projectRoot) {
        console.log(`[DEBUG-WIN] Reached filesystem root, breaking loop - ${new Date().toISOString()}`)
        break
      }

      projectRoot = parentPath
    }
  }

  // If we can't find deno.json, return the start path as fallback
  const fallback = startPath || safeGetCwd()
  console.log(`[DEBUG-WIN] Using fallback: ${fallback} - ${new Date().toISOString()}`)
  return fallback
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
  console.log(`[DEBUG-WIN] createTestProject START - ${testName} - ${new Date().toISOString()}`)
  const { testCategory = 'unit', isolateDirectory = false } = options

  console.log(`[DEBUG-WIN] Finding project root - ${new Date().toISOString()}`)
  const projectRoot = await findProjectRoot()
  console.log(`[DEBUG-WIN] Project root found: ${projectRoot} - ${new Date().toISOString()}`)

  const testDir = isolateDirectory
    ? resolve('/tmp', 'vibe-tests', testCategory, testName)
    : resolve(projectRoot, 'tests', 'tmp', testCategory, testName)
  console.log(`[DEBUG-WIN] Test directory resolved: ${testDir} - ${new Date().toISOString()}`)

  console.log(`[DEBUG-WIN] Creating directory - ${new Date().toISOString()}`)
  await Effect.runPromise(ensureDir(testDir))
  console.log(`[DEBUG-WIN] Directory created successfully - ${new Date().toISOString()}`)

  console.log(`[DEBUG-WIN] Writing ${Object.keys(files).length} files - ${new Date().toISOString()}`)
  for (const [filename, content] of Object.entries(files)) {
    const filePath = resolve(testDir, filename)
    console.log(`[DEBUG-WIN] Writing file: ${filePath} - ${new Date().toISOString()}`)
    await Effect.runPromise(ensureDir(dirname(filePath))) // Ensure parent directory exists
    await Deno.writeTextFile(filePath, JSON.stringify(content, null, 2))
    console.log(`[DEBUG-WIN] File written successfully: ${filename} - ${new Date().toISOString()}`)
  }

  console.log(`[DEBUG-WIN] createTestProject COMPLETE - ${testDir} - ${new Date().toISOString()}`)
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
