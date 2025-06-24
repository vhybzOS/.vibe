/**
 * Tree-sitter Code Indexer - Revolutionary context management
 * Parses codebase into precise, queryable patterns stored in SurrealDB
 *
 * @tested_by tests/unit/tree-sitter-indexer.test.ts
 */

import { Effect, pipe } from 'effect'
import { z } from 'zod/v4'
import { resolve } from '@std/path'
import { createConfigurationError, createFileSystemError, type VibeError } from '../../ure/lib/errors.ts'
import { listFiles, readTextFile } from '../../ure/lib/fs.ts'

/**
 * Code node schema - represents a tree-sitter parsed AST node
 */
export const CodeNodeSchema = z.object({
  id: z.string().min(1),
  file_path: z.string().min(1),
  node_type: z.string().min(1), // function_declaration, class_declaration, etc.
  name: z.string().optional(), // function/class/variable name
  line_range: z.tuple([z.number().int(), z.number().int()]), // [start_line, end_line]
  code_snippet: z.string().min(1), // actual code content
  ast_context: z.record(z.any()), // parent/sibling context
  patterns: z.array(z.string()), // ["async", "authentication", "error_handling"]
  complexity_score: z.number().min(0).max(1),
  dependencies: z.array(z.string()).default([]), // imports/requires
  language: z.enum(['typescript', 'javascript', 'python', 'rust', 'go', 'pseudo-kernel', 'pseudo-typescript', 'specs']),
  indexed_at: z.string().datetime(),
})

export type CodeNode = z.output<typeof CodeNodeSchema>

/**
 * Language-specific tree-sitter parsers
 */
export interface TreeSitterParser {
  language: string
  parseFile(filePath: string, content: string): Effect.Effect<CodeNode[], VibeError>
  getQueryPatterns(): string[]
}

/**
 * TypeScript/JavaScript parser using tree-sitter
 */
export class TypeScriptTreeSitterParser implements TreeSitterParser {
  language = 'typescript'

  parseFile(filePath: string, content: string): Effect.Effect<CodeNode[], VibeError> {
    return pipe(
      Effect.tryPromise({
        try: async () => {
          // Revolutionary: Use real tree-sitter CLI integration via shell scripts
          const nodes = await this.parseWithTreeSitter(filePath, content)
          return nodes
        },
        catch: (error) =>
          createFileSystemError(
            error,
            filePath,
            `Failed to parse TypeScript file: ${filePath}`,
          ),
      }),
    )
  }

  private async parseWithTreeSitter(filePath: string, content: string): Promise<CodeNode[]> {
    // Determine grammar based on file extension or content
    const grammarName = this.detectGrammar(filePath, content)
    const grammarDir = resolve('grammars', grammarName)
    const parseScript = resolve(grammarDir, 'parse')
    
    try {
      // Write content to temporary file
      const tempFile = `/tmp/tree-sitter-input-${Date.now()}.tmp`
      await Deno.writeTextFile(tempFile, content)
      
      // Execute tree-sitter parse via shell script
      const result = await new Deno.Command(parseScript, {
        args: [tempFile],
        cwd: grammarDir
      }).output()
      
      // Clean up temp file
      await Deno.remove(tempFile)
      
      if (result.code !== 0) {
        const error = new TextDecoder().decode(result.stderr)
        throw new Error(`Tree-sitter parsing failed: ${error}`)
      }
      
      // Parse tree-sitter JSON output
      const jsonOutput = new TextDecoder().decode(result.stdout)
      const astTree = JSON.parse(jsonOutput)
      
      // Convert tree-sitter AST to CodeNode format
      return this.convertASTToCodeNodes(astTree, filePath, content)
    } catch (error) {
      console.warn(`Failed to parse with tree-sitter: ${error}`)
      // Fallback to regex parsing for now
      return this.parseWithRegex(filePath, content)
    }
  }

