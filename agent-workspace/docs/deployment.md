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
- **Storage**: 1GB persistent volume mounted at `/workspace`
- **Ports**:
  - Port 10000 (HTTP/HTTPS)
  - Port 3001 (WebSocket for terminal)

**Configuration**: See `fly.toml` in project root

---

## Deployment Architecture

The application uses a three-layer architecture:

1. **Docker Image** (`/app/`) - Application code, built during deployment
2. **Persistent Volume** (`/workspace/`) - User data, chat history, configuration
3. **Ephemeral Runtime** (`/root/`) - Temporary files, recreated on each restart

### Key Scripts

All deployment scripts are in `/scripts/` directory:

| Script | Purpose | When It Runs |
|--------|---------|--------------|
| `init-claude-config.sh` | Ensures .claude symlink exists | **Automatic** - every container start |
| `setup-new-app.sh` | Initializes workspace template files | **Manual** - once after first deployment |

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

1. **Deploy Docker image**:
   ```bash
   fly deploy --app my-jarvis-newuser
   ```

2. **SSH into new app and initialize workspace**:
   ```bash
   fly ssh console -a my-jarvis-newuser
   /app/scripts/setup-new-app.sh
   exit
   ```

**What happens**:
- Fly.io builds Docker image and creates machine
- `init-claude-config.sh` runs automatically (creates .claude structure)
- `setup-new-app.sh` copies template files from `/app/workspace-template/` to `/workspace/`
- App is ready at `https://my-jarvis-newuser.fly.dev`

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
- `/workspace/` persists (mounted volume)
- `init-claude-config.sh` runs automatically and recreates symlinks
- All user data preserved

**Key point**: Template files in `/app/workspace-template/` are NOT copied to `/workspace/` during code updates

---

### Use Case 3: Update Files in Volume

**When**: Need to update CLAUDE.md, jarvis_voice.sh, or documentation files without full redeployment

**Method A: Update my-jarvis-erez (This Instance)**

Since you're already inside my-jarvis-erez, update files directly:

1. **View current files**:
   ```bash
   cat /workspace/CLAUDE.md
   ls -la /workspace/tools/src/
   ```

2. **Update files using Edit/Write tools**:
   - Use Claude's Edit tool to modify existing files
   - Use Claude's Write tool to create/replace files
   - Changes are immediate since you're already in `/workspace`

**Method B: Update Other Instances (my-jarvis-erez-dev, my-jarvis-daniel, etc.)**

To manage other Fly.io instances from my-jarvis-erez:

1. **Load Fly.io token and SSH into target app**:
   ```bash
   bash -c 'source /workspace/tools/config/.env && export FLY_API_TOKEN="$FLY_ACCESS_TOKEN" && /root/.fly/bin/flyctl ssh console -a my-jarvis-TARGET -C "ls -la /workspace"'
   ```

2. **Update files in target instance**:
   ```bash
   bash -c 'source /workspace/tools/config/.env && export FLY_API_TOKEN="$FLY_ACCESS_TOKEN" && /root/.fly/bin/flyctl ssh console -a my-jarvis-TARGET -C "cat > /workspace/CLAUDE.md <<'"'"'EOF'"'"'
   [new content here]
   EOF"'
   ```

3. **Or use interactive SSH session**:
   ```bash
   # Start SSH session (run manually in separate terminal or via Claude)
   bash -c 'source /workspace/tools/config/.env && export FLY_API_TOKEN="$FLY_ACCESS_TOKEN" && /root/.fly/bin/flyctl ssh console -a my-jarvis-TARGET'

   # Then edit files interactively
   cat /workspace/CLAUDE.md
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
2. Create volume (1GB)
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
- `WORKSPACE_DIR=/workspace`

### Fly.io API Token
**Location**: `/workspace/tools/config/.env`
**Variable**: `FLY_ACCESS_TOKEN`
**Usage**: Required for flyctl commands to manage other Fly.io instances from within my-jarvis-erez

---

## Troubleshooting

### App not accessible after deployment
**Cause**: Missing IP addresses
**Solution**: Allocate IPv4 and IPv6 using `fly ips allocate-v4` and `fly ips allocate-v6`

### Terminal not working
**Cause**: Missing port 3001 service in fly.toml
**Solution**: Verify fly.toml includes both HTTP service (10000) and TCP service (3001)

### Chat history not loading
**Cause**: .claude.json missing or incorrect
**Solution**: This is automatically fixed by `init-claude-config.sh` on every boot. Check logs with `fly logs`

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
6. **Template updates**: To update workspace files, use SSH and manual copy from `/app/workspace-template/`

---

## Quick Reference

| Task | Command |
|------|---------|
| Deploy code update | `./deploy.sh` or `fly deploy --app NAME --update-only` |
| Create new user | `fly deploy --app my-jarvis-USER` then SSH + run `setup-new-app.sh` |
| View logs | `fly logs --app NAME` |
| SSH into app | `fly ssh console -a NAME` |
| Check status | `fly status --app NAME` |
| List machines | `fly machines list --app NAME` |
| List volumes | `fly volumes list --app NAME` |

---

*Last Updated: 2025-11-01*
*Current Configuration: 2GB Memory, Port 10000 (HTTP), Port 3001 (WebSocket)*
