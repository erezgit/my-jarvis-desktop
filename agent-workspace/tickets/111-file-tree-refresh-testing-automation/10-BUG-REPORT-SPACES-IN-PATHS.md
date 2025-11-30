# 🐛 BUG REPORT: File Tree Refresh Fails for Paths with Spaces

## Date: 2025-11-28
## Discovered During: AI Testing of File Tree Refresh

## Bug Summary

When creating folders or files with spaces in their paths (e.g., "Danny Test 1/folder-test-3"), the file tree refresh mechanism fails to properly update. The folders are created successfully on disk but don't appear in the file tree, and the parent folder collapses unexpectedly.

## Symptoms Observed

1. **Parent folder collapses**: When adding a subfolder to an expanded parent folder with spaces in its name, the parent folder collapses after the operation
2. **New items don't appear**: Newly created subfolders/files don't appear in the tree even after re-expanding the parent
3. **Path truncation**: Console logs show path being truncated at the first space (e.g., "Danny Test 1/folder-test-3" becomes just "Danny")

## Test Cases Reproduced

### Test 1: Creating subfolder in empty folder with spaces
- Created folder "Danny Test 1"
- Expanded it (empty)
- Created subfolder "folder-test-1" inside it
- **Result**: Parent collapsed, subfolder didn't appear

### Test 2: Creating subfolder in already-expanded folder
- Had "Danny Test 1" expanded with existing content
- Created "folder-test-3" inside it
- **Result**: Parent collapsed, new folder didn't appear

## Root Cause Analysis

### Location: `/app/utils/UnifiedMessageProcessor.ts` Line 280

```javascript
const mkdirMatch = command.match(/mkdir\s+(?:-p\s+)?["']?([^\s"']+)["']?/);
```

### The Problem

The regex pattern `[^\s"']+` means "match any character that is NOT a space, quote, or apostrophe". This causes incorrect parsing of quoted paths with spaces.

**Example**:
- Input: `mkdir "Danny Test 1/folder-test-3"`
- Current regex captures: `"Danny"` (stops at the first space)
- Should capture: `"Danny Test 1/folder-test-3"`

### Why It Fails

1. The regex matches the optional opening quote `["']?`
2. Then tries to capture with `([^\s"']+)` which stops at the first space
3. The path gets truncated to just "Danny"
4. FileOperationMessage is created with incorrect path: "Danny" instead of "Danny Test 1/folder-test-3"
5. When `expandToPath("Danny")` is called, it can't find the correct directory structure
6. The tree refresh fails and the parent folder's state gets corrupted

## Impact

- Any file/folder operations involving paths with spaces fail to trigger proper tree refresh
- This affects both Bash commands (mkdir, touch, etc.) and potentially Write operations with spaces in paths
- User experience is broken for realistic folder names that often contain spaces

## Proposed Fix

The regex should be updated to properly handle quoted strings with spaces:

```javascript
// Better pattern that handles quotes properly
const mkdirMatch = command.match(/mkdir\s+(?:-p\s+)?(?:["']([^"']+)["']|([^\s]+))/);
if (mkdirMatch) {
  filePath = mkdirMatch[1] || mkdirMatch[2]; // Use quoted match if present, otherwise non-quoted
  operation = "created";
  isDirectory = true;
}
```

This pattern:
- Matches quoted strings including spaces: `["']([^"']+)["']`
- OR matches unquoted paths without spaces: `([^\s]+)`
- Correctly extracts the full path regardless of spaces

## Similar Issues to Check

The same regex pattern issue likely exists for:
- Line 288: echo/cat operations
- Line 296: mv operations
- Line 306: cp operations
- Line 314: rm operations
- Line 322: touch operations

All these patterns use `[^\s"']+` which will fail with spaces in paths.

## Console Evidence

```
[expandToPath] Called with: Danny
[expandToPath] Immediate parent:
[expandToPath] Grandparent:
[expandToPath] Root directory detected - refreshing entire tree
```

Shows the path was incorrectly truncated to just "Danny" instead of "Danny Test 1/folder-test-3".

## Screenshots

- `bug-test-danny-folder-collapsed.png` - Shows the folder collapsed after operation

## Recommendation

This is a **HIGH PRIORITY** bug as it affects basic file operations with realistic folder/file names. The fix is straightforward - update all regex patterns in UnifiedMessageProcessor.ts to properly handle quoted strings with spaces.