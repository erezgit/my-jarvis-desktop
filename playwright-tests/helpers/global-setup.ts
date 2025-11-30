import { chromium } from '@playwright/test';

/**
 * Global setup for Playwright tests
 * Runs once before all tests
 */
async function globalSetup() {
  console.log('🚀 Starting global test setup...');

  // Verify My Jarvis Desktop is running
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto('http://localhost:3000', { timeout: 5000 });
    console.log('✅ My Jarvis Desktop is running on port 3000');
  } catch (error) {
    console.error('❌ My Jarvis Desktop is not running on port 3000');
    console.error('Please start My Jarvis Desktop before running tests');
    throw new Error('My Jarvis Desktop is not accessible');
  } finally {
    await browser.close();
  }

  // Create test results directories
  const fs = require('fs');
  const path = require('path');

  const dirs = [
    'test-results',
    'test-results/screenshots',
    'test-results/videos',
    'test-results/html'
  ];

  for (const dir of dirs) {
    const fullPath = path.join(__dirname, '..', dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  }

  console.log('✅ Global setup complete\n');
}

export default globalSetup;