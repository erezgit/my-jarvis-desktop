import { useEffect, useRef, useCallback } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import '@xterm/xterm/css/xterm.css'

interface TerminalProps {
  id: string
  className?: string
  onReady?: (terminal: XTerm) => void
}

export function Terminal({ id, className = '', onReady }: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<XTerm | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)

  useEffect(() => {
    if (!containerRef.current || terminalRef.current) return

    // Create terminal instance ONCE
    const term = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#cccccc',
        cursor: '#ffffff',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5'
      }
    })

    // Load addons
    const fitAddon = new FitAddon()
    const webLinksAddon = new WebLinksAddon()
    
    term.loadAddon(fitAddon)
    term.loadAddon(webLinksAddon)
    
    // Open terminal in container
    term.open(containerRef.current)
    fitAddon.fit()

    // Store references
    terminalRef.current = term
    fitAddonRef.current = fitAddon

    // Setup IPC communication with main process
    if (window.conveyor?.terminal) {
      // Create terminal in main process
      window.conveyor.terminal.create(id).then(() => {
        // Handle data from terminal
        window.conveyor.terminal.onData(id, (data: string) => {
          term.write(data)
        })

        // Send input to terminal
        term.onData((data: string) => {
          window.conveyor.terminal.write(id, data)
        })
      })
    }

    // Notify parent component that terminal is ready
    if (onReady) {
      onReady(term)
    }

    // Handle resize
    const handleResize = () => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit()
        
        // Send new dimensions to backend
        if (window.conveyor?.terminal) {
          const { cols, rows } = term
          window.conveyor.terminal.resize(id, cols, rows)
        }
      }
    }

    window.addEventListener('resize', handleResize)

    // Cleanup function
    return () => {
      window.removeEventListener('resize', handleResize)
      
      // Destroy terminal in main process
      if (window.conveyor?.terminal) {
        window.conveyor.terminal.destroy(id)
      }
      
      // Dispose terminal
      term.dispose()
      terminalRef.current = null
      fitAddonRef.current = null
    }
  }, [id, onReady]) // Dependencies ensure this runs only once per terminal ID

  // Expose focus method
  const focus = useCallback(() => {
    if (terminalRef.current) {
      terminalRef.current.focus()
    }
  }, [])

  // Expose clear method
  const clear = useCallback(() => {
    if (terminalRef.current) {
      terminalRef.current.clear()
    }
  }, [])

  return (
    <div 
      ref={containerRef} 
      className={`terminal-container h-full w-full ${className}`}
      data-terminal-id={id}
    />
  )
}

export default Terminal