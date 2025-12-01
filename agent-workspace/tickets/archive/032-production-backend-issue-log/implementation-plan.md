# Production Backend Issue Log

## Problem Statement
My Jarvis Desktop works perfectly in development but fails in production. The backend server starts but fails to handle requests properly, leading to ERR_CONNECTION_REFUSED or no response.

## Chronological Attempt Log

### 1. Initial Investigation (Sept 30, 2025)
**Issue**: Production build shows ERR_CONNECTION_REFUSED when frontend tries to connect to backend
**Finding**: Server starts successfully but crashes during first request
**Status**: ❌ Failed - Server process dies after startup

### 2. Claude CLI Path Detection Analysis
**Issue**: Server crashes with exit(1) during Claude CLI validation
**Finding**: Production environment can't find Claude CLI in PATH
**Status**: ❌ Failed - Child process has limited PATH access

### 3. Attempt: Pass Claude Path from Main Process (v1.2.8)
**Implementation**: Added `--claude-path` argument passing from main to child
**Finding**: Argument passed correctly but server still runs own detection
**Status**: ❌ Failed - Server ignores provided path

### 4. Attempt: Skip Detection When Path Provided (v1.3.0)
**Implementation**: Modified validation.ts to return early when customPath provided
**Finding**: Server logs show it receives and uses the path correctly
**Status**: ⚠️ Partial - Server stays alive but chat fails with "spawn node ENOENT"

## Current Status (v1.3.0)

### ✅ Working Components
- Main process Claude CLI detection: SUCCESS
- Server startup and basic API endpoints: SUCCESS
- Path passing from main to server: SUCCESS
- Server validation bypass: SUCCESS

### ❌ Failing Components
- Chat functionality: "spawn node ENOENT" error
- Claude Code SDK execution in packaged environment

### Latest Production Logs
```
[MAIN] Claude CLI detected and configured: {path} {
  path: '/Users/erezfern/Workspace/jarvis/spaces/my-jarvis-desktop/projects/my-jarvis-desktop/dist/mac-arm64/MyJarvisDesktop.app/Contents/Resources/app.asar.unpacked/node_modules/@anthropic-ai/claude-code/cli.js'
}
[MAIN] Starting Claude server with fork...
[MAIN] Forking server: {path} with args: {args}
```

## Root Cause Analysis

### Primary Issue Resolved ✅
- **Original Problem**: Server child process crashing with exit(1) during Claude CLI validation
- **Root Cause**: Child process in Electron production has limited PATH access
- **Solution**: Pass pre-detected Claude path from main process and skip validation

### New Issue Identified ❌
- **Current Problem**: Claude Code SDK fails with "spawn node ENOENT"
- **Root Cause**: SDK tries to spawn `node` executable but can't find it in packaged environment
- **Location**: Claude Code SDK internal process spawning

## Reference Project Analysis

### Claude Code WebUI Production Method
- **Deployment**: Standalone Deno binary with `deno compile`
- **Runtime**: Direct system execution with full PATH access
- **Dependencies**: All bundled into single executable
- **Environment**: Native system privileges

### Our Method
- **Deployment**: Electron packaged app with extraResources
- **Runtime**: Child process inside Electron sandbox
- **Dependencies**: External files in app.asar.unpacked
- **Environment**: Limited Electron container

## Next Steps Required

### 5. Fix Claude Code SDK Node Detection
**Approach**: Configure SDK to use correct node executable path in packaged environment
**Implementation**: Set `executable` and `executableArgs` in SDK query options
**Expected**: Chat functionality works in production

### Alternative Approaches to Consider
- Bundle node executable in extraResources
- Use different SDK configuration for production
- Modify environment variables for child process

## Technical Details

### Working Development Environment
- Node.js accessible in PATH
- Full system privileges
- Direct file system access

### Failing Production Environment
- Limited PATH in Electron child process
- Restricted file system access
- SDK can't locate node executable

