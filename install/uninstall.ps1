# Vibe Uninstallation Script (Windows PowerShell)
# Removes vibe and vibectl from system and stops daemon service

$ErrorActionPreference = "Stop"

# Installation paths
$InstallDir = "${env:ProgramFiles}\dotvibe"
$DataDir = "${env:ProgramData}\dotvibe"
$ServiceName = "DotVibeDaemon"

# Colors for output
function Write-Info($message) {
    Write-Host "[INFO] $message" -ForegroundColor Blue
}

function Write-Success($message) {
    Write-Host "[SUCCESS] $message" -ForegroundColor Green
}

function Write-Warn($message) {
    Write-Host "[WARN] $message" -ForegroundColor Yellow
}

function Write-Error($message) {
    Write-Host "[ERROR] $message" -ForegroundColor Red
    exit 1
}

# Check if running as administrator
function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Check permissions
function Test-Permissions {
    if (-not (Test-Administrator)) {
        Write-Error "This script must be run as Administrator"
    }
}

# Remove Windows Service
function Remove-Service {
    Write-Info "Removing Windows Service..."
    
    $service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if ($service) {
        if ($service.Status -eq "Running") {
            Write-Info "Stopping Vibe service..."
            Stop-Service -Name $ServiceName -Force
        }
        
        Write-Info "Removing Vibe service..."
        & sc.exe delete $ServiceName
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Windows Service removed successfully"
        }
        else {
            Write-Warn "Failed to remove Windows Service"
        }
    }
    else {
        Write-Warn "Windows Service not found"
    }
}

# Remove binaries and directories
function Remove-Binaries {
    Write-Info "Removing binaries and directories..."
    
    # Remove from system PATH
    $currentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")
    if ($currentPath -like "*$InstallDir*") {
        Write-Info "Removing $InstallDir from system PATH"
        $newPath = $currentPath -replace [regex]::Escape(";$InstallDir"), ""
        $newPath = $newPath -replace [regex]::Escape("$InstallDir;"), ""
        $newPath = $newPath -replace [regex]::Escape($InstallDir), ""
        [Environment]::SetEnvironmentVariable("Path", $newPath, "Machine")
        Write-Success "Removed from system PATH"
    }
    
    # Remove installation directory
    if (Test-Path $InstallDir) {
        Remove-Item -Path $InstallDir -Recurse -Force
        Write-Success "Removed installation directory: $InstallDir"
    }
    else {
        Write-Warn "Installation directory not found: $InstallDir"
    }
    
    # Remove data directory
    if (Test-Path $DataDir) {
        Remove-Item -Path $DataDir -Recurse -Force
        Write-Success "Removed data directory: $DataDir"
    }
    else {
        Write-Warn "Data directory not found: $DataDir"
    }
}

# Verify uninstallation
function Test-Uninstallation {
    Write-Info "Verifying uninstallation..."
    
    # Refresh environment variables for current session
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
    
    # Test if commands are still available
    if (Get-Command vibe -ErrorAction SilentlyContinue) {
        Write-Warn "vibe command still found in PATH"
    }
    else {
        Write-Success "vibe command removed from PATH"
    }
    
    if (Get-Command vibectl -ErrorAction SilentlyContinue) {
        Write-Warn "vibectl command still found in PATH"
    }
    else {
        Write-Success "vibectl command removed from PATH"
    }
    
    # Check service status
    $service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if ($service) {
        Write-Warn "Vibe daemon service still exists"
    }
    else {
        Write-Success "Vibe daemon service removed"
    }
    
    # Check directories
    if (Test-Path $InstallDir) {
        Write-Warn "Installation directory still exists: $InstallDir"
    }
    else {
        Write-Success "Installation directory removed"
    }
    
    if (Test-Path $DataDir) {
        Write-Warn "Data directory still exists: $DataDir"
    }
    else {
        Write-Success "Data directory removed"
    }
}

# Main uninstallation process
function Main {
    Write-Info "Starting Vibe uninstallation for Windows..."
    
    Test-Permissions
    Remove-Service
    Remove-Binaries
    Test-Uninstallation
    
    Write-Success "Vibe uninstallation completed!"
    Write-Info "All Vibe components have been removed from the system"
    Write-Info "You may need to restart your terminal for PATH changes to take effect"
}

# Run main function
Main