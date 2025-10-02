import { useState, useEffect } from 'react'
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

// Custom hook to detect large screens using window.matchMedia
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => {
    // Initialize with current match state
    if (typeof window !== 'undefined') {
      return window.matchMedia('(min-width: 1024px)').matches
    }
    return true // Default to desktop for SSR
  })

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)')

    // Handler for media query changes
    const handleChange = (e: MediaQueryListEvent) => {
      setIsDesktop(e.matches)
    }

    // Set initial value
    setIsDesktop(mediaQuery.matches)

    // Add event listener
    mediaQuery.addEventListener('change', handleChange)

    // Cleanup
    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [])

  return isDesktop
}

export function ResponsiveLayout() {
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null)
  const isDesktop = useIsDesktop()

  // Conditional rendering - only ONE layout exists in DOM at a time
  return (
    <div className="h-screen">
      {isDesktop ? (
        <DesktopLayout
          selectedFile={selectedFile}
          onFileSelect={setSelectedFile}
        />
      ) : (
        <MobileLayout
          selectedFile={selectedFile}
          onFileSelect={setSelectedFile}
        />
      )}
    </div>
  )
}