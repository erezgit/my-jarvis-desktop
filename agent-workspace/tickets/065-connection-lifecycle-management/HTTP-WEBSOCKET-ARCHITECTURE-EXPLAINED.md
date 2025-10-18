# HTTP vs WebSocket Architecture: How My Jarvis Handles Long-Running Operations

**Created:** October 17, 2025
**Ticket:** 065-connection-lifecycle-management
**Related:** Ticket #058 (Connection pool exhaustion issue)

---

## Executive Summary

This document explains how My Jarvis Desktop handles two completely separate types of connections:

1. **HTTP Streaming (Claude Operations)**: Long-running HTTP requests that can take 5-10 minutes with no timeout
2. **WebSocket (Terminal)**: Real-time terminal communication that needs lifecycle management

**Key Finding**: Implementing connection lifecycle management (heartbeat, idle timeout) for terminal WebSockets will **NOT** affect Claude operations because they use different protocols and connections.

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Browser)                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐           ┌──────────────────┐        │
│  │  Claude Chat     │           │  Terminal View   │        │
│  │  (HTTP Streaming)│           │  (WebSocket)     │        │
│  └────────┬─────────┘           └────────┬─────────┘        │
│           │                              │                   │
└───────────┼──────────────────────────────┼───────────────────┘
            │                              │
            │ POST /api/claude             │ ws://localhost:3001
            │ (HTTP 1.1 Streaming)         │ (WebSocket)
            │                              │
┌───────────┼──────────────────────────────┼───────────────────┐
│           ▼                              ▼                   │
│  ┌──────────────────┐           ┌──────────────────┐        │
│  │  Claude Web UI   │           │  Terminal WS     │        │
│  │  Server          │           │  Server          │        │
│  │  (Port 10000)    │           │  (Port 3001)     │        │
│  └────────┬─────────┘           └────────┬─────────┘        │
│           │                              │                   │
│           │ Streams response             │ Spawns PTY       │
│           │ via ReadableStream           │ process          │
│           │                              │                   │
└───────────┼──────────────────────────────┼───────────────────┘
            │                              │
            ▼                              ▼
     Claude Code SDK                  node-pty
     (Long operations)              (Terminal I/O)
