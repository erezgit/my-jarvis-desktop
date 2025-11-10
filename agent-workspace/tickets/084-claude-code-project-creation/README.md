# Ticket #084: Claude Code Project Creation Investigation

## Issue Summary
During deployment testing of `my-jarvis-erez-dev`, we discovered that the `.claude.json` file is created but **without the required `projects` object** containing `/home/node` as a project. This prevents the WebUI chat history API from working correctly.

## Background
We created a new app deployment process with an automated Claude config patcher (`patch-claude-config.sh`) that should add the projects object after Claude Code initializes. However, the patch script approach wasn't working reliably due to timing issues.

## Key Investigation Questions
**Question**: Can Claude Code SDK programmatically create projects during initialization?
**Answer**: **NO** - The SDK only provides runtime execution options, not project configuration capabilities.

**Question**: How are projects normally created in Claude Code?
**Answer**: Projects are automatically added to `.claude.json` when Claude CLI runs **interactively** in a directory for the first time.

## Critical Discovery: SDK vs CLI Behavior Difference

### Claude Code SDK (What WebUI Uses)
- Designed for programmatic use
- May not create projects automatically in `.claude.json`
- Only creates minimal config for runtime execution
- Used by our WebUI server: `lib/claude-webui-server/handlers/chat.ts`

### Claude Code CLI (Interactive Command)
- Creates projects automatically when run interactively
- Adds current directory as project during user sessions
- Example: Running `claude --print "test"` in a directory adds it as a project

## Current Deployment Status
- ✅ App created: `my-jarvis-erez-dev`
- ✅ Docker deployment successful
- ✅ WebUI server running in `/home/node`
- ❌ Projects object missing from `.claude.json`
- ❌ Chat history API not working

## Analysis of Current Approach
We ARE running Claude in the correct directory (`/home/node`), but:
1. **SDK execution** (WebUI) ≠ **CLI execution** (interactive)
2. SDK may not trigger the same project creation logic as CLI
3. Our patch script timing approach was overly complex

## Proposed Solution
Force an **interactive Claude CLI run** in `/home/node` during setup to trigger project creation:

```bash
# In setup-new-app.sh, add:
cd /home/node
claude --print "Initializing project" --dangerously-skip-permissions
```

This should create the projects object that the SDK will then use.

## Files Investigated
- `/lib/claude-webui-server/handlers/chat.ts` - SDK execution
- `/scripts/setup-new-app.sh` - Current setup process
- `/scripts/patch-claude-config.sh` - Complex patch attempt
- `node_modules/@anthropic-ai/claude-code/sdk.d.ts` - SDK options analysis

## Next Steps
1. Test the CLI-first approach in setup script
2. Remove complex patch script if CLI approach works
3. Update deployment documentation
4. Test with new app deployment

## Status
- **Priority**: High
- **Status**: Research complete, solution identified
- **Assignee**: To be addressed in future session
- **Created**: 2025-11-10

## Related Files
- `agent-workspace/docs/deployment.md`
- `scripts/setup-new-app.sh`
- `scripts/patch-claude-config.sh`