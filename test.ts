#!/usr/bin/env -S deno run --allow-all

/**
 * Integration test for the restructured .vibe system
 * Tests core functionality with the new idiomatic Deno structure
 */

import { z } from 'zod/v4'
import { Effect, pipe } from 'effect'
import { resolve } from '@std/path'

console.log('🧪 Testing restructured .vibe system...')

// Test Zod v4 schema
const TestSchema = z.object({
  name: z.string(),
  age: z.number().int(),
  email: z.string().optional(),
})

const testData = {
  name: 'Vibe User',
  age: 25,
  email: 'user@example.com',
}

try {
  const result = TestSchema.parse(testData)
  console.log('✅ Zod v4 parsing works!')
  console.log('📊 Parsed data:', result)
} catch (error) {
  console.error('❌ Zod parsing failed:', error)
}

// Test Effect-TS integration
const testEffect = pipe(
  Effect.succeed('Hello from Effect!'),
  Effect.map(msg => `🎉 ${msg}`),
  Effect.tap(msg => Effect.log(msg))
)

await Effect.runPromise(testEffect)
console.log('✅ Effect-TS works!')

// Test file operations
try {
  const testContent = 'Test content from .vibe'
  await Deno.writeTextFile('/tmp/vibe-test.txt', testContent)
  const readContent = await Deno.readTextFile('/tmp/vibe-test.txt')
  
  if (readContent === testContent) {
    console.log('✅ File operations work!')
  } else {
    console.error('❌ File content mismatch')
  }
  
  await Deno.remove('/tmp/vibe-test.txt')
} catch (error) {
  console.error('❌ File operations failed:', error)
}

// Test new modular structure
try {
  // Import from new structure
  const { UniversalRuleSchema } = await import('./schemas/universal-rule.ts')
  
  const testRule = {
    id: crypto.randomUUID(),
    metadata: {
      name: 'Test Rule',
      description: 'A test rule',
      source: 'manual' as const,
      confidence: 1.0,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      version: '1.0.0',
    },
    targeting: {
      languages: ['typescript'],
      frameworks: ['react'],
      files: [],
      contexts: [],
    },
    content: {
      markdown: '## Test Rule\nUse TypeScript.',
      examples: [],
      tags: ['test'],
      priority: 'medium' as const,
    },
    compatibility: {
      tools: ['cursor' as const],
      formats: {},
    },
    application: {
      mode: 'always' as const,
      conditions: [],
      excludeFiles: [],
      includeFiles: [],
    },
  }
  
  const result = UniversalRuleSchema.safeParse(testRule)
  if (!result.success) {
    throw new Error(`Schema validation failed: ${result.error.message}`)
  }
  
  console.log('✅ Schema validation works!')
  console.log('✅ New modular structure is functional!')
} catch (error) {
  console.error('❌ Modular structure test failed:', error)
}

console.log('')
console.log('🚀 Restructured .vibe system is ready!')
console.log('📖 Run: deno run --allow-all cli.ts --help')
console.log('🔧 Run: deno run --allow-all daemon.ts')
console.log('📦 Build: deno task build')