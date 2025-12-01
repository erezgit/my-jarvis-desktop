# Agentrooms Authentication Analysis

## Overview
Agentrooms implements Claude OAuth authentication with a React hook + Electron IPC architecture.

---

## Architecture

```
Frontend (React)
    ↓
useClaudeAuth Hook
    ↓
window.electronAPI.auth (IPC Bridge)
    ↓
Electron Main Process (main.js)
    ↓
OAuth Flow + Token Storage
```

---

## Key Files

### 1. Frontend Hook: `useClaudeAuth.ts`
**Location:** `frontend/src/hooks/useClaudeAuth.ts`

**What it does:**
- Manages authentication state (isAuthenticated, session, loading, error)
- Calls Electron IPC methods: `checkStatus()`, `startOAuth()`, `completeOAuth()`, `signOut()`
- Returns auth state and functions for React components

**Key Functions:**
```typescript
signIn() // Opens browser for OAuth
completeAuth(authCode) // User pastes code from browser
signOut() // Clears session
checkAuthStatus() // Checks if already authenticated
```

### 2. Frontend Component: `AuthButton.tsx`
**Location:** `frontend/src/components/auth/AuthButton.tsx`

**What it renders:**
- **Not authenticated:** "Sign In to Claude" button
- **Pending auth:** Input field for authorization code
- **Authenticated:** User email + "Sign Out" button

**UI States:**
1. Loading spinner
2. Sign in button
3. Auth code input form
4. Authenticated user info with sign out

### 3. Electron Main Process: `main.js` (lines 412-651)
**Location:** `electron/main.js`

**OAuth Configuration:**
```javascript
AUTHORIZATION_URL = "https://claude.ai/oauth/authorize"
TOKEN_URL = "https://console.anthropic.com/v1/oauth/token"
CLIENT_ID = "9d1c250a-e61b-44d9-88ed-5944d1962f5e"
REDIRECT_URI = "https://console.anthropic.com/oauth/code/callback"
SCOPES = ["org:create_api_key", "user:profile", "user:inference"]
```

**IPC Handlers:**
- `auth:start-oauth` → Opens browser with OAuth URL
- `auth:complete-oauth` → Exchanges code for tokens
- `auth:check-status` → Checks if session valid
- `auth:sign-out` → Deletes stored session

**Token Storage:**
- Stored in: Electron storage via `storage.saveSetting('claudeAuth', { session })`
- Also writes to: `~/.claude-credentials.json` for backend compatibility

**OAuth Flow:**
1. Generate PKCE code_verifier and code_challenge
2. Open browser to Anthropic OAuth page
3. User authenticates and gets authorization code
4. User pastes code back into app
5. App exchanges code for access_token + refresh_token
6. Tokens stored in Electron storage + credentials file

---

## What We Need to Copy to My Jarvis Desktop

### ✅ KEEP (Already Have):
- Electron main process (already exists)
- IPC bridge (already exists)
- Storage system (already exists)

### 📋 NEED TO ADD:

#### 1. **OAuth Handlers in Electron Main**
Copy functions from Agentrooms `main.js` lines 412-651:
- `generateCodeVerifier()`
- `generateCodeChallenge()`
- `generateState()`
- `startOAuthFlow()`
- `completeOAuthFlow(authCode)`
- `parseAuthorizationCode()`
- IPC handlers: `auth:start-oauth`, `auth:complete-oauth`, `auth:check-status`, `auth:sign-out`

#### 2. **Frontend Hook**
Copy `useClaudeAuth.ts` to My Jarvis Desktop:
- Location: `spaces/my-jarvis-desktop/projects/my-jarvis-desktop/src/hooks/useClaudeAuth.ts`
- Minimal changes needed (already uses window.electronAPI pattern)

#### 3. **Auth Button Component**
Copy `AuthButton.tsx` to My Jarvis Desktop:
- Location: `spaces/my-jarvis-desktop/projects/my-jarvis-desktop/src/components/AuthButton.tsx`
- Need to adapt styling to match My Jarvis Desktop theme

#### 4. **Add to Settings Panel**
Modify `Settings.tsx` to include `<AuthButton />` at the bottom

#### 5. **Electron Preload Script**
Add auth IPC methods to preload.js:
```typescript
auth: {
  checkStatus: () => ipcRenderer.invoke('auth:check-status'),
  startOAuth: () => ipcRenderer.invoke('auth:start-oauth'),
  completeOAuth: (code) => ipcRenderer.invoke('auth:complete-oauth', code),
  signOut: () => ipcRenderer.invoke('auth:sign-out')
}
```

---

## Implementation Steps

### Step 1: Add OAuth to Electron Main Process
File: `spaces/my-jarvis-desktop/projects/my-jarvis-desktop-old/electron/main.cjs`

Add:
- OAuth constants (CLIENT_ID, URLs, SCOPES)
- PKCE helper functions
- OAuth flow functions
- IPC handlers

### Step 2: Update Preload Script
File: `spaces/my-jarvis-desktop/projects/my-jarvis-desktop-old/electron/preload.cjs`

Add auth API to window.electronAPI

### Step 3: Copy Frontend Hook
File: `spaces/my-jarvis-desktop/projects/my-jarvis-desktop/src/hooks/useClaudeAuth.ts` (NEW)

Copy from Agentrooms with minimal changes

### Step 4: Copy Auth Button
File: `spaces/my-jarvis-desktop/projects/my-jarvis-desktop/src/components/AuthButton.tsx` (NEW)

Copy and adapt styling

### Step 5: Add to Settings
File: `spaces/my-jarvis-desktop/projects/my-jarvis-desktop/src/components/Settings.tsx`

Import and render `<AuthButton />` at bottom of settings panel

### Step 6: Test
1. Logout from terminal: `claude auth logout`
2. Open My Jarvis Desktop
3. Go to Settings
4. Click "Sign In to Claude"
5. Browser opens → authenticate
6. Copy code back to app
7. Verify session persists

---

## Technical Notes

### OAuth Flow Details
1. **PKCE** (Proof Key for Code Exchange) - Security enhancement for OAuth
   - code_verifier: Random string
   - code_challenge: SHA256 hash of verifier
   - Prevents authorization code interception attacks

2. **State Parameter** - CSRF protection
   - Random value generated at start
   - Verified when completing flow
   - Prevents cross-site request forgery

3. **Token Exchange**
   - POST to `https://console.anthropic.com/v1/oauth/token`
   - Body: { grant_type, code, redirect_uri, client_id, code_verifier, state }
   - Returns: { access_token, refresh_token, expires_in, account }

4. **Token Storage**
   - Primary: Electron storage (persists across app restarts)
   - Secondary: `~/.claude-credentials.json` (backend compatibility)
   - Format: `{ claudeAiOauth: { accessToken, refreshToken, expiresAt, ... } }`

### Session Validation
- Check `expiresAt` timestamp
- Refresh if expires within 5 minutes
- Auto-refresh using refresh_token

---

## Next Steps

1. ✅ Analysis complete
2. ⏭️ Copy OAuth handlers to My Jarvis Desktop Electron main
3. ⏭️ Update preload script
4. ⏭️ Copy frontend files
5. ⏭️ Add to Settings panel
6. ⏭️ Test login flow

**Ready to start implementation!**
