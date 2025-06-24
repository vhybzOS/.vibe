/**
 * @tested_by SurrealDB session and context management
 * Tests the database layer for storing session state, MRI, and context
 */

import { assertEquals, assertExists } from 'https://deno.land/std@0.208.0/assert/mod.ts'
import { SurrealDBManager } from '../lib/surrealdb.ts'

Deno.test('SurrealDB - Initialize code.db', async () => {
  const db = new SurrealDBManager('.vibe/code.db')
  await db.initialize()

  const health = await db.health()
  assertEquals(health.status, 'ready')
  assertExists(health.tables.session)
  assertExists(health.tables.mri_access)
  assertExists(health.tables.code)
})

Deno.test('SurrealDB - Store and retrieve session state', async () => {
  const db = new SurrealDBManager('.vibe/code.db')
  await db.initialize()

  const sessionState = {
    id: 'test_session_001',
    stage: 'development',
    step: 3,
    focus_stack: ['auth', 'validation'],
    context_budget: { used: 150000, limit: 200000 },
  }

  await db.saveSession(sessionState)
  const retrieved = await db.loadSession('test_session_001')

  assertEquals(retrieved.stage, 'development')
  assertEquals(retrieved.step, 3)
  assertEquals(retrieved.focus_stack.length, 2)
})

Deno.test('SurrealDB - Query codebase with context filters', async () => {
  const db = new SurrealDBManager('.vibe/code.db')
  await db.initialize()

  // Mock some code entries
  await db.indexFile('src/auth.ts', {
    type: 'implementation',
    functions: ['authenticate', 'validateToken'],
    relevance: 0.95,
  })

  const contextQuery = `
    SELECT * FROM code 
    WHERE type = "implementation" 
    AND relevance > 0.8 
    AND functions CONTAINS "authenticate"
  `

  const results = await db.query(contextQuery)
  assertEquals(results.length, 1)
  assertEquals(results[0].functions.includes('authenticate'), true)
})

Deno.test('SurrealDB - MRI tracking', async () => {
  const db = new SurrealDBManager('.vibe/code.db')
  await db.initialize()

  const mriEntry = {
    session_id: 'dev_session_001',
    stage: 'specs',
    timestamp: new Date(),
    file_path: '/src/auth.ts',
    range: { start: [10, 0], end: [25, 15] },
    query_type: 'ast_node_selection',
    relevance_score: 0.94,
  }

  await db.trackMRI(mriEntry)

  const mriHistory = await db.getMRIForSession('dev_session_001')
  assertEquals(mriHistory.length, 1)
  assertEquals(mriHistory[0].stage, 'specs')
})
