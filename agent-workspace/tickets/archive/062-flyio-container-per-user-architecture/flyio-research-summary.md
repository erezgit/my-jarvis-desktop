# Ticket #062: Fly.io Container-Per-User Architecture Research

**Research Date:** October 14, 2025
**Total Web Searches:** 20
**Objective:** Evaluate Fly.io for multi-user My Jarvis deployment with container-per-user isolation

---

## Executive Summary

Fly.io offers a compelling solution for deploying My Jarvis Desktop as a multi-user SaaS application where each user gets their own isolated Docker container with full Claude Code capabilities. Unlike traditional serverless approaches that would require replicating Claude Code's functionality, Fly.io's Machines API enables programmatic creation of full Docker containers, preserving all power-user features including bash access, git operations, file system control, and build tools.

**Key Advantages:**
- ✅ **Programmatic Container Creation**: REST API for dynamic container provisioning
- ✅ **Full Claude Code Capabilities**: Complete Linux environment per user
- ✅ **Pay-Per-Use Pricing**: Billed per second, autostop when idle
- ✅ **Fast Boot Times**: ~300ms cold start, subsecond suspend/resume
- ✅ **True User Isolation**: Network, filesystem, and process-level separation
- ✅ **Global Edge Deployment**: 35+ regions for low latency

---

## 1. Fly.io Machines API - Programmatic Container Creation

### Overview

Fly Machines are fast-launching VMs (not just containers) that can be created, stopped, started, updated, and deleted via a simple REST API. Each Machine runs as a full VM with complete isolation, making them ideal for per-user environments.

### API Capabilities

**Machine Creation:**
```bash
# Create a machine via REST API
curl -X POST "https://api.machines.dev/v1/apps/my-jarvis/machines" \
  -H "Authorization: Bearer ${FLY_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "user-123-workspace",
    "region": "iad",
    "config": {
      "image": "registry.fly.io/my-jarvis:latest",
      "env": {
        "USER_ID": "user-123",
        "WORKSPACE_PATH": "/workspace"
      },
      "services": [
        {
          "ports": [{"port": 8080, "handlers": ["http"]}],
          "protocol": "tcp",
          "internal_port": 8080
        }
      ],
      "guest": {
        "cpu_kind": "shared",
        "cpus": 1,
        "memory_mb": 512
      }
    }
  }'
```

**Machine Lifecycle Management:**
- Start: `POST /v1/apps/{app}/machines/{id}/start`
- Stop: `POST /v1/apps/{app}/machines/{id}/stop`
- Suspend: `POST /v1/apps/{app}/machines/{id}/suspend`
- Delete: `DELETE /v1/apps/{app}/machines/{id}`
- Get Status: `GET /v1/apps/{app}/machines/{id}`

### JavaScript SDK

**Community Package:** `fly-machines-sdk` (npm)

```javascript
import { FlyMachinesSDK } from 'fly-machines-sdk';

const apiKey = process.env.FLY_API_TOKEN;
const orgSlug = 'my-jarvis-org';
const sdk = new FlyMachinesSDK(apiKey, orgSlug);

// Create machine for new user
const machine = await sdk.createApplicationOnMachine({
  appName: `user-${userId}`,
  image: 'registry.fly.io/my-jarvis:latest',
  region: 'iad',
  env: { USER_ID: userId }
});
```

---

## 2. Multi-Tenancy Architecture Patterns

### Container-Per-User Model

**Isolation Levels:**
1. **Network Isolation**: Apps can be placed on specific network IDs using `flyctl apps create --network`. Apps on their own network cannot communicate with apps on other networks.

2. **Filesystem Isolation**: Each Machine is a full VM with its own root filesystem. No shared storage between users' machines.

3. **Process Isolation**: Complete process-level isolation since each Machine runs as a separate VM.

4. **Resource Isolation**: CPU and memory limits per Machine prevent resource contention.

### Architecture Pattern

```
┌─────────────────────────────────────────────────────┐
│           My Jarvis Backend API (Router)            │
│         (Manages user sessions & routing)           │
└──────────────┬──────────────────────────────────────┘
               │
               │ Fly Machines API
               │
       ┌───────┴────────┬──────────────┬─────────────┐
       │                │              │             │
┌──────▼──────┐  ┌──────▼──────┐  ┌───▼──────┐  ┌──▼─────┐
│ User 1      │  │ User 2      │  │ User 3   │  │ User N │
│ Machine     │  │ Machine     │  │ Machine  │  │ Machine│
│             │  │             │  │          │  │        │
│ Claude Code │  │ Claude Code │  │ Claude   │  │ Claude │
│ + Tools     │  │ + Tools     │  │ Code     │  │ Code   │
│ + Git       │  │ + Git       │  │ + Tools  │  │ + Tools│
│ + Workspace │  │ + Workspace │  │          │  │        │
└─────────────┘  └─────────────┘  └──────────┘  └────────┘
```

