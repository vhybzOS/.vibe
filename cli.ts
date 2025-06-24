#!/usr/bin/env deno run --allow-all
/**
 * Vibe CLI - Production Development Commands
 * 
 * Production CLI wrapper for init, index, and query commands
 */

import { Effect } from 'effect'

const COMMANDS = {
  init: () => import('./commands/init.ts'),
  index: () => import('./commands/index.ts'),  
  query: () => import('./commands/query.ts'),
}

async function main() {
  const args = Deno.args
  const command = args[0]
  
  if (!command || !Object.keys(COMMANDS).includes(command)) {
    console.log(`
🚀 Vibe CLI - Revolutionary Development Commands

Usage:
  vibe <command> [options]

Commands:
  init     Initialize project with revolutionary template system
  index    Index codebase with tree-sitter for 100x context compression  
  query    Query code patterns with natural language

Examples:
  vibe init --force
  vibe index --incremental --path src/
  vibe query "async functions" --limit 5

Revolutionary Features:
✨ 100x context compression - Get 10 relevant lines, not 1000-line files
🔍 Natural language queries - "error handling patterns"
⚡ Real-time indexing - Tree-sitter + SurrealDB integration
🧠 Protocol-driven development - Self-improving algorithms

Repository: https://github.com/vhybzOS/.vibe
`)
    Deno.exit(command ? 1 : 0)
  }

  try {
    const commandModule = await COMMANDS[command as keyof typeof COMMANDS]()
    const commandArgs = args.slice(1)
    
    if (command === 'init') {
      const result = await Effect.runPromise(commandModule.executeInitCommand(commandArgs))
      console.log('✅ Project initialized successfully')
    } else if (command === 'index') {
      const result = await Effect.runPromise(commandModule.executeIndexCommand(commandArgs))
      console.log('✅ Indexing completed successfully')
    } else if (command === 'query') {
      if (commandArgs.length === 0) {
        console.error('❌ Query string required')
        Deno.exit(1)
      }
      const result = await Effect.runPromise(commandModule.executeQueryCommand(commandArgs))
      console.log('✅ Query completed successfully')
    }
  } catch (error) {
    console.error('❌ Command failed:', error.message)
    Deno.exit(1)
  }
}

function parseInitOptions(args: string[]): { force?: boolean; quiet?: boolean } {
  return {
    force: args.includes('--force'),
    quiet: args.includes('--quiet'),
  }
}

if (import.meta.main) {
  main()
}