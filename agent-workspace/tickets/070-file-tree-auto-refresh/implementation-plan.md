# Ticket 070: File Tree Auto-Refresh Fix

## Status: IN PROGRESS - TanStack Query Solution

## Problem Statement

When files are created or edited via Write/Edit tools, they appear in the file preview but don't show up in the file tree until the parent folder is manually closed and reopened.

**Three failing use cases:**
1. **Create ticket (directory + file)**: Creating `tickets/006-test/plan.md` doesn't show in tree when tickets folder is expanded
2. **Create file in open directory**: Adding file to existing open directory doesn't appear until folder closed/opened
3. **Update existing file**: File content updates but preview doesn't refresh until file manually clicked again

## Current Architecture Analysis

### How It Works Now

**Message Flow:**
1. Agent executes Write/Edit tool → Returns `FileOperationMessage` in tool result
2. `DesktopLayout` watches messages array via `useEffect` (lines 59-120)
3. Detects new `FileOperationMessage` in latest messages
4. Calls `fileTreeRef.current.expandToPath(fileOpMessage.path)`
5. `expandToPath` walks path segments, expands directories, refreshes parent
6. Then selects file and shows in preview

**Current State Management:**
- `items: FileItem[]` - Nested tree structure
- `expandedPaths: Set<string>` - Tracks which directories are expanded
- Manual `loadDirectory()` / `loadSubdirectory()` functions fetch from file API
- Manual `refreshDirectoryContents()` searches tree and updates specific directory

**Why Current Approach Fails:**
- `expandToPath` searches nested tree with `findItem()` recursively
- Only searches `item.children` arrays of already-expanded nodes
- Unexpanded directories have empty children, so search returns null
- Direct mutation `dirItem.isExpanded = true` doesn't trigger re-renders consistently
- Stale state in async loops - each iteration sees original `items` array
- Race conditions between tree state updates and file selection

### Key Files

1. **`app/App.tsx`** (lines 1-24)
   - Root component with provider hierarchy
   - `SettingsProvider` → `ChatStateProvider` → `TokenUsageProvider`
   - No QueryClient currently

2. **`app/components/Layout/DesktopLayout.tsx`** (lines 59-120)
   - Watches `messages` from `useChatStateContext()`
   - Detects `FileOperationMessage` in new messages
   - Currently calls `expandToPath()` - **THIS NEEDS TO CHANGE**
   - Should call `queryClient.invalidateQueries()` instead

3. **`app/components/FileTree/VirtualizedFileTree.tsx`**
   - Lines 251-297: `loadDirectory()` - Loads root directory
   - Lines 299-342: `loadSubdirectory()` - Loads directory children
   - Lines 179-242: `refreshDirectoryContents()` - Searches tree and refreshes directory
   - Lines 103-166: `expandToPath()` - Walks path and expands directories
   - **ALL OF THESE NEED REFACTORING TO USE QUERIES**

## TanStack Query Solution Architecture

### Why TanStack Query?

The file system is **server state**. The file tree is a **client-side cache** of that server state. This is exactly what TanStack Query solves:

**Benefits:**
1. **Automatic cache management**: No manual directory searching
2. **Built-in invalidation**: `invalidateQueries()` triggers automatic refetch
3. **Smart refetching**: Only refetches if directory is actively viewed (enabled: isExpanded)
4. **No race conditions**: Declarative API prevents timing bugs
5. **Agent-controlled UX**: Keep `FileOperationMessage` pattern, add query invalidation
6. **Works with TanStack Virtual**: Already using it, proven integration pattern
7. **Industry standard**: React ecosystem best practice (2025)

### Core Pattern

**Query Keys (Hierarchical):**
```typescript
['directories', '/workspace']                                    // Root
['directories', '/workspace/tickets']                            // Subdirectory
['directories', '/workspace/tickets/070-file-tree-auto-refresh'] // Nested
```

**Query per Directory:**
```typescript
const { data: children = [], isLoading } = useQuery({
  queryKey: ['directories', directoryPath],
  queryFn: async () => {
    // Call existing file API logic
    if (isWebMode()) {
      const response = await fetch(`/api/files?path=${encodeURIComponent(directoryPath)}`)
      const data = await response.json()
      return data.files
    } else {
      return await window.fileAPI.readDirectory(directoryPath)
    }
  },
  enabled: isExpanded, // Only fetch when directory is expanded
  staleTime: 5 * 60 * 1000, // 5 minutes
})
```

**Cache Invalidation on FileOperationMessage:**
```typescript
// In DesktopLayout.tsx
const queryClient = useQueryClient()

useEffect(() => {
  if (fileOpMessage) {
    const parentPath = getParentPath(fileOpMessage.path)

    // Invalidate parent directory - TanStack Query auto-refetches if expanded
    queryClient.invalidateQueries({
      queryKey: ['directories', parentPath],
      exact: true,
    })

    // Then select the file (existing logic)
    onFileSelect({ ... })
  }
}, [fileOpMessage])
```

