# JARVIS Desktop Architecture Scalability Analysis

**Date:** November 24, 2025
**Current Version:** 1.4.43
**Current Scale:** 14 Fly.io apps (12 active tenants + 2 dev/test instances)

## Executive Summary

The current architecture deploys a **complete isolated stack per user** (React frontend + Express backend + Claude Agent SDK + persistent volume), resulting in one Fly.io app per tenant. While this provides excellent isolation and security, it creates significant operational and cost challenges when scaling beyond 10-20 users to thousands of users.

**Key Challenge:** Each new user requires:
- New Fly.io app creation
- DNS routing setup
- Volume provisioning and mounting
- JWT token generation and distribution
- Individual deployment and monitoring

**Recommendation:** Transition to a **hybrid multi-tenant architecture** that maintains security isolation while consolidating shared services.

---

## Current Architecture Analysis

### Stack Overview

```
┌─────────────────────────────────────────────────────┐
│  Fly.io App: my-jarvis-{username}                   │
│  Domain: my-jarvis-{username}.fly.dev               │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────────────────────┐                  │
│  │  React 19 Frontend           │                  │
│  │  - Vite 7 Build              │                  │
│  │  - Tailwind 4                │                  │
│  │  - Served as static files    │                  │
│  └──────────────────────────────┘                  │
│              ↓                                      │
│  ┌──────────────────────────────┐                  │
│  │  Hono Backend Server         │                  │
│  │  - Port 10000                │                  │
│  │  - JWT Authentication        │                  │
│  │  - In-memory sessions        │                  │
│  │  - WebSocket terminal        │                  │
│  └──────────────────────────────┘                  │
│              ↓                                      │
│  ┌──────────────────────────────┐                  │
│  │  Claude Agent SDK            │                  │
│  │  - @anthropic-ai/claude-*    │                  │
│  │  - User workspace isolation  │                  │
│  │  - File operations           │                  │
│  └──────────────────────────────┘                  │
│              ↓                                      │
│  ┌──────────────────────────────┐                  │
│  │  Persistent Volume           │                  │
│  │  Mount: /home/node           │                  │
│  │  - User files                │                  │
│  │  - Claude history            │                  │
│  │  - Configuration             │                  │
│  └──────────────────────────────┘                  │
│                                                     │
│  Resources:                                         │
│  - 2GB RAM                                          │
│  - shared-cpu-1x                                    │
│  - 1 machine per app                                │
└─────────────────────────────────────────────────────┘

  Multiply this × 14 times (one per user)
```

### Key Components

#### Frontend (React 19 + Vite 7)
- **Location:** `/app`
- **Build Output:** `/app/out/renderer/`
- **Deployment:** Static files served by Hono
- **Features:** File preview, terminal, voice messages, Excel viewer, PDF viewer

#### Backend (Hono + Express)
- **Location:** `/app/lib/claude-webui-server/`
- **Entry Point:** `cli/node.ts`
- **Port:** 10000 (HTTP + WebSocket)
- **Auth:** JWT tokens + cookie-based sessions
- **Session Store:** In-memory Map (non-persistent across restarts)

#### Claude Agent SDK
- **Version:** 0.1.42
- **Working Directory:** `/home/node` (mounted volume)
- **Config:** `.claude.json` per user
- **History:** Project-based conversation history

#### Authentication Flow
1. User accesses `my-jarvis-{username}.fly.dev`
2. No session → Redirect to `www.myjarvis.io/login`
3. Login generates JWT with `{ userId, instanceId, flyAppName }`
4. Redirect to `my-jarvis-{username}.fly.dev?token={jwt}`
5. Backend validates JWT, creates session, sets cookie
6. Subsequent requests use session cookie

### Resource Consumption (Per User)

```
Memory:      2GB allocated
CPU:         shared-cpu-1x
Storage:     Persistent volume (3GB default)
Bandwidth:   Fly.io standard
Cost/month:  ~$15-20 per active user
```

**Total for 14 users:** ~$210-280/month in compute costs alone

**Projected for 1,000 users:** ~$15,000-20,000/month 😱

### Operational Challenges

