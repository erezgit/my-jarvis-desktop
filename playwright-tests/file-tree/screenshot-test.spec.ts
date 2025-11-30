import { test, expect } from '@playwright/test';

test('take screenshot of current state', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');
  await page.screenshot({
    path: 'current-state.png',
    fullPage: true
  });
  console.log('Screenshot saved to current-state.png');
});