## Implementation Plan

### Phase 1: Setup TanStack Query Infrastructure

**Tasks:**
- [ ] Install `@tanstack/react-query` and `@tanstack/react-query-devtools`
- [ ] Create `QueryClient` in `App.tsx`
- [ ] Wrap app with `QueryClientProvider`
- [ ] Verify QueryClient accessible in components

**File: `package.json`**
```bash
npm install @tanstack/react-query @tanstack/react-query-devtools
```

**File: `app/App.tsx`**
```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ResponsiveLayout } from "./components/Layout/ResponsiveLayout"
import { SettingsProvider } from "./contexts/SettingsContext"
import { ChatStateProvider } from "./contexts/ChatStateProvider"
import { TokenUsageProvider } from "./contexts/TokenUsageContext"
import { TerminalOverlay } from "./components/TerminalOverlay"

// Create QueryClient instance (singleton for app lifecycle)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - file system doesn't change often
      gcTime: 30 * 60 * 1000, // 30 minutes cache retention (formerly cacheTime)
      refetchOnWindowFocus: false, // Desktop app doesn't need this
      retry: 2, // Retry file system errors twice
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <ChatStateProvider>
          <TokenUsageProvider>
            <ResponsiveLayout />
            <TerminalOverlay />
          </TokenUsageProvider>
        </ChatStateProvider>
      </SettingsProvider>
      {/* DevTools only in development */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}

export default App
```

**Test:** Open DevTools (bottom-left icon), verify it shows "React Query Devtools"

---

### Phase 2: Add Cache Invalidation to DesktopLayout

**Tasks:**
- [ ] Import `useQueryClient` in DesktopLayout
- [ ] Replace `expandToPath()` call with query invalidation
- [ ] Keep file selection logic unchanged
- [ ] Test: Query invalidation works (check DevTools)

**File: `app/components/Layout/DesktopLayout.tsx`**

**Import at top:**
```typescript
import { useQueryClient } from '@tanstack/react-query'
```

**Replace lines 78-116 (the FileOperationMessage handler):**
```typescript
const queryClient = useQueryClient()

useEffect(() => {
  console.log('[DESKTOP_LAYOUT_DEBUG] Messages changed, count:', messages.length)

  // Only check NEW messages that were added since last time
  if (messages.length <= lastProcessedMessageCount) {
    return
  }

  // Search through only the NEW messages for FileOperationMessage
  let fileOpMessage = null
  for (let i = messages.length - 1; i >= lastProcessedMessageCount; i--) {
    if (isFileOperationMessage(messages[i])) {
      fileOpMessage = messages[i]
      break
    }
  }

  console.log('[DESKTOP_LAYOUT_DEBUG] Found FileOperationMessage:', fileOpMessage)

  if (fileOpMessage) {
    console.log('[DESKTOP_LAYOUT_DEBUG] File operation detected!', fileOpMessage)

    // Extract parent directory path
    const pathParts = fileOpMessage.path.split('/')
    pathParts.pop() // Remove filename
    const parentPath = pathParts.join('/')

    // Invalidate parent directory query
    // TanStack Query will automatically refetch if that directory is expanded
    queryClient.invalidateQueries({
      queryKey: ['directories', parentPath],
      exact: true, // Only invalidate this specific directory, not children
    })

    console.log('[DESKTOP_LAYOUT_DEBUG] Invalidated query for:', parentPath)

    // Auto-select the file and load its content (unchanged)
    if (typeof window !== 'undefined' && (window as any).fileAPI) {
      ;(window as any).fileAPI.readFile(fileOpMessage.path).then((fileData: any) => {
        if (fileData) {
          onFileSelect({
            name: fileOpMessage.fileName,
            path: fileOpMessage.path,
            isDirectory: fileOpMessage.isDirectory,
            size: 0,
            modified: new Date().toISOString(),
            extension: fileOpMessage.fileName.includes('.')
              ? '.' + fileOpMessage.fileName.split('.').pop()
              : '',
            content: fileData.content
          })
        }
      }).catch((error: any) => {
        console.error('[DESKTOP_LAYOUT_DEBUG] Error reading file:', error)
        // Select without content if read fails
        onFileSelect({
          name: fileOpMessage.fileName,
          path: fileOpMessage.path,
          isDirectory: fileOpMessage.isDirectory,
          size: 0,
          modified: new Date().toISOString(),
          extension: fileOpMessage.fileName.includes('.')
            ? '.' + fileOpMessage.fileName.split('.').pop()
            : '',
        })
      })
    }
  }

  // Update last processed count
  setLastProcessedMessageCount(messages.length)
}, [messages, onFileSelect, lastProcessedMessageCount, queryClient])
```

