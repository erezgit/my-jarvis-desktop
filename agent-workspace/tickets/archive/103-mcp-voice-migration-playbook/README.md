# Ticket #103: MCP Voice System Migration - Complete Playbook

## 🚨 CRITICAL MISSION: MCP Voice Migration for Remaining Apps

### Overview
This ticket documents the complete process for migrating My Jarvis apps from bash-based voice generation to MCP (Model Context Protocol) voice system. Based on successful upgrade of my-jarvis-yaron from 1.34.2 to 1.35.0.

### Why This Migration is Critical
- **Old System**: Claude workspace calls bash command `/Users/erezfern/Workspace/my-jarvis/tools/src/jarvis_voice.sh`
- **New System**: Claude workspace calls MCP tool `mcp__jarvis-tools__voice_generate`
- **Backwards Compatibility**: MCP server bridges to bash command, so both work
- **Future-Proof**: MCP is the standard going forward for tool integration

---

## 📋 APPS REQUIRING MIGRATION

### ✅ Already Migrated
1. **my-jarvis-erez** - Version 1.35.0 (Reference implementation)
2. **my-jarvis-yaron** - Version 1.35.0 (Completed 2025-11-23)

### ⚠️ Requiring Migration
3. **my-jarvis-lilah** - Version 1.34.2
4. **my-jarvis-daniel** - Version 1.35.0 (⚠️ Has Excel but missing MCP voice)
5. **my-jarvis-iddo** - Version 1.35.0 (⚠️ Has Excel but missing MCP voice)
6. **my-jarvis-elad** - Version 1.35.0 (⚠️ Has Excel but missing MCP voice)
7. **my-jarvis-guy** - Version 1.34.2
8. **my-jarvis-tamar** - Version 1.35.0 (⚠️ Has Excel but missing MCP voice)
9. **my-jarvis-omer** - Version 1.35.0 (⚠️ Has Excel but missing MCP voice)
10. **my-jarvis-yaron-dev** - Version 1.35.0 (⚠️ Has Excel but missing MCP voice)
11. **my-jarvis-liron** - Version 1.35.0 (⚠️ Has Excel but missing MCP voice)
12. **my-jarvis-jennifer** - Version 1.34.2
13. **my-jarvis-daniel-stern** - Version 1.34.2

---

## 🔍 YARON UPGRADE - LESSONS LEARNED

### Critical Issues Discovered
1. **OpenAI API Key Corruption**: Key was literally set to "Usage:" help text instead of actual key
2. **DEPLOYMENT_MODE Error**: Set to wrong value causing voice URL generation issues
3. **Missing MCP Server**: .claude.json had empty mcpServers object
4. **Workspace Protocol**: CLAUDE.md still referenced old bash command syntax
5. **File System Changes**: MCP server deployment required alongside code updates

### Configuration Fixes Required
- ✅ **OpenAI API Key**: Copy working key from reference app
- ✅ **DEPLOYMENT_MODE**: Set to "web"
- ✅ **MCP Server Config**: Deploy jarvis-mcp-server.js
- ✅ **Claude Config**: Update .claude.json with MCP server configuration
- ✅ **Workspace Protocol**: Update CLAUDE.md voice protocol section

---

## 📖 COMPLETE MIGRATION PLAYBOOK

### Phase 1: Pre-Migration Assessment ✈️

#### Step 1.1: Check Current Voice System Status
```bash
# Test current voice generation (should work via bash)
fly ssh console -a APP_NAME -C "/Users/erezfern/Workspace/my-jarvis/tools/src/jarvis_voice.sh 'Test message'"

# Check MCP server existence
fly ssh console -a APP_NAME -C "ls -la /app/jarvis-mcp-server.js"

# Check .claude.json MCP configuration
fly ssh console -a APP_NAME -C "grep -A 10 'mcpServers' /home/node/.claude.json"
```

#### Step 1.2: Verify Critical Environment Variables
```bash
# Check OpenAI API key
fly secrets list -a APP_NAME | grep OPENAI_API_KEY

# Check deployment mode
fly secrets list -a APP_NAME | grep DEPLOYMENT_MODE

# Document current configuration
fly ssh console -a APP_NAME -C "env | grep -E '(OPENAI|DEPLOYMENT)'"
```

#### Step 1.3: Backup Current State
```bash
# Check volume data size (CRITICAL - must preserve)
fly ssh console -a APP_NAME -C "du -sh /home/node"

# Test current app functionality
curl https://APP_NAME.fly.dev/health

# Document current version
fly status -a APP_NAME
```

### Phase 2: Code and Infrastructure Deployment 🚀

#### Step 2.1: Deploy Latest Codebase
```bash
# Ensure latest code is committed and pushed
git add .
git commit -m "feat: MCP voice system migration for APP_NAME

🎤 MCP voice system migration
📱 Mobile file tree persistence fixes
🔒 Authentication middleware security update
🧠 Claude Agent SDK 2.0.42 with thinking support
🎨 Favicon and mobile UI fixes

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"

git push origin main

# Deploy with volume preservation
fly deploy -a APP_NAME --update-only

# Monitor deployment
fly logs -a APP_NAME
fly status -a APP_NAME
```

