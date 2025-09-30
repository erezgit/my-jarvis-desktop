import { useState } from 'react'
import { DesktopLayout } from './DesktopLayout'
import { MobileLayout } from './MobileLayout'

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

export function ResponsiveLayout() {
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null)

  return (
    <>
      {/* Desktop Layout - Hidden on mobile, visible on lg+ screens */}
      <div className="hidden lg:flex h-screen">
        <DesktopLayout
          selectedFile={selectedFile}
          onFileSelect={setSelectedFile}
        />
      </div>

      {/* Mobile Layout - Visible on mobile, hidden on lg+ screens */}
      <div className="block lg:hidden h-screen">
        <MobileLayout
          selectedFile={selectedFile}
          onFileSelect={setSelectedFile}
        />
      </div>
    </>
  )
}