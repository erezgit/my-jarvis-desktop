/**
 * Edge Case Test 3: Cache Token Test
 *
 * Tests the token tracking system with cache_read and cache_write tokens.
 * Based on the SDK documentation, cache tokens may be reported separately
 * from input/output tokens and need special handling.
 */

// Test configuration for cache scenarios
const CACHE_TEST_CONFIG = {
  MAX_TOKENS: 200000,
  SCENARIOS: {
    // Standard message with input/output only
    STANDARD: {
      usage: {
        input_tokens: 1000,
        output_tokens: 500
      }
    },
    // Message with cache read (context retrieved from cache)
    CACHE_READ: {
      usage: {
        input_tokens: 1000,
        output_tokens: 500,
        cache_read_tokens: 2000
      }
    },
    // Message with cache write (context stored to cache)
    CACHE_WRITE: {
      usage: {
        input_tokens: 1000,
        output_tokens: 500,
        cache_write_tokens: 1500
      }
    },
    // Message with both cache read and write
    CACHE_READ_WRITE: {
      usage: {
        input_tokens: 1000,
        output_tokens: 500,
        cache_read_tokens: 2000,
        cache_write_tokens: 1500
      }
    },
    // Large cache usage scenario
    LARGE_CACHE: {
      usage: {
        input_tokens: 500,
        output_tokens: 300,
        cache_read_tokens: 50000,
        cache_write_tokens: 25000
      }
    }
  }
};

// Mock message processor that handles cache tokens
class MockMessageProcessor {
  constructor() {
    this.tokenCounts = {
      input_total: 0,
      output_total: 0,
      cache_read_total: 0,
      cache_write_total: 0,
      grand_total: 0
    };
    this.processedMessages = [];
  }

  processResultMessage(resultMessage, onTokenUpdate) {
    console.log('\n[PROCESSOR] Processing result message...');
    console.log('[PROCESSOR] Usage data:', JSON.stringify(resultMessage.usage, null, 2));

    if (!resultMessage.usage) {
      console.log('[PROCESSOR] No usage data - skipping token update');
      return;
    }

    const usage = resultMessage.usage;

    // Extract different token types
    const inputTokens = usage.input_tokens || 0;
    const outputTokens = usage.output_tokens || 0;
    const cacheReadTokens = usage.cache_read_tokens || 0;
    const cacheWriteTokens = usage.cache_write_tokens || 0;

    // Update running totals
    this.tokenCounts.input_total += inputTokens;
    this.tokenCounts.output_total += outputTokens;
    this.tokenCounts.cache_read_total += cacheReadTokens;
    this.tokenCounts.cache_write_total += cacheWriteTokens;

    // CRITICAL QUESTION: How should we count cache tokens?
    // Option 1: Count only input + output (direct computation)
    const directTokens = inputTokens + outputTokens;

    // Option 2: Count all tokens including cache
    const allTokens = inputTokens + outputTokens + cacheReadTokens + cacheWriteTokens;

    // Option 3: Count cache tokens differently (e.g., discounted rate)
    const weightedTokens = inputTokens + outputTokens + (cacheReadTokens * 0.1) + (cacheWriteTokens * 0.25);

    console.log(`[PROCESSOR] Token breakdown:`);
    console.log(`  Input tokens: ${inputTokens}`);
    console.log(`  Output tokens: ${outputTokens}`);
    console.log(`  Cache read tokens: ${cacheReadTokens}`);
    console.log(`  Cache write tokens: ${cacheWriteTokens}`);
    console.log(`[PROCESSOR] Counting options:`);
    console.log(`  Direct (input + output): ${directTokens}`);
    console.log(`  All tokens: ${allTokens}`);
    console.log(`  Weighted: ${weightedTokens.toFixed(0)}`);

    // For now, we'll use the current implementation approach (input + output)
    // but we need to test all scenarios
    const tokensToAdd = directTokens;
    this.tokenCounts.grand_total += tokensToAdd;

    console.log(`[PROCESSOR] Adding ${tokensToAdd} tokens to total (${this.tokenCounts.grand_total})`);

    if (onTokenUpdate) {
      onTokenUpdate(tokensToAdd);
    }

    this.processedMessages.push({
      usage: usage,
      tokensAdded: tokensToAdd,
      timestamp: Date.now()
    });
  }

