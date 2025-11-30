import { Page } from '@playwright/test';

/**
 * Database helper class for Supabase operations in tests
 * Provides methods for testing database operations, RLS, and data integrity
 */
export class DatabaseHelpers {
  constructor(private page: Page) {}

  /**
   * Get table schema information
   */
  async describeTable(tableName: string) {
    const response = await this.page.request.post('/api/test/db/describe', {
      data: { tableName }
    });
    return await response.json();
  }

  /**
   * Create a test user for testing purposes
   */
  async createTestUser(userId: string): Promise<void> {
    await this.page.request.post('/api/test/db/create-user', {
      data: { userId, email: `${userId}@test.com` }
    });
  }

  /**
   * Delete a test user and all associated data
   */
  async deleteTestUser(userId: string): Promise<void> {
    await this.page.request.post('/api/test/db/delete-user', {
      data: { userId }
    });
  }

  /**
   * Insert session token usage data
   */
  async insertSessionData(userId: string, sessionId: string, tokenData: any): Promise<void> {
    const sessionData = {
      user_id: userId,
      session_id: sessionId,
      input_tokens: tokenData.input_tokens || 0,
      output_tokens: tokenData.output_tokens || 0,
      cache_creation_tokens: tokenData.cache_creation_tokens || 0,
      cache_read_tokens: tokenData.cache_read_tokens || 0,
      thinking_tokens: tokenData.thinking_tokens || 0,
      message_count: tokenData.message_count || 1,
      session_started_at: tokenData.session_started_at || new Date().toISOString(),
      estimated_cost_usd: tokenData.estimated_cost_usd || 0.001,
      model_used: tokenData.model_used || 'claude-3-5-sonnet-20241022'
    };

    await this.page.request.post('/api/test/db/insert-session', {
      data: { sessionData }
    });
  }

  /**
   * Get session data for a specific user and session
   */
  async getSessionData(userId: string, sessionId: string) {
    const response = await this.page.request.get(
      `/api/test/db/session?userId=${userId}&sessionId=${sessionId}`
    );
    return await response.json();
  }

  /**
   * Upsert token usage using the database function
   */
  async upsertTokenUsage(userId: string, sessionId: string, tokenData: any): Promise<void> {
    const sessionData = {
      user_id: userId,
      session_id: sessionId,
      ...tokenData,
      session_started_at: tokenData.session_started_at || new Date().toISOString()
    };

    const dailyData = {
      user_id: userId,
      usage_date: new Date().toISOString().split('T')[0],
      daily_input_tokens: tokenData.input_tokens || 0,
      daily_output_tokens: tokenData.output_tokens || 0,
      daily_cache_creation_tokens: tokenData.cache_creation_tokens || 0,
      daily_cache_read_tokens: tokenData.cache_read_tokens || 0,
      daily_thinking_tokens: tokenData.thinking_tokens || 0,
      daily_session_count: 1,
      daily_message_count: tokenData.message_count || 1,
      daily_cost_usd: tokenData.estimated_cost_usd || 0.001
    };

    await this.page.request.post('/api/test/db/upsert-usage', {
      data: { sessionData, dailyData }
    });
  }

  /**
   * Trigger daily usage aggregation
   */
  async aggregateDailyUsage(userId: string, date: string): Promise<void> {
    await this.page.request.post('/api/test/db/aggregate-daily', {
      data: { userId, date }
    });
  }

  /**
   * Get daily usage data for a specific user and date
   */
  async getDailyUsage(userId: string, date: string) {
    const response = await this.page.request.get(
      `/api/test/db/daily?userId=${userId}&date=${date}`
    );
    return await response.json();
  }

  /**
   * Execute a query as a specific user (for RLS testing)
   */
  async queryAsUser(userId: string, query: string) {
    const response = await this.page.request.post('/api/test/db/query-as-user', {
      data: { userId, query }
    });
    return await response.json();
  }

  /**
   * Execute a query as service role (bypasses RLS)
   */
  async queryAsServiceRole(query: string) {
    const response = await this.page.request.post('/api/test/db/query-as-service', {
      data: { query }
    });
    return await response.json();
  }

  /**
   * Get table indexes
   */
  async getTableIndexes(tableName: string): Promise<string[]> {
    const response = await this.page.request.get(`/api/test/db/indexes?table=${tableName}`);
    const result = await response.json();
    return result.indexes;
  }

  /**
   * Check if RLS is enabled on a table
   */
  async isRLSEnabled(tableName: string): Promise<boolean> {
    const response = await this.page.request.get(`/api/test/db/rls-status?table=${tableName}`);
    const result = await response.json();
    return result.enabled;
  }

  /**
   * Get RLS policies for a table
   */
  async getRLSPolicies(tableName: string) {
    const response = await this.page.request.get(`/api/test/db/rls-policies?table=${tableName}`);
    return await response.json();
  }

  /**
   * Test database performance with concurrent operations
   */
  async testConcurrentOperations(operations: Array<() => Promise<any>>): Promise<void> {
    const startTime = Date.now();

    await Promise.all(operations.map(op => op()));

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Verify operations completed within reasonable time
    if (duration > 5000) { // 5 seconds
      throw new Error(`Concurrent operations took too long: ${duration}ms`);
    }
  }

  /**
   * Validate cost calculation accuracy
   */
  async validateCostCalculation(sessionData: any): Promise<boolean> {
    const pricing = {
      input: 3,        // $3 per million input tokens
      output: 15,      // $15 per million output tokens
      cacheWrite: 7.5, // $7.50 per million cache write tokens
      cacheRead: 0.3,  // $0.30 per million cache read tokens
      thinking: 3      // $3 per million thinking tokens
    };

    const expectedCost = (
      (sessionData.input_tokens * pricing.input) +
      (sessionData.output_tokens * pricing.output) +
      (sessionData.cache_creation_tokens * pricing.cacheWrite) +
      (sessionData.cache_read_tokens * pricing.cacheRead) +
      (sessionData.thinking_tokens * pricing.thinking)
    ) / 1_000_000;

    const actualCost = sessionData.estimated_cost_usd;
    const tolerance = 0.000001; // Allow for floating point precision

    return Math.abs(actualCost - expectedCost) < tolerance;
  }
}