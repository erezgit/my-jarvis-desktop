import { useRef, useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  PanelGroup,
  Panel,
  PanelResizeHandle
} from 'react-resizable-panels'
import { VirtualizedFileTree, type FileTreeRef } from '../FileTree/VirtualizedFileTree'
import { FilePreview } from '../FilePreview/FilePreview'
import { ChatHeader } from '../chat/ChatHeader'
import { isFileOperationMessage } from '../../types'
import { useChatStateContext } from '../../contexts/ChatStateContext'
import { useSettings } from '../../hooks/useSettings'

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
  chatInterface,
  currentView,
  onChatClick,
  onHistoryClick,
  onSettingsClick
}: DesktopLayoutProps) {
  const fileTreeRef = useRef<FileTreeRef>(null)
  const [lastProcessedMessageCount, setLastProcessedMessageCount] = useState(0)
  const queryClient = useQueryClient()

  // Get working directory from settings
  const { fileTreeDirectory } = useSettings()

  // Get messages from shared context
  const { messages } = useChatStateContext()

  // Listen for file operation messages and refresh file tree
  useEffect(() => {
    console.log('[DESKTOP_LAYOUT_DEBUG] Messages changed, count:', messages.length);

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

    console.log('[DESKTOP_LAYOUT_DEBUG] Found FileOperationMessage:', fileOpMessage);

    if (fileOpMessage) {
      console.log('[DESKTOP_LAYOUT_DEBUG] File operation detected!', fileOpMessage);

      // Extract parent directory path
      const pathParts = fileOpMessage.path.split('/')
      pathParts.pop() // Remove filename
      const parentPath = pathParts.join('/')

      console.log('[DESKTOP_LAYOUT_DEBUG] Invalidating parent directory:', parentPath);

      // Invalidate parent directory query - TanStack Query will refetch automatically
      queryClient.invalidateQueries({
        queryKey: ['directories', parentPath],
        exact: true, // Only invalidate this specific directory
      })

      // Auto-select the file and load its content
      if (typeof window !== 'undefined' && (window as any).fileAPI) {
        (window as any).fileAPI.readFile(fileOpMessage.path).then((fileData: any) => {
          if (fileData) {
            onFileSelect({
              name: fileOpMessage.fileName,
              path: fileOpMessage.path,
              isDirectory: fileOpMessage.isDirectory,
              size: 0,
              modified: new Date().toISOString(),
              extension: fileOpMessage.fileName.includes('.') ? '.' + fileOpMessage.fileName.split('.').pop() : '',
              content: fileData.content
            });
          }
        }).catch((error: any) => {
          console.error('[DESKTOP_LAYOUT_DEBUG] Error reading file:', error);
          // Select without content if read fails
          onFileSelect({
            name: fileOpMessage.fileName,
            path: fileOpMessage.path,
            isDirectory: fileOpMessage.isDirectory,
            size: 0,
            modified: new Date().toISOString(),
            extension: fileOpMessage.fileName.includes('.') ? '.' + fileOpMessage.fileName.split('.').pop() : '',
          });
        });
      }
    }

    // Update last processed count
    setLastProcessedMessageCount(messages.length);
  }, [messages, onFileSelect, lastProcessedMessageCount, queryClient])

  return (
    <div className="h-screen">
      <PanelGroup direction="horizontal" className="h-full">
        {/* File Tree Panel - 20% default width */}
        <Panel
          defaultSize={20}
          minSize={15}
          maxSize={30}
          className="bg-gray-50 dark:bg-gray-900"
        >
          <VirtualizedFileTree
            ref={fileTreeRef}
            workingDirectory={fileTreeDirectory}
            onFileSelect={onFileSelect}
            onFileUpload={onFileUpload}
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