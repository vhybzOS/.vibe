import { Effect, pipe } from 'effect'
import { createCliError, type VibeError } from '../../lib/errors.ts'
import { type CommandFn } from '../base.ts'

/**
 * Core MCP server logic - MCP server is global and doesn't require .vibe directory
 */
const mcpServerLogic: CommandFn<{ port: string; host: string }, void> = 
  (_projectPath, options) =>
    pipe(
      Effect.log('🚀 Starting .vibe MCP server...'),
      Effect.flatMap(() => Effect.tryPromise({
        try: () => startMcpServer(),
        catch: (error) => new Error(`Failed to start MCP server: ${error}`),
      })),
      Effect.tap(() => Effect.log('📡 MCP server started successfully')),
      Effect.flatMap(() => showServerInstructions()),
      Effect.flatMap(() => waitForever()),
      Effect.catchAll((error) => Effect.fail(createCliError(error, 'MCP server failed', 'mcp-server')))
    )

/**
 * Show MCP server configuration instructions
 */
const showServerInstructions = () => {
  const cursorInstructions = pipe(
    Effect.log('🔗 Add this server to your AI tools:'),
    Effect.flatMap(() => Effect.log('')),
    Effect.flatMap(() => Effect.log('  Cursor (.cursor/config.json):')),
    Effect.flatMap(() => Effect.log('  {')),
    Effect.flatMap(() => Effect.log('    "mcpServers": {')),
    Effect.flatMap(() => Effect.log('      "dotvibe": {')),
    Effect.flatMap(() => Effect.log('        "command": "npx",')),
    Effect.flatMap(() => Effect.log('        "args": ["dotvibe", "mcp-server"]')),
    Effect.flatMap(() => Effect.log('      }')),
    Effect.flatMap(() => Effect.log('    }')),
    Effect.flatMap(() => Effect.log('  }')),
    Effect.flatMap(() => Effect.log(''))
  )
  
  return pipe(
    cursorInstructions,
    Effect.flatMap(() => showClaudeDesktopInstructions())
  )
}

/**
 * Show Claude Desktop configuration instructions  
 */
const showClaudeDesktopInstructions = () =>
  pipe(
    Effect.log('  Claude Desktop (~/.config/claude/claude_desktop_config.json):'),
    Effect.flatMap(() => Effect.log('  {')),
    Effect.flatMap(() => Effect.log('    "mcpServers": {')),
    Effect.flatMap(() => Effect.log('      "dotvibe": {')),
    Effect.flatMap(() => Effect.log('        "command": "dotvibe",')),
    Effect.flatMap(() => Effect.log('        "args": ["mcp-server"]')),
    Effect.flatMap(() => Effect.log('      }')),
    Effect.flatMap(() => Effect.log('    }')),
    Effect.flatMap(() => Effect.log('  }')),
    Effect.flatMap(() => Effect.log('')),
  )

/**
 * MCP server command - doesn't use withVibeDirectory since it's global server
 */
export const mcpServerCommand = (
  options: { port: string; host: string },
): Effect.Effect<void, Error | VibeError, never> =>
  mcpServerLogic('', options)

const startMcpServer = async () => {
  // Import and start the MCP server
  await import('../../mcp-server/index.js')
}

const waitForever = () =>
  Effect.async<void, never, never>(() => {
    // Keep the process alive
    const interval = setInterval(() => {}, 1000)

    return Effect.sync(() => {
      clearInterval(interval)
    })
  })
