import { test, expect } from '@playwright/test';
import { JarvisInterface } from '../helpers/jarvis-interface';
import { TestUtils } from '../helpers/test-utils';

/**
 * Token Usage API Tests
 * Tests the token tracking API endpoints and database integration
 */
test.describe('Token Usage API Tests', () => {
  let jarvis: JarvisInterface;
  let testUserId: string;
  let testSessionId: string;

  test.beforeEach(async ({ page }) => {
    jarvis = new JarvisInterface(page);

    // Generate test identifiers
    testUserId = `test-user-${Date.now()}`;
    testSessionId = `test-session-${Date.now()}`;

    // Navigate to Jarvis and wait for it to be ready
    await jarvis.navigate();
    await jarvis.waitForReady();
    await jarvis.clearConversation();
  });

  test.afterEach(async ({ page }) => {
    // Clean up test data
    await TestUtils.cleanupTokenData(page, testUserId, testSessionId);
  });

  test('should track token usage for session', async ({ page }) => {
    // Send a command that will generate token usage
    await jarvis.sendCommand('Hello Claude, please respond with exactly 10 words total.');
    await jarvis.waitForCommandCompletion();

    // Wait for token tracking to process
    await page.waitForTimeout(2000);

    // Call the session usage API
    const response = await page.request.get(`/api/token-usage/session/${testSessionId}`);
    expect(response.ok()).toBeTruthy();

    const sessionData = await response.json();

    // Verify session data structure
    expect(sessionData).toHaveProperty('id');
    expect(sessionData).toHaveProperty('session_id', testSessionId);
    expect(sessionData).toHaveProperty('input_tokens');
    expect(sessionData).toHaveProperty('output_tokens');
    expect(sessionData).toHaveProperty('cache_creation_tokens');
    expect(sessionData).toHaveProperty('cache_read_tokens');
    expect(sessionData).toHaveProperty('thinking_tokens');
    expect(sessionData).toHaveProperty('total_tokens');
    expect(sessionData).toHaveProperty('estimated_cost_usd');

    // Verify token counts are positive numbers
    expect(sessionData.input_tokens).toBeGreaterThan(0);
    expect(sessionData.output_tokens).toBeGreaterThan(0);
    expect(sessionData.total_tokens).toBeGreaterThan(0);
    expect(sessionData.estimated_cost_usd).toBeGreaterThan(0);
  });

  test('should aggregate daily usage correctly', async ({ page }) => {
    // Send multiple commands to generate usage
    await jarvis.sendCommand('Hello Claude');
    await jarvis.waitForCommandCompletion();

    await jarvis.sendCommand('Please count from 1 to 5');
    await jarvis.waitForCommandCompletion();

    // Wait for aggregation processing
    await page.waitForTimeout(3000);

    // Call the daily usage API
    const response = await page.request.get('/api/token-usage/daily');
    expect(response.ok()).toBeTruthy();

    const dailyData = await response.json();
    expect(Array.isArray(dailyData)).toBeTruthy();

    if (dailyData.length > 0) {
      const todayUsage = dailyData[0];

      // Verify daily aggregation structure
      expect(todayUsage).toHaveProperty('usage_date');
      expect(todayUsage).toHaveProperty('daily_input_tokens');
      expect(todayUsage).toHaveProperty('daily_output_tokens');
      expect(todayUsage).toHaveProperty('daily_total_tokens');
      expect(todayUsage).toHaveProperty('daily_session_count');
      expect(todayUsage).toHaveProperty('daily_message_count');
      expect(todayUsage).toHaveProperty('daily_cost_usd');

      // Verify aggregated values make sense
      expect(todayUsage.daily_total_tokens).toBeGreaterThan(0);
      expect(todayUsage.daily_session_count).toBeGreaterThan(0);
      expect(todayUsage.daily_message_count).toBeGreaterThan(0);
      expect(todayUsage.daily_cost_usd).toBeGreaterThan(0);
    }
  });

  test('should handle date range queries', async ({ page }) => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // Test with date range
    const response = await page.request.get(
      `/api/token-usage/daily?start_date=${yesterday}&end_date=${today}`
    );
    expect(response.ok()).toBeTruthy();

    const rangeData = await response.json();
    expect(Array.isArray(rangeData)).toBeTruthy();

    // Verify all results are within the date range
    for (const dayData of rangeData) {
      const usageDate = new Date(dayData.usage_date);
      const startDate = new Date(yesterday);
      const endDate = new Date(today);

      expect(usageDate >= startDate && usageDate <= endDate).toBeTruthy();
    }
  });

  test('should handle authentication and authorization', async ({ page }) => {
    // Test without authentication (should fail)
    const unauthResponse = await page.request.get('/api/token-usage/daily', {
      headers: { 'Authorization': 'Bearer invalid-token' }
    });
    expect(unauthResponse.status()).toBe(401);

    // Test access to another user's data (should fail with RLS)
    const otherUserResponse = await page.request.get('/api/token-usage/session/other-user-session');
    expect(otherUserResponse.status()).toBe(403);
  });

  test('should validate cost calculations', async ({ page }) => {
    // Send a predictable command
    await jarvis.sendCommand('Say exactly: "Test response"');
    await jarvis.waitForCommandCompletion();

    await page.waitForTimeout(2000);

    const response = await page.request.get(`/api/token-usage/session/${testSessionId}`);
    const sessionData = await response.json();

    // Verify cost calculation logic (2025 Anthropic pricing)
    const expectedCost = (
      (sessionData.input_tokens * 3) +           // $3 per million input tokens
      (sessionData.output_tokens * 15) +         // $15 per million output tokens
      (sessionData.cache_creation_tokens * 7.5) + // $7.50 per million cache write
      (sessionData.cache_read_tokens * 0.3) +    // $0.30 per million cache read
      (sessionData.thinking_tokens * 3)          // $3 per million thinking tokens
    ) / 1_000_000;

    // Allow for small floating point differences
    expect(Math.abs(sessionData.estimated_cost_usd - expectedCost)).toBeLessThan(0.000001);
  });

  test('should handle concurrent sessions', async ({ page, context }) => {
    // Create a second page for concurrent testing
    const page2 = await context.newPage();
    const jarvis2 = new JarvisInterface(page2);

    await jarvis2.navigate();
    await jarvis2.waitForReady();

    // Send commands concurrently
    const promise1 = jarvis.sendCommand('First concurrent message');
    const promise2 = jarvis2.sendCommand('Second concurrent message');

    await Promise.all([promise1, promise2]);
    await Promise.all([
      jarvis.waitForCommandCompletion(),
      jarvis2.waitForCommandCompletion()
    ]);

    // Wait for both to be processed
    await page.waitForTimeout(3000);

    // Verify both sessions were tracked
    const dailyResponse = await page.request.get('/api/token-usage/daily');
    const dailyData = await dailyResponse.json();

    if (dailyData.length > 0) {
      const todayUsage = dailyData[0];
      expect(todayUsage.daily_session_count).toBeGreaterThanOrEqual(2);
      expect(todayUsage.daily_message_count).toBeGreaterThanOrEqual(2);
    }

    await page2.close();
  });
});