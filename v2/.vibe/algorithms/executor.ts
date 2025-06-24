/**
 * Algorithm Executor v2 - Using proven patterns from root
 * Reuses Effect-TS composition and functional error handling
 *
 * @tested_by tests/unit/algorithm-execution.test.ts
 */

import { Effect, pipe } from 'effect'
import { z } from 'zod/v4'
import { createConfigurationError, createFileSystemError, readTextFile, type VibeError } from '../lib/fs-utils.ts'

/**
 * Algorithm schema using proven Zod patterns
 */
export const AlgorithmSchema = z.object({
  path: z.string().min(1),
  type: z.string().min(1),
  steps: z.array(z.object({
    type: z.enum(['assignment', 'condition', 'loop', 'function_call', 'native_node', 'spawn_statement']),
    content: z.string(),
    lineNumber: z.number().int().min(1),
  })),
  inputs: z.record(z.string(), z.any()),
  outputs: z.record(z.string(), z.any()),
})

export const AlgorithmStepSchema = z.object({
  type: z.enum(['assignment', 'condition', 'loop', 'function_call', 'native_node', 'spawn_statement']),
  content: z.string(),
  lineNumber: z.number().int().min(1),
})

export const ExecutionContextSchema = z.object({
  variables: z.record(z.string(), z.any()),
  session: z.any().optional(),
  db: z.any().optional(),
})

export type Algorithm = z.output<typeof AlgorithmSchema>
export type AlgorithmStep = z.output<typeof AlgorithmStepSchema>
export type ExecutionContext = z.output<typeof ExecutionContextSchema>

/**
 * Algorithm executor using functional patterns - NO CLASSES
 */
/**
 * Loads and parses algorithm file using Effect-TS
 */
export const loadAlgorithm = (
  path: string,
): Effect.Effect<Algorithm, VibeError> =>
  pipe(
    readTextFile(path),
    Effect.flatMap((content) => parseAlgorithmContent(content, path)),
    Effect.flatMap((parsed) =>
      Effect.try({
        try: () => AlgorithmSchema.parse(parsed),
        catch: (error) =>
          createConfigurationError(
            error,
            `Invalid algorithm format in ${path}`,
          ),
      })
    ),
  )
/**
 * Parses algorithm content using functional approach
 */
const parseAlgorithmContent = (
  content: string,
  path: string,
): Effect.Effect<Algorithm, VibeError> =>
  pipe(
    Effect.sync(() => {
      const lines = content.split('\n')

      // Extract algorithm type from filename
      const type = path.split('/').pop()?.replace('.md', '') || 'unknown'

      // Parse pseudo-code block
      const pseudoStart = lines.findIndex((l) => l.includes('```pseudo'))
      const pseudoEnd = lines.findIndex((l, i) => i > pseudoStart && l.includes('```'))

      const steps: AlgorithmStep[] = []
      if (pseudoStart >= 0 && pseudoEnd >= 0) {
        for (let i = pseudoStart + 1; i < pseudoEnd; i++) {
          const line = lines[i].trim()
          if (line && !line.startsWith('#')) {
            steps.push(parseAlgorithmStep(line, i))
          }
        }
      }

      // Extract INPUT/OUTPUT declarations
      const inputs = extractInputDeclarations(content)
      const outputs = extractOutputDeclarations(content)

      return {
        path,
        type,
        steps,
        inputs,
        outputs,
      }
    }),
  )
/**
 * Parses individual algorithm step
 */
const parseAlgorithmStep = (line: string, lineNumber: number): AlgorithmStep => {
  const trimmed = line.trim()

  // Assignment: variable = expression
  if (trimmed.includes(' = ') && !trimmed.startsWith('IF') && !trimmed.startsWith('FOR')) {
    return { type: 'assignment', content: trimmed, lineNumber }
  }

  // Condition: IF...THEN...END
  if (trimmed.startsWith('IF ')) {
    return { type: 'condition', content: trimmed, lineNumber }
  }

  // Loop: FOR...IN...DO...END
  if (trimmed.startsWith('FOR ')) {
    return { type: 'loop', content: trimmed, lineNumber }
  }

  // Native node: tsNodeN
  if (trimmed.includes('tsNode')) {
    return { type: 'native_node', content: trimmed, lineNumber }
  }

  // Spawn subagent
  if (trimmed.includes('spawn_subagent')) {
    return { type: 'spawn_statement', content: trimmed, lineNumber }
  }

  // Default to function call
  return { type: 'function_call', content: trimmed, lineNumber }
}
/**
 * Extracts input declarations from algorithm content
 */
const extractInputDeclarations = (content: string): Record<string, any> => {
  const inputMatch = content.match(/INPUT:\s*(.+?)(?=\n|$)/)
  if (!inputMatch) return {}

  const inputStr = inputMatch[1]
  const inputs: Record<string, any> = {}

  // Parse "param: type, param2: type" format
  const params = inputStr.split(',').map((p) => p.trim())
  for (const param of params) {
    const colonIndex = param.indexOf(':')
    if (colonIndex > 0) {
      const name = param.substring(0, colonIndex).trim()
      const type = param.substring(colonIndex + 1).trim()
      inputs[name] = type
    }
  }

  return inputs
}
/**
 * Extracts output declarations from algorithm content
 */
