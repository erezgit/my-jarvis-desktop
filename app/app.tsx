import { useState } from 'react'
import { ProperTerminal } from './components/ProperTerminal'
import { Button } from './components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs'
import { FileText, Terminal as TerminalIcon, FolderOpen } from 'lucide-react'
import './styles/app.css'

export default function App() {
  const [activeTerminal, setActiveTerminal] = useState('terminal-1')

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
        <div className="w-64 border-r bg-muted/30 p-4">
          <div className="flex items-center gap-2 mb-4">
            <FolderOpen className="h-4 w-4" />
            <h2 className="font-medium">File Explorer</h2>
          </div>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Project Files</CardTitle>
              <CardDescription className="text-xs">
                Click to select a file
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm">
                <li className="hover:bg-accent rounded px-2 py-1 cursor-pointer">📁 src/</li>
                <li className="hover:bg-accent rounded px-2 py-1 cursor-pointer">📁 components/</li>
                <li className="hover:bg-accent rounded px-2 py-1 cursor-pointer">📄 package.json</li>
                <li className="hover:bg-accent rounded px-2 py-1 cursor-pointer">📄 README.md</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Center Panel - Document/Preview */}
        <div className="flex-1 p-4">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-4 w-4" />
            <h2 className="font-medium">Document Preview</h2>
          </div>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Welcome to My Jarvis Desktop</CardTitle>
              <CardDescription>
                Modern Electron app with React, TypeScript, and shadcn/ui
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert">
                <h3>Features</h3>
                <ul>
                  <li>✅ React 19 with TypeScript</li>
                  <li>✅ shadcn/ui components</li>
                  <li>✅ Integrated terminal with xterm.js</li>
                  <li>✅ Type-safe IPC communication</li>
                  <li>✅ File explorer (coming soon)</li>
                  <li>✅ MDX support (coming soon)</li>
                </ul>
                
                <h3>Terminal Integration</h3>
                <p>
                  The terminal on the right is a fully functional shell integrated using xterm.js 
                  and node-pty. It maintains its DOM state independently from React's virtual DOM,
                  ensuring smooth performance and preventing re-render issues.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Terminal */}
        <div className="w-96 border-l bg-muted/30 p-4 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <TerminalIcon className="h-4 w-4" />
            <h2 className="font-medium">Terminal</h2>
          </div>
          
          <Tabs value={activeTerminal} onValueChange={setActiveTerminal} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="terminal-1">Terminal 1</TabsTrigger>
              <TabsTrigger value="terminal-2">Terminal 2</TabsTrigger>
            </TabsList>
            
            <TabsContent value="terminal-1" className="flex-1 mt-4">
              <Card className="h-full">
                <CardContent className="p-0 h-full">
                  <ProperTerminal 
                    id="terminal-1"
                  />
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="terminal-2" className="flex-1 mt-4">
              <Card className="h-full">
                <CardContent className="p-0 h-full">
                  <ProperTerminal 
                    id="terminal-2"
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          
          <div className="mt-4 flex gap-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => {
                // Terminal clear functionality to be implemented
                console.log('Clear terminal:', activeTerminal)
              }}
            >
              Clear Terminal
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
