# Authentication Fix Plan: Step-by-Step Implementation

## 🎯 GOAL
Make login work exactly like terminal `claude auth login` - seamless, one-click, automatic.

---

## THE TWO-PART FIX

### Part 1: Fix OAuth Flow (Seamless Login)
**Current**: Manual code copying (clunky)
**Target**: Automatic code capture (like CLI)

### Part 2: Connect to Backend
**Current**: OAuth tokens stored but not used
**Target**: Backend uses OAuth tokens for API calls

---

## 🚀 IMPLEMENTATION STEPS

### Step 1: Choose OAuth Approach (DECISION NEEDED)

**Option A: Custom Protocol Handler** (RECOMMENDED)
- ✅ Most professional
- ✅ Native OS integration
- ✅ Works like other desktop apps (Slack, VS Code)
- ⏱️ 2-3 hours implementation

**Option B: Local HTTP Server** (SIMPLER)
- ✅ Same as CLI approach
- ✅ Easier to implement
- ⚠️ Potential firewall issues
- ⏱️ 1-2 hours implementation

**My Recommendation**: Start with **Option B (Local HTTP Server)** - it's simpler and matches the CLI exactly.

---

## 📋 PART 1: FIX OAUTH FLOW (Local HTTP Server)

### Step 1.1: Modify auth-handler.ts

**File**: `lib/main/auth-handler.ts`

```typescript
import express from 'express'
import { Server } from 'http'

// Add this function BEFORE startOAuthFlow()
async function startLocalServer(): Promise<{ port: number; server: Server }> {
  const app = express()
  const port = Math.floor(Math.random() * 10000) + 50000 // Random port 50000-60000

  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      console.log(`[OAUTH] Local callback server running on http://localhost:${port}`)
      resolve({ port, server })
    })

    server.on('error', reject)
  })
}

// Replace the startOAuthFlow() function with this:
async function startOAuthFlow(): Promise<{
  success: boolean
  message?: string
  error?: string
  pendingAuth?: boolean
}> {
  try {
    console.log('[OAUTH] Starting Claude OAuth flow...')

    // Generate PKCE parameters
    const codeVerifier = generateCodeVerifier()
    const codeChallenge = generateCodeChallenge(codeVerifier)
    const state = generateState()

    // Start local HTTP server
    const { port, server } = await startLocalServer()

    // Build OAuth URL with localhost callback
    const redirectUri = `http://localhost:${port}/callback`
    const authUrl = `${AUTHORIZATION_URL}?${new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: SCOPES.join(' '),
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    })}`

    // Store pending auth (will be completed by callback)
    pendingAuth = {
      codeVerifier,
      state,
      codeChallenge,
      authUrl
    }

    // Open browser
    await shell.openExternal(authUrl)
    console.log('[OAUTH] Browser opened for authentication')

    // Wait for callback (with timeout)
    const result = await new Promise<{ code: string; state: string }>((resolve, reject) => {
      const timeout = setTimeout(() => {
        server.close()
        reject(new Error('OAuth timeout - no response received'))
      }, 5 * 60 * 1000) // 5 minute timeout

      // Handle callback route
      const app = server as any
      app.get('/callback', (req: any, res: any) => {
        clearTimeout(timeout)

        const { code, state: returnedState } = req.query

        // Show success page
        res.send(`
          <html>
            <body style="font-family: system-ui; text-align: center; padding-top: 100px;">
              <h1>✅ Authentication Successful!</h1>
              <p>You can close this window and return to My Jarvis Desktop.</p>
            </body>
          </html>
        `)

        // Close server
        server.close()

        // Return code and state
        resolve({ code: code as string, state: returnedState as string })
      })
    })

    // Complete OAuth with captured code
    return await completeOAuthFlow(`${result.code}#${result.state}`)

  } catch (error) {
    console.error('[OAUTH] Failed to start OAuth flow:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start OAuth flow'
    }
  }
}
```

### Step 1.2: Install Express Dependency

**File**: `package.json` (root)

```bash
npm install express
npm install --save-dev @types/express
```

### Step 1.3: Remove Manual Code Input UI

**File**: `app/components/AuthButton.tsx`

Find and remove this section (around lines 40-70):
```typescript
// DELETE THIS ENTIRE SECTION:
if (hasPendingAuth) {
  return (
    <div className="...">
      <p>Enter the authorization code...</p>
      <input ... />
      <button onClick={handleCompleteAuth}>Complete</button>
    </div>
  )
}
```

Replace with:
```typescript
// Just show loading during OAuth
if (isLoading) {
  return (
    <div className="p-4 border border-neutral-200 rounded-lg bg-neutral-50">
      <div className="flex items-center gap-2">
        <div className="animate-spin h-4 w-4 border-2 border-neutral-600 border-t-transparent rounded-full" />
        <span className="text-sm text-neutral-600">Authenticating...</span>
      </div>
    </div>
  )
}
```

### Step 1.4: Simplify Hook

**File**: `app/hooks/useClaudeAuth.ts`

Remove the `completeAuth` function (lines 125-155) - not needed anymore!

Update `signIn` function:
```typescript
const signIn = async () => {
  try {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

    if (!window.electronAPI?.auth) {
      throw new Error('Authentication is only available in the Electron app');
    }

    // Just call startOAuth - it now handles everything automatically!
    const result = await window.electronAPI.auth.startOAuth();

    if (result.success && result.session) {
      // OAuth completed automatically!
      setAuthState({
        isAuthenticated: true,
        session: result.session,
        isLoading: false,
        error: null,
        hasPendingAuth: false
      });
    } else {
      throw new Error(result.error || 'Authentication failed');
    }
  } catch (error) {
    console.error('Sign in failed:', error);
    setAuthState(prev => ({
      ...prev,
      isLoading: false,
      error: error instanceof Error ? error.message : 'Sign in failed',
      hasPendingAuth: false
    }));
  }
};
```

---

## 📋 PART 2: CONNECT BACKEND TO OAUTH

### Step 2.1: Export Token Getter from auth-handler.ts

**File**: `lib/main/auth-handler.ts`

Add this function at the end:
```typescript
// Export function to get current access token
export function getCurrentAccessToken(): string | null {
  if (!currentSession) {
    console.log('[AUTH] No current session')
    return null
  }

  // Check if token expired
  if (currentSession.expiresAt < Date.now()) {
    console.log('[AUTH] Token expired')
    return null
  }

  console.log('[AUTH] Returning valid access token')
  return currentSession.accessToken
}
```

### Step 2.2: Set Environment Variable on Login

**File**: `lib/main/auth-handler.ts`

In the `completeOAuthFlow` function, after line 253, add:
```typescript
fs.writeFileSync(claudeAuthPath, JSON.stringify(claudeAuth, null, 2), { mode: 0o600 })
console.log('[OAUTH] Saved credentials in Claude CLI format to:', claudeAuthPath)

