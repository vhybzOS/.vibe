# Guides: Managing Secrets

To unlock its most powerful autonomous features, `.vibe` needs access to API keys for services like GitHub and AI model providers. Our secrets management system is designed to be both flexible and secure, supporting keys on a per-project basis with a global fallback.

### How it Works: Project vs. Global Secrets

`.vibe` uses a two-tiered system for secrets, giving you precise control over which keys are used for which project.

1. **Project Secrets (Primary):**
   - **Location:** `[your-project]/.vibe/secrets.json` (encrypted)
   - **Use Case:** Storing keys specific to a single project. Perfect for when your work project uses a different set of keys than your personal hobby project.
   - **Priority:** **Always used first.** If a project-level secret exists, it will be used for all operations within that project.

2. **Global Secrets (Fallback):**
   - **Location:** `~/.config/vibe/secrets.json` (encrypted)
   - **Use Case:** A convenient fallback for keys you use across all projects.
   - **Priority:** Only used if a corresponding project-level secret is not found.

All `secrets.json` files are **always encrypted at rest** on your local machine using a key derived from your user and machine identifiers.

### Bootstrapping Secrets with `.env`

The easiest way to get started is to let `.vibe` bootstrap your secrets for you.

When you run `vibe init` in a project, it will automatically look for a `.env` file in your project's root directory. If it finds any of the following standard environment variable names, it will securely copy them into your project's local, encrypted `./.vibe/secrets.json` file.

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GOOGLE_API_KEY`
- `COHERE_API_KEY`
- `GITHUB_TOKEN`

This is a one-time operation on `init` to make setup frictionless.

### Setting Secrets Manually

You have full control over your secrets via the daemon's API (and soon, the dashboard). You can use `curl` to set, update, or clear secrets.

**Set a Project-Specific Secret:**

Provide the `apiKey` and the full `projectPath`.

```bash
curl -X POST http://localhost:4242/api/secrets \
  -H "Content-Type: application/json" \
  -d '{
        "apiKey": "YOUR_API_KEY_HERE",
        "projectPath": "/path/to/your/project"
      }'
```

`.vibe` will automatically infer the provider (OpenAI, Anthropic, etc.) from the key's format.

**Set a Global Fallback Secret:**

Omit the `projectPath`. The key will be saved to the global store.

```bash
curl -X POST http://localhost:4242/api/secrets \
  -H "Content-Type: application/json" \
  -d '{
        "apiKey": "YOUR_GLOBAL_API_KEY_HERE"
      }'
```

**Why is a GitHub Token Needed?**
While not mandatory, providing a GitHub token is highly recommended. Authenticated requests have a much higher rate limit (5,000/hr vs 60/hr), which is essential for the Autonomous Discovery engine to inspect dependency repositories without being blocked.

**Next:** [Using the Dashboard (Coming Soon)](./02-using-the-dashboard.md)
