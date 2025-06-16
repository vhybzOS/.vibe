#!/usr/bin/env -S deno run --allow-all

/**
 * .vibe MCP Server - Clean, modern implementation
 * Provides AI tool integration via Model Context Protocol
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { VibeServer } from './vibe-server.ts'

const SERVER_INFO = {
  name: 'dotvibe',
  version: '1.0.0',
  description: 'Unified AI coding tools configuration and memory management',
}

async function main() {
  const server = new Server(SERVER_INFO, {
    capabilities: {
      tools: {},
      resources: {},
    },
  })

  const vibeServer = new VibeServer()
  await vibeServer.initialize()

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params
    
    try {
      const result = await vibeServer.handleToolCall(name, args || {})
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      }
    }
  })

  // Handle resource requests
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params
    
    try {
      const result = await vibeServer.handleResourceRead(uri)
      return {
        contents: [
          {
            uri,
            mimeType: result.mimeType,
            text: result.content,
          },
        ],
      }
    } catch (error) {
      throw new Error(`Failed to read resource ${uri}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

  // Handle resource listing
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    const resources = await vibeServer.listResources()
    return { resources }
  })

  // Handle tool listing
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools = await vibeServer.listTools()
    return { tools }
  })

  // Start server
  const transport = new StdioServerTransport()
  await server.connect(transport)
  
  console.error('🚀 .vibe MCP server started')
}

// Handle graceful shutdown
Deno.addSignalListener('SIGINT', () => {
  console.error('📡 .vibe MCP server shutting down...')
  Deno.exit(0)
})

Deno.addSignalListener('SIGTERM', () => {
  console.error('📡 .vibe MCP server shutting down...')
  Deno.exit(0)
})

main().catch((error) => {
  console.error('❌ Failed to start .vibe MCP server:', error)
  Deno.exit(1)
})