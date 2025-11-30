import { test, expect } from '@playwright/test';
import { JarvisInterface } from '../helpers/jarvis-interface';
import { FileTreeHelpers } from '../helpers/file-tree-helpers';
import { TestUtils } from '../helpers/test-utils';

/**
 * Category A: Basic File Operations Tests
 * Tests file creation, editing, and deletion using both SDK tools and Bash commands
 */
test.describe('Category A: Basic File Operations', () => {
  let jarvis: JarvisInterface;
  let fileTree: FileTreeHelpers;

  test.beforeEach(async ({ page }) => {
    jarvis = new JarvisInterface(page);
    fileTree = new FileTreeHelpers(page);

    // Navigate to Jarvis and wait for it to be ready
    await jarvis.navigate();
    await jarvis.waitForReady();

    // Clear any previous conversation
    await jarvis.clearConversation();
  });

  test.afterEach(async ({ page }) => {
    // Clean up test files
    await TestUtils.cleanupTestWorkspace(page, jarvis);
  });

  test('A1: Create Single File (SDK Write Tool) - Should appear immediately', async () => {
    const fileName = TestUtils.generateTestFileName('sdk-write');
    const content = TestUtils.generateTestContent(3);

    // Create file using SDK Write tool
    await jarvis.writeFile(fileName, content);

    // Measure timing
    const timing = await TestUtils.measureTiming(async () => {
      return await fileTree.waitForFile(fileName);
    });

    // Verify file appears in tree
    expect(await fileTree.fileExists(fileName)).toBeTruthy();
    expect(timing.duration).toBeLessThan(500); // Should appear within 500ms

    // Log result
    console.log(`✅ A1: SDK Write tool - File appeared in ${timing.duration.toFixed(0)}ms`);
  });

  test('A2: Create Single File (Bash echo) - Currently fails', async () => {
    const fileName = TestUtils.generateTestFileName('bash-echo');
    const content = 'Test content from bash';

    // Create file using bash echo
    const bashCommand = TestUtils.formatBashCommand('echo', content, fileName);
    await jarvis.executeBash(bashCommand);

    // Wait and check if file appears (expect this to fail currently)
    const appeared = await fileTree.waitForFile(fileName, 3000);

    // This test documents the current failing behavior
    if (!appeared) {
      console.log(`❌ A2: Bash echo - File did NOT appear (expected failure)`);

      // Now test manual refresh
      await fileTree.refreshFileTree();
      const afterRefresh = await fileTree.fileExists(fileName);

      expect(afterRefresh).toBeTruthy(); // Should appear after manual refresh
      console.log(`✅ A2: File appeared after manual refresh`);
    } else {
      // If this passes, the bug has been fixed!
      console.log(`✅ A2: Bash echo - File appeared! Bug may be fixed`);
      expect(appeared).toBeTruthy();
    }
  });

  test('A3: Edit Existing File (SDK Edit Tool) - Should update', async () => {
    const fileName = TestUtils.generateTestFileName('edit-test');
    const originalContent = 'Original content';
    const newContent = 'Updated content';

    // First create the file
    await jarvis.writeFile(fileName, originalContent);
    await fileTree.waitForFile(fileName);

    // Edit the file
    await jarvis.editFile(fileName, originalContent, newContent);

    // Wait a moment for the edit to process
    await jarvis.page.waitForTimeout(1000);

    // Verify file still exists (edit shouldn't remove it)
    expect(await fileTree.fileExists(fileName)).toBeTruthy();

    // If file is selected, preview should update
    await fileTree.selectFile(fileName);
    await jarvis.page.waitForTimeout(500);

    // Check if response mentions successful edit
    const response = await jarvis.getLastResponse();
    expect(response).toContain('edit');

    console.log(`✅ A3: SDK Edit tool - File edited successfully`);
  });

  test('A4: Delete File (Bash rm) - Currently fails', async () => {
    const fileName = TestUtils.generateTestFileName('delete-test');

    // First create the file
    await jarvis.writeFile(fileName, 'Content to be deleted');
    await fileTree.waitForFile(fileName);

    // Verify file exists
    expect(await fileTree.fileExists(fileName)).toBeTruthy();

    // Delete using bash rm
    const bashCommand = TestUtils.formatBashCommand('rm', fileName);
    await jarvis.executeBash(bashCommand);

    // Wait and check if file disappears (expect this to fail currently)
    const disappeared = await fileTree.waitForFileToDisappear(fileName, 3000);

    if (!disappeared) {
      console.log(`❌ A4: Bash rm - File did NOT disappear (expected failure)`);

      // Now test manual refresh
      await fileTree.refreshFileTree();
      const afterRefresh = await fileTree.fileExists(fileName);

      expect(afterRefresh).toBeFalsy(); // Should disappear after manual refresh
      console.log(`✅ A4: File disappeared after manual refresh`);
    } else {
      // If this passes, the bug has been fixed!
      console.log(`✅ A4: Bash rm - File disappeared! Bug may be fixed`);
      expect(disappeared).toBeTruthy();
    }
  });

  test('A5: Create File with SDK, Delete with SDK - Should work', async () => {
    const fileName = TestUtils.generateTestFileName('sdk-lifecycle');

    // Create with SDK
    await jarvis.writeFile(fileName, 'Test content');
    await fileTree.waitForFile(fileName);
    expect(await fileTree.fileExists(fileName)).toBeTruthy();

    // Delete with SDK (simulate by overwriting with empty or using Edit)
    // Note: SDK doesn't have a delete tool, so we test workaround
    await jarvis.sendCommand(`Remove the file ${fileName} using any available method`);
    await jarvis.waitForCommandCompletion();

    // Check the response to understand what method was used
    const response = await jarvis.getLastResponse();
    console.log(`Delete method used: ${response?.substring(0, 100)}`);

    // File tree update depends on method used
    await jarvis.page.waitForTimeout(2000);

    // Document the behavior
    const stillExists = await fileTree.fileExists(fileName);
    console.log(`File exists after delete attempt: ${stillExists}`);
  });

  test('A6: Batch File Creation - Test rapid operations', async () => {
    const fileNames = [];
    const fileCount = 5;

    // Create multiple files rapidly
    for (let i = 1; i <= fileCount; i++) {
      const fileName = `batch-test-${i}.md`;
      fileNames.push(fileName);
      await jarvis.writeFile(fileName, `Content for file ${i}`);
      // Small delay between operations
      await jarvis.page.waitForTimeout(100);
    }

    // Wait a moment for all operations to complete
    await jarvis.page.waitForTimeout(1000);

    // Check how many files appeared
    let appearedCount = 0;
    for (const fileName of fileNames) {
      if (await fileTree.fileExists(fileName)) {
        appearedCount++;
      }
    }

    console.log(`✅ Batch creation: ${appearedCount}/${fileCount} files appeared`);

    // All SDK-created files should appear
    expect(appearedCount).toBe(fileCount);
  });

  test('A7: Hidden File Creation - Test .env and .gitignore', async () => {
    const hiddenFiles = ['.env', '.gitignore', '.config'];

    for (const fileName of hiddenFiles) {
      await jarvis.writeFile(fileName, `Content for ${fileName}`);
      await jarvis.page.waitForTimeout(500);

      // Check if hidden file appears (may depend on settings)
      const appeared = await fileTree.waitForFile(fileName, 2000);

      console.log(`Hidden file ${fileName}: ${appeared ? '✅ Visible' : '❌ Not visible'}`);

      // Document the behavior - hidden files might not show by default
      if (!appeared) {
        console.log(`Note: Hidden file ${fileName} may require setting to display`);
      }
    }
  });
});