  private detectGrammar(filePath: string, content: string): string {
    // Check for shebang grammar (PRIORITY: Algorithm files with shebangs)
    const shebangMatch = content.match(/^#!\/grammars\/(.+)\s+parse/)
    if (shebangMatch) {
      return shebangMatch[1]
    }
    
    // Detect by file location and content patterns
    if (filePath.includes('/.vibe/algorithms/') && filePath.endsWith('.md')) {
      // Algorithm files in .vibe/algorithms/ directory use pseudo-kernel
      return 'pseudo-kernel'
    }
    
    if (filePath.endsWith('.pseudo-ts') || filePath.endsWith('.pts')) {
      return 'pseudo-typescript'
    }
    
    if (filePath.endsWith('.specs') || filePath.endsWith('.md')) {
      // Check if it's a specs file
      if (content.includes('## Intent') || content.includes('## Inputs') || content.includes('## Outputs')) {
        return 'specs'
      }
    }
    
    // Default to pseudo-typescript
    return 'pseudo-typescript'
  }

  private convertASTToCodeNodes(astTree: any, filePath: string, content: string): CodeNode[] {
    const nodes: CodeNode[] = []
    const lines = content.split('\n')
    
    // Recursively traverse AST and extract meaningful nodes
    this.traverseAST(astTree, nodes, filePath, lines)
    
    return nodes
  }

  private traverseAST(node: any, nodes: CodeNode[], filePath: string, lines: string[]): void {
    if (!node || typeof node !== 'object') return
    
    // Extract meaningful nodes based on type
    if (node.type && this.isSignificantNodeType(node.type)) {
      const codeNode = this.createCodeNodeFromAST(node, filePath, lines)
      if (codeNode) {
        nodes.push(codeNode)
      }
    }
    
    // Recursively traverse children
    if (node.children && Array.isArray(node.children)) {
      for (const child of node.children) {
        this.traverseAST(child, nodes, filePath, lines)
      }
    }
  }

  private isSignificantNodeType(nodeType: string): boolean {
    const significantTypes = [
      // Pseudo-typescript types
      'assignment',
      'function_call', 
      'condition',
      'native_node',
      'input_declaration',
      'output_declaration',
      'return_statement',
      
      // Pseudo-kernel types (LLM-native algorithm syntax)
      'function_definition',
      'let_binding',
      'if_statement',
      'match_statement',
      'system_function_call',
      'spawn_statement',
      'execute_statement',
      
      // Specs types
      'feature_section',
      'intent_section', 
      'constraint_spec',
      
      // Markdown types
      'markdown_header',
      'pseudo_code_block',
      'context_link'
    ]
    return significantTypes.includes(nodeType)
  }

  private createCodeNodeFromAST(node: any, filePath: string, lines: string[]): CodeNode | null {
    if (!node.start_position || !node.end_position) return null
    
    const startLine = node.start_position.row
    const endLine = node.end_position.row
    const snippet = lines.slice(startLine, endLine + 1).join('\n')
    
    // Extract name from node (if available)
    const name = this.extractNameFromNode(node) || 'anonymous'
    
    // Generate patterns based on node type and content
    const patterns = this.generatePatterns(node, snippet)
    
    return {
      id: `${filePath}:${node.type}:${startLine}`,
      file_path: filePath,
      node_type: node.type,
      name,
      line_range: [startLine + 1, endLine + 1], // 1-indexed
      code_snippet: snippet.slice(0, 500), // Limit snippet size
      ast_context: {},
      patterns,
      complexity_score: this.calculateComplexity(snippet),
      dependencies: [],
      language: this.detectLanguage(filePath),
      indexed_at: new Date().toISOString()
    }
  }

  private extractNameFromNode(node: any): string | null {
    // Extract identifier names from various node types
    if (node.children) {
      for (const child of node.children) {
        if (child.type === 'identifier' && child.text) {
          return child.text
        }
      }
    }
    return null
  }

  private generatePatterns(node: any, snippet: string): string[] {
    const patterns: string[] = [node.type]
    
    // Add context-based patterns
    if (snippet.includes('async')) patterns.push('async')
    if (snippet.includes('await')) patterns.push('await')
    if (snippet.includes('tsNode')) patterns.push('native_code')
    if (snippet.includes('IF') && snippet.includes('THEN')) patterns.push('conditional')
    if (snippet.includes('RETURN')) patterns.push('return')
    if (snippet.includes('authenticate')) patterns.push('authentication')
    if (snippet.includes('error') || snippet.includes('Error')) patterns.push('error_handling')
    
    return patterns
  }

  private calculateComplexity(snippet: string): number {
    // Simple complexity calculation based on control structures
    let complexity = 0.1
    
    if (snippet.includes('IF')) complexity += 0.2
    if (snippet.includes('FOR')) complexity += 0.2  
    if (snippet.includes('tsNode')) complexity += 0.3
    if (snippet.includes('spawn_subagent')) complexity += 0.4
    
    const lineCount = snippet.split('\n').length
    complexity += Math.min(lineCount * 0.05, 0.5)
    
    return Math.min(complexity, 1.0)
  }

  private detectLanguage(filePath: string): 'typescript' | 'javascript' | 'python' | 'rust' | 'go' {
    if (filePath.includes('pseudo') || filePath.endsWith('.pts')) {
      return 'typescript' // Pseudo-typescript is close to TypeScript
    }
    return 'typescript' // Default
  }

  private parseWithRegex(filePath: string, content: string): CodeNode[] {
    const nodes: CodeNode[] = []
    const lines = content.split('\n')

    // Parse function declarations
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      // Async function pattern
      const asyncFunctionMatch = line.match(/^\s*(?:export\s+)?async\s+function\s+(\w+)/)
      if (asyncFunctionMatch) {
        const functionName = asyncFunctionMatch[1]
        const endLine = this.findFunctionEnd(lines, i)
        const snippet = lines.slice(i, endLine + 1).join('\n')

        nodes.push({
          id: `${filePath}:${functionName}:${i}`,
          file_path: filePath,
          node_type: 'async_function_declaration',
          name: functionName,
          line_range: [i + 1, endLine + 1], // 1-indexed
          code_snippet: snippet,
          ast_context: {},
          patterns: ['async', 'function', functionName.toLowerCase()],
          complexity_score: this.calculateComplexity(snippet),
          language: 'typescript',
          indexed_at: new Date().toISOString(),
        })
      }

      // Regular function pattern
      const functionMatch = line.match(/^\s*(?:export\s+)?function\s+(\w+)/)
      if (functionMatch && !asyncFunctionMatch) {
        const functionName = functionMatch[1]
        const endLine = this.findFunctionEnd(lines, i)
        const snippet = lines.slice(i, endLine + 1).join('\n')

        nodes.push({
          id: `${filePath}:${functionName}:${i}`,
          file_path: filePath,
          node_type: 'function_declaration',
          name: functionName,
          line_range: [i + 1, endLine + 1],
          code_snippet: snippet,
          ast_context: {},
          patterns: ['function', functionName.toLowerCase()],
          complexity_score: this.calculateComplexity(snippet),
          language: 'typescript',
          indexed_at: new Date().toISOString(),
        })
      }

      // Class declarations
      const classMatch = line.match(/^\s*(?:export\s+)?class\s+(\w+)/)
      if (classMatch) {
        const className = classMatch[1]
        const endLine = this.findClassEnd(lines, i)
        const snippet = lines.slice(i, endLine + 1).join('\n')

        nodes.push({
          id: `${filePath}:${className}:${i}`,
          file_path: filePath,
          node_type: 'class_declaration',
          name: className,
          line_range: [i + 1, endLine + 1],
          code_snippet: snippet,
          ast_context: {},
          patterns: ['class', className.toLowerCase()],
          complexity_score: this.calculateComplexity(snippet),
          language: 'typescript',
          indexed_at: new Date().toISOString(),
        })
      }

      // Error handling patterns
      if (line.includes('try {') || line.includes('catch')) {
        const endLine = this.findTryCatchEnd(lines, i)
        const snippet = lines.slice(i, endLine + 1).join('\n')

        nodes.push({
          id: `${filePath}:error_handling:${i}`,
          file_path: filePath,
          node_type: 'error_handling',
          line_range: [i + 1, endLine + 1],
          code_snippet: snippet,
          ast_context: {},
          patterns: ['error_handling', 'try_catch'],
          complexity_score: this.calculateComplexity(snippet),
          language: 'typescript',
          indexed_at: new Date().toISOString(),
        })
      }
    }

    return nodes
  }

