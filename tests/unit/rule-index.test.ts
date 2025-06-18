/**
 * Rule Index Schema Tests
 *
 * Tests for ure/schemas/rule-index.ts
 * Validates rule metadata schema, index schema, and helper functions
 */

import { assertEquals, assertThrows } from '@std/assert'
import {
  createEmptyRuleIndex,
  createRuleMetadata,
  RuleContentSchema,
  type RuleIndex,
  RuleIndexSchema,
  type RuleMetadata,
  RuleMetadataSchema,
} from '../../ure/schemas/rule-index.ts'

Deno.test('Rule Index - RuleMetadataSchema - valid rule metadata', () => {
  const validRule = {
    id: 'rule_001',
    name: 'Code Style Guidelines',
    priority: 'high' as const,
    content_file: 'content/code-style.md',
    applies_to: ['typescript', 'javascript'],
    ide_support: ['cursor', 'claude'] as const,
    tags: ['style', 'functional'],
    created: '2024-01-15T10:00:00Z',
  }

  const result = RuleMetadataSchema.parse(validRule)
  assertEquals(result.id, 'rule_001')
  assertEquals(result.name, 'Code Style Guidelines')
  assertEquals(result.priority, 'high')
  assertEquals(result.content_file, 'content/code-style.md')
  assertEquals(result.applies_to, ['typescript', 'javascript'])
  assertEquals(result.ide_support, ['cursor', 'claude'])
  assertEquals(result.tags, ['style', 'functional'])
  assertEquals(result.created, '2024-01-15T10:00:00Z')
})

Deno.test('Rule Index - RuleMetadataSchema - defaults applied', () => {
  const minimalRule = {
    id: 'rule_002',
    name: 'Testing Guidelines',
    content_file: 'content/testing.md',
    created: '2024-01-15T10:00:00Z',
  }

  const result = RuleMetadataSchema.parse(minimalRule)
  assertEquals(result.priority, 'medium') // default
  assertEquals(result.applies_to, []) // default
  assertEquals(result.ide_support, []) // default
  assertEquals(result.tags, []) // default
})

Deno.test('Rule Index - RuleMetadataSchema - invalid priority', () => {
  const invalidRule = {
    id: 'rule_003',
    name: 'Invalid Rule',
    priority: 'invalid',
    content_file: 'content/invalid.md',
    created: '2024-01-15T10:00:00Z',
  }

  assertThrows(
    () => RuleMetadataSchema.parse(invalidRule),
    Error,
    'Invalid enum value',
  )
})

Deno.test('Rule Index - RuleMetadataSchema - invalid IDE support', () => {
  const invalidRule = {
    id: 'rule_004',
    name: 'Invalid IDE Rule',
    content_file: 'content/invalid.md',
    ide_support: ['cursor', 'invalid-ide'],
    created: '2024-01-15T10:00:00Z',
  }

  assertThrows(
    () => RuleMetadataSchema.parse(invalidRule),
    Error,
    'Invalid enum value',
  )
})

Deno.test('Rule Index - RuleMetadataSchema - missing required fields', () => {
  const invalidRule = {
    name: 'Missing ID Rule',
    content_file: 'content/missing.md',
    // missing id and created
  }

  assertThrows(
    () => RuleMetadataSchema.parse(invalidRule),
    Error,
    'Required',
  )
})

Deno.test('Rule Index - RuleIndexSchema - valid complete index', () => {
  const validIndex = {
    meta: {
      version: '1.0.0',
      last_updated: '2024-01-15T10:30:00Z',
      rule_count: 2,
    },
    rules: {
      'code_style': {
        id: 'rule_001',
        name: 'Code Style Guidelines',
        priority: 'high' as const,
        content_file: 'content/code-style.md',
        applies_to: ['typescript'],
        ide_support: ['cursor'] as const,
        tags: ['style'],
        created: '2024-01-15T10:00:00Z',
      },
      'testing': {
        id: 'rule_002',
        name: 'Testing Guidelines',
        priority: 'medium' as const,
        content_file: 'content/testing.md',
        applies_to: ['all'],
        ide_support: ['cursor', 'claude'] as const,
        tags: ['testing', 'tdd'],
        created: '2024-01-15T10:15:00Z',
      },
    },
  }

  const result = RuleIndexSchema.parse(validIndex)
  assertEquals(result.meta.rule_count, 2)
  assertEquals(Object.keys(result.rules).length, 2)
  assertEquals(result.rules.code_style?.name, 'Code Style Guidelines')
  assertEquals(result.rules.testing?.name, 'Testing Guidelines')
})

