/**
 * Dedicated Wave 6 Production Stage Templates Test Runner
 */

const assert = require('assert');

global.describe = (name, fn) => {
  console.log(`\n📦 ${name}`);
  fn();
};

let currentBeforeEach = null;
global.beforeEach = (fn) => {
  currentBeforeEach = fn;
};

const passedTests = [];
const failedTests = [];
const testsQueue = [];

global.test = (name, fn) => {
  testsQueue.push({ name, fn, beforeEach: currentBeforeEach });
};

// Load test suite
require('../__tests__/manufacturingStageTemplates.test.js');

(async () => {
  console.log('🚀 Running Wave 6: Stage Templates & Sets Test Suite...\n');
  const startTime = Date.now();

  for (const t of testsQueue) {
    if (t.beforeEach) await t.beforeEach();
    try {
      await t.fn();
      passedTests.push(t.name);
      console.log(`  ✅ PASS: ${t.name}`);
    } catch (err) {
      failedTests.push({ name: t.name, error: err });
      console.error(`  ❌ FAIL: ${t.name}`);
      console.error(err);
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('\n==================================================');
  console.log(`Test Results: ${passedTests.length} passed, ${failedTests.length} failed (${duration}s)`);
  console.log('==================================================');

  if (failedTests.length > 0) {
    process.exit(1);
  }
  process.exit(0);
})();
