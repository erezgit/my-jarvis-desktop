# Ticket #086: Migrate Existing Apps to /home/node Architecture

## Summary
Migrate existing production apps from `/workspace` to `/home/node` mount point to bring them in line with the new deployment architecture and enable automatic `.claude.json` projects object creation.

## Status
- **Priority**: CRITICAL (User Data Risk)
- **Status**: ✅ **COMPLETED**
- **Assignee**: Claude
- **Created**: 2025-11-11
- **Completed**: 2025-11-11

## Background

After solving ticket #84 (Claude Code SDK project creation), we now have a fully automated deployment process for **new apps**, but **existing apps** are on the old architecture and missing critical improvements:

- ❌ Using `/workspace` mount instead of `/home/node`
- ❌ Missing `.claude.json` projects object (chat history broken)
- ❌ Old claude history directory names
- ❌ Some code still references `/workspace` as default

## Architecture Differences

### Current New Apps (✅ Working)
```toml
[mounts]
  source = "workspace_data"
  destination = "/home/node"  # NEW
```

```json
// .claude.json (auto-created)
{
  "projects": {
    "/home/node": {
      "allowedTools": ["Read", "Write", "Edit", "Bash"],
      "history": [],
      "mcpServers": {},
      "exampleFiles": [],
      "mcpContextUris": []
    }
  }
}
```

### Existing Apps (⚠️ Outdated)
```toml
[mounts]
  source = "workspace_data"
  destination = "/workspace"  # OLD
```

```json
// .claude.json (missing projects or wrong path)
{
  "projects": {
    "/workspace": { ... }  // Wrong path or missing entirely
  }
}
```

## Critical Changes Analysis

### 1. Volume Mount Location
- **Current**: `/workspace`
- **Target**: `/home/node`
- **Risk**: Volume data must be copied, not lost

### 2. Code Environment Variables
**Still Defaulting to `/workspace`:**
- `lib/claude-webui-server/handlers/files.js:` `'/workspace'`
- `lib/claude-webui-server/handlers/voice.ts:` `'/workspace'`
- `lib/claude-webui-server/handlers/chat.ts:` Comment references `/workspace`

**Already Updated:**
- `lib/claude-webui-server/handlers/files.ts:` `'/home/node'` ✅
- `Dockerfile ENV WORKSPACE_DIR=/home/node` ✅

### 3. Claude Configuration Migration
- **Projects object path**: `/workspace` → `/home/node`
- **History directories**: `-workspace` → `-home-node`
- **Missing projects object**: Add with proper structure

### 4. File Structure
- **Workspace files**: Need copying from `/workspace` to `/home/node`
- **Ownership**: Must be `node:node`
- **Permissions**: Preserve file attributes

## 🎯 High-Level Migration Overview

### What We're Updating

#### **1. Codebase Changes (applies to all apps)**
- **Docker image**: Deploy latest image with `/home/node` architecture
- **Environment variables**: `WORKSPACE_DIR` now points to `/home/node`
- **Code references**: Update remaining files that default to `/workspace`
- **Version bump**: my-jarvis-erez: 1.33.0 → 1.40.0 (reflects new architecture)

#### **2. Per-App Data Migration**
- **Volume data**: Copy `/workspace` → `/home/node` (user data, chat history, files)
- **Claude configuration**: Create proper `.claude.json` with `/home/node` projects object
- **History directories**: Rename `-workspace` → `-home-node`
- **File ownership**: Ensure all files owned by `node:node`

#### **3. Infrastructure Changes**
- **fly.toml mount**: Change destination from `/workspace` to `/home/node`
- **Volume remount**: Redeploy app with new mount point
- **DNS/routing**: No changes (same URLs)

### Complete Migration Flow

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Phase 1       │    │     Phase 2      │    │    Phase 3      │
│ Code Updates    │───▶│ Test my-jarvis-  │───▶│ Migrate User    │
│ (All Apps)      │    │ erez (Safe Test) │    │ Apps (1 by 1)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

