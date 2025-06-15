import { Effect, pipe } from 'effect'
import { generateRulesFromProject, saveRule } from '../../rules/index.ts'
import { resolve } from '@std/path'

export const generateCommand = (
  projectPath: string,
  options: { threshold: string; patterns?: string[] }
) =>
  pipe(
    Effect.log('🔍 Analyzing project patterns...'),
    generateRulesFromProject(projectPath, {
      threshold: parseFloat(options.threshold),
      includePatterns: options.patterns || [],
    }),
    Effect.tap(rules => 
      Effect.log(`✅ Generated ${rules.length} rule(s) from project analysis`)
    ),
    Effect.flatMap(rules => 
      Effect.all(
        rules.map(rule => 
          pipe(
            saveRule(resolve(projectPath, '.vibe'), rule),
            Effect.tap(() => Effect.log(`💾 Saved rule: ${rule.metadata.name}`))
          )
        )
      )
    ),
    Effect.tap(savedRules => 
      savedRules.length > 0
        ? Effect.log(`🎉 Successfully generated and saved ${savedRules.length} rules!`)
        : Effect.log('ℹ️  No rules generated (try lowering --threshold)')
    ),
    Effect.catchAll(error => 
      Effect.log(`❌ Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    )
  )