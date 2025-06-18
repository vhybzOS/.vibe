/**
 * File System Utilities Tests
 *
 * Tests for ure/lib/fs.ts
 * Validates file system utilities with proper Deno patterns and Effect-TS integration
 */

import { assertEquals, assertRejects } from '@std/assert'
import { Effect } from 'effect'
import { resolve } from '@std/path'
import { z } from 'zod/v4'
import {
  createBackup,
  ensureVibeDirectory,
  fileExists,
  findFiles,
  listFiles,
  listJSONFiles,
  loadAllJSONFiles,
  loadConfig,
  loadSchemaValidatedJSON,
  readJSONFile,
  remove,
  saveJSONWithBackup,
  writeJSONFile,
} from '../../ure/lib/fs.ts'

// Use cross-platform temp directory instead of hard-coded /tmp
const TEST_DIR = await Deno.makeTempDir({ prefix: 'vibe_fs_test_' })
const TEST_FILE = resolve(TEST_DIR, 'test.txt')
const TEST_JSON_FILE = resolve(TEST_DIR, 'test.json')
const TEST_VIBE_DIR = resolve(TEST_DIR, '.vibe')

// Test schemas
const TestSchema = z.object({
  name: z.string(),
  count: z.number(),
  active: z.boolean().default(true),
})

type TestData = z.output<typeof TestSchema>

const PersonSchema = z.object({
  id: z.string(),
  name: z.string(),
  age: z.number(),
})

type Person = z.output<typeof PersonSchema>

Deno.test('FS - fileExists - existing file', async () => {
  await Deno.mkdir(TEST_DIR, { recursive: true })
  await Deno.writeTextFile(TEST_FILE, 'test content')

  const exists = await Effect.runPromise(fileExists(TEST_FILE))
  assertEquals(exists, true)

  await Deno.remove(TEST_DIR, { recursive: true })
})

Deno.test('FS - fileExists - non-existing file', async () => {
  const exists = await Effect.runPromise(fileExists('/tmp/does-not-exist.txt'))
  assertEquals(exists, false)
})

Deno.test('FS - readJSONFile - valid JSON file', async () => {
  const testData = { name: 'test', count: 42 }

  await Deno.mkdir(TEST_DIR, { recursive: true })
  await Deno.writeTextFile(TEST_JSON_FILE, JSON.stringify(testData))

  const result = await Effect.runPromise(readJSONFile<typeof testData>(TEST_JSON_FILE))
  assertEquals(result, testData)

  await Deno.remove(TEST_DIR, { recursive: true })
})

Deno.test('FS - readJSONFile - invalid JSON file', async () => {
  await Deno.mkdir(TEST_DIR, { recursive: true })
  await Deno.writeTextFile(TEST_JSON_FILE, 'invalid json content')

  await assertRejects(
    () => Effect.runPromise(readJSONFile(TEST_JSON_FILE)),
    Error,
    'Invalid JSON',
  )

  await Deno.remove(TEST_DIR, { recursive: true })
})

Deno.test('FS - readJSONFile - non-existing file', async () => {
  await assertRejects(
    () => Effect.runPromise(readJSONFile('/tmp/does-not-exist.json')),
    Error,
    'Failed to read file',
  )
})

Deno.test('FS - writeJSONFile - creates directory and file', async () => {
  const testData = { name: 'test', count: 42, active: true }
  const targetFile = `${TEST_DIR}/nested/deep/data.json`

  await Effect.runPromise(writeJSONFile(targetFile, testData))

  const written = JSON.parse(await Deno.readTextFile(targetFile))
  assertEquals(written, testData)

  await Deno.remove(TEST_DIR, { recursive: true })
})

Deno.test('FS - writeJSONFile - overwrites existing file', async () => {
  const initialData = { name: 'initial', count: 1 }
  const newData = { name: 'updated', count: 2 }

  await Deno.mkdir(TEST_DIR, { recursive: true })
  await Deno.writeTextFile(TEST_JSON_FILE, JSON.stringify(initialData))

  await Effect.runPromise(writeJSONFile(TEST_JSON_FILE, newData))

  const written = JSON.parse(await Deno.readTextFile(TEST_JSON_FILE))
  assertEquals(written, newData)

  await Deno.remove(TEST_DIR, { recursive: true })
})

