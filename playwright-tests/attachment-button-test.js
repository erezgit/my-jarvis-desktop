const { chromium } = require('playwright');
const path = require('path');

async function testAttachmentButtonPerformance() {
    console.log('🎬 Starting attachment button performance test...');

    // Launch browser with visible window (non-headless)
    const browser = await chromium.launch({
        headless: false,
        slowMo: 500 // Slow down for visibility
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    const screenshotDir = '/Users/erezfern/Workspace/my-jarvis/spaces/my-jarvis-desktop/projects/my-jarvis-desktop/screenshots';

    try {
        // Step 1: Navigate to localhost:3001
        console.log('📍 Navigating to localhost:3001...');
        await page.goto('http://localhost:3001');
        await page.waitForLoadState('networkidle');

        // Step 2: Take initial screenshot
        console.log('📸 Taking initial page screenshot...');
        await page.screenshot({
            path: path.join(screenshotDir, '01-initial-page-load.png'),
            fullPage: true
        });

        // Wait a bit for the page to fully render
        await page.waitForTimeout(2000);

        // Step 3: Look for the attachment/paperclip icon
        console.log('🔍 Looking for attachment button...');

        // Try multiple selectors for attachment/upload buttons
        const attachmentSelectors = [
            'svg[data-slot="icon"]', // Heroicons paperclip
            'button:has(svg)', // Button containing SVG
            '[aria-label*="attach"]',
            '[title*="attach"]',
            'button:near([placeholder*="Type message"])', // Near the message input
            'svg:has(path[d*="clip"])', // SVG with clip path (paperclip)
        ];

        let attachmentButton = null;
        let foundSelector = null;

        // First, let's take a screenshot of the chat area specifically
        const chatContainer = page.locator('[placeholder*="Type message"]').first();
        await chatContainer.scrollIntoViewIfNeeded();

        await page.screenshot({
            path: path.join(screenshotDir, '02-chat-area-focused.png'),
            fullPage: false
        });

        // Look for buttons near the text input
        const inputArea = await page.locator('input[placeholder*="Type message"], textarea[placeholder*="Type message"]').first();

        if (await inputArea.isVisible()) {
            console.log('✅ Found input area, looking for nearby buttons...');

            // Get the input element's bounding box to look nearby
            const inputBox = await inputArea.boundingBox();

            if (inputBox) {
                // Look for clickable elements near the input (attachment button should be close)
                const nearbyButtons = page.locator('button').filter({
                    hasNotText: /^(Send|Clear)$/i // Exclude obvious Send/Clear buttons
                });

                const buttonCount = await nearbyButtons.count();
                console.log(`Found ${buttonCount} potential buttons near input`);

                // Try to find the attachment button by looking for one that's close to the input
                for (let i = 0; i < buttonCount; i++) {
                    const button = nearbyButtons.nth(i);
                    const buttonBox = await button.boundingBox();

                    if (buttonBox && Math.abs(buttonBox.y - inputBox.y) < 50) {
                        console.log(`✅ Found potential attachment button at index ${i}`);
                        attachmentButton = button;
                        foundSelector = `button near input (index ${i})`;
                        break;
                    }
                }
            }
        }

        // If still not found, try looking for SVG icons specifically
        if (!attachmentButton) {
            console.log('🔍 Looking for SVG icons that might be attachment buttons...');

            const svgIcons = page.locator('svg');
            const svgCount = await svgIcons.count();
            console.log(`Found ${svgCount} SVG icons`);

            // Look for clickable parent of SVG (the actual button)
            for (let i = 0; i < Math.min(svgCount, 10); i++) {
                const svg = svgIcons.nth(i);
                const clickableParent = svg.locator('..').filter({ hasText: /.{0}/ }); // Parent that might be clickable

                if (await clickableParent.isVisible()) {
                    const role = await clickableParent.getAttribute('role');
                    const tagName = await clickableParent.evaluate(el => el.tagName.toLowerCase());

                    if (tagName === 'button' || role === 'button') {
                        console.log(`✅ Found clickable SVG parent at index ${i}`);
                        attachmentButton = clickableParent;
                        foundSelector = `SVG parent button (index ${i})`;
                        break;
                    }
                }
            }
        }

        if (!attachmentButton) {
            console.log('❌ No attachment button found. Taking detailed screenshot...');
            await page.screenshot({
                path: path.join(screenshotDir, '03-no-attachment-button-found.png'),
                fullPage: true
            });

            // Try to highlight all clickable elements
            await page.evaluate(() => {
                const clickables = document.querySelectorAll('button, [role="button"], [onclick], input[type="file"]');
                clickables.forEach((el, i) => {
                    el.style.outline = '3px solid red';
                    el.style.position = 'relative';
                    el.title = `Clickable ${i}: ${el.tagName} ${el.className}`;
                });
            });

            await page.screenshot({
                path: path.join(screenshotDir, '04-all-clickable-elements-highlighted.png'),
                fullPage: true
            });

            console.log('🔒 Keeping browser open for 30 seconds for manual inspection...');
            await page.waitForTimeout(30000);
            return;
        }

        // Step 4: Take screenshot showing attachment button location
        console.log(`📸 Taking screenshot of attachment button location (${foundSelector})...`);
        await attachmentButton.scrollIntoViewIfNeeded();

        // Highlight the button we found
        await attachmentButton.evaluate(el => {
            el.style.outline = '5px solid lime';
            el.style.backgroundColor = 'rgba(0, 255, 0, 0.2)';
        });

        await page.screenshot({
            path: path.join(screenshotDir, '05-attachment-button-highlighted.png'),
            fullPage: false
        });

        // Step 5: Performance test - click attachment button and time the response
        console.log('⏱️ Starting performance timing test...');

        const startTime = Date.now();
        console.log('🖱️ Clicking attachment button...');

        // Screenshot before click
        await page.screenshot({
            path: path.join(screenshotDir, '06-before-click.png')
        });

        // Click the attachment button
        await attachmentButton.click();

        const clickTime = Date.now();
        console.log(`🖱️ Click executed at: ${clickTime - startTime}ms`);

        // Take screenshot immediately after click
        await page.screenshot({
            path: path.join(screenshotDir, '07-immediately-after-click.png')
        });

        // Monitor for delays and freezing
        let timeElapsed = 0;
        const checkInterval = 1000; // Check every second
        let browserFrozen = false;

        console.log('⏰ Monitoring for delays and browser freezing...');

        while (timeElapsed < 15000) { // Max 15 seconds
            await page.waitForTimeout(checkInterval);
            timeElapsed = Date.now() - startTime;

            console.log(`⏰ Time elapsed: ${timeElapsed}ms`);

            // Take periodic screenshots
            await page.screenshot({
                path: path.join(screenshotDir, `08-monitoring-${Math.floor(timeElapsed/1000)}s.png`)
            });

            // Test if browser is responsive by trying to hover
            try {
                await page.locator('body').hover({ timeout: 200 });
                if (browserFrozen) {
                    console.log(`✅ Browser recovered at ${timeElapsed}ms`);
                    browserFrozen = false;
                }
            } catch (e) {
                if (!browserFrozen) {
                    console.log(`⚠️ Browser appears frozen at ${timeElapsed}ms`);
                    browserFrozen = true;
                }
            }

            // Check if file dialog appeared
            try {
                // Note: Native file dialogs can't be detected by Playwright
                // But we can check if page state changed
                const title = await page.title();
                if (title !== 'My Jarvis') {
                    console.log(`📁 Page state changed at ${timeElapsed}ms - possible file dialog`);
                    break;
                }
            } catch (e) {
                // Continue monitoring
            }
        }

        const totalTime = Date.now() - startTime;
        console.log(`🏁 Test completed. Total time: ${totalTime}ms`);

        // Final screenshot
        await page.screenshot({
            path: path.join(screenshotDir, '09-final-state.png'),
            fullPage: true
        });

        console.log(`📊 Performance Summary:`);
        console.log(`   - Button found with: ${foundSelector}`);
        console.log(`   - Click execution time: ${clickTime - startTime}ms`);
        console.log(`   - Total monitoring time: ${totalTime}ms`);
        console.log(`   - Browser frozen detected: ${browserFrozen ? 'Yes' : 'No'}`);

    } catch (error) {
        console.error('❌ Test error:', error);
        await page.screenshot({
            path: path.join(screenshotDir, 'error-state.png'),
            fullPage: true
        });
    } finally {
        console.log('🔒 Keeping browser open for 30 seconds for manual inspection...');
        await page.waitForTimeout(30000);
        await browser.close();
    }
}

// Run the test
testAttachmentButtonPerformance();