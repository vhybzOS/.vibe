# Universal Rules: Configure Once, Run Everywhere

The heart of `.vibe` is the **Universal Rule**: a single, expressive JSON format designed to be the Rosetta Stone for all AI coding assistants.

### The Problem: Configuration Hell

Every AI tool has its own proprietary format for rules and context:

- `.cursorrules`
- `.windsurfrules`
- `.claude/commands`
- `copilot-instructions.md`

This fragmentation means you're constantly repeating yourself, and your project's "brain" is scattered across a dozen different files. It's unmanageable.

### The Solution: One Format to Rule Them All

With `.vibe`, you define a rule once in the `UniversalRule` format, and our system handles the rest. The `vibe-daemon` automatically compiles and syncs these universal rules into the specific formats required by each tool it detects in your project.

Change a rule in `.vibe`, and your `.cursorrules` and Claude Code commands are instantly updated. It's bidirectional, too—if you edit a tool's config file directly, `.vibe` can often import those changes back into the universal format.

### Anatomy of a Universal Rule

A Universal Rule is just a JSON object with a clear, powerful structure. Here's a simplified look at the key parts:

```json
{
  "id": "uuid-for-this-rule",
  "metadata": {
    "name": "Use Effect-TS for Error Handling",
    "description": "A best-practice guide for using Effect-TS to manage errors functionally.",
    "source": "manual"
  },
  "targeting": {
    "languages": ["typescript"],
    "dependencies": ["effect"]
  },
  "content": {
    "markdown": "# Error Handling with Effect-TS\n\nAlways prefer `Effect.either` or `Effect.catch` over traditional try/catch blocks to handle errors as part of the control flow...",
    "examples": [
      {
        "code": "pipe(myEffect, Effect.catchAll(error => Effect.succeed(handleError(error))))",
        "language": "typescript",
        "description": "A safe way to handle a failing Effect."
      }
    ],
    "tags": ["error-handling", "functional", "effect-ts"]
  },
  "application": {
    "mode": "always"
  }
}
```

- **`metadata`**: What the rule is and where it came from.
- **`targeting`**: When the rule should apply (e.g., only in TypeScript files when the `effect` package is a dependency).
- **`content`**: The actual guidance for the AI, written in rich Markdown with code examples.
- **`application`**: How the rule should be applied (e.g., `always` injected into the context, or `manual` for a user-triggered command).

This structure allows for incredibly rich, context-aware AI assistance that is portable across your entire toolchain.

**Next:** [Autonomous Discovery: The Intelligence Engine](./04-autonomous-discovery.md)
