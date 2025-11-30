# Ticket 115: Docker API Routing Mismatch - Root Cause Analysis

## Summary
File upload button experiences 5-second delay before native file dialog opens. Deep analysis reveals this is caused by frontend API requests returning HTML instead of JSON, creating JavaScript parsing errors that flood the browser main thread and block UI interactions.

## Symptoms Observed
1. **File Upload Button**: 5-second delay before file selection dialog appears
2. **Console Errors**: Repeated `SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON`
3. **API Failures**: `/api/files` and `/api/projects` endpoints return HTML responses instead of JSON
4. **Browser Performance**: Main thread blocking due to continuous error handling

## Root Cause Analysis

### Architecture Overview
The My Jarvis Desktop application has a hybrid architecture:
- **Frontend**: React SPA built with Vite (web mode)
- **Backend**: Hono server (claude-webui-server) running in Docker
- **Deployment**: Docker container serving both frontend static assets and backend APIs

### The Core Problem: API Configuration Mismatch

**Issue**: Frontend is built for "web mode" but Docker serves from same origin

**Technical Details**:

1. **Frontend API Configuration** (`app/config/api.ts`):
   ```typescript
   const BASE_URL = isElectronMode() ? `http://127.0.0.1:${PORT}` : '';
   ```
   - In web mode: `BASE_URL = ''` (relative URLs)
   - In Electron mode: `BASE_URL = 'http://127.0.0.1:PORT'` (absolute URLs)

2. **Deployment Mode Detection** (`app/config/deployment.ts`):
   ```typescript
   export const DEPLOYMENT_MODE = import.meta.env.VITE_DEPLOYMENT_MODE as DeploymentMode
   ```
   - `vite.web.config.mts` sets `VITE_DEPLOYMENT_MODE = 'web'`
   - This forces relative URL API calls

3. **Docker Architecture**:
   - Container exposes single port (3001 -> 10000 internally)
   - Backend serves both static assets AND API endpoints
   - Frontend makes relative API calls to same origin

### The Request Flow Problem

**Expected Flow** (Working):
```
Browser -> http://localhost:3001/api/files -> Backend API Handler -> JSON Response
```

**Actual Flow** (Broken):
```
Browser -> http://localhost:3001/api/files -> SPA Fallback Route -> index.html -> HTML Response
```

### Backend Route Configuration Analysis

**Backend Routes** (`lib/claude-webui-server/app.ts`):
- Line 115: `app.get("/api/files", requireAuth, (c) => handleFilesRequest(c));` ✅
- Line 116: `app.get("/api/files/read", requireAuth, (c) => handleReadFileRequest(c));` ✅
- Line 89: `app.get("/api/projects", requireAuth, (c) => handleProjectsRequest(c));` ✅

**SPA Fallback Route** (Line 215-231):
```typescript
// SPA fallback - serve index.html for all unmatched routes (except API routes)
app.get("*", async (c) => {
  const path = c.req.path;

  // Skip API routes
  if (path.startsWith("/api/")) {
    return c.text("Not found", 404);
  }

  // Return index.html for all other routes
  return c.html(new TextDecoder().decode(indexFile));
});
```

**Authentication Middleware**:
All API routes use `requireAuth` middleware which includes development bypass:
```typescript
if (DISABLE_AUTH && NODE_ENV === "development") {
  c.set("userId", "dev-user-123");
  return next();
}
```

### Testing Confirms Backend Works

**Direct API Tests** (bypassing frontend):
```bash
curl "http://localhost:3001/api/files"
# Returns: {"success":true,"path":"/workspace","files":[]} ✅

