# 🔴 EXPANDED FOLDER REFRESH BUG - STILL PRESENT

## Date: 2025-11-29
## Status: BUG CONFIRMED - NOT FIXED

## Test Results

### What We Did
1. Created Docker build with the `tree.rebuildTree()` hack
2. Created folder: `test-expanded-folder`
3. Created first file: `test-expanded-folder/file1.txt`
4. Expanded the folder - saw `file1.txt` ✅
5. **While folder was expanded**, created: `test-expanded-folder/file2.txt`

### Expected Result
Both `file1.txt` and `file2.txt` should be visible in the expanded folder

### Actual Result
- Only `file1.txt` is visible in the tree
- `file2.txt` is NOT shown even though:
  - It was successfully created on disk
  - Console logs show `getChildren` returned BOTH files
  - The file preview panel shows `file2.txt` (proving it exists)

## Console Evidence

```javascript
[HeadlessFileTree] getChildren fetched files for test-expanded-folder : 2 items
[HeadlessFileTree] getChildren returning paths: [test-expanded-folder/file1.txt, test-expanded-folder/file2.txt]
```

The data is being fetched correctly but NOT rendered in the UI!

## Tree Structure (from browser snapshot)

```yaml
- treeitem "test-expanded-folder" [level=1] [selected]:
  - treeitem "file1.txt" [level=2]  # ✅ Shows
  # file2.txt SHOULD be here but isn't! ❌
```

## Root Cause Analysis

The `tree.rebuildTree()` hack we added is NOT sufficient. The issue is deeper:

1. `invalidateChildrenIds()` clears the cache ✅
2. `getChildren` is called and returns new data ✅
3. `tree.rebuildTree()` is called ✅
4. BUT: The tree component doesn't update its internal state properly

## Why rebuildTree() Doesn't Work

Looking at the logs, `rebuildTree()` seems to only trigger a structural rebuild but doesn't force the tree to re-fetch and re-render already-displayed items. The component likely has an internal cache or state that's not being invalidated.

## The Real Problem

Headless Tree appears to have THREE levels of caching/state:
1. **Data cache** - cleared by `invalidateChildrenIds()` ✅
2. **Tree structure** - rebuilt by `rebuildTree()` ✅
3. **Component state/React state** - NOT being updated ❌

The third level is what's causing the issue. The React component isn't re-rendering with the new children even though the data is available.

## Potential Solutions

### 1. Force Component Re-render (Nuclear Option)
```typescript
// Force a complete re-mount of the tree
setKey(prev => prev + 1)
<HeadlessFileTree key={key} ... />
```

### 2. Direct State Manipulation
Find a way to directly update the tree's internal React state

### 3. Switch Libraries
This confirms that Headless Tree is fundamentally not designed for our use case

## Conclusion

**The hack didn't work.** The expanded folder refresh issue persists. This is a fundamental limitation of how Headless Tree manages its internal React state. We need either:
- A more aggressive workaround (force re-mounting)
- Or switch to a different library

## Test Command Used
```bash
docker-compose down && docker-compose build && docker-compose up -d
```

## Files Modified
- `app/components/FileTree/HeadlessFileTree.tsx` (added rebuildTree hack at line 209)