# 114 - Token Tracking API Response Fix - Implementation Plan

## Problem Summary

**Current Issue**: Our token tracking is capturing only 0.5% of actual token usage because we're reading from JSONL files that only contain visible conversation tokens (2 input + 72 output), while the actual API usage includes ALL context tokens (17,412 input + 78 output).

**Discovery**: The JSONL files actually DO contain the complete API response with full token usage data, but our `session-tokens.ts` handler only extracts `input_tokens` and `output_tokens`, completely ignoring:
- `cache_creation_input_tokens` (327 in our test)
- `cache_read_input_tokens` (14,983 in our test)
- `thinking_tokens` (future consideration)

**Impact**: Users see costs of $0.0081 when actual costs are ~$0.05 - a 6x discrepancy that makes budget tracking useless.

**AI Test Findings**: Live testing confirmed that MyJarvis makes ONE API call per user message that includes all tool executions and returns complete token usage data. Each API response contains the full context size through cache tokens - no accumulation needed.

## Solution Architecture

### Core Principle
Move token tracking from JSONL parsing to direct API response processing. The API response is the authoritative source - capture it immediately when received.

### Data Flow Changes

**Current Flow (Broken)**:
```
API Response → Claude SDK → JSONL File → session-tokens.ts → Database
                                ↓
                          (loses 99% of data)
```

**New Flow (Fixed)**:
```
API Response → Claude SDK → Backend Handler → Database + token_update Stream
                     ↓                ↓
            (full usage data)  (new stream message type)
```

## Implementation Tasks

### 1. Database Schema Updates ✅ COMPLETED

**Location**: Supabase schema

**Changes Required**:
```sql
-- Add missing token type columns to token_usage_sessions
ALTER TABLE token_usage_sessions
ADD COLUMN cache_creation_input_tokens INTEGER DEFAULT 0,
ADD COLUMN cache_read_input_tokens INTEGER DEFAULT 0,
ADD COLUMN thinking_tokens INTEGER DEFAULT 0;

-- Add missing columns to token_usage_daily
ALTER TABLE token_usage_daily
ADD COLUMN daily_cache_creation_input_tokens INTEGER DEFAULT 0,
ADD COLUMN daily_cache_read_input_tokens INTEGER DEFAULT 0,
ADD COLUMN daily_thinking_tokens INTEGER DEFAULT 0;

-- Update the upsert_token_usage RPC function to handle new fields
```

### 2. Backend Token Extraction

**Location**: `/lib/claude-webui-server/handlers/chat.ts`

**Current Code (Line 282-293)**:
```typescript
for await (const sdkMessage of query({
  prompt: processedMessage,
  options: queryOptions,
})) {
  logger.chat.debug("Claude SDK Message: {sdkMessage}", { sdkMessage });

  yield {
    type: "claude_json",
    data: sdkMessage,
  };
}
```

**New Code**:
```typescript
for await (const sdkMessage of query({
  prompt: processedMessage,
  options: queryOptions,
})) {
  logger.chat.debug("Claude SDK Message: {sdkMessage}", { sdkMessage });

  // Extract usage data if present in assistant message
  if (sdkMessage.type === 'assistant' && sdkMessage.message?.usage) {
    const usage = sdkMessage.message.usage;

    // Calculate total input tokens
    const totalInputTokens =
      (usage.input_tokens || 0) +
      (usage.cache_creation_input_tokens || 0) +
      (usage.cache_read_input_tokens || 0);

    // Send token update to frontend
    yield {
      type: "token_update",
      usage: {
        input_tokens: usage.input_tokens || 0,
        output_tokens: usage.output_tokens || 0,
        cache_creation_tokens: usage.cache_creation_input_tokens || 0,
        cache_read_tokens: usage.cache_read_input_tokens || 0,
        thinking_tokens: usage.thinking_tokens || 0,
        total_input: totalInputTokens,
        total_output: usage.output_tokens || 0,
        total: totalInputTokens + (usage.output_tokens || 0)
      },
      sessionId: sessionId
    };

    // Save to database asynchronously
    if (sessionId) {
      saveTokenUsageToDatabase({
        sessionId,
        usage,
        model: sdkMessage.message.model || 'claude-3-5-sonnet-20241022',
        userId: getUserIdFromContext(c) // Need to implement proper user context
      }).catch(error => {
        logger.chat.error("Failed to save token usage: {error}", { error });
      });
    }
  }

  yield {
    type: "claude_json",
    data: sdkMessage,
  };
}
```

