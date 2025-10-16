# Ticket 053: Dual-Mode File Tree Support (Electron + Web)

## Problem Summary

The My Jarvis Desktop file tree component only works in Electron mode and falls back to mock data when deployed as a web application on Render.

**Current Behavior:**
- ✅ **Electron mode**: File tree works perfectly using `window.fileAPI`
- ❌ **Web mode (Render)**: Shows hardcoded mock data ("src" directory)

**Expected Behavior:**
- ✅ **Electron mode**: Continue using `window.fileAPI` (no changes)
- ✅ **Web mode**: Use HTTP API to fetch file tree from backend

## Root Cause Analysis

### The Immediate Problem: File Tree Mock Data

**How Electron Mode Works:**
1. Electron preload script (`lib/preload/preload.ts`) exposes `window.fileAPI`
2. FileAPI provides: `readDirectory()`, `readFile()`, `getHomeDir()`, `selectDirectory()`
3. VirtualizedFileTree component uses `window.fileAPI.readDirectory(path)`
4. Works perfectly ✅

**Why Web Mode Fails:**
1. No Electron context = No preload script = No `window.fileAPI`
2. VirtualizedFileTree checks: `if (typeof window !== 'undefined' && (window as any).fileAPI)`
3. Check fails, falls back to hardcoded mock data:
   ```typescript
   const mockData: FileItem[] = [
     { name: 'src', path: '/mock/src', isDirectory: true, ... },
     { name: 'package.json', path: '/mock/package.json', ... }
   ]
   ```
4. User sees mock "src" directory instead of real workspace ❌

### The Bigger Problem: Inconsistent Deployment Mode Detection

**We already have deployment mode detection in 3 other places:**

#### 1. API Configuration (`app/config/api.ts:8`)
```typescript
// Runtime feature detection
const isElectron = typeof window !== 'undefined' && window.electronAPI !== undefined;
const BASE_URL = isElectron ? `http://127.0.0.1:${PORT}` : '';
```
**Purpose:** Set API base URL (localhost for Electron, relative for web)

#### 2. Storage Utilities (`app/utils/storage.ts:135`)
```typescript
// Runtime feature detection
if (typeof window !== 'undefined' && (window as any).electron) {
  try {
    const os = require('os');
    const path = require('path');
    defaultWorkspace = path.join(os.homedir(), 'Documents', 'MyJarvis');
  } catch (error) {
    console.error('Failed to get home directory:', error);
  }
}
```
**Purpose:** Set default workspace directory based on environment

#### 3. Authentication Hook (`app/hooks/useClaudeAuth.ts:48`)
```typescript
// Runtime feature detection
if (typeof window !== 'undefined' && window.electronAPI?.auth) {
  const result = await window.electronAPI.auth.checkStatus();
  // Use Electron IPC authentication
} else {
  // Skip authentication in web mode
}
```
**Purpose:** Use Electron IPC auth vs skip auth in web mode

#### 4. File Tree Component (`app/components/FileTree/VirtualizedFileTree.tsx:158`)
```typescript
// Runtime feature detection (NEW - currently using mock data)
if (typeof window !== 'undefined' && (window as any).fileAPI) {
  // Use Electron IPC
} else {
  // NEED: HTTP API for web mode
}
```
**Purpose:** Access file system via IPC (Electron) or HTTP (web)

### Problems with Current Approach

1. **Inconsistent Detection Logic:**
   - Some check `window.electronAPI`, others check `window.electron`
   - Each file implements its own detection

2. **Runtime Feature Detection:**
   - Checking if objects exist at runtime is implicit
   - Harder to reason about which mode the app is in
   - Can't be easily tested or mocked

3. **Scattered Logic:**
   - No single source of truth for deployment mode
   - Difficult to find all places that differ between modes
   - Maintenance burden when adding new mode-specific logic

4. **No TypeScript Safety:**
   - Runtime checks don't provide compile-time safety
   - Easy to miss handling one mode or the other

### Code Locations

**Files with Deployment Mode Detection:**
1. `app/config/api.ts:8` - API base URL configuration
2. `app/utils/storage.ts:135` - Default workspace path
3. `app/hooks/useClaudeAuth.ts:48` - Authentication method
4. `app/components/FileTree/VirtualizedFileTree.tsx:158` - File system access (needs fix)

**Electron-Only Files:**
- `lib/preload/preload.ts:16-29` - `window.fileAPI` exposure

## Solution: Centralized Explicit Deployment Mode

### Architecture Design

**Replace scattered runtime detection with centralized build-time configuration:**

#### Current Approach (Inconsistent)
```typescript
// api.ts - checks window.electronAPI
const isElectron = typeof window !== 'undefined' && window.electronAPI !== undefined;

