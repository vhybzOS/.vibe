#!/usr/bin/env -S deno run --allow-all

/**
 * Self-Contained Windows Installer for .vibe
 *
 * This installer contains embedded binaries for Windows and provides
 * a completely offline installation experience. No network connection required.
 *
 * Features:
 * - Extracts Windows binaries from embedded resources
 * - Provides Current User vs System-wide installation options
 * - Registers with Windows Add/Remove Programs
 * - Sets up Windows Service for system-wide installations
 * - Zero network dependencies
 *
 * @tested_by tests/unit/windows-installer.test.ts (Installation logic)
 * @tested_by tests/integration/installer-integration.test.ts (End-to-end installation)
 */

import { dirname, join, resolve } from '@std/path'

// Color helpers for better output (Windows Terminal supports ANSI colors)
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

// Installation types
type InstallScope = 'CurrentUser' | 'AllUsers'

// Installation configuration
interface InstallConfig {
  scope: InstallScope
  installDir: string
  binDir: string
  dataDir: string
  tempDir: string
}

function getInstallConfig(scope: InstallScope): InstallConfig {
  const tempDir = join(Deno.env.get('TEMP') || 'C:\\Temp', `dotvibe-install-${Date.now()}`)

  if (scope === 'CurrentUser') {
    const localAppData = Deno.env.get('LOCALAPPDATA') || join(Deno.env.get('USERPROFILE')!, 'AppData', 'Local')
    const installDir = join(localAppData, 'dotvibe')
    return {
      scope,
      installDir,
      binDir: join(installDir, 'bin'),
      dataDir: join(installDir, 'data'),
      tempDir,
    }
  } else {
    const programFiles = Deno.env.get('PROGRAMFILES') || 'C:\\Program Files'
    const installDir = join(programFiles, 'dotvibe')
    return {
      scope,
      installDir,
      binDir: join(installDir, 'bin'),
      dataDir: join(installDir, 'data'),
      tempDir,
    }
  }
}

// Administrator privilege checking
async function isElevated(): Promise<boolean> {
  try {
    // Try to write to a system directory to check for admin privileges
    const testFile = 'C:\\Windows\\Temp\\dotvibe-elevation-test.tmp'
    await Deno.writeTextFile(testFile, 'test')
    await Deno.remove(testFile)
    return true
  } catch {
    return false
  }
}

async function checkElevationRequired(scope: InstallScope): Promise<void> {
  if (scope === 'AllUsers') {
    const elevated = await isElevated()
    if (!elevated) {
      error('System-wide installation requires Administrator privileges.')
      warn('Please run this installer as Administrator:')
      warn('Right-click PowerShell → "Run as Administrator", then run this installer.')
      Deno.exit(1)
    }
  }
}

// Embedded resource extraction
async function extractEmbeddedBinary(binaryName: string, outputPath: string): Promise<void> {
  try {
    // In a compiled Deno binary, embedded files are accessible via import.meta.resolve
    const binaryData = await Deno.readFile(new URL(`../embedded-windows/binaries/${binaryName}`, import.meta.url))
    await Deno.writeFile(outputPath, binaryData)
    log(`Extracted ${binaryName} to ${outputPath}`)
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    throw new Error(`Failed to extract embedded binary ${binaryName}: ${err.message}`)
  }
}

