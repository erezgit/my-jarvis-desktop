import React, { useState, useEffect, useCallback, useMemo, memo } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ChevronRight, ChevronDown, Folder, FolderOpen, File } from 'lucide-react'
import { cn } from '@/lib/utils'

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
}

interface FileTreeProps {
  onFileSelect?: (file: FileItem) => void
  className?: string
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
        "flex items-center gap-1 px-2 py-1 hover:bg-accent cursor-pointer select-none",
        isSelected && "bg-accent"
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
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="truncate text-sm">{item.name}</span>
    </div>
  )
})

FileTreeItem.displayName = 'FileTreeItem'

export const VirtualizedFileTree: React.FC<FileTreeProps> = ({ 
  onFileSelect,
  className 
}) => {
  const [currentPath, setCurrentPath] = useState<string>('')
  const [items, setItems] = useState<FileItem[]>([])
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set())
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load initial directory (home directory)
  useEffect(() => {
    loadHomeDirectory()
  }, [])

  const loadHomeDirectory = async () => {
    try {
      setLoading(true)
      setError(null)
      const homePath = await window.fileAPI.getHomeDir()
      await loadDirectory(homePath)
    } catch (err) {
      setError('Failed to load home directory')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadDirectory = async (path: string) => {
    try {
      setLoading(true)
      setError(null)
      const files = await window.fileAPI.readDirectory(path)
      
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
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadSubdirectory = async (parentItem: FileItem) => {
    try {
      const files = await window.fileAPI.readDirectory(parentItem.path)
      
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
      // Expand
      if (!item.children || item.children.length === 0) {
        await loadSubdirectory(item)
      }
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
      // Read the file content when it's selected
      if (!item.isDirectory) {
        try {
          const fileData = await window.fileAPI.readFile(item.path)
          if (fileData) {
            // Pass the file data with content to the parent
            onFileSelect({ ...item, content: fileData.content })
          }
        } catch (error) {
          console.error('Error reading file:', error)
          onFileSelect(item)
        }
      } else {
        onFileSelect(item)
      }
    }
  }, [onFileSelect])

  const selectNewDirectory = async () => {
    const newPath = await window.fileAPI.selectDirectory()
    if (newPath) {
      await loadDirectory(newPath)
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
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header with clickable folder name */}
      <div className="border-b px-3 py-2">
        <button
          onClick={selectNewDirectory}
          className="text-sm font-medium hover:text-primary transition-colors text-left"
        >
          {folderName}
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div className="px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="px-3 py-2 text-sm text-muted-foreground">
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
}