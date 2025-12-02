# My Jarvis Desktop - Deployment Guide

## Repository Information

- **GitHub URL**: https://github.com/erezgit/my-jarvis-desktop
- **Project Type**: Cloud-Deployed AI-Powered Web Application
- **Framework**: React 19 + TypeScript + Claude Code WebUI + Fly.io
- **Current Version**: 1.4.0
- **Status**: ✅ Production-Ready AI Chat Application

---

## Create New App (8 Simple Steps)

**When user requests "create new app [name]", Jarvis executes all steps 1-8. User can then immediately access the working app. Do not create any documentation or guides - just follow the steps.**

### Step 1: Create Fly.io App
```bash
fly apps create my-jarvis-newuser
```

### Step 2: Deploy Docker Image
```bash
fly deploy --app my-jarvis-newuser
```

### Step 3: Set Authentication, MCP & Database Environment Variables
```bash
fly secrets set \
  JWT_SECRET="dEf2vFruOirvQX/GtVV14NfQr3X9HkEG99+QEvf9Y2g=" \
  LOGIN_URL="https://www.myjarvis.io/login" \
  OPENAI_API_KEY="${OPENAI_API_KEY}" \
  WORKSPACE_DIR="/home/node" \
  DEPLOYMENT_MODE="web" \
  SUPABASE_URL="https://ocvkyhlfdjrvvipljbsa.supabase.co" \
  SUPABASE_SERVICE_KEY="${SUPABASE_SERVICE_KEY}" \
  ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY}" \
  --app my-jarvis-newuser
```

**Note**: Replace the following with actual values:
- `${OPENAI_API_KEY}` - Your OpenAI API key for MCP voice generation
- `${SUPABASE_SERVICE_KEY}` - Your Supabase service role key for database operations
- `${ANTHROPIC_API_KEY}` - Your Anthropic API key for Claude SDK

### Step 4: Create User Account (Supabase Auth)

**CRITICAL: Use the Supabase Auth API, NOT manual SQL inserts**

#### 4a. Generate Secure Password
```javascript
// Generate secure password (8+ characters, mixed case, numbers, symbols)
function generateSecurePassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

const userPassword = generateSecurePassword();
console.log('Generated password for user:', userPassword);
```

#### 4b. Create User via Supabase Auth API
```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ocvkyhlfdjrvvipljbsa.supabase.co';
const supabaseServiceKey = 'sbp_4b23d38fb597138830f7cfa14c0e6f5fe95d12a6'; // Service key for admin operations

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Create user account
const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
  email: 'user@example.com', // Replace with actual email
  password: userPassword,
  email_confirm: true, // Auto-confirm email (skip verification step)
  user_metadata: {
    name: 'User Name' // Optional: add user's name
  }
});

if (authError) {
  console.error('Error creating user:', authError);
  process.exit(1);
}

console.log('✅ User created successfully');
console.log('User ID:', authUser.user.id);
console.log('Email:', authUser.user.email);
console.log('Password:', userPassword);

// SAVE THESE CREDENTIALS - YOU'LL NEED THEM FOR LOGIN
// SAVE THE USER ID - YOU'LL NEED IT FOR STEP 4c
```

### Step 4c: Set User ID Environment Variable (Required for Token Tracking)
```bash
# CRITICAL: Set the USER_ID environment variable for token usage tracking
# This links all token usage in this container to the correct user in the database
# Use the User ID from Step 4b (authUser.user.id)
fly secrets set USER_ID="${authUser.user.id}" --app my-jarvis-newuser

# Example with actual UUID:
# fly secrets set USER_ID="3dfb3580-b7c4-4da3-8d9e-b9775c216f7e" --app my-jarvis-newuser
```

**Why this is required:**
- Each container serves ONE user exclusively
- Token usage tracking needs to know which user to attribute usage to
- Without this, token tracking will fail silently
- This enables accurate billing and usage analytics per user

### Step 5: Create Database Instance Mapping

**Link the authenticated user to their Fly.io app instance**

```sql
-- CRITICAL: Link user account to Fly.io app in user_instances table
-- ⚠️  WARNING: fly_app_url MUST be hostname-only (NO https://)
-- ✅ CORRECT: 'my-jarvis-newuser.fly.dev'
-- ❌ WRONG:   'https://my-jarvis-newuser.fly.dev'

-- Use the User ID from Step 4b (authUser.user.id)
INSERT INTO user_instances (
  user_id,
  fly_app_name,
  fly_app_url,
  status,
  provisioned_at
) VALUES (
  '${authUser.user.id}', -- Use the actual UUID from Supabase Auth
  'my-jarvis-newuser',
  'my-jarvis-newuser.fly.dev',
  'ready',
  now()
);
```

#### Example Complete SQL with Real User ID:
```sql
-- Example with actual UUID (replace with your user's ID from Step 4b)
INSERT INTO user_instances (
  user_id,
  fly_app_name,
  fly_app_url,
  status,
  provisioned_at
) VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
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

### Step 6b: Restart App (Critical for MCP Environment Variables)
```bash
# CRITICAL: Restart the entire app to ensure MCP server picks up environment variables
fly apps restart my-jarvis-newuser

