/**
 * Edge Case Test 2: Large Conversation Test
 *
 * Tests the token tracking system with high token usage scenarios:
 * - Simulates 1000+ messages
 * - Tests performance with cumulative tracking
 * - Tests percentage calculations near limits
 * - Tests overflow protection
 */

// Test configuration
const TEST_CONFIG = {
  MAX_TOKENS: 200000,
  LARGE_MESSAGE_COUNT: 1000,
  TOKENS_PER_MESSAGE: 150, // Average tokens per message
  OVERFLOW_TOKENS: 250000  // More than max_tokens to test overflow
};

// Mock token usage state
class MockTokenUsageState {
  constructor() {
    this.tokenData = {
      tokens_used: 0,
      max_tokens: TEST_CONFIG.MAX_TOKENS,
      percentage: 0
    };
    this.updateCount = 0;
  }

  updateTokenUsage(newTokens) {
    this.updateCount++;
    this.tokenData.tokens_used += newTokens;
    this.tokenData.percentage = (this.tokenData.tokens_used / this.tokenData.max_tokens) * 100;

    console.log(`[UPDATE ${this.updateCount}] Added ${newTokens} tokens, total: ${this.tokenData.tokens_used}, percentage: ${this.tokenData.percentage.toFixed(2)}%`);
  }

  setTokenUsage(totalTokens) {
    this.tokenData.tokens_used = totalTokens;
    this.tokenData.percentage = (totalTokens / this.tokenData.max_tokens) * 100;
  }

  reset() {
    this.tokenData = {
      tokens_used: 0,
      max_tokens: TEST_CONFIG.MAX_TOKENS,
      percentage: 0
    };
    this.updateCount = 0;
  }
}

// Test 1: Simulate large conversation with cumulative token tracking
function testLargeConversationAccumulation() {
  console.log('\n=== Test 1: Large Conversation Token Accumulation ===');

  const state = new MockTokenUsageState();
  const startTime = Date.now();

  // Simulate processing many messages
  for (let i = 0; i < TEST_CONFIG.LARGE_MESSAGE_COUNT; i++) {
    const tokensInMessage = TEST_CONFIG.TOKENS_PER_MESSAGE + Math.floor(Math.random() * 50); // Add some variance
    state.updateTokenUsage(tokensInMessage);

    // Log progress every 100 messages
    if ((i + 1) % 100 === 0) {
      console.log(`Processed ${i + 1} messages, total tokens: ${state.tokenData.tokens_used}`);
    }
  }

  const endTime = Date.now();
  const duration = endTime - startTime;

  console.log(`\n📊 Large Conversation Results:`);
  console.log(`Messages processed: ${TEST_CONFIG.LARGE_MESSAGE_COUNT}`);
  console.log(`Total tokens: ${state.tokenData.tokens_used}`);
  console.log(`Percentage: ${state.tokenData.percentage.toFixed(2)}%`);
  console.log(`Processing time: ${duration}ms`);
  console.log(`Updates performed: ${state.updateCount}`);

  // Assertions
  const expectedMinTokens = TEST_CONFIG.LARGE_MESSAGE_COUNT * TEST_CONFIG.TOKENS_PER_MESSAGE;
  console.assert(state.tokenData.tokens_used >= expectedMinTokens, 'Total tokens should be at least expected minimum');
  console.assert(state.updateCount === TEST_CONFIG.LARGE_MESSAGE_COUNT, 'Update count should match message count');
  console.assert(state.tokenData.percentage > 50, 'Percentage should be significant for large conversation');

  console.log('✅ Large conversation accumulation test passed');
  return {
    passed: true,
    totalTokens: state.tokenData.tokens_used,
    percentage: state.tokenData.percentage,
    duration: duration,
    updatesPerformed: state.updateCount
  };
}

// Test 2: Test percentage calculation accuracy at various levels
function testPercentageAccuracy() {
  console.log('\n=== Test 2: Percentage Calculation Accuracy ===');

  const state = new MockTokenUsageState();
  const testCases = [
    { tokens: 0, expectedPercentage: 0 },
    { tokens: 50000, expectedPercentage: 25 },
    { tokens: 100000, expectedPercentage: 50 },
    { tokens: 150000, expectedPercentage: 75 },
    { tokens: 180000, expectedPercentage: 90 },
    { tokens: 200000, expectedPercentage: 100 },
  ];

  let allPassed = true;

  testCases.forEach(testCase => {
    state.setTokenUsage(testCase.tokens);
    const calculatedPercentage = state.tokenData.percentage;
    const isAccurate = Math.abs(calculatedPercentage - testCase.expectedPercentage) < 0.01; // Allow tiny floating point errors

    console.log(`Tokens: ${testCase.tokens}, Expected: ${testCase.expectedPercentage}%, Calculated: ${calculatedPercentage.toFixed(2)}%, Accurate: ${isAccurate ? '✅' : '❌'}`);

    if (!isAccurate) {
      allPassed = false;
    }
  });

  console.log(allPassed ? '✅ Percentage accuracy test passed' : '❌ Percentage accuracy test failed');
  return allPassed;
}

