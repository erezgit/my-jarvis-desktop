import { app, BrowserWindow } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { createAppWindow } from './app'
import { claudeForkHandler } from '@/lib/conveyor/handlers/claude-fork-handler'
import { claudeCliDetector } from '@/lib/conveyor/handlers/claude-cli-detector'
import { setupLogger, logger } from '@/lib/utils/logger'

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Initialize logging system first
  await setupLogger(true) // Enable debug mode for development
  logger.main.info('My Jarvis Clean starting up')

  // Detect and configure Claude CLI path
  try {
    const detectedPath = await claudeCliDetector.detectClaudePath()
    if (detectedPath) {
      claudeForkHandler.setClaudeCliPath(detectedPath)
      logger.main.info('Claude CLI detected and configured: {path}', { path: detectedPath })
    } else {
      logger.main.warn('Claude CLI not found - chat functionality may be limited')
    }
  } catch (error) {
    logger.main.error('Error detecting Claude CLI: {error}', { error })
  }

  // Start Claude backend server before creating window
  logger.main.info('Starting Claude fork server...')
  try {
    const serverResult = await claudeForkHandler.startBackendServer()
    if (serverResult.success) {
      logger.main.info('Claude fork server ready: {serverUrl}', {
        serverUrl: `http://127.0.0.1:${serverResult.port}`
      })
    } else {
      logger.main.error('Failed to start Claude fork server: {error}', { error: serverResult.error })
      // Continue anyway - UI will show error state
    }
  } catch (error) {
    logger.main.error('Error starting Claude fork server: {error}', { error })
    // Continue anyway - UI will show error state
  }

  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Create app window
  await createAppWindow()

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  app.on('activate', async function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      await createAppWindow()
    }
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', async () => {
  // Clean up Claude fork handler before quitting
  await claudeForkHandler.cleanup()

  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Handle app before-quit event for cleanup
app.on('before-quit', async () => {
  await claudeForkHandler.cleanup()
})

// In this file, you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.