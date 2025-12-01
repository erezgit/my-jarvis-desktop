# Ticket #108: Multi-Agent Orchestration - Isolated Architecture

**Status:** 🟢 READY TO IMPLEMENT
**Priority:** High
**Estimated Time:** 8-12 hours (MVP)
**Created:** 2025-11-24
**Research Date:** November 2025

---

## Executive Summary

Based on lessons learned from ticket #107, we're implementing multi-agent orchestration using a **completely isolated architecture**. Instead of integrating workers into the main my-jarvis-desktop container, we'll create a separate `my-jarvis-workers` application that runs independently and communicates via Fly.io's private network.

**Key Benefits:**
- ✅ Zero risk to main JARVIS agent
- ✅ Independent scaling and deployment
- ✅ Can crash/restart without affecting user experience
- ✅ Clean separation of concerns
- ✅ Simpler debugging and monitoring

---

## What Went Wrong with Ticket #107

### The Problem
Ticket #107 attempted to add multi-agent orchestration directly into my-jarvis-desktop by:
- Adding ~500 lines of orchestration code to the main chat handler
- Integrating subagent tracker with hooks on every tool call
- Loading agent definitions at startup
- Modifying SDK query options with additional complexity

### Why It Failed
- **Complexity in Critical Path**: Every message had to go through orchestration logic
- **Tight Coupling**: Main agent became responsible for worker management
- **Risk Surface**: Any worker issues could impact main agent stability
- **Testing Difficulty**: Hard to test workers without affecting main app

### The Revert
We reverted commit `122c12e3`, removing:
- `.claude/agents/ticket-worker.md` (79 lines)
- `lib/claude-webui-server/utils/subagent-tracker.ts` (293 lines)
- Chat handler modifications (106 lines)
- All orchestration logic

**Result**: Main agent is now stable and simple again.

---

## New Architecture: Isolated Workers App

### High-Level Design

```
┌─────────────────────────────────────────────────────────────┐
│  my-jarvis-desktop (Main App)                               │
│  - Port 8080 (public)                                       │
│  - Main JARVIS orchestrator agent                           │
│  - User chat interface                                      │
│  - Stable, simple, reliable                                 │
│                                                              │
│  Makes HTTP requests to workers app when needed ────────┐   │
└─────────────────────────────────────────────────────────┘   │
                                                               │
                                                               ▼
┌─────────────────────────────────────────────────────────────┐
│  my-jarvis-workers (New App)                                │
│  - Private network only (.flycast domain)                   │
│  - Port 3001 (internal)                                     │
│  - Worker orchestration service                             │
│  - Git worktree management                                  │
│  - Claude Agent SDK for spawning workers                    │
│                                                              │
│  REST API:                                                   │
│    POST   /api/workers/spawn                                │
│    GET    /api/workers/:id/status                           │
│    GET    /api/workers                                      │
│    DELETE /api/workers/:id                                  │
│                                                              │
│  Spawns isolated worker agents ────────────┐                │
└──────────────────────────────────────────┬─────────────────┘
                                            │
                                            ▼
                            ┌───────────────────────────────┐
                            │  Worker Agent 1               │
                            │  - Git worktree: worker-1/    │
                            │  - Branch: feature/ticket-105 │
                            │  - Claude Agent SDK           │
                            │  - Tools: Read, Write, Bash   │
                            └───────────────────────────────┘
```

### Communication Flow

1. **User** → Main JARVIS: "Implement ticket 105"
2. **Main JARVIS** → Workers App (HTTP): `POST /api/workers/spawn`
3. **Workers App** → Spawns isolated agent in git worktree
4. **Main JARVIS** ← Workers App: Returns worker ID
5. **Main JARVIS** → User: "Worker spawned, continuing conversation"
6. **Main JARVIS** polls Workers App: `GET /api/workers/worker-1/status`
7. **Worker completes** → Commits to branch
8. **Workers App** → Main JARVIS: Status update (completed)
9. **Main JARVIS** → User: "Worker completed ticket 105"

---

## Research Findings (November 2025)

### 1. Fly.io Multi-App Deployment

#### Key Insights
- **Private Networking (6PN)**: All Fly apps in an organization are connected by WireGuard IPv6 mesh
- **Flycast**: Private apps use `appname.flycast` domains (HTTP-only, auto-start/stop)
- **Service Discovery**: DNS-based with `.internal` domains (`region.appname.internal`)
- **Zero Configuration**: Private network is always available, no special setup needed

