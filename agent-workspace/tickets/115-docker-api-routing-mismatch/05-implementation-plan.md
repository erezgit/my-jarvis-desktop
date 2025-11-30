# Implementation Plan: Message-Based Token Tracking Architecture

## Root Cause Analysis Summary

**Issue**: File upload button causes 10-second delays and browser freezing due to infinite React re-render loops.

**Root Cause**: Token Usage Tracking System introduced in commit `339b38a9` broke the established message-based architecture by:
1. Adding direct Context API coupling (`setTokenUsage`) to streaming system
2. Creating massive dependency arrays in `sendMessage` useCallback (22 dependencies)
3. Causing infinite re-render cycles that block the main thread
4. Breaking from the proven voice message pattern

## Architecture Solution: Follow Voice Message Pattern

The token tracking system should follow the exact same pattern as voice messages:

### Current Voice Message Pattern (WORKING)
```typescript
// Backend sends stream message
{ type: "claude_json", data: { type: "voice", content: "...", audioUrl: "..." } }

// useStreamParser creates message object
const voiceMessage: VoiceMessage = { type: "voice", content: data.content, audioUrl: data.audioUrl, timestamp: Date.now() };
context.addMessage(voiceMessage);

// Component reads from message array
const lastVoiceMessage = messages.find(m => m.type === "voice");
```

### Required Token Message Pattern (TO IMPLEMENT)
```typescript
// Backend sends stream message
{ type: "token_update", usage: { input_tokens: 100, output_tokens: 50, ... } }

// useStreamParser creates message object
const tokenMessage: TokenUsageMessage = { type: "token_usage", usage: data.usage, timestamp: Date.now() };
context.addMessage(tokenMessage);

// Component reads from message array
const lastTokenMessage = messages.find(m => m.type === "token_usage");
```

## Implementation Steps

### Phase 1: Define TokenUsageMessage Type
**File**: `app/types.ts`

Add new message type alongside existing VoiceMessage:

```typescript
export interface TokenUsageMessage {
  type: "token_usage";
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_creation_tokens?: number;
    cache_read_tokens?: number;
    currentContextSize: number;
    percentage: number;
  };
  timestamp: number;
}
```

Update union types:
```typescript
export type Message =
  | ChatMessage
  | SystemMessage
  | VoiceMessage
  | TokenUsageMessage  // Add this line
  | ResultMessage;
```

### Phase 2: Update useStreamParser to Create Messages
**File**: `app/hooks/streaming/useStreamParser.ts`

**Current Broken Code** (Lines 127-147):
```typescript
} else if (data.type === "token_update") {
  if (data.usage) {
    // BROKEN: Direct Context API call
    context.setTokenUsage?.({
      inputTokens: data.usage.input_tokens,
      outputTokens: data.usage.output_tokens,
      // ... other properties
    });
  }
}
```

**Fixed Code**:
```typescript
} else if (data.type === "token_update") {
  if (data.usage) {
    const currentContextSize =
      (data.usage.cache_read_tokens || 0) +
      (data.usage.cache_creation_tokens || 0) +
      data.usage.input_tokens +
      data.usage.output_tokens;

    // FIXED: Create message object (follows voice pattern)
    const tokenMessage: TokenUsageMessage = {
      type: "token_usage",
      usage: {
        input_tokens: data.usage.input_tokens,
        output_tokens: data.usage.output_tokens,
        cache_creation_tokens: data.usage.cache_creation_tokens,
        cache_read_tokens: data.usage.cache_read_tokens,
        currentContextSize: currentContextSize,
        percentage: (currentContextSize / 200000) * 100
      },
      timestamp: Date.now()
    };

    // Add to message array (same as voice messages)
    context.addMessage(tokenMessage);
  }
}
```

### Phase 3: Remove Context API Dependencies
**File**: `app/components/ChatPage.tsx`

**Current Broken Code** (Lines 310-332):
```typescript
const sendMessage = useCallback(
  // ... function body
  [
    input, isLoading, currentSessionId, allowedTools, hasShownInitMessage,
    currentAssistantMessage, claudeWorkingDirectory, permissionMode,
    generateRequestId, clearInput, startRequest, addMessage, updateLastMessage,
    setCurrentSessionId, setHasShownInitMessage, setHasReceivedInit,
    setCurrentAssistantMessage, resetRequestState, processStreamLine,
    handlePermissionError, createAbortHandler,
    setTokenUsage  // REMOVE THIS LINE - causes infinite re-renders
  ],
);
```

**Fixed Code**:
```typescript
const sendMessage = useCallback(
  // ... function body (unchanged)
  [
    input, isLoading, currentSessionId, allowedTools, hasShownInitMessage,
    currentAssistantMessage, claudeWorkingDirectory, permissionMode,
    generateRequestId, clearInput, startRequest, addMessage, updateLastMessage,
    setCurrentSessionId, setHasShownInitMessage, setHasReceivedInit,
    setCurrentAssistantMessage, resetRequestState, processStreamLine,
    handlePermissionError, createAbortHandler
    // setTokenUsage REMOVED - no longer needed
  ],
);
```

