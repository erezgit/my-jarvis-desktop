# Fly.io Auto-Stop/Auto-Start Implementation Guide

## Executive Summary

Implement Fly.io's built-in auto-stop feature to reduce costs by 70-80% by automatically stopping idle machines and restarting them on demand.

**Current Problem**: All 14 My Jarvis instances run 24/7, costing ~$130/month
**Solution**: Enable auto-stop to only charge for actual usage
**Expected Savings**: ~$100/month (from $130 to ~$30)

---

## How Auto-Stop Works

### The Mechanism
1. **Idle Detection**: Fly Proxy monitors traffic to each machine
2. **Stop Trigger**: After ~5 minutes of no traffic, machine stops
3. **Cost During Stop**: You ONLY pay for storage ($0.15/GB/month), NO CPU/RAM charges
4. **Auto-Restart**: When a request comes in, machine starts automatically
5. **Restart Time**:
   - **Stop → Start**: 2-5 seconds
   - **Suspend → Resume**: 200-500 milliseconds (faster but with limitations)

### Cost Comparison
| State | CPU/RAM Cost | Storage Cost | Total (2GB RAM, 10GB storage) |
|-------|--------------|--------------|--------------------------------|
| Running 24/7 | $10-12/month | $1.50/month | $11.50/month |
| Stopped | $0 | $1.50/month | $1.50/month |
| 10% uptime | $1-1.20/month | $1.50/month | $2.50-2.70/month |

---

## Implementation Steps

### Step 1: Update fly.toml Configuration

Add these settings to each app's `fly.toml` file:

```toml
[http_service]
  internal_port = 3000  # or your app's port
  force_https = true
  auto_stop_machines = "stop"      # Can be "stop", "suspend", or "off"
  auto_start_machines = true       # Enable auto-restart
  min_machines_running = 0         # Allow scaling to zero

  [http_service.concurrency]
    type = "requests"              # Use "requests" not "connections"
    hard_limit = 250              # Max requests before rejecting
    soft_limit = 200              # Comfortable limit before scaling
```

**Alternative for `[[services]]` section**:
```toml
[[services]]
  internal_port = 3000
  protocol = "tcp"
  auto_stop_machines = "stop"
  auto_start_machines = true
  min_machines_running = 0
```

### Step 2: Deploy the Configuration

```bash
# For each app, deploy the updated configuration
fly deploy -a my-jarvis-erez
fly deploy -a my-jarvis-lilah
# ... repeat for all apps
```

**Note**: The configuration change takes effect immediately after deployment.

### Step 3: Verify Auto-Stop is Working

```bash
# Check machine status after 10 minutes of inactivity
fly machine list -a my-jarvis-erez

# Look for state "stopped" instead of "started"
# You should see machines transitioning to stopped state
```

---

## Stop vs Suspend

### Option 1: "stop" (Recommended for My Jarvis)
- **Restart Time**: 2-5 seconds
- **Compatibility**: Works with all machine types
- **Use Case**: Perfect for AI assistants with sporadic usage

### Option 2: "suspend"
- **Restart Time**: 200-500 milliseconds
- **How it Works**: Saves complete VM state including memory
- **Limitations**:
  - Not all machine types support suspend
  - Uses slightly more storage
- **Use Case**: When sub-second restart is critical

**Recommendation**: Start with "stop" for reliability, test "suspend" later if needed.

---

## Important Considerations

### 1. WebSocket Connections
**Issue**: WebSocket connections can prevent auto-stop
**My Jarvis Impact**: Should be minimal - My Jarvis uses HTTP requests, not persistent WebSockets
**If Needed**: Implement application-level idle detection

### 2. Idle Detection Timing
- **Default**: ~5 minutes of no traffic
- **Not Configurable**: This timeout is fixed by Fly.io
- **Workaround**: If you need different timing, implement app-level shutdown

### 3. Monitoring Active Users
```bash
# Script to check which machines are running vs stopped
for app in my-jarvis-erez my-jarvis-lilah my-jarvis-guy; do
  echo "=== $app ==="
  fly machine list -a $app | grep -E "started|stopped"
done
```

---

## Bulk Implementation Script

Create a script to update all apps at once:

```bash
#!/bin/bash
# update-all-autostop.sh

APPS=(
  "my-jarvis-erez"
  "my-jarvis-lilah"
  "my-jarvis-guy"
  "my-jarvis-daniel"
  "my-jarvis-tamar"
  "my-jarvis-yaron"
  "my-jarvis-jennifer"
  "my-jarvis-liron"
  "my-jarvis-iddo"
  "my-jarvis-omer"
  "my-jarvis-elad"
  "my-jarvis-dev"
)

for app in "${APPS[@]}"; do
  echo "Updating $app..."

  # Create temporary fly.toml with auto-stop enabled
  cat > /tmp/fly-autostop.toml << EOF
app = "$app"

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
EOF

  # Deploy with updated config
  fly deploy -a $app --config /tmp/fly-autostop.toml

  echo "$app updated successfully"
  echo "---"
done
```

---

## Manual Stop/Start Commands

For immediate cost savings before implementing auto-stop:

```bash
# Manually stop an idle machine
fly machine stop <machine-id> -a <app-name>

# Manually start a stopped machine
fly machine start <machine-id> -a <app-name>

# Stop all machines for an app
fly scale count 0 -a <app-name>
```

---

## Expected Results

### Before Auto-Stop
- **14 users × $11.50/month** = $161/month
- Machines running 24/7 regardless of usage
- Paying for idle CPU and RAM

### After Auto-Stop (Estimated 10% usage)
- **14 users × $2.50/month** = $35/month
- Machines stop after 5 minutes idle
- Only paying for storage when stopped
- **Savings**: ~$126/month (78% reduction)

---

## Troubleshooting

### Issue: Machines Not Stopping
1. Check for active WebSocket connections
2. Verify fly.toml has correct settings
3. Ensure you've deployed the changes
4. Check logs: `fly logs -a <app-name>`

### Issue: Slow Restart Times
1. Consider using "suspend" instead of "stop"
2. Optimize your Docker image for faster boot
3. Reduce application startup time

### Issue: Machines Stopping Too Frequently
1. Set `min_machines_running = 1` to keep one always on
2. Adjust `soft_limit` in concurrency settings
3. Consider implementing app-level keep-alive

---

## Next Steps

1. **Immediate Action**: Deploy auto-stop to all apps
2. **Monitor**: Track actual usage patterns for a week
3. **Optimize**: Adjust concurrency limits based on usage
4. **Consider**: Implement "suspend" for frequently accessed apps
5. **Long-term**: Build usage monitoring dashboard

---

## Cost Projection with Auto-Stop

### Conservative Estimate (25% uptime)
- Compute: 14 × $11.50 × 0.25 = $40.25
- Storage (always): 14 × $1.50 = $21.00
- **Total**: ~$61/month (53% savings)

### Realistic Estimate (10% uptime)
- Compute: 14 × $11.50 × 0.10 = $16.10
- Storage (always): 14 × $1.50 = $21.00
- **Total**: ~$37/month (71% savings)

### Aggressive Estimate (5% uptime)
- Compute: 14 × $11.50 × 0.05 = $8.05
- Storage (always): 14 × $1.50 = $21.00
- **Total**: ~$29/month (78% savings)

---

*Implementation Guide Created: November 30, 2025*
*Estimated Implementation Time: 1-2 hours*
*Expected Monthly Savings: $90-100*