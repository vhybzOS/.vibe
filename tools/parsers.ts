/**
 * Consolidated parsers for AI tool configurations
 * Converts tool-specific formats to Universal Rules
 */

import { Effect, pipe } from 'effect'
import { UniversalRule } from '../schemas/universal-rule.ts'
import { AIToolType } from '../schemas/ai-tool-config.ts'
import { VibeError, ParseError, logWithContext } from '../lib/effects.ts'

/**
 * Parses tool configuration content into Universal Rules
 */
export const parseToolConfig = (tool: AIToolType, content: string) =>
  pipe(
    Effect.try({
      try: () => {
        switch (tool) {
          case 'cursor':
            return parseCursorRules(content)
          case 'windsurf':
            return parseWindsurfRules(content)
          case 'claude':
            return parseClaudeCommands(content)
          case 'copilot':
          case 'codeium':
          case 'cody':
            return parseMarkdownInstructions(content, tool)
          case 'tabnine':
            return parseTabnineConfig(content)
          default:
            throw new ParseError(`Unsupported tool: ${tool}`, content)
        }
      },
      catch: (error) => new ParseError(`Failed to parse ${tool} config: ${error}`, content),
    }),
    Effect.tap(rules => logWithContext('Parser', `Parsed ${rules.length} rules from ${tool}`))
  )

/**
 * Parses Cursor .cursorrules files
 */
