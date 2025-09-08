import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

// Declare the window.electronAPI interface
declare global {
  interface Window {
    electronAPI: {
      send: (channel: string, data: any) => void
      on: (channel: string, func: (...args: any[]) => void) => void
      removeAllListeners: (channel: string) => void
    }
  }
}

interface WorkingTerminalProps {
  id?: string
  className?: string
}

export function WorkingTerminal({ id: providedId, className = '' }: WorkingTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const termIdRef = useRef<string>('')
  const initialized = useRef(false) // CRITICAL: Prevent double initialization in StrictMode

  useEffect(() => {
    // CRITICAL FIX: Prevent double initialization from React.StrictMode
    if (initialized.current) {
      console.log('Terminal already initialized, skipping...')
      return
    }
    if (!containerRef.current) return
    
    // Mark as initialized IMMEDIATELY to prevent race conditions
    initialized.current = true

    console.log('Initializing WorkingTerminal with real PTY connection')

    // Create terminal instance - EXACT copy from working app
    const term = new Terminal({
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

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    
    term.open(containerRef.current)
    fitAddon.fit()
    
    // Generate terminal ID
    const termId = providedId || 'term-' + Date.now()
    termIdRef.current = termId
    
    // Initialize PTY using the exact same API as working app
    if (window.electronAPI) {
      window.electronAPI.send('terminal-create', termId)
      
      term.onData(data => {
        window.electronAPI.send('terminal-data', { id: termId, data })
      })
      
      window.electronAPI.on('terminal-data-' + termId, (data: string) => {
        term.write(data)
      })
      
      window.electronAPI.on('terminal-exit-' + termId, () => {
        term.write('\r\n[Process completed]\r\n')
      })
    } else {
      console.error('electronAPI not available - terminal will not connect to shell')
      term.writeln('⚠️ Terminal API not available - running in demo mode')
      term.write('$ ')
    }
    
    // Store references
    terminalRef.current = term
    fitAddonRef.current = fitAddon
    
    // Handle window resize
    const handleResize = () => {
      if (fitAddonRef.current && terminalRef.current) {
        fitAddonRef.current.fit()
        if (window.electronAPI) {
          window.electronAPI.send('terminal-resize', { 
            id: termId, 
            cols: terminalRef.current.cols, 
            rows: terminalRef.current.rows 
          })
        }
      }
    }
    
    window.addEventListener('resize', handleResize)
    
    // Cleanup
    return () => {
      console.log('Cleaning up terminal:', termId)
      window.removeEventListener('resize', handleResize)
      
      if (window.electronAPI && termIdRef.current) {
        // Remove listeners
        window.electronAPI.removeAllListeners('terminal-data-' + termIdRef.current)
        window.electronAPI.removeAllListeners('terminal-exit-' + termIdRef.current)
      }
      
      if (terminalRef.current) {
        terminalRef.current.dispose()
        terminalRef.current = null
      }
      
      fitAddonRef.current = null
      // CRITICAL: Reset initialized flag on cleanup
      initialized.current = false
    }
  }, [providedId]) // Only re-run if ID changes

  return (
    <div 
      ref={containerRef}
      className={`h-full w-full ${className}`}
      style={{ backgroundColor: '#1e1e1e' }}
    />
  )
}

export default WorkingTerminal