# Ticket 001: Make Terminal Completely Standalone

## Summary
After successfully cleaning ManyMany.dev to remove all Git/worktree functionality, the terminal doesn't initialize properly because it still depends on the worktree concept internally.

## What We Accomplished
✅ **Backend Cleanup**
- Removed all Git-related Rust modules (git.rs, project.rs, worktree.rs)
- Cleaned lib.rs to only register terminal commands
- Terminal backend is now completely independent

✅ **Frontend Cleanup**
- Simplified App.tsx to only show TerminalPanel
- Removed all unused components (Sidebar, ProjectForm, FileChangesPanel, etc.)
- Removed all unused stores except terminalStore
- Created new simplified TerminalPanel.tsx

## The Problem
The terminal doesn't work when clicking on it because:

1. **Terminal Store Still Uses Worktree Concept**
   - `terminalStore.ts` organizes terminals by worktreeId
   - Functions like `getTerminalsForWorktree()` filter by worktreeId
   - Active terminal tracking is per-worktree: `activeTerminalByWorktree`

2. **TerminalPanel Uses Hardcoded Worktree**
   - We use `worktreeId: 'default'` as a workaround
   - But the initialization check uses global `terminals.length`
   - Creates mismatch: terminal exists globally but not for 'default' worktree

3. **Terminal Creation Flow**
   ```javascript
   // Current flow (broken):
   if (terminals.length === 0) {  // Checks ALL terminals
     handleCreateTerminal();       // Creates for 'default' worktree
   }
   // Later:
   const terminals = getTerminalsForWorktree('default'); // Returns empty!
   ```

## The Solution
Remove worktree concept entirely from the terminal system:

### 1. Simplify Terminal Store
```typescript
// OLD Structure:
interface TerminalStore {
  terminals: TerminalSession[];
  activeTerminalByWorktree: Record<string, string>;
  getTerminalsForWorktree(worktreeId): TerminalSession[];
}

// NEW Structure:
interface TerminalStore {
  terminals: TerminalSession[];
  activeTerminalId: string | null;
  getTerminals(): TerminalSession[];
}
```

### 2. Simplify Terminal Session
```typescript
// Remove worktreeId from TerminalSession
interface TerminalSession {
  id: string;
  name: string;
  workingDirectory: string;
  backendTerminalId?: string;
  // worktreeId: string; // REMOVE THIS
}
```

### 3. Update Backend Request
The backend `CreateTerminalRequest` expects `worktree_id`, but we can just pass a dummy value since the terminal system doesn't actually use it.

## Implementation Steps

1. **Update terminalStore.ts**
   - Remove all worktree-related logic
   - Simplify to single active terminal tracking
   - Remove worktreeId from all functions

2. **Update TerminalPanel.tsx**
   - Remove worktreeId references
   - Use simplified store methods
   - Fix initialization to check actual terminals

3. **Update Terminal.tsx**
   - Remove worktreeId prop
   - Simplify focus management

4. **Test**
   - Terminal should auto-create on launch
   - Should be able to type immediately
   - Multiple terminals should work

## Files to Modify
- `/src/stores/terminalStore.ts` - Remove worktree logic
- `/src/components/TerminalPanel.tsx` - Simplify terminal management
- `/src/components/Terminal.tsx` - Remove worktree dependencies

## Expected Outcome
- App launches → Terminal automatically created → User can type immediately
- No concept of projects or worktrees
- Clean, standalone terminal experience

## Notes
- Keep backend as-is (just pass dummy worktree_id)
- Focus on frontend simplification
- This creates the clean template we wanted