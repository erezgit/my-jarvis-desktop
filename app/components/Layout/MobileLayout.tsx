import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { Folder, FileText, MessageSquare, Settings, PlusCircle } from 'lucide-react'
import { AntFileTree, type FileNode, type AntFileTreeHandle } from '../FileTree/AntFileTree'
import { FilePreview } from '../FilePreview/FilePreview'
import { ChatPage } from '../ChatPage'
import { isFileOperationMessage } from '../../types'
import { useChatStateContext } from '../../contexts/ChatStateContext'
import { useSettings } from '../../hooks/useSettings'

type PanelView = 'files' | 'preview' | 'chat'

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

interface MobileLayoutProps {
  selectedFile: FileItem | null
  onFileSelect: (file: FileItem) => void
  onFileUpload?: (file: File) => void
  onNewChat?: () => void
  currentView: 'chat' | 'history'
  onViewChange: (view: 'chat' | 'history') => void
  onChatClick: () => void
  onHistoryClick: () => void
  onSettingsClick: () => void
  onFileUploadReady?: (handler: ((file: File) => void) | null) => void
  onNewChatReady?: (handler: (() => void) | null) => void
}

// Utility function to combine class names
function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function MobileLayout({
  selectedFile,
  onFileSelect,
  onFileUpload,
  onNewChat,
  currentView,
  onViewChange,
  onChatClick,
  onHistoryClick,
  onSettingsClick,
  onFileUploadReady,
  onNewChatReady
}: MobileLayoutProps) {
  const [currentPanel, setCurrentPanel] = useState<PanelView>('chat')
  const [lastProcessedMessageCount, setLastProcessedMessageCount] = useState(0)
  const fileTreeRef = useRef<AntFileTreeHandle>(null)

  // Get working directory from settings
  const { fileTreeDirectory } = useSettings()

  // Get messages from shared context
  const { messages } = useChatStateContext()

  // Listen for file operation messages and refresh file tree (same as desktop)
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
      // Extract parent directory path
      const pathParts = fileOpMessage.path.split('/')
      pathParts.pop() // Remove filename
      const parentPath = pathParts.join('/')

      // For AntFileTree, trigger refresh via ref
      if (fileTreeRef.current) {
        fileTreeRef.current.refreshTree()
      }

      // Auto-select the new file and load its content
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
          console.error('[MOBILE_LAYOUT] Error reading file:', error);
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
      <div className="h-dvh flex flex-col">
      {/* Navigation Bar - sticky at top with white background and shadow */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 shadow-sm">
        <div className="flex items-center justify-between px-2 py-1.5 gap-2">
          {/* Left: Panel switchers */}
          <div className="flex items-center gap-2">
            {/* Files Button */}
            <button
              onClick={() => setCurrentPanel('files')}
              className={cn(
                "p-2 h-9 w-9 flex-shrink-0 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors",
                currentPanel === 'files' && "bg-gray-200 dark:bg-gray-700"
              )}
            >
              <Folder className="h-5 w-5" />
            </button>

            {/* Preview Button */}
            <button
              onClick={() => setCurrentPanel('preview')}
              className={cn(
                "p-2 h-9 w-9 flex-shrink-0 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors",
                currentPanel === 'preview' && "bg-gray-200 dark:bg-gray-700"
              )}
            >
              <FileText className="h-5 w-5" />
            </button>

            {/* Chat Panel Button */}
            <button
              onClick={() => setCurrentPanel('chat')}
              className={cn(
                "p-2 h-9 w-9 flex-shrink-0 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors",
                currentPanel === 'chat' && "bg-gray-200 dark:bg-gray-700"
              )}
            >
              <MessageSquare className="h-5 w-5" />
            </button>
          </div>

          {/* Right: ChatHeader buttons (only visible when chat panel active) */}
          {currentPanel === 'chat' && (
            <div className="flex items-center gap-1">
              {onNewChat && messages.length > 0 && (
                <button
                  onClick={onNewChat}
                  className="px-2 py-1 text-xs rounded transition-colors text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  aria-label="Start new chat"
                >
                  New
                </button>
              )}
              <button
                onClick={onChatClick}
                className={cn(
                  "px-2 py-1 text-xs rounded transition-colors",
                  currentView === 'chat'
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-medium'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                )}
              >
                Chat
              </button>
              <button
                onClick={onHistoryClick}
                className={cn(
                  "px-2 py-1 text-xs rounded transition-colors",
                  currentView === 'history'
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-medium'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                )}
              >
                History
              </button>
              <button
                onClick={onSettingsClick}
                className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Settings className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Panel Container - All panels mounted, visibility controlled by CSS */}
      <div className="flex-1 relative overflow-hidden">
        {/* Files Panel */}
        <div className={cn(
          "absolute inset-0 h-full flex flex-col overflow-auto bg-gray-50 dark:bg-gray-900",
          currentPanel === 'files' ? 'block' : 'hidden'
        )}>
          <AntFileTree
            ref={fileTreeRef}
            workingDirectory={fileTreeDirectory}
            onFileSelect={(node: FileNode) => {
              // Convert FileNode to FileItem for compatibility
              const fileItem: FileItem = {
                name: node.name,
                path: node.path,
                isDirectory: node.isFolder,
                size: node.size || 0,
                modified: node.modified || '',
                extension: node.extension || ''
              }
              onFileSelect(fileItem)
            }}
            selectedFile={selectedFile}
            className="mobile-file-tree"
          />
        </div>

        {/* Preview Panel */}
        <div className={cn(
          "absolute inset-0 h-full flex flex-col overflow-auto bg-white dark:bg-gray-900",
          currentPanel === 'preview' ? 'block' : 'hidden'
        )}>
          <FilePreview file={selectedFile} />
        </div>

        {/* Chat Panel */}
        <div className={cn(
          "absolute inset-0 h-full flex flex-col bg-white dark:bg-gray-900",
          currentPanel === 'chat' ? 'block' : 'hidden'
        )}>
          <ChatPage
            currentView={currentView}
            onViewChange={onViewChange}
            onFileUploadReady={onFileUploadReady}
            onNewChatReady={onNewChatReady}
          />
        </div>
      </div>
      </div>
  )
}