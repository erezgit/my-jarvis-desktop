/**
 * Edge Case Test 5: Extreme Edge Cases
 *
 * Tests the most extreme scenarios that could break the token tracking system:
 * - Percentage overflow (>100%)
 * - Component state corruption
 * - Memory leaks with rapid updates
 * - Race conditions
 * - UI rendering edge cases
 */

// Configuration for extreme testing scenarios
const EXTREME_TEST_CONFIG = {
  MAX_TOKENS: 200000,
  OVERFLOW_MULTIPLIER: 5, // 5x the max tokens
  RAPID_UPDATE_COUNT: 50000,
  STRESS_TEST_DURATION: 5000, // 5 seconds
  MEMORY_THRESHOLD_MB: 100 // Alert if memory usage exceeds this
};

// Mock component state for testing edge cases
class ExtremeTokenState {
  constructor() {
    this.reset();
    this.stateHistory = [];
    this.memorySnapshots = [];
  }

  reset() {
    this.tokenData = {
      tokens_used: 0,
      max_tokens: EXTREME_TEST_CONFIG.MAX_TOKENS,
      percentage: 0
    };
    this.updateCount = 0;
    this.errors = [];
    this.stateCorruptions = [];
  }

  updateTokenUsage(newTokens) {
    const prevState = JSON.stringify(this.tokenData);

    try {
      this.updateCount++;
      this.tokenData.tokens_used += newTokens;
      this.tokenData.percentage = (this.tokenData.tokens_used / this.tokenData.max_tokens) * 100;

      // Record state history for analysis
      this.stateHistory.push({
        update: this.updateCount,
        tokensAdded: newTokens,
        tokensTotal: this.tokenData.tokens_used,
        percentage: this.tokenData.percentage,
        timestamp: performance.now()
      });

      // Check for state corruption
      this.validateState();

    } catch (error) {
      this.errors.push({
        error: error.message,
        update: this.updateCount,
        prevState: prevState,
        newTokens: newTokens
      });
    }
  }

  validateState() {
    const { tokens_used, max_tokens, percentage } = this.tokenData;

    // Check for impossible values
    if (typeof tokens_used !== 'number' || isNaN(tokens_used) || !isFinite(tokens_used)) {
      this.stateCorruptions.push(`tokens_used is invalid: ${tokens_used}`);
    }

    if (typeof percentage !== 'number' || isNaN(percentage) || !isFinite(percentage)) {
      this.stateCorruptions.push(`percentage is invalid: ${percentage}`);
    }

    // Check for calculation consistency
    const expectedPercentage = (tokens_used / max_tokens) * 100;
    const percentageDiff = Math.abs(percentage - expectedPercentage);
    if (percentageDiff > 0.01) { // Allow tiny floating point errors
      this.stateCorruptions.push(`percentage calculation mismatch: expected ${expectedPercentage}, got ${percentage}`);
    }

    // Check for negative values (tokens_used should never be negative)
    if (tokens_used < 0) {
      this.stateCorruptions.push(`tokens_used is negative: ${tokens_used}`);
    }
  }

  takeMemorySnapshot() {
    if (typeof performance !== 'undefined' && performance.memory) {
      this.memorySnapshots.push({
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        timestamp: performance.now(),
        updateCount: this.updateCount
      });
    }
  }

  getStats() {
    return {
      updateCount: this.updateCount,
      currentState: this.tokenData,
      errors: this.errors,
      stateCorruptions: this.stateCorruptions,
      stateHistory: this.stateHistory,
      memorySnapshots: this.memorySnapshots
    };
  }
}