### Per-User Dev Environments Blueprint

Fly.io provides official documentation for "Per-User Dev Environments" which is exactly our use case:

**Key Strategy:**
- Pre-create a pool of Fly apps and machines using the Machines API
- Store app details in a database accessible to your router
- Assign apps to users at provisioning time
- Use dynamic subdomain routing with `fly-replay`

**Security:**
- Machines run user code safely in isolated VMs
- Network policies prevent cross-user communication
- Process-level isolation even for malicious code

---

## 3. Pricing Model - Pay-Per-Use

### Core Pricing Components

**Compute (Machines):**
- Billed **per second** of runtime
- Shared CPU 1x/512MB: ~$0.0027/hour = **$1.94/month if running 24/7**
- Dedicated CPU pricing: Base preset + ~$5/30 days per GB additional RAM
- **Stopped machines**: $0 for CPU/RAM
- **Suspended machines**: $0 for CPU/RAM (resume faster than stopped)
- **Storage-only charges** for stopped/suspended: $0.15/GB/month for rootfs

**Storage (Volumes):**
- $0.15/GB/month for persistent volumes
- Billed for provisioned size (whether full or not)
- 1:1 mapping between machines and volumes

**Bandwidth:**
- Inbound: **Free**
- Outbound:
  - North America/Europe: $0.02/GB
  - Other regions: up to $0.12/GB

### Cost Calculation for Container-Per-User

**Scenario: 100 Active Users**

Assumptions:
- Each user: 1 machine with 512MB RAM
- Average usage: 4 hours/day (autostop when idle)
- 1GB persistent volume per user
- 10GB outbound bandwidth per user/month

**Monthly Costs:**
```
Compute: 100 users × $1.94/month × (4h/24h) = $32.33
Storage (volumes): 100 users × 1GB × $0.15 = $15.00
Storage (stopped rootfs): 100 users × 0.5GB × $0.15 = $7.50
Bandwidth: 100 users × 10GB × $0.02 = $20.00
─────────────────────────────────────────────────────
Total: ~$75/month for 100 users
```

**Compare to Render:**
- Render: $7-10/month per container × 100 = **$700-1,000/month**
- **Fly.io savings: ~90%** with autostop/autostart

### No Free Tier

**Important:** Fly.io eliminated their free tier in October 2024. All new organizations use pay-as-you-go billing.

---

## 4. Autostop/Autostart - Critical Cost Optimization

### Fly Proxy Autostop/Autostart

Automatically stops or suspends machines when idle and starts them on incoming requests:

**Configuration in `fly.toml`:**
```toml
[[services]]
  auto_stop_machines = "suspend"  # or "stop"
  auto_start_machines = true
  min_machines_running = 0

  [[services.concurrency]]
    type = "requests"
    soft_limit = 200
    hard_limit = 250
```

**Key Features:**
- **Subsecond starts**: Machines boot in ~300ms from stopped state
- **Faster resume**: Suspended machines preserve memory state
- **Zero CPU/RAM charges** when stopped/suspended
- **Only pay for storage**: $0.15/GB/month for rootfs when idle

**Machine States:**
1. **Started**: Running, full CPU/RAM charges
2. **Stopped**: Not running, no CPU/RAM charges, storage-only
3. **Suspended**: Paused with memory preserved, no CPU/RAM charges, storage-only

### Scaling Strategy

**For Per-User Containers:**
- User logs in → Machine auto-starts in 300ms
- User active → Machine runs and bills per second
- User inactive for 5 minutes → Machine auto-suspends
- Next request → Machine resumes instantly from suspended state

**Result:** Users only pay for actual compute time, not 24/7 runtime.

---

## 5. Persistent Storage - Fly Volumes

### Volume Characteristics

**Key Properties:**
- Local NVMe storage on the same physical server as the Machine
- **One-to-one mapping**: 1 volume per 1 machine (not shared)
- **No automatic replication**: Each volume is independent
- **Encryption at rest**: Enabled by default
- **Size limits**: Default 1GB, maximum 500GB

