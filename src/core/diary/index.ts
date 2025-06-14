import { Effect, pipe } from 'effect'
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { DiaryEntry, DiaryEntrySchema, DiarySearchQuery } from '../../schemas/diary-entry.js'

export const searchDiary = (
  vibePath: string,
  query: DiarySearchQuery
) =>
  pipe(
    loadDiaryEntries(vibePath),
    Effect.map(entries => 
      entries
        .filter(entry => matchesSearchQuery(entry, query))
        .slice(query.offset, query.offset + query.limit)
    ),
    Effect.map(entries => 
      entries.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
    )
  )

export const captureDcision = (
  vibePath: string,
  decision: {
    problem: string
    options: string[]
    chosen: string
    rationale: string
    context: Record<string, unknown>
  }
) =>
  pipe(
    Effect.sync(() => createDiaryEntry(decision)),
    Effect.flatMap(entry => saveDiaryEntry(vibePath, entry)),
    Effect.map(savedEntry => ({
      id: savedEntry.id,
      success: true,
      timestamp: savedEntry.timestamp,
    }))
  )

const loadDiaryEntries = (vibePath: string) =>
  pipe(
    Effect.tryPromise({
      try: () => readdir(resolve(vibePath, 'diary')),
      catch: () => new Error('Failed to read diary directory'),
    }),
    Effect.flatMap(files => 
      Effect.all(
        files
          .filter(file => file.endsWith('.json'))
          .map(file => loadDiaryEntry(resolve(vibePath, 'diary', file)))
      )
    ),
    Effect.map(entries => entries.filter(Boolean) as DiaryEntry[]),
    Effect.catchAll(() => Effect.succeed([] as DiaryEntry[]))
  )

const loadDiaryEntry = (filePath: string) =>
  pipe(
    Effect.tryPromise({
      try: () => readFile(filePath, 'utf-8'),
      catch: () => new Error(`Failed to read diary file: ${filePath}`),
    }),
    Effect.flatMap(content => 
      Effect.try({
        try: () => JSON.parse(content),
        catch: () => new Error(`Invalid JSON in diary file: ${filePath}`),
      })
    ),
    Effect.flatMap(data => 
      Effect.try({
        try: () => DiaryEntrySchema.parse(data),
        catch: (error) => new Error(`Invalid diary schema: ${error}`),
      })
    ),
    Effect.catchAll(() => Effect.succeed(null))
  )

const saveDiaryEntry = (vibePath: string, entry: DiaryEntry) =>
  pipe(
    Effect.tryPromise({
      try: () => mkdir(resolve(vibePath, 'diary'), { recursive: true }),
      catch: () => new Error('Failed to create diary directory'),
    }),
    Effect.flatMap(() => {
      const fileName = `${entry.id}.json`
      const filePath = resolve(vibePath, 'diary', fileName)
      
      return Effect.tryPromise({
        try: () => writeFile(filePath, JSON.stringify(entry, null, 2), 'utf-8'),
        catch: () => new Error(`Failed to save diary entry: ${filePath}`),
      })
    }),
    Effect.map(() => entry)
  )

