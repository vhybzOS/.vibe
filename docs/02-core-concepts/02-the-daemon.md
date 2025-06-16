# The Daemon: A Sleepless Assistant

Here's the secret sauce that makes `.vibe` magical: instead of CLI tools that run and die, `.vibe` runs a **persistent background daemon**.

Think of it like a personal assistant for your AI assistant—one that never sleeps, never forgets, and works tirelessly behind the scenes to keep your development environment intelligent and in sync.

### Why a Daemon?

Because modern development is a mess of different environments. You code on your Mac, then switch to a Windows machine with WSL2, then maybe jump into a cloud dev environment. A traditional CLI tool can't follow you.

The `vibe-daemon` solves this. It's a single, unified server that runs on your machine and acts as the central brain for all your projects.

### What it Does

The daemon is a small but mighty HTTP server that runs on `http://localhost:4242` and is responsible for everything that makes `.vibe` smart:

- **🔍 Autonomous Project Discovery:** It constantly scans your system for `.vibe`-enabled projects, so it always knows what you're working on.
- **🔄 Real-Time File Watching:** The moment you change a `package.json` or a tool-specific config file, the daemon sees it and springs into action.
- **🧠 The Intelligence Engine:** All the heavy lifting—fetching metadata, checking GitHub, and running AI inference—is handled by the daemon in the background, so your terminal is never blocked.
- **📡 A Single, Unified API:** The daemon serves a clean API for the future `.vibe` Dashboard, and a Server-Sent Events (SSE) stream at `/api/events` for real-time progress updates.

### The Payoff: True Cross-Platform Magic

This is where it all comes together.

1. Start coding in Claude Code on your WSL2 setup. The daemon, running in the background, captures your context.
2. Push your code to git.
3. Pull the repo on your Windows machine and open it in Cursor.

**Your AI assistant instantly has all the same context.** It remembers the rules, the dependencies, and the decisions. It's like having a photographic memory that syncs across dimensions. That's the power of the daemon.

**Next:** [Universal Rules: Configure Once, Run Everywhere](./03-universal-rules.md)