### 3. Database Service Function

**New File**: `/lib/claude-webui-server/services/token-database.ts`

```typescript
import { TokenUsageService } from '../../../app/lib/token-tracking/token-usage-service';

export async function saveTokenUsageToDatabase(params: {
  sessionId: string;
  usage: any;
  model: string;
  userId: string;
}) {
  const { sessionId, usage, model, userId } = params;

  const tokenService = new TokenUsageService(userId);

  await tokenService.processSessionUsage({
    sessionId,
    inputTokens: usage.input_tokens || 0,
    outputTokens: usage.output_tokens || 0,
    cacheCreationTokens: usage.cache_creation_input_tokens || 0,
    cacheReadTokens: usage.cache_read_input_tokens || 0,
    thinkingTokens: usage.thinking_tokens || 0,
    messageCount: 1,
    sessionStartedAt: new Date().toISOString(),
    model
  });
}
```

### 4. Frontend Stream Processing

**Location**: `/app/hooks/streaming/useStreamParser.ts`

**Add Handler for token_update Message**:
```typescript
case 'token_update':
  // Display current context size directly from API response
  // No accumulation needed - cache tokens represent full context
  if (data.usage) {
    const currentContextSize =
      (data.usage.cache_read_tokens || data.usage.cache_creation_tokens || 0) +
      data.usage.input_tokens +
      data.usage.output_tokens;

    setTokenUsage({
      inputTokens: data.usage.input_tokens,
      outputTokens: data.usage.output_tokens,
      cacheCreationTokens: data.usage.cache_creation_tokens,
      cacheReadTokens: data.usage.cache_read_tokens,
      currentContextSize: currentContextSize,
      percentage: (currentContextSize / 200000) * 100
    });

    console.log('[TOKEN_UPDATE] Current context size:', currentContextSize);
  }
  break;
```

### 5. Progress Bar Component Updates

**Location**: `/app/components/TokenContextBar.tsx`

**Simplified Approach**: Display current context size from latest token_update stream message

