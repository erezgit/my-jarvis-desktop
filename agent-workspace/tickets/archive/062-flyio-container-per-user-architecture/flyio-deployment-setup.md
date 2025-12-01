# Fly.io Deployment Setup - My Jarvis Desktop
**Ticket #062: Container-Per-User Architecture**

**Date:** October 14, 2025
**Status:** Initial Setup Complete

---

## 🎯 Architecture Overview

### High-Level Strategy

**Goal:** Deploy My Jarvis Desktop with ability to spawn isolated containers per user.

**Deployment Model:**
```
Fly.io Organization
    ↓
App: my-jarvis-desktop
    ↓
Multiple Machines (Containers)
    ├── Machine 1: Main web instance (shared)
    ├── Machine 2: User workspace container (isolated)
    ├── Machine 3: User workspace container (isolated)
    └── ... (scale dynamically)
```

### Why Fly.io?

✅ **Machines API** - Programmatic container spawning
✅ **Per-second billing** - Cost-efficient for on-demand workspaces
✅ **Global distribution** - Low latency worldwide
✅ **Volume support** - Persistent storage per container
✅ **WebSocket support** - Terminal functionality works
✅ **Docker native** - Uses our existing Dockerfile

---

## 🔐 Access Token (SENSITIVE - DO NOT COMMIT)

**Token Type:** Organization Deploy Token
**Created:** October 14, 2025
**Scope:** Full organization deployment access

**Token:**
```
FlyV1 fm2_lJPECAAAAAAACWXAxBC4OLZJUakTheJ4Wjup6WUOwrVodHRwczovL2FwaS5mbHkuaW8vdjGUAJLOABH5Hh8Lk7lodHRwczovL2FwaS5mbHkuaW8vYWFhL3YxxDyp0nA2K5rD12NFR+/kuVVfZn5xQp4+97d6TyxVTTuIcyDiP9jOkm1lS4wdZngxZE6XrR1jSBka+wDpgpvEThqj9W4D6wV9lfnOcpJDb+OduC3htTDAfFkZLOcSHCb+KkICIsEm078w8m+0cqzeqvQklieQd6FkxaJfOo9mLrCqfVPmw8o+Uja0z1WdcsQgLStuYwjhzdcJ0DCyKmOG6KXUuBV0l0gqJQixfl0bGZw=,fm2_lJPEThqj9W4D6wV9lfnOcpJDb+OduC3htTDAfFkZLOcSHCb+KkICIsEm078w8m+0cqzeqvQklieQd6FkxaJfOo9mLrCqfVPmw8o+Uja0z1WdcsQQLvTfRZ7P6eXLwydLI3foBsO5aHR0cHM6Ly9hcGkuZmx5LmlvL2FhYS92MZgEks5o7nCOzwAAAAEk5o6sF84AEUYOCpHOABFGDgzEEKEAUdM/kPJ0cbvgeillh0LEIPojEfKWopFrwLpsddMDsNPB0d+fniDMcovArrodFd8B
```

**Capabilities:**
- ✅ Create and delete apps
- ✅ Deploy applications
- ✅ Manage machines (create, stop, destroy)
- ✅ Configure secrets and environment variables
- ✅ Manage volumes and storage
- ✅ Scale applications

**Security Notes:**
- ⚠️ **NEVER commit this file to git**
- ⚠️ This token is for local development and CI/CD only
- ⚠️ Rotate token if compromised
- ⚠️ Store in environment variables or secrets management

---

## 📦 App Configuration

### App Details

**App Name:** `my-jarvis-desktop`
**Primary Region:** `sjc` (San Jose, CA)
**Billing:** Organization-level

**Alternative Regions:**
- `iad` - US East (Virginia)
- `lhr` - London, UK
- `fra` - Frankfurt, Germany
- `sin` - Singapore
- `syd` - Sydney, Australia

### fly.toml Configuration

Location: `/spaces/my-jarvis-desktop/projects/my-jarvis-desktop/fly.toml`

**Key Settings:**
- **Port 10000:** Main web server (HTTP + WebSocket)
- **Port 3001:** Terminal WebSocket (deprecated, now uses `/terminal` path)
- **Volume Mount:** `/workspace` for persistent storage
- **Auto-scaling:** Enabled with min 0 machines

---

## 🚀 Deployment Process

### Phase 1: Initial Deployment (Current)

**Objective:** Get single instance running

```bash
# 1. Set up flyctl authentication
export FLY_API_TOKEN="<token-above>"

# 2. Create app (first time only)
flyctl apps create my-jarvis-desktop --org <org-name>

# 3. Deploy from Dockerfile
cd /spaces/my-jarvis-desktop/projects/my-jarvis-desktop
flyctl deploy

# 4. Check status
flyctl status

# 5. Open app
flyctl open
```

**Expected Result:**
- App running at: `https://my-jarvis-desktop.fly.dev`
- Terminal accessible at: `wss://my-jarvis-desktop.fly.dev/terminal`
- Single shared instance for all users

---

### Phase 2: Multi-Container Setup (Future)

**Objective:** Spawn isolated containers per user

**Architecture:**
```
Main App (my-jarvis-desktop)
  ├── Web Server Machine (always-on)
  │   └── Handles auth, routing, spawning
  │
  └── User Workspace Machines (on-demand)
      ├── Machine: user-123-workspace
      │   ├── Volume: user-123-data
      │   ├── Isolated Claude instance
      │   └── Personal terminal
      │
      └── Machine: user-456-workspace
          ├── Volume: user-456-data
          ├── Isolated Claude instance
          └── Personal terminal
```

**Implementation via Fly Machines API:**

