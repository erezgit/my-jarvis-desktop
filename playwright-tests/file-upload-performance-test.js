const { chromium } = require('playwright');
const path = require('path');

async function testFileUploadPerformance() {
    console.log('🎬 Starting file upload performance test...');

    // Launch browser with visible window (non-headless)
    const browser = await chromium.launch({
        headless: false,
        slowMo: 1000 // Slow down actions for visual clarity
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    const screenshotDir = '/Users/erezfern/Workspace/my-jarvis/spaces/my-jarvis-desktop/projects/my-jarvis-desktop/screenshots';

    try {
        // Step 1: Navigate to localhost:3001
        console.log('📍 Navigating to localhost:3001...');
        await page.goto('http://localhost:3001');
        await page.waitForLoadState('domcontentloaded');

        // Step 2: Take initial screenshot
        console.log('📸 Taking initial page screenshot...');
        await page.screenshot({
            path: path.join(screenshotDir, '01-initial-page-load.png'),
            fullPage: true
        });

        console.log('🔍 Looking for file upload button...');

        // Look for common file upload selectors
        const uploadSelectors = [
            'input[type="file"]',
            '[data-testid="file-upload"]',
            '.upload-button',
            'button:has-text("Upload")',
            'button:has-text("Choose File")',
            '[aria-label*="upload"]',
            '[title*="upload"]'
        ];

        let uploadButton = null;
        let foundSelector = null;

        for (const selector of uploadSelectors) {
            try {
                const element = await page.locator(selector).first();
                if (await element.isVisible({ timeout: 2000 })) {
                    uploadButton = element;
                    foundSelector = selector;
                    console.log(`✅ Found upload button with selector: ${selector}`);
                    break;
                }
            } catch (e) {
                // Continue to next selector
            }
        }

        if (!uploadButton) {
            console.log('❌ No file upload button found. Taking screenshot of full page...');
            await page.screenshot({
                path: path.join(screenshotDir, '02-no-upload-button-found.png'),
                fullPage: true
            });

            // Try to look in the chat interface specifically
            console.log('🔍 Searching in chat interface...');
            await page.locator('input[type="text"], textarea').first().click();
            await page.screenshot({
                path: path.join(screenshotDir, '03-chat-interface-focused.png'),
                fullPage: true
            });

            return;
        }

        // Step 3: Take screenshot showing upload button location
        console.log('📸 Taking screenshot of upload button location...');
        await uploadButton.scrollIntoViewIfNeeded();
        await page.screenshot({
            path: path.join(screenshotDir, '02-file-upload-button-found.png'),
            fullPage: true
        });

        // Step 4: Performance test - click upload button and time the response
        console.log('⏱️ Starting performance timing test...');

        // Screenshot before click
        await page.screenshot({
            path: path.join(screenshotDir, '03-before-click.png'),
            fullPage: true
        });

        const startTime = Date.now();
        console.log('🖱️ Clicking file upload button...');

        // Click and wait for file dialog
        await uploadButton.click();

        // Take screenshot immediately after click
        await page.screenshot({
            path: path.join(screenshotDir, '04-immediately-after-click.png'),
            fullPage: true
        });

        // Monitor for any changes/delays
        let timeElapsed = 0;
        const checkInterval = 1000; // Check every second

        while (timeElapsed < 15000) { // Max 15 seconds
            await page.waitForTimeout(checkInterval);
            timeElapsed = Date.now() - startTime;

            console.log(`⏰ Time elapsed: ${timeElapsed}ms`);

            // Take periodic screenshots
            await page.screenshot({
                path: path.join(screenshotDir, `05-delay-${Math.floor(timeElapsed/1000)}s.png`),
                fullPage: true
            });

            // Check if browser appears frozen (try to hover over element)
            try {
                await uploadButton.hover({ timeout: 100 });
                console.log(`✅ Browser responsive at ${timeElapsed}ms`);
            } catch (e) {
                console.log(`⚠️ Browser may be frozen at ${timeElapsed}ms`);
            }
        }

        const totalTime = Date.now() - startTime;
        console.log(`🏁 Test completed. Total time: ${totalTime}ms`);

        // Final screenshot
        await page.screenshot({
            path: path.join(screenshotDir, '06-final-state.png'),
            fullPage: true
        });

    } catch (error) {
        console.error('❌ Test error:', error);
        await page.screenshot({
            path: path.join(screenshotDir, 'error-state.png'),
            fullPage: true
        });
    } finally {
        console.log('🔒 Keeping browser open for manual inspection...');
        // Keep browser open for 30 seconds for manual inspection
        await page.waitForTimeout(30000);
        await browser.close();
    }
}

// Run the test
testFileUploadPerformance();