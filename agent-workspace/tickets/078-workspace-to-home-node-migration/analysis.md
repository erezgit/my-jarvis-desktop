# Chat History Architecture Decision

## Current Architecture Problem

### What We Have Now:
```
Container Filesystem (EPHEMERAL - wiped on restart):
├── /home/
│   └── node/                    # Node user's home directory
│       ├── .claude.json          # Claude Code auto-creates this
│       └── .claude/              # Claude Code configuration
│           └── .claude.json      # Our init script creates this (wrong location!)

Persistent Volume (SURVIVES restarts):
└── /workspace/                   # Mounted volume
    ├── CLAUDE.md                 # User's configuration
    ├── my-jarvis/                # User's projects
    └── tools/                    # User's tools
```

### The Problem:
1. Claude Code naturally uses `/home/node` as the project directory
2. Our data needs to be in `/workspace` to persist
3. Claude Code creates `/home/node/.claude.json` with wrong project path
4. Chat history looks for project in `/home/node` instead of `/workspace`

## Architecture Options

### Option 1: Mount Volume at /home/node ✨
**The Elegant Solution - Go with Claude Code's flow**

```yaml
# fly.toml change:
[mounts]
  source = "workspace_data"
  destination = "/home/node"  # Mount directly at user home
```

**Pros:**
- ✅ Aligns perfectly with Claude Code's expectations
- ✅ No configuration fights or workarounds needed
- ✅ Chat history "just works"
- ✅ Single source of truth: `/home/node`
- ✅ Simplest, most maintainable solution

**Cons:**
- ❌ Need to migrate existing data from `/workspace` to `/home/node`
- ❌ Breaking change for existing deployments

**Implementation:**
1. Change mount point in fly.toml
2. Update Dockerfile to not create `/home/node` (volume will provide it)
3. Update all references from `/workspace` to `/home/node`
4. Migration script for existing users

---

### Option 2: Symlink Entire /home/node to /workspace 🔗
**Make home directory point to workspace**

```bash
# In docker-entrypoint.sh:
rm -rf /home/node
ln -s /workspace /home/node
```

**Pros:**
- ✅ Claude Code thinks it's using `/home/node`
- ✅ Data actually persists in `/workspace`
- ✅ Relatively simple to implement

**Cons:**
- ❌ Symlink can cause unexpected issues
- ❌ Some tools may not follow symlinks properly
- ❌ Potential permission complications

---

### Option 3: Fix Configuration (Current Approach) 🔧
**Keep fighting Claude Code's natural behavior**

```bash
# Update init-claude-config.sh to modify the RIGHT file:
cat > /home/node/.claude.json <<EOF
{
  "projects": {
    "/workspace": {}
  }
}
EOF
```

**Pros:**
- ✅ Minimal changes to existing architecture
- ✅ No migration needed

**Cons:**
- ❌ Fighting against Claude Code's design
- ❌ Claude Code may overwrite our configuration
- ❌ Requires constant maintenance
- ❌ Not elegant - working against the tool

---

### Option 4: Hybrid - Mount at /home/node/workspace 🏠
**Compromise solution**

```yaml
[mounts]
  source = "workspace_data"
  destination = "/home/node/workspace"
```

Then use `/home/node/workspace` as the project directory.

**Pros:**
- ✅ Data under user's home directory
- ✅ Clear separation of persistent data

**Cons:**
- ❌ Still not the natural `/home/node` root
- ❌ Still requires configuration

## Recommendation: Option 1 - Mount at /home/node

**Why this is the best solution:**

1. **Simplicity**: We stop fighting Claude Code and go with its natural behavior
2. **Maintainability**: No workarounds, symlinks, or configuration hacks
3. **Future-proof**: As Claude Code evolves, we won't break
4. **User Experience**: Everything "just works"

**The core insight**: The `/workspace` convention was arbitrary. There's no technical reason we can't mount the persistent volume at `/home/node`. This eliminates ALL our configuration problems.

## Migration Plan for Option 1

### For New Deployments:
1. Mount volume at `/home/node`
2. No `/workspace` directory at all
3. Everything works naturally

### For Existing Deployments:
1. Create migration script that:
   - Copies `/workspace/*` to `/home/node/`
   - Updates fly.toml mount point
   - Removes `/workspace` references

### File Changes Needed:
1. `fly.toml`: Change mount destination
2. `Dockerfile`: Remove `/home/node` creation (volume provides it)
3. `docker-entrypoint.sh`: Remove workspace permission fixes
4. `init-claude-config.sh`: Can be deleted (Claude Code handles it)
5. `setup-new-app.sh`: Update paths from `/workspace` to `/home/node`

## The "lost+found" Directory

This is created by the ext4 filesystem for any mounted volume. Solutions:
1. Hide it in the UI (filter in file tree component)
2. It will exist whether we mount at `/workspace` or `/home/node`
3. It's harmless - just ignore it

## Decision Needed

**Question for you**: Should we go with Option 1 (mount at /home/node) for maximum simplicity, or would you prefer to keep /workspace for some specific reason?

The elegant solution is to **embrace Claude Code's design** rather than fight it.