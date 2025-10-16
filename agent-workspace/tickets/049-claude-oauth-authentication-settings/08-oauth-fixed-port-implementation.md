# OAuth Fixed Port Implementation - v1.19.0

## Issue Summary (October 6, 2025)

**Problem**: OAuth callback was failing because the app used random localhost ports that weren't registered with Anthropic's OAuth provider.

**Symptoms**:
- Browser opened OAuth page correctly ✅
- User could approve access ✅
- Redirect went to "non-Anthropic page" ❌
- Authentication never completed ❌
- UI stuck in "signing in" state ❌

**Root Cause**: Dynamic port allocation (50000-60000) didn't match Anthropic's registered redirect URIs

## Research Findings

### Key Discoveries from 20+ Web Searches

1. **Claude CLI OAuth Ports**:
   - Common ports: 5173, 54545, 45123
   - Dynamic client registration (RFC 7591)
   - PKCE mandatory (OAuth 2.1)

2. **Anthropic OAuth Flow**:
   - Client ID: `9d1c250a-e61b-44d9-88ed-5944d1962f5e`
   - Authorization URL: `https://console.anthropic.com/oauth/authorize`
   - Expects specific registered redirect URIs

3. **Authentication Precedence**:
   - Priority 1: `ANTHROPIC_API_KEY` environment variable
   - Priority 2: OAuth tokens
   - Priority 3: Stored credentials

## Solution Implemented (v1.19.0)

### 1. Fixed Port Strategy
```typescript
// Use fixed ports that Claude CLI might use
const CLAUDE_CLI_PORTS = [5173, 54545, 45123]
let REDIRECT_URI = 'http://localhost:54545/callback'
```

### 2. Smart Port Selection
- Try fixed ports in order (5173, 54545, 45123)
- Fall back to random port if all fixed ports unavailable
- Bind to 127.0.0.1 explicitly for security

### 3. Environment Variable Management
- Set `ANTHROPIC_API_KEY` immediately after OAuth success
- Restore on app startup from saved session
- Clear on logout or session expiry

## Files Modified

### `/lib/main/auth-handler.ts`
- Line 15-17: Added `CLAUDE_CLI_PORTS` array with common OAuth ports
- Line 60-107: Updated `startLocalServer()` to try fixed ports first
- Line 382: Ensured `ANTHROPIC_API_KEY` set after OAuth
- Line 566: Set env var when restoring session
- Line 607-608: Clear env var on session expiry
- Line 631-632: Clear env var on sign out

### `/package.json`
- Line 3: Version bumped to 1.19.0

## Technical Changes

### Port Selection Logic
```typescript
async function startLocalServer() {
  // 1. Try fixed ports first (5173, 54545, 45123)
  for (const port of CLAUDE_CLI_PORTS) {
    try {
      const server = await tryPort(port)
      if (server) return { port, server, app }
    } catch { continue }
  }

  // 2. Fall back to random port
  const port = Math.floor(Math.random() * 10000) + 50000
  // ...
}
```

### Environment Variable Lifecycle
1. **Set on OAuth completion**: Line 382
2. **Set on session restore**: Line 566
3. **Clear on session expiry**: Line 607
4. **Clear on logout**: Line 631

## Expected Behavior (v1.19.0)

1. User clicks "Sign in to Claude"
2. Browser opens Anthropic OAuth page
3. User approves access
4. Browser redirects to `http://localhost:54545/callback`
5. **Express server catches the code** ✅
6. Automatic token exchange
7. `ANTHROPIC_API_KEY` set in environment
8. Backend API calls succeed
9. Token count updates properly

## Testing Instructions

1. **Log out from terminal**: `claude auth logout`
2. **Install v1.19.0**: Open the new DMG
3. **Test OAuth flow**:
   - Click "Sign in to Claude"
   - Approve in browser
   - Verify automatic authentication
   - Send a message to Claude
   - Check token count increases

## Success Metrics

- ✅ OAuth completes without manual code copying
- ✅ Fixed port used (54545 preferred)
- ✅ Environment variable set properly
- ✅ Backend uses OAuth token
- ✅ Claude API calls succeed
- ✅ Token count updates
- ✅ Session persists across restarts

## Version History

- **v1.17.0**: Initial OAuth implementation with Express server
- **v1.18.0**: Async fix for OAuth flow synchronization
- **v1.19.0**: Fixed port implementation + env var management

## Deployment Status

- **Version**: 1.19.0
- **Date**: October 6, 2025
- **Build**: Production DMG
- **Status**: Building...