# 🔍 ROOT CAUSE ANALYSIS: Expanded Folder Not Updating

## Date: 2025-11-29
## Status: CRITICAL BUG IDENTIFIED

## The Problem

When a folder is already expanded in the tree and we add a new file to it, the file doesn't appear in the tree UI even though:
1. The file is successfully created on the filesystem
2. `invalidateChildrenIds()` is called on the parent folder
3. The `getChildren` function fetches and returns the updated list (including the new file)
4. The console logs confirm the new data is retrieved

**Example**:
- `demo1` folder is expanded showing `file3`
- We create `file4` in `demo1`
- Console shows `getChildren` returns both `file3` and `file4`
- But the tree UI still only shows `file3`

## Why This Happens

### The Async Data Loader Cache Model

When using `asyncDataLoaderFeature` in Headless Tree:

1. **Initial Load**: When you expand a folder, it calls `getChildren`, caches the result, and renders it
2. **Cache Invalidation**: `invalidateChildrenIds()` marks the cache as stale
3. **The Gap**: The tree doesn't automatically re-fetch and re-render for already-expanded items

### The Expected vs Actual Behavior

**What We Expected**:
- Call `invalidateChildrenIds()` on a folder
- Tree automatically re-fetches if the folder is expanded
- Tree re-renders with new data

**What Actually Happens**:
- Call `invalidateChildrenIds()` on a folder
- Cache is marked as invalid
- If folder is collapsed: Next expansion will fetch fresh data ✅
- If folder is expanded: Nothing happens until user interaction ❌

## Why We Have This Problem

### 1. Headless Tree Design Philosophy

The library is designed for **lazy loading** - it only fetches data when needed:
- Expanding a collapsed folder = needs data = fetches
- Already expanded folder = has data displayed = doesn't re-fetch automatically

### 2. Missing Reactive Pattern

The library doesn't have a built-in pattern for "external data changed, update visible items". It assumes:
- Data changes happen through user interactions (drag/drop, rename)
- External changes are rare
- You'll manually trigger updates when needed

### 3. Our Use Case Mismatch

We're using it for a **file system viewer** where:
- Files can be created externally (through terminal commands)
- We need real-time updates
- Expanded folders should show new items immediately

## The Core Issue

**`invalidateChildrenIds()` only invalidates the cache, it doesn't trigger a re-render of already-rendered items.**

This is by design - the library avoids unnecessary re-renders for performance. But for our use case, we NEED those re-renders.

## Why This is Frustrating

1. **The documentation doesn't clearly explain this behavior**
2. **The examples don't show how to handle external updates to expanded items**
3. **The API seems to suggest `invalidateChildrenIds()` should be enough**

## Solutions Considered

### Option 1: Force Rebuild After Invalidation
```typescript
parentItem.invalidateChildrenIds()
tree.rebuildTree() // Force UI update
```
**Problem**: Feels hacky, might cause flicker, not how the library is intended to be used

### Option 2: Collapse and Re-expand Programmatically
```typescript
parentItem.invalidateChildrenIds()
if (parentItem.isExpanded()) {
  parentItem.collapse()
  parentItem.expand()
}
```
**Problem**: Causes visual disruption, loses user's scroll position

### Option 3: Direct Cache Update
Instead of invalidating, directly update the cache:
```typescript
const newChildren = await fetchDirectory(path)
parentItem.updateCachedChildrenIds(newChildren.map(f => f.path))
tree.rebuildTree()
```
**Problem**: Bypasses the async loader pattern, more complex

## The Real Question

**Should we be fighting the library or working with it?**

The Headless Tree library might not be the right tool for a real-time file system viewer. It's optimized for:
- Static or slowly-changing data
- User-driven updates
- Performance over reactivity

We need:
- Real-time updates
- External data changes
- Immediate UI reflection

## Next Steps

1. Check if there's a proper API method we're missing
2. Look for other examples of real-time updates with Headless Tree
3. Consider if we need a different approach (like file system watchers)
4. Decide whether to patch the library or switch to a different solution