# Wait for app to fully restart (usually takes 30-60 seconds)
fly status --app my-jarvis-newuser
# Wait until status shows "running"
```

**Why this step is required:**
- MCP server process starts when container boots and caches environment variables
- The setup script creates `.claude.json` but MCP server is already running with stale config
- App restart ensures MCP server restarts with fresh OPENAI_API_KEY and WORKSPACE_DIR

### Step 7: Test Complete Authentication Flow

#### 7a. Test Redirect (Unauthenticated)
```bash
# Verify app blocks unauthenticated access
curl -I https://my-jarvis-newuser.fly.dev
# Should return: 302 redirect to https://www.myjarvis.io/login
```

#### 7b. Test User Login (Full Authentication)
**Manual Test Steps:**
1. Open browser to: `https://www.myjarvis.io/login`
2. Enter credentials from Step 4:
   - **Email**: `user@example.com` (from Step 4b)
   - **Password**: `[generated password from Step 4a]`
3. Click "Sign In"
4. Should redirect to: `https://my-jarvis-newuser.fly.dev`
5. Should see working My Jarvis Desktop interface (not login page)

#### 7c. Verify App Functionality
Once logged in, test:
- ✅ Chat interface loads
- ✅ Voice messages work (MCP voice generation)
- ✅ File tree shows clean directories (docs, tickets, uploads)
- ✅ Claude Code terminal available

#### 7d. Test Voice Generation System
```bash
# Test voice generation directly (should work immediately after setup)
fly ssh console -a my-jarvis-newuser -C "python3 /home/node/tools/src/cli/auto_jarvis_voice.py 'Voice system test for new app deployment' --voice nova --output-dir /home/node/tools/voice --json-output"

# Should return JSON with success confirmation and audio file path
# Example: {"type": "voice", "transcript": "...", "audioPath": "...", "filename": "..."}
```

**Result**: Fully working app with authentication, chat history auto-loading, and MCP voice generation.

### Step 8: Update Users Documentation

Add the new user to the users.md file with complete information:

```bash
# Edit /Users/erezfern/Workspace/my-jarvis/spaces/my-jarvis-desktop/projects/my-jarvis-desktop/agent-workspace/docs/users.md
```

**Add new user entry with:**
- URL: `https://my-jarvis-newuser.fly.dev`
- Version: `[current version from package.json]`
- Status: `✅ Working (Authentication Required)`
- Architecture: `/home/node ✅`
- Features: `📊 Excel Editing, 🎤 MCP Voice System, 📱 Mobile Optimized`
- Authentication credentials (email/password from Step 4)
- User Profile: `[classify based on intended use]`
- Notes: Creation date and deployment details
- User ID from Supabase (for reference)

**Update the "Last Update" date** to current date.

---

## 🔄 Complete Workflow Summary

When creating a new app, follow this exact sequence:

1. **Create Fly.io app**: `fly apps create my-jarvis-newuser`
2. **Deploy Docker image**: `fly deploy --app my-jarvis-newuser`
3. **Set environment variables**: JWT_SECRET, LOGIN_URL, OPENAI_API_KEY, WORKSPACE_DIR
4. **Create Supabase user**: Use Auth API with generated password
5. **Link to database**: Insert into user_instances with correct User ID
6. **Initialize workspace**: Run setup script via SSH
6b. **Restart app**: Ensure MCP server picks up environment variables
7. **Test authentication**: Verify login flow AND voice generation works
8. **Update users.md**: Add new user entry with all credentials and details

**Critical Notes**:
- Always use Supabase Auth API (never manual SQL in auth.users)
- Save generated password - required for user login
- Use exact User ID from auth response in user_instances
- Never include https:// in fly_app_url field

---

## What Happens Automatically

### During Deployment
- Docker image builds with node user architecture
- Container starts and configures SSH environment
- App becomes accessible at `https://my-jarvis-newuser.fly.dev`

### During Setup Script
- Copies template files from `/app/workspace-template/` to `/home/node/`
- **Creates `.claude.json` with projects object AND MCP servers** (enables chat history + voice)
- Creates clean `my-jarvis/docs`, `my-jarvis/tickets`, `my-jarvis/uploads` directories
- Creates `.claude/projects/-home-node/` directory structure
- Sets proper file permissions for node user

### After User Login
- ✅ Chat history works immediately (auto-loads latest conversation)
- ✅ **MCP Voice generation works immediately** (no manual setup required)
- ✅ Claude Code agent works for all AI features
- ✅ Clean workspace folders (no Git keep files)

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
| Create new app | `fly apps create NAME` → `fly deploy --app NAME` → Set secrets → Create user → Link DB → SSH setup |
| Update code | `fly deploy --app NAME --update-only` |
| Delete app | `fly apps destroy NAME --yes` |
| SSH access | `fly ssh console -a NAME` |
| View logs | `fly logs --app NAME` |
| Check status | `fly status --app NAME` |
| Test auth | `curl -I https://NAME.fly.dev` (should redirect to login) |

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