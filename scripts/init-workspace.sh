#!/bin/bash
set -e

# Workspace initialization script
# TEMPORARY: Forces clean rebuild of workspace (except .claude directory)
# TODO: Add back conditional check after first deployment

WORKSPACE_PARENT="/workspace"
TEMPLATE_DIR="/app/workspace-template"

echo "[Init] Starting workspace initialization..."

# Clean workspace (preserve .claude directory for auth persistence)
echo "[Init] Cleaning workspace (preserving .claude)..."
find "$WORKSPACE_PARENT" -mindepth 1 -maxdepth 1 ! -name '.claude' -exec rm -rf {} + 2>/dev/null || true

# Ensure .claude directory exists
mkdir -p "$WORKSPACE_PARENT/.claude"
echo "[Init] Preserved .claude directory for authentication"

# Copy template files to workspace root
if [ -d "$TEMPLATE_DIR" ]; then
    echo "[Init] Copying template files to workspace..."

    # Copy CLAUDE.md to workspace root
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
