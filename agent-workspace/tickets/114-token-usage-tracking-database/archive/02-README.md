# Ticket 114: Token Usage Tracking Database Implementation

## Status: 🎯 READY FOR IMPLEMENTATION

**Implementation Time**: ~45 minutes
**Complexity**: Medium - Database schema + backend integration

## Problem Statement

Currently, My Jarvis has no token usage tracking in the database. We need to implement a comprehensive token tracking system that captures usage from Claude Code's JSONL session files and stores it in Supabase for billing, analytics, and user management.

## Goal

Create a database schema and backend system to track all token usage (input, output, cache, thinking) from Claude Code sessions and associate it with user accounts for accurate billing and usage monitoring.

## Current Architecture Analysis

### What We Have
1. **Supabase Database**: User management with `auth.users`, `user_instances`, `waiting_list`, `signup_codes`
2. **Multi-tenant Setup**: Each user gets their own Fly.io app instance
3. **Claude Code JSONL Files**: Automatic session tracking at `~/.claude/projects/-workspace/{sessionId}.jsonl`
4. **Session Token Handler**: `/lib/claude-webui-server/handlers/session-tokens.ts` reads JSONL files

### Current Token Structure (from Claude Code JSONL)
```json
{
  "type": "assistant",
  "timestamp": "2025-11-28T16:21:54.135Z",
  "sessionId": "c26cf239-...",
  "message": {
    "usage": {
      "input_tokens": 1247,
      "output_tokens": 176,
      "cache_creation_input_tokens": 464,
      "cache_read_input_tokens": 37687
    }
  }
}
```

## Database Schema Design

### Table 1: `token_usage_sessions`
Granular tracking of individual Claude Code sessions.

```sql
CREATE TABLE public.token_usage_sessions (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,

  -- Token counts (all token types)
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cache_creation_tokens INTEGER NOT NULL DEFAULT 0,
  cache_read_tokens INTEGER NOT NULL DEFAULT 0,
  thinking_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER GENERATED ALWAYS AS (
    input_tokens + output_tokens + cache_creation_tokens + cache_read_tokens + thinking_tokens
  ) STORED,

  -- Metadata
  message_count INTEGER NOT NULL DEFAULT 0,
  session_started_at TIMESTAMPTZ NOT NULL,
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Cost calculation (based on model pricing)
  estimated_cost_usd DECIMAL(10,6) NOT NULL DEFAULT 0.00,
  model_used TEXT DEFAULT 'claude-3-5-sonnet-20241022',

  -- Unique constraint to prevent duplicate session tracking
  UNIQUE(user_id, session_id)
);
```

### Table 2: `token_usage_daily`
Aggregated daily totals for billing and analytics.

```sql
CREATE TABLE public.token_usage_daily (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL,

  -- Daily aggregated token counts
  daily_input_tokens BIGINT NOT NULL DEFAULT 0,
  daily_output_tokens BIGINT NOT NULL DEFAULT 0,
  daily_cache_creation_tokens BIGINT NOT NULL DEFAULT 0,
  daily_cache_read_tokens BIGINT NOT NULL DEFAULT 0,
  daily_thinking_tokens BIGINT NOT NULL DEFAULT 0,
  daily_total_tokens BIGINT GENERATED ALWAYS AS (
    daily_input_tokens + daily_output_tokens + daily_cache_creation_tokens +
    daily_cache_read_tokens + daily_thinking_tokens
  ) STORED,

  -- Daily stats
  daily_session_count INTEGER NOT NULL DEFAULT 0,
  daily_message_count INTEGER NOT NULL DEFAULT 0,
  daily_cost_usd DECIMAL(12,6) NOT NULL DEFAULT 0.00,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint for one record per user per day
  UNIQUE(user_id, usage_date)
);
```

### Indexes for Performance
```sql
-- Session table indexes
CREATE INDEX idx_token_sessions_user_id ON token_usage_sessions(user_id);
CREATE INDEX idx_token_sessions_date ON token_usage_sessions(last_updated_at);
CREATE INDEX idx_token_sessions_session_id ON token_usage_sessions(session_id);

-- Daily table indexes
CREATE INDEX idx_token_daily_user_id ON token_usage_daily(user_id);
CREATE INDEX idx_token_daily_date ON token_usage_daily(usage_date);
CREATE INDEX idx_token_daily_cost ON token_usage_daily(daily_cost_usd);
```

### Row Level Security (RLS)
```sql
-- Enable RLS on both tables
ALTER TABLE token_usage_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_usage_daily ENABLE ROW LEVEL SECURITY;

-- Users can only see their own token usage
CREATE POLICY "Users can view own token sessions" ON token_usage_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own daily usage" ON token_usage_daily
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can insert/update for backend processing
CREATE POLICY "Service role can manage all token data" ON token_usage_sessions
  FOR ALL USING (current_setting('role') = 'service_role');

CREATE POLICY "Service role can manage daily usage" ON token_usage_daily
  FOR ALL USING (current_setting('role') = 'service_role');
```

