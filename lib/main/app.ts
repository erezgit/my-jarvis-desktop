import { BrowserWindow, shell, app } from 'electron'
import { join } from 'path'

export function createAppWindow(): void {
  // Create the main window.
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    show: false,
    backgroundColor: '#1c1c1c',
    frame: false,
    titleBarStyle: 'hiddenInset',
    title: 'My Jarvis Clean',
    maximizable: true,
    resizable: true,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      sandbox: false,
    },
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Always load built files for 100% dev-prod parity
  // This eliminates CORS issues and ensures identical behavior
  mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
}