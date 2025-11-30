# Ticket 115: Architectural Fix Plan - Restore Event-Driven Message Processing

## Root Cause Analysis Summary

**The Problem**: Message processing changed from **event-driven** to **render-driven**, creating infinite React loops.

**The Breaking Change**: Commit 339b38a9 didn't introduce new code, but the existing architecture was vulnerable and became unstable with the conversation history size (46 messages).

**Key Finding**: The UnifiedMessageProcessor existed before the break, but the ChatMessages useEffect trigger pattern caused it to run on every render instead of only on actual message changes.

## How It Worked Before (Correctly)

### Original Architecture Pattern
```typescript
// BEFORE: Event-driven processing
// 1. Backend sends new message →
// 2. StreamingContext.addMessage() called ONCE →
// 3. UnifiedMessageProcessor processes ONLY the new message →
// 4. Component renders with updated state

// Messages array only changed when actual new data arrived
// useEffect only triggered on real message additions
```

### Current Broken Architecture
```typescript
// AFTER: Render-driven processing
// 1. Any state change triggers re-render →
// 2. ChatMessages useEffect sees "new" messages array (same content, different reference) →
// 3. UnifiedMessageProcessor processes ALL 46 messages →
// 4. Processing triggers state changes →
// 5. Back to step 1 (INFINITE LOOP)
```

## Exact Breaking Changes Identified

### 1. **useChatState Hook** (The Core Problem)
**File**: `app/hooks/chat/useChatState.ts`
**Issue**: Messages array gets new reference on every render

```typescript
// CURRENT BROKEN PATTERN
const [messages, setMessages] = useState<AllMessage[]>(memoizedInitialMessages);

// PROBLEM: setMessages([...prev, msg]) creates new array reference
// This triggers useEffect even when content is identical
```

### 2. **ChatMessages useEffect** (The Trigger)
**File**: `app/components/chat/ChatMessages.tsx:49-62`
**Issue**: Runs on every messages array reference change

```typescript
// CURRENT BROKEN PATTERN
useEffect(() => {
  // This runs every render because messages array reference changes
  handleNewMessage();
}, [messages, handleNewMessage, setScrollBehavior]);
```

### 3. **Context Function Recreation** (The Multiplier)
**File**: `app/components/ChatPage.tsx:313-336`
**Issue**: 22-dependency useCallback recreates functions constantly

```typescript
// CURRENT BROKEN PATTERN
const sendMessage = useCallback(async (...), [
  input, isLoading, currentSessionId, allowedTools,
  hasShownInitMessage, currentAssistantMessage,
  // ... 16 more dependencies - ANY change recreates function
]);
```

## The Architectural Fix Plan

### Phase 1: Stop the Infinite Loop (IMMEDIATE)

**1. Fix useChatState Message Updates**
```typescript
// BEFORE (BROKEN): Always creates new array
const addMessage = useCallback((msg: AllMessage) => {
  setMessages(prev => [...prev, msg]); // ❌ New reference every time
}, []);

// AFTER (FIXED): Use stable reference patterns
const addMessage = useCallback((msg: AllMessage) => {
  setMessages(prev => {
    // Only create new array if actually different
    const isDuplicate = prev.some(m => m.timestamp === msg.timestamp && m.type === msg.type);
    if (isDuplicate) return prev; // ❌ Same reference = no re-render

    return [...prev, msg]; // ✅ Only new reference when content actually changes
  });
}, []);
```

**2. Fix ChatMessages useEffect Dependency**
```typescript
// BEFORE (BROKEN): Triggers on any array reference change
useEffect(() => {
  handleNewMessage();
}, [messages, handleNewMessage, setScrollBehavior]);

// AFTER (FIXED): Only trigger on actual length changes
const messagesLength = messages.length;
useEffect(() => {
  handleNewMessage();
}, [messagesLength, handleNewMessage, setScrollBehavior]); // ✅ Only triggers on real additions
```

**3. Memoize Context Functions**
```typescript
// BEFORE (BROKEN): 22 dependencies cause constant recreation
const sendMessage = useCallback(async (...), [/* 22 dependencies */]);

// AFTER (FIXED): Break into smaller, stable functions
const sendMessage = useCallback(async (...), [
  // Only essential dependencies that rarely change
  currentSessionId, isLoading
]);
```

### Phase 2: Restore Event-Driven Architecture (STRATEGIC)

**1. Move UnifiedMessageProcessor Back to Streaming Context**
- Remove from render cycle
- Only call during actual streaming events
- Process individual messages, not bulk arrays

**2. Implement Message Diffing**
```typescript
// Only process new messages, not entire history
const getNewMessages = (prevMessages: AllMessage[], newMessages: AllMessage[]) => {
  return newMessages.slice(prevMessages.length);
};
```

**3. Create Message Event System**
```typescript
// Event-driven pattern
interface MessageEvent {
  type: 'message_added' | 'message_updated';
  message: AllMessage;
  index: number;
}

// Only process on actual events, not renders
```

### Phase 3: Clean Up Legacy Code (MAINTENANCE)

**1. Remove Debug Logging**
```typescript
// Remove from UnifiedMessageProcessor.ts
console.log('[DEBUG] handleToolUse called:');
console.log('[DEBUG] Cached tool_use:');
console.log('[DEBUG] tool_result lookup:');

// Remove from ChatPage.tsx
console.log('[CHATPAGE] ===== ChatPage component loaded - BUILD TEST =====');
```

**2. Simplify Context Structure**
- Remove duplicate token tracking
- Consolidate state setters
- Use React.memo for expensive components

**3. Optimize Message Processing**
- Cache tool processing results
- Avoid reprocessing unchanged messages
- Use message fingerprinting for change detection

## Implementation Order (Critical Path)

### Step 1: Emergency Fix (15 minutes)
1. Add message length tracking to stop infinite loop
2. Memoize critical context functions
3. Test file upload works immediately

### Step 2: Architectural Restoration (2 hours)
1. Implement proper message diffing
2. Move processing back to streaming events
3. Remove render-driven processing

### Step 3: Code Cleanup (1 hour)
1. Remove debug logging
2. Optimize context structure
3. Add performance monitoring

## Success Criteria

**Before Fix**:
- Browser console shows continuous logging
- File upload takes 10+ seconds
- Main thread constantly blocked

**After Fix**:
- Console logging stops completely
- File upload responds in <100ms
- Smooth UI performance with 46+ messages

## Risk Assessment

- **Risk Level**: LOW (reverting to proven pattern)
- **Breaking Changes**: NONE (internal refactoring only)
- **Rollback Plan**: Git revert to working commit if needed
- **Testing**: File upload speed, message scrolling, voice playback

---

This plan restores the original event-driven architecture that worked correctly before commit 339b38a9, while keeping all the beneficial features that were added (token tracking, voice generation, etc.).