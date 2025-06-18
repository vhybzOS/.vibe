# Vibe Uninstallation Script (Windows PowerShell)
#
# This smart script detects where .vibe was installed (Current User or All Users)
# and completely removes all associated files, PATH entries, and services.
#
# @version 1.1.0

# --- Strict Mode ---
$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

# --- Helper Functions ---

#region Logging Helpers
function Write-Info($message) { Write-Host "[INFO] $message" -ForegroundColor Cyan }
function Write-Success($message) { Write-Host "[SUCCESS] $message" -ForegroundColor Green }
function Write-Warn($message) { Write-Host "[WARN] $message" -ForegroundColor Yellow }
function Write-Error($message) {
    Write-Host "[ERROR] $message" -ForegroundColor Red
    if ($env:CI -ne 'true') { Read-Host "Press Enter to exit" }
    exit 1
}
#endregion

#region System Check Helpers
function Test-Administrator {
    $currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = [System.Security.Principal.WindowsPrincipal]::new($currentUser)
    return $principal.IsInRole([System.Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Elevate-And-Rerun {
    if (-not (Test-Administrator)) {
        Write-Warn "Administrator privileges are required for system-wide uninstallation."
        Write-Info "Attempting to re-launch with elevated permissions..."
        
        $scriptPath = Join-Path $PSScriptRoot "uninstall.ps1"
        $arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`""
        
        try {
            Start-Process powershell -Verb RunAs -ArgumentList $arguments
        }
        catch {
            Write-Error "Failed to elevate. Please run this script from an Administrator PowerShell session."
        }
        
        exit
    }
}
#endregion

#region Uninstallation Logic
function Find-Installation {
    $userInstallDir = Join-Path $env:LOCALAPPDATA "dotvibe"
    $systemInstallDir = Join-Path $env:ProgramFiles "dotvibe"
    
    if (Test-Path $userInstallDir) {
        return @{ Path = $userInstallDir; Scope = "CurrentUser" }
    }
    
    if (Test-Path $systemInstallDir) {
        return @{ Path = $systemInstallDir; Scope = "AllUsers" }
    }
    
    return $null
}

function Remove-From-Path($directory, $scope) {
    $pathTarget = if ($scope -eq 'CurrentUser') { 'User' } else { 'Machine' }
    $currentPath = [Environment]::GetEnvironmentVariable("Path", $pathTarget)
    $binDir = Join-Path $directory "bin"

    if ($currentPath -like "*$binDir*") {
        Write-Info "Removing '$binDir' from $pathTarget PATH..."
        
        # Split path, filter out the directory, and rejoin
        $pathArray = $currentPath.Split(';') | Where-Object { $_ -ne $binDir -and $_ }
        $newPath = $pathArray -join ';'
        
        [Environment]::SetEnvironmentVariable("Path", $newPath, $pathTarget)
        Write-Success "PATH updated successfully."
    }
    else {
        Write-Info "Installation directory not found in $pathTarget PATH. Skipping."
    }
}

function Remove-Windows-Service {
    $serviceName = "DotVibeDaemon"
    Write-Info "Checking for Windows Service '$serviceName'..."
    $service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
    
    if ($service) {
        if ($service.Status -eq "Running") {
            Write-Info "Stopping Vibe service..."
            Stop-Service -Name $serviceName -Force
        }
        
        Write-Info "Removing Vibe service..."
        try {
            sc.exe delete $serviceName
            Write-Success "Windows Service removed successfully."
        }
        catch {
            Write-Warn "Failed to remove Windows Service. You may need to remove it manually."
        }
    }
    else {
        Write-Info "Windows Service not found. Skipping."
    }
}
#endregion

# --- Main Uninstallation Process ---
function Main {
    Clear-Host
    Write-Host "--- .vibe Uninstaller for Windows ---`n"

    $installation = Find-Installation
    
    if (-not $installation) {
        Write-Success ".vibe installation not found. Nothing to do."
        exit 0
    }
    
    Write-Info "Found .vibe installation for $($installation.Scope) at: $($installation.Path)"
    
    # Require elevation only if a system-wide installation is found
    if ($installation.Scope -eq "AllUsers") {
        Elevate-And-Rerun
    }
    
    # Confirmation prompt
    $confirmation = Read-Host -Prompt "Are you sure you want to completely remove .vibe? (y/n)"
    if ($confirmation.ToLower() -ne 'y') {
        Write-Warn "Uninstallation cancelled by user."
        exit 0
    }
    
    # 1. Remove Windows Service (if system-wide install)
    if ($installation.Scope -eq "AllUsers") {
        Remove-Windows-Service
    }
    
    # 2. Remove from PATH
    Remove-From-Path -directory $installation.Path -scope $installation.Scope

    # 3. Remove installation directory
    Write-Info "Removing installation directory: $($installation.Path)..."
    try {
        Remove-Item -Path $installation.Path -Recurse -Force
        Write-Success "Installation directory removed."
    }
    catch {
        Write-Error "Failed to remove installation directory. Please remove it manually. Error: $_"
    }
    
    # Final message
    Write-Host "`n"
    Write-Success "🎉 .vibe has been uninstalled successfully."
    Write-Warn "You must open a new terminal window for the PATH changes to take full effect."
}

try {
    Main
}
catch {
    Write-Error "A critical error occurred during uninstallation. Details: $_"
}
