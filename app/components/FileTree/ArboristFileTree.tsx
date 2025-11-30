import { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react'
import { Tree, NodeApi, TreeApi } from 'react-arborist'
import { Folder, FileText, ChevronRight, ChevronDown } from 'lucide-react'
import useResizeObserver from 'use-resize-observer'

interface FileNode {
  id: string
  name: string
  children?: FileNode[]
  isFolder: boolean
  path: string
  size?: number
  modified?: string
  extension?: string
}

interface APIFileItem {
  name: string
  path: string
  isDirectory: boolean
  size: number
  modified: string
  extension: string
  parent?: string
}

interface ArboristFileTreeProps {
  workingDirectory: string
  onFileSelect: (file: FileNode) => void
  className?: string
  selectedFile?: FileNode | null
}

export interface ArboristFileTreeHandle {
  refreshTree: () => Promise<void>
}

// Transform flat API response to hierarchical tree structure
function transformToArboristFormat(apiFiles: APIFileItem[]): FileNode[] {
  const nodeMap = new Map<string, FileNode>()
  const rootNodes: FileNode[] = []

  // First pass: create all nodes
  apiFiles.forEach(file => {
    nodeMap.set(file.path, {
      id: file.path,
      name: file.name,
      isFolder: file.isDirectory,
      path: file.path,
      size: file.size,
      modified: file.modified,
      extension: file.extension,
      children: file.isDirectory ? [] : undefined
    })
  })

  // Second pass: build parent-child relationships
  apiFiles.forEach(file => {
    const node = nodeMap.get(file.path)!
    if (file.parent) {
      const parent = nodeMap.get(file.parent)
      if (parent && parent.children) {
        parent.children.push(node)
      } else {
        rootNodes.push(node)
      }
    } else {
      rootNodes.push(node)
    }
  })

  // Sort folders first, then files
  const sortNodes = (nodes: FileNode[]) => {
    nodes.sort((a, b) => {
      if (a.isFolder && !b.isFolder) return -1
      if (!a.isFolder && b.isFolder) return 1
      return a.name.localeCompare(b.name)
    })
    nodes.forEach(node => {
      if (node.children) sortNodes(node.children)
    })
  }

  sortNodes(rootNodes)
  return rootNodes
}

export const ArboristFileTree = forwardRef<ArboristFileTreeHandle, ArboristFileTreeProps>(({
  workingDirectory,
  onFileSelect,
  className = '',
  selectedFile
}, ref) => {
  const [data, setData] = useState<FileNode[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { ref: containerRef, width = 300, height = 600 } = useResizeObserver()
  const treeRef = useRef<TreeApi<FileNode>>(null)

  // Fetch directory data
  const refreshTree = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/files?path=${encodeURIComponent(workingDirectory)}`)
      if (!response.ok) {
        throw new Error(`Failed to load directory: ${response.statusText}`)
      }
      const data = await response.json()
      // Handle the API response format { success: boolean, files: FileItem[] }
      if (!data.success) {
        throw new Error(data.error || 'Failed to load directory')
      }
      const treeData = transformToArboristFormat(data.files || [])
      setData(treeData)
    } catch (error) {
      console.error('Failed to load file tree:', error)
      setError(error instanceof Error ? error.message : 'Failed to load directory')
    } finally {
      setLoading(false)
    }
  }, [workingDirectory])

  // Load initial data
  useEffect(() => {
    refreshTree()
  }, [refreshTree])

  // Expose refreshTree to parent components
  useImperativeHandle(ref, () => ({
    refreshTree
  }), [refreshTree])

  // File operation handlers
  const handleCreate = useCallback(async ({ parentId, index, type }: any) => {
    const parentNode = parentId ? data.find(n => n.id === parentId) : null
    const parentPath = parentNode ? parentNode.path : workingDirectory
    const isFolder = type === 'folder'
    const newName = prompt(`Enter ${isFolder ? 'folder' : 'file'} name:`)

    if (!newName) return

    const newPath = `${parentPath}/${newName}`

    try {
      const response = await fetch('/api/files/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: newPath,
          type: isFolder ? 'folder' : 'file'
        })
      })

      if (response.ok) {
        await refreshTree()
      } else {
        throw new Error('Failed to create item')
      }
    } catch (error) {
      console.error('Create failed:', error)
    }
  }, [data, workingDirectory, refreshTree])

  const handleDelete = useCallback(async ({ ids }: { ids: string[] }) => {
    if (!confirm(`Delete ${ids.length} item(s)?`)) return

    try {
      await Promise.all(
        ids.map(id =>
          fetch(`/api/files?path=${encodeURIComponent(id)}`, {
            method: 'DELETE'
          })
        )
      )
      await refreshTree()
    } catch (error) {
      console.error('Delete failed:', error)
    }
  }, [refreshTree])

  const handleRename = useCallback(async ({ id, name }: { id: string; name: string }) => {
    const segments = id.split('/')
    segments[segments.length - 1] = name
    const newPath = segments.join('/')

    try {
      const response = await fetch('/api/files/rename', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldPath: id,
          newPath
        })
      })

      if (response.ok) {
        await refreshTree()
      } else {
        throw new Error('Failed to rename')
      }
    } catch (error) {
      console.error('Rename failed:', error)
    }
  }, [refreshTree])

  const handleMove = useCallback(async ({ dragIds, parentId, index }: any) => {
    const parentNode = data.find(n => n.id === parentId)
    if (!parentNode || !parentNode.isFolder) return

    try {
      await Promise.all(
        dragIds.map((dragId: string) => {
          const segments = dragId.split('/')
          const name = segments[segments.length - 1]
          const newPath = `${parentNode.path}/${name}`

          return fetch('/api/files/move', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              oldPath: dragId,
              newPath
            })
          })
        })
      )
      await refreshTree()
    } catch (error) {
      console.error('Move failed:', error)
    }
  }, [data, refreshTree])

  // Custom node renderer with chevron for folders
  function FileNodeRenderer({ node, style, dragHandle }: any) {
    const isSelected = selectedFile?.path === node.data.path
    // Use node.isLeaf to determine if it's a file vs folder
    // node.isLeaf = true means it's a file (has no children)
    // node.isLeaf = false means it's a folder (can have children)
    const isFolder = !node.isLeaf
    const Icon = isFolder ? Folder : FileText

    return (
      <div
        style={style}
        ref={dragHandle}
        className={`
          flex items-center gap-1 px-2 py-1 cursor-pointer
          ${isSelected ? 'bg-blue-500 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}
          transition-colors duration-150
        `}
        onClick={(e) => {
          e.stopPropagation()
          if (node.isLeaf) {
            // It's a file, select it
            onFileSelect(node.data)
          } else {
            // It's a folder, toggle expansion
            node.toggle()
          }
        }}
      >
        {/* Chevron for folders */}
        {!node.isLeaf && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              node.toggle()
            }}
            className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
            style={{ marginLeft: '2px' }}
          >
            {node.isOpen ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </button>
        )}
        {/* If it's a file (leaf), add spacing to align with folders */}
        {node.isLeaf && <div className="w-4" />}
        <Icon className="w-4 h-4 flex-shrink-0" />
        <span className="truncate text-sm">{node.data.name}</span>
      </div>
    )
  }

  if (loading && data.length === 0) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center h-full gap-2 ${className}`}>
        <div className="text-red-500">Error loading files</div>
        <div className="text-sm text-gray-500">{error}</div>
        <button
          onClick={refreshTree}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div ref={containerRef} className={`h-full ${className}`}>
      <Tree
        ref={treeRef}
        data={data}
        openByDefault={false}
        width={width}
        height={height}
        rowHeight={28}
        indent={20}
        onActivate={(node) => {
          if (node.isLeaf) {
            onFileSelect(node.data)
          }
        }}
        onCreate={handleCreate}
        onDelete={handleDelete}
        onRename={handleRename}
        onMove={handleMove}
        searchTerm=""
        searchMatch={(node, term) =>
          node.data.name.toLowerCase().includes(term.toLowerCase())
        }
      >
        {FileNodeRenderer}
      </Tree>
    </div>
  )
})

ArboristFileTree.displayName = 'ArboristFileTree'

// Export type for use in other components
export type { FileNode }