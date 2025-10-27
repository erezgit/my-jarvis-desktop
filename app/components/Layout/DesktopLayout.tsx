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
      // Handle async operations in an IIFE
      (async () => {
        console.log('[DESKTOP_LAYOUT_DEBUG] File operation detected!', fileOpMessage);

        // Extract parent directory path
        const pathParts = fileOpMessage.path.split('/')
        const fileName = pathParts.pop() // Remove and save filename
        const parentPath = pathParts.join('/')

        console.log('[DESKTOP_LAYOUT_DEBUG] Parent directory:', parentPath);

        // OPTIMISTIC UPDATE: Immediately add new file to parent directory cache
        // This prevents flickering and makes UI instantly responsive
        const queryKey = ['directories', parentPath];
        const currentData = queryClient.getQueryData<{success: boolean, files: any[]}>(queryKey);

        if (currentData && currentData.files) {
          console.log('[DESKTOP_LAYOUT_DEBUG] Optimistically updating cache for:', parentPath);

          const newFile = {
            name: fileOpMessage.fileName,
            path: fileOpMessage.path,
            isDirectory: fileOpMessage.isDirectory,
            size: 0,
            modified: new Date().toISOString(),
            extension: fileOpMessage.fileName.includes('.') ? '.' + fileOpMessage.fileName.split('.').pop() : ''
          };

          // Check if file already exists in cache (prevent duplicates)
          const fileExists = currentData.files.some(f => f.path === fileOpMessage.path);

          if (!fileExists) {
            // Add new file to cache
            queryClient.setQueryData(queryKey, {
              ...currentData,
              files: [...currentData.files, newFile]
            });
          }
        }

        // Expand to the file path (without refresh calls - tree will read from updated cache)
        if (fileTreeRef.current) {
          await fileTreeRef.current.expandToPath(fileOpMessage.path);
        }

        // Background invalidate to sync with filesystem (won't cause flicker since cache already updated)
        queryClient.invalidateQueries({
          queryKey: ['directories', parentPath],
          exact: true,
        })

        // Auto-select the file and load its content
        if (typeof window !== 'undefined' && (window as any).fileAPI) {
          try {
            const fileData = await (window as any).fileAPI.readFile(fileOpMessage.path);
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
          } catch (error) {
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
          }
        }
      })();
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