const createDiaryEntry = (decision: {
  problem: string
  options: string[]
  chosen: string
  rationale: string
  context: Record<string, unknown>
}): DiaryEntry => {
  const now = new Date().toISOString()
  
  return {
    id: crypto.randomUUID(),
    timestamp: now,
    context: {
      sessionId: crypto.randomUUID(),
      participants: ['user', 'assistant'],
      topic: extractTopic(decision.problem),
      tool: 'claude', // Default, would be detected in practice
      projectPath: decision.context.projectPath as string,
    },
    problem: {
      description: decision.problem,
      domain: inferDomain(decision.problem),
      complexity: assessComplexity(decision.problem),
      urgency: 'medium',
      scope: 'component',
    },
    exploration: {
      options: decision.options.map(option => ({
        name: option,
        description: option,
        pros: [],
        cons: [],
      })),
      considerations: [],
      constraints: [],
      assumptions: [],
    },
    decision: {
      chosen: decision.chosen,
      rationale: decision.rationale,
      confidence: 'medium',
      reversibility: 'moderate',
      impact: {
        scope: 'local',
        timeframe: 'short-term',
        risk: 'low',
      },
    },
    implementation: {
      notes: '',
      followUpActions: [],
      risks: [],
      successCriteria: [],
      dependencies: [],
    },
    relationships: {
      relatedDecisions: [],
      supersedes: [],
      influences: [],
      influencedBy: [],
    },
    metadata: {
      tags: generateTags(decision.problem, decision.chosen),
      source: 'conversation',
      extractionConfidence: 0.8,
      lastUpdated: now,
      archived: false,
      starred: false,
    },
  }
}

const matchesSearchQuery = (entry: DiaryEntry, query: DiarySearchQuery): boolean => {
  if (query.query) {
    const searchText = query.query.toLowerCase()
    if (!entry.problem.description.toLowerCase().includes(searchText) &&
        !entry.decision.chosen.toLowerCase().includes(searchText) &&
        !entry.decision.rationale.toLowerCase().includes(searchText)) {
      return false
    }
  }
  
  if (query.tags.length > 0 && !query.tags.some(tag => entry.metadata.tags.includes(tag))) {
    return false
  }
  
  if (query.domain.length > 0 && !query.domain.includes(entry.problem.domain)) {
    return false
  }
  
  if (query.tool.length > 0 && !query.tool.includes(entry.context.tool)) {
    return false
  }
  
  if (query.dateRange) {
    const entryDate = new Date(entry.timestamp)
    if (query.dateRange.from && entryDate < new Date(query.dateRange.from)) return false
    if (query.dateRange.to && entryDate > new Date(query.dateRange.to)) return false
  }
  
  return true
}

const extractTopic = (problem: string): string => {
  // Simplified topic extraction
  const words = problem.toLowerCase().split(/\s+/)
  const topics = ['architecture', 'database', 'api', 'ui', 'performance', 'security', 'testing']
  
  for (const topic of topics) {
    if (words.some(word => word.includes(topic))) {
      return topic
    }
  }
  
  return 'general'
}

const inferDomain = (problem: string): any => {
  const text = problem.toLowerCase()
  
  if (text.includes('architecture') || text.includes('structure')) return 'architecture'
  if (text.includes('performance') || text.includes('speed')) return 'performance'
  if (text.includes('security') || text.includes('auth')) return 'security'
  if (text.includes('test') || text.includes('testing')) return 'testing'
  if (text.includes('design') || text.includes('ui')) return 'design'
  if (text.includes('deploy') || text.includes('deployment')) return 'deployment'
  if (text.includes('tool') || text.includes('tooling')) return 'tooling'
  
  return 'implementation'
}

const assessComplexity = (problem: string): any => {
  const text = problem.toLowerCase()
  
  if (text.includes('simple') || text.includes('basic') || text.includes('small')) return 'simple'
  if (text.includes('complex') || text.includes('difficult') || text.includes('major')) return 'complex'
  if (text.includes('critical') || text.includes('breaking') || text.includes('important')) return 'critical'
  
  return 'moderate'
}

const generateTags = (problem: string, chosen: string): string[] => {
  const tags: string[] = []
  const text = (problem + ' ' + chosen).toLowerCase()
  
  // Extract technology tags
  const technologies = ['react', 'typescript', 'nodejs', 'python', 'rust', 'go', 'java']
  technologies.forEach(tech => {
    if (text.includes(tech)) tags.push(tech)
  })
  
  // Extract action tags
  const actions = ['refactor', 'implement', 'design', 'optimize', 'fix', 'add', 'remove']
  actions.forEach(action => {
    if (text.includes(action)) tags.push(action)
  })
  
  return tags
}