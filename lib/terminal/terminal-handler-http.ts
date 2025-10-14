import { WebSocket as WSWebSocket, WebSocketServer } from 'ws'
import * as pty from 'node-pty'
import * as os from 'os'
import type { Server } from 'node:http'

interface TerminalSession {
  pty: pty.IPty
  ws: WSWebSocket
}

/**
 * Terminal WebSocket handler that integrates with existing HTTP server
 * This allows WebSocket and HTTP to share the same port, which is required
 * for platforms like Render.com that only expose one port.
 */
export class TerminalHandler {
  private wss: WebSocketServer
  private terminals: Map<string, TerminalSession> = new Map()

  constructor(httpServer: Server) {
    // Create WebSocket server that shares the HTTP server
    // Only handle upgrades to /terminal path
    this.wss = new WebSocketServer({ noServer: true })

    // Handle HTTP upgrade requests for WebSocket
    httpServer.on('upgrade', (request, socket, head) => {
      const { pathname } = new URL(request.url || '', `http://${request.headers.host}`)

      if (pathname === '/terminal') {
        this.wss.handleUpgrade(request, socket, head, (ws) => {
          this.wss.emit('connection', ws, request)
        })
      } else {
        socket.destroy()
      }
    })

    this.setupWebSocketServer()
    console.log('[Terminal] WebSocket handler registered at /terminal path')
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (ws, req) => {
      console.log('[Terminal] New connection from', req.socket.remoteAddress)
      const termId = this.generateTerminalId()

      // Determine shell
      let shell: string
      let shellArgs: string[] = []

      if (os.platform() === 'win32') {
        shell = 'powershell.exe'
      } else {
        shell = process.env.SHELL || '/bin/bash'
        shellArgs = ['-l'] // Login shell to load .bashrc, .zshrc, etc.
      }

      // Spawn PTY
      const ptyProcess = pty.spawn(shell, shellArgs, {
        name: 'xterm-256color',
        cols: 80,
        rows: 30,
        cwd: process.env.HOME || process.cwd(),
        env: process.env as { [key: string]: string }
      })

      console.log('[Terminal] Created PTY:', termId, 'Shell:', shell)

      // Store terminal session
      this.terminals.set(termId, { pty: ptyProcess, ws })

      // Forward PTY output to WebSocket
      ptyProcess.on('data', (data) => {
        if (ws.readyState === WSWebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'data',
            data: data
          }))
        }
      })

      // Handle PTY exit
      ptyProcess.on('exit', (exitCode) => {
        console.log(`[Terminal] PTY exited with code ${exitCode}`)
        if (ws.readyState === WSWebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'exit' }))
          ws.close()
        }
        this.terminals.delete(termId)
      })

      // Handle WebSocket messages
      ws.on('message', (message) => {
        try {
          const msg = JSON.parse(message.toString())

          switch (msg.type) {
            case 'data':
              // Write input to PTY
              ptyProcess.write(msg.data)
              break

            case 'resize':
              // Resize PTY
              ptyProcess.resize(msg.cols, msg.rows)
              console.log(`[Terminal] Resized to ${msg.cols}x${msg.rows}`)
              break

            default:
              console.warn('[Terminal] Unknown message type:', msg.type)
          }
        } catch (error) {
          console.error('[Terminal] Error handling message:', error)
        }
      })

      // Handle WebSocket errors
      ws.on('error', (error) => {
        console.error('[Terminal] WebSocket error:', error)
      })

      // Handle WebSocket close
      ws.on('close', () => {
        console.log('[Terminal] Connection closed:', termId)
        ptyProcess.kill()
        this.terminals.delete(termId)
      })

      // Send initial connection success
      ws.send(JSON.stringify({
        type: 'connected',
        termId: termId
      }))
    })

    // Handle server errors
    this.wss.on('error', (error) => {
      console.error('[Terminal] Server error:', error)
    })
  }

  private generateTerminalId(): string {
    return 'term-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9)
  }

  close() {
    console.log('[Terminal] Shutting down...')
    // Clean up all terminals
    this.terminals.forEach(({ pty }) => pty.kill())
    this.terminals.clear()
    this.wss.close()
  }
}

// Export factory function
export function createTerminalHandler(httpServer: Server): TerminalHandler {
  return new TerminalHandler(httpServer)
}
