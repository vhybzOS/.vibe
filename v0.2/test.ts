/**
 * test.ts - The Master Test Suite for Vibe v2
 *
 * This suite validates the complete functionality of the Vibe system,
 * ensuring that the CLI client and Daemon engine work together as designed.
 * It uses the modern BDD and mocking capabilities of the Deno Standard Library.
 *
 * @version 2.0.0
 * @author A.I. Architect
 */

// =================================================================
// 1. IMPORTS & SETUP
// =================================================================

import { assert, assertEquals, assertExists, assertRejects, assertStringIncludes } from '@std/assert'
import { afterAll, afterEach, beforeAll, beforeEach, describe, it } from '@std/testing/bdd'
import { type Spy, spy, type Stub, stub } from '@std/testing/mock'
import { Effect } from 'effect'
import { Hono } from 'hono'
import { resolve } from '@std/path'

// We import the real, complete implementation.
import * as VibeEngine from './daemon.ts'
import type { VibeError, ProjectStatus } from './daemon.ts'

// --- Test Environment Setup ---

interface TestContext {
  testDir: string
  daemon: {
    instance: Hono
    controller: AbortController
    port: number
  } | null
  spies: {
    // We will spy on key engine functions to test interactions
    triggerDiscovery: Spy<typeof VibeEngine, [string], Effect.Effect<void, VibeError>>
  }
  cleanup: () => Promise<void>
}

/**
 * Creates a fully isolated test environment with a temporary directory
 * and a running instance of our Hono daemon for true E2E API tests.
 */
async function setupTestEnvironment(): Promise<TestContext> {
  const testDir = await Deno.makeTempDir({ prefix: 'vibe_v2_test_' })
  const spies = {
    triggerDiscovery: spy(VibeEngine, 'triggerDiscovery'),
  }

  // Create a minimal Hono app instance for testing API endpoints
  const app = new Hono()
  // Manually add routes from daemon.ts logic for testing
  app.post('/api/init', async (c) => VibeEngine.HonoHandlers.init(c))
  app.get('/api/status', async (c) => VibeEngine.HonoHandlers.status(c))
  app.get('/health', (c) => c.text('OK'))

  const controller = new AbortController()
  let port = 0

  const serverPromise = Deno.serve({
    port: 0, // Use an available port
    signal: controller.signal,
    onListen: (addr) => { port = addr.port },
  }, app.fetch).finished

  const cleanup = async () => {
    spies.triggerDiscovery.restore()
    controller.abort()
    await serverPromise.catch(() => {}) // Ignore abort errors
    await Deno.remove(testDir, { recursive: true }).catch(() => {})
  }

  // Wait a moment for the server to be ready
  await new Promise((r) => setTimeout(r, 100))
  if (port === 0) throw new Error('Test server failed to start')

  return {
    testDir,
    daemon: { instance: app, controller, port },
    spies,
    cleanup,
  }
}

// =================================================================
// 2. TEST SUITES
// =================================================================

