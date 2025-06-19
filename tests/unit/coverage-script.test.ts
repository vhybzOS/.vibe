/**
 * Unit Tests for Coverage Script
 *
 * Tests skip functionality, coverage calculations, and CLI argument parsing
 */

import { assert, assertEquals, assertExists } from '@std/assert'
import { afterEach, beforeEach, describe, it } from '@std/testing/bdd'
import { resolve } from '@std/path'

// Import coverage script functions - we need to make them exportable
// For now, we'll test via subprocess calls to the script

// Test utilities
let testFixtures: string[] = []

async function createDummyFile(path: string, content = ''): Promise<void> {
  // Ensure parent directory exists
  const dir = path.split('/').slice(0, -1).join('/')
  if (dir) {
    await Deno.mkdir(dir, { recursive: true }).catch(() => {})
  }

  await Deno.writeTextFile(path, content)
  testFixtures.push(path)
}

async function createDummyFolder(folderPath: string, fileName = 'dummy.ts'): Promise<void> {
  await Deno.mkdir(folderPath, { recursive: true })
  const filePath = `${folderPath}/${fileName}`
  await createDummyFile(filePath, '// Empty test file')
  testFixtures.push(folderPath) // Add folder for cleanup
}

async function cleanup(): Promise<void> {
  for (const fixture of testFixtures.reverse()) {
    try {
      await Deno.remove(fixture, { recursive: true })
    } catch {
      // Ignore cleanup errors
    }
  }
  testFixtures = []
}

async function runCoverageScript(args: string[] = []): Promise<{
  success: boolean
  output: string
  code: number
}> {
  const cmd = new Deno.Command('deno', {
    args: ['run', '--allow-read', '--allow-env', 'scripts/coverage.ts', ...args],
    stdout: 'piped',
    stderr: 'piped',
  })

  const process = cmd.spawn()
  const { code, stdout, stderr } = await process.output()

  const output = new TextDecoder().decode(stdout) + new TextDecoder().decode(stderr)

  return {
    success: code === 0,
    output,
    code,
  }
}

function extractCoverageInfo(output: string): {
  totalFiles: number
  coveredFiles: number
  percentage: number
} {
  const fileCountMatch = output.match(/📁 Found (\d+) implementation files/)
  const coverageMatch = output.match(/📈 Coverage: (\d+)% \((\d+)\/(\d+) files\)/)

  if (!fileCountMatch || !coverageMatch) {
    throw new Error(`Could not parse coverage output: ${output}`)
  }

  return {
    totalFiles: parseInt(coverageMatch[3]!),
    coveredFiles: parseInt(coverageMatch[2]!),
    percentage: parseInt(coverageMatch[1]!),
  }
}

