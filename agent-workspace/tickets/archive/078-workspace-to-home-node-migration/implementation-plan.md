# Ticket #078: Workspace to Home/Node Migration

**Created**: 2025-11-07
**Status**: In Progress
**Impact**: Major Architecture Change - Simplifies entire system
**Purpose**: Migrate from `/workspace` to `/home/node` as the persistent volume mount point

## Executive Summary

We're eliminating the artificial separation between `/workspace` (persistent) and `/home/node` (ephemeral) by mounting the persistent volume directly at `/home/node`. This aligns perfectly with Claude Code's expectations and fixes all chat history issues permanently.

## Problem Being Solved

1. **Chat History Broken**: Claude Code expects projects at `/home/node`, but our data is in `/workspace`
2. **Configuration Conflicts**: Multiple `.claude.json` files fighting each other
3. **Unnecessary Complexity**: Fighting against Claude Code's natural behavior
4. **Path Translation Issues**: Constant need to map between `/workspace` and `/home/node`

## The Solution: Mount Volume at /home/node

### Before (Complex):
```
Container (Ephemeral):
/home/node/                    ← Gets wiped on restart
└── .claude.json              ← Claude Code creates this (wrong project path)

Volume (Persistent):
/workspace/                    ← Our actual data
├── CLAUDE.md
├── my-jarvis/
└── tools/
```

### After (Simple):
```
Volume mounted at /home/node (Persistent):
/home/node/                    ← This IS the volume now
├── CLAUDE.md
├── my-jarvis/
├── tools/
├── .claude/                   ← Claude Code manages this
└── .claude.json              ← Points to /home/node (correct!)
```

## Files to Update

### 1. fly.toml
```toml
# CHANGE:
[mounts]
  source = "workspace_data"
  destination = "/home/node"    # Was: /workspace

[env]
  # REMOVE these lines:
  # WORKSPACE_DIR = "/workspace"
```

### 2. Dockerfile
```dockerfile
# REMOVE these lines (volume will provide /home/node):
# RUN mkdir -p /home/node && \
#     chown -R node:node /home/node && \
#     mkdir -p /workspace && \
#     chown -R node:node /workspace

# CHANGE workspace-template copy:
COPY workspace-template /app/workspace-template

# REMOVE:
# WORKDIR /workspace

# CHANGE to:
WORKDIR /home/node

# REMOVE init-claude-config.sh:
# COPY scripts/init-claude-config.sh /app/scripts/init-claude-config.sh
# RUN chmod +x /app/scripts/init-claude-config.sh

# UPDATE CMD to remove init script:
CMD ["node", "/app/lib/claude-webui-server/dist/cli/node.js", "--port", "10000", "--host", "0.0.0.0"]
```

### 3. scripts/setup-new-app.sh
```bash
#!/bin/bash
set -e

# Update all paths from /workspace to /home/node
HOME_DIR="/home/node"
TEMPLATE_DIR="/app/workspace-template"
MARKER_FILE="$HOME_DIR/CLAUDE.md"

echo "=========================================="
echo "  MY JARVIS - NEW APP SETUP"
echo "=========================================="

# Check if already initialized
if [ -f "$MARKER_FILE" ]; then
    echo "❌ ERROR: Already initialized!"
    echo "   CLAUDE.md exists at: $MARKER_FILE"
    exit 1
fi

echo "✅ Confirmed: This is a new installation"

# Copy template files to home directory
echo "[Setup] 🚀 Copying template files..."

cp "$TEMPLATE_DIR/CLAUDE.md" "$HOME_DIR/"
cp -r "$TEMPLATE_DIR/tools" "$HOME_DIR/"
cp -r "$TEMPLATE_DIR/my-jarvis" "$HOME_DIR/"

echo "[Setup] ✅ All template files copied"

# Create .env file with onboarding key
if [ ! -f "$HOME_DIR/tools/config/.env" ]; then
    cat > "$HOME_DIR/tools/config/.env" <<'EOF'
# OpenAI API Key - Temporary onboarding key
OPENAI_API_KEY=your-openai-api-key-here
EOF
    chmod 600 "$HOME_DIR/tools/config/.env"
    echo "[Setup] ✅ Created .env file with onboarding key"
fi

# Fix ownership (running as root via SSH)
chown -R node:node "$HOME_DIR"
echo "[Setup] ✅ Set ownership to node:node"

echo ""
echo "=========================================="
echo "  🎉 SETUP COMPLETE!"
echo "=========================================="
echo ""
echo "✅ App initialized at: $HOME_DIR"
echo "🔊 Voice enabled with onboarding key"
echo ""
echo "Access your app at: https://<app-name>.fly.dev"
echo ""

exit 0
```

