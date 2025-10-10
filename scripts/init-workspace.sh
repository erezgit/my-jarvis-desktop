#!/bin/bash
set -e

# Workspace initialization script
# Initializes workspace structure only if my-jarvis directory is empty or missing

WORKSPACE_PARENT="/workspace"
WORKSPACE_DIR="${WORKSPACE_DIR:-/workspace/my-jarvis}"
TEMPLATE_DIR="/app/workspace-template/my-jarvis"
INIT_MARKER="$WORKSPACE_PARENT/.initialized"

echo "[Init] Checking workspace initialization status..."

# Check if my-jarvis directory exists and has files
if [ -d "$WORKSPACE_DIR" ] && [ -n "$(ls -A "$WORKSPACE_DIR" 2>/dev/null)" ]; then
    echo "[Init] my-jarvis directory already populated, skipping initialization"

    # Ensure Claude config directory exists
    mkdir -p "$WORKSPACE_PARENT/.claude"

    exit 0
fi

# my-jarvis is empty or missing - initialize it
echo "[Init] my-jarvis directory is empty or missing, initializing..."

# Create my-jarvis directory
mkdir -p "$WORKSPACE_DIR"
echo "[Init] Created $WORKSPACE_DIR"

# Copy template files to my-jarvis directory
if [ -d "$TEMPLATE_DIR" ]; then
    echo "[Init] Copying from $TEMPLATE_DIR to $WORKSPACE_DIR"
    cp -r "$TEMPLATE_DIR"/* "$WORKSPACE_DIR/"

    # Create initialization marker
    echo "Workspace initialized on $(date)" > "$INIT_MARKER"

    # Ensure Claude config directory exists at parent level
    mkdir -p "$WORKSPACE_PARENT/.claude"
    echo "[Init] Created .claude directory for authentication persistence"

    echo "[Init] ✅ Workspace initialized successfully"
    echo "[Init] Structure created:"
    ls -la "$WORKSPACE_PARENT"
    echo "[Init] Files in my-jarvis:"
    ls -la "$WORKSPACE_DIR"
else
    echo "[Init] ⚠️  Warning: Template directory not found at $TEMPLATE_DIR"
    exit 1
fi

exit 0
