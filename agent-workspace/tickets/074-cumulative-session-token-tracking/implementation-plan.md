# Ticket 074: Cumulative Session Token Tracking - Implementation Plan

**Created**: 2025-11-01
**Status**: Ready for Implementation
**Priority**: High

## Problem Statement

The current token tracking shows **per-turn tokens** from result messages, not the **cumulative session total**. We need to display the true total tokens used across the entire conversation session to accurately show context window usage.

## Solution Approach

Parse the JSONL files that Claude Code SDK automatically writes to `~/.claude/projects/-workspace/` directory. Each session has a JSONL file containing all messages with token usage data. Sum all tokens from assistant messages to get the true cumulative total.

## Verified Working Proof of Concept

✅ **Tested successfully** - Python script parsed current session JSONL file:
- Session ID: `02128b30-f05a-42f3-9d6e-29f7ad03f680`
- Messages: 152 assistant messages
- **Cumulative Total: 33,806 tokens** (28,543 input + 5,263 output)

## Architecture: Leverage Existing Flow

### Current Architecture (What We Already Have)

1. **Backend** (`lib/claude-webui-server/handlers/chat.ts`):
   - Streams SDK messages from Claude Code
   - Yields NDJSON responses to frontend

2. **Frontend Message Processing** (`app/utils/UnifiedMessageProcessor.ts`):
   - `processResultMessage()` (line 580-632) handles result messages
   - Line 621: Calls `context.onTokenUpdate(totalTokens)`
   - Currently extracts tokens from `modelUsage` field (per-turn only)

3. **Token Context** (`app/contexts/TokenUsageContext.tsx`):
   - `updateTokenUsage()` - ADDS tokens (incremental)
   - `setTokenUsage()` - SETS absolute total (what we need)

4. **ChatPage** (`app/components/ChatPage.tsx`):
   - Line 43: Gets `updateTokenUsage` from hook
   - Line 253: Passes it as `onTokenUpdate` callback
   - Currently using WRONG function (adds instead of sets)

5. **Progress Bar** (`app/components/TokenContextBar.tsx`):
   - Displays `tokenData` from context
   - Updates automatically when context changes

### What We Need to Change

#### Backend: New API Endpoint

**File**: `lib/claude-webui-server/handlers/session-tokens.ts` (NEW)

```typescript
import { Context } from "hono";
import * as fs from "fs";
import * as path from "path";

interface TokenResponse {
  sessionId: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  messageCount: number;
}

export async function getSessionTokens(c: Context): Promise<Response> {
  const sessionId = c.req.param("sessionId");

  // Construct JSONL file path
  const jsonlPath = path.join(
    process.env.HOME || "/root",
    ".claude/projects/-workspace",
    `${sessionId}.jsonl`
  );

  // Check if file exists
  if (!fs.existsSync(jsonlPath)) {
    return c.json({ error: "Session not found" }, 404);
  }

  // Parse JSONL file and sum tokens
  let totalInput = 0;
  let totalOutput = 0;
  let messageCount = 0;

  const fileContent = fs.readFileSync(jsonlPath, "utf-8");
  const lines = fileContent.split("\n").filter(line => line.trim());

  for (const line of lines) {
    try {
      const data = JSON.parse(line);
      if (data.type === "assistant" && data.message?.usage) {
        totalInput += data.message.usage.input_tokens || 0;
        totalOutput += data.message.usage.output_tokens || 0;
        messageCount++;
      }
    } catch (e) {
      // Skip invalid lines
    }
  }

  return c.json({
    sessionId,
    inputTokens: totalInput,
    outputTokens: totalOutput,
    totalTokens: totalInput + totalOutput,
    messageCount
  });
}
```

**Register Route** in `lib/claude-webui-server/cli/node.ts`:
```typescript
app.get("/api/session-tokens/:sessionId", getSessionTokens);
```

#### Frontend: Update UnifiedMessageProcessor

**File**: `app/utils/UnifiedMessageProcessor.ts`

**REMOVE** lines 596-621 (old token extraction logic)

**REPLACE** with:
```typescript
private async processResultMessage(
  message: Extract<SDKMessage | TimestampedSDKMessage, { type: "result" }>,
  context: ProcessingContext,
  options: ProcessingOptions,
): Promise<void> {
  const timestamp = options.timestamp || Date.now();
  const resultMessage = convertResultMessage(message, timestamp);
  context.addMessage(resultMessage);

  // Fetch cumulative session tokens from backend
  if (context.onTokenUpdate && message.session_id) {
    try {
      const response = await fetch(`/api/session-tokens/${message.session_id}`);
      if (response.ok) {
        const data = await response.json();
        console.log('[TOKEN_DEBUG] Session cumulative tokens:', data.totalTokens);
        context.onTokenUpdate(data.totalTokens);
      }
    } catch (error) {
      console.error('[TOKEN_DEBUG] Failed to fetch session tokens:', error);
    }
  }

  // Clear current assistant message (streaming only)
  if (options.isStreaming) {
    context.setCurrentAssistantMessage?.(null);
  }
}
```