#### Deployment Strategy
```bash
# Workers app deployment
cd my-jarvis-workers
fly launch --flycast --no-deploy  # Create private app
fly deploy                         # Deploy to private network

# Access from main app
curl http://my-jarvis-workers.flycast/api/workers/spawn
```

#### Cost Optimization
- **Autoscale to Zero**: Workers app can scale to 0 when idle (< $1/month)
- **Shared Machine**: Use shared-cpu-1x (256MB) for workers orchestrator
- **On-Demand Workers**: Workers only run when needed

### 2. Claude Agent SDK Production Patterns

#### Official Best Practices
- **Orchestrator-Worker Pattern**: Lead agent routes, workers execute single tasks
- **Specialization**: Each subagent has one job with specific tools
- **Context Management**: Workers return condensed summaries, not full transcripts
- **Error Handling**: Built-in retries with exponential backoff
- **Session Management**: SDK handles persistence and recovery
- **Hooks for Monitoring**: PreToolUse/PostToolUse hooks for comprehensive logging

#### Production Features (Built-in)
- Automatic prompt caching
- Context compaction
- Fine-grained capability controls
- Performance optimizations
- Observability from day one

### 3. Git Worktree Isolation

#### Benefits for AI Agents
- **Complete Isolation**: Each worker has independent file state
- **Parallel Execution**: Multiple workers, zero conflicts
- **Context Preservation**: Workers maintain understanding of their workspace
- **Clean Boundaries**: One worktree per ticket/branch

#### Automation Best Practices
```bash
# Create worktree
git worktree add -b feature/ticket-105 ../worktrees/worker-1 main
cp .env package.json ../worktrees/worker-1/
cd ../worktrees/worker-1 && npm install

# Cleanup worktree
cd ../../my-jarvis-desktop
git merge feature/ticket-105
git worktree remove ../worktrees/worker-1
git branch -d feature/ticket-105
```

#### Cleanup Strategy
- **Automatic Prune**: `git worktree prune` (runs on `gc.worktreePruneExpire`)
- **Manual Removal**: `git worktree remove <path>` (only for clean worktrees)
- **Orphan Detection**: Scan for stale worktrees on startup

### 4. Node.js Microservices Architecture

#### Recommended Stack
- **Framework**: Express.js (simple) or Fastify (fast)
- **Communication**: REST API (initial), WebSocket (future)
- **Queue System**: BullMQ (most modern, TypeScript, Redis-backed)
- **Authentication**: JWT tokens for inter-service communication
- **Rate Limiting**: API Gateway level with Redis-based tracking

#### Security Best Practices
- **Private Network Only**: Workers app has no public routes
- **API Key Authentication**: Shared secret between apps
- **Request Validation**: Zod schemas for all API inputs
- **Timeout Protection**: Request timeouts prevent hung workers
- **Health Checks**: Fly.io TCP/HTTP checks for availability

### 5. Fly.io Production Deployment

#### Health Checks Configuration
```toml
# fly.toml for workers app
[http_service]
  internal_port = 3001
  force_https = false  # Required for Flycast
  auto_stop_machines = "stop"
  auto_start_machines = true
  min_machines_running = 0

[[http_service.checks]]
  grace_period = "10s"
  interval = "30s"
  method = "GET"
  timeout = "5s"
  path = "/health"

[env]
  NODE_ENV = "production"
  PORT = "3001"
```

#### Autoscaling Strategy
- **Initial Setup**: 1 shared-cpu-1x machine
- **Autostop**: Scale to 0 when idle (5 min timeout)
- **Autostart**: Wake on first request (< 2s cold start)
- **Future**: Metrics-based scaling with BullMQ queue depth

---

## Implementation Plan

### Phase 1: Workers App Setup (3 hours)

#### 1.1 Project Structure
```
/home/node/my-jarvis/spaces/my-jarvis-app/projects/my-jarvis-workers/
├── src/
│   ├── index.ts                    # Express server entry point
│   ├── routes/
│   │   └── workers.ts              # Worker API routes
│   ├── services/
│   │   ├── orchestrator.ts         # Claude Agent SDK client
│   │   ├── worktree-manager.ts     # Git worktree lifecycle
│   │   └── worker-tracker.ts       # Worker status tracking
│   ├── agents/
│   │   └── ticket-worker.md        # Worker agent definition
│   └── types/
│       └── index.ts                # TypeScript types
├── package.json
├── tsconfig.json
├── Dockerfile
├── fly.toml
└── .env.example
```

#### 1.2 Core Dependencies
```json
{
  "dependencies": {
    "express": "^5.0.1",
    "zod": "^3.24.1",
    "@anthropic-ai/claude-agent-sdk": "^0.1.42",
    "bullmq": "^6.4.0",
    "redis": "^4.7.0"
  },
  "devDependencies": {
    "@types/express": "^5.0.0",
    "typescript": "^5.7.2",
    "tsx": "^4.21.0"
  }
}
```

