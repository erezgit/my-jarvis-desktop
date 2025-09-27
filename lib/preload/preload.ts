import { contextBridge, ipcRenderer } from 'electron'

// Use `contextBridge` APIs to expose APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    // Basic window API
    contextBridge.exposeInMainWorld('electronAPI', {
      minimize: () => ipcRenderer.invoke('window-minimize'),
      maximize: () => ipcRenderer.invoke('window-maximize'),
      close: () => ipcRenderer.invoke('window-close'),
    })

    // Claude API placeholder for future backend integration
    contextBridge.exposeInMainWorld('claudeAPI', {
      // Will be implemented when we copy backend management
      placeholder: true
    })
  } catch (error) {
    console.error(error)
  }
}