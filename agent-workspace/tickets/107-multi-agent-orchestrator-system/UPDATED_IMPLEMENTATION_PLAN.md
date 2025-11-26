# Updated Implementation Plan - November 2025

**Critical Clarification**: We are ALREADY running inside Claude Agent SDK. The goal is to enable the my-jarvis-desktop application to programmatically spawn worker subagents.

---

## Architecture Clarification

### Current State
- **JARVIS (Me)**: Running as a Claude agent via SDK (version 0.1.42)
- **my-jarvis-desktop**: Web application that has SDK installed but doesn't use it yet
- **Goal**: Enable my-jarvis-desktop to become an orchestrator that spawns worker agents

### What We're Building

```
┌─────────────────────────────────────────────────────────────┐
│  JARVIS (Current Claude Agent - SDK v0.1.42)                │
│  - Running in this terminal session                          │
│  - Has access to all SDK capabilities                        │
│  - Will BUILD the orchestrator system                        │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ builds
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  my-jarvis-desktop Application                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Orchestrator Module (NEW - what we're building)    │    │
│  │  - Uses SDK to spawn worker subagents               │    │
│  │  - Tracks worker status via hooks                   │    │
│  │  - Manages git worktrees for isolation              │    │
│  │  - Provides dashboard UI for monitoring             │    │
│  └─────────────────────────────────────────────────────┘    │
│                          │                                    │
│                          │ spawns via SDK                     │
│                          ▼                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Worker Agent │  │ Worker Agent │  │ Worker Agent │      │
│  │   (Ticket A) │  │   (Ticket B) │  │   (Ticket C) │      │
│  │  - Worktree  │  │  - Worktree  │  │  - Worktree  │      │
│  │  - Branch    │  │  - Branch    │  │  - Branch    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases (Updated)

### Phase 1: Core Orchestrator Module (2 hours)

**What**: Create TypeScript modules in my-jarvis-desktop that use the SDK to spawn workers

**Files to Create**:
```
lib/orchestrator/
├── types.ts                    # TypeScript types for agents, sessions, tracking
├── agent-definitions.ts        # AgentDefinition configs for worker types
├── subagent-tracker.ts         # Port Python tracker to TypeScript
├── orchestrator-client.ts      # Main client that spawns workers
└── prompts/
    └── ticket-worker.txt       # System prompt for ticket worker agents
```

**Key Implementation**:
```typescript
// lib/orchestrator/orchestrator-client.ts
import { ClaudeSDKClient, ClaudeAgentOptions, AgentDefinition } from '@anthropic-ai/claude-agent-sdk';
import { workerAgents } from './agent-definitions';
import { SubagentTracker } from './subagent-tracker';

export class OrchestratorClient {
  private tracker: SubagentTracker;

  constructor() {
    this.tracker = new SubagentTracker();
  }

  async spawnWorker(ticketId: string, description: string) {
    const options: ClaudeAgentOptions = {
      systemPrompt: await this.loadWorkerPrompt(),
      allowedTools: ['Task'],
      agents: workerAgents,
      hooks: {
        PreToolUse: [{ matcher: null, hooks: [this.tracker.preToolUse] }],
        PostToolUse: [{ matcher: null, hooks: [this.tracker.postToolUse] }]
      },
      model: 'haiku'
    };

    const client = new ClaudeSDKClient(options);
    await client.query({ prompt: description });

    return client;
  }
}
```

### Phase 2: Git Worktree Integration (1 hour)

**What**: Automate worktree creation/cleanup for worker isolation

**Files to Create**:
```
lib/orchestrator/
└── worktree-manager.ts         # Worktree lifecycle management
```

**Key Implementation**:
```typescript
export class WorktreeManager {
  private baseDir = '/home/node/my-jarvis/spaces/my-jarvis-app/projects/my-jarvis-desktop';
  private worktreeDir = '../worktrees';

