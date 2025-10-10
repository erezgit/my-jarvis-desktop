import React, { useState, useEffect, useCallback, useMemo, memo, useImperativeHandle, forwardRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ChevronRight, ChevronDown, Folder, FolderOpen, File } from 'lucide-react'
import { JarvisOrb } from '../JarvisOrb'
import { isElectronMode, isWebMode } from '@/app/config/deployment'

interface FileItem {
  name: string
  path: string
  isDirectory: boolean
  size: number
  modified: string
  extension: string
  level?: number
  isExpanded?: boolean
  children?: FileItem[]
  parent?: FileItem
  content?: string
}

interface FileTreeProps {
  workingDirectory: string
  onFileSelect?: (file: FileItem) => void
  className?: string
}

// Utility function to combine class names (simple version)
function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

// Memoized file tree item component
const FileTreeItem = memo(({
  item,
  onToggle,
  onSelect,
  isSelected
}: {
  item: FileItem
  onToggle: (item: FileItem) => void
  onSelect: (item: FileItem) => void
  isSelected: boolean
}) => {
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (item.isDirectory) {
      onToggle(item)
    } else {
      onSelect(item)
    }
  }, [item, onToggle, onSelect])

  const Icon = item.isDirectory
    ? (item.isExpanded ? FolderOpen : Folder)
    : File

  const ChevronIcon = item.isExpanded ? ChevronDown : ChevronRight

  return (
    <div
      className={cn(
        "flex items-center gap-1 px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer select-none",
        isSelected && "bg-gray-100 dark:bg-gray-800"
      )}
      style={{ paddingLeft: `${(item.level || 0) * 16 + 8}px` }}
      onClick={handleClick}
    >
      {item.isDirectory && (
        <ChevronIcon className="h-4 w-4 shrink-0" />
      )}
      {!item.isDirectory && (
        <div className="w-4" />
      )}
      <Icon className="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" />
      <span className="truncate text-sm">{item.name}</span>
    </div>
  )
})

FileTreeItem.displayName = 'FileTreeItem'

export interface FileTreeRef {
  refreshDirectory: (path: string) => Promise<void>;
}