#### Step 2.2: Fix Critical Environment Variables
```bash
# Get working OpenAI API key from reference app (my-jarvis-erez)
WORKING_KEY=$(fly ssh console -a my-jarvis-erez -C "echo \$OPENAI_API_KEY")

# Set correct environment variables
fly secrets set \
  OPENAI_API_KEY="$WORKING_KEY" \
  DEPLOYMENT_MODE="web" \
  -a APP_NAME

# Verify secrets were set
fly secrets list -a APP_NAME
```

### Phase 3: MCP Server and Workspace Configuration 🏠

#### Step 3.1: Deploy MCP Server
```bash
# Verify MCP server was deployed with latest code
fly ssh console -a APP_NAME -C "ls -la /app/jarvis-mcp-server.js"

# Test MCP server functionality
fly ssh console -a APP_NAME -C "node /app/jarvis-mcp-server.js --test-voice"

# Check if workspace setup script needs to run
fly ssh console -a APP_NAME -C "ls -la /home/node/.claude.json | grep mcpServers"
```

#### Step 3.2: Update Claude Configuration (.claude.json)
```bash
# Check current MCP configuration
fly ssh console -a APP_NAME -C "cat /home/node/.claude.json"

# If mcpServers is empty, update it with working configuration
# Get reference configuration from working app
fly ssh console -a my-jarvis-erez -C "grep -A 15 'mcpServers' /home/node/.claude.json" > /tmp/mcp_config.json

# Apply the configuration (use proper JSON syntax)
fly ssh console -a APP_NAME -C "cat > /tmp/claude_update.json << 'EOF'
{
  \"mcpServers\": {
    \"jarvis-tools\": {
      \"command\": \"node\",
      \"args\": [\"./jarvis-mcp-server.js\"],
      \"env\": {
        \"OPENAI_API_KEY\": \"\${OPENAI_API_KEY}\",
        \"WORKSPACE_DIR\": \"\${WORKSPACE_DIR}\"
      }
    }
  }
}
EOF"

# Merge with existing configuration (backup first)
fly ssh console -a APP_NAME -C "cp /home/node/.claude.json /home/node/.claude.json.backup"
fly ssh console -a APP_NAME -C "jq '. + input' /home/node/.claude.json /tmp/claude_update.json > /tmp/merged.json && mv /tmp/merged.json /home/node/.claude.json"
```

#### Step 3.3: Update Workspace Protocol (CLAUDE.md)
```bash
# Check current CLAUDE.md voice protocol
fly ssh console -a APP_NAME -C "grep -A 10 -B 5 'voice\\|Voice\\|VOICE' /home/node/CLAUDE.md"

# Update voice protocol to use MCP tool
fly ssh console -a APP_NAME -C "sed -i 's|/Users/erezfern/Workspace/my-jarvis/tools/src/jarvis_voice.sh|mcp__jarvis-tools__voice_generate|g' /home/node/CLAUDE.md"

# Verify the update
fly ssh console -a APP_NAME -C "grep -A 5 -B 5 'mcp__jarvis-tools__voice_generate' /home/node/CLAUDE.md"
```

### Phase 4: Testing and Validation ✅

#### Step 4.1: Test Bash-Level Voice Generation
```bash
# Test direct voice generation
fly ssh console -a APP_NAME -C "/Users/erezfern/Workspace/my-jarvis/tools/src/jarvis_voice.sh 'MCP migration test - this is working'"

# Check voice file was created
fly ssh console -a APP_NAME -C "ls -la /home/node/tools/voice/ | tail -5"

# Test environment variables are accessible
fly ssh console -a APP_NAME -C "echo \$OPENAI_API_KEY | head -c 20"
fly ssh console -a APP_NAME -C "echo \$DEPLOYMENT_MODE"
```

#### Step 4.2: Test MCP Tool Integration
```bash
# Test MCP server availability
fly ssh console -a APP_NAME -C "node /app/jarvis-mcp-server.js --version"

# Verify Claude CLI can access MCP tools
fly ssh console -a APP_NAME -C "claude --version"

# Test MCP tool listing
fly ssh console -a APP_NAME -C "cd /home/node && claude --list-tools | grep voice"
```

#### Step 4.3: Authentication and Browser Testing
```bash
# Test authentication endpoints
curl https://APP_NAME.fly.dev/health

# Test unauthenticated redirect (should be 302 to login)
curl -I https://APP_NAME.fly.dev

# Test voice endpoint with authentication (should be 302 for unauthenticated)
curl -I https://APP_NAME.fly.dev/api/voice/test.mp3
```

