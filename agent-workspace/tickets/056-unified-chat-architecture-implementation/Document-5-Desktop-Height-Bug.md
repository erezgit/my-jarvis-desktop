# Document 5: Desktop Height Bug Investigation

**Date:** October 12, 2025
**Status:** 🐛 Bug Investigation
**Issue:** Desktop panels shrinking/growing uncontrollably
**Version:** 1.27.0

---

## 🐛 Bug Description

After implementing the unified chat architecture (Phases 1-3), a critical bug was discovered in the desktop layout where the three-panel container (Files, Preview, Chat) exhibits incorrect height behavior:

### Symptoms
1. **Initial Load**: Container starts at approximately half screen height
2. **Content Growth**: As content is added (files expand, messages added), the container grows indefinitely
3. **Overflow**: Chat input field scrolls out of view below the screen
4. **Mobile Unaffected**: Mobile layout works correctly with proper height constraints

---

## 🔍 Root Cause Analysis

### The Problem
The `PanelGroup` in DesktopLayout uses `h-full` (height: 100%) but had no parent with a defined height to inherit from.

**Broken Height Chain:**
```
html (no height)
  → body (no height)
    → #root (no height)
      → App (no height)
        → ResponsiveLayout (no height)
          → DesktopLayout (no height)
            → PanelGroup h-full ❌ (no parent height → uses content height)
```

**Result:** PanelGroup sized itself based on content, starting small and growing uncontrollably as content expanded.

### Why Mobile Works
MobileLayout explicitly uses `h-dvh` (100dvh - dynamic viewport height) which sets an absolute height value, ignoring parent height:

```tsx
// MobileLayout.tsx line 120
<div className="h-dvh flex flex-col">
```

---

## ✅ Applied Fix (v1.27.0)

### Solution
Added `h-screen` wrapper around PanelGroup in DesktopLayout to provide a fixed viewport height.

**File:** `app/components/Layout/DesktopLayout.tsx`
**Line:** 127

```tsx
// BEFORE (broken)
return (
  <PanelGroup direction="horizontal" className="h-full">
    {/* panels */}
  </PanelGroup>
)

// AFTER (fixed)
return (
  <div className="h-screen">
    <PanelGroup direction="horizontal" className="h-full">
      {/* panels */}
    </PanelGroup>
  </div>
)
```

### How It Works
- `h-screen` = `height: 100vh` (100% of viewport height)
- PanelGroup's `h-full` now inherits this fixed height
- Panels constrained to viewport, no uncontrolled growth

---

## 🧪 Testing Results

### Development Build (v1.27.0)
- ✅ Desktop panels render at full viewport height
- ✅ No uncontrolled growth with content expansion
- ✅ Chat input stays visible at bottom
- ✅ Mobile layout unchanged and working

### Production Build (v1.27.0)
- ⚠️ **UNEXPECTED**: Production build shows shrinking behavior again
- 🤔 **MYSTERY**: Development build works correctly with same code
- 🔄 **STATUS**: Under investigation

---

## 🔬 Current Investigation

### Observations
1. Development build renders correctly with `h-screen` fix
2. Production build exhibits original shrinking bug despite having identical code
3. Source code confirmed to have `h-screen` wrapper (line 127)
4. Mobile remains unaffected in both builds

### Hypotheses
1. **Build Configuration**: Possible difference in Vite build settings between dev/prod
2. **CSS Processing**: TailwindCSS processing might differ between builds
3. **Bundling**: Webpack/Vite bundling may affect CSS application
4. **Hot Reload Artifacts**: Development mode hot reload vs production static build

### Next Steps
- [ ] Compare compiled CSS output between dev and production builds
- [ ] Check Vite build configuration for height-related optimizations
- [ ] Inspect bundled CSS in production build
- [ ] Verify TailwindCSS purge/minification settings
- [ ] Test alternative height constraints (h-dvh, min-h-screen, explicit px values)

---

## 📊 Impact Assessment

### Severity: High 🔴
- Desktop users cannot use the application properly
- Input field inaccessible when scrolled out of view
- Breaks core functionality on desktop platform

### Scope
- **Affected**: Desktop layout only
- **Unaffected**: Mobile layout (works correctly)
- **Versions**: Production builds (development works)

---

## 🔄 Temporary Workarounds

### For Users
1. Use development build (`npm run dev`) which works correctly
2. Keep minimal content in chat to prevent overflow
3. Use browser DevTools to manually add height styles

### For Developers
- Continue using development mode for testing
- Production deployment blocked until resolved

---

## 📝 Technical Details

### Code References
- **File**: `app/components/Layout/DesktopLayout.tsx`
- **Fixed Line**: 127 (added `h-screen` wrapper)
- **Commit**: `7cd46641` - "fix: Desktop layout height constraint (Ticket #056)"
- **Version**: 1.27.0

### Related Files
- `app/components/Layout/ResponsiveLayout.tsx` - Parent layout switcher
- `app/components/ChatPage.tsx` - Chat component with `h-full`
- `app/styles/global.css` - Global CSS (no height styles)
- `app/index.html` - Root HTML structure

---

## 🎯 Resolution Criteria

Issue will be considered resolved when:
- [ ] Production build renders desktop panels at full viewport height
- [ ] No shrinking/growing behavior with content changes
- [ ] Chat input remains visible and accessible
- [ ] Mobile layout continues working correctly
- [ ] Behavior consistent between dev and production builds

---

## 🔗 Related Documentation
- [Phase-3-Layouts.md](./Phase-3-Layouts.md) - Original layout integration
- [Phase-4-Testing.md](./Phase-4-Testing.md) - Testing checklist
- Git Commit: `7cd46641` - Desktop height fix

---

**Status:** Investigating production build discrepancy
**Priority:** High - Blocking production deployment
**Next Action:** Analyze build output differences
