# Key Implementation Insights - November 2025

**Updated:** November 24, 2025

After analyzing four production reference projects, here are the critical insights for implementing our Multi-Agent Orchestrator System.

---

## 🎯 Core Architecture Decisions

### 1. Claude Agent SDK Pattern (from claude-agent-sdk-demos)

**Key Discovery**: The official SDK uses `AgentDefinition` and async `query()` for spawning subagents.

```python
# Official Pattern from research-agent/agent.py
agents = {
    "researcher": AgentDefinition(
        description="Use this agent when you need to gather research...",
        tools=["WebSearch", "Write"],
        prompt=researcher_prompt,
        model="haiku"
    ),
    "report-writer": AgentDefinition(
        description="Use this agent when you need to create reports...",
        tools=["Skill", "Write", "Glob", "Read"],
        prompt=report_writer_prompt,
        model="haiku"
    )
}

options = ClaudeAgentOptions(
    system_prompt=lead_agent_prompt,
    allowed_tools=["Task"],  # Only Task tool for orchestrator
    agents=agents,
    hooks=hooks,
    model="haiku"
)

# Spawn subagent
await client.query(prompt=user_input)
```

**Critical Insights**:
- Main orchestrator gets ONLY `["Task"]` tool - delegates everything
- Subagents defined with specific tool sets they need
- Hooks (PreToolUse/PostToolUse) track all subagent activities
- Model can be different per agent (orchestrator: sonnet, workers: haiku)

---

### 2. Subagent Tracking System (from subagent_tracker.py)

**Key Discovery**: Production system uses hooks + session tracking for real-time monitoring.

```python
class SubagentTracker:
    def __init__(self):
        # Map: parent_tool_use_id -> SubagentSession
        self.sessions: Dict[str, SubagentSession] = {}

        # Counter for unique IDs (RESEARCHER-1, RESEARCHER-2, etc.)
        self.subagent_counters: Dict[str, int] = defaultdict(int)

    async def pre_tool_use_hook(self, hook_input, tool_use_id, context):
        """Captures every tool call before execution"""
        tool_name = hook_input['tool_name']
        tool_input = hook_input['tool_input']

        # Determine if this is a subagent or main agent
        is_subagent = self._current_parent_id in self.sessions

        if is_subagent:
            session = self.sessions[self._current_parent_id]
            # Log: [RESEARCHER-1] → WebSearch
            self._log_tool_use(session.subagent_id, tool_name, tool_input)
```

**Critical Insights**:
- Hooks fire on EVERY tool use (main agent + all subagents)
- `parent_tool_use_id` associates tool calls with specific subagent
- Real-time logging to console, transcript file, and JSONL for analysis
- Subagent IDs are human-friendly: RESEARCHER-1, WORKER-2, etc.

---

### 3. Git Worktree Automation (from git-worktree-runner)

**Key Discovery**: Production systems automate the entire worktree lifecycle.

```bash
# From git-worktree-runner/lib/worktree.sh

create_worktree() {
    local branch=$1
    local ticket_id=$2
    local worktree_path="../worktrees/worker-${ticket_id}"

    # 1. Create worktree with new branch
    git worktree add -b "$branch" "$worktree_path" main

    # 2. Copy configuration files
    cp .env package.json "$worktree_path/"

    # 3. Install dependencies in isolation
    cd "$worktree_path" && npm install

    # 4. Run post-creation hooks (optional)
    if [ -f .gtr/hooks/post-create ]; then
        bash .gtr/hooks/post-create "$worktree_path"
    fi
}

cleanup_worktree() {
    local worktree_path=$1

    # 1. Commit any changes
    cd "$worktree_path" && git commit -am "Worker completed"

    # 2. Switch back to main worktree
    cd -

    # 3. Merge or rebase
    git merge "$branch"

    # 4. Remove worktree
    git worktree remove "$worktree_path"

    # 5. Delete branch (optional)
    git branch -d "$branch"
}
```

**Critical Insights**:
- Automate EVERYTHING: create → config → install → cleanup
- Each worktree needs its own `node_modules` (isolated deps)
- Post-creation hooks enable custom setup per project
- Cleanup is critical - remove worktree and merge branch

---

### 4. Full Orchestration Workflow (from uzi)

**Key Discovery**: End-to-end automation with tmux sessions and port management.

