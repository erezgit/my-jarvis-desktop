import { test, expect } from '@playwright/test';

test.describe('Expanded Folder File Tree Refresh', () => {
  test('should refresh expanded folders when new files are added', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:3000');

    // Wait for the app to load
    await page.waitForSelector('[data-testid="jarvis-terminal"]', { timeout: 10000 });

    // Create a test folder first
    const folderName = `test-expanded-${Date.now()}`;
    await page.fill('[data-testid="jarvis-terminal"]', `mkdir ${folderName}`);
    await page.press('[data-testid="jarvis-terminal"]', 'Enter');

    // Wait for folder to appear in tree
    await page.waitForTimeout(2000);

    // Create first file in the folder
    await page.fill('[data-testid="jarvis-terminal"]', `touch ${folderName}/file1.txt`);
    await page.press('[data-testid="jarvis-terminal"]', 'Enter');

    // Wait for the file to be created
    await page.waitForTimeout(2000);

    // Now expand the folder by clicking on it
    const folderElement = page.locator(`text="${folderName}"`).first();
    await folderElement.click();

    // Wait for expansion
    await page.waitForTimeout(1000);

    // Verify file1.txt is visible
    await expect(page.locator('text="file1.txt"')).toBeVisible();

    // NOW THE CRITICAL TEST: Add another file while folder is expanded
    await page.fill('[data-testid="jarvis-terminal"]', `touch ${folderName}/file2.txt`);
    await page.press('[data-testid="jarvis-terminal"]', 'Enter');

    // Wait for refresh
    await page.waitForTimeout(2000);

    // CHECK: file2.txt should appear WITHOUT collapsing/re-expanding
    await expect(page.locator('text="file2.txt"')).toBeVisible();

    // Add a third file to be thorough
    await page.fill('[data-testid="jarvis-terminal"]', `touch ${folderName}/file3.txt`);
    await page.press('[data-testid="jarvis-terminal"]', 'Enter');

    // Wait for refresh
    await page.waitForTimeout(2000);

    // Verify all three files are visible
    await expect(page.locator('text="file1.txt"')).toBeVisible();
    await expect(page.locator('text="file2.txt"')).toBeVisible();
    await expect(page.locator('text="file3.txt"')).toBeVisible();

    // Clean up
    await page.fill('[data-testid="jarvis-terminal"]', `rm -rf ${folderName}`);
    await page.press('[data-testid="jarvis-terminal"]', 'Enter');
  });

  test('should handle nested folder refresh', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:3000');

    // Wait for the app to load
    await page.waitForSelector('[data-testid="jarvis-terminal"]', { timeout: 10000 });

    // Create nested structure
    const rootFolder = `nested-test-${Date.now()}`;
    await page.fill('[data-testid="jarvis-terminal"]', `mkdir -p ${rootFolder}/subfolder`);
    await page.press('[data-testid="jarvis-terminal"]', 'Enter');

    await page.waitForTimeout(2000);

    // Add initial file to subfolder
    await page.fill('[data-testid="jarvis-terminal"]', `touch ${rootFolder}/subfolder/initial.txt`);
    await page.press('[data-testid="jarvis-terminal"]', 'Enter');

    await page.waitForTimeout(2000);

    // Expand root folder
    await page.locator(`text="${rootFolder}"`).first().click();
    await page.waitForTimeout(1000);

    // Expand subfolder
    await page.locator('text="subfolder"').first().click();
    await page.waitForTimeout(1000);

    // Verify initial file is visible
    await expect(page.locator('text="initial.txt"')).toBeVisible();

    // Add new file to expanded subfolder
    await page.fill('[data-testid="jarvis-terminal"]', `touch ${rootFolder}/subfolder/added.txt`);
    await page.press('[data-testid="jarvis-terminal"]', 'Enter');

    await page.waitForTimeout(2000);

    // Both files should be visible
    await expect(page.locator('text="initial.txt"')).toBeVisible();
    await expect(page.locator('text="added.txt"')).toBeVisible();

    // Clean up
    await page.fill('[data-testid="jarvis-terminal"]', `rm -rf ${rootFolder}`);
    await page.press('[data-testid="jarvis-terminal"]', 'Enter');
  });
});