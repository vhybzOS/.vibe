#!/bin/bash
set -euo pipefail

# Vibe Cross-Platform Installation Script (Unix)
# Installs vibe and vibectl system-wide and sets up daemon service

VERSION="${1:-latest}"
INSTALL_DIR="/usr/local/dotvibe"
BIN_DIR="/usr/local/bin"
SERVICE_DIR="/etc/systemd/system"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
REPO="yourusername/vibe"  # Update this with actual repo

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

# Check if running as root for system installation
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

# Check dependencies
check_dependencies() {
    if ! command -v curl &> /dev/null; then
        error "curl is required but not installed"
    fi
    
    if ! command -v tar &> /dev/null; then
        error "tar is required but not installed"
    fi
}

# Get latest version from GitHub
get_latest_version() {
    if [[ "$VERSION" == "latest" ]]; then
        VERSION=$(curl -s "https://api.github.com/repos/$REPO/releases/latest" | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')
        if [[ -z "$VERSION" ]]; then
            error "Failed to get latest version"
        fi
    fi
    log "Installing version: $VERSION"
}

# Download and install binaries
install_binaries() {
    log "Creating installation directory: $INSTALL_DIR"
    mkdir -p "$INSTALL_DIR"
    
    # Download binaries based on platform
    local vibe_binary="vibe-${PLATFORM}-x86_64"
    local vibectl_binary="vibectl-${PLATFORM}-x86_64"
    
    if [[ "$PLATFORM" == "windows" ]]; then
        vibe_binary="${vibe_binary}.exe"
        vibectl_binary="${vibectl_binary}.exe"
    fi
    
    log "Downloading vibe binary..."
    curl -L "https://github.com/$REPO/releases/download/$VERSION/$vibe_binary" -o "$INSTALL_DIR/vibe"
    
    log "Downloading vibectl binary..."
    curl -L "https://github.com/$REPO/releases/download/$VERSION/$vibectl_binary" -o "$INSTALL_DIR/vibectl"
    
    # Make binaries executable
    chmod +x "$INSTALL_DIR/vibe"
    chmod +x "$INSTALL_DIR/vibectl"
    
    # Create symlinks to bin directory
    ln -sf "$INSTALL_DIR/vibe" "$BIN_DIR/vibe"
    ln -sf "$INSTALL_DIR/vibectl" "$BIN_DIR/vibectl"
    
    success "Binaries installed successfully"
}

# Setup daemon service
setup_daemon() {
    if [[ "$PLATFORM" == "linux" ]]; then
        setup_systemd_service
    elif [[ "$PLATFORM" == "macos" ]]; then
        setup_launchd_service
    fi
}

# Setup systemd service (Linux)
setup_systemd_service() {
    log "Setting up systemd service..."
    
    # Create service directories
    mkdir -p /var/lib/vibe
    mkdir -p /var/log/vibe
    
    # Copy service file (assuming it's bundled with the release)
    curl -L "https://raw.githubusercontent.com/$REPO/$VERSION/install/service-templates/vibe.service" -o "$SERVICE_DIR/vibe.service"
    
    # Reload systemd and enable service
    systemctl daemon-reload
    systemctl enable vibe.service
    systemctl start vibe.service
    
    success "Systemd service configured and started"
}

# Setup LaunchDaemon (macOS)
setup_launchd_service() {
    log "Setting up LaunchAgent..."
    
    # Create necessary directories
    mkdir -p /usr/local/var/lib/vibe
    mkdir -p /usr/local/var/log
    
    # Use user's LaunchAgents directory for user-level daemon
    mkdir -p "$LAUNCH_AGENTS_DIR"
    
    # Download and install LaunchAgent plist
    curl -L "https://raw.githubusercontent.com/$REPO/$VERSION/install/service-templates/dev.dotvibe.daemon.plist" -o "$LAUNCH_AGENTS_DIR/dev.dotvibe.daemon.plist"
    
    # Load the service
    launchctl load "$LAUNCH_AGENTS_DIR/dev.dotvibe.daemon.plist"
    
    success "LaunchAgent configured and loaded"
}

# Verify installation
verify_installation() {
    log "Verifying installation..."
    
    if command -v vibe &> /dev/null; then
        success "vibe command is available"
        vibe --version || true
    else
        error "vibe command not found in PATH"
    fi
    
    if command -v vibectl &> /dev/null; then
        success "vibectl command is available"
        vibectl --version || true
    else
        error "vibectl command not found in PATH"
    fi
    
    # Check daemon status
    if [[ "$PLATFORM" == "linux" ]]; then
        if systemctl is-active --quiet vibe.service; then
            success "Vibe daemon is running"
        else
            warn "Vibe daemon is not running. Check logs with: journalctl -u vibe.service"
        fi
    elif [[ "$PLATFORM" == "macos" ]]; then
        if launchctl list | grep -q "dev.dotvibe.daemon"; then
            success "Vibe daemon is loaded"
        else
            warn "Vibe daemon is not loaded"
        fi
    fi
}

# Main installation process
main() {
    log "Starting Vibe installation..."
    
    check_permissions
    detect_platform
    check_dependencies
    get_latest_version
    install_binaries
    setup_daemon
    verify_installation
    
    success "Vibe installation completed!"
    log "You can now use 'vibe' and 'vibectl' commands"
    log "Daemon service is configured to start automatically"
}

# Run main function
main "$@"