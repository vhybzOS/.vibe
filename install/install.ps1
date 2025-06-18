# Vibe Cross-Platform Installation Script (Windows PowerShell)
# Installs vibe and vibectl system-wide and sets up daemon service

param(
    [string]$Version = "latest",
    [string]$Repo = "yourusername/vibe"  # Update this with actual repo
)

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

# Check dependencies
function Test-Dependencies {
    if (-not (Get-Command curl -ErrorAction SilentlyContinue)) {
        Write-Error "curl is required but not found. Please install curl or use a newer version of Windows"
    }
}

# Get latest version from GitHub
function Get-LatestVersion {
    if ($Version -eq "latest") {
        try {
            $response = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases/latest"
            $Script:Version = $response.tag_name
        }
        catch {
            Write-Error "Failed to get latest version: $_"
        }
    }
    Write-Info "Installing version: $Version"
}

# Download and install binaries
function Install-Binaries {
    Write-Info "Creating installation directory: $InstallDir"
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
    
    # Download Windows binaries
    $vibeUrl = "https://github.com/$Repo/releases/download/$Version/vibe-windows-x86_64.exe"
    $vibectlUrl = "https://github.com/$Repo/releases/download/$Version/vibectl-windows-x86_64.exe"
    
    Write-Info "Downloading vibe binary..."
    curl.exe -L $vibeUrl -o "$InstallDir\vibe.exe"
    
    Write-Info "Downloading vibectl binary..."
    curl.exe -L $vibectlUrl -o "$InstallDir\vibectl.exe"
    
    # Add to system PATH
    $currentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")
    if ($currentPath -notlike "*$InstallDir*") {
        Write-Info "Adding $InstallDir to system PATH"
        [Environment]::SetEnvironmentVariable("Path", "$currentPath;$InstallDir", "Machine")
    }
    
    Write-Success "Binaries installed successfully"
}

# Setup Windows Service
function Install-Service {
    Write-Info "Setting up Windows Service..."
    
    # Create data directories
    New-Item -ItemType Directory -Path $DataDir -Force | Out-Null
    New-Item -ItemType Directory -Path "$DataDir\logs" -Force | Out-Null
    
    # Check if service already exists
    $existingService = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if ($existingService) {
        Write-Info "Service already exists, removing old service..."
        Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
        & sc.exe delete $ServiceName
        Start-Sleep -Seconds 2
    }
    
    # Create Windows Service
    $servicePath = "`"$InstallDir\vibectl.exe`""
    $result = & sc.exe create $ServiceName binpath= $servicePath start= auto DisplayName= "Vibe Daemon (dotvibe.dev)"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to create service: $result"
    }
    
    # Configure service
    & sc.exe description $ServiceName "Vibe background daemon service for development workflow automation"
    & sc.exe config $ServiceName obj= "NT AUTHORITY\SYSTEM"
    
    # Start the service
    Write-Info "Starting Vibe service..."
    Start-Service -Name $ServiceName
    
    Write-Success "Windows Service configured and started"
}

# Verify installation
function Test-Installation {
    Write-Info "Verifying installation..."
    
    # Refresh environment variables for current session
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
    
    # Test vibe command
    try {
        $vibeVersion = & "$InstallDir\vibe.exe" --version 2>$null
        Write-Success "vibe command is available"
    }
    catch {
        Write-Error "vibe command not working properly"
    }
    
    # Test vibectl command
    try {
        $vibectlVersion = & "$InstallDir\vibectl.exe" --version 2>$null
        Write-Success "vibectl command is available"
    }
    catch {
        Write-Error "vibectl command not working properly"
    }
    
    # Check service status
    $service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if ($service -and $service.Status -eq "Running") {
        Write-Success "Vibe daemon service is running"
    }
    else {
        Write-Warn "Vibe daemon service is not running. Check Windows Event Log for details"
    }
}

# Main installation process
function Main {
    Write-Info "Starting Vibe installation for Windows..."
    
    Test-Permissions
    Test-Dependencies
    Get-LatestVersion
    Install-Binaries
    Install-Service
    Test-Installation
    
    Write-Success "Vibe installation completed!"
    Write-Info "You can now use 'vibe' and 'vibectl' commands"
    Write-Info "Daemon service is configured to start automatically"
    Write-Info "You may need to restart your terminal to use the commands"
}

# Run main function
Main