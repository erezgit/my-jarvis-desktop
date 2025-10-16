# Phase 1: Manual Provisioning Plan
**Ticket #062 - Fly.io Container-Per-User Architecture**

---

## Overview

Phase 1 focuses on **manual container provisioning** for early adopters (starting with Lilach). This approach allows us to:
- Get the product into users' hands immediately
- Validate demand and gather feedback
- Generate revenue without building full automation
- Test the container-per-user model in production

**Timeline:** Can be deployed tomorrow
**Target Users:** 10-20 early adopters (manual onboarding)
**No Database Required:** All user management done manually

---

## Phase 1 Architecture

```
┌─────────────────────────────────────────────────────┐
│              Fly.io Account (Your Org)              │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ │
│  │ Container 1  │  │ Container 2  │  │ Container│ │
│  │   (Lilach)   │  │   (User 2)   │  │    N     │ │
│  │              │  │              │  │          │ │
│  │ my-jarvis    │  │ my-jarvis    │  │my-jarvis │ │
│  │ + Claude Code│  │ + Claude Code│  │+ Claude  │ │
│  │              │  │              │  │  Code    │ │
│  └──────────────┘  └──────────────┘  └──────────┘ │
│         ↓                 ↓                 ↓      │
│  user1.fly.dev     user2.fly.dev     userN.fly.dev│
└─────────────────────────────────────────────────────┘
                      ↓
           ┌──────────────────────┐
           │   You (Admin)        │
           │ - Create containers  │
           │ - Share URLs         │
           │ - Manual billing     │
           └──────────────────────┘
```

---

## Component 1: Fly.io Provisioning Script

### Purpose
Automate container creation via Fly.io API so you can provision new users with a single command.

### Script Functionality
```bash
# Usage
./provision-user.sh --name "lilach" --email "lilach@example.com"

# What it does:
1. Creates Fly.io machine via API
2. Deploys my-jarvis Docker image
3. Configures persistent volume for user data
4. Sets up environment variables
5. Outputs: Container URL + connection details
```

### Technical Requirements
- **Fly.io API Token**: Store in environment variable `FLY_API_TOKEN`
- **Docker Image**: Pre-built my-jarvis image on Fly.io registry
- **Node.js Script**: Use `fly-machines-sdk` npm package
- **Configuration**: Template fly.toml for container config

### Script Output Example
```
✅ Container created successfully!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
User: Lilach
Email: lilach@example.com
URL: https://lilach-myjarvis.fly.dev
Machine ID: e286de4e711e86
Region: iad (US East)
Status: Running
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Next Steps:
1. Send URL to user
2. User authenticates Claude Code (see below)
3. User starts chatting!
```

---

## Component 2: Terminal Integration for Authentication

### The Problem
Claude Code requires terminal authentication via `claude authenticate` command. Users need to log in with their Anthropic account.

### Solution: Embedded Terminal in Settings

We already have a terminal component from `my-jarvis-desktop-old`. We'll integrate it into the settings page.

### User Authentication Flow

**For Lilach (First-Time User):**
1. You send her the URL: `https://lilach-myjarvis.fly.dev`
2. She opens the URL in her browser
3. App loads (no login required yet - just accessing her personal instance)
4. She clicks **Settings** → **Authenticate Claude Code**
5. Terminal modal opens in the browser
6. She runs: `claude authenticate`
7. Terminal shows Anthropic OAuth URL
8. She clicks the URL, logs in with her Claude subscription
9. Returns to terminal, authentication complete
10. She closes the terminal modal
11. She's ready to chat!

### Technical Implementation

**Terminal Component Location:**
- Source: `my-jarvis-desktop-old/src/components/Terminal.tsx` (or similar)
- Destination: `my-jarvis-desktop/src/components/settings/AuthTerminal.tsx`

**Backend Requirements:**
- WebSocket connection to container's shell
- Execute commands inside the Fly.io container
- Stream terminal output back to frontend

