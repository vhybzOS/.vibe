#!/usr/bin/env -S deno run --allow-all

import { Command } from 'commander'
import { Effect } from 'effect'
import { initCommand } from './commands/init.ts'
import { syncCommand } from './commands/sync.ts'
import { generateCommand } from './commands/generate.ts'
import { exportCommand } from './commands/export.ts'
import { mcpServerCommand } from './commands/mcp-server.ts'
import { daemonCommand } from './commands/daemon.ts'

const program = new Command()

program
  .name('dotvibe')
  .description('Unified AI coding tools configuration and memory management')
  .version('1.0.0')

program
  .command('init')
  .description('Initialize .vibe in current directory')
  .option('-f, --force', 'Overwrite existing .vibe directory')
  .option('--no-mcp', 'Skip MCP server setup')
  .action(async (options) => {
    try {
      await Effect.runPromise(initCommand(Deno.cwd(), options))
    } catch (error) {
      console.error('❌ Initialization failed:', error instanceof Error ? error.message : error)
      Deno.exit(1)
    }
  })

program
  .command('sync')
  .description('Sync AI tool configurations with .vibe rules')
  .option('--dry-run', 'Show what would be synced without making changes')
  .option('-f, --force', 'Force sync even if there are conflicts')
  .action(async (options) => {
    try {
      await Effect.runPromise(syncCommand(Deno.cwd(), options))
    } catch (error) {
      console.error('❌ Sync failed:', error instanceof Error ? error.message : error)
      Deno.exit(1)
    }
  })

program
  .command('generate')
  .description('Generate rules from project analysis')
  .option('-t, --threshold <number>', 'Confidence threshold for rule generation', '0.8')
  .option('--patterns <patterns...>', 'Specific patterns to include')
  .action(async (options) => {
    try {
      await Effect.runPromise(generateCommand(Deno.cwd(), options))
    } catch (error) {
      console.error('❌ Generation failed:', error instanceof Error ? error.message : error)
      Deno.exit(1)
    }
  })

program
  .command('export')
  .description('Export .vibe data to AgentFile format')
  .option('-o, --output <file>', 'Output file path', '.vibe.af')
  .option('--format <format>', 'Export format', 'full')
  .action(async (options) => {
    try {
      await Effect.runPromise(exportCommand(Deno.cwd(), options))
    } catch (error) {
      console.error('❌ Export failed:', error instanceof Error ? error.message : error)
      Deno.exit(1)
    }
  })

program
  .command('mcp-server')
  .description('Start the MCP server')
  .option('-p, --port <port>', 'Server port', '3000')
  .option('-h, --host <host>', 'Server host', 'localhost')
  .action(async (options) => {
    try {
      await Effect.runPromise(mcpServerCommand(options))
    } catch (error) {
      console.error('❌ MCP server failed:', error instanceof Error ? error.message : error)
      Deno.exit(1)
    }
  })

program
  .command('daemon')
  .description('Manage the vibe daemon')
  .option('start', 'Start the daemon')
  .option('stop', 'Stop the daemon')
  .option('status', 'Show daemon status')
  .option('restart', 'Restart the daemon')
  .action(async (options) => {
    try {
      await Effect.runPromise(daemonCommand(options))
    } catch (error) {
      console.error('❌ Daemon command failed:', error instanceof Error ? error.message : error)
      Deno.exit(1)
    }
  })

program
  .command('status')
  .description('Show .vibe status and detected tools')
  .action(async () => {
    try {
      const { statusCommand } = await import('./commands/status.ts')
      await Effect.runPromise(statusCommand(Deno.cwd()))
    } catch (error) {
      console.error('❌ Status check failed:', error instanceof Error ? error.message : error)
      Deno.exit(1)
    }
  })

program
  .command('discover')
  .description('Discover and fetch dependency documentation')
  .option('--force-refresh', 'Force refresh of cached documentation')
  .action(async (options) => {
    try {
      const { discoverCommand } = await import('./commands/discover.ts')
      await Effect.runPromise(discoverCommand(Deno.cwd(), options))
    } catch (error) {
      console.error('❌ Discovery failed:', error instanceof Error ? error.message : error)
      Deno.exit(1)
    }
  })

// Global error handler
globalThis.addEventListener('unhandledrejection', (event) => {
  console.error('❌ Unhandled rejection:', event.reason)
  Deno.exit(1)
})

globalThis.addEventListener('error', (event) => {
  console.error('❌ Uncaught exception:', event.error?.message || event.message)
  Deno.exit(1)
})

program.parse()