Remove token context from streaming context:
```typescript
// Remove these lines from streaming context
onTokenUpdate: useCallback((data: any) => {
  setTokenUsage(data);
}, [setTokenUsage]),
```

### Phase 4: Create Message-Based Token Hook
**New File**: `app/hooks/useTokenContextBar.ts`

```typescript
import { useMemo } from 'react';
import type { Message, TokenUsageMessage } from '../types';

export function useTokenContextBar(messages: Message[]) {
  // Find the latest token usage message (similar to voice message pattern)
  const latestTokenData = useMemo(() => {
    const tokenMessages = messages.filter((m): m is TokenUsageMessage => m.type === 'token_usage');
    return tokenMessages.length > 0 ? tokenMessages[tokenMessages.length - 1].usage : null;
  }, [messages]);

  return {
    tokenUsage: latestTokenData
  };
}
```

### Phase 5: Update TokenContextBar Component
**File**: `app/components/TokenContextBar.tsx`

**Current Code**:
```typescript
// Remove direct context consumption
const { tokenUsage } = useTokenUsage();
```

**Fixed Code**:
```typescript
import { useTokenContextBar } from '../hooks/useTokenContextBar';

// Inside component:
const { tokenUsage } = useTokenContextBar(messages);  // Pass messages from props/context
```

Update component props to receive messages:
```typescript
interface TokenContextBarProps {
  messages: Message[];  // Add this prop
}

export function TokenContextBar({ messages }: TokenContextBarProps) {
  const { tokenUsage } = useTokenContextBar(messages);

  // Rest of component unchanged
}
```

### Phase 6: Update Layout Integration
**File**: `app/components/DesktopLayout.tsx`

Pass messages to TokenContextBar:
```typescript
// Inside DesktopLayout component
<TokenContextBar messages={messages} />
```

### Phase 7: Clean Up Context (Optional)
**File**: `app/contexts/TokenUsageContext.tsx`

Consider simplifying or removing TokenUsageContext entirely since token data now flows through the message system. If keeping for backward compatibility, update to be read-only:

```typescript
// Simplified context - no more setTokenUsage
export interface TokenUsageContextType {
  tokenUsage: TokenUsageData | null;
  // Remove: setTokenUsage
}
```

## Validation Steps

### 1. Dependency Verification
After implementation, verify `sendMessage` has clean dependencies:
```bash
# Search for sendMessage useCallback
grep -A 20 "const sendMessage = useCallback" app/components/ChatPage.tsx
```

### 2. Message Flow Testing
1. Start dev1 container: `docker-compose -f docker-compose.dev1.yml up -d --build`
2. Open browser dev tools console
3. Send a message to Claude
4. Verify token_usage messages appear in message array
5. Verify no infinite console logging

### 3. File Upload Performance Test
1. Click file upload button
2. Verify <100ms delay to open file dialog
3. No browser freezing
4. No infinite re-render loops

## Risk Assessment

**Low Risk Changes**:
- Adding new message type (follows existing pattern)
- Creating new hook (isolated functionality)
- Updating useStreamParser (contained change)

**Medium Risk Changes**:
- Modifying sendMessage dependencies (core component)
- Updating TokenContextBar props (component interface change)

**High Risk Changes**:
- Removing TokenUsageContext entirely (breaking change)

## Rollback Plan

If issues occur:
1. **Phase 1-2**: No rollback needed (additive changes)
2. **Phase 3**: Restore `setTokenUsage` to dependency array
3. **Phase 4-6**: Revert to context-based approach
4. **Phase 7**: Keep existing context

## Success Criteria

✅ **File upload button responds in <100ms**
✅ **No browser freezing during UI interactions**
✅ **Token usage display continues working**
✅ **sendMessage dependency array has <15 items**
✅ **No infinite console logging**
✅ **Message-based architecture consistency**

## Implementation Order

Execute phases **sequentially** to ensure stability:
1. Phase 1 (Types) → Test compilation
2. Phase 2 (Parser) → Test streaming
3. Phase 3 (Dependencies) → Test file upload performance
4. Phase 4-6 (Components) → Test token display
5. Phase 7 (Cleanup) → Final validation

## File Impact Summary

**Modified Files**:
- `app/types.ts` - Add TokenUsageMessage type
- `app/hooks/streaming/useStreamParser.ts` - Replace context calls with message creation
- `app/components/ChatPage.tsx` - Remove token dependencies from sendMessage
- `app/components/TokenContextBar.tsx` - Switch to message-based consumption
- `app/components/DesktopLayout.tsx` - Pass messages to TokenContextBar

**New Files**:
- `app/hooks/useTokenContextBar.ts` - Message-based token data hook

**Estimated Implementation Time**: 2-3 hours
**Testing Time**: 1 hour
**Total**: 3-4 hours

---

**This plan restores the file upload button to <100ms performance by eliminating infinite re-render loops while maintaining token tracking functionality through the proven message-based architecture pattern.**