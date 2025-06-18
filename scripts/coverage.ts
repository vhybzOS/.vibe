#!/usr/bin/env -S deno run --allow-read

/**
 * Smart Test Coverage Analysis Script
 *
 * Analyzes @tested_by annotation coverage instead of traditional line coverage.
 * This aligns with our TDD approach where every implementation file should
 * explicitly link to its test files via @tested_by comments.
 *
 * @tested_by tests/unit/coverage-script.test.ts (Core coverage analysis logic)
 * @tested_by tests/integration/coverage-ci.test.ts (CI integration and exit codes)
 */

import { walk } from 'https://deno.land/std@0.208.0/fs/walk.ts'
import { parseArgs } from '@std/cli/parse-args'
import { normalize } from '@std/path/posix/normalize'

interface CoverageResult {
  totalFiles: number
  coveredFiles: number
  uncoveredFiles: string[]
  percentage: number
  success: boolean
  skippedPatterns?: string[]
}

interface CoverageOptions {
  skipPatterns: string[]
}

/**
 * Normalize path to POSIX format for consistent cross-platform behavior
 */
function normalizePath(filePath: string): string {
  // First convert Windows backslashes to forward slashes, then normalize with Deno std
  return normalize(filePath.replace(/\\/g, '/'))
}

/**
 * Check if a file should be skipped based on patterns
 */
function shouldSkipFile(filePath: string, skipPatterns: string[]): boolean {
  // Normalize path to forward slashes for consistent matching
  const normalizedPath = normalizePath(filePath)

  // Default exclusions (always applied)
  const defaultExclusions = [
    '/tests/',
    '/node_modules/',
    '/build/',
    '.test.ts',
    '.spec.ts',
  ]

  // Check default exclusions
  for (const exclusion of defaultExclusions) {
    if (normalizedPath.includes(exclusion)) {
      return true
    }
  }

  // Check user-specified skip patterns
  for (const pattern of skipPatterns) {
    const normalizedPattern = normalizePath(pattern)

    // For folder patterns (e.g., "legacy")
    if (normalizedPath.includes(`/${normalizedPattern}/`) || normalizedPath.startsWith(`${normalizedPattern}/`)) {
      return true
    }

    // For exact file patterns (e.g., "test-dummy-single.ts")
    if (normalizedPath.endsWith(`/${normalizedPattern}`) || normalizedPath === normalizedPattern) {
      return true
    }
  }

  return false
}

/**
 * Find all TypeScript implementation files with configurable exclusions
 */
async function findImplementationFiles(options: CoverageOptions): Promise<string[]> {
  const files: string[] = []

  for await (
    const entry of walk('.', {
      includeDirs: false,
      includeFiles: true,
      exts: ['ts'],
    })
  ) {
    if (!shouldSkipFile(entry.path, options.skipPatterns)) {
      files.push(entry.path)
    }
  }

  return files.sort()
}

/**
 * Check if a file contains @tested_by annotations
 */
async function hasTestedByAnnotation(filePath: string): Promise<boolean> {
  try {
    const content = await Deno.readTextFile(filePath)
    return content.includes('@tested_by')
  } catch {
    return false
  }
}

/**
 * Analyze test coverage based on @tested_by annotations
 */
async function analyzeCoverage(options: CoverageOptions): Promise<CoverageResult> {
  const skipInfo = options.skipPatterns.length > 0 ? ` (excluding: ${options.skipPatterns.join(', ')})` : ''

  console.log(`🔍 Analyzing @tested_by annotation coverage${skipInfo}...\n`)

  const implementationFiles = await findImplementationFiles(options)
  console.log(`📁 Found ${implementationFiles.length} implementation files`)

  const uncoveredFiles: string[] = []
  let coveredCount = 0

  for (const file of implementationFiles) {
    const hasCoverage = await hasTestedByAnnotation(file)
    if (hasCoverage) {
      coveredCount++
      console.log(`✅ ${file}`)
    } else {
      uncoveredFiles.push(file)
      console.log(`❌ ${file} - Missing @tested_by annotation`)
    }
  }

  const percentage = implementationFiles.length > 0
    ? Math.round((coveredCount / implementationFiles.length) * 100)
    : 100

  return {
    totalFiles: implementationFiles.length,
    coveredFiles: coveredCount,
    uncoveredFiles,
    percentage,
    success: percentage >= 80, // 80% coverage threshold
    skippedPatterns: options.skipPatterns,
  }
}

/**
 * Display coverage summary
 */
function displaySummary(result: CoverageResult): void {
  console.log('\n' + '='.repeat(50))
  const title = result.skippedPatterns?.length ? '📊 IMPLEMENTATION COVERAGE SUMMARY' : '📊 TEST COVERAGE SUMMARY'
  console.log(title)
  console.log('='.repeat(50))

  console.log(`📈 Coverage: ${result.percentage}% (${result.coveredFiles}/${result.totalFiles} files)`)

  if (result.uncoveredFiles.length > 0) {
    console.log(`\n🚨 Files missing @tested_by annotations:`)
    result.uncoveredFiles.forEach((file) => {
      console.log(`   • ${file}`)
    })

    console.log(`\n💡 To fix: Add @tested_by comments to file headers linking to test files`)
    console.log(`   Example:`)
    console.log(`   /**`)
    console.log(`    * @tested_by tests/unit/my-module.test.ts (Core functionality)`)
    console.log(`    * @tested_by tests/integration/my-integration.test.ts (Integration)`)
    console.log(`    */`)
  } else {
    console.log('\n🎉 All implementation files have @tested_by annotations!')
  }

  const statusIcon = result.success ? '✅' : '❌'
  const statusText = result.success ? 'PASSING' : 'NEEDS IMPROVEMENT'
  console.log(`\n${statusIcon} Coverage Status: ${statusText}`)

  if (!result.success) {
    console.log(`\n⚠️  Coverage below 80% threshold. Consider adding tests and @tested_by annotations.`)
  }
}

/**
 * Parse command line arguments
 */
function parseOptions(): CoverageOptions {
  const args = parseArgs(Deno.args, {
    string: ['skip'],
    default: {
      skip: '',
    },
  })

  const skipPatterns = args.skip ? args.skip.split(',').map((s) => s.trim()).filter((s) => s.length > 0) : []

  return { skipPatterns }
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  try {
    const options = parseOptions()
    const result = await analyzeCoverage(options)
    displaySummary(result)

    // Exit with appropriate code for CI
    Deno.exit(result.success ? 0 : 1)
  } catch (error) {
    console.error('💥 Coverage analysis failed:', error)
    Deno.exit(1)
  }
}

// Run if executed directly
if (import.meta.main) {
  await main()
}
