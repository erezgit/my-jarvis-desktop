# Token Usage Flow Diagram - UPDATED DECEMBER 2025
## Current Production Implementation

```
┌─────────────┐
│    USER     │  "Please help me with X task..."
│  👤 Types   │
│  Message    │
└─────┬───────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                 │
│  🌐 Chat Interface  →  POST /api/chat  →  🔄 Stream Parser     │
│     (React)              (HTTP)              (useStreamParser)  │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     BACKEND (chat.ts)                          │
│  🔧 handleChatRequest() → executeClaudeCommand()               │
│     Lines 89-485          Lines 157-484                        │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CLAUDE AGENT SDK                            │
│  🤖 query() with stream=true → AI response generation          │
│     Returns async generator of SDK messages                     │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│           STREAM PROCESSING LOOP (chat.ts:275-379)             │
│                                                                 │
│  for await (const sdkMessage of sdk.query({...})) {            │
│                                                                 │
│    1️⃣ CAPTURE SESSION ID (lines 277-280):                      │
│       if (sdkMessage.type === 'system' && init event)          │
│         actualSessionId = sdkMessage.session_id ✅              │
│                                                                 │
│    2️⃣ DETECT TOKEN USAGE (lines 295-326):                      │
│       if (sdkMessage.message?.usage) {                         │
│         // Found token data!                                   │
│         usageData = sdkMessage.message.usage                   │
│       }                                                         │
│                                                                 │
│    3️⃣ CREATE TOKEN_UPDATE MESSAGE (lines 327-339):             │
│       tokenUpdate = {                                          │
│         type: "token_update",                                  │
│         usage: {                                               │
│           input_tokens: 7,                                     │
│           output_tokens: 136,                                  │
│           cache_creation_tokens: 115,                          │
│           cache_read_tokens: 15315,                            │
│           thinking_tokens: 0,                                  │
│           total: 15573                                         │
│         },                                                     │
│         sessionId: "91d1f2ce-d521-406f-8bcd-0e0e7ae0c576"     │
│       }                                                        │
│                                                                 │
│    4️⃣ SAVE TO DATABASE (lines 341-371):                        │
│       if (actualSessionId) {                                   │
│         userId = getTokenTrackingUserId() // Lines 12-27       │
│         if (userId) {                                          │
│           tokenService = new TokenUsageService(userId)         │
│           await tokenService.processSessionUsage({...})        │
│         }                                                      │
│       }                                                        │
│                                                                 │
│    5️⃣ YIELD TO FRONTEND (lines 374-378):                       │
│       yield {                                                  │
│         type: "claude_json",                                   │
│         data: sdkMessage // includes token_update              │
│       }                                                        │
│  }                                                             │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                    ┌─────────┴──────────┐
                    │                    │
                    ▼                    ▼
    ┌───────────────────────┐  ┌────────────────────────┐
    │   FRONTEND RECEIVES   │  │   DATABASE SAVING      │
    │                       │  │                        │
    │  useStreamParser:     │  │  TokenUsageService:    │
    │  • Gets token_update  │  │  • processSessionUsage │
    │  • setTokenUsage()    │  │  • calculateCost()     │
    │  • Updates progress   │  │  • formatSessionData() │
    │    bar UI             │  │  • formatDailyData()   │
    │                       │  │                        │
    │  ✅ WORKS PERFECTLY  │  │  ⚠️ NEEDS ENV VARS    │
    └───────────────────────┘  └────────────┬───────────┘
                                            │
                                            ▼
    ┌────────────────────────────────────────────────────┐
    │              SUPABASE DATABASE                     │
    │                                                    │
    │  supabaseService.db.rpc('upsert_token_usage', {   │
    │    session_data: {...},                           │
    │    daily_data: {...}                              │
    │  })                                                │
    │                                                    │
    │  Tables:                                          │
    │  • token_usage_sessions (9 records)               │
    │  • token_usage_daily (4 records)                  │
    │                                                    │
    │  ⚠️ MISSING CONNECTION:                           │
    │  • SUPABASE_URL not in .env                       │
    │  • SUPABASE_SERVICE_KEY not in .env               │
    └────────────────────────────────────────────────────┘
```

## 🔍 ACTUAL TOKEN FLOW - STEP BY STEP

