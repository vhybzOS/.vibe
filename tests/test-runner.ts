/**
 * Test Runner for .vibe Project
 * 
 * Organizes and runs all test suites: unit, integration, and user tests
 */

import { parseArgs } from '@std/cli/parse-args'

const TEST_CATEGORIES = {
  unit: 'tests/unit/**/*.test.ts',
  integration: 'tests/integration/**/*.test.ts', 
  user: 'tests/user/**/*.test.ts',
  all: 'tests/**/*.test.ts'
} as const

type TestCategory = keyof typeof TEST_CATEGORIES

async function runTests(category: TestCategory, options: { verbose?: boolean; fail_fast?: boolean } = {}) {
  const pattern = TEST_CATEGORIES[category]
  
  console.log(`🧪 Running ${category} tests...`)
  console.log(`   Pattern: ${pattern}`)
  console.log()

  const args = [
    'test',
    '--allow-all',
    pattern
  ]

  if (options.verbose) {
    args.push('--reporter=verbose')
  }

  if (options.fail_fast) {
    args.push('--fail-fast')
  }

  const command = new Deno.Command('deno', {
    args,
    stdout: 'inherit',
    stderr: 'inherit'
  })

  const { success } = await command.output()
  
  if (success) {
    console.log(`✅ ${category} tests passed`)
  } else {
    console.log(`❌ ${category} tests failed`)
  }
  
  return success
}

async function main() {
  const args = parseArgs(Deno.args, {
    string: ['category'],
    boolean: ['verbose', 'fail-fast', 'help'],
    default: {
      category: 'all',
      verbose: false,
      'fail-fast': false
    },
    alias: {
      c: 'category',
      v: 'verbose',
      f: 'fail-fast',
      h: 'help'
    }
  })

  if (args.help) {
    console.log(`
🧪 Vibe Test Runner

Usage: deno run --allow-all tests/test-runner.ts [options]

Options:
  -c, --category <type>   Test category to run (unit|integration|user|all) [default: all]
  -v, --verbose          Verbose test output
  -f, --fail-fast        Stop on first test failure
  -h, --help             Show this help message

Examples:
  deno run --allow-all tests/test-runner.ts                    # Run all tests
  deno run --allow-all tests/test-runner.ts -c unit           # Run only unit tests
  deno run --allow-all tests/test-runner.ts -c user -v        # Run user tests with verbose output
  deno run --allow-all tests/test-runner.ts -f                # Run all tests, stop on first failure
`)
    return
  }

  const category = args.category as TestCategory
  
  if (!TEST_CATEGORIES[category]) {
    console.error(`❌ Invalid test category: ${category}`)
    console.error(`Available categories: ${Object.keys(TEST_CATEGORIES).join(', ')}`)
    Deno.exit(1)
  }

  console.log(`🚀 Vibe Test Suite`)
  console.log(`   Category: ${category}`)
  console.log(`   Verbose: ${args.verbose}`)
  console.log(`   Fail Fast: ${args['fail-fast']}`)
  console.log()

  const startTime = Date.now()
  
  let success = false
  
  if (category === 'all') {
    // Run all test categories in sequence
    const unitSuccess = await runTests('unit', args)
    const integrationSuccess = await runTests('integration', args)
    const userSuccess = await runTests('user', args)
    
    success = unitSuccess && integrationSuccess && userSuccess
    
    console.log()
    console.log('📊 Test Summary:')
    console.log(`   Unit Tests: ${unitSuccess ? '✅' : '❌'}`)
    console.log(`   Integration Tests: ${integrationSuccess ? '✅' : '❌'}`) 
    console.log(`   User Tests: ${userSuccess ? '✅' : '❌'}`)
  } else {
    success = await runTests(category, args)
  }

  const duration = Date.now() - startTime
  
  console.log()
  console.log(`⏱️  Tests completed in ${duration}ms`)
  
  if (success) {
    console.log('🎉 All tests passed!')
    Deno.exit(0)
  } else {
    console.log('💥 Some tests failed!')
    Deno.exit(1)
  }
}

if (import.meta.main) {
  main().catch((error) => {
    console.error('❌ Test runner failed:', error)
    Deno.exit(1)
  })
}