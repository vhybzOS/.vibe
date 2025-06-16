#!/usr/bin/env -S deno run --allow-all

import { Command } from 'commander'
import { Effect, pipe } from 'effect'
import { initCommand } from './commands/init.ts'
import { syncCommand } from './commands/sync.ts'
import { generateCommand } from './commands/generate.ts'
import { exportCommand } from './commands/export.ts'
import { mcpServerCommand } from './commands/mcp-server.ts'
import { daemonCommand } from './commands/daemon.ts'

/**
 * Centralized error handler for all CLI commands
 * Handles any Effect type and converts errors to process exit
 */
const runCommand = (commandEffect: () => Effect.Effect<void, Error, never>) => {
  pipe(
    commandEffect(),
    Effect.catchAll((error: Error) =>
      pipe(
        Effect.sync(() => {
          const message = error?.message || String(error)
          console.error('❌ Command failed:', message)
          if (Deno.env.get('VIBE_DEBUG')) {
            console.error('Error details:', error)
          }
        }),
        Effect.flatMap(() => Effect.sync(() => Deno.exit(1))),
      )
    ),
    Effect.runPromise,
  ).catch((unexpectedError) => {
    // Handle any errors that escape the Effect system
    console.error('❌ Unexpected error:', unexpectedError)
    Deno.exit(1)
  })
}

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
  .command('help')
  .description('Show daemon help')
  .action(() => {
    runCommand(() => daemonCommand('help', {}))
  })

program
  .command('status')
  .description('Show project .vibe status')
  .action(() => {
    runCommand(async () => {
      const { statusCommand } = await import('./commands/status.ts')
      return statusCommand(Deno.cwd())
    })
  })

program
  .command('discover')
  .description('Discover and fetch dependency documentation')
  .option('--force-refresh', 'Force refresh of cached documentation')
  .action((options) => {
    runCommand(async () => {
      const { discoverCommand } = await import('./commands/discover.ts')
      return discoverCommand(Deno.cwd(), options)
    })
  })

// Parse command line arguments and execute
program.parse()
