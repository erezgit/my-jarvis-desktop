#!/bin/bash
# Automated migration script - runs without prompts
set -e

echo "Starting automated migration from /workspace to /home/node..."

# Check if already migrated
if [ -f "/home/node/CLAUDE.md" ] && [ ! -f "/workspace/CLAUDE.md" ]; then
    echo "Already migrated!"
    exit 0
fi

# Check workspace exists
if [ ! -d "/workspace" ]; then
    echo "ERROR: No /workspace found"
    exit 1
fi

# Copy data
echo "Copying data from /workspace to /home/node..."
cp -a /workspace/. /home/node/

# Fix ownership
echo "Fixing ownership..."
chown -R node:node /home/node

# Update Claude config
if [ -f "/home/node/.claude.json" ]; then
    if ! grep -q "allowedTools" /home/node/.claude.json; then
        echo "Updating Claude config..."
        cat > /home/node/.claude.json <<'EOF'
{
  "projects": {
    "/home/node": {
      "allowedTools": [],
      "mcpContextUris": [],
      "mcpServers": {},
      "enabledMcpjsonServers": [],
      "disabledMcpjsonServers": [],
      "hasTrustDialogAccepted": false,
      "ignorePatterns": [],
      "projectOnboardingSeenCount": 0,
      "hasClaudeMdExternalIncludesApproved": false,
      "hasClaudeMdExternalIncludesWarningShown": false,
      "exampleFiles": []
    }
  }
}
EOF
        chown node:node /home/node/.claude.json
    fi
fi

# Update history paths
if [ -d "/home/node/.claude/projects/-workspace" ]; then
    echo "Updating history paths..."
    mv /home/node/.claude/projects/-workspace /home/node/.claude/projects/-home-node
fi

echo "MIGRATION COMPLETE!"
echo "Files in /home/node:"
ls -la /home/node/ | head -10