import { ipcMain, BrowserWindow } from 'electron'
import * as pty from 'node-pty'
import * as os from 'os'

// Store active terminal sessions
const terminals: { [key: string]: pty.IPty } = {}

export const registerTerminalHandlers = (mainWindow: BrowserWindow) => {
  // Create a new terminal
  ipcMain.on('terminal-create', (event, id) => {
    // Determine the user's default shell or fallback to zsh/bash
    let shell: string
    let shellArgs: string[] = []

    if (os.platform() === 'win32') {
      shell = 'powershell.exe'
    } else {
      // Use the user's default shell from SHELL env var, or fallback to zsh
      shell = process.env.SHELL || '/bin/zsh'
      // Use login shell (-l) to load user's configuration (.zshrc, .bash_profile, etc.)
      shellArgs = ['-l']
    }

    const ptyProcess = pty.spawn(shell, shellArgs, {
      name: 'xterm-256color',
      cols: 80,
      rows: 30,
      cwd: process.env.HOME,
      env: process.env as { [key: string]: string }
    })

    terminals[id] = ptyProcess

    // Forward terminal output to renderer
    ptyProcess.on('data', (data) => {
      try {
        event.reply('terminal-data-' + id, data)
      } catch (error) {
        // Ignore EPIPE errors when window is closing
        if ((error as any).code !== 'EPIPE') {
          console.error('[Terminal Handler] Error sending data:', error)
        }
      }
    })

    // Handle terminal exit
    ptyProcess.on('exit', () => {
      delete terminals[id]
      try {
        event.reply('terminal-exit-' + id)
      } catch (error) {
        // Ignore errors if window is already closed
      }
    })
  })

  // Write data to terminal
  ipcMain.on('terminal-data', (event, { id, data }) => {
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
      try {
        terminals[id].kill()
      } catch (error) {
        // Ignore errors during cleanup
      }
      delete terminals[id]
    })
  })
}
