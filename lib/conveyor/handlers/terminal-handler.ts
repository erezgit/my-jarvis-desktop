import { ipcMain, BrowserWindow } from 'electron'
import * as pty from 'node-pty'
import * as os from 'os'

// Store active terminal sessions - using object like original
const terminals: { [key: string]: pty.IPty } = {}

export const registerTerminalHandlers = (mainWindow: BrowserWindow) => {
  // Create a new terminal - EXACT copy from working app
  ipcMain.on('terminal-create', (event, id) => {
    // Use bash instead of zsh to avoid autocomplete issues
    const shell = os.platform() === 'win32' ? 'powershell.exe' : '/bin/bash'
    
    const ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols: 80,
      rows: 30,
      cwd: process.env.HOME,
      env: process.env as { [key: string]: string }
    })

    terminals[id] = ptyProcess

    // Forward terminal output to renderer
    ptyProcess.on('data', (data) => {
      console.log('[Backend] PTY output:', data.substring(0, 50), '...')
      event.reply('terminal-data-' + id, data)
    })

    // Handle terminal exit
    ptyProcess.on('exit', () => {
      delete terminals[id]
      event.reply('terminal-exit-' + id)
    })
  })

  // Write data to terminal
  ipcMain.on('terminal-data', (event, { id, data }) => {
    console.log('[Backend] Received from frontend:', data, 'Length:', data.length)
    if (terminals[id]) {
      terminals[id].write(data)
    }
  })

  // Resize terminal
  ipcMain.on('terminal-resize', (event, { id, cols, rows }) => {
    if (terminals[id]) {
      terminals[id].resize(cols, rows)
    }
  })

  // Clean up all terminals on window close
  mainWindow.on('closed', () => {
    Object.keys(terminals).forEach((id) => {
      terminals[id].kill()
      delete terminals[id]
    })
  })
}