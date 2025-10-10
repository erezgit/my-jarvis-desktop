#!/bin/bash
set -e

# Workspace initialization script
# Copies template files to persistent workspace on first container startup

WORKSPACE_DIR="${WORKSPACE_DIR:-/workspace}"
TEMPLATE_DIR="/app/workspace-template"
INIT_MARKER="$WORKSPACE_DIR/.initialized"

echo "[Init] Checking workspace initialization..."

# Check if workspace is already initialized
if [ -f "$INIT_MARKER" ]; then
    echo "[Init] Workspace already initialized (found marker file)"
    echo "[Init] Preserving existing workspace data"
    exit 0
fi

# Check if workspace is empty (or only has lost+found from mount)
WORKSPACE_FILES=$(find "$WORKSPACE_DIR" -mindepth 1 -maxdepth 1 ! -name "lost+found" | wc -l)

if [ "$WORKSPACE_FILES" -eq 0 ]; then
    echo "[Init] Workspace is empty, copying template files..."

    # Copy template files to workspace
    if [ -d "$TEMPLATE_DIR" ]; then
        echo "[Init] Copying from $TEMPLATE_DIR to $WORKSPACE_DIR"
        cp -r "$TEMPLATE_DIR"/* "$WORKSPACE_DIR/"

        # Create initialization marker
        echo "Workspace initialized on $(date)" > "$INIT_MARKER"

        echo "[Init] ✅ Workspace initialized successfully"
        echo "[Init] Files copied:"
        ls -la "$WORKSPACE_DIR"
    else
        echo "[Init] ⚠️  Warning: Template directory not found at $TEMPLATE_DIR"
        exit 1
    fi
else
    echo "[Init] Workspace already contains files, preserving existing data"
    echo "[Init] Creating marker file to skip future initialization"
    echo "Workspace preserved on $(date)" > "$INIT_MARKER"
fi

exit 0
