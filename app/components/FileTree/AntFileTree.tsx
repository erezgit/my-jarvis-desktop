import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'
import { Tree } from 'antd'
import { FileText, Folder } from 'lucide-react'
import type { TreeDataNode, TreeProps, EventDataNode } from 'antd/es/tree'

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
  children?: APIFileItem[]
}

interface AntFileTreeProps {
  workingDirectory: string
  onFileSelect: (file: FileNode) => void
  className?: string
  selectedFile?: FileNode | null
}

export interface AntFileTreeHandle {
  refreshTree: () => Promise<void>
  refreshNode: (path: string) => Promise<void>
}

// Transform API response to Ant Tree format
function transformToAntTreeData(apiFiles: APIFileItem[]): TreeDataNode[] {
  return apiFiles.map(file => {
    const node: TreeDataNode = {
      key: file.path,
      title: file.name,
      isLeaf: !file.isDirectory,
      icon: file.isDirectory ? <Folder className="w-4 h-4" /> : <FileText className="w-4 h-4" />,
      // Store original data for later use
      data: {
        name: file.name,
        path: file.path,
        isFolder: file.isDirectory,
        size: file.size,
        modified: file.modified,
        extension: file.extension
      }
    }

    // If has children, transform them recursively
    if (file.children && file.children.length > 0) {
      node.children = transformToAntTreeData(file.children)
    } else if (file.isDirectory) {
      // Directory without children - will be loaded lazily
      node.children = undefined
    }

    return node
  })
}

export const AntFileTree = forwardRef<AntFileTreeHandle, AntFileTreeProps>(({
  workingDirectory,
  onFileSelect,
  className = '',
  selectedFile
}, ref) => {
  const [treeData, setTreeData] = useState<TreeDataNode[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedKeys, setExpandedKeys] = useState<string[]>([])
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const [isInitialized, setIsInitialized] = useState(false)

  // Load directory contents with depth
  const loadDirectoryData = useCallback(async (path: string, depth: number = 2): Promise<APIFileItem[]> => {
    try {
      const response = await fetch(`/api/files?path=${encodeURIComponent(path)}&depth=${depth}`)
      if (!response.ok) {
        throw new Error(`Failed to load directory: ${response.statusText}`)
      }
      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to load directory')
      }
      return data.files || []
    } catch (error) {
      console.error('Failed to load directory:', error)
      throw error
    }
  }, [])

  // Initial load with 2 levels deep
  const loadInitialTree = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Load 2 levels deep initially for instant navigation
      const files = await loadDirectoryData(workingDirectory, 2)
      const treeNodes = transformToAntTreeData(files)
      setTreeData(treeNodes)
    } catch (error) {
      console.error('Failed to load file tree:', error)
      setError(error instanceof Error ? error.message : 'Failed to load directory')
    } finally {
      setLoading(false)
    }
  }, [workingDirectory, loadDirectoryData])

  // Load initial data
  useEffect(() => {
    loadInitialTree()
  }, [loadInitialTree])

  // Track initialization
  useEffect(() => {
    setIsInitialized(true)
  }, [])

  // Watch for workingDirectory changes and refresh tree
  useEffect(() => {
    if (isInitialized) {
      loadInitialTree()
    }
  }, [workingDirectory, loadInitialTree, isInitialized])

  // Update selected keys when selectedFile changes
  useEffect(() => {
    if (selectedFile?.path) {
      setSelectedKeys([selectedFile.path])
    }
  }, [selectedFile])

  // Load data for a specific node (lazy loading)
  const onLoadData = useCallback(async (node: EventDataNode<TreeDataNode>): Promise<void> => {
    const key = node.key as string

    // If node already has children, don't reload (following Ant Design pattern)
    if (node.children && node.children.length > 0) {
      return
    }

    try {
      // Load 2 more levels when expanding
      const files = await loadDirectoryData(key, 2)

      // Update tree data with new children
      setTreeData(prevData => {
        const updateNodeChildren = (nodes: TreeDataNode[]): TreeDataNode[] => {
          return nodes.map(item => {
            if (item.key === key) {
              // Update this node with children
              return {
                ...item,
                children: transformToAntTreeData(files)
              }
            } else if (item.children) {
              // Recurse into children
              return {
                ...item,
                children: updateNodeChildren(item.children)
              }
            }
            return item
          })
        }

        return updateNodeChildren(prevData)
      })

      // No need to track loaded keys - we check for children instead
    } catch (error) {
      console.error(`Failed to load children for ${key}:`, error)
    }
  }, [loadDirectoryData])

  // Handle node selection
  const onSelect = useCallback((selectedKeys: React.Key[], info: any) => {
    const node = info.node
    if (node.isLeaf && node.data) {
      // File selected - normal file selection behavior
      onFileSelect({
        id: node.data.path,
        name: node.data.name,
        path: node.data.path,
        isFolder: node.data.isFolder,
        size: node.data.size,
        modified: node.data.modified,
        extension: node.data.extension
      })
    } else if (!node.isLeaf) {
      // Folder selected - toggle expansion instead of selecting
      const key = node.key as string
      setExpandedKeys(prev =>
        prev.includes(key)
          ? prev.filter(k => k !== key)  // Collapse if currently expanded
          : [...prev, key]               // Expand if currently collapsed
      )
      // Don't select folders, just expand/collapse them
      return
    }
    setSelectedKeys(selectedKeys as string[])
  }, [onFileSelect])

  // Handle expansion
  const onExpand = useCallback((expandedKeys: React.Key[]) => {
    setExpandedKeys(expandedKeys as string[])
  }, [])

  // Refresh entire tree
  const refreshTree = useCallback(async () => {
    await loadInitialTree()
  }, [loadInitialTree])

  // Refresh a specific node
  const refreshNode = useCallback(async (path: string) => {

    // Find parent path
    const parentPath = path.substring(0, path.lastIndexOf('/')) || workingDirectory

    try {
      // Reload parent directory
      const files = await loadDirectoryData(parentPath, 1)

      // Update tree data
      setTreeData(prevData => {
        const updateNodeChildren = (nodes: TreeDataNode[]): TreeDataNode[] => {
          return nodes.map(item => {
            if (item.key === parentPath) {
              return {
                ...item,
                children: transformToAntTreeData(files)
              }
            } else if (item.children) {
              return {
                ...item,
                children: updateNodeChildren(item.children)
              }
            }
            return item
          })
        }

        // If updating root
        if (parentPath === workingDirectory) {
          return transformToAntTreeData(files)
        }

        return updateNodeChildren(prevData)
      })
    } catch (error) {
      console.error(`Failed to refresh ${path}:`, error)
    }
  }, [workingDirectory, loadDirectoryData])

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    refreshTree,
    refreshNode
  }), [refreshTree, refreshNode])

  // No custom switcher icon - folders are clickable directly

  if (loading && treeData.length === 0) {
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
    <div className={`h-full overflow-auto bg-gray-50 dark:bg-gray-900 ${className}`}>
      <Tree
        treeData={treeData}
        loadData={onLoadData}
        onSelect={onSelect}
        onExpand={onExpand}
        expandedKeys={expandedKeys}
        selectedKeys={selectedKeys}
        showIcon
        showLine={false}
        showLoading={false}
        selectable={true}
        className="ant-file-tree"
      />
    </div>
  )
})

AntFileTree.displayName = 'AntFileTree'

// Export type for use in other components
export type { FileNode }