describe('Coverage Script', () => {
  beforeEach(async () => {
    // Ensure clean state
    await cleanup()
  })

  afterEach(async () => {
    await cleanup()
  })

  it('should exclude folder when passed to --skip', async () => {
    // Setup: Create dummy folder with TypeScript file
    await createDummyFolder('test-dummy-folder')

    // Get baseline coverage without skip
    const baselineResult = await runCoverageScript()
    const baselineInfo = extractCoverageInfo(baselineResult.output)

    // Run coverage with skip
    const skipResult = await runCoverageScript(['--skip', 'test-dummy-folder'])
    const skipInfo = extractCoverageInfo(skipResult.output)

    // Assert: dummy folder file was excluded
    assertEquals(skipInfo.totalFiles, baselineInfo.totalFiles - 1, 'Skip should reduce total file count by 1')

    // Assert: skip result should not mention the dummy file
    assert(!skipResult.output.includes('test-dummy-folder/dummy.ts'), 'Output should not include skipped folder files')

    // Assert: skip should be mentioned in output
    assert(skipResult.output.includes('excluding: test-dummy-folder'), 'Output should indicate what was skipped')
  })

  it('should exclude single file when passed to --skip', async () => {
    // Setup: Create dummy single file
    await createDummyFile('test-dummy-single.ts', '// Single test file')

    // Get baseline coverage without skip
    const baselineResult = await runCoverageScript()
    const baselineInfo = extractCoverageInfo(baselineResult.output)

    // Run coverage with skip
    const skipResult = await runCoverageScript(['--skip', 'test-dummy-single.ts'])
    const skipInfo = extractCoverageInfo(skipResult.output)

    // The file should be excluded from the count

    // Assert: dummy file was excluded
    assertEquals(skipInfo.totalFiles, baselineInfo.totalFiles - 1, 'Skip should reduce total file count by 1')

    // Assert: skip result should not mention the dummy file in the file list (not in exclusion line)
    const outputLines = skipResult.output.split('\n')
    const fileLines = outputLines.filter((line) =>
      line.includes('test-dummy-single.ts') && (line.includes('✅') || line.includes('❌'))
    )
    assertEquals(fileLines.length, 0, 'File should not appear in coverage analysis')

    // Assert: skip should be mentioned in output
    assert(skipResult.output.includes('excluding: test-dummy-single.ts'), 'Output should indicate what was skipped')
  })

  it('should handle multiple skip patterns', async () => {
    // Setup: Create multiple dummy files/folders
    await createDummyFolder('test-folder-1')
    await createDummyFolder('test-folder-2')
    await createDummyFile('test-single.ts', '// Single test')

    // Get baseline coverage
    const baselineResult = await runCoverageScript()
    const baselineInfo = extractCoverageInfo(baselineResult.output)

    // Run coverage with multiple skip patterns
    const skipResult = await runCoverageScript([
      '--skip',
      'test-folder-1,test-folder-2,test-single.ts',
    ])
    const skipInfo = extractCoverageInfo(skipResult.output)

    // Assert: all 3 files were excluded
    assertEquals(skipInfo.totalFiles, baselineInfo.totalFiles - 3, 'Should exclude all 3 test files')

    // Assert: all patterns mentioned in output
    assert(
      skipResult.output.includes('excluding: test-folder-1, test-folder-2, test-single.ts'),
      'Output should show all skip patterns',
    )
  })

  it('should calculate coverage correctly with known files', async () => {
    // Run coverage with legacy skipped (our known good case)
    const result = await runCoverageScript(['--skip', 'legacy'])

    // Should succeed with 100% coverage for implementation files
    assert(result.success, 'Coverage should pass with legacy skipped')
    assert(result.output.includes('100%'), 'Should show 100% coverage')
    assert(result.output.includes('PASSING'), 'Status should be PASSING')
  })

  it('should fail with low coverage when including legacy', async () => {
    // Run coverage without skip (includes legacy)
    const result = await runCoverageScript()

    // Should fail due to low coverage
    assert(!result.success, 'Coverage should fail with legacy included')
    assert(result.output.includes('NEEDS IMPROVEMENT'), 'Status should indicate improvement needed')

    const info = extractCoverageInfo(result.output)
    assert(info.percentage < 80, 'Coverage should be below 80% threshold')
  })

  it('should handle empty skip parameter gracefully', async () => {
    // Run with empty skip
    const result = await runCoverageScript(['--skip', ''])

    // Should work same as no skip
    assert(result.output.includes('📁 Found'), 'Should find files normally')
    assert(!result.output.includes('excluding:'), 'Should not show exclusions')
  })

  it('should show correct output format', async () => {
    const result = await runCoverageScript(['--skip', 'legacy'])

    // Check for expected output elements
    assert(result.output.includes('🔍 Analyzing @tested_by annotation coverage'), 'Should show analysis header')
    assert(result.output.includes('📊 IMPLEMENTATION COVERAGE SUMMARY'), 'Should show summary header when skipping')
    assert(result.output.includes('✅') || result.output.includes('❌'), 'Should show file status indicators')
  })
})
