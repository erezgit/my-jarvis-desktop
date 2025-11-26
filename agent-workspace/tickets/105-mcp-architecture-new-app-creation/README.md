# Ticket #105: MCP Architecture Integration for New App Creation Process

## 🚨 CRITICAL MISSION: Update Create New App Process with MCP Architecture

### Objective
Update the create new app process (deployment.md) to include all MCP voice architecture components by default, ensuring new apps are created with the latest voice system and configuration.

### Current Gap Analysis
Based on analysis of ticket #102 (Yaron upgrade) and deployment.md, new apps need MCP integration from creation rather than requiring upgrades.

---

## 🔍 REQUIRED MCP COMPONENTS ANALYSIS

### 1. Docker Image & Container Changes
**Current State:**
- Docker image builds with node user architecture ✅
- Container starts and configures SSH environment ✅

**MCP Requirements:**
- **jarvis-mcp-server.js** must be included in Docker image
- **Node.js MCP server** dependencies in package.json
- **Voice generation bridge** from MCP to bash script

### 2. Workspace Template Updates
**Current Template:** `/app/workspace-template/`

**MCP Requirements:**
- **`.claude.json`** with MCP server configuration
- **`CLAUDE.md`** updated with MCP voice protocol
- **Voice tools directory** structure

### 3. Authentication & Environment
**Current:**
- JWT_SECRET and LOGIN_URL environment variables ✅

**MCP Requirements:**
- **OPENAI_API_KEY** environment variable for voice generation
- **WORKSPACE_DIR** environment variable for MCP server

### 4. Setup Script Changes
**Current:** `/app/scripts/setup-new-app.sh`

**MCP Requirements:**
- Copy MCP-enabled workspace template
- Set up voice tools directory
- Configure MCP server permissions

---

## 📋 DETAILED UPDATE REQUIREMENTS

### File Changes Needed

#### 1. Update Setup Script `.claude.json` Generation
**File:** `/app/scripts/setup-new-app.sh` (lines 92-104)

**Current (projects only):**
```bash
cat > "$HOME_DIR/.claude.json" << 'EOF'
{
  "projects": {
    "/home/node": {
      "allowedTools": ["Read", "Write", "Edit", "Bash"],
      "history": [],
      "mcpServers": {},
      "exampleFiles": [],
      "mcpContextUris": []
    }
  }
}
EOF
```

**Required (projects AND MCP servers):**
```bash
cat > "$HOME_DIR/.claude.json" << 'EOF'
{
  "projects": {
    "/home/node": {
      "allowedTools": ["Read", "Write", "Edit", "Bash"],
      "history": [],
      "mcpServers": {},
      "exampleFiles": [],
      "mcpContextUris": []
    }
  },
  "mcpServers": {
    "jarvis-tools": {
      "command": "node",
      "args": ["./jarvis-mcp-server.js"],
      "env": {
        "OPENAI_API_KEY": "${OPENAI_API_KEY}",
        "WORKSPACE_DIR": "${WORKSPACE_DIR}"
      }
    }
  }
}
EOF
```

#### 2. Update `CLAUDE.md` Template
**File:** `/app/workspace-template/CLAUDE.md`

**Required Changes:**
- Replace bash voice command with MCP tool: `mcp__jarvis-tools__voice_generate`
- Update voice protocol section
- Remove old bash path references
- Add MCP voice parameters (message, voice, speed)

#### 3. Add Environment Variables to Deployment
**File:** `deployment.md` Step 3

**Current:**
```bash
fly secrets set JWT_SECRET="..." LOGIN_URL="..." --app my-jarvis-newuser
```

**Required:**
```bash
fly secrets set \
  JWT_SECRET="dEf2vFruOirvQX/GtVV14NfQr3X9HkEG99+QEvf9Y2g=" \
  LOGIN_URL="https://www.myjarvis.io/login" \
  OPENAI_API_KEY="${OPENAI_API_KEY}" \
  WORKSPACE_DIR="/home/node" \
  --app my-jarvis-newuser
```

#### 4. Update Setup Script
**File:** `/app/scripts/setup-new-app.sh`

**Required Additions:**
```bash
# Create my-jarvis directory structure programmatically (eliminates Git keep files)
# REPLACES copying /workspace-template/my-jarvis/ directory
mkdir -p /home/node/my-jarvis/docs
mkdir -p /home/node/my-jarvis/tickets
mkdir -p /home/node/my-jarvis/uploads
echo "[Setup] ✅ Created clean my-jarvis directory structure (no Git keep files)"

# Create voice tools directory
mkdir -p /home/node/tools/voice
chown -R node:node /home/node/tools

# Set WORKSPACE_DIR environment for MCP server
echo 'export WORKSPACE_DIR="/home/node"' >> /home/node/.bashrc

# Test MCP server availability
node /app/jarvis-mcp-server.js --test-setup
```

**Template Directory Change:**
- **DELETE** `/app/workspace-template/my-jarvis/` directory entirely from codebase
- **CREATE** my-jarvis/docs, my-jarvis/tickets, my-jarvis/uploads directories programmatically in setup script
- **BENEFIT**: Users get clean empty folders without annoying Git keep files (.gitkeep, etc.)
- **RESULT**: No more placeholder files cluttering user workspace

#### 5. Docker Image Updates
**Files:** `Dockerfile`, `package.json`

**Required:**
- Include `jarvis-mcp-server.js` in Docker image
- Add OpenAI SDK dependencies
- Ensure MCP server executable permissions

---

## 🔄 IMPLEMENTATION PLAN

