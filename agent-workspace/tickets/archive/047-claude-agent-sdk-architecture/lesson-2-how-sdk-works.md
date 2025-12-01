# Lesson 2: How Claude Agent SDK Actually Works

## The Big Question
**Is Claude Agent SDK just Sonnet 4.5 with tools attached, or is it something more powerful?**

**Answer:** It's the FULL Claude Code orchestration system, programmatically accessible!

---

## What Claude Code Actually Is

### The Claude Code Stack
```
┌─────────────────────────────────────────┐
│     Claude Code CLI (User Interface)    │ ← What you use locally
├─────────────────────────────────────────┤
│   Claude Agent SDK (Orchestration Core) │ ← What you can deploy
├─────────────────────────────────────────┤
│        Sonnet 4.5 Model (Brain)         │ ← The AI model
└─────────────────────────────────────────┘
```

**Claude Code** = CLI interface + Agent SDK + Model
**Claude Agent SDK** = Just the orchestration layer + Model (no CLI)

---

## What Makes It Different From Plain API Calls

### Option A: Plain Anthropic API (Simple Chat)
```python
import anthropic

client = anthropic.Anthropic(api_key=user_api_key)

response = client.messages.create(
    model="claude-sonnet-4-5-20250929",
    messages=[{"role": "user", "content": "Create a React app"}]
)

print(response.content)  # Just gets a text response
```

**What you get:**
- ❌ Just text responses
- ❌ No tool execution
- ❌ No file operations
- ❌ No memory across requests
- ❌ No agentic loops
- ❌ You have to implement everything yourself

---

### Option B: Claude Agent SDK (Full Orchestration)
```python
from claude_agent_sdk import query

async for message in query(
    prompt="Create a React app",
    api_key=user_api_key,
    session_id="user-123"
):
    print(message)
```

**What you get:**
- ✅ Agentic loops - Claude can plan multi-step tasks
- ✅ Tool execution - File operations, bash, web search
- ✅ Memory management - Context across conversations
- ✅ Streaming responses - Real-time output
- ✅ Error recovery - Automatic retry logic
- ✅ Session persistence - Resume conversations
- ✅ MCP server support - Custom tools
- ✅ The ENTIRE Claude Code experience

---

## The Agentic Loop: What Happens Inside

### When User Says: "Create a React app with login"

**Plain API Response:**
```
"Here's how to create a React app with login:
1. Run npx create-react-app...
2. Install dependencies...
3. Create login component..."
```
→ Just instructions, no action

**Claude Agent SDK Response (Agentic):**
```
Step 1: Planning
  ↓
"I'll create the React app structure, implement login, and test it"
  ↓
Step 2: Execute bash tool
  ↓
npx create-react-app my-app
  ↓
Step 3: Execute write tool
  ↓
Write src/Login.jsx with code
  ↓
Step 4: Execute write tool
  ↓
Write src/App.jsx with integration
  ↓
Step 5: Execute bash tool
  ↓
npm install axios react-router-dom
  ↓
Step 6: Reflection
  ↓
"App created successfully. Here's what I built..."
```
→ **Actual files created and working app ready!**

---

## The Architecture: How It Works

### Your Web Service Architecture
```
User Browser (React)
        ↓
    WebSocket Connection
        ↓
FastAPI Backend + Claude Agent SDK
        ↓
    ┌───────────┴───────────┐
    ↓                       ↓
Anthropic API          Supabase Database
(using user's key)     (stores files/state)
```

### What Each Layer Does

**1. React Frontend**
- Sends user messages via WebSocket
- Receives streaming responses in real-time
- Displays text, code, file updates
- Plays voice responses

**2. FastAPI Backend**
```python
from fastapi import FastAPI, WebSocket
from claude_agent_sdk import query, create_sdk_mcp_server
from supabase import create_client

app = FastAPI()
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Create custom MCP server for file operations
def create_jarvis_tools(user_id: str):
    """MCP server that stores files in Supabase instead of local disk"""

    async def read_file(path: str):
        result = supabase.table("documents").select("content").eq(
            "user_id", user_id
        ).eq("filename", path).single()
        return result["content"]

    async def write_file(path: str, content: str):
        supabase.table("documents").upsert({
            "user_id": user_id,
            "filename": path,
            "content": content,
            "updated_at": "now()"
        })
        return f"Wrote {len(content)} bytes to {path}"

    return create_sdk_mcp_server(
        name="jarvis-tools",
        tools={
            "read_file": read_file,
            "write_file": write_file
        }
    )

@app.websocket("/ws/agent/{user_id}")
async def agent_endpoint(websocket: WebSocket, user_id: str):
    await websocket.accept()

    # Get user's API key from database
    user_data = supabase.table("users").select("encrypted_api_key").eq("id", user_id).single()
    user_api_key = decrypt_key(user_data["encrypted_api_key"])

    # Create user-specific tools
    jarvis_tools = create_jarvis_tools(user_id)

    while True:
        user_message = await websocket.receive_text()

        # Stream responses from Claude Agent SDK
        async for message in query(
            prompt=user_message,
            api_key=user_api_key,  # User's own key!
            session_id=f"user-{user_id}",
            options={
                "mcp_servers": [jarvis_tools],  # Custom tools
                "system_prompt": "You are JARVIS, a helpful AI assistant"
            }
        ):
            await websocket.send_json({
                "type": "text",
                "content": message
            })
```

