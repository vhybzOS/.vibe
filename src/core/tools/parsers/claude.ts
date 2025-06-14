import { Effect, pipe } from 'effect'
import { UniversalRule } from '../../../schemas/universal-rule.ts'

/**
 * Parses .claude/commands.md files into UniversalRule format
 * Claude commands are typically markdown with command definitions
 * 
 * @param content - The content of the commands.md file
 * @returns Effect that resolves to array of UniversalRule objects
 */
export const parseClaudeCommandsToUniversal = (content: string) =>
  pipe(
    Effect.try({
      try: () => {
        const rules: UniversalRule[] = []
        
        // Parse commands from markdown format
        // Claude commands can be in various formats:
        // 1. ## Command Name with description
        // 2. /command - description
        // 3. Command blocks with examples
        
        const commandSections = parseCommandSections(content)
        
        for (const section of commandSections) {
          const rule = createRuleFromCommand(section)
          if (rule) {
            rules.push(rule)
          }
        }
        
        // If no structured commands found, treat as general guidelines
        if (rules.length === 0 && content.trim().length > 0) {
          rules.push(createGeneralRule(content))
        }
        
        return rules
      },
      catch: (error) => new Error(`Failed to parse Claude commands: ${error}`),
    }),
    Effect.tap((rules) => Effect.log(`🤖 Parsed ${rules.length} rules from Claude commands`))
  )

/**
 * Interface for a parsed command section
 */
interface CommandSection {
  name: string
  description: string
  content: string
  examples: string[]
  usage?: string
}

/**
 * Parses command sections from markdown content
 * 
 * @param content - Markdown content
 * @returns Array of command sections
 */
