# Ticket 116: Automated User Provisioning with Google Authentication

## Status: 🔴 Not Started
**Priority: CRITICAL** - This unlocks the path to 10 paying users
**Complexity: High - Multiple integrated systems
**Estimated Time: 20-25 hours

---

## Executive Summary

Transform My Jarvis from a developer tool requiring manual deployment to a consumer-ready SaaS product with instant, zero-friction onboarding. Users sign up with Google, and within 5-10 seconds have their own fully-provisioned My Jarvis instance running with all API keys configured.

**Core Value Proposition**: From "Sign up with Google" click to working My Jarvis app in under 10 seconds.

---

## Problem Statement

Current onboarding requires:
- Technical knowledge of Docker/deployment
- Manual Fly.io setup
- API key configuration
- Database provisioning
- 30+ minutes of setup time

This blocks 99% of potential users who aren't developers.

---

## Solution Architecture

### High-Level Flow
```
User clicks "Sign up with Google"
→ Google OAuth authentication
→ Supabase user creation
→ Fly.io machine cloning (2-5 seconds)
→ Environment configuration
→ Redirect to personal instance
```

### Technical Stack
- **Frontend**: my-jarvis-web (marketing site) - Convert to Next.js
- **Auth**: Supabase Auth with Google OAuth provider
- **Backend**: Next.js API routes for provisioning logic
- **Infrastructure**: Fly.io Machines API for instant cloning
- **Database**: Supabase (shared multi-tenant with RLS)

---

## Detailed Implementation Plan

### Phase 1: Infrastructure Preparation (4 hours)

#### 1.1 Create Golden Docker Image
```dockerfile
# Pre-configured My Jarvis image with:
- All dependencies installed
- Optimized for fast boot
- Environment variables placeholders
- Health check endpoints
```

#### 1.2 Push to Fly.io Registry
```bash
# Build and push golden image
docker build -t registry.fly.io/my-jarvis-golden:latest .
docker push registry.fly.io/my-jarvis-golden:latest
```

#### 1.3 Cost Analysis
- **Running Machine**: ~$1.94/month (shared-cpu-1x 256MB)
- **Stopped Machine**: $0.15/GB storage only
- **Strategy**: Keep machines running for active users, stop after 7 days inactivity

---

### Phase 2: Marketing Site Conversion (3 hours)

#### 2.1 Convert my-jarvis-web to Next.js
```bash
# Current structure check
cd /spaces/my-jarvis-desktop/projects/my-jarvis-web
# If static HTML, convert to Next.js for API routes
npx create-next-app@latest . --typescript --tailwind --app
```

#### 2.2 Install Dependencies
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.45.0",
    "@supabase/ssr": "^0.5.0",
    "next": "^14.2.0",
    "react": "^18.3.0"
  }
}
```

---

### Phase 3: Google OAuth Integration (4 hours)

#### 3.1 Google Cloud Console Setup
1. Create OAuth 2.0 Client ID
2. Authorized origins:
   - `https://my-jarvis.app` (production)
   - `http://localhost:3000` (development)
3. Redirect URIs:
   - `https://[PROJECT_ID].supabase.co/auth/v1/callback`