**Phase 1**: Deploy code changes (low risk, backwards compatible)
**Phase 2**: Test data migration on your app (medium risk, recoverable)
**Phase 3**: Roll out to user apps (high risk, user data involved)

## Migration Strategy

### Phase 1: Code Fixes (Low Risk)
1. **Update remaining `/workspace` references in code**
2. **Test on development environment**
3. **Deploy code updates to all apps**

### Phase 2: Test Migration (Medium Risk)
**Target App**: `my-jarvis-erez` (version 1.33.0 → 1.40.0)

#### **Step-by-Step my-jarvis-erez Migration:**

1. **Deploy Latest Code** (Phase 1 changes)
   ```bash
   fly deploy --app my-jarvis-erez
   ```

2. **Run Data Migration**
   ```bash
   fly ssh console -a my-jarvis-erez
   /app/scripts/migrate-workspace-to-home-node-v2.sh
   exit
   ```

3. **Update Volume Mount**
   ```bash
   # Update fly-erez.toml locally
   [mounts]
     destination = "/home/node"  # Changed from /workspace

   # Redeploy with new mount
   fly deploy --app my-jarvis-erez
   ```

4. **Validate Migration Success**
   ```bash
   # Test endpoints
   curl https://my-jarvis-erez.fly.dev/health
   curl https://my-jarvis-erez.fly.dev/api/projects

   # Expected: {"projects":[{"path":"/home/node","encodedName":"-home-node"}]}
   ```

5. **Test Chat History & Voice**
   - Access web interface
   - Verify chat history loads immediately
   - Test voice generation works
   - Check file tree shows correct structure

6. **Document any issues/refinements**

### Phase 3: Production Migration (HIGH RISK - User Data)
1. **One app at a time** - NEVER batch migrate
2. **User communication** - Notify users of brief maintenance
3. **Data backup verification** before each migration
4. **Immediate rollback capability** if issues occur

## ✅ New Migration Script: `migrate-workspace-to-home-node-v2.sh`

**A bulletproof migration script incorporating all lessons learned from tickets #082, #084:**

### Key Features
- **Comprehensive validation** - Environment, space, migration status checks
- **Smart backup system** - Preserves Claude authentication and critical files
- **Bulletproof error handling** - Stops on any failure with clear error messages
- **Progress logging** - Detailed logs with timestamps for debugging
- **Claude config intelligence** - Properly creates projects object for `/home/node`
- **Rollback safety** - Original `/workspace` data always preserved

### Script Highlights
```bash
# Advanced space calculation with safety buffer
calculate_space_requirements()

# Intelligent Claude config preservation
update_claude_configuration() {
  # Preserves userID, installMethod, cached gates
  # Creates proper projects object for /home/node
  # Updates history directory names: -workspace → -home-node
}

# Comprehensive validation
validate_migration() {
  # Verifies all critical files copied
  # Checks .claude.json projects object
  # Validates file ownership and permissions
}
```

## Migration Process (Per App) - UPDATED

### Step 1: Run New Migration Script
```bash
# SSH into existing app
fly ssh console -a APP_NAME

# Run the new bulletproof migration script
/app/scripts/migrate-workspace-to-home-node-v2.sh

# Script will:
# ✅ Validate environment and check space
# ✅ Create comprehensive backups
# ✅ Copy all data /workspace → /home/node
# ✅ Fix permissions and ownership
# ✅ Create proper .claude.json with projects object
# ✅ Validate migration success
```

### Step 2: Volume Remount (CRITICAL)
```bash
# Update fly.toml locally
[mounts]
  destination = "/home/node"  # Changed from /workspace

# Redeploy with new mount point
fly deploy --app APP_NAME
```

### Step 3: Post-Migration Validation
```bash
# Verify app functionality
curl https://APP_NAME.fly.dev/health
curl https://APP_NAME.fly.dev/api/projects
# Should return: {"projects":[{"path":"/home/node","encodedName":"-home-node"}]}

# Test chat interface and verify chat history works immediately
```