  async createWorktree(ticketId: string): Promise<string> {
    const worktreePath = `${this.worktreeDir}/worker-${ticketId}`;
    const branchName = `feature/ticket-${ticketId}`;

    // Execute git worktree commands
    await exec(`git worktree add -b ${branchName} ${worktreePath} main`);
    await exec(`cp .env package.json ${worktreePath}/`);
    await exec(`cd ${worktreePath} && npm install`);

    return worktreePath;
  }

  async cleanupWorktree(ticketId: string, shouldMerge: boolean) {
    // Commit, merge, remove worktree
  }
}
```

### Phase 3: Backend API for Orchestration (1 hour)

**What**: Add Express endpoints to trigger worker spawns and get status

**Files to Create/Modify**:
```
lib/claude-webui-server/src/routes/
└── orchestrator.ts             # New route for orchestrator operations

lib/claude-webui-server/src/index.ts  # Add orchestrator routes
```

**Key Implementation**:
```typescript
// orchestrator.ts
router.post('/api/orchestrator/spawn-worker', async (req, res) => {
  const { ticketId, description } = req.body;

  const worktreePath = await worktreeManager.createWorktree(ticketId);
  const client = await orchestratorClient.spawnWorker(ticketId, description);

  res.json({ workerId: ticketId, status: 'spawned', worktreePath });
});

router.get('/api/orchestrator/status', async (req, res) => {
  const statuses = tracker.getAllStatuses();
  res.json({ agents: statuses });
});
```

### Phase 4: Dashboard UI (1-2 hours)

**What**: React component to display real-time agent status

**Files to Create**:
```
app/components/
└── AgentDashboard.tsx          # Main dashboard component

app/hooks/
└── useAgentStatus.ts           # Hook for polling agent status
```

**Key Implementation**:
```typescript
// AgentDashboard.tsx
export function AgentDashboard() {
  const { agents, isLoading } = useAgentStatus({ pollInterval: 3000 });

  return (
    <div className="agent-dashboard">
      <h2>Multi-Agent Orchestrator</h2>

      <div className="orchestrator-status">
        <AgentCard
          id="main-orchestrator"
          status="active"
          label="JARVIS (Main Orchestrator)"
          activity="Ready to spawn workers"
        />
      </div>

      <div className="workers">
        {agents.map(agent => (
          <AgentCard
            key={agent.id}
            id={agent.id}
            status={agent.status}
            label={agent.label}
            activity={agent.currentTask}
            branch={agent.branch}
            progress={agent.progress}
          />
        ))}
      </div>
    </div>
  );
}
```

### Phase 5: Testing (1 hour)

**Test Scenarios**:
1. Spawn single worker with dummy ticket
2. Verify worktree isolation (check files don't conflict)
3. Monitor status updates in dashboard
4. Test cleanup (merge branch, remove worktree)
5. Spawn 2 parallel workers, verify both execute

---

## Key Differences from Original Plan

### ❌ What We DON'T Need to Do
- Install Claude Agent SDK (already installed at v0.1.42)
- Set up authentication (already handled by SDK)
- Configure base SDK infrastructure (already done)

### ✅ What We DO Need to Do
- **Use** the SDK's `ClaudeSDKClient` class to spawn workers programmatically
- Build orchestrator modules that leverage SDK capabilities
- Integrate with my-jarvis-desktop's existing backend (Express server)
- Create UI components for monitoring
- Automate git worktree management

---

## Next Steps (Immediate)

1. **Create directory structure**: `lib/orchestrator/` with all module files
2. **Port subagent tracker**: Convert Python code to TypeScript
3. **Define worker agents**: Create AgentDefinition configs
4. **Build orchestrator client**: Main class that spawns workers
5. **Test spawn**: Simple test to verify worker creation works

---

**Updated**: November 24, 2025
**Clarified by**: JARVIS (Claude Agent SDK v0.1.42)
**Ready to Implement**: ✅ YES
