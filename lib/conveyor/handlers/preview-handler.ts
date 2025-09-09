import { ipcMain, app, WebContentsView } from 'electron'
import * as fs from 'fs-extra'
import * as path from 'path'
import * as chokidar from 'chokidar'

export class PreviewIPCHandlers {
  private fileWatchers: Map<string, chokidar.FSWatcher> = new Map()
  private previewView: WebContentsView | null = null

  constructor(previewView?: WebContentsView) {
    if (previewView) {
      this.previewView = previewView
    }
    this.setupHandlers()
  }

  setPreviewView(view: WebContentsView) {
    this.previewView = view
  }

  private setupHandlers() {
    // Handle file content requests
    ipcMain.handle('get-file-content', async (_event, filePath: string) => {
      try {
        // Validate path is within workspace
        const workspacePath = this.getWorkspacePath()
        const resolvedPath = path.resolve(workspacePath, filePath)
        
        if (!resolvedPath.startsWith(workspacePath)) {
          throw new Error('Access denied: Path outside workspace')
        }
        
        // Check if file exists
        const exists = await fs.pathExists(resolvedPath)
        if (!exists) {
          throw new Error(`File not found: ${filePath}`)
        }
        
        // Read and return file content
        return await fs.readFile(resolvedPath, 'utf-8')
      } catch (error) {
        console.error('Error reading file:', error)
        throw error
      }
    })

    // Handle workspace path requests
    ipcMain.handle('get-workspace-path', () => {
      return this.getWorkspacePath()
    })

    // Handle file watching
    ipcMain.on('watch-file', (_event, filePath: string) => {
      this.watchFile(filePath)
    })

    ipcMain.on('unwatch-file', (_event, filePath: string) => {
      this.unwatchFile(filePath)
    })

    // Handle component creation
    ipcMain.handle('create-component', async (_event, componentData: {
      name: string
      code: string
    }) => {
      try {
        const componentsPath = path.join(this.getWorkspacePath(), 'components')
        const componentPath = path.join(componentsPath, `${componentData.name}.jsx`)
        
        // Ensure directory exists
        await fs.ensureDir(componentsPath)
        
        // Write component file
        await fs.writeFile(componentPath, componentData.code)
        
        // Notify preview view
        if (this.previewView) {
          this.previewView.webContents.send('component-created', {
            name: componentData.name,
            path: componentPath
          })
        }
        
        return { success: true, path: componentPath }
      } catch (error) {
        console.error('Error creating component:', error)
        throw error
      }
    })

    // Handle preview errors
    ipcMain.on('preview-error', (_event, error: any) => {
      console.error('Preview error reported:', error)
      // Could send to logging service or display notification
    })

    // Handle MDX file listing
    ipcMain.handle('list-mdx-files', async () => {
      try {
        const workspacePath = this.getWorkspacePath()
        const documentsPath = path.join(workspacePath, 'documents')
        
        // Ensure directory exists
        await fs.ensureDir(documentsPath)
        
        // Find all MDX files
        const files = await this.findMDXFiles(documentsPath)
        return files
      } catch (error) {
        console.error('Error listing MDX files:', error)
        return []
      }
    })
  }

  private getWorkspacePath(): string {
    // Use user data directory for workspace
    return path.join(app.getPath('userData'), 'workspace')
  }

  private watchFile(filePath: string) {
    // Don't watch the same file twice
    if (this.fileWatchers.has(filePath)) {
      return
    }

    const workspacePath = this.getWorkspacePath()
    const fullPath = path.resolve(workspacePath, filePath)

    // Validate path
    if (!fullPath.startsWith(workspacePath)) {
      console.error('Attempted to watch file outside workspace:', filePath)
      return
    }

    try {
      const watcher = chokidar.watch(fullPath, {
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
          stabilityThreshold: 300,
          pollInterval: 100
        }
      })

      watcher.on('change', () => {
        if (this.previewView) {
          this.previewView.webContents.send(`file-changed:${filePath}`)
        }
      })

      this.fileWatchers.set(filePath, watcher)
    } catch (error) {
      console.error('Error watching file:', error)
    }
  }

  private unwatchFile(filePath: string) {
    const watcher = this.fileWatchers.get(filePath)
    if (watcher) {
      watcher.close()
      this.fileWatchers.delete(filePath)
    }
  }

  private async findMDXFiles(dir: string, files: string[] = []): Promise<string[]> {
    const items = await fs.readdir(dir, { withFileTypes: true })
    
    for (const item of items) {
      const fullPath = path.join(dir, item.name)
      
      if (item.isDirectory()) {
        await this.findMDXFiles(fullPath, files)
      } else if (item.name.endsWith('.mdx')) {
        const workspacePath = this.getWorkspacePath()
        const relativePath = path.relative(workspacePath, fullPath)
        files.push(relativePath)
      }
    }
    
    return files
  }

  // Clean up watchers on app quit
  cleanup() {
    for (const watcher of this.fileWatchers.values()) {
      watcher.close()
    }
    this.fileWatchers.clear()
  }
}

// Export singleton instance
export const previewHandlers = new PreviewIPCHandlers()