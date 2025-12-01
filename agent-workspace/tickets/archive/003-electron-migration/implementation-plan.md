# Ticket 003: Electron Migration - Modern Terminal-Based AI Assistant

## Executive Summary
Migrate My Jarvis Desktop from Tauri to Electron, implementing a clean, production-ready architecture with React, TypeScript, and xterm.js terminal integration. Focus on simplicity, best practices, and security while maintaining the core vision of an AI-powered knowledge amplification tool.

## Research Findings (September 2025)

### Top MIT-Licensed Electron Boilerplates

#### 1. **electron-react-app** (Recommended) ⭐
- **License**: MIT
- **Stack**: Electron v37+, React v19, TypeScript v5.9, Vite v7, Tailwind CSS v4, Shadcn UI
- **Key Features**:
  - Type-safe IPC with Conveyor + Zod validation
  - Modern build tooling with Vite
  - Hot reload and VS Code debugging
  - Clean project structure
  - Quick start: `npx create-era-app@latest my-app`

#### 2. **electron-react-boilerplate**
- **License**: MIT
- **Stack**: Electron, React, React Router, Webpack, TypeScript
- **Stars**: 24k+ (most popular)
- **Key Features**:
  - Battle-tested in production
  - Extensive community support
  - Regular maintenance

#### 3. **Wave Terminal** (Reference Architecture)
- **License**: Apache-2.0
- **Stack**: Electron, React, TypeScript, Go backend
- **Architecture Insights**:
  - Monorepo structure
  - Clean separation of main/renderer processes
  - Integrated terminal with AI features
  - Drag-and-drop interface

### Terminal Integration Best Practices

#### xterm.js + node-pty Architecture
```javascript
// Main Process (main.js)
const pty = require('node-pty');
const shell = pty.spawn('bash', [], {
  name: 'xterm-color',
  cols: 80,
  rows: 30,
  cwd: process.env.HOME,
  env: process.env
});

// Renderer Process (terminal.jsx)
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

const term = new Terminal({
  cursorBlink: true,
  fontSize: 14,
  fontFamily: 'Menlo, Monaco, "Courier New", monospace',
  theme: {
    background: '#1e1e1e',
    foreground: '#d4d4d4'
  }
});
```

### Security Configuration (2025 Standards)
```javascript
// Secure BrowserWindow configuration
const mainWindow = new BrowserWindow({
  width: 1200,
  height: 800,
  webPreferences: {
    contextIsolation: true,      // Required for security
    nodeIntegration: false,      // Never enable for remote content
    sandbox: true,               // Additional security layer
    preload: path.join(__dirname, 'preload.js')
  }
});

// preload.js with contextBridge
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Terminal operations
  createTerminal: (config) => ipcRenderer.invoke('terminal:create', config),
  writeToTerminal: (id, data) => ipcRenderer.send('terminal:write', id, data),
  onTerminalData: (callback) => ipcRenderer.on('terminal:data', callback),
  
  // File operations
  readFile: (path) => ipcRenderer.invoke('fs:read', path),
  writeFile: (path, content) => ipcRenderer.invoke('fs:write', path, content),
  watchDirectory: (path) => ipcRenderer.invoke('fs:watch', path)
});
```

## Proposed Architecture

### Project Structure
```
my-jarvis-electron/
├── src/
│   ├── main/              # Electron main process
│   │   ├── index.ts       # Main entry point
│   │   ├── terminal.ts    # Terminal management
│   │   ├── ipc.ts         # IPC handlers
│   │   └── security.ts    # Security configurations
│   ├── renderer/          # React application
│   │   ├── App.tsx        # Main component
│   │   ├── components/
│   │   │   ├── Terminal.tsx      # xterm.js wrapper
│   │   │   ├── FileTree.tsx      # Left panel
│   │   │   ├── DocumentView.tsx  # Center panel
│   │   │   └── Chat.tsx          # Right panel (future)
│   │   ├── hooks/
│   │   │   ├── useTerminal.ts
│   │   │   └── useFileSystem.ts
│   │   └── styles/
│   ├── preload/           # Preload scripts
│   │   └── index.ts       # Context bridge API
│   └── shared/            # Shared types/utilities
│       └── types.ts
├── package.json
├── tsconfig.json
├── vite.config.ts
└── electron-builder.yml
```

### Core Components