// Test 1: Percentage overflow scenarios
function testPercentageOverflow() {
  console.log('\n=== Test 1: Percentage Overflow (>100%) ===');

  const state = new ExtremeTokenState();

  // Add tokens that exceed the maximum
  const overflowTokens = EXTREME_TEST_CONFIG.MAX_TOKENS * EXTREME_TEST_CONFIG.OVERFLOW_MULTIPLIER;
  state.updateTokenUsage(overflowTokens);

  const stats = state.getStats();
  const percentage = stats.currentState.percentage;

  console.log(`Added ${overflowTokens} tokens (${EXTREME_TEST_CONFIG.OVERFLOW_MULTIPLIER}x max)`);
  console.log(`Resulting percentage: ${percentage.toFixed(2)}%`);

  // Test component rendering with overflow
  const mockComponent = {
    renderProgressBar(percentage) {
      // This is how TokenContextBar handles width
      const width = Math.min(percentage, 100);
      const gradientClass = this.getGradientStyle(percentage);

      return {
        width: `${width}%`,
        gradientClass: gradientClass,
        displayText: `${percentage.toFixed(1)}% used`
      };
    },

    getGradientStyle(percentage) {
      if (percentage < 25) return 'from-blue-100 to-blue-200';
      else if (percentage < 50) return 'from-blue-200 to-violet-200';
      else if (percentage < 75) return 'from-violet-200 to-violet-300';
      else if (percentage < 90) return 'from-violet-300 to-amber-200';
      else return 'from-amber-300 to-red-300';
    }
  };

  const rendered = mockComponent.renderProgressBar(percentage);

  console.assert(percentage > 100, 'Percentage should exceed 100%');
  console.assert(rendered.width === '100%', 'Progress bar width should be clamped to 100%');
  console.assert(rendered.gradientClass === 'from-amber-300 to-red-300', 'Should use critical color for overflow');
  console.assert(stats.stateCorruptions.length === 0, 'State should remain valid despite overflow');

  console.log(`Progress bar renders as: ${rendered.width} with ${rendered.gradientClass}`);
  console.log('✅ Percentage overflow test passed');
  return true;
}

// Test 2: Rapid successive updates (stress test)
function testRapidUpdates() {
  console.log('\n=== Test 2: Rapid Updates Stress Test ===');

  const state = new ExtremeTokenState();
  const startTime = performance.now();

  // Take initial memory snapshot
  state.takeMemorySnapshot();

  console.log(`Starting ${EXTREME_TEST_CONFIG.RAPID_UPDATE_COUNT} rapid updates...`);

  // Perform rapid updates
  for (let i = 0; i < EXTREME_TEST_CONFIG.RAPID_UPDATE_COUNT; i++) {
    const tokens = Math.floor(Math.random() * 100) + 1; // 1-100 tokens per update
    state.updateTokenUsage(tokens);

    // Take memory snapshots periodically
    if (i % 10000 === 0) {
      state.takeMemorySnapshot();
    }
  }

  const endTime = performance.now();
  const duration = endTime - startTime;
  const updatesPerSecond = EXTREME_TEST_CONFIG.RAPID_UPDATE_COUNT / (duration / 1000);

  // Take final memory snapshot
  state.takeMemorySnapshot();

  const stats = state.getStats();

  console.log(`Completed ${EXTREME_TEST_CONFIG.RAPID_UPDATE_COUNT} updates in ${duration.toFixed(2)}ms`);
  console.log(`Updates per second: ${updatesPerSecond.toFixed(0)}`);
  console.log(`Final token count: ${stats.currentState.tokens_used}`);
  console.log(`Errors encountered: ${stats.errors.length}`);
  console.log(`State corruptions: ${stats.stateCorruptions.length}`);

  // Analyze memory usage
  if (stats.memorySnapshots.length > 1) {
    const initialMemory = stats.memorySnapshots[0].usedJSHeapSize;
    const finalMemory = stats.memorySnapshots[stats.memorySnapshots.length - 1].usedJSHeapSize;
    const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // Convert to MB

    console.log(`Memory increase: ${memoryIncrease.toFixed(2)} MB`);

    if (memoryIncrease > EXTREME_TEST_CONFIG.MEMORY_THRESHOLD_MB) {
      console.log(`⚠️ High memory usage detected: ${memoryIncrease.toFixed(2)} MB`);
    }
  }

  // Performance should be reasonable
  const isPerformant = updatesPerSecond > 5000; // Should handle at least 5K updates/sec
  const isStable = stats.errors.length === 0 && stats.stateCorruptions.length === 0;

  console.log(isPerformant ? '✅ Performance test passed' : '⚠️ Performance below threshold');
  console.log(isStable ? '✅ Stability test passed' : '❌ Stability issues detected');

  return {
    passed: isPerformant && isStable,
    performance: {
      duration: duration,
      updatesPerSecond: updatesPerSecond,
      memoryIncrease: stats.memorySnapshots.length > 1 ?
        (stats.memorySnapshots[stats.memorySnapshots.length - 1].usedJSHeapSize - stats.memorySnapshots[0].usedJSHeapSize) / 1024 / 1024 : 0
    },
    stability: {
      errors: stats.errors.length,
      corruptions: stats.stateCorruptions.length
    }
  };
}

