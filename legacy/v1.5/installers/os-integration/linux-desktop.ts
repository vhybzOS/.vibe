/**
 * Linux Desktop Integration for .vibe Installer
 *
 * Handles Linux desktop environment integration including .desktop entries,
 * XDG standard compliance, and integration with GUI package managers.
 *
 * @tested_by tests/unit/linux-desktop.test.ts (Desktop integration)
 */

import { join } from '@std/path'

export interface LinuxUninstallInfo {
  appName: string
  version: string
  installLocation: string
  uninstallScript: string
  description?: string
  categories?: string[]
}

export type LinuxScope = 'CurrentUser' | 'AllUsers'

/**
 * Creates a desktop entry for the uninstaller following XDG standards
 */
export async function createUninstallerDesktopEntry(
  scope: LinuxScope,
  uninstallInfo: LinuxUninstallInfo,
): Promise<string> {
  const desktopDir = scope === 'CurrentUser'
    ? join(Deno.env.get('HOME')!, '.local', 'share', 'applications')
    : '/usr/share/applications'

  await ensureDirectory(desktopDir)

  const desktopEntry = `[Desktop Entry]
Name=Uninstall ${uninstallInfo.appName}
Comment=${uninstallInfo.description || `Remove ${uninstallInfo.appName} from your system`}
Exec=${uninstallInfo.uninstallScript}
Icon=application-x-executable
Terminal=true
Type=Application
Categories=${(uninstallInfo.categories || ['System', 'Settings']).join(';')};
StartupNotify=false
NoDisplay=false
Keywords=uninstall;remove;${uninstallInfo.appName.toLowerCase()};
`

  const desktopPath = join(desktopDir, 'uninstall-dotvibe.desktop')
  await Deno.writeTextFile(desktopPath, desktopEntry)
  await Deno.chmod(desktopPath, 0o755)

  return desktopPath
}

/**
 * Creates a GUI uninstaller script with zenity/kdialog support
 */
export async function createGUIUninstaller(
  uninstallInfo: LinuxUninstallInfo,
): Promise<string> {
  const guiUninstallerPath = join(uninstallInfo.installLocation, 'uninstall-gui.sh')

  const guiScript = `#!/bin/bash
set -e

APP_NAME="${uninstallInfo.appName}"
UNINSTALL_SCRIPT="${uninstallInfo.uninstallScript}"

# Function to show GUI dialogs
show_dialog() {
    local type="$1"
    local title="$2"
    local message="$3"
    
    if command -v zenity &>/dev/null; then
        case "$type" in
            "question")
                zenity --question --title="$title" --text="$message"
                ;;
            "info")
                zenity --info --title="$title" --text="$message"
                ;;
            "error")
                zenity --error --title="$title" --text="$message"
                ;;
        esac
    elif command -v kdialog &>/dev/null; then
        case "$type" in
            "question")
                kdialog --title "$title" --yesno "$message"
                ;;
            "info")
                kdialog --title "$title" --msgbox "$message"
                ;;
            "error")
                kdialog --title "$title" --error "$message"
                ;;
        esac
    elif command -v notify-send &>/dev/null; then
        # Fallback to notifications
        notify-send "$title" "$message"
        return 0
    else
        # Fallback to terminal
        echo "$title: $message"
        if [[ "$type" == "question" ]]; then
            read -p "Continue? (y/N) " -n 1 -r
            echo
            [[ $REPLY =~ ^[Yy]$ ]]
        fi
        return 0
    fi
}

# Main uninstall process
main() {
    # Check if uninstall script exists
    if [[ ! -f "$UNINSTALL_SCRIPT" ]]; then
        show_dialog "error" "Uninstall Error" "Uninstall script not found at $UNINSTALL_SCRIPT"
        exit 1
    fi
    
    # Confirm uninstall
    if show_dialog "question" "Uninstall $APP_NAME" "Are you sure you want to remove $APP_NAME from your system?\\n\\nThis action cannot be undone."; then
        # Check if we need sudo
        if [[ "$UNINSTALL_SCRIPT" == *"/usr/"* ]] && [[ $EUID -ne 0 ]]; then
            # Need sudo for system-wide uninstall
            if command -v pkexec &>/dev/null; then
                # Use pkexec for GUI sudo
                pkexec bash "$UNINSTALL_SCRIPT"
            elif command -v gksudo &>/dev/null; then
                gksudo "bash '$UNINSTALL_SCRIPT'"
            elif command -v kdesudo &>/dev/null; then
                kdesudo "bash '$UNINSTALL_SCRIPT'"
            else
                # Fallback to terminal sudo
                if command -v gnome-terminal &>/dev/null; then
                    gnome-terminal -- bash -c "sudo bash '$UNINSTALL_SCRIPT'; read -p 'Press Enter to close...'"
                elif command -v konsole &>/dev/null; then
                    konsole -e bash -c "sudo bash '$UNINSTALL_SCRIPT'; read -p 'Press Enter to close...'"
                elif command -v xterm &>/dev/null; then
                    xterm -e "sudo bash '$UNINSTALL_SCRIPT'; read -p 'Press Enter to close...'"
                else
                    show_dialog "error" "Permission Error" "Unable to run uninstaller with elevated privileges. Please run the following command in a terminal:\\n\\nsudo bash $UNINSTALL_SCRIPT"
                    exit 1
                fi
            fi
        else
            # Run directly (user-level install or already root)
            bash "$UNINSTALL_SCRIPT"
        fi
        
        # Check if uninstall was successful
        if [[ $? -eq 0 ]]; then
            show_dialog "info" "Uninstall Complete" "$APP_NAME has been successfully removed from your system."
        else
            show_dialog "error" "Uninstall Failed" "There was an error removing $APP_NAME. Please check the terminal output for details."
        fi
    else
        # User cancelled
        exit 0
    fi
}

main "$@"
`

  await Deno.writeTextFile(guiUninstallerPath, guiScript)
  await Deno.chmod(guiUninstallerPath, 0o755)

  return guiUninstallerPath
}

