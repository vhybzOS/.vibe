# Installation

`.vibe` is built with Deno, but you don't need to be a Deno expert to use it. We provide pre-compiled binaries for all major operating systems. The easiest way to get started is with our installer script.

### The Easy Way (Recommended)

This command will detect your OS and architecture, download the latest release from GitHub, and place the `vibe` and `vibe-daemon` executables in the right system path for you.

```bash
# Run this in your terminal
curl -fsSL https://vibe.sh/install.sh | sh
```

This will install `.vibe` into `~/.vibe/bin`. You may need to add this directory to your shell's `PATH`. The script will provide the exact command you need to run to do this.

After installation, open a new terminal and verify it works:

```bash
vibe --version
vibe-daemon --version
```

### Manual Installation

If you prefer not to use a script, you can download the latest binaries directly from our [GitHub Releases page](https://github.com/vhybzos/.vibe/releases/latest).

1. Download the appropriate `.zip` file for your operating system (e.g., `vibe-macos-aarch64.zip`).
2. Unzip the file.
3. Move the `vibe` and `vibe-daemon` executables to a directory in your system's `PATH`, such as `/usr/local/bin` on macOS/Linux or a custom tools folder on Windows.

### Installing as a System Service (Optional)

For the best experience, you can set up `vibe-daemon` to run automatically on system startup.

**Linux (systemd):**

```bash
# This assumes vibe-daemon is in your PATH
systemctl --user enable vibe-daemon.service
systemctl --user start vibe-daemon.service
```

**macOS (launchd):**

```bash
# This assumes vibe-daemon is in your PATH
vibe daemon install # This will generate and load the correct launchd plist
```

**Windows (Task Scheduler):**

```powershell
# Run this in an Administrator PowerShell
schtasks /create /tn "VibeDaemon" /tr "vibe-daemon.exe" /sc onstart /ru System
```

With `.vibe` installed, you're ready to initialize your first project.

**Next:** [Quick Start](./03-quick-start.md)
