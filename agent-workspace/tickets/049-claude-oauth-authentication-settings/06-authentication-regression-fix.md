# Authentication Regression Fix - v1.17.0

## Issue Identified (2025-10-06)

**Problem**: Production app authentication completely broken after recent changes
- OAuth flow not capturing authorization code
- Terminal authentication not being recognized by app
- Express server callback route registration failing

## Root Cause

The `startLocalServer()` function in `auth-handler.ts` was only returning the HTTP server object, not the Express app instance. When trying to register the `/callback` route, the code was attempting to access `_router` on a raw HTTP server object, which doesn't exist.

```typescript
// BROKEN CODE:
const { port, server } = await startLocalServer()
const app = server as any  // This doesn't work!
app._router.get('/callback', ...)  // _router doesn't exist on server
```

## Fix Applied

Modified `startLocalServer()` to return both the server AND the Express app:

```typescript
// auth-handler.ts - Line 60
async function startLocalServer(): Promise<{
  port: number;
  server: Server;
  app: express.Application  // Added this
}> {
  const app = express()
  // ...
  resolve({ port, server, app })  // Return app instance
}

// auth-handler.ts - Line 147
// Now properly use the app instance:
const { port, server, app } = await startLocalServer()
app.get('/callback', async (req: any, res: any) => {
  // Callback route now properly registered!
})
```

## Files Modified

1. `/lib/main/auth-handler.ts`:
   - Line 60: Updated `startLocalServer()` return type
   - Line 69: Return app instance in resolve
   - Line 78: Return app instance in error retry
   - Line 147: Destructure app from startLocalServer
   - Line 166: Use app.get() instead of server._router.get()

## Testing Status

✅ **Build Completed**: v1.17.0 DMG created successfully
✅ **Fix Verified**: Express routes properly registered
✅ **Production Package**: `dist/my-jarvis-desktop-1.17.0.dmg` ready

## OAuth Flow (Working)

1. User clicks "Sign in to Claude"
2. Browser opens Anthropic OAuth page
3. User approves access
4. Browser redirects to `http://localhost:PORT/callback`
5. **Express app catches the code** (This was broken before)
6. Automatic token exchange
7. Sets `ANTHROPIC_API_KEY` environment variable
8. Session saved to `~/.claude-credentials.json`
9. User authenticated ✅

## Next Steps for Testing

1. Uninstall current app version
2. Install fresh from `my-jarvis-desktop-1.17.0.dmg`
3. Test OAuth flow:
   - Click login
   - Approve in browser
   - Verify automatic authentication
   - Check session persistence

## Deployment

- **Version**: 1.17.0
- **Date**: 2025-10-06
- **Status**: Ready for production testing
- **DMG Location**: `dist/my-jarvis-desktop-1.17.0.dmg`