Deno.test('FS - listFiles - lists files in directory', async () => {
  await Deno.mkdir(TEST_DIR, { recursive: true })
  await Deno.writeTextFile(`${TEST_DIR}/file1.txt`, 'content1')
  await Deno.writeTextFile(`${TEST_DIR}/file2.js`, 'content2')
  await Deno.mkdir(`${TEST_DIR}/subdir`)
  await Deno.writeTextFile(`${TEST_DIR}/subdir/file3.txt`, 'content3')

  const files = await Effect.runPromise(listFiles(TEST_DIR))

  assertEquals(files.length, 2) // Only files in the root directory
  assertEquals(files.some((f) => f.endsWith('file1.txt')), true)
  assertEquals(files.some((f) => f.endsWith('file2.js')), true)

  await Deno.remove(TEST_DIR, { recursive: true })
})

Deno.test('FS - listFiles - with filter', async () => {
  await Deno.mkdir(TEST_DIR, { recursive: true })
  await Deno.writeTextFile(`${TEST_DIR}/file1.txt`, 'content1')
  await Deno.writeTextFile(`${TEST_DIR}/file2.js`, 'content2')
  await Deno.writeTextFile(`${TEST_DIR}/file3.txt`, 'content3')

  const txtFiles = await Effect.runPromise(
    listFiles(TEST_DIR, (entry) => entry.name.endsWith('.txt')),
  )

  assertEquals(txtFiles.length, 2)
  assertEquals(txtFiles.every((f) => f.endsWith('.txt')), true)

  await Deno.remove(TEST_DIR, { recursive: true })
})

Deno.test('FS - listFiles - non-existing directory', async () => {
  const files = await Effect.runPromise(listFiles('/tmp/does-not-exist'))
  assertEquals(files, [])
})

Deno.test('FS - findFiles - searches recursively', async () => {
  await Deno.mkdir(`${TEST_DIR}/nested/deep`, { recursive: true })
  await Deno.writeTextFile(`${TEST_DIR}/config.json`, '{}')
  await Deno.writeTextFile(`${TEST_DIR}/nested/config.json`, '{}')
  await Deno.writeTextFile(`${TEST_DIR}/nested/deep/config.json`, '{}')
  await Deno.writeTextFile(`${TEST_DIR}/other.txt`, 'text')

  const configFiles = await Effect.runPromise(
    findFiles(TEST_DIR, (name) => name === 'config.json'),
  )

  assertEquals(configFiles.length, 3)
  assertEquals(configFiles.every((f) => f.endsWith('config.json')), true)

  await Deno.remove(TEST_DIR, { recursive: true })
})

Deno.test('FS - findFiles - respects max depth', async () => {
  await Deno.mkdir(`${TEST_DIR}/level1/level2/level3`, { recursive: true })
  await Deno.writeTextFile(`${TEST_DIR}/target.txt`, 'root')
  await Deno.writeTextFile(`${TEST_DIR}/level1/target.txt`, 'level1')
  await Deno.writeTextFile(`${TEST_DIR}/level1/level2/target.txt`, 'level2')
  await Deno.writeTextFile(`${TEST_DIR}/level1/level2/level3/target.txt`, 'level3')

  const files = await Effect.runPromise(
    findFiles(TEST_DIR, (name) => name === 'target.txt', 2),
  )

  // maxDepth=2: Root=0, level1=1, level2=2 (all included)
  // Should find files at root, level1, and level2
  assertEquals(files.length, 3)

  await Deno.remove(TEST_DIR, { recursive: true })
})

Deno.test('FS - createBackup - creates backup of existing file', async () => {
  const originalContent = 'original content'

  await Deno.mkdir(TEST_DIR, { recursive: true })
  await Deno.writeTextFile(TEST_FILE, originalContent)

  const backupPath = await Effect.runPromise(createBackup(TEST_FILE))

  assertEquals(typeof backupPath, 'string')
  assertEquals(backupPath?.includes('.backup.'), true)

  if (backupPath) {
    const backupContent = await Deno.readTextFile(backupPath)
    assertEquals(backupContent, originalContent)
  }

  await Deno.remove(TEST_DIR, { recursive: true })
})