1. **Manual Provisioning**
   - Each new user requires running deployment scripts
   - Fly.io app creation, volume creation, DNS setup
   - No automated onboarding flow

2. **Resource Waste**
   - Frontend assets duplicated 14 times (identical React build)
   - Backend code duplicated 14 times (identical Hono server)
   - 2GB RAM per user (most sits idle)

3. **Deployment Complexity**
   - Code updates require deploying to 14+ separate apps
   - No centralized rollback capability
   - Monitoring and logging fragmented

4. **Session Management**
   - In-memory sessions lost on container restart
   - No shared session state across potential multiple machines

5. **Cost Scaling**
   - Linear cost growth with user base
   - No economies of scale
   - Idle resource costs (users not actively using the app still consume full resources)

---

## Scalability Requirements

### Target Scale
- **Current:** 14 users
- **Near-term:** 100 users
- **Long-term:** 1,000-10,000 users

### Performance Goals
- Sub-second response times for Claude interactions
- 99.9% uptime SLA
- Support for concurrent users (50-100 simultaneous Claude sessions)
- Real-time terminal and file operations

### Security Requirements
- **Critical:** User workspace isolation (files, conversations, terminal access)
- **Critical:** Secure authentication and session management
- **Important:** Rate limiting per user
- **Important:** Audit logging for compliance

---

## Proposed Multi-Tenant Architectures

### Option 1: Shared Service Architecture (Recommended)

**Concept:** Run a single shared backend service that handles multiple users with strict isolation at the application layer.

```
┌──────────────────────────────────────────────────────────┐
│  CDN (Cloudflare / Vercel)                               │
│  - Static React frontend (single build)                  │
│  - Edge caching                                           │
└─────────────────┬────────────────────────────────────────┘
                  ↓
┌──────────────────────────────────────────────────────────┐
│  Load Balancer / API Gateway                              │
│  - Route based on userId from JWT                         │
│  - Rate limiting                                          │
│  - SSL termination                                        │
└─────────────────┬────────────────────────────────────────┘
                  ↓
┌──────────────────────────────────────────────────────────┐
│  Backend Service Cluster (Auto-scaling)                   │
│  - 2-10 Hono servers (based on load)                      │
│  - Horizontal scaling with Fly.io machines                │
│  - Stateless (sessions in Redis)                          │
│                                                            │
│  Each server handles multiple users simultaneously         │
│  User context isolated by userId in requests               │
└─────────────────┬────────────────────────────────────────┘
                  ↓
┌─────────────────┴────────────────────────────────────────┐
│                                                            │
│  ┌─────────────────┐  ┌──────────────────┐               │
│  │  Redis Cluster  │  │  PostgreSQL DB   │               │
│  │  - Sessions     │  │  - User metadata │               │
│  │  - Rate limits  │  │  - Audit logs    │               │
│  │  - Pub/Sub      │  │  - Settings      │               │
│  └─────────────────┘  └──────────────────┘               │
│                                                            │
└─────────────────┬────────────────────────────────────────┘
                  ↓
┌──────────────────────────────────────────────────────────┐
│  User Workspace Storage (Isolated)                        │
│                                                            │
│  Option A: Per-user volumes (current approach)            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ /users/user1 │  │ /users/user2 │  │ /users/user3 │   │
│  │ - files      │  │ - files      │  │ - files      │   │
│  │ - .claude.json│  │ - .claude.json│  │ - .claude.json│   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                            │
│  Option B: S3/Object Storage                               │
│  - Bucket per user or prefix-based isolation              │
│  - Better for distributed architecture                     │
│                                                            │
│  Option C: Hybrid (active users on volume, cold on S3)    │
└────────────────────────────────────────────────────────────┘
```

#### Implementation Details

**Frontend Changes:**
- Deploy React build to CDN (Cloudflare Pages, Vercel, or Fly.io static)
- Single build shared by all users
- Client-side routing handles user-specific state
- WebSocket connections include userId for routing

**Backend Changes:**
- Modify Hono server to support multi-tenancy:
  ```typescript
  // Before: Single user, workspace at /home/node
  const workspace = '/home/node';

  // After: Multi-user, workspace per user
  const workspace = `/home/users/${userId}`;
  ```

