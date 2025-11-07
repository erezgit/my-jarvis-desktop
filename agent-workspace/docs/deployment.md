# My Jarvis Desktop - Deployment Guide

## Repository Information

- **GitHub URL**: https://github.com/erezgit/my-jarvis-desktop
- **Project Type**: Cloud-Deployed AI-Powered Web Application
- **Framework**: React 19 + TypeScript + Claude Code WebUI + Fly.io
- **Current Version**: 1.33.7
- **Status**: ✅ Production-Ready AI Chat Application

---

## Current Production Deployment

**Live URL**: https://my-jarvis-erez.fly.dev

**Infrastructure**:
- **Platform**: Fly.io (San Jose, sjc region)
- **App Name**: my-jarvis-erez
- **Memory**: 2GB (shared-cpu-1x)
- **CPU**: 1 shared CPU
- **Storage**: 10GB persistent volume mounted at `/home/node`
- **Ports**:
  - Port 10000 (HTTP/HTTPS)
  - Port 3001 (WebSocket for terminal)

**Configuration**: See `fly.toml` in project root

---

## Deployment Architecture

The application uses a three-layer architecture:

1. **Docker Image** (`/app/`) - Application code, built during deployment
2. **Persistent Volume** (`/home/node/`) - User data, chat history, configuration
3. **Ephemeral Runtime** (`/root/`) - Temporary files, recreated on each restart

### Key Scripts

All deployment scripts are in `/scripts/` directory:

| Script | Purpose | When It Runs | User Context |
|--------|---------|--------------|--------------|
| `docker-entrypoint.sh` | Fixes volume permissions, sets HOME environment, and switches to node user | **Automatic** - every container start | Runs as root, switches to node |
| ~~`init-claude-config.sh`~~ | ~~Creates Claude config~~ | **Removed** - Functionality moved to setup-new-app.sh | N/A |
| `setup-new-app.sh` | Initializes home directory template files, Claude config, and sets permissions | **Manual** - once after first deployment | Runs as root (via SSH), fixes permissions for node |

---

## Deployment Methods

### Method 1: Simple Deployment (Recommended)

Uses the deploy script with embedded Fly.io token.

```bash
# From project root
./deploy.sh
```

**What it does**: Runs `flyctl deploy` with pre-configured authentication

**When to use**: Regular code updates to existing deployment

---

### Method 2: Manual Deployment with flyctl

For more control over the deployment process.

**Prerequisites**:
1. Install flyctl: `curl -L https://fly.io/install.sh | sh`
2. Authenticate: `fly auth login` or set `FLY_API_TOKEN` environment variable

**Deploy**:
```bash
# Update existing deployment
fly deploy --app my-jarvis-erez --update-only

# First-time deployment (creates new app)
fly deploy --app my-jarvis-newuser
```

**Verify**:
```bash
fly status --app my-jarvis-erez
fly logs --app my-jarvis-erez
```

---

## Three Deployment Use Cases

### Use Case 1: Create New App

**When**: Deploying for first time or creating new user instance

**Steps**:

1. **Create the Fly.io app first**:
   ```bash
   fly apps create my-jarvis-newuser
   ```

2. **Deploy Docker image**:
   ```bash
   fly deploy --app my-jarvis-newuser
   ```

3. **SSH into new app and initialize workspace**:
   ```bash
   fly ssh console -a my-jarvis-newuser
   /app/scripts/setup-new-app.sh
   exit
   ```

4. **User authenticates Claude Code** (in web terminal):
   - Access `https://my-jarvis-newuser.fly.dev`
   - Open terminal in the web interface
   - Run `claude login` and authenticate with Anthropic API key
   - Chat history and agent features will work immediately

