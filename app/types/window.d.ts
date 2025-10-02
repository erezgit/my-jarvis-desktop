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

declare global {
  interface Window {
    showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>;
    fileAPI?: FileAPI;
  }

  interface FileSystemDirectoryHandle {
    readonly kind: "directory";
    readonly name: string;
  }
}

export {};
