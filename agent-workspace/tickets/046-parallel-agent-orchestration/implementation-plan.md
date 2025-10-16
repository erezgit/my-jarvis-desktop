# Ticket #046: Parallel Agent Orchestration for My Jarvis Desktop

**Status**: 🟡 Solution Identified
**Priority**: High
**Created**: 2025-10-04
**Confidence**: 8/10 (Clear implementation path with Claude Agent SDK)

## ✅ SOLUTION: Custom Orchestrator with Claude Agent SDK

After extensive research (10+ searches), the Claude Agent SDK provides all the building blocks we need for parallel, non-blocking agent execution.

### IMPORTANT: No New Services Required

**You do NOT need to run multiple Node services**. Here's what actually happens:

**Option 1 - Child Processes**:
- Your existing backend server (port 8081) spawns temporary child processes
- Like opening new terminal tabs programmatically
- Workers run, complete their task, and terminate
- NOT permanent services, just temporary workers

**Option 2 - In-Process Agents**:
- Even simpler - multiple ClaudeAgentClient instances in your SAME backend
- Run in parallel using async operations
- No new processes at all, just concurrent agent objects

**The Architecture**:
```
Your My Jarvis Desktop Backend (port 8081) - ALWAYS RUNNING
    ├── Main Chat Handler (you talk to me here)
    └── AgentOrchestrator
        ├── Spawns temporary workers when needed
        ├── Workers do their job and disappear
        └── Results sent back via IPC/callbacks
```

You still have **ONE backend server**. That server orchestrates temporary agent instances as needed. No port management, no service complexity, just your main server managing workers.

### How We Can Achieve Our Goal

**Your Requirements**:
1. Keep talking while agents work in background
2. Deploy new Claude instances with initial prompts
3. Give agents access to files
4. Maintain communication between agents

**Implementation Architecture**:

```typescript
// My Jarvis Desktop Backend (lib/claude-webui-server)
import { ClaudeAgentClient } from '@anthropic-ai/claude-agent-sdk';
import { spawn } from 'child_process';

class AgentOrchestrator {
  private agents: Map<string, AgentInstance> = new Map();

  async spawnAgent(prompt: string, workDir: string) {
    // Option 1: In-process agent (faster, shares memory)
    const agent = new ClaudeAgentClient({
      system_prompt: prompt,
      cwd: workDir,
      allowed_tools: ["Read", "Write", "Bash"]
    });

    // Option 2: Subprocess agent (isolated, parallel)
    const agentProcess = spawn('node', ['agent-worker.js'], {
      env: { INITIAL_PROMPT: prompt, WORK_DIR: workDir }
    });

    // Store reference for communication
    this.agents.set(agentId, { agent, process: agentProcess });

    // Non-blocking - returns immediately
    return agentId;
  }

  // Called by your UnifiedMessageProcessor
  async checkAgentStatus(agentId: string) {
    // Returns results without blocking main chat
  }
}
```

### Key Discoveries from Research

1. **Multiple ClaudeSDKClient Instances**: Create separate SDK clients, each is independent
2. **No Built-in Multi-Agent**: SDK doesn't have native multi-agent, but we can build it
3. **Session Forking**: 10-20x faster spawning with session forking (750ms vs 7500ms)
4. **In-Process vs Subprocess**: Can run agents in same process (fast) or subprocess (isolated)
5. **Communication Options**: File-based, WebSocket, IPC, or shared memory

### Proven Examples We Can Adapt

**Claude Code Agent Farm** (runs 50+ agents):
- Uses tmux sessions for isolation
- Central coordination directory
- Lock files to prevent conflicts
- Work queue distribution

**Claude Code by Agents** (multi-agent orchestration):
- HTTP endpoints for each agent
- Orchestrator routes tasks via @mentions
- File-based coordination
- Remote agent support

**Our Simplified Approach**:
- Spawn agents via SDK in Node child processes
- IPC for agent-to-main communication
- WebSocket to frontend for real-time updates
- No file pollution in user projects

### Implementation Steps

