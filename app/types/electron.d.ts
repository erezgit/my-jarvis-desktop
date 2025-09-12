export interface FileItem {
  name: string
  path: string
  isDirectory: boolean
  size: number
  modified: string
  extension: string
}

export interface FileAPI {
  readDirectory: (dirPath: string) => Promise<FileItem[]>
  readFile: (filePath: string) => Promise<{
    content: string
    path: string
    name: string
    size: number
    modified: string
    extension: string
  } | null>
  getHomeDir: () => Promise<string>
  selectDirectory: () => Promise<string | null>
  watchDirectory: (dirPath: string) => Promise<{ success: boolean; message: string }>
  unwatchDirectory: (dirPath: string) => Promise<{ success: boolean; message: string }>
  onDirectoryChanged: (callback: (data: { type: string; directory: string; file: string }) => void) => void
  removeDirectoryChangeListener: () => void
}

export interface ElectronAPI {
  send: (channel: string, data: any) => void
  on: (channel: string, func: (...args: any[]) => void) => void
  removeAllListeners: (channel: string) => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
    fileAPI: FileAPI
    conveyor: any
  }
}