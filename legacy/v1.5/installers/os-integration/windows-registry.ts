/**
 * Windows Registry Integration for .vibe Installer
 *
 * Handles Windows Add/Remove Programs registration and uninstall integration.
 * This ensures .vibe appears in the standard Windows uninstall interface
 * and can be removed cleanly through the native OS mechanism.
 *
 * @tested_by tests/unit/windows-registry.test.ts (Registry operations)
 */

export interface WindowsUninstallInfo {
  displayName: string
  displayVersion: string
  publisher: string
  installLocation: string
  uninstallString: string
  estimatedSize?: number // Size in KB
  installDate?: string // YYYYMMDD format
  helpLink?: string
  urlInfoAbout?: string
}

export type RegistryScope = 'CurrentUser' | 'AllUsers'

/**
 * Registers .vibe with Windows Add/Remove Programs
 */
export async function registerWithAddRemovePrograms(
  scope: RegistryScope,
  uninstallInfo: WindowsUninstallInfo,
): Promise<boolean> {
  const registryPath = scope === 'CurrentUser'
    ? 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\dotvibe'
    : 'HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\dotvibe'

  const registryScript = `
try {
    # Create registry key
    New-Item -Path '${registryPath}' -Force | Out-Null
    
    # Set required registry values
    Set-ItemProperty -Path '${registryPath}' -Name 'DisplayName' -Value '${uninstallInfo.displayName}'
    Set-ItemProperty -Path '${registryPath}' -Name 'DisplayVersion' -Value '${uninstallInfo.displayVersion}'
    Set-ItemProperty -Path '${registryPath}' -Name 'Publisher' -Value '${uninstallInfo.publisher}'
    Set-ItemProperty -Path '${registryPath}' -Name 'InstallLocation' -Value '${
    uninstallInfo.installLocation.replace(/\\/g, '\\\\')
  }'
    Set-ItemProperty -Path '${registryPath}' -Name 'UninstallString' -Value '${
    uninstallInfo.uninstallString.replace(/\\/g, '\\\\')
  }'
    Set-ItemProperty -Path '${registryPath}' -Name 'QuietUninstallString' -Value '${
    uninstallInfo.uninstallString.replace(/\\/g, '\\\\')
  }'
    
    # Set control flags
    Set-ItemProperty -Path '${registryPath}' -Name 'NoModify' -Value 1 -Type DWord
    Set-ItemProperty -Path '${registryPath}' -Name 'NoRepair' -Value 1 -Type DWord
    
    # Optional values
    ${
    uninstallInfo.estimatedSize
      ? `Set-ItemProperty -Path '${registryPath}' -Name 'EstimatedSize' -Value ${uninstallInfo.estimatedSize} -Type DWord`
      : ''
  }
    ${
    uninstallInfo.installDate
      ? `Set-ItemProperty -Path '${registryPath}' -Name 'InstallDate' -Value '${uninstallInfo.installDate}'`
      : ''
  }
    ${
    uninstallInfo.helpLink
      ? `Set-ItemProperty -Path '${registryPath}' -Name 'HelpLink' -Value '${uninstallInfo.helpLink}'`
      : ''
  }
    ${
    uninstallInfo.urlInfoAbout
      ? `Set-ItemProperty -Path '${registryPath}' -Name 'URLInfoAbout' -Value '${uninstallInfo.urlInfoAbout}'`
      : ''
  }
    
    Write-Host "SUCCESS: Registered with Add/Remove Programs"
    exit 0
} catch {
    Write-Host "ERROR: $($_.Exception.Message)"
    exit 1
}
`

  try {
    const process = new Deno.Command('powershell', {
      args: ['-Command', registryScript],
      stdout: 'piped',
      stderr: 'piped',
    })

    const result = await process.output()
    const output = new TextDecoder().decode(result.stdout)
    const errorOutput = new TextDecoder().decode(result.stderr)

    if (result.success && output.includes('SUCCESS')) {
      return true
    } else {
      console.error(`Registry registration failed: ${errorOutput || output}`)
      return false
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    console.error(`Registry registration error: ${err.message}`)
    return false
  }
}

/**
 * Removes .vibe from Windows Add/Remove Programs
 */
export async function unregisterFromAddRemovePrograms(scope: RegistryScope): Promise<boolean> {
  const registryPath = scope === 'CurrentUser'
    ? 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\dotvibe'
    : 'HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\dotvibe'

  const unregisterScript = `
try {
    if (Test-Path '${registryPath}') {
        Remove-Item -Path '${registryPath}' -Recurse -Force
        Write-Host "SUCCESS: Unregistered from Add/Remove Programs"
    } else {
        Write-Host "SUCCESS: Registry entry not found (already removed)"
    }
    exit 0
} catch {
    Write-Host "ERROR: $($_.Exception.Message)"
    exit 1
}
`

  try {
    const process = new Deno.Command('powershell', {
      args: ['-Command', unregisterScript],
      stdout: 'piped',
      stderr: 'piped',
    })

    const result = await process.output()
    const output = new TextDecoder().decode(result.stdout)
    const errorOutput = new TextDecoder().decode(result.stderr)

    if (result.success && output.includes('SUCCESS')) {
      return true
    } else {
      console.error(`Registry unregistration failed: ${errorOutput || output}`)
      return false
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    console.error(`Registry unregistration error: ${err.message}`)
    return false
  }
}

/**
 * Creates a Windows uninstaller executable wrapper
 * This creates a simple batch file that can be executed from Add/Remove Programs
 */
export async function createUninstallerWrapper(
  uninstallScriptPath: string,
  wrapperPath: string,
): Promise<void> {
  const batchContent = `@echo off
echo Starting .vibe uninstaller...
powershell.exe -ExecutionPolicy Bypass -File "${uninstallScriptPath}"
if %ERRORLEVEL% neq 0 (
    echo Uninstall failed. Press any key to exit.
    pause >nul
    exit /b 1
)
echo Uninstall completed successfully.
pause
`

  await Deno.writeTextFile(wrapperPath, batchContent)
}

/**
 * Gets the estimated installation size for registry entry
 */
async function calculateDirSize(dirPath: string): Promise<number> {
  let size = 0
  try {
    for await (const entry of Deno.readDir(dirPath)) {
      if (entry.isFile) {
        const stat = await Deno.stat(`${dirPath}\\${entry.name}`)
        size += stat.size
      } else if (entry.isDirectory) {
        size += await calculateDirSize(`${dirPath}\\${entry.name}`)
      }
    }
  } catch {
    // Ignore errors accessing subdirectories
  }
  return size
}

export async function getInstallationSize(installDir: string): Promise<number> {
  try {
    const totalSize = await calculateDirSize(installDir)

    // Convert bytes to KB
    return Math.ceil(totalSize / 1024)
  } catch {
    // Return default size if calculation fails
    return 10240 // 10MB default
  }
}

/**
 * Formats date for Windows registry (YYYYMMDD)
 */
export function formatInstallDate(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}
