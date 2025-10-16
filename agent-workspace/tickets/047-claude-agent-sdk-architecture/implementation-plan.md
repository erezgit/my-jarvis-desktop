# Ticket 047: Claude Agent SDK Architecture for Multi-User My Jarvis Desktop

## 🎯 Objective

Transform My Jarvis Desktop from a single-user Docker deployment to a scalable multi-user SaaS application using Claude Agent SDK with cloud-based storage.

**Goal**: Enable users to access My Jarvis Desktop via web browser, pay for access, and use Claude to create documents, generate code, and get voice responses - all served by a single backend service.

---

## 📊 Current State vs Target State

### **Current Architecture (Docker + Claude CLI)**

```
┌─────────────────────────────────┐
│  User Browser                   │
└─────────────┬───────────────────┘
              │
┌─────────────▼───────────────────┐
│  Render Docker Container        │
│  ┌───────────────────────────┐  │
│  │  My Jarvis Desktop        │  │
│  │  (Node + Electron)        │  │
│  │  + Claude CLI             │  │
│  └───────────────────────────┘  │
│                                 │
│  Files stored in container      │
│  (ephemeral without volumes)    │
└─────────────────────────────────┘
```

**Limitations:**
- ❌ File system storage in containers
- ❌ Hard to scale to multiple instances
- ❌ User isolation requires complex volume management
- ❌ Each user needs their own container or shared file system

---

### **Target Architecture (Claude Agent SDK + Supabase)**

```
┌─────────────────────┐
│   User Browser      │
│   (React Frontend)  │
└──────────┬──────────┘
           │ WebSocket
           │
┌──────────▼──────────────────────┐
│  FastAPI Backend Service        │
│  (Render/Railway)                │
│                                  │
│  ┌────────────────────────────┐ │
│  │  Claude Agent SDK          │ │
│  │  - Session per user        │ │
│  │  - Async/await handling    │ │
│  │  - Custom MCP tools        │ │
│  └────────────────────────────┘ │
│                                  │
│  ┌────────────────────────────┐ │
│  │  Voice Generation          │ │
│  │  (Python script)           │ │
│  └────────────────────────────┘ │
└──────────┬───────────────────────┘
           │
┌──────────▼───────────────────────┐
│  Supabase                        │
│                                  │
│  PostgreSQL Database:            │
│  - users (auth, subscriptions)   │
│  - documents (user_id, content)  │
│  - conversations (user_id, msgs) │
│  - files (user_id, metadata)     │
│                                  │
│  Storage Buckets:                │
│  - voice-files/{user_id}/        │
│  - documents/{user_id}/          │
│  - generated-code/{user_id}/     │
└──────────────────────────────────┘
```

**Advantages:**
- ✅ True multi-user isolation (user_id in database)
- ✅ Horizontal scaling (multiple backend instances)
- ✅ Persistent cloud storage (Supabase)
- ✅ Built-in session management (SDK)
- ✅ Cost-efficient (~$20-50/month for 100 users vs $500-1000 with containers)

---

## 🏗️ Architecture Components

### **1. Frontend (React + WebSocket)**

**Deployment:** Vercel or Netlify
**Tech Stack:** React, TypeScript, Tailwind CSS, WebSocket client

**Responsibilities:**
- User authentication UI (login/register)
- Payment integration (Stripe)
- Chat interface for Claude interaction
- Document viewer/editor
- Audio playback for voice responses
- Real-time message streaming

**Key Features:**
```typescript
// WebSocket connection to backend
const socket = new WebSocket(`wss://api.myjarvis.com/ws/agent/${userId}`);

// Send user message
socket.send(JSON.stringify({
  type: 'message',
  content: userInput
}));

// Receive streaming response
socket.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === 'text') {
    appendToChat(data.content);
  }

  if (data.type === 'voice') {
    playAudio(data.url, data.transcript);
  }

  if (data.type === 'document') {
    saveDocument(data.content, data.filename);
  }
};
```

---

### **2. Backend (FastAPI + Claude Agent SDK)**

**Deployment:** Render or Railway
**Tech Stack:** Python 3.10+, FastAPI, Claude Agent SDK, Supabase client

**Responsibilities:**
- Handle WebSocket connections (one per user)
- Manage Claude SDK sessions (isolated by user_id)
- Execute Python scripts (voice generation, data processing)
- Store/retrieve data from Supabase
- Implement custom MCP tools for database operations
- Handle authentication and authorization

**Core Implementation:**

```python
from fastapi import FastAPI, WebSocket, HTTPException
from claude_agent_sdk import query, create_sdk_mcp_server
from supabase import create_client
import os
import uuid
import subprocess