**UI Placement:**
```
Settings Page
├── General
├── Appearance
├── Claude Code Authentication  ← NEW SECTION
│   └── [Open Terminal] button
│       ↓
│   Terminal Modal (full screen or large modal)
│   - Shows live shell
│   - User runs: claude authenticate
│   - Handles OAuth flow
│   - Closes when done
```

---

## Component 3: Manual User Management

### User Onboarding Checklist

**When a new user signs up:**

- [ ] **Step 1:** Collect user info (name, email, payment)
- [ ] **Step 2:** Run provisioning script
  ```bash
  ./provision-user.sh --name "username" --email "user@example.com"
  ```
- [ ] **Step 3:** Save user details to spreadsheet
  - User name
  - Email
  - Container URL
  - Machine ID
  - Date provisioned
  - Monthly fee paid
- [ ] **Step 4:** Send welcome email with:
  - Container URL
  - Instructions for Claude authentication
  - Link to documentation
  - Support contact
- [ ] **Step 5:** Monitor usage (Fly.io dashboard)

### Billing (Manual)

**Monthly Process:**
- Review Fly.io bill for all machines
- Calculate per-user cost (total bill / number of users)
- Charge users via PayPal, Stripe, or wire transfer
- Track payments in spreadsheet

**Expected Costs:**
- With autostop enabled: $0.75-5 per user/month
- Without autostop: $7-10 per user/month
- **Recommendation:** Enable autostop (machines sleep when idle)

### User Communication

**Email Template: Welcome Email**
```
Subject: Welcome to My Jarvis! Your Personal AI Workspace

Hi [Name],

Your personal My Jarvis workspace is ready! 🎉

🔗 Access your workspace: [Container URL]

📋 First-Time Setup (2 minutes):
1. Open the link above
2. Go to Settings → Authenticate Claude Code
3. Click "Open Terminal"
4. Run: claude authenticate
5. Log in with your Anthropic account
6. Close the terminal and start chatting!

💡 You need an active Claude Pro/Team subscription from Anthropic.
   Sign up at: https://claude.ai

📞 Need help? Reply to this email or contact: [Your Email]

Enjoy your AI-powered workspace!
- [Your Name]
```

---

## Deployment Workflow (Tomorrow)

### Pre-Deployment Checklist

- [ ] **Build Docker Image**
  - Test current my-jarvis app locally in Docker
  - Ensure all dependencies are included
  - Verify Claude Code works inside container

- [ ] **Push to Fly.io Registry**
  ```bash
  fly auth docker
  docker tag my-jarvis registry.fly.io/my-jarvis:latest
  docker push registry.fly.io/my-jarvis:latest
  ```

- [ ] **Create Provisioning Script**
  - Install: `npm install fly-machines-sdk`
  - Script creates machines programmatically
  - Test with a dummy user first

- [ ] **Integrate Terminal Component**
  - Copy terminal code from my-jarvis-desktop-old
  - Add to settings page
  - Test WebSocket connection to container shell

- [ ] **Create Documentation**
  - User onboarding guide
  - Authentication instructions
  - Troubleshooting common issues

### Day-Of Deployment (For Lilach)

**Morning:**
1. Run provisioning script: `./provision-user.sh --name "lilach" --email "lilach@example.com"`
2. Verify container is running: `fly status -a lilach-myjarvis`
3. Test the URL yourself: Open `https://lilach-myjarvis.fly.dev`
4. Test terminal authentication flow

