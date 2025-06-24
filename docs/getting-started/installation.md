# Installation Guide

> **Get started with `.vibe` in under 60 seconds**

## Quick Install

```bash
# 1. Install (one-time setup)
curl -fsSL https://dotvibe.dev/install.sh | sh

# 2. Initialize any project
cd your-project
vibe init

# 3. Start using context compression
vibe index --path src/
vibe query "async functions with error handling"
```

## What You Get

After installation, you'll have:

- **`vibe` CLI** - Core commands for context management
- **Universal template** - Works with any project type (Deno, Node, Python, etc.)
- **Context compression** - Get precise code snippets instead of full files
- **Tree-sitter integration** - Real-time AST parsing and indexing

## Installation Options

### Option 1: Automatic Install (Recommended)

```bash
curl -fsSL https://dotvibe.dev/install.sh | sh
```

This installs the latest stable release and handles all platform-specific setup.

### Option 2: Manual Install

Download the latest release for your platform:

```bash
# Linux
wget https://github.com/vhybzOS/.vibe/releases/latest/download/vibe-linux-x86_64
chmod +x vibe-linux-x86_64
sudo mv vibe-linux-x86_64 /usr/local/bin/vibe

# macOS
wget https://github.com/vhybzOS/.vibe/releases/latest/download/vibe-macos-x86_64
chmod +x vibe-macos-x86_64
sudo mv vibe-macos-x86_64 /usr/local/bin/vibe

# Windows (in PowerShell)
Invoke-WebRequest -Uri "https://github.com/vhybzOS/.vibe/releases/latest/download/vibe-windows-x86_64.exe" -OutFile "vibe.exe"
# Move to a directory in your PATH
```

### Option 3: Build from Source

```bash
git clone https://github.com/vhybzOS/.vibe.git
cd .vibe
deno task build
```

## Verify Installation

Check that everything is working:

```bash
vibe --help
```

You should see the help output with available commands.

## First Project Setup

Transform your first project:

```bash
cd your-project
vibe init
```

This creates a `.vibe/` directory with:
- **Protocols** - Development patterns and workflows
- **Configuration** - Project-specific settings
- **Algorithms** - Executable pseudo-code for development processes

## Requirements

- **Deno** - For the CLI runtime (automatically installed if missing)
- **Tree-sitter CLI** - For code parsing (optional, enhances functionality)
- **SurrealDB** - For context storage (optional, enables advanced features)

## Troubleshooting

### Permission Issues

```bash
# Linux/macOS
sudo chown -R $(whoami) ~/.vibe

# Windows (run as administrator)
icacls %USERPROFILE%\.vibe /grant:r %USERNAME%:F /T
```

### Command Not Found

Make sure the installation directory is in your PATH:

```bash
# Add to ~/.bashrc or ~/.zshrc
export PATH="$PATH:/usr/local/bin"
```

### Deno Issues

If you encounter Deno-related errors:

```bash
# Install Deno manually
curl -fsSL https://deno.land/install.sh | sh

# Or use package managers
# macOS: brew install deno
# Windows: choco install deno
```

## Next Steps

Once installed, check out:

- **[Core Concepts](../core-concepts/context-compression.md)** - Understanding how `.vibe` works
- **[CLI Reference](../cli-reference/commands.md)** - Complete command documentation
- **[First Project](first-project.md)** - Walk through your first `.vibe` project

---

**Having issues?** [Open an issue](https://github.com/vhybzOS/.vibe/issues) or check our [troubleshooting guide](troubleshooting.md).