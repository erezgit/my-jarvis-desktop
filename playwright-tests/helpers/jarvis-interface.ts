import { Page } from '@playwright/test';

/**
 * Helper class for interacting with My Jarvis Desktop UI
 * Provides methods to send commands and verify responses
 */
export class JarvisInterface {
  constructor(private page: Page) {}

  /**
   * Navigate to My Jarvis Desktop
   */
  async navigate() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Send a command to Jarvis via the input field
   */
  async sendCommand(command: string) {
    const inputSelector = 'textarea[placeholder*="Type message"], textarea[placeholder*="Type a message"], [data-testid="message-input"]';

    // Wait for input field to be visible
    await this.page.waitForSelector(inputSelector, { state: 'visible', timeout: 5000 });

    // Type the command
    await this.page.fill(inputSelector, command);

    // Press Enter or click send button
    await this.page.keyboard.press('Enter');

    // Wait a bit for the command to be processed
    await this.page.waitForTimeout(500);
  }

  /**
   * Execute a file operation using SDK Write tool
   */
  async writeFile(filePath: string, content: string = 'Test content') {
    const command = `Use the Write tool to create a file at ${filePath} with content: "${content}"`;
    await this.sendCommand(command);

    // Wait for operation to complete
    await this.waitForCommandCompletion();
  }

  /**
   * Execute a file operation using SDK Edit tool
   */
  async editFile(filePath: string, oldContent: string, newContent: string) {
    const command = `Use the Edit tool to change "${oldContent}" to "${newContent}" in ${filePath}`;
    await this.sendCommand(command);

    // Wait for operation to complete
    await this.waitForCommandCompletion();
  }

  /**
   * Execute a bash command
   */
  async executeBash(bashCommand: string) {
    const command = `Execute this bash command: ${bashCommand}`;
    await this.sendCommand(command);

    // Wait for operation to complete
    await this.waitForCommandCompletion();
  }

  /**
   * Wait for a command to complete processing
   */
  async waitForCommandCompletion(timeout: number = 10000) {
    // Look for various completion indicators
    const completionSelectors = [
      '[data-testid="message-complete"]',
      '.message-content:last-child',
      '[role="status"]:has-text("Complete")',
      '.assistant-message:last-child'
    ];

    try {
      await this.page.waitForSelector(
        completionSelectors.join(', '),
        { state: 'visible', timeout }
      );
    } catch {
      // If no specific completion indicator, just wait a bit
      await this.page.waitForTimeout(2000);
    }
  }

  /**
   * Check if a response contains specific text
   */
  async responseContains(text: string): Promise<boolean> {
    try {
      await this.page.waitForSelector(`text="${text}"`, { timeout: 3000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the last response from Jarvis
   */
  async getLastResponse(): Promise<string | null> {
    const responseSelectors = [
      '.assistant-message:last-child',
      '[data-role="assistant"]:last-child',
      '.message-content:last-child'
    ];

    for (const selector of responseSelectors) {
      const element = await this.page.$(selector);
      if (element) {
        const text = await element.textContent();
        return text;
      }
    }

    return null;
  }

  /**
   * Clear the conversation
   */
  async clearConversation() {
    // Try different ways to clear conversation
    const clearButtons = [
      '[data-testid="clear-conversation"]',
      'button:has-text("Clear")',
      'button:has-text("New Chat")',
      '[aria-label="Clear conversation"]'
    ];

    for (const selector of clearButtons) {
      try {
        await this.page.click(selector, { timeout: 1000 });
        return;
      } catch {
        // Try next selector
      }
    }

    // If no clear button found, refresh the page
    await this.page.reload();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Wait for Jarvis to be ready
   */
  async waitForReady() {
    // Wait for main UI elements to be visible
    const readySelectors = [
      'textarea[placeholder*="Type a message"], input[placeholder*="Type a message"]',
      '[data-testid="file-tree"], .file-tree, .file-explorer',
    ];

    for (const selector of readySelectors) {
      try {
        await this.page.waitForSelector(selector, { state: 'visible', timeout: 5000 });
      } catch {
        // Element might not exist in this version
      }
    }
  }

  /**
   * Take a screenshot for debugging
   */
  async screenshot(name: string) {
    await this.page.screenshot({
      path: `test-results/screenshots/${name}.png`,
      fullPage: true
    });
  }
}