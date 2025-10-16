# Dual-Mode OAuth Architecture: Electron + Web Deployment

## 🎯 THE REAL REQUIREMENT

You need **TWO different OAuth implementations**:
1. **Electron Desktop** - Local HTTP server (seamless)
2. **Render Web Deployment** - Public callback URL (standard web)

---

## 🔑 KEY INSIGHT

**Local server ONLY works for Electron, NOT for web deployment!**

### Why?

**Electron (Desktop)**:
```
User's computer:
  ├─ Electron app (localhost)
  ├─ Local HTTP server (localhost:50000)
  └─ Browser (same computer)

OAuth redirect: http://localhost:50000/callback
✅ Browser redirects to same computer
✅ Server catches the code
✅ Works perfectly!
```

**Render (Cloud)**:
```
Render server (cloud):
  └─ Express backend (my-jarvis.onrender.com)

User's computer:
  └─ Browser

OAuth redirect: http://localhost:50000/callback
❌ Browser tries localhost on USER's computer
❌ No server running there!
❌ Redirect fails completely!
```

---

## 📊 COMPARISON TABLE

| Feature | Electron (Desktop) | Render (Web) |
|---------|-------------------|--------------|
| **Environment** | User's computer | Cloud server |
| **Server Location** | localhost:50000 | my-jarvis.onrender.com |
| **OAuth Redirect** | http://localhost:50000/callback | https://my-jarvis.onrender.com/auth/callback |
| **Code Capture** | Local HTTP server | Express backend route |
| **Session Storage** | In-memory (currentSession) | Database (Supabase/Redis) |
| **User Flow** | 1-click (automatic) | 1-click (automatic) |

---

## 🏗️ DUAL-MODE ARCHITECTURE

### Frontend Detection

```typescript
// Detect which mode we're in
const isElectronMode = typeof window !== 'undefined' && !!window.electronAPI

if (isElectronMode) {
  // Use Electron OAuth (local server)
  await window.electronAPI.auth.startOAuth()
} else {
  // Use Web OAuth (public callback)
  window.location.href = '/api/auth/login'
}
```

### Mode 1: Electron OAuth (Local Server)

**Implementation**: Same as we discussed earlier

**File**: `lib/main/auth-handler.ts`
```typescript
async function startOAuthFlow() {
  // Start local server on localhost:50000
  const { port, server } = await startLocalServer()

  // OAuth redirect to localhost
  const redirectUri = `http://localhost:${port}/callback`

  const authUrl = `${AUTHORIZATION_URL}?${new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: redirectUri, // localhost!
    // ... other params
  })}`

  // Open browser
  await shell.openExternal(authUrl)

  // Server waits for callback
  // Captures code automatically
  // Completes OAuth
}
```

### Mode 2: Web OAuth (Public Callback)

**Implementation**: Standard Express backend route

**File**: `lib/claude-webui-server/app.ts`
```typescript
// OAuth initiation endpoint
app.get('/api/auth/login', (c) => {
  // Generate PKCE parameters
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = generateCodeChallenge(codeVerifier)
  const state = generateState()

  // Store in session (use database for production)
  // For now, use in-memory Map with state as key
  pendingAuthSessions.set(state, {
    codeVerifier,
    codeChallenge,
    timestamp: Date.now()
  })

  // Public callback URL
  const redirectUri = `${process.env.PUBLIC_URL}/api/auth/callback`

  const authUrl = `${AUTHORIZATION_URL}?${new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: redirectUri, // Public URL!
    response_type: 'code',
    scope: SCOPES.join(' '),
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256'
  })}`

  // Redirect user to Anthropic
  return c.redirect(authUrl)
})

// OAuth callback endpoint
app.get('/api/auth/callback', async (c) => {
  const { code, state } = c.req.query

  // Verify state
  const pendingAuth = pendingAuthSessions.get(state)
  if (!pendingAuth) {
    return c.text('Invalid state parameter', 400)
  }

  // Exchange code for tokens
  const tokenResponse = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: `${process.env.PUBLIC_URL}/api/auth/callback`,
      client_id: CLIENT_ID,
      code_verifier: pendingAuth.codeVerifier,
      state: state
    })
  })

  const tokens = await tokenResponse.json()

  // Store in database (use Supabase, Redis, or PostgreSQL)
  await storeUserSession({
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: Date.now() + tokens.expires_in * 1000,
    userEmail: tokens.account.email_address
  })

  // Clean up pending auth
  pendingAuthSessions.delete(state)

  // Redirect to app with success
  return c.redirect('/?auth=success')
})
```

---

## 🔐 SESSION MANAGEMENT

### Electron (In-Memory)
```typescript
// lib/main/auth-handler.ts
let currentSession: ClaudeAuthSession | null = null

// Session persists in main process memory
// Lost on app restart (user must re-login)
```

### Web (Database)
```typescript
// Store in database for persistence
interface UserSession {
  userId: string
  accessToken: string
  refreshToken: string
  expiresAt: number
  createdAt: number
}

