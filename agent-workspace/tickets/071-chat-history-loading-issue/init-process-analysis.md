# Initialization Process Analysis

## Problem Summary

We fixed the production issue by creating a symlink `/root/.claude -> /workspace/.claude`, but our initialization scripts create conflicting structures. We need to align all scripts with the correct architecture.

## Current vs Correct Architecture

### ❌ CURRENT WRONG APPROACH (init-claude-config.sh)

```
/root/.claude/               # ❌ Creates directory in ephemeral container home
  ├── .claude.json          # ❌ Lost on container restart
  └── projects/
      └── -workspace/       # ❌ History stored in ephemeral location
          └── *.jsonl
```

**Problems:**
- Creates files in `/root/` which is ephemeral (lost on restart)
- No symlink created
- History files stored in wrong location
- Doesn't persist across container restarts

### ✅ CORRECT APPROACH (setup-new-app.sh - OUTDATED)

```
/workspace/.claude/          # ✅ On persistent volume
  ├── .claude.json          # ✅ Persisted
  └── projects/
      └── -workspace-my-jarvis/  # ✅ History persisted
          └── *.jsonl

/workspace/.claude.json      # ❌ DUPLICATE - should NOT exist

/root/.claude -> /workspace/.claude       # ✅ Symlink
/root/.claude.json -> /workspace/.claude.json  # ❌ Should NOT exist
```

**Issues with setup-new-app.sh:**
1. Creates `/workspace/.claude.json` (duplicate) - should only be `/workspace/.claude/.claude.json`
2. Creates symlink to duplicate file
3. Uses wrong path: `/workspace/my-jarvis` instead of `/workspace`

### ✅ CORRECT FINAL ARCHITECTURE

```
/workspace/.claude/          # ✅ Single source of truth on persistent volume
  ├── .claude.json          # ✅ Only config file (no duplicate)
  └── projects/
      └── -workspace/       # ✅ Encoded name for /workspace path
          └── *.jsonl       # ✅ History files persist

/root/.claude -> /workspace/.claude  # ✅ Symlink for backend compatibility
```

**Why this is correct:**
1. Single `.claude.json` file at `/workspace/.claude/.claude.json`
2. No duplicate `.claude.json` at `/workspace/.claude.json`
3. Symlink from `/root/.claude` to `/workspace/.claude` (directory symlink, not file symlink)
4. Backend reads from `os.homedir()` which is `/root/`, resolves through symlink to persistent storage
5. Frontend uses `/workspace` path
6. History directory uses correct encoding: `/workspace` → `-workspace`

## Files That Need Updates

### 1. **scripts/init-claude-config.sh** (CRITICAL - runs on every container start)

**Current behavior:**
- Creates `/root/.claude/` directory
- Creates `/root/.claude.json` file
- Creates `/root/.claude/projects/-workspace/`

**Required changes:**
```bash
#!/bin/bash
set -e

echo "[Claude Init] Setting up .claude directory structure..."

# Create .claude directory structure on PERSISTENT DISK
mkdir -p /workspace/.claude/projects

# Create .claude.json config file on persistent disk (single source of truth)
cat > /workspace/.claude/.claude.json <<'EOF'
{
  "projects": {
    "/workspace": {}
  }
}
EOF

echo "[Claude Init] Created /workspace/.claude/.claude.json with workspace project"

# Create encoded project directory for history storage
ENCODED_NAME="-workspace"
mkdir -p "/workspace/.claude/projects/$ENCODED_NAME"

# Create symlink from container home to persistent disk (if not exists)
if [ ! -L /root/.claude ]; then
    rm -rf /root/.claude  # Remove if it's a directory
    ln -sf /workspace/.claude /root/.claude
    echo "[Claude Init] Created symlink: /root/.claude -> /workspace/.claude"
else
    echo "[Claude Init] Symlink already exists"
fi

echo "[Claude Init] .claude structure ready"
ls -la /workspace/.claude/
ls -la /workspace/.claude/projects/

exit 0
```

**Key changes:**
- Create everything in `/workspace/.claude/` (persistent)
- Config file at `/workspace/.claude/.claude.json` (not duplicate)
- Create symlink `/root/.claude -> /workspace/.claude`
- Idempotent (can run multiple times safely)