**Afternoon (At Lilach's Place):**
1. Show her the URL
2. Walk her through authentication:
   - Settings → Authenticate Claude Code → Open Terminal
   - Run `claude authenticate`
   - Log in with her Anthropic account
3. Test a few messages together
4. Gather feedback on UX

**Post-Visit:**
1. Document any issues encountered
2. Iterate on provisioning script if needed
3. Update user documentation

---

## Technical Considerations

### Fly.io Machine Configuration

**Recommended Settings:**
```toml
# fly.toml template for each user

app = "lilach-myjarvis"

[build]
  image = "registry.fly.io/my-jarvis:latest"

[env]
  USER_NAME = "lilach"
  USER_EMAIL = "lilach@example.com"

[[services]]
  internal_port = 3000
  protocol = "tcp"

  [[services.ports]]
    handlers = ["http"]
    port = 80

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = true  # Enable autostop
  auto_start_machines = true # Enable autostart
  min_machines_running = 0   # Allow full shutdown when idle

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 1024
```

### Persistent Storage

**Fly Volumes:**
- Create a volume for each user to persist data
- Volume stores: chat history, Claude Code sessions, workspace files
- Mounted at: `/data` inside container

**Provisioning Script:**
```javascript
// Create volume
const volume = await sdk.createVolume({
  appName: `${username}-myjarvis`,
  name: `${username}_data`,
  region: 'iad',
  sizeGB: 10
});

// Attach to machine
const machine = await sdk.createMachine({
  // ... other config
  mounts: [{
    volume: volume.id,
    path: '/data'
  }]
});
```

### Security

**Container Isolation:**
- Each user has their own machine (full OS isolation)
- No shared resources between users
- User data stored in dedicated volume

**Authentication:**
- Phase 1: No My Jarvis login (direct URL access)
- Container URL acts as "password" (long, random subdomain)
- Only share URL with paying users
- Can add basic auth later if needed

**Claude Code Authentication:**
- User authenticates with their own Anthropic account
- API keys stored in container's environment (isolated per user)
- No shared credentials

### Monitoring

**What to Track:**
- Machine status (running/stopped)
- CPU/Memory usage per machine
- Fly.io billing (total + per-machine cost)
- User activity (via app logs)

**Tools:**
- Fly.io Dashboard: Real-time machine metrics
- `fly logs -a <app-name>`: Stream application logs
- `fly status -a <app-name>`: Check machine health

---

## Cost Estimation (Phase 1)

### Per-User Breakdown

**With Autostop Enabled (Recommended):**
- Idle time: $0/hour (machine suspended)
- Active time: ~$0.03/hour (1 CPU, 1GB RAM)
- Average usage: 4 hours/day
- **Monthly cost: $3.60 per user**

**Without Autostop:**
- 24/7 runtime: ~$0.03/hour
- **Monthly cost: $21.60 per user**

### Total Costs (10 Users)

| Configuration | Per User | 10 Users | 20 Users |
|--------------|----------|----------|----------|
| With Autostop | $3.60 | $36 | $72 |
| Without Autostop | $21.60 | $216 | $432 |

**Recommendation:** Enable autostop. Machines resume in <100ms, users won't notice.

### Pricing Strategy

**Option A: Fixed Monthly Fee**
- Charge: $20/month per user
- Your margin: $16.40 per user with autostop
- Simple, predictable pricing

**Option B: Usage-Based**
- Charge: $0.10/hour of usage
- Bill users at month-end based on actual usage
- Aligns cost with value

**Recommendation for Phase 1:** Start with Option A (fixed fee). Easier to communicate and manage manually.

---

## Risks & Mitigation

### Risk 1: User Shares Container URL

**Problem:** User gives their URL to friends, multiple people use same container.

**Mitigation:**
- Monitor usage patterns (sudden spike in activity)
- Add basic auth if needed (username/password per container)
- Terms of service: One user per container

### Risk 2: Claude Code API Key Exposure

**Problem:** User's Anthropic API key stored in container could be compromised.

**Mitigation:**
- Keys stored in environment variables (not in code)
- Container has OS-level isolation
- Regular security updates to Docker image

### Risk 3: Provisioning Script Failure

**Problem:** Script fails mid-creation, container partially deployed.

**Mitigation:**
- Script includes rollback logic
- Test thoroughly before first user
- Have manual fallback: Use Fly.io dashboard to create machines

### Risk 4: Cost Overruns

**Problem:** User runs intensive workloads, machine runs 24/7, costs spike.

**Mitigation:**
- Monitor Fly.io billing weekly
- Set up billing alerts in Fly.io dashboard
- Communicate usage expectations to users
- Consider implementing usage caps

---

## Success Criteria

### Phase 1 is successful if:

- ✅ Lilach's container deployed and working tomorrow
- ✅ She can authenticate Claude Code via terminal
- ✅ She can chat and use all features
- ✅ No major technical issues during demo
- ✅ Provisioning script works reliably for users 2-5
- ✅ Monthly costs stay under $5 per user
- ✅ Users report positive experience

### Metrics to Track:

- **Provisioning time:** How long from script run to usable container?
- **Authentication success rate:** Do users complete Claude auth without help?
- **Uptime:** What % of time are containers accessible?
- **Cost per user:** Actual Fly.io charges per machine
- **User satisfaction:** Qualitative feedback from early adopters

---

## Transition to Phase 2

### When to Move to Phase 2:

**Indicators:**
- You have 15+ manual users (provisioning becomes time-consuming)
- Users request self-service signup
- You want to scale marketing efforts
- Monthly revenue justifies development cost

### What Phase 2 Adds:

1. **Landing Page (Next.js)**
   - Marketing site: my-jarvis.app.ai
   - Pricing page
   - Feature showcase

2. **Authentication (Supabase)**
   - User signup/login
   - Email verification
   - Password reset

3. **Payment Processing (Stripe)**
   - Subscription billing
   - Automatic monthly charges
   - Payment method management

4. **Automated Provisioning**
   - User signs up → Container created automatically
   - Backend service calls Fly.io API
   - User redirected to their instance

5. **User Dashboard**
   - View container status
   - Manage subscription
   - Access workspace (hides Fly.io URL)

**Phase 2 Timeline:** 4-6 weeks of development

---

## Next Steps (Before Building)

### Discussion Points for Next Chat:

1. **Provisioning Script Details:**
   - What user input fields do we need? (Name, email, anything else?)
   - Should we generate random subdomains or use user-provided names?
   - How to handle name collisions? (e.g., two users want "john")

2. **Terminal Integration:**
   - Which terminal component from desktop-old should we use?
   - How to establish WebSocket connection to container shell?
   - Should terminal be in settings or first-run wizard?

3. **Docker Image:**
   - Does current my-jarvis app work in Docker?
   - Any dependencies that need special setup?
   - How to handle Claude Code installation in container?

4. **Testing Plan:**
   - Should we create a test container first (not for Lilach)?
   - What manual tests to run before giving to users?
   - How to handle rollback if deployment fails?

5. **User Communication:**
   - How will you collect payments? (PayPal, bank transfer, Stripe?)
   - What's the pricing? ($15/month? $20/month?)
   - Do you want to offer free trial period?

---

## Resources

### Fly.io Documentation:
- [Machines API](https://fly.io/docs/machines/api/)
- [JavaScript SDK](https://github.com/fly-io/fly-machines-sdk)
- [Autostop Configuration](https://fly.io/docs/launch/autostop-autostart/)
- [Volumes Guide](https://fly.io/docs/volumes/)

### Code Repositories:
- my-jarvis-desktop: Main application
- my-jarvis-desktop-old: Terminal component source

### Tools Needed:
- `fly` CLI: `curl -L https://fly.io/install.sh | sh`
- `fly-machines-sdk`: `npm install fly-machines-sdk`
- Docker: For building and testing images

---

## Summary

**Phase 1 gets you to market tomorrow** with minimal development:
- ✅ Manual provisioning script (1 day to build)
- ✅ Terminal integration (1-2 days to integrate)
- ✅ No database or payment system needed
- ✅ Test with Lilach, iterate based on feedback
- ✅ Prove demand before building Phase 2 automation

**Key Advantage:** You start generating revenue and gathering feedback immediately while validating the container-per-user model works in production.

**Next:** Discuss the technical details and clarify any questions before we start building.
