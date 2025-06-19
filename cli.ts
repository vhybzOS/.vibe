#!/usr/bin/env -S deno run --allow-all

/**
 * Vibe CLI Entry Point
 *
 * Based on legacy/v0.2 CLI patterns with Commander.js and Effect-TS
 *
 * @tested_by tests/user/real-world-workflow.test.ts (CLI integration: help, version, command execution)
 * @tested_by tests/integration/cli-integration.test.ts (CLI argument parsing and command routing)
 */

import { Command } from 'commander'
import { Effect } from 'effect'
import { runCommand } from './lib/cli.ts'
import { initCommand } from './commands/init.ts'
import { executeVibeCode } from './commands/vibe-code.ts'
import { executeTemplateScaffolding } from './services/template-scaffolding.ts'
import { InitOptionsSchema } from './schemas/config.ts'

const program = new Command()

program
  .name('vibe')
  .description('🥷 Universal Developer Tool Orchestrator - The empowering coach lurking in the shadows')
  .version('1.0.0')

// Init command - handles both current directory init and template scaffolding
program
  .command('init [runtime] [project-name]')
  .description('🚀 Initialize .vibe (no args) or scaffold from template (init node/deno [name])')
  .option('-f, --force', 'Overwrite existing .vibe directory')
  .option('-q, --quiet', 'Suppress non-essential output')
  .action((runtime?: string, projectName?: string, options?: any) => {
    if (!runtime) {
      // No runtime specified - initialize .vibe in current directory
      const validatedOptions = InitOptionsSchema.parse({
        force: options?.force || false,
        quiet: options?.quiet || false,
      })
      Effect.runPromise(runCommand(initCommand(validatedOptions)))
    } else {
      // Runtime specified - scaffold new project from template
      Effect.runPromise(runCommand(executeTemplateScaffolding(runtime, projectName)))
    }
  })

// Code command
program
  .command('code <package>')
  .description('📚 Fetch and display library documentation for the specified package')
  .action((packageName: string) => {
    // Run the command with proper error handling
    Effect.runPromise(runCommand(executeVibeCode(packageName)))
  })

// Parse command line arguments
if (import.meta.main) {
  program.parse()
}
