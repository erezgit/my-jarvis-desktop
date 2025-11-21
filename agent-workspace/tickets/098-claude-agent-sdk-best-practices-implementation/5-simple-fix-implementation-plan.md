# Simple Fix Implementation Plan: Move MCP Tool from Browser to Server

**Created:** 2025-11-20
**Status:** 🛠️ READY TO IMPLEMENT
**Priority:** CRITICAL

---

## 🎯 **THE SIMPLE PROBLEM**

**Current (Broken):**
```
Browser → MCP Tool (in web context) → require('fs') → ❌ BLOCKED by browser security
```

**Fixed (Working):**
```
Browser → Fly.io Server → MCP Tool (in server context) → require('fs') → ✅ WORKS
```

**Bottom Line:** The MCP tool is running in the browser instead of on the Fly.io server where it needs to be.

---

## 📊 **CURRENT ARCHITECTURE ANALYSIS**

### **What's Working:**
- ✅ Python voice script works perfectly on Fly.io server
- ✅ File creation works: `/home/node/tools/voice/file.mp3`
- ✅ MCP tool implementation follows Anthropic best practices

### **What's Broken:**
- ❌ MCP tool executes in web/browser context
- ❌ Browser security blocks `require('fs')` calls
- ❌ Can't access Fly.io server filesystem from browser

### **Root Cause:**
The MCP server created in `chat.ts` is being executed in the **web server context** instead of the **Claude Code CLI context**.

---

## 🔧 **IMPLEMENTATION PLAN**

### **Phase 1: Understand Current Execution Flow**

**Step 1.1: Map Current Request Flow**
```
User Request → Frontend → chat.ts → Claude Agent SDK → ??? → MCP Tool
```

**Investigation Needed:**
- Where exactly does `chat.ts` execute? (Web server or CLI context?)
- How does Claude Agent SDK spawn the CLI process?
- Why is MCP tool running in browser context instead of CLI context?

**Step 1.2: Verify Execution Contexts**
```bash
# Test where chat.ts actually runs
console.log('Execution context:', process.env.NODE_ENV);
console.log('Working directory:', process.cwd());
console.log('Can access fs:', typeof require('fs').existsSync);
```

### **Phase 2: Fix MCP Tool Execution Context**

**Step 2.1: Option A - Move MCP to Claude Code CLI Context**

**Current:**
```typescript
// chat.ts (runs in web server)
const jarvisToolsServer = createSdkMcpServer({
  name: "jarvis-tools",
  tools: [voice_generate_tool]
});

// Passed to Claude Agent SDK
mcpServers: {
  "jarvis-tools": jarvisToolsServer
}
```

**Fixed Approach:**
```typescript
// chat.ts (web server) - NO MCP creation here
const queryOptions = {
  // Remove MCP server creation from web context
  // Let Claude Code CLI handle MCP servers
  allowedTools: ["mcp__jarvis-tools__voice_generate"]
};
```

**Claude Code CLI handles MCP:**
```json
// .mcp.json (Claude Code CLI reads this)
{
  "mcpServers": {
    "jarvis-tools": {
      "command": "node",
      "args": ["jarvis-mcp-server.js"],
      "env": {
        "OPENAI_API_KEY": "${OPENAI_API_KEY}",
        "WORKSPACE_DIR": "${WORKSPACE_DIR}"
      }
    }
  }
}
```

**Step 2.2: Create Standalone MCP Server**

**Create:** `/tools/mcp/jarvis-mcp-server.js`
```javascript
import { createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";
import { generateVoiceResponse, generateAudioUrl } from "../src/utils/voiceGenerator.js";

// This runs in CLI context with full filesystem access
const server = createSdkMcpServer({
  name: "jarvis-tools",
  tools: [
    tool("voice_generate", "Generate voice message", schema, async (args) => {
      // This now runs in server context where fs works
      const result = await generateVoiceResponse(args);
      return {
        content: [{
          type: "voice_message",
          data: {
            message: args.message,
            audioPath: generateAudioUrl(result.audioPath),
            success: true,
            timestamp: Date.now()
          }
        }]
      };
    })
  ]
});

// Start MCP server
server.start();
```

### **Phase 3: Alternative Approach - API Endpoint**

**Step 3.1: Create Server-Side Voice API**

**If MCP context proves too complex, create direct API:**

