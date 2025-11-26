# Ticket #110: Path to 10 Paying Users - Implementation Checklist

**Status:** Ready to Implement
**Priority:** Critical
**Goal:** Get 10 paying users (engineers or general knowledge workers)
**Timeline:** 4-6 weeks

---

## Overview

This ticket outlines everything needed to reach the first milestone: 10 paying users for MyJarvis. The focus is on fixing critical bugs, implementing MCP-based file operations for structure and reliability, adding token tracking and billing, and enabling payments.

---

## Core Philosophy (From Architecture Discussion)

- **Product Focus:** Jarvis for general users, not developers. Structured, safe, guided experience.
- **File Storage:** Keep persistent volumes on Fly Machines (proven, professional, scalable)
- **Structure:** Move to MCP-based operations for control, consistency, and better UX
- **Database:** Supabase for user accounts, billing, metadata. Files stay on volumes.
- **Frontend:** Keep bundled in containers for now, separate later when it matters
- **Multi-tenant:** One Fly Machine per user with automated provisioning

---

## Phase 1: Fix Critical Bugs (Week 1)

### 1.1 File Tree Not Updating

**Problem:** File tree doesn't refresh properly after file operations

**Root Cause:** Parsing bash output is inconsistent

**Solution:** Use Claude SDK's native tools instead of bash

- [ ] Configure `allowedTools` to prioritize SDK native tools:
  - `Read` - reads files, returns structured JSON
  - `Write` - creates files, returns structured JSON
  - `Edit` - updates files, returns structured JSON
  - `Glob` - finds files, returns structured JSON
- [ ] Allow limited bash only for operations SDK tools don't cover (mkdir, mv, rm)
- [ ] Restrict bash to `/home/node/my-jarvis` directory only
- [ ] Update MessageProcessor to handle Read/Write/Edit tool responses
- [ ] Frontend listens to tool results and updates file tree immediately
- [ ] Test: Create file with Write tool → tree updates instantly
- [ ] Test: Delete file → tree updates instantly
- [ ] Test: Move file → tree reflects new location

**Expected Outcome:** File tree always in sync with workspace state

**Note:** Claude SDK already has structured file tools built-in. We don't need custom MCPs for basic file operations.

---

### 1.2 File Preview Not Showing Correctly

**Problem:** File preview doesn't always show the right content or update properly

**Root Cause:** Inconsistent file reading, timing issues with bash

**Solution:** Use Read tool for file reading with structured responses

- [ ] File preview component uses SDK's `Read` tool results
- [ ] Read tool returns structured JSON with path, content, metadata
- [ ] Handle all file types properly (markdown, code, PDF, images)
- [ ] Auto-open preview when file is created by agent (Write tool event)
- [ ] Test: Create markdown file → preview opens automatically
- [ ] Test: Update file content → preview refreshes
- [ ] Test: Switch between files → preview updates correctly

**Expected Outcome:** File preview always shows current content, updates reliably

---

### 1.3 Voice Messages Requiring Refresh

**Problem:** Voice messages don't appear until page refresh

**Root Cause:** Frontend not detecting new voice files, or polling issue

**Solution:** Real-time voice message detection

- [ ] Voice MCP emits event when voice file is generated
- [ ] Frontend listens to voice message events via WebSocket or polling
- [ ] Voice player component automatically shows new messages
- [ ] Implement message length handling:
  - [ ] Option A: Truncate very long messages (>2000 chars)
  - [ ] Option B: Split long messages into chunks
  - [ ] Option C: Add "expand" button for long messages
- [ ] Test: Generate voice message → appears immediately without refresh
- [ ] Test: Long message → displays properly without timeout

**Expected Outcome:** Voice messages appear in real-time, no refresh needed

---

## Phase 2: UI Workspace Boundary (Week 2)

### 2.1 Clean Workspace View in UI

**Goal:** Users only see their workspace, not system files

- [ ] File tree shows only `/home/node/my-jarvis` contents
- [ ] Hide system files from UI:
  - `/home/node/.claude/` (Claude sessions)
  - `/home/node/CLAUDE.md` (system config)
  - `/home/node/tools/` (voice scripts, etc.)
- [ ] Claude SDK keeps `cwd: /home/node` (can access CLAUDE.md)
- [ ] UI enforces workspace boundary, not the agent
- [ ] Test: User sees clean workspace in file tree
- [ ] Test: Agent can still access CLAUDE.md for configuration
- [ ] Test: User cannot navigate to system files in UI