describe('Vibe v2 End-to-End Test Suite', () => {
  let context: TestContext

  beforeAll(async () => {
    context = await setupTestEnvironment()
  })

  afterAll(async () => {
    await context.cleanup()
  })
  
  beforeEach(() => {
    // Reset spies before each test
    context.spies.triggerDiscovery.calls = []
  })

  // --- CLI User Flow Tests ---
  describe('🚀 CLI User Flows', () => {
    it('`vibe init` should successfully bootstrap a new project', async () => {
      // Simulate running `vibe init` in our test directory
      const effect = VibeEngine.initializeProject(context.testDir, {})
      await Effect.runPromise(effect)

      // Verify file system state
      const configPath = resolve(context.testDir, '.vibe', 'config.json')
      const configContent = await Deno.readTextFile(configPath)
      assert(JSON.parse(configContent).status === 'ok')

      // Verify interaction: init should trigger discovery
      assertEquals(context.spies.triggerDiscovery.calls.length, 1)
    })
    
    it('`vibe status` should fail gracefully in an uninitialized directory', async () => {
      await assertRejects(
        () => Effect.runPromise(VibeEngine.getProjectStatus(resolve(context.testDir, 'nonexistent', '.vibe'))),
        Error,
        'directory not found'
      );
    });

    it('`vibe sync` should compile and write tool-specific files', async () => {
      await Effect.runPromise(VibeEngine.initializeProject(context.testDir, {}))
      const result = await Effect.runPromise(VibeEngine.syncProject(resolve(context.testDir, '.vibe')))

      assertEquals(result.syncedFiles, ['.cursorrules'])
      const cursorFileExists = await Deno.stat(resolve(context.testDir, '.cursorrules')).then(s => s.isFile).catch(() => false)
      assert(cursorFileExists, '.cursorrules file should have been created')
    })
  })

  // --- Daemon API Endpoint Tests ---
  describe('⚙️ Daemon API Endpoint Tests', () => {
    it('GET /health should return "OK" with status 200', async () => {
      const res = await fetch(`http://localhost:${context.daemon?.port}/health`)
      assertEquals(res.status, 200)
      assertEquals(await res.text(), 'OK')
    })
    
    it('POST /api/init should initialize a project and return success', async () => {
      const res = await fetch(`http://localhost:${context.daemon?.port}/api/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: context.testDir })
      });
      const json = await res.json();

      assertEquals(res.status, 200)
      assertEquals(json.success, true)
      assertStringIncludes(json.message, context.testDir)
    })
    
    it('GET /api/status should return a valid project status object', async () => {
      await VibeEngine.initializeProject(context.testDir, {})
      const res = await fetch(`http://localhost:${context.daemon?.port}/api/status?projectPath=${encodeURIComponent(context.testDir)}`)
      const status: ProjectStatus = await res.json()
      
      assertEquals(res.status, 200)
      assertExists(status.projectName)
      assert(Array.isArray(status.detectedTools))
      assert(typeof status.ruleCount === 'number')
    })
  })

  // --- Core Engine & Service Logic Tests ---
  describe('🧠 Core Engine Logic', () => {
    describe('Autonomous Dependency Discovery', () => {
      let httpRequestStub: Stub;
      let aiGenerationStub: Stub;

      beforeEach(() => {
        // Correctly stubbing a namespaced function
        httpRequestStub = stub(VibeEngine.Lib, 'makeHttpRequest', (url: string) => {
          if (url.includes('react')) {
            return Effect.succeed({ readme: 'This is the README for React.' });
          }
          return Effect.fail({ _tag: 'NetworkError', message: 'Not Found' });
        });

        aiGenerationStub = stub(VibeEngine, 'generateRulesFromReadme', (name, readme) => {
          return Effect.succeed([{ id: 'ai-gen-rule-1', metadata: { name: `AI Rule for ${name}` }, content: 'Use hooks.' }]);
        });
      });

      afterEach(() => {
        httpRequestStub.restore();
        aiGenerationStub.restore();
      });

      it('should use AI generation as a fallback if no direct rules are found', async () => {
        const depName = 'react';
        await Effect.runPromise(VibeEngine.discoverDependency(depName, resolve(context.testDir, '.vibe')))

        assertEquals(aiGenerationStub.calls.length, 1)
        assertEquals(aiGenerationStub.calls[0].args, [depName, 'This is the README for React.'])
        
        const rulesPath = resolve(context.testDir, '.vibe/dependencies', `${depName}.json`)
        const rulesContent = await Deno.readTextFile(rulesPath)
        const rules = JSON.parse(rulesContent)
        assertEquals(rules[0].id, 'ai-gen-rule-1')
      })
    })

    describe('Search and Memory Indexing', () => {
      it('should index a new memory entry upon creation', async () => {
        using indexSpy = spy(VibeEngine.SearchService, 'indexDocument')
        
        const vibePath = resolve(context.testDir, '.vibe')
        await VibeEngine.initializeProject(context.testDir, {})
        
        const memoryData = { content: 'Effect-TS provides excellent composability', type: 'knowledge' }
        const result = await Effect.runPromise(VibeEngine.addMemory(vibePath, memoryData))

        assertEquals(indexSpy.calls.length, 1)
        
        const call = indexSpy.calls[0]
        assertEquals(call.args[0].id, result.id)
        assertStringIncludes(call.args[0].content, 'composability')
        assertEquals(call.args[0].type, 'memory')
      })
    })
  })
})