## Backend Implementation Architecture

### Overview
Each user's Fly.io instance runs a background token tracking service that:
1. Monitors Claude Code JSONL files for changes
2. Parses new token usage data
3. Makes authenticated API calls to Supabase
4. Updates both session and daily aggregation tables

### Implementation Location
**File**: `/lib/token-tracking/token-usage-service.ts`

### Core Service Class
```typescript
interface TokenUsageData {
  sessionId: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  thinkingTokens: number;
  messageCount: number;
  sessionStartedAt: string;
  model: string;
}

class TokenUsageService {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  async processSessionUsage(data: TokenUsageData): Promise<void> {
    // Use centralized Supabase service with 2025 best practices
    const { error } = await supabaseService.withRetry(async () => {
      return supabaseService.db.rpc('upsert_token_usage', {
        session_data: this.formatSessionData(data),
        daily_data: this.formatDailyData(data)
      })
    })

    if (error) {
      throw new Error(`Token tracking failed: ${error.message}`)
    }
  }

  private calculateCost(data: TokenUsageData): number {
    // 2025 Anthropic Pricing (per million tokens)
    const pricing = {
      input: 3,        // $3 per million input tokens
      output: 15,      // $15 per million output tokens
      cacheWrite: 7.5, // $7.50 per million cache write tokens
      cacheRead: 0.3,  // $0.30 per million cache read tokens
      thinking: 3      // $3 per million thinking tokens (2025 feature)
    }

    return (
      (data.inputTokens * pricing.input) +
      (data.outputTokens * pricing.output) +
      (data.cacheCreationTokens * pricing.cacheWrite) +
      (data.cacheReadTokens * pricing.cacheRead) +
      (data.thinkingTokens * pricing.thinking)
    ) / 1_000_000
  }
}
```

### File System Monitoring
```typescript
class SessionFileMonitor {
  private watcher: FSWatcher;
  private tokenService: TokenUsageService;
  private claudeProjectsPath: string;

  constructor(userId: string) {
    this.tokenService = new TokenUsageService(userId);
    this.claudeProjectsPath = path.join(
      process.env.HOME || '/home/node',
      '.claude/projects/-workspace'
    );
  }

  start(): void {
    this.watcher = fs.watch(this.claudeProjectsPath, (eventType, filename) => {
      if (filename?.endsWith('.jsonl')) {
        this.processSessionFile(filename);
      }
    });
  }

  private async processSessionFile(filename: string): Promise<void> {
    const sessionId = filename.replace('.jsonl', '');
    const usage = await this.parseJSONLForUsage(sessionId);

    if (usage) {
      await this.tokenService.processSessionUsage(usage);
    }
  }
}
```

### Integration with Chat Handler
Update `/lib/claude-webui-server/handlers/chat.ts`:

```typescript
// Add after successful Claude SDK response
if (process.env.TOKEN_TRACKING_ENABLED === 'true') {
  // Trigger token tracking service to check for new usage
  TokenTrackingService.getInstance().scheduleUsageCheck(sessionId);
}
```

### API Endpoints

**GET /api/token-usage/session/:sessionId**
```typescript
// Returns detailed token usage for a specific session
export async function getSessionUsage(c: Context): Promise<Response> {
  const sessionId = c.req.param("sessionId");
  const userId = getUserFromContext(c);

  const usage = await supabase
    .from('token_usage_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('session_id', sessionId)
    .single();

  return c.json(usage.data);
}
```

**GET /api/token-usage/daily**
```typescript
// Returns daily usage aggregates with optional date range
export async function getDailyUsage(c: Context): Promise<Response> {
  const userId = getUserFromContext(c);
  const startDate = c.req.query('start_date');
  const endDate = c.req.query('end_date');

  let query = supabase
    .from('token_usage_daily')
    .select('*')
    .eq('user_id', userId)
    .order('usage_date', { ascending: false });

  if (startDate) query = query.gte('usage_date', startDate);
  if (endDate) query = query.lte('usage_date', endDate);

  const usage = await query;
  return c.json(usage.data);
}
```

## Environment Variables

Add to each user's Fly.io instance:
```bash
# Token tracking configuration
TOKEN_TRACKING_ENABLED=true
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
USER_ID=uuid-from-auth-users-table
```

## Implementation Steps

### Phase 1: Database Setup
1. **Create migration files** for both tables with proper RLS
2. **Apply migration** to Supabase database
3. **Verify indexes** and constraints are working
4. **Test RLS policies** with sample data

