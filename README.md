# .vibe

> Unified AI coding tools configuration and memory management system

## 🎯 What is .vibe?

.vibe creates the missing standard for AI coding assistant configuration. Write rules once, works everywhere. Your AI conversations become searchable architectural history, and your codebase becomes LLM-readable automatically.

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

- **🎯 One Configuration, All Tools**: Write rules once, works with Cursor, Windsurf, Claude Desktop, and more
- **🤖 Automatic Decision Capture**: AI conversations become searchable architectural history in DIARY.txt
- **📚 Smart Documentation**: Auto-generates llms.txt from codebase analysis
- **🧠 Evolving Intelligence**: System learns and improves rules from usage patterns
- **🔌 Zero-Friction Integration**: MCP server handles everything behind the scenes
- **⚡ Local-First**: No cloud dependencies, everything runs on your machine
- **📦 Dependency Discovery**: Auto-finds llms.txt from your project dependencies
- **🔄 Cross-Platform Sync**: Move seamlessly between development environments

## 🏗️ How It Works (The Magic)

1. **Install & Initialize**: `vibe init` in your project
2. **Start Daemon**: `vibe-daemon` runs as persistent background service
3. **Add MCP Server**: One-time setup in your AI tools
4. **Code Anywhere**: Work on WSL2, switch to Windows, cloud dev - everything syncs
5. **Everything Automated**:
   - AI conversations monitored and decisions captured
   - Rules generated from code patterns
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

## 🛠️ Technology

- **Deno** runtime for modern JavaScript/TypeScript
- **Effect-TS** for composable functional operations
- **Zod v4** for type-safe schemas
- **MCP (Model Context Protocol)** for universal AI tool integration
- **Local storage** - your data stays on your machine

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