# Voice System Fix - Deployment Complete

**Date:** November 19, 2025
**Status:** ⚠️ PARTIAL FIX - ROOT CAUSE IDENTIFIED
**Commit:** `ce625947` - fix: Resolve voice system failure with environment-agnostic paths

## 🔧 **Fixes Implemented:**

### **1. Environment-Agnostic Path Resolution**
```typescript
// ❌ BEFORE: Hardcoded development paths
const pythonScript = "/Users/erezfern/Workspace/my-jarvis/tools/src/cli/auto_jarvis_voice.py";
const outputDir = "/Users/erezfern/Workspace/my-jarvis/tools/voice";

// ✅ AFTER: Dynamic environment-aware paths
const baseDir = process.env.WORKSPACE_DIR || process.cwd();
const pythonScript = `${baseDir}/tools/src/cli/auto_jarvis_voice.py`;
const outputDir = `${baseDir}/tools/voice`;
```

### **2. Removed Bash Tool Fallback**
```typescript
// ❌ BEFORE: Unreliable dual-path system
allowedTools: [
  ...allowedTools,
  "mcp__jarvis-tools__voice_generate" // Could fall back to Bash
]

// ✅ AFTER: Clean single-path architecture
allowedTools: [
  ...allowedTools.filter(tool => tool !== "Bash"), // No fallback!
  "mcp__jarvis-tools__voice_generate" // Only reliable path
]
```

### **3. Enhanced Error Logging**
```typescript
// Added comprehensive debugging for production issues
logger.chat.error("Voice generation config: {config}", {
  text: args.message,
  voice: args.voice,
  speed: args.speed,
  baseDir: process.env.WORKSPACE_DIR || process.cwd()
});
```

### **4. Production Environment Variables**
```bash
# Set via Fly.io secrets
fly secrets set OPENAI_API_KEY="sk-proj-..." --app my-jarvis-erez
fly secrets set DEPLOYMENT_MODE="web" --app my-jarvis-erez
```

### **5. MCP Response URL Generation**
```typescript
// ✅ FIXED: MCP tool now returns proper URLs instead of file paths
const audioUrl = generateAudioUrl(result.audioPath);
return {
  content: [{
    type: "voice_message",
    data: {
      message: args.message,
      audioPath: audioUrl, // Use URL instead of file path
      // ...
    }
  }]
};
```

### **6. CLAUDE.md Voice Protocol Update**
```markdown
// ❌ BEFORE: Bash code blocks causing tool misidentification
### Voice Protocol
```bash
# MANDATORY - Use for every response
./tools/src/jarvis_voice.sh --voice echo "[your message]"
```

// ✅ AFTER: Proper MCP tool documentation
### Voice Protocol
Use the MCP voice generation tool for all responses:

**Tool:** mcp__jarvis-tools__voice_generate

**Parameters:**
- message: Text to convert to speech (required)
- voice: Voice model - alloy, echo, fable, onyx, nova, shimmer (default: nova)
- speed: Speech speed 0.25-4.0 (default: 1.0)
```

## 🚨 **CRITICAL DISCOVERY: Root Cause Identified**

### **Production Browser Console Analysis**
Console logs from production revealed the **actual root cause**:

```javascript
[SDK_TOOL_USE_DEBUG] contentItem full object: {
  "type": "tool_use",
  "id": "toolu_01Bki971QqV1G9VSQuqrPjL9",
  "name": "Bash",  // ❌ Claude is still using Bash, not MCP tool!
  "input": {
    "command": "python3 /home/node/tools/src/cli/auto_jarvis_voice.py \"Hey there!...\""
  }
}

[SDK_STRUCTURE_DEBUG] toolUseResult: undefined  // ❌ No structured responses
[SDK_STRUCTURE_DEBUG] toolUseResult type: undefined
```

### **What This Means:**
1. **Claude is completely bypassing our MCP architecture**
2. **No `mcp__jarvis-tools__voice_generate` calls are happening**
3. **Claude falls back to bash commands despite our fixes**
4. **Frontend never receives structured voice responses**

## ⚠️ **REMAINING ISSUES**

### **1. MCP Tool Not Being Called**
- Claude Agent SDK is not calling `mcp__jarvis-tools__voice_generate`
- Instead, Claude uses bash to call Python script directly
- This bypasses all our structured response handling

### **2. Possible Root Causes:**
#### **A. MCP Server Registration Issue**
- `jarvis-tools` MCP server may not be properly registered with Claude Agent SDK in production
- MCP server might not be available/discoverable to Claude

#### **B. CLAUDE.md Override Persistence**
- Production CLAUDE.md might still contain bash instructions
- Instructions may not have been properly updated or are being overridden

#### **C. Claude Agent SDK Configuration**
- MCP servers configuration in `chat.ts` might not be working in production
- SDK might not be loading our custom MCP server properly

### **3. Frontend Processing Ready but Unused**
- `UnifiedMessageProcessor` has complete voice_message handling
- Voice UI components are implemented correctly
- But no structured responses ever reach the frontend

## 🔬 **RESEARCH NEEDED FOR NEXT CHAT**

### **Priority 1: MCP Server Discovery**
1. **Verify MCP Server Registration**
   - Check if `jarvis-tools` MCP server is actually loaded
   - Verify `mcpServers: { "jarvis-tools": jarvisToolsServer }` works in production
   - Look for MCP server initialization logs

2. **Debug Claude Agent SDK Tool Discovery**
   - Confirm which tools Claude actually sees available
   - Check if `mcp__jarvis-tools__voice_generate` appears in tool list
   - Investigate why Claude falls back to bash instead

### **Priority 2: CLAUDE.md Verification**
1. **Confirm Production CLAUDE.md Content**
   - SSH into production and verify exact CLAUDE.md content
   - Check if our sed commands actually updated the file correctly
   - Verify no other CLAUDE.md files are overriding instructions

2. **Test Different Instruction Formats**
   - Try explicit tool calling instructions
   - Test if Claude recognizes MCP tool availability

### **Priority 3: Claude Agent SDK Integration**
1. **MCP Server Logging**
   - Add extensive logging to MCP server initialization
   - Log all tool calls received by MCP server
   - Verify if MCP server is even being called

2. **SDK Configuration Debug**
   - Verify `createSdkMcpServer` works in production environment
   - Check if there are SDK version compatibility issues
   - Test MCP server independently

## 📊 **Current Status Summary**

### **✅ Working Components:**
- Voice generation Python script (confirmed in logs)
- Audio file creation in `/home/node/tools/voice/`
- `/api/voice/:filename` HTTP endpoint
- Frontend `voice_message` processing code
- Environment variable configuration

### **❌ Broken Components:**
- **MCP tool discovery/registration**
- **Claude following MCP tool instructions**
- **Structured voice response generation**
- **Voice UI component activation**

### **🎯 Core Issue:**
**The MCP architecture is completely bypassed**. Claude never calls our `voice_generate` tool, so no structured responses are created, meaning the frontend never receives the data needed to show voice messages.

## 🚀 **Next Steps for New Chat**

1. **Focus on MCP server registration debugging**
2. **Add extensive logging to track tool discovery**
3. **Verify production Claude Agent SDK configuration**
4. **Test MCP server functionality independently**
5. **Investigate why Claude prefers bash over MCP tools**

The root cause is now clear: **our MCP architecture isn't being utilized at all in production**. The next investigation should focus on why Claude Agent SDK isn't discovering/calling our custom MCP server.

---

**Next Step:** Create new chat focused on "Claude Agent SDK MCP Server Registration and Tool Discovery Debugging"