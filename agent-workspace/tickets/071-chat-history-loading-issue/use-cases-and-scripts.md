# My Jarvis Desktop - Use Cases & Script Architecture

## Quick Summary: Three Use Cases

### 1. Create New App
Deploy a brand new app to Fly.io with complete workspace initialization. Copy template files, set up .claude directory structure, create symlinks.

### 2. Update Application Code
Update the application code (React components, backend server, etc.) by rebuilding and redeploying the Docker container. No changes to persistent volume data.

### 3. Update Files in Volume
Make live changes to specific files in a running app's persistent volume (/workspace). SSH in, explore files, discuss, and directly edit without redeployment.

---

## Detailed Use Case Breakdown

## Use Case 1: Create New App

### When to Use
- Deploying to Fly.io for the first time
- Setting up a new instance for a new user
- Creating a fresh environment (dev, staging, production)

### Step-by-Step Process

#### Step 1: Initial Deployment
```bash
# From local machine
fly deploy
```
**What happens:**
- Docker image builds with latest code
- Fly.io creates new container and persistent volume
- Container starts and runs `init-claude-config.sh` automatically (from Dockerfile CMD)

#### Step 2: Automatic Initialization (init-claude-config.sh)
**Script location:** `/app/scripts/init-claude-config.sh` (inside container)

**What it does:**
1. Checks if `/workspace/.claude` exists
   - If NO (new app): Creates minimal `.claude` directory structure
   - If YES (existing app): Skips creation
2. Creates `/workspace/.claude/.claude.json` config file:
   ```json
   {
     "projects": {
       "/workspace": {}
     }
   }
   ```
3. Creates encoded history directory: `/workspace/.claude/projects/-workspace/`
4. Creates symlink: `/root/.claude -> /workspace/.claude`

**Why it runs automatically:**
- Ensures symlink exists on every container start (since `/root/` is ephemeral)
- Works for both new apps and code updates

#### Step 3: Complete Setup (Manual via SSH)
```bash
# SSH into the new app
fly ssh console -a <app-name>

# Run setup script
/app/scripts/setup-new-app.sh
```

**Script location:** `/app/scripts/setup-new-app.sh`

**What it does:**
1. Checks if workspace is already initialized (looks for CLAUDE.md marker)
   - If YES: Exits with error (this script is for new apps only)
   - If NO: Proceeds with setup
2. Copies ALL template files from `/app/workspace-template/` to `/workspace/`:
   - `CLAUDE.md` (workspace marker file)
   - `tools/` directory (jarvis_voice.sh, Python tools, etc.)
   - `my-jarvis/` directory (JARVIS-CONSCIOUSNESS.md, docs/)
   - `spaces/` directory (user-specific spaces)
3. Verifies `.claude` directory structure is complete
4. Verifies symlink `/root/.claude -> /workspace/.claude` exists
5. Shows final structure

**Result:** App is fully initialized and ready for use.

---

## Use Case 2: Update Application Code

### When to Use
- Changed React components, backend code, or any application logic
- Updated dependencies in package.json
- Modified Dockerfile or build configuration
- Need to deploy code changes to production

### Step-by-Step Process

#### Step 1: Make Changes Locally
```bash
# Edit files in your local repository
# Examples: app/components/ChatPage.tsx, lib/claude-webui-server/handlers/projects.ts
```

#### Step 2: Commit and Deploy
```bash
# Commit changes (optional but recommended)
git add .
git commit -m "Update chat history loading logic"

# Deploy to Fly.io
fly deploy -a <app-name>
```

**What happens:**
1. Docker image rebuilds with your new code
2. Fly.io creates new container with updated code
3. Old container is stopped and removed
4. `/root/` directory is completely wiped (ephemeral storage)
5. `/workspace/` volume persists (mounted from outside container)

#### Step 3: Automatic Symlink Restoration
When the new container starts, `init-claude-config.sh` runs automatically:

