# Ticket 035: Voice Correction and Directory Code Setup

## Problem Statement
Voice messages are not working correctly in My Jarvis Desktop app due to Claude Code reading the wrong CLAUDE.md configuration and working directory issues.

## Current Issues

### 1. CLAUDE.md Configuration Conflict
- **Main CLAUDE.md**: Forces auto-play voice ("YOU MUST USE VOICE FOR EVERY INTERACTION - NON-NEGOTIABLE")
- **Project CLAUDE.md**: Desktop mode with no auto-play ("NO auto-play to avoid disrupting desktop workflow")
- **Current behavior**: Claude Code finds main CLAUDE.md and auto-plays voice incorrectly

### 2. Working Directory Problem
- **What worked**: When Claude Code ran from `/spaces/my-jarvis-desktop/projects/my-jarvis/` directory
- **Current behavior**: Claude Code runs from main jarvis directory
- **Impact**: Voice script generates files in wrong location, voice messages can't find audio files

## Working Solution (Previously Implemented)

### Local Setup Structure
```
spaces/my-jarvis-desktop/projects/my-jarvis/
├── CLAUDE.md                    # My Jarvis-specific config with desktop mode
├── tools/
│   ├── src/
│   │   └── jarvis_voice.sh      # Local voice script with desktop mode detection
│   └── voice/                   # Local audio file output directory
└── [my jarvis project files]
```

### Key Features That Worked
1. **Desktop Mode Detection**: Voice script checks `JARVIS_DESKTOP_MODE=true` and disables auto-play
2. **Local Audio Files**: Voice files generated in `tools/voice/` directory within my-jarvis project
3. **File Path Integration**: Voice messages received direct file paths to local MP3 files
4. **Self-contained**: All dependencies within my-jarvis project directory

## Analysis

### Why It Worked Before
1. Claude Code working directory was set to my-jarvis project (not my-jarvis-desktop)
2. My Jarvis CLAUDE.md found first in directory search
3. Local voice script generated files in accessible location within my-jarvis project
4. Voice messages could play files via direct file paths from my-jarvis tools/voice/ folder

### Dependencies & Risk Assessment
- **Low Risk**: Voice script uses absolute paths for external dependencies
- **Risk Areas**: Claude Code CLI assumptions about working directory
- **Mitigation**: Absolute paths should prevent most issues

## Proposed Solution

### Option 1: Fix Working Directory (Recommended)
1. **Backup current setup** before making changes
2. **Test carefully**: Change Claude Code working directory to my-jarvis project (not my-jarvis-desktop)
3. **Verify**: Voice messages work with local file paths from my-jarvis tools/voice/ folder
4. **Rollback plan**: Immediate revert if Claude Code breaks

### Option 2: Update Main CLAUDE.md
1. Add desktop mode detection to main CLAUDE.md
2. Update main voice script paths to work with desktop mode
3. Less risky but doesn't solve file path issues

## Technical Details

### My Jarvis Voice Script Features (`tools/src/jarvis_voice.sh`)
- Desktop mode detection prevents auto-play
- Local output directory: `tools/voice/` within my-jarvis project
- References my-jarvis specific configuration

### CLAUDE.md Differences
- **Main**: `/Users/erezfern/Workspace/jarvis/tools/src/jarvis_voice.sh --voice echo "[message]"` (auto-play)
- **My Jarvis**: `/Users/erezfern/Workspace/jarvis/spaces/my-jarvis-desktop/projects/my-jarvis/tools/src/jarvis_voice.sh --voice echo "[message]"` (desktop mode)

### File Path Flow That Worked
1. Voice script generates MP3 in my-jarvis `tools/voice/` directory
2. Script outputs file path to my-jarvis project location
3. Frontend receives path and plays file directly from my-jarvis folder
4. No HTTP serving required - direct file system access within my-jarvis project

## Success Criteria
- [ ] Voice messages display correctly without auto-play
- [ ] Voice files generate in correct local directory
- [ ] Claude Code remains stable and functional
- [ ] Easy rollback if issues occur

## Next Steps
1. Create backup of current working setup
2. Test changing Claude Code working directory to project folder
3. Verify voice functionality
4. Document results and any issues encountered

## Files to Monitor
- `/Users/erezfern/Workspace/jarvis/CLAUDE.md` (main config)
- `/Users/erezfern/Workspace/jarvis/spaces/my-jarvis-desktop/projects/my-jarvis/CLAUDE.md` (my-jarvis config)
- `/Users/erezfern/Workspace/jarvis/spaces/my-jarvis-desktop/projects/my-jarvis/tools/src/jarvis_voice.sh` (my-jarvis voice script)
- `/Users/erezfern/Workspace/jarvis/spaces/my-jarvis-desktop/projects/my-jarvis/tools/voice/` (voice output directory)

## Priority
High - Required for proper user experience in desktop app