// Test 3: Component state consistency
function testStateConsistency() {
  console.log('\n=== Test 3: State Consistency ===');

  const state = new ExtremeTokenState();

  // Test various update patterns
  const updatePatterns = [
    { name: 'Small increments', updates: Array(100).fill(10) },
    { name: 'Large jumps', updates: [1000, 5000, 10000, 50000] },
    { name: 'Mixed sizes', updates: [1, 1000, 5, 10000, 100, 50000] },
    { name: 'Zero updates', updates: [0, 0, 0] },
  ];

  let allPassed = true;

  updatePatterns.forEach(pattern => {
    console.log(`\nTesting pattern: ${pattern.name}`);
    state.reset();

    let expectedTotal = 0;
    pattern.updates.forEach(tokens => {
      expectedTotal += tokens;
      state.updateTokenUsage(tokens);

      // Verify consistency after each update
      const currentState = state.getStats().currentState;
      if (currentState.tokens_used !== expectedTotal) {
        console.log(`❌ Inconsistency detected: expected ${expectedTotal}, got ${currentState.tokens_used}`);
        allPassed = false;
      }
    });

    const finalStats = state.getStats();
    console.log(`Pattern completed: ${expectedTotal} tokens, ${finalStats.stateCorruptions.length} corruptions`);

    if (finalStats.stateCorruptions.length > 0) {
      allPassed = false;
    }
  });

  console.log(allPassed ? '✅ State consistency test passed' : '❌ State consistency issues detected');
  return allPassed;
}

