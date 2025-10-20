# Ticket #067: Workspace Directory Switcher in Settings

## Overview
Add a static workspace directory switcher in the Settings panel to toggle between `/workspace` and `/workspace/my-jarvis` directories in the file tree. Default to `/workspace/my-jarvis` on first load.

## Current State Analysis

### Problem Identified
The workspace switcher UI exists in code but is **NOT visible** in the Settings panel because:

1. **Missing Props in ResponsiveLayout** (`app/components/Layout/ResponsiveLayout.tsx:104-107`)
   - `SettingsModal` is rendered WITHOUT passing required props
   - Missing: `workingDirectory` prop
   - Missing: `onWorkspaceChange` prop

2. **Conditional Rendering** (`app/components/settings/GeneralSettings.tsx:208`)
   ```tsx
   {onWorkspaceChange && (
     <div>
       {/* Workspace section - only renders if prop exists */}
     </div>
   )}
   ```
   - This condition fails because `onWorkspaceChange` is `undefined`
   - Entire workspace section doesn't render

### Existing Infrastructure (Already Working)

✅ **Settings Storage System** (`app/utils/storage.ts`)
- `workingDirectory` stored in `AppSettings` interface
- Automatic localStorage persistence
- Migration system in place (version 4)

✅ **Settings Context** (`app/contexts/SettingsContext.tsx`)
- `workingDirectory` state management
- `setWorkingDirectory(path: string)` function
- Auto-persistence on change (line 50)
- Home directory resolution for Electron mode (lines 19-28)

✅ **File Tree Auto-Reload** (`app/components/FileTree/VirtualizedFileTree.tsx:173`)
- `useEffect` watches `workingDirectory` prop
- Automatically calls `loadDirectory()` on change
- No manual refresh needed

✅ **Desktop Layout Integration** (`app/components/Layout/DesktopLayout.tsx`)
- Reads `workingDirectory` from settings context (line 53)
- Passes to `VirtualizedFileTree` (line 140)
- Complete reactive chain

### Existing UI Implementation

**Web Mode** (lines 214-280 in `GeneralSettings.tsx`):
```tsx
// Already has radio button selector!
<button onClick={() => onWorkspaceChange('/workspace')}>
  <FolderIcon className="w-5 h-5 text-green-500" />
  <div>Workspace</div>
  <div>Root workspace directory (/workspace)</div>
  {/* Radio indicator based on workingDirectory === '/workspace' */}
</button>

<button onClick={() => onWorkspaceChange('/workspace/my-jarvis')}>
  <FolderIcon className="w-5 h-5 text-blue-500" />
  <div>My Jarvis</div>
  <div>My Jarvis project directory (/workspace/my-jarvis)</div>
  {/* Radio indicator based on workingDirectory === '/workspace/my-jarvis' */}
</button>
```

**Electron Mode** (lines 282-306 in `GeneralSettings.tsx`):
```tsx
// Currently shows directory picker dialog
<button onClick={handleSelectWorkspace}>
  <FolderIcon className="w-5 h-5" />
  <span>Change Workspace</span>
</button>
```

## Implementation Plan

### Phase 1: Connect Settings Modal to Context (Core Fix)

**File: `app/components/Layout/ResponsiveLayout.tsx`**

**Changes Required:**
1. Import `useSettings` hook at top
2. Get workspace settings from context
3. Pass props to `SettingsModal`

**Implementation:**
```tsx
// Add import
import { useSettings } from '../../hooks/useSettings'

// Inside ResponsiveLayout component, after line 59
export function ResponsiveLayout() {
  // ... existing state ...

  // Add settings hook
  const { workingDirectory, setWorkingDirectory } = useSettings()

  // ... rest of component ...

  // Update SettingsModal (lines 104-107)
  <SettingsModal
    isOpen={isSettingsOpen}
    onClose={handleSettingsClose}
    workingDirectory={workingDirectory}
    onWorkspaceChange={setWorkingDirectory}
  />
}
```

**Expected Result After Phase 1:**
- Settings panel will show workspace section
- Web mode: Radio buttons appear (already implemented)
- Electron mode: Directory picker appears (existing behavior)

### Phase 2: Replace Electron Picker with Static Selector (Feature Request)

**File: `app/components/settings/GeneralSettings.tsx`**

**Changes Required:**
Replace Electron mode directory picker (lines 282-306) with static radio button selector (copy from web mode pattern).

