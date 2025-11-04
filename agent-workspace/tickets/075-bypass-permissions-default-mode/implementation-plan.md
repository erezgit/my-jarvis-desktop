# Ticket 075: Non-Root Docker Container with bypassPermissions Mode

## Status: ✅ COMPLETED - Tested and Verified on my-jarvis-erez-dev

## Objective
Run Docker containers as non-root user (node, UID 1000) to enable `bypassPermissions` mode in Claude Code, eliminating all permission prompts while maintaining secure sandboxed operations.

## Success Criteria
- ✅ Container runs as `node` user (not root)
- ✅ Full filesystem access without permission denials
- ✅ Web searches and network calls working
- ✅ Process inspection functional
- ✅ Zero permission prompts in UI
- ✅ Volume data preserved across deployment
- ✅ Health checks passing

## Implementation Summary

### Files Modified

1. **Dockerfile** - `/workspace/my-jarvis/projects/my-jarvis-desktop/Dockerfile`
2. **docker-entrypoint.sh** - `/workspace/my-jarvis/projects/my-jarvis-desktop/scripts/docker-entrypoint.sh`
3. **init-claude-config.sh** - `/workspace/my-jarvis/projects/my-jarvis-desktop/scripts/init-claude-config.sh`
4. **usePermissionMode.ts** - `/workspace/my-jarvis/projects/my-jarvis-desktop/app/hooks/chat/usePermissionMode.ts`
5. **chat.ts** - `/workspace/my-jarvis/projects/my-jarvis-desktop/lib/claude-webui-server/handlers/chat.ts`

---

## Complete Implementation Guide

### Step 1: Install gosu in Dockerfile

**File:** `Dockerfile`

**Location:** In the `apt-get install` section (around line 4-13)

**Change:**
```dockerfile
# Install system dependencies for Claude Agent SDK, voice generation, and node-pty compilation
RUN apt-get update && apt-get install -y \
    git \
    python3 \
    python3-pip \
    curl \
    build-essential \
    make \
    g++ \
    rsync \
    gosu \
    && rm -rf /var/lib/apt/lists/*
```

**Why:** `gosu` is the cleanest way to drop privileges from root to non-root user. Unlike `su` or `runuser`, it properly handles Docker CMD arrays.

---

### Step 2: Set HOME and Ensure /home/node Exists

**File:** `Dockerfile`

**Location:** After pip install, around line 20-32

**Change:**
```dockerfile
# Node.js official image already includes 'node' user with UID/GID 1000
# No need to create appuser - we'll use the existing node user
# Set HOME environment variable for node user
ENV HOME=/home/node

# Ensure /home/node exists and is owned by node user
# Create workspace directory for persistent storage
RUN mkdir -p /home/node && \
    chown -R node:node /home/node && \
    mkdir -p /workspace && \
    chown -R node:node /workspace
```

**Why:**
- Claude CLI looks for config in `$HOME/.claude`
- Node.js official image has `node` user pre-configured with UID/GID 1000
- We must ensure `/home/node` exists and has correct ownership

---

### Step 3: Add Entrypoint Configuration to Dockerfile

**File:** `Dockerfile`

**Location:** Before CMD, around line 96-101

**Change:**
```dockerfile
# Copy entrypoint script to system location
COPY scripts/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Use entrypoint to fix volume permissions and drop to non-root user
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
```

**Why:** Entrypoint runs before CMD and allows us to fix permissions and switch users.

---

### Step 4: Create docker-entrypoint.sh Script

**File:** `scripts/docker-entrypoint.sh`

**Create new file with this content:**
```bash
#!/bin/bash
set -e

# This script runs as root to fix volume permissions, then drops to non-root user (node)

# Fix ownership of mounted volume (if it exists and is owned by root)
if [ -d "/workspace" ] && [ "$(stat -c '%u' /workspace)" = "0" ]; then
    echo "[Entrypoint] Fixing /workspace permissions for node user..."
    chown -R node:node /workspace
fi

# Drop privileges to node user and execute the command
echo "[Entrypoint] Switching to node user (UID 1000) and executing: $@"

# Use gosu to switch user and execute command
# gosu properly handles argument arrays from Docker CMD
cd /workspace
exec gosu node "$@"
```

