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

    # Ensure .claude directory exists on persistent disk for auth
    mkdir -p "$WORKSPACE_PARENT/.claude/projects"

    # Ensure symlink exists from container home to persistent disk
    if [ ! -L /root/.claude ]; then
        echo "[Init] Creating symlink: /root/.claude -> /workspace/.claude"
        rm -rf /root/.claude
        ln -sf "$WORKSPACE_PARENT/.claude" /root/.claude
    fi

    if [ ! -L /root/.claude.json ] && [ -f "$WORKSPACE_PARENT/.claude.json" ]; then
        echo "[Init] Creating symlink: /root/.claude.json -> /workspace/.claude.json"
        rm -f /root/.claude.json
        ln -sf "$WORKSPACE_PARENT/.claude.json" /root/.claude.json
    fi

    echo "[Init] Current workspace structure:"
    ls -la "$WORKSPACE_PARENT"
    exit 0
fi

# First run: Initialize workspace from template
echo "[Init] 🚀 Initializing workspace from template..."

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

# ============================================
# CLAUDE CONFIG SETUP - PERSISTENT AUTHENTICATION
# ============================================
echo ""
echo "[Claude Init] Setting up .claude directory on PERSISTENT DISK..."

# Create .claude directory on PERSISTENT DISK (not ephemeral container filesystem)
mkdir -p "$WORKSPACE_PARENT/.claude/projects"

# Create .claude.json config file on PERSISTENT DISK
cat > "$WORKSPACE_PARENT/.claude.json" <<'EOF'
{
  "projects": {
    "/workspace/my-jarvis": {}
  }
}
EOF

echo "[Claude Init] ✅ Created /workspace/.claude on persistent disk"
echo "[Claude Init] ✅ Created /workspace/.claude.json on persistent disk"

# Create encoded project directory for history storage
# Path encoding: "/workspace/my-jarvis" → "-workspace-my-jarvis"
# (Claude converts '/', '\', ':', '.' to '-')
ENCODED_NAME="-workspace-my-jarvis"
mkdir -p "$WORKSPACE_PARENT/.claude/projects/$ENCODED_NAME"

echo "[Claude Init] ✅ Created project history directory on persistent disk"

# ============================================
# CREATE SYMLINKS FROM CONTAINER HOME TO PERSISTENT DISK
# ============================================
echo ""
echo "[Claude Init] Creating symlinks for Claude CLI compatibility..."

# Remove any existing files/directories in container home
rm -rf /root/.claude
rm -f /root/.claude.json

# Create symlinks from container home to persistent disk
ln -sf "$WORKSPACE_PARENT/.claude" /root/.claude
ln -sf "$WORKSPACE_PARENT/.claude.json" /root/.claude.json

echo "[Claude Init] ✅ Created symlink: /root/.claude -> /workspace/.claude"
echo "[Claude Init] ✅ Created symlink: /root/.claude.json -> /workspace/.claude.json"

# Verify symlinks
echo ""
echo "[Claude Init] Verifying symlinks:"
ls -la /root/.claude /root/.claude.json

echo ""
echo "[Claude Init] Claude configuration ready (persistent across restarts):"
ls -la "$WORKSPACE_PARENT/.claude/"
ls -la "$WORKSPACE_PARENT/.claude/projects/" 2>/dev/null || true

echo ""
echo "[Init] 🎉 Complete! Workspace and Claude config initialized successfully"
echo "[Init] 🔒 Authentication will persist across container restarts"

exit 0