**Expected Outcome:** Clean, professional workspace view. Agent has necessary access.

**Note:** Workspace boundary is enforced in UI layer, not in Claude's access. Claude needs access to CLAUDE.md to function properly.

---

### 2.2 Configure Allowed Tools

**Goal:** Prefer SDK structured tools over bash

- [ ] Configure Claude SDK `allowedTools`:
  ```typescript
  allowedTools: [
    'Read',     // SDK native file reading
    'Write',    // SDK native file creation
    'Edit',     // SDK native file editing
    'Glob',     // SDK native file finding
    'Bash',     // Allowed but discouraged for file ops
    'mcp__jarvis-tools__voice_generate',  // Voice tool
    // Web search if needed
  ]
  ```
- [ ] SDK will prefer Read/Write/Edit over bash when possible
- [ ] Bash still available for operations not covered by SDK tools
- [ ] Working directory stays `/home/node` (agent needs CLAUDE.md access)
- [ ] Test: Agent uses Write tool for creating files (not bash)
- [ ] Test: Agent uses Read tool for reading files (not cat)
- [ ] Test: Agent can still use bash for mkdir, mv, rm when needed

**Expected Outcome:** Structured tool responses improve UI reliability

---

### 2.3 UI Updates for Tool Responses

**Goal:** UI responds perfectly to SDK tool events

- [ ] Update MessageProcessor to handle SDK tool results:
  - `Write` tool → update file tree + open preview
  - `Edit` tool → refresh preview if open
  - `Read` tool → no UI change (just reading)
  - Bash delete → remove from tree + close preview
  - Bash move → update tree
- [ ] File tree component subscribes to tool result events
- [ ] File preview component subscribes to file update events
- [ ] Test all file operations → UI updates immediately and correctly

**Expected Outcome:** Silky smooth UI updates, no bugs

---

## Phase 3: Token Tracking & Billing (Week 3)

### 3.1 Token Tracking System

**Goal:** Track token usage per user, enforce limits

