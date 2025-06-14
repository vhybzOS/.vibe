import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { VibeServer } from './vibe-server.js'

export function setupTools(server: Server, vibeServer: VibeServer) {
  // Tools are defined in the VibeServer.listTools() method
  // and handled in VibeServer.handleToolCall()
  
  // This function can be used to register additional tool handlers
  // or setup tool-specific configurations
  
  console.error('🔧 Tools registered with MCP server')
}