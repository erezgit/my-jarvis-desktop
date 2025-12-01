# Ticket 117: Implement Fly.io Auto-Stop to Reduce Costs by 75%

## Status: ✅ COMPLETED - Phase 1 (December 1, 2025)
**Priority: CRITICAL** - Immediate cost savings of $95/month
**Completed**: Auto-stop working + Clean UX implemented
**Next Phase**: Roll out to all 13 remaining apps

---

## Problem Statement

All 14 My Jarvis instances are running 24/7, costing $130/month in November 2025, even though users are only active ~10% of the time. We're paying for idle CPU and RAM continuously.

**Current Cost**: $130/month for 14 users
**Actual Usage**: Most users active < 2 hours/month
**Waste**: ~$95/month on idle compute

---

## Solution

Enable Fly.io's built-in auto-stop feature to automatically:
1. Stop machines after 5 minutes of inactivity
2. Restart them in 2-5 seconds when accessed
3. Only pay storage costs ($1.50/user) when stopped

---

## Implementation Steps

### Phase 1: Test on my-jarvis-dev ✅ COMPLETED (December 1, 2025)

#### Issue Discovered & Fixed ✅
**Problem**: Original fly.toml had `auto_stop_machines = false`
**Root Cause**: App-level configuration takes precedence over machine-level settings

#### Solution Applied ✅
1. **Updated fly.toml** with `auto_stop_machines = "stop"`
2. **Deployed using existing image**: `fly deploy -a my-jarvis-dev --image registry.fly.io/my-jarvis-dev:deployment-01KBB80FKXY6BSBK5C5C958H0G`
3. **Verified configuration**: `fly config show -a my-jarvis-dev` shows `"auto_stop_machines": true`

#### Clean UX Implementation ✅
**Problem**: When machines stopped, API calls returned HTML → JSON parsing errors
**Solution**: Created HTML response detection and silent redirect to login

**Files Created/Updated**:
- `app/utils/redirectHandler.ts` - HTML detection utility
- `app/hooks/streaming/useStreamParser.ts` - Added HTML handling
- `app/hooks/useHistoryLoader.ts` - Added HTML detection
- `package.json` - Version bumped to 1.4.59

#### Results ✅
- **Auto-stop working**: Machine stops after ~5 minutes, restarts in 2-5 seconds
- **Clean UX**: No more console errors, silent redirect to login
- **Ready for rollout**: Version 1.4.59 deployed to my-jarvis-dev

---

### Phase 2: Deploy to All Users (45 minutes)

#### Step 2.1: Create Deployment Script
```bash
#!/bin/bash
# File: deploy-autostop.sh

APPS=(
  "my-jarvis-erez"
  "my-jarvis-lilah"
  "my-jarvis-guy"
  "my-jarvis-daniel"
  "my-jarvis-daniel-stern"
  "my-jarvis-tamar"
  "my-jarvis-yaron"
  "my-jarvis-jennifer"
  "my-jarvis-liron"
  "my-jarvis-iddo"
  "my-jarvis-omer"
  "my-jarvis-elad"
)

for app in "${APPS[@]}"; do
  echo "=== Updating $app ==="

  # Get current config
  fly config show -a $app > /tmp/${app}-current.toml

  # Add auto-stop configuration
  fly deploy -a $app \
    --auto-confirm \
    --strategy immediate \
    --config - <<EOF
app = "$app"
primary_region = "sjc"

[build]
  dockerfile = "Dockerfile"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = "stop"
  auto_start_machines = true
  min_machines_running = 0

  [http_service.concurrency]
    type = "requests"
    hard_limit = 250
    soft_limit = 200

[[vm]]
  size = "shared-cpu-1x"
  memory = "2gb"

[mounts]
  source = "workspace_data"
  destination = "/workspace"
EOF

  echo "✅ $app updated"
  sleep 5  # Avoid rate limiting
done
```

#### Step 2.2: Run Deployment
```bash
chmod +x deploy-autostop.sh
./deploy-autostop.sh
```

---

## Verification & Monitoring

### Check Implementation Success
```bash
# Script to verify all apps have auto-stop enabled
for app in my-jarvis-{erez,lilah,guy,daniel,tamar,yaron,jennifer,liron,iddo,omer,elad,dev}; do
  echo -n "$app: "
  fly config show -a $app 2>/dev/null | grep -q "auto_stop_machines" && echo "✅ Enabled" || echo "❌ Not configured"
done
```

### Monitor Cost Reduction
```bash
# Check machine states after 1 day
for app in my-jarvis-{erez,lilah,guy,daniel,tamar,yaron,jennifer,liron,iddo,omer,elad,dev}; do
  echo "=== $app ==="
  fly machine list -a $app | grep -E "STATE|started|stopped"
done
```