**Database Schema:**
```sql
-- Add to Supabase
CREATE TABLE user_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  tokens_used INTEGER DEFAULT 0,
  tokens_limit INTEGER DEFAULT 100000,  -- Free tier limit
  period_start TIMESTAMP DEFAULT NOW(),
  period_end TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  tokens_input INTEGER,
  tokens_output INTEGER,
  tokens_total INTEGER,
  cost_usd DECIMAL(10, 6),
  model VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Implementation:**
- [ ] Create Supabase tables
- [ ] Backend tracks tokens from Claude SDK responses
- [ ] Insert usage_event for each query
- [ ] Update user_usage.tokens_used
- [ ] Check if user exceeded limit before query
- [ ] Return error if limit exceeded: "You've reached your token limit. Please upgrade."
- [ ] Dashboard shows: tokens used / tokens limit
- [ ] Test: User reaches limit → blocked from more queries

---

### 3.2 Company API Key Management

**Goal:** Use company Anthropic API key for all users, track per-user usage

- [ ] Store company API key in environment variable
- [ ] All Claude SDK queries use company key
- [ ] Track usage per user in database
- [ ] Bill users based on tracked usage, not their own keys
- [ ] Same for OpenAI voice API key

**Expected Outcome:** Users don't need their own API keys, we manage everything

---

### 3.3 Usage Dashboard

**Goal:** Users can see their token usage and limits

- [ ] Add to UI: Token usage widget
  - Shows: "1,234 / 100,000 tokens used this month"
  - Progress bar
  - "Upgrade" button when approaching limit
- [ ] Add usage history page:
  - Table of recent queries
  - Tokens used per query
  - Date/time
  - Cost (optional, internal only)
- [ ] Test: User makes queries → usage updates in real-time

---

## Phase 4: Payment Integration (Week 4)

### 4.1 Pricing Tiers

**Free Tier:**
- 100,000 tokens/month
- 1 workspace
- Basic features
- Community support

**Pro Tier ($20/month):**
- 1,000,000 tokens/month
- Unlimited workspaces
- Priority support
- Voice messages
- Advanced features

**Enterprise (Custom):**
- Unlimited tokens
- Dedicated support
- SSO
- Custom integrations

---

### 4.2 Payment Integration (Stripe)

**Note:** Using Stripe instead of PayPal (more professional, better UX)

- [ ] Set up Stripe account
- [ ] Install Stripe SDK: `npm install stripe @stripe/stripe-js`
- [ ] Create Stripe products and prices
- [ ] Implement checkout flow:
  ```typescript
  // Backend: Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: user.stripe_customer_id,
    mode: 'subscription',
    line_items: [{ price: 'price_pro_monthly', quantity: 1 }],
    success_url: 'https://myjarvis.io/dashboard?payment=success',
    cancel_url: 'https://myjarvis.io/pricing',
  });
  ```
- [ ] Webhook handler for subscription events:
  - `customer.subscription.created` → activate Pro tier
  - `customer.subscription.deleted` → downgrade to Free
  - `invoice.payment_succeeded` → extend subscription
  - `invoice.payment_failed` → send warning email
- [ ] Update user table:
  ```sql
  ALTER TABLE users ADD COLUMN subscription_tier VARCHAR(50) DEFAULT 'free';
  ALTER TABLE users ADD COLUMN subscription_status VARCHAR(50);
  ALTER TABLE users ADD COLUMN stripe_customer_id VARCHAR(255);
  ALTER TABLE users ADD COLUMN subscription_expires_at TIMESTAMP;
  ```
- [ ] Test: User upgrades to Pro → tokens limit increases to 1M
- [ ] Test: Subscription expires → reverts to Free tier

---

### 4.3 Billing Portal

**Goal:** Users can manage subscription, see invoices, update payment method

- [ ] Stripe Customer Portal integration:
  ```typescript
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: user.stripe_customer_id,
    return_url: 'https://myjarvis.io/dashboard',
  });
  ```
- [ ] Add "Manage Billing" button in settings
- [ ] Test: User can cancel subscription → downgraded to Free
- [ ] Test: User can update payment method
- [ ] Test: User can see invoice history

---

## Phase 5: User Onboarding & Signup (Week 5)

### 5.1 Signup Flow

**Current:** Users sign up via MyJarvis Web (Next.js app)

**Enhancement:**
- [ ] After signup, automatically:
  - Create Supabase Auth user
  - Create user record in users table
  - Set default tier = 'free', tokens_limit = 100,000
  - Create Stripe customer
  - Provision Fly Machine for user (automated)
  - Send welcome email
- [ ] Free trial: First 100k tokens free, no credit card required
- [ ] Test: New user signs up → workspace ready in <60 seconds

---

### 5.2 Fly Machine Provisioning Automation

**Goal:** Auto-create Fly Machine when user signs up

- [ ] Create provisioning service (backend endpoint)
- [ ] On user signup:
  ```typescript
  const appName = `my-jarvis-${userId.substring(0, 8)}`;

  // Create Fly app
  await flyctl(['apps', 'create', appName]);

  // Create volume
  await flyctl(['volumes', 'create', 'workspace_data', '-a', appName, '--size', '10']);

  // Set secrets
  await flyctl(['secrets', 'set', `JWT_SECRET=${JWT_SECRET}`, '-a', appName]);

  // Deploy
  await flyctl(['deploy', '-a', appName]);

  // Store in database
  await db.users.update({
    where: { id: userId },
    data: { fly_app_name: appName, workspace_url: `https://${appName}.fly.dev` }
  });
  ```
- [ ] Test: Create user → Fly Machine provisioned automatically
- [ ] Test: User logs in → redirected to their machine

---

## Phase 6: Microphone & Voice Input (Week 6)

### 6.1 Microphone Integration

**Goal:** Users can speak to Jarvis instead of typing

**Options:**

**Option A: Browser-native speech-to-text (Free)**
- [ ] Use Web Speech API: `webkitSpeechRecognition`
- [ ] Add microphone button in chat input
- [ ] Convert speech to text
- [ ] Send text to agent
- [ ] Pros: Free, instant
- [ ] Cons: Chrome only, limited accuracy

**Option B: Whisper API (Best quality, costs money)**
- [ ] OpenAI Whisper API: `$0.006/minute`
- [ ] Record audio in browser
- [ ] Send to backend → Whisper API
- [ ] Return transcription
- [ ] Send to agent
- [ ] Pros: Best accuracy, multi-language
- [ ] Cons: Costs ~$0.01 per query

**Option C: Third-party (Wispr Flow, etc.)**
- [ ] User subscribes separately
- [ ] We provide integration
- [ ] Pros: User pays separately, not our cost
- [ ] Cons: Extra setup for user

**Recommendation:** Start with Option B (Whisper API)
- Include in token cost
- Best UX
- Can switch to Option C later if costs too high

**Implementation:**
- [ ] Add microphone button in chat input
- [ ] Record audio (browser MediaRecorder API)
- [ ] Send audio blob to backend
- [ ] Backend calls Whisper API:
  ```typescript
  const transcription = await openai.audio.transcriptions.create({
    file: audioBlob,
    model: 'whisper-1'
  });
  ```
- [ ] Return text to frontend
- [ ] Frontend sends as normal message
- [ ] Track Whisper cost as part of user's usage
- [ ] Test: User speaks → text appears → agent responds

---

## Testing Checklist (All Phases)

### Bug Fixes
- [ ] File tree updates immediately after file operations
- [ ] File preview shows correct content always
- [ ] Voice messages appear without refresh
- [ ] Long messages display properly

### MCP Operations
- [ ] Agent can create files within workspace
- [ ] Agent cannot access files outside workspace
- [ ] Agent cannot use bash commands
- [ ] All file operations return structured JSON
- [ ] UI updates instantly on all file operations

### Token Tracking
- [ ] Token usage tracked per query
- [ ] Usage displayed in dashboard
- [ ] User blocked when limit exceeded
- [ ] Upgrading to Pro increases limit

### Payments
- [ ] User can upgrade to Pro via Stripe
- [ ] Subscription activates immediately
- [ ] User can cancel subscription
- [ ] User can update payment method
- [ ] Invoices accessible in billing portal

### Provisioning
- [ ] New user signup creates Fly Machine automatically
- [ ] User can access workspace within 60 seconds
- [ ] Workspace persists across sessions

### Voice Input
- [ ] Microphone records audio
- [ ] Audio transcribed to text
- [ ] Text sent to agent
- [ ] Agent responds normally

---

## Success Criteria

**Goal Achieved When:**
- ✅ 10 users have signed up
- ✅ 10 users have paid for Pro tier ($200 MRR)
- ✅ All critical bugs fixed (file tree, preview, voice messages)
- ✅ Token tracking working and enforced
- ✅ Payments processing successfully
- ✅ New users can sign up and get workspace automatically
- ✅ Microphone input working
- ✅ User feedback is positive (NPS > 50)

---

## Timeline Summary

| Week | Focus | Deliverable |
|------|-------|-------------|
| 1 | Bug fixes | File tree, preview, voice messages working |
| 2 | MCP migration | Structured operations, workspace boundaries |
| 3 | Token tracking | Usage dashboard, limits enforced |
| 4 | Payments | Stripe integration, subscription tiers |
| 5 | Onboarding | Auto-provisioning, signup flow |
| 6 | Voice input | Microphone working, Whisper integration |

**Total: 6 weeks to 10 paying users**

---

## Post-Launch Optimizations (After 10 Paying Users)

**Do these only AFTER reaching goal:**
- [ ] Separate frontend from backend (Vercel deployment)
- [ ] Add more MCP integrations (Google Drive, etc.)
- [ ] Build UI control MCP for agent
- [ ] Implement advanced features (collaboration, sharing, etc.)
- [ ] Optimize costs (better caching, hibernation, etc.)
- [ ] Add analytics and monitoring
- [ ] Build admin dashboard

**Remember:** Don't optimize prematurely. Ship, get users, get revenue, then optimize.

---

## Notes from Architecture Discussion

**Key Decisions:**
- Keep files on persistent volumes (NOT database)
- Database for metadata only (user accounts, billing, file metadata)
- MCP layer for structure and control
- Frontend stays bundled for now
- Each user gets own Fly Machine
- Company API keys for Claude and OpenAI
- Stripe for payments (not PayPal)
- Whisper for voice input

**Product Philosophy:**
- Jarvis = Notion-like structure with Claude Code power
- Guided experience for general users
- Not trying to replace Claude Code for developers
- Structure through MCPs, not raw file system access
- Safety and simplicity over unlimited flexibility

---

*Ticket created: 2025-11-26*
*Target: 10 paying users in 6 weeks*
*Revenue Goal: $200 MRR*
*Next Action: Start Phase 1 - Fix Critical Bugs*
