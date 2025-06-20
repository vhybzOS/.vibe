#!/usr/bin/env -S deno run --allow-all

/**
 * Self-Contained Unix Installer for .vibe
 *
 * This installer contains embedded binaries for Linux and macOS and provides
 * a completely offline installation experience. No network connection required.
 *
 * Features:
 * - Auto-detects platform (Linux/macOS)
 * - Extracts appropriate binaries from embedded resources
 * - Provides Current User vs System-wide installation options
 * - Registers with OS uninstall mechanisms
 * - Zero network dependencies
 *
 * @tested_by tests/unit/unix-installer.test.ts (Installation logic)
 * @tested_by tests/integration/installer-integration.test.ts (End-to-end installation)
 */

import { dirname, join, resolve } from '@std/path'

// Color helpers for better output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function log(message: string, color = colors.blue) {
  console.log(`${color}[INFO]${colors.reset} ${message}`)
}

function success(message: string) {
  console.log(`${colors.green}[SUCCESS]${colors.reset} ${message}`)
}

function error(message: string) {
  console.log(`${colors.red}[ERROR]${colors.reset} ${message}`)
}

function warn(message: string) {
  console.log(`${colors.yellow}[WARN]${colors.reset} ${message}`)
}

// Platform detection
type Platform = 'linux' | 'macos'
type InstallScope = 'CurrentUser' | 'AllUsers'

function detectPlatform(): Platform {
  const os = Deno.build.os
  switch (os) {
    case 'linux':
      return 'linux'
    case 'darwin':
      return 'macos'
    default:
      throw new Error(`Unsupported platform: ${os}`)
  }
}

function getBinaryName(tool: 'vibe' | 'vibectl', platform: Platform): string {
  return `${tool}-${platform}-x86_64`
}

// Installation configuration
interface InstallConfig {
  scope: InstallScope
  platform: Platform
  installDir: string
  binDir: string
  tempDir: string
}

function getInstallConfig(scope: InstallScope, platform: Platform): InstallConfig {
  const homeDir = Deno.env.get('HOME')
  if (!homeDir) {
    throw new Error('HOME environment variable not set')
  }

  if (scope === 'CurrentUser') {
    return {
      scope,
      platform,
      installDir: join(homeDir, '.local', 'share', 'dotvibe'),
      binDir: join(homeDir, '.local', 'bin'),
      tempDir: join('/tmp', `dotvibe-install-${Date.now()}`),
    }
  } else {
    return {
      scope,
      platform,
      installDir: '/usr/local/share/dotvibe',
      binDir: '/usr/local/bin',
      tempDir: join('/tmp', `dotvibe-install-${Date.now()}`),
    }
  }
}

// Embedded resource extraction
async function extractEmbeddedBinary(binaryName: string, outputPath: string): Promise<void> {
  try {
    // In a compiled Deno binary, embedded files are accessible via import.meta.resolve
    const binaryData = await Deno.readFile(new URL(`../embedded-unix/binaries/${binaryName}`, import.meta.url))
    await Deno.writeFile(outputPath, binaryData)
    await Deno.chmod(outputPath, 0o755)
    log(`Extracted ${binaryName} to ${outputPath}`)
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    throw new Error(`Failed to extract embedded binary ${binaryName}: ${err.message}`)
  }
}

async function extractInstallScript(scriptName: string, outputPath: string): Promise<void> {
  try {
    const scriptData = await Deno.readTextFile(new URL(`../embedded-unix/scripts/${scriptName}`, import.meta.url))
    await Deno.writeTextFile(outputPath, scriptData)
    await Deno.chmod(outputPath, 0o755)
    log(`Extracted install script to ${outputPath}`)
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    throw new Error(`Failed to extract install script ${scriptName}: ${err.message}`)
  }
}

// Installation process
async function ensureDirectory(path: string): Promise<void> {
  try {
    await Deno.mkdir(path, { recursive: true })
  } catch (error) {
    if (!(error instanceof Deno.errors.AlreadyExists)) {
      throw error
    }
  }
}

async function promptInstallScope(): Promise<InstallScope> {
  console.log(`${colors.yellow}Choose installation scope:${colors.reset}`)
  console.log('  [1] Current User (Recommended, no sudo needed)')
  console.log('  [2] All Users (System-wide, requires sudo)')

  while (true) {
    const choice = prompt('Enter your choice (1/2):')
    if (choice === '1') return 'CurrentUser'
    if (choice === '2') return 'AllUsers'
    warn('Invalid choice. Please enter 1 or 2.')
  }
}