1. Checks if `/workspace/.claude` exists → YES (it persisted)
2. Checks if `/root/.claude` symlink exists → NO (container just started, /root/ is empty)
3. Recreates symlink: `/root/.claude -> /workspace/.claude`
4. Server starts with updated code

**Key Points:**
- ✅ Code is updated
- ✅ All data in `/workspace/` is preserved (chat history, user files, etc.)
- ✅ Symlink is automatically restored
- ✅ No manual intervention needed
- ❌ Template files in `/app/workspace-template/` are NOT copied to `/workspace/`

**Scripts involved:**
- `init-claude-config.sh` - Runs automatically on container start
- No other scripts needed

**Why this works:**
The symlink lives in `/root/` which is ephemeral and resets on every deploy. `init-claude-config.sh` is designed to be idempotent—it checks if the persistent structure exists and just ensures the symlink is there. This happens automatically on every boot.

---

## Use Case 3: Update Files in Volume

### When to Use
- Want to update CLAUDE.md with new instructions
- Need to modify jarvis_voice.sh script
- Want to add/edit documentation files
- Need to update user-specific files in spaces/
- Want to make quick changes without full redeployment

### Step-by-Step Process

#### Step 1: SSH into Running App
```bash
fly ssh console -a <app-name>
```

#### Step 2: Explore Current Files
```bash
# View current CLAUDE.md
cat /workspace/CLAUDE.md

# List all files in workspace
ls -la /workspace/

# Check tools directory
ls -la /workspace/tools/src/

# View specific file
cat /workspace/my-jarvis/JARVIS-CONSCIOUSNESS.md
```

#### Step 3: Discuss Changes
**Interactive conversation:**
- You review the current file contents
- You decide what changes to make
- You provide new content or specific edits

#### Step 4: Make Live Edits

**Option A: Direct editing via script (recommended)**
```bash
# Use a dedicated update script (to be created)
/app/scripts/update-file.sh /workspace/CLAUDE.md
```

**Option B: Manual editing (current method)**
```bash
# Replace entire file
cat > /workspace/CLAUDE.md <<'EOF'
[new content here]
EOF

# Append to file
echo "new line" >> /workspace/CLAUDE.md

# Edit with sed
sed -i 's/old text/new text/g' /workspace/CLAUDE.md
```

**Result:** File is immediately updated in the running app. Changes take effect instantly (no restart needed for most files).

### Scripts for Use Case 3

**Current situation:** We don't have a dedicated script for this. We use manual SSH commands.

**Proposed script:** `update-file.sh`

**Script location:** `/app/scripts/update-file.sh`

**Proposed functionality:**
```bash
# Usage examples
/app/scripts/update-file.sh read /workspace/CLAUDE.md
/app/scripts/update-file.sh write /workspace/CLAUDE.md "new content"
/app/scripts/update-file.sh backup /workspace/tools/
/app/scripts/update-file.sh list /workspace/
```