app = FastAPI()

# Initialize Supabase
supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)

# Custom MCP tool for saving documents
@create_sdk_mcp_server("jarvis-tools")
class JarvisTools:
    @tool()
    async def save_document(
        self,
        user_id: str,
        filename: str,
        content: str,
        doc_type: str = "text"
    ):
        """Save a document to the user's workspace in Supabase"""
        result = supabase.table("documents").insert({
            "user_id": user_id,
            "filename": filename,
            "content": content,
            "type": doc_type,
            "created_at": "now()"
        }).execute()

        return f"Document saved: {filename}"

    @tool()
    async def list_documents(self, user_id: str):
        """List all documents for the user"""
        result = supabase.table("documents")\
            .select("filename, type, created_at")\
            .eq("user_id", user_id)\
            .execute()

        return result.data

@app.websocket("/ws/agent/{user_id}")
async def agent_endpoint(websocket: WebSocket, user_id: str):
    await websocket.accept()

    try:
        # Verify user is authenticated and has active subscription
        user = await verify_user(user_id)
        if not user or not user.get("subscription_active"):
            await websocket.close(code=1008, reason="Unauthorized")
            return

        while True:
            # Receive message from user
            data = await websocket.receive_json()
            message_type = data.get("type")
            content = data.get("content")

            if message_type == "message":
                # Stream response from Claude SDK
                full_response = ""

                async for chunk in query(
                    prompt=content,
                    session_id=f"user-{user_id}",
                    options={
                        "mcp_servers": ["jarvis-tools"],
                        "system_prompt": f"You are JARVIS, assisting user {user_id}. Save documents using save_document tool."
                    }
                ):
                    # Send text chunk to frontend
                    await websocket.send_json({
                        "type": "text",
                        "content": chunk
                    })
                    full_response += chunk

                # Generate voice response
                voice_url = await generate_voice(full_response, user_id)

                # Send voice URL to frontend
                await websocket.send_json({
                    "type": "voice",
                    "url": voice_url,
                    "transcript": full_response
                })

                # Save conversation to database
                await save_conversation(user_id, content, full_response)

    except Exception as e:
        print(f"Error in WebSocket: {e}")
        await websocket.close(code=1011, reason=str(e))

async def generate_voice(text: str, user_id: str) -> str:
    """Generate voice audio and upload to Supabase Storage"""

    # Generate unique filename
    filename = f"{uuid.uuid4()}.mp3"
    temp_path = f"/tmp/{filename}"

    # Run voice generation script (same script you use locally!)
    subprocess.run([
        "python3",
        "/app/tools/voice_generator.py",
        "--text", text,
        "--voice", "echo",
        "--output", temp_path
    ], check=True)

    # Upload to Supabase Storage
    storage_path = f"users/{user_id}/voice/{filename}"

    with open(temp_path, 'rb') as f:
        supabase.storage.from_('voice-files').upload(
            storage_path,
            f,
            {"content-type": "audio/mpeg"}
        )

    # Get public URL
    url = supabase.storage.from_('voice-files').get_public_url(storage_path)

    # Cleanup temp file
    os.remove(temp_path)

    return url

async def verify_user(user_id: str):
    """Verify user authentication and subscription status"""
    result = supabase.table("users")\
        .select("id, email, subscription_active, tier")\
        .eq("id", user_id)\
        .single()\
        .execute()

    return result.data

async def save_conversation(user_id: str, user_msg: str, ai_msg: str):
    """Save conversation to database"""
    supabase.table("conversations").insert({
        "user_id": user_id,
        "user_message": user_msg,
        "ai_message": ai_msg,
        "timestamp": "now()"
    }).execute()
