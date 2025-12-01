# Ticket #077: New User Onboarding Template

**Created**: 2025-11-06
**Status**: ✅ Completed
**Type**: Enhancement - User Experience

## Overview

Complete overhaul of the new user onboarding experience for My Jarvis Desktop, creating a voice-first, user-agnostic template that enables personalized AI assistance from the first interaction.

## Problem Statement

The original template was hardcoded for Erez's specific projects (Berry Haven, Glassworks, etc.) and required users to manually set up their OpenAI API key before getting any voice interaction. New users had no guidance and the system assumed everyone was working on the same projects.

## Solution Implemented

### 1. Voice-First Experience
- **Onboarding API Key**: Added temporary OpenAI key to enable voice from first "Hi"
- **Automatic Setup**: `setup-new-app.sh` installs onboarding key during initialization
- **Smooth Transition**: Users replace temporary key with their own during onboarding

### 2. User-Agnostic Template
- **Clean CLAUDE.md**: Removed all user-specific content and procedures
- **Detection Logic**: System checks empty docs/tickets folders to identify new users
- **Guided Onboarding**: Comprehensive onboarding guide walks through entire setup

### 3. Template Structure
```
workspace-template/
├── CLAUDE.md                      # Clean configuration (no procedures)
├── tools/
│   ├── config/
│   │   └── .env.example          # Template only
│   ├── src/
│   │   └── jarvis_voice.sh      # Fixed paths using $WORKSPACE_ROOT
│   └── voice/                    # For audio files
└── my-jarvis/
    ├── docs/                     # Empty - fills during onboarding
    ├── tickets/                  # Empty - fills with tasks
    └── guides/
        ├── new-user-onboarding.md
        ├── pdf-text-extraction-guide.md
        └── presentation-creation-guide.md
```

## Key Files Modified

### 1. `/scripts/setup-new-app.sh`
- Removed hardcoded personal API keys
- Added onboarding API key for initial voice
- Removed Fly.io token (users don't need it)
- Fixed file ownership for node user

### 2. `/workspace-template/CLAUDE.md`
- Removed all procedures (moved to guides)
- Kept only core configuration
- Added initialization protocol
- Points to guides for detailed steps

### 3. `/workspace-template/my-jarvis/guides/new-user-onboarding.md`
- Complete onboarding process
- Starts with API key setup
- Profile creation questions
- First action suggestions

### 4. `/workspace-template/tools/src/jarvis_voice.sh`
- Fixed hardcoded paths
- Uses `$WORKSPACE_ROOT` variable
- Works in both Docker and local environments

## User Experience Flow

### First Time User Says "Hi"
1. **Detection**: Jarvis checks `/workspace/my-jarvis/docs/` → Empty
2. **Voice Greeting**: "Hi! I'm Jarvis, your AI assistant..." (works immediately)
3. **API Key Setup**: Asks for user's personal OpenAI key
4. **Introduction**: Gets to know user (name, profession, goals)
5. **Profile Creation**: Creates `user-profile.md`
6. **First Actions**: Suggests tickets, PDF extraction, presentations

### Returning User Says "Hi"
1. **Detection**: Finds existing `user-profile.md`
2. **Personalized Greeting**: "Hi [Name], continuing from..."
3. **Context Aware**: Checks recent tickets
4. **Next Steps**: Suggests logical continuation

## Technical Implementation

### API Key Strategy
```bash
# Local .env (not in Git)
OPENAI_API_KEY=<erez-personal-key>
OPENAI_API_KEY_ONBOARDING=<temporary-onboarding-key>

# setup-new-app.sh creates
/workspace/tools/config/.env with onboarding key

# User replaces during onboarding
OPENAI_API_KEY=<user-personal-key>
```

### Security Considerations
- Onboarding key is temporary, limited use
- Users provide their own key immediately
- No keys stored in Git repository
- .env files have 600 permissions

## Testing Checklist

- [x] Template has no user-specific content
- [x] CLAUDE.md is clean configuration only
- [x] Guides contain all procedures
- [x] setup-new-app.sh creates .env with onboarding key
- [x] No Fly.io token in user .env
- [x] jarvis_voice.sh uses relative paths
- [x] File ownership set to node:node
- [ ] Test with my-jarvis-liron instance

## Benefits

1. **Immediate Engagement**: Voice works from first interaction
2. **Personalized Experience**: Learns about each user individually
3. **Clear Guidance**: Step-by-step onboarding process
4. **Clean Separation**: Configuration vs procedures
5. **Scalable**: Works for any user, any use case

## Related Tickets

- **#075**: Node user permissions and Docker architecture
- **#063**: Knowledge base and presentation automation (user requirements)

## Deployment Instructions

1. **Create New App**:
   ```bash
   fly apps create my-jarvis-USERNAME
   fly deploy --app my-jarvis-USERNAME
   ```

2. **Initialize Workspace**:
   ```bash
   fly ssh console -a my-jarvis-USERNAME
   /app/scripts/setup-new-app.sh
   exit
   ```

3. **Access App**:
   - Navigate to: `https://my-jarvis-USERNAME.fly.dev`
   - User says "Hi" to start onboarding

## Lessons Learned

1. **Voice-First is Critical**: Users expect immediate interaction
2. **Templates Must Be Generic**: No assumptions about users
3. **Guides Over Config**: Procedures belong in guides, not CLAUDE.md
4. **Progressive Disclosure**: Learn about users gradually
5. **Path Independence**: Use variables, not hardcoded paths

## Next Steps

- Test with my-jarvis-liron instance
- Monitor onboarding success rate
- Gather user feedback
- Consider multi-language support
- Add more specialized guides

---

*This ticket documents the transformation from a personalized, text-first system to a universal, voice-first onboarding experience.*