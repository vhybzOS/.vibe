# CLI: `vibe sync`

The `vibe sync` command is the bridge between your universal `.vibe` rules and the specific configuration files your AI tools actually read.

While the `vibe-daemon` handles synchronization automatically when it detects file changes, this command allows you to trigger the process manually.

### Usage

```bash
vibe sync [options]
```

Run this command from the root of an initialized `.vibe` project.

### What it Does

The `sync` command performs the following steps:

1.  **Loads Universal Rules:** It reads all the rules from your `./.vibe/rules/` directory.
2.  **Detects AI Tools:** It scans your project to see which AI tools (like Cursor, Claude Code, etc.) are configured.
3.  **Compiles and Writes:** For each detected tool, it compiles the universal rules into that tool's native format (e.g., Markdown for `.cursorrules`) and overwrites the corresponding configuration file.

This ensures that all your tools are always working from the same set of instructions, derived from your single source of truth in `.vibe`.

### Options

| Option      | Description                                          |
|-------------|------------------------------------------------------|
| `--dry-run` | Shows what would be synced without writing any files. Useful for previewing changes. |
| `-f`, `--force` | Forces the sync even if `.vibe` detects potential conflicts. |

**Next:** [Advanced: MCP Integration](../05-advanced/01-mcp-integration.md)