- Replace in-memory session store with Redis:
  ```typescript
  // Before: Map in memory
  const sessionStore = new Map();

  // After: Redis-backed
  import { Redis } from 'ioredis';
  const redis = new Redis(process.env.REDIS_URL);
  ```

**User Workspace Isolation:**
- Each user gets isolated directory: `/home/users/${userId}/`
- Claude Agent SDK runs with `--working-directory /home/users/${userId}`
- File operations scoped to user directory
- Strict path validation to prevent traversal attacks

**Authentication Updates:**
- JWT remains but includes `userId` instead of `flyAppName`
- Session stored in Redis with key `session:${sessionId}`
- Cookie-based auth continues to work
- Add API key support for programmatic access

**Scaling Strategy:**
- Start with 2-3 backend machines
- Auto-scale based on CPU/memory (Fly.io autoscaling)
- Each machine can handle 20-50 concurrent users
- For 1,000 users: ~20-30 machines needed (vs 1,000 separate apps)

#### Pros
✅ **Massive cost reduction:** 20-30 machines vs 1,000 separate apps
✅ **Simplified deployments:** Single build/deploy for all users
✅ **Centralized monitoring:** All logs, metrics in one place
✅ **Auto-scaling:** Elastic capacity based on actual load
✅ **Better resource utilization:** Share idle capacity across users
✅ **Persistent sessions:** Redis survives container restarts

#### Cons
❌ **Complexity increase:** Need Redis, PostgreSQL infrastructure
❌ **Security surface:** More critical to prevent cross-user access
❌ **Performance isolation:** Noisy neighbor problem (one user affecting others)
❌ **Migration effort:** Significant code refactoring required

#### Cost Analysis (1,000 users)

**Current Architecture:**
- 1,000 Fly.io apps × $15/month = **$15,000/month**

**Shared Service Architecture:**
- 30 backend machines × $10/month = $300/month
- Redis cluster: $50-100/month
- PostgreSQL: $50-100/month
- CDN: $50-100/month
- Storage (S3 or volumes): $200-500/month
- **Total: ~$650-1,100/month** (93% cost reduction)

---

### Option 2: Kubernetes with Pod-per-User

**Concept:** Use Kubernetes to orchestrate containers, one pod per user, with automatic scaling and lifecycle management.

```
┌─────────────────────────────────────────────────────────┐
│  Kubernetes Cluster (GKE, EKS, or Fly.io K8s)           │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │  Namespace: jarvis-users                        │    │
│  │                                                  │    │
│  │  Pod: user-{userId}-xxxxx                       │    │
│  │  ┌────────────────────────────────────┐         │    │
│  │  │  Container: jarvis-app             │         │    │
│  │  │  - React frontend                  │         │    │
│  │  │  - Hono backend                    │         │    │
│  │  │  - Claude Agent SDK                │         │    │
│  │  │  - Volume: /home/node              │         │    │
│  │  └────────────────────────────────────┘         │    │
│  │                                                  │    │
│  │  Resources:                                      │    │
│  │  - CPU: 200m-1000m (auto-scale)                 │    │
│  │  - Memory: 512Mi-2Gi (auto-scale)               │    │
│  │  - PersistentVolumeClaim per user               │    │
│  │                                                  │    │
│  │  Lifecycle:                                      │    │
│  │  - Auto-start on first request                  │    │
│  │  - Scale to zero after 30 min idle              │    │
│  │  - Health checks + auto-restart                 │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  Ingress Controller (NGINX / Traefik)                   │
│  - Route *.myjarvis.io/{userId} → user pod              │
│  - TLS termination                                       │
│  - Rate limiting                                         │
└─────────────────────────────────────────────────────────┘
```

#### Implementation Details

**Kubernetes Setup:**
- Deploy to managed K8s (GKE, EKS) or Fly.io Kubernetes
- StatefulSet for each user pod (maintains identity)
- PersistentVolumeClaim per user for `/home/node`
- Horizontal Pod Autoscaler for resource scaling

**Pod Template:**
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: user-{userId}
  namespace: jarvis-users
