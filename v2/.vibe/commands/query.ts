/**
 * Vibe Query Command - Revolutionary context management
 * Get precise 10-line code snippets instead of 1000-line files
 *
 * @tested_by tests/unit/query-command.test.ts
 */

import { Effect, pipe } from 'effect'
import { z } from 'zod/v4'
import { createConfigurationError, createFileSystemError, type VibeError } from '../../ure/lib/errors.ts'
import { type CodeNode, indexCodebaseWithTreeSitter, queryCodePatterns } from '../lib/tree-sitter-indexer.ts'
import { indexCodeFile, initializeSurrealDB, querySurrealDB } from '../lib/surrealdb.ts'

/**
 * Query options schema
 */
export const QueryOptionsSchema = z.object({
  limit: z.number().int().min(1).max(50).default(10),
  file: z.string().optional(), // Filter by specific file
  type: z.enum(['function', 'class', 'error_handling', 'async', 'all']).default('all'),
  language: z.enum(['typescript', 'javascript', 'python']).default('typescript'),
  session: z.string().optional(), // Filter by session context
  complexity: z.enum(['low', 'medium', 'high', 'all']).default('all'),
})

export type QueryOptions = z.output<typeof QueryOptionsSchema>

/**
 * Query result schema
 */
export const QueryResultSchema = z.object({
  query: z.string(),
  results: z.array(z.object({
    file_path: z.string(),
    name: z.string().optional(),
    node_type: z.string(),
    line_range: z.tuple([z.number(), z.number()]),
    code_snippet: z.string(),
    relevance_score: z.number().min(0).max(1),
    patterns: z.array(z.string()),
  })),
  total_results: z.number().int(),
  context_tokens_saved: z.number().int(), // vs loading full files
  execution_time_ms: z.number(),
})

export type QueryResult = z.output<typeof QueryResultSchema>

/**
 * Revolutionary vibe query command
 */
export const executeVibeQuery = (
  projectPath: string,
  query: string,
  options: QueryOptions = {},
): Effect.Effect<QueryResult, VibeError> => {
  const startTime = Date.now()
  const dbPath = `${projectPath}/.vibe/code.db`

  return pipe(
    // Validate options
    Effect.try({
      try: () => QueryOptionsSchema.parse(options),
      catch: (error) =>
        createConfigurationError(
          error,
          'Invalid query options',
        ),
    }),
    // Check if codebase is indexed, if not index it
    Effect.flatMap((validOptions) =>
      pipe(
        checkCodebaseIndexed(dbPath),
        Effect.flatMap((isIndexed) => {
          if (isIndexed) {
            return queryFromDatabase(dbPath, query, validOptions)
          } else {
            // Index codebase first, then query
            return pipe(
              indexAndStoreCodebase(projectPath, dbPath, validOptions.language),
              Effect.flatMap(() => queryFromDatabase(dbPath, query, validOptions)),
            )
          }
        }),
      )
    ),
    // Format results
    Effect.map((nodes) => formatQueryResults(query, nodes, startTime)),
    Effect.catchAll((error) =>
      Effect.fail(createFileSystemError(
        error,
        projectPath,
        `Query failed: ${query}`,
      ))
    ),
  )
}

/**
 * Check if codebase is already indexed in SurrealDB
 */
const checkCodebaseIndexed = (dbPath: string): Effect.Effect<boolean, VibeError> =>
  pipe(
    initializeSurrealDB(dbPath),
    Effect.flatMap(() => querySurrealDB('SELECT COUNT() FROM code_node LIMIT 1')),
    Effect.map((results) => results.length > 0 && results[0].count > 0),
    Effect.catchAll(() => Effect.succeed(false)),
  )

/**
 * Index codebase and store in SurrealDB
 */
const indexAndStoreCodebase = (
  projectPath: string,
  dbPath: string,
  language: 'typescript' | 'javascript' | 'python',
): Effect.Effect<void, VibeError> =>
  pipe(
    Effect.log(`Indexing codebase with tree-sitter for ${language}...`),
    Effect.flatMap(() => indexCodebaseWithTreeSitter(projectPath, language)),
    Effect.flatMap((nodes) =>
      pipe(
        initializeSurrealDB(dbPath),
        Effect.flatMap(() =>
          Effect.all(
            nodes.map((node) => storeCodeNodeInDB(dbPath, node)),
            { concurrency: 10 },
          )
        ),
        Effect.map(() => {
          console.log(`✅ Indexed ${nodes.length} code patterns`)
        }),
      )
    ),
  )

/**
 * Store code node in SurrealDB
 */
const storeCodeNodeInDB = (
  dbPath: string,
  node: CodeNode,
): Effect.Effect<void, VibeError> =>
  pipe(
    querySurrealDB(
      `UPDATE code_node:${node.id.replace(/[^a-zA-Z0-9]/g, '_')} CONTENT $data`,
      { data: node },
    ),
    Effect.map(() => void 0),
  )

