# Script Architecture Analysis

## Current State - What Scripts Exist

We currently have **7 scripts** in `/workspace/my-jarvis/projects/my-jarvis-desktop/scripts/`:

### 1. **init-claude-config.sh** (832 bytes)
- **When it runs:** AUTOMATICALLY on EVERY container start (in Dockerfile CMD)
- **What it does:** Creates `/root/.claude/` directory structure
- **Problem:** Creates files in ephemeral location, breaks symlinks

### 2. **setup-new-app.sh** (4,261 bytes)
- **When it runs:** MANUALLY via SSH, ONCE per new app
- **What it does:** Copies template files + creates `/workspace/.claude/` + creates symlinks
- **Problem:** Creates duplicate `.claude.json`, wrong path `/workspace/my-jarvis`

### 3. **update-workspace.sh** (6,878 bytes)
- **When it runs:** MANUALLY via SSH on existing apps
- **What it does:** Updates specific files (--tools, --claude-md, --sync-files)
- **Status:** Actually well-designed! Has safety checks and selective updates

### 4. **init-workspace.sh** (426 bytes)
- **When it runs:** Unknown/unclear
- **What it does:** Creates `/workspace/my-jarvis/`, copies template
- **Problem:** DUPLICATE of setup-new-app.sh, wrong path

### 5. **sync-files.sh** (365 bytes)
- **When it runs:** Unknown/unclear
- **What it does:** Syncs template to `/workspace/my-jarvis/`
- **Problem:** DUPLICATE of update-workspace.sh --sync-files, wrong path

### 6. **fix-claude-config-prod.sh** (3,421 bytes)
- **When it runs:** MANUALLY from host machine for emergency fixes
- **What it does:** Fixed production path mismatch
- **Status:** TEMPORARY FIX - should be deleted after proper fix

### 7. **fix-claude-structure-production.sh** (4,603 bytes)
- **When it runs:** MANUALLY from host machine for emergency fixes
- **What it does:** Fixed symlink structure in production
- **Status:** TEMPORARY FIX - should be deleted after proper fix

## Your Vision - 3 Clean Scripts

You want **exactly 3 scripts**:

### Script 1: Create New App (MANUAL, ONE-TIME)
- **Name:** `setup-new-app.sh`
- **When:** SSH into brand new Fly.io app after first deployment
- **What:**
  - Copy ALL template files to `/workspace/`
  - Create `/workspace/.claude/` structure with correct paths
  - Create symlink `/root/.claude -> /workspace/.claude`
  - NO checking if files exist - just OVERWRITE everything
  - Initialize fresh structure
- **Working directory:** `/workspace` (NOT `/workspace/my-jarvis`)

### Script 2: Update App Code (AUTOMATIC ON DEPLOY)
- **Name:** `deploy.sh` or `build.sh` (Docker deployment)
- **When:** During `fly deploy` (rebuilds container image)
- **What:**
  - Build new Docker image
  - Update application code
  - NEVER touch `/workspace/` persistent volume
  - NEVER touch user data
- **This is already handled by:** Dockerfile + fly deploy

