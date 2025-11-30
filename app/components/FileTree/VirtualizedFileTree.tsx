import React, { useRef, useImperativeHandle, forwardRef, useCallback, useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronRight, ChevronDown, Folder, FolderOpen, File } from 'lucide-react'
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

// VSCode Explorer pattern - TreeNode matches their Item interface
interface TreeNode {
  id: string  // path serves as unique id
  name: string
  type: 'folder' | 'file'  // VSCode pattern uses type instead of isDirectory
  parent: string  // parent path for hierarchy
  path: string
  size: number
  modified: string
  extension: string
  children?: TreeNode[]  // populated by getFiles function
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

// VSCode Explorer pattern - TreeItem component with full props
interface TreeItemProps {
  item: TreeNode
  expandedItem?: TreeNode
  onExpand: (item: TreeNode) => void
  onFileSelect?: (item: TreeNode) => void
  level?: number
  allItems: TreeNode[]  // VSCode pattern - access to all items
  updateFolder: (updatedFolder: TreeNode[]) => void  // VSCode pattern - tree update function
  getFiles: () => TreeNode[]  // VSCode pattern - rebuild tree function
}

function TreeItem({ item, expandedItem, onExpand, onFileSelect, level = 0, allItems, updateFolder, getFiles }: TreeItemProps) {
  // VSCode pattern: Direct condition evaluation, no derived boolean
  const Icon = item.type === 'folder'
    ? (expandedItem?.id === item.id ? FolderOpen : Folder)
    : File
  const ChevronIcon = expandedItem?.id === item.id ? ChevronDown : ChevronRight

  const handleClick = () => {
    if (item.type === 'folder') {
      onExpand(item)
    } else {
      onFileSelect?.(item)
    }
  }

  return (
    <div>
      <div
        onClick={handleClick}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        className={cn(
          "flex items-center gap-1 px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer select-none",
          expandedItem?.id === item.id && "bg-white dark:bg-gray-700"
        )}
      >
        {item.type === 'folder' && (
          <ChevronIcon className="h-4 w-4 shrink-0" />
        )}
        {item.type === 'file' && (
          <div className="w-4" />
        )}
        <Icon className="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" />
        <span className="truncate text-sm">{item.name}</span>
      </div>

      {/* Render children when expanded - VSCode pattern: direct condition evaluation */}
      {expandedItem?.id === item.id && item.children && (
        <div>
          {item.children.length > 0 ? (
            item.children.map((child) => (
              <TreeItem
                key={child.id}
                item={child}
                expandedItem={expandedItem}
                onExpand={onExpand}
                onFileSelect={onFileSelect}
                level={level + 1}
                allItems={allItems}
                updateFolder={updateFolder}
                getFiles={getFiles}
              />
            ))
          ) : (
            <div style={{ paddingLeft: `${(level + 1) * 16 + 8}px` }} className="text-sm text-gray-500 py-1">
              No files found
            </div>
          )}
        </div>
      )}
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
  const queryClient = useQueryClient()

  // VSCode Explorer pattern - controlled state
  const [items, setItems] = useState<TreeNode[]>([])
  const [expandedItem, setExpandedItem] = useState<TreeNode>()
  const [allItems, setAllItems] = useState<TreeNode[]>([])

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

  // Transform FileItem[] to TreeNode[] (VSCode pattern)
  const transformToTreeNodes = useCallback((files: FileItem[], parentPath: string): TreeNode[] => {
    return files.map(file => ({
      id: file.path,
      name: file.name,
      type: file.isDirectory ? 'folder' : 'file',
      parent: parentPath,
      path: file.path,
      size: file.size,
      modified: file.modified,
      extension: file.extension,
      children: file.isDirectory ? [] : undefined
    }))
  }, [])

  // VSCode Explorer pattern - getFiles function rebuilds entire tree
  const getFiles = useCallback((): TreeNode[] => {
    // VSCode Pattern: Force complete object recreation via JSON stringify/parse
    const allStorageItems: TreeNode[] = JSON.parse(JSON.stringify(allItems))
    let filteredItems = allStorageItems.filter((item) => item.parent === workingDirectory)

    const itemsWithChildren: TreeNode[] = []
    filteredItems.forEach((item) => {
      if (item.type === 'folder') {
        const children = allStorageItems.filter(child => child.parent === item.id)
        item.children = children
      }
      itemsWithChildren.push(item)
    })

    return itemsWithChildren
  }, [allItems, workingDirectory])

  // VSCode Explorer pattern - updateFolder function
  const updateFolder = useCallback((updatedItems: TreeNode[]) => {
    setItems(updatedItems)
  }, [])

  // VSCode Explorer pattern - handleExpandFolder
  const handleExpandFolder = useCallback(async (item: TreeNode) => {
    // Toggle expansion
    if (expandedItem) {
      expandedItem.id === item.id ? setExpandedItem(undefined) : setExpandedItem(item)
    } else {
      setExpandedItem(item)
    }

    // Load children if folder and not already loaded
    if (item.type === 'folder' && (!item.children || item.children.length === 0)) {
      try {
        // Check cache first
        const cachedData = queryClient.getQueryData(getDirectoryQueryKey(item.path))

        let files: FileItem[]
        if (cachedData) {
          files = cachedData as FileItem[]
        } else {
          // Fetch from API
          files = await fetchDirectory(item.path)
          // Cache the data
          queryClient.setQueryData(getDirectoryQueryKey(item.path), files)
        }

        const children = transformToTreeNodes(files, item.path)

        // Update allItems with new children
        const updatedAllItems = [...allItems]
        children.forEach(child => {
          const existingIndex = updatedAllItems.findIndex(existing => existing.id === child.id)
          if (existingIndex >= 0) {
            updatedAllItems[existingIndex] = child
          } else {
            updatedAllItems.push(child)
          }
        })
        setAllItems(updatedAllItems)

        // Update the tree
        const updatedFiles = getFiles()
        updateFolder(updatedFiles)
      } catch (error) {
        console.error('Error loading folder:', error)
      }
    }
  }, [expandedItem, queryClient, transformToTreeNodes, allItems, getFiles, updateFolder])

  // VSCode Explorer pattern - handle file selection
  const handleFileSelect = useCallback(async (item: TreeNode) => {
    if (!onFileSelect || item.type === 'folder') return

    // Read file content for text files
    const binaryExtensions = ['.pdf', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.zip', '.tar', '.gz']
    if (binaryExtensions.includes(item.extension.toLowerCase())) {
      // Pass item without content - FilePreview will handle streaming
      onFileSelect({
        name: item.name,
        path: item.path,
        isDirectory: false,
        size: item.size,
        modified: item.modified,
        extension: item.extension
      })
      return
    }

    try {
      let fileContent: string = ''

      if (isElectronMode()) {
        if (typeof window !== 'undefined' && (window as any).fileAPI) {
          const data = await (window as any).fileAPI.readFile(item.path)
          if (data) fileContent = data.content
        }
      } else if (isWebMode()) {
        const response = await fetch(`/api/files/read?path=${encodeURIComponent(item.path)}`)
        if (response.ok) {
          const data = await response.json()
          if (data.success) fileContent = data.content
        }
      }

      onFileSelect({
        name: item.name,
        path: item.path,
        isDirectory: false,
        size: item.size,
        modified: item.modified,
        extension: item.extension,
        content: fileContent
      })
    } catch (error) {
      console.error('Error reading file:', error)
      onFileSelect({
        name: item.name,
        path: item.path,
        isDirectory: false,
        size: item.size,
        modified: item.modified,
        extension: item.extension
      })
    }
  }, [onFileSelect])

  // Initialize tree when root files load
  useEffect(() => {
    if (rootFiles) {
      const transformedItems = transformToTreeNodes(rootFiles, workingDirectory)
      setAllItems(transformedItems)
      setItems(transformedItems)
    }
  }, [rootFiles, workingDirectory, transformToTreeNodes])

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    refreshDirectory: async (path: string) => {
      // Invalidate and refetch the directory
      await queryClient.invalidateQueries({
        queryKey: getDirectoryQueryKey(path),
        exact: true,
      })

      // VSCode pattern - update via controlled state
      const files = await fetchDirectory(path)
      queryClient.setQueryData(getDirectoryQueryKey(path), files)
      const children = transformToTreeNodes(files, path)

      // Update allItems
      const updatedAllItems = [...allItems]
      children.forEach(child => {
        const existingIndex = updatedAllItems.findIndex(existing => existing.id === child.id)
        if (existingIndex >= 0) {
          updatedAllItems[existingIndex] = child
        } else {
          updatedAllItems.push(child)
        }
      })
      setAllItems(updatedAllItems)

      // FIX: Use updated allItems directly
      const getFilesFromItems = (itemsArray: TreeNode[]): TreeNode[] => {
        // VSCode Pattern: Force complete object recreation via JSON stringify/parse
        // This ensures React sees entirely new object references
        const allStorageItems: TreeNode[] = JSON.parse(JSON.stringify(itemsArray))
        let filteredItems = allStorageItems.filter((item) => item.parent === workingDirectory)

        const itemsWithChildren: TreeNode[] = []
        filteredItems.forEach((item) => {
          if (item.type === 'folder') {
            const children = allStorageItems.filter(child => child.parent === item.id)
            item.children = children
          }
          itemsWithChildren.push(item)
        })

        return itemsWithChildren
      }

      const updatedFiles = getFilesFromItems(updatedAllItems)
      updateFolder(updatedFiles)
    },
    expandToPath: async (filePath: string) => {
      console.log('[expandToPath] Called with:', filePath)

      // VSCode Pattern: Refresh ALL ancestor directories
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
        // Special handling for root directory
        if (!immediateParent || immediateParent === '') {
          console.log('[expandToPath] Root directory detected - refreshing entire tree')
          // Refresh the entire tree from workingDirectory
          const rootFiles = await fetchDirectory(workingDirectory)
          console.log('[expandToPath] Root has', rootFiles.length, 'files')

          // Update the query cache
          queryClient.setQueryData(getDirectoryQueryKey(workingDirectory), rootFiles)

          // VSCode pattern - update via controlled state
          const transformedItems = transformToTreeNodes(rootFiles, workingDirectory)
          setAllItems(transformedItems)
          setItems(transformedItems)
          console.log('[expandToPath] Root tree refreshed successfully')
          return
        }

        // Refresh grandparent first (to show the new folder appeared)
        if (grandParent && grandParent !== workingDirectory) {
          console.log('[expandToPath] Refreshing grandparent:', grandParent)
          const grandParentFiles = await fetchDirectory(grandParent)
          console.log('[expandToPath] Grandparent has', grandParentFiles.length, 'items')
          queryClient.setQueryData(getDirectoryQueryKey(grandParent), grandParentFiles)
        }

        // Then refresh immediate parent (to show the new file)
        console.log('[expandToPath] Refreshing immediate parent:', immediateParent)
        const files = await fetchDirectory(immediateParent)
        console.log('[expandToPath] Immediate parent has', files.length, 'files')

        queryClient.setQueryData(getDirectoryQueryKey(immediateParent), files)
        const children = transformToTreeNodes(files, immediateParent)

        // Update allItems with refreshed data
        const updatedAllItems = [...allItems]
        children.forEach(child => {
          const existingIndex = updatedAllItems.findIndex(existing => existing.id === child.id)
          if (existingIndex >= 0) {
            updatedAllItems[existingIndex] = child
          } else {
            updatedAllItems.push(child)
          }
        })
        setAllItems(updatedAllItems)

        // FIX: Use updated allItems directly instead of waiting for React state
        const getFilesFromItems = (itemsArray: TreeNode[]): TreeNode[] => {
          // VSCode Pattern: Force complete object recreation via JSON stringify/parse
          // This ensures React sees entirely new object references
          const allStorageItems: TreeNode[] = JSON.parse(JSON.stringify(itemsArray))
          let filteredItems = allStorageItems.filter((item) => item.parent === workingDirectory)

          const itemsWithChildren: TreeNode[] = []
          filteredItems.forEach((item) => {
            if (item.type === 'folder') {
              const children = allStorageItems.filter(child => child.parent === item.id)
              item.children = children
            }
            itemsWithChildren.push(item)
          })

          return itemsWithChildren
        }

        // VSCode pattern - update via controlled state using updated items directly
        const updatedFiles = getFilesFromItems(updatedAllItems)
        updateFolder(updatedFiles)
        console.log('[expandToPath] Updated tree data')
      } catch (error) {
        console.log('[expandToPath] Error:', error)
      }
    }
  }), [queryClient, transformToTreeNodes, workingDirectory, allItems, getFiles, updateFolder])

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
      <div className="h-[60px] flex items-center gap-2 px-4 flex-shrink-0">
        <JarvisOrb />
        <button
          onClick={selectNewDirectory}
          className="text-sm font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left truncate"
        >
          {folderName}
        </button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
          Loading...
        </div>
      )}

      {/* VSCode Explorer Pattern - Simple tree rendering */}
      {!isLoading && items.length > 0 && (
        <div className="flex-1 overflow-auto">
          {items.map((item) => (
            <TreeItem
              key={item.id}
              item={item}
              expandedItem={expandedItem}
              onExpand={handleExpandFolder}
              onFileSelect={handleFileSelect}
              level={0}
              allItems={allItems}
              updateFolder={updateFolder}
              getFiles={getFiles}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && items.length === 0 && (
        <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
          No files found
        </div>
      )}
    </div>
  )
})

VirtualizedFileTree.displayName = 'VirtualizedFileTree'