#### 3.2 Supabase Configuration
```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

#### 3.3 Sign-Up Component
```tsx
// app/components/SignUpButton.tsx
export function SignUpButton() {
  const handleSignUp = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      }
    })
  }

  return (
    <button onClick={handleSignUp}>
      Sign up with Google - Get My Jarvis in 10 seconds
    </button>
  )
}
```

---

### Phase 4: Provisioning API (6 hours)

#### 4.1 Auth Callback Handler
```typescript
// app/auth/callback/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.exchangeCodeForSession(code)

    if (user) {
      // Trigger provisioning
      const instance = await provisionUserInstance(user.id)
      return NextResponse.redirect(instance.url)
    }
  }
}
```

#### 4.2 Fly.io Machine Provisioning
```typescript
// app/api/provision-user/route.ts
async function provisionUserInstance(userId: string) {
  const FLY_API_TOKEN = process.env.FLY_API_TOKEN
  const FLY_APP_NAME = process.env.FLY_APP_NAME

  // 1. Create machine from golden image
  const machineConfig = {
    name: `user-${userId}`,
    config: {
      image: "registry.fly.io/my-jarvis-golden:latest",
      env: {
        USER_ID: userId,
        ANTHROPIC_API_KEY: process.env.COMPANY_ANTHROPIC_KEY,
        SUPABASE_URL: process.env.SUPABASE_URL,
        SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,
        INSTANCE_TYPE: "user"
      },
      guest: {
        cpu_kind: "shared",
        cpus: 1,
        memory_mb: 256
      },
      services: [
        {
          ports: [
            {
              port: 443,
              handlers: ["http", "tls"],
              force_https: true
            }
          ],
          protocol: "tcp",
          internal_port: 3000
        }
      ],
      auto_destroy: false,
      restart: {
        policy: "always"
      }
    }
  }

  // 2. Call Fly.io Machines API
  const response = await fetch(
    `https://api.machines.dev/v1/apps/${FLY_APP_NAME}/machines`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FLY_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(machineConfig)
    }
  )

  const machine = await response.json()

  // 3. Store machine details in Supabase
  await supabase.from('user_instances').insert({
    user_id: userId,
    machine_id: machine.id,
    machine_url: `https://${machine.id}.fly.dev`,
    status: 'active',
    created_at: new Date().toISOString()
  })

  // 4. Wait for machine to be ready (poll health endpoint)
  await waitForMachineReady(machine.id)

  return {
    url: `https://${machine.id}.fly.dev`
  }
}
```

#### 4.3 Health Check Polling
```typescript
async function waitForMachineReady(machineId: string, maxAttempts = 20) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`https://${machineId}.fly.dev/api/health`)
      if (response.ok) return true
    } catch (e) {
      // Machine not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  throw new Error('Machine failed to start')
}
```

---

### Phase 5: Database Schema (2 hours)

#### 5.1 Supabase Tables
```sql
-- User instances tracking
CREATE TABLE user_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  machine_id TEXT UNIQUE NOT NULL,
  machine_url TEXT NOT NULL,
  status TEXT DEFAULT 'provisioning',
  last_active TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Usage tracking per instance
CREATE TABLE instance_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID REFERENCES user_instances(id),
  tokens_used INTEGER DEFAULT 0,
  api_calls INTEGER DEFAULT 0,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Billing/subscription info
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  plan_type TEXT DEFAULT 'free', -- free, pro, enterprise
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT DEFAULT 'active',
  current_period_end TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE user_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE instance_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own instances" ON user_instances
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own usage" ON instance_usage
  FOR SELECT USING (
    instance_id IN (
      SELECT id FROM user_instances WHERE user_id = auth.uid()
    )
  );
