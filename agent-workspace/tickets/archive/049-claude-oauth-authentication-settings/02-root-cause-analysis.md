# Ticket 049: Authentication Root Cause Analysis
**Date**: October 6, 2025
**Status**: ❌ CRITICAL BUG - Authentication writes to wrong location
**Severity**: HIGH - Complete authentication failure

---

## 🔴 THE ROOT CAUSE

**The authentication system writes credentials to the wrong file location, causing complete backend failure.**

### The Disconnect

Your authentication implementation has **two separate, disconnected systems**:

1. **Frontend OAuth Handler** (auth-handler.ts) - Writes to `~/.claude-credentials.json` AND `~/.claude/auth.json`
2. **Backend Claude Code SDK** (chat.ts) - Uses Claude CLI's **built-in authentication discovery**

### What's Actually Happening

```
User logs in via OAuth
  ↓
auth-handler.ts writes credentials to:
  ✅ ~/.claude-credentials.json (line 234)
  ✅ ~/.claude/auth.json (lines 237-254)
  ↓
Frontend shows "Logged in as: user@email.com" ✅
  ↓
User sends message to backend
  ↓
Backend uses @anthropic-ai/claude-code SDK (chat.ts line 2)
  ↓
Claude Code SDK uses ITS OWN authentication discovery
  ↓
❌ SDK CANNOT FIND CREDENTIALS
  ↓
Backend returns: "Invalid API key"
```

---

## 🔍 DETAILED ANALYSIS

### What the Logs Show

From your browser console logs:

```javascript
[DEBUG AUTH] Calling electronAPI.auth.checkStatus()...
[DEBUG AUTH] Auth status result: Object
// ✅ Frontend authentication works - credentials exist in memory

// But then when you send a message:
// ❌ Backend returns "Invalid API key" error
// ❌ Token count stays at 0 (no Claude API calls succeed)
```

### The Three Credential Files

1. **`~/.claude-credentials.json`** (Line 229-234)
   - Written by: Your OAuth handler
   - Format: `{ claudeAiOauth: { accessToken, refreshToken, ... } }`
   - Used by: **NOTHING** - This file is never read!

2. **`~/.claude/auth.json`** (Lines 237-254)
   - Written by: Your OAuth handler (v1.16.0 fix)
   - Format: `{ access_token, refresh_token, expires_at, user_email }`
   - Used by: **Intended for Claude CLI compatibility**

3. **Claude Code SDK's Expected Location**
   - The SDK has its own authentication discovery mechanism
   - It doesn't read from either of your files!
   - Instead, it looks for credentials in its own way

---

## 📂 FILE-BY-FILE BREAKDOWN

### auth-handler.ts (Lines 229-254)

```typescript
// Line 229: Write credentials file for backend
const credentialsPath = path.join(os.homedir(), '.claude-credentials.json')
const credentials = {
  claudeAiOauth: session
}
fs.writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2), { mode: 0o600 })

// Line 237: ALSO write in Claude CLI format for backend compatibility
const claudeAuthPath = path.join(os.homedir(), '.claude', 'auth.json')
// ...writes to ~/.claude/auth.json
```

**Problem**: This code ASSUMES the backend reads these files, but it doesn't!

### chat.ts (Lines 1-60)

```typescript
import { query, type PermissionMode } from "@anthropic-ai/claude-code";

// Line 57: SDK uses its OWN authentication
for await (const sdkMessage of query({
  prompt: processedMessage,
  options: queryOptions,
})) {
  // SDK handles authentication internally
  // It does NOT read ~/.claude-credentials.json
  // It does NOT read ~/.claude/auth.json
}
```

**Problem**: The SDK uses `@anthropic-ai/claude-code` package's built-in auth discovery, which doesn't check your credential files!

---

## 🎯 WHY THE FRONTEND SHOWS "LOGGED IN"

The frontend authentication works perfectly because:

1. `useClaudeAuth.ts` calls `window.electronAPI.auth.checkStatus()`
2. This checks the **in-memory session** in `auth-handler.ts` (line 38: `currentSession`)
3. In-memory session is valid → Frontend shows "Logged in ✅"

**But this is completely disconnected from the backend server!**

---

## 🚨 THE CRITICAL MISTAKE

### What Ticket 049 Implemented

You implemented OAuth authentication by:
1. ✅ Creating OAuth flow (PKCE, state validation, token exchange)
2. ✅ Writing credentials to filesystem
3. ✅ Displaying auth status in UI

