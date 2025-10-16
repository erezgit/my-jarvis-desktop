# Ticket 006: Open Source Electron + React + TypeScript Terminal Projects

**Date**: September 8, 2025
**Status**: Research Complete
**Purpose**: Find working examples of Electron apps with React/TypeScript and functioning terminals

## 10 Open Source Terminal Projects to Study

### 1. **Hyper Terminal** ⭐ BEST EXAMPLE
- **Repository**: https://github.com/vercel/hyper
- **Tech Stack**: Electron + React + Redux + TypeScript
- **Terminal**: xterm.js
- **Key Features**: 
  - Plugin system using React components
  - Redux state management (avoids React hooks issues!)
  - Canvas-based rendering with xterm.js
  - MIT License
- **Why Study This**: Most popular, actively maintained, solved React integration

### 2. **Wave Terminal** ⭐ MODERN APPROACH
- **Repository**: https://github.com/wavetermdev/waveterm
- **Tech Stack**: Electron + React/TypeScript (frontend) + Go (backend)
- **Terminal**: Custom implementation with Go backend
- **Key Features**:
  - AI integration
  - Rich file previews
  - Session persistence
  - Apache 2.0 License
- **Why Study This**: Modern architecture, separates concerns well

### 3. **Electerm** ⭐ WORKING REACT EXAMPLE
- **Repository**: https://github.com/electerm/electerm
- **Tech Stack**: Electron + React + xterm.js + node-pty
- **Terminal**: xterm.js with node-pty
- **Key Features**:
  - SSH/SFTP/FTP client
  - Multi-protocol support
  - 19.2k GitHub stars
  - MIT License
- **Why Study This**: Proven React + xterm.js integration

### 4. **mterm** ⭐ TYPESCRIPT FOCUS
- **Repository**: https://github.com/mterm-io/mterm
- **Tech Stack**: Electron + React + TypeScript
- **Terminal**: Custom TypeScript implementation
- **Key Features**:
  - TypeScript-based plugin system
  - Custom command system
  - Theme support
  - MIT License
- **Why Study This**: Full TypeScript implementation, modern patterns

### 5. **VTerm**
- **Repository**: https://github.com/vterm/vterm
- **Tech Stack**: Electron + Preact (React-like) + MobX
- **Terminal**: xterm.js
- **Key Features**:
  - Extensible with plugins
  - MobX state management
  - Lightweight Preact instead of React
- **Why Study This**: Alternative to React with Preact, MobX patterns

### 6. **Terminal Manager**
- **Repository**: https://github.com/pravosleva/terminal-manager
- **Tech Stack**: Electron + React + xterm.js + ssh2
- **Terminal**: xterm.js with ssh2
- **Key Features**:
  - Quick SSH connections
  - STDIN/STDOUT control
  - Simple implementation
- **Why Study This**: Simple, focused implementation to learn from

### 7. **Tabby** (Angular but valuable patterns)
- **Repository**: https://github.com/Eugeny/tabby
- **Tech Stack**: Electron + Angular + TypeScript
- **Terminal**: Custom implementation
- **Key Features**:
  - Plugin architecture
  - SSH/Serial support
  - 59k+ GitHub stars
  - MIT License
- **Why Study This**: Architecture patterns, even though Angular-based

### 8. **electron-react-boilerplate**
- **Repository**: https://github.com/electron-react-boilerplate/electron-react-boilerplate
- **Tech Stack**: Electron + React + TypeScript + Webpack
- **Terminal**: Can add xterm.js
- **Key Features**:
  - 23.6k GitHub stars
  - Production-ready setup
  - Hot reload
  - MIT License
- **Why Study This**: Best practices for Electron + React setup

### 9. **guasam/electron-react-app**
- **Repository**: https://github.com/guasam/electron-react-app
- **Tech Stack**: Electron + React + Vite + TypeScript + shadcn/ui
- **Terminal**: Ready for xterm.js integration
- **Key Features**:
  - Modern Vite build
  - shadcn/ui components
  - TypeScript
  - MIT License
- **Why Study This**: Modern build tools, same stack we're using

### 10. **Terminus** (Legacy but educational)
- **Repository**: https://github.com/Eugeny/terminus (old name for Tabby)
- **Tech Stack**: Electron + Angular
- **Terminal**: node-pty + custom
- **Key Features**:
  - SSH client
  - Split panes
  - Zmodem support
- **Why Study This**: Legacy patterns, what evolved into Tabby

## Key Patterns to Copy

### From Hyper (MOST IMPORTANT):
```javascript
// They use Redux to manage state, avoiding React re-render issues
// Terminal is rendered in a canvas, not DOM elements
// Plugin system uses React components safely
```

### From Wave Terminal:
```javascript
// Separate Go backend for terminal operations
// React only handles UI, not terminal logic
// Clean separation of concerns
```

### From Electerm:
```javascript
// Direct xterm.js + node-pty integration
// Proven to work with React
// Simple, straightforward approach
```

## Common Solutions to Our Problem

1. **Redux/MobX State Management**: Hyper and VTerm use external state management to avoid React re-render issues
2. **Canvas Rendering**: Hyper uses canvas element instead of DOM manipulation
3. **Backend Separation**: Wave uses Go backend, keeping React for UI only
4. **Preact Alternative**: VTerm uses Preact instead of React
5. **No StrictMode**: Most don't use React.StrictMode in production

## Recommended Approach

Based on this research, the best solution for our My Jarvis Desktop app:

1. **Copy Hyper's approach**: Use Redux for state management
2. **OR Copy Wave's approach**: Separate terminal logic to backend process
3. **OR Copy Electerm's simple integration**: Direct xterm.js without complications

## Next Steps

1. Clone Hyper repository and study their React + xterm.js integration
2. Look at their Redux store management for terminal state
3. Copy their terminal component structure
4. Adapt to our three-panel layout

---

**Research Time**: 45 minutes
**Recommendation**: Study Hyper's source code first - it's the most successful React + Electron + Terminal implementation