# Ticket #103: Create New App Process - MCP Architecture Integration

## 🚨 CRITICAL UPGRADE: Deploy MCP Voice System for New Apps

### Objective
Upgrade our "Create New App" deployment process to include the comprehensive MCP (Model Context Protocol) voice architecture that was successfully implemented during the my-jarvis-erez upgrade.

**Current Gap**: New apps are being created without the latest MCP voice system, authentication improvements, and workspace template updates that are now standard in our production environment.

---

## 📋 ANALYSIS: What Changed Since Last "Create New App"

### Major Architectural Changes Identified

#### 1. **MCP Voice System Migration** 🎤
**Previous (Old) System:**
```bash
# Claude used direct bash commands
/Users/erezfern/Workspace/my-jarvis/tools/src/jarvis_voice.sh "message"
```

**Current (New) System:**
```typescript
// Claude uses MCP tool through jarvis-mcp-server.js
mcp__jarvis-tools__voice_generate
```

**Key Files Added:**
- `/app/jarvis-mcp-server.js` - MCP server bridging Claude Code to Python voice system
- Root `.claude.json` with MCP server configuration
- Updated workspace template `CLAUDE.md` with MCP tool instructions

#### 2. **Enhanced Workspace Template** 📁
**New Components:**
- **Voice-first CLAUDE.md** - Mandates MCP voice tool usage
- **Comprehensive onboarding guides** - New user setup protocols
- **Updated directory structure** - Organized guides, tools, my-jarvis folders

#### 3. **Authentication Middleware Security Update** 🔒
**New Features:**
- OWASP 2025 compliance (path traversal protection)
- Enhanced JWT validation
- Favicon serving fix
- Login URL standardization

#### 4. **Mobile File Tree Persistence** 📱
**React 19 Fixes:**
- Mobile browser rendering compatibility
- Voice message streaming improvements
- Enhanced state management

#### 5. **Claude Agent SDK 2.0.42** 🧠
**Thinking Support:**
- Resolves clear_thinking_20251015 errors
- Enhanced reasoning capabilities
- Better model compatibility

---

## 🔄 REQUIRED UPDATES TO "CREATE NEW APP" PROCESS

### Phase 1: Docker Image & Deployment Updates

#### Step 1.1: Verify Latest Codebase in Docker
**Current**: Step 2 in deployment.md runs `fly deploy --app my-jarvis-newuser`

**Enhancement Required:**
```bash
# Ensure we're deploying latest code with MCP architecture
git status  # Verify clean state
git pull origin main  # Get latest updates
fly deploy --app my-jarvis-newuser
```

#### Step 1.2: MCP Server Deployment Verification
**New Verification Steps:**
```bash
# Verify MCP server is included in Docker image
fly ssh console -a my-jarvis-newuser -C "ls -la /app | grep mcp"

# Expected output: jarvis-mcp-server.js should exist

# Verify Node.js dependencies for MCP
fly ssh console -a my-jarvis-newuser -C "cd /app && node jarvis-mcp-server.js --test"
```

### Phase 2: Workspace Template Enhancement

#### Step 2.1: Enhanced Setup Script
**Current**: Step 6 runs `/app/scripts/setup-new-app.sh`

**Required Enhancement:**
```bash
#!/bin/bash
# Enhanced setup-new-app.sh with MCP architecture

# Copy workspace template (existing)
cp -r /app/workspace-template/* /home/node/

# NEW: Create .claude.json with MCP server configuration
cat > /home/node/.claude.json << 'EOF'
{
  "mcpServers": {
    "jarvis-tools": {
      "command": "node",
      "args": ["/app/jarvis-mcp-server.js"],
      "env": {
        "OPENAI_API_KEY": "${OPENAI_API_KEY}",
        "WORKSPACE_DIR": "/home/node"
      }
    }
  },
  "projects": {
    "/home/node": {
      "allowedTools": ["Read", "Write", "Edit", "Bash"],
      "history": [],
      "mcpServers": {
        "jarvis-tools": {
          "command": "node",
          "args": ["/app/jarvis-mcp-server.js"]
        }
      },
      "exampleFiles": [],
      "mcpContextUris": []
    }
  }
}
EOF

# Set proper permissions
chown -R node:node /home/node
chmod 644 /home/node/.claude.json

echo "[Setup] ✅ MCP architecture configured"
```

#### Step 2.2: Workspace Template Content Updates
**Required Files in `/app/workspace-template/`:**

1. **Updated CLAUDE.md** (Voice-first configuration):
```markdown
# JARVIS - AI Assistant Configuration

## 🔊 CRITICAL: VOICE-FIRST COMMUNICATION

**Use the MCP voice generation tool for all responses:**
- **Tool:** `mcp__jarvis-tools__voice_generate`
- **Parameters:** message, voice (nova/echo/alloy/onyx/fable/shimmer), speed (0.25-4.0)

**Rules:**
- Voice messages ARE the response (contain full transcript)
- NEVER write text-only responses
- Auto-play disabled - creates voice message UI components
```

2. **New Onboarding Guides** (`/guides/`):
- `new-user-onboarding.md`
- `openai-api-setup.md`
- Directory structure templates

### Phase 3: Container & Environment Updates

#### Step 3.1: Docker Image Requirements
**Verify Docker includes:**
```dockerfile
# MCP server file
COPY jarvis-mcp-server.js /app/
COPY package.json /app/
COPY package-lock.json /app/

# Install MCP dependencies
RUN npm install @modelcontextprotocol/sdk

# Workspace template with MCP configuration
COPY workspace-template/ /app/workspace-template/
```

