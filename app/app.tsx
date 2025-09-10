import { useState, useRef, useCallback } from 'react'
import { ProperTerminal } from './components/ProperTerminal'
import { VirtualizedFileTree } from './components/VirtualizedFileTree'
import { FilePreview } from './components/FilePreview'
import { FileText } from 'lucide-react'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from './components/ui/resizable'
import './styles/app.css'
import './styles/resizable.css'

export default function App() {
  const [selectedFile, setSelectedFile] = useState<any>(null)
  const terminalRef = useRef<any>(null)

  // Handle terminal resize when panel size changes
  const handleTerminalResize = useCallback(() => {
    if (terminalRef.current && terminalRef.current.handleResize) {
      // Small delay to ensure DOM has updated
      setTimeout(() => {
        terminalRef.current.handleResize()
      }, 50)
    }
  }, [])

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
          <div className="h-full flex flex-col overflow-hidden" style={{ backgroundColor: '#1e1e1e' }}>
            <VirtualizedFileTree 
              onFileSelect={(file) => setSelectedFile(file)}
            />
          </div>
        </ResizablePanel>

        <ResizableHandle />

        {/* Center Panel - Document/Preview (50%) */}
        <ResizablePanel 
          defaultSize={50}
          minSize={30}
        >
          <div className="h-full p-4 overflow-y-auto" style={{ backgroundColor: '#1e1e1e' }}>
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-4 w-4" />
              <h2 className="font-medium">
                {selectedFile ? selectedFile.name : 'Document Preview'}
              </h2>
            </div>
            <FilePreview file={selectedFile} />
          </div>
        </ResizablePanel>

        <ResizableHandle />

        {/* Right Panel - Terminal (30%) */}
        <ResizablePanel 
          defaultSize={30}
          minSize={20}
          maxSize={50}
          onResize={handleTerminalResize}
        >
          <div className="h-full pl-4 pr-0 py-4" style={{ backgroundColor: '#1e1e1e' }}>
            <ProperTerminal 
              ref={terminalRef}
              id="main-terminal"
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