spec:
  containers:
  - name: jarvis-app
    image: myjarvis/desktop:1.4.43
    resources:
      requests:
        memory: "512Mi"
        cpu: "200m"
      limits:
        memory: "2Gi"
        cpu: "1000m"
    volumeMounts:
    - name: user-workspace
      mountPath: /home/node
    env:
    - name: USER_ID
      value: "{userId}"
  volumes:
  - name: user-workspace
    persistentVolumeClaim:
      claimName: user-{userId}-pvc
```

**Ingress Routing:**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: jarvis-ingress
spec:
  rules:
  - host: app.myjarvis.io
    http:
      paths:
      - path: /{userId}
        pathType: Prefix
        backend:
          service:
            name: user-{userId}-service
            port:
              number: 10000
```

**Auto-scaling & Cost Optimization:**
- **Scale to Zero:** Pods terminate after 30 min idle (save cost)
- **On-demand Start:** First request triggers pod creation (15-30 sec startup)
- **Resource Limits:** Prevent one user from consuming all cluster resources
- **Node Autoscaling:** K8s cluster scales nodes based on pod demand

#### Pros
✅ **Industry standard:** Well-established patterns for multi-tenant apps
✅ **Auto-scaling:** Built-in support for scale-to-zero and resource limits
✅ **Portable:** Can run on any cloud (GCP, AWS, Azure, Fly.io)
✅ **Familiar deployment:** Similar isolation to current architecture
✅ **Rich ecosystem:** Monitoring (Prometheus), logging (ELK), tracing (Jaeger)

#### Cons
❌ **K8s complexity:** Learning curve, YAML configuration overhead
❌ **Startup latency:** 15-30 seconds for cold starts (scale-to-zero)
❌ **Cost:** Still requires one pod per user (less efficient than shared service)
❌ **Operational overhead:** Managing K8s cluster, upgrades, security patches

#### Cost Analysis (1,000 users)

**Assumptions:**
- 30% of users active at any time (scale-to-zero for idle users)
- 300 active pods × $5/month = $1,500/month
- K8s control plane: $200-300/month (GKE/EKS)
- Storage (PVC): $300-500/month
- **Total: ~$2,000-2,300/month** (85% cost reduction vs current)

---

### Option 3: Hybrid Architecture (Shared Service + Per-User Containers)

**Concept:** Best of both worlds - shared services for common operations, isolated containers for sensitive workloads.

```
┌────────────────────────────────────────────────────────┐
│  SHARED SERVICES LAYER (Always Running)                │
├────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────┐  ┌─────────────────┐            │
│  │  API Gateway     │  │  Frontend CDN   │            │
│  │  - Auth          │  │  - Static assets│            │
│  │  - Rate limiting │  │  - Edge caching │            │
│  │  - Routing       │  │  - Global CDN   │            │
│  └──────────────────┘  └─────────────────┘            │
│                                                         │
│  ┌──────────────────┐  ┌─────────────────┐            │
│  │  Redis Cluster   │  │  PostgreSQL DB  │            │
│  │  - Sessions      │  │  - User data    │            │
│  │  - Job queue     │  │  - Settings     │            │
│  └──────────────────┘  └─────────────────┘            │
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │  Shared Backend Service (Hono)                  │  │
│  │  - File operations (non-sensitive)              │  │
│  │  - User management                              │  │
│  │  - Chat history retrieval                       │  │
│  │  - Voice generation                             │  │
│  └─────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
                            ↓
                    (Delegates to)
                            ↓
┌────────────────────────────────────────────────────────┐
│  PER-USER CONTAINERS (On-Demand, Auto-Scale)           │
├────────────────────────────────────────────────────────┤
│                                                         │
│  When user starts Claude session:                      │
│  1. Shared service checks if user container running    │
│  2. If not, spawns container in 5-10 seconds          │
│  3. Proxies Claude Agent SDK requests to container     │
│  4. Container scales down after 15 min idle            │
│                                                         │
│  Container Pool:                                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ User A       │  │ User B       │  │ User C       │ │
│  │ Claude SDK   │  │ Claude SDK   │  │ Claude SDK   │ │
│  │ Terminal     │  │ Terminal     │  │ Terminal     │ │
│  │ /workspace/A │  │ /workspace/B │  │ /workspace/C │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                         │
│  Auto-scaling: 0-1,000 containers based on demand      │
└────────────────────────────────────────────────────────┘
```