**Note:** This phase works even before Phase 3 is complete - invalidation just marks cache as stale

---

### Phase 3: Refactor File Tree to Use Queries

**Tasks:**
- [ ] Remove `items` state, derive from query cache
- [ ] Replace `loadDirectory()` with `useQuery` for root
- [ ] Replace `loadSubdirectory()` with conditional queries per directory
- [ ] Remove `refreshDirectoryContents()` - no longer needed
- [ ] Remove `expandToPath()` - no longer needed
- [ ] Build flat list from query cache for TanStack Virtual
- [ ] Test: Directory expansion/collapse works with queries

**File: `app/components/FileTree/VirtualizedFileTree.tsx`**

This is a **major refactor**. Here's the new structure:

**Helper function for query keys:**
```typescript
function getDirectoryQueryKey(path: string) {
  return ['directories', path] as const
}
```

**Replace state management (lines 98-101):**
```typescript
// OLD: Manual items state
// const [items, setItems] = useState<FileItem[]>([])

// NEW: Expansion state only (query cache holds data)
const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set())
const [loading, setLoading] = useState(false)
const [error, setError] = useState<string | null>(null)
const queryClient = useQueryClient()
```

**Root directory query:**
```typescript
// Query for root directory
const { data: rootItems = [], isLoading: rootLoading } = useQuery({
  queryKey: getDirectoryQueryKey(workingDirectory),
  queryFn: async () => {
    let files: any[]
    if (isElectronMode()) {
      if (typeof window !== 'undefined' && (window as any).fileAPI) {
        files = await (window as any).fileAPI.readDirectory(workingDirectory)
      } else {
        throw new Error('Electron mode but window.fileAPI not available')
      }
    } else if (isWebMode()) {
      const response = await fetch(`/api/files?path=${encodeURIComponent(workingDirectory)}`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      if (!data.success) throw new Error(data.error || 'Failed to load directory')
      files = data.files
    } else {
      throw new Error('Unknown deployment mode')
    }

    return files.map((file: any) => ({
      ...file,
      level: 0,
      isExpanded: false,
      children: [],
    }))
  },
  enabled: !!workingDirectory,
})
```

**Recursive query hook for nested directories:**
```typescript
// Custom hook to create queries for each expanded directory
function useDirectoryQuery(path: string, isExpanded: boolean, level: number) {
  return useQuery({
    queryKey: getDirectoryQueryKey(path),
    queryFn: async () => {
      let files: any[]
      if (isElectronMode()) {
        if (typeof window !== 'undefined' && (window as any).fileAPI) {
          files = await (window as any).fileAPI.readDirectory(path)
        } else {
          throw new Error('Electron mode but window.fileAPI not available')
        }
      } else if (isWebMode()) {
        const response = await fetch(`/api/files?path=${encodeURIComponent(path)}`)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const data = await response.json()
        if (!data.success) throw new Error(data.error || 'Failed to load directory')
        files = data.files
      } else {
        throw new Error('Unknown deployment mode')
      }

      return files.map((file: any) => ({
        ...file,
        level: level + 1,
        isExpanded: false,
        children: [],
      }))
    },
    enabled: isExpanded, // Only fetch when directory is expanded
  })
}
```

**Build flat list from query cache:**
```typescript
const flatList = useMemo(() => {
  const result: FileItem[] = []

  function buildFlatList(path: string, level: number) {
    const queryData = queryClient.getQueryData<FileItem[]>(getDirectoryQueryKey(path))
    if (!queryData) return

    queryData.forEach(item => {
      result.push({ ...item, level })

      if (item.isDirectory && expandedPaths.has(item.path)) {
        buildFlatList(item.path, level + 1)
      }
    })
  }

  if (workingDirectory) {
    buildFlatList(workingDirectory, 0)
  }

  return result
}, [workingDirectory, expandedPaths, queryClient, rootItems]) // rootItems triggers rebuild when queries update
```

**Toggle directory (simplified):**
```typescript
const toggleDirectory = (item: FileItem) => {
  setExpandedPaths(prev => {
    const next = new Set(prev)
    if (next.has(item.path)) {
      next.delete(item.path)
    } else {
      next.add(item.path)
      // Query automatically fetches when enabled becomes true
    }
    return next
  })
}
```

**Remove these functions (no longer needed):**
- `loadDirectory()` - Replaced by root query
- `loadSubdirectory()` - Replaced by conditional queries
- `refreshDirectoryContents()` - Replaced by query invalidation
- `expandToPath()` - Replaced by query invalidation in DesktopLayout

