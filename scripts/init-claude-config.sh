#!/bin/bash
set -e

echo "[Claude Init] Setting up .claude directory structure..."

# CRITICAL: Backend needs /root/.claude.json file (not just symlink)
# This is required for the API to find projects
echo "[Claude Init] Creating /root/.claude.json for backend..."
cat > /root/.claude.json <<'EOF'
{
  "projects": {
    "/workspace": {}
  }
}
EOF
echo "[Claude Init] ✅ Created /root/.claude.json (required for API)"

# Check if /workspace/.claude already exists (app already initialized)
if [ -d "/workspace/.claude" ]; then
    echo "[Claude Init] Found existing /workspace/.claude (app already initialized)"

    # Just ensure symlink exists
    if [ ! -L /root/.claude ]; then
        echo "[Claude Init] Creating missing symlink"
        rm -rf /root/.claude
        ln -sf /workspace/.claude /root/.claude
        echo "[Claude Init] ✅ Created symlink: /root/.claude -> /workspace/.claude"
    else
        echo "[Claude Init] ✅ Symlink already exists"
    fi

    echo "[Claude Init] Initialization complete (existing app)"
    exit 0
fi

# If we get here, this is first boot before setup-new-app.sh runs
# Create minimal structure so Claude CLI doesn't crash
echo "[Claude Init] Creating minimal .claude structure (first boot)"

mkdir -p /workspace/.claude/projects

# Create .claude.json config file INSIDE .claude directory (single source of truth)
cat > /workspace/.claude/.claude.json <<'EOF'
{
  "projects": {
    "/workspace": {}
  }
}
EOF

echo "[Claude Init] ✅ Created /workspace/.claude/.claude.json"

# Create encoded project directory for history storage
# Path encoding: "/workspace" → "-workspace"
ENCODED_NAME="-workspace"
mkdir -p "/workspace/.claude/projects/$ENCODED_NAME"

echo "[Claude Init] ✅ Created project history directory: $ENCODED_NAME"

# Create symlink from container home to persistent disk
rm -rf /root/.claude
ln -sf /workspace/.claude /root/.claude

echo "[Claude Init] ✅ Created symlink: /root/.claude -> /workspace/.claude"
echo "[Claude Init] Minimal structure created"
echo "[Claude Init] Run '/app/scripts/setup-new-app.sh' via SSH to complete initialization"

exit 0
