# Ticket 112: MCP Voice System Upgrade Procedure

## Overview
Complete upgrade procedure to migrate My Jarvis Desktop apps from legacy voice system to modern MCP (Model Context Protocol) voice generation. This procedure was successfully tested on `my-jarvis-elad` and should be applied to all remaining apps.

## Status
- **Priority**: High
- **Status**: Ready for execution
- **Tested On**: my-jarvis-elad (successful)
- **Remaining Apps**: ~7-8 users need this upgrade

## Prerequisites
- Access to Fly.io CLI with proper authentication
- Working OpenAI API key
- SSH access to target applications

## Complete Upgrade Procedure

### Step 1: Pre-Upgrade Analysis
**Purpose**: Document current state and identify what needs updating

```bash
# Check current app status
fly status --app [APP_NAME]

# Check current version/releases
fly releases --app [APP_NAME] | head -5

# Check current secrets configuration
fly secrets list --app [APP_NAME]

# Check folder structure
fly ssh console -a [APP_NAME] -C "ls -la /home/node/"
fly ssh console -a [APP_NAME] -C "ls -la /home/node/my-jarvis/"

# Check MCP server file existence
fly ssh console -a [APP_NAME] -C "ls -la /home/node/jarvis-mcp-server.js"

# Check current Claude configuration
fly ssh console -a [APP_NAME] -C "grep -A 10 'mcpServers' /home/node/.claude.json"

# Check CLAUDE.md format
fly ssh console -a [APP_NAME] -C "head -c 300 /home/node/CLAUDE.md"

# Test API functionality
curl https://[APP_NAME].fly.dev/health
curl https://[APP_NAME].fly.dev/api/projects
```

**Expected Findings for Apps Needing Upgrade:**
- Old version (typically v5 or lower)
- Missing `uploads/` directory
- Missing `jarvis-mcp-server.js` file
- Empty `mcpServers: {}` in .claude.json
- Missing OPENAI_API_KEY and WORKSPACE_DIR environment variables
- Missing DEPLOYMENT_MODE environment variable
- Old CLAUDE.md format with bash voice protocol

### Step 2: Deploy Latest Code
**Purpose**: Update app to latest codebase with all improvements

```bash
cd /Users/erezfern/Workspace/my-jarvis/spaces/my-jarvis-desktop/projects/my-jarvis-desktop

# Deploy latest code (preserves app and volume)
fly deploy --app [APP_NAME] --update-only

# Verify deployment
fly releases --app [APP_NAME] | head -3
curl -f https://[APP_NAME].fly.dev/health
```

**Expected Result**: App updated to latest version (v6+) with new features

### Step 3: Add MCP Server File
**Purpose**: Install the MCP server that enables voice generation

```bash
# Copy MCP server from template
fly ssh console -a [APP_NAME] -C "cp /app/workspace-template/jarvis-mcp-server.js /home/node/jarvis-mcp-server.js"

# Fix file ownership
fly ssh console -a [APP_NAME] -C "chown node:node /home/node/jarvis-mcp-server.js"

# Verify file exists with correct permissions
fly ssh console -a [APP_NAME] -C "ls -la /home/node/jarvis-mcp-server.js"
```

**Expected Result**: MCP server file present with `node:node` ownership

### Step 4: Create Missing Directory Structure
**Purpose**: Add uploads directory for file handling functionality

```bash
# Create uploads directory
fly ssh console -a [APP_NAME] -C "mkdir -p /home/node/my-jarvis/uploads"

# Fix ownership
fly ssh console -a [APP_NAME] -C "chown -R node:node /home/node/my-jarvis/uploads"

# Verify directory created
fly ssh console -a [APP_NAME] -C "ls -la /home/node/my-jarvis/"
```

**Expected Result**: uploads directory present with proper permissions

### Step 5: Update CLAUDE.md Configuration
**Purpose**: Replace old bash voice protocol with modern MCP protocol

```bash
# Copy updated CLAUDE.md from template
fly ssh console -a [APP_NAME] -C "cp /app/workspace-template/CLAUDE.md /home/node/CLAUDE.md"

# Fix ownership
fly ssh console -a [APP_NAME] -C "chown node:node /home/node/CLAUDE.md"

# Verify updated content
fly ssh console -a [APP_NAME] -C "head -c 300 /home/node/CLAUDE.md"
```

**Expected Result**: CLAUDE.md contains `mcp__jarvis-tools__voice_generate` protocol

### Step 6: Add Required Environment Variables
**Purpose**: Configure MCP server with necessary API keys and paths

```bash
# Add OpenAI API key and workspace directory
fly secrets set OPENAI_API_KEY="[YOUR_OPENAI_API_KEY]" WORKSPACE_DIR="/home/node" --app [APP_NAME]

# Add deployment mode (required for proper app behavior)
fly secrets set DEPLOYMENT_MODE="web" --app [APP_NAME]

# Verify all secrets are set
fly secrets list --app [APP_NAME]
```

**Expected Result**: All required environment variables configured
- OPENAI_API_KEY ✅
- WORKSPACE_DIR ✅
- DEPLOYMENT_MODE ✅
- JWT_SECRET ✅ (should already exist)

