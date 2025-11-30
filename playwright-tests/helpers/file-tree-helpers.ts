import { Page } from '@playwright/test';

/**
 * Helper class for interacting with the file tree component
 * Provides methods to check file/folder presence and state
 */
export class FileTreeHelpers {
  constructor(private page: Page) {}

  /**
   * Check if a file exists in the file tree
   */
  async fileExists(fileName: string): Promise<boolean> {
    const fileSelectors = [
      `[data-testid="file-tree-item-${fileName}"]`,
      `[aria-label*="${fileName}"]`,
      `.file-tree-item:has-text("${fileName}")`,
      `.file-item:has-text("${fileName}")`,
      `text="${fileName}"`
    ];

    for (const selector of fileSelectors) {
      try {
        const element = await this.page.waitForSelector(selector, { timeout: 1000, state: 'visible' });
        if (element) return true;
      } catch {
        // Try next selector
      }
    }

    return false;
  }

  /**
   * Check if a folder exists in the file tree
   */
  async folderExists(folderName: string): Promise<boolean> {
    const folderSelectors = [
      `[data-testid="folder-tree-item-${folderName}"]`,
      `[aria-label*="folder ${folderName}"]`,
      `.folder-tree-item:has-text("${folderName}")`,
      `.folder-item:has-text("${folderName}")`,
      `.directory:has-text("${folderName}")`
    ];

    for (const selector of folderSelectors) {
      try {
        const element = await this.page.waitForSelector(selector, { timeout: 1000, state: 'visible' });
        if (element) return true;
      } catch {
        // Try next selector
      }
    }

    return false;
  }

  /**
   * Wait for a file to appear in the tree
   */
  async waitForFile(fileName: string, timeout: number = 5000): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (await this.fileExists(fileName)) {
        return true;
      }
      await this.page.waitForTimeout(100);
    }

    return false;
  }

  /**
   * Wait for a folder to appear in the tree
   */
  async waitForFolder(folderName: string, timeout: number = 5000): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (await this.folderExists(folderName)) {
        return true;
      }
      await this.page.waitForTimeout(100);
    }

    return false;
  }

  /**
   * Wait for a file to disappear from the tree
   */
  async waitForFileToDisappear(fileName: string, timeout: number = 5000): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (!(await this.fileExists(fileName))) {
        return true;
      }
      await this.page.waitForTimeout(100);
    }

    return false;
  }

  /**
   * Wait for a folder to disappear from the tree
   */
  async waitForFolderToDisappear(folderName: string, timeout: number = 5000): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (!(await this.folderExists(folderName))) {
        return true;
      }
      await this.page.waitForTimeout(100);
    }

    return false;
  }

  /**
   * Check if a folder is expanded
   */
  async isFolderExpanded(folderName: string): Promise<boolean> {
    const expandedSelectors = [
      `[data-testid="folder-tree-item-${folderName}"][aria-expanded="true"]`,
      `.folder-item:has-text("${folderName}").expanded`,
      `.directory:has-text("${folderName}").open`
    ];

    for (const selector of expandedSelectors) {
      try {
        const element = await this.page.$(selector);
        if (element) return true;
      } catch {
        // Try next selector
      }
    }

    return false;
  }

  /**
   * Expand a folder
   */
  async expandFolder(folderName: string) {
    if (await this.isFolderExpanded(folderName)) {
      return; // Already expanded
    }

    const clickSelectors = [
      `[data-testid="folder-tree-item-${folderName}"] [aria-label="Expand"]`,
      `.folder-item:has-text("${folderName}") .chevron`,
      `.directory:has-text("${folderName}") .arrow`
    ];

    for (const selector of clickSelectors) {
      try {
        await this.page.click(selector, { timeout: 1000 });
        return;
      } catch {
        // Try next selector
      }
    }

    // Try clicking on the folder name itself
    await this.page.click(`text="${folderName}"`, { timeout: 1000 });
  }

  /**
   * Collapse a folder
   */
  async collapseFolder(folderName: string) {
    if (!(await this.isFolderExpanded(folderName))) {
      return; // Already collapsed
    }

    const clickSelectors = [
      `[data-testid="folder-tree-item-${folderName}"] [aria-label="Collapse"]`,
      `.folder-item:has-text("${folderName}") .chevron`,
      `.directory:has-text("${folderName}") .arrow`
    ];

    for (const selector of clickSelectors) {
      try {
        await this.page.click(selector, { timeout: 1000 });
        return;
      } catch {
        // Try next selector
      }
    }

    // Try clicking on the folder name itself
    await this.page.click(`text="${folderName}"`, { timeout: 1000 });
  }

  /**
   * Refresh the file tree manually
   */
  async refreshFileTree() {
    const refreshSelectors = [
      '[data-testid="refresh-file-tree"]',
      '[aria-label="Refresh file tree"]',
      'button:has-text("Refresh")',
      '.refresh-button'
    ];

    for (const selector of refreshSelectors) {
      try {
        await this.page.click(selector, { timeout: 1000 });
        await this.page.waitForTimeout(500); // Wait for refresh to complete
        return true;
      } catch {
        // Try next selector
      }
    }

    return false;
  }

  /**
   * Get all visible files in the tree
   */
  async getAllVisibleFiles(): Promise<string[]> {
    const fileSelectors = [
      '.file-tree-item',
      '.file-item',
      '[data-type="file"]'
    ];

    for (const selector of fileSelectors) {
      const elements = await this.page.$$(selector);
      if (elements.length > 0) {
        const files: string[] = [];
        for (const element of elements) {
          const text = await element.textContent();
          if (text) files.push(text.trim());
        }
        return files;
      }
    }

    return [];
  }

  /**
   * Get all visible folders in the tree
   */
  async getAllVisibleFolders(): Promise<string[]> {
    const folderSelectors = [
      '.folder-tree-item',
      '.folder-item',
      '.directory',
      '[data-type="folder"]'
    ];

    for (const selector of folderSelectors) {
      const elements = await this.page.$$(selector);
      if (elements.length > 0) {
        const folders: string[] = [];
        for (const element of elements) {
          const text = await element.textContent();
          if (text) folders.push(text.trim());
        }
        return folders;
      }
    }

    return [];
  }

  /**
   * Count total items in the file tree
   */
  async getItemCount(): Promise<{ files: number, folders: number }> {
    const files = await this.getAllVisibleFiles();
    const folders = await this.getAllVisibleFolders();

    return {
      files: files.length,
      folders: folders.length
    };
  }

  /**
   * Check if the file tree is empty
   */
  async isEmpty(): Promise<boolean> {
    const count = await this.getItemCount();
    return count.files === 0 && count.folders === 0;
  }

  /**
   * Select a file in the tree
   */
  async selectFile(fileName: string) {
    await this.page.click(`text="${fileName}"`, { timeout: 2000 });
  }

  /**
   * Check if a file is selected
   */
  async isFileSelected(fileName: string): Promise<boolean> {
    const selectedSelectors = [
      `[data-testid="file-tree-item-${fileName}"][aria-selected="true"]`,
      `.file-item:has-text("${fileName}").selected`,
      `.file-item:has-text("${fileName}").active`
    ];

    for (const selector of selectedSelectors) {
      try {
        const element = await this.page.$(selector);
        if (element) return true;
      } catch {
        // Try next selector
      }
    }

    return false;
  }
}