**What happens**:
- Fly.io builds Docker image with node user architecture (from ticket #75)
- Container starts with `docker-entrypoint.sh` (fixes volume permissions, switches to node user)
- `setup-new-app.sh` (when run manually):
  - Copies template files from `/app/workspace-template/` to `/home/node/`
  - **Creates `/home/node/.claude.json` with project configuration (CRITICAL for history API)**
  - Creates `/home/node/.claude/projects/-home-node/` for history storage
  - Creates `/home/node/tools/voice/` directory for audio files
  - Creates `/home/node/tools/config/.env` with OpenAI API key for voice
  - Sets ALL files to `node:node` ownership with proper permissions
- App is ready at `https://my-jarvis-newuser.fly.dev` with:
  - ✅ Chat history (works immediately)
  - ✅ Voice generation (works immediately with included OpenAI key)
  - ⚠️ Claude Code agent (requires user to run `claude login` in terminal)

---

### Use Case 2: Update Application Code

**When**: Changed React components, backend code, dependencies, or Dockerfile

**Steps**:

```bash
# Deploy code changes
fly deploy --app my-jarvis-user --update-only
```

**What happens**:
- Docker image rebuilds with new code
- New container starts, old container stops
- `/root/` directory is wiped (ephemeral)
- `/home/node/` persists (mounted volume)
- Claude Code automatically recreates its configuration
- All user data preserved

**Key point**: Template files in `/app/workspace-template/` are NOT copied to `/home/node/` during code updates

---

### Use Case 3: Update Files in Volume

**When**: Need to update CLAUDE.md, jarvis_voice.sh, or documentation files without full redeployment

**Method A: Update my-jarvis-erez (This Instance)**

Since you're already inside my-jarvis-erez, update files directly:

1. **View current files**:
   ```bash
   cat /home/node/CLAUDE.md
   ls -la /home/node/tools/src/
   ```

2. **Update files using Edit/Write tools**:
   - Use Claude's Edit tool to modify existing files
   - Use Claude's Write tool to create/replace files
   - Changes are immediate since you're already in `/home/node`

**Method B: Update Other Instances (my-jarvis-erez-dev, my-jarvis-daniel, etc.)**

To manage other Fly.io instances from my-jarvis-erez:

1. **Load Fly.io token and SSH into target app**:
   ```bash
   bash -c 'source /home/node/tools/config/.env && export FLY_API_TOKEN="$FLY_ACCESS_TOKEN" && /root/.fly/bin/flyctl ssh console -a my-jarvis-TARGET -C "ls -la /home/node"'
   ```

2. **Update files in target instance**:
   ```bash
   bash -c 'source /home/node/tools/config/.env && export FLY_API_TOKEN="$FLY_ACCESS_TOKEN" && /root/.fly/bin/flyctl ssh console -a my-jarvis-TARGET -C "cat > /home/node/CLAUDE.md <<'"'"'EOF'"'"'
   [new content here]
   EOF"'
   ```

3. **Or use interactive SSH session**:
   ```bash
   # Start SSH session (run manually in separate terminal or via Claude)
   bash -c 'source /home/node/tools/config/.env && export FLY_API_TOKEN="$FLY_ACCESS_TOKEN" && /root/.fly/bin/flyctl ssh console -a my-jarvis-TARGET'

   # Then edit files interactively
   cat /home/node/CLAUDE.md
   # Make changes as needed
   exit
   ```

**Available Target Apps**: my-jarvis-erez-dev, my-jarvis-daniel, my-jarvis-lilah, my-jarvis-iddo

**Result**: Changes take effect immediately without restart

---

## Multi-User Deployment

To create separate isolated instances for different users, each gets their own Fly.io app.

### Creating New User Instance

**Option 1: Using fly deploy**
```bash
fly deploy --app my-jarvis-USERNAME
fly ssh console -a my-jarvis-USERNAME
/app/scripts/setup-new-app.sh
exit
```

**Option 2: Using Fly.io GraphQL API**
For programmatic deployment, use Fly.io's GraphQL API to:
1. Create app
2. Create volume (10GB)
3. Create machine (2GB memory, port 10000 + 3001)
4. Allocate IPv4 and IPv6
5. Start machine

See `agent-workspace/tickets/062-flyio-container-per-user-architecture/` for API examples.

**Result**: Each user gets `https://my-jarvis-USERNAME.fly.dev`

---

## Critical Configuration

### Memory
- **Current**: 2GB (fly.toml: `memory = "2gb"`)
- **Minimum**: 2GB required for application + Claude SDK + voice generation

### Ports
- **10000**: Main HTTP/HTTPS application port
- **3001**: WebSocket for terminal functionality (critical - app won't work without it)

### Environment Variables
Set in fly.toml:
- `PORT=10000`
- `TERMINAL_WS_PORT=3001`
- `NODE_ENV=production`

### Fly.io API Token
**Location**: `/home/node/tools/config/.env`
**Variable**: `FLY_ACCESS_TOKEN`
**Usage**: Required for flyctl commands to manage other Fly.io instances from within my-jarvis-erez

---

## Troubleshooting

### Files not visible in web interface
**Cause**: File permissions issue - files owned by root instead of node user
**Solution**:
```bash
fly ssh console -a my-jarvis-user
chown -R node:node /home/node
chmod -R 755 /home/node/tools
exit
```
**Prevention**: Always run `/app/scripts/setup-new-app.sh` after first deployment

### Voice generation fails
**Cause**: Missing .env file with OpenAI API key
**Solution**: The updated `setup-new-app.sh` now creates this automatically. For existing apps:
```bash
fly ssh console -a my-jarvis-user
cat > /home/node/tools/config/.env <<'EOF'
OPENAI_API_KEY=<your-openai-key>
FLY_ACCESS_TOKEN=<your-fly-token>
EOF
chown node:node /home/node/tools/config/.env
chmod 600 /home/node/tools/config/.env
exit
```

### App not accessible after deployment
**Cause**: Missing IP addresses or app not created
**Solution**:
1. Create app first: `fly apps create my-jarvis-newuser`
2. Then deploy: `fly deploy --app my-jarvis-newuser`
3. IPs are allocated automatically during deployment

### Terminal not working
**Cause**: Missing port 3001 service in fly.toml
**Solution**: Verify fly.toml includes both HTTP service (10000) and TCP service (3001)

### Chat history not loading
**Cause**: .claude.json missing or corrupted (should be 45 bytes with project configuration)
**Solution**:
1. Check file size: `flyctl ssh console -a APP_NAME -C "ls -la /home/node/.claude.json"`
   - Should be exactly 45 bytes
   - If larger (e.g., 38KB), it's corrupted with general Claude config
2. Fix with hotfix script: `flyctl ssh console -a APP_NAME -C "/app/scripts/legacy-fixes/hotfix-claude-config.sh"`
3. Verify API: `curl https://app-name.fly.dev/api/projects` should return `{"projects":[{"path":"/home/node","encodedName":"-home-node"}]}`

### Claude Code agent fails with "process exited with code 1" OR "Invalid API key"
**Cause**: Claude Code not authenticated
**Solution**:
1. Open the web terminal at `https://app-name.fly.dev`
2. Run `claude login` and authenticate with your Anthropic API key
3. Test agent functionality in the browser

**Note**: With the fixed docker-entrypoint.sh that properly sets HOME=/home/node, Claude Code will find the correct configuration automatically.

**Note**: Terminal works fine but agent features require authentication
**For legacy apps**: If deployed before Nov 2025, you may need: `flyctl ssh console -a APP_NAME -C "/app/scripts/legacy-fixes/hotfix-claude-login.sh"`

### App crashes on startup
**Cause**: Insufficient memory
**Solution**: Verify fly.toml has `memory = "2gb"`

### Duplicate machines/volumes after update
**Cause**: Used `fly deploy` without `--update-only` flag
**Solution**: Always use `--update-only` for updates:
```bash
fly deploy --app my-jarvis-user --update-only
```

To cleanup duplicates:
```bash
fly machines list --app my-jarvis-user
fly machine destroy OLD_MACHINE_ID --app my-jarvis-user
```

---

## Verification

After deployment, verify everything works:

```bash
# 1. Check app status
fly status --app my-jarvis-user

# 2. Check HTTP response
curl -I https://my-jarvis-user.fly.dev
# Should return: HTTP/2 200

# 3. Check logs
fly logs --app my-jarvis-user

# 4. Verify resources
fly machines list --app my-jarvis-user  # Should show 1 machine
fly volumes list --app my-jarvis-user   # Should show 1 volume
```

---

## Deployment Best Practices

1. **Always use `--update-only`** for code updates to existing apps
2. **Test first**: Deploy to your own instance before updating user instances
3. **Version tracking**: Update version in package.json before deploying
4. **Monitor resources**: Check machines and volumes after each deployment
5. **User data**: Volumes persist across updates - user data is safe
6. **Template updates**: To update workspace files, use SSH and manual copy from `/app/home/node-template/`

---

## Quick Reference

| Task | Command |
|------|---------|
| Deploy code update | `./deploy.sh` or `fly deploy --app NAME --update-only` |
| Create new user | `fly deploy --app my-jarvis-USER` then SSH + run `setup-new-app.sh` |
| Delete app completely | `fly apps destroy NAME --yes` |
| View logs | `fly logs --app NAME` |
| SSH into app | `fly ssh console -a NAME` |
| Check status | `fly status --app NAME` |
| List machines | `fly machines list --app NAME` |
| List volumes | `fly volumes list --app NAME` |

---

## Important Architecture Notes (Post Ticket #75)

### User Context Changes
As of ticket #75 (November 2025), the application runs with the following user architecture:

| Component | User Context | Purpose |
|-----------|--------------|---------|
| Container Startup | root → node | Entrypoint starts as root to fix permissions, then switches to node |
| Web Server | node (UID 1000) | All application processes run as node user |
| SSH Access | root | When you SSH in, you connect as root |
| File Ownership | node:node | All /home/node files must be owned by node:node |
| Claude Config | /home/node/.claude | Config location for node user |

### Key Differences from Earlier Versions
- **Old**: Container ran as root, files owned by root
- **New**: Container runs as node, files must be owned by node
- **Impact**: setup-new-app.sh must fix permissions after copying files

---

*Last Updated: 2025-11-07*
*Current Configuration: 2GB Memory, 10GB Volume, Port 10000 (HTTP), Port 3001 (WebSocket), Node User Architecture*
