# Token Usage Tracking Architecture

## Overview
Token usage tracking system for My Jarvis that captures Claude SDK token consumption and stores it in Supabase for billing, analytics, and user management. Each user's isolated Fly.io container tracks its own usage and reports to a centralized database.

## Architecture Decision: Container-Specific User ID
Each Fly.io container serves ONE user exclusively. The USER_ID is set as an environment variable during container deployment, eliminating the need for complex authentication flows within the container while maintaining perfect user isolation.

## Database Schema (Supabase)

### Table: `token_usage_sessions`
Granular tracking of individual Claude Code sessions.

```sql
CREATE TABLE public.token_usage_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,

  -- All token types (including 2025 thinking tokens)
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cache_creation_tokens INTEGER NOT NULL DEFAULT 0,
  cache_read_tokens INTEGER NOT NULL DEFAULT 0,
  thinking_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER GENERATED ALWAYS AS (
    input_tokens + output_tokens + cache_creation_tokens +
    cache_read_tokens + thinking_tokens
  ) STORED,

  -- Metadata
  message_count INTEGER NOT NULL DEFAULT 0,
  session_started_at TIMESTAMPTZ NOT NULL,
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  estimated_cost_usd DECIMAL(10,6) NOT NULL DEFAULT 0.00,
  model_used TEXT DEFAULT 'claude-3-5-sonnet-20241022',

  UNIQUE(user_id, session_id)
);
```

### Table: `token_usage_daily`
Aggregated daily totals for billing and analytics.

```sql
CREATE TABLE public.token_usage_daily (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL,

  -- Daily aggregated token counts
  daily_input_tokens BIGINT NOT NULL DEFAULT 0,
  daily_output_tokens BIGINT NOT NULL DEFAULT 0,
  daily_cache_creation_tokens BIGINT NOT NULL DEFAULT 0,
  daily_cache_read_tokens BIGINT NOT NULL DEFAULT 0,
  daily_thinking_tokens BIGINT NOT NULL DEFAULT 0,
  daily_total_tokens BIGINT GENERATED ALWAYS AS (
    daily_input_tokens + daily_output_tokens +
    daily_cache_creation_tokens + daily_cache_read_tokens +
    daily_thinking_tokens
  ) STORED,

  -- Daily stats
  daily_session_count INTEGER NOT NULL DEFAULT 0,
  daily_message_count INTEGER NOT NULL DEFAULT 0,
  daily_cost_usd DECIMAL(12,6) NOT NULL DEFAULT 0.00,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, usage_date)
);
```

### Row Level Security (RLS)
```sql
-- Users can only see their own data
ALTER TABLE token_usage_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_usage_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own sessions" ON token_usage_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users view own daily" ON token_usage_daily
  FOR SELECT USING (auth.uid() = user_id);

-- Service role for backend operations
CREATE POLICY "Service role manages all" ON token_usage_sessions
  FOR ALL USING (current_setting('role') = 'service_role');
```

### Database Function: Atomic UPSERT
```sql
CREATE OR REPLACE FUNCTION upsert_token_usage(
  session_data JSONB,
  daily_data JSONB
) RETURNS VOID
SECURITY DEFINER
LANGUAGE plpgsql AS $$
BEGIN
  -- Upsert session data
  INSERT INTO token_usage_sessions (
    user_id, session_id, input_tokens, output_tokens,
    cache_creation_tokens, cache_read_tokens, thinking_tokens,
    message_count, session_started_at, estimated_cost_usd, model_used
  ) VALUES (
    (session_data->>'user_id')::UUID,
    session_data->>'session_id',
    -- ... all fields
  )
  ON CONFLICT (user_id, session_id)
  DO UPDATE SET
    input_tokens = EXCLUDED.input_tokens,
    -- ... update all fields
    last_updated_at = NOW();

  -- Upsert daily aggregation
  INSERT INTO token_usage_daily (
    user_id, usage_date, daily_input_tokens, -- ... all fields
  ) VALUES (
    (daily_data->>'user_id')::UUID,
    (daily_data->>'usage_date')::DATE,
    -- ... all fields
  )
  ON CONFLICT (user_id, usage_date)
  DO UPDATE SET
    daily_input_tokens = token_usage_daily.daily_input_tokens + EXCLUDED.daily_input_tokens,
    -- ... aggregate all fields
    updated_at = NOW();
END;
$$;
```

## Backend Architecture

### Core Components

#### 1. Supabase Service (`/app/lib/database/supabase-client.ts`)
Singleton service with retry logic and connection pooling.

```typescript
class SupabaseService {
  createClient() {
    return createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
      {
        auth: { persistSession: false },
        db: { schema: 'public' }
      }
    )
  }

  async withRetry<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
    // Exponential backoff retry logic
  }
}
```

#### 2. Token Usage Service (`/app/lib/token-tracking/token-usage-service.ts`)
Handles cost calculation and database operations.

