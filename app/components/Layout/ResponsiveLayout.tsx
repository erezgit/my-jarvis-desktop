import { useState, useEffect } from 'react'
import { DesktopLayout } from './DesktopLayout'
import { MobileLayout } from './MobileLayout'
import { ChatPage } from '../ChatPage'
import { SettingsModal } from '../SettingsModal'
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
  const [newChatHandler, setNewChatHandler] = useState<(() => void) | null>(null)
  const isDesktop = useIsDesktop()

  // Get workspace settings from context
  const { fileTreeDirectory, setFileTreeDirectory } = useSettings()

  // For desktop, we still create the element since it renders it directly
  // For mobile, we'll pass the props instead
  const chatElement = isDesktop ? (
    <ChatPage
      currentView={currentView}
      onViewChange={setCurrentView}
      onFileUploadReady={(handler) => setFileUploadHandler(() => handler)}
      onNewChatReady={(handler) => setNewChatHandler(() => handler)}
    />
  ) : null;

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
          onNewChat={newChatHandler || undefined}
        />
      ) : (
        <MobileLayout
          selectedFile={selectedFile}
          onFileSelect={setSelectedFile}
          onFileUpload={fileUploadHandler || undefined}
          currentView={currentView}
          onViewChange={setCurrentView}
          onChatClick={handleChatClick}
          onHistoryClick={handleHistoryClick}
          onSettingsClick={handleSettingsClick}
          onNewChat={newChatHandler || undefined}
          onFileUploadReady={(handler) => setFileUploadHandler(() => handler)}
          onNewChatReady={(handler) => setNewChatHandler(() => handler)}
        />
      )}

      {/* Settings Modal - rendered at top level */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={handleSettingsClose}
        workingDirectory={fileTreeDirectory}
        onWorkspaceChange={setFileTreeDirectory}
      />
    </>
  )
}