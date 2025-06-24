# CLI Reference: Three Commands That Actually Work

> **No complexity, no configuration hell, just tools that solve real problems.**

## Core Commands

### `vibe init`

Set up a project with development protocols.

```bash
vibe init [--force]
```

**What it does:**
- Copies universal template to your project
- Sets up development protocols (TDD, patterns, etc.)
- Creates `.vibe/` directory with queryable structure
- Works with any project type (detects Deno, Node, Python, etc.)

**Options:**
- `--force` - Overwrite existing `.vibe/` directory

**Example:**
```bash
cd my-project
vibe init --force
# ✅ Project initialized with development protocols
```

### `vibe index`

Parse your codebase into queryable patterns.

```bash
vibe index [--path <directory>] [--incremental]
```

**What it does:**
- Uses tree-sitter to parse code structure
- Extracts functions, classes, patterns into SurrealDB
- Makes your entire codebase queryable
- Updates in real-time as you code

**Options:**
- `--path <dir>` - Directory to index (default: current directory)
- `--incremental` - Only index changed files

**Example:**
```bash
vibe index --path src/ --incremental
# ✅ Indexed 247 files, found 3,891 patterns
```

### `vibe query`

Get exactly the code context you need.

```bash
vibe query "<natural language query>" [options]
```

**What it does:**
- Queries your indexed codebase with natural language
- Returns precise code snippets (10 lines vs 1000-line files)
- Ranks results by relevance and context
- Works across multiple files and modules

**Options:**
- `--limit <n>` - Number of results (default: 10)
- `--file <pattern>` - Filter by file pattern
- `--type <type>` - Filter by code type (function, class, etc.)
- `--complexity <level>` - Filter by complexity (low, medium, high)

**Examples:**
```bash
# Find authentication patterns
vibe query "authentication middleware functions"

# Get error handling examples
vibe query "async functions with try-catch blocks" --limit 5

# Search specific module
vibe query "database connection setup" --file "src/db"

# Find complex implementations
vibe query "recursive algorithms" --complexity high
```

## Real-World Usage Patterns

### For Code Discovery
```bash
# Instead of grepping through files
vibe query "JWT token validation"

# Instead of reading entire modules
vibe query "React hooks that use useState"

# Instead of searching docs
vibe query "how to handle API errors"
```

### For AI Context
```bash
# Get precise context for AI chat
vibe query "similar error patterns" --limit 3
# Copy the 15-line result to AI instead of entire 500-line file

# Find implementation examples
vibe query "database transaction patterns"
# Get exact examples from your codebase, not generic tutorials
```

### For Learning Your Own Code
```bash
# Rediscover patterns you forgot
vibe query "caching strategies used in this project"

# Find inconsistencies
vibe query "different approaches to form validation"

# Learn from past decisions
vibe query "performance optimizations"
```

## Exit Codes

- `0` - Success
- `1` - Command failed
- `2` - Invalid arguments
- `3` - Project not initialized (run `vibe init` first)

## Configuration

Configuration is stored in `.vibe/config.json`:

```json
{
  "projectName": "my-project",
  "version": "1.0.0",
  "indexPaths": ["src/", "lib/"],
  "excludePatterns": ["node_modules/", "dist/", "*.test.ts"],
  "queryDefaults": {
    "limit": 10,
    "complexity": "all"
  }
}
```

## Database Location

All indexed data is stored locally in `.vibe/code.db` (SurrealDB format).

- **Portable** - Copy `.vibe/` folder to share project intelligence
- **Local-only** - Nothing goes to the cloud
- **Queryable** - Direct SQL access if you need it

## Troubleshooting

### Command not found
```bash
# Make sure vibe is in your PATH
which vibe

# Or use full path
/usr/local/bin/vibe --help
```

### No results from query
```bash
# Make sure you've indexed your code
vibe index

# Check what's been indexed
vibe query "functions" --limit 1
```

### Permission errors
```bash
# Fix ownership (Linux/macOS)
sudo chown -R $(whoami) .vibe/

# Fix permissions
chmod -R 755 .vibe/
```

---

**Need more help?** Check the [troubleshooting guide](../troubleshooting.md) or [open an issue](https://github.com/vhybzOS/.vibe/issues).