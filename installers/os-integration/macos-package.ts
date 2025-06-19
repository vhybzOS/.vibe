/**
 * macOS Package Integration for .vibe Installer
 *
 * Handles macOS-specific uninstall integration including application bundles,
 * receipt tracking, and integration with native macOS uninstall mechanisms.
 *
 * @tested_by tests/unit/macos-package.test.ts (macOS integration)
 */

import { dirname, join } from '@std/path'

export interface MacOSUninstallInfo {
  appName: string
  version: string
  installLocation: string
  uninstallScript: string
  bundleIdentifier?: string
}

export type MacOSScope = 'CurrentUser' | 'AllUsers'

/**
 * Creates an uninstaller application bundle for macOS
 * This provides a native macOS app that users can double-click to uninstall
 */
export async function createUninstallerApp(
  scope: MacOSScope,
  uninstallInfo: MacOSUninstallInfo,
): Promise<string> {
  const appsDir = scope === 'CurrentUser' ? join(Deno.env.get('HOME')!, 'Applications') : '/Applications'

  const appPath = join(appsDir, 'Uninstall .vibe.app')
  const contentsDir = join(appPath, 'Contents')
  const macosDir = join(contentsDir, 'MacOS')
  const resourcesDir = join(contentsDir, 'Resources')

  // Create bundle structure
  await ensureDirectory(appPath)
  await ensureDirectory(contentsDir)
  await ensureDirectory(macosDir)
  await ensureDirectory(resourcesDir)

  // Create Info.plist
  const infoPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>uninstall-vibe</string>
    <key>CFBundleIdentifier</key>
    <string>${uninstallInfo.bundleIdentifier || 'dev.dotvibe.uninstaller'}</string>
    <key>CFBundleName</key>
    <string>Uninstall .vibe</string>
    <key>CFBundleDisplayName</key>
    <string>Uninstall .vibe</string>
    <key>CFBundleVersion</key>
    <string>${uninstallInfo.version}</string>
    <key>CFBundleShortVersionString</key>
    <string>${uninstallInfo.version}</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleSignature</key>
    <string>????</string>
    <key>LSMinimumSystemVersion</key>
    <string>10.15</string>
    <key>NSHumanReadableCopyright</key>
    <string>© 2024 vhybzOS</string>
    <key>NSRequiresAquaSystemAppearance</key>
    <false/>
</dict>
</plist>
`

  await Deno.writeTextFile(join(contentsDir, 'Info.plist'), infoPlist)

  // Create executable script
  const executableScript = `#!/bin/bash
set -e

# Show confirmation dialog
response=$(osascript -e 'display dialog "Are you sure you want to uninstall .vibe?" buttons {"Cancel", "Uninstall"} default button "Cancel" with icon caution')

if [[ "$response" == *"Uninstall"* ]]; then
    # Run the uninstall script
    if [[ -f "${uninstallInfo.uninstallScript}" ]]; then
        osascript -e 'do shell script "bash \\"${uninstallInfo.uninstallScript}\\"" with administrator privileges'
        osascript -e 'display notification ".vibe has been uninstalled successfully" with title "Uninstall Complete"'
        
        # Remove this uninstaller app
        rm -rf "${appPath}"
    else
        osascript -e 'display alert "Uninstall script not found" message "The uninstall script could not be located. Please remove .vibe manually." as critical'
    fi
else
    # User cancelled
    exit 0
fi
`

  const executablePath = join(macosDir, 'uninstall-vibe')
  await Deno.writeTextFile(executablePath, executableScript)
  await Deno.chmod(executablePath, 0o755)

  // Create icon (simple text-based icon for now)
  const iconScript = `#!/bin/bash
# This creates a simple icon using built-in macOS tools
sips -s format icns /System/Library/CoreServices/Uninstall\\ Assistant.app/Contents/Resources/uninstall.icns --out "${resourcesDir}/uninstall-vibe.icns" 2>/dev/null || true
`

  try {
    await new Deno.Command('bash', { args: ['-c', iconScript] }).output()
  } catch {
    // Icon creation failed, but that's not critical
  }

  return appPath
}

/**
 * Creates a simple uninstaller script that can be run from Finder
 */
export async function createFinderUninstaller(
  uninstallInfo: MacOSUninstallInfo,
): Promise<void> {
  const uninstallerScript = `#!/bin/bash
set -e

echo "=== .vibe Uninstaller ==="
echo "This will remove .vibe from your system."
echo ""

# Check if running in terminal
if [[ ! -t 0 ]]; then
    # Not in terminal, use AppleScript for user interaction
    response=$(osascript -e 'display dialog "This will remove .vibe from your system. Continue?" buttons {"Cancel", "Continue"} default button "Cancel" with icon caution')
    
    if [[ "$response" != *"Continue"* ]]; then
        osascript -e 'display notification "Uninstall cancelled by user" with title ".vibe Uninstaller"'
        exit 0
    fi
else
    # In terminal, use regular prompts
    read -p "Continue? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Uninstall cancelled."
        exit 0
    fi
fi

# Run the actual uninstall script
if [[ -f "${uninstallInfo.uninstallScript}" ]]; then
    bash "${uninstallInfo.uninstallScript}"
    
    if [[ ! -t 0 ]]; then
        osascript -e 'display notification ".vibe has been uninstalled successfully" with title "Uninstall Complete"'
    else
        echo "✅ .vibe has been uninstalled successfully!"
    fi
else
    error_msg="Uninstall script not found at ${uninstallInfo.uninstallScript}"
    if [[ ! -t 0 ]]; then
        osascript -e "display alert \"Error\" message \"$error_msg\" as critical"
    else
        echo "❌ Error: $error_msg"
    fi
    exit 1
fi
`

  const finderScriptPath = join(uninstallInfo.installLocation, 'Uninstall from Finder.command')
  await Deno.writeTextFile(finderScriptPath, uninstallerScript)
  await Deno.chmod(finderScriptPath, 0o755)
}

/**
 * Registers uninstaller with macOS Launch Services
 */
export async function registerWithLaunchServices(appPath: string): Promise<boolean> {
  try {
    // Register the app bundle with Launch Services
    const result = await new Deno.Command('lsregister', {
      args: ['-f', appPath],
      stdout: 'piped',
      stderr: 'piped',
    }).output()

    return result.success
  } catch {
    return false
  }
}

/**
 * Creates a receipt file for package tracking (mimics installer behavior)
 */
export async function createPackageReceipt(
  uninstallInfo: MacOSUninstallInfo,
  scope: MacOSScope,
): Promise<void> {
  const receiptsDir = scope === 'CurrentUser' ? join(Deno.env.get('HOME')!, 'Library', 'Receipts') : '/Library/Receipts'

  await ensureDirectory(receiptsDir)

  const receiptContent = {
    name: uninstallInfo.appName,
    version: uninstallInfo.version,
    installLocation: uninstallInfo.installLocation,
    installDate: new Date().toISOString(),
    bundleIdentifier: uninstallInfo.bundleIdentifier || 'dev.dotvibe.cli',
  }

  const receiptPath = join(receiptsDir, 'dev.dotvibe.cli.plist')
  const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>name</key>
    <string>${receiptContent.name}</string>
    <key>version</key>
    <string>${receiptContent.version}</string>
    <key>installLocation</key>
    <string>${receiptContent.installLocation}</string>
    <key>installDate</key>
    <string>${receiptContent.installDate}</string>
    <key>bundleIdentifier</key>
    <string>${receiptContent.bundleIdentifier}</string>
</dict>
</plist>
`

  await Deno.writeTextFile(receiptPath, plistContent)
}

/**
 * Removes package receipt during uninstall
 */
export async function removePackageReceipt(scope: MacOSScope): Promise<void> {
  const receiptsDir = scope === 'CurrentUser' ? join(Deno.env.get('HOME')!, 'Library', 'Receipts') : '/Library/Receipts'

  const receiptPath = join(receiptsDir, 'dev.dotvibe.cli.plist')

  try {
    await Deno.remove(receiptPath)
  } catch {
    // Receipt not found or already removed
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
