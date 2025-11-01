import React, { useRef, useImperativeHandle, forwardRef, useCallback, useState, useEffect } from 'react'
import { Tree, NodeRendererProps } from 'react-arborist'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronRight, ChevronDown, Folder, FolderOpen, File } from 'lucide-react'
import useResizeObserver from 'use-resize-observer'
import { JarvisOrb } from '../JarvisOrb'
import { FileUploadButton } from '../chat/FileUploadButton'
import { isElectronMode, isWebMode } from '@/app/config/deployment'

// Helper to create consistent query keys for directories
function getDirectoryQueryKey(path: string) {
  return ['directories', path] as const
}

interface FileItem {
  name: string
  path: string
  isDirectory: boolean
  size: number
  modified: string
  extension: string
  content?: string
}

// React Arborist expects data with 'id' and 'children'
interface TreeNode {
  id: string
  name: string
  isDirectory: boolean
  path: string
  size: number
  modified: string
  extension: string
  children?: TreeNode[]
}

interface FileTreeProps {
  workingDirectory: string
  onFileSelect?: (file: FileItem) => void
  onFileUpload?: (file: File) => void
  className?: string
}

// Utility function to combine class names
function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

// Helper to immutably update a node's children in the tree
function updateNodeChildren(nodes: TreeNode[], nodeId: string, newChildren: TreeNode[]): TreeNode[] {
  // Create a completely new array with new object references at every level
  return nodes.map(node => {
    if (node.id === nodeId) {
      // Found the target node - merge children while preserving isOpen state
      // Create a map of old children by id for quick lookup
      const oldChildrenMap = new Map(
        (node.children || []).map(child => [child.id, child])
      )

      // Merge new children with old state
      const mergedChildren = newChildren.map(newChild => {
        const oldChild = oldChildrenMap.get(newChild.id)
        if (oldChild) {
          // Preserve isOpen and children from old node, but update data
          return {
            ...newChild,
            isOpen: oldChild.isOpen,
            // If the old child has loaded children, keep them unless new child has different children
            children: oldChild.children && oldChild.children.length > 0 ? oldChild.children : newChild.children
          }
        }
        return newChild
      })

      return { ...node, children: mergedChildren }
    }
    if (node.children && node.children.length > 0) {
      // Recursively search in children - create new object even if children don't change
      const updatedChildren = updateNodeChildren(node.children, nodeId, newChildren)
      // Always return new object reference to trigger React re-render
      return { ...node, children: updatedChildren }
    }
    // Return new object reference for leaf nodes too
    return { ...node }
  })
}

// Custom Node Renderer with Tailwind styling
function CustomNode({ node, style, dragHandle }: NodeRendererProps<TreeNode>) {
  const Icon = node.data.isDirectory
    ? (node.isOpen ? FolderOpen : Folder)
    : File

  const ChevronIcon = node.isOpen ? ChevronDown : ChevronRight

  return (
    <div
      ref={dragHandle}
      style={style}
      onClick={() => node.isInternal && node.toggle()}
      className={cn(
        "flex items-center gap-1 px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer select-none",
        node.isSelected && "bg-gray-100 dark:bg-gray-800"
      )}
    >
      {node.data.isDirectory && (
        <ChevronIcon className="h-4 w-4 shrink-0" />
      )}
      {!node.data.isDirectory && (
        <div className="w-4" />
      )}
      <Icon className="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" />
      <span className="truncate text-sm">{node.data.name}</span>
    </div>
  )
}

export interface FileTreeRef {
  refreshDirectory: (path: string) => Promise<void>
  expandToPath: (filePath: string) => Promise<void>
}

