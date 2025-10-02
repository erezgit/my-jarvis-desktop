import { BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { registerFileHandlers } from '../conveyor/handlers/file-handler'

export async function createAppWindow(): Promise<BrowserWindow> {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    center: true,
    minimizable: true,
    maximizable: true,
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false  // Allow local file access for audio files
    }
  })

  mainWindow.on('ready-to-show', () => {
    console.log('Window ready to show, attempting to display...')
    try {
      mainWindow.show()
      mainWindow.focus()
      mainWindow.setAlwaysOnTop(true)
      mainWindow.setAlwaysOnTop(false) // Just to bring to front
      console.log('Window should now be visible')
    } catch (error) {
      console.error('Error showing window:', error)
    }
  })

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Window failed to load:', errorCode, errorDescription)
  })

  mainWindow.webContents.on('crashed', () => {
    console.error('Window crashed!')
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Register file system handlers
  registerFileHandlers(mainWindow)

  // Load the Claude WebUI server
  // For both development and production, load from the Claude WebUI server
  const devPort = process.env.JARVIS_DEV_PORT || '8081'
  if (process.env.NODE_ENV === 'development') {
    // In development, use the JARVIS_DEV_PORT (8082 by default in dev script)
    mainWindow.loadURL(`http://127.0.0.1:${devPort}`)
    mainWindow.webContents.openDevTools()
  } else {
    // In production, load from the Claude WebUI server static files
    mainWindow.loadURL('http://127.0.0.1:8081')
  }

  return mainWindow
}