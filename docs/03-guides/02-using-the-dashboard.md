# Guides: Using the Dashboard

> **Note:** The web-based dashboard is currently under active development as part of Phase 2 and 3 of our grand plan. This page will be updated as features are released.

The `vibe-daemon` runs a powerful server on `http://localhost:4242` that will soon host a complete, interactive web dashboard for managing your `.vibe` projects.

### The Vision: Your Mission Control Center

The dashboard is designed to be your central hub for observing and interacting with the `.vibe` autonomous engine. It turns the powerful but invisible background processes into a tangible, visual experience.

Planned features include:

-   **📊 Live Activity Feed:** Watch in real-time as the daemon discovers dependencies, analyzes repositories, and infers rules. See a live stream of events from the `/api/events` endpoint.
-   **⚙️ Secrets Management:** A secure, user-friendly interface for adding and managing your project-level and global API keys. No more `curl` required!
-   **🔍 Dependency Overview:** See a list of all your project's dependencies and their current rule status ("Discovered," "Inferred," "Pending").
-   **🤖 Rule Curation:** Browse through the rules `.vibe` has discovered or generated for your dependencies. With a single click, "promote" a rule to activate it for your project, copying it into your active ruleset.

The dashboard will be built using **Fresh** and **Tailwind CSS**, providing a modern, responsive, and fast interface served directly from the same daemon you already have running.

Stay tuned. This is where the full power of `.vibe` will come to life.

**Next:** [Exporting with AgentFile](./03-exporting-with-agentfile.md)
