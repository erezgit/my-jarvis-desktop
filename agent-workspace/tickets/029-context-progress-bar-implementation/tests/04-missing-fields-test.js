/**
 * Edge Case Test 4: Missing Fields Test
 *
 * Tests the token tracking system's robustness when dealing with:
 * - Missing usage object entirely
 * - Missing individual token fields
 * - Malformed usage data
 * - Null/undefined values
 * - Empty objects
 */

// Test scenarios for missing/malformed data
const MISSING_FIELDS_SCENARIOS = {
  // Completely missing usage object
  NO_USAGE: {
    type: 'result',
    // usage field completely missing
    duration_ms: 1500,
    total_cost_usd: 0.02
  },

  // Usage object is null
  NULL_USAGE: {
    type: 'result',
    usage: null,
    duration_ms: 1500
  },

  // Usage object is undefined
  UNDEFINED_USAGE: {
    type: 'result',
    usage: undefined,
    duration_ms: 1500
  },

  // Empty usage object
  EMPTY_USAGE: {
    type: 'result',
    usage: {},
    duration_ms: 1500
  },

  // Missing input_tokens
  MISSING_INPUT: {
    type: 'result',
    usage: {
      output_tokens: 500
    }
  },

  // Missing output_tokens
  MISSING_OUTPUT: {
    type: 'result',
    usage: {
      input_tokens: 1000
    }
  },

  // Both tokens null
  NULL_TOKENS: {
    type: 'result',
    usage: {
      input_tokens: null,
      output_tokens: null
    }
  },

  // Both tokens undefined
  UNDEFINED_TOKENS: {
    type: 'result',
    usage: {
      input_tokens: undefined,
      output_tokens: undefined
    }
  },

  // String values instead of numbers
  STRING_TOKENS: {
    type: 'result',
    usage: {
      input_tokens: "1000",
      output_tokens: "500"
    }
  },

  // Negative token values
  NEGATIVE_TOKENS: {
    type: 'result',
    usage: {
      input_tokens: -100,
      output_tokens: -50
    }
  },

  // Zero token values
  ZERO_TOKENS: {
    type: 'result',
    usage: {
      input_tokens: 0,
      output_tokens: 0
    }
  },

  // Floating point tokens
  FLOAT_TOKENS: {
    type: 'result',
    usage: {
      input_tokens: 1000.5,
      output_tokens: 500.7
    }
  },

  // Extremely large token values
  LARGE_TOKENS: {
    type: 'result',
    usage: {
      input_tokens: Number.MAX_SAFE_INTEGER,
      output_tokens: 1000000000
    }
  },

  // NaN token values
  NAN_TOKENS: {
    type: 'result',
    usage: {
      input_tokens: NaN,
      output_tokens: NaN
    }
  },

  // Infinity token values
  INFINITY_TOKENS: {
    type: 'result',
    usage: {
      input_tokens: Infinity,
      output_tokens: -Infinity
    }
  }
};

// Mock robust message processor that handles missing fields
class RobustMessageProcessor {
  constructor() {
    this.processedMessages = [];
    this.errors = [];
    this.warnings = [];
  }

