import { Effect, pipe } from 'effect'
import { resolve } from '@std/path'
import { DiaryEntry, DiaryEntrySchema, DiarySearchQuery } from '../../schemas/diary-entry.ts'
import { initializeSearchDatabase, insertDocument, searchVibe, SearchQuery } from '../search/index.ts'
import { VibeDocument } from '../search/schema.ts'

/**
 * Searches diary entries using the unified Orama search system
 * Supports both keyword and semantic search across decision records
 * 
 * @param vibePath - Path to the .vibe directory
 * @param query - Diary search query
 * @returns Effect that resolves to search results
 */
export const searchDiary = (
  vibePath: string,
  query: DiarySearchQuery
) =>
  pipe(
    initializeSearchDatabase(resolve(vibePath, '..')),
    Effect.flatMap(() => {
      // Convert DiarySearchQuery to SearchQuery
      const searchQuery: SearchQuery = {
        term: query.query,
        filters: {
          doc_type: 'diary',
          tags: query.tags.length > 0 ? query.tags : undefined,
          date_range: query.dateRange ? {
            start: query.dateRange.from ? new Date(query.dateRange.from).getTime() : undefined,
            end: query.dateRange.to ? new Date(query.dateRange.to).getTime() : undefined,
          } : undefined,
        },
        mode: 'hybrid',
        limit: query.limit,
        offset: query.offset,
      }
      
      return searchVibe(searchQuery)
    }),
    Effect.map(response => 
      response.results.map(result => convertDocumentToDiaryEntry(result.document))
    )
  )

/**
 * Captures a decision and indexes it for search
 * Saves to both file system and search index
 * 
 * @param vibePath - Path to the .vibe directory
 * @param decision - Decision data to capture
 * @returns Effect that resolves when decision is captured and indexed
 */
export const captureDecision = (
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
    Effect.flatMap(entry => 
      pipe(
        saveDiaryEntry(vibePath, entry),
        Effect.flatMap(() => indexDiaryEntry(vibePath, entry)),
        Effect.map(() => entry)
      )
    ),
    Effect.map(savedEntry => ({
      id: savedEntry.id,
      success: true,
      timestamp: savedEntry.timestamp,
    }))
  )

/**
 * Indexes a diary entry in the search database
 * 
 * @param vibePath - Path to the .vibe directory
 * @param entry - Diary entry to index
 * @returns Effect that completes when entry is indexed
 */
const indexDiaryEntry = (vibePath: string, entry: DiaryEntry) =>
  pipe(
    initializeSearchDatabase(resolve(vibePath, '..')),
    Effect.flatMap(() => {
      const document: VibeDocument = {
        id: entry.id,
        doc_type: 'diary',
        timestamp: new Date(entry.timestamp).getTime(),
        content: `${entry.problem.description}\n\nChosen: ${entry.decision.chosen}\n\nRationale: ${entry.decision.rationale}`,
        tags: entry.metadata.tags,
        metadata: {
          project_path: resolve(vibePath, '..'),
          source: 'diary',
          priority: entry.decision.impact.risk === 'high' ? 'high' : 'medium',
          category: entry.problem.domain,
        },
      }
      
      return insertDocument(document)
    })
  )

/**
 * Converts a VibeDocument back to a DiaryEntry object
 * Used when retrieving search results
 * 
 * @param document - Search document to convert
 * @returns DiaryEntry object
 */
