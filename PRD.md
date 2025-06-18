# .vibe - Universal Developer Tool Orchestrator

## Product Vision

Transform every dependency in your project into instantly-available tools across all AI environments. Solve IDE fragmentation by making your entire development toolkit accessible in Cursor, ChatGPT, Claude, and any MCP-compatible AI.

## Core Problem

Developers suffer from **AI IDE fragmentation**:

- Start coding in Cursor, can't continue context on ChatGPT mobile
- Each AI tool has different interfaces for the same underlying capabilities
- Project knowledge trapped in specific IDEs
- Constant context switching between development environments

## Solution Approach

**"Empowering coach lurking in the shadows"** - minimal-touch automation that:

1. **Observes** your project dependencies automatically
2. **Extracts** developer tools from each library (Hono → routing tools, Zod → validation tools)
3. **Exposes** these tools universally via MCP protocol
4. **Enables** seamless AI assistance across all environments

## Key Differentiators

- **Zero Configuration**: `vibe init` → everything automated thereafter
- **Tool-Centric**: Libraries become discoverable, callable tools
- **Universal Access**: Same tools in Cursor, ChatGPT, Claude Desktop, etc.
- **Network Effects**: Projects with `.vibe` folders share tool intelligence
- **Non-Invasive**: No workflow disruption, no maintenance overhead

## Validated Requirements

### Core User Stories

1. **As a developer**, I want my project's capabilities available in any AI environment
2. **As a mobile coder**, I want to continue Cursor work seamlessly in ChatGPT mobile
3. **As a team member**, I want instant access to project tools when I clone a repo
4. **As a productivity-focused dev**, I want zero-maintenance tool orchestration

### Feature Priorities

#### P0: Foundation (First Release)

- **`vibe init`**: One-command project setup
- **Auto-Discovery**: Detect project dependencies and extract tools
- **MCP Export**: Generate tool schemas for AI consumption
- **File Structure**: `.vibe/` folder with organized tool data

#### P1: Tool Intelligence

- **Hono Integration**: Route definition, middleware, validation tools
- **Effect-TS Integration**: Async composition, error handling tools
- **Zod Integration**: Schema validation, type generation tools

#### P2: Universal Access

- **MCP Server**: Direct AI tool integration
- **Cross-Platform**: Cursor, Claude Desktop, ChatGPT plugin support
- **Repository Intelligence**: Clone-and-go tool availability

#### P3: Quality of Life

- **`vibe export`**: Export to specific formats when needed
- **`vibe status`**: Health check and debugging utility
- **Error Recovery**: Graceful handling of edge cases

## Success Metrics

- **Adoption**: Projects using `.vibe` folders
- **Tool Coverage**: Percentage of dependencies with extracted tools
- **Cross-Platform Usage**: Same tools used across multiple AI environments
- **Developer Velocity**: Reduced context switching, faster tool discovery

## Technical Constraints

- **Deno-native**: No Node.js dependencies
- **Effect-TS**: Functional composition, type-safe errors
- **MCP Protocol**: Standard AI tool integration
- **Zero Config**: Autonomous operation after `vibe init`
- **File-Based**: Local storage, no cloud dependencies

## Success Definition

A developer can `vibe init` in any project, and immediately have all project capabilities available as tools in Cursor, ChatGPT mobile, Claude Desktop, and any future MCP-compatible AI environment.