#### 1.3 REST API Implementation
```typescript
// src/routes/workers.ts
import { Router } from 'express';
import { z } from 'zod';
import { orchestrator } from '../services/orchestrator';
import { worktreeManager } from '../services/worktree-manager';

const router = Router();

const SpawnWorkerSchema = z.object({
  ticketId: z.string(),
  description: z.string(),
  ticketPath: z.string(),
});

router.post('/spawn', async (req, res) => {
  const { ticketId, description, ticketPath } = SpawnWorkerSchema.parse(req.body);

  // Create isolated git worktree
  const worktreePath = await worktreeManager.create(ticketId);

  // Spawn worker agent
  const workerId = await orchestrator.spawnWorker({
    ticketId,
    description,
    worktreePath,
    ticketPath,
  });

  res.json({ workerId, status: 'spawned', worktreePath });
});

router.get('/:workerId/status', async (req, res) => {
  const status = await orchestrator.getWorkerStatus(req.params.workerId);
  res.json(status);
});

router.get('/', async (req, res) => {
  const workers = await orchestrator.getAllWorkers();
  res.json({ workers });
});

router.delete('/:workerId', async (req, res) => {
  await orchestrator.stopWorker(req.params.workerId);
  await worktreeManager.cleanup(req.params.workerId);
  res.json({ status: 'terminated' });
});

export default router;
```

### Phase 2: Git Worktree Management (2 hours)

#### 2.1 Worktree Manager Implementation
```typescript
// src/services/worktree-manager.ts
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export class WorktreeManager {
  private readonly baseDir = '/home/node/my-jarvis/spaces/my-jarvis-app/projects/my-jarvis-desktop';
  private readonly worktreeDir = path.join(this.baseDir, '../worktrees');

  async create(ticketId: string): Promise<string> {
    const worktreePath = path.join(this.worktreeDir, `worker-${ticketId}`);
    const branchName = `feature/ticket-${ticketId}`;

    // Create worktree with new branch
    await execAsync(`git worktree add -b ${branchName} ${worktreePath} main`, {
      cwd: this.baseDir,
    });

    // Copy essential files
    await execAsync(`cp .env package.json ${worktreePath}/`, {
      cwd: this.baseDir,
    });

    // Install dependencies
    await execAsync('npm install', { cwd: worktreePath });

    return worktreePath;
  }

  async cleanup(ticketId: string, shouldMerge: boolean = false): Promise<void> {
    const worktreePath = path.join(this.worktreeDir, `worker-${ticketId}`);
    const branchName = `feature/ticket-${ticketId}`;

    if (shouldMerge) {
      // Commit any uncommitted changes
      await execAsync(`git add . && git commit -m "Worker ${ticketId} completed"`, {
        cwd: worktreePath,
      }).catch(() => {}); // Ignore if nothing to commit

      // Merge to main
      await execAsync(`git merge ${branchName}`, {
        cwd: this.baseDir,
      });
    }

    // Remove worktree
    await execAsync(`git worktree remove ${worktreePath}`, {
      cwd: this.baseDir,
    });

    // Delete branch
    if (shouldMerge) {
      await execAsync(`git branch -d ${branchName}`, {
        cwd: this.baseDir,
      });
    }
  }

  async listOrphans(): Promise<string[]> {
    // Scan for stale worktrees on startup
    const { stdout } = await execAsync('git worktree list --porcelain', {
      cwd: this.baseDir,
    });

    // Parse and return orphaned worktrees
    // Implementation details...
    return [];
  }
}
```

### Phase 3: Claude Agent SDK Integration (2 hours)

#### 3.1 Orchestrator Service
```typescript
// src/services/orchestrator.ts
import { query, AgentDefinition } from '@anthropic-ai/claude-agent-sdk';
import fs from 'fs';
import path from 'path';

interface WorkerStatus {
  workerId: string;
  ticketId: string;
  status: 'spawned' | 'running' | 'completed' | 'failed';
  currentTask?: string;
  branch: string;
  worktreePath: string;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

export class OrchestratorService {
  private workers: Map<string, WorkerStatus> = new Map();
  private workerCounter = 0;

  async spawnWorker(options: {
    ticketId: string;
    description: string;
    worktreePath: string;
    ticketPath: string;
  }): Promise<string> {
    const workerId = `worker-${++this.workerCounter}`;

    // Register worker
    this.workers.set(workerId, {
      workerId,
      ticketId: options.ticketId,
      status: 'spawned',
      branch: `feature/ticket-${options.ticketId}`,
      worktreePath: options.worktreePath,
      startedAt: new Date(),
    });

    // Load agent definition
    const agentDef = this.loadAgentDefinition('ticket-worker');

    // Spawn worker agent (non-blocking)
    this.executeWorker(workerId, options, agentDef);

    return workerId;
  }

  private async executeWorker(
    workerId: string,
    options: any,
    agentDef: AgentDefinition
  ): Promise<void> {
    try {
      this.updateWorkerStatus(workerId, { status: 'running' });

      // Execute worker agent
      const prompt = `