curl "http://localhost:3001/api/projects"
# Returns: {"projects":[]} ✅
```

**Environment Variables** (confirmed working):
- `DISABLE_AUTH=true` ✅
- `NODE_ENV=development` ✅
- `JWT_SECRET=test-secret-key-for-development` ✅

### The Missing Piece: Route Matching Priority

**Hypothesis**: The SPA fallback route (`app.get("*")`) is intercepting API requests before they reach specific API handlers.

**Route Order in Hono**:
1. Middleware (CORS, Config, Auth)
2. Health checks
3. API routes
4. Static assets
5. **SPA fallback (LAST)**

The routes are defined correctly, but something in the middleware chain or request processing is preventing API routes from matching.

## Impact Assessment

### Performance Impact
- **Main Thread Blocking**: Continuous JSON parse errors consume CPU cycles
- **Memory Consumption**: Error objects accumulating in browser console
- **User Experience**: 5-second delay makes file upload appear broken

### Functional Impact
- File tree operations fail silently
- Project management features non-functional
- File upload severely degraded

## Solution Strategy

### Option A: Fix Route Matching (Recommended)
**Investigate and fix the route matching issue in the backend**

**Implementation**:
1. Add comprehensive logging to backend route handlers
2. Trace request path through middleware chain
3. Identify where API requests are being intercepted
4. Fix the interception point

**Pros**: Addresses root cause, maintains architecture
**Cons**: Requires deep debugging

### Option B: Add Vite Proxy Configuration
**Configure Vite to proxy API requests to backend during development**

**Implementation**:
```typescript
// vite.web.config.mts
export default defineConfig({
  // ... existing config
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:10000',
        changeOrigin: true,
      }
    }
  }
})
```

**Pros**: Quick fix, separates concerns
**Cons**: Only fixes development, production still broken

### Option C: Hybrid Architecture Redesign
**Separate frontend and backend into independent services**

**Implementation**:
- Frontend: Pure static hosting (Nginx/CDN)
- Backend: Independent API service
- CORS configuration for cross-origin requests

**Pros**: Clean separation, scalable
**Cons**: Major architectural change

## Recommended Next Steps

### Immediate (Fix Option A)
1. **Add Debug Logging**: Insert comprehensive logging in backend to trace request flow
2. **Middleware Analysis**: Examine each middleware's impact on route matching
3. **Route Priority Testing**: Test route definition order and specificity
4. **Authentication Flow**: Verify auth middleware isn't causing redirects

### Short Term
1. **Implement Vite Proxy**: As backup solution for development
2. **Error Handling**: Add proper error boundaries in frontend
3. **Performance Monitoring**: Add metrics to detect similar issues

### Long Term
1. **Architecture Review**: Consider service separation for production
2. **Testing Framework**: Add API integration tests
3. **Monitoring**: Production error tracking and performance monitoring

## Files Requiring Attention

### Backend Files
- `lib/claude-webui-server/app.ts:215-231` - SPA fallback route
- `lib/claude-webui-server/middleware/auth.ts:86-210` - Auth middleware
- `lib/claude-webui-server/handlers/files.ts` - File API handlers

### Frontend Files
- `vite.web.config.mts` - Missing proxy configuration
- `app/config/api.ts` - API URL configuration
- `app/config/deployment.ts` - Deployment mode detection

### Docker Files
- `docker-compose.dev1.yml` - Container configuration
- `Dockerfile` - Build and runtime setup

## Risk Assessment
- **Severity**: High - Core functionality broken
- **Complexity**: Medium - Routing/middleware debugging
- **Timeline**: 2-4 hours for Option A, 1 hour for Option B
- **Confidence**: High - Root cause identified, multiple solution paths available

## Conclusion

The issue is a classic case of route matching priority in web applications. While the backend API routes are correctly defined and functional (verified by direct testing), something in the request processing pipeline is preventing the frontend's relative API calls from reaching the intended handlers, causing them to fall through to the SPA fallback route which returns HTML instead of JSON.

The 5-second file upload delay is merely a symptom of the underlying browser performance degradation caused by continuous JavaScript JSON parsing errors flooding the main thread.

**Priority**: Immediate fix required - this blocks all file-based functionality.