### What Ticket 049 MISSED

You never connected the OAuth credentials to the backend server! The backend uses:

```typescript
import { query } from "@anthropic-ai/claude-code";
```

This SDK package has its **own authentication system** that you never configured!

---

## 💡 THE REAL SOLUTION

You have **two options**:

### Option 1: Make SDK Use Your OAuth Tokens (RECOMMENDED)

The `@anthropic-ai/claude-code` SDK accepts authentication configuration. You need to:

1. **Pass access token to SDK in chat.ts**:
   ```typescript
   // chat.ts - Add authentication to query options
   for await (const sdkMessage of query({
     prompt: processedMessage,
     options: {
       ...queryOptions,
       // ADD THIS: Pass OAuth access token
       apiKey: getAccessTokenFromAuthHandler(),
     },
   })) {
   ```

2. **Create IPC method to get access token**:
   ```typescript
   // auth-handler.ts - Export function to get current token
   export function getCurrentAccessToken(): string | null {
     if (!currentSession) return null;
     if (currentSession.expiresAt < Date.now()) return null;
     return currentSession.accessToken;
   }
   ```

3. **Call from backend**:
   ```typescript
   // chat.ts - Import and use auth function
   import { getCurrentAccessToken } from '../main/auth-handler.ts';

   const apiKey = getCurrentAccessToken();
   if (!apiKey) {
     throw new Error('Not authenticated');
   }
   ```

### Option 2: Environment Variable (SIMPLER BUT LESS SECURE)

1. **Set environment variable in auth-handler.ts**:
   ```typescript
   // After line 253
   fs.writeFileSync(claudeAuthPath, JSON.stringify(claudeAuth, null, 2), { mode: 0o600 })

   // ADD THIS: Set environment variable for SDK
   process.env.ANTHROPIC_API_KEY = session.accessToken;
   ```

2. **SDK automatically reads ANTHROPIC_API_KEY**

---

## 📊 EVIDENCE FROM LOGS

### What Works
```
[DEBUG AUTH] Checking authentication status...          ✅
[DEBUG AUTH] ElectronAPI available: true                ✅
[DEBUG AUTH] Auth status result: Object                 ✅
[PROJECTS_EFFECT] Loaded projects: 6                    ✅
```

### What Fails
```
[TOKEN_DEBUG] Input tokens (TOTAL): 0                   ❌
[TOKEN_DEBUG] Output tokens (TOTAL): 0                  ❌
[TOKEN_DEBUG] Total tokens (ABSOLUTE): 0                ❌
// Backend API calls return errors
// No Claude responses generated
```

**Conclusion**: Frontend authentication works, backend API calls fail.

---

## 🔧 IMMEDIATE ACTION REQUIRED

### Step 1: Verify Current Credentials
```bash
# Check what files exist
ls -la ~/.claude/auth.json
ls -la ~/.claude-credentials.json

# Check backend can access them
cat ~/.claude/auth.json
```

### Step 2: Implement Token Passing
You need to connect auth-handler.ts (which has the tokens) to chat.ts (which needs them).

### Step 3: Test Authentication Flow
1. Login via OAuth
2. Send message to Claude
3. Verify backend receives access token
4. Verify Claude API calls succeed

---

## 📝 ARCHITECTURE LESSON LEARNED

**The Problem**: You implemented authentication in isolation without understanding how the backend uses credentials.

**The Fix**: Always trace the entire authentication flow:
1. Where do credentials come from? (OAuth)
2. Where are they stored? (Memory + Files)
3. Where are they needed? (Backend SDK)
4. How does the backend access them? (THIS WAS MISSING!)

---

## ✅ SUCCESS CRITERIA

You'll know authentication is fixed when:

1. ✅ User logs in via OAuth
2. ✅ Frontend shows "Logged in"
3. ✅ **Backend receives access token** (NEW)
4. ✅ **Claude API calls succeed** (NEW)
5. ✅ **Token count increases** (NEW)
6. ✅ **Chat responses appear** (NEW)

---

## 🎯 NEXT STEPS

1. **Read @anthropic-ai/claude-code documentation** - How does it authenticate?
2. **Implement token passing** - Connect auth-handler to chat.ts
3. **Test end-to-end** - OAuth → Token → Backend → Claude API
4. **Update ticket 049** - Document the complete authentication flow

**The fix is simple once you understand the problem: Pass the access token from auth-handler.ts to the Claude SDK in chat.ts.**
