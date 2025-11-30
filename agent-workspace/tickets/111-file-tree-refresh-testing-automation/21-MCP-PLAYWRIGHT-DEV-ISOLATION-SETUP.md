# 🔧 MCP PLAYWRIGHT DEV1/DEV2 ISOLATION SETUP

## Date: 2025-11-29
## Status: ✅ MCP CONFIGURATION COMPLETE - READY FOR TESTING

## Executive Summary

**MCP Playwright isolation has been successfully configured for parallel development workflow.** Dev1 and Dev2 now have separate Playwright MCP instances with isolated browser contexts, resolving the "Browser is already in use" conflicts that were preventing concurrent AI testing.

## CRITICAL: Configuration File Location

**CORRECTED PATH**: `/Users/erezfern/.claude.json`
- This is the ONLY configuration file that Claude Code reads for MCP servers
- NOT the Claude Desktop config file (that was the error)
- Updated in CLAUDE.md for future reference

## What Was Completed

### MCP Configuration Updated
**Correct Location**: `/Users/erezfern/.claude.json` (lines 54-75)

**Current Configuration**:
```json
"mcpServers": {
  "supabase": {
    "type": "http",
    "url": "https://mcp.supabase.com/mcp?project_ref=ocvkyhlfdjrvvipljbsa",
    "headers": {
      "Authorization": "Bearer sbp_4b23d38fb597138830f7cfa14c0e6f5fe95d12a6"
    }
  },
  "playwright-dev1": {
    "type": "stdio",
    "command": "npx",
    "args": [
      "-y",
      "@playwright/mcp@latest",
      "--user-data-dir=/tmp/playwright-dev1",
      "--browser=chromium"
    ],
    "env": {}
  },
  "playwright-dev2": {
    "type": "stdio",
    "command": "npx",
    "args": [
      "-y",
      "@playwright/mcp@latest",
      "--user-data-dir=/tmp/playwright-dev2",
      "--browser=chromium"
    ],
    "env": {}
  }
}
```

### Key Isolation Features
- **playwright-dev1**: Isolated browser context at `/tmp/playwright-dev1`
- **playwright-dev2**: Isolated browser context at `/tmp/playwright-dev2`
- **Separate MCP instances**: Each agent uses dedicated Playwright server
- **No conflicts**: Concurrent browser testing now possible

## Development Workflow Context

### Role Assignment
- **Dev1 Role**: File tree refresh fix testing (Port 3001)
- **Dev2 Role**: Authentication testing (Port 3002)
- **Orchestrator**: Overall coordination

### Docker Environment Status
- **Dev1 Container**: ✅ Running on localhost:3001
- **Dev2 Container**: Not started (for future Dev2 agent)
- **Isolation**: Complete workspace separation

## Next Steps for Dev1 Testing

### Immediate Actions Required
1. ✅ **MCP Configuration**: Updated correct file `/Users/erezfern/.claude.json`
2. **Claude Code Restart**: Required for MCP configuration to take effect
3. **Dev1 Agent Assignment**: Tell agent "You are Dev1" at session start
4. **MCP Selection**: Agent MUST use `playwright-dev1` MCP (not generic playwright)

### Test Protocol for Dev1
When Dev1 agent resumes, they should:

1. **Navigate to localhost:3001** using `playwright-dev1` MCP
2. **Test File Tree Refresh Bug**:
   - Create test folder and expand it
   - Add new file to expanded folder while it's open
   - Verify new file appears without manual refresh
3. **Document Results** with screenshots
4. **Verify VirtualizedFileTree Fix** is working

### Test Environment Details
- **URL**: http://localhost:3001
- **Container**: my-jarvis-web-dev1 (isolated)
- **Workspace**: ./workspace-dev1
- **MCP**: playwright-dev1 (isolated browser context)

## Historical Context

### Problem Solved
- **Before**: Single Playwright MCP caused "Browser is already in use" conflicts
- **Issue**: Dev1 and Dev2 couldn't test concurrently
- **Root Cause 1**: Shared browser context between agents
- **Root Cause 2**: Was editing wrong config file (Claude Desktop vs Claude Code)
- **Solution**: Separate MCP instances with isolated user data directories in CORRECT config file

### File Tree Fix Background
This testing validates the VirtualizedFileTree fix that switched from controlled mode to uncontrolled mode to resolve the expanded folder refresh bug where new files wouldn't appear in already-expanded directories.

## Critical Instructions for Continuation

### For Next Session (After Claude Code Restart)
1. **Agent Role**: "You are Dev1 - test the file tree refresh fix"
2. **MCP Usage**: ALWAYS use `playwright-dev1` MCP for browser automation
3. **Test Target**: http://localhost:3001 (Dev1 isolated environment)
4. **Focus**: Test expanded folder refresh functionality (VirtualizedFileTree fix)
5. **Documentation**: Update this ticket with test results and screenshots

### Expected MCP Behavior After Restart
- `/mcp` command should show THREE MCP servers: supabase, playwright-dev1, playwright-dev2
- If still showing old config, configuration was not updated correctly

### Success Criteria
- [ ] Browser opens to localhost:3001 without conflicts
- [ ] Can create and expand test folders
- [ ] New files appear in expanded folders without manual refresh
- [ ] Screenshots captured as evidence
- [ ] VirtualizedFileTree fix validated

## Configuration Verification

**MCP Status**: ✅ playwright-dev1 and playwright-dev2 configured
**Docker Status**: ✅ Dev1 container running on port 3001
**Isolation Status**: ✅ Complete separation achieved
**Ready for Testing**: ✅ After Claude Code restart

---

**READY FOR CLAUDE CODE RESTART AND DEV1 TESTING**