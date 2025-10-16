# Ticket #057: Async Swarm Conversation Pattern

**Status:** 📋 Specification
**Priority:** Medium
**Type:** Feature Enhancement
**Created:** 2025-10-11

---

## 🎯 Objective

Enable background swarm execution while maintaining continuous conversation flow. Allow users to request a feature implementation (2-minute task) and continue talking while the swarm works in the background, with asynchronous notification when complete.

---

## 💡 User Story

**As a user, I want to:**
- Request a feature implementation that takes ~2 minutes
- Continue talking with Claude during execution
- Not see swarm output cluttering our chat
- Get notified when the swarm completes
- Review results and decide next steps

**Current Problem:**
- Claude Code's Task tool blocks main conversation
- User must wait for agents to complete before continuing
- Cannot multi-task during implementation

**Desired Behavior:**
```
User: "Implement feature X"
Claude: "Starting swarm to implement feature X in background. What else would you like to discuss?"
User: "Let's talk about feature Y"
Claude: [Continues conversation about Y]
...
Claude: "Hey! Swarm completed feature X. Let me run the build so we can see how it looks."
```

---

## 🏗️ Technical Approach

### Architecture Pattern

```
┌─────────────────────────────────────────┐
│  Main Conversation (Claude ↔ User)     │
│  - Continuous chat flow                 │
│  - Normal Q&A and discussion            │
│  - Periodic status checks               │
└──────────────┬──────────────────────────┘
               │
               │ Async Coordination
               ↓
┌─────────────────────────────────────────┐
│  Background Swarm Execution             │
│  - MCP task_orchestrate starts work    │
│  - Agents communicate via memory       │
│  - Write results to memory/files       │
│  - No chat output                       │
└─────────────────────────────────────────┘
```

### Key Components

1. **MCP Coordination Layer (Background)**
   - `mcp__claude-flow__swarm_init` - Initialize swarm topology
   - `mcp__claude-flow__task_orchestrate` - Start async task
   - `mcp__claude-flow__memory_usage` - Shared memory for communication

2. **Status Monitoring (Periodic)**
   - `mcp__claude-flow__task_status` - Check task completion
   - `mcp__claude-flow__task_results` - Retrieve results when done
   - `mcp__claude-flow__agent_list` - Monitor agent health

3. **Completion Notification (Proactive)**
   - Claude checks task status periodically (every N messages)
   - Or user asks: "Is the swarm done yet?"
   - Claude retrieves results and presents them

---

## 🔄 Implementation Workflow

### Step 1: Initiate Background Swarm

```typescript
// User requests feature
User: "Implement mobile chat refactoring"

// Claude initiates swarm
[Single Message]:
  mcp__claude-flow__swarm_init({
    topology: "hierarchical",
    maxAgents: 5
  })

  mcp__claude-flow__task_orchestrate({
    task: "Implement mobile chat refactoring with tests",
    strategy: "adaptive",
    priority: "high"
  })

  // Store task ID in memory for tracking
  mcp__claude-flow__memory_usage({
    action: "store",
    key: "async-swarm/current-task",
    value: taskId,
    namespace: "swarm-tracking"
  })

// Claude responds
Claude: "Started swarm to implement mobile chat refactoring in background (Task ID: abc123).
         This should take about 2-3 minutes. What else would you like to discuss?"
```

### Step 2: Continue Conversation

```typescript
// Normal conversation continues
User: "Let's discuss the architecture of feature Y"
Claude: [Discusses feature Y architecture]

User: "What about the database schema?"
Claude: [Discusses database schema]
```

### Step 3: Periodic Status Check

```typescript
// After every 3-5 messages, Claude checks status
[Internal Check]:
  mcp__claude-flow__task_status({
    taskId: "abc123"
  })

  // Returns: { status: "in_progress", progress: 60% }

// Continue conversation if not done
```

### Step 4: Completion Notification

```typescript
// Status check returns complete
[Status Check]:
  mcp__claude-flow__task_status({
    taskId: "abc123"
  })
  // Returns: { status: "completed", duration: "2m 15s" }

// Retrieve results
[Get Results]:
  mcp__claude-flow__task_results({
    taskId: "abc123"
  })

  mcp__claude-flow__memory_usage({
    action: "retrieve",
    key: "swarm/mobile-chat/results",
    namespace: "swarm-tracking"
  })

// Notify user proactively
Claude: "Great news! The swarm completed the mobile chat refactoring.
         They created 3 files and wrote 15 tests. Let me run the build
         to verify everything works."

[Run Build]:
  Bash("npm run build")
```

---

## 🛠️ Required MCP Tools

