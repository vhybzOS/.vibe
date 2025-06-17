/**
 * Vibe CLI
 *
 * The definitive command-line interface for the Vibe Development Environment.
 * This is the primary client for interacting with the Vibe Daemon and its core services.
 * It is designed to be intuitive, responsive, and provide clear, actionable feedback.
 *
 * @version 0.2.0
 * @author Keyvan, Claude, Gemini
 */

// =================================================================
// 1. IMPORTS & BOOTSTRAP
// =================================================================

import { Command, Option } from 'commander'
import { Effect, pipe } from 'effect'

// This defines the contract with our backend.
// In the final two-file structure, these are real imports from `./daemon.ts`.
import * as VibeEngine from './daemon.ts'
import type { DaemonStatus, DiaryEntry, Memory, ProjectStatus, SearchResult, SyncResult, VibeError } from './daemon.ts'

// =================================================================
// 2. CLI ABSTRACTIONS (The Command Factory)
// =================================================================
// This architectural pattern keeps our command definitions clean and DRY.

const withVibeDirectory = <O, R>(
  commandLogic: (vibePath: string, options: O) => Effect.Effect<R, VibeError>,
) =>
(options: O) =>
  pipe(
    VibeEngine.ensureVibeDirectory(Deno.cwd()),
    Effect.flatMap((vibePath) => commandLogic(vibePath, options)),
  )

const asGlobalCommand = <O, R>(
  commandLogic: (projectPath: string, options: O) => Effect.Effect<R, VibeError>,
) =>
(options: O) => commandLogic(Deno.cwd(), options)

const runCommand = (commandEffect: Effect.Effect<any, VibeError | Error, never>): void => {
  pipe(
    commandEffect,
    Effect.catchAll((error) =>
      pipe(
        Effect.sync(() => {
          // Use a more user-friendly error display
          console.error(`\n❌ \x1b[31mError: ${error.message}\x1b[0m`) // Red color for error message
          if ('_tag' in error) {
            console.error(`   \x1b[90m(Type: ${error._tag})\x1b[0m`)
          }
          if (Deno.env.get('VIBE_DEBUG') && error instanceof Error && error.cause) {
            console.error('\n🔍 \x1b[90mDebug Info:\x1b[0m', error.cause)
          }
        }),
        Effect.flatMap(() => Effect.sync(() => Deno.exit(1))),
      )
    ),
    Effect.runPromise,
  ).catch((unexpectedError) => {
    console.error('💥 \x1b[91mA fatal, unexpected error occurred:\x1b[0m', unexpectedError)
    Deno.exit(1)
  })
}

// =================================================================
// 3. DISPLAY & FORMATTING HELPERS
// =================================================================
// These functions turn raw data into a beautiful and informative user experience.

const displayStatus = (status: ProjectStatus): void => {
  console.log(`\n📊 \x1b[1mStatus for: ${status.projectName}\x1b[0m`)
  console.log(`   \x1b[90mPath:\x1b[0m ${status.projectPath}`)

  console.log('\n🤖 \x1b[1mDetected Tools\x1b[0m')
  if (status.detectedTools.length === 0) {
    console.log('   \x1b[90mNo AI tools detected.\x1b[0m')
  } else {
    status.detectedTools.forEach((tool) => {
      const confidence = Math.round(tool.confidence * 100)
      const color = confidence > 80 ? '\x1b[32m' : '\x1b[33m' // Green for high confidence, yellow for lower
      console.log(`   - ${tool.name.padEnd(15)} ${color}(Confidence: ${confidence}%)\x1b[0m`)
    })
  }

  console.log('\nRules & Memory')
  console.log(`   \x1b[90mUniversal Rules:\x1b[0m ${status.ruleCount}`)
  console.log(`   \x1b[90mMemory Entries:\x1b[0m ${status.memoryCount}`)
  console.log(`   \x1b[90mDiary Decisions:\x1b[0m ${status.diaryCount}`)

  console.log('\n💡 \x1b[1mNext Steps\x1b[0m')
  console.log('   - Run `\x1b[36mvibe sync\x1b[0m` to apply rules to your tools.')
  console.log('   - Run `\x1b[36mvibe daemon\x1b[0m` to enable real-time features.')
}

