import { useRef, useEffect, useLayoutEffect, useState } from 'react'
import {
  PanelGroup,
  Panel,
  PanelResizeHandle
} from 'react-resizable-panels'
import { AntFileTree, type FileNode, type AntFileTreeHandle } from '../FileTree/AntFileTree'
import { FilePreview } from '../FilePreview/FilePreview'
import { ChatHeader } from '../chat/ChatHeader'
import { isFileOperationMessage } from '../../types'
import { useChatStateContext } from '../../contexts/ChatStateContext'
import { useSettings } from '../../hooks/useSettings'
import MyJarvis from '../logos/MyJarvis'

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

interface DesktopLayoutProps {
  selectedFile: FileItem | null
  onFileSelect: (file: FileItem) => void
  onFileUpload?: (file: File) => void
  onNewChat?: () => void
  chatInterface: React.ReactNode
  currentView: 'chat' | 'history'
  onChatClick: () => void
  onHistoryClick: () => void
  onSettingsClick: () => void
}

export function DesktopLayout({
  selectedFile,
  onFileSelect,
  onFileUpload,
  onNewChat,
  chatInterface,
  currentView,
  onChatClick,
  onHistoryClick,
  onSettingsClick
}: DesktopLayoutProps) {
  const fileTreeRef = useRef<AntFileTreeHandle>(null)
  const [lastProcessedMessageCount, setLastProcessedMessageCount] = useState(0)

  // Get working directory from settings
  const { fileTreeDirectory } = useSettings()

  // Get messages from shared context
  const { messages } = useChatStateContext()

  // Listen for file operation messages and refresh file tree
  useLayoutEffect(() => {

    // Only check NEW messages that were added since last time
    if (messages.length <= lastProcessedMessageCount) {
      return;
    }

    // Search through only the NEW messages for FileOperationMessage
    let fileOpMessage = null;
    for (let i = messages.length - 1; i >= lastProcessedMessageCount; i--) {
      if (isFileOperationMessage(messages[i])) {
        fileOpMessage = messages[i];
        break;
      }
    }


    if (fileOpMessage) {
      // Handle async operations in an IIFE
      (async () => {

        if (fileOpMessage.operation === 'deleted') {
          // For delete operations, use expandToPath to refresh the parent directory
          // This works exactly like create/modify - it fetches fresh data and updates the tree

          const pathParts = fileOpMessage.path.split('/');
          pathParts.pop(); // Remove the deleted file/folder name
          const parentPath = pathParts.join('/') || '/';


          // For AntFileTree, trigger refresh via ref
          if (fileTreeRef.current) {
            fileTreeRef.current.refreshTree();
          }

          // Update last processed count
            setLastProcessedMessageCount(messages.length);
          return;
        }

        // For created/modified operations, expand and select the file
        // Extract parent directory path
        const pathParts = fileOpMessage.path.split('/')
        const fileName = pathParts.pop() // Remove and save filename
        const parentPath = pathParts.join('/')


        // For AntFileTree, trigger refresh to show new files
        if (fileTreeRef.current) {
          fileTreeRef.current.refreshTree();
        }


        // Auto-select the file and load its content using backend API
        try {
          const response = await fetch(`/api/files/read?path=${encodeURIComponent(fileOpMessage.path)}`);

          if (!response.ok) {
            console.error('API response not ok:', response.status);
            throw new Error(`Failed to read file: ${response.statusText}`);
          }

          const fileData = await response.json();

          if (fileData && fileData.content !== undefined) {
            onFileSelect({
              name: fileOpMessage.fileName,
              path: fileOpMessage.path,
              isDirectory: fileOpMessage.isDirectory,
              size: fileData.size || 0,
              modified: fileData.modified || new Date().toISOString(),
              extension: fileOpMessage.fileName.includes('.') ? '.' + fileOpMessage.fileName.split('.').pop() : '',
              content: fileData.content
            });
          } else {
          }
        } catch (error) {
          console.error('Error reading file:', error);
          // Select without content if read fails
          onFileSelect({
            name: fileOpMessage.fileName,
            path: fileOpMessage.path,
            isDirectory: fileOpMessage.isDirectory,
            size: 0,
            modified: new Date().toISOString(),
            extension: fileOpMessage.fileName.includes('.') ? '.' + fileOpMessage.fileName.split('.').pop() : '',
          });
        }

        // Update last processed count AFTER all async operations complete
        setLastProcessedMessageCount(messages.length);
      })();
    } else {
      // No file operation, update count immediately
      setLastProcessedMessageCount(messages.length);
    }
  }, [messages, onFileSelect, lastProcessedMessageCount])

  return (
    <div className="h-screen">
      <PanelGroup direction="horizontal" className="h-full">
        {/* File Tree Panel - 20% default width */}
        <Panel
          defaultSize={20}
          minSize={15}
          maxSize={30}
          className="bg-gray-50 dark:bg-gray-900 px-5 py-4"
        >
          {/* Header bar with My Jarvis icon and title */}
          <div className="flex items-center gap-3 mb-8">
            <MyJarvis />
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              My Jarvis
            </span>
          </div>

          <AntFileTree
            ref={fileTreeRef}
            workingDirectory={fileTreeDirectory}
            onFileSelect={async (node: FileNode) => {
              // Convert FileNode to FileItem for compatibility
              const fileItem: FileItem = {
                name: node.name,
                path: node.path,
                isDirectory: node.isFolder,
                size: node.size || 0,
                modified: node.modified || '',
                extension: node.extension || ''
              }

              // For files (not directories), fetch content before selecting
              if (!node.isFolder) {
                try {
                  const response = await fetch(`/api/files/read?path=${encodeURIComponent(node.path)}`);
                  if (response.ok) {
                    const fileData = await response.json();
                    if (fileData && fileData.content !== undefined) {
                      fileItem.content = fileData.content;
                    }
                  }
                } catch (error) {
                  console.error('Error fetching file content:', error);
                  // Continue without content if fetch fails
                }
              }

              onFileSelect(fileItem)
            }}
            selectedFile={selectedFile}
            className="desktop-file-tree"
          />
        </Panel>

        <PanelResizeHandle className="w-px bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors" />

        {/* File Preview Panel - 50% default width */}
        <Panel
          defaultSize={50}
          minSize={25}
          maxSize={60}
          className="bg-white dark:bg-gray-900"
        >
          <FilePreview file={selectedFile} />
        </Panel>

        <PanelResizeHandle className="w-px bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors" />

        {/* Chat Panel - 30% default width - WITH HEADER AND CONTENT */}
        <Panel
          defaultSize={30}
          minSize={20}
          maxSize={60}
          className="bg-white dark:bg-gray-900"
        >
          <div className="h-full flex flex-col">
            {/* ChatHeader toolbar */}
            <ChatHeader
              currentView={currentView}
              onChatClick={onChatClick}
              onHistoryClick={onHistoryClick}
              onSettingsClick={onSettingsClick}
              onNewChat={onNewChat}
              hasMessages={messages.length > 0}
            />

            {/* Chat content - fills remaining space */}
            <div className="flex-1 min-h-0">
              {chatInterface}
            </div>
          </div>
        </Panel>
      </PanelGroup>
    </div>
  )
}