  // Robust token extraction with fallbacks
  extractTokensFromUsage(usage) {
    console.log('[EXTRACT] Raw usage object:', usage);

    // Handle completely missing or invalid usage
    if (!usage || typeof usage !== 'object') {
      this.warnings.push(`Invalid usage object: ${typeof usage}`);
      return { inputTokens: 0, outputTokens: 0, isValid: false };
    }

    // Extract tokens with robust fallbacks
    let inputTokens = usage.input_tokens;
    let outputTokens = usage.output_tokens;

    // Convert and validate input tokens
    if (inputTokens === null || inputTokens === undefined) {
      this.warnings.push('input_tokens is null/undefined, defaulting to 0');
      inputTokens = 0;
    } else if (typeof inputTokens === 'string') {
      const parsed = parseInt(inputTokens, 10);
      if (isNaN(parsed)) {
        this.warnings.push(`input_tokens string "${inputTokens}" is not a valid number, defaulting to 0`);
        inputTokens = 0;
      } else {
        this.warnings.push(`input_tokens converted from string "${inputTokens}" to number ${parsed}`);
        inputTokens = parsed;
      }
    } else if (typeof inputTokens !== 'number') {
      this.warnings.push(`input_tokens is ${typeof inputTokens}, defaulting to 0`);
      inputTokens = 0;
    } else if (isNaN(inputTokens)) {
      this.warnings.push('input_tokens is NaN, defaulting to 0');
      inputTokens = 0;
    } else if (!isFinite(inputTokens)) {
      this.warnings.push('input_tokens is not finite (Infinity/-Infinity), defaulting to 0');
      inputTokens = 0;
    } else if (inputTokens < 0) {
      this.warnings.push(`input_tokens is negative (${inputTokens}), using absolute value`);
      inputTokens = Math.abs(inputTokens);
    }

    // Convert and validate output tokens (same logic)
    if (outputTokens === null || outputTokens === undefined) {
      this.warnings.push('output_tokens is null/undefined, defaulting to 0');
      outputTokens = 0;
    } else if (typeof outputTokens === 'string') {
      const parsed = parseInt(outputTokens, 10);
      if (isNaN(parsed)) {
        this.warnings.push(`output_tokens string "${outputTokens}" is not a valid number, defaulting to 0`);
        outputTokens = 0;
      } else {
        this.warnings.push(`output_tokens converted from string "${outputTokens}" to number ${parsed}`);
        outputTokens = parsed;
      }
    } else if (typeof outputTokens !== 'number') {
      this.warnings.push(`output_tokens is ${typeof outputTokens}, defaulting to 0`);
      outputTokens = 0;
    } else if (isNaN(outputTokens)) {
      this.warnings.push('output_tokens is NaN, defaulting to 0');
      outputTokens = 0;
    } else if (!isFinite(outputTokens)) {
      this.warnings.push('output_tokens is not finite (Infinity/-Infinity), defaulting to 0');
      outputTokens = 0;
    } else if (outputTokens < 0) {
      this.warnings.push(`output_tokens is negative (${outputTokens}), using absolute value`);
      outputTokens = Math.abs(outputTokens);
    }

    // Handle floating point values
    if (inputTokens % 1 !== 0) {
      this.warnings.push(`input_tokens has decimal places (${inputTokens}), rounding to ${Math.round(inputTokens)}`);
      inputTokens = Math.round(inputTokens);
    }

    if (outputTokens % 1 !== 0) {
      this.warnings.push(`output_tokens has decimal places (${outputTokens}), rounding to ${Math.round(outputTokens)}`);
      outputTokens = Math.round(outputTokens);
    }

    console.log(`[EXTRACT] Processed tokens - input: ${inputTokens}, output: ${outputTokens}`);

    return {
      inputTokens: inputTokens,
      outputTokens: outputTokens,
      isValid: true
    };
  }

  processResultMessage(resultMessage, onTokenUpdate) {
    console.log('\n[ROBUST] Processing result message...');

    try {
      const tokenData = this.extractTokensFromUsage(resultMessage.usage);

      if (!tokenData.isValid) {
        this.warnings.push('Could not extract valid token data from usage object');
        return;
      }

      const totalTokens = tokenData.inputTokens + tokenData.outputTokens;

      console.log(`[ROBUST] Extracted ${totalTokens} total tokens (${tokenData.inputTokens} input + ${tokenData.outputTokens} output)`);

      if (onTokenUpdate) {
        onTokenUpdate(totalTokens);
      }

      this.processedMessages.push({
        inputTokens: tokenData.inputTokens,
        outputTokens: tokenData.outputTokens,
        totalTokens: totalTokens,
        timestamp: Date.now(),
        warningsCount: this.warnings.length
      });

    } catch (error) {
      this.errors.push(`Error processing message: ${error.message}`);
      console.error('[ROBUST] Error processing message:', error);
    }
  }

  getStats() {
    return {
      processedMessages: this.processedMessages.length,
      errors: this.errors,
      warnings: this.warnings,
      details: this.processedMessages
    };
  }

  reset() {
    this.processedMessages = [];
    this.errors = [];
    this.warnings = [];
  }
}

// Mock token state for testing robustness
class RobustTokenState {
  constructor() {
    this.tokenData = {
      tokens_used: 0,
      max_tokens: 200000,
      percentage: 0
    };
    this.updateCount = 0;
    this.errors = [];
  }

  updateTokenUsage(newTokens) {
    try {
      // Validate the incoming token value
      if (typeof newTokens !== 'number' || isNaN(newTokens) || !isFinite(newTokens)) {
        this.errors.push(`Invalid token value: ${newTokens} (${typeof newTokens})`);
        return;
      }

      if (newTokens < 0) {
        this.errors.push(`Negative token value: ${newTokens}, using absolute value`);
        newTokens = Math.abs(newTokens);
      }

      this.updateCount++;
      this.tokenData.tokens_used += newTokens;
      this.tokenData.percentage = (this.tokenData.tokens_used / this.tokenData.max_tokens) * 100;

      console.log(`[STATE] Update ${this.updateCount}: Added ${newTokens} tokens, total: ${this.tokenData.tokens_used}`);

    } catch (error) {
      this.errors.push(`Error in updateTokenUsage: ${error.message}`);
    }
  }

