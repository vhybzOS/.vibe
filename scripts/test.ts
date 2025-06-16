#!/usr/bin/env -S deno run --allow-all

/**
 * 🧪 .vibe Test Runner
 * 
 * Comprehensive test runner that validates all system components
 * without requiring human supervision.
 * 
 * Usage:
 *   deno run --allow-all scripts/test.ts [--quick|--full|--perf]
 */

import { parse } from 'jsr:@std/flags'

interface TestResult {
  name: string
  passed: boolean
  duration: number
  output?: string
  error?: string
}

interface TestSuite {
  name: string
  results: TestResult[]
  totalDuration: number
  passed: number
  failed: number
}

class TestRunner {
  private results: TestSuite[] = []
  private startTime = 0
  
  async run(mode: 'quick' | 'full' | 'perf' = 'quick') {
    console.log('🧪 .vibe Test Runner')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('')
    
    this.startTime = performance.now()
    
    try {
      switch (mode) {
        case 'quick':
          await this.runQuickTests()
          break
        case 'full':
          await this.runFullTests()
          break
        case 'perf':
          await this.runPerformanceTests()
          break
      }
      
      this.printSummary()
      this.exitWithCode()
    } catch (error) {
      console.error('❌ Test runner failed:', error instanceof Error ? error.message : String(error))
      Deno.exit(1)
    }
  }
  
  private async runQuickTests() {
    console.log('⚡ Quick Test Mode - Essential functionality only')
    console.log('')
    
    await this.runTestSuite('Schema Validation', [
      'tests/unit/schemas.test.ts'
    ])
    
    await this.runTestSuite('Core Integration', [
      'tests/integration.test.ts'
    ])
    
    await this.runTestSuite('CLI Smoke Tests', [
      'tests/e2e/cli.test.ts --filter="should show help"',
      'tests/e2e/cli.test.ts --filter="should initialize .vibe"'
    ])
  }
  
  private async runFullTests() {
    console.log('🔬 Full Test Mode - Complete validation')
    console.log('')
    
    await this.runTestSuite('Unit Tests', [
      'tests/unit/schemas.test.ts',
      'tests/unit/core.test.ts'
    ])
    
    await this.runTestSuite('Integration Tests', [
      'tests/integration.test.ts'
    ])
    
    await this.runTestSuite('CLI Tests', [
      'tests/e2e/cli.test.ts'
    ])
    
    await this.runTestSuite('Daemon Tests', [
      'tests/e2e/daemon.test.ts'
    ])
  }
  
  private async runPerformanceTests() {
    console.log('🏃 Performance Test Mode - Benchmarking')
    console.log('')
    
    await this.runTestSuite('Performance Benchmarks', [
      'tests/performance/benchmark.test.ts'
    ])
  }
  
  private async runTestSuite(suiteName: string, testFiles: string[]) {
    console.log(`📋 Running ${suiteName}...`)
    
    const suite: TestSuite = {
      name: suiteName,
      results: [],
      totalDuration: 0,
      passed: 0,
      failed: 0
    }
    
    for (const testFile of testFiles) {
      const result = await this.runSingleTest(testFile)
      suite.results.push(result)
      suite.totalDuration += result.duration
      
      if (result.passed) {
        suite.passed++
        console.log(`  ✅ ${result.name} (${result.duration.toFixed(0)}ms)`)
      } else {
        suite.failed++
        console.log(`  ❌ ${result.name} (${result.duration.toFixed(0)}ms)`)
        if (result.error) {
          console.log(`     ${result.error}`)
        }
      }
    }
    
    this.results.push(suite)
    console.log(`📊 ${suiteName}: ${suite.passed} passed, ${suite.failed} failed (${suite.totalDuration.toFixed(0)}ms)`)
    console.log('')
  }
  
  private async runSingleTest(testFile: string): Promise<TestResult> {
    const [file, ...filterArgs] = testFile.split(' ')
    const testName = file?.split('/').pop()?.replace('.test.ts', '') || file || 'unknown'
    
    const startTime = performance.now()
    
    try {
      const command = new Deno.Command(Deno.execPath(), {
        args: [
          'test',
          '--allow-all',
          '--quiet',
          file || 'unknown',
          ...filterArgs
        ],
        stdout: 'piped',
        stderr: 'piped',
        env: {
          // Disable colors for cleaner output
          NO_COLOR: '1',
          DENO_TESTING: '1'
        }
      })
      
      const { code, stdout, stderr } = await command.output()
      const duration = performance.now() - startTime
      
      const output = new TextDecoder().decode(stdout)
      const error = new TextDecoder().decode(stderr)
      
      return {
        name: testName || 'unknown',
        passed: code === 0,
        duration,
        ...(output && { output }),
        ...(error && { error })
      }
    } catch (err) {
      const duration = performance.now() - startTime
      return {
        name: testName || 'unknown',
        passed: false,
        duration,
        error: err instanceof Error ? err.message : String(err)
      }
    }
  }
  
  private printSummary() {
    const totalDuration = performance.now() - this.startTime
    const totalPassed = this.results.reduce((sum, suite) => sum + suite.passed, 0)
    const totalFailed = this.results.reduce((sum, suite) => sum + suite.failed, 0)
    const totalTests = totalPassed + totalFailed
    
    console.log('📊 Test Summary')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    for (const suite of this.results) {
      const icon = suite.failed === 0 ? '✅' : '❌'
      console.log(`${icon} ${suite.name}: ${suite.passed}/${suite.passed + suite.failed} passed`)
    }
    
    console.log('')
    console.log(`🎯 Total: ${totalPassed}/${totalTests} tests passed`)
    console.log(`⏱️  Duration: ${totalDuration.toFixed(0)}ms`)
    
    if (totalFailed === 0) {
      console.log('')
      console.log('🎉 All tests passed! Ready to commit.')
    } else {
      console.log('')
      console.log(`❌ ${totalFailed} test(s) failed. Check output above.`)
    }
  }
  
  private exitWithCode() {
    const totalFailed = this.results.reduce((sum, suite) => sum + suite.failed, 0)
    Deno.exit(totalFailed === 0 ? 0 : 1)
  }
}

// Main execution
if (import.meta.main) {
  const args = parse(Deno.args, {
    boolean: ['quick', 'full', 'perf', 'help'],
    default: { quick: false, full: false, perf: false, help: false }
  })
  
  if (args.help) {
    console.log(`
🧪 .vibe Test Runner

Usage:
  deno run --allow-all scripts/test.ts [options]

Options:
  --quick    Run essential tests only (default)
  --full     Run complete test suite  
  --perf     Run performance benchmarks
  --help     Show this help

Examples:
  deno run --allow-all scripts/test.ts           # Quick tests
  deno run --allow-all scripts/test.ts --full    # Full suite
  deno run --allow-all scripts/test.ts --perf    # Benchmarks
`)
    Deno.exit(0)
  }
  
  const runner = new TestRunner()
  
  let mode: 'quick' | 'full' | 'perf' = 'quick'
  if (args.full) mode = 'full'
  else if (args.perf) mode = 'perf'
  
  await runner.run(mode)
}