#### How It Works

**Request Flow:**

1. **Simple Operations** (shared service handles directly):
   - User login/logout
   - Fetching chat history
   - File upload/download (non-executable)
   - Voice message generation
   - UI settings

2. **Claude Agent Operations** (routed to per-user container):
   - Claude SDK interactions (chat, tool execution)
   - Terminal access
   - File editing within workspace
   - Code execution

**Container Lifecycle:**
- **Startup:** On-demand when user starts Claude session
- **Idle Timeout:** 15 minutes of inactivity → graceful shutdown
- **Persistence:** Workspace stored in S3/volume, reattached on next session
- **Limits:** Max 1 container per user (prevent runaway costs)

**Example Implementation:**

```typescript
// Shared backend service (always running)
app.post('/api/chat', requireAuth, async (c) => {
  const userId = c.get('userId');
  const message = await c.req.json();

  // Check if user has running container
  let containerUrl = await getOrCreateUserContainer(userId);

  // Proxy Claude request to user container
  const response = await fetch(`${containerUrl}/claude-sdk/chat`, {
    method: 'POST',
    body: JSON.stringify(message),
    headers: { 'X-User-ID': userId }
  });

  return response;
});

async function getOrCreateUserContainer(userId: string) {
  // Check Redis for active container
  let containerUrl = await redis.get(`container:${userId}`);

  if (!containerUrl) {
    // Spawn new container via Fly.io Machines API
    const machine = await flyMachines.create({
      image: 'myjarvis/user-container:latest',
      env: { USER_ID: userId },
      autoStop: { duration: '15m' }, // Auto-shutdown after 15 min idle
      volumes: [{
        source: `user-${userId}-workspace`,
        destination: '/home/node'
      }]
    });

    containerUrl = machine.privateIP;
    await redis.set(`container:${userId}`, containerUrl, 'EX', 900); // 15 min TTL
  }

  return containerUrl;
}
```

#### Pros
✅ **Cost-effective:** Shared services run 24/7, user containers only when needed
✅ **Security:** Sensitive operations still isolated per user
✅ **Fast common operations:** No container startup for simple requests
✅ **Gradual migration:** Can migrate features incrementally to shared service
✅ **Resource efficiency:** Only pay for active Claude sessions

#### Cons
❌ **Complex architecture:** Two layers to maintain (shared + per-user)
❌ **Latency on cold start:** 5-10 seconds for first Claude request
❌ **State management:** Coordinating between shared service and containers
❌ **Debugging:** Harder to trace requests across layers

#### Cost Analysis (1,000 users)

**Assumptions:**
- 10% of users have active Claude sessions at any time (100 containers)
- 50% of users make simple requests (handled by shared service, no container)

**Costs:**
- Shared backend services (always running): 5 machines × $10 = $50/month
- Redis cluster: $50/month
- PostgreSQL: $50/month
- CDN: $50/month
- Per-user containers: 100 active × $5 = $500/month
- Storage: $300/month
- **Total: ~$1,000/month** (93% cost reduction)

---

## Migration Strategy

### Phase 1: Infrastructure Setup (Weeks 1-2)

**Tasks:**
1. Provision shared infrastructure:
   - Redis cluster (Upstash, Railway, or Fly.io Redis)
   - PostgreSQL database (Supabase, Neon, or Fly.io Postgres)
   - Set up CDN for static assets (Cloudflare Pages)

2. Update authentication system:
   - Migrate JWT payload to remove `flyAppName`, use `userId` only
   - Implement Redis-backed session store
   - Add session migration script for existing users

3. Create database schema:
   ```sql
   CREATE TABLE users (
     id UUID PRIMARY KEY,
     email VARCHAR(255) UNIQUE NOT NULL,
     fly_app_name VARCHAR(100), -- Legacy, can deprecate later
     workspace_path VARCHAR(255),
     created_at TIMESTAMP DEFAULT NOW(),
     last_active_at TIMESTAMP
   );

   CREATE TABLE sessions (
     session_id VARCHAR(64) PRIMARY KEY,
     user_id UUID REFERENCES users(id),
     created_at TIMESTAMP DEFAULT NOW(),
     expires_at TIMESTAMP NOT NULL
   );

   CREATE INDEX idx_sessions_user ON sessions(user_id);
   CREATE INDEX idx_users_email ON users(email);
   ```