### Phase 2: Backend Service
1. **Create TokenUsageService class** with Supabase integration
2. **Implement JSONL parsing logic** to extract all token types
3. **Add cost calculation** with current model pricing
4. **Create file system monitor** for real-time updates

### Phase 3: API Integration
1. **Add token tracking endpoints** to chat server
2. **Update chat handler** to trigger usage checks
3. **Create frontend components** to display usage data
4. **Add usage monitoring** to user dashboard

### Phase 4: Deployment & Testing
1. **Deploy to staging** with test users
2. **Verify token accuracy** against Claude Code JSONL files
3. **Test billing calculations** and daily aggregations
4. **Performance testing** with concurrent users

## Playwright Testing Suite

### Testing Infrastructure

Following Ticket 113's patterns, token tracking requires comprehensive end-to-end testing using dedicated Docker containers and isolated test environments.

**Test Location**: `/playwright-tests/token-tracking/`

**Test Categories**:
1. **Token Usage API Tests** - API endpoint functionality and authentication
2. **Database Integration Tests** - Supabase schema, RLS policies, data integrity
3. **JSONL Monitoring Tests** - File watching, parsing, real-time updates

### Docker Container Setup

**CRITICAL REQUIREMENTS** (Following Ticket 113 patterns):
1. **CREATE YOUR OWN CONTAINER INSTANCE** - Do NOT use other tickets' containers!
2. **Use dedicated port**: Port 3003 for Ticket 114 (Ticket 113: 3001, Ticket 111: 3002)
3. **Always use Docker DEV MODE** - Never run standalone React app

```bash
# Navigate to project directory
cd /Users/erezfern/Workspace/my-jarvis/spaces/my-jarvis-desktop/projects/my-jarvis-desktop

# Create test environment configuration
cat > .env.test << EOF
# Token tracking test configuration
ANTHROPIC_API_KEY=sk-ant-api03-[TEST_KEY]
TOKEN_TRACKING_ENABLED=true
SUPABASE_URL=https://test-project.supabase.co
SUPABASE_SERVICE_KEY=sb_secret_[TEST_SERVICE_KEY]
USER_ID=test-user-uuid
NODE_ENV=test
EOF

# Start YOUR OWN container instance on port 3003
# IMPORTANT: Ticket 113 uses port 3001, Ticket 111 uses port 3002
docker compose -p ticket-114-token-tracking run -d --service-ports -p 3003:3000 app

# Verify your container is running on port 3003
docker ps | grep 3003

# Run Playwright tests from shared infrastructure
cd /Users/erezfern/Workspace/my-jarvis/spaces/my-jarvis-desktop/projects/my-jarvis-desktop/playwright-tests
npm install
PLAYWRIGHT_BASE_URL=http://localhost:3003 npm test token-tracking/

# Clean up YOUR container (not other tickets'!)
docker compose -p ticket-114-token-tracking down
```

### Test Suite Overview

#### 1. Token Usage API Tests (`token-usage-api.spec.ts`)

**Test Scenarios**:
- Session token usage tracking and retrieval
- Daily usage aggregation and queries
- Date range filtering for usage reports
- Authentication and authorization (RLS testing)
- Cost calculation validation (2025 Anthropic pricing)
- Concurrent session handling

**Key Validations**:
```typescript
// Session data structure validation
expect(sessionData).toHaveProperty('input_tokens');
expect(sessionData).toHaveProperty('output_tokens');
expect(sessionData).toHaveProperty('cache_creation_tokens');
expect(sessionData).toHaveProperty('cache_read_tokens');
expect(sessionData).toHaveProperty('thinking_tokens');
expect(sessionData).toHaveProperty('total_tokens');
expect(sessionData).toHaveProperty('estimated_cost_usd');

// Cost calculation accuracy (2025 pricing)
const expectedCost = (
  (sessionData.input_tokens * 3) +           // $3/M input
  (sessionData.output_tokens * 15) +         // $15/M output
  (sessionData.cache_creation_tokens * 7.5) + // $7.50/M cache write
  (sessionData.cache_read_tokens * 0.3) +    // $0.30/M cache read
  (sessionData.thinking_tokens * 3)          // $3/M thinking
) / 1_000_000;
```

#### 2. Database Integration Tests (`database-integration.spec.ts`)

**Test Scenarios**:
- Table schema validation (columns, constraints, indexes)
- Row Level Security (RLS) policy enforcement
- UPSERT operations and conflict resolution
- Daily usage aggregation logic
- Database performance with concurrent operations
- Referential integrity and cascade operations