async function checkSudoRequired(scope: InstallScope): Promise<void> {
  if (scope === 'AllUsers' && (Deno as any).getUid && (Deno as any).getUid() !== 0) {
    warn('System-wide installation requires sudo privileges.')
    log('Please run: sudo ./install-dotvibe')
    Deno.exit(1)
  }
}

async function installBinaries(config: InstallConfig): Promise<void> {
  log('Installing binaries...')

  // Create directories
  await ensureDirectory(config.installDir)
  await ensureDirectory(config.binDir)
  await ensureDirectory(config.tempDir)

  try {
    // Extract binaries to temp directory first
    const vibeBinary = getBinaryName('vibe', config.platform)
    const vibectlBinary = getBinaryName('vibectl', config.platform)

    const tempVibePath = join(config.tempDir, 'vibe')
    const tempVibectlPath = join(config.tempDir, 'vibectl')

    await extractEmbeddedBinary(vibeBinary, tempVibePath)
    await extractEmbeddedBinary(vibectlBinary, tempVibectlPath)

    // Move binaries to final location
    const finalVibePath = join(config.binDir, 'vibe')
    const finalVibectlPath = join(config.binDir, 'vibectl')

    await Deno.rename(tempVibePath, finalVibePath)
    await Deno.rename(tempVibectlPath, finalVibectlPath)

    success(`Binaries installed to ${config.binDir}`)
  } finally {
    // Cleanup temp directory
    try {
      await Deno.remove(config.tempDir, { recursive: true })
    } catch {
      // Ignore cleanup errors
    }
  }
}

