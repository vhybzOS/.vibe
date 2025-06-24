/**
 * TOML Parser Service Tests
 *
 * Tests for ure/parsers/toml-parser.ts
 * Validates TOML parsing, schema validation, and error handling
 */

import { assertEquals, assertRejects } from '@std/assert'
import { z } from 'zod/v4'
import { Effect } from 'effect'
import {
  mergeTomlObjects,
  parseTomlRaw,
  parseTomlWithSchema,
  stringifyToToml,
  type TomlObject,
  updateTomlSection,
} from '../../ure/parsers/toml-parser.ts'

// Test schema for validation
const TestSchema = z.object({
  name: z.string(),
  version: z.string(),
  enabled: z.boolean().default(true),
  tags: z.array(z.string()).default([]),
})

Deno.test('TOML Parser - parseTomlWithSchema - valid TOML with valid schema', async () => {
  const tomlContent = `
name = "test-package"
version = "1.0.0"
enabled = true
tags = ["web", "api"]
`

  const result = await Effect.runPromise(
    parseTomlWithSchema(tomlContent, TestSchema, 'test.toml'),
  )

  assertEquals(result.name, 'test-package')
  assertEquals(result.version, '1.0.0')
  assertEquals(result.enabled, true)
  assertEquals(result.tags, ['web', 'api'])
})

Deno.test('TOML Parser - parseTomlWithSchema - valid TOML with defaults', async () => {
  const tomlContent = `
name = "test-package"
version = "1.0.0"
`

  const result = await Effect.runPromise(
    parseTomlWithSchema(tomlContent, TestSchema, 'test.toml'),
  )

  assertEquals(result.name, 'test-package')
  assertEquals(result.version, '1.0.0')
  assertEquals(result.enabled, true) // default value
  assertEquals(result.tags, []) // default value
})

Deno.test('TOML Parser - parseTomlWithSchema - invalid TOML syntax', async () => {
  const invalidToml = `
name = "test-package
version = 1.0.0 # missing quotes
`

  await assertRejects(
    () =>
      Effect.runPromise(
        parseTomlWithSchema(invalidToml, TestSchema, 'test.toml'),
      ),
    Error,
    'Failed to parse TOML at test.toml',
  )
})

Deno.test('TOML Parser - parseTomlWithSchema - valid TOML but invalid schema', async () => {
  const tomlContent = `
name = "test-package"
version = 123  # Should be string
enabled = "yes"  # Should be boolean
`

  await assertRejects(
    () =>
      Effect.runPromise(
        parseTomlWithSchema(tomlContent, TestSchema, 'test.toml'),
      ),
    Error,
    'Invalid TOML schema at test.toml',
  )
})

Deno.test('TOML Parser - parseTomlRaw - valid TOML', async () => {
  const tomlContent = `
[meta]
version = "1.0.0"
count = 42

[rules]
enabled = true
`

  const result = await Effect.runPromise(
    parseTomlRaw(tomlContent, 'test.toml'),
  )

  assertEquals(result.meta, { version: '1.0.0', count: 42 })
  assertEquals(result.rules, { enabled: true })
})

Deno.test('TOML Parser - stringifyToToml - simple object', async () => {
  const data = {
    name: 'test-package',
    version: '1.0.0',
    enabled: true,
    tags: ['web', 'api'],
  }

  const result = await Effect.runPromise(stringifyToToml(data))

  // Should contain the key-value pairs (exact format may vary)
  assertEquals(result.includes('name = "test-package"'), true)
  assertEquals(result.includes('version = "1.0.0"'), true)
  assertEquals(result.includes('enabled = true'), true)
})

Deno.test('TOML Parser - stringifyToToml - nested object', async () => {
  const data = {
    meta: {
      version: '1.0.0',
      count: 5,
    },
    rules: {
      enabled: true,
    },
  }

  const result = await Effect.runPromise(stringifyToToml(data))

  // Should contain section headers
  assertEquals(result.includes('[meta]'), true)
  assertEquals(result.includes('[rules]'), true)
  assertEquals(result.includes('version = "1.0.0"'), true)
  assertEquals(result.includes('enabled = true'), true)
})

Deno.test('TOML Parser - updateTomlSection - update existing section', async () => {
  const originalToml = `
[meta]
version = "1.0.0"
count = 5

[rules]
enabled = true
`

  const newData = { version: '2.0.0', count: 10 }

  const result = await Effect.runPromise(
    updateTomlSection(originalToml, 'meta', newData),
  )

  // Parse the result to verify update
  const parsed = await Effect.runPromise(parseTomlRaw(result))
  assertEquals(parsed.meta, { version: '2.0.0', count: 10 })
  assertEquals(parsed.rules, { enabled: true }) // Should remain unchanged
})

Deno.test('TOML Parser - updateTomlSection - create new section', async () => {
  const originalToml = `
[meta]
version = "1.0.0"
`

  const newData = { enabled: true, priority: 'high' }

  const result = await Effect.runPromise(
    updateTomlSection(originalToml, 'rules', newData),
  )

  // Parse the result to verify new section
  const parsed = await Effect.runPromise(parseTomlRaw(result))
  assertEquals(parsed.meta, { version: '1.0.0' })
  assertEquals(parsed.rules, { enabled: true, priority: 'high' })
})

Deno.test('TOML Parser - updateTomlSection - nested section path', async () => {
  const originalToml = `
[meta]
version = "1.0.0"

[dependencies.hono]
version = "4.0.0"
`

  const newData = { version: '4.2.0', registry: 'npm' }

  const result = await Effect.runPromise(
    updateTomlSection(originalToml, 'dependencies.hono', newData),
  )

  // Parse the result to verify nested update
  const parsed = await Effect.runPromise(parseTomlRaw(result))
  assertEquals(parsed.meta, { version: '1.0.0' })
  const dependencies = parsed.dependencies as TomlObject
  assertEquals(dependencies?.hono, { version: '4.2.0', registry: 'npm' })
})

Deno.test('TOML Parser - mergeTomlObjects - shallow merge', () => {
  const base: TomlObject = {
    name: 'test',
    version: '1.0.0',
    enabled: true,
  }

  const updates: TomlObject = {
    version: '2.0.0',
    tags: ['new'],
  }

  const result = mergeTomlObjects(base, updates)

  assertEquals(result, {
    name: 'test',
    version: '2.0.0',
    enabled: true,
    tags: ['new'],
  })
})

Deno.test('TOML Parser - mergeTomlObjects - deep merge', () => {
  const base: TomlObject = {
    meta: {
      version: '1.0.0',
      count: 5,
    },
    rules: {
      enabled: true,
    },
  }

  const updates: TomlObject = {
    meta: {
      version: '2.0.0',
      count: 5,
      author: 'test',
    },
  }

  const result = mergeTomlObjects(base, updates)

  assertEquals(result, {
    meta: {
      version: '2.0.0',
      count: 5,
      author: 'test',
    },
    rules: {
      enabled: true,
    },
  })
})

Deno.test('TOML Parser - mergeTomlObjects - array replacement', () => {
  const base: TomlObject = {
    tags: ['old', 'legacy'],
    config: { enabled: true },
  }

  const updates: TomlObject = {
    tags: ['new', 'modern'], // Arrays are replaced, not merged
    config: { enabled: true, priority: 'high' },
  }

  const result = mergeTomlObjects(base, updates)

  assertEquals(result, {
    tags: ['new', 'modern'],
    config: {
      enabled: true,
      priority: 'high',
    },
  })
})
