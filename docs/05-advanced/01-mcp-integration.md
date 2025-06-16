# Advanced: MCP Integration

A core part of the `.vibe` architecture is its use of the **Model Context Protocol (MCP)**. This is the secret weapon that allows `.vibe` to integrate seamlessly with a growing number of AI coding assistants without needing a separate plugin for each one.

### What is MCP?

MCP is an open standard designed to be a universal language for communication between developer tools and AI models. It defines a standard way for an AI assistant to request and receive context—like project rules, file contents, and dependency information—from an external source.

You can think of it as a universal API for AI context.

### How `.vibe` Uses MCP

The `vibe-daemon` runs an MCP-compliant server. Instead of pointing your AI tools (like Cursor or Claude Code) to individual config files, you point them to the single `.vibe` MCP server.

Here's the integration dance:

1.  **Your AI Tool asks:** "Hey MCP server, I'm working on `/path/to/project/file.ts`. What context should I know about?"
2.  **The `vibe-daemon` responds:** "Here are the project's universal rules, relevant documentation for the dependencies in this file, and recent architectural decisions from the project diary."
3.  **Your AI Tool asks:** "The user just made a decision about using a new library. Should I remember this?"
4.  **The `vibe-daemon` responds:** "Absolutely." It then captures the decision, structures it, and saves it to the project's diary for future reference.

### Why This is Brilliant

-   **One Integration to Rule Them All:** We don't need to build and maintain a dozen different plugins. We build one great MCP server, and any MCP-compatible tool can instantly benefit from it.
-   **Real-time Context:** The context provided to your AI is always live and up-to-date, because it's being served directly from the daemon that is actively monitoring your project.
-   **Extensible:** As new tools adopt MCP, they will automatically work with `.vibe` with zero additional effort.

This architecture ensures `.vibe` is not just another configuration tool, but a true, central brain for your entire AI development workflow.

**Next:** [Advanced: Contributing](./02-contributing.md)
