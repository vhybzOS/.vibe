/**
 * Generation Tracking Schema Tests
 *
 * Tests for ure/schemas/generation.ts
 * Validates generation tracking schema, file metadata, and helper functions
 */

import { assertEquals, assertThrows } from '@std/assert'
import {
  calculateChecksum,
  createEmptyGenerationTracking,
  createGeneratedFileMetadata,
  type GeneratedFile,
  GeneratedFileSchema,
  type GenerationContext,
  GenerationContextSchema,
  type GenerationTracking,
  GenerationTrackingSchema,
} from '../../ure/schemas/generation.ts'

Deno.test('Generation - GeneratedFileSchema - valid generated file', () => {
  const validFile = {
    path: 'AGENTS.md',
    generator: 'agents-md-transformer',
    sourceFiles: ['.vibe/rules/index.toml', '.vibe/dependencies/index.toml'],
    checksum: 'abc123def456',
    lastGenerated: '2024-01-15T10:00:00Z',
    template: 'templates/agents.md.hbs',
    ideType: 'agents' as const,
  }

  const result = GeneratedFileSchema.parse(validFile)
  assertEquals(result.path, 'AGENTS.md')
  assertEquals(result.generator, 'agents-md-transformer')
  assertEquals(result.sourceFiles, ['.vibe/rules/index.toml', '.vibe/dependencies/index.toml'])
  assertEquals(result.checksum, 'abc123def456')
  assertEquals(result.template, 'templates/agents.md.hbs')
  assertEquals(result.ideType, 'agents')
})

Deno.test('Generation - GeneratedFileSchema - minimal valid file', () => {
  const minimalFile = {
    path: '.cursor/rules/code-style.mdc',
    generator: 'cursor-mdc-transformer',
    lastGenerated: '2024-01-15T10:00:00Z',
  }

  const result = GeneratedFileSchema.parse(minimalFile)
  assertEquals(result.path, '.cursor/rules/code-style.mdc')
  assertEquals(result.generator, 'cursor-mdc-transformer')
  assertEquals(result.sourceFiles, []) // default
  assertEquals(result.checksum, undefined) // optional
  assertEquals(result.template, undefined) // optional
  assertEquals(result.ideType, undefined) // optional
})

Deno.test('Generation - GeneratedFileSchema - invalid IDE type', () => {
  const invalidFile = {
    path: 'test.md',
    generator: 'test-generator',
    lastGenerated: '2024-01-15T10:00:00Z',
    ideType: 'invalid-ide',
  }

  assertThrows(
    () => GeneratedFileSchema.parse(invalidFile),
    Error,
    'Invalid enum value',
  )
})

Deno.test('Generation - GenerationTrackingSchema - valid complete tracking', () => {
  const validTracking = {
    meta: {
      version: '1.0.0',
      lastGeneration: '2024-01-15T10:30:00Z',
      generatedFileCount: 3,
      ureVersion: '0.2.1',
    },
    files: {
      'AGENTS.md': {
        path: 'AGENTS.md',
        generator: 'agents-md-transformer',
        sourceFiles: ['.vibe/rules/index.toml'],
        lastGenerated: '2024-01-15T10:00:00Z',
        ideType: 'agents' as const,
      },
      'CLAUDE.md': {
        path: 'CLAUDE.md',
        generator: 'claude-md-transformer',
        sourceFiles: ['.vibe/rules/index.toml'],
        lastGenerated: '2024-01-15T10:15:00Z',
        ideType: 'claude' as const,
      },
      '.cursor/rules/main.mdc': {
        path: '.cursor/rules/main.mdc',
        generator: 'cursor-mdc-transformer',
        sourceFiles: ['.vibe/rules/content/code-style.md'],
        lastGenerated: '2024-01-15T10:30:00Z',
        ideType: 'cursor' as const,
      },
    },
    templates: {
      lastUpdated: '2024-01-15T09:00:00Z',
      version: '1.0.0',
    },
  }

  const result = GenerationTrackingSchema.parse(validTracking)
  assertEquals(result.meta.generatedFileCount, 3)
  assertEquals(result.meta.ureVersion, '0.2.1')
  assertEquals(Object.keys(result.files).length, 3)
  assertEquals(result.files['AGENTS.md']?.generator, 'agents-md-transformer')
  assertEquals(result.templates?.version, '1.0.0')
})

Deno.test('Generation - GenerationTrackingSchema - minimal tracking', () => {
  const minimalTracking = {
    meta: {
      lastGeneration: '2024-01-15T10:30:00Z',
      generatedFileCount: 0,
      ureVersion: '0.2.1',
    },
    files: {},
  }

  const result = GenerationTrackingSchema.parse(minimalTracking)
  assertEquals(result.meta.version, '1.0.0') // default
  assertEquals(result.meta.generatedFileCount, 0)
  assertEquals(Object.keys(result.files).length, 0)
  assertEquals(result.templates, undefined) // optional
})