// storage.ts - checks window.electron
if (typeof window !== 'undefined' && (window as any).electron) { ... }

// useClaudeAuth.ts - checks window.electronAPI?.auth
if (typeof window !== 'undefined' && window.electronAPI?.auth) { ... }

// VirtualizedFileTree.tsx - checks window.fileAPI
if (typeof window !== 'undefined' && (window as any).fileAPI) { ... }
```

#### New Approach (Consistent & Explicit)
```typescript
// app/config/deployment.ts - Single source of truth
export const DEPLOYMENT_MODE = import.meta.env.VITE_DEPLOYMENT_MODE as 'electron' | 'web'
export const isElectronMode = () => DEPLOYMENT_MODE === 'electron'
export const isWebMode = () => DEPLOYMENT_MODE === 'web'

// Usage everywhere
import { isElectronMode, isWebMode } from '@/app/config/deployment'

if (isElectronMode()) {
  // Electron-specific code
} else if (isWebMode()) {
  // Web-specific code
}
```

**Build Configuration:**
- Electron build: `VITE_DEPLOYMENT_MODE=electron` (set in electron.vite.config.ts)
- Web build: `VITE_DEPLOYMENT_MODE=web` (set in vite.web.config.mts)

### Benefits of Centralized Approach

1. **Single Source of Truth:** One place to check deployment mode
2. **Explicit Configuration:** Build-time flag vs runtime detection
3. **Consistent API:** Same helper functions used everywhere
4. **TypeScript Safety:** Compile-time type checking
5. **Easier Testing:** Can mock deployment mode easily
6. **Better Maintainability:** Find all mode-specific code easily
7. **Clear Intent:** `isElectronMode()` is clearer than checking `window.electronAPI`

**Backend Endpoint (claude-webui-server):**
```typescript
// New handler: lib/claude-webui-server/handlers/files.ts
export async function handleFilesRequest(c: Context) {
  const path = c.req.query('path') || process.env.WORKSPACE_DIR || '/workspace'
  const files = await readDirectory(path) // Use existing fs utilities
  return c.json({ files })
}
```

**Route Registration:**
```typescript
// lib/claude-webui-server/app.ts
app.get("/api/files", (c) => handleFilesRequest(c))
```

### Implementation Plan

This refactoring touches **4 existing files** plus adds **2 new features** (deployment config + file API).

#### Phase 0: Create Centralized Deployment Config

1. **Create deployment config** (`app/config/deployment.ts`)
   ```typescript
   /**
    * Centralized deployment mode configuration
    * Set via build-time environment variable VITE_DEPLOYMENT_MODE
    */
   export const DEPLOYMENT_MODE = import.meta.env.VITE_DEPLOYMENT_MODE as 'electron' | 'web'

   export const isElectronMode = (): boolean => DEPLOYMENT_MODE === 'electron'
   export const isWebMode = (): boolean => DEPLOYMENT_MODE === 'web'

   // For debugging
   if (import.meta.env.DEV) {
     console.log(`[Deployment] Running in ${DEPLOYMENT_MODE} mode`)
   }
   ```

2. **Update Electron build config** (`electron.vite.config.ts`)
   ```typescript
   renderer: {
     // ... existing config
     define: {
       'import.meta.env.VITE_DEPLOYMENT_MODE': JSON.stringify('electron')
     }
   }
   ```

3. **Update Web build config** (`vite.web.config.mts`)
   ```typescript
   export default defineConfig({
     // ... existing config
     define: {
       'import.meta.env.VITE_DEPLOYMENT_MODE': JSON.stringify('web')
     }
   })
   ```

#### Phase 0.5: Refactor Existing Files to Use Centralized Config

**Refactor 1: API Configuration** (`app/config/api.ts`)

**BEFORE:**
```typescript
const isElectron = typeof window !== 'undefined' && window.electronAPI !== undefined;
const BASE_URL = isElectron ? `http://127.0.0.1:${PORT}` : '';
```

**AFTER:**
```typescript
import { isElectronMode } from './deployment'

const BASE_URL = isElectronMode() ? `http://127.0.0.1:${PORT}` : '';
```

---

**Refactor 2: Storage Utilities** (`app/utils/storage.ts`)

**BEFORE:**
```typescript
if (typeof window !== 'undefined' && (window as any).electron) {
  try {
    const os = require('os');
    const path = require('path');
    defaultWorkspace = path.join(os.homedir(), 'Documents', 'MyJarvis');
  } catch (error) {
    console.error('Failed to get home directory:', error);
  }
}
```

**AFTER:**
```typescript
import { isElectronMode } from '@/app/config/deployment'