async function extractInstallScript(scriptName: string, outputPath: string): Promise<void> {
  try {
    const scriptData = await Deno.readTextFile(new URL(`../embedded-windows/scripts/${scriptName}`, import.meta.url))
    await Deno.writeTextFile(outputPath, scriptData)
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
  console.log('  [1] Current User (Recommended, no admin rights needed)')
  console.log('  [2] All Users (System-wide, requires Administrator privileges)')

  while (true) {
    const choice = prompt('Enter your choice (1/2):')
    if (choice === '1') return 'CurrentUser'
    if (choice === '2') return 'AllUsers'
    warn('Invalid choice. Please enter 1 or 2.')
  }
}

async function installBinaries(config: InstallConfig): Promise<void> {
  log('Installing binaries...')

  // Create directories
  await ensureDirectory(config.installDir)
  await ensureDirectory(config.binDir)
  await ensureDirectory(config.dataDir)
  await ensureDirectory(config.tempDir)

  try {
    // Extract Windows binaries to temp directory first
    const tempVibePath = join(config.tempDir, 'vibe.exe')
    const tempVibectlPath = join(config.tempDir, 'vibectl.exe')

    await extractEmbeddedBinary('vibe-windows-x86_64.exe', tempVibePath)
    await extractEmbeddedBinary('vibectl-windows-x86_64.exe', tempVibectlPath)

    // Move binaries to final location
    const finalVibePath = join(config.binDir, 'vibe.exe')
    const finalVibectlPath = join(config.binDir, 'vibectl.exe')

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

async function addToPath(binDir: string, scope: InstallScope): Promise<void> {
  const pathTarget = scope === 'CurrentUser' ? 'User' : 'Machine'

  try {
    // Use PowerShell to add to PATH
    const script = `
$target = '${pathTarget}'
$binDir = '${binDir.replace(/\\/g, '\\\\')}'
$currentPath = [Environment]::GetEnvironmentVariable('Path', $target)
if ($currentPath -notlike "*$binDir*") {
  $newPath = "$currentPath;$binDir"
  [Environment]::SetEnvironmentVariable('Path', $newPath, $target)
  Write-Host "Added $binDir to $target PATH"
} else {
  Write-Host "Directory already in $target PATH"
}
`

    const process = new Deno.Command('powershell', {
      args: ['-Command', script],
      stdout: 'piped',
      stderr: 'piped',
    })

    const result = await process.output()

    if (result.success) {
      success(`Added ${binDir} to ${pathTarget} PATH`)
      warn('You must open a new terminal for PATH changes to take effect.')
    } else {
      const errorText = new TextDecoder().decode(result.stderr)
      warn(`Failed to update PATH: ${errorText}`)
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    warn(`Failed to update PATH: ${err.message}`)
  }
}

async function setupWindowsService(config: InstallConfig): Promise<void> {
  if (config.scope !== 'AllUsers') {
    log('Windows Service only available for system-wide installations')
    warn('For Current User installations, run vibectl manually when needed')
    return
  }

  const serviceName = 'DotVibeDaemon'
  const vibectlPath = join(config.binDir, 'vibectl.exe')

  try {
    // Check if service already exists and remove it
    const checkResult = await new Deno.Command('sc', {
      args: ['query', serviceName],
      stdout: 'piped',
      stderr: 'piped',
    }).output()

    if (checkResult.success) {
      log(`Service '${serviceName}' already exists. Removing...`)
      await new Deno.Command('sc', { args: ['stop', serviceName] }).output()
      await new Deno.Command('sc', { args: ['delete', serviceName] }).output()

      // Wait a moment for service cleanup
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }

    // Create new service
    const createResult = await new Deno.Command('sc', {
      args: [
        'create',
        serviceName,
        'binpath=',
        `"${vibectlPath}"`,
        'displayname=',
        'Vibe Daemon',
        'start=',
        'auto',
      ],
      stdout: 'piped',
      stderr: 'piped',
    }).output()

    if (!createResult.success) {
      const errorText = new TextDecoder().decode(createResult.stderr)
      throw new Error(`Failed to create service: ${errorText}`)
    }

    // Start the service
    const startResult = await new Deno.Command('sc', {
      args: ['start', serviceName],
      stdout: 'piped',
      stderr: 'piped',
    }).output()

    if (startResult.success) {
      success(`Windows Service '${serviceName}' created and started`)
    } else {
      warn(`Service created but failed to start. You can start it manually from Services.msc`)
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    warn(`Failed to set up Windows Service: ${err.message}`)
  }
}

// Windows Registry integration for Add/Remove Programs
async function registerWithAddRemovePrograms(config: InstallConfig): Promise<void> {
  const uninstallScript = join(config.installDir, 'uninstall.ps1')

  // Extract uninstall script
  await extractInstallScript('uninstall-logic.ps1', uninstallScript)

  // Create registry entry for Add/Remove Programs
  const registryScript = `
$regPath = if ('${config.scope}' -eq 'CurrentUser') {
  'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\dotvibe'
} else {
  'HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\dotvibe'
}

# Create registry key
New-Item -Path $regPath -Force | Out-Null

# Set registry values
Set-ItemProperty -Path $regPath -Name 'DisplayName' -Value '.vibe - Universal Developer Tool'
Set-ItemProperty -Path $regPath -Name 'DisplayVersion' -Value '0.6.0'
Set-ItemProperty -Path $regPath -Name 'Publisher' -Value 'vhybzOS'
Set-ItemProperty -Path $regPath -Name 'InstallLocation' -Value '${config.installDir.replace(/\\/g, '\\\\')}'
Set-ItemProperty -Path $regPath -Name 'UninstallString' -Value 'powershell.exe -File "${
    uninstallScript.replace(/\\/g, '\\\\')
  }"'
Set-ItemProperty -Path $regPath -Name 'QuietUninstallString' -Value 'powershell.exe -File "${
    uninstallScript.replace(/\\/g, '\\\\')
  }"'
Set-ItemProperty -Path $regPath -Name 'NoModify' -Value 1 -Type DWord
Set-ItemProperty -Path $regPath -Name 'NoRepair' -Value 1 -Type DWord

Write-Host "Registered with Add/Remove Programs"
`

  try {
    const process = new Deno.Command('powershell', {
      args: ['-Command', registryScript],
      stdout: 'piped',
      stderr: 'piped',
    })

    const result = await process.output()

    if (result.success) {
      success('Registered with Windows Add/Remove Programs')
    } else {
      const errorText = new TextDecoder().decode(result.stderr)
      warn(`Failed to register with Add/Remove Programs: ${errorText}`)
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    warn(`Failed to register with Add/Remove Programs: ${err.message}`)
  }
}

// Main installation process
async function main(): Promise<void> {
  console.log(`${colors.bright}--- .vibe Self-Contained Windows Installer ---${colors.reset}`)
  console.log('This installer contains all binaries and requires no network connection.\n')

  try {
    // Get installation scope
    const scope = await promptInstallScope()

    // Check elevation requirements
    await checkElevationRequired(scope)

    // Get installation configuration
    const config = getInstallConfig(scope)
    log(`Installation directory: ${config.installDir}`)

    // Perform installation
    await installBinaries(config)
    await addToPath(config.binDir, scope)
    await setupWindowsService(config)
    await registerWithAddRemovePrograms(config)

    console.log(`\\n${colors.bright}🎉 .vibe has been installed successfully!${colors.reset}`)
    log(`Installation directory: ${config.installDir}`)
    log(`Binaries: ${config.binDir}`)

    if (scope === 'CurrentUser') {
      warn('The daemon service is not installed for Current User mode.')
      warn('You will need to run "vibectl" manually when you want to use daemon features.')
    }

    warn('IMPORTANT: You must open a new terminal for PATH changes to take effect.')
    console.log('\\nVerify installation with: vibe --version')

    if (Deno.env.get('CI') !== 'true') {
      prompt('Press Enter to exit...')
    }
  } catch (err) {
    const errorObj = err instanceof Error ? err : new Error(String(err))
    error(`Installation failed: ${errorObj.message}`)
    if (Deno.env.get('CI') !== 'true') {
      prompt('Press Enter to exit...')
    }
    Deno.exit(1)
  }
}

// Run the installer
if (import.meta.main) {
  await main()
}