```typescript
class TokenUsageService {
  constructor(private userId: string) {}

  async processSessionUsage(data: TokenUsageData): Promise<void> {
    const cost = this.calculateCost(data)
    await supabaseService.withRetry(async () => {
      await supabaseService.db.rpc('upsert_token_usage', {
        session_data: this.formatSessionData(data, cost),
        daily_data: this.formatDailyData(data, cost)
      })
    })
  }

  private calculateCost(data: TokenUsageData): number {
    // 2025 Anthropic Pricing (per million tokens)
    const pricing = {
      input: 3,          // $3/M
      output: 15,        // $15/M
      cacheWrite: 3.75,  // $3.75/M
      cacheRead: 0.30,   // $0.30/M
      thinking: 3        // $3/M
    }
    // Calculate total cost
  }
}
```

#### 3. Chat Handler Integration (`/lib/claude-webui-server/handlers/chat.ts`)
Real-time token capture during Claude SDK streaming.

```typescript
function getTokenTrackingUserId(): string | null {
  // Development mode: test user
  if (process.env.DISABLE_AUTH === 'true' && process.env.NODE_ENV === 'development') {
    return '2553131c-33c9-49ad-8e31-ecd3b966ea94'
  }
  // Production: container-specific user
  if (process.env.USER_ID) {
    return process.env.USER_ID
  }
  return null
}

// In stream processing loop:
for await (const sdkMessage of sdk.query({...})) {
  // Capture session ID
  if (sdkMessage.type === 'system' && sdkMessage.session_id) {
    actualSessionId = sdkMessage.session_id
  }

  // Detect token usage
  if (sdkMessage.message?.usage) {
    // Save to database
    const userId = getTokenTrackingUserId()
    if (userId && actualSessionId) {
      const tokenService = new TokenUsageService(userId)
      await tokenService.processSessionUsage({
        sessionId: actualSessionId,
        inputTokens: usage.input_tokens || 0,
        // ... all token types
      })
    }
  }
}
```

## Environment Configuration

### Required Environment Variables
```bash
# Database Connection (Required for Production)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=sb_secret_your_key_here

# User Identification (Container-Specific)
USER_ID=3dfb3580-b7c4-4da3-8d9e-b9775c216f7e  # From auth.users table

# Development Mode
DISABLE_AUTH=true  # Development only
NODE_ENV=development  # or production
```

### Fly.io Secrets Management
```bash
# Set secrets for production container
fly secrets set SUPABASE_URL="https://your-project.supabase.co" --app my-jarvis-erez
fly secrets set SUPABASE_SERVICE_KEY="sb_secret_..." --app my-jarvis-erez
fly secrets set USER_ID="3dfb3580-b7c4-4da3-8d9e-b9775c216f7e" --app my-jarvis-erez
```

## Cost Calculation (2025 Anthropic Pricing)

| Token Type | Price per Million | Use Case |
|------------|-------------------|----------|
| Input | $3.00 | User messages, system prompts |
| Output | $15.00 | Claude responses |
| Cache Write | $3.75 | First-time context caching |
| Cache Read | $0.30 | Reusing cached context (90% discount) |
| Thinking | $3.00 | Claude's internal reasoning |

## Security Considerations

1. **Service Role Key**: Never expose in frontend, only in backend environment
2. **RLS Policies**: Ensure users can only see their own usage data
3. **User ID Validation**: Verify USER_ID matches authenticated user
4. **Connection Pooling**: Managed by Supavisor, no manual pooling needed
5. **Retry Logic**: Prevents data loss during transient failures

## Performance Optimizations

1. **Real-time Capture**: Tokens saved during streaming, not after
2. **Atomic Operations**: Single RPC call updates both tables
3. **Generated Columns**: Total tokens calculated in database
4. **Indexing**: On user_id, session_id, and usage_date
5. **Connection Reuse**: Supabase client singleton pattern

## Monitoring & Debugging

### Check Token Saving
```sql
-- Recent sessions for a user
SELECT * FROM token_usage_sessions
WHERE user_id = '3dfb3580-b7c4-4da3-8d9e-b9775c216f7e'
ORDER BY session_started_at DESC LIMIT 10;

-- Daily usage trends
SELECT * FROM token_usage_daily
WHERE user_id = '3dfb3580-b7c4-4da3-8d9e-b9775c216f7e'
ORDER BY usage_date DESC LIMIT 30;
```

### Debug Missing Tokens
1. Check USER_ID environment variable matches database user
2. Verify SUPABASE_URL and SUPABASE_SERVICE_KEY are set
3. Check container logs for database connection errors
4. Confirm session_id is being captured from Claude SDK

## Future Enhancements

1. **JWT Token Extraction**: Replace USER_ID env var with proper auth context
2. **Usage Alerts**: Notify when approaching limits
3. **Analytics Dashboard**: Visualize usage patterns
4. **Billing Integration**: Connect with Stripe for automated invoicing
5. **Multi-tenant Support**: If architecture evolves to shared containers