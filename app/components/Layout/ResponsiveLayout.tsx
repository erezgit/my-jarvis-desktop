import { useState, useEffect, useMemo } from 'react'
import { DesktopLayout } from './DesktopLayout'
import { MobileLayout } from './MobileLayout'
import { ChatPage } from '../ChatPage'
import { SettingsModal } from '../SettingsModal'

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
  const [currentView, setCurrentView] = useState<'chat' | 'history'>('chat')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [fileUploadHandler, setFileUploadHandler] = useState<((file: File) => void) | null>(null)
  const isDesktop = useIsDesktop()

  // Create chat element with currentView prop (re-creates when view changes)
  const chatElement = useMemo(() => (
    <ChatPage
      currentView={currentView}
      onViewChange={setCurrentView}
      onFileUploadReady={(handler) => setFileUploadHandler(() => handler)}
    />
  ), [currentView]);

  // ChatHeader callbacks - manage view state
  const handleChatClick = () => setCurrentView('chat');
  const handleHistoryClick = () => setCurrentView('history');
  const handleSettingsClick = () => setIsSettingsOpen(true);
  const handleSettingsClose = () => setIsSettingsOpen(false);

  // Conditional rendering - only ONE layout exists in DOM at a time
  return (
    <>
      {isDesktop ? (
        <DesktopLayout
          selectedFile={selectedFile}
          onFileSelect={setSelectedFile}
          onFileUpload={fileUploadHandler || undefined}
          chatInterface={chatElement}
          currentView={currentView}
          onChatClick={handleChatClick}
          onHistoryClick={handleHistoryClick}
          onSettingsClick={handleSettingsClick}
        />
      ) : (
        <MobileLayout
          selectedFile={selectedFile}
          onFileSelect={setSelectedFile}
          onFileUpload={fileUploadHandler || undefined}
          chatInterface={chatElement}
          currentView={currentView}
          onChatClick={handleChatClick}
          onHistoryClick={handleHistoryClick}
          onSettingsClick={handleSettingsClick}
        />
      )}

      {/* Settings Modal - rendered at top level */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={handleSettingsClose}
      />
    </>
  )
}