**Key Database Validations**:
```typescript
// RLS enforcement testing
const unauthorizedAccess = await db.queryAsUser('different-user-id',
  `SELECT * FROM token_usage_sessions WHERE session_id = '${sessionId}'`
);
expect(unauthorizedAccess.length).toBe(0);

// Computed column validation
expect(result[0].total_tokens).toBe(
  inputTokens + outputTokens + cacheCreationTokens + cacheReadTokens + thinkingTokens
);
```

#### 3. JSONL Monitoring Tests (`jsonl-monitoring.spec.ts`)

**Test Scenarios**:
- Claude Code JSONL format parsing
- Real-time file change detection
- Malformed JSON handling
- Missing usage data scenarios
- Multiple concurrent session monitoring
- File system error handling

**Key JSONL Validations**:
```typescript
// Real-time monitoring validation
const firstMessage = { /* initial usage data */ };
await fs.writeFile(jsonlPath, JSON.stringify(firstMessage));

// Verify initial processing
let sessionData = await api.getSessionUsage(testSessionId);
expect(sessionData.message_count).toBe(1);

// Append new message and verify update
const secondMessage = { /* additional usage data */ };
await fs.appendFile(jsonlPath, '\n' + JSON.stringify(secondMessage));
sessionData = await api.getSessionUsage(testSessionId);
expect(sessionData.message_count).toBe(2);
```

### Test Execution Commands

```bash
# Run all token tracking tests
PLAYWRIGHT_BASE_URL=http://localhost:3003 npm test token-tracking/

# Run specific test categories
PLAYWRIGHT_BASE_URL=http://localhost:3003 npm test token-tracking/token-usage-api.spec.ts
PLAYWRIGHT_BASE_URL=http://localhost:3003 npm test token-tracking/database-integration.spec.ts
PLAYWRIGHT_BASE_URL=http://localhost:3003 npm test token-tracking/jsonl-monitoring.spec.ts

# Run with debugging output
PLAYWRIGHT_BASE_URL=http://localhost:3003 npm test token-tracking/ -- --headed --slowMo=1000

# Generate test report
PLAYWRIGHT_BASE_URL=http://localhost:3003 npm test token-tracking/ -- --reporter=html
```

### Test Data Management

**Helper Classes Created**:
- `DatabaseHelpers` - Supabase operations, RLS testing, data validation
- `FileSystemHelpers` - JSONL file creation, monitoring, filesystem operations
- `TestUtils` - Token data generation, cleanup, environment setup

**Test Environment Isolation**:
- Dedicated test user accounts with cleanup
- Temporary JSONL directories
- Isolated database schemas for testing
- Automatic cleanup after each test

### Success Criteria Validation

Each test validates specific success criteria:

- ✅ **Database Schema**: Schema validation tests verify table structure and constraints
- ✅ **Real-time Tracking**: File monitoring tests ensure 30-second response time
- ✅ **Accurate Billing**: Cost calculation tests validate against 2025 Anthropic pricing
- ✅ **Data Integrity**: UPSERT and aggregation tests prevent duplicates
- ✅ **Performance**: API response time tests ensure sub-100ms queries
- ✅ **Security**: RLS tests verify cross-user data access prevention

### Test Environment Setup Requirements

**Prerequisites**:
1. Test Supabase project with service role key
2. Test Claude Code JSONL directory structure
3. Docker environment with .env.test configuration
4. Playwright browser dependencies installed

**Environment Variables for Testing**:
```bash
ANTHROPIC_API_KEY=sk-ant-api03-[TEST_KEY]
TOKEN_TRACKING_ENABLED=true
SUPABASE_URL=https://test-project.supabase.co
SUPABASE_SERVICE_KEY=sb_secret_[TEST_SERVICE_KEY]
USER_ID=test-user-uuid
NODE_ENV=test
CLAUDE_PROJECTS_PATH=/tmp/test-claude-projects
```

## Success Criteria

- ✅ **Database Schema**: Tables created with proper relationships and RLS
- ✅ **Real-time Tracking**: Token usage captured within 30 seconds of Claude response
- ✅ **Accurate Billing**: Cost calculations match Anthropic's official pricing
- ✅ **Data Integrity**: No duplicate sessions, proper aggregation logic
- ✅ **Performance**: Sub-100ms API response times for usage queries
- ✅ **Security**: RLS prevents cross-user data access
- ✅ **Testing Coverage**: Comprehensive Playwright test suite validates all functionality

## Future Enhancements (Next Tickets)

1. **Ticket 115**: Usage analytics dashboard with charts and trends
2. **Ticket 116**: Billing integration with Stripe for automated invoicing
3. **Ticket 117**: Usage limits and warnings when approaching quotas
4. **Ticket 118**: Cost optimization recommendations based on usage patterns

---

**Created**: 2025-11-28
**Assigned**: Ready for implementation
**Priority**: HIGH - Required for billing and user management
**Dependencies**: Ticket 113 (Company API Key) must be complete