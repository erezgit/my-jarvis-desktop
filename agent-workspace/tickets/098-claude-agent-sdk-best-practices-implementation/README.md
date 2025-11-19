# Ticket #098: Claude Agent SDK Best Practices Implementation

**Status:** 🔄 In Progress
**Priority:** High
**Created:** 2025-11-19

---

## 🎯 Objective

Migrate our current custom tool implementations (voice messages, file operations) from the current "Bash wrapper hack" approach to proper Claude Agent SDK MCP custom tools following Anthropic's official best practices for 2024-2025.

---

## 📋 Current Architecture Analysis

### What We're Currently Doing (Bash Wrapper Hack)

```mermaid
graph LR
    A[Claude Agent SDK] --> B[Built-in Bash Tool]
    B --> C[jarvis_voice.sh script]
    C --> D[Python voice generator]
    D --> E[Success string response]
    E --> F[Frontend cache lookup]
    F --> G[Pattern matching detection]
    G --> H[Manual VoiceMessage creation]
```

**Problems with Current Approach:**
- ❌ 90% reliability due to cache misses
- ❌ Brittle string parsing and pattern matching
- ❌ Not following Claude Agent SDK best practices
- ❌ Complex error handling and debugging
- ❌ Inconsistent behavior across deployments

---

## 🏗️ Anthropic Best Practices (2024-2025)

### Official Claude Agent SDK Architecture

According to Anthropic's documentation, custom tools should be implemented using:

1. **`createSdkMcpServer()`** - Creates in-process MCP server
2. **`tool()` helper function** - Type-safe tool definitions with Zod schemas
3. **Structured JSON responses** - Consistent `content` array format
4. **Type safety** - Full TypeScript integration with runtime validation

### Proper Tool Implementation Pattern

```typescript
import { createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

const customServer = createSdkMcpServer({
  name: "jarvis-tools",
  version: "1.0.0",
  tools: [
    tool(
      "voice_generate",
      "Generate voice message with text-to-speech",
      {
        message: z.string().describe("Text to convert to speech"),
        voice: z.enum(["alloy", "echo", "fable", "onyx", "nova", "shimmer"]).default("nova"),
        speed: z.number().min(0.25).max(4.0).default(1.0)
      },
      async (args) => {
        // Call our existing voice generation core
        const result = await generateVoice({
          text: args.message,
          voice: args.voice,
          speed: args.speed,
          // ... other params
        });

        // Return structured JSON response
        return {
          content: [{
            type: "voice_message",
            data: {
              message: args.message,
              audioPath: result.saved_path,
              voice: args.voice,
              success: result.success,
              timestamp: Date.now()
            }
          }]
        };
      }
    )
  ]
});
```

---

## 🔄 Detailed Migration Plan

### 🏗️ What Stays the Same (Don't Break)

**✅ Core Architecture Components:**
- Backend `chat.ts` handler and `query()` function call
- `allowedTools` configuration system in query options
- `UnifiedMessageProcessor` message handling pipeline
- Frontend message rendering system and component structure
- Session management, streaming, abort controls
- Authentication, file tree, terminal components

**✅ Existing Code to Leverage:**
- Voice generation core logic (`generator.py`, `jarvis_voice.sh`)
- Message conversion functions (`createVoiceMessageFromInput`, etc.)
- Type definitions (`VoiceMessage`, `FileOperationMessage`, etc.)
- Tool cache system and message processing infrastructure
- Error handling and permission management

### 🔧 What We Need to Extend

**1. Backend Extensions:**
```typescript
// Add to chat.ts handler
import { createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";

const jarvisToolsServer = createSdkMcpServer({
  name: "jarvis-tools",
  version: "1.0.0",
  tools: [voiceGenerateTool, fileWriteTool, fileEditTool]
});

// Add to query options
const queryOptions = {
  // ... existing options
  allowedTools: [
    ...chatRequest.allowedTools || [],
    "mcp__jarvis-tools__voice_generate",
    "mcp__jarvis-tools__file_write"
  ]
};
```

**2. UnifiedMessageProcessor Extensions:**
```typescript
// Add new tool result type handlers
if (contentItem.type === "voice_message") {
  const voiceMessage = createVoiceMessageFromStructured(contentItem.data);
  context.addMessage(voiceMessage);
  return; // Skip normal tool_result processing
}

if (contentItem.type === "file_operation") {
  const fileOpMessage = createFileOperationMessage(contentItem.data);
  context.addMessage(fileOpMessage);
  // Continue to create tool_result for completeness
}
```

### 🗑️ What We Need to Remove

**Phase 1 Cleanup (Voice Messages):**
```typescript
// REMOVE from UnifiedMessageProcessor.ts lines 278-316
if (command?.includes('jarvis_voice.sh')) {
  // Parse audio file path from content
  const audioPathMatch = content.match(/Audio generated successfully at: (.+\.mp3)/);
  // ... all this detection logic
}
```

**Phase 2 Cleanup (File Operations):**
```typescript
// REMOVE cache-based file operation detection
if (toolName === "Write" && input.file_path) {
  filePath = input.file_path;
  operation = "created";
  // ... this entire cache lookup system
}
```

