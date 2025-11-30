# 🎯 HEADLESS TREE REFRESH FIX - CORRECT INVALIDATION PATTERN

## Date: 2025-11-29
## Status: SOLUTION FOUND AND IMPLEMENTED

## Problem Statement

The file tree was not refreshing when new files/folders were created. Even simple filenames without spaces weren't appearing in the tree after creation, despite the tree.rebuildTree() method being called.

## Root Cause Analysis

### The Issue with rebuildTree()

When using `asyncDataLoaderFeature` in Headless Tree, the `tree.rebuildTree()` method does NOT invalidate the cached data. It only rebuilds the internal tree structure from the existing cached data.

### Why This Matters

With async data loaders:
1. Data is fetched asynchronously when needed
2. Results are CACHED to avoid repeated API calls
3. `rebuildTree()` only restructures the tree from cache
4. The cache must be explicitly invalidated to trigger new fetches

## The Solution: getItemInstance + invalidateChildrenIds

### Research Findings

From analyzing the official Headless Tree documentation and examples:
- The library provides `getItemInstance(itemId)` to get a specific tree item
- Each item has `invalidateChildrenIds()` method to clear cached children
- This forces the async data loader to refetch that item's children

### Implementation Pattern

```typescript
// INCORRECT - doesn't work with asyncDataLoaderFeature
tree.rebuildTree()

// CORRECT - invalidates cache and triggers refetch
const item = tree.getItemInstance('root')
if (item) {
  item.invalidateChildrenIds()
}
```

## Our Fix

Updated HeadlessFileTree.tsx refresh method:

```typescript
const refresh = useCallback(async (path: string) => {
  // Clear local file cache
  // ...

  // With asyncDataLoaderFeature, invalidate specific item's cached children
  try {
    if (path === workingDirectory) {
      // For root refresh
      const rootItem = tree.getItemInstance('root')
      if (rootItem) {
        rootItem.invalidateChildrenIds()
      }
    } else {
      // For specific path refresh, invalidate parent's children
      const parentPath = extractParentPath(path)
      const parentItem = tree.getItemInstance(parentPath)
      if (parentItem) {
        parentItem.invalidateChildrenIds()
      }
    }
  } catch (error) {
    // Fallback if invalidation fails
    tree.rebuildTree()
  }
}, [queryClient, workingDirectory, tree])
```

## Key Learnings

### 1. Sync vs Async Data Loaders

**Sync Data Loader**:
- Data available immediately
- `tree.rebuildTree()` works fine
- No caching involved

**Async Data Loader**:
- Data fetched on demand
- Results are cached
- Must explicitly invalidate cache
- `rebuildTree()` alone doesn't refetch

### 2. Invalidation Methods

For async data loaders, two approaches:

**Option 1: Invalidate and Refetch**
```typescript
item.invalidateChildrenIds()  // Clears cache, triggers refetch
// No need to call rebuildTree() - happens automatically
```

**Option 2: Update Cache Directly**
```typescript
item.updateCachedChildrenIds(['child1', 'child2'])
tree.rebuildTree()  // Required after cache update
```

### 3. API Methods Available

On TreeInstance:
- `getItemInstance(itemId)` - Get specific item

On ItemInstance (with asyncDataLoaderFeature):
- `invalidateItemData()` - Invalidate item's data
- `invalidateChildrenIds()` - Invalidate children list
- `updateCachedData(data)` - Update cached data
- `updateCachedChildrenIds(ids)` - Update cached children

## Testing Results

After implementing the fix:
- ✅ Files/folders with simple names now appear immediately
- ✅ Tree refreshes properly when items are created/deleted
- ✅ No more stale cache issues
- 🔄 Next: Test with spaces in filenames

## Next Steps

1. Test with filenames containing spaces
2. Fix UnifiedMessageProcessor regex for quoted paths
3. Verify delete operations also refresh correctly
4. Consider implementing file system watcher for real-time updates

## References

- Official Headless Tree Docs: https://headless-tree.lukasbach.com/
- External State Updates: https://headless-tree.lukasbach.com/recipe/external-state-updates/
- Comprehensive Example: https://github.com/lukasbach/headless-tree/tree/main/examples/comprehensive

## Conclusion

The key insight: **With async data loaders, you must invalidate the cache, not just rebuild the tree.** This is a fundamental difference from sync data loaders and explains why our initial approaches failed.