#!/usr/bin/env -S deno run --allow-all

/**
 * .vibe CLI - Main command-line interface
 * Idiomatic Deno entry point for the CLI application
 */

import { Command } from 'commander'
import { Effect, pipe } from 'effect'
// Path utilities available when needed

// Command modules
import { initCommand } from './cli/commands/init.ts'
import { syncCommand } from './cli/commands/sync.ts'
import { generateCommand } from './cli/commands/generate.ts'
import { exportCommand } from './cli/commands/export.ts'
import { mcpServerCommand } from './cli/commands/mcp-server.ts'
import { daemonCommand } from './cli/commands/daemon.ts'
import { statusCommand } from './cli/commands/status.ts'
import { discoverCommand } from './cli/commands/discover.ts'

/**
 * Centralized error handler for all CLI commands
 */
const runCommand = (commandEffect: () => Effect.Effect<void, Error, never>) => {
  pipe(
    commandEffect(),
    Effect.catchAll((error) =>
      pipe(
        Effect.sync(() => {
          console.error('❌ Command failed:', error.message)
          if (Deno.env.get('VIBE_DEBUG')) {
            console.error('Stack trace:', error.stack)
          }
        }),
        Effect.flatMap(() => Effect.sync(() => Deno.exit(1)))
      )
    ),
    Effect.runPromise
  ).catch((unexpectedError) => {
    console.error('❌ Unexpected error:', unexpectedError)
    Deno.exit(1)
  })
}

const program = new Command()

program
  .name('vibe')
  .description('.vibe - Unified AI coding tool configuration')
  .version('1.0.0')

program
  .command('init')
  .description('Initialize .vibe in current directory')
  .option('-f, --force', 'Overwrite existing .vibe directory')
  .option('--no-mcp', 'Skip MCP server setup')
  .action((options) => {
    runCommand(() => initCommand(Deno.cwd(), options))
  })

program
  .command('sync')
  .description('Sync AI tool configurations with .vibe rules')
  .option('--dry-run', 'Show what would be synced without making changes')
  .option('-f, --force', 'Force sync even if there are conflicts')
  .action((options) => {
    runCommand(() => syncCommand(Deno.cwd(), options))
  })

program
  .command('generate')
  .description('Generate rules from project analysis')
  .option('-t, --threshold <number>', 'Confidence threshold for rule generation', '0.8')
  .option('--patterns <patterns...>', 'Specific patterns to include')
  .action((options) => {
    runCommand(() => generateCommand(Deno.cwd(), options))
  })

program
  .command('export')
  .description('Export .vibe data to AgentFile format')
  .option('-o, --output <file>', 'Output file path', '.vibe.af')
  .option('--format <format>', 'Export format', 'full')
  .action((options) => {
    runCommand(() => exportCommand(Deno.cwd(), options))
  })

program
  .command('mcp-server')
  .description('Start the MCP server')
  .option('-p, --port <port>', 'Server port', '3000')
  .option('-h, --host <host>', 'Server host', 'localhost')
  .action((options) => {
    runCommand(() => mcpServerCommand(options))
  })

const daemonCmd = program
  .command('daemon')
  .description('Manage the vibe daemon')

daemonCmd
  .command('status')
  .description('Show daemon status')
  .action(() => {
    runCommand(() => daemonCommand('status', {}))
  })

daemonCmd
  .command('stop')
  .description('Stop the daemon')
  .action(() => {
    runCommand(() => daemonCommand('stop', {}))
  })

daemonCmd
  .command('start')
  .description('Start the daemon')
  .action(() => {
    runCommand(() => daemonCommand('start', {}))
  })

daemonCmd
  .command('restart')
  .description('Restart the daemon')
  .action(() => {
    runCommand(() => daemonCommand('restart', {}))
  })

daemonCmd
  .action(() => {
    runCommand(() => daemonCommand('help', {}))
  })

program
  .command('status')
  .description('Show .vibe status and detected tools')
  .action(() => {
    runCommand(() => statusCommand(Deno.cwd()))
  })

program
  .command('discover')
  .description('Discover and fetch dependency documentation')
  .option('--force-refresh', 'Force refresh of cached documentation')
  .action((options) => {
    runCommand(() => discoverCommand(Deno.cwd(), options))
  })

// Parse command line arguments and execute
if (import.meta.main) {
  program.parse()
}