```go
// From uzi/main.go workflow

func SpawnAgent(taskPrompt string, ticketID int) {
    worktreePath := fmt.Sprintf("../worktrees/worker-%d", ticketID)
    branchName := fmt.Sprintf("feature/ticket-%d", ticketID)
    port := 3000 + ticketID

    // 1. Create git worktree
    exec.Command("git", "worktree", "add", "-b", branchName, worktreePath, "main").Run()

    // 2. Create tmux session for this agent
    sessionName := fmt.Sprintf("worker-%d", ticketID)
    exec.Command("tmux", "new-session", "-d", "-s", sessionName).Run()

    // 3. Start dev server on unique port
    devCommand := fmt.Sprintf("cd %s && npm install && npm run dev -- --port %d", worktreePath, port)
    exec.Command("tmux", "send-keys", "-t", sessionName, devCommand, "Enter").Run()

    // 4. Launch AI agent in same tmux window
    agentCommand := fmt.Sprintf("claude --prompt '%s'", taskPrompt)
    exec.Command("tmux", "split-window", "-t", sessionName).Run()
    exec.Command("tmux", "send-keys", "-t", sessionName, agentCommand, "Enter").Run()
}

func MonitorAgents() {
    // Poll tmux panes for status
    for _, session := range activeSessions {
        output := exec.Command("tmux", "capture-pane", "-t", session, "-p").Output()
        // Parse output to determine agent status
        status := parseAgentStatus(output)
        updateDashboard(session, status)
    }
}
```

**Critical Insights**:
- Tmux sessions = isolated environments per agent
- Dev server port = 3000 + worker_id (predictable, no conflicts)
- Tmux pane capture = real-time status monitoring
- Full automation from spawn → execute → monitor → cleanup

---

## 📋 Implementation Checklist for Our System

### Phase 1: Core SDK Integration (2 hours)

**Files to Create**:
- `lib/orchestrator/agent-definitions.ts` - Define worker agent types
- `lib/orchestrator/orchestrator-client.ts` - Main orchestrator setup
- `lib/orchestrator/subagent-tracker.ts` - Port Python tracker to TypeScript

**Key Code**:
```typescript
// agent-definitions.ts
export const workerAgents = {
  "ticket-worker": {
    description: "Implements a single ticket autonomously in isolated worktree",
    tools: ["Read", "Write", "Edit", "Bash", "Grep", "Glob"],
    prompt: await loadPrompt("ticket-worker-prompt.txt"),
    model: "haiku"
  }
};

// orchestrator-client.ts
export async function spawnWorker(ticketId: string, ticketDescription: string) {
  const options = {
    system_prompt: orchestratorPrompt,
    allowed_tools: ["Task"],
    agents: workerAgents,
    hooks: {
      PreToolUse: [{ matcher: null, hooks: [tracker.preToolUse] }],
      PostToolUse: [{ matcher: null, hooks: [tracker.postToolUse] }]
    },
    model: "sonnet"
  };

  const client = new ClaudeSDKClient(options);
  await client.query({ prompt: ticketDescription });

  return client;
}
```

### Phase 2: Git Worktree Manager (1 hour)

**Files to Create**:
- `lib/orchestrator/worktree-manager.ts` - Worktree lifecycle management

**Key Code**:
```typescript
export class WorktreeManager {
  async createWorktree(ticketId: string): Promise<string> {
    const worktreePath = `../worktrees/worker-${ticketId}`;
    const branchName = `feature/ticket-${ticketId}`;

    // Create worktree
    await exec(`git worktree add -b ${branchName} ${worktreePath} main`);

    // Copy config files
    await exec(`cp .env package.json ${worktreePath}/`);

    // Install dependencies
    await exec(`cd ${worktreePath} && npm install`);

    return worktreePath;
  }

  async cleanupWorktree(ticketId: string, shouldMerge: boolean) {
    const worktreePath = `../worktrees/worker-${ticketId}`;
    const branchName = `feature/ticket-${ticketId}`;

    if (shouldMerge) {
      // Commit changes
      await exec(`cd ${worktreePath} && git commit -am "Completed ticket ${ticketId}"`);

      // Merge to main
      await exec(`git merge ${branchName}`);
    }

    // Remove worktree
    await exec(`git worktree remove ${worktreePath}`);

    // Delete branch
    await exec(`git branch -d ${branchName}`);
  }
}
```

### Phase 3: MCP Monitoring Tool (1 hour)

**Files to Create**:
- `tools/mcp-agent-status/src/index.ts` - MCP tool for agent status
- `lib/orchestrator/agent-status-store.ts` - In-memory status tracking

**Key Code**:
```typescript
// mcp-agent-status/src/index.ts
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "get_agent_status") {
    const statuses = await getAgentStatuses();
    return {
      content: [{
        type: "text",
        text: JSON.stringify(statuses, null, 2)
      }]
    };
  }
});

// agent-status-store.ts
export class AgentStatusStore {
  private agents: Map<string, AgentStatus> = new Map();

  updateStatus(agentId: string, status: AgentStatus) {
    this.agents.set(agentId, {
      ...status,
      lastUpdated: Date.now()
    });
  }

  getAll(): AgentStatus[] {
    return Array.from(this.agents.values());
  }
}
```