**3. Claude Agent SDK (The Brain)**
- Receives prompt + user's API key
- Makes API calls to Anthropic using that key
- Executes tools (file operations, bash, etc.)
- Manages conversation memory
- Handles multi-step reasoning
- Streams responses back

**4. Supabase Database**
- Stores user files (instead of local filesystem)
- Stores conversation history
- Stores session state
- Stores encrypted API keys

---

## The Magic: MCP Servers (Custom Tools)

### What Are MCP Servers?
**Model Context Protocol** - A way to give Claude custom tools beyond the defaults

### Default Tools (Built Into SDK)
- `bash` - Execute terminal commands
- `read_file` - Read files
- `write_file` - Write files
- `edit_file` - Edit files
- `web_search` - Search the web
- `web_fetch` - Fetch web pages

### Custom Tools (You Create)
```python
# Example: Voice generation tool
async def generate_voice(text: str, user_id: str):
    # Run Python voice script on backend
    voice_file = await run_voice_script(text)

    # Upload to Supabase Storage
    url = supabase.storage.from_("voices").upload(
        f"{user_id}/{uuid4()}.mp3",
        voice_file
    )

    return url

# Example: Database query tool
async def query_database(sql: str, user_id: str):
    # Safe, sandboxed SQL execution
    result = supabase.rpc("execute_safe_query", {
        "user_id": user_id,
        "query": sql
    })
    return result
```

**These tools run in your backend Python process** - No separate server needed!

---

## Session Management: Multi-User Support

### How One Backend Serves Multiple Users

```python
# Each WebSocket connection is isolated
sessions = {}  # In-memory session tracking

@app.websocket("/ws/agent/{user_id}")
async def agent_endpoint(websocket: WebSocket, user_id: str):
    # Create isolated session for this user
    session_id = f"user-{user_id}-{uuid4()}"
    sessions[session_id] = {
        "websocket": websocket,
        "api_key": get_user_api_key(user_id),
        "memory": {}
    }

    try:
        # User 1 and User 2 can both be connected simultaneously
        # Each gets their own session_id
        # Each uses their own API key
        # Each has isolated memory/context

        async for message in query(
            prompt=user_message,
            api_key=sessions[session_id]["api_key"],
            session_id=session_id,  # Isolated!
            options={"mcp_servers": [create_jarvis_tools(user_id)]}
        ):
            await websocket.send_json({"type": "text", "content": message})
    finally:
        # Cleanup when user disconnects
        del sessions[session_id]
```

**Key Points:**
- One FastAPI backend process
- Multiple WebSocket connections (one per user)
- Each user gets isolated session
- Each user uses their own API key
- No cross-contamination of data

---

## What You DON'T Need to Build

Because Claude Agent SDK handles it:
- ❌ Multi-turn conversation logic
- ❌ Tool execution framework
- ❌ Retry and error handling
- ❌ Streaming response management
- ❌ Token counting and limits
- ❌ Prompt optimization
- ❌ Context window management

**You just call `query()` and everything works!**

---

## The File Storage Difference

### Local Claude Code (Ticket 045)
```
User: "Create app.js"
  ↓
Claude writes to: /workspace/app.js (on disk)
  ↓
User sees file in IDE
```

### Cloud Claude Agent SDK (Ticket 047)
```
User: "Create app.js"
  ↓
Claude calls your custom write_file tool
  ↓
Your tool stores in Supabase:
  - user_id: "user-123"
  - filename: "app.js"
  - content: "const app = ..."
  ↓
User sees file in browser UI
```

**Same experience, different storage!**

---

## Next Lesson Preview

In Lesson 3, we'll walk through the complete end-to-end flow:
- User opens your web app
- Enters their API key
- Sends a message
- What happens in each layer
- How files get created and stored
- How voice gets generated
- Real code walkthrough from the official E2B example

---

**Status:** Ready for your review. Let me know when you're ready for Lesson 3!