**Implementation:**
```tsx
// Replace the entire Electron mode section (lines 282-306)
) : (
  // Electron mode: Show static radio button selector (like web mode)
  <div className="space-y-2">
    {/* Workspace option */}
    <div className="flex items-center gap-2">
      <button
        onClick={() => onWorkspaceChange('/workspace')}
        className="flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200 text-left flex-1"
        role="radio"
        aria-checked={workingDirectory === '/workspace'}
        aria-label="Workspace - Root workspace directory"
      >
        <FolderIcon className="w-5 h-5 text-green-500" />
        <div>
          <div className="text-sm font-medium text-slate-800 dark:text-slate-100">
            Workspace
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Root workspace directory (/workspace)
          </div>
        </div>
        <div className="ml-auto">
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
            workingDirectory === '/workspace'
              ? 'bg-green-500 border-green-500'
              : 'border-slate-300 dark:border-slate-600'
          }`}>
            {workingDirectory === '/workspace' && (
              <div className="w-2 h-2 bg-white rounded-full"></div>
            )}
          </div>
        </div>
      </button>
    </div>

    {/* My Jarvis option - DEFAULT */}
    <div className="flex items-center gap-2">
      <button
        onClick={() => onWorkspaceChange('/workspace/my-jarvis')}
        className="flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200 text-left flex-1"
        role="radio"
        aria-checked={workingDirectory === '/workspace/my-jarvis'}
        aria-label="My Jarvis - My Jarvis project directory"
      >
        <FolderIcon className="w-5 h-5 text-blue-500" />
        <div>
          <div className="text-sm font-medium text-slate-800 dark:text-slate-100">
            My Jarvis
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            My Jarvis project directory (/workspace/my-jarvis)
          </div>
        </div>
        <div className="ml-auto">
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
            workingDirectory === '/workspace/my-jarvis'
              ? 'bg-blue-500 border-blue-500'
              : 'border-slate-300 dark:border-slate-600'
          }`}>
            {workingDirectory === '/workspace/my-jarvis' && (
              <div className="w-2 h-2 bg-white rounded-full"></div>
            )}
          </div>
        </div>
      </button>
    </div>
  </div>
)
```

**Update Help Text (line 309):**
```tsx
<div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
  {isWebMode()
    ? "Select which directory to display in the file tree. Claude Code will continue to run from /workspace."
    : "Select which directory to display in the file tree. Choose between root workspace or My Jarvis project directory."
  }
</div>
```

### Phase 3: Update Default Workspace (Optional Enhancement)

**File: `app/types/settings.ts`**

**Current Default (line 46):**
```tsx
return import.meta.env.VITE_WORKING_DIRECTORY || '/workspace/my-jarvis';
```

**Already defaults to `/workspace/my-jarvis` ✅**

No changes needed - already implements requested behavior.

## Implementation Flow After Changes

1. **User opens Settings** → GeneralSettings renders with workspace section visible
2. **User clicks "Workspace" button** → `onWorkspaceChange('/workspace')` called
3. **Settings Context updates** → `setWorkingDirectory('/workspace')` updates state
4. **Auto-persistence** → SettingsContext saves to localStorage (line 50)
5. **File Tree reacts** → VirtualizedFileTree's `useEffect` (line 173) detects change
6. **Directory reloads** → `loadDirectory('/workspace')` fetches new contents
7. **UI updates** → File tree displays new directory structure
8. **Radio indicator updates** → Visual feedback shows selected workspace

## Testing Checklist

### Phase 1 Testing (Props Connection)
- [ ] Open Settings panel
- [ ] Verify "Workspace Directory" section is visible
- [ ] Verify current workspace path is displayed
- [ ] Web mode: Verify radio buttons appear
- [ ] Electron mode: Verify directory picker appears

### Phase 2 Testing (Static Selector)
- [ ] Settings shows two radio button options
- [ ] Click "Workspace" → File tree loads `/workspace`
- [ ] Click "My Jarvis" → File tree loads `/workspace/my-jarvis`
- [ ] Radio indicators show correct selection
- [ ] Settings persist after app reload
- [ ] File tree auto-reloads without manual refresh
- [ ] No console errors during switching

### Phase 3 Testing (Default Behavior)
- [ ] Fresh install defaults to `/workspace/my-jarvis`
- [ ] Clear localStorage → Reload → Verify default
- [ ] Electron mode resolves home directory correctly

## File Reference

### Files to Modify
1. `app/components/Layout/ResponsiveLayout.tsx` - Add useSettings hook and pass props
2. `app/components/settings/GeneralSettings.tsx` - Replace Electron picker with radio buttons
3. `app/types/settings.ts` - (Optional) Already defaults correctly

### Files to Review (No Changes Needed)
- `app/contexts/SettingsContext.tsx` - ✅ Already implements reactive updates
- `app/utils/storage.ts` - ✅ Already persists workingDirectory
- `app/components/FileTree/VirtualizedFileTree.tsx` - ✅ Already auto-reloads
- `app/components/Layout/DesktopLayout.tsx` - ✅ Already passes workingDirectory

## Architecture Insights

### Why This Works Seamlessly
1. **Settings Context is Reactive** - Changes automatically propagate
2. **File Tree Watches Props** - useEffect dependency triggers reload
3. **localStorage Auto-Saves** - No manual persistence needed
4. **Web Mode Proves Pattern** - Same UI already works in web deployment

### No Breaking Changes
- ✅ Existing architecture fully supports this feature
- ✅ No backend changes required
- ✅ No IPC communication changes needed
- ✅ Just UI layer modifications

## Success Criteria

**Must Have:**
- [ ] Settings panel shows workspace switcher
- [ ] Two options: "Workspace" and "My Jarvis"
- [ ] Default to "My Jarvis" on first load
- [ ] File tree updates instantly when switching
- [ ] Settings persist across app restarts

**Nice to Have:**
- [ ] Smooth transition animation between workspaces
- [ ] Loading indicator during directory switch
- [ ] Remember expanded folders when switching back

## Implementation Priority
**Priority: HIGH** - Simple UI fix with existing infrastructure

**Estimated Effort:**
- Phase 1: 15 minutes (connect props)
- Phase 2: 30 minutes (replace UI)
- Phase 3: 5 minutes (verify defaults)
- Testing: 15 minutes
- **Total: ~1 hour**

## Notes
- Architecture was designed for this feature from the start
- Web mode already has the exact UI we want
- Just enabling in Electron what exists in web mode
- Clean, simple, no surprises expected
