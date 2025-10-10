#!/bin/bash
set -e

# Workspace initialization script
# Copies template files to persistent workspace on first container startup

WORKSPACE_PARENT="/workspace"
WORKSPACE_DIR="${WORKSPACE_DIR:-/workspace/my-jarvis}"
TEMPLATE_DIR="/app/workspace-template/my-jarvis"
INIT_MARKER="$WORKSPACE_PARENT/.initialized"

echo "[Init] Checking workspace initialization..."

# Check if workspace is already initialized
if [ -f "$INIT_MARKER" ]; then
    echo "[Init] Workspace already initialized (found marker file)"
    echo "[Init] Preserving existing workspace data"
    exit 0
fi

# Check if workspace parent is empty (or only has lost+found from mount)
WORKSPACE_FILES=$(find "$WORKSPACE_PARENT" -mindepth 1 -maxdepth 1 ! -name "lost+found" | wc -l)

if [ "$WORKSPACE_FILES" -eq 0 ]; then
    echo "[Init] Workspace is empty, initializing structure..."

    # Create my-jarvis directory
    mkdir -p "$WORKSPACE_DIR"
    echo "[Init] Created $WORKSPACE_DIR"

    # Copy template files to my-jarvis directory
    if [ -d "$TEMPLATE_DIR" ]; then
        echo "[Init] Copying from $TEMPLATE_DIR to $WORKSPACE_DIR"
        cp -r "$TEMPLATE_DIR"/* "$WORKSPACE_DIR/"

        # Create initialization marker at parent level
        echo "Workspace initialized on $(date)" > "$INIT_MARKER"

        # Create Claude config directory at parent level for persistent authentication
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
else
    echo "[Init] Workspace already contains files, preserving existing data"
    echo "[Init] Creating marker file to skip future initialization"
    echo "Workspace preserved on $(date)" > "$INIT_MARKER"

    # Ensure my-jarvis directory exists
    mkdir -p "$WORKSPACE_DIR"
    echo "[Init] Ensured my-jarvis directory exists"

    # Ensure Claude config directory exists at parent level
    mkdir -p "$WORKSPACE_PARENT/.claude"
    echo "[Init] Ensured .claude directory exists for authentication"
fi

exit 0