const convertDocumentToDiaryEntry = (document: VibeDocument): DiaryEntry => {
  // Parse the content back into problem, chosen, and rationale
  const contentParts = document.content.split('\n\n')
  const problem = contentParts[0] || ''
  const chosen = contentParts[1]?.replace('Chosen: ', '') || ''
  const rationale = contentParts[2]?.replace('Rationale: ', '') || ''
  
  return {
    id: document.id,
    timestamp: new Date(document.timestamp).toISOString(),
    context: {
      sessionId: crypto.randomUUID(),
      participants: ['user', 'assistant'],
      topic: 'recovered',
      tool: 'vibe',
      projectPath: document.metadata.project_path || '',
    },
    problem: {
      description: problem,
      domain: document.metadata.category as any || 'implementation',
      complexity: 'moderate',
      urgency: 'medium',
      scope: 'component',
    },
    exploration: {
      options: [],
      considerations: [],
      constraints: [],
      assumptions: [],
    },
    decision: {
      chosen,
      rationale,
      confidence: 'medium',
      reversibility: 'moderate',
      impact: {
        scope: 'local',
        timeframe: 'short-term',
        risk: document.metadata.priority === 'high' ? 'high' : 'low',
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
      tags: document.tags,
      source: 'conversation',
      extractionConfidence: 0.8,
      lastUpdated: new Date(document.timestamp).toISOString(),
      archived: false,
      starred: false,
    },
  }
}

/**
 * Loads all diary entries from the file system (legacy function for migration)
 * 
 * @param vibePath - Path to the .vibe directory
 * @returns Effect that resolves to array of diary entries
 */
const loadDiaryEntries = (vibePath: string) =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        const diaryDir = resolve(vibePath, 'diary')
        const files = []
        
        try {
          for await (const entry of Deno.readDir(diaryDir)) {
            if (entry.isFile && entry.name.endsWith('.json')) {
              files.push(entry.name)
            }
          }
        } catch {
          return [] // Directory doesn't exist
        }
        
        return files
      },
      catch: () => new Error('Failed to read diary directory'),
    }),
    Effect.flatMap(files => 
      Effect.all(
        files.map(file => loadDiaryEntry(resolve(vibePath, 'diary', file)))
      )
    ),
    Effect.map(entries => entries.filter(Boolean) as DiaryEntry[]),
    Effect.catchAll(() => Effect.succeed([] as DiaryEntry[]))
  )

/**
 * Loads a single diary entry from file (legacy function for migration)
 * 
 * @param filePath - Path to the diary file
 * @returns Effect that resolves to DiaryEntry or null
 */
const loadDiaryEntry = (filePath: string) =>
  pipe(
    Effect.tryPromise({
      try: () => Deno.readTextFile(filePath),
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

/**
 * Saves a diary entry to the file system
 * 
 * @param vibePath - Path to the .vibe directory
 * @param entry - Diary entry to save
 * @returns Effect that resolves when entry is saved
 */
const saveDiaryEntry = (vibePath: string, entry: DiaryEntry) =>
  pipe(
    Effect.tryPromise({
      try: () => Deno.mkdir(resolve(vibePath, 'diary'), { recursive: true }),
      catch: () => new Error('Failed to create diary directory'),
    }),
    Effect.flatMap(() => {
      const fileName = `${entry.id}.json`
      const filePath = resolve(vibePath, 'diary', fileName)
      
      return Effect.tryPromise({
        try: () => Deno.writeTextFile(filePath, JSON.stringify(entry, null, 2)),
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

/**
 * Extracts a topic from the problem description
 * 
 * @param problem - Problem description
 * @returns Extracted topic
 */
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

/**
 * Infers the domain/category from the problem description
 * 
 * @param problem - Problem description
 * @returns Inferred domain
 */
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

/**
 * Assesses the complexity level from the problem description
 * 
 * @param problem - Problem description
 * @returns Assessed complexity level
 */
const assessComplexity = (problem: string): any => {
  const text = problem.toLowerCase()
  
  if (text.includes('simple') || text.includes('basic') || text.includes('small')) return 'simple'
  if (text.includes('complex') || text.includes('difficult') || text.includes('major')) return 'complex'
  if (text.includes('critical') || text.includes('breaking') || text.includes('important')) return 'critical'
  
  return 'moderate'
}

/**
 * Generates tags from problem and solution text
 * 
 * @param problem - Problem description
 * @param chosen - Chosen solution
 * @returns Array of extracted tags
 */
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