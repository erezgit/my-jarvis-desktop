# Ticket 068: Claude Code Permissions Fix

## Status
🔄 **IN PROGRESS** - Configuration structure corrected, awaiting testing

## Problem
Claude Code was continuously prompting for permission approvals on every command (Bash, voice generation, etc.), disrupting workflow automation.

## Root Causes Identified

### 1. Wrong Directory Location (FIXED)
Settings file was created in wrong directory location:
- **Incorrect**: `/workspace/my-jarvis/.claude/settings.json`
- **Correct**: `/workspace/.claude/settings.json`

### 2. Incorrect JSON Structure (FIXED)
After deep research (20 web searches + codebase analysis), discovered second issue:
- **Incorrect**: `defaultMode` nested under `permissions` object
- **Correct**: `defaultMode` at root level of JSON

## Solutions Implemented

### Phase 1: Directory Fix (2025-10-22)
```bash
cp /workspace/my-jarvis/.claude/settings.json /workspace/.claude/settings.json
rm -rf /workspace/my-jarvis/.claude
```

### Phase 2: JSON Structure Fix (2025-10-22)
Moved `defaultMode` to root level per official Anthropic documentation:

**Before (Incorrect):**
```json
{
  "permissions": {
    "defaultMode": "bypassPermissions",  // ❌ Wrong location
    "allow": [...]
  }
}
```

**After (Correct):**
```json
{
  "defaultMode": "bypassPermissions",  // ✅ Correct location
  "permissions": {
    "allow": [...]
  }
}
```

## Configuration Details
Settings use `bypassPermissions` mode with full tool whitelist:
- All Bash commands auto-approved (including wildcards)
- All file operations (Read/Write/Edit) auto-approved
- All web tools (WebFetch/WebSearch) auto-approved
- Voice generation tools auto-approved (specific path pattern added)

## Known Claude Code Bugs

Research uncovered multiple **known bugs** in Claude Code's permission system:

1. **Wildcard Failures**: `Bash(*)` documented as non-functional (GitHub #3428, #462)
2. **Allow Lists Ignored**: Settings not respected even when correct (GitHub #6850, #2560)
3. **Session Permissions**: "Allow for session" stopped working (GitHub #7104)
4. **First-Use Prompts**: Continues prompting after first approval

See `RESEARCH-FINDINGS.md` for comprehensive analysis of these bugs.

## Testing Plan
1. ✅ Configuration structure corrected
2. ⏳ User testing: Test voice commands and bash operations
3. ⏳ Verify permission prompts eliminated
4. 🔄 If prompts persist → Implement Option 2

## Backup Solution (Option 2)
If configuration fix doesn't work due to Claude Code bugs, use container-level flag:
```bash
claude --dangerously-skip-permissions
```

This is documented as the only 100% reliable method to bypass all permissions.

## Files
- `summary.md` - This file
- `PERMISSIONS-SOLUTION.md` - Initial technical analysis
- `RESEARCH-FINDINGS.md` - Comprehensive research on Claude Code permission bugs (20 web searches)

---

**Created**: 2025-10-22
**Updated**: 2025-10-22
**Status**: Configuration fixed, awaiting user testing
**Confidence**: 7/10 (correct structure but known bugs may still cause issues)