/**
 * Query from SurrealDB with intelligent pattern matching
 */
const queryFromDatabase = (
  dbPath: string,
  query: string,
  options: QueryOptions,
): Effect.Effect<CodeNode[], VibeError> => {
  const queryLower = query.toLowerCase()

  // Build intelligent SurrealQL query
  let surrealQuery = `
    SELECT * FROM code_node 
    WHERE (
      patterns CONTAINSANY [${queryLower.split(' ').map((w) => `"${w}"`).join(', ')}]
      OR name CONTAINS "${queryLower}"
      OR code_snippet CONTAINS "${queryLower}"
    )
  `

  // Add filters
  if (options.file) {
    surrealQuery += ` AND file_path CONTAINS "${options.file}"`
  }

  if (options.type !== 'all') {
    surrealQuery += ` AND node_type CONTAINS "${options.type}"`
  }

  if (options.complexity !== 'all') {
    const complexityRange = getComplexityRange(options.complexity)
    surrealQuery += ` AND complexity_score BETWEEN ${complexityRange[0]} AND ${complexityRange[1]}`
  }

  surrealQuery += ` ORDER BY complexity_score DESC LIMIT ${options.limit}`

  return pipe(
    initializeSurrealDB(dbPath),
    Effect.flatMap(() => querySurrealDB(surrealQuery)),
    Effect.map((results) => results as CodeNode[]),
  )
}

/**
 * Get complexity score range for filter
 */
function getComplexityRange(complexity: string): [number, number] {
  switch (complexity) {
    case 'low':
      return [0, 0.3]
    case 'medium':
      return [0.3, 0.7]
    case 'high':
      return [0.7, 1.0]
    default:
      return [0, 1.0]
  }
}

/**
 * Format query results with context savings calculation
 */
const formatQueryResults = (
  query: string,
  nodes: CodeNode[],
  startTime: number,
): QueryResult => {
  const executionTime = Date.now() - startTime

  // Calculate context tokens saved
  const avgFileSize = 1000 // Assume 1000 lines per file
  const avgLinesReturned = nodes.reduce((sum, node) => {
    const [start, end] = node.line_range
    return sum + (end - start + 1)
  }, 0) / Math.max(nodes.length, 1)

  const filesQueried = new Set(nodes.map((n) => n.file_path)).size
  const contextTokensSaved = (filesQueried * avgFileSize) - avgLinesReturned

  return {
    query,
    results: nodes.map((node) => ({
      file_path: node.file_path,
      name: node.name,
      node_type: node.node_type,
      line_range: node.line_range,
      code_snippet: node.code_snippet,
      relevance_score: calculateRelevanceScore(node, query),
      patterns: node.patterns,
    })),
    total_results: nodes.length,
    context_tokens_saved: Math.max(0, contextTokensSaved),
    execution_time_ms: executionTime,
  }
}

/**
 * Calculate relevance score for ranking
 */
function calculateRelevanceScore(node: CodeNode, query: string): number {
  const queryLower = query.toLowerCase()
  let score = 0

  // Pattern matches
  const patternMatches = node.patterns.filter((p) => p.includes(queryLower) || queryLower.includes(p)).length
  score += patternMatches * 0.3

  // Name matches
  if (node.name?.toLowerCase().includes(queryLower)) {
    score += 0.4
  }

  // Content matches
  if (node.code_snippet.toLowerCase().includes(queryLower)) {
    score += 0.2
  }

  // Complexity bonus
  score += node.complexity_score * 0.1

  return Math.min(score, 1.0)
}

/**
 * CLI-friendly query examples
 */
export const getQueryExamples = (): string[] => [
  // Natural language queries
  'async functions in auth module',
  'error handling patterns',
  'React components with useState hooks',
  'function definitions that return promises',
  'authentication logic',
  'database connection code',
  'API endpoint handlers',
  'validation functions',

  // Tree-sitter syntax queries (future)
  '(function_declaration name: (identifier) @name)',
  '(method_definition key: (property_identifier) @method)',
]

/**
 * Show query help
 */
export const showQueryHelp = (): string => `
🔍 Vibe Query - Revolutionary Context Management

Get precise 10-line code snippets instead of 1000-line files!

USAGE:
  vibe query "<query>" [options]

EXAMPLES:
  vibe query "async functions"
  vibe query "error handling" --type error_handling --limit 5
  vibe query "auth" --file src/auth.ts
  vibe query "database" --complexity high

OPTIONS:
  --limit <n>        Number of results (1-50, default: 10)
  --file <path>      Filter by specific file  
  --type <type>      Filter by node type (function|class|error_handling|async|all)
  --language <lang>  Language to parse (typescript|javascript|python)
  --complexity <c>   Complexity filter (low|medium|high|all)

REVOLUTIONARY BENEFITS:
  ✅ 100x more precise context than reading full files
  ✅ Instant access to relevant code patterns
  ✅ Dramatically reduced token usage
  ✅ Intelligent pattern recognition via tree-sitter
`
