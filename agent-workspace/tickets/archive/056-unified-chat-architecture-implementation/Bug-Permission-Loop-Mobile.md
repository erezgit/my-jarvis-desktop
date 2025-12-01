# Bug: Permission Popup Infinite Loop on Mobile

**Status:** 🐛 Root Cause Identified - Ready to Fix
**Priority:** High
**Discovered:** 2025-10-12
**Related:** Ticket #056 state lifting refactoring

---

## 🎯 Problem Summary

Permission popup appears in infinite loop on mobile browsers:
1. User clicks "Allow" on permission request
2. Popup closes
3. Request hangs briefly
4. Same permission popup appears again
5. Loop continues infinitely

**Environment:**
- ✅ **Desktop browser**: Works perfectly
- ❌ **Mobile browser**: Infinite loop
- User stays on chat panel (no view/panel switching)
- Testing on actual mobile device, not responsive testing

---

## 🔍 Root Cause Analysis

### The Critical Bug

**Location:** `ChatPage.tsx:277-298` + `usePermissions.ts:64-70`

```typescript
// ChatPage.tsx - handlePermissionAllow
const handlePermissionAllow = useCallback(() => {
  if (!permissionRequest) return;

  // Build updatedAllowedTools using allowToolTemporary
  let updatedAllowedTools = allowedTools;
  permissionRequest.patterns.forEach((pattern) => {
    updatedAllowedTools = allowToolTemporary(pattern, updatedAllowedTools);
  });

  closePermissionRequest();

  if (currentSessionId) {
    sendMessage("continue", updatedAllowedTools, true);  // ❌ Problem here!
  }
}, [permissionRequest, currentSessionId, sendMessage, allowedTools, allowToolTemporary, closePermissionRequest]);

// usePermissions.ts - allowToolTemporary
const allowToolTemporary = useCallback(
  (pattern: string, baseTools?: string[]) => {
    const currentAllowedTools = baseTools || allowedTools;
    return [...currentAllowedTools, pattern];  // ❌ Returns new array, NO state update!
  },
  [allowedTools],
);
```

### The Flow Breakdown

**What happens:**
1. User clicks "Allow" → `handlePermissionAllow` is called
2. Local variable `updatedAllowedTools` is built with new permissions
3. `closePermissionRequest()` clears the permission UI
4. `sendMessage("continue", updatedAllowedTools, true)` is called
5. `sendMessage` sends request with `allowedTools: updatedAllowedTools` (line 183)

**The problem:**
```typescript
// ChatPage.tsx:183 - Inside sendMessage
body: JSON.stringify({
  message: content,
  requestId,
  ...(currentSessionId ? { sessionId: currentSessionId } : {}),
  allowedTools: tools || allowedTools,  // ❌ Falls back to STATE allowedTools
  // ...
})
```

**Why it fails:**
- `allowToolTemporary` creates a NEW array but **never updates React state**
- The `updatedAllowedTools` is a **local variable** in the callback
- On mobile browsers, async/timing differences cause issues
- When backend checks permissions again, it sees **empty allowedTools state**
- Backend thinks permission was never granted → asks again → infinite loop

### Why Desktop Works But Mobile Fails

**Desktop:**
- Faster JavaScript execution
- Local variable `updatedAllowedTools` stays in scope during async operation
- Request completes before variable is garbage collected

**Mobile:**
- Slower execution or different browser optimizations
- Local variable might be garbage collected or lost
- Async `fetch` might not capture the local variable correctly
- Falls back to empty `allowedTools` state

---

## 🎯 The Fix Strategy

### Option 1: Update State in Temporary Allow (Recommended)

Make `allowToolTemporary` behave like `allowToolPermanent` by updating state:

```typescript
// usePermissions.ts
const allowToolTemporary = useCallback(
  (pattern: string, baseTools?: string[]) => {
    const currentAllowedTools = baseTools || allowedTools;
    const updatedAllowedTools = [...currentAllowedTools, pattern];
    setAllowedTools(updatedAllowedTools);  // ✅ Update state!
    return updatedAllowedTools;
  },
  [allowedTools],
);
```

**Pros:**
- Simple fix
- Ensures state is always up-to-date
- Fixes the root cause

**Cons:**
- Changes the semantic meaning of "temporary" (but temporary vs permanent is already unclear)

### Option 2: Use setAllowedTools Before sendMessage

Update state directly in the handler:

