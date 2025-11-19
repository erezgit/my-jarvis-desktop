# Ticket 095: Safe Claude Agent SDK Migration for Remaining Apps

## CRITICAL REQUIREMENTS

### 🚨 ABSOLUTE RULES - DO NOT VIOLATE
1. **NEVER destroy machines or apps** - Volume data must be preserved at all costs
2. **NEVER use `fly machine destroy`** - This was a critical error made with my-jarvis-erez
3. **NEVER delete apps** - User data and file systems must remain intact
4. **Use `fly deploy --update-only`** for all updates to existing apps
5. **Test authentication thoroughly** before considering migration complete

## Target Apps for Migration

### Apps that need Claude Agent SDK 2.0.42 migration:
- **my-jarvis-guy** (URL: https://my-jarvis-guy.fly.dev)
- **my-jarvis-tamar** (URL: https://my-jarvis-tamar.fly.dev)

### Apps already migrated (reference):
- **my-jarvis-erez** ✅ - Claude CLI 2.0.42, thinking support, workspace template deployed

## Changes Completed in my-jarvis-erez (Reference)

### Code Changes Made:
1. **Claude CLI Upgrade**: 2.0.36 → 2.0.42 in Dockerfile
2. **Thinking Parameters**: Added cache-busting for Docker Claude CLI installation
3. **Authentication Fixes**: Restored JWT-based authentication flow
4. **Workspace Template**: Full CLAUDE.md and project structure deployed
5. **Clear Thinking Error**: Resolved with thinking parameter support

### Issues Encountered & Solutions:
1. **Docker Cache Issues**: Used cache-busting with `ARG CLAUDE_VERSION_BUST`
2. **Authentication Broken**: Restored JWT flow, removed incorrect hardcoded auth
3. **Deployment Stuck**: Used `fly deploy --no-cache` when needed
4. **Machine Not Updating**: **CRITICAL ERROR** - I destroyed the machine (NEVER DO AGAIN)

## Safe Migration Implementation Plan

### Phase 1: Pre-Migration Validation

#### Step 1.1: Backup Current State
```bash
# Document current status
fly status -a my-jarvis-guy
fly status -a my-jarvis-tamar

# Test current authentication
curl https://my-jarvis-guy.fly.dev/health
curl https://my-jarvis-tamar.fly.dev/health

# Check volume status
fly volumes list -a my-jarvis-guy
fly volumes list -a my-jarvis-tamar

# Verify current Claude CLI version
fly ssh console -a my-jarvis-guy -C "claude --version"
fly ssh console -a my-jarvis-tamar -C "claude --version"
```

#### Step 1.2: Verify JWT Secrets Match
```bash
# Check my-jarvis-web JWT secret
cat /Users/erezfern/Workspace/my-jarvis/spaces/my-jarvis-desktop/projects/my-jarvis-web/.env.local | grep JWT_SECRET

# Verify app secrets match (should be: dEf2vFruOirvQX/GtVV14NfQr3X9HkEG99+QEvf9Y2g=)
fly secrets list -a my-jarvis-guy
fly secrets list -a my-jarvis-tamar
```

### Phase 2: Safe Code Deployment

#### Step 2.1: Deploy Latest Code with --update-only (SAFE)
```bash
# Deploy to my-jarvis-guy (SAFE - preserves volume)
fly deploy -a my-jarvis-guy --update-only

# Deploy to my-jarvis-tamar (SAFE - preserves volume)
fly deploy -a my-jarvis-tamar --update-only
```

#### Step 2.2: Monitor Deployment
```bash
# Watch deployment logs
fly logs -a my-jarvis-guy
fly logs -a my-jarvis-tamar

# Verify apps come back online
fly status -a my-jarvis-guy
fly status -a my-jarvis-tamar
```

### Phase 3: Verification & Testing

#### Step 3.1: Verify Claude CLI Update
```bash
# Should show 2.0.42 (Claude Code)
fly ssh console -a my-jarvis-guy -C "claude --version"
fly ssh console -a my-jarvis-tamar -C "claude --version"
```

#### Step 3.2: Test Authentication Flow
```bash
# Test authentication endpoints
curl https://my-jarvis-guy.fly.dev/health
curl https://my-jarvis-tamar.fly.dev/health

# Test redirect behavior (should redirect to login)
curl -I https://my-jarvis-guy.fly.dev
curl -I https://my-jarvis-tamar.fly.dev
```

#### Step 3.3: Verify Workspace Template
```bash
# Check if CLAUDE.md exists in user home
fly ssh console -a my-jarvis-guy -C "ls -la /home/node | grep CLAUDE"
fly ssh console -a my-jarvis-tamar -C "ls -la /home/node | grep CLAUDE"

# If missing, run setup script
fly ssh console -a my-jarvis-guy -C "/app/scripts/setup-new-app.sh"
fly ssh console -a my-jarvis-tamar -C "/app/scripts/setup-new-app.sh"
```

### Phase 4: User Testing & Validation

#### Step 4.1: End-to-End Authentication Test
1. Access my-jarvis-guy via my-jarvis-web login
2. Verify login with credentials: guy@test.com / Guy123test
3. Test Claude CLI functionality in terminal
4. Verify clear_thinking_20251015 error is resolved

5. Access my-jarvis-tamar via my-jarvis-web login
6. Verify login with credentials: tamar@myjarvis.io / Tamar2024MyJarvis!
7. Test Claude CLI functionality in terminal
8. Verify clear_thinking_20251015 error is resolved

#### Step 4.2: Volume Integrity Check
```bash
# Verify user data is preserved
fly ssh console -a my-jarvis-guy -C "ls -la /home/node"
fly ssh console -a my-jarvis-tamar -C "ls -la /home/node"

# Check for any data loss
fly ssh console -a my-jarvis-guy -C "du -sh /home/node"
fly ssh console -a my-jarvis-tamar -C "du -sh /home/node"
```

## Rollback Plan

### If Authentication Fails:
1. **DO NOT destroy machines**
2. Check JWT secret configuration
3. Verify my-jarvis-web is accessible
4. Re-deploy with explicit JWT secret if needed:
```bash
fly secrets set JWT_SECRET="dEf2vFruOirvQX/GtVV14NfQr3X9HkEG99+QEvf9Y2g=" -a APP_NAME
```

### If Claude CLI Fails:
1. **DO NOT destroy machines**
2. SSH into app and manually check Claude installation
3. Use deployment logs to identify issues
4. Re-deploy if needed (always with --update-only)

### If Deployment Hangs:
1. **DO NOT destroy machines**
2. Wait for timeout (up to 10 minutes)
3. Check machine status with `fly machine list`
4. Restart machine if needed: `fly machine restart MACHINE_ID -a APP_NAME`

## Success Criteria

### ✅ Migration Complete When:
1. Both apps show Claude CLI 2.0.42
2. Authentication works end-to-end from my-jarvis-web
3. clear_thinking_20251015 error is resolved
4. CLAUDE.md and workspace template are deployed
5. All user data and volumes are preserved
6. Apps are accessible and functional

## Risk Mitigation

### Critical Safeguards:
1. **Always use --update-only** for existing apps
2. **Never use machine destroy commands**
3. **Test authentication before declaring success**
4. **Verify volume preservation after each step**
5. **Document any issues encountered**

### Emergency Contacts:
- If data loss occurs, immediately stop and escalate
- If authentication fails, revert JWT secrets
- If apps become inaccessible, check Fly.io status

---

## ✅ TICKET COMPLETED - 2025-11-15

**MIGRATION SUCCESSFUL** - Both my-jarvis-guy and my-jarvis-tamar successfully updated to Claude Agent SDK 2.0.42

### Final Results:
- ✅ **my-jarvis-guy**: Claude CLI 2.0.42, Volume: 61MB preserved, Authentication working
- ✅ **my-jarvis-tamar**: Claude CLI 2.0.42, Volume: 24MB preserved, Authentication working
- ✅ **clear_thinking_20251015 error resolved** for both apps
- ✅ **Zero data loss** - All volumes and user data preserved
- ✅ **Safe deployment protocol followed** - Used --update-only only

**Deployment Time**: ~1.5 hours actual vs 2-3 hours estimated

---

**Created**: 2025-11-15
**Completed**: 2025-11-15
**Priority**: High (User-facing apps)
**Risk Level**: Medium (Existing app updates)
**Status**: ✅ CLOSED - SUCCESS