#!/bin/bash
set -e

# HOTFIX SCRIPT FOR CLAUDE CODE AUTHENTICATION
# Purpose: Configure Claude Code with Anthropic API key
# Usage: SSH into Fly.io machine and run: /app/scripts/hotfix-claude-login.sh
# Context: Claude Code needs to be authenticated to work with the agent

HOME_DIR="/home/node"

echo ""
echo "=========================================="
echo "  HOTFIX: Claude Code Authentication"
echo "=========================================="
echo ""

# Create .config/claude directory structure
echo "[Hotfix] Creating Claude Code config directory..."
mkdir -p "$HOME_DIR/.config/claude"
chown -R node:node "$HOME_DIR/.config"

# Create Claude Code config with API key
# Using a test key for now - should be replaced with actual key
echo "[Hotfix] Creating Claude Code config.json with API key..."
cat > "$HOME_DIR/.config/claude/config.json" <<'EOF'
{
  "apiKey": "sk-ant-api03-OQY2b20fxW7gAaJsqiRHKXxq7PJGXQxCJaJJiDiCo_gMlDPCJ7XBXOK5HMvyH3jF4X5gwlPQ6JI7nGy39I1JBA-d7NfhQAA",
  "defaultProvider": "anthropic",
  "telemetryEnabled": false
}
EOF

chown node:node "$HOME_DIR/.config/claude/config.json"
chmod 600 "$HOME_DIR/.config/claude/config.json"
echo "[Hotfix] ✅ Created Claude Code config with API key"

# Test claude command as node user
echo ""
echo "[Hotfix] Testing Claude Code as node user..."
su - node -c 'claude --version' && echo "[Hotfix] ✅ Claude Code is working"

echo ""
echo "=========================================="
echo "  ✅ HOTFIX COMPLETE"
echo "=========================================="
echo ""
echo "Claude Code should now be authenticated."
echo "Test by using the agent in the browser."
echo ""

exit 0