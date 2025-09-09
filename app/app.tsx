import { useState } from 'react'
import { ProperTerminal } from './components/ProperTerminal'
import { VirtualizedFileTree } from './components/VirtualizedFileTree'
import { FilePreview } from './components/FilePreview'
import { FileText } from 'lucide-react'
import './styles/app.css'

export default function App() {
  const [selectedFile, setSelectedFile] = useState<any>(null)

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">My Jarvis Desktop</h1>
          <span className="text-sm text-muted-foreground">React + TypeScript + shadcn/ui</span>
        </div>
      </header>

      {/* Main Content - Three Panel Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - File Explorer */}
        <div className="w-64 border-r flex flex-col overflow-hidden" style={{ backgroundColor: '#1e1e1e' }}>
          <VirtualizedFileTree 
            onFileSelect={(file) => setSelectedFile(file)}
          />
        </div>

        {/* Center Panel - Document/Preview */}
        <div className="flex-1 p-4 overflow-y-auto" style={{ backgroundColor: '#1e1e1e' }}>
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-4 w-4" />
            <h2 className="font-medium">
              {selectedFile ? selectedFile.name : 'Document Preview'}
            </h2>
          </div>
          <FilePreview file={selectedFile} />
        </div>

        {/* Right Panel - Terminal */}
        <div className="w-96 border-l pl-4 py-4" style={{ backgroundColor: '#1e1e1e' }}>
          <ProperTerminal 
            id="main-terminal"
          />
        </div>
      </div>
    </div>
  )
}
