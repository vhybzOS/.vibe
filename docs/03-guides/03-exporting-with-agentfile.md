# Guides: Exporting with AgentFile

`.vibe` is built on the principle of data ownership and portability. While our primary format uses simple JSON and Markdown files, we also support exporting your project's entire AI context to the emerging **AgentFile (`.af`)** open standard.

### What is AgentFile?

[AgentFile](https://agentfile.org/) is an open standard for packaging the state and memory of an AI agent into a single, portable file. Think of it like a `.zip` file for your AI's brain. It allows you to move your agent's knowledge, rules, and history between different tools and platforms that support the standard.

Our commitment to this standard ensures that your `.vibe` configuration is never locked into our ecosystem.

### How to Export

The `vibe export` command gathers all the rules, discovered dependency information, and (soon) memory and diary entries for a project and compiles them into a single `.vibe.af` file.

**Usage:**

Run the command from the root of your initialized `.vibe` project.

```bash
# Export the entire project context to the default file (.vibe.af)
vibe export

# Specify a different output file
vibe export --output my-project-context.af

# Export only the rules
vibe export --format rules-only
```

### Why is this useful?

-   **Portability:** Move your entire AI context to another machine or share it with a team member who also uses `.vibe` or another AgentFile-compatible tool.
-   **Backup:** Create a single-file snapshot of your project's entire AI configuration.
-   **Interoperability:** As the AgentFile ecosystem grows, you'll be able to import your `.vibe` context into other intelligent developer tools.

This feature is a core part of our philosophy: your data is yours, and you should be able to take it anywhere.

**Next:** [CLI Reference: `vibe init`](../04-cli-reference/01-init.md)