const parseCommandSections = (content: string): CommandSection[] => {
  const sections: CommandSection[] = []
  
  // Split by headers
  const headerSections = content.split(/(?=^#+\s+)/m).filter(s => s.trim().length > 0)
  
  for (const section of headerSections) {
    const lines = section.split('\n')
    const headerLine = lines[0]?.trim()
    
    if (!headerLine?.startsWith('#')) {
      // Look for command patterns in non-header sections
      const commandMatches = parseInlineCommands(section)
      sections.push(...commandMatches)
      continue
    }
    
    const name = headerLine.replace(/^#+\s*/, '').trim()
    const body = lines.slice(1).join('\n').trim()
    
    sections.push({
      name,
      description: extractFirstParagraph(body),
      content: body,
      examples: extractCodeBlocks(body),
      usage: extractUsagePattern(body),
    })
  }
  
  return sections
}

/**
 * Parses inline command definitions (e.g., "/command - description")
 * 
 * @param content - Content to parse
 * @returns Array of command sections
 */
const parseInlineCommands = (content: string): CommandSection[] => {
  const commands: CommandSection[] = []
  const lines = content.split('\n')
  
  for (const line of lines) {
    const trimmed = line.trim()
    
    // Match patterns like "/command - description" or "command: description"
    const commandMatch = trimmed.match(/^[\/]?(\w+)\s*[-:]\s*(.+)$/)
    if (commandMatch) {
      const [, name, description] = commandMatch
      commands.push({
        name: name.trim(),
        description: description.trim(),
        content: trimmed,
        examples: [],
      })
    }
  }
  
  return commands
}

/**
 * Creates a UniversalRule from a command section
 * 
 * @param section - Command section
 * @returns UniversalRule object or null
 */
const createRuleFromCommand = (section: CommandSection): UniversalRule | null => {
  if (!section.name || section.name.length === 0) {
    return null
  }
  
  const content = section.content || section.description
  const isCommand = section.name.startsWith('/') || section.usage?.includes('/')
  
  return {
    id: crypto.randomUUID(),
    metadata: {
      name: section.name,
      description: section.description || extractDescription(content),
      source: 'claude',
      confidence: 0.9,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      version: '1.0.0',
    },
    targeting: {
      languages: extractLanguages(content),
      frameworks: extractFrameworks(content),
      files: extractFilePatterns(content),
      contexts: isCommand ? ['command-usage'] : extractContexts(content),
    },
    content: {
      markdown: content,
      examples: section.examples.map(example => ({
        code: example,
        language: 'markdown',
        description: 'Command usage example',
      })),
      tags: extractTags(content, isCommand),
      priority: inferPriority(content),
    },
    compatibility: {
      tools: ['claude'],
      formats: {
        claude: content,
      },
    },
    application: {
      mode: isCommand ? 'conditional' : 'always',
      conditions: isCommand ? ['user-command'] : [],
      excludeFiles: [],
      includeFiles: [],
    },
  }
}

/**
 * Creates a general rule from unstructured content
 * 
 * @param content - Content to convert
 * @returns UniversalRule object
 */
const createGeneralRule = (content: string): UniversalRule => {
  return {
    id: crypto.randomUUID(),
    metadata: {
      name: 'Claude Guidelines',
      description: extractDescription(content),
      source: 'claude',
      confidence: 0.7,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      version: '1.0.0',
    },
    targeting: {
      languages: extractLanguages(content),
      frameworks: extractFrameworks(content),
      files: extractFilePatterns(content),
      contexts: extractContexts(content),
    },
    content: {
      markdown: content,
      examples: extractCodeBlocks(content).map(code => ({
        code,
        language: 'text',
        description: 'Example from Claude guidelines',
      })),
      tags: extractTags(content, false),
      priority: 'medium',
    },
    compatibility: {
      tools: ['claude'],
      formats: {
        claude: content,
      },
    },
    application: {
      mode: 'always',
      conditions: [],
      excludeFiles: [],
      includeFiles: [],
    },
  }
}

/**
 * Extracts the first paragraph from content
 * 
 * @param content - Content to process
 * @returns First paragraph
 */
const extractFirstParagraph = (content: string): string => {
  const paragraphs = content.split('\n\n').filter(p => p.trim().length > 0)
  return paragraphs[0]?.trim() || ''
}

/**
 * Extracts code blocks from markdown
 * 
 * @param content - Markdown content
 * @returns Array of code block contents
 */
const extractCodeBlocks = (content: string): string[] => {
  const blocks: string[] = []
  const codeBlockRegex = /```[\w]*\n([\s\S]*?)```/g
  let match
  
  while ((match = codeBlockRegex.exec(content)) !== null) {
    const code = match[1]?.trim()
    if (code && code.length > 0) {
      blocks.push(code)
    }
  }
  
  return blocks
}

/**
 * Extracts usage patterns from content
 * 
 * @param content - Content to analyze
 * @returns Usage pattern or undefined
 */
const extractUsagePattern = (content: string): string | undefined => {
  // Look for usage patterns like "Usage:", "/command", etc.
  const usageMatch = content.match(/(?:Usage|Example|Use):\s*([^\n]+)/i)
  if (usageMatch) {
    return usageMatch[1].trim()
  }
  
  // Look for command patterns
  const commandMatch = content.match(/[\/]\w+[^\n]*/g)
  if (commandMatch && commandMatch.length > 0) {
    return commandMatch[0].trim()
  }
  
  return undefined
}

// Utility functions (similar to other parsers)
const extractDescription = (content: string): string => {
  const firstParagraph = content.split('\n\n')[0]?.trim()
  if (firstParagraph && firstParagraph.length < 200) {
    return firstParagraph
  }
  
  const firstSentence = content.split(/[.!?]/)[0]?.trim()
  if (firstSentence && firstSentence.length < 150) {
    return firstSentence + '.'
  }
  
  return content.slice(0, 100) + (content.length > 100 ? '...' : '')
}

const extractLanguages = (content: string): string[] => {
  const languages = new Set<string>()
  const text = content.toLowerCase()
  
  const languagePatterns = [
    { pattern: /\btypescript\b|\bts\b/, lang: 'typescript' },
    { pattern: /\bjavascript\b|\bjs\b/, lang: 'javascript' },
    { pattern: /\breact\b|\bjsx\b|\btsx\b/, lang: 'typescript' },
    { pattern: /\bpython\b|\bpy\b/, lang: 'python' },
    { pattern: /\brust\b|\brs\b/, lang: 'rust' },
    { pattern: /\bgo\b|\bgolang\b/, lang: 'go' },
    { pattern: /\bjava\b/, lang: 'java' },
  ]
  
  for (const { pattern, lang } of languagePatterns) {
    if (pattern.test(text)) {
      languages.add(lang)
    }
  }
  
  return Array.from(languages)
}

const extractFrameworks = (content: string): string[] => {
  const frameworks = new Set<string>()
  const text = content.toLowerCase()
  
  const frameworkPatterns = [
    'react', 'vue', 'angular', 'svelte',
    'nextjs', 'nuxt', 'express', 'django',
  ]
  
  for (const framework of frameworkPatterns) {
    if (text.includes(framework)) {
      frameworks.add(framework)
    }
  }
  
  return Array.from(frameworks)
}

const extractFilePatterns = (content: string): string[] => {
  const patterns = new Set<string>()
  const filePatternRegex = /\*\.\w+|\.\w+\s+files?|\w+\.\w+/g
  const matches = content.match(filePatternRegex)
  
  if (matches) {
    for (const match of matches) {
      if (match.includes('.')) {
        patterns.add(match.trim())
      }
    }
  }
  
  return Array.from(patterns)
}

const extractContexts = (content: string): string[] => {
  const contexts = new Set<string>()
  const text = content.toLowerCase()
  
  const contextPatterns = [
    'testing', 'debugging', 'development', 'production',
    'refactoring', 'optimization', 'security', 'performance',
    'documentation', 'review', 'analysis',
  ]
  
  for (const context of contextPatterns) {
    if (text.includes(context)) {
      contexts.add(context)
    }
  }
  
  return Array.from(contexts)
}

const extractTags = (content: string, isCommand: boolean): string[] => {
  const tags = new Set<string>()
  const text = content.toLowerCase()
  
  if (isCommand) {
    tags.add('command')
    tags.add('interactive')
  }
  
  const tagPatterns = [
    'best-practices', 'conventions', 'style', 'formatting',
    'performance', 'security', 'testing', 'documentation',
    'analysis', 'guidance', 'workflow',
  ]
  
  for (const tag of tagPatterns) {
    if (text.includes(tag.replace('-', ' ')) || text.includes(tag)) {
      tags.add(tag)
    }
  }
  
  return Array.from(tags)
}

const inferPriority = (content: string): 'low' | 'medium' | 'high' => {
  const text = content.toLowerCase()
  
  if (text.includes('critical') || text.includes('must') || text.includes('required')) {
    return 'high'
  }
  
  if (text.includes('should') || text.includes('recommend') || text.includes('important')) {
    return 'medium'
  }
  
  return 'low'
}