const displaySearchResults = (results: SearchResult[]): void => {
  if (results.length === 0) {
    console.log('\n🤷 No results found.')
    return
  }
  console.log(`\n🔍 Found ${results.length} results:`)
  results.forEach((result, i) => {
    const typeColor = {
      memory: '\x1b[35m', // Magenta
      diary: '\x1b[36m', // Cyan
      rule: '\x1b[33m', // Yellow
    }[result.type] || '\x1b[90m'

    console.log(
      `\n${i + 1}. ${typeColor}[${result.type.toUpperCase()}]\x1b[0m \x1b[1m${result.title}\x1b[0m \x1b[90m(Score: ${
        result.score.toFixed(2)
      })\x1b[0m`,
    )
    console.log(`   \x1b[2m${result.summary}\x1b[0m`)
    console.log(`   \x1b[90mID: ${result.id}\x1b[0m`)
  })
}

const displayDaemonStatus = (status: DaemonStatus): void => {
  console.log(`\n⚙️ \x1b[1mVibe Daemon Status\x1b[0m`)
  console.log(
    `   \x1b[90mState:\x1b[0m         ${status.isRunning ? '\x1b[32mRUNNING\x1b[0m' : '\x1b[31mSTOPPED\x1b[0m'}`,
  )
  console.log(`   \x1b[90mVersion:\x1b[0m       ${status.version}`)
  console.log(`   \x1b[90mPID:\x1b[0m           ${status.pid}`)
  console.log(`   \x1b[90mUptime:\x1b[0m        ${status.uptime}`)
  console.log(`   \x1b[90mProjects Watched:\x1b[0m ${status.projectsWatched}`)
  console.log('\n💡 \x1b[1mAPI Endpoints\x1b[0m')
  console.log(`   - \x1b[36mHTTP Control:\x1b[0m http://localhost:${status.ports.http}`)
  console.log(`   - \x1b[36mMCP Server:\x1b[0m   tcp://localhost:${status.ports.mcp}`)
}

// Additional display helpers for memory and diary can be added here...
const displayMemoryList = (memories: Memory[]) => {/* ... */}
const displayDiaryTimeline = (entries: DiaryEntry[]) => {/* ... */}

// =================================================================
// 4. MAIN PROGRAM & COMMAND DEFINITIONS
// =================================================================

const program = new Command()
program
  .name('vibe')
  .description('✨ The missing OS for AI-assisted development. Your AI, but with a perfect memory.')
  .version('2.0.0-rewrite')

// --- Foundational Commands ---

program
  .command('init')
  .description('🚀 Bootstrap .vibe in the current project.')
  .option('-f, --force', 'Overwrite existing .vibe directory.')
  .action((options) =>
    runCommand(
      pipe(
        asGlobalCommand(VibeEngine.initializeProject)(options),
        Effect.tap(() =>
          console.log('\n✅ \x1b[32mProject initialized.\x1b[0m The vibe daemon will now begin autonomous discovery.')
        ),
      ),
    )
  )

program
  .command('status')
  .description("📊 Get a health check of the current project's vibe.")
  .action((options) =>
    runCommand(
      pipe(
        withVibeDirectory(VibeEngine.getProjectStatus)(options),
        Effect.tap(displayStatus),
      ),
    )
  )

program
  .command('sync')
  .description('🔄 Manually compile and sync universal rules to all detected tool configs.')
  .action((options) =>
    runCommand(
      pipe(
        withVibeDirectory(VibeEngine.syncProject)(options),
        Effect.tap((result: SyncResult) =>
          console.log(`\n✅ \x1b[32mSync complete.\x1b[0m Synced ${result.syncedFiles.length} tool configurations.`)
        ),
      ),
    )
  )

// --- Discovery Commands ---