async function addToPath(binDir: string): Promise<void> {
  const homeDir = Deno.env.get('HOME')
  if (!homeDir) return

  const shell = Deno.env.get('SHELL') || '/bin/bash'
  const shellName = shell.split('/').pop() || 'bash'

  let configFile: string
  switch (shellName) {
    case 'bash':
      configFile = join(homeDir, '.bashrc')
      break
    case 'zsh':
      configFile = join(homeDir, '.zshrc')
      break
    case 'fish':
      configFile = join(homeDir, '.config', 'fish', 'config.fish')
      break
    default:
      warn(`Unknown shell ${shellName}. Please add ${binDir} to your PATH manually.`)
      return
  }

  try {
    let content = ''
    try {
      content = await Deno.readTextFile(configFile)
    } catch {
      // File doesn't exist, that's okay
    }

    const pathExport = shellName === 'fish' ? `fish_add_path "${binDir}"` : `export PATH="${binDir}:$PATH"`

    if (!content.includes(binDir)) {
      await ensureDirectory(dirname(configFile))
      const newContent = content + `\n# Add .vibe to PATH\n${pathExport}\n`
      await Deno.writeTextFile(configFile, newContent)
      log(`Added ${binDir} to PATH in ${configFile}`)
      warn('You must source your profile or open a new terminal for changes to take effect.')
    } else {
      log('Installation directory is already in your PATH.')
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    warn(`Failed to update PATH: ${err.message}`)
  }
}

async function setupService(config: InstallConfig): Promise<void> {
  if (config.platform === 'linux') {
    await setupLinuxService(config)
  } else if (config.platform === 'macos') {
    await setupMacOSService(config)
  }
}

async function setupLinuxService(config: InstallConfig): Promise<void> {
  const vibectlPath = join(config.binDir, 'vibectl')

  if (config.scope === 'CurrentUser') {
    const serviceDir = join(Deno.env.get('HOME')!, '.config', 'systemd', 'user')
    await ensureDirectory(serviceDir)

    const serviceContent = `[Unit]
Description=Vibe Daemon
After=network.target

[Service]
ExecStart=${vibectlPath}
Restart=always

[Install]
WantedBy=default.target
`

    const servicePath = join(serviceDir, 'vibe.service')
    await Deno.writeTextFile(servicePath, serviceContent)

    // Enable and start the service
    try {
      await new Deno.Command('systemctl', { args: ['--user', 'daemon-reload'] }).output()
      await new Deno.Command('systemctl', { args: ['--user', 'enable', '--now', 'vibe.service'] }).output()
      success('User-level systemd service configured and started.')
    } catch {
      warn('Failed to start systemd service. You can start it manually with: systemctl --user start vibe.service')
    }
  } else {
    const serviceContent = `[Unit]
Description=Vibe Daemon
After=network.target

[Service]
ExecStart=${vibectlPath}
Restart=always
User=root

[Install]
WantedBy=multi-user.target
`

    const servicePath = '/etc/systemd/system/vibe.service'
    await Deno.writeTextFile(servicePath, serviceContent)

    // Enable and start the service
    try {
      await new Deno.Command('systemctl', { args: ['daemon-reload'] }).output()
      await new Deno.Command('systemctl', { args: ['enable', '--now', 'vibe.service'] }).output()
      success('System-wide systemd service configured and started.')
    } catch {
      warn('Failed to start systemd service. You can start it manually with: sudo systemctl start vibe.service')
    }
  }
}

async function setupMacOSService(config: InstallConfig): Promise<void> {
  const vibectlPath = join(config.binDir, 'vibectl')
  const label = 'dev.dotvibe.daemon'

  let plistPath: string
  if (config.scope === 'CurrentUser') {
    plistPath = join(Deno.env.get('HOME')!, 'Library', 'LaunchAgents', `${label}.plist`)
    await ensureDirectory(dirname(plistPath))
  } else {
    plistPath = join('/Library', 'LaunchDaemons', `${label}.plist`)
  }

  const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${label}</string>
    <key>ProgramArguments</key>
    <array>
        <string>${vibectlPath}</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
`

  await Deno.writeTextFile(plistPath, plistContent)

  // Load the service
  try {
    await new Deno.Command('launchctl', { args: ['unload', plistPath] }).output() // Unload if exists
    await new Deno.Command('launchctl', { args: ['load', plistPath] }).output()
    success('Launch service configured and loaded.')
  } catch {
    warn('Failed to load Launch service. You can load it manually with: launchctl load ' + plistPath)
  }
}

// OS uninstall integration
async function registerUninstaller(config: InstallConfig): Promise<void> {
  if (config.platform === 'linux') {
    await createLinuxUninstaller(config)
  } else if (config.platform === 'macos') {
    await createMacOSUninstaller(config)
  }
}

async function createLinuxUninstaller(config: InstallConfig): Promise<void> {
  // Create a desktop entry for easy uninstall
  const desktopDir = config.scope === 'CurrentUser'
    ? join(Deno.env.get('HOME')!, '.local', 'share', 'applications')
    : '/usr/share/applications'

  await ensureDirectory(desktopDir)

  const uninstallScript = join(config.installDir, 'uninstall.sh')

  // Extract uninstall script
  await extractInstallScript('uninstall-logic.sh', uninstallScript)

  const desktopEntry = `[Desktop Entry]
Name=Uninstall .vibe
Comment=Remove .vibe development tool
Exec=${uninstallScript}
Icon=applications-system
Terminal=true
Type=Application
Categories=System;
`

  const desktopPath = join(desktopDir, 'uninstall-dotvibe.desktop')
  await Deno.writeTextFile(desktopPath, desktopEntry)
  await Deno.chmod(desktopPath, 0o755)

  log('Created desktop uninstaller entry')
}

async function createMacOSUninstaller(config: InstallConfig): Promise<void> {
  // Create an uninstall script that can be run from Finder
  const uninstallScript = join(config.installDir, 'uninstall.sh')
  await extractInstallScript('uninstall-logic.sh', uninstallScript)

  log('Created uninstall script in installation directory')
}

// Main installation process
async function main(): Promise<void> {
  console.log(`${colors.bright}--- .vibe Self-Contained Installer ---${colors.reset}`)
  console.log('This installer contains all binaries and requires no network connection.\n')

  try {
    // Detect platform
    const platform = detectPlatform()
    log(`Detected platform: ${platform}`)

    // Get installation scope
    const scope = await promptInstallScope()

    // Check sudo requirements
    await checkSudoRequired(scope)

    // Get installation configuration
    const config = getInstallConfig(scope, platform)
    log(`Installation directory: ${config.installDir}`)

    // Perform installation
    await installBinaries(config)
    await addToPath(config.binDir)
    await setupService(config)
    await registerUninstaller(config)

    console.log(`\n${colors.bright}🎉 .vibe has been installed successfully!${colors.reset}`)
    log(`Installation directory: ${config.installDir}`)
    log(`Binaries: ${config.binDir}`)

    if (scope === 'CurrentUser') {
      warn('Please open a new terminal for PATH changes to take effect.')
    }

    console.log('\nVerify installation with: vibe --version')
  } catch (err) {
    const errorObj = err instanceof Error ? err : new Error(String(err))
    error(`Installation failed: ${errorObj.message}`)
    Deno.exit(1)
  }
}

// Run the installer
if (import.meta.main) {
  await main()
}