**Final Cleanup:**
- Remove `jarvis_voice.sh` script dependency (keep core Python for reuse)
- Remove string pattern matching regex patterns
- Remove cache-based tool detection fallbacks

### 🔄 Phase-by-Phase Implementation

**Phase 1: Voice Message Migration (Week 2)**
1. **Add**: MCP server setup in `chat.ts`
2. **Add**: `voice_generate` tool with structured response
3. **Add**: New message type handler in `UnifiedMessageProcessor`
4. **Test**: Parallel operation with old system
5. **Switch**: Update `allowedTools` to use MCP tool
6. **Remove**: Bash wrapper detection logic

**Phase 2: File Operations Migration (Week 3)**
1. **Add**: File operation MCP tools (`file_write`, `file_edit`, `directory_create`)
2. **Add**: Structured response handlers
3. **Test**: File tree refresh with new structured responses
4. **Switch**: Replace built-in Write/Edit in `allowedTools`
5. **Remove**: Cache-based file operation detection

**Phase 3: Final Cleanup (Week 4)**
1. **Remove**: All cache-based pattern matching code
2. **Remove**: Bash wrapper script dependencies
3. **Test**: End-to-end reliability validation
4. **Optimize**: Performance and error handling improvements

### Phase 2: File Operation Tools Migration

**Tools to Create:**
- `file_write` - Structured file creation
- `file_edit` - Structured file modification
- `directory_create` - Structured directory creation
- `file_delete` - Structured file/directory deletion

**Structured Response Format:**
```typescript
{
  content: [{
    type: "file_operation",
    data: {
      operation: "created" | "modified" | "deleted",
      path: "/absolute/file/path",
      fileName: "filename.ext",
      isDirectory: boolean,
      size: number,
      timestamp: number,
      success: boolean
    }
  }]
}
```

---

## 🎛️ Frontend Integration Changes

### Current Message Processing
```typescript
// Cache-based detection (unreliable)
if (command?.includes('jarvis_voice.sh')) {
  // Parse string content
  const audioPath = content.match(/Audio generated successfully at: (.+\.mp3)/);
  // Manual VoiceMessage creation
}
```

### New Message Processing
```typescript
// Direct structured response handling
if (contentItem.type === "voice_message") {
  const voiceMessage = {
    type: "voice",
    content: contentItem.data.message,
    audioUrl: generateAudioUrl(contentItem.data.audioPath),
    timestamp: contentItem.data.timestamp,
    autoPlay: true
  };
  context.addMessage(voiceMessage);
}
```

---

## 📊 Benefits of Migration

### Reliability Improvements
- ✅ **100% reliability** - No cache misses or pattern matching failures
- ✅ **Structured responses** - Type-safe JSON instead of string parsing
- ✅ **Predictable behavior** - Consistent across all deployments
- ✅ **Better error handling** - Proper error propagation and debugging

### Developer Experience
- ✅ **Type safety** - Full TypeScript integration with Zod validation
- ✅ **Simplified debugging** - Clear tool execution flow
- ✅ **Following standards** - Anthropic official best practices
- ✅ **Future-proof** - Compatible with upcoming SDK versions

### Performance Benefits
- ✅ **Faster execution** - No shell script overhead
- ✅ **Better resource usage** - In-process execution
- ✅ **Improved error recovery** - Graceful failure handling

---

## 🚀 Implementation Timeline

### Week 1: Research & Setup
- [x] Research Claude Agent SDK best practices
- [x] Analyze current architecture
- [x] Create implementation plan
- [ ] Set up MCP server infrastructure

### Week 2: Voice Tool Migration
- [ ] Implement `voice_generate` MCP tool
- [ ] Update frontend message processing
- [ ] Test reliability improvements
- [ ] Deploy and validate

### Week 3: File Operations Migration
- [ ] Implement file operation MCP tools
- [ ] Update file tree refresh logic
- [ ] Test file operation reliability
- [ ] Performance testing

### Week 4: Cleanup & Optimization
- [ ] Remove old Bash wrapper code
- [ ] Update configuration and documentation
- [ ] Final testing and validation
- [ ] Production deployment

---

## 📝 Success Criteria

- [ ] **100% tool reliability** - No more cache miss failures
- [ ] **Structured responses** - All tools return consistent JSON format
- [ ] **Type safety** - Full TypeScript coverage with runtime validation
- [ ] **Performance improvement** - Faster tool execution
- [ ] **Simplified architecture** - Removal of Bash wrapper complexity
- [ ] **Future-ready** - Following Anthropic official standards

---

## 📚 References

- [Claude Agent SDK Custom Tools Documentation](https://docs.claude.com/en/api/agent-sdk/custom-tools)
- [Claude Agent SDK Best Practices 2025](https://skywork.ai/blog/claude-agent-sdk-best-practices-ai-agents-2025/)
- [Building Agents with Claude Agent SDK](https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk)
- [MCP Protocol Specification](https://spec.modelcontextprotocol.io/)

---

*Ticket created to migrate from unreliable Bash wrapper approach to official Claude Agent SDK MCP tools following Anthropic's 2024-2025 best practices.*