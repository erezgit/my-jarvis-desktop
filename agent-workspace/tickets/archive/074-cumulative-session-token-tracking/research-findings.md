# Ticket 074: Cumulative Session Token Tracking Research

**Created**: 2025-11-01
**Status**: Research Phase
**Priority**: High

## Problem Statement

The current token tracking implementation shows **per-turn tokens** from individual result messages (e.g., "1349 in, 3124 out" for a single interaction), not the **cumulative session context total**. We need to track the total tokens used across the entire conversation session to accurately display context window usage.

## Research: Open-Source Claude Code Monitoring Tools

### 1. claude-code-token-tracker (anirudhhgupta)

**Repository**: https://github.com/anirudhhgupta/claude-code-token-tracker

**Approach**: Polls `~/.claude.json` file

**Technical Details**:
- Uses **aggressive 500ms polling** of `~/.claude.json` configuration file
- Does NOT use SDK APIs or parse JSONL conversation files
- Maintains SQLite database with three tables:
  - Sessions table (cumulative totals)
  - Conversations table (deltas)
  - Session snapshots (audit trail)
- Compares current state vs previous state to detect changes
- Aggregates conversation deltas to calculate session totals
- Tracks ALL token types: input, output, cache creation, cache read

**Why this approach**:
- File watching had race conditions and missed session endings
- Polling guarantees "never misses session endings or transitions"
- Pull-based approach ensures complete visibility

**Relevance**: ⭐⭐⭐ - Shows that cumulative tracking requires external state monitoring, not just SDK messages

---

### 2. Claude-Code-Usage-Monitor (Maciek-roboblog)

**Repository**: https://github.com/Maciek-roboblog/Claude-Code-Usage-Monitor

**Approach**: Real-time monitoring with ML predictions

**Technical Details**:
- Real-time terminal monitoring tool
- Features ML-based predictions using P90 percentile calculations
- Supports multiple plan types (Pro, Max5, Max20, Custom)
- Color-coded progress bars
- Model-specific pricing and cost analytics
- Configurable refresh rates (0.1-20 Hz)

**Implementation (inferred)**:
- Likely accesses local Claude data storage
- Processes historical session data for statistical analysis
- Periodic reads of accumulated usage data (not streaming)

**Documentation limitation**: README doesn't specify exact data source (JSONL vs config file vs API)

**Relevance**: ⭐⭐ - Confirms need for external data source but lacks implementation specifics

---

### 3. ccusage (ryoppippi)

**Repository**: https://github.com/ryoppippi/ccusage

**Approach**: JSONL file parsing

**Technical Details**:
- Parses **JSONL files** from local directories:
  - `~/.claude/projects/` (Claude Code)
  - `~/.codex/` (Codex variant)
- Aggregation methods:
  - Daily reports (by date)
  - Monthly summaries
  - Per-session breakdowns
  - 5-hour billing window tracking
- Tracks token categories:
  - Regular input/output
  - Cache creation tokens
  - Cache read tokens
- **Live mode** (`--live` flag) for real-time dashboard
- Shows: active session progress, token burn rate, cost projections
- TypeScript-based, can run via `npx ccusage@latest`

**Why this approach**:
- Claude Code automatically writes JSONL logs during sessions
- Local files contain complete conversation history
- No need for API calls - all data is local

**Relevance**: ⭐⭐⭐⭐ - Most directly applicable, shows JSONL parsing is the standard approach

---

## Key Findings

### Common Pattern Across All Tools

**None of them use SDK APIs to get cumulative totals in real-time.**

All three tools rely on **external data sources**:
1. `~/.claude.json` config file (polling approach)
2. `~/.claude/projects/*.jsonl` conversation logs (parsing approach)

### Why SDK Doesn't Provide Session Totals

The Claude Code SDK only sends **per-turn result messages** with tokens for that specific interaction. There is no SDK method or event that provides:
- Total session token usage
- Current context window utilization
- Cumulative conversation tokens

### The Real Solution

To track cumulative session tokens, we need to:

**Option A: Sum Per-Turn Results** (Our current partial implementation)
- Extract tokens from each result message
- Accumulate them in our TokenUsageContext
- **Issue**: We're currently using `updateTokenUsage` (adds) when we should use `setTokenUsage` (sets) - but this still won't give us cumulative session totals, only per-turn

**Option B: Parse JSONL Files** (Industry standard - what all OSS tools do)
- Read from `~/.claude/projects/{projectId}/*.jsonl`
- Parse all messages in the current session
- Sum all token values across all result messages
- Update periodically (polling) or watch file changes

**Option C: Track in Backend** (Most reliable for our use case)
- Backend already receives all SDK messages
- Backend can maintain session state and cumulative totals
- Send cumulative total with each streaming response
- Frontend just displays what backend reports

---

## Recommendation

**Implement Option C: Backend Session Tracking**

### Why This Approach

1. **Single Source of Truth**: Backend already processes all SDK messages
2. **No File Parsing**: Don't need to read external files or poll config
3. **Real-time Accuracy**: Updates with every interaction
4. **Simpler Frontend**: Just display what backend sends
5. **Session Lifecycle**: Backend owns session ID and can track session state

### Implementation Plan

**Backend Changes** (`lib/claude-webui-server/handlers/chat.ts`):

```typescript
// Add session state tracking
const sessionTokens = new Map<string, number>();

for await (const sdkMessage of query(...)) {
  if (sdkMessage.type === 'result' && sdkMessage.modelUsage) {
    // Calculate cumulative total for this session
    let cumulative = 0;
    for (const model in sdkMessage.modelUsage) {
      cumulative += sdkMessage.modelUsage[model].inputTokens || 0;
      cumulative += sdkMessage.modelUsage[model].outputTokens || 0;
    }

    // Store session total
    sessionTokens.set(sessionId, cumulative);

    // Send custom event with cumulative total
    yield {
      type: "session_tokens",
      data: {
        cumulative: cumulative,
        perTurn: cumulative - (previousTurn || 0)
      }
    };
  }

  yield { type: "claude_json", data: sdkMessage };
}
```

**Frontend Changes**:

1. Handle new `session_tokens` event type in stream parser
2. Update `TokenUsageContext` with cumulative value
3. Display cumulative total in progress bar

### Fallback: JSONL Parsing

If backend approach doesn't work, implement ccusage-style JSONL parsing:
- Monitor `~/.claude/projects/` directory
- Parse current session's JSONL file
- Sum all result message tokens
- Update UI periodically

---

## Next Steps

1. ✅ Research completed - analyzed 3 OSS projects
2. [ ] Decide on implementation approach (Option C recommended)
3. [ ] Prototype backend session tracking
4. [ ] Test cumulative total accuracy
5. [ ] Update frontend to display cumulative tokens
6. [ ] Document the solution

---

## Files to Modify

**If implementing Option C (Backend Tracking)**:
- `lib/claude-webui-server/handlers/chat.ts` - Add session token tracking
- `app/hooks/streaming/useStreamParser.ts` - Handle new event type
- `app/contexts/TokenUsageContext.tsx` - Already has `setTokenUsage`, use it
- `app/components/ChatPage.tsx` - Already routes to token context

**If implementing Option B (JSONL Parsing)**:
- `lib/claude-webui-server/history/` - Create session token calculator
- `app/api/` - New endpoint for session tokens
- `app/hooks/useSessionTokens.ts` - Polling hook
- `app/contexts/TokenUsageContext.tsx` - Update from polling

---

**Confidence**: 9/10 - Backend tracking is the cleanest solution for our architecture
