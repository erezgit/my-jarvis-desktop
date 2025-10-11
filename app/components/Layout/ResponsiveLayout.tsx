import { useState, useEffect, useMemo } from 'react'
import { DesktopLayout } from './DesktopLayout'
import { MobileLayout } from './MobileLayout'
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
  const isDesktop = useIsDesktop()

  // Create chat element ONCE (like frontend pattern)
  const chatElement = useMemo(() => (
    <ChatPage />
  ), []);  // Empty array: no dependencies, ChatPage is self-contained

  // ChatHeader callbacks - manage view state
  const handleChatClick = () => setCurrentView('chat');
  const handleHistoryClick = () => setCurrentView('history');
  const handleSettingsClick = () => {
    // TODO: Implement settings modal or navigation
    console.log('Settings clicked');
  };

  // Conditional rendering - only ONE layout exists in DOM at a time
  return (
    <div className="h-screen">
      {isDesktop ? (
        <DesktopLayout
          selectedFile={selectedFile}
          onFileSelect={setSelectedFile}
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
          chatInterface={chatElement}
          currentView={currentView}
          onChatClick={handleChatClick}
          onHistoryClick={handleHistoryClick}
          onSettingsClick={handleSettingsClick}
        />
      )}
    </div>
  )
}