You are a ticket implementation worker. Your task:

Ticket ID: ${options.ticketId}
Description: ${options.description}
Ticket Path: ${options.ticketPath}
Worktree: ${options.worktreePath}

Read the ticket README, implement all requirements, test your work, and commit to the branch.
      `.trim();

      for await (const message of query({
        prompt,
        options: {
          cwd: options.worktreePath,
          allowedTools: agentDef.tools,
          model: 'haiku',
        },
      })) {
        // Track progress
        this.updateWorkerStatus(workerId, {
          currentTask: message.type === 'thinking' ? message.content : undefined,
        });
      }

      this.updateWorkerStatus(workerId, {
        status: 'completed',
        completedAt: new Date(),
      });
    } catch (error) {
      this.updateWorkerStatus(workerId, {
        status: 'failed',
        error: error.message,
        completedAt: new Date(),
      });
    }
  }

  getWorkerStatus(workerId: string): WorkerStatus | null {
    return this.workers.get(workerId) || null;
  }

  getAllWorkers(): WorkerStatus[] {
    return Array.from(this.workers.values());
  }

  private updateWorkerStatus(workerId: string, updates: Partial<WorkerStatus>): void {
    const current = this.workers.get(workerId);
    if (current) {
      this.workers.set(workerId, { ...current, ...updates });
    }
  }

  private loadAgentDefinition(agentName: string): AgentDefinition {
    const agentPath = path.join(__dirname, '../agents', `${agentName}.md`);
    const content = fs.readFileSync(agentPath, 'utf-8');

    // Parse frontmatter and return AgentDefinition
    // Implementation details...
    return new AgentDefinition({
      description: 'Ticket implementation worker',
      tools: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep', 'TodoWrite'],
      prompt: content,
      model: 'haiku',
    });
  }
}
```

### Phase 4: Main App Integration (2 hours)

