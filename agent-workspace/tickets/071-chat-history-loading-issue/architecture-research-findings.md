# Ticket #071: Architecture Research Findings
## Claude Code Directory Structure & Best Practices

**Research Date:** 2025-11-01
**Research Scope:** 15+ web searches on Anthropic Claude Code official documentation and community resources

---

## Executive Summary

After extensive research into Claude Code's official architecture and best practices, here's what we learned:

**Key Finding:** Claude Code's official design expects `.claude` configuration and history to live in the **user's home directory** (`~/.claude/`), NOT in the workspace directory. The current architecture of having both `/root/.claude/` and `/workspace/.claude/` is NOT the intended design - it's a misconfiguration we created.

---

## Official Claude Code Directory Architecture

### 1. Home Directory Configuration (`~/.claude/`)

According to official Anthropic documentation, Claude Code stores ALL configuration and history in the user's home directory:

**Directory Structure:**
```
~/.claude/
├── settings.json          # Global user settings (applies to all projects)
├── settings.local.json    # Personal settings (not shared)
├── commands/              # Global slash commands (available in all sessions)
├── projects/              # **CONVERSATION HISTORY FOR ALL PROJECTS**
│   ├── -home-user-project1/
│   │   └── <session-id>.jsonl
│   ├── -workspace-my-jarvis/
│   │   └── <session-id>.jsonl
│   └── ...
├── ide/                   # IDE integration data
├── statsig/               # Analytics data
└── todos/                 # Todo lists
```

**Critical Insight:** The `~/.claude/projects/` directory contains conversation history for **ALL projects**, organized by encoded project paths. This is NOT meant to be project-specific or workspace-specific.

### 2. Project/Workspace Directory (`.claude/`)

The project/workspace can optionally have a `.claude/` directory for:

```
/workspace/.claude/
├── settings.json          # Project-specific settings (checked into git)
├── settings.local.json    # Developer-specific settings (git-ignored)
├── commands/              # Project-specific slash commands
└── agents/                # Project-specific agent configurations
```

**What's NOT supposed to be here:** `projects/` directory or conversation history JSONL files.

---

## How Path Encoding Works

Claude Code encodes project paths to create directory names in `~/.claude/projects/`:

**Algorithm:**
- Takes the full absolute path (e.g., `/workspace/my-jarvis`)
- Replaces path separators and special chars with dashes
- Example: `/workspace/my-jarvis` → `-workspace-my-jarvis`
- Example: `/workspace` → `-workspace`

**Our Current Issue:**
- Frontend hardcoded: `/workspace`
- Init script creates: `/workspace` in `.claude.json`
- Encoded name: `-workspace`
- But history files exist in: `/workspace/.claude/projects/-workspace/` (WRONG LOCATION)
- Backend looks in: `/root/.claude/projects/-workspace/` (CORRECT LOCATION, but empty)

---

## Container Deployment Best Practices

### Anthropic's Official Devcontainer Approach

From the official documentation (`docs.claude.com/en/docs/claude-code/devcontainer`):

**1. Mount Home Directory Configuration:**
```json
// devcontainer.json
{
  "mounts": [
    "source=~/.claude,target=/root/.claude,type=bind,consistency=cached"
  ]
}
```

**Why:** This preserves authentication tokens, shell history, and **conversation history** across container sessions.

**2. Working Directory:**
- Set to `/workspace` or `/app` in the container
- Claude Code CLI is run FROM this directory
- History is stored in `~/.claude/projects/<encoded-workspace-path>/`

**3. Isolation Model:**
- **Home directory (`~/.claude/`)**: Persistent, shared across all projects
- **Workspace directory (`/workspace/`)**: Project-specific, mounted as volume
- **Project `.claude/` settings**: Optional, for team-shared configuration

---

## Environment Variables

### CLAUDE_CONFIG_DIR (Officially Documented)

- **Purpose:** Override the location of `.claude` configuration directory
- **Default:** `~/.claude`
- **Our Use Case:** Not needed - we should use the default