## Code Fixes Required

### Update Files.js Default
```javascript
// lib/claude-webui-server/handlers/files.js
- const workspaceDir = process.env.WORKSPACE_DIR || '/workspace';
+ const workspaceDir = process.env.WORKSPACE_DIR || '/home/node';
```

### Update Voice.ts Default
```typescript
// lib/claude-webui-server/handlers/voice.ts
- const workspaceDir = process.env.WORKSPACE_DIR || '/workspace';
+ const workspaceDir = process.env.WORKSPACE_DIR || '/home/node';
```

### Update Chat.ts Comment
```typescript
// lib/claude-webui-server/handlers/chat.ts
- // Use WORKSPACE_DIR environment variable as fallback (points to /workspace in Docker)
+ // Use WORKSPACE_DIR environment variable as fallback (points to /home/node in Docker)
```

## Risk Assessment

### 🔴 **CRITICAL RISKS**
- **User Data Loss**: Volume migration could lose user files/chat history
- **App Downtime**: Volume remounting requires app restart
- **Migration Failures**: Partial migrations could leave apps in broken state

### 🟡 **MEDIUM RISKS**
- **Chat History Corruption**: `.claude.json` format changes
- **File Permissions**: Wrong ownership could break functionality
- **Path References**: Remaining hardcoded paths could cause issues

### 🟢 **LOW RISKS**
- **Code Updates**: Environment variable changes are backwards compatible
- **New Deployments**: Already working perfectly

## Rollback Plan

