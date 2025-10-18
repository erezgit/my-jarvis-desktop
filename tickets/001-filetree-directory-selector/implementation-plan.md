# Ticket 001: FileTree Directory Selector

## Overview
Add a settings option to switch FileTree display between `/workspace` and `/workspace/my-jarvis` directories without affecting Claude Code's execution context.

## Goals
- [ ] Add radio button selector in Settings > Workspace Directory (web mode only)
- [ ] Default to `/workspace/my-jarvis` for FileTree display
- [ ] Keep Claude Code initialization in `/workspace` (unchanged)
- [ ] Maintain separation between FileTree display and Claude execution context

## Implementation Details

### 1. Update Default Working Directory
**File**: `app/types/settings.ts`
- Change default from `/workspace` to `/workspace/my-jarvis` for web mode
- Line 46: Update `getDefaultWorkspace()` return value

### 2. Add Directory Selector UI
**File**: `app/components/settings/GeneralSettings.tsx`
- Replace "Change Workspace" button with radio button selector (web mode only)
- Two options:
  - Workspace → `/workspace`
  - My Jarvis → `/workspace/my-jarvis` (default)
- Pattern: Copy Interface Mode section structure (lines 124-204)
- Use FolderIcon for visual consistency

### 3. Conditional Rendering by Deployment Mode
**File**: `app/components/settings/GeneralSettings.tsx`
- Import `isWebMode` from `@/app/config/deployment`
- Show radio buttons only in web mode
- Keep native directory picker for Electron mode

## Technical Notes
- **FileTree Display**: Controlled by `workingDirectory` setting → flows through SettingsContext → DesktopLayout → VirtualizedFileTree
- **Claude Code Execution**: Controlled by `WORKSPACE_DIR` env var (`/workspace`) → handlers/chat.ts line 112 → SDK cwd parameter
- These are independent - changing FileTree display does NOT affect Claude's execution context

## Testing
- [ ] Settings shows radio buttons in web mode
- [ ] Default selection is "My Jarvis"
- [ ] Switching updates FileTree display immediately
- [ ] Claude Code still runs from `/workspace` (check file operations)
- [ ] Settings persist across page refresh

## Deployment
- [ ] Commit changes with descriptive message
- [ ] Push to remote
- [ ] Deploy to Fly.io for production testing