1. **Backend Enhancement** (`lib/claude-webui-server`):
   ```typescript
   // Add orchestration endpoint
   app.post('/agents/spawn', async (req, res) => {
     const { prompt, workDir } = req.body;
     const agentId = await orchestrator.spawnAgent(prompt, workDir);
     res.json({ agentId, status: 'running' });
   });

   // WebSocket for real-time updates
   ws.on('connection', (socket) => {
     orchestrator.on('agent-update', (data) => {
       socket.send(JSON.stringify(data));
     });
   });
   ```

2. **Agent Worker Script** (`agent-worker.js`):
   ```javascript
   const { ClaudeAgentClient } = require('@anthropic-ai/claude-agent-sdk');

   const agent = new ClaudeAgentClient({
     system_prompt: process.env.INITIAL_PROMPT,
     cwd: process.env.WORK_DIR
   });

   // Send updates to parent
   process.send({ type: 'status', message: 'Working...' });

   // Execute task
   const results = await agent.query(process.env.INITIAL_PROMPT);
   process.send({ type: 'complete', results });
   ```

3. **Frontend Integration**:
   - Add UI for spawned agents status
   - WebSocket connection for real-time updates
   - Non-blocking - chat continues normally

### Why This Works

✅ **No Blocking**: Agents run in separate processes/threads
✅ **Full File Access**: Each agent has working directory access
✅ **Clean Projects**: No .swarm or contamination
✅ **Scalable**: Run 10+ agents simultaneously
✅ **Communication**: IPC + WebSocket for real-time coordination
✅ **SDK Power**: Leverage Claude Agent SDK capabilities

### Next Actions

1. [ ] Install `@anthropic-ai/claude-agent-sdk` in backend
2. [ ] Create `AgentOrchestrator` class
3. [ ] Implement agent worker script
4. [ ] Add WebSocket support
5. [ ] Test with 3 parallel agents
6. [ ] Add UI for agent monitoring

## ⚠️ UPDATE: Control Room Pattern Won't Work

After analyzing Claude Flow's source code, the "control room" hypothesis is **INVALID**.

### Critical Findings from Code Analysis

**Claude Flow uses `getProjectRoot()`** which:
1. Actively searches UP the directory tree for project markers
2. Looks for: `package.json`, `.git`, existing `.swarm`, or `CLAUDE.md`
3. Creates `.swarm` in the **project root it finds**, not launch location

**GitHub Issue #765 confirms**:
- Agents were creating duplicate `.swarm` folders in subdirectories
- The fix ensures ALL agents find and use the SAME project root
- This makes it WORSE for isolation - guarantees `.swarm` in user's project

**Why Control Room Fails**:
- If launched from `~/jarvis-orchestration/`: Creates `.swarm` there initially
- When operating on user project: Detects project markers, creates ANOTHER `.swarm` in user's project
- Result: File contamination still occurs in user's project directory

### Validated Options After Code Analysis

#### Option 1: Accept Claude Flow's Design
- **Reality**: `.swarm` directory WILL be created in user projects
- **Solution**: Add to `.gitignore`, document for users
- **Pros**: Full swarm capabilities, works as designed
- **Cons**: Visible file pollution users must accept

#### Option 2: Custom Orchestration Layer
- Build our own parallel agent system
- Use Claude Agent SDK directly
- Complete control over file locations
- **Pros**: No contamination, full control
- **Cons**: Significant development effort

#### Option 3: Alternative Tools
- Investigate Claude Code Agentrooms
- Explore container-based isolation
- Consider other orchestration platforms
- **Pros**: May offer better isolation
- **Cons**: Need to evaluate each option

## Problem Statement
Need to implement true parallel, non-blocking agent execution in My Jarvis Desktop. Currently, the Task tool with subagents blocks the main conversation, preventing continuous interaction while agents work in background.

## Research Findings

### Claude Flow Assessment (Score: 3/10)
After thorough documentation review, Claude Flow is **NOT suitable** for our isolation requirements:

1. **Not an MCP Server**: Claude Flow is a CLI tool that extends Claude Code, not a separate service
2. **Intentional File Creation**: Creates `.swarm/` directory with memory.db in project root (by design)
3. **Not Isolated**: Runs alongside Claude Code in the same workspace
4. **MCP Consumer, Not Provider**: Uses 87 MCP tools but doesn't expose MCP endpoints

### Current Limitations
- Task tool subagents block main conversation
- No native non-blocking parallel execution in Claude Code
- Feature Request #3013 still open on GitHub

