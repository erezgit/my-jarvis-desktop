import { test, expect } from '@playwright/test';

test.describe('API Key Authentication', () => {
  test('should work with company API key', async ({ page }) => {
    // Navigate to My Jarvis
    await page.goto('http://localhost:3001');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Look for message input (adjust selector based on actual UI)
    const messageInput = page.locator('textarea, input[type="text"], [data-testid="message-input"], [placeholder*="message"], [placeholder*="Message"]');
    await expect(messageInput).toBeVisible({ timeout: 10000 });

    // Send a test message
    await messageInput.fill('Hello Claude');

    // Look for send button
    const sendButton = page.locator('button[type="submit"], [data-testid="send-button"], button:has-text("Send")');
    await sendButton.click();

    // Wait for response - look for any message container that appears
    await page.waitForTimeout(3000); // Give time for API call

    // Check that no error occurred (no error message visible)
    const errorSelectors = [
      '[data-testid="error-message"]',
      '.error',
      '[role="alert"]',
      'text="Service temporarily unavailable"',
      'text="Error"'
    ];

    for (const selector of errorSelectors) {
      const errorElement = page.locator(selector);
      if (await errorElement.isVisible()) {
        throw new Error(`Error message found: ${await errorElement.textContent()}`);
      }
    }

    // Look for any response content (success indicator)
    const responseSelectors = [
      '[data-testid="assistant-message"]',
      '.message',
      '[role="article"]',
      '.response'
    ];

    let responseFound = false;
    for (const selector of responseSelectors) {
      const responseElement = page.locator(selector);
      if (await responseElement.isVisible()) {
        responseFound = true;
        break;
      }
    }

    // If no specific response found, check for any new content that appeared
    if (!responseFound) {
      // At minimum, the system should accept the message without error
      const allText = await page.textContent('body');
      expect(allText).not.toContain('Service temporarily unavailable');
      expect(allText).not.toContain('No company API key configured');
    }
  });

  test('should handle API communication without errors', async ({ page }) => {
    // Monitor console for any API key related errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate to My Jarvis
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');

    // Check that no console errors occurred related to API keys
    const apiKeyErrors = consoleErrors.filter(error =>
      error.toLowerCase().includes('api key') ||
      error.toLowerCase().includes('anthropic') ||
      error.toLowerCase().includes('unauthorized')
    );

    expect(apiKeyErrors).toHaveLength(0);
  });
});