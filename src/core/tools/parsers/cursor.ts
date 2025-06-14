import { Effect, pipe } from 'effect'
import { UniversalRule } from '../../../schemas/universal-rule.ts'

/**
 * Parses .cursorrules files into UniversalRule format
 * Cursor rules are typically markdown-based with sections
 * 
 * @param content - The content of the .cursorrules file
 * @returns Effect that resolves to array of UniversalRule objects
 */
export const parseCursorRulesToUniversal = (content: string) =>
  pipe(
    Effect.try({
      try: () => {
        const rules: UniversalRule[] = []
        
        // Split content by markdown headers (## or #)
        const sections = content.split(/(?=^#+\s+)/m).filter(section => section.trim().length > 0)
        
        for (const section of sections) {
          const lines = section.split('\n')
          const headerLine = lines[0]?.trim()
          
          if (!headerLine || !headerLine.startsWith('#')) {
            // This is content without a header, treat as a single rule
            if (section.trim().length > 0) {
              rules.push(createRuleFromContent('General Rules', section.trim()))
            }
            continue
          }
          
          // Extract title from header
          const title = headerLine.replace(/^#+\s*/, '').trim()
          const body = lines.slice(1).join('\n').trim()
          
          if (body.length > 0) {
            rules.push(createRuleFromContent(title, body))
          }
        }
        
        // If no sections found, treat entire content as one rule
        if (rules.length === 0 && content.trim().length > 0) {
          rules.push(createRuleFromContent('Cursor Rules', content.trim()))
        }
        
        return rules
      },
      catch: (error) => new Error(`Failed to parse Cursor rules: ${error}`),
    }),
    Effect.tap((rules) => Effect.log(`📝 Parsed ${rules.length} rules from Cursor configuration`))
  )

/**
 * Creates a UniversalRule from title and content
 * 
 * @param title - Rule title
 * @param content - Rule content
 * @returns UniversalRule object
 */
const createRuleFromContent = (title: string, content: string): UniversalRule => {
  const tags = extractTags(content)
  const languages = extractLanguages(content)
  const contexts = extractContexts(content)
  
  return {
    id: crypto.randomUUID(),
    metadata: {
      name: title,
      description: extractDescription(content),
      source: 'cursor',
      confidence: 0.8,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      version: '1.0.0',
    },
    targeting: {
      languages,
      frameworks: extractFrameworks(content),
      files: extractFilePatterns(content),
      contexts,
    },
    content: {
      markdown: content,
      examples: extractCodeExamples(content),
      tags,
      priority: inferPriority(content),
    },
    compatibility: {
      tools: ['cursor'],
      formats: {
        cursor: content,
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
 * Extracts description from content (first sentence or paragraph)
 * 
 * @param content - Rule content
 * @returns Extracted description
 */
const extractDescription = (content: string): string => {
  // Find first complete sentence or paragraph
  const firstParagraph = content.split('\n\n')[0]?.trim()
  if (firstParagraph && firstParagraph.length < 200) {
    return firstParagraph
  }
  
  // Fall back to first sentence
  const firstSentence = content.split(/[.!?]/)[0]?.trim()
  if (firstSentence && firstSentence.length < 150) {
    return firstSentence + '.'
  }
  
  // Fall back to truncated content
  return content.slice(0, 100) + (content.length > 100 ? '...' : '')
}

/**
 * Extracts programming languages mentioned in the content
 * 
 * @param content - Rule content
 * @returns Array of detected languages
 */
const extractLanguages = (content: string): string[] => {
  const languages = new Set<string>()
  const text = content.toLowerCase()
  
  // Common language patterns
  const languagePatterns = [
    { pattern: /\btypescript\b|\bts\b/, lang: 'typescript' },
    { pattern: /\bjavascript\b|\bjs\b/, lang: 'javascript' },
    { pattern: /\breact\b|\bjsx\b|\btsx\b/, lang: 'typescript' },
    { pattern: /\bpython\b|\bpy\b/, lang: 'python' },
    { pattern: /\brust\b|\brs\b/, lang: 'rust' },
    { pattern: /\bgo\b|\bgolang\b/, lang: 'go' },
    { pattern: /\bjava\b/, lang: 'java' },
    { pattern: /\bc\+\+\b|\bcpp\b/, lang: 'cpp' },
    { pattern: /\bhtml\b/, lang: 'html' },
    { pattern: /\bcss\b/, lang: 'css' },
    { pattern: /\bsql\b/, lang: 'sql' },
    { pattern: /\bshell\b|\bbash\b/, lang: 'shell' },
  ]
  
  for (const { pattern, lang } of languagePatterns) {
    if (pattern.test(text)) {
      languages.add(lang)
    }
  }
  
  return Array.from(languages)
}

/**
 * Extracts frameworks mentioned in the content
 * 
 * @param content - Rule content
 * @returns Array of detected frameworks
 */
const extractFrameworks = (content: string): string[] => {
  const frameworks = new Set<string>()
  const text = content.toLowerCase()
  
  const frameworkPatterns = [
    'react', 'vue', 'angular', 'svelte',
    'nextjs', 'nuxt', 'gatsby',
    'express', 'fastify', 'koa',
    'django', 'flask', 'fastapi',
    'spring', 'rails', 'laravel',
    'actix', 'axum', 'rocket',
  ]
  
  for (const framework of frameworkPatterns) {
    if (text.includes(framework)) {
      frameworks.add(framework)
    }
  }
  
  return Array.from(frameworks)
}

/**
 * Extracts file patterns from content
 * 
 * @param content - Rule content
 * @returns Array of file patterns
 */
const extractFilePatterns = (content: string): string[] => {
  const patterns = new Set<string>()
  
  // Look for common file extension patterns
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

/**
 * Extracts context hints from content
 * 
 * @param content - Rule content
 * @returns Array of contexts
 */
const extractContexts = (content: string): string[] => {
  const contexts = new Set<string>()
  const text = content.toLowerCase()
  
  const contextPatterns = [
    'testing', 'debugging', 'development', 'production',
    'refactoring', 'optimization', 'security', 'performance',
    'documentation', 'review', 'maintenance',
  ]
  
  for (const context of contextPatterns) {
    if (text.includes(context)) {
      contexts.add(context)
    }
  }
  
  return Array.from(contexts)
}

/**
 * Extracts code examples from markdown content
 * 
 * @param content - Rule content
 * @returns Array of code examples
 */
const extractCodeExamples = (content: string): Array<{
  code: string
  language: string
  description?: string
}> => {
  const examples: Array<{ code: string; language: string; description?: string }> = []
  
  // Match markdown code blocks
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

/**
 * Extracts tags from content
 * 
 * @param content - Rule content
 * @returns Array of tags
 */
const extractTags = (content: string): string[] => {
  const tags = new Set<string>()
  const text = content.toLowerCase()
  
  // Common development tags
  const tagPatterns = [
    'best-practices', 'conventions', 'style', 'formatting',
    'performance', 'security', 'testing', 'documentation',
    'architecture', 'patterns', 'clean-code', 'refactoring',
  ]
  
  for (const tag of tagPatterns) {
    if (text.includes(tag.replace('-', ' ')) || text.includes(tag)) {
      tags.add(tag)
    }
  }
  
  return Array.from(tags)
}

/**
 * Infers priority based on content
 * 
 * @param content - Rule content
 * @returns Priority level
 */
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