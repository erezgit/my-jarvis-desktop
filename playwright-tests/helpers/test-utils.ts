import { Page } from '@playwright/test';

/**
 * Common test utilities
 */
export class TestUtils {
  /**
   * Generate a unique test file name
   */
  static generateTestFileName(prefix: string = 'test'): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `${prefix}-${timestamp}-${random}.md`;
  }

  /**
   * Generate a unique test folder name
   */
  static generateTestFolderName(prefix: string = 'test-folder'): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `${prefix}-${timestamp}-${random}`;
  }

  /**
   * Wait for a specific condition with retries
   */
  static async waitForCondition(
    condition: () => Promise<boolean>,
    timeout: number = 5000,
    interval: number = 100
  ): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }

    return false;
  }

  /**
   * Create test content for files
   */
  static generateTestContent(lines: number = 5): string {
    const content: string[] = [];
    for (let i = 1; i <= lines; i++) {
      content.push(`Line ${i}: This is test content generated at ${new Date().toISOString()}`);
    }
    return content.join('\n');
  }

  /**
   * Format a bash command for different operations
   */
  static formatBashCommand(operation: string, ...args: string[]): string {
    switch (operation) {
      case 'mkdir':
        return `mkdir ${args.join(' ')}`;
      case 'mkdir-p':
        return `mkdir -p ${args.join(' ')}`;
      case 'rm':
        return `rm ${args.join(' ')}`;
      case 'rm-rf':
        return `rm -rf ${args.join(' ')}`;
      case 'mv':
        return `mv ${args.join(' ')}`;
      case 'cp':
        return `cp ${args.join(' ')}`;
      case 'echo':
        return `echo "${args[0]}" > ${args[1]}`;
      case 'cat':
        return `cat ${args.join(' ')}`;
      case 'ls':
        return `ls ${args.join(' ')}`;
      case 'touch':
        return `touch ${args.join(' ')}`;
      default:
        return args.join(' ');
    }
  }

  /**
   * Parse test results for reporting
   */
  static parseTestResult(passed: boolean, testName: string, details?: string): TestResult {
    return {
      testName,
      passed,
      details: details || (passed ? 'Test passed' : 'Test failed'),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Measure operation timing
   */
  static async measureTiming<T>(
    operation: () => Promise<T>
  ): Promise<{ result: T; duration: number }> {
    const startTime = performance.now();
    const result = await operation();
    const endTime = performance.now();

    return {
      result,
      duration: endTime - startTime
    };
  }

  /**
   * Clean up test workspace
   */
  static async cleanupTestWorkspace(page: Page, jarvisInterface: any) {
    // Clean up any test files/folders created during tests
    const testPatterns = [
      'test-*',
      'test-folder-*',
      'tickets/test-*'
    ];

    for (const pattern of testPatterns) {
      await jarvisInterface.executeBash(`rm -rf ${pattern}`);
    }

    // Wait a bit for cleanup to complete
    await page.waitForTimeout(1000);
  }

  /**
   * Clean up token usage data for test user and session
   */
  static async cleanupTokenData(page: Page, userId: string, sessionId: string): Promise<void> {
    await page.request.post('/api/test/cleanup/token-data', {
      data: { userId, sessionId }
    });
  }

  /**
   * Clean up all database test data
   */
  static async cleanupDatabaseTestData(page: Page, userId: string): Promise<void> {
    await page.request.post('/api/test/cleanup/database', {
      data: { userId }
    });
  }

  /**
   * Start token monitoring service for testing
   */
  static async startTokenMonitoring(page: Page, claudeProjectsPath: string): Promise<string> {
    const response = await page.request.post('/api/test/token-monitoring/start', {
      data: { claudeProjectsPath }
    });
    const result = await response.json();
    return result.monitoringId;
  }

  /**
   * Stop token monitoring service
   */
  static async stopTokenMonitoring(page: Page, monitoringId?: string): Promise<void> {
    await page.request.post('/api/test/token-monitoring/stop', {
      data: { monitoringId }
    });
  }

  /**
   * Get monitoring logs for debugging
   */
  static async getMonitoringLogs(page: Page): Promise<string[]> {
    const response = await page.request.get('/api/test/token-monitoring/logs');
    const result = await response.json();
    return result.logs;
  }

  /**
   * Generate test token usage data
   */
  static generateTestTokenUsage(sessionId: string, messageCount: number = 1) {
    const messages = [];
    let totalInput = 0;
    let totalOutput = 0;

    for (let i = 0; i < messageCount; i++) {
      const inputTokens = Math.floor(Math.random() * 1000) + 100;
      const outputTokens = Math.floor(Math.random() * 500) + 50;

      totalInput += inputTokens;
      totalOutput += outputTokens;

      messages.push({
        type: 'assistant',
        timestamp: new Date(Date.now() + i * 1000).toISOString(),
        sessionId: sessionId,
        message: {
          usage: {
            input_tokens: inputTokens,
            output_tokens: outputTokens,
            cache_creation_input_tokens: Math.floor(Math.random() * 100),
            cache_read_input_tokens: Math.floor(Math.random() * 1000),
            thinking_tokens: Math.floor(Math.random() * 50)
          }
        }
      });
    }

    return {
      messages,
      expectedTotals: {
        input_tokens: totalInput,
        output_tokens: totalOutput,
        message_count: messageCount
      }
    };
  }

  /**
   * Wait for API response with retry logic
   */
  static async waitForAPIResponse(
    page: Page,
    endpoint: string,
    maxRetries: number = 5,
    delay: number = 1000
  ): Promise<any> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await page.request.get(endpoint);
        if (response.ok()) {
          return await response.json();
        }
      } catch (error) {
        if (i === maxRetries - 1) throw error;
      }
      await page.waitForTimeout(delay);
    }
    throw new Error(`API endpoint ${endpoint} not responding after ${maxRetries} retries`);
  }

  /**
   * Verify expected vs actual results
   */
  static compareResults(expected: any, actual: any): ComparisonResult {
    const matches = JSON.stringify(expected) === JSON.stringify(actual);

    return {
      matches,
      expected,
      actual,
      differences: matches ? [] : this.findDifferences(expected, actual)
    };
  }

  /**
   * Find differences between expected and actual
   */
  private static findDifferences(expected: any, actual: any, path: string = ''): string[] {
    const differences: string[] = [];

    if (typeof expected !== typeof actual) {
      differences.push(`${path}: Type mismatch - expected ${typeof expected}, got ${typeof actual}`);
      return differences;
    }

    if (typeof expected === 'object' && expected !== null) {
      const expectedKeys = Object.keys(expected);
      const actualKeys = Object.keys(actual);

      // Check for missing keys
      expectedKeys.forEach(key => {
        if (!actualKeys.includes(key)) {
          differences.push(`${path}.${key}: Missing in actual`);
        }
      });

      // Check for extra keys
      actualKeys.forEach(key => {
        if (!expectedKeys.includes(key)) {
          differences.push(`${path}.${key}: Extra in actual`);
        }
      });

      // Recursively check values
      expectedKeys.forEach(key => {
        if (actualKeys.includes(key)) {
          const subDifferences = this.findDifferences(
            expected[key],
            actual[key],
            path ? `${path}.${key}` : key
          );
          differences.push(...subDifferences);
        }
      });
    } else if (expected !== actual) {
      differences.push(`${path}: Value mismatch - expected "${expected}", got "${actual}"`);
    }

    return differences;
  }

  /**
   * Format test report
   */
  static formatTestReport(results: TestResult[]): string {
    const total = results.length;
    const passed = results.filter(r => r.passed).length;
    const failed = total - passed;
    const passRate = ((passed / total) * 100).toFixed(1);

    let report = `\n${'='.repeat(50)}\n`;
    report += `Test Results Summary\n`;
    report += `${'='.repeat(50)}\n`;
    report += `Total Tests: ${total}\n`;
    report += `Passed: ${passed} ✅\n`;
    report += `Failed: ${failed} ❌\n`;
    report += `Pass Rate: ${passRate}%\n`;
    report += `${'='.repeat(50)}\n\n`;

    if (failed > 0) {
      report += `Failed Tests:\n`;
      report += `${'-'.repeat(50)}\n`;
      results
        .filter(r => !r.passed)
        .forEach(r => {
          report += `❌ ${r.testName}\n`;
          report += `   ${r.details}\n`;
        });
      report += `\n`;
    }

    return report;
  }
}

// Type definitions
export interface TestResult {
  testName: string;
  passed: boolean;
  details: string;
  timestamp: string;
}

export interface ComparisonResult {
  matches: boolean;
  expected: any;
  actual: any;
  differences: string[];
}

export interface TimingResult<T> {
  result: T;
  duration: number;
}