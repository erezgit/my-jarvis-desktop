# Token Usage Tracking - Implementation Plan

## Current Status: ⚠️ PARTIALLY WORKING
- ✅ Database tables created and working
- ✅ Backend code fully implemented
- ✅ Token capture from Claude SDK working
- ✅ Frontend progress bar displaying tokens
- ❌ Production saving failing due to USER_ID mismatch
- ⚠️ Deployment process needs USER_ID step

## What's Already Implemented ✅

### 1. Database Layer (COMPLETE)
- **Tables Created**: `token_usage_sessions` and `token_usage_daily`
- **RLS Policies**: Configured and working
- **UPSERT Function**: `upsert_token_usage` handling atomic operations
- **Indexes**: Performance optimizations in place
- **Test Data**: 9 sessions already tracked (from earlier testing)

### 2. Backend Services (COMPLETE)
```
✅ /app/lib/database/supabase-client.ts - Centralized Supabase service
✅ /app/lib/token-tracking/token-usage-service.ts - Token processing & cost calculation
✅ /lib/claude-webui-server/handlers/chat.ts - Real-time token capture
✅ Environment-based user ID selection (dev vs prod)
```

### 3. Token Capture Flow (WORKING)
- Claude SDK streams messages with usage data
- Session ID captured from system messages
- Token counts extracted from `sdkMessage.message.usage`
- Cost calculated using 2025 Anthropic pricing
- Frontend receives token updates for progress bar

### 4. Environment Variables (PARTIALLY CONFIGURED)
**Currently Set in Fly.io:**
```bash
✅ SUPABASE_URL        # Configured
✅ SUPABASE_SERVICE_KEY # Configured
❌ USER_ID             # Wrong value (needs update)
```

## What Needs to Be Done 🔧

### 1. Fix USER_ID for my-jarvis-erez (IMMEDIATE)
```bash
# Current issue: USER_ID doesn't match database user
# Actual user ID for erez.test@gmail.com: 3dfb3580-b7c4-4da3-8d9e-b9775c216f7e

# Fix command:
fly secrets set USER_ID="3dfb3580-b7c4-4da3-8d9e-b9775c216f7e" --app my-jarvis-erez
```

### 2. Update Deployment Process
**File to Update**: `/spaces/my-jarvis-desktop/docs/deployment.md`

Add after Step 7 (Create Supabase User):
```markdown
## Step 7.5: Set User ID in Fly Secrets
After creating the user in Supabase, immediately set their USER_ID:

```bash
# Get the user ID from Supabase query or auth.users table
fly secrets set USER_ID="<user-uuid-from-supabase>" --app <app-name>
```

This enables token usage tracking for the container.
```

### 3. Update All Existing Users
Query to get all user IDs:
```sql
SELECT
  u.id as user_id,
  u.email,
  ui.fly_app_name
FROM auth.users u
JOIN user_instances ui ON u.id = ui.user_id
WHERE ui.status = 'active'
ORDER BY u.email;
```

Then for each user:
```bash
fly secrets set USER_ID="<user-id>" --app <fly-app-name>
```

### 4. Clean Up Debug Logging (OPTIONAL)
**File**: `/lib/claude-webui-server/handlers/chat.ts`
- Remove excessive console.log statements (lines 290-320)
- Keep only essential database success/failure logs

## Implementation Checklist

### Phase 1: Fix Production (TODAY)
- [ ] Run USER_ID update for my-jarvis-erez
- [ ] Test token tracking with new message
- [ ] Verify records saved in Supabase

### Phase 2: Update Deployment (NEXT)
- [ ] Update deployment.md with USER_ID step
- [ ] Document USER_ID requirement in CLAUDE.md
- [ ] Add validation script to check USER_ID

### Phase 3: Update All Users
- [ ] Query all user IDs from database
- [ ] Create script to update all Fly apps
- [ ] Run updates for all 14 users
- [ ] Verify token tracking for each

### Phase 4: Future Improvements
- [ ] Implement JWT token extraction (remove USER_ID dependency)
- [ ] Add usage analytics dashboard
- [ ] Create billing reports
- [ ] Set up usage alerts

## Testing Procedure

### 1. After USER_ID Update
```bash
# Restart the app to pick up new secret
fly apps restart --app my-jarvis-erez

# Test with a message
# Check database for new records
```

### 2. Verify in Supabase
```sql
-- Check recent sessions
SELECT * FROM token_usage_sessions
WHERE user_id = '3dfb3580-b7c4-4da3-8d9e-b9775c216f7e'
AND session_started_at > NOW() - INTERVAL '10 minutes'
ORDER BY session_started_at DESC;
```

## Code Locations Reference

| Component | Location | Status |
|-----------|----------|--------|
| Database Schema | Supabase Dashboard | ✅ Complete |
| Supabase Client | `/app/lib/database/supabase-client.ts` | ✅ Complete |
| Token Service | `/app/lib/token-tracking/token-usage-service.ts` | ✅ Complete |
| Chat Handler | `/lib/claude-webui-server/handlers/chat.ts:341-371` | ✅ Complete |
| User ID Logic | `/lib/claude-webui-server/handlers/chat.ts:12-27` | ✅ Complete |
| Environment Vars | Fly.io Secrets | ⚠️ Needs USER_ID fix |

## Success Criteria

1. ✅ Token usage saves to database in real-time
2. ✅ Correct user attribution (matching auth.users)
3. ✅ Cost calculations accurate to 2025 pricing
4. ✅ Daily aggregations working
5. ✅ No silent failures (errors logged)

## Notes on Architecture

- **Current**: Each container has hardcoded USER_ID (container-specific)
- **Pros**: Simple, secure, perfect isolation
- **Cons**: Manual USER_ID management, deployment complexity
- **Future**: Extract user ID from JWT tokens for proper auth flow

## Rollback Plan

If issues arise:
1. Set `TOKEN_TRACKING_ENABLED=false` in Fly secrets
2. Deploy without token tracking code
3. Debug locally with test user
4. Re-enable when fixed