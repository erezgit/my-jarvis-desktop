# My Jarvis Desktop - Deployment Guide

## Repository Information

- **GitHub URL**: https://github.com/erezgit/my-jarvis-desktop
- **Project Type**: Cloud-Deployed AI-Powered Web Application
- **Framework**: React 19 + TypeScript + Claude Code WebUI + Fly.io
- **Current Version**: 1.4.0
- **Status**: ✅ Production-Ready AI Chat Application

---

## Create New App (5 Simple Steps)

**When user requests "create new app [name]", Jarvis executes all steps 1-5. User can then immediately access the working app. Do not create any documentation or guides - just follow the steps.**

### Step 1: Create Fly.io App
```bash
fly apps create my-jarvis-newuser
```

### Step 2: Deploy Docker Image
```bash
fly deploy --app my-jarvis-newuser
```

### Step 3: Set Authentication Environment Variables
```bash
fly secrets set JWT_SECRET="dEf2vFruOirvQX/GtVV14NfQr3X9HkEG99+QEvf9Y2g=" LOGIN_URL="https://www.myjarvis.io/login" --app my-jarvis-newuser
```

### Step 4: Create User Account (Supabase Auth)
```bash
# Create user through official Supabase Auth API (NOT manual SQL inserts)
# Use supabase.auth.signUp() with email/password
# Generate secure password (8+ characters, mixed characters)
```

### Step 5: Create Database Instance Mapping
```sql
-- CRITICAL: Link user account to Fly.io app in user_instances table
-- ⚠️  WARNING: fly_app_url MUST be hostname-only (NO https://)
-- ✅ CORRECT: 'my-jarvis-newuser.fly.dev'
-- ❌ WRONG:   'https://my-jarvis-newuser.fly.dev'
INSERT INTO user_instances (
  user_id,
  fly_app_name,
  fly_app_url,
  status,
  provisioned_at
) VALUES (
  '[USER_ID_FROM_AUTH_USERS]',
  'my-jarvis-newuser',
  'my-jarvis-newuser.fly.dev',
  'ready',
  now()
);
```

**CRITICAL**: The `fly_app_url` field MUST contain only the hostname (`app.fly.dev`). Including `https://` will cause malformed redirect URLs like `https://https://app.fly.dev?token=xxx` and break authentication completely.

### Step 6: Initialize Workspace
```bash
fly ssh console -a my-jarvis-newuser
/app/scripts/setup-new-app.sh
exit
```

**Result**: Fully working app with authentication and chat history auto-loading.

---

## What Happens Automatically

### During Deployment
- Docker image builds with node user architecture
- Container starts and configures SSH environment
- App becomes accessible at `https://my-jarvis-newuser.fly.dev`

### During Setup Script
- Copies template files from `/app/workspace-template/` to `/home/node/`
- **Creates `.claude.json` with projects object** (enables chat history API)
- Creates `.claude/projects/-home-node/` directory structure
- Sets proper file permissions for node user

### After User Login
- ✅ Chat history works immediately (auto-loads latest conversation)
- ✅ Voice generation works immediately
- ✅ Claude Code agent works for all AI features

---

## Update Existing App Code

### Step 1: Increment Version Number
Update the version in `package.json` by incrementing it (e.g., from 1.4.0 to 1.4.1):
```bash
# Edit package.json and increment the "version" field
```

**Note**: The Settings modal version automatically pulls from package.json, so you only need to update one place.

### Step 2: Verify fly.toml Configuration
**⚠️ CRITICAL**: Before deploying, verify `fly.toml` points to the correct app:
```bash
# Check which app fly.toml is configured for
grep "^app = " fly.toml

# Expected output: app = "my-jarvis-user"
```

**WARNING**: If `fly.toml` has the wrong app name, `flyctl deploy` will deploy to that app instead of the one specified in `--app` flag! The `app` field in `fly.toml` takes precedence.

**Best Practice**:
- Use `--config` flag to specify app-specific config: `fly deploy --config fly-my-jarvis-user.toml`
- OR verify `fly.toml` before every deployment
- OR always use `--app` flag AND verify fly.toml matches

### Step 3: Deploy Updated Code
```bash
fly deploy --app my-jarvis-user --update-only
```

**Note**: Always use `--update-only` to avoid creating duplicate machines.
**Important**: The version display in Settings modal is automatically updated from package.json - no manual changes needed.

