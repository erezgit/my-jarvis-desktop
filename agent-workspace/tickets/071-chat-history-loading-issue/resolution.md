# Ticket #071: Chat History Loading Issue - RESOLVED

**Status:** ✅ FIXED
**Resolution Date:** 2025-11-01
**Impact:** All 5 production instances now have working chat history

## 🎯 Problem Summary

Chat history was stuck on "Loading project..." indefinitely in all Fly.io containers because the backend couldn't find the required configuration file.

## 🔧 Root Cause

The backend uses `os.homedir()` which returns `/root/` in containers and expects to find `/root/.claude.json` for project discovery. Our init script was only creating:
- `/workspace/.claude/` directory (persistent storage)
- Symlink from `/root/.claude` to `/workspace/.claude/`

But it was **missing the critical `/root/.claude.json` file** that the backend needs to find projects.

## ✅ Solution Implemented

### 1. Manual Fix (Applied to All Instances)

Created `/root/.claude.json` in each instance:
```json
{
  "projects": {
    "/workspace": {}
  }
}
```

**Fixed Instances:**
- ✅ my-jarvis-erez
- ✅ my-jarvis-erez-dev
- ✅ my-jarvis-lilah
- ✅ my-jarvis-daniel
- ✅ my-jarvis-iddo

### 2. Permanent Fix (Script Updated)

Updated `scripts/init-claude-config.sh` to automatically create `/root/.claude.json` on container startup.

**Key Change:**
```bash
# CRITICAL: Backend needs /root/.claude.json file (not just symlink)
# This is required for the API to find projects
echo "[Claude Init] Creating /root/.claude.json for backend..."
cat > /root/.claude.json <<'EOF'
{
  "projects": {
    "/workspace": {}
  }
}
EOF
```

## 📐 Correct Architecture

The working architecture requires **BOTH**:

1. **Symlink**: `/root/.claude` → `/workspace/.claude/`
   - Provides persistent storage for history files
   - Survives container restarts

2. **Config File**: `/root/.claude.json`
   - Tells backend about workspace project
   - Required for API to return project list
   - Must exist at root level (not inside .claude directory)

## 🔍 Why Both Are Needed

- **Backend Logic**: Reads `/root/.claude.json` to discover projects
- **History Storage**: Saved to `/workspace/.claude/projects/-workspace/`
- **Persistence**: Symlink ensures history survives container restarts
- **Discovery**: Root config file ensures backend can find the project

## 📊 Verification

All instances now return correct API response:
```json
GET /api/projects
{
  "projects": [{
    "path": "/workspace",
    "encodedName": "-workspace"
  }]
}
```

History page loads successfully and shows conversation list.

## 🚀 Deployment Note

Future deployments will automatically have the correct setup as the init script now creates both the symlink AND the root config file.

## 📝 Lessons Learned

1. **Container environments differ from local development** - `os.homedir()` behavior changes
2. **Backend architecture assumptions** - Some code expects specific file locations
3. **Both symlink AND config needed** - Not just one or the other
4. **Manual verification crucial** - Automated fixes may miss edge cases

---

**Commit:** e0cfc686 - "fix: Add /root/.claude.json creation to init script"