#!/bin/bash
echo "Fixing Claude configuration for my-jarvis-daniel..."

# Create a proper .claude.json with /home/node project
cat > /home/node/.claude.json << 'JSON'
{
  "numStartups": 1,
  "installMethod": "unknown", 
  "autoUpdates": true,
  "cachedStatsigGates": {
    "tengu_migrate_ignore_patterns": true,
    "tengu_disable_bypass_permissions_mode": false,
    "tengu_tool_pear": false
  },
  "cachedDynamicConfigs": {
    "tengu-top-of-feed-tip": {
      "tip": "",
      "color": ""
    }
  },
  "projects": {
    "/home/node": {
      "allowedTools": ["Read", "Write", "Edit", "Bash"],
      "history": [],
      "mcpServers": {},
      "exampleFiles": [],
      "mcpContextUris": []
    }
  },
  "firstStartTime": "2025-11-08T05:50:57.019Z",
  "userID": "a15fbae56c830a1696c273a73c084c078a0f12831c019489f977c28ba4937208",
  "sonnet45MigrationComplete": true,
  "fallbackAvailableWarningThreshold": 0.5
}
JSON

# Fix ownership
chown node:node /home/node/.claude.json
chmod 644 /home/node/.claude.json

echo "Configuration fixed successfully!"
