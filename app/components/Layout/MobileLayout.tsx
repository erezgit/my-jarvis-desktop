import { useState } from 'react'
import { Folder, FileText, MessageSquare } from 'lucide-react'
import { VirtualizedFileTree } from '../FileTree/VirtualizedFileTree'
import { FilePreview } from '../FilePreview/FilePreview'
import { ChatPage } from '../ChatPage'

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
}

// Utility function to combine class names
function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function MobileLayout({ selectedFile, onFileSelect }: MobileLayoutProps) {
  const [currentPanel, setCurrentPanel] = useState<PanelView>('chat')

  return (
    <div className="h-dvh flex flex-col">
      {/* Navigation Bar - sticky at top with white background and shadow */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 shadow-sm">
        <div className="flex items-center px-2 py-1.5 gap-2">
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

          {/* Chat Button */}
          <button
            onClick={() => setCurrentPanel('chat')}
            className={cn(
              "p-2 h-9 w-9 flex-shrink-0 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors",
              currentPanel === 'chat' && "bg-gray-200 dark:bg-gray-700"
            )}
          >
            <MessageSquare className="h-5 w-5" />
          </button>

          {/* Center - File name display if available */}
          <div className="flex-1 flex justify-center items-center">
            {selectedFile && !selectedFile.isDirectory && (
              <span className="text-sm text-gray-600 dark:text-gray-300 truncate">
                {selectedFile.name}
              </span>
            )}
          </div>
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
              <VirtualizedFileTree onFileSelect={onFileSelect} />
            </div>
          )}

          {currentPanel === 'preview' && (
            <div className="h-full flex flex-col overflow-auto bg-white dark:bg-gray-900">
              <FilePreview file={selectedFile} />
            </div>
          )}

          {currentPanel === 'chat' && (
            <div className="h-full flex flex-col bg-white dark:bg-gray-900">
              <ChatPage />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}