```typescript
// Add to your web server routes
app.post('/api/voice-generate', async (req, res) => {
  try {
    const { message, voice, speed } = req.body;

    // This runs in server context - fs works here
    const result = await generateVoiceResponse({
      text: message,
      voice,
      speed
    });

    const audioUrl = generateAudioUrl(result.audioPath);

    res.json({
      success: true,
      audioPath: audioUrl,
      message,
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
```

**Step 3.2: Create MCP Tool that Calls API**

```typescript
// MCP tool becomes a simple API wrapper
const voice_generate_tool = tool("voice_generate", "Generate voice", schema, async (args) => {
  // Call server API instead of direct filesystem operations
  const response = await fetch('/api/voice-generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args)
  });

  const result = await response.json();

  return {
    content: [{
      type: "voice_message",
      data: result
    }]
  };
});
```

---

## 🚀 **STEP-BY-STEP IMPLEMENTATION**

### **Step 1: Debug Current Context (30 minutes)**

```typescript
// Add to chat.ts MCP tool for debugging
console.log('[DEBUG] MCP Tool Execution Context:', {
  platform: process.platform,
  nodeVersion: process.version,
  cwd: process.cwd(),
  env: process.env.NODE_ENV,
  canRequireFS: (() => {
    try {
      require('fs').existsSync;
      return true;
    } catch (e) {
      return e.message;
    }
  })()
});
```

### **Step 2: Implement API Approach (2 hours)**

**2.1: Create Voice API Endpoint**
- Add `/api/voice-generate` route to web server
- Move voice generation logic to server context
- Test endpoint directly via Postman/curl

**2.2: Update MCP Tool to Use API**
- Replace direct filesystem operations with API calls
- Keep MCP architecture but make it web-compatible
- Test MCP tool calls API successfully

**2.3: Deploy and Test**
- Deploy to Fly.io
- Test voice generation through web interface
- Verify files created on server and served correctly

### **Step 3: If API Works, Optimize (1 hour)**

**3.1: Add Error Handling**
- Proper error responses from API
- MCP tool error handling
- Fallback mechanisms

**3.2: Add Logging**
- Track API calls
- Monitor performance
- Debug any remaining issues

---

## 📋 **SUCCESS CRITERIA**

### **Immediate Goals:**
- [ ] Voice generation works through web interface
- [ ] Files created on Fly.io server filesystem
- [ ] Audio files served correctly to frontend
- [ ] No more "Dynamic require of fs" errors

### **Technical Verification:**
- [ ] MCP tool can generate voice messages
- [ ] Python script executes successfully
- [ ] MP3 files created in `/home/node/tools/voice/`
- [ ] Frontend receives and plays audio files

### **Performance Goals:**
- [ ] Voice generation completes in <10 seconds
- [ ] Files properly cached and served
- [ ] No memory leaks or hanging processes

---

## 🔄 **ROLLBACK PLAN**

**If this approach fails:**

1. **Immediate Rollback:** Remove MCP voice tool, re-enable Bash tool
2. **Fallback Option:** Use direct Bash commands to call Python script
3. **Last Resort:** Temporary disable voice features until fixed

**Rollback Commands:**
```typescript
// Quick rollback in chat.ts
allowedTools: [
  "Bash", // Re-enable working Bash tool
  "Read", "Write", "Edit"
  // Remove: "mcp__jarvis-tools__voice_generate"
]
```

---

## 🎯 **IMPLEMENTATION TIMELINE**

**Day 1 (Today):**
- [ ] Debug current execution context
- [ ] Implement API endpoint approach
- [ ] Test and deploy initial fix

**Day 2 (Validation):**
- [ ] Comprehensive testing
- [ ] Performance optimization
- [ ] Documentation update

**Total Estimated Time:** 4-6 hours

---

## 💡 **KEY INSIGHTS**

**The Fix is Simple:**
- Keep MCP architecture (it's correct)
- Move filesystem operations to server context
- Use API calls instead of direct `require('fs')`

**Why This Will Work:**
- ✅ Voice generation already works on server
- ✅ File creation already works on server
- ✅ We just need to bridge web MCP → server operations

**This maintains:**
- ✅ Anthropic MCP best practices
- ✅ Structured response format
- ✅ Production-ready architecture
- ✅ All existing functionality

**Bottom Line:** We're fixing WHERE the tool runs, not HOW it works.