// ADD THIS: Set environment variable for SDK
process.env.ANTHROPIC_API_KEY = session.accessToken
console.log('[OAUTH] Set ANTHROPIC_API_KEY environment variable')

console.log('[OAUTH] Authentication completed successfully')
```

### Step 2.3: Update on App Startup

**File**: `lib/main/main.ts`

Add this in the `app.whenReady()` section:
```typescript
app.whenReady().then(async () => {
  // ... existing code ...

  // Check for existing auth session and set env var
  const { getCurrentAccessToken } = await import('./auth-handler')
  const token = getCurrentAccessToken()
  if (token) {
    process.env.ANTHROPIC_API_KEY = token
    console.log('[MAIN] Restored ANTHROPIC_API_KEY from session')
  }

  // ... rest of code ...
})
```

### Step 2.4: Refresh Token on Expiry

**File**: `lib/main/auth-handler.ts`

Update the `checkAuthStatus` function (around line 299):
```typescript
} else {
  console.log('[AUTH] Session expired, need to refresh')

  // Clear expired token from environment
  delete process.env.ANTHROPIC_API_KEY

  // TODO: Implement token refresh logic here
  // For now, user needs to re-login

  return {
    success: true,
    isAuthenticated: false,
    session: null
  }
}
```

---

## 🧪 TESTING STEPS

### Test 1: OAuth Flow
1. Open My Jarvis Desktop
2. Go to Settings → Authentication
3. Click "Sign In to Claude"
4. **Expected**: Browser opens automatically
5. **Expected**: Click "Approve" on Anthropic page
6. **Expected**: Browser shows "Authentication Successful"
7. **Expected**: App shows "Logged in as: your@email.com"
8. **Expected**: NO manual code copying needed!

### Test 2: Backend Connection
1. After successful login
2. Send a message in chat: "hi"
3. **Expected**: Claude responds (not "Invalid API key")
4. **Expected**: Token count increases
5. **Expected**: Normal conversation works

### Test 3: Session Persistence
1. After successful login
2. Quit My Jarvis Desktop completely
3. Reopen the app
4. Go to Settings
5. **Expected**: Still shows "Logged in"
6. Send a message
7. **Expected**: Chat still works without re-login

---

## 📊 SUCCESS CRITERIA

✅ One-click login (no manual copying)
✅ Browser auto-redirects to localhost
✅ App captures code automatically
✅ Backend uses OAuth token
✅ Claude API calls succeed
✅ Token count updates
✅ Session persists across restarts

---

## 🔄 ROLLBACK PLAN

If something breaks:
1. Git commit before starting
2. Keep current production build
3. Test in dev mode first
4. Can revert to manual code flow if needed

---

## ⏱️ TIME ESTIMATE

- **Part 1** (OAuth flow): 1-2 hours
- **Part 2** (Backend connection): 30 minutes
- **Testing**: 30 minutes
- **Total**: 2-3 hours

---

## 🚀 READY TO START?

I can help you implement each step. Just say:
- "Let's do Part 1" - Fix OAuth flow
- "Let's do Part 2" - Connect backend
- "Do both" - Complete implementation
