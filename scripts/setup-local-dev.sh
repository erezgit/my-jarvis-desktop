#!/bin/bash
set -e

# LOCAL DEVELOPMENT SETUP SCRIPT
# Purpose: Initialize workspace for local development with proper Claude configuration
# Usage: ./scripts/setup-local-dev.sh

PROJECT_DIR="/Users/erezfern/Workspace/my-jarvis/spaces/my-jarvis-desktop/projects/my-jarvis-desktop"
HOME_DIR="$HOME"

echo ""
echo "=========================================="
echo "  MY JARVIS - LOCAL DEV SETUP"
echo "=========================================="
echo ""

# ============================================
# CLAUDE CONFIGURATION - CREATE PROJECTS OBJECT
# ============================================
echo "[Claude Setup] Creating Claude configuration with projects object for local development..."

# Backup existing .claude.json if it exists
if [ -f "$PROJECT_DIR/.claude.json" ]; then
    echo "[Backup] Backing up existing .claude.json to .claude.json.backup"
    cp "$PROJECT_DIR/.claude.json" "$PROJECT_DIR/.claude.json.backup"
fi

# Create .claude.json with projects object for chat history AND MCP servers
cat > "$PROJECT_DIR/.claude.json" << 'EOF'
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

echo "[Claude Setup] ✅ Created .claude.json with projects object for chat history"

# Create .claude directory structure for JSONL history storage (local paths)
# For local dev, Claude stores JSONL files in user's home directory
mkdir -p "$HOME_DIR/.claude/projects/-workspace"
echo "[Claude Setup] ✅ Created .claude directory structure at $HOME_DIR/.claude/"

# Create symlink for Docker container to find JSONL files
# The container expects them at /root/.claude but they're actually in user's home
if [ ! -L "$PROJECT_DIR/.claude" ]; then
    ln -s "$HOME_DIR/.claude" "$PROJECT_DIR/.claude"
    echo "[Claude Setup] ✅ Created symlink from project to home .claude directory"
fi

# ============================================
# ENVIRONMENT CONFIGURATION
# ============================================
echo ""
echo "[Env Setup] Checking environment configuration..."

# Check if .env.local exists
if [ ! -f "$PROJECT_DIR/.env.local" ]; then
    echo "[Env Setup] Creating .env.local from .env.example..."
    if [ -f "$PROJECT_DIR/.env.example" ]; then
        cp "$PROJECT_DIR/.env.example" "$PROJECT_DIR/.env.local"
        echo "[Env Setup] ✅ Created .env.local - Please update with your actual keys"
    else
        echo "[Env Setup] ⚠️  Warning: .env.example not found"
    fi
else
    echo "[Env Setup] ✅ .env.local already exists"
fi

# ============================================
# DOCKER VOLUME MAPPING FIX
# ============================================
echo ""
echo "[Docker Setup] Updating docker-compose for proper JSONL file access..."

# We need to mount the user's .claude directory into the container
# This allows the container to read JSONL files created by Claude Desktop

# Check if docker-compose.yml exists
if [ -f "$PROJECT_DIR/docker-compose.yml" ]; then
    echo "[Docker Setup] ℹ️  Note: You may need to add this volume to docker-compose.yml:"
    echo "    volumes:"
    echo "      - $HOME_DIR/.claude:/root/.claude:ro"
    echo ""
fi

# ============================================
# COMPLETION
# ============================================
echo ""
echo "=========================================="
echo "  🎉 LOCAL DEV SETUP COMPLETE!"
echo "=========================================="
echo ""
echo "✅ Claude configuration initialized with projects object"
echo "✅ JSONL directory structure created at: $HOME_DIR/.claude/"
echo "✅ Symlink created for project access"
echo ""
echo "Next steps:"
echo "  1. Update .env.local with your API keys"
echo "  2. Add volume mount to docker-compose.yml (if using Docker):"
echo "     - $HOME_DIR/.claude:/root/.claude:ro"
echo "  3. Run: npm run dev"
echo ""
echo "The progress bar should now work correctly with proper session tracking!"
echo ""

exit 0