```

---

## Two Completely Separate Communication Channels

### Channel 1: Claude Operations (HTTP Streaming)

**Location**: `app/components/ChatPage.tsx:183-241`

**How It Works**:

1. **Frontend sends POST request** to `/api/claude`:
   ```typescript
   const response = await fetch(getChatUrl(), {
     method: "POST",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify({
       message: content,
       requestId,
       sessionId: currentSessionId,
       // ...
     } as ChatRequest),
   });
   ```

2. **HTTP connection stays open** for streaming:
   ```typescript
   const reader = response.body.getReader();
   const decoder = new TextDecoder();

   while (true) {
     const { done, value } = await reader.read();
     if (done || shouldAbort) break;

     const chunk = decoder.decode(value);
     // Process streaming data...
   }
   ```

3. **Connection characteristics**:
   - Protocol: HTTP/1.1 with chunked transfer encoding
   - Duration: As long as Claude needs (5-10 minutes is normal)
   - Timeout: **NONE** - connection stays open while data streams
   - Port: 10000 (Claude Web UI Server)
   - Type: Request/Response with streaming body

**Why No Timeout?**:
- HTTP streaming uses `ReadableStream` API
- As long as data is flowing (even slowly), connection stays alive
- Browser and server both know the connection is active
- Only closes when:
  - Stream ends naturally (Claude finishes response)
  - User aborts (explicit cancel)
  - Network error occurs

---

### Channel 2: Terminal Operations (WebSocket)

**Location**: `lib/terminal/terminal-websocket-server.ts:20-118`

**How It Works**:

1. **Frontend establishes WebSocket connection**:
   ```typescript
   // In terminal component
   const ws = new WebSocket('ws://localhost:3001');
   ```

2. **Server spawns PTY process**:
   ```typescript
   const ptyProcess = pty.spawn(shell, shellArgs, {
     name: 'xterm-256color',
     cols: 80,
     rows: 30,
     cwd: process.env.HOME,
     env: process.env as { [key: string]: string }
   });
   ```

3. **Bidirectional communication**:
   ```typescript
   // PTY output → WebSocket
   ptyProcess.on('data', (data) => {
     ws.send(JSON.stringify({ type: 'data', data: data }))
   });

   // WebSocket input → PTY
   ws.on('message', (message) => {
     const msg = JSON.parse(message.toString());
     if (msg.type === 'data') {
       ptyProcess.write(msg.data);
     }
   });
   ```

4. **Connection characteristics**:
   - Protocol: WebSocket (persistent bidirectional)
   - Duration: Entire browser session (can be hours)
   - Timeout: **NONE CURRENTLY** (this is the problem)
   - Port: 3001 (Terminal WebSocket Server)
   - Type: Persistent connection for real-time I/O

**Why Timeout Needed?**:
- WebSocket doesn't automatically detect dead connections
- Browser crashes/closes don't always send close signal
- Zombie connections accumulate without cleanup
- Connection pool fills up (25 limit reached)

---

## The Critical Distinction: Active vs Zombie Connections

### Active Connections

**Definition**: Connections that are currently doing work

**Claude HTTP Examples**:
- ✅ HTTP request streaming Claude's response
- ✅ Data chunks flowing every few seconds
- ✅ Reader actively calling `.read()` on stream
- ✅ Connection has work in progress

**Terminal WebSocket Examples**:
- ✅ User typing commands
- ✅ Command output streaming
- ✅ Terminal receiving resize events
- ✅ Any data flowing in either direction

**Behavior**:
- Should NEVER timeout
- Should NEVER be closed prematurely
- Represent legitimate ongoing operations
- User is actively waiting for results

---

### Zombie Connections

**Definition**: Connections that should be closed but aren't

**How They Happen**:

1. **Browser crash**:
   ```
   User typing command → Browser crashes →
   Server still thinks WebSocket is open →
   Zombie connection
   ```

2. **Tab closed without cleanup**:
   ```
   User closes tab → Browser doesn't send close signal →
   Server never knows connection is dead →
   Zombie connection
   ```

3. **Network interruption**:
   ```
   WiFi disconnects → Reconnects →
   New WebSocket created →
   Old WebSocket still open on server →
   Zombie connection
   ```

4. **App navigation**:
   ```
   User navigates away → Component unmounts →
   WebSocket cleanup doesn't fire →
   Zombie connection
   ```

**Characteristics**:
- No data flowing in either direction
- Client is gone/dead
- Server has no way to know (without heartbeat)
- Consumes connection pool slot
- Will never close on its own

**Impact on Lilah's System**:
```
User session 1: Opens 3 browser tabs → 3 connections
User session 2: Opens 2 tabs → 5 connections total
User session 3: Opens 4 tabs → 9 connections total
...
After multiple sessions: 25 zombie connections → Pool full!
New user tries to connect: HTTP 503 - No slots available
```

---

## Solution: Heartbeat for WebSocket ONLY

### What is Heartbeat (Ping/Pong)?

A mechanism to detect if a connection is alive:

```typescript
// Server sends ping every 30 seconds
const pingInterval = setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.ping();

    // If no pong received in 10 seconds, connection is dead
    const timeout = setTimeout(() => {
      console.log('No pong received, closing zombie connection');
      ws.terminate(); // Force close
      terminals.delete(termId);
    }, 10000);

    // Clear timeout if pong received
    ws.once('pong', () => clearTimeout(timeout));
  }
}, 30000);
```

### How Heartbeat Works

```
Time: 0s     30s    40s    60s    70s    90s    100s
      │      │      │      │      │      │      │
      │      │      │      │      │      │      │
Active│----->│PING──┼→PONG│----->│PING──┼→PONG│-----> (Connection stays open)
Client│      │      │      │      │      │      │
      │      │      │      │      │      │      │
      │      │      │      │      │      │      │
Zombie│----->│PING──┼─────┼─X───┼      │      │
Client│      │      │(timeout)   │(closed)      Connection terminated
      │      │      No response   │
