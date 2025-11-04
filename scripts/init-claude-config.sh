#!/bin/bash
set -e

echo "[Claude Init] Setting up .claude directory for node user..."

# Create Claude config in node user's home directory
mkdir -p /home/node/.claude/projects

# Create .claude.json config file
cat > /home/node/.claude/.claude.json <<'EOF'
{
  "projects": {
    "/workspace": {}
  }
}
EOF

echo "[Claude Init] ✅ Created /home/node/.claude/.claude.json"

# Create encoded project directory for history storage
# Path encoding: "/workspace" → "-workspace"
ENCODED_NAME="-workspace"
mkdir -p "/home/node/.claude/projects/$ENCODED_NAME"

echo "[Claude Init] ✅ Created project history directory: $ENCODED_NAME"
echo "[Claude Init] Claude Code will use /home/node/.claude for configuration"

exit 0