**Why:**
- Container starts as root (needed to fix volume permissions)
- Checks if `/workspace` is owned by root (happens on Fly.io volume mounts)
- Uses `chown -R` to give ownership to `node` user
- Uses `gosu` to drop privileges and execute CMD as `node` user
- `gosu` properly handles the CMD array: `["/bin/bash", "-c", "long command"]`

**CRITICAL:** Do NOT use `su` or `runuser` - they have issues with CMD argument handling. Only `gosu` works correctly.

---

### Step 5: Update init-claude-config.sh

**File:** `scripts/init-claude-config.sh`

**Replace entire content:**
```bash
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
```

**Why:**
- Creates config in `/home/node/.claude` (not `/root/.claude`)
- Script runs as `node` user (via entrypoint), so has correct permissions
- Eliminated complex symlink approach

---

### Step 6: Update Frontend to bypassPermissions Mode

**File:** `app/hooks/chat/usePermissionMode.ts`

**Location:** In the `useState` initialization (around line 16)

**Change:**
```typescript
/**
 * Hook for managing PermissionMode state within a browser session.
 * State is preserved across component re-renders but resets on page reload.
 * No localStorage persistence - simple React state management.
 *
 * Defaults to bypassPermissions mode to eliminate all permission prompts.
 * Safe to use now that containers run as non-root user (node user, UID 1000).
 * Claude CLI's root user restriction no longer applies.
 */
export function usePermissionMode(): UsePermissionModeResult {
  const [permissionMode, setPermissionModeState] =
    useState<PermissionMode>("bypassPermissions");
```

**Why:**
- `bypassPermissions` eliminates ALL permission prompts
- Only safe when running as non-root (otherwise Claude CLI blocks it)
- Now that we run as `node` user, this restriction doesn't apply

---

### Step 7: Simplify Backend allowedTools Logic

**File:** `lib/claude-webui-server/handlers/chat.ts`

**Remove:** Lines 1-36 (entire `loadAllowedTools()` function)
**Remove:** Lines 5-6 (imports: `readFile`, `join`)
**Remove:** Lines 117-132 (all debug logging and tool merging logic)

**Keep simple approach:**
```typescript
// In the executeClaudeCommand call, just pass:
chatRequest.allowedTools,  // Pass directly from frontend without backend merging
```

**Why:**
- Eliminated unnecessary complexity
- Frontend already has the correct tools list
- No need for backend persistence or merging logic

---

## Debugging Journey (Important Lessons)

### Issue 1: Container Kept Crashing
**Symptom:** Container would start then immediately stop, showing "stopped" state.

**Root Causes Found:**
1. ❌ First tried `runuser -u node "$@"` - Failed because `runuser` interpreted `-c` from CMD array as its own option
2. ❌ Then tried `su - node -c "cd /workspace && exec $*"` - Failed because `$*` didn't properly expand CMD array
3. ❌ Then tried `su node -c "exec $*"` - Failed for same reason
4. ✅ **Solution:** Use `gosu node "$@"` - gosu properly handles CMD arrays

**Key Learning:** When Docker passes CMD as `["/bin/bash", "-c", "command"]`, you need a tool that handles arrays correctly. Only `gosu` (and `su-exec`) work properly.

### Issue 2: Permission Denied on /home/node
**Symptom:** init-claude-config.sh failed to create `.claude` directory.

**Root Cause:** `/home/node` directory didn't exist or wasn't owned by `node` user.

**Solution:**
```dockerfile
RUN mkdir -p /home/node && \
    chown -R node:node /home/node
```

### Issue 3: Volume Data Preservation
**Symptom:** Concern about losing volume data during deployment.

**Verification:**
- Deployed to my-jarvis-erez-dev successfully
- Volume data remained intact
- Entrypoint only changes ownership if directory is root-owned
- Existing files/directories owned by `node` are untouched

