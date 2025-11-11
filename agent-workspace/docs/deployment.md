# My Jarvis Desktop - Deployment Guide

## Repository Information

- **GitHub URL**: https://github.com/erezgit/my-jarvis-desktop
- **Project Type**: Cloud-Deployed AI-Powered Web Application
- **Framework**: React 19 + TypeScript + Claude Code WebUI + Fly.io
- **Current Version**: 1.33.7
- **Status**: ✅ Production-Ready AI Chat Application

---

## Create New App (3 Simple Steps)

**When user requests "create new app [name]", Jarvis executes all steps 1-3. User can then immediately access the working app. Do not create any documentation or guides - just follow the steps.**

### Step 1: Create Fly.io App
```bash
fly apps create my-jarvis-newuser
```

### Step 2: Deploy Docker Image
```bash
fly deploy --app my-jarvis-newuser
```

### Step 3: Initialize Workspace
```bash
fly ssh console -a my-jarvis-newuser
/app/scripts/setup-new-app.sh
exit
```

**Result**: Fully working app with chat history auto-loading and voice generation.

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

```bash
fly deploy --app my-jarvis-user --update-only
```

**Note**: Always use `--update-only` to avoid creating duplicate machines.

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

---

*Last Updated: 2025-11-09*
*Simple 4-step deployment process - everything else happens automatically*