**Features:**
- Read file contents
- Write new contents (with automatic backup)
- List directory contents
- Backup before changes
- Safety checks (don't modify .claude directory)

**Alternative approach:** Use `flyctl ssh console -C` from local machine:
```bash
# From local machine, read file
flyctl ssh console -a <app-name> -C "cat /workspace/CLAUDE.md"

# From local machine, update file
flyctl ssh console -a <app-name> -C "echo 'new content' > /workspace/CLAUDE.md"
```

---

## Script Reference

### Scripts That Exist

| Script | Location | When It Runs | Purpose |
|--------|----------|--------------|---------|
| `init-claude-config.sh` | `/app/scripts/` | **Automatic** on every container start | Ensures .claude symlink exists |
| `setup-new-app.sh` | `/app/scripts/` | **Manual** via SSH (one-time) | Initialize new app workspace |
| `update-workspace.sh` | `/app/scripts/` | **Manual** via SSH (existing apps) | Update template-based files (DEPRECATED for our use cases) |

### Scripts to Create

| Script | Location | When It Runs | Purpose |
|--------|----------|--------------|---------|
| `update-file.sh` | `/app/scripts/` | **Manual** via SSH | Read/write specific files in /workspace |

### Scripts to Delete (Duplicates/Obsolete)

- `init-workspace.sh` - Duplicate of setup-new-app.sh
- `sync-files.sh` - Duplicate of update-workspace.sh
- `fix-claude-config-prod.sh` - Temporary emergency fix
- `fix-claude-structure-production.sh` - Temporary emergency fix

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                   LOCAL DEVELOPMENT                      │
├─────────────────────────────────────────────────────────┤
│  - Edit code in repository                              │
│  - Edit workspace files in workspace-template/          │
│  - Commit changes to git                                │
└─────────────────────┬───────────────────────────────────┘
                      │
                      │ fly deploy
                      ↓
┌─────────────────────────────────────────────────────────┐
│                   FLY.IO CONTAINER                       │
├─────────────────────────────────────────────────────────┤
│  EPHEMERAL (/root/)                                     │
│  ├── .claude -> /workspace/.claude (symlink)            │
│  └── [recreated on every boot]                          │
│                                                          │
│  DOCKER IMAGE (/app/)                                   │
│  ├── scripts/                                           │
│  │   ├── init-claude-config.sh                          │
│  │   ├── setup-new-app.sh                               │
│  │   └── update-file.sh                                 │
│  ├── workspace-template/                                │
│  │   ├── CLAUDE.md                                      │
│  │   ├── tools/                                         │
│  │   ├── my-jarvis/                                     │
│  │   └── spaces/                                        │
│  └── [application code]                                 │
└─────────────────────────────────────────────────────────┘
                      │
                      │ mounted volume
                      ↓
┌─────────────────────────────────────────────────────────┐
│              PERSISTENT VOLUME (/workspace/)             │
├─────────────────────────────────────────────────────────┤
│  .claude/                                               │
│  ├── .claude.json (single source of truth)              │
│  └── projects/                                          │
│      └── -workspace/                                    │
│          └── *.jsonl (chat history)                     │
│  CLAUDE.md                                              │
│  tools/                                                 │
│  my-jarvis/                                             │
│  spaces/                                                │
└─────────────────────────────────────────────────────────┘
```

---

## Key Principles

### 1. Separation of Concerns
- **Code** lives in Docker image (`/app/`)
- **Data** lives in persistent volume (`/workspace/`)
- **Ephemeral runtime** in container home (`/root/`)

### 2. Template vs Live Files
- **Template** (`/app/workspace-template/`) is used ONLY for new app creation
- **Live files** (`/workspace/`) are updated directly via SSH for use case 3
- Template is NOT the source of truth for live file updates

### 3. Automatic Symlink Management
- `/root/.claude` symlink is automatically recreated on every container start
- This is necessary because `/root/` is ephemeral
- `init-claude-config.sh` handles this automatically
- No manual intervention needed for code deployments

### 4. Data Persistence
- `/workspace/` survives container restarts and redeployments
- Chat history, user files, and configurations persist
- Only application code changes during redeployment

### 5. Working Directory Path
- **Correct:** `/workspace` (used as Claude Code working directory)
- **Wrong:** `/workspace/my-jarvis` (old incorrect path)
- Frontend env: `VITE_WORKING_DIRECTORY=/workspace`
- Backend reads: `os.homedir()` → `/root/` → symlink → `/workspace/.claude/`

---

## Next Steps

1. ✅ Fix `init-claude-config.sh` to be idempotent and symlink-aware
2. ✅ Fix `setup-new-app.sh` to use correct paths and no duplicates
3. ✅ Fix Dockerfile `VITE_WORKING_DIRECTORY` to `/workspace`
4. ⏳ Create `update-file.sh` for use case 3
5. ⏳ Delete obsolete scripts
6. ⏳ Test all three use cases end-to-end
7. ⏳ Document in architecture docs
