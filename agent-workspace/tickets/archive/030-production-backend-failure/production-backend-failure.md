# Production Backend Failure - Root Cause Analysis

## 🎯 Issue Summary

**Problem**: My Jarvis Desktop production builds show `net::ERR_CONNECTION_REFUSED` when trying to connect to the backend server, despite backend appearing to start successfully.

**Symptoms**:
- Frontend shows: `Failed to load resource: net::ERR_CONNECTION_REFUSED 127.0.0.1:8081/api/projects`
- Backend logs show: `✅ Fork server ready on port 8081` and `Listening on http://127.0.0.1:8081/`
- `lsof` shows port 8081 is listening
- Direct `curl` to `127.0.0.1:8081` fails with connection refused

## 🔍 Comprehensive Investigation Completed

### What We Initially Thought vs Reality

**Initial Hypothesis**: Backend not starting due to wrapper/fork issues
**Reality**: Backend starts perfectly, but has connection binding problems

### Detailed Analysis Performed

#### 1. **Process Management Investigation**
- ✅ **Fixed**: Converted from incorrect `fork(javascript-file)` to proper `spawn('node', [script])`
- ✅ **Working**: Development mode uses `fork(tsx)` for TypeScript
- ✅ **Working**: Production mode uses `spawn('node')` for compiled JavaScript
- ✅ **Eliminated**: Problematic `electron-node.cjs` wrapper entirely

#### 2. **Backend Compilation & Execution**
- ✅ **Working**: `npm run build` creates `dist/cli/node.js` successfully
- ✅ **Working**: Direct execution: `node dist/cli/node.js --port 8082` works perfectly
- ✅ **Working**: Backend responds to API calls when run independently
- ✅ **Working**: Claude Code WebUI pattern implementation is correct

#### 3. **Electron Integration Testing**
- ✅ **Backend Starts**: Logs show "Fork server spawned successfully"
- ✅ **Port Detection**: Logs show "✅ Fork server ready on port 8081"
- ✅ **Server Ready**: Logs show "Listening on http://127.0.0.1:8081/"
- ❌ **Connection Fails**: Despite all success indicators, connection refused

### Current Understanding

**The backend is working correctly**. The issue is in the **network binding or connection layer**.

#### Evidence Summary:
1. **Backend Process**: Spawns successfully (PID confirmed)
2. **Port Binding**: `lsof` shows port 8081 is listening
3. **Ready Signal**: Electron receives proper ready confirmation
4. **Curl Test**: External curl fails with connection refused
5. **Frontend**: React app gets `ERR_CONNECTION_REFUSED`

## 🚨 Root Cause Hypothesis

**Primary Suspect**: Network binding issue in Electron environment

**Possible Causes**:
1. **Binding Interface**: Server binding to wrong interface (not 127.0.0.1)
2. **Electron Sandboxing**: Security restrictions blocking localhost connections
3. **Process Context**: Node.js spawned process not inheriting proper network context
4. **Port Conflicts**: Race condition or port reuse issue

## 📊 Key Findings from Chat Session

### Claude Code WebUI vs Our Implementation
- **Their Pattern**: `node dist/cli/node.js` (direct execution)
- **Our Pattern**: `spawn('node', ['dist/cli/node.js'])` (Electron spawned)
- **Difference**: Execution context may affect network binding

### Working vs Broken States
- **Working**: Direct script execution outside Electron
- **Working**: Development mode (tsx fork)
- **Broken**: Production spawn from Electron process
- **Broken**: Any connection attempt to spawned backend

### Technical Details Discovered
- Runtime uses `@hono/node-server` for HTTP server
- Server creation appears successful in logs
- Process isolation may be causing binding issues
- Network layer problem, not application layer

## 🔧 Recommended Next Steps

### Immediate Investigation (Next Chat)
1. **Network Binding Analysis**
   - Check exact interface binding: `netstat -tulpn | grep 8081`
   - Test binding to `0.0.0.0` instead of `127.0.0.1`
   - Verify Hono server configuration in spawned context

2. **Electron Context Testing**
   - Test with different stdio configurations
   - Check if Electron sandboxing affects spawned processes
   - Try `utilityProcess` instead of `spawn`

3. **Process Isolation Investigation**
   - Compare environment variables between working/broken contexts
   - Check working directory and path resolution
   - Test with explicit networking permissions

### Implementation Options to Test
1. **Option A**: Fix binding interface in Hono configuration
2. **Option B**: Use Electron utilityProcess for better isolation
3. **Option C**: Implement HTTP server directly in main process
4. **Option D**: Use IPC bridge instead of HTTP localhost

### Debugging Commands Ready
```bash
# Test network binding
netstat -an | grep 8081
lsof -i :8081 -n

# Test server response
curl -v http://127.0.0.1:8081/api/projects
curl -v http://0.0.0.0:8081/api/projects

# Check process context
ps aux | grep node
```

## 📁 Files Modified in This Investigation

- `lib/conveyor/handlers/claude-fork-handler.ts` - Updated to use spawn/fork correctly
- `lib/claude-webui-server/cli/electron-node.cjs` - DELETED (wrapper removed)
- `package.json` - Version bumped to 1.2.4

## ✅ Progress Made

1. **Eliminated false leads** - Backend startup is working perfectly
2. **Identified real issue** - Network connection/binding problem
3. **Fixed process management** - Proper spawn/fork implementation
4. **Created reproducible test** - DMG v1.2.4 demonstrates the issue consistently
5. **Narrowed scope** - Problem is in network layer, not application layer

## 🎯 Next Chat Focus

**Primary Goal**: Fix the network binding/connection issue that prevents frontend from reaching the backend despite successful backend startup.

**Success Criteria**: Frontend can successfully connect to `127.0.0.1:8081` and load projects list.

---

**Session Date**: September 30, 2025
**Status**: Ready for network layer debugging
**Current Build**: v1.2.4 (reproduces issue consistently)
**Priority**: CRITICAL - Blocking production deployment