#### Step 3.2: Environment Variables Enhancement
**Current**: JWT_SECRET and LOGIN_URL

**Add Required:**
```bash
fly secrets set \
  JWT_SECRET="dEf2vFruOirvQX/GtVV14NfQr3X9HkEG99+QEvf9Y2g=" \
  LOGIN_URL="https://www.myjarvis.io/login" \
  OPENAI_API_KEY="sk-..." \
  --app my-jarvis-newuser
```

### Phase 4: Post-Deployment Validation

#### Step 4.1: MCP Architecture Testing
```bash
# Test MCP server responds
fly ssh console -a my-jarvis-newuser -C "echo 'test message' | node /app/jarvis-mcp-server.js"

# Verify Claude configuration
fly ssh console -a my-jarvis-newuser -C "cat /home/node/.claude.json | jq '.mcpServers'"

# Test voice tool availability through Claude
# Login and verify mcp__jarvis-tools__voice_generate works
```

#### Step 4.2: Authentication & Chat History Verification
```bash
# Test authentication flow
curl -I https://my-jarvis-newuser.fly.dev

# Test projects API (should return /home/node)
curl https://my-jarvis-newuser.fly.dev/api/projects

# Expected: {"projects":[{"path":"/home/node","encodedName":"-home-node"}]}
```

---

## 📝 UPDATED DEPLOYMENT.MD REQUIREMENTS

### New Step 6.5: MCP Architecture Verification
```bash
# After setup script, verify MCP integration
fly ssh console -a my-jarvis-newuser -C "
  echo '=== MCP Configuration Check ==='
  ls -la /app/jarvis-mcp-server.js
  cat /home/node/.claude.json | head -c 500
  echo '=== Voice System Test ==='
  node /app/jarvis-mcp-server.js --version
"
```

### Enhanced Step 6.6: Feature Testing Checklist
**New User First Login Should Have:**
- ✅ Voice generation works (MCP tool available)
- ✅ Chat history persistence enabled
- ✅ Workspace template properly deployed
- ✅ Claude CLI version 2.0.42+ with thinking support
- ✅ Mobile-optimized UI (React 19 fixes)
- ✅ Authentication security (OWASP 2025 compliance)

---

## 🔧 FILES TO UPDATE

### 1. `deployment.md`
**Section**: "Create New App (5 Simple Steps)"
**Changes**:
- Add MCP verification step
- Update Step 6 with enhanced setup script
- Add post-deployment MCP testing
- Include environment variable requirements

### 2. Docker Configuration
**Files**: `Dockerfile`, `package.json`
**Changes**:
- Ensure MCP dependencies included
- Copy jarvis-mcp-server.js to container
- Update workspace template deployment

### 3. Setup Script
**File**: `/scripts/setup-new-app.sh`
**Changes**:
- Add .claude.json with MCP configuration
- Include jarvis-tools MCP server setup
- Set proper environment variables

### 4. Workspace Template
**Directory**: `/workspace-template/`
**Changes**:
- Update CLAUDE.md with voice-first protocol
- Add comprehensive guides directory
- Include MCP tool instructions

---

## 🎯 SUCCESS CRITERIA

### ✅ New App Deployment Complete When:
1. **MCP Voice System**: `mcp__jarvis-tools__voice_generate` available immediately
2. **Authentication**: Login works through https://www.myjarvis.io/login
3. **Chat History**: Projects API returns `/home/node` correctly
4. **Voice-First Experience**: All Claude interactions use voice by default
5. **Mobile Compatibility**: File tree and voice messages work on mobile
6. **Security Compliance**: OWASP 2025 authentication standards met
7. **SDK Version**: Claude Agent SDK 2.0.42+ with thinking support

### New Apps Will Include:
- **Complete MCP architecture** from day 1
- **Voice-first user experience** (no text-only responses)
- **Mobile-optimized interface** (React 19 fixes)
- **Enhanced security** (authentication middleware updates)
- **Thinking support** (no clear_thinking errors)

---

## 🚀 IMPLEMENTATION PLAN

### Priority 1: Update Docker & Scripts
1. Verify latest code includes MCP server
2. Update setup-new-app.sh with MCP configuration
3. Test Docker image includes all MCP dependencies

### Priority 2: Enhanced Deployment Process
1. Add MCP verification steps to deployment.md
2. Include environment variable setup for OPENAI_API_KEY
3. Create post-deployment testing checklist

### Priority 3: Template & Documentation
1. Update workspace template with voice-first CLAUDE.md
2. Add comprehensive onboarding guides
3. Document MCP architecture for future apps

---

**Risk Level**: Low (New app creation process, no existing data)
**Estimated Time**: 4-6 hours (includes testing)
**Dependencies**: Docker image update, MCP server deployment
**Testing Required**: Create test app to verify complete MCP integration

**Created**: 2025-11-23
**Status**: Ready for Implementation

---

## 🔍 IMPLEMENTATION CHECKLIST

- [ ] **Phase 1**: Verify Docker image with MCP components
- [ ] **Phase 2**: Update setup-new-app.sh script
- [ ] **Phase 3**: Enhance workspace template
- [ ] **Phase 4**: Update deployment.md documentation
- [ ] **Phase 5**: Test complete new app creation process
- [ ] **Phase 6**: Validate MCP voice system works from first login
- [ ] **Phase 7**: Confirm authentication and chat history integration
- [ ] Close ticket with successful test app deployment