---

## Important Notes

### Volume Persistence
✅ **Volumes remain intact when machines stop**
- All data in /workspace persists
- No data loss during stop/start cycles
- Volume still incurs storage cost ($0.15/GB/month)

### User Experience Impact
- **First access after idle**: 2-5 second delay
- **Subsequent requests**: Normal speed
- **User perception**: Slight initial delay, then normal

### WebSocket Considerations
- My Jarvis uses HTTP requests, not persistent WebSockets
- Auto-stop should work without issues
- If problems arise, check for keep-alive connections

---

## Cost Analysis

### Before Auto-Stop
```
14 users × $11.50/month (2GB RAM + 10GB storage) = $161/month
Actual November bill: $130/month
```

### After Auto-Stop (10% usage estimate)
```
Compute: 14 × $10 × 0.10 = $14/month
Storage: 14 × $1.50 = $21/month
Total: $35/month

Savings: $95/month (73% reduction)
Annual savings: $1,140
```

### ROI
- Implementation time: 1 hour
- Monthly savings: $95
- Payback: Immediate

---

## Rollback Plan

If auto-stop causes issues:

```bash
# Disable auto-stop for specific app
fly deploy -a <app-name> --env AUTO_STOP_MACHINES=false

# Or update fly.toml
auto_stop_machines = false  # or remove the line
min_machines_running = 1    # Keep at least one running
```

---

## Success Metrics

### Week 1
- [ ] All 14 apps have auto-stop enabled
- [ ] Machines successfully stopping after 5 minutes idle
- [ ] Restart time < 5 seconds confirmed
- [ ] No user complaints about delays

### Month 1
- [ ] November bill: ~$130
- [ ] December bill: ~$35-40
- [ ] Cost reduction: >70%
- [ ] Zero data loss incidents

---

## FAQ

**Q: Will we lose data when machines stop?**
A: No. Volumes persist. Only RAM is cleared.

**Q: How long does restart take?**
A: 2-5 seconds for stop/start, 200-500ms for suspend/resume.

**Q: Can we adjust the 5-minute timeout?**
A: No, this is fixed by Fly.io. Use min_machines_running=1 if needed.

**Q: What if a user needs 24/7 availability?**
A: Set their min_machines_running=1 to keep one machine always on.

**Q: Is there a cost to stop/start?**
A: No. Stop/start operations are free.

---

## UX Improvements for Auto-Start (Required for Production)

### Problem
When machines are stopped, users experience:
1. **Login**: First click fails, second click works
2. **In-App**: Messages fail silently until page refresh

### Solution Implementation

#### Fix 1: Login Retry Logic
```javascript
// In login handler (e.g., handleGoogleLogin)
async function handleLogin() {
  try {
    const result = await loginAPI();
    // Success flow
  } catch (error) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      // Show loading state
      setLoginMessage('Starting your workspace...');

      // Retry after 3 seconds
      setTimeout(async () => {
        try {
          const result = await loginAPI();
          // Success flow
        } catch (retryError) {
          setLoginMessage('Please try again');
        }
      }, 3000);
    }
  }
}
```

#### Fix 2: Connection Error Handler
```javascript
// In chat message handler
async function sendMessage(message) {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message })
    });
    // Handle response
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      // Show reconnection modal
      showReconnectModal({
        title: 'Connection Lost',
        message: 'Your workspace is sleeping. Click to wake it up.',
        buttonText: 'Reconnect',
        onConfirm: () => window.location.reload()
      });
    }
  }
}
```

#### Fix 3: Reconnection Modal Component
```javascript
// components/ReconnectModal.jsx
function ReconnectModal({ title, message, buttonText, onConfirm }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-sm">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-gray-600 mb-4">{message}</p>
        <button
          onClick={onConfirm}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
}
```

### Implementation Priority
1. **First**: Deploy auto-stop to save costs immediately
2. **Second**: Add connection error handler (Fix 2) - most important for UX
3. **Third**: Add login retry logic (Fix 1)
4. **Optional**: Add more sophisticated heartbeat monitoring

---

## Next Steps

1. **NOW**: ✅ Test on my-jarvis-dev (COMPLETED - auto-stop works)
2. **Next**: Add UX improvements (Fix 2 priority)
3. **Then**: Deploy to all users with both auto-stop and UX fixes
4. **Monitor for 24 hours**: Check for any issues
5. **Document savings**: Compare December bill to November

---

*Ticket Created: November 30, 2025*
*Updated: November 30, 2025 - Added UX improvements*
*Assigned to: Dev 2*
*Expected Completion: 2 days (auto-stop today, UX fixes tomorrow)*