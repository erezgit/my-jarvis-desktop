# Ticket #020: Message Flow Control Implementation Plan

## Status: 📋 READY FOR IMPLEMENTATION
**Date**: September 26, 2025
**Priority**: HIGH - Critical UX Issue

---

## Objective

Create a production-ready chat interface for My Jarvis Desktop by integrating the proven claude-code-webui system into a clean Electron app.

## Strategy

Build a new Electron app using the complete claude-code-webui frontend (9,270 lines of production code) combined with our proven backend server management architecture.

---

## Implementation Plan

### Phase 1: Clean Electron App Foundation

#### Step 1.1: Create New Electron Project
- [x] ✅ Create new Electron app in `/projects/my-jarvis-clean/`
- [x] ✅ Set up basic Electron structure (main, preload, renderer)
- [x] ✅ Configure build system (electron-vite)
- [x] ✅ Test basic Electron app launches successfully

#### Step 1.2: Copy claude-code-webui Frontend Entirely
- [x] ✅ Copy entire `/frontend/src/` directory from claude-code-webui
- [x] ✅ Copy `package.json` dependencies for React, TypeScript, Tailwind
- [x] ✅ Copy their complete component, hook, and utility systems
- [x] ✅ Install all required dependencies (`npm install`)

#### Step 1.3: Copy Proven Backend Management
- [x] ✅ Copy our backend server management code from current app:
  - [x] ✅ `/lib/conveyor/handlers/claude-fork-handler.ts`
  - [x] ✅ `/lib/claude-webui-server/` (our proven backend server)
  - [x] ✅ IPC communication setup and preload scripts
- [x] ✅ Copy backend server dependencies and configuration

#### Step 1.4: Basic Electron Integration
- [x] ✅ Create main Electron process that spawns backend server
- [x] ✅ Set up IPC handlers for server management
- [x] ✅ Replace their web routing with single-page Electron setup
- [x] ✅ Configure working directory to fixed path

### Phase 2: Test Basic Chat Functionality

#### Step 2.1: Remove React Router Dependencies
- [x] ✅ Replace `useNavigate`, `useLocation` with direct state management
- [x] ✅ Remove breadcrumb navigation and project selection UI
- [x] ✅ Simplify to single chat interface
- [x] ✅ Remove history view (keep for future enhancement)

#### Step 2.2: Test Core Communication
- [x] ✅ Verify Electron app starts without errors
- [x] ✅ Frontend loads claude-code-webui chat interface successfully
- [x] ✅ Backend integration re-enabled successfully
- [x] ✅ Test streaming responses and message processing

#### Step 2.3: Phase 2 Validation
- [x] ✅ **FRONTEND TESTING**: Chat interface loads in Electron app
- [x] ✅ Verify no React Router errors or crashes
- [x] ✅ Clean build process with reduced bundle size
- [x] ✅ Backend integration and Claude response testing (Phase 3)

**🎉 PHASE 2 SUCCESS CRITERIA ACHIEVED**:
- [x] ✅ Clean Electron app with claude-code-webui frontend
- [x] ✅ Chat interface loads without errors
- [x] ✅ React Router successfully removed
- [x] ✅ Build system working perfectly

### Phase 3: Voice Message Integration (Future)

#### Step 3.1: Add VoiceMessage Type
- [ ] Add VoiceMessage interface to their message type system
- [ ] Add voice message rendering components
- [ ] Integrate voice tool detection in UnifiedMessageProcessor

#### Step 3.2: Voice Tool Integration
- [ ] Detect jarvis_voice.sh tool usage
- [ ] Create voice messages from tool results
- [ ] Add audio playback functionality

---

## Architecture Overview

### What We're Building
```
Electron App
├── Frontend: claude-code-webui React system (complete)
├── Backend: Our proven Node.js server (child_process.fork)
├── IPC: Server management and lifecycle
└── Communication: HTTP localhost:8081 (no changes needed)
```

### Key Components
- **Frontend**: Their complete React/TypeScript chat system
- **Backend**: Our working claude-webui-server setup
- **Integration**: Remove routing, add Electron-specific features
- **Voice**: Phase 3 enhancement to their message types

---

## Success Metrics

### Phase 1 Success
- New Electron app builds and runs
- All dependencies installed correctly
- Backend server spawns successfully

### Phase 2 Success
- Chat interface loads without errors
- Messages send and receive correctly
- Claude Code SDK integration works
- Tool usage functions properly

### Phase 3 Success (Future)
- Voice messages integrate seamlessly
- Audio playback works correctly
- Voice tool correlation functions

---

## Next Actions

1. **Start Phase 1**: Create new Electron project structure
2. **Copy Systems**: Import claude-code-webui frontend and our backend
3. **Test Integration**: Verify basic functionality works
4. **Remove Routing**: Simplify for single-page Electron use
5. **User Testing**: Validate chat functionality

---

*Implementation plan for clean integration of claude-code-webui into Electron app*