program
  .command('discover')
  .description('🧠 Trigger autonomous discovery for project dependencies.')
  .option('--force-refresh', 'Ignore cache and re-discover all dependencies.')
  .action((options) =>
    runCommand(
      pipe(
        withVibeDirectory(VibeEngine.triggerDiscovery)(options),
        Effect.tap(() =>
          console.log('\n⚡ \x1b[32mDiscovery process initiated.\x1b[0m Monitor daemon logs for progress.')
        ),
      ),
    )
  )

// --- Search Command Group ---

const search = program
  .command('search')
  .description('🔍 Perform a global search across memory, diary, and rules.')

search
  .argument('<query>', 'The text to search for.')
  .addOption(new Option('-t, --type <types...>', 'Filter by document type').choices(['memory', 'diary', 'rule']))
  .option('-l, --limit <number>', 'Number of results to return.', '10')
  .action((query, options) =>
    runCommand(
      pipe(
        withVibeDirectory(VibeEngine.searchDocuments)({ query, ...options }),
        Effect.tap(displaySearchResults),
      ),
    )
  )

// --- Memory Command Group ---

const memory = program
  .command('memory')
  .description("🧠 Manage your AI's persistent memory.")

memory
  .command('add <content>')
  .description('Add a new entry to the memory.')
  .addOption(
    new Option('--type <type>', 'The type of memory.').choices(['knowledge', 'decision', 'pattern', 'conversation'])
      .default('knowledge'),
  )
  .option('--tags <tags...>', 'Comma-separated tags.')
  .action((content, options) =>
    runCommand(
      pipe(
        withVibeDirectory(VibeEngine.addMemory)({ content, ...options }),
        Effect.tap((result) => console.log(`\n✅ \x1b[32mMemory added with ID:\x1b[0m ${result.id}`)),
      ),
    )
  )

memory
  .command('search <query>')
  .description('Search for memories.')
  .option('-l, --limit <number>', 'Number of results to return.', '10')
  .action((query, options) =>
    runCommand(
      pipe(
        withVibeDirectory(VibeEngine.searchMemories)({ query, ...options }),
        Effect.tap(displaySearchResults),
      ),
    )
  )

memory
  .command('list')
  .description('List recent memory entries.')
  .option('-l, --limit <number>', 'Number of memories to show.', '20')
  .action((options) =>
    runCommand(
      pipe(
        withVibeDirectory(VibeEngine.listMemories)(options),
        Effect.tap(displayMemoryList),
      ),
    )
  )

// --- Diary Command Group ---

const diary = program
  .command('diary')
  .description("📖 Manage the project's architectural decision diary.")

diary
  .command('add <title>')
  .description('Record a new architectural decision.')
  .option('-c, --content <text>', 'The main content or rationale for the decision.')
  .action((title, options) =>
    runCommand(
      pipe(
        withVibeDirectory(VibeEngine.addDiaryEntry)({ title, ...options }),
        Effect.tap((result) => console.log(`\n✅ \x1b[32mDiary entry added with ID:\x1b[0m ${result.id}`)),
      ),
    )
  )

diary
  .command('timeline')
  .description('View a chronological timeline of decisions.')
  .option('-l, --limit <number>', 'Number of entries to show.', '15')
  .action((options) =>
    runCommand(
      pipe(
        withVibeDirectory(VibeEngine.getDiaryTimeline)(options),
        Effect.tap(displayDiaryTimeline),
      ),
    )
  )

// --- Daemon Management Group ---

const daemonCmd = program
  .command('daemon')
  .description('⚙️ Manage the vibe background daemon process.')

daemonCmd
  .command('start')
  .description('Start the vibe daemon in the background.')
  .action(() => runCommand(VibeEngine.manageDaemon({ action: 'start' })))

daemonCmd
  .command('stop')
  .description('Stop the vibe daemon.')
  .action(() => runCommand(VibeEngine.manageDaemon({ action: 'stop' })))

daemonCmd
  .command('status')
  .description('Check the status of the vibe daemon.')
  .action(() =>
    runCommand(
      pipe(
        VibeEngine.manageDaemon({ action: 'status' }),
        Effect.tap(displayDaemonStatus),
      ),
    )
  )

// =================================================================
// 5. EXECUTION BLOCK
// =================================================================

if (import.meta.main) {
  program.parse(Deno.args)
}