```typescript
// ChatPage.tsx
const handlePermissionAllow = useCallback(() => {
  if (!permissionRequest) return;

  let updatedAllowedTools = allowedTools;
  permissionRequest.patterns.forEach((pattern) => {
    updatedAllowedTools = allowToolTemporary(pattern, updatedAllowedTools);
  });

  // ✅ Update state explicitly
  setAllowedTools(updatedAllowedTools);

  closePermissionRequest();

  if (currentSessionId) {
    sendMessage("continue", updatedAllowedTools, true);
  }
}, [/* ... */]);
```

**Pros:**
- Explicit state update in handler
- Clear what's happening

**Cons:**
- Requires exposing setAllowedTools from usePermissions
- Duplicates logic

### Option 3: Pass updatedAllowedTools More Reliably

Ensure the local variable is properly captured:

```typescript
// ChatPage.tsx
const handlePermissionAllow = useCallback(() => {
  if (!permissionRequest) return;

  let updatedAllowedTools = allowedTools;
  permissionRequest.patterns.forEach((pattern) => {
    updatedAllowedTools = allowToolTemporary(pattern, updatedAllowedTools);
  });

  closePermissionRequest();

  if (currentSessionId) {
    // ✅ Use setTimeout to ensure variable is captured
    const toolsToSend = [...updatedAllowedTools];
    setTimeout(() => {
      sendMessage("continue", toolsToSend, true);
    }, 0);
  }
}, [/* ... */]);
```

**Pros:**
- Might fix timing issue

**Cons:**
- Hacky workaround
- Doesn't fix root cause
- Still relies on local variable

---

## 📝 Recommended Implementation: Option 1

**Step 1:** Update `allowToolTemporary` to persist state

```typescript
// usePermissions.ts
const allowToolTemporary = useCallback(
  (pattern: string, baseTools?: string[]) => {
    const currentAllowedTools = baseTools || allowedTools;
    const updatedAllowedTools = [...currentAllowedTools, pattern];
    setAllowedTools(updatedAllowedTools);  // ✅ Update state
    return updatedAllowedTools;
  },
  [allowedTools],
);
```

**Step 2:** No changes needed in ChatPage.tsx

The existing code will work correctly once state is updated:

```typescript
// This will now work because allowToolTemporary updates state
const handlePermissionAllow = useCallback(() => {
  if (!permissionRequest) return;

  let updatedAllowedTools = allowedTools;
  permissionRequest.patterns.forEach((pattern) => {
    updatedAllowedTools = allowToolTemporary(pattern, updatedAllowedTools);
  });

  closePermissionRequest();

  if (currentSessionId) {
    sendMessage("continue", updatedAllowedTools, true);
  }
}, [permissionRequest, currentSessionId, sendMessage, allowedTools, allowToolTemporary, closePermissionRequest]);
```

**Step 3:** Test on both desktop and mobile

---

## ✅ Verification Checklist

After implementing the fix:

### Desktop Testing
- [ ] Request permission for file operation → granted
- [ ] Same permission not asked again
- [ ] File operation completes successfully

### Mobile Testing
- [ ] Request permission for file operation → granted
- [ ] Popup closes and does NOT reappear
- [ ] File operation completes successfully
- [ ] No infinite loop

### Edge Cases
- [ ] Multiple permissions in quick succession
- [ ] Permission denied works correctly
- [ ] Permanent allow works correctly
- [ ] Switching between temporary and permanent

---

## 🚨 Critical Notes

### The Real Issue

This bug reveals a fundamental flaw in the temporary/permanent permission distinction:

- **Temporary**: Supposed to be "just this once" but was never clearing after use
- **Permanent**: Supposed to be "always" but implementation is identical to temporary now

After this fix, both temporary and permanent will update state. The only difference will be:
- Temporary: Permissions could be manually cleared later (but currently no mechanism exists)
- Permanent: Same behavior as temporary

### Future Improvement

Consider implementing true temporary permissions:
1. Store temporary permissions separately from permanent
2. Clear temporary permissions after each successful request
3. Or implement session-based temporary permissions that clear on new conversation

---

## 📈 Why This Happened

1. **State vs Local Variable Confusion**: Mixed React state with local variables
2. **Async Timing Assumptions**: Assumed local variables would survive async operations
3. **Platform Differences**: Desktop faster execution masked the bug
4. **Incomplete Testing**: Tested on desktop, missed mobile behavior
5. **Semantic Naming**: "Temporary" implied it wouldn't persist, but it needed to persist for the request

---

## 🎯 Expected Outcome

After fix:
- ✅ Permissions work on both desktop and mobile
- ✅ No infinite permission loops
- ✅ State properly updated on permission grant
- ✅ Async operations have access to updated permissions

---

**Ready to implement the fix!**
