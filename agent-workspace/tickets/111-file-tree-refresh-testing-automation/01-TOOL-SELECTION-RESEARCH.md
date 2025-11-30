# Claude Agent SDK Tool Selection Research Findings

## Executive Summary

**Critical Discovery:** Claude's tool selection between Bash (echo) and Write tool is NOT algorithmic or rule-based - it's pure LLM reasoning. This explains why file tree refresh is inconsistent.

---

## How Claude Chooses Tools (November 2024 Research)

### 1. Pure LLM Reasoning, Not Algorithms

**Key Finding:** The tool selection mechanism has **NO algorithmic routing, NO intent classification, NO pattern matching** at the code level.

- Claude doesn't use embeddings, classifiers, or regex to decide which tool to use
- The system formats all available tools into text descriptions in the prompt
- The decision happens inside Claude's forward pass through the transformer
- It's pure language model reasoning - no hardcoded logic

### 2. Why Claude Often Chooses Bash Over Write

**Current Behavior:**
- Sometimes uses: `echo "content" > file.txt` (Bash)
- Sometimes uses: Write tool with structured JSON
- The choice depends on Claude's reasoning about the context

**Reasons for Bash Selection:**
1. **Flexibility** - Bash is described as "general-purpose tool for flexible work"
2. **Composability** - Can chain multiple operations in one command
3. **Efficiency** - For complex operations, one bash command vs multiple tool calls
4. **Context** - When dealing with system operations, Claude leans toward Bash
5. **Training** - Claude has seen millions of examples of `echo >` in training data

### 3. The allowedTools Configuration

**What it does:**
- Controls which tools are AVAILABLE to Claude
- Does NOT prioritize one tool over another
- Does NOT force Claude to use specific tools for specific operations

**Example Configuration:**
```typescript
allowedTools: [
  'Read',     // File reading
  'Write',    // File creation
  'Edit',     // File editing
  'Glob',     // File search
  'Bash',     // System operations
]
```

**Important:** Even with this configuration, if both Bash and Write are allowed, Claude might still choose `echo` over Write based on its reasoning.

### 4. Why This Causes File Tree Refresh Issues

**The Problem Chain:**
1. Claude chooses Bash `echo` for file creation (LLM reasoning)
2. UnifiedMessageProcessor.ts only detects Write/Edit tools reliably
3. Bash operations aren't properly detected for FileOperationMessages
4. No FileOperationMessage = No tree refresh trigger
5. User sees stale file tree

**Current Detection Logic:**
```typescript
// UnifiedMessageProcessor.ts
if (toolName === "Write") → ✅ Detected, tree refreshes
if (toolName === "Edit") → ✅ Detected, tree refreshes
if (toolName === "Bash" && echo command) → ❌ NOT detected
```

---

## Potential Solutions

### Option 1: Remove Bash for File Operations (Risky)
```typescript
allowedTools: ['Read', 'Write', 'Edit', 'Glob']
// No Bash = Claude forced to use Write
```
**Problem:** Claude needs Bash for mkdir, mv, rm, and other operations

### Option 2: Enhanced Detection (Recommended)
Improve UnifiedMessageProcessor to detect Bash file operations:
```typescript
// Detect echo redirections
if (toolName === "Bash" && input.command.match(/echo.*>/)) {
  operation = "created"
}
// Detect mkdir
if (toolName === "Bash" && input.command.match(/mkdir/)) {
  operation = "created"
  isDirectory = true
}
```

### Option 3: Custom Tool Descriptions (Experimental)
Modify tool descriptions to guide Claude's reasoning:
```typescript
tools: {
  Write: {
    description: "PREFERRED method for creating files. Use this instead of echo for file creation."
  },
  Bash: {
    description: "System operations only. Do NOT use for file creation - use Write tool instead."
  }
}
```

### Option 4: Hybrid Approach (Best)
1. Keep all tools available for flexibility
2. Enhance detection for Bash operations
3. Add guidance in CLAUDE.md about tool preferences
4. Monitor and log tool selection patterns

---

## Key Insights for Implementation

### What Won't Work
- ❌ Expecting allowedTools alone to fix the problem
- ❌ Trying to force algorithmic tool selection (goes against SDK design)
- ❌ Removing Bash entirely (breaks other functionality)

### What Will Work
- ✅ Improving detection of Bash file operations in MessageProcessor
- ✅ Adding pattern matching for common Bash file commands
- ✅ Creating FileOperationMessages for ALL file operations, regardless of tool
- ✅ Potentially using MCP tools for file operations (structured responses)

### Why MCP Might Be Better
MCP (Model Context Protocol) tools provide:
- Structured JSON responses for ALL operations
- Guaranteed detection of file operations
- Consistent behavior across all file operations
- Better integration with UI updates

---

## Recommendations for Ticket 111 Implementation

1. **Immediate Fix:** Add Bash command detection patterns to UnifiedMessageProcessor
2. **Test Cases:** Ensure all test cases cover both Write AND echo operations
3. **Long-term:** Consider MCP-based file operations for guaranteed structure
4. **Documentation:** Update CLAUDE.md to guide tool selection preferences
5. **Monitoring:** Log which tool Claude chooses for file operations to understand patterns

---

## References

- Anthropic's official documentation (November 2024)
- Claude Agent SDK GitHub repository
- "Building agents with the Claude Agent SDK" - Anthropic Engineering
- "Claude Agent Skills: A First Principles Deep Dive"
- Direct testing observations from My Jarvis Desktop

---

**Research Completed:** 2024-11-28
**Researcher:** Claude (Orchestrator Agent)
**Purpose:** Support ticket 111 implementation with understanding of root cause