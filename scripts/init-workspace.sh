#!/bin/bash
set -e

# Workspace initialization script
# Only initializes workspace on FIRST deployment (when CLAUDE.md doesn't exist)
# Preserves user-created files on subsequent deployments

WORKSPACE_PARENT="/workspace"
TEMPLATE_DIR="/app/workspace-template"
MARKER_FILE="$WORKSPACE_PARENT/CLAUDE.md"

echo "[Init] Starting workspace initialization..."

# Check if workspace is already initialized (CLAUDE.md exists)
if [ -f "$MARKER_FILE" ]; then
    echo "[Init] ✅ Workspace already initialized - preserving user files"
    echo "[Init] Skipping template copy to preserve user data"

    # Ensure .claude directory exists for auth
    mkdir -p "$WORKSPACE_PARENT/.claude"

    echo "[Init] Current workspace structure:"
    ls -la "$WORKSPACE_PARENT"
    exit 0
fi

# First run: Initialize workspace from template
echo "[Init] 🚀 First run detected - initializing workspace from template..."

# Ensure .claude directory exists
mkdir -p "$WORKSPACE_PARENT/.claude"
echo "[Init] Created .claude directory for authentication"

# Copy template files to workspace root
if [ -d "$TEMPLATE_DIR" ]; then
    echo "[Init] Copying template files to workspace..."

    # Copy CLAUDE.md to workspace root (marker file)
    if [ -f "$TEMPLATE_DIR/CLAUDE.md" ]; then
        cp "$TEMPLATE_DIR/CLAUDE.md" "$WORKSPACE_PARENT/"
        echo "[Init] ✅ Copied CLAUDE.md to workspace root"
    fi

    # Copy tools directory to workspace root
    if [ -d "$TEMPLATE_DIR/tools" ]; then
        cp -r "$TEMPLATE_DIR/tools" "$WORKSPACE_PARENT/"
        echo "[Init] ✅ Copied tools/ to workspace root"
    fi

    # Copy my-jarvis project directory
    if [ -d "$TEMPLATE_DIR/my-jarvis" ]; then
        cp -r "$TEMPLATE_DIR/my-jarvis" "$WORKSPACE_PARENT/"
        echo "[Init] ✅ Copied my-jarvis/ project directory"
    fi

    echo "[Init] ✅ Workspace initialized successfully"
    echo "[Init] Final structure:"
    ls -la "$WORKSPACE_PARENT"
else
    echo "[Init] ⚠️  Warning: Template directory not found at $TEMPLATE_DIR"
    exit 1
fi

exit 0
