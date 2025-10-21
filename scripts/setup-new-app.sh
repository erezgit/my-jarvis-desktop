#!/bin/bash
set -e

# NEW APP SETUP SCRIPT
# Purpose: Initialize workspace for a BRAND NEW Fly.io app
# When to use: ONLY when creating a new app for the first time
# Usage: SSH into new Fly.io machine and run: /app/scripts/setup-new-app.sh

WORKSPACE_PARENT="/workspace"
TEMPLATE_DIR="/app/workspace-template"
MARKER_FILE="$WORKSPACE_PARENT/CLAUDE.md"

echo ""
echo "=========================================="
echo "  MY JARVIS - NEW APP SETUP"
echo "=========================================="
echo ""

# Check if workspace is already initialized
if [ -f "$MARKER_FILE" ]; then
    echo "❌ ERROR: Workspace already initialized!"
    echo "   CLAUDE.md marker file exists at: $MARKER_FILE"
    echo ""
    echo "   This script should ONLY be run on new apps."
    echo "   For updates, use: /app/scripts/update-workspace.sh"
    echo ""
    exit 1
fi

echo "✅ Confirmed: This is a new workspace (no CLAUDE.md marker)"
echo ""

# Copy ALL template files to workspace
if [ ! -d "$TEMPLATE_DIR" ]; then
    echo "❌ ERROR: Template directory not found at $TEMPLATE_DIR"
    exit 1
fi

echo "[Setup] 🚀 Copying all template files to workspace..."
echo ""

# Copy CLAUDE.md to workspace root (marker file)
if [ -f "$TEMPLATE_DIR/CLAUDE.md" ]; then
    cp "$TEMPLATE_DIR/CLAUDE.md" "$WORKSPACE_PARENT/"
    echo "[Setup] ✅ Copied CLAUDE.md to workspace root"
fi

# Copy tools directory to workspace root
if [ -d "$TEMPLATE_DIR/tools" ]; then
    cp -r "$TEMPLATE_DIR/tools" "$WORKSPACE_PARENT/"
    echo "[Setup] ✅ Copied tools/ directory"
fi

# Copy my-jarvis project directory
if [ -d "$TEMPLATE_DIR/my-jarvis" ]; then
    cp -r "$TEMPLATE_DIR/my-jarvis" "$WORKSPACE_PARENT/"
    echo "[Setup] ✅ Copied my-jarvis/ project directory"
fi

# Copy spaces directories if they exist
if [ -d "$TEMPLATE_DIR/spaces" ]; then
    cp -r "$TEMPLATE_DIR/spaces" "$WORKSPACE_PARENT/"
    echo "[Setup] ✅ Copied spaces/ directories"
fi

echo ""
echo "[Setup] ✅ All template files copied successfully"

# ============================================
# CLAUDE CONFIG SETUP - PERSISTENT AUTHENTICATION
# ============================================
echo ""
echo "[Claude Setup] Setting up .claude directory on PERSISTENT DISK..."

# Create .claude directory on PERSISTENT DISK
mkdir -p "$WORKSPACE_PARENT/.claude/projects"

# Create .claude.json config file
cat > "$WORKSPACE_PARENT/.claude.json" <<'EOF'
{
  "projects": {
    "/workspace/my-jarvis": {}
  }
}
EOF

echo "[Claude Setup] ✅ Created /workspace/.claude on persistent disk"
echo "[Claude Setup] ✅ Created /workspace/.claude.json on persistent disk"

# Create encoded project directory for history storage
ENCODED_NAME="-workspace-my-jarvis"
mkdir -p "$WORKSPACE_PARENT/.claude/projects/$ENCODED_NAME"
echo "[Claude Setup] ✅ Created project history directory"

# ============================================
# CREATE SYMLINKS FROM CONTAINER HOME TO PERSISTENT DISK
# ============================================
echo ""
echo "[Claude Setup] Creating symlinks for Claude CLI compatibility..."

# Remove any existing files/directories in container home
rm -rf /root/.claude
rm -f /root/.claude.json

# Create symlinks from container home to persistent disk
ln -sf "$WORKSPACE_PARENT/.claude" /root/.claude
ln -sf "$WORKSPACE_PARENT/.claude.json" /root/.claude.json

echo "[Claude Setup] ✅ Created symlink: /root/.claude -> /workspace/.claude"
echo "[Claude Setup] ✅ Created symlink: /root/.claude.json -> /workspace/.claude.json"

# ============================================
# COMPLETION
# ============================================
echo ""
echo "=========================================="
echo "  🎉 NEW APP SETUP COMPLETE!"
echo "=========================================="
echo ""
echo "Workspace initialized at: $WORKSPACE_PARENT"
echo ""
echo "Final structure:"
ls -la "$WORKSPACE_PARENT"
echo ""
echo "Claude configuration:"
ls -la "$WORKSPACE_PARENT/.claude/"
echo ""
echo "✅ This app is now ready to use!"
echo "🔒 Authentication will persist across container restarts"
echo ""
echo "Next steps:"
echo "  1. Exit this SSH session"
echo "  2. Access your app via the web interface"
echo "  3. Authenticate with Claude CLI (one-time)"
echo "  4. Start working!"
echo ""

exit 0
