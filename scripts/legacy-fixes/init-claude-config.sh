#!/bin/bash
set -e

echo "[Claude Init] Setting up .claude directory for node user..."

# Create Claude config in node user's home directory
mkdir -p /home/node/.claude/projects

# CRITICAL: Backend needs /home/node/.claude.json file (at HOME root, NOT inside .claude directory)
# This is required for the API to find projects when running as node user
echo "[Claude Init] Creating /home/node/.claude.json for backend..."
cat > /home/node/.claude.json <<'EOF'
{
  "projects": {
    "/home/node": {}
  }
}
EOF

echo "[Claude Init] ✅ Created /home/node/.claude.json"

# Create encoded project directory for history storage
# Path encoding: "/home/node" → "-home-node"
ENCODED_NAME="-home-node"
mkdir -p "/home/node/.claude/projects/$ENCODED_NAME"

echo "[Claude Init] ✅ Created project history directory: $ENCODED_NAME"
echo "[Claude Init] Claude Code will use /home/node/.claude for history and /home/node/.claude.json for configuration"

exit 0
