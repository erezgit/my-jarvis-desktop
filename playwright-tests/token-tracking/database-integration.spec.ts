import { test, expect } from '@playwright/test';
import { JarvisInterface } from '../helpers/jarvis-interface';
import { DatabaseHelpers } from '../helpers/database-helpers';
import { TestUtils } from '../helpers/test-utils';

/**
 * Database Integration Tests
 * Tests Supabase database operations, RLS policies, and data integrity
 */
test.describe('Database Integration Tests', () => {
  let jarvis: JarvisInterface;
  let db: DatabaseHelpers;
  let testUserId: string;

  test.beforeEach(async ({ page }) => {
    jarvis = new JarvisInterface(page);
    db = new DatabaseHelpers(page);
    testUserId = `test-user-${Date.now()}`;

    await jarvis.navigate();
    await jarvis.waitForReady();
    await jarvis.clearConversation();
  });

  test.afterEach(async ({ page }) => {
    await TestUtils.cleanupDatabaseTestData(page, testUserId);
  });

  test('should create token_usage_sessions table with correct schema', async ({ page }) => {
    // Verify table exists and has correct columns
    const tableInfo = await db.describeTable('token_usage_sessions');

    const expectedColumns = [
      'id', 'user_id', 'session_id', 'input_tokens', 'output_tokens',
      'cache_creation_tokens', 'cache_read_tokens', 'thinking_tokens',
      'total_tokens', 'message_count', 'session_started_at', 'last_updated_at',
      'estimated_cost_usd', 'model_used'
    ];

    for (const column of expectedColumns) {
      expect(tableInfo.columns).toContain(column);
    }

    // Verify constraints
    expect(tableInfo.constraints).toContain('UNIQUE(user_id, session_id)');
    expect(tableInfo.constraints).toContain('REFERENCES auth.users(id)');
  });

  test('should create token_usage_daily table with correct schema', async ({ page }) => {
    const tableInfo = await db.describeTable('token_usage_daily');

    const expectedColumns = [
      'id', 'user_id', 'usage_date', 'daily_input_tokens', 'daily_output_tokens',
      'daily_cache_creation_tokens', 'daily_cache_read_tokens', 'daily_thinking_tokens',
      'daily_total_tokens', 'daily_session_count', 'daily_message_count',
      'daily_cost_usd', 'created_at', 'updated_at'
    ];

    for (const column of expectedColumns) {
      expect(tableInfo.columns).toContain(column);
    }

    // Verify unique constraint
    expect(tableInfo.constraints).toContain('UNIQUE(user_id, usage_date)');
  });

  test('should enforce Row Level Security (RLS)', async ({ page }) => {
    // Create test user and session data
    await db.createTestUser(testUserId);
    const sessionId = `session-${Date.now()}`;

    // Insert session data as service role
    await db.insertSessionData(testUserId, sessionId, {
      input_tokens: 100,
      output_tokens: 50,
      cache_creation_tokens: 25,
      cache_read_tokens: 10,
      thinking_tokens: 5
    });

    // Try to access data as different user (should fail)
    const unauthorizedAccess = await db.queryAsUser('different-user-id',
      `SELECT * FROM token_usage_sessions WHERE session_id = '${sessionId}'`
    );
    expect(unauthorizedAccess.length).toBe(0);

    // Access data as correct user (should succeed)
    const authorizedAccess = await db.queryAsUser(testUserId,
      `SELECT * FROM token_usage_sessions WHERE session_id = '${sessionId}'`
    );
    expect(authorizedAccess.length).toBe(1);
    expect(authorizedAccess[0].session_id).toBe(sessionId);
  });

  test('should calculate total_tokens correctly with computed column', async ({ page }) => {
    await db.createTestUser(testUserId);
    const sessionId = `session-${Date.now()}`;

    const tokenData = {
      input_tokens: 100,
      output_tokens: 50,
      cache_creation_tokens: 25,
      cache_read_tokens: 10,
      thinking_tokens: 15
    };

    await db.insertSessionData(testUserId, sessionId, tokenData);

    const result = await db.queryAsUser(testUserId,
      `SELECT total_tokens FROM token_usage_sessions WHERE session_id = '${sessionId}'`
    );

    const expectedTotal = 100 + 50 + 25 + 10 + 15; // 200
    expect(result[0].total_tokens).toBe(expectedTotal);
  });

  test('should handle upsert operations correctly', async ({ page }) => {
    await db.createTestUser(testUserId);
    const sessionId = `session-${Date.now()}`;

    // First insert
    await db.upsertTokenUsage(testUserId, sessionId, {
      input_tokens: 100,
      output_tokens: 50,
      message_count: 1
    });

    // Verify insert
    let result = await db.getSessionData(testUserId, sessionId);
    expect(result.input_tokens).toBe(100);
    expect(result.message_count).toBe(1);

    // Update with new data
    await db.upsertTokenUsage(testUserId, sessionId, {
      input_tokens: 150,
      output_tokens: 75,
      message_count: 2
    });

    // Verify update
    result = await db.getSessionData(testUserId, sessionId);
    expect(result.input_tokens).toBe(150);
    expect(result.message_count).toBe(2);
    expect(result.output_tokens).toBe(75);
  });

  test('should aggregate daily usage correctly', async ({ page }) => {
    await db.createTestUser(testUserId);
    const today = new Date().toISOString().split('T')[0];

    // Create multiple sessions for today
    const sessions = [
      { id: `session-1-${Date.now()}`, input: 100, output: 50, cost: 0.001 },
      { id: `session-2-${Date.now()}`, input: 200, output: 100, cost: 0.002 },
      { id: `session-3-${Date.now()}`, input: 150, output: 75, cost: 0.0015 }
    ];

    for (const session of sessions) {
      await db.insertSessionData(testUserId, session.id, {
        input_tokens: session.input,
        output_tokens: session.output,
        estimated_cost_usd: session.cost,
        session_started_at: new Date().toISOString()
      });
    }

    // Trigger daily aggregation
    await db.aggregateDailyUsage(testUserId, today);

    // Verify aggregated data
    const dailyData = await db.getDailyUsage(testUserId, today);

    expect(dailyData.daily_input_tokens).toBe(450); // 100+200+150
    expect(dailyData.daily_output_tokens).toBe(225); // 50+100+75
    expect(dailyData.daily_session_count).toBe(3);
    expect(dailyData.daily_cost_usd).toBe(0.0045); // 0.001+0.002+0.0015
  });

  test('should handle database indexes for performance', async ({ page }) => {
    // Verify expected indexes exist
    const indexes = await db.getTableIndexes('token_usage_sessions');

    const expectedIndexes = [
      'idx_token_sessions_user_id',
      'idx_token_sessions_date',
      'idx_token_sessions_session_id'
    ];

    for (const index of expectedIndexes) {
      expect(indexes).toContain(index);
    }

    // Verify daily table indexes
    const dailyIndexes = await db.getTableIndexes('token_usage_daily');

    const expectedDailyIndexes = [
      'idx_token_daily_user_id',
      'idx_token_daily_date',
      'idx_token_daily_cost'
    ];

    for (const index of expectedDailyIndexes) {
      expect(dailyIndexes).toContain(index);
    }
  });

  test('should enforce data validation and constraints', async ({ page }) => {
    await db.createTestUser(testUserId);
    const sessionId = `session-${Date.now()}`;

    // Test negative token counts (should fail)
    try {
      await db.insertSessionData(testUserId, sessionId, {
        input_tokens: -100, // Invalid negative value
        output_tokens: 50
      });
      expect(false).toBe(true); // Should not reach here
    } catch (error) {
      expect(error.message).toContain('constraint violation');
    }

    // Test duplicate session insertion (should upsert)
    await db.insertSessionData(testUserId, sessionId, {
      input_tokens: 100,
      output_tokens: 50
    });

    // Second insert with same session_id should update, not create duplicate
    await db.insertSessionData(testUserId, sessionId, {
      input_tokens: 200,
      output_tokens: 100
    });

    const results = await db.queryAsUser(testUserId,
      `SELECT COUNT(*) as count FROM token_usage_sessions WHERE session_id = '${sessionId}'`
    );

    expect(results[0].count).toBe(1); // Should be only one record
  });

  test('should maintain referential integrity', async ({ page }) => {
    const nonExistentUserId = 'non-existent-user-id';
    const sessionId = `session-${Date.now()}`;

    // Try to insert session data for non-existent user (should fail)
    try {
      await db.insertSessionData(nonExistentUserId, sessionId, {
        input_tokens: 100,
        output_tokens: 50
      });
      expect(false).toBe(true); // Should not reach here
    } catch (error) {
      expect(error.message).toContain('foreign key constraint');
    }

    // Create user and session data
    await db.createTestUser(testUserId);
    await db.insertSessionData(testUserId, sessionId, {
      input_tokens: 100,
      output_tokens: 50
    });

    // Delete user should cascade delete session data
    await db.deleteTestUser(testUserId);

    const remainingSessions = await db.queryAsServiceRole(
      `SELECT * FROM token_usage_sessions WHERE user_id = '${testUserId}'`
    );

    expect(remainingSessions.length).toBe(0);
  });
});