**Update ref methods:**
```typescript
useImperativeHandle(ref, () => ({
  // No longer needed - keeping for backward compatibility but they do nothing
  refreshDirectory: async (path: string) => {
    console.log('refreshDirectory called but TanStack Query handles this automatically')
  },
  expandToPath: async (filePath: string) => {
    console.log('expandToPath called but TanStack Query handles this automatically')
  }
}))
```

---

### Phase 4: Handle Edge Cases and Polish

**Tasks:**
- [ ] Test creating file in root directory (parentPath is empty string)
- [ ] Test deeply nested paths
- [ ] Test rapid file operations (multiple files created quickly)
- [ ] Add error boundaries for query failures
- [ ] Fine-tune staleTime based on usage

**Edge Case: Root Directory Files**
```typescript
// In DesktopLayout, handle root directory edge case
const pathParts = fileOpMessage.path.split('/')
pathParts.pop() // Remove filename
const parentPath = pathParts.join('/') || workingDirectory // Fallback to root if empty
```

**Error Handling:**
```typescript
// In VirtualizedFileTree, show error state
if (rootLoading) return <div>Loading...</div>
if (error) return <div>Error loading directory: {error.message}</div>
```

---

### Phase 5: Optional Optimizations

**Tasks:**
- [ ] Add optimistic updates for instant file appearance
- [ ] Add prefetching on directory hover
- [ ] Implement scroll-to-file after creation
- [ ] Add DevTools query filtering

**Optimistic Updates (Advanced):**
```typescript
// In DesktopLayout, before invalidation
const mutation = useMutation({
  mutationFn: () => Promise.resolve(), // No-op, agent already created file
  onMutate: async () => {
    await queryClient.cancelQueries({ queryKey: ['directories', parentPath] })

    const previousData = queryClient.getQueryData(['directories', parentPath])

    // Optimistically add file to cache
    queryClient.setQueryData(['directories', parentPath], (old: FileItem[] = []) => [
      ...old,
      {
        name: fileOpMessage.fileName,
        path: fileOpMessage.path,
        isDirectory: fileOpMessage.isDirectory,
        size: 0,
        modified: new Date().toISOString(),
        extension: fileOpMessage.fileName.includes('.')
          ? '.' + fileOpMessage.fileName.split('.').pop()
          : '',
      }
    ])

    return { previousData }
  },
  onError: (err, variables, context) => {
    // Rollback on error
    queryClient.setQueryData(['directories', parentPath], context.previousData)
  },
  onSettled: () => {
    // Refetch to ensure sync
    queryClient.invalidateQueries({ queryKey: ['directories', parentPath] })
  },
})
```

---

## Files to Modify Summary

1. ✅ **`package.json`** - Add TanStack Query dependencies
2. ✅ **`app/App.tsx`** - Setup QueryClient and provider
3. ✅ **`app/components/Layout/DesktopLayout.tsx`** - Replace expandToPath with query invalidation
4. ✅ **`app/components/FileTree/VirtualizedFileTree.tsx`** - Complete refactor to use queries

## Success Criteria

- [ ] **Use case 1**: Create ticket with directory + file → Both appear in expanded tree automatically
- [ ] **Use case 2**: Create file in open directory → File appears immediately via cache invalidation
- [ ] **Use case 3**: Update file → Preview updates without manual click
- [ ] No tree collapse/reset during operations
- [ ] Expansion state preserved
- [ ] Performance remains optimal with TanStack Virtual
- [ ] No race conditions
- [ ] DevTools show correct cache state

## Key Advantages

1. **Agent-controlled UX**: Keep `FileOperationMessage` pattern - agent decides when to show files
2. **Declarative cache invalidation**: `invalidateQueries()` instead of imperative `expandToPath()`
3. **No manual tree searching**: Query cache is the lookup map
4. **Automatic refetching**: Only when directory is expanded (enabled: isExpanded)
5. **Built-in error handling**: Query states (isLoading, isError)
6. **DevTools**: Visual debugging of cache
7. **Industry standard**: React ecosystem best practice

## Research References

- TanStack Query Docs: https://tanstack.com/query/latest/docs
- Query Keys: https://tanstack.com/query/latest/docs/framework/react/guides/query-keys
- Cache Invalidation: https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation
- Integration with TanStack Virtual: Proven pattern (2025 articles)

## Next Steps

1. **Start Phase 1**: Install packages, setup QueryClient
2. **Test Phase 1**: Verify DevTools appear
3. **Implement Phase 2**: Add query invalidation to DesktopLayout
4. **Test Phase 2**: Create file, check DevTools shows invalidation
5. **Implement Phase 3**: Refactor VirtualizedFileTree to use queries
6. **Test Phase 3**: Verify all three use cases work
7. **Deploy and verify in production**
