// File System Access API type definitions
interface FileItem {
  name: string
  path: string
  isDirectory: boolean
  size: number
  modified: string
  extension: string
}

interface FileAPI {
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
}

// Claude Authentication API type definitions
interface ClaudeAuthSession {
  accessToken: string
  refreshToken: string
  expiresAt: number
  scopes: string[]
  userId: string
  subscriptionType: string
  account: {
    email_address: string
    uuid: string
  }
}

interface ElectronAPI {
  auth: {
    checkStatus: () => Promise<{
      success: boolean
      isAuthenticated: boolean
      session?: ClaudeAuthSession | null
      error?: string
    }>
    startOAuth: () => Promise<{
      success: boolean
      message?: string
      error?: string
      pendingAuth?: boolean
    }>
    completeOAuth: (code: string) => Promise<{
      success: boolean
      session?: ClaudeAuthSession
      error?: string
    }>
    signOut: () => Promise<{
      success: boolean
      error?: string
    }>
  }
}

declare global {
  interface Window {
    showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>;
    fileAPI?: FileAPI;
    electronAPI?: ElectronAPI;
  }

  interface FileSystemDirectoryHandle {
    readonly kind: "directory";
    readonly name: string;
  }
}

export {};
