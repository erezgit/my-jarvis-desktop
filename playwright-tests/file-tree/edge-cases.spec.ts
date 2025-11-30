import { test, expect } from '@playwright/test';
import { JarvisInterface } from '../helpers/jarvis-interface';
import { FileTreeHelpers } from '../helpers/file-tree-helpers';
import { TestUtils } from '../helpers/test-utils';

/**
 * Category D: Edge Cases & Race Conditions Tests
 * Tests unusual scenarios, timing issues, and boundary conditions
 */
test.describe('Category D: Edge Cases & Race Conditions', () => {
  let jarvis: JarvisInterface;
  let fileTree: FileTreeHelpers;

  test.beforeEach(async ({ page }) => {
    jarvis = new JarvisInterface(page);
    fileTree = new FileTreeHelpers(page);

    await jarvis.navigate();
    await jarvis.waitForReady();
    await jarvis.clearConversation();
  });

  test.afterEach(async ({ page }) => {
    await TestUtils.cleanupTestWorkspace(page, jarvis);
  });

  test('D1: Simultaneous Operations - Concurrent file operations', async () => {
    const baseName = TestUtils.generateTestFileName('concurrent');
    const file1 = `${baseName}-1.md`;
    const file2 = `${baseName}-2.md`;
    const file3 = `${baseName}-3.md`;

    console.log('Starting simultaneous operations...');

    // Start operations without waiting for completion
    const op1 = jarvis.writeFile(file1, 'Content 1');
    const op2 = jarvis.writeFile(file2, 'Content 2');
    const op3 = jarvis.editFile(file1, 'Content 1', 'Updated Content 1');

    // Execute all simultaneously
    try {
      await Promise.all([op1, op2, op3]);
    } catch (error) {
      console.log('Some operations may have conflicted:', error);
    }

    // Wait for operations to settle
    await jarvis.page.waitForTimeout(2000);

    // Check results
    const results = {
      file1: await fileTree.fileExists(file1),
      file2: await fileTree.fileExists(file2),
      file3: await fileTree.fileExists(file3),
    };

    console.log('Simultaneous operations results:');
    Object.entries(results).forEach(([key, value]) => {
      console.log(`  ${key}: ${value ? '✅ Exists' : '❌ Not found'}`);
    });

    // At least some operations should succeed
    const successCount = Object.values(results).filter(Boolean).length;
    expect(successCount).toBeGreaterThan(0);

    // Check for any corruption or unexpected behavior
    const allFiles = await fileTree.getAllVisibleFiles();
    console.log(`Total visible files after concurrent ops: ${allFiles.length}`);
  });

  test('D2: File Replace (Delete + Create) - Atomic replacement', async () => {
    const fileName = TestUtils.generateTestFileName('replace');
    const originalContent = 'Original content that will be replaced';
    const newContent = 'Completely new content after replacement';

    // Create original file
    await jarvis.writeFile(fileName, originalContent);
    await fileTree.waitForFile(fileName);
    console.log('✅ Original file created');

    // Delete and immediately recreate
    await jarvis.executeBash(`rm ${fileName}`);
    await jarvis.writeFile(fileName, newContent);

    // Wait for operations to complete
    await jarvis.page.waitForTimeout(2000);

    // Check file state
    const fileExists = await fileTree.fileExists(fileName);
    console.log(`File exists after replace: ${fileExists ? '✅' : '❌'}`);

    if (fileExists) {
      // Verify it's the new version by checking response
      const response = await jarvis.getLastResponse();
      console.log('Operation completed successfully');
    }

    // File should exist (SDK Write should ensure it)
    expect(fileExists).toBeTruthy();
  });

  test('D3: Rename File (Bash mv) - File renaming', async () => {
    const oldName = TestUtils.generateTestFileName('old');
    const newName = TestUtils.generateTestFileName('new');

    // Create original file
    await jarvis.writeFile(oldName, 'Content to be renamed');
    await fileTree.waitForFile(oldName);
    console.log(`✅ Created file: ${oldName}`);

    // Rename using mv
    await jarvis.executeBash(`mv ${oldName} ${newName}`);
    await jarvis.page.waitForTimeout(2000);

    // Check both old and new names
    const oldExists = await fileTree.fileExists(oldName);
    const newExists = await fileTree.fileExists(newName);

    console.log('Rename results:');
    console.log(`  Old file (${oldName}): ${oldExists ? '❌ Still exists' : '✅ Gone'}`);
    console.log(`  New file (${newName}): ${newExists ? '✅ Exists' : '❌ Not found'}`);

    // Expected: mv not detected, so old stays, new doesn't appear
    if (oldExists && !newExists) {
      console.log('❌ Expected failure: mv operation not detected');

      // Test manual refresh
      await fileTree.refreshFileTree();
      const oldAfterRefresh = await fileTree.fileExists(oldName);
      const newAfterRefresh = await fileTree.fileExists(newName);

      console.log('After manual refresh:');
      console.log(`  Old file: ${oldAfterRefresh ? '❌ Still exists' : '✅ Gone'}`);
      console.log(`  New file: ${newAfterRefresh ? '✅ Appeared' : '❌ Not found'}`);

      expect(newAfterRefresh).toBeTruthy();
      expect(oldAfterRefresh).toBeFalsy();
    }
  });

  test('D4: Hidden Files Toggle - .env and .gitignore visibility', async () => {
    const hiddenFiles = [
      { name: '.env', content: 'SECRET_KEY=test123' },
      { name: '.gitignore', content: 'node_modules/\n*.log' },
      { name: '.config', content: 'CONFIG=value' },
      { name: '.hidden-folder/file.txt', content: 'Hidden folder content' }
    ];

    console.log('Creating hidden files...');

    // Create hidden files
    for (const file of hiddenFiles) {
      if (file.name.includes('/')) {
        const dir = file.name.split('/')[0];
        await jarvis.executeBash(`mkdir -p ${dir}`);
      }
      await jarvis.writeFile(file.name, file.content);
      await jarvis.page.waitForTimeout(200);
    }

    // Check visibility
    console.log('Hidden file visibility:');
    for (const file of hiddenFiles) {
      const fileName = file.name.split('/').pop()!;
      const visible = await fileTree.fileExists(fileName);
      console.log(`  ${file.name}: ${visible ? '✅ Visible' : '❌ Not visible'}`);
    }

    // Hidden files might need special settings to be visible
    const anyVisible = await fileTree.fileExists('.env') ||
                       await fileTree.fileExists('.gitignore') ||
                       await fileTree.fileExists('.config');

    console.log(`Hidden files setting: ${anyVisible ? 'Showing hidden' : 'Hiding hidden'}`);
  });

  test('D5: Rapid Fire Operations - Stress test file tree', async () => {
    const operations: Array<() => Promise<void>> = [];
    const operationCount = 20;

    console.log(`Preparing ${operationCount} rapid operations...`);

    // Build operation queue
    for (let i = 1; i <= operationCount; i++) {
      const fileName = `rapid-${i}.txt`;

      // Mix different operation types
      if (i % 4 === 0) {
        operations.push(() => jarvis.executeBash(`touch ${fileName}`));
      } else if (i % 4 === 1) {
        operations.push(() => jarvis.writeFile(fileName, `Content ${i}`));
      } else if (i % 4 === 2) {
        operations.push(() => jarvis.executeBash(`echo "Test ${i}" > ${fileName}`));
      } else {
        operations.push(() => jarvis.executeBash(`mkdir rapid-dir-${i}`));
      }
    }

    // Execute rapidly with minimal delay
    const startTime = Date.now();
    for (const op of operations) {
      op(); // Don't await - fire and forget
      await jarvis.page.waitForTimeout(10); // Tiny delay
    }

    // Wait for dust to settle
    await jarvis.page.waitForTimeout(3000);
    const duration = Date.now() - startTime;

    // Count what made it through
    const visibleFiles = await fileTree.getAllVisibleFiles();
    const visibleFolders = await fileTree.getAllVisibleFolders();

    console.log(`Rapid fire results (${duration}ms):`);
    console.log(`  Files visible: ${visibleFiles.length}`);
    console.log(`  Folders visible: ${visibleFolders.length}`);
    console.log(`  Success rate: ${((visibleFiles.length / operationCount) * 100).toFixed(1)}%`);

    // Some operations should succeed
    expect(visibleFiles.length).toBeGreaterThan(0);
  });

  test('D6: Large File Name - Boundary testing', async () => {
    const longName = 'a'.repeat(200) + '.txt'; // Very long filename
    const specialChars = 'file-with-$pecial-ch@rs-&-symbols!.txt';
    const unicode = 'файл-с-юникодом-文件-קובץ.txt';
    const spaces = 'file with spaces in name.txt';

    const testFiles = [
      { name: longName.substring(0, 100) + '.txt', desc: 'Long name (100 chars)' },
      { name: specialChars, desc: 'Special characters' },
      { name: unicode, desc: 'Unicode characters' },
      { name: spaces, desc: 'Spaces in name' }
    ];

    console.log('Testing edge case filenames:');

    for (const file of testFiles) {
      try {
        await jarvis.writeFile(file.name, 'Test content');
        await jarvis.page.waitForTimeout(500);

        const exists = await fileTree.waitForFile(file.name.split('/').pop()!, 2000);
        console.log(`  ${file.desc}: ${exists ? '✅ Handled' : '❌ Failed'}`);
      } catch (error) {
        console.log(`  ${file.desc}: ❌ Error - ${error}`);
      }
    }
  });

  test('D7: Nested Operations During Expansion - Tree state during updates', async () => {
    const rootFolder = TestUtils.generateTestFolderName('nested-state');

    // Create initial structure
    await jarvis.writeFile(`${rootFolder}/level1/file1.md`, 'Content 1');
    await jarvis.page.waitForTimeout(1000);

    // Try to expand folder if it exists
    if (await fileTree.folderExists(rootFolder)) {
      await fileTree.expandFolder(rootFolder);
      console.log('✅ Expanded root folder');

      // Now add more files while expanded
      await jarvis.writeFile(`${rootFolder}/level1/file2.md`, 'Content 2');
      await jarvis.writeFile(`${rootFolder}/level2/file3.md`, 'Content 3');
      await jarvis.page.waitForTimeout(1000);

      // Check if new items appear without refresh
      const file2Visible = await fileTree.fileExists('file2.md');
      const file3Visible = await fileTree.fileExists('file3.md');

      console.log('Files added to expanded tree:');
      console.log(`  file2.md (same level): ${file2Visible ? '✅' : '❌'}`);
      console.log(`  file3.md (new level): ${file3Visible ? '✅' : '❌'}`);

      // Check if expansion state maintained
      const stillExpanded = await fileTree.isFolderExpanded(rootFolder);
      console.log(`  Root still expanded: ${stillExpanded ? '✅' : '❌'}`);
    }
  });

  test('D8: File Overwrite - Handling existing files', async () => {
    const fileName = TestUtils.generateTestFileName('overwrite');
    const content1 = 'Initial content';
    const content2 = 'Overwritten content';
    const content3 = 'Final content';

    // Create initial file
    await jarvis.writeFile(fileName, content1);
    await fileTree.waitForFile(fileName);
    console.log('✅ Initial file created');

    // Overwrite with Write tool (should work)
    await jarvis.writeFile(fileName, content2);
    await jarvis.page.waitForTimeout(1000);

    const afterWrite = await fileTree.fileExists(fileName);
    console.log(`After Write overwrite: ${afterWrite ? '✅ Still exists' : '❌ Disappeared'}`);

    // Overwrite with bash echo
    await jarvis.executeBash(`echo "${content3}" > ${fileName}`);
    await jarvis.page.waitForTimeout(1000);

    const afterBash = await fileTree.fileExists(fileName);
    console.log(`After bash overwrite: ${afterBash ? '✅ Still exists' : '❌ Disappeared'}`);

    // File should persist through overwrites
    expect(afterWrite).toBeTruthy();
  });

  test('D9: Symbolic Links - Testing symlink handling', async () => {
    const targetFile = TestUtils.generateTestFileName('target');
    const linkName = TestUtils.generateTestFileName('symlink');

    // Create target file
    await jarvis.writeFile(targetFile, 'Target file content');
    await fileTree.waitForFile(targetFile);

    // Create symbolic link
    await jarvis.executeBash(`ln -s ${targetFile} ${linkName}`);
    await jarvis.page.waitForTimeout(1000);

    // Check if symlink appears
    const linkVisible = await fileTree.fileExists(linkName);
    console.log(`Symbolic link visibility: ${linkVisible ? '✅' : '❌'}`);

    // Manual refresh might be needed for bash operations
    if (!linkVisible) {
      await fileTree.refreshFileTree();
      const afterRefresh = await fileTree.fileExists(linkName);
      console.log(`After refresh: ${afterRefresh ? '✅ Visible' : '❌ Still not visible'}`);
    }
  });

  test('D10: Permission Changes - Testing chmod effects', async () => {
    const fileName = TestUtils.generateTestFileName('permissions');

    // Create file
    await jarvis.writeFile(fileName, 'Test content');
    await fileTree.waitForFile(fileName);

    // Change permissions
    await jarvis.executeBash(`chmod 444 ${fileName}`); // Read-only
    await jarvis.page.waitForTimeout(500);

    // File should still be visible
    const stillVisible = await fileTree.fileExists(fileName);
    console.log(`File after chmod 444: ${stillVisible ? '✅ Visible' : '❌ Not visible'}`);

    // Try to edit read-only file
    try {
      await jarvis.editFile(fileName, 'Test content', 'New content');
      console.log('Edit of read-only file: ⚠️ Succeeded (unexpected)');
    } catch (error) {
      console.log('Edit of read-only file: ✅ Failed as expected');
    }

    // Restore permissions
    await jarvis.executeBash(`chmod 644 ${fileName}`);

    expect(stillVisible).toBeTruthy();
  });
});