#### Step 4.4: Volume Data Integrity Check
```bash
# Verify user data preserved (should match pre-upgrade size)
fly ssh console -a APP_NAME -C "du -sh /home/node"

# Check for data loss indicators
fly ssh console -a APP_NAME -C "find /home/node -name '*.md' -o -name '.claude' | wc -l"

# Verify chat history intact
fly ssh console -a APP_NAME -C "ls -la /home/node/.claude/projects/-workspace/*.jsonl | wc -l"
```

### Phase 5: Documentation and Completion 📝

#### Step 5.1: Update users.md Documentation
```markdown
## X. APP_NAME
- **URL**: https://APP_NAME.fly.dev
- **Version**: 1.35.0
- **Status**: ✅ Working (Authentication Required)
- **Architecture**: /home/node ✅
- **Features**: 📊 Excel Editing, 🎤 MCP Voice System, 📱 Mobile Optimized
- **Authentication**:
  - **Login URL**: https://www.myjarvis.io/login
  - **Email**: EMAIL@myjarvis.io
  - **Password**: PASSWORD
- **User Profile**: [USER_PROFILE_DESCRIPTION]
- **Notes**: MCP voice migration completed 2025-11-XX. Includes MCP voice system (bash → MCP tool), OpenAI API key fix, DEPLOYMENT_MODE configuration, mobile optimizations, and Claude Agent SDK 2.0.42. Volume data preserved. **Voice system fully operational**.
```

#### Step 5.2: Test End-to-End Functionality
1. **Login**: Test authentication through https://www.myjarvis.io/login
2. **Voice Generation**: Test voice messages in chat interface
3. **File Operations**: Test file tree and editing functionality
4. **Mobile**: Test on mobile browser for persistence fixes

---

## 🛡️ SAFETY PROTOCOLS

### Absolute Rules
1. **NEVER use `fly machine destroy`** - Volume data must be preserved
2. **NEVER delete apps** - User data is irreplaceable
3. **Always use `fly deploy --update-only`** for existing apps
4. **Backup .claude.json before modifications**
5. **Test voice generation before declaring success**
6. **Verify volume sizes before/after** to confirm no data loss

### Rollback Plan
```bash
# If MCP configuration fails
fly ssh console -a APP_NAME -C "cp /home/node/.claude.json.backup /home/node/.claude.json"

# If environment variables are wrong
fly secrets set OPENAI_API_KEY="PREVIOUS_KEY" DEPLOYMENT_MODE="PREVIOUS_MODE" -a APP_NAME

# If deployment fails (preserve volume)
fly deploy -a APP_NAME --update-only

# If voice generation fails
fly ssh console -a APP_NAME -C "rm /app/jarvis-mcp-server.js"
```

### Common Issues and Solutions
1. **"Usage:" in OpenAI Key**: Copy key from my-jarvis-erez
2. **Empty mcpServers{}**: Apply MCP configuration from reference app
3. **DEPLOYMENT_MODE wrong**: Set to "web"
4. **MCP server missing**: Redeploy latest codebase
5. **Voice files not accessible**: Check session authentication (known issue, not blocking)

---

## 🎯 SUCCESS CRITERIA

### ✅ Migration Complete When:
1. **Voice Generation**: Bash-level voice works (`jarvis_voice.sh "test"`)
2. **MCP Configuration**: .claude.json has proper mcpServers configuration
3. **Environment Variables**: OPENAI_API_KEY and DEPLOYMENT_MODE are correct
4. **MCP Server**: jarvis-mcp-server.js deployed and functional
5. **Protocol Update**: CLAUDE.md references MCP tool syntax
6. **Volume Preservation**: All user data intact (same size as pre-migration)
7. **Authentication**: Login works and app is accessible
8. **Documentation**: users.md updated with migration status

### Known Limitations
- **Browser Voice Playback**: Session authentication needs optimization for `/api/voice` endpoints
- **Session Management**: In-memory sessions may need persistence for heavy usage
- **File Serving**: Voice files accessible via bash but HTTP serving needs session fixes

---

**Priority**: High (Standardize all apps on MCP voice system)
**Risk Level**: Medium (Existing apps with valuable user data)
**Estimated Time**: 30-45 minutes per app following this playbook
**Dependencies**: Working reference app (my-jarvis-erez), latest codebase

**Created**: 2025-11-23
**Based On**: Successful my-jarvis-yaron upgrade
**Status**: Ready for Systematic Rollout

---

## 🔄 MIGRATION EXECUTION CHECKLIST

For each app migration:
- [ ] Phase 1: Pre-migration assessment
- [ ] Phase 2: Code and infrastructure deployment
- [ ] Phase 3: MCP server and workspace configuration
- [ ] Phase 4: Testing and validation
- [ ] Phase 5: Documentation and completion
- [ ] Update this ticket with completion status
- [ ] Move to next app in priority order

**Next Target**: my-jarvis-lilah (Version 1.34.2)