  private findFunctionEnd(lines: string[], startLine: number): number {
    let braceCount = 0
    let foundFirstBrace = false

    for (let i = startLine; i < lines.length; i++) {
      const line = lines[i]
      for (const char of line) {
        if (char === '{') {
          braceCount++
          foundFirstBrace = true
        } else if (char === '}') {
          braceCount--
          if (foundFirstBrace && braceCount === 0) {
            return i
          }
        }
      }
    }

    return Math.min(startLine + 20, lines.length - 1) // Fallback
  }

  private findClassEnd(lines: string[], startLine: number): number {
    return this.findFunctionEnd(lines, startLine) // Same logic for now
  }

  private findTryCatchEnd(lines: string[], startLine: number): number {
    return this.findFunctionEnd(lines, startLine) // Same logic for now
  }

  private calculateComplexity(code: string): number {
    // Simple complexity calculation based on keywords
    const complexityKeywords = ['if', 'for', 'while', 'switch', 'try', 'async', 'await']
    let score = 0

    for (const keyword of complexityKeywords) {
      const matches = code.match(new RegExp(`\\b${keyword}\\b`, 'g'))
      score += (matches?.length || 0) * 0.1
    }

    return Math.min(score, 1.0)
  }

  getQueryPatterns(): string[] {
    return [
      'async function',
      'function declaration',
      'class declaration',
      'error handling',
      'promise patterns',
      'import statements',
    ]
  }
}

