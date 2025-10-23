# Ticket 070: File Tree Auto-Refresh Fix

## Problem Statement

When files are created or edited via Write/Edit tools, they appear in the file preview but don't show up in the file tree until the parent folder is manually closed and reopened.

## Root Cause

The `refreshDirectoryContents` function in `VirtualizedFileTree.tsx` (line 109) uses `findDirectory` to search the in-memory tree for the target path. If the parent folder hasn't been expanded, it was never loaded into the `items` array, causing `findDirectory` to return `null`. When `targetDir` is null, the refresh silently fails.

## Current Flow

1. Write/Edit tool completes → Creates `FileOperationMessage` (UnifiedMessageProcessor.ts:186)
2. DesktopLayout detects FileOperationMessage → Calls `refreshDirectory(parentPath)` (DesktopLayout.tsx:89)
3. VirtualizedFileTree searches in-memory tree → Fails if parent not expanded
4. Refresh silently fails → User must manually close/open folder

## Solution Design

**Elegant fix with two strategies:**

1. **Root-level refresh fallback**: If directory not found in tree, check if it's a direct child of root and refresh root items
2. **Auto-expand parent directories**: When file created/edited, automatically expand parent path to make it visible

### Implementation Approach

Modify `refreshDirectoryContents` in `VirtualizedFileTree.tsx`:

```typescript
const refreshDirectoryContents = async (path: string) => {
  const targetDir = findDirectory(items, path);

  if (targetDir) {
    // Existing logic: refresh children of found directory
  } else {
    // NEW: Fallback for unexpanded directories
    // Check if path is direct child of current working directory
    if (path.startsWith(currentPath)) {
      // Reload root level to pick up changes
      await loadDirectory(currentPath);
    }
  }
}
```

### Alternative: Expand parent automatically

Track `expandedPaths` and automatically expand the parent directory:

```typescript
// After refresh, ensure parent is expanded
if (parentPath && !expandedPaths.has(parentPath)) {
  setExpandedPaths(prev => {
    const next = new Set(prev);
    next.add(parentPath);
    return next;
  });
}
```

## Impact

- ✅ Fixes bug for both Write and Edit operations
- ✅ Maintains existing virtualization architecture
- ✅ Preserves surgical refresh pattern
- ✅ No breaking changes
- ✅ ~15 lines of code

## Testing Plan

1. Create new file in collapsed folder → Should appear in tree
2. Edit existing file in collapsed folder → Should update in tree
3. Create file in expanded folder → Should work as before
4. Edit file in expanded folder → Should work as before
5. Create nested file (multiple levels deep) → Should handle gracefully

## Files to Modify

- `app/components/FileTree/VirtualizedFileTree.tsx` - Main fix
- Possibly update console logs for better debugging

## Success Criteria

- [ ] Files created via Write tool appear in tree immediately
- [ ] Files edited via Edit tool update in tree immediately
- [ ] No manual folder collapse/expand required
- [ ] Existing expanded folder behavior unchanged
- [ ] Performance remains optimal with virtualization