```

---

### Phase 6: User Experience Optimization (3 hours)

#### 6.1 Loading Screen
```tsx
// app/provisioning/page.tsx
export default function ProvisioningPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"/>
      <h2 className="mt-4 text-xl font-semibold">Setting up your My Jarvis...</h2>
      <p className="mt-2 text-gray-600">This usually takes 5-10 seconds</p>
      <div className="mt-8 space-y-2">
        <Step completed={true}>Creating your account</Step>
        <Step completed={true}>Provisioning your instance</Step>
        <Step loading={true}>Configuring AI models</Step>
        <Step>Finalizing setup</Step>
      </div>
    </div>
  )
}
```

#### 6.2 Error Handling
```typescript
// Graceful fallback for provisioning failures
try {
  const instance = await provisionUserInstance(userId)
  return NextResponse.redirect(instance.url)
} catch (error) {
  // Add user to manual provisioning queue
  await supabase.from('provisioning_queue').insert({
    user_id: userId,
    error: error.message,
    retry_count: 0
  })

  // Redirect to waiting list page
  return NextResponse.redirect('/welcome/waiting')
}
```

---

### Phase 7: Instance Management (3 hours)

#### 7.1 Auto-Stop Inactive Instances
```typescript
// Cron job to stop inactive instances (run daily)
async function stopInactiveInstances() {
  const { data: instances } = await supabase
    .from('user_instances')
    .select('*')
    .eq('status', 'active')
    .lt('last_active', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) // 7 days

  for (const instance of instances) {
    await fetch(
      `https://api.machines.dev/v1/apps/${FLY_APP_NAME}/machines/${instance.machine_id}/stop`,
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${FLY_API_TOKEN}` }
      }
    )

    await supabase
      .from('user_instances')
      .update({ status: 'stopped' })
      .eq('id', instance.id)
  }
}
```

#### 7.2 Wake-Up on Access
```typescript
// When user accesses stopped instance
async function wakeUpInstance(userId: string) {
  const { data: instance } = await supabase
    .from('user_instances')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (instance.status === 'stopped') {
    await fetch(
      `https://api.machines.dev/v1/apps/${FLY_APP_NAME}/machines/${instance.machine_id}/start`,
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${FLY_API_TOKEN}` }
      }
    )

    await waitForMachineReady(instance.machine_id)

    await supabase
      .from('user_instances')
      .update({ status: 'active', last_active: new Date() })
      .eq('id', instance.id)
  }

  return instance.machine_url
}
```

---

## Alternative Approaches Considered

### Option A: Pre-provisioned Pool
- **Pros**: Instant assignment, zero wait time
- **Cons**: Higher idle costs, complex pool management
- **Decision**: Rejected - Fly.io cloning is fast enough (5-10s)

### Option B: Single Multi-tenant Instance
- **Pros**: Lowest cost, easiest to maintain
- **Cons**: No isolation, complex permissions, security risks
- **Decision**: Rejected - Users expect isolation for AI agents

### Option C: Kubernetes Pods
- **Pros**: Industry standard, good tooling
- **Cons**: More complex, higher base cost
- **Decision**: Rejected - Fly.io Machines are simpler and cheaper

---

## Security Considerations

1. **API Key Management**
   - Company Anthropic key injected via environment variables
   - Never exposed to client
   - Rate limiting per user instance

2. **Instance Isolation**
   - Each user gets dedicated machine
   - Network isolation between instances
   - No shared file systems

3. **Authentication**
   - Supabase RLS for data isolation
   - JWT tokens for API authentication
   - Machine access tied to user ID

4. **Compliance**
   - GDPR-ready with data isolation
   - User data deletion includes machine termination
   - Audit logs for all provisioning actions

---

## Cost Analysis (Updated Based on Current Fly.io Data)

### Resource Options

#### Option A: Minimal (512MB RAM, 2GB Storage) - RECOMMENDED FOR MVP
```
Running Instance (24/7):
- Fly.io Machine: ~$3.88/month (shared-cpu-1x 512MB)
- Storage: $0.30/month (2GB)
- Total: ~$4.18/month per active user

With Auto-Stop (25% uptime - realistic for AI assistant):
- Fly.io Machine: ~$0.97/month
- Storage: $0.30/month
- Total: ~$1.27/month per user
```

#### Option B: Standard (1GB RAM, 5GB Storage) - RECOMMENDED FOR PRODUCTION
```
Running Instance (24/7):
- Fly.io Machine: ~$7.76/month (shared-cpu-1x 1GB)
- Storage: $0.75/month (5GB)
- Total: ~$8.51/month per active user

With Auto-Stop (25% uptime):
- Fly.io Machine: ~$1.94/month
- Storage: $0.75/month
- Total: ~$2.69/month per user
```

#### Option C: Current Setup (2GB RAM, 10GB Storage) - OVER-PROVISIONED
```
Running Instance (24/7):
- Fly.io Machine: ~$10-12/month (shared-cpu-1x 2GB)
- Storage: $1.50/month (10GB)
- Total: ~$11.50/month per active user

With Auto-Stop (25% uptime):
- Fly.io Machine: ~$2.50-3/month
- Storage: $1.50/month
- Total: ~$4.00/month per user
```

### Important: Stopped Machine Economics
**When a Fly.io machine is stopped, you ONLY pay for storage, NOT for CPU/RAM!**
- This dramatically reduces costs for inactive users
- Machines can wake up in 2-3 seconds when accessed
- Perfect for AI assistants with sporadic usage patterns

### Revenue Model with Standard Tier (Recommended)
```
Subscription Price: $20/month
- Infrastructure (25% uptime): $2.69/month
- Anthropic API costs: ~$8-10/month
- Gross margin: ~$7-9/user (35-45%)

At 10 paying users: $200 revenue, $70-90 profit
At 100 paying users: $2000 revenue, $700-900 profit
```

### Tiered Pricing Strategy
```
Starter Tier: $20/month
- 512MB RAM, 2GB storage
- Perfect for casual users
- Infrastructure cost: ~$1.27/month

Pro Tier: $40/month
- 1GB RAM, 5GB storage
- For daily active users
- Infrastructure cost: ~$2.69/month

Enterprise Tier: $80/month
- 2GB RAM, 10GB storage
- For power users/teams
- Infrastructure cost: ~$4.00/month
```

---

## Success Metrics

### Technical KPIs
- **Provisioning Time**: < 10 seconds (target: 5 seconds)
- **Success Rate**: > 95% successful provisions
- **Uptime**: 99.9% for active instances
- **Wake-up Time**: < 3 seconds for stopped instances

### Business KPIs
- **Conversion Rate**: Sign-up to active user > 80%
- **Time to First Value**: < 30 seconds
- **7-Day Retention**: > 60%
- **Infrastructure Cost per User**: < $3/month

---

## MVP Implementation (Critical Path)

For fastest path to 10 paying users, implement in this order:

1. **Golden Image** (2 hours)
   - Pre-configure with company API key
   - Optimize for fast boot

2. **Basic Provisioning** (4 hours)
   - Simple Next.js API route
   - Clone machine on sign-up
   - Hardcode environment variables

3. **Google OAuth** (2 hours)
   - Basic Supabase Auth setup
   - Redirect to provisioned instance

4. **Manual Billing** (0 hours)
   - Use Stripe Payment Links
   - Manual instance activation

**Total MVP Time**: 8 hours to working prototype

---

## Testing Plan

### Integration Tests
1. Complete sign-up flow from Google OAuth to working instance
2. Verify environment variables are correctly set
3. Test instance stop/start lifecycle
4. Validate billing integration

### Load Tests
1. Provision 10 instances simultaneously
2. Measure provisioning time under load
3. Test auto-scaling behavior
4. Verify resource limits

### User Acceptance Tests
1. Non-technical user can sign up and use My Jarvis
2. Instance persists user data correctly
3. Billing flow is clear and works
4. Support documentation is adequate

---

## Rollout Strategy

### Phase 1: Alpha (Week 1)
- Deploy to staging environment
- Test with 5 internal users
- Gather feedback, fix critical bugs

### Phase 2: Beta (Week 2-3)
- Soft launch to 20 invited users
- Monitor provisioning success rate
- Optimize based on metrics

### Phase 3: Public Launch (Week 4)
- Open registration
- Target: 10 paying users
- Marketing push to developer communities

---

## Dependencies & Blockers

### Required Before Starting
1. ✅ Fly.io account with API access
2. ✅ Supabase project with Auth enabled
3. ✅ Google Cloud Console access
4. ⚠️ Anthropic API key with sufficient quota
5. ⚠️ Decision on pricing model

### Technical Dependencies
- my-jarvis-desktop must have health endpoint
- Docker image must be optimized for fast boot
- Supabase must support expected load

---

## Next Steps

1. **Create Golden Docker Image** (Dev 2 starts immediately)
2. **Convert my-jarvis-web to Next.js** (Can be done in parallel)
3. **Set up Supabase Auth with Google** (After Next.js conversion)
4. **Implement provisioning API** (Core functionality)
5. **Test end-to-end flow** (Critical before launch)

---

## References

- [Fly.io Machines API Docs](https://fly.io/docs/machines/api/)
- [Supabase Auth with Next.js](https://supabase.com/docs/guides/auth/quickstarts/nextjs)
- [Google OAuth 2.0 Setup](https://developers.google.com/identity/protocols/oauth2)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

---

*Ticket Created: 2025-11-30*
*Target Completion: 1 week*
*Assigned To: Dev 2*