### Phase 4: Dashboard UI (1-2 hours)

**Files to Create**:
- `app/components/AgentDashboard.tsx` - React dashboard component
- `app/hooks/useAgentStatus.ts` - Polling hook for status updates

**Key Code**:
```typescript
// AgentDashboard.tsx
export function AgentDashboard() {
  const { agents } = useAgentStatus({ pollInterval: 3000 });

  return (
    <div className="agent-dashboard">
      <h2>Agent Status</h2>

      <div className="orchestrator">
        <AgentCard
          id="main-orchestrator"
          status="active"
          label="Main Orchestrator"
          activity="Conversing with user"
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
            lastCommit={agent.lastCommit}
          />
        ))}
      </div>
    </div>
  );
}
```

### Phase 5: Integration Testing (1 hour)

**Test Scenarios**:
1. Single worker: Spawn worker, execute ticket, verify isolation
2. Parallel workers: Spawn 2 workers, verify no file conflicts
3. Dashboard: Check real-time status updates
4. Cleanup: Verify worktree removal and branch merging
5. Error handling: Test worker failures and timeouts

---

## 🚨 Critical Gotchas (from reference projects)

### 1. Orchestrator Blocking (ccswarm)
**Problem**: If orchestrator waits for worker completion, it blocks conversation.
**Solution**: Use async/non-blocking `query()` and track workers via hooks.

### 2. Git Conflicts (git-worktree-runner)
**Problem**: Workers editing same files causes merge conflicts.
**Solution**: Assign non-overlapping file scopes OR use last-write-wins strategy.

### 3. Context Explosion (claude-agent-sdk-demos)
**Problem**: Subagents return full context, eating main agent's token budget.
**Solution**: Configure workers to return condensed summaries, not full transcripts.

### 4. Worktree Leaks (uzi)
**Problem**: Crashed workers leave orphaned worktrees.
**Solution**: Implement cleanup on startup (scan for stale worktrees, remove them).

### 5. Port Conflicts (uzi)
**Problem**: Multiple dev servers fighting for same port.
**Solution**: Use predictable port assignment (3000 + worker_id).

---

## 📊 Expected Performance (from reference projects)

**ccswarm benchmarks**:
- Spawn subagent: ~500ms
- Context switch overhead: <10ms (Rust channels)
- 3 concurrent agents: Negligible slowdown

**uzi production usage**:
- 5 workers in parallel: Stable
- 10+ workers: Monitor memory (each has node_modules)
- Tmux overhead: Minimal (<1% CPU per session)

**Our estimates**:
- Spawn 1 worker: 1-2 seconds (worktree + npm install)
- Dashboard refresh: 3s polling interval (configurable)
- Max concurrent workers: 2-3 initially, scale to 5+

---

## 🎓 Lessons Learned

### From claude-agent-sdk-demos
- Trust the SDK - `AgentDefinition` + hooks is battle-tested
- Haiku for workers, Sonnet for orchestrator (cost optimization)
- JSONL logging is critical for debugging multi-agent systems

### From ccswarm
- Channel-based communication scales better than polling
- State machines prevent invalid agent transitions
- Rust patterns (type-state, zero-cost abstractions) inspire TypeScript design

### From git-worktree-runner
- Automate EVERYTHING - manual worktree management is error-prone
- Post-creation hooks enable project-specific setup
- Configuration copying (`.env`, `package.json`) is essential

### From uzi
- Tmux is powerful for isolated sessions (consider for future)
- Port management is trivial: BASE_PORT + worker_id
- Real-time monitoring via tmux pane capture is clever but fragile

---

## 🚀 Next Steps

**Immediate (Today)**:
1. Install Claude Agent SDK in my-jarvis-desktop
2. Create `lib/orchestrator/` directory structure
3. Port `subagent_tracker.py` to TypeScript
4. Test single worker spawn with dummy ticket

**Phase 1 (This Week)**:
1. Implement worktree automation
2. Build MCP monitoring tool
3. Create basic dashboard UI
4. End-to-end test with real ticket

**Phase 2 (Next Week)**:
1. Parallel worker testing (2-3 workers)
2. Error handling and recovery
3. Performance optimization
4. Documentation and demo video

---

**Total Estimated Time**: 4-6 hours (matches original estimate!)
**Confidence Level**: 9.5/10 (backed by 4 production projects)
**Ready to Implement**: ✅ **YES**
