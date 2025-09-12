import { contextBridge, ipcRenderer } from 'electron'
import { conveyor } from '@/lib/conveyor/api'

// Use `contextBridge` APIs to expose APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('conveyor', conveyor)
    
    // Add the terminal API exactly like our working app
    contextBridge.exposeInMainWorld('electronAPI', {
      send: (channel: string, data: any) => {
        const validChannels = ['terminal-create', 'terminal-data', 'terminal-resize']
        if (validChannels.includes(channel)) {
          ipcRenderer.send(channel, data)
        }
      },
      
      on: (channel: string, func: (...args: any[]) => void) => {
        const validChannels = ['terminal-data-', 'terminal-exit-']
        if (validChannels.some(valid => channel.startsWith(valid))) {
          ipcRenderer.on(channel, (event, ...args) => func(...args))
        }
      },
      
      removeAllListeners: (channel: string) => {
        ipcRenderer.removeAllListeners(channel)
      }
    })
    
    // Add file system API
    contextBridge.exposeInMainWorld('fileAPI', {
      readDirectory: async (dirPath: string) => {
        return await ipcRenderer.invoke('read-directory', dirPath)
      },
      readFile: async (filePath: string) => {
        return await ipcRenderer.invoke('read-file', filePath)
      },
      getHomeDir: async () => {
        return await ipcRenderer.invoke('get-home-dir')
      },
      selectDirectory: async () => {
        return await ipcRenderer.invoke('select-directory')
      },
      watchDirectory: async (dirPath: string) => {
        return await ipcRenderer.invoke('watch-directory', dirPath)
      },
      unwatchDirectory: async (dirPath: string) => {
        return await ipcRenderer.invoke('unwatch-directory', dirPath)
      },
      onDirectoryChanged: (callback: (data: any) => void) => {
        ipcRenderer.on('directory-changed', (event, data) => callback(data))
      },
      removeDirectoryChangeListener: () => {
        ipcRenderer.removeAllListeners('directory-changed')
      }
    })
  } catch (error) {
    console.error(error)
  }
} else {
  window.conveyor = conveyor
}