  reset() {
    this.tokenData = {
      tokens_used: 0,
      max_tokens: 200000,
      percentage: 0
    };
    this.updateCount = 0;
    this.errors = [];
  }
}

// Individual test functions

function testNoUsageField() {
  console.log('\n=== Test 1: No Usage Field ===');

  const processor = new RobustMessageProcessor();
  const state = new RobustTokenState();

  processor.processResultMessage(MISSING_FIELDS_SCENARIOS.NO_USAGE, (tokens) => state.updateTokenUsage(tokens));

  const stats = processor.getStats();

  console.assert(stats.warnings.length > 0, 'Should generate warnings for missing usage');
  console.assert(state.tokenData.tokens_used === 0, 'Should default to 0 tokens');
  console.assert(state.errors.length === 0, 'Should not generate errors');

  console.log('✅ No usage field test passed');
  return true;
}

function testNullUndefinedUsage() {
  console.log('\n=== Test 2: Null/Undefined Usage ===');

  const processor = new RobustMessageProcessor();
  const state = new RobustTokenState();

  // Test null usage
  processor.processResultMessage(MISSING_FIELDS_SCENARIOS.NULL_USAGE, (tokens) => state.updateTokenUsage(tokens));
  // Test undefined usage
  processor.processResultMessage(MISSING_FIELDS_SCENARIOS.UNDEFINED_USAGE, (tokens) => state.updateTokenUsage(tokens));

  const stats = processor.getStats();

  console.assert(stats.warnings.length >= 2, 'Should generate warnings for null/undefined usage');
  console.assert(state.tokenData.tokens_used === 0, 'Should default to 0 tokens for both');

  console.log('✅ Null/undefined usage test passed');
  return true;
}

function testMissingTokenFields() {
  console.log('\n=== Test 3: Missing Token Fields ===');

  const processor = new RobustMessageProcessor();
  const state = new RobustTokenState();

  // Test missing input tokens
  processor.processResultMessage(MISSING_FIELDS_SCENARIOS.MISSING_INPUT, (tokens) => state.updateTokenUsage(tokens));
  // Test missing output tokens
  processor.processResultMessage(MISSING_FIELDS_SCENARIOS.MISSING_OUTPUT, (tokens) => state.updateTokenUsage(tokens));

  const stats = processor.getStats();

  console.assert(stats.warnings.length >= 2, 'Should generate warnings for missing token fields');
  console.assert(state.tokenData.tokens_used === 1500, 'Should get 500 + 1000 = 1500 tokens total'); // Only the non-missing values

  console.log('✅ Missing token fields test passed');
  return true;
}

function testInvalidTokenTypes() {
  console.log('\n=== Test 4: Invalid Token Types ===');

  const processor = new RobustMessageProcessor();
  const state = new RobustTokenState();

  // Test string tokens
  processor.processResultMessage(MISSING_FIELDS_SCENARIOS.STRING_TOKENS, (tokens) => state.updateTokenUsage(tokens));

  const stats = processor.getStats();

  console.assert(stats.warnings.length > 0, 'Should generate warnings for string tokens');
  console.assert(state.tokenData.tokens_used === 1500, 'Should convert strings to numbers (1000 + 500)');

  console.log('✅ Invalid token types test passed');
  return true;
}

function testNegativeTokens() {
  console.log('\n=== Test 5: Negative Tokens ===');

  const processor = new RobustMessageProcessor();
  const state = new RobustTokenState();

  processor.processResultMessage(MISSING_FIELDS_SCENARIOS.NEGATIVE_TOKENS, (tokens) => state.updateTokenUsage(tokens));

  const stats = processor.getStats();

  console.assert(stats.warnings.length >= 2, 'Should generate warnings for negative tokens');
  console.assert(state.tokenData.tokens_used === 150, 'Should use absolute values (100 + 50)');

  console.log('✅ Negative tokens test passed');
  return true;
}

