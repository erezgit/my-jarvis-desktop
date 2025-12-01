# Ticket #061: Voice Message Replay Bug Fix

**Status:** In Progress
**Priority:** High
**Created:** 2025-10-13
**Dependencies:** None

## Problem Description

Voice messages replay simultaneously when:
1. Switching between desktop and mobile views (screen resize)
2. Navigating between pages (chat → file directory → back to chat)
3. Any component remount that causes chat components to unmount/remount

## Root Cause

Desktop app uses component-level `useRef` to track played messages:
```typescript
// VoiceMessageComponent.tsx:15
const hasAutoPlayedRef = useRef<string | null>(null);
```

When components unmount/remount, the ref resets to `null`, causing all visible voice messages to think they haven't been played yet.

## Solution

Port the global singleton pattern from `my-jarvis-frontend`:

1. **Global Voice Played Tracker**: Singleton class that persists across component lifecycle
2. **Component Update**: Replace component-level ref with global tracker checks
3. **Conversation Clearing**: Explicitly clear tracker when switching conversations

## Implementation Files

### Files to Create
- `app/lib/voice-played-tracker.ts` - Global singleton tracker

### Files to Modify
- `app/components/messages/VoiceMessageComponent.tsx` - Use global tracker
- `app/components/ChatPage.tsx` - Clear tracker on conversation switch

## Testing Plan

1. **View Switch Test**: Desktop → Mobile → Desktop (verify no replay)
2. **Navigation Test**: Chat → File Directory → Chat (verify no replay)
3. **Conversation Switch Test**: Switch between conversations (verify tracker clears)
4. **Multi-Message Test**: Multiple voice messages in view (verify only new ones play)

## Success Criteria

- ✅ Voice messages play once and only once per session
- ✅ View switches do not trigger replay
- ✅ Page navigation does not trigger replay
- ✅ Conversation switches clear played state
- ✅ No simultaneous audio playback

## References

- Frontend implementation: `projects/my-jarvis-frontend/src/lib/voice-played-tracker.ts`
- Frontend component: `projects/my-jarvis-frontend/src/components/voice-message.tsx`