**Deliverables:**
- Redis cluster operational
- PostgreSQL schema deployed
- Frontend deployed to CDN
- Migration scripts tested

---

### Phase 2: Backend Multi-Tenancy (Weeks 3-4)

**Tasks:**
1. Refactor backend for multi-user support:
   ```typescript
   // Before: Hardcoded to /home/node
   const WORKSPACE_DIR = '/home/node';

   // After: Dynamic based on userId
   function getUserWorkspace(userId: string): string {
     return `/home/users/${userId}`;
   }
   ```

2. Update Claude Agent SDK integration:
   - Pass `--working-directory` per user
   - Isolate `.claude.json` config per user
   - Add path validation to prevent directory traversal

3. Implement workspace management:
   - Auto-create user workspace on first login
   - Copy template files (CLAUDE.md, guides, tools)
   - Set proper permissions (node user ownership)

4. Add rate limiting (per user):
   ```typescript
   import { Ratelimit } from '@upstash/ratelimit';
   const ratelimit = new Ratelimit({
     redis: redis,
     limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 requests/min per user
   });
   ```

**Deliverables:**
- Multi-tenant backend code merged
- User workspace isolation verified
- Rate limiting functional
- Integration tests passing

---

### Phase 3: Pilot Migration (Week 5)

**Tasks:**
1. Select 2-3 pilot users from existing 14
2. Deploy shared backend to new Fly.io app (e.g., `my-jarvis-shared`)
3. Migrate pilot user data:
   - Copy `/home/node` from individual apps to `/home/users/{userId}` on shared app
   - Update user records in PostgreSQL
   - Generate new JWT tokens pointing to shared service

4. Test pilot users:
   - Login flow
   - Claude interactions
   - Terminal functionality
   - File operations
   - Voice messages

5. Monitor for issues:
   - Error logs
   - Performance metrics (response times)
   - User feedback

**Success Criteria:**
- Pilot users experience no degradation in functionality
- Response times comparable to individual apps (<100ms difference)
- No cross-user data leakage (verified via security audit)

**Rollback Plan:**
- Revert DNS to individual Fly.io apps
- Restore JWT tokens for individual apps
- Pilot users continue on old architecture

---

### Phase 4: Full Migration (Weeks 6-8)

**Tasks:**
1. Migrate remaining users in batches:
   - Week 6: Users 4-8 (5 users)
   - Week 7: Users 9-14 (6 users)
   - Week 8: Final validation and cleanup

2. For each batch:
   - Schedule maintenance window (15 min downtime per user)
   - Export user workspace data
   - Import to shared service
   - Update JWT tokens
   - Test user login
   - Notify user of completion

3. Decommission individual Fly.io apps:
   - Verify no traffic for 7 days
   - Backup volumes to S3 (retention: 90 days)
   - Delete Fly.io app and volume
   - Update DNS records

4. Cost monitoring:
   - Track cost reduction week-over-week
   - Verify shared service auto-scaling working
   - Optimize resource allocation based on usage patterns

**Success Criteria:**
- All 14 users migrated successfully
- 0 data loss incidents
- Cost reduced by 80%+
- User satisfaction maintained (NPS score ≥ current baseline)

---

### Phase 5: Optimization & Scale Testing (Weeks 9-10)

**Tasks:**
1. Performance optimization:
   - Add Redis caching for frequently accessed data
   - Optimize database queries (add indexes)
   - Implement connection pooling for PostgreSQL
   - Enable CDN caching for static assets (1 week TTL)

2. Load testing:
   - Simulate 100 concurrent users
   - Test auto-scaling behavior (verify 10 machines spin up)
   - Stress test Claude SDK under load (10 simultaneous conversations per machine)