**Important:** Volumes are **local storage**, not network storage. For multi-machine deployments, each machine needs its own volume.

### Volume Configuration

```toml
# fly.toml
[mounts]
  source = "user_workspace"
  destination = "/workspace"
```

```bash
# Create volume via CLI
fly volumes create user_workspace --region iad --size 1

# Or via API
curl -X POST "https://api.machines.dev/v1/apps/my-jarvis/volumes" \
  -H "Authorization: Bearer ${FLY_API_TOKEN}" \
  -d '{
    "name": "user_workspace",
    "region": "iad",
    "size_gb": 1
  }'
```

### Multi-User Storage Strategy

**For Container-Per-User:**
- Each user machine gets its own dedicated volume
- Volume persists across machine restarts
- Files survive deployments and updates
- No cross-user data sharing (complete isolation)

**Backup Strategy:**
- Fly.io takes daily snapshots (retained 5 days by default)
- Can configure 1-60 day retention
- Snapshots are **not** a primary backup method
- Implement application-level backups to S3/R2 for production

---

## 6. Fly.io vs Render Comparison

### Deployment Philosophy

| Feature | Fly.io | Render |
|---------|--------|--------|
| **Approach** | Direct Docker control, CLI-driven | Git-based, abstracted infrastructure |
| **Deployment** | `flyctl deploy` with full control | Git push triggers auto-deploy |
| **Configuration** | fly.toml + Dockerfile | render.yaml + buildpacks |
| **Infrastructure** | VM-level control | Managed services (less control) |

### Container Management

| Feature | Fly.io | Render |
|---------|--------|--------|
| **Dynamic Creation** | ✅ Machines API (programmatic) | ❌ Manual UI/config only |
| **Container Type** | Full VMs (Firecracker) | Docker containers |
| **Per-User Isolation** | ✅ Easy via Machines API | ⚠️ Complex, needs multiple services |
| **Autostop/Start** | ✅ Built-in, subsecond | ❌ Not available |

### Pricing Model

| Feature | Fly.io | Render |
|---------|--------|--------|
| **Billing** | Per-second usage | Monthly fixed price per service |
| **Idle Cost** | $0 CPU/RAM (storage only) | Full price 24/7 |
| **Scaling** | Pay only for active machines | Each instance = full cost |
| **Multi-User Cost** | ~$0.75/user/month | $7-10/user/month |

### Global Infrastructure

| Feature | Fly.io | Render |
|---------|--------|--------|
| **Edge Deployment** | ✅ 35+ regions globally | Limited regions |
| **User Proximity** | Deploy close to users | Fixed datacenter locations |
| **Latency** | <50ms to nearest edge | Varies by region |

### Use Case Fit

**Choose Fly.io if:**
- Need programmatic container creation
- Want container-per-user isolation
- Require full Claude Code capabilities in containers
- Need autostop/autostart cost optimization
- Building multi-tenant SaaS with dynamic scaling

**Choose Render if:**
- Want simple Git-based deploys
- Don't need per-user containers
- Prefer managed services over infrastructure control
- Have single shared application architecture

**Verdict for My Jarvis:** Fly.io is the clear winner for container-per-user architecture with full Claude Code capabilities.

---

## 7. Authentication & Security

### API Token Types

Fly.io uses **macaroons** - scoped tokens with reduced access:

**Token Types:**
1. **Auth Token** (`fly auth token`)
   - Short-lived, all-powerful
   - Full org access
   - Not recommended for API use

2. **Deploy Tokens** (`fly tokens deploy`)
   - App-scoped
   - Can deploy, SSH, and execute commands
   - Recommended for CI/CD

3. **Org-Scoped Tokens** (`fly tokens create org`)
   - Manage all apps in one organization
   - Middle ground between auth and app tokens

4. **Machine Tokens**
   - Execute specific commands on specific machines
   - Narrowest possible access

### Security Features

**Token Security:**
- Unique nonce per macaroon for revocation
- 15-minute expiration for OIDC tokens
- Can revoke by nonce ID

**Machine Isolation:**
- Network-level isolation via network IDs
- Process-level isolation (full VMs)
- Encrypted volumes at rest
- No cross-machine communication by default

**API Authentication:**
```javascript
// All API requests require token in header
fetch('https://api.machines.dev/v1/apps/my-jarvis/machines', {
  headers: {
    'Authorization': `Bearer ${FLY_API_TOKEN}`,
    'Content-Type': 'application/json'
  }
});
```

