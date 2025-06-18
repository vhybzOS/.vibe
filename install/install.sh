#!/bin/bash
set -eo pipefail

# Vibe Cross-Platform Installation Script (Unix: Linux & macOS)
#
# This smart script handles two scenarios:
# 1. Developer Mode: If run from a cloned repo, it builds from local source.
# 2. User Mode: If run standalone, it downloads the latest release from GitHub.
#
# It provides installation scope choices and handles `sudo` elevation automatically.
#
# @version 1.3.0

# --- Parameters and Initial Setup ---
VERSION="${1:-latest}"
REPO="vhybzOS/.vibe" # Official repository

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

# --- System Check Helpers ---
check_dependencies() {
    if ! command -v curl &>/dev/null; then log_error "cURL is required but not installed."; fi
}

detect_platform() {
    case "$(uname -s)" in
        Darwin*) PLATFORM="macos" ;;
        Linux*) PLATFORM="linux" ;;
        *) log_error "Unsupported platform: $(uname -s)" ;;
    esac
    log_info "Detected platform: $PLATFORM"
}

check_source() {
    # Using BASH_SOURCE to be robust even if the script is sourced or called via symlink
    SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" &>/dev/null && pwd)
    REPO_ROOT=$(cd "$SCRIPT_DIR/.." &>/dev/null && pwd)
    DENO_JSON_PATH="$REPO_ROOT/deno.json"

    if [[ -f "$DENO_JSON_PATH" ]] && grep -q '"name": "dotvibe"' "$DENO_JSON_PATH"; then
        IS_REPO_INSTALL="true"
        log_info "Developer repo mode detected."
    else
        IS_REPO_INSTALL="false"
        log_info "Standalone user mode detected."
    fi
}

# --- Core Logic ---
get_latest_version() {
    if [[ "$VERSION" == "latest" ]]; then
        log_info "Fetching latest release version from GitHub..."
        # Replaced jq with a more universal grep/sed combination.
        # This pipeline finds the "tag_name" line, extracts the value, and removes quotes/commas.
        LATEST_TAG=$(curl -s "https://api.github.com/repos/$REPO/releases/latest" | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')
        
        if [[ -z "$LATEST_TAG" ]]; then
            log_error "Failed to get latest version from GitHub."
        fi
        VERSION="$LATEST_TAG"
    fi
    log_info "Targeting version: $VERSION"
}

build_from_source() {
    log_info "Building binaries from local source..."
    if ! command -v deno &>/dev/null; then log_error "Deno is required to build from source but not found in PATH."; fi
    
    (cd "$REPO_ROOT" && deno task build:all) || log_error "Failed to build binaries from source."
    log_success "Binaries built successfully."
}

download_from_github() {
    get_latest_version
    # Use the version in the URL, as per the release workflow
    local vibe_binary_url="https://github.com/$REPO/releases/download/$VERSION/vibe-$VERSION-${PLATFORM}-x86_64"
    local vibectl_binary_url="https://github.com/$REPO/releases/download/$VERSION/vibectl-$VERSION-${PLATFORM}-x86_64"

    log_info "Downloading vibe binary..."
    curl -# -L "$vibe_binary_url" -o "./vibe"
    log_info "Downloading vibectl binary..."
    curl -# -L "$vibectl_binary_url" -o "./vibectl"
    
    chmod +x ./vibe ./vibectl
    log_success "Binaries downloaded successfully."
}

add_to_path() {
    local bin_dir="$1"
    local shell_config_file=""
    local shell_name
    shell_name=$(basename "$SHELL")

    case "$shell_name" in
        bash) shell_config_file="$HOME/.bashrc" ;;
        zsh) shell_config_file="$HOME/.zshrc" ;;
        fish) shell_config_file="$HOME/.config/fish/config.fish" ;;
        *) log_warn "Could not detect shell. Please add '$bin_dir' to your PATH manually."; return ;;
    esac

    if ! grep -q "export PATH=\"$bin_dir:\$PATH\"" "$shell_config_file" &>/dev/null; then
        log_info "Adding '$bin_dir' to your PATH in '$shell_config_file'..."
        if [[ "$shell_name" == "fish" ]]; then
            echo -e "\nfish_add_path \"$bin_dir\"" >> "$shell_config_file"
        else
            echo -e "\n# Add .vibe to PATH\nexport PATH=\"$bin_dir:\$PATH\"" >> "$shell_config_file"
        fi
        log_warn "You must source your profile ('source $shell_config_file') or open a new terminal for changes to take effect."
    else
        log_info "Installation directory is already in your PATH."
    fi
}

