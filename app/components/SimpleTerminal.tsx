import { useEffect, useRef } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

interface SimpleTerminalProps {
  id: string
  className?: string
}

export function SimpleTerminal({ id, className = '' }: SimpleTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<XTerm | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)

  useEffect(() => {
    if (!containerRef.current || terminalRef.current) return

    console.log('Creating terminal instance for:', id)

    // Create terminal instance
    const term = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#cccccc',
        cursor: '#ffffff'
      }
    })

    // Create and load fit addon
    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    
    // Open terminal in container
    term.open(containerRef.current)
    fitAddon.fit()

    // Store references
    terminalRef.current = term
    fitAddonRef.current = fitAddon

    // Write a welcome message
    term.writeln('Welcome to My Jarvis Desktop Terminal!')
    term.writeln('This is a demo terminal using xterm.js')
    term.writeln('')
    term.write('$ ')

    // Handle input (echo mode for demo)
    term.onData((data) => {
      // Simple echo for demonstration
      if (data === '\r') {
        term.write('\r\n$ ')
      } else if (data === '\u007F') { // Backspace
        // Move cursor back, write space, move cursor back again
        term.write('\b \b')
      } else {
        term.write(data)
      }
    })

    // Handle resize
    const handleResize = () => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit()
      }
    }

    window.addEventListener('resize', handleResize)

    // Cleanup function
    return () => {
      console.log('Disposing terminal:', id)
      window.removeEventListener('resize', handleResize)
      term.dispose()
      terminalRef.current = null
      fitAddonRef.current = null
    }
  }, [id])

  return (
    <div 
      ref={containerRef} 
      className={`terminal-container h-full w-full ${className}`}
      data-terminal-id={id}
    />
  )
}

export default SimpleTerminal