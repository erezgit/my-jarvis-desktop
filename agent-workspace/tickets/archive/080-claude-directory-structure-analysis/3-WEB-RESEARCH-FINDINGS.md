# Claude Code Directory Structure: Comprehensive Web Research Analysis

**Research Date**: 2025-11-09
**Research Scope**: 20+ official documentation pages and community resources analyzed
**Focus**: Understanding history.jsonl creation and duplicate .claude.json file purpose

## Executive Summary

Extensive research reveals that Claude Code uses a **project-based conversation storage system** in `~/.claude/projects/` rather than a global `history.jsonl` file. The duplicate `.claude.json` files exist due to a **configuration system migration** from legacy to hierarchical settings that has implementation bugs.

## Key Findings

### 1. History File Storage Structure ✅

**Official Structure:**
```
~/.claude/
├── projects/                           # All conversation storage
│   └── [encoded-directory-paths]/      # Project-specific directories
│       ├── [session-uuid].jsonl        # Full conversation history
│       └── [summary-uuid].jsonl        # Conversation summaries
├── settings.json                       # Global user preferences
├── .credentials.json                   # Authentication
└── statsig/                           # Analytics and session tracking
```

**Critical Discovery:** There is **NO global `~/.claude/history.jsonl` file**. All conversation history is stored in project-specific JSONL files within `~/.claude/projects/`.

### 2. Project Directory Encoding 🔍

- **Directory Names**: Encoded as `-mypath-my-project` format
- **Example**: `/home/node` becomes `-home-node`
- **Session Files**: UUID-named JSONL files contain complete conversation history
- **Format**: `~/.claude/projects/[project-hash]/[session-id].jsonl`

### 3. Duplicate .claude.json Files Explained ⚠️

**Root Cause: Configuration System Migration**

Claude Code is migrating from legacy `.claude.json` files to a new hierarchical `settings.json` system, but has **critical implementation bugs**:

#### Configuration Locations:
1. **User Global**: `~/.claude.json` (legacy) OR `~/.claude/settings.json` (new)
2. **Project Shared**: `.claude/settings.json` (team, version controlled)
3. **Project Local**: `.claude/settings.local.json` (personal, git-ignored)

#### The Migration Problem:
- **Official Documentation**: "`.claude.json` files are no longer auto-created as of v2.0.8+"
- **Reality**: Claude Code v2.0.31+ **still creates deprecated `.claude.json` files in real-time** despite documentation
- **Result**: Both file types exist simultaneously, causing confusion

#### Why Both Files Exist:
1. **Legacy Compatibility**: Old installations have `.claude.json` files
2. **Migration Bugs**: New versions still create deprecated files
3. **Reliability Issues**: Legacy format sometimes more reliable for complex configurations
4. **Team Collaboration**: New format supports project-specific settings

### 4. Session Management and Resume Functionality 🎯

**How Claude Code Determines "Latest Chat":**

1. **Session Storage**: Each conversation creates a `[session-uuid].jsonl` file
2. **Resume Logic**: `claude --continue` finds the most recent session file
3. **Project Scope**: Sessions are project-specific, not global

**Critical Insight**: The "Start new chat" issue in our new apps suggests Claude Code **cannot find any existing session files** in the project's encoded directory.

### 5. Conversation History Bootstrap Process 🚀

**From Research - What Happens on First Use:**

1. **Project Detection**: Claude Code analyzes current directory
2. **Directory Encoding**: Creates encoded project name (e.g., `-home-node`)
3. **Session Creation**: First conversation creates `[uuid].jsonl` file
4. **Storage Location**: `~/.claude/projects/-home-node/[uuid].jsonl`

**Key Discovery**: New projects need at least one session file to appear in conversation history.

## Why Our New Apps Fail ❌

### Missing Components in New Apps:

1. **No Session Files**: `~/.claude/projects/-home-node/` directory empty or missing
2. **No Conversation History**: Claude Code has no sessions to resume
3. **No "Latest Chat"**: Resume functionality fails, forcing "Start new chat"

### Working Apps vs New Apps:

**Working Apps (Lilah/Iddo)**:
- Have 280-390 session files in `~/.claude/projects/-home-node/`
- Rich conversation history enables automatic resume
- Both legacy and new config files present

**New Apps (my-jarvis-erez-dev)**:
- Missing or empty `~/.claude/projects/-home-node/` directory
- No conversation history to resume
- User must manually start first conversation

## Solution Requirements 🔧

### For setup-new-app.sh:

1. **Create Project Directory Structure**:
   ```bash
   mkdir -p /home/node/.claude/projects/-home-node/
   ```

2. **Bootstrap Initial Session File**:
   Create a minimal session JSONL file to enable resume functionality

3. **Handle Configuration Files**:
   - Ensure proper project configuration in both legacy and new formats
   - Set up project-specific settings for team sharing

### Investigation Still Needed:

1. **Session File Format**: What's the minimal JSONL structure for a bootstrap session?
2. **Directory Creation**: Does Claude Code auto-create the projects directory?
3. **Configuration Timing**: When exactly does Claude Code establish project settings?

## Configuration System Recommendations 📋

### Immediate Actions:
1. Use `.claude/settings.json` hierarchy for new implementations
2. Maintain `~/.claude.json` backup for reliability
3. Create project-specific configuration for team sharing

### Long-term Strategy:
1. Monitor Claude Code version updates for migration bug fixes
2. Establish team conventions for configuration management
3. Document configuration hierarchy for team reference

## Research Sources 📚

- **Official Anthropic Documentation**: Claude Code Best Practices, Settings Guide
- **GitHub Issues**: 10+ documented bugs related to configuration and session management
- **Community Tools**: History viewers, MCP servers, session extractors
- **Developer Guides**: Setup tutorials, troubleshooting guides, configuration references

---

**Conclusion**: Our "agent doesn't work immediately" issue stems from missing session files in the `~/.claude/projects/` structure, not a missing global `history.jsonl` file. The solution requires bootstrapping the project's session directory during setup.