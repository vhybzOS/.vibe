# CLI: `vibe daemon`

The `vibe daemon` command group is used to manage the lifecycle of the persistent `.vibe` background process. For the best experience, you should have the daemon running at all times.

While you can run the `vibe-daemon` executable directly, these commands provide a convenient way to interact with an already-running process.

### Commands

#### `vibe daemon start`
Starts the `vibe-daemon` process in the background. If the daemon is already running, this command will report it.

**Usage:**
```bash
vibe daemon start
```

---

#### `vibe daemon stop`
Gracefully stops the running `vibe-daemon` process.

**Usage:**
```bash
vibe daemon stop
```

---

#### `vibe daemon restart`
Stops the current daemon process and immediately starts a new one. This is useful for applying configuration changes.

**Usage:**
```bash
vibe daemon restart
```

---

#### `vibe daemon status`
Connects to the running daemon and prints a detailed status report, including:
-   Daemon health, PID, and uptime.
-   A list of all projects currently being monitored.
-   The status of the MCP server.

**Usage:**
```bash
vibe daemon status
```

**Next:** [CLI Reference: `vibe discover`](./03-discover.md)
