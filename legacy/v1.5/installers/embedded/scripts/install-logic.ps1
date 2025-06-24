# Vibe Cross-Platform Installation Script (Windows PowerShell)
#
# This smart script handles two scenarios:
# 1. Developer Mode: If run from a cloned repo, it builds from local source.
# 2. User Mode: If run standalone, it downloads the latest release from GitHub.
#
# It provides installation scope choices and handles Administrator elevation.
# Both `vibe` and `vibectl` are always installed and added to the PATH.
#
# @version 1.3.1

# --- Parameters and Strict Mode ---
param(
    [string]$Version = "latest",
    [string]$Repo = "vhybzOS/.vibe" # Official repository
)

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
        Write-Warn "Administrator privileges are required for system-wide installation."
        Write-Info "Attempting to re-launch with elevated permissions..."
        
        $scriptPath = Join-Path $PSScriptRoot "install.ps1"
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

function Check-Source {
    $result = @{ IsRepo = $false; Message = "Standalone user mode detected." }
    $repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
    $denoJsonPath = Join-Path $repoRoot "deno.json"
    
    if (Test-Path $denoJsonPath) {
        try {
            $json = Get-Content $denoJsonPath | ConvertFrom-Json
            if ($json.name -eq "dotvibe") {
                $result.IsRepo = $true
                $result.Message = "Developer repo mode detected."
            }
        } catch { /* Ignore parsing errors, assume user mode */ }
    }
    return $result
}
#endregion

#region Core Logic Functions
function Build-From-Source {
    Write-Info "Building binaries from local source..."
    if (-not (Get-Command deno -ErrorAction SilentlyContinue)) {
        Write-Error "Deno is required to build from source but not found in PATH."
    }
    
    try {
        deno task build:all
        Write-Success "Binaries built successfully."
    }
    catch {
        Write-Error "Failed to build binaries from source. Error: $_"
    }
}

function Download-From-GitHub {
    $localVersion = $Version
    if ($localVersion -eq "latest") {
        Write-Info "Fetching latest release version from GitHub..."
        try {
            $ProgressPreference = 'SilentlyContinue'
            $response = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases/latest"
            $localVersion = $response.tag_name
        }
        catch {
            Write-Error "Failed to get latest version: $_"
        }
        finally {
            $ProgressPreference = 'Continue'
        }
    }
    Write-Info "Targeting version: $localVersion"
    
    $vibeUrl = "https://github.com/$Repo/releases/download/$localVersion/vibe-windows-x86_64.exe"
    $vibectlUrl = "https://github.com/$Repo/releases/download/$localVersion/vibectl-windows-x86_64.exe"
    
    $ProgressPreference = 'SilentlyContinue'
    try {
        Write-Info "Downloading vibe binary..."
        Invoke-WebRequest -Uri $vibeUrl -OutFile ".\vibe.exe"
        
        Write-Info "Downloading vibectl binary..."
        Invoke-WebRequest -Uri $vibectlUrl -OutFile ".\vibectl.exe"
    }
    catch {
        Write-Error "Failed to download binaries. Error: $_"
    }
    finally {
        $ProgressPreference = 'Continue'
    }
    
    Write-Success "Binaries downloaded successfully."
}

function Get-InstallationScope {
    while ($true) {
        Write-Host ""
        Write-Host "Choose installation scope:" -ForegroundColor Yellow
        Write-Host "  [1] Current User (Recommended, no admin rights needed)"
        Write-Host "  [2] All Users (System-wide, requires Administrator privileges)"
        $choice = Read-Host -Prompt "Enter your choice (1/2)"
        
        if ($choice -eq '1') { return 'CurrentUser' }
        if ($choice -eq '2') { return 'AllUsers' }
        
        Write-Warn "Invalid choice. Please enter 1 or 2."
    }
}