```typescript
// From backend, spawn new machine for user
import { FlyClient } from '@fly-io/api-client'

const flyClient = new FlyClient(process.env.FLY_API_TOKEN)

async function spawnUserWorkspace(userId: string) {
  // 1. Create volume for user data
  const volume = await flyClient.createVolume({
    app: 'my-jarvis-desktop',
    name: `user-${userId}-data`,
    size_gb: 5,
    region: 'sjc'
  })

  // 2. Spawn machine with user's volume
  const machine = await flyClient.createMachine({
    app: 'my-jarvis-desktop',
    config: {
      image: 'registry.fly.io/my-jarvis-desktop:latest',
      env: {
        USER_ID: userId,
        WORKSPACE_DIR: '/workspace',
        NODE_ENV: 'production'
      },
      mounts: [{
        volume: volume.id,
        path: '/workspace'
      }],
      services: [{
        internal_port: 10000,
        protocol: 'tcp',
        ports: [{
          port: 443,
          handlers: ['tls', 'http']
        }]
      }],
      guest: {
        cpu_kind: 'shared',
        cpus: 1,
        memory_mb: 512
      }
    }
  })

  return {
    machineId: machine.id,
    volumeId: volume.id,
    url: `https://${machine.id}.my-jarvis-desktop.internal`
  }
}

// 3. Stop machine when user disconnects
async function stopUserWorkspace(machineId: string) {
  await flyClient.stopMachine({
    app: 'my-jarvis-desktop',
    machineId: machineId
  })
}

// 4. Destroy machine (cleanup)
async function destroyUserWorkspace(machineId: string, volumeId: string) {
  await flyClient.destroyMachine({
    app: 'my-jarvis-desktop',
    machineId: machineId
  })

  await flyClient.deleteVolume({
    app: 'my-jarvis-desktop',
    volumeId: volumeId
  })
}
```

---

## 💰 Cost Estimation

**Fly.io Pricing Model:**
- **Machines:** $0.0000008/second per MB RAM (~$2/month for 1GB always-on)
- **Volumes:** $0.15/GB/month
- **Bandwidth:** $0.02/GB (first 100GB free)

**Example: 100 Active Users**
```
Main server (always-on):
  1 machine × 1GB RAM × $2/month = $2/month

User workspaces (on-demand, 2 hours/day average):
  100 machines × 512MB × $1/month × (2hrs/24hrs) = $4.17/month

Storage:
  100 volumes × 5GB × $0.15/GB = $75/month

Total: ~$81/month for 100 users with 2hr/day usage
```

**Cost Optimization:**
- Machines auto-stop after idle period
- Volumes persist but machines don't
- Pay only for actual compute time

---

## 🔧 Environment Variables

**Required Secrets (to be set):**

```bash
# Set secrets via flyctl
flyctl secrets set \
  ANTHROPIC_API_KEY="<your-claude-api-key>" \
  OPENAI_API_KEY="<for-voice-generation>" \
  --app my-jarvis-desktop
```

**Current Dockerfile ENV:**
- `PORT=10000`
- `TERMINAL_WS_PORT=3001` (deprecated)
- `NODE_ENV=production`
- `WORKSPACE_DIR=/workspace`
- `ANTHROPIC_CONFIG_PATH=/workspace/.claude`
- `CLAUDE_CONFIG_DIR=/workspace/.claude`

---

## 📊 Monitoring & Logs

**View logs:**
```bash
# Real-time logs
flyctl logs --app my-jarvis-desktop

# Specific machine
flyctl logs --app my-jarvis-desktop --instance <machine-id>
```

**Check status:**
```bash
# App overview
flyctl status --app my-jarvis-desktop

# Machine details
flyctl machine list --app my-jarvis-desktop

# Volume info
flyctl volumes list --app my-jarvis-desktop
```

**Metrics:**
```bash
# Open monitoring dashboard
flyctl dashboard --app my-jarvis-desktop
```

---

## 🚨 Troubleshooting

### Common Issues

**1. Deployment Fails**
```bash
# Check build logs
flyctl logs --app my-jarvis-desktop

# Verify Dockerfile builds locally
docker build -t my-jarvis-test .
```

**2. Terminal Not Working**
- Check WebSocket path: Should be `/terminal`, not `:3001`
- Verify `terminal-handler-http.ts` is deployed
- Check server logs for "Terminal WebSocket handler registered"

**3. Machine Won't Start**
```bash
# Get machine details
flyctl machine status <machine-id> --app my-jarvis-desktop

# Restart machine
flyctl machine restart <machine-id> --app my-jarvis-desktop
```

**4. Volume Issues**
```bash
# List volumes
flyctl volumes list --app my-jarvis-desktop

# Check volume usage
flyctl ssh console --app my-jarvis-desktop
df -h /workspace
```

---

## 📝 Next Steps

### Immediate (Phase 1):
- [x] Create Fly.io account
- [x] Generate organization deploy token
- [x] Document token and architecture
- [ ] Deploy initial app to Fly.io
- [ ] Test terminal functionality
- [ ] Verify WebSocket connections
- [ ] Set up environment secrets

### Future (Phase 2):
- [ ] Implement Fly Machines API integration
- [ ] Build user workspace spawning logic
- [ ] Add auto-scaling and cleanup
- [ ] Implement volume management
- [ ] Add monitoring and alerts
- [ ] Cost optimization analysis

---

## 🔗 Resources

- **Fly.io Dashboard:** https://fly.io/dashboard
- **Machines API Docs:** https://fly.io/docs/machines/api/
- **fly.toml Reference:** https://fly.io/docs/reference/configuration/
- **Pricing:** https://fly.io/docs/about/pricing/

---

**⚠️ SECURITY REMINDER:**
This file contains sensitive access tokens. Add to `.gitignore`:
```
**/flyio-deployment-setup.md
```