const parseCursorRules = (content: string): UniversalRule[] => {
  const rules: UniversalRule[] = []
  
  // Split by markdown headers
  const sections = content.split(/(?=^#+\s+)/m).filter(s => s.trim().length > 0)
  
  for (const section of sections) {
    const lines = section.split('\n')
    const headerLine = lines[0]?.trim()
    
    if (!headerLine?.startsWith('#')) {
      if (section.trim().length > 0) {
        rules.push(createUniversalRule('General Cursor Rules', section.trim(), 'cursor'))
      }
      continue
    }
    
    const title = headerLine.replace(/^#+\s*/, '').trim()
    const body = lines.slice(1).join('\n').trim()
    
    if (body.length > 0) {
      rules.push(createUniversalRule(title, body, 'cursor'))
    }
  }
  
  if (rules.length === 0 && content.trim().length > 0) {
    rules.push(createUniversalRule('Cursor Rules', content.trim(), 'cursor'))
  }
  
  return rules
}

/**
 * Parses Windsurf .windsurfrules files (YAML or markdown)
 */
const parseWindsurfRules = (content: string): UniversalRule[] => {
  // Detect format
  if (isYamlLike(content)) {
    return parseYamlRules(content, 'windsurf')
  } else {
    return parseMarkdownRules(content, 'windsurf')
  }
}

/**
 * Parses Claude commands.md files
 */
const parseClaudeCommands = (content: string): UniversalRule[] => {
  const rules: UniversalRule[] = []
  
  // Parse command sections
  const commandSections = parseCommandSections(content)
  
  for (const section of commandSections) {
    const rule = createCommandRule(section)
    if (rule) {
      rules.push(rule)
    }
  }
  
  if (rules.length === 0 && content.trim().length > 0) {
    rules.push(createUniversalRule('Claude Guidelines', content.trim(), 'claude'))
  }
  
  return rules
}

/**
 * Parses markdown instructions for generic tools
 */
const parseMarkdownInstructions = (content: string, tool: AIToolType): UniversalRule[] => {
  return [createUniversalRule(`${tool} Instructions`, content, tool)]
}

/**
 * Parses Tabnine JSON configuration
 */
const parseTabnineConfig = (content: string): UniversalRule[] => {
  try {
    const config = JSON.parse(content)
    return [createUniversalRule('Tabnine Configuration', JSON.stringify(config, null, 2), 'tabnine')]
  } catch {
    throw new ParseError('Invalid Tabnine JSON configuration', content)
  }
}

/**
 * Checks if content appears to be YAML
 */
const isYamlLike = (content: string): boolean => {
  const lines = content.split('\n')
  let yamlIndicators = 0
  
  for (const line of lines.slice(0, 10)) {
    const trimmed = line.trim()
    if (trimmed.includes(': ') || trimmed.endsWith(':') || trimmed.startsWith('- ')) {
      yamlIndicators++
    }
  }
  
  return yamlIndicators > 2
}

/**
 * Parses YAML-style rules
 */
const parseYamlRules = (content: string, source: AIToolType): UniversalRule[] => {
  const rules: UniversalRule[] = []
  const lines = content.split('\n')
  
  let currentRule: Partial<UniversalRule> | null = null
  let currentContent = ''
  
  for (const line of lines) {
    const trimmed = line.trim()
    
    if (trimmed.startsWith('- name:') || trimmed.startsWith('name:')) {
      if (currentRule && currentContent) {
        rules.push(finalizeRule(currentRule, currentContent, source))
      }
      
      const name = trimmed.replace(/^-?\s*name:\s*/, '').replace(/['\"]/g, '')
      currentRule = createBaseRule(name, source)
      currentContent = ''
    } else if (trimmed.startsWith('description:') && currentRule) {
      const description = trimmed.replace(/^description:\s*/, '').replace(/['\"]/g, '')
      currentRule.metadata!.description = description
    } else if (trimmed.startsWith('rule:') || trimmed.startsWith('content:')) {
      const ruleContent = trimmed.replace(/^(rule|content):\s*/, '').replace(/['\"]/g, '')
      if (ruleContent) {
        currentContent += ruleContent + '\n'
      }
    } else if (trimmed.length > 0 && currentContent.length > 0) {
      currentContent += trimmed + '\n'
    }
  }
  
  if (currentRule && currentContent) {
    rules.push(finalizeRule(currentRule, currentContent, source))
  }
  
  return rules
}

/**
 * Parses markdown-style rules
 */
const parseMarkdownRules = (content: string, source: AIToolType): UniversalRule[] => {
  const rules: UniversalRule[] = []
  const sections = content.split(/(?=^#+\s+)/m).filter(s => s.trim().length > 0)
  
  for (const section of sections) {
    const lines = section.split('\n')
    const headerLine = lines[0]?.trim()
    
    if (!headerLine?.startsWith('#')) {
      if (section.trim().length > 0) {
        rules.push(createUniversalRule(`General ${source} Rules`, section.trim(), source))
      }
      continue
    }
    
    const title = headerLine.replace(/^#+\s*/, '').trim()
    const body = lines.slice(1).join('\n').trim()
    
    if (body.length > 0) {
      rules.push(createUniversalRule(title, body, source))
    }
  }
  
  return rules
}

/**
 * Parses command sections from Claude content
 */
const parseCommandSections = (content: string) => {
  const sections: Array<{
    name: string
    description: string
    content: string
    examples: string[]
  }> = []
  
  const headerSections = content.split(/(?=^#+\\s+)/m).filter(s => s.trim().length > 0)
  
  for (const section of headerSections) {
    const lines = section.split('\n')
    const headerLine = lines[0]?.trim()
    
    if (!headerLine?.startsWith('#')) continue
    
    const name = headerLine.replace(/^#+\s*/, '').trim()
    const body = lines.slice(1).join('\n').trim()
    
    sections.push({
      name,
      description: extractFirstParagraph(body),
      content: body,
      examples: extractCodeBlocks(body),
    })
  }
  
  return sections
}

/**
 * Creates a command rule from a section
 */
const createCommandRule = (section: {
  name: string
  description: string
  content: string
  examples: string[]
}): UniversalRule | null => {
  if (!section.name) return null
  
  const isCommand = section.name.startsWith('/') || section.content.includes('/')
  
  return {
    id: crypto.randomUUID(),
    metadata: {
      name: section.name,
      description: section.description,
      source: 'claude',
      confidence: 0.9,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      version: '1.0.0',
    },
    targeting: {
      languages: extractLanguages(section.content),
      frameworks: extractFrameworks(section.content),
      files: extractFilePatterns(section.content),
      contexts: isCommand ? ['command-usage'] : [],
    },
    content: {
      markdown: section.content,
      examples: section.examples.map(code => ({
        code,
        language: 'markdown',
        description: 'Command usage example',
      })),
      tags: isCommand ? ['command', 'interactive'] : ['guidance'],
      priority: 'medium',
    },
    compatibility: {
      tools: ['claude'],
      formats: { claude: section.content },
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
 * Creates a base Universal Rule structure
 */
const createUniversalRule = (title: string, content: string, source: AIToolType): UniversalRule => ({
  id: crypto.randomUUID(),
  metadata: {
    name: title,
    description: extractDescription(content),
    source,
    confidence: 0.8,
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
    examples: extractCodeExamples(content),
    tags: extractTags(content),
    priority: inferPriority(content),
  },
  compatibility: {
    tools: [source],
    formats: { [source]: content },
  },
  application: {
    mode: 'always',
    conditions: [],
    excludeFiles: [],
    includeFiles: [],
  },
})

/**
 * Creates a base rule structure for YAML parsing
 */
const createBaseRule = (name: string, source: AIToolType): Partial<UniversalRule> => ({
  id: crypto.randomUUID(),
  metadata: {
    name,
    description: '',
    source,
    confidence: 0.8,
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
  compatibility: {
    tools: [source],
    formats: {},
  },
  application: {
    mode: 'always',
    conditions: [],
    excludeFiles: [],
    includeFiles: [],
  },
})

/**
 * Finalizes a rule after YAML parsing
 */
const finalizeRule = (
  partialRule: Partial<UniversalRule>,
  content: string,
  source: AIToolType
): UniversalRule => ({
  ...partialRule,
  content: {
    markdown: content.trim(),
    examples: extractCodeExamples(content),
    tags: extractTags(content),
    priority: inferPriority(content),
  },
  targeting: {
    ...partialRule.targeting!,
    frameworks: extractFrameworks(content),
    contexts: extractContexts(content),
  },
  compatibility: {
    tools: [source],
    formats: { [source]: content.trim() },
  },
} as UniversalRule)

// Utility functions for content extraction
const extractDescription = (content: string): string => {
  const firstParagraph = content.split('\n\n')[0]?.trim()
  if (firstParagraph && firstParagraph.length < 200) {
    return firstParagraph
  }
  return content.slice(0, 100) + (content.length > 100 ? '...' : '')
}

const extractFirstParagraph = (content: string): string => {
  const paragraphs = content.split('\n\n').filter(p => p.trim().length > 0)
  return paragraphs[0]?.trim() || ''
}

const extractLanguages = (content: string): string[] => {
  const languages = new Set<string>()
  const text = content.toLowerCase()
  
  const patterns = [
    { pattern: /\btypescript\b|\bts\b/, lang: 'typescript' },
    { pattern: /\bjavascript\b|\bjs\b/, lang: 'javascript' },
    { pattern: /\breact\b|\bjsx\b|\btsx\b/, lang: 'typescript' },
    { pattern: /\bpython\b|\bpy\b/, lang: 'python' },
    { pattern: /\brust\b|\brs\b/, lang: 'rust' },
    { pattern: /\bgo\b|\bgolang\b/, lang: 'go' },
  ]
  
  for (const { pattern, lang } of patterns) {
    if (pattern.test(text)) languages.add(lang)
  }
  
  return Array.from(languages)
}

const extractFrameworks = (content: string): string[] => {
  const frameworks = new Set<string>()
  const text = content.toLowerCase()
  
  const frameworkList = ['react', 'vue', 'angular', 'svelte', 'nextjs', 'nuxt', 'express', 'django']
  
  for (const framework of frameworkList) {
    if (text.includes(framework)) frameworks.add(framework)
  }
  
  return Array.from(frameworks)
}

const extractFilePatterns = (content: string): string[] => {
  const patterns = new Set<string>()
  const matches = content.match(/\*\.\w+|\.\w+\s+files?|\w+\.\w+/g)
  
  if (matches) {
    for (const match of matches) {
      if (match.includes('.')) patterns.add(match.trim())
    }
  }
  
  return Array.from(patterns)
}

const extractContexts = (content: string): string[] => {
  const contexts = new Set<string>()
  const text = content.toLowerCase()
  
  const contextList = ['testing', 'debugging', 'development', 'production', 'refactoring', 'optimization']
  
  for (const context of contextList) {
    if (text.includes(context)) contexts.add(context)
  }
  
  return Array.from(contexts)
}

const extractCodeExamples = (content: string) => {
  const examples: Array<{ code: string; language: string; description: string }> = []
  const regex = /```(\w+)?\n([\s\S]*?)```/g
  let match
  
  while ((match = regex.exec(content)) !== null) {
    const language = match[1] || 'text'
    const code = match[2]?.trim()
    
    if (code && code.length > 0) {
      examples.push({
        code,
        language,
        description: `Example ${language} code`,
      })
    }
  }
  
  return examples
}

const extractCodeBlocks = (content: string): string[] => {
  const blocks: string[] = []
  const regex = /```[\w]*\n([\s\S]*?)```/g
  let match
  
  while ((match = regex.exec(content)) !== null) {
    const code = match[1]?.trim()
    if (code && code.length > 0) {
      blocks.push(code)
    }
  }
  
  return blocks
}

const extractTags = (content: string): string[] => {
  const tags = new Set<string>()
  const text = content.toLowerCase()
  
  const tagList = ['best-practices', 'conventions', 'style', 'performance', 'security', 'testing']
  
  for (const tag of tagList) {
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
  
  if (text.includes('should') || text.includes('recommend')) {
    return 'medium'
  }
  
  return 'low'
}