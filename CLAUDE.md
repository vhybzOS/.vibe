# .vibe - Unified AI Code Assistant Configuration

## Project Overview

.vibe is a TypeScript library that creates a unified standard for AI coding assistant configuration. It combines the functionality of .cursorrules, .claude/commands, and other AI tool configurations into a single, powerful system.

## Core Features

- **Universal Rule Engine**: Write configuration once, works with all AI tools
- **Automatic Decision Capture**: AI conversations become searchable architectural history via DIARY.txt
- **Smart Documentation**: Auto-generates llms.txt from codebase analysis
- **Memory Management**: AgentFile-compatible local memory system
- **MCP Integration**: Single server connects to Cursor, Windsurf, Claude Desktop, and more
- **Dependency Documentation**: Auto-discovers llms.txt from project dependencies

## Architecture

- **Local-First**: No cloud dependencies, everything runs locally
- **Functional Programming**: Pure functions with Effect-TS composition
- **Type-Safe**: Zod schemas for all data structures
- **MCP Server**: Universal integration layer for AI tools

## Tech Stack

- **TypeScript** with strict mode
- **Effect-TS** for functional composition
- **Zod v4** for schema validation
- **@modelcontextprotocol/sdk** for MCP server
- **Valibot** for lightweight validation
- **es-toolkit** for utilities
- **ts-pattern** for exhaustive pattern matching

## Project Structure

```
.vibe/
├── mcp-server/         # MCP server for AI tool integration
├── core/              # Pure functional modules
│   ├── rules/         # Universal rule system
│   ├── docs/          # Documentation generation
│   ├── memory/        # Memory management
│   ├── diary/         # Decision capture
│   └── patterns/      # Pattern recognition
├── schemas/           # Zod schemas
├── data/             # Local storage
└── cli/              # Command-line interface
```

## Development Commands

```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Build
npm run build

# Test
npm run test

# Lint
npm run lint

# Type check
npm run typecheck

# Start MCP server
npm run mcp-server
```

## Implementation Guidelines

1. **Functional Style**: Use pure functions, avoid classes
2. **Type Safety**: Define Zod schemas first, infer TypeScript types
3. **Effect Composition**: Use Effect-TS for composable operations
4. **Pattern Matching**: Use ts-pattern for exhaustive branching
5. **Local Storage**: Everything stored as JSON/Markdown files
6. **Progressive Enhancement**: Basic features first, advanced features later

## Key Schemas

- **UniversalRuleSchema**: Unified rule format for all AI tools
- **DiaryEntrySchema**: Structured architectural decision capture
- **DependencyDocSchema**: Auto-discovered dependency documentation
- **AgentFileSchema**: Compatible with AgentFile standard

## MCP Server Integration

The MCP server provides:
- Real-time conversation monitoring
- Automatic decision capture
- Rule and context injection
- Memory and decision search
- Dependency documentation discovery

## Testing Strategy

- Unit tests for pure functions
- Integration tests for MCP server
- E2E tests for CLI commands
- Schema validation tests