### 6. FINAL RESOLUTION: process.execPath Fix (September 30, 2025) ✅

**Implementation**: Changed `executable: "node" as const` to `executable: process.execPath` in chat handler
**Root Cause**: Claude SDK was trying to spawn system `node` which doesn't exist in packaged Electron
**Solution**: Use Electron's bundled Node.js via `process.execPath` (standard Electron best practice)
**Testing**: Comprehensive development and production testing confirms full functionality

**Evidence of Success**:
- ✅ Development mode: Chat working with streaming responses
- ✅ Production build v1.3.0: Chat API responding correctly
- ✅ System initialization: Session management working
- ✅ Tool integration: Voice scripts and permissions functioning
- ✅ DMG package: 195MB installable ready for deployment

**Final Implementation**: `/lib/claude-webui-server/handlers/chat.ts:46`
```typescript
executable: process.execPath, // CRITICAL: Must use process.execPath for Electron packaging. DO NOT change to "node" - causes spawn ENOENT
```

---

### 7. NEW ISSUE DISCOVERED: Process Contamination (September 30, 2025) ❌

**Problem**: Backend server becomes unresponsive after accessing chat history, requiring process cleanup to recover
**Root Cause**: Fork-based server process gets corrupted/contaminated by history loading operations
**Impact**: Chat functionality breaks after history access, stays broken until external process cleanup

**Evidence**:
- ✅ Fresh app launch → Chat works perfectly
- ❌ Access chat history → History loading gets stuck
- ❌ Return to chat → Backend unresponsive (connection refused)
- ❌ App restart → Still broken
- ✅ External process cleanup (pkill, lsof) → Chat works again

**Architecture Analysis**:
- Our approach: Fork child process inside Electron (single point of failure)
- Reference project: Standalone Node.js server (stable environment)
- Key difference: Our server runs in unstable Electron child process context

## SOLUTION: Health Monitoring Implementation

### 8. Implement Server Health Monitoring (NEXT STEP)

**Approach**: Add health monitoring to current fork-based architecture
**Implementation**:
- Add `/health` endpoint to backend server
- Implement 5-second health check in main process
- Auto-restart server process on failure
- Maintain existing working architecture

**Code Changes Required**:
1. Add health endpoint to server (`app.ts`)
2. Add health monitoring to main process (`main.ts`)
3. Implement restart mechanism
4. Test production behavior

**Expected Result**: Self-healing server that automatically recovers from contamination

---

### 9. Health Monitoring Implementation Attempt (September 30, 2025) ⚠️

**Implementation**: Added comprehensive health monitoring system
- ✅ `/api/health` endpoint added to server
- ✅ 5-second health check interval in main process
- ✅ Automatic server restart on failure detection
- ✅ Process management with SIGTERM handling
- ✅ Version bumped to v1.4.0

**Code Changes**:
- `lib/claude-webui-server/app.ts`: Added health endpoint
- `lib/main/main.ts`: Added health monitoring with restart logic

**Testing Results**:
- ❌ Backend server not starting properly in production v1.4.0
- ❌ ERR_CONNECTION_REFUSED on fresh app launch
- ❌ Health monitoring code may have compatibility issues with Electron Node.js

**Key Insight**: The issue may be deeper than process contamination. Even fresh launches fail, suggesting fundamental compatibility problems with health monitoring implementation or AbortSignal.timeout() in Electron environment.

**Research Findings**:
- Analyzed Claude Code WebUI reference architecture
- Found they use standalone Node.js (not Electron child process)
- Confirmed child_process.fork() is valid 2025 Electron pattern
- Health monitoring is standard solution but needs Electron-compatible implementation

**Next Steps**:
- Debug health monitoring compatibility issues
- Consider simpler timeout implementation
- Test without AbortSignal.timeout()
- Focus on getting basic server startup working again

---

**Last Updated**: September 30, 2025 - 9:40 PM
**Current Version**: v1.4.0
**Status**: ❌ BROKEN - Health monitoring implementation preventing server startup