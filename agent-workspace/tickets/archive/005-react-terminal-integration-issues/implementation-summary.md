# Ticket 005: React Terminal Integration Issues

**Date**: September 8, 2025
**Status**: ❌ Blocked - Terminal rendering issues in React
**Project**: My Jarvis Desktop - Electron React Migration

## Executive Summary

We attempted to migrate the My Jarvis Desktop app from vanilla JavaScript to React + TypeScript using the electron-react-app template. While most components work well, we encountered persistent terminal rendering issues that cause duplicate characters and broken display.

## What We Tried

### 1. Initial Approach - Direct Port
- **Action**: Copied working terminal code from vanilla JS app to React component
- **Result**: Terminal displays duplicate characters, text overlaps, sizing broken
- **Issue**: React's rendering lifecycle conflicts with xterm.js DOM manipulation

### 2. Component Isolation
- **Action**: Created multiple terminal components:
  - `Terminal.tsx` - Using Conveyor IPC system
  - `SimpleTerminal.tsx` - Echo-only demo mode
  - `BasicTerminal.tsx` - Direct xterm initialization
  - `WorkingTerminal.tsx` - Exact copy of working vanilla code
  - `ProperTerminal.tsx` - With 100ms DOM delay
- **Result**: All versions exhibit the same rendering issues
- **Issue**: Problem persists regardless of implementation approach

### 3. Layout Simplification
- **Action**: Removed nested containers (Cards, Tabs, shadcn components)
- **Result**: Created `SimpleApp.tsx` and `CleanApp.tsx` with minimal layouts
- **Issue**: Terminal still breaks even with simple div containers

### 4. Research Findings
Investigated 20+ resources and found:
- **Successful Projects**: Hyper, VS Code, electerm all use xterm.js with Electron
- **React Wrappers**: All are outdated (2022 or older):
  - `react-xtermjs` - 7 months old
  - `xterm-for-react` - 2022
  - `@loopmode/xpty` - 2022
- **Current Library**: `@xterm/xterm` v5.5.0 (August 2025) is actively maintained

### 5. Architecture Attempts
- **Fixed dimensions**: 600px width container
- **Absolute positioning**: Inside relative parent
- **DOM delay**: 100ms timeout before fit()
- **Debounced resize**: Prevent excessive reflow
- **useRef management**: Ensure single instance

## Core Problem Analysis

The fundamental issue appears to be:

1. **Version Mismatch**: Our working vanilla app uses xterm v5.3.0 from CDN, while React uses @xterm/xterm ES modules
2. **DOM Timing**: React's virtual DOM updates conflict with xterm's direct DOM manipulation
3. **Container Constraints**: Even minimal React components add CSS/layout that breaks terminal sizing
4. **Fit Addon Issues**: The FitAddon doesn't calculate dimensions correctly in React context

## Current State

- ✅ Electron + React + TypeScript setup working
- ✅ IPC communication with node-pty functional
- ✅ File system operations ready
- ❌ Terminal rendering completely broken
- ❌ Cannot type or interact with terminal properly

## Recommended Next Steps

### Option 1: Use CDN Version (Most Likely to Work)
```javascript
// Load xterm from CDN in index.html like the working app
<script src="https://cdn.jsdelivr.net/npm/xterm@5.3.0/lib/xterm.js"></script>
<script src="https://cdn.jsdelivr.net/npm/xterm-addon-fit@0.8.0/lib/xterm-addon-fit.js"></script>

// Use global Terminal object instead of ES imports
const term = new window.Terminal({...})
```

### Option 2: Iframe Isolation
Create an iframe that loads a separate HTML file with the terminal, completely isolated from React:
- React app communicates with iframe via postMessage
- Terminal runs in vanilla JS environment
- No React interference with DOM

### Option 3: Web Component Approach
Wrap terminal in a Web Component (custom element):
- Encapsulates terminal DOM completely
- React treats it as a black box
- Shadow DOM prevents style conflicts

### Option 4: Investigate Successful Projects
Deep dive into how Hyper Terminal actually does it:
- Clone Hyper source code
- Study their React + xterm integration
- They must have solved this problem

### Option 5: Alternative Terminal Libraries
Consider alternatives to xterm.js:
- `hterm` (used by Chrome OS)
- `node-pty` with custom renderer
- Build minimal terminal from scratch

## Critical Questions to Answer

1. Why does the exact same code work in vanilla JS but not in React?
2. Is there a CSS reset or style conflict from the template?
3. Are we missing a critical webpack/vite configuration?
4. Should we disable React.StrictMode which causes double renders?

## Resources

- Working vanilla app: `/Users/erezfern/Workspace/jarvis/spaces/my-jarvis-desktop/projects/electron-terminal-three-panel/`
- React attempt: `/tmp/electron-react-migration/`
- electron-react-app template: https://github.com/guasam/electron-react-app

## Conclusion

Despite following documented best practices and trying multiple approaches, we cannot get xterm.js to render properly in a React + Electron environment. The issue appears fundamental to how React manages the DOM versus how xterm.js expects to control it.

The most pragmatic solution may be to either:
1. Use the CDN version exactly as the working app does
2. Isolate the terminal completely from React's influence
3. Keep the terminal in vanilla JS and only migrate other components to React

This is a critical blocker for the React migration and needs resolution before proceeding.

---

**Time Invested**: ~2 hours
**Recommendation**: Try Option 1 (CDN approach) first as it requires minimal changes and matches our working implementation exactly.