# Document 07: Terminal Size Synchronization Bug Analysis

**Date**: September 8, 2025  
**Status**: Root Cause Identified  
**Severity**: High - Causes complete terminal rendering failure until window resize  
**Discovery**: User reported that Claude works after manual window resize

---

## 🐛 THE BUG MANIFESTATION

### User Experience:
1. Launch the app → Terminal appears
2. Navigate to directory and run `claude`
3. Claude's TUI renders with:
   - Duplicate characters everywhere
   - Overlapping text
   - Multiple repeated UI elements
   - Completely broken interface
4. **User resizes window (even slightly)**
5. Terminal suddenly works perfectly!

### The Critical Clue:
The terminal transitions from broken to perfect **immediately upon window resize**, suggesting a dimension synchronization issue rather than a fundamental rendering problem.

---

## 🔍 ROOT CAUSE ANALYSIS

### The Architecture:
Our terminal system has two separate components that must agree on dimensions:

1. **Backend (PTY - Pseudo Terminal)**
   - Location: `lib/conveyor/handlers/terminal-handler.ts`
   - Creates the actual bash process
   - Handles input/output with the shell
   - **HARDCODED**: Starts with 80 columns × 30 rows

2. **Frontend (xterm.js)**
   - Location: `app/components/ProperTerminal.tsx`
   - Visual terminal display in the browser
   - Renders the terminal output
   - **DYNAMIC**: Calculates size based on DOM container

### The Problem Timeline:

#### 1. Application Startup (t=0ms)
```typescript
// Backend: terminal-handler.ts
const ptyProcess = pty.spawn(shell, [], {
  cols: 80,    // HARDCODED!
  rows: 30,    // HARDCODED!
  // ...
})
```

#### 2. Component Mount (t=50ms)
```typescript
// Frontend: ProperTerminal.tsx
componentDidMount() {
  this.initTerminal();
}
```

#### 3. Terminal Initialization (t=100ms)
```typescript
// Terminal opens and tries to fit
this.terminal.open(this.containerRef.current);
this.fitAddon.fit();  // PROBLEM: Container might not have final size!
```

#### 4. The Mismatch State (t=150ms)
- **PTY thinks**: Terminal is 80×30
- **xterm.js thinks**: Terminal is [actual container size] (maybe 120×40, or defaults)
- **Result**: Complete dimension mismatch

### Why Claude Breaks So Badly:

Claude's TUI sends ANSI escape sequences assuming specific dimensions:
- `\033[30A` - Move cursor up 30 lines (PTY's assumption)
- `\033[80C` - Move cursor right 80 columns
- `\033[2J` - Clear screen (based on assumed dimensions)

When xterm.js has different dimensions:
- Cursor movements go to wrong positions
- Text wraps at wrong points
- Clear commands miss portions of screen
- UI elements overlap and duplicate

### Why Resize Fixes Everything:

```typescript
// When window resizes:
handleResize = () => {
  if (this.fitAddon && this.terminal && this.state.isReady) {
    this.fitAddon.fit();  // Recalculates actual dimensions
    
    // CRITICAL: Sends real dimensions to PTY!
    window.electronAPI.send('terminal-resize', {
      id: this.termId,
      cols: this.terminal.cols,  // Real cols from xterm.js
      rows: this.terminal.rows   // Real rows from xterm.js
    });
  }
};
```

The resize event:
1. Recalculates actual terminal dimensions
2. **Sends these dimensions to PTY backend**
3. PTY updates its internal size
4. Both systems now agree on dimensions
5. Claude's ANSI codes work perfectly!

---

## 💡 THE CORE ISSUE

**The fundamental problem**: We initialize PTY with hardcoded 80×30 dimensions before we know the actual terminal container size. The initial `fit()` call might happen before the DOM is ready, leading to incorrect or default dimensions in xterm.js.

This creates a **dimension desynchronization** between:
- What the PTY thinks (80×30)
- What xterm.js actually is (unknown/different)

---

## 🛠️ RECOMMENDED SOLUTIONS

### Solution 1: Delayed Initialization (Simplest)
```typescript
componentDidMount() {
  // Wait for DOM to settle
  setTimeout(() => {
    this.initTerminal();
    // Trigger initial resize to sync dimensions
    this.handleResize();
  }, 100);
}
```

### Solution 2: Dynamic PTY Dimensions (Most Correct)
```typescript
// Calculate dimensions first, then create PTY
const dims = this.fitAddon.proposeDimensions();
window.electronAPI.send('terminal-create', {
  id: this.termId,
  cols: dims?.cols || 80,
  rows: dims?.rows || 30
});
```

### Solution 3: Force Initial Resize (Quick Fix)
```typescript
// After PTY connection
connectPty() {
  // ... existing code ...
  
  // Force a resize event to sync dimensions
  setTimeout(() => {
    this.handleResize();
  }, 50);
}
```

### Solution 4: Double Fit Pattern (Defensive)
```typescript
initTerminal() {
  // ... terminal setup ...
  
  // First fit
  this.fitAddon.fit();
  
  // Second fit after DOM settles
  requestAnimationFrame(() => {
    this.fitAddon.fit();
    this.handleResize();  // Sync with backend
  });
}
```

---

## 📊 DIMENSION FLOW DIAGRAM

```
CURRENT (BROKEN) FLOW:
├── PTY starts (80×30) ────┐
├── xterm.js starts ───────┼──> MISMATCH! → Broken rendering
├── fit() called (wrong?) ─┘
└── User resizes → fit() → sync → WORKS!

PROPOSED (FIXED) FLOW:
├── Container renders
├── Calculate real dimensions
├── Start PTY with real dims ─┐
├── xterm.js fits to container ┼──> SYNCHRONIZED! → Perfect rendering
└── Both agree on size ────────┘
```

---

## 🎯 VERIFICATION STRATEGY

To confirm this is the issue:
1. Log dimensions at each stage
2. Compare PTY dims vs xterm.js dims
3. Monitor when they synchronize
4. Verify fix eliminates the need for manual resize

---

## 📝 CONCLUSION

This is not a complex rendering bug or a fundamental incompatibility between Claude and xterm.js. It's a simple **timing and synchronization issue** where two systems start with different ideas about terminal dimensions. The fix is straightforward: ensure both systems agree on dimensions from the moment they start.

The fact that a simple window resize fixes everything confirms this analysis - we just need to replicate that synchronization at startup.

---

**Next Steps**: Implement Solution 3 (Force Initial Resize) as the quickest fix, then test more robust solutions.