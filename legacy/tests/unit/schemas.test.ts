import { assert, assertEquals } from '@std/assert'
import { describe, it } from '@std/testing/bdd'
import { z } from 'zod/v4'

import {
  AgentFileSchema,
  AIToolConfigSchema,
  DependencyDocSchema,
  DiaryEntrySchema,
  MemorySchema,
  UniversalRuleSchema,
} from '../../schemas/index.ts'

describe('📋 Schema Unit Tests', () => {
  describe('🎯 UniversalRuleSchema', () => {
    it('✅ should accept valid rule', () => {
      const validRule = {
        id: crypto.randomUUID(),
        metadata: {
          name: 'Test Rule',
          description: 'Test description',
          source: 'manual',
          confidence: 0.9,
          created: '2024-01-01T00:00:00.000Z',
          updated: '2024-01-01T00:00:00.000Z',
          version: '1.0.0',
        },
        targeting: {
          languages: ['typescript'],
          frameworks: ['react'],
          files: ['*.ts'],
          contexts: ['development'],
        },
        content: {
          markdown: '# Test Rule',
          examples: [{
            code: 'const x = 1',
            language: 'typescript',
            description: 'Example',
          }],
          tags: ['test'],
          priority: 'medium',
        },
        compatibility: {
          tools: ['cursor'],
          formats: {},
        },
        application: {
          mode: 'always',
          conditions: [],
          excludeFiles: [],
          includeFiles: [],
        },
      }

      const result = UniversalRuleSchema.safeParse(validRule)
      assert(result.success, `Validation failed: ${result.error?.message}`)
    })

    it('❌ should reject invalid rule', () => {
      const invalidRule = {
        id: 'not-a-uuid',
        metadata: {
          name: '', // empty name should fail
          source: 'invalid-source',
        },
      }

      const result = UniversalRuleSchema.safeParse(invalidRule)
      assert(!result.success, 'Should reject invalid rule')
    })

    it('🔧 should apply defaults correctly', () => {
      const minimalRule = {
        id: crypto.randomUUID(),
        metadata: {
          name: 'Minimal Rule',
          description: 'Minimal description',
          source: 'manual',
          created: '2024-01-01T00:00:00.000Z',
          updated: '2024-01-01T00:00:00.000Z',
        },
        targeting: {},
        content: {
          markdown: '# Minimal',
        },
        compatibility: {},
        application: {},
      }

      const result = UniversalRuleSchema.safeParse(minimalRule)
      assert(result.success, 'Should accept minimal rule with defaults')

      if (result.success) {
        assertEquals(result.data.metadata.confidence, 1.0)
        assertEquals(result.data.metadata.version, '1.0.0')
        assertEquals(result.data.targeting.languages, [])
        assertEquals(result.data.content.priority, 'medium')
        assertEquals(result.data.application.mode, 'always')
      }
    })
  })

  describe('🛠️ AIToolConfigSchema', () => {
    it('✅ should validate Cursor config', () => {
      const cursorConfig = {
        tool: 'cursor',
        name: 'Cursor',
        detection: {
          files: ['.cursorrules'],
          priority: 1,
        },
        configFiles: [{
          path: '.cursorrules',
          format: { type: 'markdown' },
          required: true,
        }],
        capabilities: {
          rules: true,
          commands: false,
          memory: false,
          context: true,
        },
        syncStrategy: 'overwrite',
        metadata: {
          conflicts: [],
          customizations: {},
        },
      }

      const result = AIToolConfigSchema.safeParse(cursorConfig)
      assert(result.success, `Cursor config validation failed: ${result.error?.message}`)
    })

    it('✅ should validate Windsurf config', () => {
      const windsurfConfig = {
        tool: 'windsurf',
        name: 'Windsurf',
        detection: {
          files: ['.windsurfrules'],
          directories: ['.windsurf'],
          priority: 1,
        },
        configFiles: [
          {
            path: '.windsurfrules',
            format: { type: 'markdown' },
            required: false,
          },
          {
            path: '.windsurf/memory.md',
            format: { type: 'markdown' },
            required: false,
          },
        ],
        capabilities: {
          rules: true,
          commands: false,
          memory: true,
          context: true,
        },
        syncStrategy: 'merge',
        metadata: {
          conflicts: [],
          customizations: {},
        },
      }

      const result = AIToolConfigSchema.safeParse(windsurfConfig)
      assert(result.success, `Windsurf config validation failed: ${result.error?.message}`)
    })
  })

  describe('📖 DiaryEntrySchema', () => {
    it('✅ should validate complete diary entry', () => {
      const diaryEntry = {
        id: crypto.randomUUID(),
        timestamp: '2024-01-01T00:00:00.000Z',
        title: 'Migration to Effect-TS',
        category: 'architecture',
        tags: ['effect-ts', 'migration'],
        problem: {
          description: 'Need better async error handling',
          context: 'Current Promise-based code is hard to compose',
          constraints: ['Must maintain backward compatibility'],
        },
        decision: {
          chosen: 'Migrate to Effect-TS for all async operations',
          rationale: 'Effect-TS provides better error handling',
          alternatives: [
            { option: 'Stay with Promises', reason: 'Simpler but lacks composability' },
          ],
        },
        impact: {
          benefits: ['Better error handling'],
          risks: ['Learning curve for team'],
          migrationNotes: 'Start with core modules',
        },
      }

      const result = DiaryEntrySchema.safeParse(diaryEntry)
      assert(result.success, `Diary entry validation failed: ${result.error?.message}`)
    })
  })

  describe('📦 DependencyDocSchema', () => {
    it('✅ should validate dependency documentation', () => {
      const dependencyDoc = {
        package: {
          name: 'react',
          version: '18.2.0',
          registry: 'npm',
          homepage: 'https://reactjs.org',
        },
        documentation: [{
          url: 'https://reactjs.org/llms.txt',
          type: 'llms-txt',
          content: 'React documentation for LLMs',
          contentType: 'text/markdown',
          lastFetched: '2024-01-01T00:00:00.000Z',
          size: 1000,
          hash: 'abc123',
        }],
        discoveryMetadata: {
          discoveredAt: '2024-01-01T00:00:00.000Z',
          lastUpdated: '2024-01-01T00:00:00.000Z',
          updateFrequency: 'weekly',
          discoveryMethod: 'url-pattern',
          failedAttempts: [],
        },
        apiPatterns: [{
          pattern: 'useState hook',
          description: 'State management',
          category: 'method-call',
          examples: [{
            code: 'const [state, setState] = useState()',
            language: 'typescript',
          }],
          confidence: 0.9,
        }],
        generatedRules: [],
        integrationNotes: {
          commonUseCases: ['State management'],
          bestPractices: ['Use hooks'],
          knownIssues: [],
          alternatives: ['Vue', 'Angular'],
        },
      }

      const result = DependencyDocSchema.safeParse(dependencyDoc)
      assert(result.success, `Dependency doc validation failed: ${result.error?.message}`)
    })
  })

  describe('🧠 MemorySchema', () => {
    it('✅ should validate memory entry', () => {
      const memory = {
        metadata: {
          id: crypto.randomUUID(),
          type: 'conversation',
          source: {
            timestamp: '2024-01-01T00:00:00.000Z',
            tool: 'cursor',
          },
          tags: ['test'],
          importance: 'medium',
          accessibility: 'project',
          accessCount: 1,
        },
        content: {
          title: 'Test Conversation',
          summary: 'A test conversation',
          content: 'Full conversation content',
          keywords: ['test', 'conversation'],
          entities: [{
            name: 'React',
            type: 'library',
            relevance: 0.8,
          }],
        },
        relationships: {
          relatedMemories: [],
          similarity: {},
          clusters: [],
          topics: ['test'],
        },
        quality: {
          completeness: 1.0,
          accuracy: 1.0,
          relevance: 1.0,
          freshness: 1.0,
        },
        lifecycle: {
          created: '2024-01-01T00:00:00.000Z',
          updated: '2024-01-01T00:00:00.000Z',
          archived: false,
          version: 1,
        },
      }

      const result = MemorySchema.safeParse(memory)
      assert(result.success, `Memory validation failed: ${result.error?.message}`)
    })
  })

  describe('📄 AgentFileSchema', () => {
    it('✅ should validate complete agent file', () => {
      const agentFile = {
        metadata: {
          version: '1.0.0',
          created: '2024-01-01T00:00:00.000Z',
          updated: '2024-01-01T00:00:00.000Z',
          schema: 'dotvibe-compatible',
          generator: 'dotvibe',
          project: {
            name: 'test-project',
            path: '/test/project',
            languages: ['typescript'],
            frameworks: ['react'],
          },
          statistics: {
            totalRules: 5,
            totalDecisions: 10,
            totalMemories: 15,
            totalDependencies: 3,
            lastActivity: '2024-01-01T00:00:00.000Z',
          },
        },
        agent: {
          name: 'Test Agent',
          description: 'Test AI agent',
          capabilities: ['code-analysis', 'rule-application'],
          preferences: {
            verbosity: 'normal',
            autoApplyRules: true,
            trackDecisions: true,
            suggestImprovements: true,
          },
          constraints: [],
        },
        rules: {
          active: ['rule1'],
          compiled: [],
          generated: [],
          deprecated: [],
          conflicts: [],
        },
        documentation: {
          llms_txt: '# Test Documentation',
          dependency_docs: {},
          custom_docs: [],
          metadata: {
            lastGenerated: '2024-01-01T00:00:00.000Z',
            generationMethod: 'automatic',
          },
        },
        memory: {
          conversations: [],
          decisions: [],
          patterns: [],
          context: {},
          statistics: {
            totalInteractions: 0,
            avgSessionLength: 0,
            topTopics: [],
            lastActivity: '2024-01-01T00:00:00.000Z',
          },
        },
        dependencies: [],
        integrations: {
          tools: [],
          syncSettings: {},
        },
        export: {
          exportedAt: '2024-01-01T00:00:00.000Z',
          exportVersion: '1.0.0',
          includeMemories: true,
          includeDecisions: true,
          includeDependencies: true,
          format: 'full',
        },
      }

      const result = AgentFileSchema.safeParse(agentFile)
      assert(result.success, `Agent file validation failed: ${result.error?.message}`)
    })
  })

  describe('🔄 Schema Relationships', () => {
    it('🔗 should maintain type consistency across schemas', () => {
      // Test that AIToolType enum is consistent across schemas
      const toolType = 'cursor' as const

      // Should be valid in AIToolConfigSchema
      const toolConfig = { tool: toolType }
      const toolResult = AIToolConfigSchema.pick({ tool: true }).safeParse(toolConfig)
      assert(toolResult.success, 'Tool type should be valid in AIToolConfig')

      // Should be valid in DiaryEntrySchema context
      const categoryResult = DiaryEntrySchema
        .pick({ category: true })
        .safeParse({ category: 'architecture' })
      assert(categoryResult.success, 'Category should be valid in DiaryEntry context')
    })

    it('📊 should handle z.output types correctly', () => {
      type RuleType = z.output<typeof UniversalRuleSchema>
      type ToolType = z.output<typeof AIToolConfigSchema>

      // These should compile without errors (TypeScript compile-time test)
      const ruleId: RuleType['id'] = crypto.randomUUID()
      const toolName: ToolType['tool'] = 'cursor'

      assertEquals(typeof ruleId, 'string')
      assertEquals(toolName, 'cursor')
    })
  })
})
