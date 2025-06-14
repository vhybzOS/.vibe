import { Effect, pipe } from 'effect'
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { loadRules } from '../../core/rules/index.js'
import { searchDiary } from '../../core/diary/index.js'
import { searchMemory } from '../../core/memory/index.js'
import { AgentFile, AgentFileSchema } from '../../schemas/agent-file.js'

export const exportCommand = (
  projectPath: string,
  options: { output: string; format: string }
) =>
  pipe(
    Effect.log('📦 Preparing export...'),
    Effect.all([
      loadRules(resolve(projectPath, '.vibe')),
      loadDiaryEntries(projectPath),
      loadMemories(projectPath),
    ]),
    Effect.flatMap(([rules, diary, memories]) => 
      pipe(
        Effect.sync(() => createAgentFile(projectPath, rules, diary, memories, options.format)),
        Effect.flatMap(agentFile => 
          Effect.try({
            try: () => AgentFileSchema.parse(agentFile),
            catch: (error) => new Error(`Invalid AgentFile schema: ${error}`),
          })
        ),
        Effect.flatMap(validatedAgentFile => 
          Effect.tryPromise({
            try: () => writeFile(
              resolve(projectPath, options.output),
              JSON.stringify(validatedAgentFile, null, 2),
              'utf-8'
            ),
            catch: () => new Error(`Failed to write export file: ${options.output}`),
          })
        ),
        Effect.tap(() => Effect.log(`✅ Exported to ${options.output}`))
      )
    ),
    Effect.catchAll(error => 
      Effect.log(`❌ Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    )
  )

const loadDiaryEntries = (projectPath: string) =>
  pipe(
    searchDiary(resolve(projectPath, '.vibe'), {
      limit: 1000,
      offset: 0,
    }),
    Effect.catchAll(() => Effect.succeed([]))
  )

const loadMemories = (projectPath: string) =>
  pipe(
    searchMemory(resolve(projectPath, '.vibe'), {
      query: '',
      limit: 1000,
      threshold: 0,
    }),
    Effect.map(results => results.map(r => r.memory)),
    Effect.catchAll(() => Effect.succeed([]))
  )

const createAgentFile = (
  projectPath: string,
  rules: any[],
  diary: any[],
  memories: any[],
  format: string
): AgentFile => {
  const now = new Date().toISOString()
  const projectName = projectPath.split('/').pop() || 'unnamed-project'
  
  return {
    metadata: {
      version: '1.0.0',
      created: now,
      updated: now,
      schema: 'dotvibe-compatible',
      generator: 'dotvibe',
      project: {
        name: projectName,
        path: projectPath,
        languages: extractLanguages(rules),
        frameworks: extractFrameworks(rules),
        description: `Exported from .vibe configuration`,
      },
      statistics: {
        totalRules: rules.length,
        totalDecisions: diary.length,
        totalMemories: memories.length,
        totalDependencies: 0,
        lastActivity: now,
      },
    },
    agent: {
      name: `${projectName} AI Assistant`,
      description: 'AI assistant configured with project-specific rules and memory',
      capabilities: [
        'code-analysis',
        'rule-application',
        'decision-tracking',
        'memory-management',
        'context-injection',
      ],
      preferences: {
        verbosity: 'normal',
        autoApplyRules: true,
        trackDecisions: true,
        suggestImprovements: true,
      },
      constraints: [],
    },
    rules: {
      active: rules.filter(r => r.application.mode === 'always').map(r => r.metadata.name),
      compiled: rules,
      generated: rules.filter(r => r.generated?.auto),
      deprecated: [],
      conflicts: [],
    },
    documentation: {
      llms_txt: generateLlmsTxt(rules),
      dependency_docs: {},
      custom_docs: [],
      metadata: {
        lastGenerated: now,
        generationMethod: 'automatic',
      },
    },
    memory: {
      conversations: memories,
      decisions: diary,
      patterns: [],
      context: {},
      statistics: {
        totalInteractions: memories.length,
        avgSessionLength: 0,
        topTopics: extractTopTopics(diary),
        lastActivity: now,
      },
    },
    dependencies: [],
    integrations: {
      tools: [],
      syncSettings: {},
    },
    export: {
      exportedAt: now,
      exportVersion: '1.0.0',
      includeMemories: format !== 'rules-only',
      includeDecisions: format !== 'rules-only',
      includeDependencies: format === 'full',
      format: format as any,
    },
  }
}

const extractLanguages = (rules: any[]): string[] => {
  const languages = new Set<string>()
  rules.forEach(rule => {
    rule.targeting.languages.forEach((lang: string) => languages.add(lang))
  })
  return Array.from(languages)
}

const extractFrameworks = (rules: any[]): string[] => {
  const frameworks = new Set<string>()
  rules.forEach(rule => {
    rule.targeting.frameworks.forEach((fw: string) => frameworks.add(fw))
  })
  return Array.from(frameworks)
}

const generateLlmsTxt = (rules: any[]): string => {
  const header = '# Project Rules and Guidelines\n\n> Auto-generated by .vibe\n\n'
  
  const sections = rules.map(rule => {
    return [
      `## ${rule.metadata.name}`,
      '',
      rule.metadata.description,
      '',
      rule.content.markdown,
      '',
    ].join('\n')
  })
  
  return header + sections.join('\n')
}

const extractTopTopics = (diary: any[]): string[] => {
  const topics = new Set<string>()
  diary.forEach(entry => {
    entry.metadata.tags.forEach((tag: string) => topics.add(tag))
  })
  return Array.from(topics).slice(0, 10) // Top 10 topics
}