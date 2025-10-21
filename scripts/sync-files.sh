#!/bin/bash
set -e

# File Synchronization Script for My Jarvis Desktop
# Purpose: Sync specific files/directories to workspace without breaking initialization
# Can be run multiple times safely - won't overwrite existing user files

WORKSPACE="/workspace"
TEMPLATE_DIR="/app/workspace-template"

echo ""
echo "=========================================="
echo "  My Jarvis Desktop - File Sync Script"
echo "=========================================="
echo ""

# Color codes for better output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to sync a directory
sync_directory() {
    local src="$1"
    local dest="$2"
    local name="$3"

    echo -e "${BLUE}[Sync]${NC} Syncing: ${name}"

    if [ ! -d "$src" ]; then
        echo -e "${YELLOW}[Sync]${NC} ⚠️  Source not found: $src"
        echo -e "${YELLOW}[Sync]${NC} Skipping $name"
        return 1
    fi

    # Create destination parent directory if it doesn't exist
    mkdir -p "$(dirname "$dest")"

    # Sync files using rsync
    # --archive: preserve permissions, timestamps, etc.
    # --verbose: show what's being copied
    # --ignore-existing: don't overwrite existing files (safe mode)
    # --update: only copy if source is newer
    rsync -av --ignore-existing --update "$src/" "$dest/"

    local file_count=$(find "$dest" -type f | wc -l)
    echo -e "${GREEN}[Sync]${NC} ✅ $name synced ($file_count files total)"
    echo ""
}

# Function to sync a single file
sync_file() {
    local src="$1"
    local dest="$2"
    local name="$3"

    echo -e "${BLUE}[Sync]${NC} Syncing file: ${name}"

    if [ ! -f "$src" ]; then
        echo -e "${YELLOW}[Sync]${NC} ⚠️  Source file not found: $src"
        return 1
    fi

    # Create destination directory if needed
    mkdir -p "$(dirname "$dest")"

    # Only copy if destination doesn't exist
    if [ -f "$dest" ]; then
        echo -e "${YELLOW}[Sync]${NC} ⏭️  File exists, skipping (preserving user version)"
    else
        cp "$src" "$dest"
        echo -e "${GREEN}[Sync]${NC} ✅ File copied"
    fi
    echo ""
}

# ============================================
# SYNC CONFIGURATION
# ============================================
# Add or remove sync operations below

echo -e "${BLUE}[Sync]${NC} Starting file synchronization..."
echo ""

# Sync Daniel's documentation directory
sync_directory \
    "$TEMPLATE_DIR/spaces/daniel/docs" \
    "$WORKSPACE/spaces/daniel/docs" \
    "Daniel's Documentation (Shir Derech project)"

# Sync Daniel's conversation summary
sync_file \
    "$TEMPLATE_DIR/spaces/daniel/docs/conversation-summary.md" \
    "$WORKSPACE/spaces/daniel/docs/conversation-summary.md" \
    "Daniel's Conversation Summary"

# Add more sync operations here as needed
# Example:
# sync_directory \
#     "$TEMPLATE_DIR/spaces/another-space" \
#     "$WORKSPACE/spaces/another-space" \
#     "Another Space"

# ============================================
# COMPLETION
# ============================================

echo ""
echo "=========================================="
echo -e "${GREEN}[Sync]${NC} 🎉 File synchronization complete!"
echo "=========================================="
echo ""
echo "Synced to: $WORKSPACE"
echo ""
echo "Workspace structure:"
ls -la "$WORKSPACE/spaces/daniel/docs/" 2>/dev/null || echo "  (daniel/docs not yet created)"
echo ""

exit 0
