import { ipcMain, BrowserWindow, dialog } from 'electron'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'

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
}