Deno.test('Generation - GenerationContextSchema - valid context', () => {
  const validContext = {
    project: {
      name: 'my-project',
      type: 'web-app',
      languages: ['typescript', 'javascript'],
      frameworks: ['react', 'hono'],
    },
    rules: [
      {
        id: 'rule_001',
        name: 'Code Style',
        priority: 'high',
        content: '# Code Style\n\nUse functional programming.',
        tags: ['style', 'functional'],
        appliesTo: ['typescript'],
      },
      {
        id: 'rule_002',
        name: 'Testing',
        priority: 'medium',
        content: '# Testing\n\nWrite tests first.',
        tags: ['testing', 'tdd'],
        appliesTo: ['all'],
      },
    ],
    dependencies: [
      {
        name: 'hono',
        version: '4.2.5',
        registry: 'npm',
        documentation: '# Hono\n\nFast web framework.',
      },
      {
        name: 'effect',
        version: '3.16.7',
        registry: 'npm',
      },
    ],
    generation: {
      timestamp: '2024-01-15T10:30:00Z',
      ureVersion: '0.2.1',
      templateVersion: '1.0.0',
    },
  }

  const result = GenerationContextSchema.parse(validContext)
  assertEquals(result.project.name, 'my-project')
  assertEquals(result.rules.length, 2)
  assertEquals(result.rules[0]?.name, 'Code Style')
  assertEquals(result.dependencies.length, 2)
  assertEquals(result.dependencies[0]?.name, 'hono')
  assertEquals(result.generation.ureVersion, '0.2.1')
})

Deno.test('Generation - createGeneratedFileMetadata - with options', () => {
  const result = createGeneratedFileMetadata(
    'CLAUDE.md',
    'claude-md-transformer',
    {
      sourceFiles: ['.vibe/rules/index.toml', '.vibe/dependencies/index.toml'],
      checksum: 'def789',
      template: 'templates/claude.md.hbs',
      ideType: 'claude',
    },
  )

  assertEquals(result.path, 'CLAUDE.md')
  assertEquals(result.generator, 'claude-md-transformer')
  assertEquals(result.sourceFiles, ['.vibe/rules/index.toml', '.vibe/dependencies/index.toml'])
  assertEquals(result.checksum, 'def789')
  assertEquals(result.template, 'templates/claude.md.hbs')
  assertEquals(result.ideType, 'claude')

  // Should have generated timestamp
  assertEquals(typeof result.lastGenerated, 'string')
  assertEquals(result.lastGenerated.includes('T'), true)
  assertEquals(result.lastGenerated.includes('Z'), true)
})

Deno.test('Generation - createGeneratedFileMetadata - minimal options', () => {
  const result = createGeneratedFileMetadata(
    '.windsurf/rules/test.mdc',
    'windsurf-mdc-transformer',
  )

  assertEquals(result.path, '.windsurf/rules/test.mdc')
  assertEquals(result.generator, 'windsurf-mdc-transformer')
  assertEquals(result.sourceFiles, []) // default
  assertEquals(result.checksum, undefined) // not provided
  assertEquals(result.template, undefined) // not provided
  assertEquals(result.ideType, undefined) // not provided
})

Deno.test('Generation - createEmptyGenerationTracking', () => {
  const ureVersion = '0.2.1'
  const result = createEmptyGenerationTracking(ureVersion)

  assertEquals(result.meta.version, '1.0.0')
  assertEquals(result.meta.generatedFileCount, 0)
  assertEquals(result.meta.ureVersion, ureVersion)
  assertEquals(Object.keys(result.files).length, 0)
  assertEquals(result.templates?.version, '1.0.0')

  // Should have generated timestamps
  assertEquals(typeof result.meta.lastGeneration, 'string')
  assertEquals(typeof result.templates?.lastUpdated, 'string')
  assertEquals(result.meta.lastGeneration.includes('T'), true)
})

Deno.test('Generation - calculateChecksum - consistent hashing', async () => {
  const content1 = 'Hello, world!'
  const content2 = 'Hello, world!'
  const content3 = 'Hello, World!' // Different capitalization

  const checksum1 = await calculateChecksum(content1)
  const checksum2 = await calculateChecksum(content2)
  const checksum3 = await calculateChecksum(content3)

  // Same content should produce same checksum
  assertEquals(checksum1, checksum2)

  // Different content should produce different checksum
  assertEquals(checksum1 === checksum3, false)

  // Should be valid hex string
  assertEquals(typeof checksum1, 'string')
  assertEquals(checksum1.length, 64) // SHA-256 produces 64 character hex string
  assertEquals(/^[a-f0-9]+$/.test(checksum1), true)
})

Deno.test('Generation - calculateChecksum - empty content', async () => {
  const checksum = await calculateChecksum('')

  assertEquals(typeof checksum, 'string')
  assertEquals(checksum.length, 64)
  assertEquals(/^[a-f0-9]+$/.test(checksum), true)
})

Deno.test('Generation - calculateChecksum - unicode content', async () => {
  const content = '🚀 Unicode content with émojis and àccénts 中文'
  const checksum = await calculateChecksum(content)

  assertEquals(typeof checksum, 'string')
  assertEquals(checksum.length, 64)
  assertEquals(/^[a-f0-9]+$/.test(checksum), true)
})

Deno.test('Generation - GenerationContextSchema - missing required fields', () => {
  const invalidContext = {
    project: {
      name: 'test-project',
      // missing type, languages, frameworks
    },
    rules: [],
    dependencies: [],
    // missing generation
  }

  assertThrows(
    () => GenerationContextSchema.parse(invalidContext),
    Error,
    'Required',
  )
})

Deno.test('Generation - GeneratedFileSchema - invalid datetime format', () => {
  const invalidFile = {
    path: 'test.md',
    generator: 'test-generator',
    lastGenerated: 'not-a-date',
  }

  assertThrows(
    () => GeneratedFileSchema.parse(invalidFile),
    Error,
    'Invalid datetime',
  )
})

Deno.test('Generation - GenerationTrackingSchema - negative file count', () => {
  const invalidTracking = {
    meta: {
      lastGeneration: '2024-01-15T10:30:00Z',
      generatedFileCount: -1, // Invalid negative count
      ureVersion: '0.2.1',
    },
    files: {},
  }

  assertThrows(
    () => GenerationTrackingSchema.parse(invalidTracking),
    Error,
    'Number must be greater than or equal to 0',
  )
})
