/**
 * Universal Rules management
 * Handles loading, saving, and generating rules
 */

import { Effect, pipe } from 'effect'
import { resolve } from '@std/path'
import { UniversalRule, UniversalRuleSchema } from '../schemas/universal-rule.ts'
import { listFiles, readJSONFile, writeJSONFile } from '../lib/fs.ts'
import { logWithContext } from '../lib/effects.ts'
import { createParseError } from '../lib/errors.ts'

/**
 * Loads all rules from the .vibe/rules directory
 */
export const loadRules = (vibePath: string) =>
  pipe(
    listFiles(resolve(vibePath, 'rules'), (entry) => entry.name.endsWith('.json')),
    Effect.flatMap((ruleFiles) => Effect.all(ruleFiles.map(loadSingleRule))),
    Effect.map((rules) => rules.filter((rule): rule is UniversalRule => rule !== null)),
    Effect.tap((rules) => logWithContext('Rules', `Loaded ${rules.length} rules`)),
    Effect.catchAll(() => Effect.succeed([] as UniversalRule[])),
  )

/**
 * Loads a single rule file
 */
const loadSingleRule = (filePath: string) =>
  pipe(
    readJSONFile<unknown>(filePath),
    Effect.flatMap((data) =>
      Effect.try({
        try: () => UniversalRuleSchema.parse(data),
        catch: (error) =>
          createParseError(error, filePath, `Invalid rule schema in ${filePath}: ${error}`),
      })
    ),
    Effect.catchAll((error) => {
      logWithContext('Rules', `Failed to load ${filePath}: ${error.message}`)
      return Effect.succeed(null)
    }),
  )

/**
 * Saves a Universal Rule to the rules directory
 */
export const saveRule = (vibePath: string, rule: UniversalRule) =>
  pipe(
    Effect.sync(() => {
      const fileName = `${rule.metadata.name.toLowerCase().replace(/\s+/g, '-')}.json`
      return resolve(vibePath, 'rules', fileName)
    }),
    Effect.flatMap((filePath) => writeJSONFile(filePath, rule)),
    Effect.tap(() => logWithContext('Rules', `Saved rule: ${rule.metadata.name}`)),
    Effect.map(() => rule),
  )

/**
 * Generates rules from project analysis
 */
export const generateRulesFromProject = (
  projectPath: string,
  options: { threshold: number; includePatterns: string[] },
) =>
  pipe(
    analyzeProjectPatterns(projectPath),
    Effect.map((patterns) =>
      patterns
        .filter((pattern: { confidence: number }) => pattern.confidence >= options.threshold)
        .map(createRuleFromPattern)
    ),
    Effect.tap((rules) =>
      logWithContext('Generation', `Generated ${rules.length} rules from project analysis`)
    ),
  )

/**
 * Analyzes project for common patterns
 */
const analyzeProjectPatterns = (projectPath: string) =>
  pipe(
    Effect.sync(() => analyzeCodebaseStructure(projectPath)),
    Effect.map((structure) => extractPatterns(structure)),
  )

/**
 * Simplified codebase structure analysis
 */
const analyzeCodebaseStructure = (projectPath: string) => {
  // In a real implementation, this would use AST analysis
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

/**
 * Extracts patterns with metadata
 */
const extractPatterns = (
  structure: {
    patterns: Array<{ type: string; description: string; confidence: number; examples: string[] }>
  },
) =>
  structure.patterns.map((pattern) => ({
    ...pattern,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  }))

/**
 * Creates a Universal Rule from a detected pattern
 */
const createRuleFromPattern = (
  pattern: { type: string; description: string; confidence: number; examples: string[] },
): UniversalRule => ({
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
    markdown: `## ${pattern.description}\n\n${
      pattern.examples.map((ex: string) => `- \`${ex}\``).join('\n')
    }`,
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
