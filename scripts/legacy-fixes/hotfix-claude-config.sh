#!/bin/bash
set -e

# HOTFIX SCRIPT FOR EXISTING DEPLOYMENTS
# Purpose: Fix missing /home/node/.claude.json in existing deployments
# Usage: SSH into Fly.io machine and run: /app/scripts/hotfix-claude-config.sh
# Context: After migrating from root to node user, history API broke because
#          claude.json is in wrong location or missing

HOME_DIR="/home/node"

echo ""
echo "=========================================="
echo "  HOTFIX: Claude Config for Node User"
echo "=========================================="
echo ""

# CRITICAL: Backend needs /home/node/.claude.json file (at HOME root, NOT inside .claude directory)
# This is required for the API to find projects when running as node user
echo "[Hotfix] Creating /home/node/.claude.json for backend..."

# Always recreate to ensure correct content
cat > "$HOME_DIR/.claude.json" <<'EOF'
{
  "projects": {
    "/home/node": {}
  }
}
EOF

chown node:node "$HOME_DIR/.claude.json"
echo "[Hotfix] ✅ Created /home/node/.claude.json"

# Create .claude directory structure for history storage if missing
if [ ! -d "$HOME_DIR/.claude/projects/-home-node" ]; then
    mkdir -p "$HOME_DIR/.claude/projects/-home-node"
    chown -R node:node "$HOME_DIR/.claude"
    echo "[Hotfix] ✅ Created .claude directory structure for history"
else
    echo "[Hotfix] ✅ .claude directory already exists"
fi

echo ""
echo "=========================================="
echo "  ✅ HOTFIX COMPLETE"
echo "=========================================="
echo ""
echo "The history API should now work correctly."
echo "Test by accessing: https://<app-name>.fly.dev/history"
echo ""

exit 0