```typescript
// Progress bar shows current context size directly
<div className="progress-bar">
  <div className="flex justify-between items-center">
    <span className="text-xs font-medium text-muted-foreground">
      {percentage.toFixed(1)}% used
    </span>
    <span className="text-xs text-muted-foreground">
      {formatTokens(currentContextSize)} / {formatTokens(200000)} tokens
    </span>
  </div>

  {/* Cache breakdown when expanded */}
  {isExpanded && (
    <div className="text-xs text-muted-foreground ml-2">
      Context: {formatTokens(cacheReadTokens || cacheCreationTokens)} tokens
      New: {formatTokens(inputTokens)} in + {formatTokens(outputTokens)} out
    </div>
  )}
</div>
```
        </span>
        <span className="text-xs text-muted-foreground">
          {formatTokens(context.tokens_used)} / {formatTokens(context.max_tokens)} tokens
        </span>
      </div>
      {/* Add token breakdown */}
      {context.cacheReadTokens > 0 && (
        <div className="text-xs text-muted-foreground ml-2">
          Cache: {formatTokens(context.cacheReadTokens)} tokens (saved ${calculateCacheSavings(context.cacheReadTokens)})
        </div>
      )}
    </div>
  </div>
)}
```

### 6. Cost Calculation Updates

**Location**: `/app/lib/token-tracking/token-usage-service.ts`

**Update calculateCost Method**:
```typescript
private calculateCost(data: TokenUsageData): number {
  // Updated pricing for different token types
  const pricing = {
    input: 3,          // $3 per million
    output: 15,        // $15 per million
    cacheWrite: 3.75,  // $3.75 per million (125% of input cost)
    cacheRead: 0.30,   // $0.30 per million (90% discount)
    thinking: 3        // $3 per million
  };

  return (
    (data.inputTokens * pricing.input) +
    (data.outputTokens * pricing.output) +
    (data.cacheCreationTokens * pricing.cacheWrite) +
    (data.cacheReadTokens * pricing.cacheRead) +
    (data.thinkingTokens * pricing.thinking)
  ) / 1_000_000;
}
```

### 7. Remove Current Token Fetching Logic

**Location**: Frontend stream processing

**Current**: Makes separate API call to `/api/session-tokens/${sessionId}` after completion
**New**: Remove this API call entirely - token data comes through real-time stream

### 8. User Context Integration

**Critical Issue**: Currently using hardcoded user ID `3dfb3580-b7c4-4da3-8d9e-b9775c216f7e`

**Solution**:
- Extract user ID from authentication context
- Pass through from frontend → backend → database
- For local development with DISABLE_AUTH=true, use a development user ID

## Testing Plan

### Test Case 1: Verify Complete Token Capture
1. Send message: "What is the capital of France?"
2. Check database for session
3. Verify ALL token types are saved:
   - input_tokens: ~2
   - cache_read_input_tokens: ~15,000
   - cache_creation_input_tokens: ~300
   - output_tokens: ~70

### Test Case 2: Progress Bar Real-Time Updates
1. Send message requiring multiple tools (like file reading)
2. Verify progress bar updates immediately when response completes
3. Check that context size reflects cache + new tokens
4. Compare total with Anthropic console - should match within 1%

### Test Case 3: Cost Calculation
1. Send message with known token counts
2. Verify cost calculation includes cache discounts
3. Example: 15,000 cache tokens at $0.30/M = $0.0045 (not $0.045 at full price)

## Migration Strategy

1. **Phase 1**: Deploy database schema changes
2. **Phase 2**: Deploy backend changes (backward compatible)
3. **Phase 3**: Deploy frontend changes
4. **Phase 4**: Deprecate JSONL token endpoint

## Success Metrics

- Token tracking accuracy: >95% match with Anthropic console
- Cost calculation accuracy: Within 5% of actual billing
- Real-time updates: Progress bar updates immediately on API response
- Database completeness: All token types captured and stored

## Key Architecture Decisions

**Stream Message Approach**: Using new `token_update` stream message type instead of modifying SDK's `result` message
- **Pros**: Clean separation, future-proof, doesn't modify SDK internals
- **Cons**: One additional message type (minimal overhead)

**No Token Accumulation**: Each API response contains complete context size via cache tokens
- **Simplifies**: Frontend logic - just display latest context size
- **Performance**: No session state management needed

**Real-Time Updates**: Token tracking happens during stream, not after completion
- **UX**: Immediate progress bar updates
- **Accuracy**: Direct from API response, not reconstructed data

## Notes

- JSONL files remain for conversation history but not for token tracking
- Future: Add support for `thinking_tokens` when Anthropic enables it
- Consider token breakdown tooltip on hover for progress bar
- May need to update token limits per model (200K for Sonnet, others vary)

## Timeline

- Database schema: 30 minutes
- Backend implementation: 2 hours
- Frontend updates: 1 hour
- Testing and validation: 1 hour
- Total: ~5 hours

---

*Created: 2025-11-29*
*Status: Implementation Complete - Ready for Testing*

## Implementation Status

✅ **Completed Tasks:**
- Database schema updated with cache token columns
- Backend token extraction implemented in chat handler
- Database service function created for token saving
- Frontend stream processing added for token_update messages
- Progress bar component updated for real-time display
- Cost calculation updated for different token types
- Deprecated JSONL token fetching logic removed

🔄 **Next Steps:**
- Deploy and test complete token capture
- Verify accuracy against Anthropic console
- Validate real-time progress bar updates