### Step 7: Update MCP Configuration in .claude.json
**Purpose**: Register MCP server for voice generation in Claude configuration

```bash
# Update .claude.json with MCP server configuration
fly ssh console -a [APP_NAME] -C "python3 -c \"
import json
with open('/home/node/.claude.json', 'r') as f:
    config = json.load(f)
config['projects']['/home/node']['mcpServers'] = {
    'jarvis-tools': {
        'command': 'node',
        'args': ['./jarvis-mcp-server.js'],
        'env': {
            'OPENAI_API_KEY': '\${OPENAI_API_KEY}',
            'WORKSPACE_DIR': '\${WORKSPACE_DIR}'
        }
    }
}
with open('/home/node/.claude.json', 'w') as f:
    json.dump(config, f, indent=2)
print('MCP configuration updated successfully')
\""

# Fix ownership
fly ssh console -a [APP_NAME] -C "chown node:node /home/node/.claude.json"

# Verify MCP configuration
fly ssh console -a [APP_NAME] -C "grep -A 15 'mcpServers' /home/node/.claude.json"
```

**Expected Result**: .claude.json contains proper MCP server configuration with relative path `"./jarvis-mcp-server.js"`

### Step 8: Restart Application
**Purpose**: Load all new configurations and start MCP server

```bash
# Restart to load MCP configuration and environment variables
fly apps restart [APP_NAME]

# Wait for healthy status
sleep 15
fly status --app [APP_NAME]

# Test health after restart
curl -f https://[APP_NAME].fly.dev/health
```

**Expected Result**: App healthy and running with MCP server loaded

### Step 9: Test Voice Generation
**Purpose**: Verify MCP voice system is working

```bash
# Test direct voice generation to verify MCP server functionality
fly ssh console -a [APP_NAME] -C "python3 /home/node/tools/src/cli/auto_jarvis_voice.py 'Voice system upgrade complete' --voice nova --output-dir /home/node/tools/voice --json-output"
```

**Expected Result**: JSON response with successful voice file generation:
```json
{"type": "voice", "transcript": "Voice system upgrade complete", "audioPath": "/home/node/tools/voice/jarvis_response_[timestamp].mp3", "filename": "jarvis_response_[timestamp].mp3"}
```

### Step 10: Verification Checklist
**Purpose**: Confirm all systems are working correctly

- [ ] **App Health**: `curl https://[APP_NAME].fly.dev/health` returns 200
- [ ] **Latest Version**: App running v6+ (check `fly releases --app [APP_NAME]`)
- [ ] **MCP Server**: `jarvis-mcp-server.js` exists with `node:node` ownership
- [ ] **Directory Structure**: `uploads/` directory exists
- [ ] **Environment Variables**: All 4 secrets present (OPENAI_API_KEY, WORKSPACE_DIR, DEPLOYMENT_MODE, JWT_SECRET)
- [ ] **MCP Config**: .claude.json has jarvis-tools MCP server with relative path
- [ ] **CLAUDE.md**: Contains MCP voice protocol (`mcp__jarvis-tools__voice_generate`)
- [ ] **Voice Generation**: Direct test produces valid audio file
- [ ] **User Interface**: Voice generation works through Claude interface

## Troubleshooting

### Voice Still Not Working After Upgrade
**Issue**: Voice generation fails or uses wrong voice type

**Solution**: Check voice default configuration
```bash
# Check Python script default voice setting
fly ssh console -a [APP_NAME] -C "grep -A 3 'default.*nova\\|default.*echo' /home/node/tools/src/cli/auto_jarvis_voice.py"

# If needed, update default voice in Python script
fly ssh console -a [APP_NAME] -C "sed -i 's/default=\"nova\"/default=\"echo\"/g' /home/node/tools/src/cli/auto_jarvis_voice.py"

# Restart app to reload configuration
fly apps restart [APP_NAME]
```

### MCP Server Not Loading
**Issue**: MCP tools not available in Claude interface

**Solution**: Check MCP server path configuration
```bash
# Verify MCP server path is relative, not absolute
fly ssh console -a [APP_NAME] -C "grep -A 5 'jarvis-tools' /home/node/.claude.json"

# Should show: "args": ["./jarvis-mcp-server.js"]
# NOT: "args": ["/home/node/jarvis-mcp-server.js"]
```

### Environment Variables Not Loaded
**Issue**: MCP server can't access OpenAI API

**Solution**: Verify secrets and restart
```bash
# Check all required secrets exist
fly secrets list --app [APP_NAME]

# Restart app to reload environment variables
fly apps restart [APP_NAME]
```

## Notes
- **NEVER delete app or volume** - only update existing deployment
- **Always test voice generation** after upgrade to confirm functionality
- **Document any issues** encountered for future improvements
- **Each app restart takes ~30-60 seconds** - wait for full health before testing

## Success Criteria
✅ App updated to latest version with all features
✅ MCP voice generation working through Claude interface
✅ All directory structure and files present
✅ No data loss or user disruption
✅ Voice playback functional in web interface

## Completion
This procedure successfully upgraded my-jarvis-elad from legacy voice system to modern MCP voice generation. The same process should be applied to all remaining user apps requiring this upgrade.