```

**Key Points**:
- Ping sent every 30 seconds
- Active clients respond immediately with pong
- Dead clients don't respond (timeout after 10 seconds)
- Dead connections get closed automatically
- Active connections never affected

---

### Why This Won't Affect Claude Operations

**Reason 1: Different Protocol**
- Claude uses HTTP streaming (request/response)
- Terminal uses WebSocket (persistent bidirectional)
- Heartbeat only applies to WebSocket connections
- HTTP connections not touched

**Reason 2: Different Connection Objects**
- Claude: `response.body.getReader()` (ReadableStream)
- Terminal: `new WebSocket(url)` (WebSocket object)
- Heartbeat calls `ws.ping()` method (WebSocket-specific)
- ReadableStream has no ping/pong mechanism (doesn't need it)

**Reason 3: Different Lifecycle**
- Claude HTTP: Opens → Streams → Closes naturally when done
- Terminal WebSocket: Opens → Stays open indefinitely → Needs manual cleanup
- HTTP closes when streaming completes
- WebSocket needs heartbeat to detect abandonment

**Reason 4: Active Data Flow**
- Claude: Streaming chunks means connection is alive
- Browser `reader.read()` waiting for data
- No heartbeat needed - data flow proves connection alive
- Only closes when stream ends or aborts

---

## Proposed Implementation

### File: `lib/terminal/terminal-websocket-server.ts`

```typescript
export class TerminalWebSocketServer {
  private wss: WebSocketServer
  private terminals: Map<string, TerminalSession> = new Map()
  private heartbeatIntervals: Map<string, NodeJS.Timeout> = new Map()

  private setupWebSocketServer() {
    this.wss.on('connection', (ws, req) => {
      const termId = this.generateTerminalId()

      // ... existing PTY setup ...

      // NEW: Setup heartbeat mechanism
      this.setupHeartbeat(ws, termId)

      // NEW: Track last activity
      let lastActivity = Date.now()

      ws.on('message', (message) => {
        lastActivity = Date.now() // Update on any message
        // ... existing message handling ...
      })

      ws.on('close', () => {
        this.cleanupHeartbeat(termId)
        // ... existing close handling ...
      })
    })
  }

  private setupHeartbeat(ws: WebSocket, termId: string) {
    // Send ping every 30 seconds
    const interval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping()

        // Timeout if no pong in 10 seconds
        const timeout = setTimeout(() => {
          console.log(`[Terminal WS] No pong from ${termId}, closing zombie`)
          ws.terminate()
          this.terminals.delete(termId)
          this.cleanupHeartbeat(termId)
        }, 10000)

        // Clear timeout when pong received
        ws.once('pong', () => {
          clearTimeout(timeout)
          console.log(`[Terminal WS] Pong received from ${termId}`)
        })
      } else {
        // Connection already closed, cleanup
        this.cleanupHeartbeat(termId)
      }
    }, 30000)

    this.heartbeatIntervals.set(termId, interval)
  }

  private cleanupHeartbeat(termId: string) {
    const interval = this.heartbeatIntervals.get(termId)
    if (interval) {
      clearInterval(interval)
      this.heartbeatIntervals.delete(termId)
    }
  }
}
```

---

## Configuration Recommendations

### Heartbeat Settings

```typescript
const HEARTBEAT_CONFIG = {
  // How often to send ping (30 seconds is standard)
  PING_INTERVAL: 30000,

  // How long to wait for pong before considering dead (10 seconds)
  PONG_TIMEOUT: 10000,

  // Optional: Idle timeout for completely inactive connections (30 minutes)
  IDLE_TIMEOUT: 1800000,
}
```

### Fly.io Connection Limits

Current configuration in `fly.toml`:
```toml
[http_service]
  internal_port = 10000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0
  processes = ["app"]

  [http_service.concurrency]
    type = "connections"
    hard_limit = 25
    soft_limit = 20