---

## Essential Troubleshooting

### Chat history not loading
```bash
# Check .claude.json exists with projects object
flyctl ssh console -a APP_NAME -C "cat /home/node/.claude.json"

# If missing projects object, recreate it
flyctl ssh console -a APP_NAME -C 'cat > /home/node/.claude.json << '\''EOF'\''
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
EOF'

# Verify API works
curl https://app-name.fly.dev/api/projects
# Should return: {"projects":[{"path":"/home/node","encodedName":"-home-node"}]}
```

### Claude Code agent fails
```bash
# Check SSH environment
flyctl ssh console -a APP_NAME
echo $HOME  # Should be /home/node
echo $USER  # Should be node

# If wrong, restart app
flyctl apps restart APP_NAME
```

Then authenticate in web terminal: `claude login`

### App not accessible
1. Verify app exists: `fly status --app APP_NAME`
2. Check logs: `fly logs --app APP_NAME`
3. Ensure memory is 2GB in fly.toml

---

## Quick Reference

| Task | Command |
|------|---------|
| Create new app | `fly apps create NAME` → `fly deploy --app NAME` → SSH + setup script |
| Update code | `fly deploy --app NAME --update-only` |
| Delete app | `fly apps destroy NAME --yes` |
| SSH access | `fly ssh console -a NAME` |
| View logs | `fly logs --app NAME` |
| Check status | `fly status --app NAME` |

---

## Required Configuration

- **Memory**: 2GB (fly.toml: `memory = "2gb"`)
- **Ports**: 10000 (HTTP/HTTPS), 3001 (WebSocket for terminal)
- **Volume**: 10GB mounted at `/home/node`
- **Environment Variables**:
  - `JWT_SECRET`: Must be `dEf2vFruOirvQX/GtVV14NfQr3X9HkEG99+QEvf9Y2g=` (exact match with web app)
  - `LOGIN_URL`: Must be `https://www.myjarvis.io/login`

---

---

## ✅ Existing Apps Update Process

**COMPLETED 2025-11-11**: Successfully updated all existing production apps with new architecture and bug fixes.

### Proven Update Strategy
Our systematic approach for updating existing apps:

#### 1. **Architecture Assessment** (5 minutes per app)
```bash
# Check current status
curl https://app-name.fly.dev/health
curl https://app-name.fly.dev/api/projects

# Verify Claude configuration
echo "cat /home/node/.claude.json | head -c 1000" | fly ssh console -a app-name
```

#### 2. **Issue Identification** (Common Findings)
- ✅ **Already Migrated**: Apps using `/home/node` architecture correctly
- ⚠️ **Config Issue**: `.claude.json` pointing to `/root` instead of `/home/node`
- ⚠️ **Old Code**: Missing latest bug fixes (chat navigation)

#### 3. **Fix Application** (As needed)
```bash
# For config issues - fix projects object path
cat > /home/node/.claude.json << 'JSON'
{
  "projects": {
    "/home/node": {
      "allowedTools": ["Read", "Write", "Edit", "Bash"],
      "history": [], "mcpServers": {}, "exampleFiles": [], "mcpContextUris": []
    }
  }
}
JSON

# Always deploy latest code (includes bug fixes)
fly deploy --app app-name --config fly-appname.toml  # Use app-specific config if exists
```

#### 4. **Validation** (2 minutes per app)
```bash
# Confirm all endpoints work
curl https://app-name.fly.dev/health
curl https://app-name.fly.dev/api/projects
# Should return: {"projects":[{"path":"/home/node","encodedName":"-home-node"}]}
```

### Key Learnings
1. **Most apps already migrated** - Architecture was largely correct
2. **Configuration edge cases** - Some apps had `/root` projects object
3. **Bug fix deployment essential** - Always deploy latest code for fixes
4. **App-specific configs** - Use `fly-appname.toml` when available
5. **Zero data loss** - Process preserves all user data and settings

### Migration Results ✅
All existing production apps successfully updated:
- my-jarvis-erez, my-jarvis-lilah, my-jarvis-daniel, my-jarvis-iddo, my-jarvis-elad
- ✅ Chat history navigation fix applied
- ✅ Proper `/home/node` architecture confirmed
- ✅ All API endpoints functional

---

*Last Updated: 2025-11-11*
*Simple 3-step deployment process - everything else happens automatically*