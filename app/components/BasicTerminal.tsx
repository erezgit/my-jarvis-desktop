import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
// Import CSS directly
import '@xterm/xterm/css/xterm.css'

export function BasicTerminal() {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<Terminal | null>(null)

  useEffect(() => {
    if (!terminalRef.current) return

    // Only create terminal once
    if (xtermRef.current) return

    console.log('Initializing BasicTerminal...')

    try {
      // Create the terminal
      const term = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'Menlo, Monaco, Consolas, "Courier New", monospace',
        theme: {
          background: '#1e1e1e',
          foreground: '#d4d4d4'
        }
      })

      // Create fit addon
      const fitAddon = new FitAddon()
      term.loadAddon(fitAddon)

      // Open the terminal
      term.open(terminalRef.current)
      
      // Write welcome message
      term.writeln('🚀 Electron + React + xterm.js Terminal')
      term.writeln('------------------------------------------')
      term.writeln('Type anything to test input handling:')
      term.writeln('')
      term.write('$ ')

      // Handle user input
      let currentLine = ''
      term.onData((data) => {
        console.log('Input received:', JSON.stringify(data))
        
        if (data === '\r') {
          // Enter key
          term.write('\r\n')
          console.log('Command entered:', currentLine)
          term.writeln(`You typed: ${currentLine}`)
          currentLine = ''
          term.write('$ ')
        } else if (data === '\u007F' || data === '\b') {
          // Backspace
          if (currentLine.length > 0) {
            currentLine = currentLine.slice(0, -1)
            term.write('\b \b')
          }
        } else if (data === '\u0003') {
          // Ctrl+C
          term.write('^C\r\n$ ')
          currentLine = ''
        } else {
          // Regular character
          currentLine += data
          term.write(data)
        }
      })

      // Fit to container
      fitAddon.fit()

      // Store reference
      xtermRef.current = term

      // Handle window resize
      const handleResize = () => {
        fitAddon.fit()
      }
      window.addEventListener('resize', handleResize)

      // Cleanup
      return () => {
        window.removeEventListener('resize', handleResize)
        if (xtermRef.current) {
          xtermRef.current.dispose()
          xtermRef.current = null
        }
      }
    } catch (error) {
      console.error('Failed to initialize terminal:', error)
    }
  }, [])

  return (
    <div className="h-full w-full flex flex-col bg-gray-900 p-4">
      <div className="mb-2 text-white">
        <strong>Basic Terminal Component</strong> - Check browser console for debug info
      </div>
      <div 
        ref={terminalRef}
        className="flex-1 bg-black rounded"
        style={{ padding: '8px' }}
      />
    </div>
  )
}

export default BasicTerminal