### Secrets Management

**Per-App Secrets:**
```bash
# Set secret (triggers machine restart)
fly secrets set DATABASE_URL=postgres://...

# Stage secret (no restart, applied on next deploy)
fly secrets set --stage API_KEY=secret123

# Secrets available as environment variables
process.env.DATABASE_URL
```

**Priority:** Secrets override environment variables with same name.

**Filesystem Secrets:**
```toml
# Write secret to file at startup
[[files]]
  guest_path = "/app/.env"
  secret_name = "ENV_FILE"
```

---

## 8. Health Checks & Monitoring

### Health Check Types

**1. Service-Level Checks**
- HTTP checks: `[[services.http_checks]]`
- TCP checks: `[[services.tcp_checks]]`
- Affect traffic routing (proxy stops sending traffic to unhealthy machines)

**2. Top-Level Health Checks**
- Defined in `[checks]` section
- Monitor overall application health
- Do NOT affect traffic routing
- Good for non-public-facing services

**3. Machine Health Checks**
- Run during deployments only
- Execute custom command in ephemeral machine
- Verify app behavior beyond port availability

### Monitoring Machine Status

```bash
# View all machines
fly status --all

# Check specific machine
fly machine status <machine-id>

# Via API
curl "https://api.machines.dev/v1/apps/my-jarvis/machines/{id}" \
  -H "Authorization: Bearer ${FLY_API_TOKEN}"
```

### Example Health Check Configuration

```toml
[[services]]
  protocol = "tcp"
  internal_port = 8080

  [[services.tcp_checks]]
    grace_period = "10s"
    interval = "15s"
    restart_limit = 0
    timeout = "2s"

  [[services.http_checks]]
    interval = 10000
    grace_period = "5s"
    method = "get"
    path = "/health"
    protocol = "http"
    timeout = 2000
```

---

## 9. CI/CD with GitHub Actions

### Automated Deployment Setup

**1. Generate Deploy Token:**
```bash
fly tokens create deploy -x 999999h
```

**2. Add to GitHub Secrets:**
- Go to repo → Settings → Secrets and variables → Actions
- Create `FLY_API_TOKEN` secret with token value

**3. Create Workflow:**

`.github/workflows/fly-deploy.yml`:
```yaml
name: Deploy to Fly.io

on:
  push:
    branches: [main]

jobs:
  deploy:
    name: Deploy app
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: superfly/flyctl-actions/setup-flyctl@master

      - run: flyctl deploy --remote-only
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

### Benefits

- **Automatic deploys** on git push
- **Remote builds** (no local Docker needed)
- **Zero downtime** with rolling deploys
- **Rollback** with `fly releases list` + `fly deploy --image`

---

## 10. Docker Image Management

### Fly.io Private Registry

**Registry URL Pattern:**
```
registry.fly.io/<app-name>:<tag>
```

**Authentication:**
```bash
# Authenticate Docker CLI (expires in 5 minutes)
fly auth docker

# Push image
docker tag my-jarvis:latest registry.fly.io/my-jarvis:latest
docker push registry.fly.io/my-jarvis:latest