export const VirtualizedFileTree = forwardRef<FileTreeRef, FileTreeProps>(({
  workingDirectory,
  onFileSelect,
  onFileUpload,
  className
}, ref) => {
  const treeRef = useRef<any>(null)
  const queryClient = useQueryClient()

  // Use resize observer to get actual pixel dimensions for React Arborist
  const { ref: containerRef, width = 1, height = 1 } = useResizeObserver()

  // Fetch directory contents
  const fetchDirectory = async (path: string): Promise<FileItem[]> => {
    if (isWebMode()) {
      const response = await fetch(`/api/files?path=${encodeURIComponent(path)}`)
      const data = await response.json()
      if (!data.success) throw new Error(data.error || 'Failed to load directory')
      return data.files
    } else if (isElectronMode()) {
      if (typeof window !== 'undefined' && (window as any).fileAPI) {
        return await (window as any).fileAPI.readDirectory(path)
      }
      throw new Error('window.fileAPI not available')
    }
    throw new Error('Unknown deployment mode')
  }

  // Root directory query
  const { data: rootFiles, isLoading, error } = useQuery({
    queryKey: getDirectoryQueryKey(workingDirectory),
    queryFn: () => fetchDirectory(workingDirectory),
    enabled: !!workingDirectory,
  })

  console.log('[FILE_TREE_DEBUG] workingDirectory:', workingDirectory)
  console.log('[FILE_TREE_DEBUG] rootFiles:', rootFiles)
  console.log('[FILE_TREE_DEBUG] isLoading:', isLoading)
  console.log('[FILE_TREE_DEBUG] error:', error)

  // Transform FileItem[] to TreeNode[] for React Arborist
  const transformToTreeNodes = useCallback((files: FileItem[], parentPath: string): TreeNode[] => {
    return files.map(file => ({
      id: file.path,
      name: file.name,
      isDirectory: file.isDirectory,
      path: file.path,
      size: file.size,
      modified: file.modified,
      extension: file.extension,
      children: file.isDirectory ? [] : undefined // Directories have children array, files don't
    }))
  }, [])

  // State variable for tree data (controlled mode)
  const [treeData, setTreeData] = useState<TreeNode[]>([])

  // Sync treeData state with rootFiles from query
  useEffect(() => {
    if (rootFiles) {
      setTreeData(transformToTreeNodes(rootFiles, workingDirectory))
    }
  }, [rootFiles, workingDirectory, transformToTreeNodes])

  console.log('[FILE_TREE_DEBUG] treeData length:', treeData.length)

  // Load children when a directory is opened
  const onToggle = useCallback(async (nodeId: string) => {
    const node = treeRef.current?.get(nodeId)
    if (!node || !node.data.isDirectory) return

    // Check if already loaded
    if (node.children && node.children.length > 0) return

    // Check cache first
    const cachedData = queryClient.getQueryData(getDirectoryQueryKey(node.data.path))

    let files: FileItem[]
    if (cachedData) {
      files = cachedData as FileItem[]
    } else {
      // Fetch from API
      files = await fetchDirectory(node.data.path)
      // Cache the data
      queryClient.setQueryData(getDirectoryQueryKey(node.data.path), files)
    }

    const children = transformToTreeNodes(files, node.data.path)

    // ✅ FIXED: Immutable update using setState (controlled mode)
    setTreeData(prevData => updateNodeChildren(prevData, nodeId, children))
  }, [queryClient, transformToTreeNodes])

  // Handle node selection
  const onSelect = useCallback(async (nodes: any[]) => {
    if (!onFileSelect || nodes.length === 0) return

    const node = nodes[0]
    const fileData = node.data

    if (!fileData.isDirectory) {
      // Read file content for text files
      const binaryExtensions = ['.pdf', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.zip', '.tar', '.gz']
      if (binaryExtensions.includes(fileData.extension.toLowerCase())) {
        // Pass item without content - FilePreview will handle streaming
        onFileSelect({
          name: fileData.name,
          path: fileData.path,
          isDirectory: false,
          size: fileData.size,
          modified: fileData.modified,
          extension: fileData.extension
        })
        return
      }

      try {
        let fileContent: string = ''

        if (isElectronMode()) {
          if (typeof window !== 'undefined' && (window as any).fileAPI) {
            const data = await (window as any).fileAPI.readFile(fileData.path)
            if (data) fileContent = data.content
          }
        } else if (isWebMode()) {
          const response = await fetch(`/api/files/read?path=${encodeURIComponent(fileData.path)}`)
          if (response.ok) {
            const data = await response.json()
            if (data.success) fileContent = data.content
          }
        }

        onFileSelect({
          name: fileData.name,
          path: fileData.path,
          isDirectory: false,
          size: fileData.size,
          modified: fileData.modified,
          extension: fileData.extension,
          content: fileContent
        })
      } catch (error) {
        console.error('Error reading file:', error)
        onFileSelect({
          name: fileData.name,
          path: fileData.path,
          isDirectory: false,
          size: fileData.size,
          modified: fileData.modified,
          extension: fileData.extension
        })
      }
    }
  }, [onFileSelect])

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    refreshDirectory: async (path: string) => {
      // Invalidate and refetch the directory
      await queryClient.invalidateQueries({
        queryKey: getDirectoryQueryKey(path),
        exact: true,
      })

      // Refresh the directory in the tree
      const node = treeRef.current?.get(path)
      if (node && node.data.isDirectory) {
        const files = await fetchDirectory(path)
        queryClient.setQueryData(getDirectoryQueryKey(path), files)
        const children = transformToTreeNodes(files, path)

        // ✅ FIXED: Immutable update using setState
        setTreeData(prevData => updateNodeChildren(prevData, path, children))
      }
    },
    expandToPath: async (filePath: string) => {
      console.log('[expandToPath] Called with:', filePath)

      // VSCode Pattern: Refresh ALL ancestor directories
      // Example: /workspace/tickets/050-foo/file.md
      // We need to refresh BOTH:
      // 1. /workspace/tickets (to show the 050-foo folder)
      // 2. /workspace/tickets/050-foo (to show the file)

      const pathParts = filePath.split('/')
      pathParts.pop() // Remove filename
      const immediateParent = pathParts.join('/') // e.g., /workspace/tickets/050-foo

      // Get grandparent directory
      const grandParentParts = [...pathParts]
      grandParentParts.pop() // Remove folder name
      const grandParent = grandParentParts.join('/') // e.g., /workspace/tickets

      console.log('[expandToPath] Immediate parent:', immediateParent)
      console.log('[expandToPath] Grandparent:', grandParent)

      try {
        // Refresh grandparent first (to show the new folder appeared)
        if (grandParent && grandParent !== workingDirectory) {
          console.log('[expandToPath] Refreshing grandparent:', grandParent)
          const grandParentFiles = await fetchDirectory(grandParent)
          console.log('[expandToPath] Grandparent has', grandParentFiles.length, 'items')
          queryClient.setQueryData(getDirectoryQueryKey(grandParent), grandParentFiles)
          const grandParentChildren = transformToTreeNodes(grandParentFiles, grandParent)
          setTreeData(prevData => updateNodeChildren(prevData, grandParent, grandParentChildren))
        }

        // Then refresh immediate parent (to show the new file)
        console.log('[expandToPath] Refreshing immediate parent:', immediateParent)
        const files = await fetchDirectory(immediateParent)
        console.log('[expandToPath] Immediate parent has', files.length, 'files')

        queryClient.setQueryData(getDirectoryQueryKey(immediateParent), files)
        const children = transformToTreeNodes(files, immediateParent)

        setTreeData(prevData => updateNodeChildren(prevData, immediateParent, children))
        console.log('[expandToPath] Updated tree data')

        // That's it! No expanding, no scrolling, no selecting
        // The directories will show the new content if they're already open
        // If they're closed, they stay closed (respecting user's tree state)
      } catch (error) {
        console.log('[expandToPath] Error:', error)
      }
    }
  }), [queryClient, transformToTreeNodes])

  const selectNewDirectory = async () => {
    if (typeof window !== 'undefined' && (window as any).fileAPI) {
      const newPath = await (window as any).fileAPI.selectDirectory()
      if (newPath) {
        // Trigger refresh by invalidating root query
        await queryClient.invalidateQueries({
          queryKey: getDirectoryQueryKey(newPath),
        })
      }
    }
  }

  // Extract folder name from path
  const folderName = React.useMemo(() => {
    if (!workingDirectory) return 'No folder selected'
    const parts = workingDirectory.split('/')
    return parts[parts.length - 1] || parts[parts.length - 2] || 'Root'
  }, [workingDirectory])

  if (error) {
    return (
      <div className={cn("flex flex-col h-full bg-neutral-50 dark:bg-neutral-900", className)}>
        <div className="px-3 py-2 text-sm text-red-600 dark:text-red-400">
          Failed to load directory
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col h-full bg-neutral-50 dark:bg-neutral-900", className)}>
      {/* Fixed header */}
      <div className="h-[60px] flex items-center gap-2 px-4 flex-shrink-0 justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <JarvisOrb />
          <button
            onClick={selectNewDirectory}
            className="text-sm font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left truncate"
          >
            {folderName}
          </button>
        </div>
        {onFileUpload && (
          <FileUploadButton
            onFileSelect={onFileUpload}
            disabled={false}
          />
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
          Loading...
        </div>
      )}

      {/* React Arborist Tree */}
      {!isLoading && treeData.length > 0 && (
        <div ref={containerRef} className="flex-1 overflow-hidden">
          <Tree
            ref={treeRef}
            data={treeData}
            openByDefault={false}
            width={width}
            height={height}
            indent={16}
            rowHeight={32}
            overscanCount={10}
            onToggle={onToggle}
            onSelect={onSelect}
          >
            {CustomNode}
          </Tree>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && treeData.length === 0 && (
        <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
          No files found
        </div>
      )}
    </div>
  )
})

VirtualizedFileTree.displayName = 'VirtualizedFileTree'