### If Migration Script Fails
1. **Original data preserved** in `/workspace` (migration copies, doesn't move)
2. **Keep original fly.toml mount point**
3. **App continues working on old architecture**

### If Volume Remount Fails
1. **Revert fly.toml** to `/workspace` mount
2. **Redeploy immediately**
3. **Investigate issue** before retry

### If App Won't Start After Migration
1. **Check logs**: `fly logs -a APP_NAME`
2. **SSH in**: `fly ssh console -a APP_NAME`
3. **Verify file structure**: `/home/node` vs `/workspace`
4. **Revert volume mount** if needed

## Testing Approach

### Pre-Prod Testing (my-jarvis-erez)
- [ ] Test migration script on your app
- [ ] Validate data preservation
- [ ] Confirm chat history works
- [ ] Document any issues

### User App Migration
- [ ] Start with lowest-usage apps
- [ ] Monitor each migration closely
- [ ] Document success/failure patterns
- [ ] Refine process based on learnings

## Success Criteria

### Code Fixes
- [ ] All `/workspace` references updated to `/home/node`
- [ ] Code deployed to all apps
- [ ] No functionality regression

### Migration Process
- [ ] Migration script works reliably
- [ ] Data preservation confirmed
- [ ] Chat history functional
- [ ] Volume remount successful

### Production Apps
- [ ] All apps migrated to `/home/node`
- [ ] All apps have working chat history
- [ ] No user data lost
- [ ] No ongoing issues

## Related Issues
- Resolves missing chat history in existing apps
- Brings existing apps to new architecture standard
- Enables automatic `.claude.json` projects object
- **Depends on**: Ticket #84 (completed)

## Files to Modify
- `lib/claude-webui-server/handlers/files.js`
- `lib/claude-webui-server/handlers/voice.ts`
- `lib/claude-webui-server/handlers/chat.ts`
- **NEW**: `scripts/migrate-workspace-to-home-node-v2.sh` ✅ (created)
- Individual app `fly.toml` files (during migration)

## Script Files
- **Primary**: `scripts/migrate-workspace-to-home-node-v2.sh` - New bulletproof migration script
- **Legacy**: `scripts/migrate-to-home-node.sh` - Original script (keep as reference)

---

## ✅ **MIGRATION TEST RESULTS (my-jarvis-erez)**

**Date**: 2025-11-11
**Status**: ✅ **SUCCESSFUL - NO MIGRATION NEEDED**

### Key Discovery
**my-jarvis-erez was already using the new `/home/node` architecture!**

### Validation Results
1. ✅ **Volume Mount**: Already using `/home/node` (not `/workspace`)
2. ✅ **Claude Configuration**: Proper `.claude.json` with `/home/node` projects object
3. ✅ **API Endpoints**:
   - `/health` → `{"status":"ok"}`
   - `/api/projects` → `{"projects":[{"path":"/home/node","encodedName":"-home-node"}]}`
4. ✅ **Voice Functionality**: 200+ MP3 files in `/home/node/tools/voice/`
5. ✅ **File Structure**: All user data properly located in `/home/node`
6. ✅ **User Authentication**: Claude Code authenticated and working

### Code Updates Applied
✅ **Updated hardcoded `/workspace` references**:
- `lib/claude-webui-server/handlers/files.js:53` → `/home/node`
- `lib/claude-webui-server/handlers/voice.ts:37` → `/home/node`
- `lib/claude-webui-server/handlers/chat.ts:111` → Updated comment

### Migration Status Update

**my-jarvis-erez**: ✅ **COMPLETE** (already migrated)
**my-jarvis-lilah**: ✅ **COMPLETE** (already migrated)

## ✅ **MIGRATION TEST RESULTS (my-jarvis-lilah)**

**Date**: 2025-11-11
**Status**: ✅ **SUCCESSFUL - NO MIGRATION NEEDED**

### Key Discovery
**my-jarvis-lilah was also already using the new `/home/node` architecture!**

### Validation Results
1. ✅ **Volume Mount**: Already using `/home/node` (not `/workspace`)
2. ✅ **Claude Configuration**: Proper `.claude.json` with `/home/node` projects object
3. ✅ **API Endpoints**:
   - `/health` → `{"status":"ok","timestamp":1762885073089,"uptime":25.058480536}`
   - `/api/projects` → `{"projects":[{"path":"/home/node","encodedName":"-home-node"}]}`
4. ✅ **Voice Functionality**: 150+ MP3 files including Hebrew responses in `/home/node/tools/voice/`
5. ✅ **File Structure**: All user data properly located in `/home/node`
6. ✅ **User Authentication**: Claude Code authenticated and working

### Code Updates Applied
✅ **Latest code deployed** with updated hardcoded `/workspace` references

**Next Target**: Identify which apps still use `/workspace` architecture

---

## ✅ TICKET COMPLETION SUMMARY

**Date Completed**: 2025-11-11
**Status**: All existing apps successfully updated to new architecture

### Final Migration Results
All existing production apps have been successfully updated:

1. ✅ **my-jarvis-erez**: Already migrated, confirmed working
2. ✅ **my-jarvis-lilah**: Already migrated, confirmed working
3. ✅ **my-jarvis-daniel**: Fixed Claude configuration + deployed latest code
4. ✅ **my-jarvis-iddo**: Deployed latest code with bug fixes
5. ✅ **my-jarvis-elad**: Deployed latest code with all fixes

### Key Fixes Applied
- **Chat Navigation Bug Fix**: Fixed issue where clicking current conversation from history would incorrectly reset chat
- **Claude Configuration**: Fixed `/root` → `/home/node` projects object path for Daniel
- **Code Updates**: Applied all hardcoded path reference updates to `/home/node`
- **Architecture Validation**: Confirmed all apps use proper `/home/node` volume mounting

### Validation Confirmed
- ✅ All `/health` endpoints responding correctly
- ✅ All `/api/projects` endpoints return proper `/home/node` path
- ✅ Chat history functionality working across all apps
- ✅ No user data lost during process
- ✅ All apps running latest codebase with bug fixes

**Result**: All production apps now have working chat history navigation and are fully synchronized with the new `/home/node` architecture standard.

---

**⚠️ CRITICAL NOTE**: This migration involves user data. Extreme caution required. Test thoroughly before touching any user apps.