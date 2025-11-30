/**
 * Global teardown for Playwright tests
 * Runs once after all tests complete
 */
async function globalTeardown() {
  console.log('\n🏁 Running global test teardown...');

  // Generate summary report
  const fs = require('fs');
  const path = require('path');

  const resultsFile = path.join(__dirname, '..', 'test-results', 'results.json');

  if (fs.existsSync(resultsFile)) {
    try {
      const results = JSON.parse(fs.readFileSync(resultsFile, 'utf-8'));
      console.log('📊 Test Summary:');
      console.log(`   Total Tests: ${results.stats?.total || 0}`);
      console.log(`   Passed: ${results.stats?.expected || 0}`);
      console.log(`   Failed: ${results.stats?.unexpected || 0}`);
      console.log(`   Skipped: ${results.stats?.skipped || 0}`);
    } catch (error) {
      console.log('Could not read test results');
    }
  }

  console.log('✅ Global teardown complete');
}

export default globalTeardown;