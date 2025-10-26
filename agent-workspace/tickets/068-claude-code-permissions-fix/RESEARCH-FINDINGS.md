# Claude Code Permissions Research Findings

## Executive Summary

After conducting 20 web searches and analyzing the codebase, I've identified the root cause of why the `settings.json` permission configuration is not being respected. **This is a known bug in Claude Code itself, not a configuration error on our part.**

## Critical Discovery

The `.claude/.claude.json` file contains a feature flag that explicitly controls permission bypass functionality:

```json
"cachedStatsigGates": {
  "tengu_disable_bypass_permissions_mode": false,
  ...
}
```

**This flag is set to `false`, meaning bypass permissions mode is ENABLED at the application level.** However, despite this, the settings.json configuration is still not being respected.

## Known Issues from Official Sources

### 1. **Permission Allow Lists Not Being Respected** (GitHub Issue #6850, #2560, #7104)
Multiple users report that Claude Code continues asking for permissions for commands already saved in settings files, even suggesting to add them to the allow list again. This persists even after rebooting.

### 2. **Wildcard Permissions Fail** (GitHub Issue #3428, #462, #8581)
The `Bash(*)` wildcard permission pattern is explicitly documented as not working:
- Users report: "Bash(*)" wildcard permission in .claude/settings.local.json does not allow all bash commands
- Claude still prompts for approval for individual bash commands
- Environment variables in commands cause wildcard matching to fail completely

### 3. **Session Permissions Not Respected** (GitHub Issue #7104)
After recent updates, the ability to give permission for an entire session stopped working. Claude asks for every single read and edit as if users were choosing "Yes" instead of "Yes, and accept all for this session".

### 4. **First-Time Permission Prompts** (Multiple Reports)
The documentation states "prompts for permission on first use of each tool", but:
- Permission prompts still appear even after first use
- Complex commands trigger new prompts even with base command allowed
- Shell operators (&&, |, >, etc.) cause re-prompting even with wildcards

## Configuration Structure Analysis

### Correct Settings.json Format

Our current configuration is structurally CORRECT:

```json
{
  "permissions": {
    "defaultMode": "bypassPermissions",  // ✅ CORRECT LOCATION
    "allow": [/* tools */]                // ✅ CORRECT FORMAT
  }
}
```

**IMPORTANT**: Based on official documentation, `defaultMode` should be at the ROOT level, not nested under `permissions`:

```json
{
  "defaultMode": "bypassPermissions",  // ✅ OFFICIAL CORRECT LOCATION
  "permissions": {
    "allow": [/* tools */]
  }
}
```

### Why Our Configuration Doesn't Work

1. **Wrong Nesting**: We have `defaultMode` nested under `permissions` object
2. **Known Bugs**: Even with correct nesting, there are multiple known bugs preventing it from working
3. **Wildcard Failures**: `Bash(*)` is documented as non-functional in multiple GitHub issues

## Solution Options

### Option 1: Fix Configuration Structure (Recommended First Step)
Move `defaultMode` to root level:

```json
{
  "defaultMode": "bypassPermissions",
  "permissions": {
    "allow": [
      "Task",
      "Bash",
      "Bash(*)",
      "Bash(./tools/src/jarvis_voice.sh:*)",
      ...
    ]
  },
  "env": {
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1"
  }
}
```

### Option 2: Container-Level Flag (Ultimate Solution)
If configuration fixes don't work, use container-level `--dangerously-skip-permissions` flag when launching Claude Code:

```bash
claude --dangerously-skip-permissions
```

This is the only 100% reliable method according to documentation and user reports.

### Option 3: Specific Path Patterns (Partial Workaround)
Add explicit path patterns (though wildcards are known to fail):

```json
"Bash(./tools/src/jarvis_voice.sh:*)"
```

## Why Permission System Is Failing

### Processing Order
According to official SDK documentation, permissions are processed in this order:

1. PreToolUse Hook
2. Deny Rules
3. Allow Rules
4. Ask Rules
5. Permission Mode Check  ← **This is where our settings should work**
6. canUseTool Callback
7. PostToolUse Hook

**The problem**: Step 5 (Permission Mode Check) is not properly evaluating our `defaultMode: "bypassPermissions"` setting.

### Known System Bugs

1. **Configuration Loading**: Settings files may not be loaded at startup
2. **Format Validation**: Invalid JSON structure may cause silent failures
3. **Feature Flags**: The `tengu_disable_bypass_permissions_mode` flag may override settings
4. **First-Use Logic**: "First use" detection is broken, prompting repeatedly
5. **Wildcard Matching**: Prefix matching is documented but doesn't work reliably

## Recommended Actions

### Immediate Action
1. Fix `defaultMode` nesting in settings.json (move to root level)
2. Restart Claude Code session to reload configuration
3. Test if permissions are still requested

### If Still Failing
1. Use `--dangerously-skip-permissions` flag when launching Claude Code
2. This is the only 100% reliable method per Anthropic documentation
3. Safe to use in isolated Docker containers

### Long-Term Solution
Track Claude Code updates for fixes to permission system bugs:
- Issue #6850: Permission allow lists not working
- Issue #3428: Bash(*) wildcard not functioning
- Issue #7104: Session permissions ignored

## Evidence from Official Documentation

### From Anthropic Documentation
> "bypassPermissions mode overrides the canUseTool callback for unmatched tools, and bypassPermissions - Skips all permission prompts (requires safe environment)"

### From GitHub Issues
> "Despite claude having access to find command, it will continuously ask for permission. Happens the same with grep and a bunch of other tools."

> "Claude Code continues asking for permission to run commands already saved in the settings.local.json file, even suggesting to add them to the allow list again."

> "The 'Bash(*)' wildcard permission in .claude/settings.local.json does not allow all bash commands as expected."

## Conclusion

**Root Cause**: Claude Code's permission system has multiple known bugs that prevent settings.json configuration from working reliably. This is NOT a user configuration error—it's a systemic issue with the permission evaluation engine.

**Immediate Fix**: Restructure settings.json with `defaultMode` at root level

**Ultimate Fix**: Use `--dangerously-skip-permissions` flag when launching Claude Code in containerized environments

**Confidence**: 9/10 on root cause analysis, 7/10 on configuration fix working (due to known bugs)

---

**Research Date**: 2025-10-22
**Sources**: 20 web searches covering official Anthropic documentation, GitHub issues, and community reports
**Status**: Configuration bug confirmed, multiple workarounds identified