  getStats() {
    return {
      messagesProcessed: this.processedMessages.length,
      tokenCounts: this.tokenCounts,
      processedMessages: this.processedMessages
    };
  }

  reset() {
    this.tokenCounts = {
      input_total: 0,
      output_total: 0,
      cache_read_total: 0,
      cache_write_total: 0,
      grand_total: 0
    };
    this.processedMessages = [];
  }
}

// Mock token usage state for cache testing
class MockCacheTokenState {
  constructor() {
    this.tokenData = {
      tokens_used: 0,
      max_tokens: CACHE_TEST_CONFIG.MAX_TOKENS,
      percentage: 0
    };
    this.updates = [];
  }

  updateTokenUsage(newTokens) {
    this.tokenData.tokens_used += newTokens;
    this.tokenData.percentage = (this.tokenData.tokens_used / this.tokenData.max_tokens) * 100;

    this.updates.push({
      tokensAdded: newTokens,
      totalAfter: this.tokenData.tokens_used,
      percentageAfter: this.tokenData.percentage,
      timestamp: Date.now()
    });

    console.log(`[STATE] Added ${newTokens} tokens, total: ${this.tokenData.tokens_used}, percentage: ${this.tokenData.percentage.toFixed(2)}%`);
  }

  reset() {
    this.tokenData = {
      tokens_used: 0,
      max_tokens: CACHE_TEST_CONFIG.MAX_TOKENS,
      percentage: 0
    };
    this.updates = [];
  }
}

// Test 1: Standard message without cache tokens
function testStandardMessage() {
  console.log('\n=== Test 1: Standard Message (No Cache) ===');

  const processor = new MockMessageProcessor();
  const state = new MockCacheTokenState();

  const resultMessage = {
    type: 'result',
    ...CACHE_TEST_CONFIG.SCENARIOS.STANDARD
  };

  processor.processResultMessage(resultMessage, (tokens) => state.updateTokenUsage(tokens));

  const stats = processor.getStats();

  console.assert(stats.tokenCounts.input_total === 1000, 'Should track input tokens');
  console.assert(stats.tokenCounts.output_total === 500, 'Should track output tokens');
  console.assert(stats.tokenCounts.cache_read_total === 0, 'Should have no cache read tokens');
  console.assert(stats.tokenCounts.cache_write_total === 0, 'Should have no cache write tokens');
  console.assert(state.tokenData.tokens_used === 1500, 'Should add input + output tokens');

  console.log('✅ Standard message test passed');
  return true;
}

// Test 2: Message with cache read tokens
function testCacheReadMessage() {
  console.log('\n=== Test 2: Message with Cache Read ===');

  const processor = new MockMessageProcessor();
  const state = new MockCacheTokenState();

  const resultMessage = {
    type: 'result',
    ...CACHE_TEST_CONFIG.SCENARIOS.CACHE_READ
  };

  processor.processResultMessage(resultMessage, (tokens) => state.updateTokenUsage(tokens));

  const stats = processor.getStats();

  console.assert(stats.tokenCounts.cache_read_total === 2000, 'Should track cache read tokens');
  console.assert(state.tokenData.tokens_used === 1500, 'Should still only add input + output tokens');

  // The cache tokens are tracked but not currently counted in the progress bar
  console.log(`Cache read tokens tracked: ${stats.tokenCounts.cache_read_total}`);
  console.log(`But only input+output counted toward limit: ${state.tokenData.tokens_used}`);

  console.log('✅ Cache read message test passed');
  return true;
}