Deno.test('Rule Index - RuleIndexSchema - empty rules object', () => {
  const emptyIndex = {
    meta: {
      version: '1.0.0',
      last_updated: '2024-01-15T10:30:00Z',
      rule_count: 0,
    },
    rules: {},
  }

  const result = RuleIndexSchema.parse(emptyIndex)
  assertEquals(result.meta.rule_count, 0)
  assertEquals(Object.keys(result.rules).length, 0)
})

Deno.test('Rule Index - RuleContentSchema - valid content with examples', () => {
  const validContent = {
    content: '# Code Style\n\nUse functional programming patterns.',
    examples: [
      {
        language: 'typescript',
        code: 'const result = pipe(data, transform)',
        description: 'Functional composition example',
      },
    ],
    metadata: {
      checksum: 'abc123',
      last_modified: '2024-01-15T10:00:00Z',
    },
  }

  const result = RuleContentSchema.parse(validContent)
  assertEquals(result.content, '# Code Style\n\nUse functional programming patterns.')
  assertEquals(result.examples.length, 1)
  assertEquals(result.examples[0]?.language, 'typescript')
  assertEquals(result.metadata?.checksum, 'abc123')
})

Deno.test('Rule Index - RuleContentSchema - minimal content', () => {
  const minimalContent = {
    content: 'Basic rule content',
  }

  const result = RuleContentSchema.parse(minimalContent)
  assertEquals(result.content, 'Basic rule content')
  assertEquals(result.examples, []) // default
  assertEquals(result.metadata, undefined) // optional
})

Deno.test('Rule Index - createRuleMetadata helper - with options', () => {
  const result = createRuleMetadata(
    'rule_005',
    'Performance Guidelines',
    'content/performance.md',
    {
      priority: 'high',
      applies_to: ['typescript', 'javascript'],
      ide_support: ['cursor', 'windsurf'],
      tags: ['performance', 'optimization'],
    },
  )

  assertEquals(result.id, 'rule_005')
  assertEquals(result.name, 'Performance Guidelines')
  assertEquals(result.content_file, 'content/performance.md')
  assertEquals(result.priority, 'high')
  assertEquals(result.applies_to, ['typescript', 'javascript'])
  assertEquals(result.ide_support, ['cursor', 'windsurf'])
  assertEquals(result.tags, ['performance', 'optimization'])

  // Should have generated ISO date string
  assertEquals(typeof result.created, 'string')
  assertEquals(result.created.includes('T'), true)
  assertEquals(result.created.includes('Z'), true)
})

Deno.test('Rule Index - createRuleMetadata helper - minimal options', () => {
  const result = createRuleMetadata(
    'rule_006',
    'Simple Rule',
    'content/simple.md',
  )

  assertEquals(result.id, 'rule_006')
  assertEquals(result.name, 'Simple Rule')
  assertEquals(result.content_file, 'content/simple.md')
  assertEquals(result.priority, 'medium') // default
  assertEquals(result.applies_to, []) // default
  assertEquals(result.ide_support, []) // default
  assertEquals(result.tags, []) // default
})

Deno.test('Rule Index - createEmptyRuleIndex helper', () => {
  const result = createEmptyRuleIndex()

  assertEquals(result.meta.version, '1.0.0')
  assertEquals(result.meta.rule_count, 0)
  assertEquals(Object.keys(result.rules).length, 0)

  // Should have generated ISO date string
  assertEquals(typeof result.meta.last_updated, 'string')
  assertEquals(result.meta.last_updated.includes('T'), true)
  assertEquals(result.meta.last_updated.includes('Z'), true)
})

Deno.test('Rule Index - RuleMetadataSchema - updated field validation', () => {
  const ruleWithUpdate = {
    id: 'rule_007',
    name: 'Updated Rule',
    content_file: 'content/updated.md',
    created: '2024-01-15T10:00:00Z',
    updated: '2024-01-15T11:00:00Z',
  }

  const result = RuleMetadataSchema.parse(ruleWithUpdate)
  assertEquals(result.updated, '2024-01-15T11:00:00Z')
})

Deno.test('Rule Index - RuleMetadataSchema - invalid datetime format', () => {
  const invalidRule = {
    id: 'rule_008',
    name: 'Invalid Date Rule',
    content_file: 'content/invalid.md',
    created: 'not-a-date',
  }

  assertThrows(
    () => RuleMetadataSchema.parse(invalidRule),
    Error,
    'Invalid datetime',
  )
})
