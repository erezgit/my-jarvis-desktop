'use client'

import { useEffect, useRef, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import '@xterm/xterm/css/xterm.css'

interface WebTerminalProps {
  className?: string
  wsUrl?: string // Default: ws://localhost:3001
}

export function WebTerminal({
  className = '',
  wsUrl = 'ws://localhost:3001'
}: WebTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<Terminal | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')

  useEffect(() => {
    if (!containerRef.current) return

    console.log('[WebTerminal] Initializing with WebSocket connection to', wsUrl)

    // Create terminal (EXACT SAME as Electron version)
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

    // Load addons (EXACT SAME as Electron version)
    const fitAddon = new FitAddon()
    const webLinksAddon = new WebLinksAddon()

    term.loadAddon(fitAddon)
    term.loadAddon(webLinksAddon)

    // Open terminal
    term.open(containerRef.current)
    fitAddon.fit()

    // Store references
    terminalRef.current = term
    fitAddonRef.current = fitAddon

    // Connect WebSocket (ONLY DIFFERENCE from Electron version)
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('[WebTerminal] WebSocket connected')
      setStatus('connected')
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)

        switch (msg.type) {
          case 'connected':
            console.log('[WebTerminal] Terminal session started:', msg.termId)
            break

          case 'data':
            // Write to terminal (EXACT SAME as Electron version)
            term.write(msg.data)
            break

          case 'exit':
            term.write('\r\n[Process completed]\r\n')
            break

          default:
            console.warn('[WebTerminal] Unknown message type:', msg.type)
        }
      } catch (error) {
        console.error('[WebTerminal] Error parsing message:', error)
      }
    }

    ws.onerror = (error) => {
      console.error('[WebTerminal] WebSocket error:', error)
      setStatus('disconnected')
      term.writeln('\r\n⚠️  Connection error - terminal unavailable')
    }

    ws.onclose = () => {
      console.log('[WebTerminal] WebSocket closed')
      setStatus('disconnected')
    }

    // Send input to backend (SIMILAR to Electron version)
    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'data',
          data: data
        }))
      }
    })

    // Handle resize (SIMILAR to Electron version)
    const handleResize = () => {
      if (fitAddonRef.current && terminalRef.current) {
        fitAddonRef.current.fit()

        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'resize',
            cols: terminalRef.current.cols,
            rows: terminalRef.current.rows
          }))
        }
      }
    }

    window.addEventListener('resize', handleResize)

    // Cleanup
    return () => {
      console.log('[WebTerminal] Cleaning up')
      window.removeEventListener('resize', handleResize)
      ws.close()
      term.dispose()
    }
  }, [wsUrl])

  return (
    <div className="relative h-full w-full">
      {/* Status indicator */}
      {status !== 'connected' && (
        <div className="absolute top-2 right-2 z-10 px-3 py-1 bg-gray-800 text-white text-sm rounded">
          {status === 'connecting' ? '⏳ Connecting...' : '❌ Disconnected'}
        </div>
      )}

      {/* Terminal container */}
      <div
        ref={containerRef}
        className={`h-full w-full ${className}`}
        style={{ backgroundColor: '#1e1e1e' }}
      />
    </div>
  )
}

export default WebTerminal