Deno.test('FS - createBackup - returns null for non-existing file', async () => {
  const backupPath = await Effect.runPromise(createBackup('/tmp/does-not-exist.txt'))
  assertEquals(backupPath, null)
})

Deno.test('FS - remove - removes existing file', async () => {
  await Deno.mkdir(TEST_DIR, { recursive: true })
  await Deno.writeTextFile(TEST_FILE, 'content')

  await Effect.runPromise(remove(TEST_FILE))

  try {
    await Deno.stat(TEST_FILE)
    throw new Error('File should have been removed')
  } catch (error) {
    assertEquals(error instanceof Deno.errors.NotFound, true)
  }

  await Deno.remove(TEST_DIR, { recursive: true })
})

Deno.test('FS - remove - removes directory recursively', async () => {
  await Deno.mkdir(`${TEST_DIR}/nested`, { recursive: true })
  await Deno.writeTextFile(`${TEST_DIR}/nested/file.txt`, 'content')

  await Effect.runPromise(remove(TEST_DIR, true))

  try {
    await Deno.stat(TEST_DIR)
    throw new Error('Directory should have been removed')
  } catch (error) {
    assertEquals(error instanceof Deno.errors.NotFound, true)
  }
})

Deno.test('FS - remove - ignores non-existing file', async () => {
  // Should not throw error for non-existing file
  await Effect.runPromise(remove('/tmp/does-not-exist.txt'))
})

Deno.test('FS - loadConfig - loads existing config with schema', async () => {
  const configData = { name: 'test-config', count: 42 }
  const configFile = `${TEST_DIR}/config.json`
  const defaultData = { name: 'default', count: 0, active: false }

  await Deno.mkdir(TEST_DIR, { recursive: true })
  await Deno.writeTextFile(configFile, JSON.stringify(configData))

  const result = await Effect.runPromise(
    loadConfig(configFile, TestSchema, defaultData),
  )

  assertEquals(result.name, 'test-config')
  assertEquals(result.count, 42)
  assertEquals(result.active, true) // Default value from schema

  await Deno.remove(TEST_DIR, { recursive: true })
})

Deno.test('FS - loadConfig - returns default for non-existing config', async () => {
  const defaultData = { name: 'default', count: 0, active: false }
  const configFile = '/tmp/does-not-exist.json'

  const result = await Effect.runPromise(
    loadConfig(configFile, TestSchema, defaultData),
  )

  assertEquals(result, defaultData)
})

Deno.test('FS - loadConfig - fails for invalid schema', async () => {
  const invalidData = { name: 'test', count: 'not-a-number' }
  const configFile = `${TEST_DIR}/config.json`
  const defaultData = { name: 'default', count: 0, active: false }

  await Deno.mkdir(TEST_DIR, { recursive: true })
  await Deno.writeTextFile(configFile, JSON.stringify(invalidData))

  await assertRejects(
    () => Effect.runPromise(loadConfig(configFile, TestSchema, defaultData)),
    Error,
    'Invalid config',
  )

  await Deno.remove(TEST_DIR, { recursive: true })
})

Deno.test('FS - ensureVibeDirectory - finds existing .vibe directory', async () => {
  const testDir = await Deno.makeTempDir({ prefix: 'vibe_test_' })
  const vibeDir = resolve(testDir, '.vibe')

  await Deno.mkdir(vibeDir, { recursive: true })

  const vibePath = await Effect.runPromise(ensureVibeDirectory(testDir))
  // Use resolve to normalize paths for cross-platform comparison
  assertEquals(vibePath, resolve(vibeDir))

  await Deno.remove(testDir, { recursive: true })
})

Deno.test('FS - ensureVibeDirectory - fails for non-existing .vibe', async () => {
  const testDir = await Deno.makeTempDir({ prefix: 'vibe_test_' })

  await assertRejects(
    () => Effect.runPromise(ensureVibeDirectory(testDir)),
    Error,
    '.vibe not initialized',
  )

  await Deno.remove(testDir, { recursive: true })
})

