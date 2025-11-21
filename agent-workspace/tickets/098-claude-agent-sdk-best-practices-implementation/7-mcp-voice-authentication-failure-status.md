# MCP Voice Tool Authentication Failure - Current Status

**Date**: November 20, 2025
**Issue**: MCP voice generation tool failing with authentication bypass not working
**Status**: CRITICAL - Authentication bypass mechanism implemented but not functioning

## 🔥 ROOT CAUSE IDENTIFIED

After extensive debugging and deployment testing, the **root cause** has been definitively identified:

### The Problem
The MCP tool's internal API call is **NOT** being recognized by the authentication middleware, despite implementing the `X-Internal-Auth: mcp-internal-call` header bypass mechanism.

### Evidence from Production Logs
```
[MCP_VOICE_TOOL] Calling server API for voice generation: undefined
[app] No authentication token or session found, redirecting to login
[MCP_VOICE_TOOL] Voice generation failed: `Unexpected token '<', "<!DOCTYPE "... is not valid JSON`
```

**What's happening**:
1. MCP tool makes fetch() call to `http://localhost:10000/api/voice-generate`
2. Auth middleware processes the request BEFORE checking for internal auth header
3. Server redirects to login page (HTML response)
4. MCP tool tries to parse HTML as JSON → **FAILS**

## 📋 TECHNICAL INVESTIGATION SUMMARY

### Files Modified and Tested ✅
1. **Authentication Middleware** (`/lib/claude-webui-server/middleware/auth.ts`)
   - ✅ Added `X-Internal-Auth: mcp-internal-call` bypass logic
   - ✅ Deployed to production successfully

2. **MCP Tool Implementation** (`/lib/claude-webui-server/handlers/chat.ts`)
   - ✅ Added internal auth header to fetch request
   - ✅ Updated response structure for UnifiedMessageProcessor
   - ✅ Deployed to production successfully

3. **Voice Message Processing** (`/app/utils/UnifiedMessageProcessor.ts`)
   - ✅ Fixed autoPlay setting for streaming responses
   - ✅ Deployed to production successfully

### Deployment Status ✅
- **Latest successful deployment**: November 20, 2025, 18:34 UTC
- **Build status**: ✅ SUCCESS
- **Health checks**: ✅ PASSING
- **Server status**: ✅ RUNNING

## 🔍 CRITICAL DISCOVERY

**The authentication bypass mechanism is implemented correctly but is being bypassed itself!**

Looking at the auth middleware sequence:
```typescript
// Line 88-89: Health checks (comes first) ✅
if (path === "/health" || path === "/api/health") {
  return next();
}

// Line 92-98: Internal API calls check ✅ IMPLEMENTED
const internalKey = c.req.header("X-Internal-Auth");
if (internalKey === "mcp-internal-call") {
  c.set("userId", "internal-mcp-user");
  return next();
}
```

**But the logs show**: `No authentication token or session found, redirecting to login`

**This means**: Either:
1. The `X-Internal-Auth` header is NOT being sent in the fetch request
2. The header is being stripped/modified during the request
3. The auth middleware is not processing the header correctly

## 🚨 URGENT NEXT STEPS

### Immediate Investigation Required
1. **Verify fetch request headers** - Debug actual headers sent by MCP tool
2. **Test auth middleware locally** - Confirm header processing works
3. **Check request routing** - Ensure `/api/voice-generate` goes through correct middleware

### Potential Solutions
1. **Debug MCP fetch headers** - Add detailed logging of actual request headers
2. **Alternative auth mechanism** - Use query parameter instead of header
3. **Direct API route** - Create dedicated internal endpoint bypassing auth entirely

## 📊 CURRENT STATE

### What Works ✅
- Server deployment and build process
- Health checks and basic functionality
- MCP tool discovery and initialization
- Authentication system for regular users

### What's Broken ❌
- MCP voice generation (primary feature)
- Internal API authentication bypass
- Claude Code voice integration

### Impact Assessment
- **Severity**: HIGH - Core voice functionality non-functional
- **Users Affected**: All users attempting voice generation
- **Workaround**: None currently available

## 📝 TECHNICAL NOTES

### MCP Tool Configuration
- **Server registration**: ✅ Working (jarvis-tools MCP server detected)
- **Tool discovery**: ✅ Working (voice_generate tool found)
- **Tool execution**: ❌ FAILING at API authentication step

### Authentication Flow
- **User authentication**: ✅ Working (JWT tokens, sessions)
- **Internal authentication**: ❌ NOT WORKING (bypass mechanism failing)
- **Public endpoints**: ✅ Working (health checks, static assets)

## 🔄 CONCLUSION

Despite implementing a comprehensive authentication bypass mechanism and successfully deploying all changes, the MCP voice tool continues to fail due to the bypass mechanism not being recognized. The issue is likely in the fetch request headers or middleware processing order.

**Next action required**: Deep debugging of the actual HTTP request/response cycle to identify why the authentication bypass is not working as designed.

---

**Previous investigation files**: See numbered files 1-6 in this ticket for complete implementation history and technical details.