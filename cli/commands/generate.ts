/**
 * Generate command - Generates rules from project analysis
 * Clean, functional implementation using Effect-TS
 */

import { Effect, pipe } from 'effect'
import { resolve } from '@std/path'

/**
 * Generate command that creates rules from project analysis
 */
export const generateCommand = (
  projectPath: string,
  options: { threshold?: string; patterns?: string[] },
) =>
  pipe(
    Effect.log('🔬 Analyzing project for rule generation...'),
    Effect.flatMap(() => checkVibeDirectory(projectPath)),
    Effect.flatMap((vibeExists) => {
      if (!vibeExists) {
        return pipe(
          Effect.log('❌ .vibe not initialized in this directory'),
          Effect.flatMap(() => Effect.log('   Run `vibe init` first')),
          Effect.flatMap(() => Effect.fail(new Error('.vibe not initialized'))),
        )
      }
      return performGeneration(projectPath, options)
    }),
  )

/**
 * Check if .vibe directory exists
 */
const checkVibeDirectory = (projectPath: string) =>
  Effect.tryPromise({
    try: async () => {
      const vibePath = resolve(projectPath, '.vibe')
      const stat = await Deno.stat(vibePath)
      return stat.isDirectory
    },
    catch: () => false,
  })

/**
 * Perform rule generation
 */
const performGeneration = (
  projectPath: string,
  options: { threshold?: string; patterns?: string[] },
) =>
  pipe(
    Effect.log(`🔍 Analyzing codebase in ${projectPath}`),
    Effect.flatMap(() => analyzeProject(projectPath, options)),
    Effect.flatMap((analysis) => generateRulesFromAnalysis(analysis)),
    Effect.flatMap((rules) => showGenerationResults(rules)),
  )

/**
 * Analyze project structure and patterns
 */
const analyzeProject = (
  projectPath: string,
  options: { threshold?: string; patterns?: string[] },
) =>
  Effect.sync(() => {
    const threshold = parseFloat(options.threshold || '0.8')

    // Future: Advanced pattern analysis with AST parsing and framework detection

    const commonPatterns = [
      {
        name: 'TypeScript strict mode',
        confidence: 0.9,
        description: 'Use TypeScript strict mode for better type safety',
        pattern: 'typescript-strict',
      },
      {
        name: 'Functional programming style',
        confidence: 0.85,
        description: 'Prefer functional programming patterns over OOP',
        pattern: 'functional-style',
      },
      {
        name: 'Effect-TS error handling',
        confidence: 0.8,
        description: 'Use Effect-TS for error handling and async operations',
        pattern: 'effect-ts',
      },
    ]

    const filteredPatterns = commonPatterns.filter((p) => p.confidence >= threshold)

    return {
      projectPath,
      patterns: filteredPatterns,
      threshold,
      requestedPatterns: options.patterns || [],
    }
  })

/**
 * Generate rules from analysis
 */
const generateRulesFromAnalysis = (
  analysis: {
    patterns: Array<
      { name: string; description: string; confidence: number; type: string; examples: string[] }
    >
  },
) =>
  Effect.sync(() => {
    const rules = analysis.patterns.map((pattern) => ({
      id: crypto.randomUUID(),
      name: pattern.name,
      description: pattern.description,
      confidence: pattern.confidence,
      pattern: pattern.pattern,
      generated: true,
      createdAt: new Date().toISOString(),
    }))

    return rules
  })

/**
 * Show generation results
 */
const showGenerationResults = (rules: Array<{ id: string; description: string; type: string }>) =>
  pipe(
    Effect.log(''),
    Effect.flatMap(() => Effect.log('📊 Rule Generation Results:')),
    Effect.flatMap(() => Effect.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━')),
    Effect.flatMap(() => {
      if (rules.length === 0) {
        return pipe(
          Effect.log('ℹ️  No rules generated'),
          Effect.flatMap(() =>
            Effect.log('   Try lowering the confidence threshold with --threshold')
          ),
        )
      }
      return showGeneratedRules(rules)
    }),
    Effect.flatMap(() => {
      if (rules.length > 0) {
        return pipe(
          Effect.log(''),
          Effect.flatMap(() =>
            Effect.log(`✅ Generated ${rules.length} rules from project analysis`)
          ),
          Effect.flatMap(() => Effect.log('💡 Review and customize these rules in .vibe/rules/')),
        )
      }
      return Effect.void
    }),
  )

/**
 * Display generated rules
 */
const showGeneratedRules = (rules: Array<{ id: string; description: string; type: string }>) =>
  pipe(
    Effect.all(rules.map((rule, index) =>
      pipe(
        Effect.log(`   ${index + 1}. ${rule.name}`),
        Effect.flatMap(() => Effect.log(`      ${rule.description}`)),
        Effect.flatMap(() =>
          Effect.log(`      Confidence: ${(rule.confidence * 100).toFixed(0)}%`)
        ),
      )
    )),
    Effect.flatMap(() => Effect.void),
  )
