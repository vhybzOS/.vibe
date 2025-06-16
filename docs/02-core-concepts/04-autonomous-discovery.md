# Autonomous Discovery: The Intelligence Engine

The crown jewel of `.vibe`'s intelligence is its **fully autonomous discovery and rule inference engine**.

Most tools rely on manually curated, often outdated, global registries to understand your project's dependencies. We rejected that idea. `.vibe` doesn't need a central database because it thinks for itself.

When the `vibe-daemon` detects a new dependency in your `package.json`, it kicks off a sophisticated, three-tier discovery process to automatically find or generate rules for it.

### The Discovery Flow

The engine intelligently searches for context in a specific order, always preferring the highest-fidelity source available.

1. **Priority 1: Direct Repository Discovery**
   > "Go to the source of truth."

   The first thing `.vibe` does is find the dependency's source code repository (e.g., on GitHub). It then inspects the repo for existing, author-provided AI configurations, such as a `.vibe/` directory or a `.cursorrules` file. If it finds one, it uses those rules directly. This is the gold standard.

2. **Priority 2: `llms.txt` Discovery**
   > "Ask the project for its official guide."

   If no rules are found in the repository, `.vibe` checks the dependency's official homepage for a standardized `llms.txt` file (e.g., `https://react.dev/llms.txt`). This file is an emerging standard for providing LLM-optimized documentation.

3. **Fallback: Autonomous AI Inference**
   > "Reason from first principles."

   If both direct methods fail, `.vibe` doesn't give up. This is where the magic happens.
   - It fetches the dependency's `README.md` and other metadata.
   - It feeds this context into a large language model (like GPT-4o-mini or Claude Haiku).
   - It instructs the LLM to act as an expert developer and generate a set of high-quality `UniversalRule` objects based on the documentation.
   - It validates the AI's JSON output against its internal Zod schema to ensure correctness.

### The Result: Zero-Effort Expertise

This entire process happens automatically in the background. The result is a set of well-structured, context-aware rules that are cached locally in your project at `.vibe/dependencies/<package-name>/<version>/`.

You add a new library to your project, and moments later, your AI assistant understands how to use it, its best practices, and its common patterns—all without you lifting a finger.

This isn't just documentation harvesting; it's **AI-powered project understanding that scales infinitely.**

**Next:** [Guides: Managing Secrets](../03-guides/01-managing-secrets.md)
