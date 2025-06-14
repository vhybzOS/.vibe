import { Effect, pipe } from 'effect'
import { UniversalRule } from '../../../schemas/universal-rule.ts'

/**
 * Parses .windsurfrules files into UniversalRule format
 * Windsurf rules are typically YAML or markdown-based
 * 
 * @param content - The content of the .windsurfrules file
 * @returns Effect that resolves to array of UniversalRule objects
 */
export const parseWindsurfRulesToUniversal = (content: string) =>
  pipe(
    Effect.try({
      try: () => {
        const rules: UniversalRule[] = []
        
        // Try to detect if content is YAML-like or markdown-like
        if (isYamlLike(content)) {
          return parseYamlStyleRules(content)
        } else {
          return parseMarkdownStyleRules(content)
        }
      },
      catch: (error) => new Error(`Failed to parse Windsurf rules: ${error}`),
    }),
    Effect.tap((rules) => Effect.log(`🌊 Parsed ${rules.length} rules from Windsurf configuration`))
  )

/**
 * Checks if content appears to be YAML-formatted
 * 
 * @param content - Content to check
 * @returns True if content looks like YAML
 */
const isYamlLike = (content: string): boolean => {
  const lines = content.split('\n')
  let yamlIndicators = 0
  
  for (const line of lines.slice(0, 10)) { // Check first 10 lines
    const trimmed = line.trim()
    if (trimmed.includes(': ') || trimmed.endsWith(':') || trimmed.startsWith('- ')) {
      yamlIndicators++
    }
  }
  
  return yamlIndicators > 2
}

/**
 * Parses YAML-style Windsurf rules
 * 
 * @param content - YAML content
 * @returns Array of UniversalRule objects
 */
const parseYamlStyleRules = (content: string): UniversalRule[] => {
  const rules: UniversalRule[] = []
  const lines = content.split('\n')
  
  let currentRule: Partial<UniversalRule> | null = null
  let currentSection = ''
  let currentContent = ''
  
  for (const line of lines) {
    const trimmed = line.trim()
    
    if (trimmed.startsWith('- name:') || trimmed.startsWith('name:')) {
      // Start of new rule
      if (currentRule && currentContent) {
        rules.push(finalizeYamlRule(currentRule, currentContent))
      }
      
      const name = trimmed.replace(/^-?\s*name:\s*/, '').replace(/['"]/g, '')
      currentRule = createBaseRule(name, 'windsurf')
      currentContent = ''
      currentSection = 'name'
    } else if (trimmed.startsWith('description:') && currentRule) {
      const description = trimmed.replace(/^description:\s*/, '').replace(/['"]/g, '')
      currentRule.metadata!.description = description
      currentSection = 'description'
    } else if (trimmed.startsWith('rule:') || trimmed.startsWith('content:')) {
      currentSection = 'content'
      const ruleContent = trimmed.replace(/^(rule|content):\s*/, '').replace(/['"]/g, '')
      if (ruleContent) {
        currentContent += ruleContent + '\n'
      }
    } else if (trimmed.startsWith('languages:') || trimmed.startsWith('files:')) {
      currentSection = trimmed.split(':')[0]
    } else if (trimmed.startsWith('- ') && currentRule) {
      const value = trimmed.replace(/^-\s*/, '').replace(/['"]/g, '')
      
      if (currentSection === 'languages') {
        currentRule.targeting!.languages.push(value)
      } else if (currentSection === 'files') {
        currentRule.targeting!.files.push(value)
      } else if (currentSection === 'content') {
        currentContent += value + '\n'
      }
    } else if (trimmed.length > 0 && currentSection === 'content') {
      currentContent += trimmed + '\n'
    }
  }
  
  // Finalize last rule
  if (currentRule && currentContent) {
    rules.push(finalizeYamlRule(currentRule, currentContent))
  }
  
  return rules
}

/**
 * Parses markdown-style Windsurf rules (similar to Cursor)
 * 
 * @param content - Markdown content
 * @returns Array of UniversalRule objects
 */
const parseMarkdownStyleRules = (content: string): UniversalRule[] => {
  const rules: UniversalRule[] = []
  
  // Split by headers or sections
  const sections = content.split(/(?=^#+\s+)/m).filter(section => section.trim().length > 0)
  
  for (const section of sections) {
    const lines = section.split('\n')
    const headerLine = lines[0]?.trim()
    
    if (!headerLine || !headerLine.startsWith('#')) {
      if (section.trim().length > 0) {
        rules.push(createUniversalRule('General Windsurf Rules', section.trim(), 'windsurf'))
      }
      continue
    }
    
    const title = headerLine.replace(/^#+\s*/, '').trim()
    const body = lines.slice(1).join('\n').trim()
    
    if (body.length > 0) {
      rules.push(createUniversalRule(title, body, 'windsurf'))
    }
  }
  
  if (rules.length === 0 && content.trim().length > 0) {
    rules.push(createUniversalRule('Windsurf Rules', content.trim(), 'windsurf'))
  }
  
  return rules
}

/**
 * Creates a base rule structure
 * 
 * @param name - Rule name
 * @param source - Source tool
 * @returns Partial UniversalRule
 */
const createBaseRule = (name: string, source: string): Partial<UniversalRule> => ({
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
    tools: ['windsurf'],
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
 * Finalizes a YAML-parsed rule
 * 
 * @param partialRule - Partial rule structure
 * @param content - Rule content
 * @returns Complete UniversalRule
 */
const finalizeYamlRule = (partialRule: Partial<UniversalRule>, content: string): UniversalRule => {
  return {
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
      tools: ['windsurf'],
      formats: {
        windsurf: content.trim(),
      },
    },
  } as UniversalRule
}

/**
 * Creates a complete UniversalRule from title and content
 * 
 * @param title - Rule title
 * @param content - Rule content
 * @param source - Source tool
 * @returns UniversalRule object
 */
const createUniversalRule = (title: string, content: string, source: string): UniversalRule => {
  return {
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
      tools: ['windsurf'],
      formats: {
        windsurf: content,
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

// Reuse utility functions from cursor parser
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
    { pattern: /\bc\+\+\b|\bcpp\b/, lang: 'cpp' },
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
    'nextjs', 'nuxt', 'gatsby',
    'express', 'fastify', 'django', 'flask',
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
  ]
  
  for (const context of contextPatterns) {
    if (text.includes(context)) {
      contexts.add(context)
    }
  }
  
  return Array.from(contexts)
}

const extractCodeExamples = (content: string): Array<{
  code: string
  language: string
  description?: string
}> => {
  const examples: Array<{ code: string; language: string; description?: string }> = []
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g
  let match
  
  while ((match = codeBlockRegex.exec(content)) !== null) {
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

const extractTags = (content: string): string[] => {
  const tags = new Set<string>()
  const text = content.toLowerCase()
  
  const tagPatterns = [
    'best-practices', 'conventions', 'style', 'formatting',
    'performance', 'security', 'testing', 'documentation',
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
  
  if (text.includes('should') || text.includes('recommend') || text.includes('prefer')) {
    return 'medium'
  }
  
  return 'low'
}