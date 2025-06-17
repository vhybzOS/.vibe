import { Effect, pipe } from 'effect'

export interface McpServerConfig {
  enabled: boolean
  port: number
  host: string
  autoRestart: boolean
}

export const startMcpServer = (config: McpServerConfig) =>
  pipe(
    Effect.log(`🔌 Starting MCP server on ${config.host}:${config.port}...`),
    Effect.flatMap(() => Effect.tryPromise({
      try: async () => {
        // Import and start the MCP server module
        await import('./index.ts')
        return true
      },
      catch: (error) => new Error(`Failed to start MCP server: ${error}`),
    })),
    Effect.tap(() => Effect.log('✅ MCP server started successfully')),
    Effect.map(() => void 0),
  )
