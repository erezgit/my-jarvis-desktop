import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for File Tree Refresh Testing
 * Tests the My Jarvis Desktop application's file tree refresh behavior
 */
export default defineConfig({
  testDir: '.',

  // Run tests in parallel
  fullyParallel: false,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: 1,

  // Reporter to use
  reporter: [
    ['list'],
    ['html', { outputFolder: '../html-report' }],
  ],

  // Shared settings for all projects
  use: {
    // Base URL for My Jarvis Desktop
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',

    // Timeout for each test
    actionTimeout: 10000,

    // Viewport size
    viewport: { width: 1280, height: 720 },

    // Headed mode
    headless: false,
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Test timeout
  timeout: 30000,

  // Global setup and teardown
  globalSetup: require.resolve('../helpers/global-setup.ts'),
  globalTeardown: require.resolve('../helpers/global-teardown.ts'),
});