#### 4.1 Workers API Client
```typescript
// my-jarvis-desktop/lib/workers-client/index.ts
const WORKERS_API_URL = process.env.WORKERS_API_URL || 'http://my-jarvis-workers.flycast:3001';

export class WorkersClient {
  async spawnWorker(ticketId: string, description: string, ticketPath: string) {
    const response = await fetch(`${WORKERS_API_URL}/api/workers/spawn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticketId, description, ticketPath }),
    });
    return response.json();
  }

  async getWorkerStatus(workerId: string) {
    const response = await fetch(`${WORKERS_API_URL}/api/workers/${workerId}/status`);
    return response.json();
  }

  async getAllWorkers() {
    const response = await fetch(`${WORKERS_API_URL}/api/workers`);
    return response.json();
  }

  async stopWorker(workerId: string) {
    const response = await fetch(`${WORKERS_API_URL}/api/workers/${workerId}`, {
      method: 'DELETE',
    });
    return response.json();
  }
}
```

#### 4.2 JARVIS Tool Integration
```typescript
// my-jarvis-desktop/lib/claude-webui-server/tools/delegate-ticket.ts
import { tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { WorkersClient } from '../../workers-client';

const workersClient = new WorkersClient();

export const delegateTicketTool = tool(
  'delegate_ticket',
  'Delegate a ticket to a worker agent for autonomous implementation',
  {
    ticketId: z.string().describe('Ticket ID (e.g., "105")'),
    description: z.string().describe('Brief description of the ticket'),
    ticketPath: z.string().describe('Path to ticket directory'),
  },
  async (args) => {
    const result = await workersClient.spawnWorker(
      args.ticketId,
      args.description,
      args.ticketPath
    );

    return {
      content: [{
        type: 'text',
        text: `Worker spawned successfully!

Worker ID: ${result.workerId}
Status: ${result.status}
Worktree: ${result.worktreePath}

The worker is now executing the ticket autonomously. You can check its progress with the check_worker_status tool.`,
      }],
    };
  }
);
```

### Phase 5: Deployment & Testing (2 hours)

#### 5.1 Fly.io Deployment
```bash
# Navigate to workers app
cd /home/node/my-jarvis/spaces/my-jarvis-app/projects/my-jarvis-workers

# Initialize Fly app
fly launch --flycast --no-deploy --name my-jarvis-workers

# Set secrets
fly secrets set ANTHROPIC_API_KEY="..." -a my-jarvis-workers

# Deploy
fly deploy -a my-jarvis-workers

# Verify deployment
fly logs -a my-jarvis-workers
fly status -a my-jarvis-workers

# Test from main app
fly ssh console -a my-jarvis-dev
curl http://my-jarvis-workers.flycast:3001/health
```

#### 5.2 Testing Strategy
1. **Unit Tests**: Test worktree manager, orchestrator service
2. **Integration Tests**: Test API endpoints with mock SDK
3. **E2E Test**: Deploy both apps, spawn worker, verify completion
4. **Load Test**: Spawn 3 parallel workers, verify isolation

---

## Success Criteria

### Must Have (MVP)
- [ ] Workers app deployed to Fly.io with Flycast
- [ ] Main app can spawn workers via HTTP API
- [ ] Workers execute in isolated git worktrees
- [ ] Workers commit changes to branches
- [ ] Main app can poll worker status
- [ ] Basic error handling and logging

### Should Have
- [ ] Automatic worktree cleanup on completion
- [ ] Worker failure detection and recovery
- [ ] Health checks for workers app
- [ ] Queue system for pending workers (BullMQ)
- [ ] Rate limiting on spawn API

### Could Have (Future)
- [ ] WebSocket for real-time status updates
- [ ] Dashboard UI for worker monitoring
- [ ] Multiple worker types (code-reviewer, test-writer)
- [ ] Automatic branch merging and deployment
- [ ] Worker resource limits and timeouts

---

## Cost Estimate

### Workers App (Fly.io)
- **Autoscale to Zero**: < $1/month when idle
- **Minimal Usage**: ~$2-5/month (1 shared-cpu-1x)
- **Active Development**: ~$10-15/month (multiple workers)

### Main App Impact
- **No Change**: Same infrastructure, just makes HTTP calls
- **Slight Increase**: Minimal network traffic costs

**Total Additional Cost**: $2-15/month depending on usage

---

## Rollout Plan

### Week 1: MVP Development
- Day 1-2: Workers app setup and structure
- Day 3: Git worktree management
- Day 4: Claude Agent SDK integration
- Day 5: Main app integration and testing

### Week 2: Testing & Refinement
- Day 1-2: End-to-end testing
- Day 3: Bug fixes and improvements
- Day 4: Documentation and examples
- Day 5: Production deployment

### Week 3: Monitoring & Optimization
- Monitor worker performance
- Optimize resource usage
- Implement queue system (BullMQ)
- Add rate limiting

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Worker crashes affecting main app | Low | Low | Complete isolation prevents cascade failures |
| Git worktree conflicts | Medium | Medium | Assign non-overlapping file scopes to workers |
| Network latency (main → workers) | Low | Low | Private network is fast (<10ms), use async patterns |
| Cost overruns from many workers | Medium | Medium | Implement autoscale-to-zero and worker limits |
| Worker hangs indefinitely | Medium | Medium | Implement timeouts and health checks |

---

## References

### Official Documentation
- [Fly.io Private Networking](https://fly.io/docs/networking/private-networking/)
- [Fly.io Flycast](https://fly.io/docs/networking/flycast/)
- [Claude Agent SDK Best Practices](https://skywork.ai/blog/claude-agent-sdk-best-practices-ai-agents-2025/)
- [Building Agents with Claude SDK](https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk)

### Community Resources
- [Git Worktrees for Parallel AI Development](https://stevekinney.com/courses/ai-development/git-worktrees)
- [Node.js Microservices Best Practices 2025](https://colorwhistle.com/nodejs-microservices-best-practices/)
- [BullMQ Documentation](https://bullmq.io/)

---

## Next Steps

1. **Review & Approve**: Review this ticket and approve architecture
2. **Create Project**: Set up my-jarvis-workers project structure
3. **Implement MVP**: Follow Phase 1-5 implementation plan
4. **Test Locally**: Test workers app locally before Fly.io deployment
5. **Deploy**: Deploy to Fly.io and test end-to-end
6. **Iterate**: Add queue system, dashboard, additional worker types

---

**Created by**: JARVIS (Claude Agent)
**Research Date**: November 24, 2025
**Web Searches Conducted**: 20
**Confidence Level**: 9.5/10
