# `.vibe`

> Unified AI coding tools configuration and memory management system

## 🎯 What is `.vibe`?

**`.vibe`** creates the missing standard for AI coding assistant configuration. Write rules once, works everywhere. Your AI conversations become searchable architectural history, and your codebase becomes LLM-readable automatically.

## 💸 How do you make money? Is this a bait-and-switch?

We don't make any $$$ from this! `rm -rf The_VC_Oligarcy`, someone please! We built `.vibe` to supercharge our dev flow and figured it might help others too. If it makes you happy, we're happy ❤️

If you want to support us, do one of the following:

> [Join WhatsApp Community](https://chat.whatsapp.com/C0Sm15m3gWlAmAktGggGUX) • [Subscribe on YouTube](https://www.youtube.com/@vhybZ) • [Buy a `localhost:4242` T-Shirt](https://en.wikipedia.org/wiki/Coming_Soon) • [Sponsor Us](https://github.com/sponsors/vhybzOS)

## ⚡ Quick Start

```bash
# Install globally using Deno
deno install --allow-all --global --name vibe ./vibe
deno install --allow-all --global --name vibe-daemon ./vibe-daemon

# Initialize in your project
cd your-project
vibe init

# Start the persistent daemon (recommended)
vibe-daemon

# Or run MCP server manually
vibe mcp-server
```

## 🚀 Core Features

- **🎯 Universal Rule Engine**: Write rules once, auto-compiles to all AI tool formats (.cursorrules, .windsurfrules, etc.)
- **🤖 Persistent Daemon**: Background service that never sleeps - auto-discovers projects, monitors changes, serves MCP
- **🔄 Bidirectional Sync**: Change any tool's config file → .vibe updates; change .vibe rules → all tools regenerate
- **🧠 Automatic Decision Capture**: AI conversations become searchable architectural history in DIARY.txt
- **📚 Smart Documentation**: Auto-generates llms.txt from codebase analysis and dependency discovery
- **🔌 Single MCP Server**: One endpoint serves all AI tools - no per-tool plugin hell
- **⚡ Local-First Architecture**: Zero cloud dependencies, semantic search with local embeddings
- **📦 Intelligent Dependency Discovery**: Auto-harvests llms.txt from project dependencies (npm, PyPI, etc.)
- **🌐 Cross-Platform Magic**: Seamless context sync across WSL2, Windows, macOS, cloud environments
- **👀 Real-Time File Watching**: Auto-sync configs, debounced updates, conflict resolution
- **🎯 Auto-Tool Detection**: Discovers Cursor, Windsurf, Claude, Copilot configs automatically
- **🧠 Autonomous Rule Inference**: Automatically generates coding rules for new dependencies using LLMs
- **🌐 Real-time Dashboard**: A web-based UI served on localhost:4242 to monitor projects and manage AI context
- **📦 Autonomous Dependency Analysis**: Discovers AI configurations from dependency source code or infers them on the fly
- **📊 Semantic Memory Search**: Local embeddings for conversation history and decision lookup
- **🔧 Self-Healing**: Health monitoring, auto-restart, graceful degradation when components fail
- **⚙️ System Service Ready**: Install as systemd service (Linux/macOS) or Task Scheduler (Windows)

## 🏗️ How It Works (The Magic)

1. **Install & Initialize**: `vibe init` in your project
2. **Start Daemon**: `vibe-daemon` runs as persistent background service
3. **Open Dashboard**: Visit `http://localhost:4242` for web-based project management
4. **Add MCP Server**: One-time setup in your AI tools
5. **Code Anywhere**: Work on WSL2, switch to Windows, cloud dev - everything syncs
6. **Everything Automated**:
   - AI conversations monitored and decisions captured
   - Rules automatically inferred for new dependencies
   - Documentation stays up-to-date
   - Tool configs auto-synced
   - Memory persists across environments

## 🔄 Cross-Platform Development

The killer feature: **seamless environment switching**

```bash
# Code in Claude on WSL2
cd /mnt/c/projects/myapp
vibe init
vibe-daemon &

# Push changes
git push

# Continue in Windsurf on Windows  
cd C:\projects\myapp
git pull
# vibe-daemon automatically syncs everything!
```

Your AI assistant context, rules, and memory follow you everywhere.

## 🤖 The Daemon Architecture

**The secret sauce**: Instead of CLI tools that run and die, .vibe runs a **persistent background daemon** that:

- 🔍 **Auto-Discovery**: Scans and monitors all `.vibe` projects on your system
- 🔄 **Real-Time Sync**: Watches file changes and syncs configs instantly  
- 📡 **MCP Server**: Serves a single endpoint for all AI tools to connect
- 💚 **Health Monitoring**: Auto-restart failed components, graceful degradation
- 🌐 **Cross-Platform**: Same daemon works on Linux, macOS, Windows, WSL2
- ⚙️ **System Service**: Install once, runs on boot, never think about it again

```bash
# Start daemon (runs forever)
vibe-daemon

# Install as system service
systemctl --user enable vibe-daemon.service  # Linux/macOS
schtasks /create /tn "VibeDaemon" /tr "vibe-daemon" /sc onstart  # Windows
```

**The Result**: Your AI tools stay connected to your project context **even when you switch environments**. Code in Claude on WSL2, continue in Windsurf on Windows - the daemon keeps everything in sync! 🎯

## 💻 The Vibe Dashboard

The unified daemon now serves an interactive web interface on `http://localhost:4242` that provides:

- **📊 Project Overview**: Real-time status of all discovered .vibe projects
- **🔍 Autonomous Discovery**: Monitor dependency analysis and rule inference in real-time
- **⚙️ Settings Management**: Configure AI provider API keys and global preferences
- **📈 Activity Monitoring**: Live feed of daemon activities and file changes
- **🤖 Rule Management**: Browse, edit, and organize universal rules across projects
- **📚 Documentation Hub**: View auto-generated project documentation and dependency insights

The dashboard combines the power of the persistent daemon with a modern, responsive UI for seamless project management.

## 🛠️ Technology Stack

- **🦕 Deno Runtime**: Native TypeScript, URL imports, security by default, web standard APIs
- **⚡ Effect-TS**: Functional composition, type-safe error handling, resource management
- **🔮 Zod v4**: Schema validation with `z.output` types, enhanced performance and APIs
- **🔌 MCP Protocol**: Model Context Protocol for universal AI tool integration
- **👀 Chokidar**: Cross-platform file watching with debouncing and conflict resolution
- **🎯 ts-pattern**: Exhaustive pattern matching for type-safe branching logic
- **🛠️ es-toolkit**: Modern utility library (3x faster than Lodash, 97% smaller)
- **📁 Local Storage**: JSON + Markdown files, local embeddings, zero cloud dependencies

## 📁 What Gets Created

```
.vibe/
├── rules/              # Universal rules for all AI tools
├── docs/               # Auto-generated llms.txt and documentation
├── memory/             # Local conversation memory
├── diary/              # DIARY.txt with architectural decisions
├── dependencies/       # Auto-discovered dependency docs
└── config/             # System configuration
```

## 🔧 Development

```bash
# Clone and setup
git clone <repo>
cd .vibe

# Run with Deno
deno task dev       # Development mode
deno task daemon    # Start daemon
deno task build     # Build binaries

# Check and format
deno task check     # Type check
deno task fmt       # Format code
deno task lint      # Lint code
```

## 🤝 MCP Integration

.vibe works through a single MCP server that integrates with:

- **Cursor**: Add to mcpServers in settings
- **Windsurf**: Auto-detected when running
- **Claude Desktop**: Add to claude_desktop_config.json
- **Any MCP-compatible tool**

### Example MCP Configuration

**Cursor (.cursor/config.json)**:
```json
{
  "mcpServers": {
    "vibe": {
      "command": "vibe-daemon",
      "args": ["--mcp-only"]
    }
  }
}
```

**Claude Desktop**:
```json
{
  "mcpServers": {
    "vibe": {
      "command": "vibe-daemon",
      "args": ["--mcp-only"]
    }
  }
}
```

## 🎯 Use Cases

- **Solo Developer**: Never lose architectural decisions again
- **Team Projects**: Shared memory and consistent AI assistance
- **Open Source**: Auto-generate contributor-friendly documentation
- **Cross-Platform**: Seamless development across environments
- **Learning**: Build searchable knowledge base from AI conversations

## 🤖 AI Tool Compatibility

- ✅ Cursor
- ✅ Windsurf  
- ✅ Claude Desktop
- ✅ Any MCP-compatible tool
- 🔄 GitHub Copilot (planned)
- 🔄 JetBrains AI (planned)

## 📖 Commands

```bash
vibe init                    # Initialize .vibe in project
vibe status                  # Show project status
vibe sync                    # Sync tool configurations
vibe generate               # Generate rules from analysis
vibe discover               # Find dependency documentation
vibe export                 # Export to AgentFile format
vibe daemon                 # Daemon management info

vibe-daemon                 # Start persistent daemon
```

## 🚀 Installation as System Service

**Linux/macOS (systemd)**:
```bash
# Install binaries
sudo cp vibe-daemon /usr/local/bin/

# Create service (auto-generated)
vibe daemon

# Enable and start
systemctl --user enable vibe-daemon.service
systemctl --user start vibe-daemon.service
```

**Windows (Task Scheduler)**:
```powershell
# Run at startup
schtasks /create /tn "VibeDaemon" /tr "vibe-daemon" /sc onstart
```

## 📄 License

MIT

## 🙋‍♂️ Support

- [GitHub Issues](https://github.com/dotvibe/dotvibe/issues)
- [Documentation](https://docs.dotvibe.dev)
- [Discord Community](https://discord.gg/dotvibe)