**Note**: Need to make `processResultMessage` async and update all call sites.

#### Frontend: Fix ChatPage to Use setTokenUsage

**File**: `app/components/ChatPage.tsx`

**Line 43** - Change from:
```typescript
const { updateTokenUsage, resetTokenUsage } = useTokenUsage();
```

To:
```typescript
const { setTokenUsage, resetTokenUsage } = useTokenUsage();
```

**Line 253** - Change from:
```typescript
onTokenUpdate: updateTokenUsage,
```

To:
```typescript
onTokenUpdate: setTokenUsage,
```

## Implementation Steps

### Phase 1: Backend (30 minutes)
- [ ] Create `lib/claude-webui-server/handlers/session-tokens.ts`
- [ ] Implement `getSessionTokens()` function
- [ ] Register route in `cli/node.ts`
- [ ] Test endpoint manually with curl

### Phase 2: Frontend - UnifiedMessageProcessor (30 minutes)
- [ ] Make `processResultMessage()` async
- [ ] Remove old token extraction logic (lines 596-621)
- [ ] Add fetch call to new endpoint
- [ ] Update all call sites to handle async
- [ ] Add error handling for fetch failures

### Phase 3: Frontend - ChatPage (10 minutes)
- [ ] Change from `updateTokenUsage` to `setTokenUsage`
- [ ] Update both line 43 and line 253
- [ ] Verify no other places use `updateTokenUsage`

### Phase 4: Testing (30 minutes)
- [ ] Start new conversation
- [ ] Send several messages
- [ ] Verify progress bar shows cumulative total
- [ ] Compare with manual JSONL parsing
- [ ] Test with long conversations
- [ ] Test error handling (missing session file)

### Phase 5: Cleanup (15 minutes)
- [ ] Remove unused `updateTokenUsage` function if no longer needed
- [ ] Remove debug logs or keep for troubleshooting
- [ ] Update ticket 029 documentation
- [ ] Mark ticket 074 as complete

## Expected Behavior After Implementation

1. **User sends message** → Backend processes with Claude SDK
2. **SDK writes to JSONL** → `~/.claude/projects/-workspace/{sessionId}.jsonl`
3. **Result message arrives** → Frontend processes in `UnifiedMessageProcessor`
4. **Fetch session tokens** → Backend reads JSONL, sums all tokens, returns total
5. **Update context** → `setTokenUsage(cumulativeTotal)` updates context
6. **Progress bar updates** → Shows true session total automatically

## Edge Cases & Error Handling

1. **Session file doesn't exist yet**: Return 0 tokens, graceful fallback
2. **File read error**: Log error, keep previous value, don't crash
3. **Invalid JSONL lines**: Skip bad lines, sum valid ones
4. **Network error**: Log error, keep previous token count
5. **Async timing**: Ensure fetch completes before next message

## Alternative: Backend Stream Enhancement (Future)

Instead of frontend calling API, backend could:
1. After yielding result message
2. Immediately parse JSONL
3. Yield custom `{ type: "session_tokens", data: { total: 33806 } }`
4. Frontend handles new message type in stream parser

This eliminates the fetch call and keeps all logic in streaming flow.

## Success Criteria

✅ Progress bar shows **cumulative session total**, not per-turn tokens
✅ Accurate across entire conversation lifecycle
✅ No performance degradation
✅ Clean architecture with backend as single source of truth
✅ Old token extraction logic removed
✅ Error handling for missing/invalid files

## Files to Modify

### New Files
- `lib/claude-webui-server/handlers/session-tokens.ts`

### Modified Files
- `lib/claude-webui-server/cli/node.ts` (add route)
- `app/utils/UnifiedMessageProcessor.ts` (remove old logic, add fetch)
- `app/components/ChatPage.tsx` (use setTokenUsage instead of updateTokenUsage)

### Files to Review
- `app/contexts/TokenUsageContext.tsx` (verify setTokenUsage works correctly)
- `app/components/TokenContextBar.tsx` (no changes needed)

---

**Estimated Time**: 2 hours total
**Confidence**: 10/10 - Proven working with Python POC
**Ready to Implement**: Yes

---

*Updated: 2025-11-01*
*Status: Implementation plan finalized, ready to code*
