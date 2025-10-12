#!/bin/bash
set -e

# Workspace initialization script
# Only initializes workspace on FIRST deployment (when CLAUDE.md doesn't exist)
# Preserves user-created files on subsequent deployments

WORKSPACE_PARENT="/workspace"
TEMPLATE_DIR="/app/workspace-template"
MARKER_FILE="$WORKSPACE_PARENT/CLAUDE.md"

echo "[Init] Starting workspace initialization..."

# COMMENTED OUT FOR ONE-TIME CLEAN DEPLOYMENT (Ticket #059)
# TODO: UNCOMMENT after successful deployment to preserve user files
# Check if workspace is already initialized (CLAUDE.md exists)
# if [ -f "$MARKER_FILE" ]; then
#     echo "[Init] ✅ Workspace already initialized - preserving user files"
#     echo "[Init] Skipping template copy to preserve user data"
#
#     # Ensure .claude directory exists for auth
#     mkdir -p "$WORKSPACE_PARENT/.claude"
#
#     echo "[Init] Current workspace structure:"
#     ls -la "$WORKSPACE_PARENT"
#     exit 0
# fi

# FORCE CLEAN INITIALIZATION (One-time fix for Ticket #059)
echo "[Init] 🧹 FORCE CLEAN MODE - Reinitializing workspace..."

# Clean old workspace .claude directory (backend doesn't use this)
if [ -d "$WORKSPACE_PARENT/.claude" ]; then
    echo "[Init] Removing old /workspace/.claude directory..."
    rm -rf "$WORKSPACE_PARENT/.claude"
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
# CLAUDE CONFIG SETUP (Ticket #059 Fix)
# ============================================
echo ""
echo "[Claude Init] Setting up .claude directory structure in container home..."

# Create .claude directory in container's home directory (where backend expects it)
mkdir -p /root/.claude/projects

# Create .claude.json config file with workspace project
cat > /root/.claude.json <<'EOF'
{
  "projects": {
    "/workspace/my-jarvis": {}
  }
}
EOF

echo "[Claude Init] ✅ Created /root/.claude.json with workspace project"

# Create encoded project directory for history storage
# Path encoding: "/workspace/my-jarvis" → "-workspace-my-jarvis"
# (Claude converts '/', '\', ':', '.' to '-')
ENCODED_NAME="-workspace-my-jarvis"
mkdir -p "/root/.claude/projects/$ENCODED_NAME"

echo "[Claude Init] ✅ Created project history directory: /root/.claude/projects/$ENCODED_NAME"
echo "[Claude Init] ✅ Claude configuration ready:"
ls -la /root/.claude/
ls -la /root/.claude/projects/ 2>/dev/null || true

echo ""
echo "[Init] 🎉 Complete! Workspace and Claude config initialized successfully"

exit 0
