#!/bin/bash
set -e

# POST-INITIALIZATION CLAUDE CONFIG PATCHER
# Purpose: Merge projects object into Claude Code's .claude.json after initialization
# Usage: Run as background task after Claude WebUI server starts
# Note: This fixes the timing issue where Claude Code overwrites our projects config

HOME_DIR="/home/node"
CLAUDE_CONFIG="$HOME_DIR/.claude.json"
PATCH_LOG="/tmp/claude-config-patch.log"

echo "[$(date)] Claude Config Patcher Starting..." >> "$PATCH_LOG"

# Wait for Claude WebUI to fully initialize and create .claude.json
MAX_WAIT=120  # 2 minutes max wait
WAIT_INTERVAL=5  # Check every 5 seconds

for ((i=0; i<MAX_WAIT; i+=WAIT_INTERVAL)); do
    if [ -f "$CLAUDE_CONFIG" ]; then
        # Check if file contains Claude's initialization markers
        if grep -q '"userID"' "$CLAUDE_CONFIG" && grep -q '"installMethod"' "$CLAUDE_CONFIG"; then
            echo "[$(date)] Claude initialization detected after ${i}s" >> "$PATCH_LOG"
            break
        fi
    fi

    if [ $i -ge $((MAX_WAIT - WAIT_INTERVAL)) ]; then
        echo "[$(date)] ERROR: Claude initialization timeout after ${MAX_WAIT}s" >> "$PATCH_LOG"
        exit 1
    fi

    sleep $WAIT_INTERVAL
done

# Additional safety wait to ensure Claude is fully stable
sleep 10

# Create backup of original file
cp "$CLAUDE_CONFIG" "$CLAUDE_CONFIG.pre-patch-backup"
echo "[$(date)] Created backup: $CLAUDE_CONFIG.pre-patch-backup" >> "$PATCH_LOG"

# Create projects object to merge
PROJECTS_JSON=$(cat <<'EOF'
{
  "projects": {
    "/home/node": {
      "allowedTools": ["Read", "Write", "Edit", "Bash"],
      "history": [],
      "mcpServers": {
        "jarvis-tools": {
          "command": "node",
          "args": ["./jarvis-mcp-server.js"],
          "env": {
            "OPENAI_API_KEY": "${OPENAI_API_KEY}",
            "WORKSPACE_DIR": "${WORKSPACE_DIR}"
          }
        }
      },
      "exampleFiles": [],
      "mcpContextUris": []
    }
  }
}
EOF
)

# Use jq to merge projects object into existing Claude config
# This preserves all Claude metadata while adding our projects configuration
echo "$PROJECTS_JSON" | jq -s '.[1] * .[0]' "$CLAUDE_CONFIG" - > "$CLAUDE_CONFIG.tmp"

# Verify the merge was successful and file is valid JSON
if jq empty "$CLAUDE_CONFIG.tmp" 2>/dev/null; then
    # Check that projects object was added correctly
    if jq -e '.projects["/home/node"]' "$CLAUDE_CONFIG.tmp" >/dev/null 2>&1; then
        # Replace original with merged version
        mv "$CLAUDE_CONFIG.tmp" "$CLAUDE_CONFIG"
        chown node:node "$CLAUDE_CONFIG"
        chmod 600 "$CLAUDE_CONFIG"

        echo "[$(date)] SUCCESS: Projects object merged into Claude config" >> "$PATCH_LOG"
        echo "[$(date)] Claude config now contains projects for /home/node" >> "$PATCH_LOG"

        # Log the final structure for debugging
        echo "[$(date)] Final projects config:" >> "$PATCH_LOG"
        jq '.projects' "$CLAUDE_CONFIG" >> "$PATCH_LOG" 2>/dev/null || echo "Failed to log projects structure" >> "$PATCH_LOG"

        exit 0
    else
        echo "[$(date)] ERROR: Projects object not found in merged file" >> "$PATCH_LOG"
    fi
else
    echo "[$(date)] ERROR: Merged file is invalid JSON" >> "$PATCH_LOG"
fi

# Restore backup if merge failed
mv "$CLAUDE_CONFIG.pre-patch-backup" "$CLAUDE_CONFIG"
rm -f "$CLAUDE_CONFIG.tmp"
echo "[$(date)] FAILED: Restored original file from backup" >> "$PATCH_LOG"
exit 1