# Core Concepts: The `.vibe` Philosophy

To understand `.vibe`, you need to understand its core beliefs. This isn't just another dev tool; it's a statement about how AI-assisted development _should_ work.

### 1. Functional, Not Object-Oriented

> Because composition beats inheritance, every time.

We went all-in on functional programming with Effect-TS. You will find **no custom classes** for business logic in this codebase. Why?

- **Composition is King:** Pure functions compose beautifully. No more tangled inheritance chains or fragile base classes.
- **Immutability is Sanity:** We don't mutate state; we transform data. This eliminates a whole class of "who changed what?" bugs.
- **Errors are Data:** No more `try...catch` spaghetti. Errors are first-class citizens in our system, handled safely and explicitly with tagged unions.

This isn't academic purism; it's pragmatic engineering. It leads to a codebase that is easier to reason about, easier to test, and profoundly more resilient.

### 2. Local-First, Always

> Your data, your machine, your rules.

Your `.vibe` configuration, your AI's memory, and your architectural decisions are your intellectual property. They should never be held hostage by a cloud service.

- **No Cloud Dependencies:** `.vibe` runs entirely on your local machine. It works offline. It's fast because it's local.
- **You Own Your Data:** Everything is stored in plain text files (`.json`, `.md`) in your project's `.vibe/` directory. You can `git commit` it, `rsync` it, or `grep` it. It's yours.
- **Privacy by Design:** Because your data never leaves your machine, there are no privacy trade-offs.

The cloud is for collaboration and backup, not for control.

### 3. Asynchronous by Default, Synchronous When Necessary

> Let the daemon do the work.

Modern development is full of asynchronous tasks: watching files, fetching metadata, running AI inference. The `.vibe` CLI embraces this reality.

- **The CLI is a Thin Client:** When you run a command like `vibe init` or `vibe discover`, the CLI simply sends a request to the long-running `vibe-daemon` and exits. It doesn't block your terminal.
- **The Daemon is the Workhorse:** The persistent daemon handles the heavy lifting in the background, providing real-time updates through its API and event stream.
- **Immediate Feedback:** This architecture gives you the speed of a lightweight CLI with the power of a persistent background service.

This is how modern developer tools should be built: fast, non-blocking, and powerful.

---

With these principles in mind, let's explore the first major component of the architecture.

**Next:** [The Daemon: A Sleepless Assistant](./02-the-daemon.md)
