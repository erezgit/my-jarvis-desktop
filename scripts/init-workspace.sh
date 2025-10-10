#!/bin/bash
set -e

# Workspace initialization script
# FORCE REINITIALIZATION - Completely wipes and rebuilds workspace structure

WORKSPACE_PARENT="/workspace"
WORKSPACE_DIR="${WORKSPACE_DIR:-/workspace/my-jarvis}"
TEMPLATE_DIR="/app/workspace-template/my-jarvis"
INIT_MARKER="$WORKSPACE_PARENT/.initialized"

echo "[Init] FORCING complete workspace cleanup and reinitialization..."

# Clean up ALL files in workspace except .claude directory
echo "[Init] Removing all workspace contents except .claude"
find "$WORKSPACE_PARENT" -mindepth 1 -maxdepth 1 ! -name ".claude" ! -name "lost+found" -exec rm -rf {} + 2>/dev/null || true

echo "[Init] Workspace cleaned successfully"

# Create fresh my-jarvis directory
mkdir -p "$WORKSPACE_DIR"
echo "[Init] Created fresh $WORKSPACE_DIR"

# Copy template files to my-jarvis directory
if [ -d "$TEMPLATE_DIR" ]; then
    echo "[Init] Copying from $TEMPLATE_DIR to $WORKSPACE_DIR"
    cp -r "$TEMPLATE_DIR"/* "$WORKSPACE_DIR/"

    # Create initialization marker
    echo "Workspace force-initialized on $(date)" > "$INIT_MARKER"

    # Ensure Claude config directory exists at parent level
    mkdir -p "$WORKSPACE_PARENT/.claude"
    echo "[Init] Created .claude directory for authentication persistence"

    echo "[Init] ✅ Workspace force-initialized successfully"
    echo "[Init] Structure created:"
    ls -la "$WORKSPACE_PARENT"
    echo "[Init] Files in my-jarvis:"
    ls -la "$WORKSPACE_DIR"
else
    echo "[Init] ⚠️  Warning: Template directory not found at $TEMPLATE_DIR"
    exit 1
fi

exit 0
