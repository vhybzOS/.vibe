# .vibe - Unified AI Code Assistant Configuration

## Project Overview

.vibe is a **Deno-based TypeScript system** that creates a unified standard for AI coding assistant configuration. It combines the functionality of .cursorrules, .claude/commands, and other AI tool configurations into a single, powerful system with a persistent daemon architecture.

## Core Features

- **Universal Rule Engine**: Write configuration once, works with all AI tools
- **Persistent Daemon**: Background service for cross-platform development workflow
- **Automatic Decision Capture**: AI conversations become searchable architectural history via DIARY.txt
- **Smart Documentation**: Auto-generates llms.txt from codebase analysis
- **Memory Management**: AgentFile-compatible local memory system
- **MCP Integration**: Single server connects to Cursor, Windsurf, Claude Desktop, and more
- **Dependency Documentation**: Auto-discovers llms.txt from project dependencies
- **Bidirectional Sync**: Keep universal rules synchronized with tool-specific formats
- **Auto-Detection**: Automatically discovers AI tools and their configurations

## Architecture

- **Local-First**: No cloud dependencies, everything runs locally
- **Functional Programming**: Pure functions with Effect-TS composition
- **Type-Safe**: Zod v4 schemas for all data structures
- **MCP Server**: Universal integration layer for AI tools
- **Daemon Architecture**: Persistent background service for continuous monitoring
- **Cross-Platform**: Works on Windows, macOS, Linux, and WSL

## Tech Stack

- **Deno** runtime with native TypeScript support
- **Effect-TS** for functional composition and error handling
- **Zod v4** with `/v4` import syntax and `z.output` types
- **@modelcontextprotocol/sdk** for MCP server integration
- **chokidar** for file system watching
- **Native Deno APIs** for file system, networking, and process management

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

## Quick Start

### Prerequisites
- **Deno** (latest stable version)
- **Node.js** (for projects that need it)

### Installation & Setup

```bash
# Clone and navigate to project
git clone <repository-url>
cd .vibe

# Cache dependencies
deno cache --reload src/**/*.ts

# Initialize a project
./vibe init

# Start the daemon (persistent background service)
./vibe-daemon

# Check status
./vibe status
```

### Development Commands

```bash
# Quick validation (essential tests only)
deno run --allow-all scripts/test.ts

# Full test suite (all tests)
deno run --allow-all scripts/test.ts --full

# Performance benchmarks
deno run --allow-all scripts/test.ts --perf

# Format code
deno fmt

# Lint code
deno lint

# Type check
deno check src/**/*.ts

# Run specific CLI command
deno run --allow-all src/cli/index.ts --help

# Start daemon directly
deno run --allow-all src/daemon/index.ts

# Start MCP server only
deno run --allow-all src/mcp-server/index.ts
```

## Implementation Guidelines

1. **Functional Style**: Use pure functions, avoid classes
2. **Type Safety**: Define Zod v4 schemas first, use `z.output` types
3. **Effect Composition**: Use Effect-TS for composable operations
4. **Deno APIs**: Use native Deno APIs instead of Node.js equivalents
5. **Local Storage**: Everything stored as JSON/Markdown files
6. **Progressive Enhancement**: Basic features first, advanced features later

## Key Schemas (Zod v4)

- **UniversalRuleSchema**: Unified rule format for all AI tools
- **AIToolConfigSchema**: Tool-specific configuration mapping
- **DiaryEntrySchema**: Structured architectural decision capture
- **DependencyDocSchema**: Auto-discovered dependency documentation
- **MemorySchema**: Semantic memory with embeddings
- **AgentFileSchema**: Compatible with AgentFile standard
- **ProjectSchema**: Project-level configuration and metadata

## Daemon Architecture

The persistent daemon (`vibe-daemon`) provides:
- **Auto-Discovery**: Scans filesystem for .vibe projects
- **File Watching**: Monitors config changes in real-time
- **MCP Server**: Universal AI tool integration
- **Health Monitoring**: Self-healing and component restart
- **Cross-Platform**: Works on Windows, macOS, Linux, WSL
- **Background Service**: Runs continuously without user intervention

## MCP Server Integration

The MCP server provides:
- Real-time conversation monitoring
- Automatic decision capture
- Rule and context injection
- Memory and decision search
- Dependency documentation discovery
- Universal tool compatibility

## Testing Strategy

### Comprehensive Test Suite
- **Integration Tests**: End-to-end workflow validation
- **Unit Tests**: Individual function and schema testing
- **E2E Tests**: CLI commands and daemon lifecycle
- **Performance Tests**: Benchmarking and regression detection

### Test Commands
```bash
# Quick tests (2-3 minutes)
deno run --allow-all scripts/test.ts

# Full regression suite (5-10 minutes)
deno run --allow-all scripts/test.ts --full

# Performance benchmarks
deno run --allow-all scripts/test.ts --perf
```

### CI/CD Integration
- GitHub Actions workflow with multi-platform testing
- Automated security scanning and type checking
- Code coverage reporting via Codecov
- Performance regression detection

## CLI Usage

### Core Commands

```bash
# Initialize .vibe in current project
./vibe init [--force]

# Show project status and detected tools
./vibe status

# Synchronize configurations bidirectionally
./vibe sync [--dry-run] [--tool=cursor|windsurf|claude]

# Generate universal rules from existing configs
./vibe generate [--threshold=0.8]

# Discover dependencies and generate llms.txt
./vibe discover

# Export memory to AgentFile format
./vibe export [--output=agent.json] [--format=agentfile]

# Manage daemon
./vibe daemon [start|stop|status|restart]
```

### Daemon Management

```bash
# Start daemon (persistent background service)
./vibe-daemon

# Check daemon status
./vibe daemon status

# Stop daemon gracefully
./vibe daemon stop

# Restart daemon
./vibe daemon restart
```

### Project Structure Created by `vibe init`

```
.vibe/
├── config.json          # Project configuration
├── rules/               # Universal rules storage
│   ├── universal.json   # Compiled universal rules
│   └── generated/       # Auto-generated rules
├── memory/              # Memory storage
│   ├── conversations/   # Conversation history
│   ├── decisions/       # Architectural decisions
│   └── search.index     # Search index
├── diary/               # Decision diary
│   ├── DIARY.txt       # Main diary file
│   └── entries/        # Individual entries
└── docs/               # Generated documentation
    ├── llms.txt        # Auto-generated LLM docs
    └── dependencies/   # Dependency docs
```

## Troubleshooting

### Common Issues

**Daemon won't start**:
```bash
# Check if port is already in use
lsof -i :3001

# Check daemon logs
tail -f /tmp/vibe-daemon.log

# Force restart
./vibe daemon stop && ./vibe daemon start
```

**Permission errors**:
```bash
# Ensure Deno has required permissions
deno --version
ls -la vibe vibe-daemon  # Check executable permissions
```

**Tests failing**:
```bash
# Check dependencies
deno cache --reload src/**/*.ts

# Run individual test suites
deno test tests/unit/schemas.test.ts --allow-all
deno test tests/integration.test.ts --allow-all
```