// Example with Supabase
await supabase.table('user_sessions').insert({
  user_id: userId,
  access_token: tokens.access_token,
  refresh_token: tokens.refresh_token,
  expires_at: new Date(Date.now() + tokens.expires_in * 1000)
})

// Retrieve on subsequent requests
const session = await supabase
  .table('user_sessions')
  .select('*')
  .eq('user_id', userId)
  .single()
```

---

## 🌐 ENVIRONMENT CONFIGURATION

### Electron (.env.local or electron.env)
```bash
# Not needed - uses localhost automatically
OAUTH_MODE=electron
```

### Render (.env)
```bash
OAUTH_MODE=web
PUBLIC_URL=https://my-jarvis.onrender.com
CLIENT_ID=9d1c250a-e61b-44d9-88ed-5944d1962f5e
CLIENT_SECRET=<your-secret-if-needed>
DATABASE_URL=<supabase-or-postgres-url>
```

---

## 🔄 UNIFIED BACKEND TOKEN PASSING

**Both modes end with the same result: An access token**

### Electron
```typescript
// After OAuth completes
currentSession = { accessToken, refreshToken, ... }

// Set for backend
process.env.ANTHROPIC_API_KEY = currentSession.accessToken
```

### Web
```typescript
// After OAuth completes
await storeUserSession({ accessToken, refreshToken, ... })

// Retrieve per request
app.post('/api/chat', async (c) => {
  const userId = c.get('userId') // from auth middleware

  const session = await getUserSession(userId)

  // Use token for this specific request
  for await (const message of query({
    prompt: userMessage,
    options: {
      apiKey: session.accessToken // User's token!
    }
  })) {
    // Stream response
  }
})
```

---

## 📱 USER EXPERIENCE COMPARISON

### Electron User Flow
```
1. Click "Sign In to Claude"
2. Browser opens (Anthropic OAuth page)
3. Click "Approve"
4. Browser shows "Success!" page
5. Return to app → Logged in ✅

Total: 1 click (Approve)
```

### Web User Flow
```
1. Click "Sign In to Claude"
2. Browser redirects (Anthropic OAuth page)
3. Click "Approve"
4. Browser redirects back to app
5. App shows "Logged in" ✅

Total: 1 click (Approve)
```

**Both are seamless! No manual code copying in either mode!**

---

## 🛠️ IMPLEMENTATION PLAN

### Phase 1: Electron OAuth (Local Server) ✅ COMPLETED
✅ Implement as discussed in previous plan
✅ Test on desktop app
✅ Verify seamless login
✅ **Version 1.17.0 deployed** (2025-10-06)

**Implemented Changes:**
- Added Express local HTTP server (`startLocalServer()`)
- Modified `startOAuthFlow()` to use localhost callback
- Automatic code capture via `/callback` route
- Set `process.env.ANTHROPIC_API_KEY` after successful login
- Added session restoration on app startup (`restoreSession()`)
- Removed manual code input UI from frontend
- Updated `useClaudeAuth.ts` to remove `completeAuth` function
- Simplified `AuthButton.tsx` for one-click authentication

**Files Modified:**
- `lib/main/auth-handler.ts` - Added local server OAuth implementation
- `lib/main/main.ts` - Added session restoration on startup
- `app/hooks/useClaudeAuth.ts` - Removed manual completion logic
- `app/components/AuthButton.tsx` - Removed code input UI
- `package.json` - Incremented to v1.17.0

### Phase 2: Web OAuth (Public Callback) - PENDING
⏳ Add Express routes for OAuth
⏳ Configure public callback URL
⏳ Set up session database (Supabase)
⏳ Test on Render deployment

### Phase 3: Unified Backend - PENDING
⏳ Both modes pass token to Claude SDK
⏳ API calls work in both environments
⏳ Session management for both modes

---

## ✅ SUCCESS CRITERIA

**Electron Desktop:** ✅ COMPLETE (v1.17.0)
- ✅ One-click OAuth (no manual copying)
- ✅ Local server captures code automatically
- ✅ Session stored in memory
- ✅ Backend uses OAuth token via `process.env.ANTHROPIC_API_KEY`
- ✅ Session restored on app restart
- ✅ Production build tested

**Render Web:** ⏳ PENDING
- ⏳ One-click OAuth (no manual copying)
- ⏳ Public URL receives callback
- ⏳ Session stored in database
- ⏳ Backend uses OAuth token
- ⏳ Multi-user support

---

## 🎯 RECOMMENDED APPROACH

**For Now (MVP):**
1. Implement **Electron mode ONLY** (local server)
2. Get desktop app working perfectly
3. Deploy to Render later when ready

**For Production:**
1. Implement both modes
2. Auto-detect environment
3. Use appropriate OAuth flow
4. Same backend token passing for both

---

## 📝 KEY TAKEAWAY

The example project you copied (claude-code-by-agents) was designed for **web deployment only**. That's why they use manual code copying - they can't use localhost.

But you're building **BOTH** a desktop app and a web app. So you need:
- **Electron**: Local server (better UX, automatic)
- **Web**: Public callback (necessary for cloud)

Both can be seamless! Both can be one-click! Just different implementations under the hood.