### CLAUDE_HOME (Exists but has known bugs)

- **Issue #1652:** `CLAUDE_HOME` environment variable is not respected
- **Status:** Known bug, still creates `~/.claude` even when `CLAUDE_HOME` is set
- **Recommendation:** Don't rely on this

---

## What We're Doing Wrong

### Current Incorrect Architecture

**Problem 1: Dual `.claude` Directories**
```
/root/
└── .claude/
    ├── .claude.json          ← Created by init-claude-config.sh
    └── projects/
        └── -workspace/       ← Empty directory (correct location, no files)

/workspace/
└── .claude/
    ├── .claude.json          ← Also exists (WHY?)
    └── projects/
        ├── -workspace/       ← 71 JSONL files (WRONG LOCATION!)
        └── -workspace-my-jarvis/  ← Old files (legacy, also wrong)
```

**Problem 2: Backend Reads From /root, History Written to /workspace**
- Backend code: `getHomeDir()` → `/root/` → reads `/root/.claude.json`
- Claude CLI when executing: Writes to `/workspace/.claude/projects/`
- **Result:** Backend can't find history files

**Problem 3: Two Separate Configuration Files**
- `/root/.claude.json` (read by backend API)
- `/workspace/.claude.json` (read by Claude CLI during execution?)

---

## The Correct Architecture (What We Should Have)

### Option 1: Symlink Approach (Recommended by Community)

**Many users mount `~/.claude` from host to preserve history:**

```dockerfile
# In Dockerfile or docker-compose
volumes:
  - ~/.claude:/root/.claude  # Bind mount host's .claude to container's home

# OR in the container startup:
ln -sf /workspace/.claude /root/.claude
```

**Benefits:**
- Single source of truth: `/workspace/.claude/` (persistent via volume)
- `/root/.claude` → symlink to `/workspace/.claude`
- Backend reads from `/root/.claude` → follows symlink → finds files in `/workspace/.claude`
- History persists across container rebuilds (stored in workspace volume)

**This is actually what `update-workspace.sh` lines 192-202 tries to create:**
```bash
# Ensure symlinks exist
if [ ! -L /root/.claude ]; then
    rm -rf /root/.claude
    ln -sf "$WORKSPACE/.claude" /root/.claude
fi
```

### Option 2: All in /root (Pure Docker Approach)

**Alternative: Keep everything in /root, mount it as a volume:**

```dockerfile
# Dockerfile
WORKDIR /workspace
ENV CLAUDE_CONFIG_DIR=/root/.claude

# docker-compose.yml or fly.toml
volumes:
  - claude_config:/root/.claude  # Named volume for persistence
  - ./workspace:/workspace        # Project files
```

**Benefits:**
- Follows Claude Code's default behavior exactly
- Clean separation: config in home, code in workspace
- Standard Docker pattern

**Drawbacks:**
- History doesn't "travel" with the workspace
- Requires separate volume management

---

## Recommended Solution for My Jarvis Desktop

### Architecture Decision

**Use Option 1: Symlink Approach**

**Why:**
1. **History travels with workspace** - When we backup/restore workspace, history comes with it
2. **Single source of truth** - All .claude data in `/workspace/.claude/`
3. **Persistent across deployments** - Workspace is a Fly.io persistent volume
4. **Follows community best practices** - Many devcontainer setups use this pattern
5. **Backend compatibility** - Backend still reads from `/root/.claude` via symlink

### Implementation Plan

**Step 1: Update init-claude-config.sh**

