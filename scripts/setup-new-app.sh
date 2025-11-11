#!/bin/bash
set -e

# NEW APP SETUP SCRIPT
# Purpose: Initialize workspace for a BRAND NEW Fly.io app
# When to use: ONLY when creating a new app for the first time
# Usage: SSH into new Fly.io machine and run: /app/scripts/setup-new-app.sh
# Note: This script runs as root (via SSH) but sets up files for node user

HOME_DIR="/home/node"
TEMPLATE_DIR="/app/workspace-template"
MARKER_FILE="$HOME_DIR/CLAUDE.md"

echo ""
echo "=========================================="
echo "  MY JARVIS - NEW APP SETUP"
echo "=========================================="
echo ""

# Check if home directory is already initialized
if [ -f "$MARKER_FILE" ]; then
    echo "❌ ERROR: Home directory already initialized!"
    echo "   CLAUDE.md marker file exists at: $MARKER_FILE"
    echo ""
    echo "   This script should ONLY be run on new apps."
    echo "   For updates, use: /app/scripts/update-workspace.sh"
    echo ""
    exit 1
fi

echo "✅ Confirmed: This is a new installation (no CLAUDE.md marker)"
echo ""

# Copy ALL template files to home directory
if [ ! -d "$TEMPLATE_DIR" ]; then
    echo "❌ ERROR: Template directory not found at $TEMPLATE_DIR"
    exit 1
fi

echo "[Setup] 🚀 Copying all template files to home directory..."
echo ""

# Copy CLAUDE.md to home directory root (marker file)
if [ -f "$TEMPLATE_DIR/CLAUDE.md" ]; then
    cp "$TEMPLATE_DIR/CLAUDE.md" "$HOME_DIR/"
    echo "[Setup] ✅ Copied CLAUDE.md to home directory"
fi

# Copy tools directory to home directory
if [ -d "$TEMPLATE_DIR/tools" ]; then
    cp -r "$TEMPLATE_DIR/tools" "$HOME_DIR/"
    echo "[Setup] ✅ Copied tools/ directory"
fi

# Copy guides directory
if [ -d "$TEMPLATE_DIR/guides" ]; then
    cp -r "$TEMPLATE_DIR/guides" "$HOME_DIR/"
    echo "[Setup] ✅ Copied guides/ directory"
fi

# Copy my-jarvis project directory
if [ -d "$TEMPLATE_DIR/my-jarvis" ]; then
    cp -r "$TEMPLATE_DIR/my-jarvis" "$HOME_DIR/"
    echo "[Setup] ✅ Copied my-jarvis/ project directory"
fi

# Spaces directory no longer needed in simplified architecture

echo ""
echo "[Setup] ✅ All template files copied successfully"

# CRITICAL: Fix ownership for node user (since we're running as root via SSH)
echo ""
echo "[Setup] 🔧 Fixing file ownership for node user..."
chown -R node:node "$HOME_DIR"
chmod -R 755 "$HOME_DIR/tools"
echo "[Setup] ✅ Set ownership to node:node and fixed permissions"

# ============================================
# CLAUDE CONFIGURATION - CREATE PROJECTS OBJECT
# ============================================
echo ""
echo "[Claude Setup] Creating Claude configuration with projects object..."

# Create .claude.json with projects object for chat history API
cat > "$HOME_DIR/.claude.json" << 'EOF'
{
  "projects": {
    "/home/node": {
      "allowedTools": ["Read", "Write", "Edit", "Bash"],
      "history": [],
      "mcpServers": {},
      "exampleFiles": [],
      "mcpContextUris": []
    }
  }
}
EOF

# Create .claude directory structure for history storage
mkdir -p "$HOME_DIR/.claude/projects/-home-node"
chown -R node:node "$HOME_DIR/.claude"
chown node:node "$HOME_DIR/.claude.json"
echo "[Claude Setup] ✅ Created .claude.json with projects object for chat history"

# NOTE: history.jsonl is Claude Code's command history (not chat history)
# It gets created automatically when user runs commands in Claude Code terminal
# Not needed for chat history auto-loading - that uses individual conversation JSONL files

# ============================================
# CLAUDE CODE - NO AUTO-AUTHENTICATION
# ============================================
echo ""
echo "[Claude Code] User will need to authenticate Claude Code manually"
echo "              Run 'claude login' in the terminal when ready to use agent features"

# ============================================
# API CONFIGURATION - CREATE .ENV FROM EXAMPLE
# ============================================
echo ""
echo "[API Setup] Creating .env file from example template..."

# Create .env file from .env.example
if [ ! -f "$HOME_DIR/tools/config/.env" ]; then
    if [ -f "$HOME_DIR/tools/config/.env.example" ]; then
        # Create .env with onboarding key for initial voice interaction
        # User will replace this with their own key during onboarding
        cat > "$HOME_DIR/tools/config/.env" <<'EOF'
# OpenAI API Key for voice generation
# This is a temporary onboarding key for first interaction
# You will be asked to provide your own OpenAI API key during setup
OPENAI_API_KEY=your-openai-api-key-here
EOF
        chown node:node "$HOME_DIR/tools/config/.env"
        chmod 600 "$HOME_DIR/tools/config/.env"  # Secure permissions
        echo "[API Setup] ✅ Created .env file with onboarding key (enables voice from first interaction)"
    else
        echo "[API Setup] ⚠️  Warning: .env.example not found, skipping .env creation"
    fi
else
    echo "[API Setup] ✅ .env file already exists"
fi

# ============================================
# COMPLETION
# ============================================
echo ""
echo "=========================================="
echo "  🎉 NEW APP SETUP COMPLETE!"
echo "=========================================="
echo ""
echo "App initialized at: $HOME_DIR"
echo ""
echo "Final structure:"
ls -la "$WORKSPACE_PARENT"
echo ""
echo "File ownership verification:"
stat -c "Owner: %U:%G" "$WORKSPACE_PARENT/tools"
echo ""
echo "✅ This app is now ready to use!"
echo "🔊 Voice enabled from first interaction (onboarding key installed)"
echo "👤 Files owned by node user for proper web access"
echo ""
echo "Next steps:"
echo "  1. Exit this SSH session"
echo "  2. Access your app at: https://<app-name>.fly.dev"
echo "  3. Start using the application!"
echo ""
echo "Note: Claude configuration has been initialized:"
echo "      - Config: /home/node/.claude.json (for API project discovery)"
echo "      - History: /home/node/.claude/ (for conversation storage)"
echo ""

exit 0
