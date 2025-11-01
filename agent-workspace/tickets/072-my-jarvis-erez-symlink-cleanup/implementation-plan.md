# Ticket 072: Update my-jarvis-erez with Symlink and Claude Config Cleanup

**Status**: Ready for Implementation
**Priority**: High
**Created**: 2025-11-01
**Assigned To**: Local Claude Code Instance

---

## Context

The `my-jarvis-erez-dev` instance was previously updated with:
1. Root `.claude` symlink pointing to `/workspace/.claude`
2. Cleaned up `.claude.json` configuration (70 lines vs 87 lines)
3. Removed duplicate `/root` project entry

The `my-jarvis-erez` production instance still needs these same changes applied.

---

## Current State Analysis

### my-jarvis-erez (NEEDS UPDATE)
- `.claude` directory only exists in `/workspace/.claude/`
- No symlink from `/root/.claude` → `/workspace/.claude`
- `.claude.json` is 87 lines with duplicate project entries for both `/root` and `/workspace`
- Contains unnecessary entries and bloat

### my-jarvis-erez-dev (REFERENCE - ALREADY CORRECT)
- Has symlink: `/root/.claude` → `/workspace/.claude`
- `.claude.json` is 70 lines, clean and consolidated
- Only `/workspace` project entry (no `/root` duplicate)

---

## Implementation Steps

**⚠️ IMPORTANT**: This must be done from LOCAL Claude Code instance, NOT from within my-jarvis-erez, because:
- We need SSH access from external environment
- We're modifying `/root/` directory which is outside workspace restrictions
- Requires Fly.io token authentication

### Step 1: SSH into my-jarvis-erez

```bash
# From local machine with flyctl installed
fly ssh console -a my-jarvis-erez
```

### Step 2: Verify Current State

```bash
# Check if symlink exists (should NOT exist yet)
ls -la /root/.claude

# Check workspace .claude directory (should exist)
ls -la /workspace/.claude/

# Check .claude.json size
wc -l /workspace/.claude/.claude.json
```

### Step 3: Create Symlink

```bash
# Remove /root/.claude if it exists as a directory
rm -rf /root/.claude

# Create symlink from /root/.claude to /workspace/.claude
ln -s /workspace/.claude /root/.claude

# Verify symlink
ls -la /root/.claude
```

### Step 4: Clean Up .claude.json

```bash
# Backup current .claude.json
cp /workspace/.claude/.claude.json /workspace/.claude/.claude.json.pre-cleanup-backup

# The cleanup will:
# - Remove /root project entry
# - Keep only /workspace project entry
# - Reduce file from 87 lines to ~70 lines
# - Match the structure of my-jarvis-erez-dev
```

**Manual Cleanup Required**: Edit `/workspace/.claude/.claude.json` to:
1. Remove the entire `/root` project block (lines ~26-40)
2. Keep only the `/workspace` project block
3. Ensure JSON is valid after removal

### Step 5: Verify Changes

```bash
# Check symlink exists
ls -la /root/.claude

# Check .claude.json is smaller
wc -l /workspace/.claude/.claude.json

# Verify JSON is valid
cat /workspace/.claude/.claude.json | head -50

# Exit SSH
exit
```

### Step 6: Test in My Jarvis Desktop

1. Open `https://my-jarvis-erez.fly.dev` in browser
2. Start a new conversation in Claude interface
3. Verify conversation history saves correctly
4. Verify no errors in Claude Code logs

---

## Expected Results

After completion:
- ✅ `/root/.claude` symlink points to `/workspace/.claude`
- ✅ `.claude.json` reduced from 87 lines to ~70 lines
- ✅ Only `/workspace` project entry exists (no `/root` duplicate)
- ✅ Claude Code works correctly with unified .claude directory
- ✅ Conversation history persists correctly
- ✅ Matches my-jarvis-erez-dev configuration

---

## Success Criteria

- [ ] Symlink created: `/root/.claude` → `/workspace/.claude`
- [ ] `.claude.json` cleaned up (70-75 lines)
- [ ] `/root` project entry removed from `.claude.json`
- [ ] Backup created before cleanup
- [ ] Claude Code starts without errors
- [ ] New conversations save to history correctly
- [ ] Configuration matches my-jarvis-erez-dev structure

---

## Rollback Plan

If issues occur:

```bash
# SSH back into my-jarvis-erez
fly ssh console -a my-jarvis-erez

# Remove symlink
rm /root/.claude

# Restore backup
cp /workspace/.claude/.claude.json.pre-cleanup-backup /workspace/.claude/.claude.json

# Restart container
exit
fly apps restart my-jarvis-erez
```

---

## Notes

- This is a non-breaking change that improves consistency across instances
- The symlink allows Claude Code to find configuration whether running from `/root` or `/workspace`
- Same pattern successfully applied to my-jarvis-erez-dev
- After this change, all instances (erez, erez-dev, daniel, lilah, iddo) will have consistent configuration

---

**Next Actions**:
1. Close this My Jarvis Desktop browser tab
2. Open local Claude Code on Mac
3. Read this ticket (072)
4. Execute implementation steps via SSH
5. Git commit and push changes once complete