# Deploy specific image
fly deploy --image registry.fly.io/my-jarvis:latest
```

**Organization-Scoped Access:**
- Images pushed to `registry.fly.io/app-1` can be used by `app-2`
- Access scoped per organization, not per app
- Useful for sharing base images across user machines

### Deploy Strategy for Per-User Containers

```javascript
// When provisioning new user
const machine = await createMachine({
  app: `user-${userId}`,
  config: {
    // All users share same base image
    image: 'registry.fly.io/my-jarvis-base:latest',
    env: {
      USER_ID: userId,
      WORKSPACE_PATH: `/workspace/${userId}`
    }
  }
});
```

---

## 11. WebSocket Support

### Native WebSocket Support

**Key Features:**
- WebSockets "simply work" on Fly.io
- Automatic TLS handling (wss:// over HTTPS)
- No third-party tools needed
- Global edge infrastructure

**Framework Support:**
- Next.js (App Router & Pages Router)
- Socket.IO
- Python websockets library
- Standard WebSocket API

### Example Configuration

```toml
[[services]]
  protocol = "tcp"
  internal_port = 8080

  [[services.ports]]
    handlers = ["http"]  # WebSocket upgrades work automatically
    port = 80

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443
```

**No special work needed** - WebSocket connections upgrade automatically over HTTP/HTTPS.

---

## 12. Regional Deployment & Latency

### Global Edge Network

**Available Regions:** 35+ datacenters worldwide
- **North America:** iad (Virginia), ord (Chicago), sjc (San Jose), dfw (Dallas), etc.
- **Europe:** ams (Amsterdam), fra (Frankfurt), lhr (London), etc.
- **Asia Pacific:** nrt (Tokyo), sin (Singapore), syd (Sydney), etc.
- **South America:** gru (São Paulo), scl (Santiago)

### Performance Characteristics

**Cold Start:** ~300ms
**Suspend/Resume:** <100ms (memory state preserved)
**Request Routing:** Automatic to nearest region

### Multi-Region Strategy

**For Global Users:**
```bash
# Scale to multiple regions
fly scale count 3 --region iad,fra,nrt
```

**User Proximity:**
- Fly proxy routes to closest region automatically
- Can use `fly-replay` header for write operations to primary region
- Read replicas reduce latency for read-heavy workloads

**Recommended Regions:**
- **Solid bets:** dfw (Dallas), iad (Virginia)
- **High demand** (may have capacity issues): sjc, gru, bom

---

## 13. Implementation Roadmap for My Jarvis

### Phase 1: Infrastructure Setup (Week 1)

**Tasks:**
- [ ] Create Fly.io organization
- [ ] Set up Fly.io CLI and authentication
- [ ] Build My Jarvis Docker image with Claude Code
- [ ] Push image to Fly.io private registry
- [ ] Test single machine deployment

### Phase 2: API Integration (Week 2)

**Tasks:**
- [ ] Install `fly-machines-sdk` in backend
- [ ] Create Machine orchestration service
- [ ] Implement user → machine mapping in database
- [ ] Build machine lifecycle management (create/start/stop/delete)
- [ ] Test programmatic machine creation

### Phase 3: Multi-User Architecture (Week 3)

**Tasks:**
- [ ] Implement per-user machine provisioning on signup
- [ ] Add machine pooling (pre-create for faster assignment)
- [ ] Configure autostop/autostart for cost optimization
- [ ] Set up persistent volumes per user
- [ ] Implement subdomain routing (user123.myjarvis.com)

### Phase 4: Monitoring & Scaling (Week 4)

**Tasks:**
- [ ] Set up health checks for user machines
- [ ] Implement billing/usage tracking per user
- [ ] Configure multi-region deployment
- [ ] Add machine status monitoring dashboard
- [ ] Test autoscale with 50-100 concurrent users

### Phase 5: Production Hardening (Week 5)

**Tasks:**
- [ ] Implement backup strategy for user volumes
- [ ] Set up GitHub Actions CI/CD
- [ ] Configure secrets management
- [ ] Add error monitoring (Sentry)
- [ ] Load testing and optimization

### Phase 6: Launch (Week 6)

**Tasks:**
- [ ] Deploy to production
- [ ] Onboard first 10 beta users
- [ ] Monitor costs and usage
- [ ] Iterate based on feedback
- [ ] Scale to 100+ users

---

## 14. Cost Projections

### Scenario Analysis

**Conservative Scenario (Low Usage):**
- 100 users, avg 2 hours/day usage
- 512MB RAM per user
- 1GB volume per user

```
Monthly Cost: ~$50-75
Cost per user: $0.50-0.75/month
```

**Moderate Scenario (Medium Usage):**
- 100 users, avg 6 hours/day usage
- 1GB RAM per user
- 2GB volume per user

```
Monthly Cost: ~$150-200
Cost per user: $1.50-2.00/month
```

**Heavy Scenario (High Usage):**
- 100 users, avg 12 hours/day usage
- 2GB RAM per user
- 5GB volume per user

```
Monthly Cost: ~$400-500
Cost per user: $4.00-5.00/month
```

**Compare to Render (Always-On):**
- 100 users × $7-10/month = **$700-1,000/month**
- **Fly.io savings: 50-90%** depending on usage patterns

---

## 15. Key Advantages for My Jarvis

### ✅ Preserves Full Claude Code Capabilities

Unlike SDK-only approaches, each user gets:
- Complete Linux environment
- Full bash/terminal access
- Git operations
- All file system operations
- Package managers (npm, pip, apt)
- Build tools and compilers
- All Claude Code MCP tools

### ✅ True User Isolation

- Separate VM per user (not just process isolation)
- Independent filesystems (no cross-user access)
- Network isolation (users can't see each other)
- Resource limits prevent noisy neighbors

### ✅ Cost-Effective at Scale

- Pay only for active compute time
- Autostop when users inactive
- Storage-only costs when idle
- 50-90% cheaper than always-on containers

### ✅ Fast Provisioning

- 300ms cold start from stopped
- <100ms resume from suspended
- Pre-create machine pools for instant assignment
- Subsecond response for user login

### ✅ Simple Architecture

- No need to replicate Claude Code functionality
- Use existing Docker images
- Programmatic API for automation
- Standard Docker workflows

---

## 16. Potential Challenges & Mitigations

### Challenge 1: Machine Startup Latency

**Issue:** First request after idle might see 300ms delay

**Mitigation:**
- Use suspend instead of stop (resume <100ms)
- Pre-warm machines before user login
- Set `min_machines_running = 1` for premium users
- Pool machines for instant assignment

### Challenge 2: Volume Management Complexity

**Issue:** 1:1 volume-machine mapping, no auto-replication

**Mitigation:**
- Implement automated backup to S3/R2
- Daily snapshots for disaster recovery
- Clear user communication about data persistence
- Consider database storage for critical data

### Challenge 3: Cost Monitoring Per User

**Issue:** Per-app billing breakdown not detailed

**Mitigation:**
- Track machine runtime in application database
- Use machine IDs to correlate costs
- Implement usage quotas per user
- Set up alerts for unusual usage patterns

### Challenge 4: Regional Capacity

**Issue:** Some regions (sjc, gru, bom) may have capacity constraints

**Mitigation:**
- Start with solid regions (iad, dfw)
- Implement region selection during signup
- Fallback to secondary regions if primary full
- Monitor capacity issues via Fly.io status

---

## 17. Conclusion & Recommendation

### Fly.io is the Optimal Choice for My Jarvis Desktop Multi-Tenancy

**Core Reasoning:**

1. **Power User Requirements Met**: Fly.io's full VM approach preserves all Claude Code capabilities that power users need - bash access, git operations, file system control, and build tools. This is impossible with SDK-only approaches.

2. **Cost-Effective Scaling**: With autostop/autostart, Fly.io costs 50-90% less than Render's always-on containers while providing better isolation and features.

3. **Programmatic Architecture**: The Machines API enables true container-per-user architecture that can be provisioned dynamically as users sign up.

4. **Production-Ready**: Fly.io provides all necessary features for production deployment: health checks, monitoring, CI/CD integration, secrets management, and global edge infrastructure.

5. **Future-Proof**: Can start with single-region deployment and scale to multi-region as user base grows, with built-in load balancing and routing.

### Next Steps

**Immediate Actions:**
1. Create Fly.io account and explore pricing calculator
2. Build proof-of-concept with 2-3 test machines
3. Measure actual costs with realistic usage patterns
4. Prototype machine provisioning API integration

**Decision Criteria:**
- If POC shows acceptable performance → Proceed with Fly.io
- If costs exceed projections → Optimize autostop settings
- If technical challenges → Evaluate hybrid approach

### Risk Assessment

**Low Risk:**
- Well-documented platform with large community
- Many production examples of similar architectures
- Escape hatch: Can migrate to Render/alternatives if needed
- Starting small: Test with 10-50 users before scaling

**High Reward:**
- Dramatically lower costs at scale
- Better user experience with full Claude Code features
- Scalable architecture for thousands of users
- Competitive advantage over limited SDK-only solutions

---

## 18. Additional Resources

### Official Documentation
- Machines API: https://fly.io/docs/machines/
- Per-User Dev Environments: https://fly.io/docs/blueprints/per-user-dev-environments/
- Pricing Calculator: https://fly.io/calculator
- GitHub Actions CI/CD: https://fly.io/docs/launch/continuous-deployment-with-github-actions/

### Community Resources
- fly-machines-sdk (npm): https://www.npmjs.com/package/fly-machines-sdk
- Fly.io Community Forum: https://community.fly.io/
- Example Multi-Tenant Apps: https://github.com/peter-kuhmann/qwik-multi-tenancy

### Comparison Articles
- Fly.io vs Render: https://northflank.com/blog/flyio-vs-render
- Deploying Containers in 2024: https://alexfranz.com/posts/deploying-container-apps-2024/

---

**Research Completed:** October 14, 2025
**Status:** Ready for Implementation Planning
**Confidence Level:** 9/10 - Comprehensive research supports Fly.io as optimal solution
