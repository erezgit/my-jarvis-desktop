# Container Fix Instructions - Chat History Path Mismatch

**For:** Claude Code agent running in my-jarvis-erez-dev container
**Issue:** Chat history stuck on "Loading project..."
**Root Cause:** Path mismatch between frontend expectation (`/workspace`) and backend config (`/workspace/my-jarvis`)

---

## Steps to Fix

### 1. Edit the .claude.json Configuration File

**File:** `/root/.claude.json`

**Current content:**
```json
{
  "projects": {
    "/workspace/my-jarvis": {}
  }
}
```

**Change to:**
```json
{
  "projects": {
    "/workspace": {}
  }
}
```

**Command to make the change:**
```bash
cat > /root/.claude.json <<'EOF'
{
  "projects": {
    "/workspace": {}
  }
}
EOF
```

---

### 2. Rename the Project History Directory

**Current directory:** `/root/.claude/projects/-workspace-my-jarvis/`

**Rename to:** `/root/.claude/projects/-workspace/`

**Command:**
```bash
mv /root/.claude/projects/-workspace-my-jarvis /root/.claude/projects/-workspace
```

---

### 3. Verify the Changes

**Check the config file:**
```bash
cat /root/.claude.json
```

**Expected output:**
```json
{
  "projects": {
    "/workspace": {}
  }
}
```

**Check the directory structure:**
```bash
ls -la /root/.claude/projects/
```

**Expected output should show:**
```
drwxr-xr-x 2 root root 4096 ... -workspace
```

---

## Why This Fix Works

**Frontend code (ChatPage.tsx:45):**
```typescript
const claudeWorkingDirectory = '/workspace';  // Hardcoded
```

**Frontend lookup (ChatPage.tsx:63):**
```typescript
const project = projects.find((p) => p.path === claudeWorkingDirectory);
```

**Before fix:**
- API returns: `{ path: "/workspace/my-jarvis", encodedName: "-workspace-my-jarvis" }`
- Comparison: `"/workspace/my-jarvis" === "/workspace"` → **FALSE**
- Result: `encodedName = null` ❌

**After fix:**
- API returns: `{ path: "/workspace", encodedName: "-workspace" }`
- Comparison: `"/workspace" === "/workspace"` → **TRUE**
- Result: `encodedName = "-workspace"` ✅

---

## Expected Results After Fix

1. **API Response:**
   ```bash
   curl http://localhost:10000/api/projects
   ```
   Should return:
   ```json
   {"projects":[{"path":"/workspace","encodedName":"-workspace"}]}
   ```

2. **Frontend logs should show:**
   ```
   [PROJECTS_EFFECT] Loaded projects: 1
   HistoryView rendered with encodedName: -workspace
   ```

3. **History page should:**
   - No longer be stuck on "Loading project..."
   - Show empty conversation list (initially)
   - Accept new conversations and store them properly

---

## Notes

- This is a temporary fix to test the solution
- The permanent fix will be deployed by updating `init-claude-config.sh` and redeploying the container
- Claude Code working directory is `/workspace`, not `/workspace/my-jarvis`
- `/workspace/my-jarvis` is just a subdirectory shown in the file tree UI, not the Claude Code root

---

**Test after applying:** Visit https://my-jarvis-erez-dev.fly.dev/ and click the History button
