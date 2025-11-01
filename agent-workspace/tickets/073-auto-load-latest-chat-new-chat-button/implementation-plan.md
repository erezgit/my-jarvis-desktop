# Ticket 073: Auto-load Latest Chat + New Chat Button

## Status: ✅ COMPLETE

## Overview
Implement auto-loading of the latest chat on app refresh and add a "New Chat" button for explicitly starting fresh conversations.

## Problem Statement
Previously, refreshing the app would start a new empty chat, losing the current conversation context. With chat history now working, users expect the app to reload their most recent conversation on refresh.

## Solution Implemented

### Phase 0: Architecture Cleanup (Dual State Issue)
**Problem**: ChatPage had dual sessionId state management:
- Local `sessionId` state
- Context `currentSessionId`

This violated single source of truth and could cause race conditions.

**Fix**: Removed local sessionId state, use only context `currentSessionId`

### Phase 1: Auto-load Latest Chat on Refresh

**Implementation**:
1. Created `useLatestChat` hook (`app/hooks/useLatestChat.ts`)
   - Fetches latest conversation from histories API on mount
   - Returns `latestSessionId`, `loading`, and `error` states

2. Integrated in ChatPage:
   - Call `useLatestChat` to get latest session ID
   - Auto-set as `currentSessionId` when no session loaded
   - Existing `useAutoHistoryLoader` handles loading the conversation

**Key Code**:
```typescript
// ChatPage.tsx
const { latestSessionId, loading: latestLoading } = useLatestChat(
  getEncodedName() || undefined
);

useEffect(() => {
  if (!currentSessionId && latestSessionId && !latestLoading) {
    console.log('[CHATPAGE] Auto-loading latest chat:', latestSessionId);
    setCurrentSessionId(latestSessionId);
  }
}, [latestSessionId, latestLoading, currentSessionId, setCurrentSessionId]);
```

### Phase 2: New Chat Button

**Implementation**:
1. Added `resetChat` method to ChatStateContext
   - Clears messages, input, session ID, and all state

2. Created `handleNewChat` in ChatPage:
   - Aborts current request if in progress
   - Calls `resetChat()`
   - Resets token usage
   - Clears voice tracking

3. Added New Chat button to ChatHeader:
   - Shows when `hasMessages` is true
   - Uses PlusCircleIcon
   - Positioned on left side of header

4. Wired through ResponsiveLayout:
   - ChatPage exposes handler via `onNewChatReady` callback
   - ResponsiveLayout stores handler in state
   - Passes to both DesktopLayout and MobileLayout

**Key Code**:
```typescript
// ChatStateContext.tsx - resetChat method
const resetChat = useCallback(() => {
  setMessages([]);
  setInput("");
  setIsLoading(false);
  setCurrentSessionId(null);
  setCurrentRequestId(null);
  setHasShownInitMessage(false);
  setHasReceivedInit(false);
  setCurrentAssistantMessage(null);
}, []);

// ChatHeader.tsx - New Chat button
{onNewChat && hasMessages && (
  <button onClick={onNewChat} className="..." aria-label="Start new chat">
    <PlusCircleIcon className="w-5 h-5" />
    <span>New Chat</span>
  </button>
)}
```

### Phase 3: Welcome Message Flash Fix

**Problem**: When page loads/refreshes, welcome message briefly flashes before history loads, creating jarring UX.

**Root Cause**: Component initially renders with empty messages array → shows Greeting → then history loads → switches to messages

**Solution**: Add loading state awareness to greeting display logic
1. Pass `isCheckingForHistory` (latestLoading) to ChatMessages
2. Show Greeting only when: NOT checking AND NOT loading AND no messages
3. Show nothing during initial load to prevent flash

**Key Code**:
```typescript
// ChatMessages.tsx
const shouldShowGreeting = !isCheckingForHistory && !isLoadingHistory && messages.length === 0;

return (
  <div>
    {shouldShowGreeting ? (
      <Greeting />
    ) : messages.length > 0 ? (
      <>
        {messages.map(renderMessage)}
        {/* ... */}
      </>
    ) : null}
  </div>
);
```

**Deployment**: Version 1.33.9

### Phase 4: Chat Messages Fade-in Animation

**Feature**: Apply same fade-in animation to chat messages as welcome message uses

**Implementation**:
1. Import `framer-motion` in ChatMessages.tsx
2. Wrap messages container in `motion.div`
3. Use same animation pattern: `opacity: 0->1, y: 10->0`
4. Smooth visual transition when messages load

**Key Code**:
```typescript
<motion.div
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>
  {messages.map(renderMessage)}
  {/* ... */}
</motion.div>
```

**Deployment**: Version 1.34.0

### Phase 5: New Chat Auto-reload Bug Fix

**Problem**: Clicking "New Chat" button clears state but immediately reloads latest chat history instead of staying blank.