/**
 * Registers with package manager databases (where possible)
 */
export async function registerWithPackageManager(
  uninstallInfo: LinuxUninstallInfo,
  scope: LinuxScope,
): Promise<boolean> {
  // Try to register with dpkg (Debian/Ubuntu systems)
  const success = await registerWithDpkg(uninstallInfo, scope)

  if (!success) {
    // Could add support for RPM, pacman, etc. in the future
    console.log('Package manager registration not available on this system')
  }

  return success
}

/**
 * Registers with dpkg database for Debian-based systems
 */
async function registerWithDpkg(
  uninstallInfo: LinuxUninstallInfo,
  scope: LinuxScope,
): Promise<boolean> {
  // Only register system-wide installations with dpkg
  if (scope !== 'AllUsers') {
    return false
  }

  try {
    // Check if dpkg is available
    const dpkgCheck = await new Deno.Command('which', { args: ['dpkg'] }).output()
    if (!dpkgCheck.success) {
      return false
    }

    const statusDir = '/var/lib/dpkg'
    const statusFile = join(statusDir, 'status')

    // Create a minimal dpkg status entry
    const packageName = 'dotvibe'
    const statusEntry = `
Package: ${packageName}
Status: install ok installed
Priority: optional
Section: utils
Installed-Size: 1024
Maintainer: vhybzOS <support@dotvibe.dev>
Architecture: amd64
Version: ${uninstallInfo.version}
Description: ${uninstallInfo.description || 'Universal Developer Tool Orchestrator'}
 Transform every dependency in your project into instantly-available tools
 across all AI environments.
Homepage: https://dotvibe.dev

`

    // Append to dpkg status file (requires root)
    await Deno.writeTextFile('/tmp/dotvibe-dpkg-entry', statusEntry)

    const result = await new Deno.Command('bash', {
      args: ['-c', `cat /tmp/dotvibe-dpkg-entry >> "${statusFile}" && rm /tmp/dotvibe-dpkg-entry`],
      stdout: 'piped',
      stderr: 'piped',
    }).output()

    return result.success
  } catch {
    return false
  }
}

/**
 * Creates XDG autostart entry for daemon (if requested)
 */
export async function createAutostartEntry(
  scope: LinuxScope,
  executablePath: string,
): Promise<string | null> {
  const autostartDir = scope === 'CurrentUser'
    ? join(Deno.env.get('HOME')!, '.config', 'autostart')
    : '/etc/xdg/autostart'

  try {
    await ensureDirectory(autostartDir)

    const autostartEntry = `[Desktop Entry]
Type=Application
Name=.vibe Daemon
Comment=Development workflow automation daemon
Exec=${executablePath}
Terminal=false
NoDisplay=true
StartupNotify=false
X-GNOME-Autostart-enabled=true
X-KDE-autostart-after=panel
X-MATE-Autostart-enabled=true
`

    const autostartPath = join(autostartDir, 'dotvibe-daemon.desktop')
    await Deno.writeTextFile(autostartPath, autostartEntry)

    return autostartPath
  } catch {
    return null
  }
}

/**
 * Creates a menu entry for the main application
 */
export async function createApplicationMenuEntry(
  scope: LinuxScope,
  executablePath: string,
  uninstallInfo: LinuxUninstallInfo,
): Promise<string> {
  const desktopDir = scope === 'CurrentUser'
    ? join(Deno.env.get('HOME')!, '.local', 'share', 'applications')
    : '/usr/share/applications'

  await ensureDirectory(desktopDir)

  const desktopEntry = `[Desktop Entry]
Name=${uninstallInfo.appName}
Comment=${uninstallInfo.description || 'Universal Developer Tool Orchestrator'}
Exec=${executablePath} --help
Icon=application-x-executable
Terminal=true
Type=Application
Categories=Development;ConsoleOnly;
Keywords=developer;tools;vibe;
`

  const desktopPath = join(desktopDir, 'dotvibe.desktop')
  await Deno.writeTextFile(desktopPath, desktopEntry)
  await Deno.chmod(desktopPath, 0o755)

  return desktopPath
}

/**
 * Removes all desktop integration files during uninstall
 */
export async function removeDesktopIntegration(scope: LinuxScope): Promise<void> {
  const desktopDir = scope === 'CurrentUser'
    ? join(Deno.env.get('HOME')!, '.local', 'share', 'applications')
    : '/usr/share/applications'

  const autostartDir = scope === 'CurrentUser'
    ? join(Deno.env.get('HOME')!, '.config', 'autostart')
    : '/etc/xdg/autostart'

  const filesToRemove = [
    join(desktopDir, 'dotvibe.desktop'),
    join(desktopDir, 'uninstall-dotvibe.desktop'),
    join(autostartDir, 'dotvibe-daemon.desktop'),
  ]

  for (const file of filesToRemove) {
    try {
      await Deno.remove(file)
    } catch {
      // File not found or already removed
    }
  }
}

// Helper function
async function ensureDirectory(path: string): Promise<void> {
  try {
    await Deno.mkdir(path, { recursive: true })
  } catch (error) {
    if (!(error instanceof Deno.errors.AlreadyExists)) {
      throw error
    }
  }
}
