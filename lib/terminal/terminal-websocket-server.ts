import { WebSocketServer, WebSocket } from 'ws'
import * as pty from 'node-pty'
import * as os from 'os'

interface TerminalSession {
  pty: pty.IPty
  ws: WebSocket
  heartbeatInterval?: NodeJS.Timeout
  heartbeatTimeout?: NodeJS.Timeout
}

// Heartbeat configuration
const HEARTBEAT_INTERVAL = 30000 // 30 seconds
const HEARTBEAT_TIMEOUT = 10000  // 10 seconds

export class TerminalWebSocketServer {
  private wss: WebSocketServer
  private terminals: Map<string, TerminalSession> = new Map()

  constructor(port: number) {
    this.wss = new WebSocketServer({ port })
    this.setupWebSocketServer()
    console.log(`[Terminal WS] Server running on port ${port}`)
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (ws, req) => {
      console.log('[Terminal WS] New connection from', req.socket.remoteAddress)
      const termId = this.generateTerminalId()

      // Determine shell (EXACT SAME as Electron version)
      let shell: string
      let shellArgs: string[] = []

      if (os.platform() === 'win32') {
        shell = 'powershell.exe'
      } else {
        shell = process.env.SHELL || '/bin/zsh'
        shellArgs = ['-l'] // Login shell to load .zshrc, .bash_profile
      }

      // Spawn PTY (EXACT SAME as Electron version)
      const ptyProcess = pty.spawn(shell, shellArgs, {
        name: 'xterm-256color',
        cols: 80,
        rows: 30,
        cwd: process.env.HOME,
        env: process.env as { [key: string]: string }
      })

      console.log('[Terminal WS] Created PTY:', termId, 'Shell:', shell)

      // Store terminal session
      this.terminals.set(termId, { pty: ptyProcess, ws })

      // Setup heartbeat mechanism
      this.setupHeartbeat(ws, termId)

      // Forward PTY output to WebSocket
      ptyProcess.on('data', (data) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'data',
            data: data
          }))
        }
      })

      // Handle PTY exit
      ptyProcess.on('exit', (exitCode) => {
        console.log(`[Terminal WS] PTY exited with code ${exitCode}`)
        if (ws.readyState === WebSocket.OPEN) {
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
              console.log(`[Terminal WS] Resized to ${msg.cols}x${msg.rows}`)
              break

            default:
              console.warn('[Terminal WS] Unknown message type:', msg.type)
          }
        } catch (error) {
          console.error('[Terminal WS] Error handling message:', error)
        }
      })

      // Handle WebSocket errors
      ws.on('error', (error) => {
        console.error('[Terminal WS] WebSocket error:', error)
      })

      // Handle WebSocket close
      ws.on('close', () => {
        console.log('[Terminal WS] Connection closed:', termId)
        this.cleanupHeartbeat(termId)
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
      console.error('[Terminal WS] Server error:', error)
    })
  }

  private generateTerminalId(): string {
    return 'term-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9)
  }

  /**
   * Setup heartbeat mechanism for WebSocket connection
   * Sends ping every 30 seconds, expects pong within 10 seconds
   * Automatically closes zombie connections that don't respond
   */
  private setupHeartbeat(ws: WebSocket, termId: string) {
    const session = this.terminals.get(termId)
    if (!session) return

    // Send ping every 30 seconds
    const interval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        console.log(`[Terminal WS] Sending ping to ${termId}`)
        ws.ping()

        // Set timeout - if no pong in 10 seconds, connection is dead
        const timeout = setTimeout(() => {
          console.log(`[Terminal WS] No pong received from ${termId}, closing zombie connection`)
          ws.terminate() // Force close without waiting for close handshake
          this.cleanupHeartbeat(termId)
          session.pty.kill()
          this.terminals.delete(termId)
        }, HEARTBEAT_TIMEOUT)

        // Clear timeout when pong received
        ws.once('pong', () => {
          clearTimeout(timeout)
          console.log(`[Terminal WS] Pong received from ${termId}`)
        })

        // Store timeout reference for cleanup
        session.heartbeatTimeout = timeout
      } else {
        // Connection already closed, cleanup
        console.log(`[Terminal WS] Connection already closed for ${termId}, cleaning up heartbeat`)
        this.cleanupHeartbeat(termId)
      }
    }, HEARTBEAT_INTERVAL)

    // Store interval reference for cleanup
    session.heartbeatInterval = interval
    console.log(`[Terminal WS] Heartbeat mechanism enabled for ${termId}`)
  }

  /**
   * Clean up heartbeat timers for a terminal session
   */
  private cleanupHeartbeat(termId: string) {
    const session = this.terminals.get(termId)
    if (!session) return

    if (session.heartbeatInterval) {
      clearInterval(session.heartbeatInterval)
      session.heartbeatInterval = undefined
      console.log(`[Terminal WS] Cleared heartbeat interval for ${termId}`)
    }

    if (session.heartbeatTimeout) {
      clearTimeout(session.heartbeatTimeout)
      session.heartbeatTimeout = undefined
    }
  }

  close() {
    console.log('[Terminal WS] Shutting down server...')
    // Clean up all terminals and heartbeats
    this.terminals.forEach((session, termId) => {
      this.cleanupHeartbeat(termId)
      session.pty.kill()
    })
    this.terminals.clear()
    this.wss.close()
  }
}

// Export factory function
export function createTerminalServer(port: number): TerminalWebSocketServer {
  return new TerminalWebSocketServer(port)
}
