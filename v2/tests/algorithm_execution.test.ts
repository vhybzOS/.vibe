/**
 * @tested_by Algorithm execution from markdown files
 * Tests the core capability of reading and executing .md algorithm files
 */

import { assertEquals, assertExists } from 'https://deno.land/std@0.208.0/assert/mod.ts'
import { AlgorithmExecutor } from '../algorithms/executor.ts'

Deno.test('Algorithm Executor - Parse main.md', async () => {
  const executor = new AlgorithmExecutor()
  const algorithm = await executor.loadAlgorithm('.vibe/algorithms/main.md')

  assertExists(algorithm)
  assertEquals(algorithm.type, 'main')
  assertExists(algorithm.steps)
})

Deno.test('Algorithm Executor - Execute specs-stage algorithm', async () => {
  const executor = new AlgorithmExecutor()
  const context = {
    user_request: 'Add authentication to the app',
    project_type: 'deno',
  }

  const result = await executor.execute('specs-stage', context)

  assertExists(result.specs_file)
  assertExists(result.high_level_algorithm)
  assertEquals(result.status, 'completed')
})

Deno.test('Algorithm Executor - Execute dev-9step algorithm', async () => {
  const executor = new AlgorithmExecutor()
  const context = {
    specs_file: '.vibe/specs/auth.md',
    current_step: 1,
  }

  const result = await executor.execute('dev-9step', context)

  assertExists(result.step_result)
  assertEquals(typeof result.next_step, 'number')
  assertEquals(result.status, 'in_progress')
})

Deno.test('Algorithm Executor - Context resumption', async () => {
  const executor = new AlgorithmExecutor()

  // Simulate context interruption at step 6
  const checkpoint = {
    algorithm: 'dev-9step',
    step: 6,
    context: { feature: 'auth', completed_tests: ['unit', 'integration'] },
  }

  const result = await executor.resumeFromCheckpoint(checkpoint)

  assertEquals(result.resumed_step, 6)
  assertExists(result.minimal_context)
  assertEquals(result.context_size < checkpoint.context_size, true)
})