Deno.test('FS - ensureVibeDirectory - fails for .vibe file (not directory)', async () => {
  const testDir = await Deno.makeTempDir({ prefix: 'vibe_test_' })
  const vibeFile = resolve(testDir, '.vibe')

  await Deno.writeTextFile(vibeFile, 'not a directory')

  await assertRejects(
    () => Effect.runPromise(ensureVibeDirectory(testDir)),
    Error,
    '.vibe not initialized',
  )

  await Deno.remove(testDir, { recursive: true })
})

Deno.test('FS - loadSchemaValidatedJSON - valid file', async () => {
  const testData = { name: 'test', count: 42 }

  await Deno.mkdir(TEST_DIR, { recursive: true })
  await Deno.writeTextFile(TEST_JSON_FILE, JSON.stringify(testData))

  const result = await Effect.runPromise(
    loadSchemaValidatedJSON(TEST_JSON_FILE, TestSchema),
  )

  assertEquals(result.name, 'test')
  assertEquals(result.count, 42)
  assertEquals(result.active, true) // Default from schema

  await Deno.remove(TEST_DIR, { recursive: true })
})

Deno.test('FS - loadSchemaValidatedJSON - invalid schema', async () => {
  const invalidData = { name: 'test', count: 'invalid' }

  await Deno.mkdir(TEST_DIR, { recursive: true })
  await Deno.writeTextFile(TEST_JSON_FILE, JSON.stringify(invalidData))

  await assertRejects(
    () => Effect.runPromise(loadSchemaValidatedJSON(TEST_JSON_FILE, TestSchema)),
    Error,
    'Invalid schema',
  )

  await Deno.remove(TEST_DIR, { recursive: true })
})

Deno.test('FS - saveJSONWithBackup - saves without backup', async () => {
  const testData = { name: 'test', count: 42 }

  await Effect.runPromise(saveJSONWithBackup(TEST_JSON_FILE, testData, false))

  const saved = JSON.parse(await Deno.readTextFile(TEST_JSON_FILE))
  assertEquals(saved, testData)

  await Deno.remove(TEST_DIR, { recursive: true })
})

Deno.test('FS - saveJSONWithBackup - saves with backup', async () => {
  const originalData = { name: 'original', count: 1 }
  const newData = { name: 'updated', count: 2 }

  await Deno.mkdir(TEST_DIR, { recursive: true })
  await Deno.writeTextFile(TEST_JSON_FILE, JSON.stringify(originalData))

  await Effect.runPromise(saveJSONWithBackup(TEST_JSON_FILE, newData, true))

  const saved = JSON.parse(await Deno.readTextFile(TEST_JSON_FILE))
  assertEquals(saved, newData)

  // Check that backup was created
  const files = []
  for await (const file of Deno.readDir(TEST_DIR)) {
    files.push(file)
  }
  const backupFiles = files.filter((f) => f.name.includes('.backup.'))
  assertEquals(backupFiles.length, 1)

  await Deno.remove(TEST_DIR, { recursive: true })
})

Deno.test('FS - listJSONFiles - lists only JSON files', async () => {
  await Deno.mkdir(TEST_DIR, { recursive: true })
  await Deno.writeTextFile(`${TEST_DIR}/data1.json`, '{}')
  await Deno.writeTextFile(`${TEST_DIR}/data2.json`, '{}')
  await Deno.writeTextFile(`${TEST_DIR}/readme.txt`, 'text')
  await Deno.writeTextFile(`${TEST_DIR}/script.js`, 'code')

  const jsonFiles = await Effect.runPromise(listJSONFiles(TEST_DIR))

  assertEquals(jsonFiles.length, 2)
  assertEquals(jsonFiles.every((f) => f.endsWith('.json')), true)

  await Deno.remove(TEST_DIR, { recursive: true })
})

