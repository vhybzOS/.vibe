import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { VibeServer } from './vibe-server.js'

export function setupResources(server: Server, vibeServer: VibeServer) {
  // Resources are defined in the VibeServer.listResources() method
  // and handled in VibeServer.handleResourceRead()
  
  // This function can be used to register additional resource handlers
  // or setup resource-specific configurations
  
  console.error('📚 Resources registered with MCP server')
}