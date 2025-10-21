#!/bin/bash
set -e

# WORKSPACE UPDATE SCRIPT
# Purpose: Update specific files in an EXISTING app's workspace
# When to use: When you want to update tools/, sync files, or update CLAUDE.md
# Usage: SSH into Fly.io machine and run: /app/scripts/update-workspace.sh [options]

WORKSPACE="/workspace"
TEMPLATE_DIR="/app/workspace-template"
MARKER_FILE="$WORKSPACE/CLAUDE.md"

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo ""
echo "=========================================="
echo "  MY JARVIS - WORKSPACE UPDATE"
echo "=========================================="
echo ""

# Check if workspace is initialized
if [ ! -f "$MARKER_FILE" ]; then
    echo -e "${RED}❌ ERROR: Workspace not initialized!${NC}"
    echo "   CLAUDE.md marker file not found at: $MARKER_FILE"
    echo ""
    echo "   This script is for EXISTING apps only."
    echo "   For new apps, use: /app/scripts/setup-new-app.sh"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ Confirmed: Workspace is initialized${NC}"
echo ""

# Parse command line arguments
UPDATE_TOOLS=false
UPDATE_CLAUDE_MD=false
SYNC_FILES=false
UPDATE_ALL=false

if [ $# -eq 0 ]; then
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  --tools          Update tools/ directory from template"
    echo "  --claude-md      Update CLAUDE.md from template"
    echo "  --sync-files     Run file sync (Daniel's docs, etc.)"
    echo "  --all            Update everything (tools, CLAUDE.md, sync files)"
    echo ""
    echo "Examples:"
    echo "  $0 --tools                 # Only update tools directory"
    echo "  $0 --sync-files            # Only sync user-specific files"
    echo "  $0 --tools --sync-files    # Update tools and sync files"
    echo "  $0 --all                   # Update everything"
    echo ""
    exit 0
fi

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --tools)
            UPDATE_TOOLS=true
            shift
            ;;
        --claude-md)
            UPDATE_CLAUDE_MD=true
            shift
            ;;
        --sync-files)
            SYNC_FILES=true
            shift
            ;;
        --all)
            UPDATE_ALL=true
            UPDATE_TOOLS=true
            UPDATE_CLAUDE_MD=true
            SYNC_FILES=true
            shift
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}[Update]${NC} Selected operations:"
[ "$UPDATE_TOOLS" = true ] && echo "  ✓ Update tools/ directory"
[ "$UPDATE_CLAUDE_MD" = true ] && echo "  ✓ Update CLAUDE.md"
[ "$SYNC_FILES" = true ] && echo "  ✓ Sync user-specific files"
echo ""

# ============================================
# UPDATE TOOLS DIRECTORY
# ============================================
if [ "$UPDATE_TOOLS" = true ]; then
    echo -e "${BLUE}[Update]${NC} Updating tools/ directory..."

    if [ -d "$TEMPLATE_DIR/tools" ]; then
        # Backup existing tools if they exist
        if [ -d "$WORKSPACE/tools" ]; then
            echo -e "${YELLOW}[Update]${NC} Backing up existing tools/ to tools.backup/"
            cp -r "$WORKSPACE/tools" "$WORKSPACE/tools.backup"
        fi

        # Update tools directory
        cp -r "$TEMPLATE_DIR/tools" "$WORKSPACE/"
        echo -e "${GREEN}[Update]${NC} ✅ Updated tools/ directory"
    else
        echo -e "${YELLOW}[Update]${NC} ⚠️  Template tools/ directory not found, skipping"
    fi
    echo ""
fi

# ============================================
# UPDATE CLAUDE.MD
# ============================================
if [ "$UPDATE_CLAUDE_MD" = true ]; then
    echo -e "${BLUE}[Update]${NC} Updating CLAUDE.md..."

    if [ -f "$TEMPLATE_DIR/CLAUDE.md" ]; then
        # Backup existing CLAUDE.md
        if [ -f "$WORKSPACE/CLAUDE.md" ]; then
            echo -e "${YELLOW}[Update]${NC} Backing up existing CLAUDE.md to CLAUDE.md.backup"
            cp "$WORKSPACE/CLAUDE.md" "$WORKSPACE/CLAUDE.md.backup"
        fi

        # Update CLAUDE.md
        cp "$TEMPLATE_DIR/CLAUDE.md" "$WORKSPACE/"
        echo -e "${GREEN}[Update]${NC} ✅ Updated CLAUDE.md"
    else
        echo -e "${YELLOW}[Update]${NC} ⚠️  Template CLAUDE.md not found, skipping"
    fi
    echo ""
fi

# ============================================
# SYNC USER-SPECIFIC FILES
# ============================================
if [ "$SYNC_FILES" = true ]; then
    echo -e "${BLUE}[Update]${NC} Running file synchronization..."
    echo ""

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
        # --ignore-existing: don't overwrite existing files (safe mode)
        # --update: only copy if source is newer
        rsync -av --ignore-existing --update "$src/" "$dest/"

        local file_count=$(find "$dest" -type f 2>/dev/null | wc -l)
        echo -e "${GREEN}[Sync]${NC} ✅ $name synced ($file_count files total)"
        echo ""
    }

    # Sync Daniel's documentation directory
    sync_directory \
        "$TEMPLATE_DIR/spaces/daniel/docs" \
        "$WORKSPACE/spaces/daniel/docs" \
        "Daniel's Documentation (Shir Derech project)"

    # Add more sync operations here as needed
fi

# ============================================
# VERIFY CLAUDE SYMLINKS
# ============================================
echo -e "${BLUE}[Update]${NC} Verifying Claude CLI symlinks..."

# Ensure symlinks exist
if [ ! -L /root/.claude ]; then
    echo -e "${YELLOW}[Update]${NC} Creating missing symlink: /root/.claude"
    rm -rf /root/.claude
    ln -sf "$WORKSPACE/.claude" /root/.claude
fi

if [ ! -L /root/.claude.json ] && [ -f "$WORKSPACE/.claude.json" ]; then
    echo -e "${YELLOW}[Update]${NC} Creating missing symlink: /root/.claude.json"
    rm -f /root/.claude.json
    ln -sf "$WORKSPACE/.claude.json" /root/.claude.json
fi

echo -e "${GREEN}[Update]${NC} ✅ Claude symlinks verified"

# ============================================
# COMPLETION
# ============================================
echo ""
echo "=========================================="
echo -e "${GREEN}  🎉 WORKSPACE UPDATE COMPLETE!${NC}"
echo "=========================================="
echo ""
echo "Updated workspace at: $WORKSPACE"
echo ""
echo "Current workspace structure:"
ls -la "$WORKSPACE" | head -20
echo ""
echo "✅ Your workspace has been updated!"
echo "🔒 All user files preserved (backups created where needed)"
echo ""

exit 0
