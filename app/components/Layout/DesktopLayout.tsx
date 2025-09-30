import {
  PanelGroup,
  Panel,
  PanelResizeHandle
} from 'react-resizable-panels'
import { VirtualizedFileTree } from '../FileTree/VirtualizedFileTree'
import { FilePreview } from '../FilePreview/FilePreview'
import { ChatPage } from '../ChatPage'

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
  return (
    <PanelGroup direction="horizontal" className="h-full">
      {/* File Tree Panel - 20% default width */}
      <Panel
        defaultSize={20}
        minSize={15}
        maxSize={30}
        className="bg-gray-50 dark:bg-gray-900"
      >
        <VirtualizedFileTree onFileSelect={onFileSelect} />
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