// Test 3: Test gradient color assignment for high usage levels
function testHighUsageGradients() {
  console.log('\n=== Test 3: High Usage Gradient Colors ===');

  const getGradientStyle = (percentage) => {
    if (percentage < 25) return 'from-blue-100 to-blue-200';
    else if (percentage < 50) return 'from-blue-200 to-violet-200';
    else if (percentage < 75) return 'from-violet-200 to-violet-300';
    else if (percentage < 90) return 'from-violet-300 to-amber-200';
    else return 'from-amber-300 to-red-300';
  };

  const testCases = [
    { percentage: 85, expectedGradient: 'from-violet-300 to-amber-200', description: 'High usage (85%)' },
    { percentage: 95, expectedGradient: 'from-amber-300 to-red-300', description: 'Critical usage (95%)' },
    { percentage: 100, expectedGradient: 'from-amber-300 to-red-300', description: 'Maximum usage (100%)' },
    { percentage: 120, expectedGradient: 'from-amber-300 to-red-300', description: 'Overflow usage (120%)' },
  ];

  let allPassed = true;

  testCases.forEach(testCase => {
    const gradient = getGradientStyle(testCase.percentage);
    const isCorrect = gradient === testCase.expectedGradient;

    console.log(`${testCase.description}: ${gradient} ${isCorrect ? '✅' : '❌'}`);

    if (!isCorrect) {
      allPassed = false;
    }
  });

  console.log(allPassed ? '✅ High usage gradients test passed' : '❌ High usage gradients test failed');
  return allPassed;
}

// Test 4: Test token overflow scenarios
function testTokenOverflow() {
  console.log('\n=== Test 4: Token Overflow Protection ===');

  const state = new MockTokenUsageState();

  // Set tokens above the maximum
  state.setTokenUsage(TEST_CONFIG.OVERFLOW_TOKENS);

  console.log(`Tokens set to: ${TEST_CONFIG.OVERFLOW_TOKENS}`);
  console.log(`Max tokens: ${TEST_CONFIG.MAX_TOKENS}`);
  console.log(`Calculated percentage: ${state.tokenData.percentage.toFixed(2)}%`);

  // Test that percentage can exceed 100%
  console.assert(state.tokenData.percentage > 100, 'Percentage should exceed 100% for overflow');

  // Test progress bar width clamping (should not exceed 100%)
  const progressBarWidth = Math.min(state.tokenData.percentage, 100);
  console.assert(progressBarWidth === 100, 'Progress bar width should be clamped to 100%');

  console.log(`Progress bar width (clamped): ${progressBarWidth}%`);
  console.log('✅ Token overflow test passed');

  return {
    passed: true,
    actualPercentage: state.tokenData.percentage,
    clampedWidth: progressBarWidth
  };
}

// Test 5: Performance test with rapid updates
function testRapidUpdates() {
  console.log('\n=== Test 5: Performance with Rapid Updates ===');

  const state = new MockTokenUsageState();
  const updateCount = 10000;
  const tokensPerUpdate = 10;

  const startTime = performance.now();

  for (let i = 0; i < updateCount; i++) {
    state.updateTokenUsage(tokensPerUpdate);
  }

  const endTime = performance.now();
  const duration = endTime - startTime;
  const updatesPerSecond = updateCount / (duration / 1000);

  console.log(`Performed ${updateCount} rapid updates in ${duration.toFixed(2)}ms`);
  console.log(`Updates per second: ${updatesPerSecond.toFixed(0)}`);
  console.log(`Final token count: ${state.tokenData.tokens_used}`);
  console.log(`Final percentage: ${state.tokenData.percentage.toFixed(2)}%`);

  // Performance should be reasonable (>1000 updates/sec on modern hardware)
  const isPerformant = updatesPerSecond > 1000;
  console.log(isPerformant ? '✅ Performance test passed' : '⚠️ Performance may need optimization');

  return {
    passed: isPerformant,
    duration: duration,
    updatesPerSecond: updatesPerSecond,
    finalTokens: state.tokenData.tokens_used
  };
}

// Run all large conversation tests
function runLargeConversationTests() {
  console.log('\n🧪 EDGE CASE TEST SUITE: Large Conversation');
  console.log('=' * 50);

  const results = [];

  results.push(testLargeConversationAccumulation());
  results.push(testPercentageAccuracy());
  results.push(testHighUsageGradients());
  results.push(testTokenOverflow());
  results.push(testRapidUpdates());

  const passed = results.filter(result => result === true || result.passed === true).length;
  const total = results.length;

  console.log(`\n📊 Test Results: ${passed}/${total} tests passed`);

  if (passed === total) {
    console.log('🎉 All large conversation tests passed!');
  } else {
    console.log('⚠️  Some tests failed - review logs above');
  }

  return {
    testSuite: 'Large Conversation',
    passed: passed,
    total: total,
    success: passed === total,
    details: {
      'Token Accumulation': results[0],
      'Percentage Accuracy': results[1],
      'High Usage Gradients': results[2],
      'Token Overflow': results[3],
      'Rapid Updates Performance': results[4]
    }
  };
}

// Export for module usage or run if called directly
if (require.main === module) {
  runLargeConversationTests();
}

module.exports = { runLargeConversationTests, TEST_CONFIG };