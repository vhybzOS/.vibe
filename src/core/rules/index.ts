import { Effect, pipe } from 'effect'
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { match } from 'ts-pattern'
import { UniversalRule, UniversalRuleSchema } from '../../schemas/universal-rule.js'

export const loadRules = (vibePath: string) =>
  pipe(
    Effect.tryPromise({
      try: () => readdir(resolve(vibePath, 'rules')),
      catch: () => new Error('Failed to read rules directory'),
    }),
    Effect.flatMap(files => 
      Effect.all(
        files
          .filter(file => file.endsWith('.json'))
          .map(file => loadRule(resolve(vibePath, 'rules', file)))
      )
    ),
    Effect.map(rules => rules.filter(Boolean) as UniversalRule[]),
    Effect.catchAll(() => Effect.succeed([] as UniversalRule[]))
  )

const loadRule = (filePath: string) =>
  pipe(
    Effect.tryPromise({
      try: () => readFile(filePath, 'utf-8'),
      catch: () => new Error(`Failed to read rule file: ${filePath}`),
    }),
    Effect.flatMap(content => 
      Effect.try({
        try: () => JSON.parse(content),
        catch: () => new Error(`Invalid JSON in rule file: ${filePath}`),
      })
    ),
    Effect.flatMap(data => 
      Effect.try({
        try: () => UniversalRuleSchema.parse(data),
        catch: (error) => new Error(`Invalid rule schema: ${error}`),
      })
    ),
    Effect.catchAll(() => Effect.succeed(null))
  )

export const saveRule = (vibePath: string, rule: UniversalRule) =>
  pipe(
    Effect.tryPromise({
      try: () => mkdir(resolve(vibePath, 'rules'), { recursive: true }),
      catch: () => new Error('Failed to create rules directory'),
    }),
    Effect.flatMap(() => {
      const fileName = `${rule.metadata.name.toLowerCase().replace(/\s+/g, '-')}.json`
      const filePath = resolve(vibePath, 'rules', fileName)
      
      return Effect.tryPromise({
        try: () => writeFile(filePath, JSON.stringify(rule, null, 2), 'utf-8'),
        catch: () => new Error(`Failed to save rule: ${filePath}`),
      })
    }),
    Effect.map(() => rule)
  )

export const generateRulesFromProject = (
  projectPath: string, 
  options: { threshold: number; includePatterns: string[] }
) =>
  pipe(
    analyzeProjectPatterns(projectPath),
    Effect.map(patterns => 
      patterns
        .filter(pattern => pattern.confidence >= options.threshold)
        .map(pattern => createRuleFromPattern(pattern))
    ),
    Effect.flatMap(rules => 
      Effect.all(rules.map(rule => 
        Effect.succeed(rule) // In a real implementation, this would validate and process
      ))
    )
  )

const analyzeProjectPatterns = (projectPath: string) =>
  pipe(
    Effect.tryPromise({
      try: () => analyzeCodebaseStructure(projectPath),
      catch: () => new Error('Failed to analyze project structure'),
    }),
    Effect.map(structure => extractPatterns(structure))
  )

const analyzeCodebaseStructure = async (projectPath: string) => {
  // Simplified analysis - in production, this would be much more sophisticated
  return {
    languages: ['typescript', 'javascript'],
    frameworks: ['react', 'nextjs'],
    patterns: [
      {
        type: 'naming',
        description: 'Use camelCase for variables and functions',
        confidence: 0.9,
        examples: ['const userName = "test"', 'function getUserData() {}'],
      },
      {
        type: 'structure',
        description: 'Organize components in feature directories',
        confidence: 0.8,
        examples: ['components/user/UserProfile.tsx', 'components/auth/LoginForm.tsx'],
      },
    ],
  }
}

const extractPatterns = (structure: any) =>
  structure.patterns.map((pattern: any) => ({
    ...pattern,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  }))

const createRuleFromPattern = (pattern: any): UniversalRule => ({
  id: crypto.randomUUID(),
  metadata: {
    name: `Auto-generated: ${pattern.description}`,
    description: `Generated from project analysis - ${pattern.type} pattern`,
    source: 'auto-generated',
    confidence: pattern.confidence,
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    version: '1.0.0',
  },
  targeting: {
    languages: [],
    frameworks: [],
    files: [],
    contexts: [],
  },
  content: {
    markdown: `## ${pattern.description}\n\n${pattern.examples.map((ex: string) => `- \`${ex}\``).join('\n')}`,
    examples: pattern.examples.map((ex: string) => ({
      code: ex,
      language: 'typescript',
      description: 'Example usage',
    })),
    tags: ['auto-generated', pattern.type],
    priority: 'medium',
  },
  compatibility: {
    tools: [],
    formats: {},
  },
  application: {
    mode: 'context',
    conditions: [],
    excludeFiles: [],
    includeFiles: [],
  },
  generated: {
    auto: true,
    confidence: pattern.confidence,
    reviewRequired: true,
  },
})