# CLI: `vibe status`

The `vibe status` command provides a quick, local summary of the current project's `.vibe` configuration.

Unlike `vibe daemon status`, which queries the running daemon for system-wide information, this command inspects the local `./.vibe` directory. It's a fast way to see what AI tools have been detected and how many rules are active for the current project.

### Usage

```bash
vibe status
```

Run this command from the root of an initialized `.vibe` project.

### Example Output

Running `vibe status` will produce a report similar to this:

```
📊 .vibe Status Report
━━━━━━━━━━━━━━━━━━━━━━━━━━
📁 Project: my-awesome-project
📍 Path: /Users/keyvan/projects/my-awesome-project

🤖 Detected AI Tools:
   - cursor (Confidence: 100%)
   - claude (Confidence: 80%)

📋 Rules:
   Total: 15

💡 Recommendations:
   - Run `vibe discover` to find rules for your dependencies.
   - Run `vibe daemon` to enable real-time features.
```

This tells you at a glance which AI assistants `.vibe` has found configuration for and the total number of universal rules currently available in your local setup.

**Next:** [CLI Reference: `vibe sync`](./05-sync.md)
