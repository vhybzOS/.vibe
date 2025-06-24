/**
 * Grammar Parser - Handles parsing of specs and algorithm files
 * Supports shebang-based grammar detection and hybrid parsing
 */

export interface ParsedSpecs {
  grammar: string
  feature: string
  intent?: string
  inputs?: Record<string, string>
  outputs?: Record<string, string>
  examples?: string[]
  constraints?: string[]
  invariants?: string[]
}

export interface ParsedAlgorithm {
  grammar: string
  inputs?: Record<string, string>
  outputs?: Record<string, string>
  steps: AlgorithmStep[]
  nativeNodes: NativeNode[]
}

export interface AlgorithmStep {
  type: 'assignment' | 'condition' | 'loop' | 'function_call' | 'native_node'
  content: string
  lineNumber: number
}

export interface NativeNode {
  id: string
  language: string
  code: string
  lineNumber: number
}

export class GrammarParser {
  
  async parseSpecs(content: string): Promise<ParsedSpecs> {
    const lines = content.split('\n')
    
    // Extract grammar from shebang
    const shebangMatch = lines[0].match(/^#!\/grammars\/(.+)\s+parse/)
    const grammar = shebangMatch?.[1] || 'unknown'
    
    const parsed: ParsedSpecs = {
      grammar,
      feature: '',
      inputs: {},
      outputs: {},
      examples: [],
      constraints: [],
      invariants: []
    }
    
    let currentSection = ''
    
    for (const line of lines) {
      const trimmed = line.trim()
      
      // Feature header
      if (trimmed.startsWith('# Feature:')) {
        parsed.feature = trimmed.replace('# Feature:', '').trim()
        continue
      }
      
      // Section headers
      if (trimmed.startsWith('## ')) {
        currentSection = trimmed.replace('## ', '').toLowerCase()
        continue
      }
      
      // Parse section content
      if (trimmed && !trimmed.startsWith('#')) {
        switch (currentSection) {
          case 'intent':
            parsed.intent = trimmed
            break
            
          case 'inputs':
            const inputMatch = trimmed.match(/(\w+):\s*(.+)/)
            if (inputMatch) {
              parsed.inputs![inputMatch[1]] = inputMatch[2]
            }
            break
            
          case 'outputs':
            if (trimmed.startsWith('SUCCESS:')) {
              parsed.outputs!['success'] = trimmed.replace('SUCCESS:', '').trim()
            } else if (trimmed.startsWith('FAILURE:')) {
              parsed.outputs!['failure'] = trimmed.replace('FAILURE:', '').trim()
            }
            break
            
          case 'examples':
            if (trimmed.includes('→')) {
              parsed.examples!.push(trimmed)
            }
            break
            
          case 'constraints':
            parsed.constraints!.push(trimmed)
            break
            
          case 'invariants':
            parsed.invariants!.push(trimmed)
            break
        }
      }
    }
    
    return parsed
  }
  
  async parseAlgorithm(content: string): Promise<ParsedAlgorithm> {
    const lines = content.split('\n')
    
    // Extract grammar from shebang
    const shebangMatch = lines[0].match(/^#!\/grammars\/(.+)\s+parse/)
    const grammar = shebangMatch?.[1] || 'unknown'
    
    const parsed: ParsedAlgorithm = {
      grammar,
      steps: [],
      nativeNodes: []
    }
    
    // Extract INPUT/OUTPUT declarations
    parsed.inputs = this.extractInputDeclaration(content)
    parsed.outputs = this.extractOutputDeclaration(content)
    
    // Find pseudo-code block
    const pseudoStart = lines.findIndex(l => l.includes('```pseudo'))
    const pseudoEnd = lines.findIndex((l, i) => i > pseudoStart && l.includes('```'))
    
    if (pseudoStart >= 0 && pseudoEnd >= 0) {
      for (let i = pseudoStart + 1; i < pseudoEnd; i++) {
        const line = lines[i]
        const trimmed = line.trim()
        
        if (trimmed && !trimmed.startsWith('#')) {
          const step = this.parseAlgorithmStep(trimmed, i)
          parsed.steps.push(step)
          
          // Extract native nodes
          if (step.type === 'native_node') {
            const nativeNode = this.extractNativeNode(trimmed, i)
            if (nativeNode) {
              parsed.nativeNodes.push(nativeNode)
            }
          }
        }
      }
    }
    
    return parsed
  }
  
  private extractInputDeclaration(content: string): Record<string, string> {
    const inputMatch = content.match(/INPUT:\s*(.+?)(?=\n|$)/)
    if (!inputMatch) return {}
    
    const inputStr = inputMatch[1]
    const inputs: Record<string, string> = {}
    
    // Parse "param: type, param2: type" format
    const params = inputStr.split(',').map(p => p.trim())
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
  
  private extractOutputDeclaration(content: string): Record<string, string> {
    const outputMatch = content.match(/OUTPUT:\s*(.+?)(?=\n|$)/)
    if (!outputMatch) return {}
    
    const outputStr = outputMatch[1]
    const outputs: Record<string, string> = {}
    
    // Parse output types
    const returnTypes = outputStr.split(',').map(t => t.trim())
    for (let i = 0; i < returnTypes.length; i++) {
      outputs[`output_${i}`] = returnTypes[i]
    }
    
    return outputs
  }
  
  private parseAlgorithmStep(line: string, lineNumber: number): AlgorithmStep {
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
    
    // Default to function call
    return { type: 'function_call', content: trimmed, lineNumber }
  }
  
  private extractNativeNode(line: string, lineNumber: number): NativeNode | null {
    // Match pattern: variable = tsNodeN // native_code
    const match = line.match(/(\w+)\s*=\s*tsNode(\d+)\s*\/\/\s*(.+)/)
    if (!match) return null
    
    const [, , nodeId, code] = match
    
    return {
      id: `tsNode${nodeId}`,
      language: 'typescript', // Could be dynamic based on context
      code: code.trim(),
      lineNumber
    }
  }
  
  async validateGrammar(content: string, expectedGrammar: string): Promise<boolean> {
    const shebangMatch = content.match(/^#!\/grammars\/(.+)\s+parse/)
    const actualGrammar = shebangMatch?.[1]
    
    return actualGrammar === expectedGrammar
  }
  
  async loadGrammarDefinition(grammarName: string): Promise<string> {
    try {
      const grammarPath = `.vibe/grammars/${grammarName}.grammar`
      return await Deno.readTextFile(grammarPath)
    } catch {
      throw new Error(`Grammar definition not found: ${grammarName}`)
    }
  }
  
  getAvailableGrammars(): string[] {
    return ['specs', 'pseudo-typescript', 'pseudo-python', 'pseudo-rust']
  }
}