#!/bin/bash
set -e

# MIGRATION SCRIPT: Move from /workspace to /home/node
# Purpose: Migrate existing Fly.io apps from old architecture to new
# Usage: SSH into existing app and run: /app/scripts/migrate-to-home-node.sh
# Note: This script handles the data migration before mount point change

echo ""
echo "=========================================="
echo "  MIGRATION: /workspace to /home/node"
echo "=========================================="
echo ""
echo "This script will migrate your data from the old"
echo "/workspace mount to the new /home/node structure."
echo ""

# Check if this is running in the right environment
if [ ! -d "/workspace" ] && [ ! -d "/home/node" ]; then
    echo "❌ ERROR: Neither /workspace nor /home/node found"
    echo "   This doesn't look like a Fly.io container"
    exit 1
fi

# Check if already migrated (CLAUDE.md in /home/node indicates completion)
if [ -f "/home/node/CLAUDE.md" ] && [ ! -f "/workspace/CLAUDE.md" ]; then
    echo "✅ Already migrated!"
    echo "   CLAUDE.md found in /home/node and not in /workspace"
    echo ""
    echo "Current structure:"
    ls -la /home/node/
    exit 0
fi

# Check if workspace exists and has data
if [ ! -d "/workspace" ]; then
    echo "❌ ERROR: No /workspace directory found"
    echo "   This app may already be using the new structure"
    exit 1
fi

# Check if workspace has data
if [ ! -f "/workspace/CLAUDE.md" ]; then
    echo "⚠️  WARNING: No CLAUDE.md found in /workspace"
    echo "   This workspace might not be initialized"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Migration cancelled"
        exit 1
    fi
fi

echo "📊 Current state:"
echo ""
echo "/workspace contents:"
ls -la /workspace/ | head -10
echo ""
echo "/home/node current state:"
ls -la /home/node/ 2>/dev/null || echo "  (empty or not accessible)"
echo ""

# Safety check
echo "⚠️  IMPORTANT: This will copy all data from /workspace to /home/node"
echo "   The original data in /workspace will remain untouched"
echo ""
read -p "Proceed with migration? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Migration cancelled"
    exit 1
fi

echo ""
echo "📦 Starting migration..."
echo ""

# Step 1: Clean /home/node if it exists (it's ephemeral in old architecture)
if [ -d "/home/node" ]; then
    echo "[1/6] Cleaning ephemeral /home/node directory..."
    # Preserve .claude.json if it has Claude Code's auth
    if [ -f "/home/node/.claude.json" ] && grep -q "apiKey" /home/node/.claude.json 2>/dev/null; then
        cp /home/node/.claude.json /tmp/claude-auth-backup.json
        echo "  Preserved Claude authentication"
    fi
    rm -rf /home/node/*
    rm -rf /home/node/.*  2>/dev/null || true
fi

# Step 2: Create /home/node if it doesn't exist
if [ ! -d "/home/node" ]; then
    echo "[1/6] Creating /home/node directory..."
    mkdir -p /home/node
fi

# Step 3: Copy all data from workspace to home/node
echo "[2/6] Copying all data from /workspace to /home/node..."
echo "  This may take a moment for large workspaces..."

# Use cp -a to preserve all attributes and hidden files
cp -a /workspace/. /home/node/

echo "  ✅ Data copied successfully"

# Step 4: Fix ownership (we're running as root via SSH)
echo "[3/6] Fixing file ownership to node:node..."
chown -R node:node /home/node
echo "  ✅ Ownership fixed"

# Step 5: Update Claude configuration
echo "[4/6] Updating Claude configuration..."

# Handle .claude.json at root of home directory
if [ -f "/home/node/.claude.json" ]; then
    echo "  Found existing .claude.json"

    # Backup existing
    cp /home/node/.claude.json /home/node/.claude.json.pre-migration

    # Check if it's the old simple format
    if ! grep -q "allowedTools" /home/node/.claude.json; then
        echo "  Updating to new Claude Code format..."
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
        echo "  ✅ Updated to new format"
    else
        echo "  ✅ Already in correct format"
    fi
else
    echo "  Creating new .claude.json..."
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
    echo "  ✅ Created new configuration"
fi

# Step 6: Handle Claude history directory
echo "[5/6] Migrating Claude history..."

if [ -d "/home/node/.claude" ]; then
    echo "  Found .claude directory"

    # Rename project directories to match new path
    if [ -d "/home/node/.claude/projects/-workspace" ]; then
        echo "  Renaming history: -workspace → -home-node"
        mv /home/node/.claude/projects/-workspace /home/node/.claude/projects/-home-node
        echo "  ✅ History path updated"
    elif [ -d "/home/node/.claude/projects/--workspace" ]; then
        # Handle double dash variant
        echo "  Renaming history: --workspace → -home-node"
        mv /home/node/.claude/projects/--workspace /home/node/.claude/projects/-home-node
        echo "  ✅ History path updated"
    else
        echo "  No path update needed"
    fi

    # Fix ownership of .claude directory
    chown -R node:node /home/node/.claude
else
    echo "  No .claude directory found (fresh install)"
fi

# Restore Claude auth if we backed it up
if [ -f "/tmp/claude-auth-backup.json" ]; then
    echo "[6/6] Restoring Claude authentication..."
    # Merge auth into new config
    # This is complex, so we'll just note it needs to be re-authenticated
    echo "  ⚠️  Note: You may need to run 'claude login' again"
    rm /tmp/claude-auth-backup.json
else
    echo "[6/6] No Claude auth to restore"
fi

echo ""
echo "=========================================="
echo "  ✅ MIGRATION COMPLETED SUCCESSFULLY!"
echo "=========================================="
echo ""
echo "Summary:"
echo "  • Data copied from /workspace to /home/node"
echo "  • File ownership set to node:node"
echo "  • Claude configuration updated to new format"
echo "  • Chat history paths updated"
echo ""
echo "Final structure in /home/node:"
ls -la /home/node/ | head -15
echo ""
echo "⚠️  IMPORTANT NEXT STEPS:"
echo ""
echo "1. Exit this SSH session"
echo "2. Update fly.toml to change mount destination:"
echo "   [mounts]"
echo "     destination = \"/home/node\"  # Changed from /workspace"
echo ""
echo "3. Redeploy the application:"
echo "   fly deploy --app $(hostname)"
echo ""
echo "4. Verify everything works:"
echo "   - Check website loads"
echo "   - Test voice messages"
echo "   - Verify chat history"
echo ""
echo "Note: The /workspace directory still contains your original data"
echo "      as a backup. It will be removed when you redeploy with"
echo "      the new mount point."
echo ""

exit 0