### Script 3: Update Workspace Files (MANUAL, SELECTIVE)
- **Name:** `update-workspace.sh` (KEEP THIS ONE - it's good!)
- **When:** SSH into existing app to update specific files
- **What:**
  - `--tools` - Update tools directory
  - `--claude-md` - Update CLAUDE.md
  - `--sync-files` - Sync user-specific files
  - Safety checks: only runs on initialized workspaces
  - Creates backups before updating
- **Status:** Already well-designed, just needs path fixes

## The Missing Piece - Boot Script

There's actually a **4th script** we need that you didn't mention:

### Script 4: Boot Initialization (AUTOMATIC ON EVERY START)
- **Name:** `init-claude-config.sh` (keep name, fix behavior)
- **When:** EVERY container start (Dockerfile CMD)
- **What:**
  - Check if `/workspace/.claude` exists
  - If YES: Just ensure symlink `/root/.claude -> /workspace/.claude` exists
  - If NO: Create minimal structure in `/workspace/.claude` + symlink
  - IDEMPOTENT: Safe to run multiple times
  - NEVER overwrite existing structure
- **Why we need it:** Container home (`/root/`) is ephemeral, resets on restart

## Clean Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    DEPLOYMENT LIFECYCLE                      │
└─────────────────────────────────────────────────────────────┘

1. FIRST DEPLOYMENT (New App)
   ├─> fly deploy (builds image, deploys container)
   ├─> Container starts
   ├─> init-claude-config.sh runs automatically
   │   └─> Creates minimal /workspace/.claude/ + symlink
   ├─> SSH into app manually
   └─> Run: setup-new-app.sh
       └─> Copies templates, initializes full workspace

2. CODE UPDATE (Existing App)
   ├─> fly deploy (rebuilds image, redeploys)
   ├─> Container restarts
   └─> init-claude-config.sh runs automatically
       └─> Sees /workspace/.claude exists, just ensures symlink

3. FILE UPDATE (Existing App)
   ├─> SSH into app manually
   └─> Run: update-workspace.sh --tools (or other options)
       └─> Selectively updates files, creates backups

┌─────────────────────────────────────────────────────────────┐
│                   PERSISTENT vs EPHEMERAL                    │
└─────────────────────────────────────────────────────────────┘

PERSISTENT (/workspace/) - Fly.io volume, survives restarts
├── .claude/
│   ├── .claude.json          ← Single source of truth
│   └── projects/
│       └── -workspace/
│           └── *.jsonl       ← Chat history
├── CLAUDE.md                 ← From template
├── tools/                    ← From template
├── my-jarvis/                ← From template
└── spaces/                   ← From template

EPHEMERAL (/root/) - Container home, reset on restart
└── .claude -> /workspace/.claude  ← Symlink (recreated by init)
```

## Scripts to Keep vs Delete

### ✅ KEEP (3 scripts):
1. **setup-new-app.sh** - Create new app (needs fixes)
2. **update-workspace.sh** - Update workspace files (needs path fixes)
3. **init-claude-config.sh** - Boot initialization (needs complete rewrite)

### ❌ DELETE (4 scripts):
1. **init-workspace.sh** - Duplicate of setup-new-app.sh
2. **sync-files.sh** - Duplicate of update-workspace.sh --sync-files
3. **fix-claude-config-prod.sh** - Temporary emergency fix
4. **fix-claude-structure-production.sh** - Temporary emergency fix

### ℹ️ OTHER SCRIPTS (not related to workspace init):
- **after-pack.js** - Electron build script (keep)
- **health-check.sh** - Monitoring (keep)
- **health-monitor.sh** - Monitoring (keep)

## What Needs to Change

### 1. init-claude-config.sh (COMPLETE REWRITE)
```bash
#!/bin/bash
set -e

echo "[Claude Init] Setting up .claude directory structure..."

# If /workspace/.claude already exists (app already initialized)
if [ -d "/workspace/.claude" ]; then
    echo "[Claude Init] Found existing /workspace/.claude (app already initialized)"

    # Just ensure symlink exists
    if [ ! -L /root/.claude ]; then
        rm -rf /root/.claude
        ln -sf /workspace/.claude /root/.claude
        echo "[Claude Init] Created symlink: /root/.claude -> /workspace/.claude"
    else
        echo "[Claude Init] Symlink already exists"
    fi

    echo "[Claude Init] Initialization complete (existing app)"
    exit 0
fi

# If we get here, this is first boot before setup-new-app.sh runs
# Create minimal structure so Claude CLI doesn't crash
echo "[Claude Init] Creating minimal .claude structure (first boot)"

mkdir -p /workspace/.claude/projects

cat > /workspace/.claude/.claude.json <<'EOF'
{
  "projects": {
    "/workspace": {}
  }
}
EOF

ENCODED_NAME="-workspace"
mkdir -p "/workspace/.claude/projects/$ENCODED_NAME"

# Create symlink
rm -rf /root/.claude
ln -sf /workspace/.claude /root/.claude

echo "[Claude Init] Minimal structure created"
echo "[Claude Init] Run 'setup-new-app.sh' via SSH to complete initialization"

exit 0
```

### 2. setup-new-app.sh (FIX PATHS)

**Lines to change:**

```bash
# Line 9: CHANGE working directory
WORKSPACE_PARENT="/workspace"  # Keep this

# Lines 79-85: FIX config file location (remove duplicate)
# DELETE this section - don't create /workspace/.claude.json

# REPLACE with:
# Create .claude.json INSIDE .claude directory (no duplicate)
cat > "$WORKSPACE_PARENT/.claude/.claude.json" <<'EOF'
{
  "projects": {
    "/workspace": {}
  }
}
EOF

# Line 91-92: FIX history directory name
ENCODED_NAME="-workspace"  # Change from "-workspace-my-jarvis"
mkdir -p "$WORKSPACE_PARENT/.claude/projects/$ENCODED_NAME"

# Lines 101-110: FIX symlink creation
rm -rf /root/.claude
ln -sf "$WORKSPACE_PARENT/.claude" /root/.claude
# DELETE the .claude.json symlink line - shouldn't exist
```

### 3. update-workspace.sh (FIX PATHS)

**Lines to change:**

```bash
# Line 195: FIX symlink verification
if [ ! -L /root/.claude ]; then
    rm -rf /root/.claude
    ln -sf "$WORKSPACE/.claude" /root/.claude
fi

# Lines 198-202: DELETE this section
# Don't create file symlink for .claude.json (shouldn't exist as separate file)
```

### 4. Dockerfile (FIX ENV VAR)

```dockerfile
# Line 55: CHANGE
ENV VITE_WORKING_DIRECTORY=/workspace  # Change from /workspace/my-jarvis
```

## Correct File Paths

### ❌ WRONG (current state):
```
/workspace/
├── .claude.json              ← DUPLICATE (wrong!)
├── .claude/
│   ├── .claude.json          ← Correct location
│   └── projects/
│       └── -workspace-my-jarvis/  ← Wrong encoding
└── my-jarvis/                ← Wrong working directory
```

### ✅ CORRECT (target state):
```
/workspace/
├── .claude/
│   ├── .claude.json          ← ONLY config file
│   └── projects/
│       └── -workspace/       ← Correct encoding for "/workspace"
├── CLAUDE.md
├── tools/
├── my-jarvis/
└── spaces/
```

## Summary

**You're absolutely right - we have too many scripts doing overlapping things!**

**The clean solution:**
1. **setup-new-app.sh** - Run once manually to initialize new app
2. **update-workspace.sh** - Run manually to update specific files
3. **init-claude-config.sh** - Runs automatically on every boot (symlink maintenance)

**Delete these duplicates:**
- init-workspace.sh (duplicate)
- sync-files.sh (duplicate)
- fix-claude-config-prod.sh (temporary)
- fix-claude-structure-production.sh (temporary)

**The key insight:**
- Template files come from `workspace-template/`
- Claude config created by scripts (not in template)
- Working directory is `/workspace` (not `/workspace/my-jarvis`)
- Single config file at `/workspace/.claude/.claude.json` (no duplicates)
- Symlink from `/root/.claude` to `/workspace/.claude` (directory symlink only)