#### 1. Terminal Component (Simple & Clean)
```tsx
// Terminal.tsx
import { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

export function TerminalView() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal>();
  
  useEffect(() => {
    if (!terminalRef.current) return;
    
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      theme: {
        background: '#0a0a0a',
        foreground: '#d4d4d4'
      }
    });
    
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();
    
    // Connect to backend
    window.electronAPI.createTerminal({ cols: term.cols, rows: term.rows });
    
    term.onData(data => {
      window.electronAPI.writeToTerminal('main', data);
    });
    
    window.electronAPI.onTerminalData((event, data) => {
      term.write(data);
    });
    
    xtermRef.current = term;
    
    return () => term.dispose();
  }, []);
  
  return <div ref={terminalRef} className="h-full w-full" />;
}
```

#### 2. Three-Panel Layout
```tsx
// App.tsx
import { TerminalView } from './components/Terminal';
import { FileTree } from './components/FileTree';
import { DocumentView } from './components/DocumentView';

export function App() {
  return (
    <div className="flex h-screen bg-gray-900">
      {/* Left Panel - File Tree */}
      <div className="w-64 border-r border-gray-800">
        <FileTree />
      </div>
      
      {/* Center Panel - Document/Terminal View */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1">
          <DocumentView />
        </div>
        <div className="h-80 border-t border-gray-800">
          <TerminalView />
        </div>
      </div>
      
      {/* Right Panel - Future Chat Interface */}
      <div className="w-80 border-l border-gray-800">
        {/* Placeholder for AI Chat */}
      </div>
    </div>
  );
}
```

## Implementation Plan

### Phase 1: Setup & Foundation (Day 1)
- [ ] Initialize Electron project with `electron-react-app` boilerplate
- [ ] Configure TypeScript, ESLint, and Prettier
- [ ] Set up secure Electron configuration
- [ ] Implement basic IPC communication

### Phase 2: Terminal Integration (Day 2)
- [ ] Install xterm.js and node-pty
- [ ] Create Terminal component
- [ ] Implement terminal IPC handlers
- [ ] Test terminal input/output

### Phase 3: UI Components (Day 3)
- [ ] Build three-panel layout
- [ ] Create FileTree component (static initially)
- [ ] Create DocumentView component (markdown preview)
- [ ] Style with Tailwind CSS v4

### Phase 4: Agent Integration (Day 4)
- [ ] Design agent communication protocol
- [ ] Implement file system operations
- [ ] Add file watching capabilities
- [ ] Create agent command interface

### Phase 5: Polish & Testing (Day 5)
- [ ] Add error boundaries
- [ ] Implement logging system
- [ ] Create development/production configs
- [ ] Package for distribution

## Key Decisions

### Why Electron over Tauri?
- **Pros**:
  - Mature ecosystem with extensive documentation
  - Better terminal integration (node-pty works natively)
  - Larger community and more examples
  - Easier debugging with Chrome DevTools
  - Native Node.js APIs available
  
- **Cons**:
  - Larger bundle size (~50-150MB vs ~10-30MB)
  - Higher memory usage
  - Requires more security configuration

### Technology Choices
- **Electron**: Latest stable (v37+)
- **React**: v19 with hooks
- **TypeScript**: v5.9+ for type safety
- **Vite**: Fast build tool
- **xterm.js**: Terminal emulation
- **node-pty**: Native pseudoterminal
- **Tailwind CSS v4**: Styling
- **Zod**: Runtime validation

## Security Considerations

1. **Context Isolation**: Always enabled
2. **Node Integration**: Disabled for renderer
3. **Sandbox**: Enabled for additional security
4. **Content Security Policy**: Restrict remote content
5. **Input Validation**: Zod schemas for IPC
6. **Preload Scripts**: Minimal API exposure

## Example Electron App Setup

```bash
# Quick start with modern boilerplate
npx create-era-app@latest my-jarvis-electron
cd my-jarvis-electron

# Install terminal dependencies
npm install xterm xterm-addon-fit xterm-addon-web-links
npm install node-pty

# Install additional tools
npm install @electron/rebuild
npm run rebuild  # Rebuild native modules for Electron

# Start development
npm run dev
```

## Success Metrics
- Terminal responds in <50ms
- Application starts in <2 seconds
- Memory usage <200MB idle
- Clean separation of concerns
- No security warnings in production

## Next Steps
1. Create example implementation
2. Test terminal integration
3. Build minimal viable prototype
4. Document learnings
5. Plan migration strategy

## References
- [electron-react-app](https://github.com/guasam/electron-react-app) - Modern starter
- [Wave Terminal](https://github.com/wavetermdev/waveterm) - Architecture reference
- [xterm.js](https://xtermjs.org/) - Terminal emulator
- [Electron Security](https://www.electronjs.org/docs/latest/tutorial/security) - Best practices
- [node-pty](https://github.com/microsoft/node-pty) - Pseudoterminal

---

*Ticket created: September 7, 2025*
*Status: Ready for implementation*