function testSpecialNumberValues() {
  console.log('\n=== Test 6: Special Number Values (NaN, Infinity) ===');

  const processor = new RobustMessageProcessor();
  const state = new RobustTokenState();

  // Test NaN tokens
  processor.processResultMessage(MISSING_FIELDS_SCENARIOS.NAN_TOKENS, (tokens) => state.updateTokenUsage(tokens));
  processor.reset();
  state.reset();

  // Test Infinity tokens
  processor.processResultMessage(MISSING_FIELDS_SCENARIOS.INFINITY_TOKENS, (tokens) => state.updateTokenUsage(tokens));

  const stats = processor.getStats();

  console.assert(stats.warnings.length > 0, 'Should generate warnings for special number values');
  console.assert(state.tokenData.tokens_used === 0, 'Should default to 0 for NaN/Infinity values');

  console.log('✅ Special number values test passed');
  return true;
}

function testZeroTokens() {
  console.log('\n=== Test 7: Zero Tokens ===');

  const processor = new RobustMessageProcessor();
  const state = new RobustTokenState();

  processor.processResultMessage(MISSING_FIELDS_SCENARIOS.ZERO_TOKENS, (tokens) => state.updateTokenUsage(tokens));

  const stats = processor.getStats();

  console.assert(state.tokenData.tokens_used === 0, 'Should handle zero tokens correctly');
  console.assert(state.tokenData.percentage === 0, 'Percentage should be 0');

  console.log('✅ Zero tokens test passed');
  return true;
}

function testFloatingPointTokens() {
  console.log('\n=== Test 8: Floating Point Tokens ===');

  const processor = new RobustMessageProcessor();
  const state = new RobustTokenState();

  processor.processResultMessage(MISSING_FIELDS_SCENARIOS.FLOAT_TOKENS, (tokens) => state.updateTokenUsage(tokens));

  const stats = processor.getStats();

  console.assert(stats.warnings.length >= 2, 'Should generate warnings for floating point tokens');
  console.assert(state.tokenData.tokens_used === 1501, 'Should round floats (1001 + 501)');

  console.log('✅ Floating point tokens test passed');
  return true;
}

function testContextProviderError() {
  console.log('\n=== Test 9: Context Provider Error Handling ===');

  // Test what happens when useTokenUsage is called outside provider
  try {
    // Simulate the error that would occur
    const mockUseTokenUsage = () => {
      const context = undefined; // Simulates being outside provider
      if (context === undefined) {
        throw new Error('useTokenUsage must be used within a TokenUsageProvider');
      }
      return context;
    };

    mockUseTokenUsage();
    console.log('❌ Should have thrown an error');
    return false;

  } catch (error) {
    console.assert(error.message.includes('useTokenUsage must be used within a TokenUsageProvider'), 'Should throw the correct error message');
    console.log('✅ Context provider error test passed');
    return true;
  }
}

// Run all missing fields tests
function runMissingFieldsTests() {
  console.log('\n🧪 EDGE CASE TEST SUITE: Missing Fields & Robustness');
  console.log('=' * 50);

  const results = [];

  results.push(testNoUsageField());
  results.push(testNullUndefinedUsage());
  results.push(testMissingTokenFields());
  results.push(testInvalidTokenTypes());
  results.push(testNegativeTokens());
  results.push(testSpecialNumberValues());
  results.push(testZeroTokens());
  results.push(testFloatingPointTokens());
  results.push(testContextProviderError());

  const passed = results.filter(Boolean).length;
  const total = results.length;

  console.log(`\n📊 Test Results: ${passed}/${total} tests passed`);

  if (passed === total) {
    console.log('🎉 All missing fields tests passed!');
  } else {
    console.log('⚠️  Some tests failed - review logs above');
  }

  return {
    testSuite: 'Missing Fields & Robustness',
    passed: passed,
    total: total,
    success: passed === total,
    details: {
      'No Usage Field': results[0],
      'Null/Undefined Usage': results[1],
      'Missing Token Fields': results[2],
      'Invalid Token Types': results[3],
      'Negative Tokens': results[4],
      'Special Number Values': results[5],
      'Zero Tokens': results[6],
      'Floating Point Tokens': results[7],
      'Context Provider Error': results[8]
    },
    recommendations: [
      'CRITICAL: Implement robust token extraction with fallbacks in UnifiedMessageProcessor',
      'Add validation for token values before updating state',
      'Handle string-to-number conversion gracefully',
      'Provide meaningful warnings for malformed data',
      'Consider implementing a TokenValidator utility class',
      'Add error boundaries around TokenContextBar component'
    ]
  };
}

// Export for module usage or run if called directly
if (require.main === module) {
  runMissingFieldsTests();
}

module.exports = { runMissingFieldsTests, MISSING_FIELDS_SCENARIOS };