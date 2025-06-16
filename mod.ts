/**
 * .vibe module exports
 * Main entry point for the .vibe library
 * Following idiomatic Deno conventions
 */

// Core functionality
export * from './lib/effects.ts'
export * from './lib/fs.ts'

// Schemas
export * from './schemas/index.ts'

// Main modules
export * from './search/index.ts'
export * from './tools/index.ts'
export * from './rules/index.ts'
export * from './memory/index.ts'

// Re-export commonly used types
export type { AIToolConfig, DetectedTool, Memory, SearchQuery, SearchResponse, UniversalRule } from './schemas/index.ts'