### Swarm Management
- `mcp__claude-flow__swarm_init` - Initialize background swarm
- `mcp__claude-flow__agent_spawn` - Define agent types
- `mcp__claude-flow__task_orchestrate` - Start async task execution

### Status Monitoring
- `mcp__claude-flow__task_status` - Check completion status
- `mcp__claude-flow__task_results` - Get results when done
- `mcp__claude-flow__agent_metrics` - Monitor agent performance
- `mcp__claude-flow__swarm_status` - Overall swarm health

### Memory Coordination
- `mcp__claude-flow__memory_usage` - Store/retrieve task data
- `mcp__claude-flow__memory_search` - Find relevant results
- `mcp__claude-flow__memory_namespace` - Organize by task

### Optional Monitoring
- `mcp__claude-flow__swarm_monitor` - Real-time swarm updates
- `mcp__claude-flow__performance_report` - Task performance metrics

---

## 📋 Communication Protocol

### Swarm → Memory → Claude

**Agents write to memory:**
```bash
npx claude-flow@alpha hooks post-task --task-id "abc123" --memory-key "swarm/results/abc123"
```

**Claude reads from memory:**
```typescript
mcp__claude-flow__memory_usage({
  action: "retrieve",
  key: "swarm/results/abc123",
  namespace: "default"
})
```

### Output Organization

**Memory Structure:**
```
swarm-tracking/
├── current-task: "abc123"
├── task-abc123-status: "completed"
├── task-abc123-results: {
│   files: ["file1.ts", "file2.ts"],
│   tests: ["test1.spec.ts"],
│   summary: "Refactored mobile chat layout"
│   }
└── task-abc123-metrics: { duration: "2m 15s", agents: 5 }
```

---

## 🎯 Usage Pattern in CLAUDE.md

### New Section to Add

```markdown
## 🔄 Async Swarm Conversation Pattern

### When to Use
- Tasks that take 2-5 minutes
- User wants to continue talking during execution
- Background implementation work
- Parallel feature development

### Pattern

**1. Initiate Background Swarm:**
```typescript
mcp__claude-flow__swarm_init({ topology: "mesh" })
mcp__claude-flow__task_orchestrate({
  task: "feature description",
  strategy: "adaptive"
})
// Store task ID in memory
```

**2. Continue Normal Conversation:**
- No blocking - keep chatting normally
- Swarm works in background
- No swarm output in chat

**3. Periodic Status Check:**
- Check every 3-5 user messages
- Or when user asks: "Is it done yet?"
- Use `mcp__claude-flow__task_status`

**4. Proactive Notification:**
- When status = "completed"
- Retrieve results from memory
- Notify user and present results
- Offer to run build/tests

### Example Usage

```typescript
User: "Implement mobile keyboard fix"
Claude: "Starting background swarm for mobile keyboard fix (2-3 min). What else?"

User: "Let's discuss feature Y"
Claude: [Discusses feature Y]

[3 messages later - internal status check]
// Task still running...

User: "What about the API design?"
Claude: [Discusses API design]

[5 messages later - status check]
// Task completed!

Claude: "Hey! Swarm completed the mobile keyboard fix. They modified 2 files
         and added viewport meta tags. Let me run the build to verify."
```
```

---

## ✅ Success Criteria

- [ ] User can request background task
- [ ] Conversation continues uninterrupted
- [ ] Swarm output doesn't clutter chat
- [ ] Claude checks status periodically
- [ ] User gets proactive notification when done
- [ ] Results are retrievable and actionable
- [ ] Pattern documented in CLAUDE.md

---

## 📊 Benefits

1. **Improved UX** - No waiting, continuous flow
2. **Parallel Work** - Discuss next feature while implementing current one
3. **Better Context** - Swarm results don't interrupt conversation
4. **Efficient Use of Time** - 2-minute tasks don't block 2-minute conversations
5. **Scalable Pattern** - Can run multiple swarms for different features

---

## 🚀 Next Steps

1. **Document Pattern** - Add async swarm section to CLAUDE.md
2. **Test Workflow** - Try with simple feature implementation
3. **Refine Monitoring** - Determine optimal status check frequency
4. **Memory Structure** - Define standard memory namespace conventions
5. **Error Handling** - Handle swarm failures gracefully

---

## 📝 Notes

- This pattern leverages Claude Flow's design for swarm coordination
- MCP tools handle coordination, Claude Code Task tool handles execution
- Memory serves as async message bus between swarm and main conversation
- Similar to how modern CI/CD systems report build status asynchronously

---

**Related Documentation:**
- CLAUDE.md - Section: "Agent Coordination Protocol"
- CLAUDE.md - Section: "MCP Tool Categories"
- Claude Flow documentation - Async task orchestration
