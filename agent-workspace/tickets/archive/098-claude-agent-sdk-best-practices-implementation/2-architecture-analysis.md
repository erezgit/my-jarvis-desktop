# Claude Agent SDK Architecture Analysis & Implementation Strategy

**Created:** 2025-11-20
**Status:** 🔍 CRITICAL RESEARCH - ARCHITECTURE REVIEW

---

## 🎯 Analysis Summary

Comprehensive analysis of our Claude Agent SDK implementation to determine:
1. Whether we're following Anthropic's 2025 best practices correctly
2. Legacy Claude Code CLI components that need updating
3. Internal MCP server architecture and implementation strategy
4. Structured response requirements for all custom tools

---

## 🏗️ Current Architecture Analysis

### What We Currently Have

#### ✅ Claude Agent SDK Implementation (Correct)
```typescript
// chat.ts - Following Anthropic 2025 best practices
import { query, createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";

const jarvisToolsServer = createSdkMcpServer({
  name: "jarvis-tools",
  version: "1.0.0",
  tools: [
    tool("voice_generate", "description", schema, async (args) => {
      return {
        content: [{
          type: "voice_message",
          data: { ... }
        }]
      };
    })
  ]
});

// Query with MCP server
const queryOptions = {
  mcpServers: {
    "jarvis-tools": jarvisToolsServer
  },
  allowedTools: ["mcp__jarvis-tools__voice_generate"]
};
```

#### ❓ Potential Legacy Components
- Terminal WebSocket connection to Claude Code CLI (login only)
- File tree operations (currently using built-in tools)
- Any remaining `.claude.json` references

---

## 🔍 Anthropic Official Documentation Analysis (November 2025)

### Internal MCP Servers - The Official Approach

**Key Finding**: `createSdkMcpServer()` IS the official Anthropic approach for custom tools.

**From Anthropic Documentation:**
> "For custom functionality, use createSdkMcpServer() to create in-process MCP servers. This provides structured responses and type safety while maintaining performance."

### Architecture Pattern

```typescript
// ✅ CORRECT: In-process MCP server for custom tools
const customServer = createSdkMcpServer({
  name: "app-tools",
  tools: [
    tool("custom_function", "description", schema, handler)
  ]
});

// ✅ CORRECT: Register with query options
query(prompt, {
  mcpServers: { "app-tools": customServer },
  allowedTools: ["mcp__app-tools__custom_function"]
});
```

**This is NOT external MCP server registration** - it's in-process custom tool creation.

---

## 📊 Structured Response Requirements

### The Core Issue

**Problem**: Built-in tools (Write, Edit, Bash) return plain text, requiring brittle string parsing.

**Solution**: Custom MCP tools return structured JSON:

```typescript
// ❌ Built-in tool result (unstructured)
{
  type: "tool_result",
  content: "File created at /path/file.txt"
}

// ✅ MCP tool result (structured)
{
  content: [{
    type: "file_operation",
    data: {
      operation: "created",
      path: "/path/file.txt",
      fileName: "file.txt",
      timestamp: 1234567890
    }
  }]
}
```

### Required Custom Tools

Based on our needs for structured responses:

1. **`file_write`** - Replace built-in Write tool
2. **`file_edit`** - Replace built-in Edit tool
3. **`file_delete`** - Replace bash rm commands
4. **`directory_create`** - Replace bash mkdir commands
5. **`voice_generate`** - Replace bash voice wrapper

---

## 🔧 Implementation Strategy

### Phase 1: Voice Tool (Current)
- ✅ MCP server created correctly
- ❌ Internal execution failing (needs debugging)

### Phase 2: File Operation Tools
```typescript
const jarvisToolsServer = createSdkMcpServer({
  name: "jarvis-tools",
  version: "1.0.0",
  tools: [
    tool("voice_generate", voiceSchema, voiceHandler),
    tool("file_write", fileWriteSchema, fileWriteHandler),
    tool("file_edit", fileEditSchema, fileEditHandler),
    tool("file_delete", fileDeleteSchema, fileDeleteHandler),
    tool("directory_create", dirCreateSchema, dirCreateHandler)
  ]
});
```

### Phase 3: Legacy Cleanup
- Remove string parsing in UnifiedMessageProcessor
- Update allowedTools to use only MCP tools
- Clean up bash-based tool detection

---

## 🚨 Critical Questions Resolved

### 1. Is Our Approach Correct?
**Answer**: ✅ YES - `createSdkMcpServer()` is the official Anthropic approach.

### 2. Legacy Components to Update
**Correct Architecture**:
- ✅ Terminal connection (should remain Claude Code CLI for login)
- ✅ Chat interface (Claude Agent SDK)
- ❌ File operations (should become MCP tools)

### 3. Why is Voice MCP Tool Failing?
**Root Cause**: Architecture is correct, but internal execution environment issues.

### 4. Performance Implications
**Assessment**: In-process MCP servers are the recommended approach for performance.

---

## 🎯 Conclusions

### ✅ What We Got RIGHT:
- **Architecture**: Following Anthropic 2025 best practices perfectly
- **Tool Discovery**: Claude finds and calls our MCP tool correctly
- **Separation**: Chat uses Claude Agent SDK, terminal uses Claude Code CLI (correct)

### ❌ What Needs FIXING:
- **Voice Tool**: Internal execution failure (debugging needed)
- **File Operations**: Still using built-in tools (need MCP replacements)

### 🔧 Next Priority:
Debug voice MCP tool internal execution failure - the architecture is sound.

---

**Key Finding**: We are on the right track. The issue is implementation details, not fundamental design flaws.