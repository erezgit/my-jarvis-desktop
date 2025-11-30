import { Page } from '@playwright/test';

/**
 * File system helper class for testing file operations
 * Provides methods for creating, reading, and managing test files
 */
export class FileSystemHelpers {
  constructor(private page: Page) {}

  /**
   * Create a directory
   */
  async createDirectory(path: string): Promise<void> {
    await this.page.request.post('/api/test/fs/create-dir', {
      data: { path }
    });
  }

  /**
   * Remove a directory and all contents
   */
  async removeDirectory(path: string): Promise<void> {
    await this.page.request.post('/api/test/fs/remove-dir', {
      data: { path }
    });
  }

  /**
   * Write content to a file
   */
  async writeFile(filePath: string, content: string): Promise<void> {
    await this.page.request.post('/api/test/fs/write-file', {
      data: { filePath, content }
    });
  }

  /**
   * Read content from a file
   */
  async readFile(filePath: string): Promise<string> {
    const response = await this.page.request.get(`/api/test/fs/read-file?path=${encodeURIComponent(filePath)}`);
    const result = await response.json();
    return result.content;
  }

  /**
   * Check if a file exists
   */
  async fileExists(filePath: string): Promise<boolean> {
    const response = await this.page.request.get(`/api/test/fs/exists?path=${encodeURIComponent(filePath)}`);
    const result = await response.json();
    return result.exists;
  }

  /**
   * Append content to a file
   */
  async appendFile(filePath: string, content: string): Promise<void> {
    await this.page.request.post('/api/test/fs/append-file', {
      data: { filePath, content }
    });
  }

  /**
   * List files in a directory
   */
  async listFiles(dirPath: string): Promise<string[]> {
    const response = await this.page.request.get(`/api/test/fs/list-files?path=${encodeURIComponent(dirPath)}`);
    const result = await response.json();
    return result.files;
  }

  /**
   * Watch a directory for changes
   */
  async watchDirectory(dirPath: string): Promise<string> {
    const response = await this.page.request.post('/api/test/fs/watch-dir', {
      data: { dirPath }
    });
    const result = await response.json();
    return result.watcherId;
  }

  /**
   * Stop watching a directory
   */
  async stopWatching(watcherId: string): Promise<void> {
    await this.page.request.post('/api/test/fs/stop-watch', {
      data: { watcherId }
    });
  }

  /**
   * Get file modification time
   */
  async getModificationTime(filePath: string): Promise<Date> {
    const response = await this.page.request.get(`/api/test/fs/mod-time?path=${encodeURIComponent(filePath)}`);
    const result = await response.json();
    return new Date(result.modTime);
  }

  /**
   * Create a JSONL file with multiple entries
   */
  async createJSONLFile(filePath: string, entries: any[]): Promise<void> {
    const content = entries.map(entry => JSON.stringify(entry)).join('\n');
    await this.writeFile(filePath, content);
  }

  /**
   * Parse a JSONL file and return array of objects
   */
  async parseJSONLFile(filePath: string): Promise<any[]> {
    const content = await this.readFile(filePath);
    return content.split('\n')
      .filter(line => line.trim())
      .map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(obj => obj !== null);
  }

  /**
   * Simulate file system events for testing
   */
  async simulateFileChange(filePath: string, changeType: 'create' | 'modify' | 'delete'): Promise<void> {
    await this.page.request.post('/api/test/fs/simulate-change', {
      data: { filePath, changeType }
    });
  }
}