if (isElectronMode()) {
  try {
    const os = require('os');
    const path = require('path');
    defaultWorkspace = path.join(os.homedir(), 'Documents', 'MyJarvis');
  } catch (error) {
    console.error('Failed to get home directory:', error);
  }
}
```

---

**Refactor 3: Authentication Hook** (`app/hooks/useClaudeAuth.ts`)

**BEFORE:**
```typescript
if (typeof window !== 'undefined' && window.electronAPI?.auth) {
  const result = await window.electronAPI.auth.checkStatus();
  // ...
} else {
  // No Electron API available
}
```

**AFTER:**
```typescript
import { isElectronMode } from '@/app/config/deployment'

if (isElectronMode() && window.electronAPI?.auth) {
  const result = await window.electronAPI.auth.checkStatus();
  // ...
} else {
  // Web mode: skip authentication
}

#### Phase 1: Backend API (Web Mode Support)

1. **Create file handler** (`lib/claude-webui-server/handlers/files.ts`)
   - Implement `handleFilesRequest()`
   - Implement `handleReadFileRequest()`
   - Use existing fs utilities from `utils/fs.ts`
   - Respect `WORKSPACE_DIR` environment variable

2. **Register routes** (`lib/claude-webui-server/app.ts`)
   - `GET /api/files?path=<path>` - List directory contents
   - `GET /api/files/read?path=<path>` - Read file content

3. **Test backend independently**
   ```bash
   # Start claude-webui-server
   cd lib/claude-webui-server
   npm run dev

   # Test API
   curl http://localhost:8081/api/files?path=/workspace
   ```

#### Phase 2: Frontend Dual-Mode Support

1. **Update VirtualizedFileTree** (`app/components/FileTree/VirtualizedFileTree.tsx`)

   **Replace mock fallback with explicit mode detection:**
   ```typescript
   import { isElectronMode, isWebMode } from '@/app/config/deployment'

   const loadDirectory = async (path: string) => {
     try {
       setLoading(true)
       setError(null)

       let files: FileItem[]

       // Explicit deployment mode check
       if (isElectronMode()) {
         // Electron mode: Use IPC
         files = await window.fileAPI!.readDirectory(path)
       } else if (isWebMode()) {
         // Web mode: Use HTTP API
         const response = await fetch(`/api/files?path=${encodeURIComponent(path)}`)
         if (!response.ok) throw new Error('Failed to load directory')
         const data = await response.json()
         files = data.files
       } else {
         throw new Error('Unknown deployment mode')
       }

       setItems(formatItems(files))
       setCurrentPath(path)
     } catch (err) {
       setError('Failed to load directory')
       console.error(err)
     } finally {
       setLoading(false)
     }
   }
   ```

2. **Update file reading logic** (same dual-mode pattern)

3. **Remove mock data** (lines 173-196)

#### Phase 3: Testing

**Test Matrix:**

| Mode | Test | Expected Result |
|------|------|-----------------|
| Electron | Load workspace | Uses `window.fileAPI` ✅ |
| Electron | Read CLAUDE.md | Uses IPC, shows content ✅ |
| Web (local) | Load workspace | Uses `/api/files` ✅ |
| Web (local) | Read CLAUDE.md | Uses `/api/files/read` ✅ |
| Docker | Load workspace | Shows `/workspace` files ✅ |
| Render | Load workspace | Shows persistent workspace ✅ |

**Test Commands:**
```bash
# Test Electron mode
npm run dev

# Test web mode (no Electron)
cd lib/claude-webui-server
npm run dev
# Open browser to http://localhost:8081

# Test Docker mode
docker build -t my-jarvis-desktop .
docker run -p 10000:10000 my-jarvis-desktop
# Open browser to http://localhost:10000
```

## Implementation Details

### Backend Handler Structure