setup_service() {
    local bin_dir="$1"
    local install_scope="$2"

    if [[ "$PLATFORM" == "linux" ]]; then
        setup_systemd_service "$bin_dir" "$install_scope"
    elif [[ "$PLATFORM" == "macos" ]]; then
        setup_launchd_service "$bin_dir" "$install_scope"
    fi
}

setup_systemd_service() {
    local bin_dir="$1"
    local install_scope="$2"
    
    if [[ "$install_scope" == "CurrentUser" ]]; then
        log_info "Setting up user-level systemd service..."
        local service_dir="$HOME/.config/systemd/user"
        mkdir -p "$service_dir"
        
        # User-level service definition
        cat > "$service_dir/vibe.service" << EOF_SYSTEMD
[Unit]
Description=Vibe Daemon
After=network.target

[Service]
ExecStart=$bin_dir/vibectl
Restart=always

[Install]
WantedBy=default.target
EOF_SYSTEMD
        systemctl --user daemon-reload
        systemctl --user enable --now vibe.service
        log_success "User-level systemd service configured and started."
    else
        log_info "Setting up system-wide systemd service..."
        cat > "/etc/systemd/system/vibe.service" << EOF_SYSTEMD
[Unit]
Description=Vibe Daemon
After=network.target

[Service]
ExecStart=$bin_dir/vibectl
Restart=always
User=root

[Install]
WantedBy=multi-user.target
EOF_SYSTEMD
        systemctl daemon-reload
        systemctl enable --now vibe.service
        log_success "System-wide systemd service configured and started."
    fi
}

setup_launchd_service() {
    local bin_dir="$1"
    local install_scope="$2"
    local label="dev.dotvibe.daemon"
    local plist_path

    if [[ "$install_scope" == "CurrentUser" ]]; then
        log_info "Setting up user-level LaunchAgent..."
        plist_path="$HOME/Library/LaunchAgents/$label.plist"
        mkdir -p "$(dirname "$plist_path")"
    else
        log_info "Setting up system-wide LaunchDaemon..."
        plist_path="/Library/LaunchDaemons/$label.plist"
    fi

    cat > "$plist_path" << EOF_PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>$label</string>
    <key>ProgramArguments</key>
    <array>
        <string>$bin_dir/vibectl</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
EOF_PLIST

    launchctl unload "$plist_path" 2>/dev/null || true
    launchctl load "$plist_path"
    log_success "Launch service configured and loaded."
}

# --- Main Installation Process ---
main() {
    echo -e "--- .vibe Installer for Linux & macOS ---\n"
    
    detect_platform
    check_dependencies
    check_source

    echo -e "${YELLOW}Choose installation scope:${NC}"
    echo "  [1] Current User (Recommended, no sudo needed)"
    echo "  [2] All Users (System-wide, requires sudo)"
    read -p "Enter your choice (1/2): " choice

    local install_dir bin_dir
    if [[ "$choice" == "1" ]]; then
        INSTALL_SCOPE="CurrentUser"
        install_dir="$HOME/.local/share/dotvibe"
        bin_dir="$HOME/.local/bin"
    elif [[ "$choice" == "2" ]]; then
        INSTALL_SCOPE="AllUsers"
        install_dir="/usr/local/share/dotvibe"
        bin_dir="/usr/local/bin"
        if [[ $EUID -ne 0 ]]; then
            log_warn "System-wide installation requires sudo privileges."
            log_info "Re-running script with sudo..."
            sudo bash "$0" "$@"
            exit 0
        fi
    else
        log_error "Invalid choice. Aborting."
    fi

    local local_binary_source_path
    if [[ "$IS_REPO_INSTALL" == "true" ]]; then
        build_from_source
        local_binary_source_path="$REPO_ROOT/build"
    else
        download_from_github
        local_binary_source_path="."
    fi

    log_info "Creating installation directories..."
    mkdir -p "$install_dir"
    mkdir -p "$bin_dir"

    log_info "Installing binaries to $bin_dir..."
    # Using mv is fine since the source is temporary
    mv "$local_binary_source_path/vibe" "$bin_dir/vibe"
    mv "$local_binary_source_path/vibectl" "$bin_dir/vibectl"
    
    add_to_path "$bin_dir"
    setup_service "$bin_dir" "$INSTALL_SCOPE"

    echo ""
    log_success "🎉 .vibe has been installed successfully!"
    log_info "Installation Path: $install_dir"
}

main "$@"
