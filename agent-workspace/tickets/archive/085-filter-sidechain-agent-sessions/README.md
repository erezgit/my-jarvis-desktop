# Ticket #085: Filter Sidechain Agent Sessions from Chat History

## Issue Summary
Chat history is showing internal agent sidechain sessions (with "warmup" messages) instead of only displaying actual user conversations. When the page loads, it may auto-load these agent sessions instead of the user's latest conversation.

## Problem Description

### What's Happening
- Agent files like `agent-f552a338.jsonl` appear in chat history
- These contain only 2 lines: user "Warmup" + agent response
- They have `"isSidechain": true` and `"agentId": "xxxx"` properties
- They're created during multi-agent swarm operations
- Frontend shows these as regular conversations in history list
- Auto-loading may pick an agent session instead of user's latest chat

### Evidence from my-jarvis-erez-dev
```bash
# Found in /.claude/projects/-home-node/
agent-f552a338.jsonl (2 lines)  # Sidechain session
agent-239633cd.jsonl (2 lines)  # Sidechain session
c7ad687a-0560-4039-84c7-82925ef719a1.jsonl (27 lines)  # Real user chat
a90c8ce4-2c3a-49bf-aa50-7fac975fce16.jsonl (57 lines)  # Real user chat
```

### Sample Agent Session Content
```json
{
  "isSidechain": true,
  "agentId": "f552a338",
  "sessionId": "c7ad687a-0560-4039-84c7-82925ef719a1",
  "type": "user",
  "message": {"role": "user", "content": "Warmup"}
}
```

## Root Cause Analysis

### Current Backend Flow
1. `handleHistoriesRequest()` in `handlers/histories.ts`
2. Calls `parseAllHistoryFiles(historyDir)`
3. Calls `getHistoryFiles()` → gets ALL `.jsonl` files
4. Calls `parseHistoryFile()` for each file → no sidechain filtering
5. Returns all conversations including agent sessions

### Frontend Auto-Loading Issue
- Frontend receives ALL sessions in history response
- Picks "newest" session for auto-loading
- May select agent sidechain instead of user conversation

## Implementation Plan

### Phase 1: Backend Filtering (Primary Solution)

#### Option A: Filename-Based Filtering (Recommended)
**File**: `lib/claude-webui-server/history/parser.ts`
**Function**: `getHistoryFiles()`

```typescript
async function getHistoryFiles(historyDir: string): Promise<string[]> {
  try {
    const files: string[] = [];

    for await (const entry of readDir(historyDir)) {
      if (entry.isFile && entry.name.endsWith(".jsonl")) {
        // Filter out agent sidechain files by filename pattern
        if (entry.name.startsWith("agent-")) {
          logger.history.debug(`Filtering out agent sidechain file: ${entry.name}`);
          continue;
        }
        files.push(`${historyDir}/${entry.name}`);
      }
    }

    return files;
  } catch {
    return [];
  }
}
```

#### Option B: Content-Based Filtering (Fallback)
**File**: `lib/claude-webui-server/history/parser.ts`
**Function**: `parseHistoryFile()`

```typescript
// Add after parsing messages
const hasSidechain = messages.some(msg => msg.isSidechain === true);
if (hasSidechain) {
  logger.history.debug(`Filtering out sidechain conversation: ${sessionId}`);
  return null; // Skip this conversation
}
```

### Phase 2: Additional Safeguards

#### Frontend Validation
**File**: Frontend chat loading logic
- Add client-side validation to skip sessions with agent IDs
- Ensure auto-loading selects valid user conversations

#### Logging Enhancement
- Add debug logging for filtered sessions
- Track filtering metrics

## Testing Strategy

### Test Cases
1. **Verify agent sessions are filtered**: History API should not return `agent-*` files
2. **Verify user sessions remain**: Regular UUID-based files should still appear
3. **Verify auto-loading**: Page refresh should load user's latest conversation
4. **Verify swarm operations**: Agent sessions should still work internally but not appear in UI

### Test Data
- Use existing `my-jarvis-erez-dev` with mixed agent/user sessions
- Create new swarm operations to generate agent sessions
- Verify filtering behavior in both scenarios

## Success Criteria
- ✅ Chat history API returns only user conversations
- ✅ No agent sessions visible in frontend history list
- ✅ Page auto-loading picks user's latest conversation
- ✅ Multi-agent features continue working (agents just hidden from UI)
- ✅ No performance impact on history loading

## Files to Modify
- `lib/claude-webui-server/history/parser.ts` (primary)
- `lib/claude-webui-server/handlers/histories.ts` (validation)
- Frontend chat loading logic (secondary validation)

## Risk Assessment
- **Low Risk**: Changes only affect UI display, not agent functionality
- **No Breaking Changes**: Internal agent sessions continue working
- **Performance**: Minimal impact (simple filename check)

## Priority
- **Level**: Medium-High
- **Impact**: User Experience (confusing chat history)
- **Effort**: Small (1-2 hour implementation)

## Dependencies
- None

## Status
- **Created**: 2025-11-10
- **Assignee**: TBD
- **Status**: Ready for implementation

## Related Tickets
- #084: Claude Code project creation investigation
- Related to multi-agent swarm functionality