3. Monitoring & alerting:
   - Set up Prometheus + Grafana dashboards
   - Configure alerts (CPU >80%, memory >90%, error rate >1%)
   - Add user-facing status page (status.myjarvis.io)

4. Documentation:
   - Update deployment runbooks
   - Document troubleshooting procedures
   - Create disaster recovery plan

**Success Criteria:**
- System handles 100 concurrent users with <2 second p99 latency
- Auto-scaling triggers correctly (scale up at 70% CPU, scale down at 30%)
- Monitoring dashboards operational
- Team trained on new architecture

---

## Security Considerations

### User Workspace Isolation

**Critical Requirements:**
1. **Path Validation:**
   ```typescript
   function validatePath(userPath: string, userId: string): boolean {
     const userWorkspace = `/home/users/${userId}`;
     const resolvedPath = path.resolve(userWorkspace, userPath);

     // Prevent directory traversal
     if (!resolvedPath.startsWith(userWorkspace)) {
       throw new Error('Path traversal attempt detected');
     }

     return true;
   }
   ```

2. **Claude SDK Configuration:**
   - Set `--working-directory /home/users/${userId}` per session
   - Never allow `--working-directory` to be user-controlled
   - Validate `.claude.json` config to prevent escaping workspace

3. **File System Permissions:**
   ```bash
   # Each user workspace should have restricted permissions
   chmod 700 /home/users/${userId}
   chown node:node /home/users/${userId}
   ```

### Authentication & Authorization

1. **JWT Token Security:**
   - Rotate JWT secrets monthly
   - Use short expiration times (15 min for access tokens)
   - Implement refresh token rotation
   - Store refresh tokens hashed in PostgreSQL

2. **Session Management:**
   - Invalidate sessions on password change
   - Implement concurrent session limits (max 3 devices per user)
   - Log all session creation/termination events

3. **API Rate Limiting:**
   ```typescript
   // Per-user rate limits
   const limits = {
     chatRequests: { max: 100, window: '1m' },
     fileUploads: { max: 10, window: '1m' },
     voiceGeneration: { max: 20, window: '1m' }
   };
   ```

### Data Protection

1. **Encryption:**
   - At-rest: Enable encryption for PostgreSQL and Redis
   - In-transit: Enforce TLS 1.3 for all connections
   - User files: Consider encryption at file system level (eCryptfs, LUKS)

2. **Backup & Recovery:**
   - Daily encrypted backups to S3
   - Point-in-time recovery (retain 30 days)
   - Test restoration monthly

3. **Audit Logging:**
   ```typescript
   // Log all sensitive operations
   await auditLog.create({
     userId,
     action: 'FILE_READ',
     resource: filePath,
     ipAddress: clientIP,
     userAgent: req.headers['user-agent'],
     timestamp: new Date()
   });
   ```

### Compliance

- **GDPR:** Implement user data export and deletion
- **SOC 2:** Add audit logging for all data access
- **HIPAA (if applicable):** Enable encryption, access logs, BAA with cloud provider

---

## Cost-Benefit Analysis

### Current Costs (14 Users)

| Item | Cost/Month | Notes |
|------|-----------|-------|
| 14 Fly.io apps | $210-280 | $15-20 per app |
| Volumes (14 × 3GB) | Included | In app cost |
| Bandwidth | ~$20 | Light usage |
| **Total** | **$230-300** | **$16-21 per user** |

**Projected for 1,000 users:** $16,000-21,000/month

---

### Option 1: Shared Service Architecture

| Item | Cost/Month | Notes |
|------|-----------|-------|
| Backend machines (30×) | $300 | Auto-scaling 10-50 machines |
| Redis cluster | $50-100 | Upstash or Fly.io Redis |
| PostgreSQL | $50-100 | Supabase or Fly.io Postgres |
| CDN (static assets) | $50-100 | Cloudflare or Vercel |
| Object storage (S3) | $200-500 | User workspaces |
| Bandwidth | $50-100 | Higher due to more traffic |
| **Total** | **$700-1,200** | **$0.70-1.20 per user** |

**Cost Reduction:** 93-95% vs current per-user cost

**Break-even Point:** ~50 users (shared service becomes cheaper)

---

