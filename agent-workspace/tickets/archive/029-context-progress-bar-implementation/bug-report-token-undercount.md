# Bug Report: Token Usage Progress Bar Shows ~50% of Actual Usage

**Date**: October 5, 2025
**Discovered By**: Erez
**Component**: TokenContextBar / Token Usage Tracking
**Severity**: Medium - Misleading user information about context usage
**Status**: Root cause identified, fix proposed

## Problem Description

The token usage progress bar (context bar) displays approximately 50% or less of the actual token usage. For example:
- Progress bar shows: 1,000 tokens
- Actual usage: Over 2,000 tokens

This leads users to believe they have more context window available than they actually do, which could result in unexpected context window exhaustion.

## Root Cause Analysis

### The Fundamental Issue

The Claude Code SDK sends **CUMULATIVE totals** in result messages, not incremental token counts:

```typescript
// What Claude SDK sends in each result message:
message.usage = {
  input_tokens: 5000,   // Total tokens used so far in conversation
  output_tokens: 2000   // Total tokens generated so far
}
```

Our code incorrectly treats these as incremental values to add:

```typescript
// Current WRONG implementation:
// UnifiedMessageProcessor.ts line 522
context.onTokenUpdate(totalTokens);  // Passes 7000

// ChatPage.tsx line 218
onTokenUpdate: updateTokenUsage,     // Routes to add function

// TokenUsageContext.tsx line 29-36
updateTokenUsage(newTokens) {
  tokens_used = prev.tokens_used + newTokens;  // ADDS to running total
}
```

### The Accumulation Problem

**Example of what happens:**

1. **First message**: SDK says 1000 total → Context adds 1000 → Shows 1000 ✅
2. **Second message**: SDK says 1500 total → Context adds 1500 → Shows 2500 ❌ (should be 1500)
3. **Third message**: SDK says 2000 total → Context adds 2000 → Shows 4500 ❌ (should be 2000)

However, due to resets or missed messages, the actual display often shows LESS than the real usage, not more.

## Technical Details

### Current Implementation Flow

1. **Claude SDK** (`@anthropic-ai/claude-code`) sends `type: "result"` messages
2. **UnifiedMessageProcessor** (`processResultMessage`, line 493-532) extracts tokens:
   - Reads `message.usage.input_tokens` + `message.usage.output_tokens`
   - Calls `context.onTokenUpdate(totalTokens)` with the sum
3. **ChatPage** (line 36, 218) provides callback:
   - Uses `updateTokenUsage` from `useTokenUsage()` hook
   - Passes this as `onTokenUpdate` in streaming context
4. **TokenUsageContext** (line 29-36) incorrectly accumulates:
   - `updateTokenUsage` ADDS the value to existing total
   - Should SET the value as absolute total instead

### Debug Logs Present

The code includes extensive debug logging:
```typescript
console.log('[TOKEN_DEBUG] Input tokens (TOTAL):', inputTokens);
console.log('[TOKEN_DEBUG] Output tokens (TOTAL):', outputTokens);
console.log('[TOKEN_DEBUG] Total tokens (ABSOLUTE):', totalTokens);
```

These logs confirm the SDK is sending cumulative totals, not increments.

## Proposed Solutions

### Solution 1: Use Set Instead of Update (Recommended)

**Simple 2-line change in ChatPage.tsx:**

```typescript
// Line 36 - Change from:
const { updateTokenUsage } = useTokenUsage();
// To:
const { setTokenUsage } = useTokenUsage();

// Line 218 - Change from:
onTokenUpdate: updateTokenUsage,
// To:
onTokenUpdate: setTokenUsage,
```

This correctly treats the SDK values as absolute totals.

### Solution 2: Calculate Delta in UnifiedMessageProcessor

**More complex but maintains incremental pattern:**

```typescript
// Add to UnifiedMessageProcessor class:
private lastKnownTokenTotal = 0;

// Modify processResultMessage (line ~520):
const totalTokens = inputTokens + outputTokens;
const delta = totalTokens - this.lastKnownTokenTotal;
this.lastKnownTokenTotal = totalTokens;
context.onTokenUpdate(delta);  // Now passing true increment
```

## Impact

- **User Experience**: Users see accurate token usage, avoiding surprise context exhaustion
- **Planning**: Users can better plan their conversations knowing true usage
- **Cost Awareness**: Accurate representation of API usage for cost tracking

## Testing Plan

1. Start new conversation
2. Send several messages
3. Compare displayed token count with:
   - Result messages shown in UI (line 111 in MessageComponents.tsx shows actual values)
   - Console logs showing TOKEN_DEBUG messages
4. Verify progress bar shows same total as result messages

## Files Affected

- `/app/components/ChatPage.tsx` (lines 36, 218)
- `/app/utils/UnifiedMessageProcessor.ts` (lines 511-522)
- `/app/contexts/TokenUsageContext.tsx` (lines 29-36)
- `/app/components/TokenContextBar.tsx` (display component, no changes needed)

## Recommendation

Implement **Solution 1** (use `setTokenUsage` instead of `updateTokenUsage`) as it's:
- Simpler (2-line change)
- More accurate (uses SDK values directly)
- Less error-prone (no delta calculation needed)
- Maintains existing architecture

---

**Next Steps**: Apply the fix and test with real Claude Code SDK conversations to verify accurate token tracking.