### 2. **scripts/setup-new-app.sh** (MEDIUM - used for new app creation)

**Current issues:**
- Creates duplicate `/workspace/.claude.json`
- Creates symlink to duplicate file
- Uses wrong path `/workspace/my-jarvis` instead of `/workspace`
- Creates wrong history directory `-workspace-my-jarvis`

**Required changes:**
```bash
# Line 75-93: REPLACE THIS SECTION

# Create .claude directory on PERSISTENT DISK
mkdir -p "$WORKSPACE_PARENT/.claude/projects"

# Create .claude.json config file INSIDE .claude directory (no duplicate)
cat > "$WORKSPACE_PARENT/.claude/.claude.json" <<'EOF'
{
  "projects": {
    "/workspace": {}
  }
}
EOF

echo "[Claude Setup] ✅ Created /workspace/.claude/.claude.json on persistent disk"

# Create encoded project directory for history storage
# Path encoding: "/workspace" → "-workspace"
ENCODED_NAME="-workspace"
mkdir -p "$WORKSPACE_PARENT/.claude/projects/$ENCODED_NAME"
echo "[Claude Setup] ✅ Created project history directory: -workspace"
```

**Lines 100-110: Update symlink creation**
```bash
# Remove any existing files/directories in container home
rm -rf /root/.claude

# Create symlink from container home to persistent disk (directory only, no file symlink)
ln -sf "$WORKSPACE_PARENT/.claude" /root/.claude

echo "[Claude Setup] ✅ Created symlink: /root/.claude -> /workspace/.claude"
```

**Key changes:**
- Config at `/workspace/.claude/.claude.json` (inside .claude directory)
- Remove creation of `/workspace/.claude.json` (duplicate)
- Remove file symlink for `.claude.json`
- Keep only directory symlink
- Use `/workspace` path (not `/workspace/my-jarvis`)

### 3. **Dockerfile** (LOW - only env vars)

**Line 55:**
```dockerfile
# CURRENT (WRONG):
ENV VITE_WORKING_DIRECTORY=/workspace/my-jarvis

# SHOULD BE:
ENV VITE_WORKING_DIRECTORY=/workspace
```

**Lines 85-86 (Keep these - already correct):**
```dockerfile
ENV ANTHROPIC_CONFIG_PATH=/workspace/.claude
ENV CLAUDE_CONFIG_DIR=/workspace/.claude
```

### 4. **workspace-template** (if needed)

Check if template includes any `.claude` files - it should NOT.
The `.claude` directory should only be created during initialization, not in the template.

## Directory Structure for New Apps

When a new app is created, here's what should exist:

```
/workspace/
├── .claude/                    # Created by init scripts
│   ├── .claude.json           # Single source of truth
│   └── projects/
│       └── -workspace/        # History storage
│           └── *.jsonl        # (empty initially)
├── CLAUDE.md                   # From template
├── tools/                      # From template
│   ├── src/
│   │   └── jarvis_voice.sh
│   └── config/
│       └── sample.env
├── my-jarvis/                  # From template
│   ├── JARVIS-CONSCIOUSNESS.md
│   └── docs/
└── spaces/                     # From template
    └── daniel/

/root/.claude -> /workspace/.claude  # Symlink created by init
```

**Key points:**
- Template provides: CLAUDE.md, tools/, my-jarvis/, spaces/
- Init script creates: .claude/ directory structure and symlink
- No duplicate `.claude.json` at `/workspace/.claude.json`
- Working directory is `/workspace` (not `/workspace/my-jarvis`)

## Implementation Priority

1. **HIGH PRIORITY:** Update `init-claude-config.sh` (runs on every start)
2. **HIGH PRIORITY:** Update `setup-new-app.sh` (affects new deployments)
3. **MEDIUM PRIORITY:** Update Dockerfile VITE_WORKING_DIRECTORY
4. **LOW PRIORITY:** Verify workspace-template doesn't include .claude files

## Testing Plan

After updates:
1. Deploy to test app (new Fly.io machine)
2. Verify structure: `ls -la /workspace/` and `ls -la /root/`
3. Verify symlink: `ls -la /root/.claude`
4. Verify no duplicate: `ls /workspace/.claude.json` should fail
5. Test history loading in web UI
6. Restart container and verify persistence
