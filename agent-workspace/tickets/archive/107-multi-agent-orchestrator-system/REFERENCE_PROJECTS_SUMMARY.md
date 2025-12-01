# Reference Projects Summary - November 2025

This document summarizes the four reference projects cloned for Ticket #107 implementation guidance.

---

## 1. claude-agent-sdk-demos (Official Anthropic)

**Location**: `reference-projects/claude-agent-sdk-demos/`

### Overview
Official demonstrations from Anthropic showing best practices for Claude Agent SDK usage in production.

### Key Files to Study
- `examples/getting-started/` - Basic agent setup and configuration
- `examples/multi-agent-research/` - Multi-agent coordination patterns
- `examples/spreadsheet-processor/` - Tool integration examples

### Implementation Insights
- **Subagent Spawning**: Use SDK's `query()` method for non-blocking subagent execution
- **Context Management**: Subagents return condensed results, not full context
- **Error Handling**: Timeout and failure patterns for resilient agent systems
- **Tool Access**: How to provision tools to subagents selectively

### Code Patterns to Adopt
```typescript
// Non-blocking subagent spawn pattern from official demos
const result = await sdk.query({
  agent: "worker-agent",
  prompt: taskDescription,
  tools: ["Read", "Write", "Bash"],
  maxTokens: 50000
});
```

---

## 2. ccswarm (Rust Multi-Agent Orchestrator)

**Location**: `reference-projects/ccswarm/`

### Overview
High-performance Rust-based multi-agent orchestrator using Claude Code via Agent Client Protocol (ACP).

### Key Files to Study
- `src/orchestrator.rs` - Main orchestration logic
- `src/agent_pool.rs` - Worker agent management
- `src/communication/` - Channel-based inter-agent communication
- `src/acp/` - Agent Client Protocol implementation

### Implementation Insights
- **Performance**: Zero-cost abstractions for minimal overhead
- **Type Safety**: Type-state pattern ensures valid agent states
- **Communication**: Async channel-based messaging between agents
- **ACP Integration**: Automatic Claude Code connection without manual auth

### Architecture Patterns to Adopt
- Worker pool management with max concurrency limits
- State machine pattern for agent lifecycle (Idle → Assigned → Executing → Complete)
- Channel-based status updates for real-time monitoring
- Graceful shutdown and cleanup on agent completion/failure

---

## 3. git-worktree-runner (CodeRabbit AI)

**Location**: `reference-projects/git-worktree-runner/`

### Overview
Production-ready Bash tooling for managing Git worktrees with AI development workflow integration.

### Key Files to Study
- `gtr` - Main CLI script with worktree management
- `lib/worktree.sh` - Core worktree operations
- `lib/hooks.sh` - Post-creation automation hooks
- `config/` - Configuration templates and examples

### Implementation Insights
- **Worktree Creation**: Automated branch-based worktree setup
- **Configuration**: Copy .env, config files to each worktree
- **Dependencies**: Auto-run npm/pip install in new worktrees
- **Cleanup**: Automatic removal when branches are deleted
- **Editor Integration**: Launch VS Code, Cursor, or AI tools per worktree

### Shell Commands to Adopt
```bash
# Create isolated worktree for worker agent
git worktree add -b feature/ticket-${TICKET_ID} ../worktrees/worker-${WORKER_ID} main

# Copy configuration to worktree
cp .env package.json ../worktrees/worker-${WORKER_ID}/

# Install dependencies in isolation
cd ../worktrees/worker-${WORKER_ID} && npm install

# Cleanup when done
git worktree remove ../worktrees/worker-${WORKER_ID}
```

---

## 4. uzi (Parallel Coding Agents CLI)

**Location**: `reference-projects/uzi/`

### Overview
End-to-end CLI tool for running multiple AI coding agents in parallel with full automation.

### Key Files to Study
- `src/main.rs` - CLI entry point and orchestration
- `src/worktree.rs` - Git worktree management
- `src/agent.rs` - Agent lifecycle and execution
- `src/tmux.rs` - Session management per agent
- `src/server.rs` - Dev server port management

### Implementation Insights
- **Full Automation**: Single command spawns agents with worktrees
- **Tmux Integration**: Each agent runs in isolated tmux session
- **Port Management**: Automatic dev server port allocation
- **Status Monitoring**: Real-time agent status via tmux pane inspection
- **Parallel Execution**: Handles 5+ agents simultaneously

### Workflow Patterns to Adopt
1. Parse ticket/task from user input
2. Create git worktree with unique branch
3. Spawn tmux session for agent
4. Start dev server on unique port (3000 + worker_id)
5. Launch AI agent in tmux with task context
6. Monitor via tmux pane output
7. Cleanup on completion (merge branch, remove worktree, kill session)

### Example Workflow
```bash
# Uzi's full workflow (adapted for our needs)
1. uzi start feature/dark-mode
   → Creates worktree at ../worktrees/worker-1
   → Creates branch feature/dark-mode
   → Spawns tmux session "worker-1"
   → Starts dev server on port 3001
   → Launches Claude agent with task prompt

2. uzi status
   → Shows all running workers with progress

3. uzi complete worker-1
   → Commits changes
   → Merges to main
   → Removes worktree
   → Kills tmux session
```

---

## Key Takeaways for Implementation

### From claude-agent-sdk-demos
- Use official SDK patterns for subagent spawning
- Implement proper timeout and error handling
- Return condensed results from workers

### From ccswarm
- Adopt channel-based communication for status updates
- Implement state machine for agent lifecycle
- Use worker pool pattern with concurrency limits

### From git-worktree-runner
- Automate worktree setup with config/dependency copying
- Implement cleanup hooks for completed workers
- Support multiple worktrees from single repository

### From uzi
- Full end-to-end automation from task → worktree → agent → cleanup
- Tmux integration for isolated agent sessions
- Port management for parallel dev servers
- Real-time monitoring via tmux pane inspection

---

## Implementation Priority

**Phase 1: Core SDK Integration**
- Study: `claude-agent-sdk-demos/examples/multi-agent-research/`
- Implement: Subagent spawning with SDK `query()` method

**Phase 2: Worktree Isolation**
- Study: `git-worktree-runner/lib/worktree.sh`
- Implement: Automated worktree creation/cleanup

**Phase 3: Monitoring System**
- Study: `ccswarm/src/orchestrator.rs` and `uzi/src/agent.rs`
- Implement: Real-time status tracking and dashboard

**Phase 4: Full Automation**
- Study: `uzi/src/main.rs` workflow
- Implement: End-to-end task → execution → merge pipeline

---

**Last Updated**: November 24, 2025
**Reference Projects Cloned**: 4/4 ✅
**Total Reference Code**: ~50,000 lines across all projects
