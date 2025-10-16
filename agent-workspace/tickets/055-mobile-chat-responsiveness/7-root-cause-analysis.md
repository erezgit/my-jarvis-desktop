# Mobile Chat Responsiveness - Root Cause Analysis

## Problem Statement

**User Report**: "When I open the mobile web app, the chat page looks fine. But when I click the entry field and enter something, then click send, everything jumps up. The entry field disappears."

**Works**: Desktop experience is perfect - messages slide down smoothly, input stays at bottom
**Broken**: Mobile experience - keyboard appearance causes layout jump, input field vanishes

## Root Cause: Layout Architecture Issues

### Current Implementation (Claude Code WebUI Base)

**File**: `app/components/ChatPage.tsx` (lines 465-466)

```tsx
<div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 transition-colors duration-300">
  <div className="max-w-6xl mx-auto p-3 sm:p-4 h-screen flex flex-col">
```

**Problems**:

1. **`min-h-screen` on outer container** - This allows the container to grow beyond viewport
2. **`h-screen` on inner container** - Fixed to `100vh`, doesn't account for mobile keyboard
3. **`100vh` doesn't adjust for mobile keyboard** - When keyboard appears, viewport "shrinks" but layout stays `100vh`
4. **No viewport height locking** - Mobile browsers resize viewport when keyboard appears, causing jumps

### Working Implementation (MyJarvis Frontend)

**File**: `spaces/my-jarvis-frontend/src/components/headless-chat.tsx` (line 142)

```tsx
<MobileScrollLock>
  <div className="flex flex-col min-w-0 h-full bg-background">
```

**File**: `spaces/my-jarvis-frontend/src/components/messages.tsx` (line 62)

```tsx
<div
  ref={containerRef}
  className="flex flex-col min-w-0 gap-6 flex-1 overflow-y-scroll pt-4 relative"
>
```

**Solutions Implemented**:

1. **`MobileScrollLock` wrapper** - Locks viewport height using CSS custom properties
2. **`h-full` instead of `h-screen`** - Works within parent container's height
3. **CSS custom property `--vh`** - Set to `window.innerHeight * 0.01`, only updates on orientation change (NOT keyboard)
4. **`flex-1` on messages container** - Takes available space between header and input
5. **`overflow-y-scroll` on messages** - Messages scroll, but input stays fixed at bottom
6. **Smart scroll management** - Uses `useScrollToBottom` hook with viewport detection

## Key Architectural Differences

### 1. Viewport Height Management

**Current (Broken)**:
```tsx
// Uses 100vh which changes when keyboard appears
<div className="h-screen flex flex-col">
```

**Working**:
```tsx
// Uses CSS custom property that ignores keyboard
<div style={{ height: 'calc(var(--vh, 1vh) * 100)' }}>
```

**MobileScrollLock Component** (`mobile-scroll-lock.tsx`):
```tsx
const setViewportHeight = () => {
  const vh = window.innerHeight * 0.01
  document.documentElement.style.setProperty('--vh', `${vh}px`)
}

// Only update on orientation change, not on resize (keyboard)
window.addEventListener('orientationchange', handleOrientationChange)
```

**Why This Works**:
- Sets viewport height ONCE on load
- Only updates on orientation change (landscape ↔ portrait)
- Ignores `resize` events from keyboard appearing
- Layout stays stable when keyboard shows

### 2. Scroll Container Architecture

**Current (Broken)**:
```tsx
// ChatMessages.tsx - line 122
<div className="flex-1 overflow-y-auto bg-neutral-50 dark:bg-neutral-900 py-1 sm:py-4 mb-3 sm:mb-6 flex flex-col">
```

**Problem**: `mb-3 sm:mb-6` creates fixed bottom margin, but input is separate component. When keyboard appears, this margin stays but input moves up with keyboard.

**Working**:
```tsx
// headless-chat.tsx structure:
<div className="h-full flex flex-col">  {/* Parent container */}
  <TokenBar />                          {/* Fixed header */}
  <Messages className="flex-1 overflow-y-scroll" />  {/* Scrollable middle */}
  <form className="flex mx-auto px-4 pb-4">  {/* Fixed footer */}
    <ChatInput />
  </form>
</div>
```

**Why This Works**:
- Three distinct zones: header (fixed), messages (flex-1 + scroll), input (fixed)
- Messages container uses `flex-1` to take ALL available space between header and input
- Input is INSIDE the flex container, not outside
- When keyboard appears, the whole container height stays locked via `--vh`
- Messages scroll UP inside their container, input stays at bottom

### 3. Scroll Behavior Management

**Current (Broken)**:
```tsx
// ChatMessages.tsx - lines 42-46
const scrollToBottom = () => {
  if (messagesEndRef.current && messagesEndRef.current.scrollIntoView) {
    messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
  }
};

useEffect(() => {
  scrollToBottom();
}, [messages]);
```

