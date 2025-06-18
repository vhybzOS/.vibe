# CLI: `vibe init`

The `vibe init` command is the first step to making your project intelligent. It bootstraps the `.vibe` directory and triggers the initial autonomous discovery process.

### Usage

```bash
vibe init [options]
```

Run this command in the root directory of your project.

### What it Does

1. **Creates the `.vibe` Directory:** It generates the `./.vibe/` directory and its subdirectories (`/rules`, `/dependencies`, `/memory`, etc.) where all configuration and cached data will be stored.
2. **Bootstraps Secrets:** If a `.env` file exists in your project root, it securely imports any standard API keys (like `OPENAI_API_KEY` or `GITHUB_TOKEN`) into an encrypted, project-level `.vibe/secrets.json` file.
3. **Triggers Background Discovery:** It sends a non-blocking request to the `vibe-daemon` to immediately start the autonomous discovery process for your project's dependencies.

The command will not overwrite an existing `.vibe` directory unless the `--force` option is used.

### Options

| Option          | Description                                               |
| --------------- | --------------------------------------------------------- |
| `-f`, `--force` | Overwrites an existing `.vibe` directory if one is found. |

**Next:** [CLI Reference: `vibe daemon`](./02-daemon.md)