**Root Cause Analysis**:
1. User clicks New Chat → `resetChat()` runs → sets `currentSessionId` to null
2. useEffect in ChatPage watches `currentSessionId`
3. Condition: `if (!currentSessionId && latestSessionId && !latestLoading)`
4. Effect can't distinguish "initial app load" vs "user clicked New Chat"
5. Effect re-triggers and auto-loads latest chat
6. New chat action gets overridden by auto-load mechanism

**Solution**: Use ref to track initial load attempt
1. Add `hasAttemptedInitialLoad` useRef
2. Check ref in useEffect condition
3. Auto-load only runs once on mount
4. Never re-triggers when user actions set sessionId to null
5. Clear separation between initial load and user actions

**Key Code**:
```typescript
// ChatPage.tsx
const hasAttemptedInitialLoad = useRef(false);

useEffect(() => {
  if (!hasAttemptedInitialLoad.current && !currentSessionId && latestSessionId && !latestLoading) {
    console.log('[CHATPAGE] Auto-loading latest chat on initial mount:', latestSessionId);
    setCurrentSessionId(latestSessionId);
    hasAttemptedInitialLoad.current = true;
  }
}, [latestSessionId, latestLoading, currentSessionId, setCurrentSessionId]);
```

**Benefits**:
- Consistent with React best practices for one-time initialization
- No unnecessary state additions
- Clear separation between initial load and user-triggered actions
- Follows single responsibility principle

**Deployment**: Version 1.34.1

### Phase 6: Scroll Behavior Fix

**Problem**: When auto-loading latest chat or switching conversations, the app would perform a long animated scroll from top to bottom, creating poor UX.

**Initial Solution (Timing Issue)**: First tried using `isLoadingHistory` flag, but had timing problem:
- `historyLoading` becomes false when fetch completes
- Messages array updates after that
- Scroll happens with smooth mode (already switched back)

**Final Solution**: Smart bulk-load detection
1. Use a ref to track previous messages length
2. Detect bulk loads by checking messages added at once
3. If >3 messages added = history load (instant scroll)
4. If 1-3 messages added = streaming (smooth scroll)
5. Detection happens at exact moment messages change - no timing issues

**Key Code**:
```typescript
// ChatMessages.tsx
const prevMessagesLengthRef = useRef(0);

useEffect(() => {
  const prevLength = prevMessagesLengthRef.current;
  const currentLength = messages.length;
  const messagesAdded = currentLength - prevLength;

  // Bulk load detection: >3 messages = history, use instant scroll
  if (messagesAdded > 3) {
    setScrollBehavior('instant');
  } else if (messagesAdded > 0) {
    setScrollBehavior('smooth');
  }

  prevMessagesLengthRef.current = currentLength;
  handleNewMessage();
}, [messages, handleNewMessage, setScrollBehavior]);
```

## Files Changed

### New Files
- `app/hooks/useLatestChat.ts` - Hook to fetch latest conversation

### Modified Files
- `app/components/ChatPage.tsx`
  - Removed local sessionId state (dual state fix)
  - Integrated useLatestChat for auto-loading
  - Added handleNewChat callback
  - Exposed handler via onNewChatReady
  - Pass historyLoading to ChatMessages

- `app/components/chat/ChatMessages.tsx`
  - Added isLoadingHistory prop
  - Control scroll behavior based on loading state

- `app/contexts/ChatStateContext.tsx`
  - Added resetChat to interface

- `app/hooks/chat/useChatState.ts`
  - Implemented resetChat method

- `app/components/chat/ChatHeader.tsx`
  - Added New Chat button with PlusCircleIcon
  - Shows only when messages exist

- `app/components/Layout/ResponsiveLayout.tsx`
  - Store newChatHandler from ChatPage
  - Pass to layouts

- `app/components/Layout/DesktopLayout.tsx`
  - Accept onNewChat prop
  - Pass to ChatHeader

- `app/components/Layout/MobileLayout.tsx`
  - Added compact New Chat button

## Testing Checklist
- [x] App refresh loads latest chat automatically
- [x] New Chat button appears when messages exist
- [x] New Chat button clears all state and starts fresh
- [x] Switching conversations from history works correctly
- [x] Token usage resets on new chat
- [x] Voice tracking cleared on new chat
- [x] No animated scroll on history load
- [x] Smooth scroll for new streaming messages

## Deployment History
- Phase 1-2: Initial auto-load + New Chat button
- Phase 3: Welcome message flash fix - Version 1.33.9
- Phase 4: Chat messages fade-in animation - Version 1.34.0
- Phase 5: New Chat auto-reload bug fix - Version 1.34.1
- Phase 6: Scroll behavior fix - Version 1.33.8
- Deployed to: my-jarvis-erez-dev (https://my-jarvis-erez-dev.fly.dev)
- Also deployed to: my-jarvis-iddo (https://my-jarvis-iddo.fly.dev)

## Notes
- Single source of truth maintained (no dual state)
- Follows existing architectural patterns (fileUploadHandler pattern)
- Button placement in ChatHeader follows Chat/History button precedent
- Scroll behavior dynamically adapts to context
