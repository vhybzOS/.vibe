import { Effect, pipe } from 'effect'

export const mcpServerCommand = (
  _options: { port: string; host: string }
) =>
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
    Effect.flatMap(() => waitForever())
  )

const startMcpServer = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Import and start the MCP server
    import('../../mcp-server/index.js')
      .then(() => resolve())
      .catch(reject)
  })
}

const waitForever = () =>
  Effect.async<never, never, void>(() => {
    // Keep the process alive
    const interval = setInterval(() => {}, 1000)
    
    return Effect.sync(() => {
      clearInterval(interval)
    })
  })