import { ipcMain, BrowserWindow, dialog } from 'electron'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'
import * as chokidar from 'chokidar'

// Store directory watchers
const directoryWatchers = new Map<string, chokidar.FSWatcher>()

export const registerFileHandlers = (mainWindow: BrowserWindow) => {
  // Get home directory
  ipcMain.handle('get-home-dir', () => {
    return os.homedir()
  })

  // Select directory using dialog
  ipcMain.handle('select-directory', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Select Directory',
      buttonLabel: 'Select Folder'
    })
    
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0]
    }
    return null
  })

  // Read directory contents
  ipcMain.handle('read-directory', async (event, dirPath: string) => {
    try {
      const items = await fs.readdir(dirPath, { withFileTypes: true })
      
      // Filter out .DS_Store and other system files
      const filteredItems = items.filter(item => item.name !== '.DS_Store')
      
      const results = await Promise.all(filteredItems.map(async (item) => {
        const fullPath = path.join(dirPath, item.name)
        const stats = await fs.stat(fullPath)
        return {
          name: item.name,
          path: fullPath,
          isDirectory: item.isDirectory(),
          size: stats.size,
          modified: stats.mtime.toISOString(), // Convert Date to string
          extension: item.isDirectory() ? '' : path.extname(item.name)
        }
      }))
      
      // Sort: directories first, then files, alphabetically
      results.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1
        if (!a.isDirectory && b.isDirectory) return 1
        return a.name.localeCompare(b.name)
      })
      
      return results
    } catch (error) {
      console.error('Error reading directory:', error)
      return []
    }
  })

  // Read file content
  ipcMain.handle('read-file', async (event, filePath: string) => {
    try {
      const content = await fs.readFile(filePath, 'utf-8')
      const stats = await fs.stat(filePath)
      return {
        content,
        path: filePath,
        name: path.basename(filePath),
        size: stats.size,
        modified: stats.mtime.toISOString(), // Convert Date to string
        extension: path.extname(filePath)
      }
    } catch (error) {
      console.error('Error reading file:', error)
      return null
    }
  })

  // Watch directory for changes
  ipcMain.handle('watch-directory', (event, dirPath: string) => {
    try {
      // Don't watch the same directory twice
      if (directoryWatchers.has(dirPath)) {
        return { success: true, message: 'Already watching directory' }
      }

      const watcher = chokidar.watch(dirPath, {
        ignored: /[\/\\]\.|node_modules/, // Ignore dotfiles and node_modules
        persistent: true,
        ignoreInitial: true,
        depth: 0, // Only watch direct children, not subdirectories
        awaitWriteFinish: {
          stabilityThreshold: 300,
          pollInterval: 100
        }
      })

      // Send events to frontend when files change
      watcher.on('add', (filePath) => {
        console.log('[File Watcher] File added:', filePath)
        mainWindow.webContents.send('directory-changed', { 
          type: 'add', 
          directory: dirPath,
          file: filePath
        })
      })

      watcher.on('unlink', (filePath) => {
        console.log('[File Watcher] File removed:', filePath)
        mainWindow.webContents.send('directory-changed', { 
          type: 'remove', 
          directory: dirPath,
          file: filePath
        })
      })

      watcher.on('addDir', (dirPath) => {
        console.log('[File Watcher] Directory added:', dirPath)
        mainWindow.webContents.send('directory-changed', { 
          type: 'addDir', 
          directory: dirPath,
          file: dirPath
        })
      })

      watcher.on('unlinkDir', (dirPath) => {
        console.log('[File Watcher] Directory removed:', dirPath)
        mainWindow.webContents.send('directory-changed', { 
          type: 'removeDir', 
          directory: dirPath,
          file: dirPath
        })
      })

      watcher.on('error', (error) => {
        console.error('[File Watcher] Error:', error)
      })

      // Store watcher for cleanup
      directoryWatchers.set(dirPath, watcher)
      
      console.log('[File Watcher] Started watching:', dirPath)
      return { success: true, message: 'Directory watcher started' }
    } catch (error) {
      console.error('Error starting directory watcher:', error)
      return { success: false, message: 'Failed to start directory watcher' }
    }
  })

  // Stop watching directory
  ipcMain.handle('unwatch-directory', (event, dirPath: string) => {
    const watcher = directoryWatchers.get(dirPath)
    if (watcher) {
      watcher.close()
      directoryWatchers.delete(dirPath)
      console.log('[File Watcher] Stopped watching:', dirPath)
      return { success: true, message: 'Directory watcher stopped' }
    }
    return { success: false, message: 'No watcher found for directory' }
  })

  // Clean up all watchers on window close
  mainWindow.on('closed', () => {
    console.log('[File Watcher] Cleaning up all watchers')
    for (const [dirPath, watcher] of directoryWatchers.entries()) {
      watcher.close()
      directoryWatchers.delete(dirPath)
    }
  })
}