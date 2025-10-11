import { useState, useRef, useEffect } from 'react'
import { Folder, FileText, MessageSquare, Settings } from 'lucide-react'
import { VirtualizedFileTree, type FileTreeRef } from '../FileTree/VirtualizedFileTree'
import { FilePreview } from '../FilePreview/FilePreview'
import { MobileScrollLock } from '../chat/MobileScrollLock'
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
  chatInterface: React.ReactNode
  currentView: 'chat' | 'history'
  onChatClick: () => void
  onHistoryClick: () => void
  onSettingsClick: () => void
}

// Utility function to combine class names
function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function MobileLayout({
  selectedFile,
  onFileSelect,
  chatInterface,
  currentView,
  onChatClick,
  onHistoryClick,
  onSettingsClick
}: MobileLayoutProps) {
  const [currentPanel, setCurrentPanel] = useState<PanelView>('chat')
  const fileTreeRef = useRef<FileTreeRef>(null)
  const [lastProcessedMessageCount, setLastProcessedMessageCount] = useState(0)

  // Get working directory from settings
  const { workingDirectory } = useSettings()

  // Get messages from shared context
  const { messages } = useChatStateContext()

  // Listen for file operation messages and refresh file tree (same as desktop)
  useEffect(() => {
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

      // Refresh the parent directory
      if (fileTreeRef.current && parentPath) {
        fileTreeRef.current.refreshDirectory(parentPath)
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
    <MobileScrollLock>
      <div className="flex flex-col" style={{ height: 'calc(var(--vh, 1vh) * 100)' }}>
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

      {/* Panel Container with smooth transitions */}
      <div className="flex-1 relative overflow-hidden">
        <div
          className="h-full transition-opacity duration-200 ease-in-out"
          key={currentPanel}
        >
          {/* Render only the active panel */}
          {currentPanel === 'files' && (
            <div className="h-full flex flex-col overflow-auto bg-gray-50 dark:bg-gray-900">
              <VirtualizedFileTree
                ref={fileTreeRef}
                workingDirectory={workingDirectory}
                onFileSelect={onFileSelect}
              />
            </div>
          )}

          {currentPanel === 'preview' && (
            <div className="h-full flex flex-col overflow-auto bg-white dark:bg-gray-900">
              <FilePreview file={selectedFile} />
            </div>
          )}

          {currentPanel === 'chat' && (
            <div className="h-full overflow-hidden bg-white dark:bg-gray-900">
              {chatInterface}
            </div>
          )}
        </div>
      </div>
      </div>
    </MobileScrollLock>
  )
}