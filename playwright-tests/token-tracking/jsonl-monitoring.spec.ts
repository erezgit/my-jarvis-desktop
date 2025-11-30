import { test, expect } from '@playwright/test';
import { JarvisInterface } from '../helpers/jarvis-interface';
import { FileSystemHelpers } from '../helpers/filesystem-helpers';
import { TestUtils } from '../helpers/test-utils';

/**
 * JSONL File Monitoring Tests
 * Tests Claude Code JSONL file parsing and real-time monitoring
 */
test.describe('JSONL File Monitoring Tests', () => {
  let jarvis: JarvisInterface;
  let fs: FileSystemHelpers;
  let claudeProjectsPath: string;
  let testSessionId: string;

  test.beforeEach(async ({ page }) => {
    jarvis = new JarvisInterface(page);
    fs = new FileSystemHelpers(page);
    testSessionId = `test-session-${Date.now()}`;

    // Setup test Claude projects directory
    claudeProjectsPath = '/tmp/test-claude-projects/-workspace';
    await fs.createDirectory(claudeProjectsPath);

    await jarvis.navigate();
    await jarvis.waitForReady();
    await jarvis.clearConversation();
  });

  test.afterEach(async ({ page }) => {
    // Cleanup test directories and files
    await fs.removeDirectory('/tmp/test-claude-projects');
    await TestUtils.stopTokenMonitoring(page);
  });

  test('should parse Claude Code JSONL format correctly', async ({ page }) => {
    const jsonlContent = [
      {
        type: 'assistant',
        timestamp: '2025-11-28T16:21:54.135Z',
        sessionId: testSessionId,
        message: {
          usage: {
            input_tokens: 1247,
            output_tokens: 176,
            cache_creation_input_tokens: 464,
            cache_read_input_tokens: 37687,
            thinking_tokens: 0
          }
        }
      },
      {
        type: 'assistant',
        timestamp: '2025-11-28T16:22:10.235Z',
        sessionId: testSessionId,
        message: {
          usage: {
            input_tokens: 892,
            output_tokens: 243,
            cache_creation_input_tokens: 0,
            cache_read_input_tokens: 25431,
            thinking_tokens: 156
          }
        }
      }
    ];

    // Create test JSONL file
    const jsonlPath = `${claudeProjectsPath}/${testSessionId}.jsonl`;
    const jsonlLines = jsonlContent.map(obj => JSON.stringify(obj)).join('\n');
    await fs.writeFile(jsonlPath, jsonlLines);

    // Start token monitoring service
    await TestUtils.startTokenMonitoring(page, claudeProjectsPath);

    // Wait for file to be processed
    await page.waitForTimeout(2000);

    // Verify token usage was extracted correctly
    const response = await page.request.get(`/api/token-usage/session/${testSessionId}`);
    expect(response.ok()).toBeTruthy();

    const sessionData = await response.json();

    // Should aggregate all token counts from both messages
    expect(sessionData.input_tokens).toBe(1247 + 892); // 2139
    expect(sessionData.output_tokens).toBe(176 + 243); // 419
    expect(sessionData.cache_creation_tokens).toBe(464 + 0); // 464
    expect(sessionData.cache_read_tokens).toBe(37687 + 25431); // 63118
    expect(sessionData.thinking_tokens).toBe(0 + 156); // 156
    expect(sessionData.message_count).toBe(2);
  });

  test('should handle real-time file changes', async ({ page }) => {
    const jsonlPath = `${claudeProjectsPath}/${testSessionId}.jsonl`;

    // Start monitoring before file exists
    await TestUtils.startTokenMonitoring(page, claudeProjectsPath);

    // Create initial file with one message
    const firstMessage = {
      type: 'assistant',
      timestamp: '2025-11-28T16:21:54.135Z',
      sessionId: testSessionId,
      message: {
        usage: {
          input_tokens: 100,
          output_tokens: 50,
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: 0,
          thinking_tokens: 0
        }
      }
    };

    await fs.writeFile(jsonlPath, JSON.stringify(firstMessage));
    await page.waitForTimeout(1000);

    // Verify initial processing
    let response = await page.request.get(`/api/token-usage/session/${testSessionId}`);
    let sessionData = await response.json();
    expect(sessionData.input_tokens).toBe(100);
    expect(sessionData.message_count).toBe(1);

    // Append second message to file
    const secondMessage = {
      type: 'assistant',
      timestamp: '2025-11-28T16:22:10.235Z',
      sessionId: testSessionId,
      message: {
        usage: {
          input_tokens: 200,
          output_tokens: 100,
          cache_creation_input_tokens: 50,
          cache_read_input_tokens: 25,
          thinking_tokens: 10
        }
      }
    };

    const existingContent = await fs.readFile(jsonlPath);
    const updatedContent = existingContent + '\n' + JSON.stringify(secondMessage);
    await fs.writeFile(jsonlPath, updatedContent);
    await page.waitForTimeout(1000);

    // Verify updated processing
    response = await page.request.get(`/api/token-usage/session/${testSessionId}`);
    sessionData = await response.json();
    expect(sessionData.input_tokens).toBe(300); // 100 + 200
    expect(sessionData.output_tokens).toBe(150); // 50 + 100
    expect(sessionData.message_count).toBe(2);
  });

  test('should handle malformed JSONL gracefully', async ({ page }) => {
    const jsonlPath = `${claudeProjectsPath}/${testSessionId}.jsonl`;

    // Create file with mix of valid and invalid JSON
    const mixedContent = [
      '{"type": "assistant", "message": {"usage": {"input_tokens": 100}}}',
      'invalid json line',
      '{"type": "assistant", "message": {"usage": {"input_tokens": 200, "output_tokens": 50}}}',
      '{"incomplete": json',
      '{"type": "assistant", "message": {"usage": {"input_tokens": 150}}}'
    ].join('\n');

    await fs.writeFile(jsonlPath, mixedContent);

    // Start monitoring
    await TestUtils.startTokenMonitoring(page, claudeProjectsPath);
    await page.waitForTimeout(2000);

    // Should process valid lines and skip invalid ones
    const response = await page.request.get(`/api/token-usage/session/${testSessionId}`);

    if (response.ok()) {
      const sessionData = await response.json();
      // Should only count tokens from valid JSON lines
      expect(sessionData.input_tokens).toBe(450); // 100 + 200 + 150
      expect(sessionData.output_tokens).toBe(50); // Only from second valid line
    }

    // Check logs for error handling
    const logs = await TestUtils.getMonitoringLogs(page);
    expect(logs.some(log => log.includes('Invalid JSON'))).toBeTruthy();
  });

  test('should handle missing usage data', async ({ page }) => {
    const jsonlPath = `${claudeProjectsPath}/${testSessionId}.jsonl`;

    // Messages without usage data
    const messagesWithoutUsage = [
      { type: 'user', message: 'Hello' },
      { type: 'assistant', message: 'Hello back' },
      { type: 'assistant', message: { content: 'Response without usage' } }
    ];

    const content = messagesWithoutUsage.map(obj => JSON.stringify(obj)).join('\n');
    await fs.writeFile(jsonlPath, content);

    await TestUtils.startTokenMonitoring(page, claudeProjectsPath);
    await page.waitForTimeout(1000);

    // Should not create session data for messages without usage
    const response = await page.request.get(`/api/token-usage/session/${testSessionId}`);
    expect(response.status()).toBe(404); // Session not found
  });

  test('should handle multiple concurrent sessions', async ({ page }) => {
    const sessionIds = [`session-1-${Date.now()}`, `session-2-${Date.now()}`, `session-3-${Date.now()}`];

    await TestUtils.startTokenMonitoring(page, claudeProjectsPath);

    // Create multiple session files simultaneously
    const createFilePromises = sessionIds.map(async (sessionId, index) => {
      const jsonlPath = `${claudeProjectsPath}/${sessionId}.jsonl`;
      const message = {
        type: 'assistant',
        timestamp: new Date().toISOString(),
        sessionId: sessionId,
        message: {
          usage: {
            input_tokens: (index + 1) * 100,
            output_tokens: (index + 1) * 50,
            cache_creation_input_tokens: 0,
            cache_read_input_tokens: 0,
            thinking_tokens: 0
          }
        }
      };

      await fs.writeFile(jsonlPath, JSON.stringify(message));
    });

    await Promise.all(createFilePromises);
    await page.waitForTimeout(3000);

    // Verify all sessions were processed
    for (let i = 0; i < sessionIds.length; i++) {
      const response = await page.request.get(`/api/token-usage/session/${sessionIds[i]}`);
      expect(response.ok()).toBeTruthy();

      const sessionData = await response.json();
      expect(sessionData.input_tokens).toBe((i + 1) * 100);
      expect(sessionData.output_tokens).toBe((i + 1) * 50);
    }
  });

  test('should calculate session timing correctly', async ({ page }) => {
    const jsonlPath = `${claudeProjectsPath}/${testSessionId}.jsonl`;

    // Messages with different timestamps
    const startTime = new Date('2025-11-28T16:00:00.000Z');
    const messages = [
      {
        type: 'assistant',
        timestamp: startTime.toISOString(),
        sessionId: testSessionId,
        message: { usage: { input_tokens: 100, output_tokens: 50 } }
      },
      {
        type: 'assistant',
        timestamp: new Date(startTime.getTime() + 30000).toISOString(), // +30 seconds
        sessionId: testSessionId,
        message: { usage: { input_tokens: 200, output_tokens: 100 } }
      }
    ];

    const content = messages.map(obj => JSON.stringify(obj)).join('\n');
    await fs.writeFile(jsonlPath, content);

    await TestUtils.startTokenMonitoring(page, claudeProjectsPath);
    await page.waitForTimeout(2000);

    const response = await page.request.get(`/api/token-usage/session/${testSessionId}`);
    const sessionData = await response.json();

    // Session should start at earliest timestamp
    expect(new Date(sessionData.session_started_at)).toEqual(startTime);

    // Last updated should be at latest timestamp
    const expectedLastUpdate = new Date(startTime.getTime() + 30000);
    expect(new Date(sessionData.last_updated_at)).toEqual(expectedLastUpdate);
  });

  test('should handle file system errors gracefully', async ({ page }) => {
    // Test with non-existent directory
    const invalidPath = '/non/existent/path';

    try {
      await TestUtils.startTokenMonitoring(page, invalidPath);
    } catch (error) {
      expect(error.message).toContain('ENOENT');
    }

    // Test with permission denied scenario (if possible to simulate)
    // This would require setting up a directory with restricted permissions
  });
});