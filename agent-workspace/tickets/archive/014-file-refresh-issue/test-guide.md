# Testing Guide - File Refresh System

## Quick Test Steps

### 1. File Tree Testing
- **Click the folder name** at the top to select a new directory
- **Click folders** to expand/collapse - should load fresh content each time
- **Click files** to view - should always show latest content
- **No errors** should appear in the file tree area

### 2. Terminal Testing
- **Type `claude` in terminal** - should work without black screen
- **Exit with Ctrl+D** - terminal should clean up properly
- **Resize window** - terminal should adjust size correctly
- **Switch between tabs** - both terminals should work

### 3. Performance Testing
- **Navigate to large directories** (like node_modules if visible)
- **No lag or freezing** when clicking folders
- **No "too many files open" errors**
- **No permission errors** on system folders

## What's Different Now

### Before (File Watching)
- 🔴 Watched entire home directory recursively
- 🔴 Hit file descriptor limits (256-2048 max)
- 🔴 Permission errors on system folders
- 🔴 System resource exhaustion

### After (Click-to-Refresh)
- ✅ Only reads files when clicked
- ✅ No background watching
- ✅ No file descriptor usage
- ✅ Always shows current data
- ✅ Works with any directory size

## Expected Behavior

1. **File Tree**
   - Loads home directory on start
   - Click folder → expands and shows contents
   - Click again → collapses
   - Click file → shows preview (if preview is implemented)
   - Each click fetches fresh data

2. **Terminals**
   - Work with Claude Code and other TUI apps
   - Proper buffer cleanup on exit
   - Dual terminal support
   - Correct size synchronization

## Success Criteria
- ✅ No console errors about watchers
- ✅ No permission denied messages  
- ✅ File tree responsive and accurate
- ✅ Terminals work properly
- ✅ App remains stable during use

---

*Test Duration: 2-3 minutes*
*Focus: File tree clicks and terminal usage*