### Phase 1: Template File Updates
- [ ] Update workspace-template/CLAUDE.md with MCP voice protocol
- [ ] **DELETE** workspace-template/my-jarvis directory entirely (replace with script creation)

### Phase 2: Environment & Setup Updates
- [ ] Add OPENAI_API_KEY and WORKSPACE_DIR to deployment.md
- [ ] Update setup-new-app.sh to ADD MCP servers to generated .claude.json (keep projects object)
- [ ] Update setup-new-app.sh to create my-jarvis directories programmatically
- [ ] Test environment variable propagation

### Phase 3: Docker & Dependencies
- [ ] Verify jarvis-mcp-server.js included in Docker build
- [ ] Ensure OpenAI dependencies in package.json
- [ ] Test MCP server startup in container

### Phase 4: Documentation Updates
- [ ] Update deployment.md create new app section
- [ ] Add MCP troubleshooting section
- [ ] Update Quick Reference with MCP commands

### Phase 5: Testing & Validation
- [ ] Create test app with updated process
- [ ] Verify MCP voice generation works immediately
- [ ] Test authentication + MCP integration
- [ ] Validate no manual MCP setup required

---

## 🎯 SUCCESS CRITERIA

### ✅ Update Complete When:
1. **New Apps Created** with `fly apps create` + `fly deploy` have MCP voice working immediately
2. **No Manual MCP Setup** required after app creation
3. **Voice Generation** works through `mcp__jarvis-tools__voice_generate` tool
4. **Environment Variables** include OPENAI_API_KEY and WORKSPACE_DIR
5. **Template Files** include proper MCP configuration
6. **Setup Script** initializes MCP server and directories
7. **Documentation** reflects MCP as default, not upgrade requirement

### Before/After Comparison

**BEFORE (Current Process):**
```bash
# Step 1-5: Create app
# Step 6: Setup script copies old template
# User gets: ❌ Bash voice system, requires manual MCP upgrade
```

**AFTER (Updated Process):**
```bash
# Step 1-5: Create app (with MCP environment variables)
# Step 6: Setup script copies MCP-enabled template
# User gets: ✅ MCP voice system working immediately
```

---

## 🛡️ SAFETY PROTOCOLS

### Backwards Compatibility
- **Existing Apps**: Unaffected (use current templates)
- **Upgrade Path**: Still available through ticket procedures
- **Rollback**: Can revert to old template files if issues

### Testing Requirements
- **Test Environment**: Use fly.dev staging app
- **Voice Generation**: Verify OpenAI API integration
- **Authentication**: Ensure no conflicts with auth flow
- **Performance**: MCP server startup time acceptable

### Risk Mitigation
- **Environment Variables**: Fail gracefully if OPENAI_API_KEY missing
- **MCP Server**: Include error handling for startup failures
- **Documentation**: Clear troubleshooting for MCP issues

---

## 📝 SPECIFIC FILE CHANGES REQUIRED

### 1. `/app/workspace-template/.claude.json`
- Replace projects object with mcpServers configuration
- Include jarvis-tools MCP server definition
- Set environment variable references

### 2. `/app/workspace-template/CLAUDE.md`
- Update voice protocol from bash to MCP tool
- Change tool name to `mcp__jarvis-tools__voice_generate`
- Add MCP parameters documentation
- Remove old bash path references

### 3. `deployment.md`
- Add OPENAI_API_KEY to Step 3 environment variables
- Add WORKSPACE_DIR to Step 3 environment variables
- Update troubleshooting section with MCP commands

### 4. `/app/scripts/setup-new-app.sh`
- Create tools/voice directory structure
- Set WORKSPACE_DIR in user environment
- Test MCP server functionality
- Verify OpenAI API access

### 5. `Dockerfile` (if needed)
- Ensure jarvis-mcp-server.js copied to image
- Set proper file permissions for MCP server
- Include OpenAI SDK dependencies

---

**Priority**: High (Prevents future upgrade requirements)
**Risk Level**: Low (New apps only, existing apps unaffected)
**Estimated Time**: 2-3 hours
**Dependencies**: Access to Docker build process, template files

**Created**: 2025-11-23
**Status**: Ready for Implementation

---

## 🔧 IMPLEMENTATION CHECKLIST

### Phase 1: Template Updates
- [ ] Update .claude.json template with MCP servers
- [ ] Update CLAUDE.md template with MCP voice protocol
- [ ] Create voice tools directory in template
- [ ] Test template file validity

### Phase 2: Environment Integration
- [ ] Add MCP environment variables to deployment.md
- [ ] Update setup script with MCP initialization
- [ ] Test environment propagation to MCP server
- [ ] Verify workspace directory configuration

### Phase 3: Documentation & Testing
- [ ] Update deployment.md procedures
- [ ] Add MCP troubleshooting section
- [ ] Create test app with new process
- [ ] Validate immediate MCP functionality

### Phase 4: Validation & Deployment
- [ ] Test voice generation in new app
- [ ] Verify no manual setup required
- [ ] Add app restart step to deployment (MCP environment variable fix)
- [ ] Update quick reference guides
- [ ] Document any edge cases discovered

### Phase 5: MCP Environment Variable Fix (POST-IMPLEMENTATION)
- [x] Identified issue: MCP server not picking up OPENAI_API_KEY after deployment
- [x] Root cause: MCP server starts before environment variables are set and caches config
- [x] Solution: Add app restart step after workspace initialization
- [x] Updated deployment.md with Step 6b: `fly apps restart` command
- [ ] Test complete workflow with app restart step
- [ ] Verify voice generation works immediately after restart