### Option 2: Kubernetes (Hybrid)

| Item | Cost/Month | Notes |
|------|-----------|-------|
| K8s control plane | $200-300 | GKE/EKS standard tier |
| Worker nodes (10×) | $500-800 | Auto-scaling based on pods |
| Active pods (300×) | $1,500 | 30% of 1,000 users active |
| Persistent volumes | $300-500 | Per-user PVCs |
| Load balancer | $30-50 | Ingress controller |
| Monitoring (Prometheus) | $50-100 | Storage & compute |
| **Total** | **$2,580-3,250** | **$2.58-3.25 per user** |

**Cost Reduction:** 84-86% vs current per-user cost

**Break-even Point:** ~150 users

---

### Option 3: Hybrid Architecture

| Item | Cost/Month | Notes |
|------|-----------|-------|
| Shared services (5×) | $50 | Always-on backend |
| Redis cluster | $50 | Session store |
| PostgreSQL | $50 | User data |
| CDN | $50 | Static assets |
| Active user containers (100×) | $500 | 10% of users with Claude sessions |
| Object storage | $300 | User workspaces |
| **Total** | **$1,000** | **$1.00 per user** |

**Cost Reduction:** 94% vs current per-user cost

**Break-even Point:** ~60 users

---

## Recommendation

### Winner: Hybrid Architecture (Option 3)

**Why:**
1. **Best cost-performance ratio:** 94% cost reduction, $1/user at 1,000 users
2. **Security maintained:** Sensitive operations still isolated per user
3. **Fast for common tasks:** No container startup for 90% of requests
4. **Incremental migration:** Can move features to shared service gradually
5. **Proven technology:** Fly.io Machines API mature, no K8s complexity

### Implementation Timeline

**Week 1-2:** Infrastructure setup (Redis, PostgreSQL, CDN)
**Week 3-4:** Refactor backend for multi-tenancy
**Week 5:** Pilot with 2-3 users
**Week 6-8:** Migrate all users in batches
**Week 9-10:** Optimization and load testing

**Total Duration:** 10 weeks
**Team Size:** 1-2 developers
**Risk Level:** Medium (mitigated by phased rollout)

---

## Next Steps

1. **Immediate Actions:**
   - [ ] Review this analysis with stakeholders
   - [ ] Approve architecture decision (Hybrid recommended)
   - [ ] Allocate budget for infrastructure ($100-200/month initial)

2. **Week 1 Tasks:**
   - [ ] Provision Redis cluster (Upstash recommended)
   - [ ] Provision PostgreSQL database (Supabase recommended)
   - [ ] Set up CDN for static frontend (Cloudflare Pages)
   - [ ] Create database schema and run migrations

3. **Week 2 Tasks:**
   - [ ] Refactor authentication to use Redis sessions
   - [ ] Update JWT tokens to use `userId` instead of `flyAppName`
   - [ ] Deploy frontend to CDN
   - [ ] Create shared backend service skeleton

4. **Week 3-4 Tasks:**
   - [ ] Implement multi-tenant backend (see Phase 2)
   - [ ] Add user workspace isolation
   - [ ] Implement rate limiting per user
   - [ ] Write integration tests

5. **Week 5 Tasks:**
   - [ ] Pilot migration with 2-3 users
   - [ ] Monitor for issues
   - [ ] Gather feedback
   - [ ] Refine migration process

---

## Conclusion

The current one-app-per-user architecture has served well for the initial 14 users but is not sustainable for scaling to 100-1,000+ users. The **Hybrid Architecture** (Option 3) provides the optimal balance of cost reduction (94%), security isolation, and migration risk.

By consolidating shared services while maintaining per-user containers for sensitive Claude operations, JARVIS can scale efficiently to thousands of users at $1/user/month instead of $16/user/month - a transformative cost structure for the business.

The 10-week phased migration plan ensures zero downtime for existing users while gradually transitioning to the new architecture, with rollback options at each phase.

**Recommendation:** Proceed with Hybrid Architecture implementation starting Week 1.

---

**Document Version:** 1.0
**Last Updated:** November 24, 2025
**Author:** JARVIS AI Assistant
**Status:** Ready for Review
