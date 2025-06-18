# Vibe Installation Guide

This directory contains cross-platform installation scripts for Vibe and its daemon service.

## Quick Install

### Linux / macOS
```bash
curl -fsSL https://raw.githubusercontent.com/yourusername/vibe/main/install/install.sh | sudo bash
```

### Windows
```powershell
# Run as Administrator
Invoke-Expression (Invoke-WebRequest -Uri "https://raw.githubusercontent.com/yourusername/vibe/main/install/install.ps1" -UseBasicParsing).Content
```

## Manual Installation

### 1. Download Installation Scripts

**Linux/macOS:**
```bash
curl -O https://raw.githubusercontent.com/yourusername/vibe/main/install/install.sh
chmod +x install.sh
sudo ./install.sh
```

**Windows:**
```powershell
# Run PowerShell as Administrator
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/yourusername/vibe/main/install/install.ps1" -OutFile "install.ps1"
.\install.ps1
```

### 2. Install Specific Version

```bash
# Linux/macOS
sudo ./install.sh v1.2.3

# Windows
.\install.ps1 -Version "v1.2.3"
```

## What Gets Installed

### Binaries
- **`vibe`** - Main CLI tool
- **`vibectl`** - Daemon control tool

### Installation Locations

**Linux/macOS:**
- Binaries: `/usr/local/dotvibe/vibe`, `/usr/local/dotvibe/vibectl`
- Symlinks: `/usr/local/bin/vibe`, `/usr/local/bin/vibectl`
- Service: `/etc/systemd/system/vibe.service` (Linux) or `~/Library/LaunchAgents/dev.dotvibe.daemon.plist` (macOS)

**Windows:**
- Binaries: `%PROGRAMFILES%\dotvibe\vibe.exe`, `%PROGRAMFILES%\dotvibe\vibectl.exe`
- PATH: `%PROGRAMFILES%\dotvibe` added to system PATH
- Service: Windows Service named "DotVibeDaemon"

### System Services

The installation automatically sets up a daemon service that:
- Starts automatically on system boot
- Runs in the background
- Provides development workflow automation
- Manages project discovery and monitoring

## Verification

After installation, verify everything is working:

```bash
# Check command availability
vibe --version
vibectl --version

# Check daemon status
# Linux
systemctl status vibe.service

# macOS
launchctl list | grep dev.dotvibe.daemon

# Windows
Get-Service DotVibeDaemon
```

## Uninstallation

### Linux/macOS
```bash
curl -O https://raw.githubusercontent.com/yourusername/vibe/main/install/uninstall.sh
chmod +x uninstall.sh
sudo ./uninstall.sh
```

### Windows
```powershell
# Run as Administrator
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/yourusername/vibe/main/install/uninstall.ps1" -OutFile "uninstall.ps1"
.\uninstall.ps1
```

## Troubleshooting

### Common Issues

**Permission Errors:**
- Ensure you're running as administrator/root
- Check file permissions on installation scripts

**Service Not Starting:**
- Check system logs for error messages
- Verify binary permissions and paths
- Ensure required dependencies are installed

**Command Not Found:**
- Restart your terminal/shell
- Check that installation directory is in PATH
- Verify symlinks are created correctly

### Platform-Specific Issues

**Linux:**
```bash
# Check service status
systemctl status vibe.service

# View service logs
journalctl -u vibe.service -f

# Manual service management
sudo systemctl start vibe.service
sudo systemctl stop vibe.service
sudo systemctl restart vibe.service
```

**macOS:**
```bash
# Check LaunchAgent status
launchctl list | grep dev.dotvibe.daemon

# View logs
tail -f /usr/local/var/log/vibe-daemon.log

# Manual service management
launchctl load ~/Library/LaunchAgents/dev.dotvibe.daemon.plist
launchctl unload ~/Library/LaunchAgents/dev.dotvibe.daemon.plist
```

**Windows:**
```powershell
# Check service status
Get-Service DotVibeDaemon

# View event logs
Get-EventLog -LogName Application -Source "DotVibeDaemon" -Newest 10

# Manual service management
Start-Service DotVibeDaemon
Stop-Service DotVibeDaemon
Restart-Service DotVibeDaemon
```

## Advanced Installation

### Custom Installation Directory

**Linux/macOS:**
```bash
# Edit the script and modify INSTALL_DIR variable
sudo INSTALL_DIR="/opt/vibe" ./install.sh
```

**Windows:**
```powershell
# Not supported - uses standard Program Files location
```

### Service Configuration

Service templates are located in `service-templates/`:
- `vibe.service` - Linux systemd service
- `dev.dotvibe.daemon.plist` - macOS LaunchAgent
- `vibe-service.xml` - Windows Service configuration

You can customize these templates before installation if needed.

## Dependencies

### Required
- **Deno** - Runtime for the application
- **curl** - For downloading installation files
- **System permissions** - Administrator/root access for system-wide installation

### Platform-Specific
- **Linux**: systemd (for service management)
- **macOS**: launchd (built-in)
- **Windows**: Windows Service Manager (built-in)

## Security Considerations

- Installation requires administrator privileges
- Binaries are installed to system directories
- Service runs with system privileges
- All network communication is local-only by default

## Support

For installation issues:
1. Check the troubleshooting section above
2. Review system-specific logs
3. Open an issue at: https://github.com/yourusername/vibe/issues

## File Structure

```
install/
├── install.sh              # Unix installation script
├── install.ps1             # Windows installation script
├── uninstall.sh            # Unix removal script
├── uninstall.ps1           # Windows removal script
├── service-templates/      # Service configuration templates
│   ├── vibe.service        # Linux systemd service
│   ├── dev.dotvibe.daemon.plist # macOS LaunchAgent
│   └── vibe-service.xml    # Windows Service config
└── README.md              # This documentation
```