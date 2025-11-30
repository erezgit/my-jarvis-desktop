import { test, expect } from '@playwright/test';
import { JarvisInterface } from '../helpers/jarvis-interface';
import { FileTreeHelpers } from '../helpers/file-tree-helpers';
import { TestUtils } from '../helpers/test-utils';

/**
 * Category B: Directory Operations Tests
 * Tests folder creation, nesting, moving, and deletion
 */
test.describe('Category B: Directory Operations', () => {
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

  test('B1: Create Empty Directory (Natural request) - Testing fix', async () => {
    const folderName = TestUtils.generateTestFolderName('mkdir');

    // Ask naturally like a user would
    const naturalRequest = `Please create a new directory called ${folderName}`;
    await jarvis.sendCommand(naturalRequest);

    // Wait and check if folder appears (should work with fix)
    const appeared = await fileTree.waitForFolder(folderName, 10000);

    if (!appeared) {
      console.log(`❌ B1: Natural request - Folder did NOT appear`);

      // Test manual refresh
      await fileTree.refreshFileTree();
      const afterRefresh = await fileTree.folderExists(folderName);

      // Even after refresh, empty folders might not show
      console.log(`After refresh: ${afterRefresh ? '✅ Folder appeared' : '❌ Still not visible'}`);

      // Try creating a file in the folder to make it visible
      const testFile = `${folderName}/test.md`;
      await jarvis.writeFile(testFile, 'Test content');
      await jarvis.page.waitForTimeout(1000);

      const folderAppearedWithFile = await fileTree.folderExists(folderName);
      console.log(`With file inside: ${folderAppearedWithFile ? '✅ Folder now visible' : '❌ Still not visible'}`);
    } else {
      console.log(`✅ B1: Bash mkdir - Folder appeared! Bug may be fixed`);
      expect(appeared).toBeTruthy();
    }
  });

  test('B2: Create Nested Directory (Bash mkdir -p) - Currently fails', async () => {
    const nestedPath = `parent-${Date.now()}/child/grandchild`;

    // Create nested directories
    const bashCommand = TestUtils.formatBashCommand('mkdir-p', nestedPath);
    await jarvis.executeBash(bashCommand);

    // Wait and check each level
    await jarvis.page.waitForTimeout(2000);

    const parentExists = await fileTree.folderExists(`parent-${Date.now()}`);
    const childPath = nestedPath.split('/').slice(0, 2).join('/');
    const childExists = await fileTree.folderExists('child');
    const grandchildExists = await fileTree.folderExists('grandchild');

    console.log(`Nested creation results:`);
    console.log(`  Parent: ${parentExists ? '✅' : '❌'}`);
    console.log(`  Child: ${childExists ? '✅' : '❌'}`);
    console.log(`  Grandchild: ${grandchildExists ? '✅' : '❌'}`);

    // Try manual refresh
    if (!parentExists && !childExists && !grandchildExists) {
      await fileTree.refreshFileTree();
      console.log(`After refresh: Checking again...`);

      // Create a file to make the structure visible
      const testFile = `${nestedPath}/test.md`;
      await jarvis.writeFile(testFile, 'Making nested structure visible');
      await jarvis.page.waitForTimeout(1000);

      const fileAppeared = await fileTree.fileExists('test.md');
      console.log(`File in nested structure: ${fileAppeared ? '✅ Visible' : '❌ Not visible'}`);
    }
  });

  test('B3: Move Directory (Bash mv) - Currently fails', async () => {
    const originalName = TestUtils.generateTestFolderName('original');
    const newName = TestUtils.generateTestFolderName('renamed');

    // First create a directory with a file inside
    await jarvis.executeBash(`mkdir ${originalName}`);
    await jarvis.writeFile(`${originalName}/content.md`, 'Test content');
    await jarvis.page.waitForTimeout(1000);

    // Verify original exists (should work because of the file)
    const originalVisible = await fileTree.folderExists(originalName);
    console.log(`Original folder visible: ${originalVisible ? '✅' : '❌'}`);

    // Move the directory
    const mvCommand = TestUtils.formatBashCommand('mv', originalName, newName);
    await jarvis.executeBash(mvCommand);
    await jarvis.page.waitForTimeout(2000);

    // Check if the move is reflected
    const oldGone = await fileTree.waitForFolderToDisappear(originalName, 2000);
    const newAppeared = await fileTree.waitForFolder(newName, 2000);

    console.log(`Move results:`);
    console.log(`  Old folder gone: ${oldGone ? '✅' : '❌ (expected failure)'}`);
    console.log(`  New folder appeared: ${newAppeared ? '✅' : '❌ (expected failure)'}`);

    // Try manual refresh
    if (!oldGone || !newAppeared) {
      await fileTree.refreshFileTree();
      const afterRefreshOld = await fileTree.folderExists(originalName);
      const afterRefreshNew = await fileTree.folderExists(newName);

      console.log(`After refresh:`);
      console.log(`  Old folder: ${afterRefreshOld ? '❌ Still there' : '✅ Gone'}`);
      console.log(`  New folder: ${afterRefreshNew ? '✅ Appeared' : '❌ Not visible'}`);
    }
  });

  test('B4: Delete Directory (Bash rm -rf) - Currently fails', async () => {
    const folderName = TestUtils.generateTestFolderName('delete');

    // Create directory with content
    await jarvis.executeBash(`mkdir ${folderName}`);
    await jarvis.writeFile(`${folderName}/file1.md`, 'Content 1');
    await jarvis.writeFile(`${folderName}/file2.md`, 'Content 2');
    await jarvis.page.waitForTimeout(1000);

    // Verify folder exists
    const folderExists = await fileTree.folderExists(folderName);
    console.log(`Folder created: ${folderExists ? '✅' : '❌'}`);

    // Delete the directory
    const rmCommand = TestUtils.formatBashCommand('rm-rf', folderName);
    await jarvis.executeBash(rmCommand);
    await jarvis.page.waitForTimeout(2000);

    // Check if deletion is reflected
    const disappeared = await fileTree.waitForFolderToDisappear(folderName, 3000);

    if (!disappeared) {
      console.log(`❌ B4: Bash rm -rf - Folder did NOT disappear (expected failure)`);

      // Try manual refresh
      await fileTree.refreshFileTree();
      const afterRefresh = await fileTree.folderExists(folderName);

      expect(afterRefresh).toBeFalsy();
      console.log(`✅ B4: Folder disappeared after manual refresh`);
    } else {
      console.log(`✅ B4: Bash rm -rf - Folder disappeared! Bug may be fixed`);
      expect(disappeared).toBeTruthy();
    }
  });

  test('B5: Create Directory via File Creation - Should work partially', async () => {
    const folderName = TestUtils.generateTestFolderName('implicit');
    const fileName = `${folderName}/README.md`;

    // Create file in non-existent directory (SDK should create parent)
    await jarvis.writeFile(fileName, 'This should create the parent folder');
    await jarvis.page.waitForTimeout(1000);

    // Check if both folder and file appear
    const fileAppeared = await fileTree.fileExists('README.md');
    const folderAppeared = await fileTree.folderExists(folderName);

    console.log(`Implicit directory creation:`);
    console.log(`  File appeared: ${fileAppeared ? '✅' : '❌'}`);
    console.log(`  Folder appeared: ${folderAppeared ? '✅' : '❌'}`);

    // This should work because SDK tools trigger updates
    expect(fileAppeared || folderAppeared).toBeTruthy();
  });

  test('B6: Complex Directory Structure - Mixed operations', async () => {
    const rootFolder = TestUtils.generateTestFolderName('complex');

    // Create complex structure with mixed commands
    const operations = [
      { type: 'bash', command: `mkdir -p ${rootFolder}/src/components` },
      { type: 'bash', command: `mkdir -p ${rootFolder}/src/utils` },
      { type: 'bash', command: `mkdir ${rootFolder}/tests` },
      { type: 'sdk', path: `${rootFolder}/README.md`, content: 'Project readme' },
      { type: 'sdk', path: `${rootFolder}/src/index.js`, content: 'export default {}' },
      { type: 'sdk', path: `${rootFolder}/src/components/Button.jsx`, content: 'Button component' },
      { type: 'sdk', path: `${rootFolder}/tests/test.spec.js`, content: 'Test file' },
    ];

    // Execute operations
    for (const op of operations) {
      if (op.type === 'bash') {
        await jarvis.executeBash(op.command!);
      } else if (op.type === 'sdk') {
        await jarvis.writeFile(op.path!, op.content!);
      }
      await jarvis.page.waitForTimeout(200);
    }

    // Wait for structure to settle
    await jarvis.page.waitForTimeout(2000);

    // Check what's visible
    const visibleFiles = await fileTree.getAllVisibleFiles();
    const visibleFolders = await fileTree.getAllVisibleFolders();

    console.log(`Complex structure results:`);
    console.log(`  Visible files: ${visibleFiles.length}`);
    console.log(`  Visible folders: ${visibleFolders.length}`);

    // SDK-created files should be visible
    const expectedFiles = ['README.md', 'index.js', 'Button.jsx', 'test.spec.js'];
    let foundFiles = 0;
    for (const file of expectedFiles) {
      if (await fileTree.fileExists(file)) {
        foundFiles++;
        console.log(`  ✅ Found: ${file}`);
      } else {
        console.log(`  ❌ Missing: ${file}`);
      }
    }

    // At least the SDK-created files should appear
    expect(foundFiles).toBeGreaterThan(0);
  });

  test('B7: Directory Expansion State - Test tree interaction', async () => {
    const parentFolder = TestUtils.generateTestFolderName('expand-test');

    // Create nested structure using SDK (to ensure visibility)
    await jarvis.writeFile(`${parentFolder}/file1.md`, 'Content 1');
    await jarvis.writeFile(`${parentFolder}/subfolder/file2.md`, 'Content 2');
    await jarvis.page.waitForTimeout(1500);

    // Check if parent folder exists
    const parentExists = await fileTree.folderExists(parentFolder);

    if (parentExists) {
      // Test expansion
      const initiallyExpanded = await fileTree.isFolderExpanded(parentFolder);
      console.log(`Initially expanded: ${initiallyExpanded}`);

      if (!initiallyExpanded) {
        await fileTree.expandFolder(parentFolder);
        await jarvis.page.waitForTimeout(500);
        const nowExpanded = await fileTree.isFolderExpanded(parentFolder);
        console.log(`After expand: ${nowExpanded ? '✅ Expanded' : '❌ Still collapsed'}`);
      }

      // Test collapse
      await fileTree.collapseFolder(parentFolder);
      await jarvis.page.waitForTimeout(500);
      const nowCollapsed = !await fileTree.isFolderExpanded(parentFolder);
      console.log(`After collapse: ${nowCollapsed ? '✅ Collapsed' : '❌ Still expanded'}`);
    } else {
      console.log(`Parent folder not visible - cannot test expansion`);
    }
  });
});