**Key Learning:** The `chown -R node:node /workspace` in entrypoint is safe and idempotent. It only runs if workspace is owned by root (fresh volume mount).

---

## Deployment Process (One-Shot Guide)

### For Each App Deployment:

1. **Verify all 7 file changes are present** (use git diff to confirm)

2. **Deploy using standard process:**
   ```bash
   cd /workspace/my-jarvis/projects/my-jarvis-desktop
   ./deploy.sh --app <app-name> --update-only
   ```

3. **Verify deployment:**
   ```bash
   # Check app status
   flyctl status -a <app-name>
   # Should show: STATE=started, CHECKS=1 passing

   # Verify running as node user
   flyctl ssh console -a <app-name> -C "ps aux | grep 'node /app'"
   # Should show: node    651  ... node /app/lib/claude-webui-server/...

   # Check workspace ownership
   flyctl ssh console -a <app-name> -C "stat -c '%U:%G' /workspace"
   # Should show: node:node

   # Test health endpoint
   curl https://<app-name>.fly.dev/health
   # Should return: {"status":"ok",...}
   ```

4. **If container is in "stopped" state:**
   - Check logs for errors: `flyctl logs -a <app-name>`
   - Most likely cause: entrypoint script issue
   - Verify entrypoint script has exact content from Step 4
   - Manual restart may be needed: `flyctl machine restart <machine-id> -a <app-name>`

---

## Apps to Update

**Verified Working:**
- ✅ my-jarvis-erez-dev (tested and confirmed)

**Pending Deployment:**
- [ ] my-jarvis-erez (production - Jarvis Ares)
- [ ] my-jarvis-lilach
- [ ] my-jarvis-daniel
- [ ] my-jarvis-ido

---

## Next Steps for Deployment Agent

**When you read this ticket, your task is to:**

1. **Pull latest changes from git** (this ticket and all implementation files)

2. **Deploy to all pending apps in order:**
   - Start with my-jarvis-erez (production - Jarvis Ares)
   - Then my-jarvis-lilach
   - Then my-jarvis-daniel
   - Finally my-jarvis-ido

3. **For each app:**
   - Run verification steps from "Deployment Process" section above
   - Confirm health endpoint responds
   - Confirm running as `node` user
   - Test one Claude Code operation to verify no permission prompts

4. **If any deployment fails:**
   - Check logs immediately
   - Compare entrypoint script with working version from my-jarvis-erez-dev
   - Most common issue: entrypoint script syntax
   - Refer to "Debugging Journey" section for troubleshooting

5. **Document any issues encountered** and update this ticket

---

## Technical Notes

### Why This Architecture Works

1. **Security:** Non-root execution prevents privilege escalation attacks
2. **Compatibility:** Claude CLI's root restriction no longer applies
3. **Flexibility:** `bypassPermissions` mode eliminates ALL prompts
4. **Reliability:** Volume data preserved, idempotent operations
5. **Portability:** Works on any Docker/Fly.io environment

### Volume Ownership Pattern

- Fly.io mounts volumes as root by default
- Entrypoint checks if `/workspace` is root-owned
- Only runs `chown` if needed (idempotent)
- Subsequent restarts skip chown (fast startup)
- User data always preserved

### Claude CLI Configuration

- Runs as child process of Node.js server
- Inherits environment including `HOME=/home/node`
- Automatically finds config at `$HOME/.claude`
- No symlinks needed, clean architecture

---

## Verification Checklist

**Before closing ticket, confirm for ALL apps:**

- [ ] Container state: "started"
- [ ] Health checks: "1 passing"
- [ ] Process owner: `node` (not root)
- [ ] Workspace ownership: `node:node`
- [ ] Claude config exists: `/home/node/.claude/.claude.json`
- [ ] Health endpoint responds: `https://<app>.fly.dev/health`
- [ ] No permission prompts in UI during Claude Code operations

---

**Implementation Date:** 2025-11-04
**Tested By:** Jarvis Ares (my-jarvis-erez-dev)
**Stress Test Results:** "Everything's working perfectly! Full capabilities without root privileges. Implementation is fucking bulletproof!"