### Step 1: User Sends Message
- User types in chat interface
- Frontend sends POST to `/api/chat`
- Request includes message content and session info

### Step 2: Backend Initiates Claude Query
- `handleChatRequest()` in chat.ts receives request
- Calls `executeClaudeCommand()` which creates Claude SDK query
- Query sent with `stream: true` for real-time responses

### Step 3: Stream Processing Loop
**Location: chat.ts lines 275-379**
```typescript
for await (const sdkMessage of sdk.query({...})) {
  // This loop runs multiple times per message
  // Each iteration may contain token usage data
}
```

### Step 4: Session ID Capture
**Location: chat.ts lines 277-280**
- First message is type 'system' with init event
- Contains `session_id` at root level (NOT in message object)
- Stored in `actualSessionId` variable for later use

### Step 5: Token Usage Detection
**Location: chat.ts lines 295-326**
- Check if `sdkMessage.message?.usage` exists
- Contains all token types:
  - `input_tokens`
  - `output_tokens`
  - `cache_creation_input_tokens`
  - `cache_read_input_tokens`
  - `thinking_tokens`

### Step 6: Token Update Message Creation
**Location: chat.ts lines 327-339**
- Creates `token_update` type message
- Includes all token counts and totals
- Attaches session ID for tracking

### Step 7: Database Saving (CONDITIONAL)
**Location: chat.ts lines 341-371**

**Current Logic Flow:**
1. Check if `actualSessionId` exists ✅
2. Get user ID via `getTokenTrackingUserId()`:
   - Development mode (`DISABLE_AUTH=true` + `NODE_ENV=development`): Returns test user ID ✅
   - Production mode with `USER_ID` env var: Returns that user ID ⚠️
   - Otherwise: Returns null, skips saving ❌
3. If user ID exists, create `TokenUsageService`
4. Call `processSessionUsage()` with token data

**Database Operation:**
- Uses `supabaseService.db.rpc('upsert_token_usage', {...})`
- Atomic upsert to both tables:
  - `token_usage_sessions`: Per-session tracking
  - `token_usage_daily`: Daily aggregations
- Includes retry logic with exponential backoff

### Step 8: Frontend Display
**Location: useStreamParser hook**
- Receives `token_update` messages
- Calls `setTokenUsage()` in TokenContext
- Updates progress bar UI showing:
  - Current tokens used
  - Percentage of 200K limit
  - Visual progress indicator

## 🚨 CURRENT ISSUES

### Issue 1: Missing Supabase Credentials
**Problem**: Environment variables not set
```bash
SUPABASE_URL=undefined        # ❌ MISSING
SUPABASE_SERVICE_KEY=undefined # ❌ MISSING
```

**Impact**:
- `supabaseService.createClient()` fails
- Token data not saved to database
- Silent failure (caught in try/catch)

**Solution**: Add to `.env`:
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=sb_secret_your_key_here
```

### Issue 2: User ID Management
**Current State**:
- Development: Uses hardcoded test user ID ✅
- Production: Requires `USER_ID` env var per container ⚠️
- No auth context: Skips tracking entirely ❌

**Future Enhancement**:
- Extract user ID from JWT token in auth headers
- Implement proper auth middleware
- Remove hardcoded test user

## ✅ WHAT'S WORKING

1. **Token Extraction**: Successfully pulls usage from Claude SDK ✅
2. **Session Tracking**: Correctly captures session IDs ✅
3. **Frontend Display**: Progress bar shows real-time updates ✅
4. **Database Schema**: Tables and functions created properly ✅
5. **Cost Calculation**: Using correct 2025 Anthropic pricing ✅
6. **Retry Logic**: Exponential backoff for failed saves ✅

## ⚠️ WHAT NEEDS FIXING

1. **Environment Variables**: Add SUPABASE_URL and SUPABASE_SERVICE_KEY
2. **Production User ID**: Implement proper user context extraction
3. **Error Visibility**: Consider logging database connection failures

## 📊 DATA FLOW SUMMARY

```
User Message → Frontend → Backend → Claude SDK → Stream Loop →
  ├→ Token Update → Frontend Progress Bar ✅
  └→ Token Data → Database Save (if env vars set) ⚠️
```

The system is **fully implemented** but **partially configured**. Once Supabase credentials are added, token tracking will work immediately.