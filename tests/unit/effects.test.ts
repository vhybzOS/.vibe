/**
 * Effect-TS Utilities Tests
 *
 * Tests for ure/lib/effects.ts
 * Validates Effect-TS wrappers around Deno APIs with proper error handling
 */

import { assertEquals, assertRejects } from '@std/assert'
import { Effect } from 'effect'
import { resolve } from '@std/path'
import {
  ensureDir,
  logWithContext,
  parseJSON,
  readDir,
  readTextFile,
  retryWithBackoff,
  type VibeError,
  withTimeout,
  writeTextFile,
} from '../../ure/lib/effects.ts'

// Use cross-platform temp directory instead of hard-coded /tmp
const TEST_DIR = await Deno.makeTempDir({ prefix: 'vibe_effects_test_' })
const TEST_FILE = resolve(TEST_DIR, 'test.txt')
const TEST_JSON_FILE = resolve(TEST_DIR, 'test.json')

Deno.test('Effects - readTextFile - valid file', async () => {
  // Create test directory and file
  await Deno.mkdir(TEST_DIR, { recursive: true })
  await Deno.writeTextFile(TEST_FILE, 'Hello, World!')

  const result = await Effect.runPromise(readTextFile(TEST_FILE))
  assertEquals(result, 'Hello, World!')

  // Cleanup
  await Deno.remove(TEST_DIR, { recursive: true })
})

Deno.test('Effects - readTextFile - non-existent file', async () => {
  const nonExistentFile = '/tmp/does-not-exist.txt'

  await assertRejects(
    () => Effect.runPromise(readTextFile(nonExistentFile)),
    Error,
    'Failed to read file',
  )
})

Deno.test('Effects - writeTextFile - create new file', async () => {
  const content = 'Test content'

  // Ensure directory exists first
  await Deno.mkdir(TEST_DIR, { recursive: true })

  await Effect.runPromise(writeTextFile(TEST_FILE, content))

  const written = await Deno.readTextFile(TEST_FILE)
  assertEquals(written, content)

  // Cleanup
  await Deno.remove(TEST_DIR, { recursive: true })
})

Deno.test('Effects - writeTextFile - overwrite existing file', async () => {
  const initialContent = 'Initial content'
  const newContent = 'New content'

  await Deno.mkdir(TEST_DIR, { recursive: true })
  await Deno.writeTextFile(TEST_FILE, initialContent)

  await Effect.runPromise(writeTextFile(TEST_FILE, newContent))

  const written = await Deno.readTextFile(TEST_FILE)
  assertEquals(written, newContent)

  // Cleanup
  await Deno.remove(TEST_DIR, { recursive: true })
})

Deno.test('Effects - ensureDir - create new directory', async () => {
  const newDir = `${TEST_DIR}/nested/deep/directory`

  await Effect.runPromise(ensureDir(newDir))

  const stat = await Deno.stat(newDir)
  assertEquals(stat.isDirectory, true)

  // Cleanup
  await Deno.remove(TEST_DIR, { recursive: true })
})

Deno.test('Effects - ensureDir - existing directory', async () => {
  await Deno.mkdir(TEST_DIR, { recursive: true })

  // Should not fail when directory already exists
  await Effect.runPromise(ensureDir(TEST_DIR))

  const stat = await Deno.stat(TEST_DIR)
  assertEquals(stat.isDirectory, true)

  // Cleanup
  await Deno.remove(TEST_DIR, { recursive: true })
})

Deno.test('Effects - readDir - valid directory', async () => {
  await Deno.mkdir(TEST_DIR, { recursive: true })
  await Deno.writeTextFile(`${TEST_DIR}/file1.txt`, 'content1')
  await Deno.writeTextFile(`${TEST_DIR}/file2.txt`, 'content2')
  await Deno.mkdir(`${TEST_DIR}/subdir`)

  const entries = await Effect.runPromise(readDir(TEST_DIR))

  assertEquals(entries.length, 3)
  const names = entries.map((e) => e.name).sort()
  assertEquals(names, ['file1.txt', 'file2.txt', 'subdir'])

  // Cleanup
  await Deno.remove(TEST_DIR, { recursive: true })
})

Deno.test('Effects - readDir - non-existent directory', async () => {
  const nonExistentDir = '/tmp/does-not-exist'

  await assertRejects(
    () => Effect.runPromise(readDir(nonExistentDir)),
    Error,
    'Failed to read directory',
  )
})

