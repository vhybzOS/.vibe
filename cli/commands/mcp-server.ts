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
      Effect.tryPromise({
        try: () => startMcpServer(),
        catch: (error) => new Error(`Failed to start MCP server: ${error}`),
      }),
      Effect.tap(() => Effect.log('📡 MCP server started successfully')),
      Effect.tap(() => Effect.log('🔗 Add this server to your AI tools:')),
      Effect.tap(() => Effect.log('')),
      Effect.tap(() => Effect.log('  Cursor (.cursor/config.json):')),
      Effect.tap(() => Effect.log('  {')),
      Effect.tap(() => Effect.log('    "mcpServers": {')),
      Effect.tap(() => Effect.log('      "dotvibe": {')),
      Effect.tap(() => Effect.log('        "command": "npx",')),
      Effect.tap(() => Effect.log('        "args": ["dotvibe", "mcp-server"]')),
      Effect.tap(() => Effect.log('      }')),
      Effect.tap(() => Effect.log('    }')),
      Effect.tap(() => Effect.log('  }')),
      Effect.tap(() => Effect.log('')),
      Effect.tap(() => Effect.log('  Claude Desktop (~/.config/claude/claude_desktop_config.json):')),
      Effect.tap(() => Effect.log('  {')),
      Effect.tap(() => Effect.log('    "mcpServers": {')),
      Effect.tap(() => Effect.log('      "dotvibe": {')),
      Effect.tap(() => Effect.log('        "command": "dotvibe",')),
      Effect.tap(() => Effect.log('        "args": ["mcp-server"]')),
      Effect.tap(() => Effect.log('      }')),
      Effect.tap(() => Effect.log('    }')),
      Effect.tap(() => Effect.log('  }')),
      Effect.tap(() => Effect.log('')),
      Effect.flatMap(() => waitForever()),
      Effect.catchAll((error) => Effect.fail(createCliError(error, 'MCP server failed', 'mcp-server')))
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
  Effect.async<never, never, void>(() => {
    // Keep the process alive
    const interval = setInterval(() => {}, 1000)

    return Effect.sync(() => {
      clearInterval(interval)
    })
  })