**Problem**: Simple scroll-to-bottom fires on every message change, doesn't track user scroll position or viewport visibility.

**Working**:
```tsx
// use-scroll-to-bottom.tsx
const { data: isAtBottom = false, mutate: setIsAtBottom } = useSWR(
  'messages:is-at-bottom',
  null,
  { fallbackData: false },
);

// messages.tsx - uses viewport detection
<motion.div
  ref={endRef}
  className="shrink-0 min-w-[24px] min-h-[24px]"
  onViewportLeave={onViewportLeave}  // User scrolled up
  onViewportEnter={onViewportEnter}  // User at bottom
/>
```

**Why This Works**:
- Tracks whether user is actively at bottom
- Only auto-scrolls if user hasn't manually scrolled up
- Uses Framer Motion's viewport detection for performance
- Respects user's scroll position
- SWR for global state management (works across components)

### 4. Input Container Position

**Current (Broken)**:
```tsx
// ChatPage.tsx structure:
<div className="h-screen flex flex-col">
  <Header className="flex-shrink-0" />
  <ChatMessages className="flex-1 overflow-y-auto mb-3 sm:mb-6" />
  <ChatInput />  {/* Separate, not in flex container properly */}
</div>
```

**Working**:
```tsx
// headless-chat.tsx structure:
<div className="h-full flex flex-col">
  <TokenBar />  {/* Fixed at top */}
  <Messages className="flex-1 overflow-y-scroll" />  {/* Grows to fill */}
  <form className="flex mx-auto px-4 pb-4">  {/* Fixed at bottom */}
    <ChatInput />
  </form>
</div>
```

**Key Difference**: Input is INSIDE the main flex container, not a sibling with margin. This keeps it anchored to the bottom of the locked viewport height.

## Technical Details from Working Implementation

### MobileScrollLock Component Features

1. **Viewport Height Locking**:
   ```tsx
   const vh = window.innerHeight * 0.01
   document.documentElement.style.setProperty('--vh', `${vh}px`)
   ```
   - Sets `--vh` CSS custom property
   - Only updates on `orientationchange`, NOT `resize`
   - This prevents layout jumps when keyboard appears

2. **Pull-to-Refresh Prevention**:
   ```tsx
   const handleTouchMove = (e: TouchEvent) => {
     const scrollableElement = document.querySelector('[data-scrollable="true"]')
     const isAtTop = scrollTop <= 0
     const isPullingDown = currentY > startY

     if (isAtTop && isPullingDown) {
       e.preventDefault()  // Prevent pull-to-refresh
     }
   }
   ```

3. **Orientation Change Handling**:
   ```tsx
   window.addEventListener('orientationchange', handleOrientationChange)
   ```
   - Recalculates height after orientation change
   - Maintains stable layout

### useScrollToBottom Hook

**Features**:
- Uses SWR for global state (`messages:is-at-bottom`)
- Viewport detection via Framer Motion
- Configurable scroll behavior (`smooth` vs `instant`)
- Tracks user intent (manual scroll vs automatic)

**Usage Pattern**:
```tsx
const { containerRef, endRef, onViewportEnter, onViewportLeave } = useScrollToBottom()

// Container gets the ref
<div ref={containerRef} className="overflow-y-scroll">

// End marker with viewport detection
<motion.div
  ref={endRef}
  onViewportEnter={onViewportEnter}
  onViewportLeave={onViewportLeave}
/>
```

## Summary: What's Broken vs What Works

### Current Claude Code WebUI (Broken on Mobile)

| Issue | Impact |
|-------|--------|
| Uses `h-screen` (100vh) | Doesn't adapt to keyboard |
| No viewport height locking | Layout jumps when keyboard appears |
| Simple `scrollIntoView` | No user scroll position tracking |
| Messages container has bottom margin | Input disconnected from layout |
| No `MobileScrollLock` wrapper | Pull-to-refresh, viewport instability |

### MyJarvis Frontend (Working on Mobile)

| Solution | Benefit |
|----------|---------|
| Uses `h-full` with locked `--vh` | Stable height regardless of keyboard |
| `MobileScrollLock` component | Prevents jumps, handles pull-to-refresh |
| Viewport detection with SWR | Smart auto-scroll that respects user |
| Proper flex architecture | Input fixed, messages scroll |
| Three-zone layout | Header, scrollable middle, fixed input |

## Recommended Fix

Apply the following MyJarvis Frontend patterns to Claude Code WebUI:

1. **Add MobileScrollLock wrapper** around ChatPage
2. **Replace `h-screen` with `h-full`** and use CSS custom property `--vh`
3. **Restructure layout** to proper three-zone flex architecture
4. **Implement `useScrollToBottom` hook** for smart scroll management
5. **Remove bottom margins** from messages container
6. **Ensure input is inside main flex container** not separate

This will bring mobile responsiveness to match desktop quality.