```

---

### **3. Database (Supabase PostgreSQL)**

**Tables:**

```sql
-- Users table (with Supabase Auth integration)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  subscription_active BOOLEAN DEFAULT false,
  tier TEXT DEFAULT 'free', -- 'free', 'pro', 'enterprise'
  stripe_customer_id TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Documents table
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  filename TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'text', -- 'text', 'code', 'markdown'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Conversations table
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  user_message TEXT NOT NULL,
  ai_message TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Files metadata table (for larger files stored in Storage)
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_type TEXT,
  size_bytes INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_files_user_id ON files(user_id);
```

**Storage Buckets:**
- `voice-files`: Audio files for voice responses
- `documents`: Generated documents and code files
- `user-uploads`: User-uploaded files

---

### **4. Voice Generation (Same Python Script, Cloud Deployment)**

**Key Insight:** Your existing voice generation script works perfectly in the cloud! The only difference is:
- **Local:** Save to `tools/voice/response.mp3` → Play on local speakers
- **Cloud:** Save to `/tmp/response.mp3` → Upload to Supabase → Return URL → Frontend plays

**No code changes needed to the voice script itself!** Just change where the output goes.

---

## 🚀 Implementation Phases

### **Phase 1: Backend Foundation (Week 1-2)**

**Tasks:**
- [ ] Set up Supabase project (database + storage + auth)
- [ ] Create FastAPI project structure
- [ ] Install Claude Agent SDK: `pip install claude-agent-sdk`
- [ ] Implement basic WebSocket endpoint
- [ ] Test Claude SDK query function with simple prompts
- [ ] Set up Supabase client in Python
- [ ] Create database tables (users, documents, conversations)

**Deliverable:** Backend that can handle one user, stream Claude responses via WebSocket

---

### **Phase 2: Custom MCP Tools (Week 2-3)**

**Tasks:**
- [ ] Create custom MCP server for Supabase operations
- [ ] Implement `save_document` tool
- [ ] Implement `list_documents` tool
- [ ] Implement `search_documents` tool
- [ ] Test MCP tools with Claude SDK
- [ ] Configure SDK to use custom tools

**Deliverable:** Claude can save/retrieve documents from Supabase using MCP tools

---

### **Phase 3: Voice Integration (Week 3)**

**Tasks:**
- [ ] Migrate voice generation script to backend
- [ ] Set up Supabase Storage bucket for voice files
- [ ] Implement voice upload function
- [ ] Test voice generation → upload → URL return flow
- [ ] Optimize audio streaming (consider chunked transfer)

**Deliverable:** Voice responses work in cloud architecture

---

### **Phase 4: Multi-User Support (Week 4)**

**Tasks:**
- [ ] Implement user authentication with Supabase Auth
- [ ] Add user_id isolation to all database queries
- [ ] Implement session management per user
- [ ] Add subscription verification logic
- [ ] Set up rate limiting per user
- [ ] Test concurrent user sessions

**Deliverable:** Multiple users can use the system simultaneously, fully isolated

---

### **Phase 5: Frontend Integration (Week 5-6)**

**Tasks:**
- [ ] Build React frontend with WebSocket client
- [ ] Implement login/register UI (Supabase Auth)
- [ ] Create chat interface with streaming messages
- [ ] Build document viewer/editor
- [ ] Implement audio player for voice responses
- [ ] Add Stripe payment integration
- [ ] Deploy frontend to Vercel

**Deliverable:** Complete user-facing application

---

### **Phase 6: Production Deployment (Week 7-8)**

**Tasks:**
- [ ] Deploy backend to Render/Railway
- [ ] Set up environment variables (API keys, Supabase URLs)
- [ ] Configure domain and SSL certificates
- [ ] Set up monitoring (Sentry for errors, LogRocket for sessions)
- [ ] Implement backup strategy for database
- [ ] Load testing with 10-50 concurrent users
- [ ] Set up CI/CD pipeline (GitHub Actions)

**Deliverable:** Production-ready application

---

### **Phase 7: Migration & Launch (Week 8-9)**

**Tasks:**
- [ ] Migrate Jonathan & Lilach to new system
- [ ] Gather feedback and iterate
- [ ] Polish UI/UX based on feedback
- [ ] Create onboarding flow for new users
- [ ] Set up customer support (Intercom/Help Scout)
- [ ] Launch to waitlist users

**Deliverable:** Live SaaS application with paying users

---

## 💰 Cost Analysis

### **Current Docker Approach (Estimated):**
- Render container per user: ~$7-10/month each
- 100 users = $700-1000/month

### **Claude Agent SDK Approach:**
- **Backend (Render):** $25/month (starter tier, scales up as needed)
- **Supabase:** $25/month (pro tier) + storage costs (~$0.10/GB)
- **Frontend (Vercel):** Free (hobby) or $20/month (pro)
- **Total for 100 users:** ~$50-100/month

**Cost savings:** ~90% reduction in infrastructure costs! 🎉

---

## 🔒 Security Considerations

1. **User Isolation:**
   - All database queries filter by user_id
   - Session IDs include user_id prefix
   - Storage paths include user_id namespace

2. **Authentication:**
   - Supabase Auth with JWT tokens
   - Email verification required
   - Refresh token rotation

3. **API Rate Limiting:**
   - Per-user rate limits (e.g., 100 messages/hour)
   - Claude API quota monitoring
   - Graceful degradation when limits reached

4. **Data Privacy:**
   - Row-level security in Supabase
   - Encrypted storage buckets
   - No cross-user data leakage

5. **Payment Security:**
   - Stripe for PCI-compliant payment processing
   - Webhook verification for subscription updates
   - Automatic access revocation on payment failure

---

## 📈 Scaling Strategy

### **Horizontal Scaling:**
```
Users 1-50:     1 backend instance
Users 51-200:   2 backend instances + load balancer
Users 201-500:  3-5 backend instances + load balancer
Users 501+:     Auto-scaling group based on CPU/memory
```

### **Database Scaling:**
- Supabase handles scaling automatically up to 10,000 users
- Read replicas for heavy read workloads
- Connection pooling (Supabase Pooler)

### **Storage Scaling:**
- Supabase Storage has no practical limits
- CDN for voice file delivery (automatic with Supabase)

---

## ✅ Success Criteria

**MVP Ready (Week 6):**
- ✅ User can register, pay, and access service
- ✅ Claude creates documents and saves to database
- ✅ Voice responses work in browser
- ✅ Documents are persistent and downloadable
- ✅ 2-3 beta users testing successfully

**Production Ready (Week 8):**
- ✅ 10+ active users with no major issues
- ✅ 99.9% uptime over 1 week
- ✅ Positive user feedback on core features
- ✅ Payment processing works reliably
- ✅ Can handle 50 concurrent users

**Scale Ready (Week 12):**
- ✅ 100+ paying users
- ✅ Revenue: $1000-2000/month
- ✅ Load balancer and auto-scaling configured
- ✅ Customer support system in place
- ✅ Can handle 200+ concurrent users

---

## 🛠️ Tech Stack Summary

**Frontend:**
- React + TypeScript
- Tailwind CSS
- WebSocket client
- Vercel deployment

**Backend:**
- Python 3.10+
- FastAPI
- Claude Agent SDK
- Supabase Python client
- Render/Railway deployment

**Database & Storage:**
- Supabase (PostgreSQL + Storage + Auth)

**Payments:**
- Stripe

**Monitoring:**
- Sentry (error tracking)
- LogRocket (session replay)
- Supabase Analytics

---

## 🎯 Next Immediate Steps

1. **Create Supabase project** (30 minutes)
2. **Set up FastAPI boilerplate** (1 hour)
3. **Install Claude Agent SDK and test basic query** (1 hour)
4. **Create first WebSocket endpoint** (2 hours)
5. **Test end-to-end: Browser → WebSocket → Claude → Response** (2 hours)

**First milestone:** Get "Hello from Claude SDK" working via WebSocket in ~6 hours

---

## 📚 Resources

- [Claude Agent SDK Docs](https://docs.anthropic.com/agent-sdk)
- [Supabase Documentation](https://supabase.com/docs)
- [FastAPI WebSocket Guide](https://fastapi.tiangolo.com/advanced/websockets/)
- [Our Research Document](../../../docs/claude-agent-sdk-explanation.md)

---

**Status:** 🟡 Planning
**Priority:** 🔴 High
**Effort:** ~8-9 weeks for full production deployment
**Goal Alignment:** ⭐⭐⭐⭐⭐ Critical for 100-user goal

---

*This architecture enables the core vision: Users pay to access My Jarvis Desktop via web browser and get full Claude-powered document creation, code generation, and voice responses - all served by a scalable cloud infrastructure.*
