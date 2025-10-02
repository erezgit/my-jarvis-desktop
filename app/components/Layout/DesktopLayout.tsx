import { useRef, useEffect, useState } from 'react'
import {
  PanelGroup,
  Panel,
  PanelResizeHandle
} from 'react-resizable-panels'
import { VirtualizedFileTree, type FileTreeRef } from '../FileTree/VirtualizedFileTree'
import { FilePreview } from '../FilePreview/FilePreview'
import { ChatPage } from '../ChatPage'
import { isFileOperationMessage } from '../../types'
import { useChatStateContext } from '../../contexts/ChatStateContext'

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
}

export function DesktopLayout({ selectedFile, onFileSelect }: DesktopLayoutProps) {
  const fileTreeRef = useRef<FileTreeRef>(null)
  const [lastProcessedMessageCount, setLastProcessedMessageCount] = useState(0)

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
      console.log('[DESKTOP_LAYOUT_DEBUG] Parent path:', parentPath);

      // Refresh the parent directory
      if (fileTreeRef.current && parentPath) {
        console.log('[DESKTOP_LAYOUT_DEBUG] Refreshing directory:', parentPath);
        fileTreeRef.current.refreshDirectory(parentPath)
      }

      // Auto-select the new file and load its content
      console.log('[DESKTOP_LAYOUT_DEBUG] Auto-selecting file:', fileOpMessage.path);

      // Load file content before selecting
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
  }, [messages, onFileSelect, lastProcessedMessageCount])

  return (
    <PanelGroup direction="horizontal" className="h-full">
      {/* File Tree Panel - 20% default width */}
      <Panel
        defaultSize={20}
        minSize={15}
        maxSize={30}
        className="bg-gray-50 dark:bg-gray-900"
      >
        <VirtualizedFileTree ref={fileTreeRef} onFileSelect={onFileSelect} />
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

      {/* Chat Panel - 30% default width - ChatPage COMPLETELY UNTOUCHED */}
      <Panel
        defaultSize={30}
        minSize={20}
        maxSize={60}
        className="bg-white dark:bg-gray-900"
      >
        <ChatPage />
      </Panel>
    </PanelGroup>
  )
}