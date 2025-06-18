#!/bin/bash
set -eo pipefail

# Vibe Uninstallation Script (Unix: Linux & macOS)
#
# This smart script detects where .vibe was installed (Current User or All Users)
# and completely removes all associated files, PATH entries, and services.
#
# @version 1.2.0

# --- Color Definitions ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# --- Logging Helpers ---
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1" >&2; exit 1; }

# --- System & Uninstallation Logic ---
detect_platform() {
    case "$(uname -s)" in
        Darwin*) PLATFORM="macos" ;;
        Linux*) PLATFORM="linux" ;;
        *) log_error "Unsupported platform: $(uname -s)" ;;
    esac
}

find_installation() {
    # Define potential installation paths
    USER_INSTALL_DIR="$HOME/.local/share/dotvibe"
    USER_BIN_DIR="$HOME/.local/bin"
    SYSTEM_INSTALL_DIR="/usr/local/share/dotvibe"
    SYSTEM_BIN_DIR="/usr/local/bin"

    # Check for user-level installation first
    if [ -d "$USER_INSTALL_DIR" ] || [ -f "$USER_BIN_DIR/vibe" ]; then
        INSTALL_PATH="$USER_INSTALL_DIR"
        BIN_PATH="$USER_BIN_DIR"
        INSTALL_SCOPE="CurrentUser"
    # Then check for system-level installation
    elif [ -d "$SYSTEM_INSTALL_DIR" ] || [ -f "$SYSTEM_BIN_DIR/vibe" ]; then
        INSTALL_PATH="$SYSTEM_INSTALL_DIR"
        BIN_PATH="$SYSTEM_BIN_DIR"
        INSTALL_SCOPE="AllUsers"
    else
        INSTALL_PATH=""
    fi
}

remove_service() {
    log_info "Attempting to stop and remove daemon service..."
    if [[ "$PLATFORM" == "linux" ]]; then
        if [[ "$INSTALL_SCOPE" == "CurrentUser" ]]; then
            # Stop and disable user service
            systemctl --user stop vibe.service &>/dev/null || true
            systemctl --user disable vibe.service &>/dev/null || true
            rm -f "$HOME/.config/systemd/user/vibe.service"
            systemctl --user daemon-reload
        else
            # Stop and disable system service
            systemctl stop vibe.service &>/dev/null || true
            systemctl disable vibe.service &>/dev/null || true
            rm -f "/etc/systemd/system/vibe.service"
            systemctl daemon-reload
        fi
        log_success "Systemd service (if it existed) has been removed."
    elif [[ "$PLATFORM" == "macos" ]]; a
        local label="dev.dotvibe.daemon"
        local plist_path_user="$HOME/Library/LaunchAgents/$label.plist"
        local plist_path_system="/Library/LaunchDaemons/$label.plist"
        
        # Unload and remove both potential plist files
        if [ -f "$plist_path_user" ]; then
            launchctl unload "$plist_path_user" 2>/dev/null || true
            rm -f "$plist_path_user"
        fi
        if [ -f "$plist_path_system" ]; then
            launchctl unload "$plist_path_system" 2>/dev/null || true
            rm -f "$plist_path_system"
        fi
        log_success "Launchd service (if it existed) has been removed."
    fi
}

remove_from_path() {
    local bin_dir="$1"
    local shell_configs=("$HOME/.bashrc" "$HOME/.zshrc" "$HOME/.profile" "$HOME/.bash_profile" "$HOME/.config/fish/config.fish")
    
    log_info "Removing '$bin_dir' from shell configuration files..."
    
    for config_file in "${shell_configs[@]}"; do
        if [ -f "$config_file" ]; then
            # Use sed to remove the line(s) referencing the bin directory.
            # The .bak extension is for cross-platform sed compatibility.
            sed -i.bak -e "\|$bin_dir|d" "$config_file"
            # Clean up the backup file created by sed
            rm -f "${config_file}.bak"
        fi
    done
    log_success "PATH entries removed from shell profiles."
}

remove_files() {
    log_info "Removing installation directory: $INSTALL_PATH..."
    if [ -d "$INSTALL_PATH" ]; then
        rm -rf "$INSTALL_PATH"
        log_success "Installation directory removed."
    else
        log_warn "Installation directory not found, skipping."
    fi

    log_info "Removing binaries from $BIN_PATH..."
    if [ -f "$BIN_PATH/vibe" ]; then rm -f "$BIN_PATH/vibe"; fi
    if [ -f "$BIN_PATH/vibectl" ]; then rm -f "$BIN_PATH/vibectl"; fi
    log_success "Binaries removed."
}

# --- Main Uninstallation Process ---
main() {
    echo -e "--- .vibe Uninstaller for Linux & macOS ---\n"
    
    detect_platform
    find_installation

    if [ -z "$INSTALL_PATH" ]; then
        log_success ".vibe installation not found. Nothing to do."
        exit 0
    fi
    
    log_info "Found .vibe installation for $INSTALL_SCOPE at: $INSTALL_PATH"

    if [[ "$INSTALL_SCOPE" == "AllUsers" ]] && [[ $EUID -ne 0 ]]; then
        log_warn "System-wide uninstallation requires sudo privileges."
        log_info "Re-running script with sudo..."
        sudo bash "$0" "$@"
        exit 0
    fi
    
    read -p "Are you sure you want to completely remove .vibe? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_warn "Uninstallation cancelled by user."
        exit 0
    fi

    remove_service
    remove_from_path "$BIN_PATH"
    remove_files

    echo ""
    log_success "🎉 .vibe has been uninstalled successfully."
    log_warn "Please open a new terminal for all changes to take full effect."
}

main "$@"