export const VirtualizedFileTree = forwardRef<FileTreeRef, FileTreeProps>(({
  workingDirectory,
  onFileSelect,
  className
}, ref) => {
  const [currentPath, setCurrentPath] = useState<string>('')
  const [items, setItems] = useState<FileItem[]>([])
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set())
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Expose refresh method to parent via ref
  useImperativeHandle(ref, () => ({
    refreshDirectory: async (path: string) => {
      await refreshDirectoryContents(path)
    }
  }))

  // Surgically refresh a specific directory without affecting the rest of the tree
  const refreshDirectoryContents = async (path: string) => {
    // Find the directory item in the current tree
    const findDirectory = (items: FileItem[], targetPath: string): FileItem | null => {
      for (const item of items) {
        if (item.path === targetPath && item.isDirectory) {
          return item;
        }
        if (item.children && item.children.length > 0) {
          const found = findDirectory(item.children, targetPath);
          if (found) return found;
        }
      }
      return null;
    };

    const targetDir = findDirectory(items, path);

    if (targetDir) {
      try {
        let files: any[]

        // Explicit deployment mode detection
        if (isElectronMode()) {
          // Electron mode: Use IPC via window.fileAPI
          if (typeof window !== 'undefined' && (window as any).fileAPI) {
            files = await (window as any).fileAPI.readDirectory(path)
          } else {
            throw new Error('Electron mode but window.fileAPI not available')
          }
        } else if (isWebMode()) {
          // Web mode: Use HTTP API
          const response = await fetch(`/api/files?path=${encodeURIComponent(path)}`)
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }
          const data = await response.json()
          if (!data.success) {
            throw new Error(data.error || 'Failed to load directory')
          }
          files = data.files
        } else {
          throw new Error('Unknown deployment mode')
        }

        const newChildren: FileItem[] = files.map((file: any) => ({
          ...file,
          level: (targetDir.level || 0) + 1,
          isExpanded: false,
          children: [],
          parent: targetDir
        }));

        // Update only this directory's children
        targetDir.children = newChildren;

        // Trigger re-render by creating a new array reference
        setItems([...items]);
      } catch (err) {
        console.error('Failed to refresh directory:', err);
      }
    }
  }

  // Load directory when workingDirectory changes
  useEffect(() => {
    if (workingDirectory) {
      loadDirectory(workingDirectory)
    }
  }, [workingDirectory])

  const loadDirectory = async (path: string) => {
    try {
      setLoading(true)
      setError(null)

      let files: any[]

      // Explicit deployment mode detection
      if (isElectronMode()) {
        // Electron mode: Use IPC via window.fileAPI
        if (typeof window !== 'undefined' && (window as any).fileAPI) {
          files = await (window as any).fileAPI.readDirectory(path)
        } else {
          throw new Error('Electron mode but window.fileAPI not available')
        }
      } else if (isWebMode()) {
        // Web mode: Use HTTP API
        const response = await fetch(`/api/files?path=${encodeURIComponent(path)}`)
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        const data = await response.json()
        if (!data.success) {
          throw new Error(data.error || 'Failed to load directory')
        }
        files = data.files
      } else {
        throw new Error('Unknown deployment mode')
      }

      // Format items for display
      const formattedItems: FileItem[] = files.map((file: any) => ({
        ...file,
        level: 0,
        isExpanded: false,
        children: []
      }))

      setItems(formattedItems)
      setCurrentPath(path)
    } catch (err) {
      setError('Failed to load directory')
      console.error('File tree load error:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadSubdirectory = async (parentItem: FileItem) => {
    try {
      let files: any[]

      // Explicit deployment mode detection
      if (isElectronMode()) {
        // Electron mode: Use IPC via window.fileAPI
        if (typeof window !== 'undefined' && (window as any).fileAPI) {
          files = await (window as any).fileAPI.readDirectory(parentItem.path)
        } else {
          throw new Error('Electron mode but window.fileAPI not available')
        }
      } else if (isWebMode()) {
        // Web mode: Use HTTP API
        const response = await fetch(`/api/files?path=${encodeURIComponent(parentItem.path)}`)
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        const data = await response.json()
        if (!data.success) {
          throw new Error(data.error || 'Failed to load subdirectory')
        }
        files = data.files
      } else {
        throw new Error('Unknown deployment mode')
      }

      const children: FileItem[] = files.map((file: any) => ({
        ...file,
        level: (parentItem.level || 0) + 1,
        isExpanded: false,
        children: [],
        parent: parentItem
      }))

      parentItem.children = children
      return children
    } catch (err) {
      console.error('Failed to load subdirectory:', err)
      return []
    }
  }

  const toggleDirectory = useCallback(async (item: FileItem) => {
    if (!item.isDirectory) return

    const isExpanded = expandedPaths.has(item.path)

    if (isExpanded) {
      // Collapse
      setExpandedPaths(prev => {
        const next = new Set(prev)
        next.delete(item.path)
        return next
      })
      item.isExpanded = false
    } else {
      // Expand - load subdirectory contents
      await loadSubdirectory(item)
      setExpandedPaths(prev => {
        const next = new Set(prev)
        next.add(item.path)
        return next
      })
      item.isExpanded = true
    }

    // Force re-render
    setItems([...items])
  }, [items, expandedPaths])

  const selectFile = useCallback(async (item: FileItem) => {
    setSelectedFile(item)
    if (onFileSelect) {
      // Read file content if it's a file
      if (!item.isDirectory) {
        try {
          let fileContent: string = ''

          // Explicit deployment mode detection
          if (isElectronMode()) {
            // Electron mode: Use IPC via window.fileAPI
            if (typeof window !== 'undefined' && (window as any).fileAPI) {
              const fileData = await (window as any).fileAPI.readFile(item.path)
              if (fileData) {
                fileContent = fileData.content
              }
            } else {
              throw new Error('Electron mode but window.fileAPI not available')
            }
          } else if (isWebMode()) {
            // Web mode: Use HTTP API
            const response = await fetch(`/api/files/read?path=${encodeURIComponent(item.path)}`)
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`)
            }
            const data = await response.json()
            if (!data.success) {
              throw new Error(data.error || 'Failed to read file')
            }
            fileContent = data.content
          } else {
            throw new Error('Unknown deployment mode')
          }

          onFileSelect({ ...item, content: fileContent })
        } catch (error) {
          console.error('Error reading file:', error)
          onFileSelect(item)
        }
      } else {
        // If it's a directory, toggle it
        await toggleDirectory(item)
        onFileSelect(item)
      }
    }
  }, [onFileSelect, toggleDirectory])

  const selectNewDirectory = async () => {
    if (typeof window !== 'undefined' && (window as any).fileAPI) {
      const newPath = await (window as any).fileAPI.selectDirectory()
      if (newPath) {
        await loadDirectory(newPath)
      }
    } else {
      console.log('Directory selector not available')
    }
  }

  // Flatten the tree for virtualization
  const flattenedItems = useMemo(() => {
    const result: FileItem[] = []

    const flatten = (items: FileItem[]) => {
      for (const item of items) {
        result.push(item)
        if (item.isDirectory && item.isExpanded && item.children) {
          flatten(item.children)
        }
      }
    }

    flatten(items)
    return result
  }, [items, expandedPaths])

  // Set up virtualizer
  const parentRef = React.useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: flattenedItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32, // Height of each item
    overscan: 5
  })

  // Extract folder name from path
  const folderName = useMemo(() => {
    if (!currentPath) return 'No folder selected'
    const parts = currentPath.split('/')
    return parts[parts.length - 1] || parts[parts.length - 2] || 'Root'
  }, [currentPath])

  return (
    <div className={cn("flex flex-col h-full bg-neutral-50 dark:bg-neutral-900", className)}>
      {/* Fixed header */}
      <div className="h-[60px] flex items-center gap-2 px-4 flex-shrink-0">
        <JarvisOrb />
        <button
          onClick={selectNewDirectory}
          className="text-sm font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left"
        >
          {folderName}
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div className="px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
          Loading...
        </div>
      )}

      {/* Virtualized file list */}
      <div
        ref={parentRef}
        className="flex-1 overflow-auto"
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative'
          }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const item = flattenedItems[virtualItem.index]
            return (
              <div
                key={virtualItem.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`
                }}
              >
                <FileTreeItem
                  item={item}
                  onToggle={toggleDirectory}
                  onSelect={selectFile}
                  isSelected={selectedFile?.path === item.path}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
})

VirtualizedFileTree.displayName = 'VirtualizedFileTree'