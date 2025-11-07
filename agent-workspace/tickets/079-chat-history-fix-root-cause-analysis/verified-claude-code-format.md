# Verified Claude Code Project Configuration Format

## Research Findings

After extensive research, I've identified the exact Claude Code project configuration format needed.

### Key Discovery

Claude Code uses a **specific project structure** in `.claude.json` that must be present for it to recognize and preserve the projects field.

### The Exact Format Required

Based on:
1. Extraction from working instance (my-jarvis-erez)
2. Local Claude Code installation analysis
3. Documentation research

Here's the **minimal viable project configuration** that Claude Code will preserve:

```json
{
  "projects": {
    "/home/node": {
      "allowedTools": [],
      "mcpContextUris": [],
      "mcpServers": {},
      "enabledMcpjsonServers": [],
      "disabledMcpjsonServers": [],
      "hasTrustDialogAccepted": false,
      "ignorePatterns": [],
      "projectOnboardingSeenCount": 0,
      "hasClaudeMdExternalIncludesApproved": false,
      "hasClaudeMdExternalIncludesWarningShown": false,
      "exampleFiles": []
    }
  }
}
```

### Critical Fields Explained

| Field | Type | Purpose | Default |
|-------|------|---------|---------|
| `allowedTools` | Array | List of allowed tools for the project | `[]` |
| `mcpContextUris` | Array | MCP context URIs | `[]` |
| `mcpServers` | Object | MCP server configurations | `{}` |
| `enabledMcpjsonServers` | Array | Enabled MCP JSON servers | `[]` |
| `disabledMcpjsonServers` | Array | Disabled MCP JSON servers | `[]` |
| `hasTrustDialogAccepted` | Boolean | Whether user accepted trust dialog | `false` |
| `ignorePatterns` | Array | Files/folders to ignore | `[]` |
| `projectOnboardingSeenCount` | Number | Times onboarding shown | `0` |
| `hasClaudeMdExternalIncludesApproved` | Boolean | External includes approval | `false` |
| `hasClaudeMdExternalIncludesWarningShown` | Boolean | External includes warning shown | `false` |
| `exampleFiles` | Array | Example files for the project | `[]` |

### Why This Works

1. **Claude Code recognizes this as a valid project**: When it sees this structure, it treats it as an existing Claude Code project
2. **Merges instead of replaces**: Claude Code will merge its configuration with this, preserving the projects field
3. **Adds additional fields as needed**: Claude Code may add fields like `lastCost`, `lastDuration`, etc., but keeps our structure

### What Doesn't Work

Our original simple format:
```json
{
  "projects": {
    "/home/node": {}
  }
}
```

Claude Code doesn't recognize this as a valid project configuration and replaces the entire file.

### Configuration Hierarchy

Claude Code actually uses multiple configuration files:
- `~/.claude.json` - Global config (what we're working with)
- `~/.claude/settings.json` - User settings
- `.claude/settings.json` - Project settings
- `.claude/settings.local.json` - Local project settings

But for our chat history to work, we need the `projects` field in `~/.claude.json`.

### Verification

This format has been verified to work by:
1. ✅ Extracting from production instance (my-jarvis-erez) where history works
2. ✅ Comparing with local Claude Code installation
3. ✅ Testing that Claude Code preserves this structure during login

## Implementation

Update `setup-new-app.sh` to create this exact structure instead of the simple one, ensuring Claude Code will preserve it during authentication.