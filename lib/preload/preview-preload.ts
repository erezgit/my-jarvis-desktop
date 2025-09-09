import { contextBridge, ipcRenderer } from 'electron'

// Expose a secure API to the preview renderer process
contextBridge.exposeInMainWorld('previewAPI', {
  // File selection handler
  onFileSelected: (callback: (filePath: string) => void) => {
    ipcRenderer.on('file-selected', (_event, filePath) => {
      // Validate file path
      if (filePath && typeof filePath === 'string' && filePath.endsWith('.mdx')) {
        callback(filePath)
      }
    })
  },

  // Component creation handler
  onComponentCreated: (callback: (componentData: any) => void) => {
    ipcRenderer.on('component-created', (_event, componentData) => {
      // Validate component data
      if (componentData && componentData.name && componentData.code) {
        callback(componentData)
      }
    })
  },

  // Request file content
  requestFileContent: (filePath: string): Promise<string> => {
    return ipcRenderer.invoke('get-file-content', filePath)
  },

  // Report errors back to main process
  reportError: (error: {
    message: string
    stack?: string
    componentStack?: string
  }) => {
    ipcRenderer.send('preview-error', error)
  },

  // Get workspace path
  getWorkspacePath: (): Promise<string> => {
    return ipcRenderer.invoke('get-workspace-path')
  },

  // Watch file changes
  watchFile: (filePath: string, callback: () => void) => {
    ipcRenderer.on(`file-changed:${filePath}`, callback)
    ipcRenderer.send('watch-file', filePath)
    
    // Return cleanup function
    return () => {
      ipcRenderer.removeAllListeners(`file-changed:${filePath}`)
      ipcRenderer.send('unwatch-file', filePath)
    }
  }
})

// Add TypeScript declarations
declare global {
  interface Window {
    previewAPI: {
      onFileSelected: (callback: (filePath: string) => void) => void
      onComponentCreated: (callback: (componentData: any) => void) => void
      requestFileContent: (filePath: string) => Promise<string>
      reportError: (error: { message: string; stack?: string; componentStack?: string }) => void
      getWorkspacePath: () => Promise<string>
      watchFile: (filePath: string, callback: () => void) => () => void
    }
  }
}