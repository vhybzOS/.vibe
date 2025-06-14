import { assertEquals, assertExists, assert } from 'jsr:@std/assert'
import { beforeEach, describe, it } from 'jsr:@std/testing/bdd'
import { Effect } from 'effect'

// Import core functions
import { detectAITools, TOOL_CONFIGS } from '../../src/core/tools/detection.ts'
import { createDefaultWatcherConfig } from '../../src/utils/file-watcher.ts'

describe('🔧 Core Module Unit Tests', () => {
  
  describe('🔍 Tool Detection', () => {
    let tempDir: string

    beforeEach(async () => {
      tempDir = await Deno.makeTempDir({ prefix: 'vibe-test-' })
    })

    it('📋 should have valid tool configurations', () => {
      const tools = Object.keys(TOOL_CONFIGS)
      assert(tools.length > 0, 'Should have tool configurations')
      
      for (const [toolName, config] of Object.entries(TOOL_CONFIGS)) {
        assertEquals(config.tool, toolName, `Tool name should match key: ${toolName}`)
        assert(config.name.length > 0, `Tool ${toolName} should have a name`)
        assert(config.detection.files.length > 0 || config.detection.directories.length > 0, 
          `Tool ${toolName} should have detection patterns`)
        assert(config.configFiles.length > 0, `Tool ${toolName} should have config files`)
      }
    })

    it('🎯 should detect no tools in empty directory', async () => {
      const result = await Effect.runPromise(detectAITools(tempDir))
      assertEquals(result.length, 0, 'Should detect no tools in empty directory')
    })

    it('📁 should detect Cursor when .cursorrules exists', async () => {
      await Deno.writeTextFile(`${tempDir}/.cursorrules`, '# Test rules')
      
      const result = await Effect.runPromise(detectAITools(tempDir))
      const cursorTool = result.find(tool => tool.tool === 'cursor')
      
      assertExists(cursorTool, 'Should detect Cursor tool')
      assert(cursorTool.confidence > 0, 'Should have positive confidence')
      assertEquals(cursorTool.status, 'active')
    })

    it('🌊 should detect Windsurf when .windsurfrules exists', async () => {
      await Deno.writeTextFile(`${tempDir}/.windsurfrules`, '# Windsurf rules')
      await Deno.mkdir(`${tempDir}/.windsurf`, { recursive: true })
      
      const result = await Effect.runPromise(detectAITools(tempDir))
      const windsurfTool = result.find(tool => tool.tool === 'windsurf')
      
      assertExists(windsurfTool, 'Should detect Windsurf tool')
      assert(windsurfTool.confidence > 0, 'Should have positive confidence')
    })

    it('🤖 should detect Claude when .claude directory exists', async () => {
      await Deno.mkdir(`${tempDir}/.claude`, { recursive: true })
      await Deno.writeTextFile(`${tempDir}/.claude/commands.md`, '# Claude commands')
      
      const result = await Effect.runPromise(detectAITools(tempDir))
      const claudeTool = result.find(tool => tool.tool === 'claude')
      
      assertExists(claudeTool, 'Should detect Claude tool')
      assert(claudeTool.confidence > 0, 'Should have positive confidence')
    })

    it('👨‍✈️ should detect Copilot when instructions file exists', async () => {
      await Deno.writeTextFile(`${tempDir}/copilot-instructions.md`, '# Copilot instructions')
      
      const result = await Effect.runPromise(detectAITools(tempDir))
      const copilotTool = result.find(tool => tool.tool === 'copilot')
      
      assertExists(copilotTool, 'Should detect Copilot tool')
      assert(copilotTool.confidence > 0, 'Should have positive confidence')
    })

    it('🏆 should sort tools by confidence', async () => {
      // Create multiple tool configs
      await Deno.writeTextFile(`${tempDir}/.cursorrules`, '# Cursor rules')
      await Deno.mkdir(`${tempDir}/.windsurf`, { recursive: true })
      await Deno.writeTextFile(`${tempDir}/.windsurfrules`, '# Windsurf rules')
      
      const result = await Effect.runPromise(detectAITools(tempDir))
      
      assert(result.length >= 2, 'Should detect multiple tools')
      
      // Check that results are sorted by confidence (descending)
      for (let i = 1; i < result.length; i++) {
        assert(result[i-1].confidence >= result[i].confidence, 
          'Results should be sorted by confidence (descending)')
      }
    })
  })

  describe('👀 File Watcher Configuration', () => {
    it('⚙️ should create valid watcher config', () => {
      const testPath = '/test/project'
      const config = createDefaultWatcherConfig(testPath)
      
      assertEquals(config.projectPath, testPath)
      assertEquals(config.autoSync, true)
      assert(config.watchPatterns.length > 0, 'Should have watch patterns')
      assert(config.ignorePatterns.length > 0, 'Should have ignore patterns')
      
      // Check that common AI tool files are watched
      const hasAIToolPatterns = config.watchPatterns.some(pattern => 
        pattern.includes('.cursorrules') || 
        pattern.includes('.windsurfrules') ||
        pattern.includes('.claude')
      )
      assert(hasAIToolPatterns, 'Should watch AI tool configuration files')
      
      // Check that node_modules is ignored
      assert(config.ignorePatterns.includes('node_modules/**'), 
        'Should ignore node_modules')
    })

    it('🔍 should include dependency manifests in watch patterns', () => {
      const config = createDefaultWatcherConfig('/test')
      
      const manifestPatterns = ['package.json', 'requirements.txt', 'Cargo.toml', 'go.mod']
      for (const pattern of manifestPatterns) {
        assert(config.watchPatterns.includes(pattern), 
          `Should watch ${pattern} for dependency changes`)
      }
    })

    it('🚫 should ignore build artifacts', () => {
      const config = createDefaultWatcherConfig('/test')
      
      const ignoredPaths = ['node_modules/**', 'dist/**', 'build/**', '.git/**']
      for (const ignorePath of ignoredPaths) {
        assert(config.ignorePatterns.includes(ignorePath), 
          `Should ignore ${ignorePath}`)
      }
    })
  })

  describe('⚡ Effect Integration', () => {
    it('🔄 should compose Effects correctly', async () => {
      const effect1 = Effect.succeed(5)
      const effect2 = Effect.succeed(10)
      
      const combinedEffect = Effect.all([effect1, effect2])
        .pipe(Effect.map(([a, b]) => a + b))
      
      const result = await Effect.runPromise(combinedEffect)
      assertEquals(result, 15)
    })

    it('🚨 should handle Effect errors gracefully', async () => {
      const failingEffect = Effect.fail(new Error('Test error'))
      const recoveredEffect = failingEffect.pipe(
        Effect.catchAll(error => Effect.succeed(`Recovered: ${error.message}`))
      )
      
      const result = await Effect.runPromise(recoveredEffect)
      assertEquals(result, 'Recovered: Test error')
    })

    it('🎯 should handle optional Effects', async () => {
      const maybeEffect = Effect.succeed('value').pipe(
        Effect.flatMap(value => 
          value === 'value' 
            ? Effect.succeed(value.toUpperCase())
            : Effect.fail(new Error('Invalid value'))
        )
      )
      
      const result = await Effect.runPromise(maybeEffect)
      assertEquals(result, 'VALUE')
    })
  })

  describe('🔧 Utility Functions', () => {
    it('🆔 should generate valid UUIDs', () => {
      const uuid1 = crypto.randomUUID()
      const uuid2 = crypto.randomUUID()
      
      // Basic UUID format check (8-4-4-4-12 hex digits)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      
      assert(uuidRegex.test(uuid1), 'Should generate valid UUID format')
      assert(uuidRegex.test(uuid2), 'Should generate valid UUID format')
      assert(uuid1 !== uuid2, 'Should generate unique UUIDs')
    })

    it('📅 should handle ISO datetime strings', () => {
      const now = new Date().toISOString()
      const parsed = new Date(now)
      
      assert(!isNaN(parsed.getTime()), 'Should parse ISO datetime string')
      assertEquals(parsed.toISOString(), now, 'Should round-trip ISO datetime')
    })

    it('🔤 should handle string operations consistently', () => {
      const testString = 'Test String'
      assertEquals(testString.toLowerCase(), 'test string')
      assertEquals(testString.toUpperCase(), 'TEST STRING')
      assertEquals(testString.length, 11)
      assert(testString.includes('Test'), 'Should find substring')
    })
  })

  describe('📊 Data Structure Operations', () => {
    it('🗂️ should handle Map operations', () => {
      const testMap = new Map<string, number>()
      testMap.set('a', 1)
      testMap.set('b', 2)
      
      assertEquals(testMap.size, 2)
      assertEquals(testMap.get('a'), 1)
      assert(testMap.has('b'), 'Should contain key')
      assert(!testMap.has('c'), 'Should not contain missing key')
    })

    it('📋 should handle Set operations', () => {
      const testSet = new Set(['a', 'b', 'a']) // duplicate 'a'
      
      assertEquals(testSet.size, 2) // Should deduplicate
      assert(testSet.has('a'), 'Should contain value')
      assert(testSet.has('b'), 'Should contain value')
      assert(!testSet.has('c'), 'Should not contain missing value')
    })

    it('🔢 should handle Array operations', () => {
      const testArray = [1, 2, 3, 4, 5]
      
      assertEquals(testArray.length, 5)
      assertEquals(testArray.filter(x => x > 3), [4, 5])
      assertEquals(testArray.map(x => x * 2), [2, 4, 6, 8, 10])
      assertEquals(testArray.reduce((sum, x) => sum + x, 0), 15)
    })
  })
})