### 4. scripts/docker-entrypoint.sh
```bash
#!/bin/bash
set -e

# Simplified: Just fix permissions if needed and switch to node user
if [ -d "/home/node" ] && [ "$(stat -c '%u' /home/node)" = "0" ]; then
    echo "[Entrypoint] Fixing /home/node permissions..."
    chown -R node:node /home/node
fi

echo "[Entrypoint] Starting as node user..."
cd /home/node
exec gosu node "$@"
```

### 5. DELETE scripts/init-claude-config.sh
This script is no longer needed. Claude Code will manage its own configuration naturally.

### 6. workspace-template/CLAUDE.md
Update all references from `/workspace` to `/home/node`:
- Change paths in examples
- Update WORKSPACE_ROOT references

### 7. workspace-template/tools/src/jarvis_voice.sh
Update WORKSPACE_ROOT detection:
```bash
# Auto-detect workspace root
if [ -n "$WORKSPACE_ROOT" ]; then
    # Use environment variable if set
    WORKSPACE_ROOT="$WORKSPACE_ROOT"
elif [ -d "/home/node/tools" ]; then
    # Docker environment
    WORKSPACE_ROOT="/home/node"
elif [ -d "$(dirname "$0")/../../tools" ]; then
    # Local environment (relative to script)
    WORKSPACE_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
else
    echo "Error: Cannot determine workspace root"
    exit 1
fi
```

### 8. deployment.md
Update all documentation to reflect:
- Mount point is now `/home/node`
- No more `/workspace` directory
- Simplified architecture explanation
- Updated SSH commands
- Remove references to init-claude-config.sh

## Testing Plan

### Step 1: Delete existing test app
```bash
fly apps destroy my-jarvis-erez-dev -y
```

### Step 2: Create fresh app
```bash
fly apps create my-jarvis-erez-dev
```

### Step 3: Deploy with new configuration
```bash
fly deploy --app my-jarvis-erez-dev
```

### Step 4: Initialize
```bash
fly ssh console -a my-jarvis-erez-dev
/app/scripts/setup-new-app.sh
exit
```

### Step 5: Verify
1. Access https://my-jarvis-erez-dev.fly.dev
2. Say "Hi" - voice should work
3. Check chat history - should work immediately
4. Verify API: `curl https://my-jarvis-erez-dev.fly.dev/api/projects`
   - Should return `/home/node` as the project path

## Benefits of This Change

1. **Simplicity**: Single directory structure, no path mapping
2. **Reliability**: Claude Code works naturally without configuration
3. **Maintainability**: No workarounds or hacks to maintain
4. **Performance**: No symlinks or redirections
5. **Future-proof**: Aligned with Claude Code's design

## Migration for Existing Apps

For apps already using `/workspace`:
1. Create migration script to copy data
2. Update fly.toml mount point
3. Redeploy
4. Run migration script once

## Success Criteria

- [ ] Chat history works immediately after deployment
- [ ] Voice works from first interaction
- [ ] API returns correct project path (`/home/node`)
- [ ] No `.claude.json` conflicts
- [ ] File tree shows user files (not lost+found prominently)

## Notes

- The `lost+found` directory will still exist (filesystem requirement) but will be in `/home/node/lost+found`
- Consider hiding it in the UI file tree component
- This change makes the system significantly simpler and more maintainable

---

**Status**: Ready for implementation and testing