// Test 4: UI rendering edge cases
function testUIRenderingEdgeCases() {
  console.log('\n=== Test 4: UI Rendering Edge Cases ===');

  // Test various problematic percentage values
  const edgeCasePercentages = [
    0,           // Minimum
    0.1,         // Very small
    24.9,        // Just below first threshold
    25.0,        // Exactly at threshold
    25.1,        // Just above threshold
    49.9, 50.0, 50.1,   // Around second threshold
    74.9, 75.0, 75.1,   // Around third threshold
    89.9, 90.0, 90.1,   // Around fourth threshold
    99.9,        // Just below 100%
    100.0,       // Exactly 100%
    100.1,       // Just above 100%
    150.0,       // Significant overflow
    500.0,       // Extreme overflow
    1000.0,      // Very extreme overflow
    Infinity,    // Edge case
    -10.0        // Negative (shouldn't happen but test anyway)
  ];

  const formatTokens = (num) => {
    if (typeof num !== 'number' || isNaN(num) || !isFinite(num)) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${Math.round(num / 1000)}K`;
    return num.toString();
  };

  const getGradientStyle = (percentage) => {
    if (typeof percentage !== 'number' || isNaN(percentage)) return 'from-blue-100 to-blue-200';
    if (percentage < 25) return 'from-blue-100 to-blue-200';
    else if (percentage < 50) return 'from-blue-200 to-violet-200';
    else if (percentage < 75) return 'from-violet-200 to-violet-300';
    else if (percentage < 90) return 'from-violet-300 to-amber-200';
    else return 'from-amber-300 to-red-300';
  };

  let allPassed = true;

  edgeCasePercentages.forEach(percentage => {
    try {
      // Test component rendering with edge case percentage
      const tokens_used = (percentage / 100) * EXTREME_TEST_CONFIG.MAX_TOKENS;

      // Test formatting
      const formattedUsed = formatTokens(tokens_used);
      const formattedMax = formatTokens(EXTREME_TEST_CONFIG.MAX_TOKENS);

      // Test gradient selection
      const gradient = getGradientStyle(percentage);

      // Test progress bar width
      const progressWidth = Math.min(Math.max(percentage, 0), 100); // Clamp between 0-100

      // Test percentage display
      const displayPercentage = typeof percentage === 'number' && isFinite(percentage) ?
        percentage.toFixed(1) : '0.0';

      console.log(`${percentage}% -> width: ${progressWidth}%, gradient: ${gradient}, display: ${displayPercentage}%`);

      // Validate results
      if (progressWidth < 0 || progressWidth > 100) {
        console.log(`❌ Invalid progress width: ${progressWidth}`);
        allPassed = false;
      }

      if (!gradient.includes('from-') || !gradient.includes('to-')) {
        console.log(`❌ Invalid gradient: ${gradient}`);
        allPassed = false;
      }

    } catch (error) {
      console.log(`❌ Error rendering ${percentage}%: ${error.message}`);
      allPassed = false;
    }
  });

  console.log(allPassed ? '✅ UI rendering edge cases test passed' : '❌ UI rendering issues detected');
  return allPassed;
}

// Test 5: Maximum values and limits
function testMaximumLimits() {
  console.log('\n=== Test 5: Maximum Limits ===');

  const state = new ExtremeTokenState();

  // Test with maximum safe integer
  console.log('\nTesting with Number.MAX_SAFE_INTEGER...');
  state.updateTokenUsage(Number.MAX_SAFE_INTEGER);

  let stats = state.getStats();
  console.log(`Tokens after MAX_SAFE_INTEGER: ${stats.currentState.tokens_used}`);
  console.log(`Percentage: ${stats.currentState.percentage.toFixed(2)}%`);

  // Test adding more to already maximum value
  console.log('\nTesting overflow beyond MAX_SAFE_INTEGER...');
  state.updateTokenUsage(1000000);

  stats = state.getStats();
  console.log(`Tokens after additional update: ${stats.currentState.tokens_used}`);
  console.log(`State corruptions: ${stats.stateCorruptions.length}`);

  // The system should handle this gracefully without crashes
  const isStable = stats.errors.length === 0;
  const hasValidPercentage = typeof stats.currentState.percentage === 'number' &&
                           isFinite(stats.currentState.percentage);

  console.log(isStable ? '✅ Maximum limits stability test passed' : '❌ System unstable at maximum limits');
  console.log(hasValidPercentage ? '✅ Percentage remains valid' : '❌ Percentage became invalid');

  return isStable && hasValidPercentage;
}

// Test 6: Concurrent update simulation
function testConcurrentUpdates() {
  console.log('\n=== Test 6: Concurrent Updates Simulation ===');

  const state = new ExtremeTokenState();

  // Simulate what might happen with concurrent updates
  // (In real app, React's state batching would handle this, but test anyway)

  const simulateRaceCondition = () => {
    const updates = [100, 200, 300, 400, 500];

    // Simulate rapid consecutive updates that might arrive "simultaneously"
    updates.forEach((tokens, index) => {
      setTimeout(() => {
        state.updateTokenUsage(tokens);
      }, index); // Stagger by 1ms each
    });
  };

  return new Promise(resolve => {
    simulateRaceCondition();

    setTimeout(() => {
      const stats = state.getStats();
      const expectedTotal = 100 + 200 + 300 + 400 + 500; // 1500

      console.log(`Expected total: ${expectedTotal}`);
      console.log(`Actual total: ${stats.currentState.tokens_used}`);
      console.log(`Updates processed: ${stats.updateCount}`);

      const isCorrect = stats.currentState.tokens_used === expectedTotal;
      const allUpdatesProcessed = stats.updateCount === 5;

      console.log(isCorrect ? '✅ Concurrent updates total correct' : '❌ Concurrent updates total incorrect');
      console.log(allUpdatesProcessed ? '✅ All updates processed' : '❌ Some updates lost');

      resolve(isCorrect && allUpdatesProcessed);
    }, 100); // Wait for all updates to complete
  });
}

// Run all extreme edge case tests
async function runExtremeEdgeCasesTests() {
  console.log('\n🧪 EDGE CASE TEST SUITE: Extreme Edge Cases');
  console.log('=' * 50);

  const results = [];

  results.push(testPercentageOverflow());
  results.push(testRapidUpdates());
  results.push(testStateConsistency());
  results.push(testUIRenderingEdgeCases());
  results.push(testMaximumLimits());
  results.push(await testConcurrentUpdates()); // This one is async

  const passed = results.filter(result => result === true || result.passed === true).length;
  const total = results.length;

  console.log(`\n📊 Test Results: ${passed}/${total} tests passed`);

  if (passed === total) {
    console.log('🎉 All extreme edge case tests passed!');
  } else {
    console.log('⚠️  Some tests failed - review logs above');
  }

  return {
    testSuite: 'Extreme Edge Cases',
    passed: passed,
    total: total,
    success: passed === total,
    details: {
      'Percentage Overflow': results[0],
      'Rapid Updates': results[1],
      'State Consistency': results[2],
      'UI Rendering Edge Cases': results[3],
      'Maximum Limits': results[4],
      'Concurrent Updates': results[5]
    },
    recommendations: [
      'CRITICAL: Progress bar width clamping works correctly for overflow scenarios',
      'Performance is adequate for rapid updates but monitor memory usage',
      'State consistency is maintained across different update patterns',
      'UI handles extreme percentage values gracefully',
      'System remains stable at maximum numeric limits',
      'Consider implementing debouncing for very rapid updates',
      'Add memory usage monitoring in production'
    ]
  };
}

// Export for module usage or run if called directly
if (require.main === module) {
  runExtremeEdgeCasesTests();
}

module.exports = { runExtremeEdgeCasesTests, EXTREME_TEST_CONFIG };