import { test, expect } from '@playwright/test';
import { JarvisInterface } from '../helpers/jarvis-interface';
import { FileTreeHelpers } from '../helpers/file-tree-helpers';
import { TestUtils } from '../helpers/test-utils';

/**
 * Category C: Complex Operations Tests
 * Tests real-world patterns like ticket creation workflows
 */
test.describe('Category C: Complex Operations', () => {
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

  test('C1: Create Ticket (Directory + File) - All Closed', async () => {
    const ticketNumber = Math.floor(Math.random() * 900) + 100; // 100-999
    const ticketName = `${ticketNumber}-test-ticket`;
    const ticketPath = `tickets/${ticketName}`;

    // Simulate ticket creation pattern
    console.log(`Creating ticket: ${ticketPath}`);

    // Step 1: Create tickets directory if needed
    await jarvis.executeBash('mkdir -p tickets');
    await jarvis.page.waitForTimeout(500);

    // Step 2: Create ticket directory
    await jarvis.executeBash(`mkdir ${ticketPath}`);
    await jarvis.page.waitForTimeout(500);

    // Step 3: Create README in ticket
    await jarvis.writeFile(`${ticketPath}/README.md`, `# Ticket ${ticketNumber}\n\nTest ticket for automation`);
    await jarvis.page.waitForTimeout(1000);

    // Check results
    const ticketsFolder = await fileTree.folderExists('tickets');
    const ticketFolder = await fileTree.folderExists(ticketName);
    const readmeFile = await fileTree.fileExists('README.md');

    console.log(`Ticket creation results (all folders initially closed):`);
    console.log(`  tickets/ folder: ${ticketsFolder ? '✅' : '❌'}`);
    console.log(`  ${ticketName}/ folder: ${ticketFolder ? '✅' : '❌'}`);
    console.log(`  README.md file: ${readmeFile ? '✅' : '❌'}`);

    // Expected: File creation triggers update, but directories don't
    expect(readmeFile || ticketFolder || ticketsFolder).toBeTruthy();

    // Check if folder auto-expanded
    if (ticketsFolder) {
      const ticketsExpanded = await fileTree.isFolderExpanded('tickets');
      console.log(`  tickets/ auto-expanded: ${ticketsExpanded ? '✅' : '❌'}`);
    }

    if (ticketFolder) {
      const ticketExpanded = await fileTree.isFolderExpanded(ticketName);
      console.log(`  ${ticketName}/ auto-expanded: ${ticketExpanded ? '✅' : '❌'}`);
    }
  });

  test('C2: Create Ticket - Parent Expanded', async () => {
    const ticketNumber = Math.floor(Math.random() * 900) + 100;
    const ticketName = `${ticketNumber}-expanded-test`;

    // First create and expand tickets folder
    await jarvis.writeFile('tickets/initial.md', 'Initial file to create tickets folder');
    await jarvis.page.waitForTimeout(1000);

    // Expand tickets folder if it exists
    if (await fileTree.folderExists('tickets')) {
      await fileTree.expandFolder('tickets');
      await jarvis.page.waitForTimeout(500);
      console.log('✅ Expanded tickets folder');
    }

    // Now create new ticket while parent is expanded
    await jarvis.executeBash(`mkdir tickets/${ticketName}`);
    await jarvis.writeFile(`tickets/${ticketName}/implementation.md`, '# Implementation Plan');
    await jarvis.page.waitForTimeout(1000);

    // Check if new ticket appears
    const ticketVisible = await fileTree.folderExists(ticketName);
    const fileVisible = await fileTree.fileExists('implementation.md');

    console.log(`Ticket creation with parent expanded:`);
    console.log(`  Ticket folder visible: ${ticketVisible ? '✅' : '❌'}`);
    console.log(`  Implementation file visible: ${fileVisible ? '✅' : '❌'}`);

    // With parent expanded, visibility might be better
    expect(fileVisible).toBeTruthy(); // File should definitely appear
  });

  test('C3: Nested Creation - Multiple Levels', async () => {
    const projectName = `project-${Date.now()}`;
    const structure = `${projectName}/src/components/atoms`;

    // Create deep nested structure with single command
    await jarvis.executeBash(`mkdir -p ${structure}`);
    await jarvis.page.waitForTimeout(500);

    // Create file at deepest level
    await jarvis.writeFile(`${structure}/Button.tsx`, 'export const Button = () => <button>Click me</button>');
    await jarvis.page.waitForTimeout(1000);

    // Check what's visible
    const levels = [
      { name: projectName, type: 'folder' },
      { name: 'src', type: 'folder' },
      { name: 'components', type: 'folder' },
      { name: 'atoms', type: 'folder' },
      { name: 'Button.tsx', type: 'file' }
    ];

    console.log('Nested structure visibility:');
    for (const level of levels) {
      const exists = level.type === 'folder'
        ? await fileTree.folderExists(level.name)
        : await fileTree.fileExists(level.name);
      console.log(`  ${level.name} (${level.type}): ${exists ? '✅' : '❌'}`);
    }

    // File should trigger some visibility
    const buttonVisible = await fileTree.fileExists('Button.tsx');
    expect(buttonVisible).toBeTruthy();

    // Check if entire path expanded
    if (await fileTree.folderExists(projectName)) {
      const expanded = await fileTree.isFolderExpanded(projectName);
      console.log(`Root auto-expanded to show file: ${expanded ? '✅' : '❌'}`);
    }
  });

  test('C4: Bulk File Creation - Rapid operations', async () => {
    const folderName = TestUtils.generateTestFolderName('bulk');
    const fileCount = 10;
    const results: { name: string; created: boolean; visible: boolean }[] = [];

    // Create folder first
    await jarvis.executeBash(`mkdir ${folderName}`);
    await jarvis.page.waitForTimeout(500);

    // Create multiple files rapidly
    console.log(`Creating ${fileCount} files rapidly...`);

    for (let i = 1; i <= fileCount; i++) {
      const fileName = `${folderName}/file-${i}.md`;
      const content = `Content for file ${i}`;

      // Alternate between SDK and bash to test both
      if (i % 2 === 0) {
        await jarvis.writeFile(fileName, content);
      } else {
        await jarvis.executeBash(`echo "${content}" > ${fileName}`);
      }

      // Minimal delay between operations
      await jarvis.page.waitForTimeout(50);
    }

    // Wait for all operations to complete
    await jarvis.page.waitForTimeout(2000);

    // Check visibility
    for (let i = 1; i <= fileCount; i++) {
      const fileName = `file-${i}.md`;
      const visible = await fileTree.fileExists(fileName);
      results.push({
        name: fileName,
        created: i % 2 === 0, // SDK-created
        visible
      });
    }

    // Analyze results
    const sdkFiles = results.filter(r => r.created);
    const bashFiles = results.filter(r => !r.created);
    const sdkVisible = sdkFiles.filter(r => r.visible).length;
    const bashVisible = bashFiles.filter(r => r.visible).length;

    console.log(`Bulk creation results:`);
    console.log(`  SDK files visible: ${sdkVisible}/${sdkFiles.length}`);
    console.log(`  Bash files visible: ${bashVisible}/${bashFiles.length}`);

    // SDK files should have better visibility
    expect(sdkVisible).toBeGreaterThanOrEqual(bashVisible);
  });

  test('C5: Real-world Workflow - Complete feature implementation', async () => {
    const featureName = 'user-authentication';

    // Simulate real developer workflow
    const workflow = [
      // 1. Create feature branch structure
      { action: 'bash', cmd: `mkdir -p features/${featureName}` },

      // 2. Create initial planning doc
      { action: 'sdk', file: `features/${featureName}/plan.md`, content: '# Authentication Feature Plan' },

      // 3. Create source directories
      { action: 'bash', cmd: `mkdir -p features/${featureName}/src/{api,components,hooks,utils}` },

      // 4. Create implementation files
      { action: 'sdk', file: `features/${featureName}/src/api/auth.ts`, content: 'export const login = () => {}' },
      { action: 'sdk', file: `features/${featureName}/src/components/LoginForm.tsx`, content: 'export const LoginForm = () => {}' },
      { action: 'sdk', file: `features/${featureName}/src/hooks/useAuth.ts`, content: 'export const useAuth = () => {}' },

      // 5. Create tests directory
      { action: 'bash', cmd: `mkdir features/${featureName}/tests` },

      // 6. Create test files
      { action: 'sdk', file: `features/${featureName}/tests/auth.test.ts`, content: 'describe("Auth", () => {})' },

      // 7. Update with bash
      { action: 'bash', cmd: `echo "# README" > features/${featureName}/README.md` },
    ];

    console.log('Executing real-world workflow...');

    for (const step of workflow) {
      if (step.action === 'bash') {
        await jarvis.executeBash(step.cmd!);
      } else if (step.action === 'sdk') {
        await jarvis.writeFile(step.file!, step.content!);
      }
      await jarvis.page.waitForTimeout(200);
    }

    await jarvis.page.waitForTimeout(2000);

    // Check final state
    const checkPoints = [
      { item: 'features', type: 'folder' },
      { item: featureName, type: 'folder' },
      { item: 'plan.md', type: 'file' },
      { item: 'auth.ts', type: 'file' },
      { item: 'LoginForm.tsx', type: 'file' },
      { item: 'useAuth.ts', type: 'file' },
      { item: 'auth.test.ts', type: 'file' },
      { item: 'README.md', type: 'file' },
    ];

    let visibleCount = 0;
    console.log('Workflow completion check:');

    for (const check of checkPoints) {
      const exists = check.type === 'folder'
        ? await fileTree.folderExists(check.item)
        : await fileTree.fileExists(check.item);

      if (exists) visibleCount++;
      console.log(`  ${check.item}: ${exists ? '✅' : '❌'}`);
    }

    // At least SDK-created files should be visible
    const expectedMinimum = checkPoints.filter(c => c.type === 'file' && c.item !== 'README.md').length;
    expect(visibleCount).toBeGreaterThanOrEqual(expectedMinimum);
  });

  test('C6: Parallel Operations - Multiple commands simultaneously', async () => {
    const baseName = TestUtils.generateTestFolderName('parallel');

    // Queue up multiple operations without waiting
    const operations = [
      jarvis.executeBash(`mkdir ${baseName}-1`),
      jarvis.executeBash(`mkdir ${baseName}-2`),
      jarvis.writeFile(`${baseName}-1/file1.md`, 'Content 1'),
      jarvis.writeFile(`${baseName}-2/file2.md`, 'Content 2'),
      jarvis.executeBash(`mkdir ${baseName}-3`),
      jarvis.writeFile(`${baseName}-3/file3.md`, 'Content 3'),
    ];

    console.log('Executing operations in parallel...');

    // Execute all at once
    await Promise.all(operations);

    // Wait for dust to settle
    await jarvis.page.waitForTimeout(2000);

    // Check what made it through
    const results = {
      folder1: await fileTree.folderExists(`${baseName}-1`),
      folder2: await fileTree.folderExists(`${baseName}-2`),
      folder3: await fileTree.folderExists(`${baseName}-3`),
      file1: await fileTree.fileExists('file1.md'),
      file2: await fileTree.fileExists('file2.md'),
      file3: await fileTree.fileExists('file3.md'),
    };

    console.log('Parallel execution results:');
    Object.entries(results).forEach(([key, value]) => {
      console.log(`  ${key}: ${value ? '✅' : '❌'}`);
    });

    // Files should be more reliable than folders
    const fileCount = [results.file1, results.file2, results.file3].filter(Boolean).length;
    const folderCount = [results.folder1, results.folder2, results.folder3].filter(Boolean).length;

    console.log(`Files visible: ${fileCount}/3, Folders visible: ${folderCount}/3`);
    expect(fileCount).toBeGreaterThanOrEqual(folderCount);
  });
});