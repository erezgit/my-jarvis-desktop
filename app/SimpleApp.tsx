import { useState } from 'react'
import { WorkingTerminal } from './components/WorkingTerminal'
import './styles/app.css'

export default function SimpleApp() {
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [currentPath, setCurrentPath] = useState('/Users')

  return (
    <div className="h-screen flex bg-background">
      {/* Left Panel - File Explorer */}
      <div className="w-64 border-r bg-gray-900 p-4">
        <h2 className="text-white font-bold mb-4">Explorer</h2>
        <div className="text-gray-400 text-sm">
          <div className="hover:bg-gray-800 p-1 rounded cursor-pointer">📁 src/</div>
          <div className="hover:bg-gray-800 p-1 rounded cursor-pointer">📁 components/</div>
          <div className="hover:bg-gray-800 p-1 rounded cursor-pointer">📄 package.json</div>
          <div className="hover:bg-gray-800 p-1 rounded cursor-pointer">📄 README.md</div>
        </div>
      </div>

      {/* Center Panel - Document Preview */}
      <div className="flex-1 p-4 bg-gray-950">
        <h2 className="text-white font-bold mb-4">Document Preview</h2>
        <div className="bg-gray-900 rounded-lg p-4 h-full">
          <p className="text-gray-300">
            Select a file from the explorer to preview its contents here.
          </p>
        </div>
      </div>

      {/* Right Panel - Terminal (SIMPLE, NO NESTING) */}
      <div className="w-[600px] bg-black flex flex-col">
        <div className="bg-gray-900 px-4 py-2 border-b border-gray-800">
          <span className="text-white font-bold">Terminal</span>
        </div>
        {/* Direct terminal container - no Cards, no Tabs, just the terminal */}
        <div className="flex-1">
          <WorkingTerminal id="main-terminal" />
        </div>
      </div>
    </div>
  )
}