Deno.test('Effects - parseJSON - valid JSON', async () => {
  const jsonData = { name: 'test', value: 42, active: true }
  const jsonString = JSON.stringify(jsonData)

  const result = await Effect.runPromise(parseJSON(jsonString, 'test.json'))
  assertEquals(result, jsonData)
})

Deno.test('Effects - parseJSON - invalid JSON', async () => {
  const invalidJson = '{ name: "test", invalid syntax }'

  await assertRejects(
    () => Effect.runPromise(parseJSON(invalidJson, 'test.json')),
    Error,
    'Invalid JSON in test.json',
  )
})

Deno.test('Effects - parseJSON - with type assertion', async () => {
  interface TestData {
    name: string
    count: number
  }

  const jsonData = { name: 'test', count: 5 }
  const jsonString = JSON.stringify(jsonData)

  const result = await Effect.runPromise(parseJSON<TestData>(jsonString))
  assertEquals(result.name, 'test')
  assertEquals(result.count, 5)
})

Deno.test('Effects - logWithContext - creates formatted log', async () => {
  // Test that logWithContext creates an effect (we can't easily test console output)
  const logEffect = logWithContext('TEST', 'This is a test message')

  // Should not throw when run
  await Effect.runPromise(logEffect)
})

Deno.test('Effects - retryWithBackoff - succeeds on first try', async () => {
  let attempts = 0
  const successEffect = Effect.sync(() => {
    attempts++
    return 'success'
  })

  const result = await Effect.runPromise(retryWithBackoff(successEffect, 3))
  assertEquals(result, 'success')
  assertEquals(attempts, 1)
})

Deno.test('Effects - retryWithBackoff - succeeds after retries', async () => {
  let attempts = 0
  // Use Effect.async like docs example
  const eventualSuccessEffect = Effect.async<string, Error>((resume) => {
    attempts++
    if (attempts === 1) { // Fail on first attempt, succeed on retry
      resume(Effect.fail(new Error('Not yet')))
    } else {
      resume(Effect.succeed('success'))
    }
  })

  const result = await Effect.runPromise(retryWithBackoff(eventualSuccessEffect, 3))
  assertEquals(result, 'success')
  assertEquals(attempts, 2) // 1 initial + 1 retry (Effect.retry({ times: 2 }) allows up to 2 retries)
})

Deno.test('Effects - retryWithBackoff - fails after max attempts', async () => {
  let attempts = 0
  const alwaysFailEffect = Effect.async<string, Error>((resume) => {
    attempts++
    resume(Effect.fail(new Error('Always fails')))
  })

  await assertRejects(
    () => Effect.runPromise(retryWithBackoff(alwaysFailEffect, 2)),
    Error,
    'Always fails',
  )
  assertEquals(attempts, 2) // maxAttempts=2: 1 initial + (2-1) retries = 2 total attempts
})

Deno.test('Effects - withTimeout - completes within timeout', async () => {
  const fastEffect = Effect.sync(() => 'completed')

  const result = await Effect.runPromise(withTimeout(fastEffect, 1000))
  assertEquals(result, 'completed')
})

Deno.test('Effects - withTimeout - times out', async () => {
  // Use Effect.sleep instead of raw setTimeout to avoid timer leaks
  const slowEffect = Effect.sleep(200)

  await assertRejects(
    () => Effect.runPromise(withTimeout(slowEffect, 50)),
    Error,
    'Operation timed out after 50ms',
  )
})

Deno.test('Effects - integration test - file operations chain', async () => {
  const testData = { message: 'Hello from integration test', timestamp: Date.now() }

  await Deno.mkdir(TEST_DIR, { recursive: true })

  // Chain multiple effects together
  const result = await Effect.runPromise(
    Effect.gen(function* () {
      yield* ensureDir(TEST_DIR)
      yield* writeTextFile(TEST_JSON_FILE, JSON.stringify(testData))
      const content = yield* readTextFile(TEST_JSON_FILE)
      const parsed = yield* parseJSON<typeof testData>(content, TEST_JSON_FILE)
      return parsed
    }),
  )

  assertEquals(result.message, testData.message)
  assertEquals(result.timestamp, testData.timestamp)

  // Cleanup
  await Deno.remove(TEST_DIR, { recursive: true })
})
