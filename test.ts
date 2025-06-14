#!/usr/bin/env -S deno run --allow-all

// Simple test to verify Deno + Zod v4 setup
import { z } from 'zod/v4'

console.log('🧪 Testing .vibe setup...')

// Test Zod v4 schema
const TestSchema = z.object({
  name: z.string(),
  age: z.number().int(),
  email: z.string().optional(),
})

type TestType = z.output<typeof TestSchema>

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

// Test Effect
try {
  const { Effect, pipe } = await import('effect')
  
  const testEffect = pipe(
    Effect.succeed('Hello from Effect!'),
    Effect.map(msg => `🎉 ${msg}`),
    Effect.tap(msg => Effect.log(msg))
  )
  
  await Effect.runPromise(testEffect)
  console.log('✅ Effect-TS works!')
} catch (error) {
  console.error('❌ Effect-TS failed:', error)
}

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

console.log('')
console.log('🚀 .vibe is ready!')
console.log('📖 Run: ./vibe --help')
console.log('🔧 Run: ./vibe-daemon')