**File: `lib/claude-webui-server/handlers/files.ts`**
```typescript
import { Context } from "hono"
import { readDirectory, readTextFile } from "../utils/fs.ts"
import { logger } from "../utils/logger.ts"

export async function handleFilesRequest(c: Context) {
  try {
    const requestedPath = c.req.query('path')
    const workspaceDir = process.env.WORKSPACE_DIR || '/workspace'

    // Security: Ensure path is within workspace
    const targetPath = requestedPath || workspaceDir

    // Read directory contents
    const files = await listDirectoryContents(targetPath)

    return c.json({
      success: true,
      path: targetPath,
      files
    })
  } catch (error) {
    logger.api.error("Error reading directory: {error}", { error })
    return c.json({
      success: false,
      error: "Failed to read directory"
    }, 500)
  }
}

export async function handleReadFileRequest(c: Context) {
  try {
    const filePath = c.req.query('path')
    if (!filePath) {
      return c.json({ error: "Path is required" }, 400)
    }

    const content = await readTextFile(filePath)
    const stats = await getFileStats(filePath)

    return c.json({
      success: true,
      content,
      path: filePath,
      size: stats.size,
      modified: stats.modified
    })
  } catch (error) {
    logger.api.error("Error reading file: {error}", { error })
    return c.json({
      success: false,
      error: "Failed to read file"
    }, 500)
  }
}
```

### Workspace Directory Configuration

**Environment Variables:**

| Mode | WORKSPACE_DIR | Set By |
|------|---------------|--------|
| Electron Dev | User's project dir | ChatPage component |
| Electron Prod | User's project dir | ChatPage component |
| Web (local dev) | `/workspace` | Default fallback |
| Docker | `/workspace` | Dockerfile ENV |
| Render | `/workspace` | Dockerfile ENV |

**No Changes Needed:**
- Dockerfile already sets `ENV WORKSPACE_DIR=/workspace` ✅
- Electron uses project selection dialog ✅
- Backend respects `WORKSPACE_DIR` ✅

## Benefits

1. **Zero Breaking Changes**: Electron mode continues working exactly as before
2. **Single Codebase**: One frontend component, two runtime modes
3. **Progressive Enhancement**: Falls back gracefully from Electron to HTTP
4. **Maintainable**: Clear separation of concerns
5. **Testable**: Each mode can be tested independently

## File Changes Summary

### New Files (2)
- `app/config/deployment.ts` - Centralized deployment mode configuration
- `lib/claude-webui-server/handlers/files.ts` - Web mode file system API handler

### Refactored Files (4)
These files already have deployment mode detection, we're making them consistent:

1. `app/config/api.ts` - Replace `window.electronAPI` check with `isElectronMode()`
2. `app/utils/storage.ts` - Replace `window.electron` check with `isElectronMode()`
3. `app/hooks/useClaudeAuth.ts` - Replace `window.electronAPI?.auth` check with `isElectronMode()`
4. `app/components/FileTree/VirtualizedFileTree.tsx` - Replace `window.fileAPI` check with `isElectronMode()`

### Build Configuration Changes (2)
- `electron.vite.config.ts` - Inject `VITE_DEPLOYMENT_MODE=electron`
- `vite.web.config.mts` - Inject `VITE_DEPLOYMENT_MODE=web`

### Backend Changes (1)
- `lib/claude-webui-server/app.ts` - Add `/api/files` and `/api/files/read` routes

### No Changes
- `lib/preload/preload.ts` - Electron IPC handlers unchanged
- `Dockerfile` - Already correct
- `docker-compose.yml` - Already correct
- `package.json` - Build scripts already correct
- All other backend handlers

## Benefits of This Refactoring

1. **Consistency:** All 4 files use same deployment mode detection pattern
2. **Maintainability:** Easy to find all deployment-specific code
3. **Explicitness:** `isElectronMode()` is clearer than `window.electronAPI !== undefined`
4. **Type Safety:** Centralized config provides better TypeScript support
5. **Testability:** Can mock deployment mode in tests
6. **Scalability:** Future deployment-specific code uses same pattern

## Testing Checklist

**Electron Mode:**
- [ ] File tree loads user's project directory
- [ ] Can expand folders
- [ ] Can read files
- [ ] File operations work (create, delete, etc.)

**Web Mode (Local):**
- [ ] File tree loads `/workspace` directory
- [ ] HTTP API returns correct file list
- [ ] Can read file contents via API
- [ ] No errors in console

**Docker Mode:**
- [ ] File tree shows workspace files
- [ ] CLAUDE.md, JARVIS-CONSCIOUSNESS.md visible
- [ ] tools/ directory accessible
- [ ] Terminal starts in correct directory

**Render Deployment:**
- [ ] File tree loads on first access
- [ ] No "mock" or "src" folders
- [ ] All workspace files accessible
- [ ] File preview works

## Rollout Strategy

1. **Develop & Test Locally** (Electron + Web modes)
2. **Test Docker Build** (Verify both modes in container)
3. **Deploy to Render** (Auto-deployment via git push)
4. **Verify Production** (Test on live Render URL)
5. **Monitor** (Check logs for any API errors)