```bash
#!/bin/bash
set -e

echo "[Claude Init] Setting up .claude directory structure..."

# Create .claude directory in WORKSPACE (single source of truth)
WORKSPACE_CLAUDE="/workspace/.claude"
mkdir -p "$WORKSPACE_CLAUDE/projects"

# Create .claude.json in workspace
cat > "$WORKSPACE_CLAUDE/.claude.json" <<'EOF'
{
  "projects": {
    "/workspace": {}
  }
}
EOF

echo "[Claude Init] Created $WORKSPACE_CLAUDE/.claude.json"

# Create encoded project directory for history storage
ENCODED_NAME="-workspace"
mkdir -p "$WORKSPACE_CLAUDE/projects/$ENCODED_NAME"

echo "[Claude Init] Created project history directory: $WORKSPACE_CLAUDE/projects/$ENCODED_NAME"

# Create symlink from /root/.claude to /workspace/.claude
if [ -L /root/.claude ] || [ -e /root/.claude ]; then
    echo "[Claude Init] Removing existing /root/.claude"
    rm -rf /root/.claude
fi

ln -sf "$WORKSPACE_CLAUDE" /root/.claude

echo "[Claude Init] Created symlink: /root/.claude -> $WORKSPACE_CLAUDE"
echo "[Claude Init] .claude structure ready:"
ls -la /root/.claude/
ls -la "$WORKSPACE_CLAUDE/projects/"

exit 0
```

**Step 2: Migration Commands (Run Once)**

```bash
# SSH into production container
flyctl ssh console -a my-jarvis-erez-dev

# Move existing history files to correct location
mv /workspace/.claude/projects/-workspace/* /root/.claude/projects/-workspace/ 2>/dev/null || true

# Remove old duplicate directory
rm -rf /workspace/.claude

# Re-run init script to create symlink
/app/scripts/init-claude-config.sh
```

**Step 3: Verify**

```bash
# Check symlink
ls -la /root/.claude  # Should show -> /workspace/.claude

# Check files exist
ls -la /root/.claude/projects/-workspace/  # Should show .jsonl files

# Test API
curl http://localhost:10000/api/projects
# Should return: {"projects":[{"path":"/workspace","encodedName":"-workspace"}]}
```

---

## Additional Findings

### XDG Base Directory Specification

**Issue #1455:** Claude Code does NOT follow XDG standards
- Should use `$XDG_CONFIG_HOME/claude` (default: `~/.config/claude`)
- Currently hardcodes `~/.claude`
- Community requests to follow XDG, but not implemented yet

### Configuration File Hierarchy

**Official settings.json hierarchy** (documented):
1. Enterprise managed settings (highest priority)
2. User settings: `~/.claude/settings.json`
3. Project settings: `.claude/settings.json`
4. Local project settings: `.claude/settings.local.json`

**Reality:** `~/.claude.json` (undocumented legacy file) often required for certain settings to work.

### Conversation History Storage

**Official behavior:**
- All history in `~/.claude/projects/<encoded-path>/<session-uuid>.jsonl`
- NOT project-local by default
- **Issue #9306** requests project-local storage as a feature (not yet implemented)

---

## References

### Official Anthropic Documentation
- Claude Code Best Practices: https://www.anthropic.com/engineering/claude-code-best-practices
- Development containers: https://docs.claude.com/en/docs/claude-code/devcontainer
- Claude Code settings: https://docs.claude.com/en/docs/claude-code/settings

### Community Resources
- ClaudeLog Configuration Guide: https://claudelog.com/configuration/
- Devcontainer best practices: https://mitjamartini.com/posts/claude-code-in-devcontainer/
- Claude Code Manual: https://clune.org/posts/claude-code-manual/

### Relevant GitHub Issues
- #1455: XDG Base Directory specification
- #1652: CLAUDE_HOME environment variable not respected
- #6139: Hardcoded /home/node/.config path
- #9306: Feature request for project-local conversation history

---

## Confidence Assessment

**Architecture Understanding:** 10/10
**Best Practices Clarity:** 9/10 (some community workarounds needed)
**Recommended Solution:** 9/10 (symlink approach is proven in community)
**Implementation Risk:** 2/10 (low - just reorganizing existing files)

---

**Created:** 2025-11-01
**Next Steps:** Implement symlink-based architecture with migration plan
