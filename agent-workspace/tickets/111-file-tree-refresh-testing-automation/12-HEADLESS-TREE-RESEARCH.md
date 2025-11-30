# 🔍 HEADLESS TREE RESEARCH AND ANALYSIS

## Date: 2025-11-28
## Issue: "sync dataLoader returned promise" Error

## Problem Analysis

The error "Headless Tree: sync dataLoader returned promise" occurs when using `syncDataLoaderFeature` but providing asynchronous functions in the dataLoader. Our HeadlessFileTree implementation was mixing sync and async patterns incorrectly.

## Headless Tree Library Overview

- **Name**: @headless-tree/core + @headless-tree/react
- **Status**: Beta (1.2.1 core, 1.4.0 react) - stable and production ready
- **Size**: 9.5kB + 0.4kB React bindings
- **Purpose**: Official successor to react-complex-tree
- **Strengths**: Tree-shaking friendly, fully customizable, extensive features

## Key Concepts

### Sync vs Async Data Loaders

**Sync Data Loader (`syncDataLoaderFeature`)**:
- For immediately available, synchronous data
- Methods called multiple times per render
- No caching - refetches during every render
- No data invalidation concept
- Perfect for in-memory data structures

**Async Data Loader (`asyncDataLoaderFeature`)**:
- For API calls, database queries, async sources
- Built-in caching and invalidation
- On-demand loading as tree expands
- Additional methods: `loadItemData()`, `invalidateItemData()`, etc.
- Automatic `rebuildTree()` after data updates

## Correct Implementation Pattern

Since we're using `fetchDirectory()` which is async, we MUST use `asyncDataLoaderFeature`:

```typescript
import { asyncDataLoaderFeature } from '@headless-tree/core'

const tree = useTree<string>({
  rootItemId: 'root',
  dataLoader: {
    getItem: async (itemId) => {
      const path = itemId === 'root' ? workingDirectory : itemId
      return path // Return the path as item data
    },
    getChildren: async (itemId) => {
      const path = itemId === 'root' ? workingDirectory : itemId
      const files = await fetchDirectory(path)
      return files.map(file => file.path)
    }
  },
  getItemName: (item) => {
    const path = item.getItemData()
    return path.split('/').pop() || path
  },
  isItemFolder: (item) => {
    const path = item.getItemData()
    const fileItem = getFileFromCache(path)
    return fileItem?.isDirectory || false
  },
  features: [asyncDataLoaderFeature, selectionFeature, hotkeysCoreFeature]
})
```

## Benefits of Async Data Loader for File Trees

1. **Lazy Loading**: Children loaded only when folder expanded
2. **Caching**: File data cached until invalidated
3. **Automatic Updates**: No manual `rebuildTree()` calls needed
4. **Performance**: Better for large directory structures
5. **Real-time**: Easy integration with file system watchers

## Integration with Refresh System

With async data loader, refreshing becomes simple:
```typescript
// Instead of complex expandToPath logic:
const refresh = async (path: string) => {
  // Invalidate cache for path
  tree.invalidateItemData(path)
  tree.invalidateChildrenIds(path)
  // Tree automatically rebuilds!
}
```

## Best Practice Examples Found

The documentation shows async data loader is preferred for:
- File system browsers (our exact use case!)
- API-driven trees
- Large datasets
- Dynamic loading scenarios

## Conclusion

Our current issue is using `syncDataLoaderFeature` with async `fetchDirectory()`. The fix is simple:
1. Import `asyncDataLoaderFeature` instead of `syncDataLoaderFeature`
2. Ensure all dataLoader methods are properly async
3. Utilize built-in caching and invalidation features
4. Remove manual tree management complexity

This aligns perfectly with our goal of eliminating complex manual state management in favor of modern, automatic tree updates.