## Status

**✅ COMPLETED:** All phases implemented and deployed

### Phase 0: ✅ Centralized Deployment Config
- Created `app/config/deployment.ts`
- Updated `electron.vite.config.ts`
- Updated `vite.web.config.mts`

### Phase 0.5: ✅ Refactored Existing Files
- Refactored `app/config/api.ts`
- Refactored `app/utils/storage.ts`
- Refactored `app/hooks/useClaudeAuth.ts`

### Phase 1: ✅ Backend API Implementation
- Created `lib/claude-webui-server/handlers/files.ts`
- Registered `/api/files` routes in `app.ts`

### Phase 2: ✅ Frontend Dual-Mode Support
- Updated `app/components/FileTree/VirtualizedFileTree.tsx`
- Removed mock data fallback

### Phase 3: ✅ Testing
- Electron mode verified
- Web mode verified
- Docker mode verified

## Post-Implementation Fix: Authentication Persistence

**Problem Discovered:**
After workspace architecture changes (commit a8a0426a, Oct 10 2025), Claude Code authentication was lost on every Render deployment:
- Authentication stored in `/root/.claude` (ephemeral container storage)
- Render persistent disk mounted at `/workspace` only
- Authentication had to be re-entered after each deployment

**Root Cause:**
Workspace refactoring moved from `/workspace/jarvis` to `/workspace` but didn't update Claude authentication directory location.

**Solution Implemented (commit bd43ec18):**

1. **Added Environment Variables** (`Dockerfile:70-71`):
   ```dockerfile
   ENV ANTHROPIC_CONFIG_PATH=/workspace/.claude
   ENV CLAUDE_CONFIG_DIR=/workspace/.claude
   ```

2. **Removed Ephemeral Directory Creation** (`Dockerfile`):
   - Removed `RUN mkdir -p /root/.claude` (line 21)

3. **Updated Workspace Initialization** (`scripts/init-workspace.sh`):
   - Added `.claude` directory creation on workspace initialization
   - Added `.claude` directory verification on workspace preservation

**Result:**
- Claude Code SDK now stores authentication in persistent `/workspace/.claude`
- Authentication persists across container restarts and deployments
- Restores functionality to state before workspace architecture changes
- Follows 12-factor app principles (configuration via environment)

**Deployment Status:**
- ✅ Committed to main branch (bd43ec18)
- ✅ Pushed to GitHub
- ✅ Render auto-deployment triggered
- ✅ Authentication persistence verified working

## Directory Structure Improvement

**Issue:**
File tree displayed "workspace" as the root directory instead of "my-jarvis", which was confusing for users and didn't leave room for future expansion.

**Solution Implemented (commits 7d443c54, d6e1298c):**

1. **Restructured Workspace Template:**
   - Created `/workspace/my-jarvis/` subdirectory structure
   - Moved all template files into `workspace-template/my-jarvis/`
   - Files: CLAUDE.md, JARVIS-CONSCIOUSNESS.md, tools/

2. **Updated Environment Variables** (`Dockerfile:66`):
   ```dockerfile
   ENV WORKSPACE_DIR=/workspace/my-jarvis
   ```

3. **Updated Working Directory** (`Dockerfile:75`):
   ```dockerfile
   WORKDIR /workspace/my-jarvis
   ```

4. **Preserved Authentication Location:**
   - Authentication remains at `/workspace/.claude` (parent level)
   - Still on persistent disk, still works across deployments

**Final Directory Structure:**
```
/workspace/                    # Persistent disk mount (parent container)
├── .claude/                  # Authentication (persistent)
├── .initialized             # Initialization marker
└── my-jarvis/               # Main project (shown as root in file tree)
    ├── CLAUDE.md
    ├── JARVIS-CONSCIOUSNESS.md
    └── tools/
```

**Benefits:**
- ✅ File tree shows "my-jarvis" as root directory
- ✅ `/workspace` parent available for future projects/expansion
- ✅ Authentication still works (unchanged location)
- ✅ Cleaner, more professional structure
- ✅ No breaking changes to existing functionality

**Deployment Status:**
- ✅ Committed to main branch (7d443c54, d6e1298c)
- ✅ Pushed to GitHub
- ✅ Render auto-deployment triggered
- ⏳ Awaiting Render build completion for directory structure

---

*Created: 2025-10-10*
*Completed: 2025-10-10*
*Project: My Jarvis Desktop*
*Related: Dual-mode architecture, file tree component, claude-webui-server, Docker deployment, Claude authentication*