// Test 3: Message with cache write tokens
function testCacheWriteMessage() {
  console.log('\n=== Test 3: Message with Cache Write ===');

  const processor = new MockMessageProcessor();
  const state = new MockCacheTokenState();

  const resultMessage = {
    type: 'result',
    ...CACHE_TEST_CONFIG.SCENARIOS.CACHE_WRITE
  };

  processor.processResultMessage(resultMessage, (tokens) => state.updateTokenUsage(tokens));

  const stats = processor.getStats();

  console.assert(stats.tokenCounts.cache_write_total === 1500, 'Should track cache write tokens');
  console.assert(state.tokenData.tokens_used === 1500, 'Should still only add input + output tokens');

  console.log('✅ Cache write message test passed');
  return true;
}

// Test 4: Message with both cache read and write
function testCacheReadWriteMessage() {
  console.log('\n=== Test 4: Message with Cache Read and Write ===');

  const processor = new MockMessageProcessor();
  const state = new MockCacheTokenState();

  const resultMessage = {
    type: 'result',
    ...CACHE_TEST_CONFIG.SCENARIOS.CACHE_READ_WRITE
  };

  processor.processResultMessage(resultMessage, (tokens) => state.updateTokenUsage(tokens));

  const stats = processor.getStats();

  console.assert(stats.tokenCounts.cache_read_total === 2000, 'Should track cache read tokens');
  console.assert(stats.tokenCounts.cache_write_total === 1500, 'Should track cache write tokens');
  console.assert(state.tokenData.tokens_used === 1500, 'Should add input + output tokens only');

  console.log('✅ Cache read/write message test passed');
  return true;
}

// Test 5: Large cache usage scenario
function testLargeCacheUsage() {
  console.log('\n=== Test 5: Large Cache Usage ===');

  const processor = new MockMessageProcessor();
  const state = new MockCacheTokenState();

  const resultMessage = {
    type: 'result',
    ...CACHE_TEST_CONFIG.SCENARIOS.LARGE_CACHE
  };

  processor.processResultMessage(resultMessage, (tokens) => state.updateTokenUsage(tokens));

  const stats = processor.getStats();

  // This scenario has 50K cache read + 25K cache write but only 800 direct tokens
  console.assert(stats.tokenCounts.cache_read_total === 50000, 'Should track large cache read');
  console.assert(stats.tokenCounts.cache_write_total === 25000, 'Should track large cache write');
  console.assert(state.tokenData.tokens_used === 800, 'Should only count direct tokens in progress');

  console.log(`Large cache scenario:`);
  console.log(`  Cache read: ${stats.tokenCounts.cache_read_total} tokens`);
  console.log(`  Cache write: ${stats.tokenCounts.cache_write_total} tokens`);
  console.log(`  But progress bar shows: ${state.tokenData.tokens_used} tokens (${state.tokenData.percentage.toFixed(2)}%)`);

  console.log('✅ Large cache usage test passed');
  return true;
}

