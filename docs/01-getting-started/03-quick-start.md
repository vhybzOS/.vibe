# Quick Start: Your First Vibe

You've installed `.vibe`. Now, let's see the magic. This guide will take you from a standard project to having AI-generated coding rules in about three minutes.

### Step 1: Create a Project

If you don't have a project handy, let's create a simple one.

```bash
mkdir my-first-vibe && cd my-first-vibe

# Create a package.json with some common dependencies
cat << EOF > package.json
{
  "name": "my-first-vibe",
  "dependencies": {
    "react": "latest",
    "zod": "latest"
  }
}
EOF
```

### Step 2: Start the Daemon

The `vibe-daemon` is the autonomous engine that works in the background. Open a **new terminal window** and run it.

```bash
vibe-daemon
```

You'll see it start up and begin listening for tasks. Keep this terminal open to watch it work.

### Step 3: Initialize `.vibe`

Now, go back to your **project terminal** and initialize `.vibe`.

```bash
# This command bootstraps your project and kicks off discovery.
vibe init
```

Watch the output. You'll see `.vibe` create its directory structure. If you have an `.env` file with an `OPENAI_API_KEY`, it will automatically and securely set it up for this project.

Most importantly, you'll see this message:
`🔍 Starting automatic background discovery of dependencies...`

### Step 4: Watch the Magic Happen

Switch back to your **daemon terminal**. You'll see a flurry of activity. This is the autonomous engine in action:

- `🚀 Starting discovery for /path/to/my-first-vibe`
- It will find `react` and `zod`.
- It will check GitHub for existing rules.
- It will check homepages for `llms.txt`.
- Finally, it will fall back to **AI Inference**, feeding the library's `README` to an LLM to generate rules from scratch.
- `✅ Discovery completed for /path/to/my-first-vibe`

### Step 5: See the Results

The discovery is done. The rules are generated and cached locally in your project. Let's look at them.

In your **project terminal**, inspect the cached files for `zod`:

```bash
# The version may differ slightly
ls .vibe/dependencies/zod/latest/
```

You should see `discovery-results.json`, `metadata.json`, and `cached-at.txt`. This is the proof.

Now, view the AI-generated rules:

```bash
# Use `cat` or `less` to view the file. `jq` is great for pretty-printing.
cat .vibe/dependencies/zod/latest/discovery-results.json | jq
```

You are now looking at high-quality `UniversalRule` objects, complete with descriptions and code examples, generated entirely by the autonomous engine.

You just gave your AI assistant a deep, nuanced understanding of your project's dependencies without writing a single line of configuration.

That's the power of `.vibe`.

**Next:** [Core Concepts: The `.vibe` Philosophy](../02-core-concepts/01-the-vibe-philosophy.md)