### Available Options

#### 1. Background Bash Processes (Partial Solution)
- ✅ Non-blocking for processes
- ✅ Already available via `run_in_background: true`
- ❌ Limited to shell commands, not full agents

#### 2. Multiple Terminal Sessions
- ✅ True parallel execution
- ✅ User already has experience with this
- ❌ Manual coordination required
- ❌ No automated orchestration

#### 3. File-Based Coordination (Previous Attempt)
- ✅ Worked to some extent
- ❌ Required continuous polling loops
- ❌ Complex coordination logic

#### 4. Claude Agent SDK Custom Implementation
- ✅ Full control over orchestration
- ✅ Can build true MCP server
- ❌ Significant development effort
- ❌ Requires deep SDK knowledge

## Proposed Solution

### Option A: Enhanced File-Based Coordination
Build on the user's previous file-based approach with improvements:
- Use WebSocket or IPC instead of file polling
- Implement proper message queue (Redis or SQLite)
- Create coordination service in Electron main process

### Option B: Custom MCP Server
Build a lightweight MCP server specifically for My Jarvis Desktop:
- Separate Node.js service for agent orchestration
- Clean MCP protocol implementation
- No file contamination in project
- Manages agent lifecycle and communication

### Option C: Embrace Claude Flow Architecture
Accept the `.swarm/` directory approach:
- Use Claude Flow as designed
- Configure `.gitignore` for swarm files
- Benefit from built-in orchestration features

## Technical Requirements

### For Custom MCP Server (Option B)
1. **Server Component**
   - Express/Hono server on separate port
   - MCP protocol implementation
   - Agent spawn and lifecycle management
   - Message routing and queuing

2. **Integration with My Jarvis Desktop**
   - Modify UnifiedMessageProcessor for orchestration messages
   - Add MCP client to backend server
   - Handle streaming responses from parallel agents

3. **Isolation Requirements**
   - Run in separate directory (e.g., `~/jarvis-orchestrator/`)
   - No file writes to project directory
   - Communication only via API/MCP protocol

## Implementation Steps

### Phase 1: Research & Prototype
- [ ] Investigate Claude Agent SDK orchestration capabilities
- [ ] Prototype simple MCP server
- [ ] Test WebSocket-based coordination

### Phase 2: Architecture Decision
- [ ] Evaluate prototypes
- [ ] Choose approach (A, B, or C)
- [ ] Design detailed architecture

### Phase 3: Implementation
- [ ] Build orchestration service
- [ ] Integrate with My Jarvis Desktop
- [ ] Add UI for parallel task monitoring

### Phase 4: Testing & Optimization
- [ ] Test with multiple parallel agents
- [ ] Optimize message routing
- [ ] Add error recovery

## Success Criteria
- Non-blocking parallel agent execution
- Clean project directory (no contamination)
- Seamless integration with existing chat interface
- Real-time progress updates from parallel agents
- Ability to run 4+ agents simultaneously

## Alternative Approaches to Consider

### 1. **Claude Code Agentrooms**
- Desktop app for multi-agent orchestration
- Uses @mentions for agent routing
- Worth investigating further

### 2. **Git Worktrees Method**
- Multiple Claude sessions on different branches
- Clean separation of work
- Manual but effective

### 3. **Container-Based Isolation**
- Run agents in Docker containers
- Complete filesystem isolation
- Higher complexity but total control

## Next Actions
1. ✅ Document current research findings
2. 🔄 Investigate Claude Agent SDK deeper
3. ⏳ Prototype WebSocket coordination
4. ⏳ Evaluate Claude Code Agentrooms
5. ⏳ Make architecture decision

## Notes
- User has experience with file-based coordination that partially worked
- Strong preference for no file contamination in project
- October 2025: Parallel execution is #1 requested feature for Claude Code
- Current workaround: Multiple terminal sessions

## References
- [Claude Code Feature Request #3013](https://github.com/anthropics/claude-code/issues/3013)
- [Claude Flow Repository](https://github.com/ruvnet/claude-flow)
- [Claude Agent SDK Documentation](https://docs.claude.com/en/api/agent-sdk/overview)

---
*Confidence Level: 3/10 - Initial research complete but solution not yet validated*