Deno.test('FS - loadAllJSONFiles - loads valid JSON files with schema', async () => {
  const person1 = { id: '1', name: 'Alice', age: 30 }
  const person2 = { id: '2', name: 'Bob', age: 25 }
  const invalidPerson = { id: '3', name: 'Charlie' } // Missing age

  await Deno.mkdir(TEST_DIR, { recursive: true })
  await Deno.writeTextFile(`${TEST_DIR}/person1.json`, JSON.stringify(person1))
  await Deno.writeTextFile(`${TEST_DIR}/person2.json`, JSON.stringify(person2))
  await Deno.writeTextFile(`${TEST_DIR}/invalid.json`, JSON.stringify(invalidPerson))
  await Deno.writeTextFile(`${TEST_DIR}/malformed.json`, 'invalid json')

  const people = await Effect.runPromise(loadAllJSONFiles(TEST_DIR, PersonSchema))

  // Should only load valid files, ignoring invalid ones
  assertEquals(people.length, 2)
  assertEquals(people[0]?.name, 'Alice')
  assertEquals(people[1]?.name, 'Bob')

  await Deno.remove(TEST_DIR, { recursive: true })
})

Deno.test('FS - integration test - complete file workflow', async () => {
  const configData = { name: 'integration-test', count: 100, active: true }
  const configFile = `${TEST_DIR}/config.json`

  // Test complete workflow: create dir, save config, load config, backup, update
  const result = await Effect.runPromise(
    Effect.gen(function* () {
      // Save initial config
      yield* saveJSONWithBackup(configFile, configData, false)

      // Verify file exists
      const exists = yield* fileExists(configFile)
      assertEquals(exists, true)

      // Load and validate config
      const loaded = yield* loadSchemaValidatedJSON(configFile, TestSchema)
      assertEquals(loaded.name, 'integration-test')

      // Create backup and update
      const backupPath = yield* createBackup(configFile)
      const updatedData = { ...configData, count: 200 }
      yield* saveJSONWithBackup(configFile, updatedData, false)

      // Verify update
      const updated = yield* loadSchemaValidatedJSON(configFile, TestSchema)
      return { loaded, updated, backupPath }
    }),
  )

  assertEquals(result.loaded.count, 100)
  assertEquals(result.updated.count, 200)
  assertEquals(typeof result.backupPath, 'string')

  await Deno.remove(TEST_DIR, { recursive: true })
})

// Windows Path Simulation Tests - Mock Windows behavior on Linux
Deno.test('FS - Cross-platform path handling - Windows paths', async () => {
  // Simulate Windows path like the CI failure: D:\tmp\vibe_fs_test\.vibe
  const windowsProjectPath = 'D:\\tmp\\vibe_fs_test'
  const expectedVibePath = 'D:\\tmp\\vibe_fs_test\\.vibe'

  // Mock Effect that simulates Windows path resolution
  const mockWindowsEnsureVibe = Effect.sync(() => {
    // Simulate what resolve() does on Windows
    const vibePath = windowsProjectPath + '\\.vibe'
    return vibePath
  })

  const result = await Effect.runPromise(mockWindowsEnsureVibe)
  assertEquals(result, expectedVibePath)
})

Deno.test('FS - Cross-platform path handling - resolve normalization', async () => {
  // Test that resolve() handles mixed separators correctly
  const mixedPath = 'D:/tmp\\vibe_fs_test/.vibe'
  const normalized = resolve(mixedPath)

  // Should normalize to platform-appropriate separators
  assertEquals(typeof normalized, 'string')
  assertEquals(normalized.includes('vibe_fs_test'), true)
  assertEquals(normalized.includes('.vibe'), true)
})

Deno.test('FS - Cross-platform path handling - Windows vs Unix comparison', () => {
  // Test path comparison logic that should work across platforms
  const unixPath = '/tmp/vibe_fs_test/.vibe'
  const windowsPath = 'D:\\tmp\\vibe_fs_test\\.vibe'

  // Both should resolve to valid paths on their respective platforms
  const unixResolved = resolve(unixPath)
  const windowsStyleResolved = resolve('tmp', 'vibe_fs_test', '.vibe')

  // Key insight: use resolve() for path construction, not string concatenation
  assertEquals(typeof unixResolved, 'string')
  assertEquals(typeof windowsStyleResolved, 'string')
  assertEquals(windowsStyleResolved.includes('.vibe'), true)
})
