# 🚀 Installation: 60 Seconds to Revolution

> **TL;DR:** Run two commands. Watch your AI assistant become exponentially smarter. Never look back.

## ⚡ The Lightning Setup

### Step 1: Install the Magic (30 seconds)

```bash
# Downloads and installs vibe daemon + CLI
curl -fsSL https://dotvibe.dev/install.sh | sh
```

This installs:

- **🤖 vibe-daemon** - The persistent background service that watches your projects
- **⚡ vibe CLI** - Simple commands for interacting with the daemon
- **🔄 Auto-start** - Daemon starts automatically on system boot

### Step 2: Transform Your First Project (30 seconds)

```bash
cd your-awesome-project
vibe init
```

**That's it.** ✨

The moment you run `init`, the daemon:

- 🔍 **Analyzes** your dependencies automatically
- 🧠 **Generates** AI expertise for each library
- 🌐 **Creates** tools accessible from any AI environment
- 📚 **Builds** a universal knowledge base for your project

## 🎯 What Just Happened?

Your project directory now contains:

```
your-awesome-project/
├── .vibe/
│   ├── config.json          # Project metadata
│   ├── dependencies/        # Auto-generated library expertise  
│   │   ├── hono/           # Routing tools and patterns
│   │   ├── zod/            # Schema validation expertise
│   │   └── effect/         # Async composition patterns
│   ├── rules/              # Universal AI assistant rules
│   └── memory/             # Conversation history and decisions
├── .cursorrules             # Auto-generated for Cursor
├── .windsurfrules          # Auto-generated for Windsurf  
├── .claude/                # Auto-generated for Claude Desktop
└── package.json            # Your existing project (unchanged)
```

## 🧠 The Intelligence Awakening

Every AI tool you use now has instant access to:

### 📦 **Dependency Expertise**

- **Hono** → Advanced routing patterns, middleware composition, edge optimization
- **Zod** → Schema validation, type generation, error handling strategies
- **Effect** → Async composition, error handling, performance patterns
- **Every library** in your `package.json` gets AI-powered documentation

### 🎯 **Project Context**

- Your architectural decisions and patterns
- Team conventions and style preferences
- Performance optimizations specific to your stack
- Testing strategies that fit your project structure

### 🌐 **Universal Access**

All of this intelligence is available in:

- **Cursor** (via `.cursorrules`)
- **Windsurf** (via `.windsurfrules`)
- **Claude Desktop** (via `.claude/commands`)
- **Any MCP-compatible AI** (via vibe daemon)

## 🔧 Installation Options

### Option 1: Automatic Install (Recommended)

```bash
curl -fsSL https://dotvibe.dev/install.sh | sh
```

- ✅ **Easiest** - handles everything automatically
- ✅ **Cross-platform** - works on macOS, Linux, Windows (WSL)
- ✅ **Auto-updates** - keeps you on the latest version

### Option 2: Manual Install

```bash
# Download the latest release
wget https://github.com/vibecorp/vibe/releases/latest/download/vibe-$(uname -s)-$(uname -m)

# Make executable and move to PATH
chmod +x vibe-*
sudo mv vibe-* /usr/local/bin/vibe

# Start the daemon
vibe daemon start
```

### Option 3: From Source (For Contributors)

```bash
git clone https://github.com/vibecorp/vibe.git
cd vibe
deno task build
```

## 🔍 Verify Installation

Check that everything is working:

```bash
# Check daemon status
vibe status

# Expected output:
# ✅ Daemon running (PID: 12345)
# 🌐 MCP server: http://localhost:4242
# 📊 Projects: 0 discovered
# 🧠 Intelligence: Ready
```

## 🚨 Troubleshooting

### Daemon Won't Start

```bash
# Check logs
vibe logs

# Restart daemon  
vibe daemon restart

# Reset if needed
vibe daemon reset
```

### Permission Issues

```bash
# Fix permissions (macOS/Linux)
sudo chown -R $(whoami) ~/.vibe

# Windows (run as administrator)
icacls C:\Users\%USERNAME%\.vibe /grant:r %USERNAME%:F /T
```

### Port Conflicts

```bash
# Check if port 4242 is in use
lsof -i :4242

# Configure different port
vibe config set port 4243
```

## ✅ Ready for Magic

Installation complete! Now let's see the magic in action.

---

**Next:** [First Project →](02-first-project.md) - _Watch your dependencies become superpowers_
