# .vibe Installation Architecture

## Self-Contained Installers (Primary)

**Build**: `deno task build:installers`
**Output**: `build/install-dotvibe`, `build/install-dotvibe.exe`

### Components

- `installers/install-dotvibe.ts` - Unix installer (Linux/macOS)
- `installers/install-dotvibe-windows.ts` - Windows installer
- `installers/embedded/` - All binaries + scripts embedded in compiled installers
- `scripts/build-cross-platform.ts` - Builds binaries for all platforms

### Features

- Zero network dependency
- Platform auto-detection
- Current User vs System-wide scope selection
- OS native uninstall registration

## Legacy Scripts (Fallback)

**Files**: `install.sh`, `install.ps1`, `uninstall.sh`, `uninstall.ps1`
**Mode**: Developer (builds from source) or User (downloads from GitHub)

### Functions

- `detect_platform()` - Linux/macOS detection
- `check_source()` - Developer vs User mode
- `get_latest_version()` - GitHub API release fetching
- `setup_service()` - systemd/launchd/Windows Service

## OS Integration

**Windows**: `installers/os-integration/windows-registry.ts`

- `registerWithAddRemovePrograms()` - Add/Remove Programs entry
- `createUninstallerWrapper()` - Batch file wrapper

**macOS**: `installers/os-integration/macos-package.ts`

- `createUninstallerApp()` - Native app bundle
- `createPackageReceipt()` - Receipt tracking

**Linux**: `installers/os-integration/linux-desktop.ts`

- `createUninstallerDesktopEntry()` - .desktop entry
- `createGUIUninstaller()` - zenity/kdialog support

## Build Workflow

1. `build:cross-platform` → `installers/embedded/binaries/`
2. `build:installer-unix` → `build/install-dotvibe`
3. `build:installer-windows` → `build/install-dotvibe.exe`

## Installation Paths

**Current User**:

- Unix: `~/.local/share/dotvibe`, `~/.local/bin`
- Windows: `%LOCALAPPDATA%\dotvibe`

**System-wide**:

- Unix: `/usr/local/share/dotvibe`, `/usr/local/bin`
- Windows: `%PROGRAMFILES%\dotvibe`

## Services

**Linux**: systemd (user: `~/.config/systemd/user`, system: `/etc/systemd/system`)
**macOS**: launchd (user: `~/Library/LaunchAgents`, system: `/Library/LaunchDaemons`)
**Windows**: Windows Service (system-wide only)