const extractOutputDeclarations = (content: string): Record<string, any> => {
  const outputMatch = content.match(/OUTPUT:\s*(.+?)(?=\n|$)/)
  if (!outputMatch) return {}

  const outputStr = outputMatch[1]
  const outputs: Record<string, any> = {}

  // Parse output types
  const returnTypes = outputStr.split(',').map((t) => t.trim())
  for (let i = 0; i < returnTypes.length; i++) {
    outputs[`output_${i}`] = returnTypes[i]
  }

  return outputs
}
/**
 * Executes algorithm with proper error handling
 */
export const executeAlgorithm = (
  algorithm: Algorithm,
  context: any,
): Effect.Effect<any, VibeError> =>
  pipe(
    Effect.sync(() => {
      const executionContext: ExecutionContext = {
        variables: { ...context },
        session: context.session,
        db: context.db,
      }
      return executionContext
    }),
    Effect.flatMap((execContext) =>
      pipe(
        Effect.all(
          algorithm.steps.map((step) => executeAlgorithmStep(step, execContext)),
          { concurrency: 1 }, // Sequential execution
        ),
        Effect.map(() => ({
          status: 'completed',
          variables: execContext.variables,
          outputs: extractExecutionResults(algorithm.outputs, execContext.variables),
        })),
      )
    ),
  )
/**
 * Executes individual algorithm step
 */
const executeAlgorithmStep = (
  step: AlgorithmStep,
  context: ExecutionContext,
): Effect.Effect<void, VibeError> =>
  pipe(
    Effect.sync(() => {
      switch (step.type) {
        case 'assignment':
          executeAssignment(step.content, context)
          break
        case 'condition':
          executeCondition(step.content, context)
          break
        case 'spawn_statement':
          executeSpawnStatement(step.content, context)
          break
        case 'native_node':
          executeNativeNode(step.content, context)
          break
        default:
          executeFunctionCall(step.content, context)
      }
    }),
  )
/**
 * Helper functions for step execution
 */
const executeAssignment = (content: string, context: ExecutionContext): void => {
  const [variable, expression] = content.split(' = ').map((s) => s.trim())

  // Simple expression evaluation
  if (expression.startsWith('"') && expression.endsWith('"')) {
    context.variables[variable] = expression.slice(1, -1)
  } else if (expression.match(/^\d+$/)) {
    context.variables[variable] = parseInt(expression)
  } else if (context.variables[expression]) {
    context.variables[variable] = context.variables[expression]
  } else {
    context.variables[variable] = `<${expression}>`
  }
}

const executeCondition = (content: string, context: ExecutionContext): void => {
  const conditionMatch = content.match(/IF\s+(.+)\s+THEN/)
  if (!conditionMatch) return

  const condition = conditionMatch[1]
  const result = evaluateCondition(condition, context)
  context.variables['_last_condition_result'] = result
}

const evaluateCondition = (condition: string, context: ExecutionContext): boolean => {
  if (condition.includes('.empty')) {
    const variable = condition.split('.')[0]
    const value = context.variables[variable]
    return !value || (Array.isArray(value) && value.length === 0)
  }
  return false
}

const executeSpawnStatement = (content: string, context: ExecutionContext): void => {
  const match = content.match(/spawn_subagent\("([^"]+)",\s*(.+)\)/)
  if (!match) return

  const [, agentType, agentContext] = match
  context.variables['_last_subagent'] = {
    type: agentType,
    context: agentContext,
    status: 'spawned',
  }
}

const executeNativeNode = (content: string, context: ExecutionContext): void => {
  const match = content.match(/tsNode\d+\s*\/\/\s*(.+)/)
  if (!match) return

  const nativeCode = match[1]
  context.variables['_last_native_result'] = `<native: ${nativeCode}>`
}

const executeFunctionCall = (content: string, context: ExecutionContext): void => {
  context.variables['_last_function_call'] = content
}

const extractExecutionResults = (
  outputSpec: Record<string, any>,
  variables: Record<string, any>,
): any => {
  const results: Record<string, any> = {}

  for (const [key, type] of Object.entries(outputSpec)) {
    if (variables[key]) {
      results[key] = variables[key]
    }
  }

  return results
}

/**
 * Resume from checkpoint using functional patterns
 */
export const resumeFromCheckpoint = (
  checkpoint: any,
): Effect.Effect<any, VibeError> =>
  pipe(
    Effect.sync(() => ({
      resumed_step: checkpoint.step,
      minimal_context: { ...checkpoint.context },
      context_size: Object.keys(checkpoint.context || {}).length,
      status: 'resumed',
    })),
  )