function Add-To-Path($directory, $scope) {
    $pathTarget = if ($scope -eq 'CurrentUser') { 'User' } else { 'Machine' }
    $currentPath = [Environment]::GetEnvironmentVariable("Path", $pathTarget)
    
    if ($currentPath -notlike "*$directory*") {
        Write-Info "Adding $directory to $pathTarget PATH..."
        $newPath = "$currentPath;$directory"
        [Environment]::SetEnvironmentVariable("Path", $newPath, $pathTarget)
        Write-Success "PATH updated. Please open a new terminal to use the commands."
    }
    else {
        Write-Info "Installation directory is already in the $pathTarget PATH."
    }
}
#endregion

# --- Main Installation Process ---
function Main {
    Clear-Host
    Write-Host "--- .vibe Installer for Windows ---`n"
    
    # 1. Determine Source and Scope
    $sourceInfo = Check-Source
    Write-Info $sourceInfo.Message

    $scope = Get-InstallationScope

    if ($scope -eq 'AllUsers') {
        Elevate-And-Rerun
    }

    # 2. Define Paths
    $installDir = if ($scope -eq 'CurrentUser') {
        Join-Path $env:LOCALAPPDATA "dotvibe"
    } else {
        Join-Path $env:ProgramFiles "dotvibe"
    }
    $binDir = Join-Path $installDir "bin"
    $dataDir = Join-Path $installDir "data"
    $repoRoot = if ($sourceInfo.IsRepo) { (Resolve-Path (Join-Path $PSScriptRoot "..")).Path } else { "." }
    $localBinarySourcePath = if ($sourceInfo.IsRepo) { Join-Path $repoRoot "build" } else { "." }
    
    # 3. Get Binaries (Build or Download)
    if ($sourceInfo.IsRepo) {
        Push-Location $repoRoot
        Build-From-Source
        Pop-Location
    } else {
        Download-From-GitHub
    }
    
    # 4. Install Files
    Write-Info "Creating installation directories in $installDir..."
    New-Item -ItemType Directory -Path $binDir -Force | Out-Null
    New-Item -ItemType Directory -Path $dataDir -Force | Out-Null

    Write-Info "Copying binaries to $binDir..."
    Copy-Item -Path (Join-Path $localBinarySourcePath "vibe.exe") -Destination (Join-Path $binDir "vibe.exe") -Force
    Copy-Item -Path (Join-Path $localBinarySourcePath "vibectl.exe") -Destination (Join-Path $binDir "vibectl.exe") -Force

    if (-not $sourceInfo.IsRepo) {
        if (Test-Path ".\vibe.exe") { Remove-Item ".\vibe.exe" }
        if (Test-Path ".\vibectl.exe") { Remove-Item ".\vibectl.exe" }
    }

    # 5. Update PATH
    Add-To-Path -directory $binDir -scope $scope

    # 6. Install Service (only for system-wide install)
    if ($scope -eq 'AllUsers') {
        Write-Info "Setting up Windows Service (requires Administrator)..."
        $serviceName = "DotVibeDaemon"
        $existingService = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
        if ($existingService) {
            Write-Info "Service '$serviceName' already exists. Re-creating..."
            Stop-Service -Name $serviceName -Force -ErrorAction SilentlyContinue
            sc.exe delete $serviceName
            Start-Sleep -Seconds 2
        }
        
        $servicePath = Join-Path $binDir "vibectl.exe"
        try {
            New-Service -Name $serviceName -BinaryPathName $servicePath -DisplayName "Vibe Daemon" -StartupType Automatic
            Start-Service -Name $serviceName
            Write-Success "Windows Service '$serviceName' created and started."
        }
        catch {
            Write-Warn "Could not set up Windows Service. You can run 'vibectl.exe' manually. Error: $_"
        }
    }

    # 7. Final Instructions
    Write-Host "`n"
    Write-Success "🎉 .vibe has been installed successfully!"
    Write-Info "Installation Path: $installDir"
    if ($scope -eq 'CurrentUser') {
        Write-Warn "The daemon service is not installed for 'Current User' mode."
        Write-Warn "You will need to run 'vibectl' manually in a terminal when you want to use daemon features."
    }
    Write-Warn "IMPORTANT: You must open a new terminal window for the PATH changes to take effect."
}

try {
    Main
}
catch {
    Write-Error "A critical error occurred during installation. Details: $_"
}