/**
 * Main indexer that orchestrates tree-sitter parsing
 */
export const indexCodebaseWithTreeSitter = (
  projectPath: string,
  language: 'typescript' | 'javascript' | 'python' = 'typescript',
): Effect.Effect<CodeNode[], VibeError> => {
  const parser = getParserForLanguage(language)

  return pipe(
    // Find all source files including algorithm files
    Effect.all([
      // Regular source files
      listFiles(
        resolve(projectPath, 'src'),
        (entry) => entry.name.endsWith('.ts') || entry.name.endsWith('.js'),
      ).pipe(Effect.catchAll(() => Effect.succeed([]))),
      
      // Algorithm files  
      listFiles(
        resolve(projectPath, '.vibe', 'algorithms'),
        (entry) => entry.name.endsWith('.md'),
      ).pipe(Effect.catchAll(() => Effect.succeed([]))),
      
      // Fallback to current directory
      listFiles(
        projectPath,
        (entry) => entry.name.endsWith('.ts') || entry.name.endsWith('.js') || 
                   (entry.name.endsWith('.md') && entry.name.includes('algorithm')),
      ).pipe(Effect.catchAll(() => Effect.succeed([])))
    ]),
    Effect.map(([srcFiles, algorithmFiles, fallbackFiles]) => [
      ...srcFiles,
      ...algorithmFiles, 
      ...fallbackFiles
    ]),
    // Parse each file
    Effect.flatMap((filePaths) =>
      Effect.all(
        filePaths.slice(0, 50).map((filePath) =>
          // Limit for now
          pipe(
            readTextFile(filePath),
            Effect.flatMap((content) => parser.parseFile(filePath, content)),
            Effect.catchAll((error) => {
              console.warn(`Failed to parse ${filePath}:`, error)
              return Effect.succeed([])
            }),
          )
        ),
        { concurrency: 5 },
      )
    ),
    // Flatten results
    Effect.map((results) => results.flat()),
    Effect.catchAll((error) =>
      Effect.fail(createFileSystemError(
        error,
        projectPath,
        `Failed to index codebase at ${projectPath}`,
      ))
    ),
  )
}

/**
 * Get appropriate parser for language
 */
function getParserForLanguage(language: string): TreeSitterParser {
  switch (language) {
    case 'typescript':
    case 'javascript':
      return new TypeScriptTreeSitterParser()
    default:
      return new TypeScriptTreeSitterParser() // Fallback
  }
}

/**
 * Query code patterns with natural language
 */
export const queryCodePatterns = (
  nodes: CodeNode[],
  query: string,
): CodeNode[] => {
  const queryLower = query.toLowerCase()

  return nodes.filter((node) => {
    // Check if query matches patterns
    const patternMatch = node.patterns.some((pattern) => pattern.includes(queryLower) || queryLower.includes(pattern))

    // Check if query matches node name
    const nameMatch = node.name?.toLowerCase().includes(queryLower)

    // Check if query matches code content
    const contentMatch = node.code_snippet.toLowerCase().includes(queryLower)

    return patternMatch || nameMatch || contentMatch
  })
    .sort((a, b) => b.complexity_score - a.complexity_score) // Most complex first
    .slice(0, 10) // Limit to 10 results
}