```

**Recommendations**:
1. **Keep current limits** (20 soft, 25 hard) - they're reasonable
2. **Add heartbeat** to prevent zombie accumulation
3. **Monitor connection count** after implementing heartbeat
4. **Consider increasing** to 50/60 if needed after heartbeat proves effective

---

## Testing Strategy

### Test 1: Normal Operation (Should NOT be affected)

1. Start My Jarvis Desktop
2. Send Claude request that takes 5-10 minutes
3. Verify Claude response streams normally
4. Check terminal WebSocket receives heartbeat pings
5. Verify both operations complete successfully

**Expected Result**: ✅ Both work perfectly, no interference

---

### Test 2: Zombie Connection Cleanup

1. Open My Jarvis Desktop in browser
2. Open terminal (creates WebSocket)
3. Force close browser (kill process, don't close gracefully)
4. Wait 40 seconds (ping + timeout)
5. Check server connection count

**Expected Result**: ✅ Zombie connection automatically closed after timeout

---

### Test 3: Multiple Browser Sessions

1. Open 10 browser tabs with My Jarvis
2. Each opens terminal (10 WebSockets)
3. Close 5 tabs gracefully
4. Force close 5 tabs (kill browser)
5. Wait 40 seconds
6. Check server connection count

**Expected Result**:
- ✅ 5 graceful closes: Immediate cleanup
- ✅ 5 force closes: Cleanup after heartbeat timeout
- ✅ Final connection count: 0

---

### Test 4: Long-Running Claude Operation with Terminal

1. Open terminal
2. Start long Claude request (10 minutes)
3. Use terminal during Claude operation
4. Verify both continue working

**Expected Result**:
- ✅ Claude request completes (10 minutes)
- ✅ Terminal stays responsive
- ✅ Heartbeat pings don't interrupt either

---

## FAQ

### Q: Will heartbeat interrupt my Claude requests?

**A**: No. Claude uses HTTP streaming, not WebSocket. Heartbeat only applies to WebSocket connections (terminal). They are completely separate systems.

---

### Q: What if Claude is in the middle of thinking?

**A**: Claude HTTP streaming connection has no timeout. As long as the HTTP stream is open (which it is during Claude operations), the connection stays alive. Heartbeat doesn't touch HTTP connections.

---

### Q: Will I see any difference in Claude response time?

**A**: No. Claude operations are completely unaffected. The only thing that changes is terminal WebSocket connections now get monitored for liveness.

---

### Q: What happens if network is slow?

**A**: The heartbeat timeout (10 seconds) is generous. Even on slow networks, a pong response should arrive within 1-2 seconds. The 10-second timeout ensures legitimate slow connections aren't falsely identified as dead.

---

### Q: Can I disable heartbeat if there's a problem?

**A**: Yes. Simply set `PING_INTERVAL` to 0 or comment out the `setupHeartbeat()` call. The system will work as it does now (without zombie cleanup).

---

## Summary

**Two Systems, Two Protocols, Zero Interference**:

| Aspect | Claude Operations (HTTP) | Terminal (WebSocket) |
|--------|--------------------------|---------------------|
| Protocol | HTTP/1.1 Streaming | WebSocket |
| Duration | 5-10 minutes per request | Hours (entire session) |
| Timeout | None (data flow = alive) | **Needs heartbeat** |
| Cleanup | Automatic (stream ends) | **Needs lifecycle management** |
| Heartbeat Impact | **NONE** | Detects zombies |
| Connection Pool | Doesn't hold slots | Holds slots indefinitely |
| Problem | No issue | **Zombies accumulate** |
| Solution | No change needed | **Add heartbeat** |

**Key Takeaway**: Implementing heartbeat for terminal WebSockets will **solve the connection pool exhaustion problem** without affecting Claude operations in any way. They are completely separate communication channels using different protocols.

---

**Next Steps**:
1. Implement heartbeat mechanism in `terminal-websocket-server.ts`
2. Test locally with multiple terminal sessions
3. Deploy to Fly.io staging environment
4. Monitor connection count and zombie cleanup
5. Deploy to production if successful
6. Monitor Lilah's instance for improved stability

---

*Document created to address user confusion about timeouts and long-running Claude operations.*
