# Lesson 1: Understanding Claude Agent SDK Authentication Options

## The Core Question
**How do users authenticate with Anthropic's API when using your web service?**

---

## Authentication Option 1: Official Anthropic OAuth Login (RECOMMENDED)

### What It Is
- User clicks "Login with Anthropic" button in your web app
- Redirects to Anthropic's official OAuth server
- User enters credentials on Anthropic's domain (not yours)
- Anthropic returns an access token to your app
- Your app stores this token for the user's session

### The Flow
```
Your Web App → Redirect to console.anthropic.com/oauth
              ↓
         User logs in on Anthropic
              ↓
         Anthropic generates OAuth token
              ↓
         Redirect back to your app with token
              ↓
         Your app stores token for user
              ↓
         Claude Agent SDK uses this token
```

### Advantages
✅ Most secure - users never share credentials with you
✅ Professional - uses official Anthropic infrastructure
✅ Token management handled by Anthropic
✅ Users control their own API usage
✅ No billing complexity for you
✅ Each user pays for their own Claude usage

### Challenges
⚠️ Requires Anthropic to have OAuth setup (checking if available)
⚠️ Users must have Anthropic account
⚠️ Users need to manage their own API credits

---

## Authentication Option 2: User Provides API Key Manually (SIMPLE)

### What It Is
- User copies their API key from console.anthropic.com
- Pastes it into a settings page in your app
- You store it encrypted in Supabase
- Your backend retrieves and uses it when making Claude requests

### The Flow
```
User goes to console.anthropic.com
    ↓
Copies API key (sk-ant-...)
    ↓
Pastes into your app's settings
    ↓
Your app encrypts and stores in Supabase
    ↓
Backend retrieves key when needed
    ↓
Claude Agent SDK uses this key
```

### Advantages
✅ Simple to implement - no OAuth complexity
✅ Works right now - no waiting for Anthropic features
✅ Full user control over their API usage
✅ Easy to test and debug

### Challenges
⚠️ Less user-friendly - manual copy/paste
⚠️ Security risk if not encrypted properly
⚠️ Users see their API key (some don't like this)

---

## Authentication Option 3: Master API Key (NOT RECOMMENDED for BYOK)

### What It Is
- YOU have one Anthropic API key
- All users share this key
- You bill users separately (subscription/credits)
- You pay Anthropic's bill

### Why NOT for Your Use Case
❌ You said users should bring their own API key
❌ You'd pay for everyone's Claude usage
❌ Complex billing and usage tracking needed
❌ Financial risk if users abuse the system

---

## Recommended Architecture for Your Goal

### Phase 1: Start with Manual API Key (Option 2)
**Why:** Quick to implement, works immediately, lets you validate the concept

**Implementation:**
1. User creates account in your app (email/password or social login)
2. Settings page: "Enter your Anthropic API Key"
3. Link to console.anthropic.com with instructions
4. Encrypt key with AES-256 before storing in Supabase
5. Backend retrieves and decrypts when making Claude requests

### Phase 2: Upgrade to OAuth (Option 1) When Available
**Why:** Better UX, more professional, more secure

**Migration Path:**
1. Keep Option 2 working
2. Add "Login with Anthropic" button
3. Users can choose which method they prefer
4. Gradually encourage OAuth for new users

---

## Key Security Requirements

### For Manual API Key Storage
```python
# MUST use encryption
from cryptography.fernet import Fernet
import os

# Generate encryption key (store in environment variable)
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")
cipher = Fernet(ENCRYPTION_KEY)

# Encrypt before storing
encrypted_key = cipher.encrypt(user_api_key.encode())
supabase.table("user_settings").insert({
    "user_id": user_id,
    "encrypted_api_key": encrypted_key.decode()
})

# Decrypt when using
stored_key = supabase.table("user_settings").select("encrypted_api_key").eq("user_id", user_id).single()
decrypted_key = cipher.decrypt(stored_key["encrypted_api_key"].encode()).decode()
```

### For OAuth Tokens
```python
# Store OAuth tokens securely
supabase.table("user_sessions").insert({
    "user_id": user_id,
    "access_token": oauth_token,  # Already encrypted by Supabase
    "expires_at": expiry_timestamp,
    "refresh_token": refresh_token
})
```

---

## What Happens in Claude Agent SDK

### When User Makes a Request
```python
from fastapi import WebSocket
from claude_agent_sdk import query

@app.websocket("/ws/agent/{user_id}")
async def agent_endpoint(websocket: WebSocket, user_id: str):
    # Retrieve user's API key from database
    user_key = get_user_api_key(user_id)  # Decrypted

    # Pass it to Claude Agent SDK
    async for message in query(
        prompt=user_message,
        api_key=user_key,  # User's own key!
        session_id=f"user-{user_id}"
    ):
        await websocket.send_json({"type": "text", "content": message})
```

**Each user's requests use THEIR OWN API key** - You never pay for their usage!

---

## Next Lesson Preview
In Lesson 2, we'll dive into how Claude Agent SDK actually works - what happens when you call `query()`, how it's different from just using the Anthropic API directly, and why it gives you the full Claude Code orchestration system instead of just chat responses.

---

**Status:** Ready for your review. Let me know when you're ready for the next lesson!
