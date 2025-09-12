import { useState, useRef, useCallback, useEffect } from 'react'
import { ProperTerminal } from './components/ProperTerminal'
import { VirtualizedFileTree } from './components/VirtualizedFileTree'
import { FilePreview } from './components/FilePreview'
import { FileText } from 'lucide-react'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from './components/ui/resizable'
import { useTheme } from './contexts/ThemeContext'
import './styles/app.css'
import './styles/resizable.css'

function AppContent() {
  const [selectedFile, setSelectedFile] = useState<any>(null)
  const terminalRef = useRef<any>(null)
  const { theme, themeMode, toggleTheme } = useTheme()

  // Handle terminal resize when panel size changes
  const handleTerminalResize = useCallback(() => {
    if (terminalRef.current && terminalRef.current.handleResize) {
      // Small delay to ensure DOM has updated
      setTimeout(() => {
        terminalRef.current.handleResize()
      }, 50)
    }
  }, [])

  // Update terminal theme when theme changes
  useEffect(() => {
    if (terminalRef.current && terminalRef.current.updateTheme) {
      terminalRef.current.updateTheme(theme.terminal)
    }
  }, [theme.terminal])

  return (
    <div className="h-screen bg-background">
      {/* Main Content - Three Panel Layout with Resizable Panels */}
      <ResizablePanelGroup 
        direction="horizontal" 
        className="h-full"
      >
        {/* Left Panel - File Explorer (20%) */}
        <ResizablePanel 
          defaultSize={20}
          minSize={15}
          maxSize={30}
        >
          <div className="h-full flex flex-col overflow-hidden bg-sidebar text-sidebar-foreground">
            <VirtualizedFileTree 
              onFileSelect={(file) => setSelectedFile(file)}
            />
          </div>
        </ResizablePanel>

        <ResizableHandle className="bg-border" />

        {/* Center Panel - Document/Preview (50%) */}
        <ResizablePanel 
          defaultSize={50}
          minSize={30}
        >
          <div className="h-full flex flex-col bg-card text-card-foreground">
            {/* Fixed header - 60px height */}
            <div className="h-[60px] flex items-center px-4 flex-shrink-0">
              <FileText className="h-4 w-4" />
              <h2 className="font-medium ml-2">
                {selectedFile ? selectedFile.name : 'Document Preview'}
              </h2>
            </div>
            {/* Scrollable content area */}
            <div className="flex-1 overflow-y-auto pt-0 pb-4 px-4">
              <FilePreview file={selectedFile} />
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle className="bg-border" />

        {/* Right Panel - Terminal (30%) */}
        <ResizablePanel 
          defaultSize={30}
          minSize={20}
          maxSize={50}
          onResize={handleTerminalResize}
        >
          <div className="h-full pl-4 pr-0 py-4 bg-sidebar">
            <ProperTerminal 
              ref={terminalRef}
              id="main-terminal"
              theme={theme.terminal}
              themeMode={themeMode}
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}

export default function App() {
  return <AppContent />
}
