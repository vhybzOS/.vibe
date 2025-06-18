#!/bin/bash
set -euo pipefail

# Vibe Uninstallation Script (Unix)
# Removes vibe and vibectl from system and stops daemon service

INSTALL_DIR="/usr/local/dotvibe"
BIN_DIR="/usr/local/bin"
SERVICE_DIR="/etc/systemd/system"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Check if running as root for system uninstallation
check_permissions() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root (use sudo)"
    fi
}

# Detect platform
detect_platform() {
    case "$(uname -s)" in
        Darwin*)    PLATFORM="macos" ;;
        Linux*)     PLATFORM="linux" ;;
        *)          error "Unsupported platform: $(uname -s)" ;;
    esac
    log "Detected platform: $PLATFORM"
}

# Stop and remove daemon service
remove_daemon() {
    if [[ "$PLATFORM" == "linux" ]]; then
        remove_systemd_service
    elif [[ "$PLATFORM" == "macos" ]]; then
        remove_launchd_service
    fi
}

# Remove systemd service (Linux)
remove_systemd_service() {
    log "Removing systemd service..."
    
    if systemctl is-active --quiet vibe.service 2>/dev/null; then
        log "Stopping vibe service..."
        systemctl stop vibe.service
    fi
    
    if systemctl is-enabled --quiet vibe.service 2>/dev/null; then
        log "Disabling vibe service..."
        systemctl disable vibe.service
    fi
    
    if [[ -f "$SERVICE_DIR/vibe.service" ]]; then
        rm -f "$SERVICE_DIR/vibe.service"
        systemctl daemon-reload
        success "Systemd service removed"
    else
        warn "Systemd service file not found"
    fi
    
    # Remove service directories
    if [[ -d "/var/lib/vibe" ]]; then
        rm -rf /var/lib/vibe
        log "Removed /var/lib/vibe"
    fi
    
    if [[ -d "/var/log/vibe" ]]; then
        rm -rf /var/log/vibe
        log "Removed /var/log/vibe"
    fi
}

# Remove LaunchDaemon (macOS)
remove_launchd_service() {
    log "Removing LaunchAgent..."
    
    local plist_path="$LAUNCH_AGENTS_DIR/dev.dotvibe.daemon.plist"
    
    if [[ -f "$plist_path" ]]; then
        # Unload the service
        launchctl unload "$plist_path" 2>/dev/null || true
        
        # Remove the plist file
        rm -f "$plist_path"
        success "LaunchAgent removed"
    else
        warn "LaunchAgent plist not found"
    fi
    
    # Remove service directories
    if [[ -d "/usr/local/var/lib/vibe" ]]; then
        rm -rf /usr/local/var/lib/vibe
        log "Removed /usr/local/var/lib/vibe"
    fi
    
    if [[ -f "/usr/local/var/log/vibe-daemon.log" ]]; then
        rm -f /usr/local/var/log/vibe-daemon.log
        log "Removed daemon log files"
    fi
    
    if [[ -f "/usr/local/var/log/vibe-daemon.error.log" ]]; then
        rm -f /usr/local/var/log/vibe-daemon.error.log
    fi
}

# Remove binaries and symlinks
remove_binaries() {
    log "Removing binaries and symlinks..."
    
    # Remove symlinks from bin directory
    if [[ -L "$BIN_DIR/vibe" ]]; then
        rm -f "$BIN_DIR/vibe"
        log "Removed vibe symlink"
    fi
    
    if [[ -L "$BIN_DIR/vibectl" ]]; then
        rm -f "$BIN_DIR/vibectl"
        log "Removed vibectl symlink"
    fi
    
    # Remove installation directory
    if [[ -d "$INSTALL_DIR" ]]; then
        rm -rf "$INSTALL_DIR"
        success "Removed installation directory: $INSTALL_DIR"
    else
        warn "Installation directory not found: $INSTALL_DIR"
    fi
}

# Verify uninstallation
verify_uninstallation() {
    log "Verifying uninstallation..."
    
    if command -v vibe &> /dev/null; then
        warn "vibe command still found in PATH"
    else
        success "vibe command removed from PATH"
    fi
    
    if command -v vibectl &> /dev/null; then
        warn "vibectl command still found in PATH"
    else
        success "vibectl command removed from PATH"
    fi
    
    # Check daemon status
    if [[ "$PLATFORM" == "linux" ]]; then
        if systemctl is-active --quiet vibe.service 2>/dev/null; then
            warn "Vibe daemon service is still running"
        else
            success "Vibe daemon service stopped"
        fi
    elif [[ "$PLATFORM" == "macos" ]]; then
        if launchctl list | grep -q "dev.dotvibe.daemon" 2>/dev/null; then
            warn "Vibe daemon is still loaded in launchctl"
        else
            success "Vibe daemon removed from launchctl"
        fi
    fi
}

# Main uninstallation process
main() {
    log "Starting Vibe uninstallation..."
    
    check_permissions
    detect_platform
    remove_daemon
    remove_binaries
    verify_uninstallation
    
    success "Vibe uninstallation completed!"
    log "All Vibe components have been removed from the system"
}

# Run main function
main "$@"