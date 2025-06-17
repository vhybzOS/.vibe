#!/usr/bin/env -S deno run --allow-all

/**
 * Vibe CLI Entry Point
 * 
 * Based on legacy/v0.2 CLI patterns with Commander.js and Effect-TS
 */

import { Command } from 'commander'
import { Effect } from 'effect'
import { runCommand } from './lib/cli.ts'
import { initCommand } from './commands/init.ts'
import { InitOptionsSchema } from './schemas/config.ts'

const program = new Command()

program
  .name('vibe')
  .description('🥷 Universal Developer Tool Orchestrator - The empowering coach lurking in the shadows')
  .version('1.0.0')

// Init command
program
  .command('init')
  .description('🚀 Initialize .vibe in the current project (one-time setup, everything automated thereafter)')
  .option('-f, --force', 'Overwrite existing .vibe directory')
  .option('-q, --quiet', 'Suppress non-essential output')
  .action((options) => {
    // Validate options with schema
    const validatedOptions = InitOptionsSchema.parse({
      force: options.force || false,
      quiet: options.quiet || false,
    })
    
    // Run the command with proper error handling
    Effect.runPromise(runCommand(initCommand(validatedOptions)))
  })

// Parse command line arguments
if (import.meta.main) {
  program.parse()
}