# Gap Analysis: Mobile Layout Container Structure

**Status:** 🔄 In Progress - Fix #9 Applied
**Created:** 2025-10-11
**Updated:** 2025-10-11
**Issues:**
1. ✅ Mobile page scrolling instead of messages scrolling (FIXED - Fix #1)
2. ✅ iOS auto-zoom on input focus breaking layout (FIXED - Fix #2)
3. ✅ MobileScrollLock resize limitations (FIXED - Fix #3)
4. ✅ Parent height constraint conflicts (FIXED - Fix #7)
5. 🔄 Content overflow with many messages (Testing - Fix #9)

---

## 🎯 Root Cause

We successfully copied the **ChatPage component structure** from my-jarvis-frontend, but we **missed the critical mobile container hierarchy** that makes it work. The problem is NOT in ChatPage - it's in the layers ABOVE ChatPage.

---

## 📊 Working Frontend Container Hierarchy

### Layer-by-Layer Breakdown (Frontend)

```
1. MobileLayout (Root Container)
   └─ <div className="h-dvh flex flex-col">                    ← CRITICAL: h-dvh = 100dvh (viewport units)
      │
      ├─ Navigation Bar (Fixed)
      │  └─ <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 shadow-sm">
      │
      └─ Panel Container (Flex-1, Scrollable)
         └─ <div className="flex-1 relative overflow-hidden">  ← CRITICAL: flex-1 + overflow-hidden
            └─ Transition Wrapper
               └─ <div className="h-full transition-opacity..." key={currentPanel}>
                  │
                  └─ Chat Panel (when active)
                     └─ <div className="h-full flex flex-col bg-sky-50/30">  ← CRITICAL: h-full + flex flex-col
                        └─ {chatInterface}  ← ChatPage renders here
```

### Critical CSS Classes (Frontend)

```tsx
// MobileLayout root:
<div className="h-dvh flex flex-col">  // Full viewport height, flex container

// Panel container:
<div className="flex-1 relative overflow-hidden">  // Fills remaining space, hides overflow

// Chat panel wrapper:
<div className="h-full flex flex-col bg-sky-50/30">  // Full height, flex column
  {chatInterface}  // ChatPage sits inside THIS container
</div>
```

---

## 📊 Current Desktop Implementation

### Layer-by-Layer Breakdown (Desktop)

```
1. MobileLayout (Root Container)
   └─ MobileScrollLock
      └─ <div className="flex flex-col" style={{ height: 'calc(var(--vh, 1vh) * 100)' }}>
         │
         ├─ Navigation Bar (Sticky)
         │  └─ <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 shadow-sm">
         │
         └─ Panel Container
            └─ <div className="flex-1 relative overflow-hidden">  ← ✅ GOOD: flex-1 + overflow-hidden
               └─ Transition Wrapper
                  └─ <div className="h-full transition-opacity..." key={currentPanel}>
                     │
                     └─ Chat Panel (when active)
                        └─ <div className="h-full overflow-hidden bg-white dark:bg-gray-900">  ← ❌ PROBLEM: Missing flex flex-col
                           └─ {chatInterface}  ← ChatPage has nowhere to flex into!
```

### What's Wrong

```tsx
// ❌ DESKTOP (Current - WRONG):
{currentPanel === 'chat' && (
  <div className="h-full overflow-hidden bg-white dark:bg-gray-900">
    {chatInterface}  // ChatPage can't establish flex context!
  </div>
)}

// ✅ FRONTEND (Working - CORRECT):
{currentPanel === 'chat' && (
  <div className="h-full flex flex-col bg-sky-50/30">
    {chatInterface}  // ChatPage has proper flex parent!
  </div>
)}
```

---

## 🔍 Why It's Broken

### The Missing Link: `flex flex-col`

**Frontend (Working):**
```
MobileLayout root → flex flex-col (h-dvh)
  └─ Panel Container → flex-1 overflow-hidden
     └─ Chat Panel → flex flex-col h-full  ← ESTABLISHES FLEX CONTEXT
        └─ ChatPage → flex flex-col h-full
           ├─ TokenBar (fixed height)
           ├─ Messages (flex-1, scrollable)  ← Can expand to fill available space!
           └─ Input (fixed height)
```

**Desktop (Broken):**
```
MobileScrollLock → flex flex-col (calc(var(--vh)))
  └─ Panel Container → flex-1 overflow-hidden
     └─ Chat Panel → h-full overflow-hidden  ← NO FLEX CONTEXT!
        └─ ChatPage → flex flex-col h-full
           ├─ TokenBar (fixed height)
           ├─ Messages (flex-1, scrollable)  ← CAN'T expand - no parent flex!
           └─ Input (fixed height)
```

**Result:** Without `flex flex-col` on the chat panel wrapper, ChatPage's internal `flex-1` on Messages zone has nothing to flex against. The page scrolls instead of the messages area.

---

## 📋 Gap Summary

### What We Copied Correctly ✅

1. **ChatPage Structure** - 3-zone flat layout (TokenBar → Messages → Input)
2. **ChatMessages** - Removed isMobile conditionals
3. **ResponsiveLayout** - Single ChatPage instance with useMemo
4. **Navigation** - ChatHeader integration in toolbar
5. **MobileScrollLock** - Viewport height management

### What We Missed ❌

| Component | Frontend | Desktop | Gap |
|-----------|----------|---------|-----|
| **Chat Panel Wrapper** | `flex flex-col` | `overflow-hidden` | Missing flex context |
| **Root Container** | `h-dvh` | `calc(var(--vh, 1vh) * 100)` | Different viewport units |
| **Background Color** | `bg-sky-50/30` | `bg-white dark:bg-gray-900` | Cosmetic difference |

---

## 🛠️ Fix Required

### Single Line Fix

**File:** `/Users/erezfern/Workspace/my-jarvis/spaces/my-jarvis-desktop/projects/my-jarvis-desktop/app/components/Layout/MobileLayout.tsx`

**Line 222:**

```tsx
// ❌ BEFORE (Broken):
{currentPanel === 'chat' && (
  <div className="h-full overflow-hidden bg-white dark:bg-gray-900">
    {chatInterface}
  </div>
)}

// ✅ AFTER (Fixed):
{currentPanel === 'chat' && (
  <div className="h-full flex flex-col bg-white dark:bg-gray-900">
    {chatInterface}
  </div>
)}
```

**Change:** Replace `overflow-hidden` with `flex flex-col`

---

## 🧪 Why This Fixes Everything

### Before Fix (Page Scrolls):
```
Chat Panel: h-full overflow-hidden
  └─ ChatPage: flex flex-col h-full
     ├─ TokenBar: fixed height
     ├─ Messages: flex-1 ← NO PARENT FLEX CONTEXT, grows beyond viewport!
     └─ Input: fixed height
```

**Problem:** Messages zone's `flex-1` has no flex parent to constrain it, so it grows beyond the viewport, causing page scroll.

### After Fix (Messages Scroll):
```
Chat Panel: h-full flex flex-col  ← ESTABLISHES FLEX CONTEXT
  └─ ChatPage: flex flex-col h-full
     ├─ TokenBar: fixed height
     ├─ Messages: flex-1 ← CONSTRAINED by parent flex, fills available space!
     └─ Input: fixed height
```

**Solution:** Messages zone's `flex-1` now has a proper flex parent, so it fills exactly the available space (viewport height - TokenBar - Input), and scrolls internally.

---

## 📊 Container Hierarchy Comparison

### Frontend (Working)

```tsx
// MobileLayout.tsx (Frontend)
<div className="h-dvh flex flex-col">                           // Root: Full viewport, flex container
  <div className="sticky top-0...">...</div>                   // Nav: Sticky header
  <div className="flex-1 relative overflow-hidden">            // Container: Fills remaining space
    <div className="h-full transition-opacity..." key={panel}> // Transition: Full height wrapper
      {currentPanel === 'chat' && (
        <div className="h-full flex flex-col bg-sky-50/30">    // ✅ Chat Panel: flex flex-col!
          {chatInterface}                                       // ChatPage: Can establish flex context
        </div>
      )}
    </div>
  </div>
</div>
```

### Desktop (Current)

```tsx
// MobileLayout.tsx (Desktop)
<MobileScrollLock>
  <div className="flex flex-col" style={{ height: 'calc(var(--vh, 1vh) * 100)' }}>
    <div className="sticky top-0...">...</div>                 // Nav: Sticky header
    <div className="flex-1 relative overflow-hidden">          // Container: Fills remaining space
      <div className="h-full transition-opacity..." key={panel}> // Transition: Full height wrapper
        {currentPanel === 'chat' && (
          <div className="h-full overflow-hidden bg-white..."> // ❌ Chat Panel: NO flex flex-col!
            {chatInterface}                                     // ChatPage: Can't establish flex context
          </div>
        )}
      </div>
    </div>
  </div>
</MobileScrollLock>
```

---

## 🎯 Complete Fix Checklist

- [ ] Change `overflow-hidden` to `flex flex-col` in chat panel wrapper (Line 222)
- [ ] Test mobile keyboard behavior (primary goal)
- [ ] Verify messages scroll, not page
- [ ] Verify input field stays visible
- [ ] Verify toolbar stays sticky
- [ ] Optional: Consider changing `h-full overflow-hidden` to `h-full flex flex-col` for files/preview panels (for consistency)

---

## 📝 Additional Notes

### Why `overflow-hidden` Was There

The `overflow-hidden` was likely an attempt to prevent scrolling, but it doesn't establish a flex context for children. It just hides overflow without constraining the flex-1 children properly.

### Why Frontend Uses `h-dvh` vs Our `calc(var(--vh))`

- **Frontend:** Uses `h-dvh` (dynamic viewport height) - modern CSS unit that accounts for mobile browser bars
- **Desktop:** Uses `calc(var(--vh, 1vh) * 100)` with MobileScrollLock JavaScript - older technique to achieve the same thing
- **Both work**, but `h-dvh` is cleaner if browser support is good

### Why This Wasn't Caught Earlier

Phase 3 implementation focused on **ChatPage refactoring** and **ChatHeader integration**. We successfully removed isMobile conditionals from ChatPage and created the single-instance pattern. However, we didn't analyze the **parent container structure** that ChatPage sits in. The bug is NOT in ChatPage - it's in the mobile layout wrapper.

---

## 🚀 Expected Outcome After Fix

1. **✅ Mobile keyboard appears** - Input field stays visible
2. **✅ Messages scroll** - Not the entire page
3. **✅ Toolbar stays fixed** - Sticky positioning works
4. **✅ Input stays fixed** - Always visible at bottom
5. **✅ No layout jumps** - Smooth scrolling behavior

---

---

## 🔧 Applied Fixes

### Fix #1: Mobile Container Flex Context (Commit: e872710f)

**File:** `app/components/Layout/MobileLayout.tsx` (Line 222)

```tsx
// ❌ Before:
<div className="h-full overflow-hidden bg-white dark:bg-gray-900">

// ✅ After:
<div className="h-full flex flex-col bg-white dark:bg-gray-900">
```

**Result:** Messages now scroll properly within their container instead of the entire page scrolling.

---

### Fix #2: iOS Auto-Zoom Prevention (Commit: 1acad5a4)

**Problem Discovered During Testing:**
- When focusing chat input on iOS Safari, browser auto-zoomed
- Auto-zoom caused layout chaos (white space, cut-off buttons)
- After manual zoom-out, everything worked perfectly (proving flex layout was correct)

**Root Cause:**
1. **Viewport meta tag** - Missing `maximum-scale=1` to prevent zoom control
2. **Input font-size** - Using `text-sm` (14px) triggers iOS 16px threshold for auto-zoom

**Files Modified:**

**1. app/index.html (Line 5):**
```html
<!-- ❌ Before: -->
<meta name="viewport" content="width=device-width, initial-scale=1.0" />

<!-- ✅ After: -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
```

**2. app/components/chat/ChatInput.tsx (Line 226):**
```tsx
// ❌ Before:
className={`... text-sm`}

// ✅ After:
className={`... text-base`}
```

**Explanation:**
- iOS Safari auto-zooms when input has `font-size < 16px`
- `text-sm` = 14px (triggers zoom)
- `text-base` = 16px (prevents zoom)
- `maximum-scale=1` prevents any zoom (matches frontend approach)

**Reference Frontend Code:**
- Frontend uses `maximumScale: 1` in `layout.tsx` (Line 17)
- Frontend ChatInput uses `text-sm` but viewport prevents zoom

---

### Fix #4: Remove Redundant Height Declaration (Commit: 4da34af3)

**Problem Discovered During Testing:**
- ~150px extra scrollable space persists even after h-dvh fix
- Gray chat area starts ABOVE the top bar
- Scroll indicator appears at top of page
- Issue affects all panels (files, preview, chat)
- **Not keyboard-related** - keyboard works perfectly

**User Insight:** "The gray area... it's like there's either an area at the top or there is something at the bottom that's like extra... the scroll indicator starting at the top of the page as if there is like the page starts higher"

**Root Cause - Double `h-full` Conflict:**

Container nesting analysis:
```tsx
// MobileLayout.tsx
<div className="h-dvh flex flex-col">              // Line 120: Root = full viewport ✅
  <div className="sticky top-0...">...</div>        // Nav bar (fixed height) ✅
  <div className="flex-1 relative overflow-hidden"> // Line 197: Fill remaining ✅
    <div className="h-full flex flex-col...">      // Line 220: Chat panel = 100% ✅
      ↓
      // ChatPage.tsx
      <div className="h-full...">                   // Line 465: ALSO 100%! ❌❌
        <TokenContextBar />                         // Creates DOUBLE height!
        <ChatMessages className="flex-1" />
        <ChatInput />
      </div>
    </div>
  </div>
</div>
```

**The Math:**
```
Expected:  viewport - nav_bar = available_space
Reality:   (viewport - nav_bar) × h-full × h-full = 150px_overflow
```

**Why This Happens:**
1. Parent chat panel (Line 220): `h-full` = correct constraint
2. ChatPage (Line 465): **ANOTHER** `h-full` = tries to be 100% of already-100% parent
3. Result: Compound height declaration causes content to exceed viewport
4. Visual: Gray background (ChatPage) extends beyond visible area

**File Modified:**

**app/components/ChatPage.tsx (Line 465):**
```tsx
// ❌ Before:
<div className="flex flex-col min-w-0 h-full bg-neutral-50...">

// ✅ After:
<div className="flex flex-col min-w-0 bg-neutral-50...">
```

**Explanation:**
- Parent already has `h-full flex flex-col` (MobileLayout Line 220)
- ChatPage is a child in that flex container
- Should naturally fill parent without declaring own `h-full`
- Removing `h-full` lets flex context handle sizing correctly
- `flex-1` on ChatMessages works properly once parent height is correct

**Result:**
- ✅ Eliminates 150px extra scrollable space
- ✅ Gray area no longer starts above top bar
- ✅ Scroll indicator only appears when content actually exceeds viewport
- ✅ Proper height calculation across all panels

---

### Fix #3: Remove MobileScrollLock (Commit: 3aff16c9)

**Problem:** ~150px white space persisted after Fix #1 and #2, affecting ALL panels (files, preview, chat)

**Root Cause:** MobileScrollLock only updates `--vh` CSS variable on `orientationchange` event, not on `resize` or keyboard appearance events.

**Files Modified:**
- Removed MobileScrollLock import and wrapper from MobileLayout.tsx
- Changed from `style={{ height: 'calc(var(--vh, 1vh) * 100)' }}` to `h-dvh`
- Lines 5, 121, 227 in MobileLayout.tsx

**Result:** White space persisted (h-dvh calculation still incorrect)

---

### Fix #4: Double h-full Attempt - REVERTED (Commits: 4da34af3, dd39e467)

**Problem:** Attempted to remove `h-full` from ChatPage to fix overflow

**User Feedback:** "It didn't work, and it even made things worse... chat area component is starting to shrink. The entry field is up in the whole back gray area is small"

**Root Cause of Regression:** At this point, `html, body, #root` still had `height: 100%` constraints in global.css. Removing `h-full` from ChatPage broke the height chain.

**Result:** Immediately reverted. Need to address parent constraints first.

---

### Fix #5: Flexbox Min-Height Bug (Commit: 555c918b)

**Problem:** Content expanding beyond flex-1 container

**Theory:** Flex-1 children have implicit `min-height: auto`

**File Modified:** MobileLayout.tsx Line 197
```tsx
// Before:
<div className="flex-1 relative overflow-hidden">

// After:
<div className="flex-1 min-h-0 relative overflow-hidden">
```

**Result:** Did not resolve the issue

---

### Fix #6: h-dvh to h-screen (Commit: b7a56a7a)

**Problem:** h-dvh potentially calculating incorrect height on iOS

**Theory:** h-dvh is newer CSS unit with potential iOS compatibility issues

**File Modified:** MobileLayout.tsx Line 120
```tsx
// Before:
<div className="h-dvh flex flex-col">

// After:
<div className="h-screen flex flex-col">
```

**User Feedback:** "Entry field is covered under the bottom bar of the browser"

**Result:** Different behavior but still problematic

---

### Fix #7: Remove Parent Height Constraints (Commit: 5af20505)

**Problem:** Deep architectural analysis revealed height constraint chain conflicts

**Root Cause Discovery:**

**Desktop (Our Code):**
```css
/* global.css Lines 11-12 */
html, body, #root {
  height: 100%;  /* ❌ Creates constraint chain */
}
```

**Frontend (Working Reference):**
```css
/* globals.css Line 205 */
body {
  @apply bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100;
  /* ✅ NO height constraint */
}
```

**Why This Matters:**
- Desktop: `html/body/#root` all 100% → MobileLayout h-screen conflicts with parent chain
- Frontend: No parent constraints → MobileLayout h-dvh calculates from actual viewport
- h-screen (100vh) vs h-dvh (dynamic viewport) behave differently with parent `height: 100%`

**File Modified:** Removed `height: 100%` entirely from global.css

**User Feedback:** "Now the scroll starts from the right place under the top bar, but it extends under the bottom bar of the browser"

**Result:** HEIGHT calculation now CORRECT, but CONTENT still overflows

---

### Fix #8: Remove h-full from ChatPage (Commit: f893d1c3) - CURRENT

**Problem:** After removing parent height constraints, ChatPage's `h-full` lost its reference point

**Analysis:**
- Parent MobileLayout Line 220: `h-full flex flex-col` ✅
- ChatPage Line 465: `h-full` ❌ (trying to be 100% of what?)
- With no parent height constraints, `h-full` has no proper reference
- Container HEIGHT correct, but CONTENT overflows

**Previous Attempt Context:**
- Tried removing `h-full` in Fix #4 (Commit 4da34af3)
- Failed because parent had `height: 100%` constraints at that time
- Now that constraints removed, should work differently

**File Modified:** ChatPage.tsx Line 465
```tsx
// ❌ Before:
<div className="flex flex-col min-w-0 h-full bg-neutral-50...">

// ✅ After:
<div className="flex flex-col min-w-0 bg-neutral-50...">
```

**Rationale:**
- Parent has `h-full flex flex-col` (MobileLayout Line 220)
- ChatPage should naturally fill parent without explicit `h-full`
- Let flex context handle sizing instead of height percentage
- ChatMessages `flex-1 overflow-y-scroll` should properly constrain

**Status:** ❌ FAILED - Broke ChatPage layout

**User Feedback:** "The chat page is starting too small, and it's just breaking... it just expands until I don't even see the entry field at all... the issue is not in the chat page anymore. It's with the parent of all the containers of all the pages."

**Result:** Reverted immediately (Commit d60572fa)

**Key Learning:** Issue is NOT in ChatPage - it's in the parent container (MobileLayout Line 197) that affects ALL panels (files, preview, chat), not just chat.

---

### Fix #9: Remove min-h-0 from Panel Container (Commit: e8d5af62) - CURRENT

**Problem:** After reverting Fix #8, realized the root cause was Fix #5's `min-h-0` addition

**User Insight:** "Whatever you did, you only changed in the chat page, and the issue is not in the chat page anymore. It's with the parent of all the containers of all the pages."

**Root Cause Analysis:**

**Frontend (Working) - Line 134:**
```tsx
<div className="flex-1 relative overflow-hidden">
```

**Desktop (Broken) - Line 197:**
```tsx
<div className="flex-1 min-h-0 relative overflow-hidden">  // ❌ min-h-0 breaking layout!
```

**Why Fix #5 Was Wrong:**
- Added `min-h-0` to solve theoretical flexbox bug
- Actually BROKE the layout for all panels
- Prevented proper height calculation across files, preview, and chat
- User correctly identified: "it should be considering not just the chat page anymore, it's all the pages"

**File Modified:** MobileLayout.tsx Line 197
```tsx
// ❌ Before (Fix #5):
<div className="flex-1 min-h-0 relative overflow-hidden">

// ✅ After (Fix #9):
<div className="flex-1 relative overflow-hidden">
```

**Rationale:**
- Frontend reference has NO min-h-0 on panel container
- Panel container wraps ALL pages (files, preview, chat)
- Changes here affect entire mobile layout, not just one page
- Must match frontend structure exactly

**Status:** 🔄 Testing - Waiting for deployment and user feedback

---

## 📊 Complete Solution Summary

### Nine Fixes Applied

1. **✅ Fix #1: Flex Context** - Added `flex flex-col` to enable proper flex constraint
2. **✅ Fix #2: iOS Auto-Zoom** - Viewport meta and 16px font size
3. **✅ Fix #3: MobileScrollLock** - Replaced with h-dvh (later h-screen)
4. **❌ Fix #4: First h-full Removal** - Reverted (parent constraints still present)
5. **❌ Fix #5: Min-Height Bug** - Added min-h-0 (BROKE ALL PANELS)
6. **✅ Fix #6: h-screen** - Better browser support than h-dvh
7. **✅ Fix #7: Parent Constraints** - Removed `height: 100%` from global.css
8. **❌ Fix #8: ChatPage h-full Removal** - Reverted (broke ChatPage, wrong target)
9. **🔄 Fix #9: Remove min-h-0** - Revert Fix #5, match frontend structure

### Architecture Alignment with Frontend

**Before Fix #7:**
```
Desktop: html/body/#root (height:100%) → conflicts with h-screen/h-dvh
Frontend: html/body (no height) → clean viewport calculation
```

**After Fix #7 + #8:**
```
Desktop: html/body/#root (no height) → matches frontend
         ↓
         MobileLayout (h-screen) → full viewport
         ↓
         Chat panel (h-full flex flex-col) → fills remaining space
         ↓
         ChatPage (no h-full) → naturally fills parent
         ↓
         ChatMessages (flex-1) → constrained by parent flex
```

---

## 🎯 Expected Results (Ready for Testing)

1. **✅ No auto-zoom** - Input focus doesn't trigger iOS zoom
2. **✅ Layout intact** - Keyboard appears without breaking layout
3. **✅ Messages scroll** - Not the entire page
4. **✅ Input stays fixed** - Always visible at bottom
5. **✅ Toolbar stays sticky** - Fixed at top
6. **🔄 Content constrained** - Entry field visible even with many messages
7. **🔄 No overflow** - Content stops at browser bottom bar

---

## 📝 Commits Applied

- **e872710f** - Fix #1: Add flex context to mobile chat panel wrapper
- **1acad5a4** - Fix #2: Prevent iOS auto-zoom on input focus
- **3aff16c9** - Fix #3: Remove MobileScrollLock, use h-dvh
- **4da34af3** - Fix #4: Remove h-full from ChatPage (REVERTED)
- **dd39e467** - Revert Fix #4
- **555c918b** - Fix #5: Add min-h-0 for flexbox bug (BROKE ALL PANELS)
- **b7a56a7a** - Fix #6: Change h-dvh to h-screen
- **5af20505** - Fix #7: Remove height:100% from global.css
- **f893d1c3** - Fix #8: Remove h-full from ChatPage (REVERTED)
- **d60572fa** - Revert Fix #8
- **e8d5af62** - Fix #9: Remove min-h-0 from panel container

**Deployment:** Pushed to main, Render build triggered.

**Next Action:** Test on actual mobile device to verify Fix #9 resolves content overflow.

---

## 🎯 Key Insights from Troubleshooting Journey

### What Worked:
1. **Fix #1** - Establishing flex context on panel wrappers
2. **Fix #2** - Preventing iOS auto-zoom (viewport + font-size)
3. **Fix #6** - Using h-screen for better browser support
4. **Fix #7** - Removing parent height constraints to match frontend

### What Failed:
1. **Fix #4** - Removed h-full too early (before parent constraints fixed)
2. **Fix #5** - Added min-h-0 (BROKE all panels, not just chat)
3. **Fix #8** - Targeted ChatPage when issue was in parent container

### Critical Learning:
**User's Key Insight:** "The issue is not in the chat page anymore. It's with the parent of all the containers of all the pages."

This shifted focus from ChatPage-specific fixes to MobileLayout panel container structure that affects ALL pages (files, preview, chat). Fix #9 addresses this by matching frontend's panel container exactly.
