# Electron Removal Preservation Plan

## Critical Systems to Preserve

### 1. Backend API Architecture (`/lib/claude-webui-server/`)
**MUST PRESERVE ALL:**
- `handlers/` - All API endpoint handlers
  - `files.js` - File system operations
  - `projects.js` - Project management
  - `histories.js` - History tracking
  - `conversations.js` - Conversation management
  - `agents.js` - Claude agent operations
- `middleware/` - Configuration and request handling
- `utils/` - Utility functions
- `cli/validation.ts` - Claude CLI path detection (CRITICAL!)
- `runtime/` - Runtime abstraction layer
- Logging system (LogTape)
- Type safety patterns

### 2. IPC to HTTP Migration Map
Current IPC handlers in Electron that need HTTP endpoints:
- `ipc:list-files` → Already exists as `/api/files`
- `ipc:read-file` → Already exists as `/api/files/read`
- `ipc:write-file` → Already exists as `/api/files/write`
- `ipc:create-project` → Already exists as `/api/projects`
- `ipc:run-command` → Already exists as `/api/agent/run`
- `ipc:get-conversations` → Already exists as `/api/conversations`

### 3. Files to Remove (Electron-specific only)
- `/out/main/` - Electron main process
- `/lib/main/` - Electron main source
- `electron-builder.yml`
- `electron.vite.config.ts`
- Electron dependencies from package.json

### 4. Files to Keep/Enhance
- ALL files in `/lib/claude-webui-server/`
- `/app/` - React frontend
- `Dockerfile` - Container deployment
- `fly.toml` - Fly.io configuration
- `deploy.sh` - Deployment script
- `/lib/terminal/` - Terminal functionality

### 5. Critical Functionality Checklist
- [ ] File tree must work (requires `/api/files` endpoint)
- [ ] Claude agent must work (requires CLI validation)
- [ ] Terminal must work (requires PTY handling)
- [ ] Project switching must work
- [ ] History/conversations must persist
- [ ] All API endpoints must be registered
- [ ] Middleware must be applied
- [ ] Logging must be configured
- [ ] Environment variables must be loaded

### 6. Server.js Requirements
The server.js file MUST:
1. Import ALL handlers from `/handlers/` directory
2. Register ALL routes properly
3. Use the CLI validation system for Claude path
4. Apply all middleware
5. Configure logging with LogTape
6. Handle WebSocket for terminal
7. Serve static files correctly
8. Use proper error handling

### 7. Testing Checklist Before Deploy
- [ ] Start server locally with Docker
- [ ] Verify file tree loads
- [ ] Test Claude agent execution
- [ ] Check terminal functionality
- [ ] Verify project management
- [ ] Test conversation history
- [ ] Check all API endpoints respond

## Migration Steps

### Phase 1: Preparation
1. Document current working state
2. List all IPC handlers and their HTTP equivalents
3. Ensure all API handlers exist

### Phase 2: Remove Electron (Carefully!)
1. Remove Electron-specific files ONLY
2. Keep ALL server logic intact
3. Preserve the entire `/lib/claude-webui-server/` directory
4. Update package.json scripts
5. Remove Electron dependencies

### Phase 3: Verification
1. Build Docker image
2. Test locally with docker-compose
3. Verify all features work
4. Deploy to Fly.io
5. Test production deployment

## Common Pitfalls to Avoid

1. **DO NOT** simplify server.js into a monolithic file
2. **DO NOT** remove the CLI validation system
3. **DO NOT** delete handler files
4. **DO NOT** remove middleware
5. **DO NOT** hardcode 'claude' path
6. **DO NOT** remove logging system
7. **DO NOT** delete utils or runtime abstractions

## Recovery Plan
If something breaks:
1. Git diff to see what was removed
2. Restore missing files from git history
3. Ensure all handlers are imported
4. Verify CLI validation is working
5. Check all routes are registered