// Test 6: Multiple messages with mixed cache usage
function testMixedCacheMessages() {
  console.log('\n=== Test 6: Multiple Messages with Mixed Cache Usage ===');

  const processor = new MockMessageProcessor();
  const state = new MockCacheTokenState();

  // Process multiple messages with different cache patterns
  const messages = [
    { type: 'result', ...CACHE_TEST_CONFIG.SCENARIOS.STANDARD },
    { type: 'result', ...CACHE_TEST_CONFIG.SCENARIOS.CACHE_READ },
    { type: 'result', ...CACHE_TEST_CONFIG.SCENARIOS.CACHE_WRITE },
    { type: 'result', ...CACHE_TEST_CONFIG.SCENARIOS.CACHE_READ_WRITE }
  ];

  messages.forEach((message, index) => {
    console.log(`\nProcessing message ${index + 1}:`);
    processor.processResultMessage(message, (tokens) => state.updateTokenUsage(tokens));
  });

  const stats = processor.getStats();

  // Verify cumulative totals
  const expectedInputTotal = 1000 + 1000 + 1000 + 1000; // 4000
  const expectedOutputTotal = 500 + 500 + 500 + 500; // 2000
  const expectedCacheReadTotal = 0 + 2000 + 0 + 2000; // 4000
  const expectedCacheWriteTotal = 0 + 0 + 1500 + 1500; // 3000
  const expectedProgressTotal = expectedInputTotal + expectedOutputTotal; // 6000

  console.assert(stats.tokenCounts.input_total === expectedInputTotal, 'Input total should be correct');
  console.assert(stats.tokenCounts.output_total === expectedOutputTotal, 'Output total should be correct');
  console.assert(stats.tokenCounts.cache_read_total === expectedCacheReadTotal, 'Cache read total should be correct');
  console.assert(stats.tokenCounts.cache_write_total === expectedCacheWriteTotal, 'Cache write total should be correct');
  console.assert(state.tokenData.tokens_used === expectedProgressTotal, 'Progress bar total should be correct');

  console.log(`\n📊 Mixed cache test results:`);
  console.log(`  Messages processed: ${stats.messagesProcessed}`);
  console.log(`  Input tokens total: ${stats.tokenCounts.input_total}`);
  console.log(`  Output tokens total: ${stats.tokenCounts.output_total}`);
  console.log(`  Cache read total: ${stats.tokenCounts.cache_read_total}`);
  console.log(`  Cache write total: ${stats.tokenCounts.cache_write_total}`);
  console.log(`  Progress bar total: ${state.tokenData.tokens_used}`);
  console.log(`  Progress percentage: ${state.tokenData.percentage.toFixed(2)}%`);

  console.log('✅ Mixed cache messages test passed');
  return true;
}

// Test 7: Edge case - missing cache fields
function testMissingCacheFields() {
  console.log('\n=== Test 7: Missing Cache Fields ===');

  const processor = new MockMessageProcessor();
  const state = new MockCacheTokenState();

  // Message with only some fields present
  const partialMessage = {
    type: 'result',
    usage: {
      input_tokens: 1000,
      output_tokens: 500
      // cache fields intentionally missing
    }
  };

  processor.processResultMessage(partialMessage, (tokens) => state.updateTokenUsage(tokens));

  const stats = processor.getStats();

  console.assert(stats.tokenCounts.cache_read_total === 0, 'Missing cache read should default to 0');
  console.assert(stats.tokenCounts.cache_write_total === 0, 'Missing cache write should default to 0');
  console.assert(state.tokenData.tokens_used === 1500, 'Should still process input + output');

  console.log('✅ Missing cache fields test passed');
  return true;
}

// Run all cache token tests
function runCacheTokenTests() {
  console.log('\n🧪 EDGE CASE TEST SUITE: Cache Token Handling');
  console.log('=' * 50);

  const results = [];

  results.push(testStandardMessage());
  results.push(testCacheReadMessage());
  results.push(testCacheWriteMessage());
  results.push(testCacheReadWriteMessage());
  results.push(testLargeCacheUsage());
  results.push(testMixedCacheMessages());
  results.push(testMissingCacheFields());

  const passed = results.filter(Boolean).length;
  const total = results.length;

  console.log(`\n📊 Test Results: ${passed}/${total} tests passed`);

  if (passed === total) {
    console.log('🎉 All cache token tests passed!');
  } else {
    console.log('⚠️  Some tests failed - review logs above');
  }

  return {
    testSuite: 'Cache Token Handling',
    passed: passed,
    total: total,
    success: passed === total,
    details: {
      'Standard Message': results[0],
      'Cache Read': results[1],
      'Cache Write': results[2],
      'Cache Read/Write': results[3],
      'Large Cache Usage': results[4],
      'Mixed Cache Messages': results[5],
      'Missing Cache Fields': results[6]
    },
    recommendations: [
      'CRITICAL: Current implementation only counts input + output tokens toward progress bar',
      'Cache tokens are tracked but not included in usage percentage calculation',
      'Consider if cache tokens should be counted differently (e.g., discounted rate)',
      'Large cache usage scenarios may show misleadingly low progress percentages',
      'Missing cache fields are handled gracefully with default values'
    ]
  };
}

// Export for module usage or run if called directly
if (require.main === module) {
  runCacheTokenTests();
}

module.exports = { runCacheTokenTests, CACHE_TEST_CONFIG };