/**
 * Standalone direct test runner for Accounting Engine tests.
 * Runs all tests in __tests__/accounting.test.js using node directly.
 */

const assert = require('assert');

// Minimal Jest compatibility layer for direct node execution
global.describe = (name, fn) => {
  console.log(`\n📦 ${name}`);
  fn();
};

let beforeEachFn = null;
global.beforeEach = (fn) => {
  beforeEachFn = fn;
};

const passedTests = [];
const failedTests = [];

global.test = (name, fn) => {
  // Push to queue to run sequentially
  testsQueue.push({ name, fn });
};

const testsQueue = [];

global.expect = (actual) => ({
  toBe: (expected) => {
    assert.strictEqual(actual, expected);
  },
  toBeDefined: () => {
    assert.notStrictEqual(actual, undefined);
    assert.notStrictEqual(actual, null);
  },
  toHaveLength: (len) => {
    assert.strictEqual(actual.length, len);
  },
  not: {
    toBe: (expected) => {
      assert.notStrictEqual(actual, expected);
    },
  },
  rejects: {
    toThrow: async (expectedMessage) => {
      let threw = false;
      try {
        await actual;
      } catch (err) {
        threw = true;
        if (expectedMessage) {
          assert.ok(
            err.message.includes(expectedMessage),
            `Expected error message to include "${expectedMessage}", but got "${err.message}"`
          );
        }
      }
      assert.ok(threw, `Expected promise to reject with "${expectedMessage}", but it resolved`);
    },
  },
});

// Load test suite
require('../__tests__/accounting.test.js');

// Execute tests sequentially
(async () => {
  console.log('🚀 Running Accounting Engine Test Suite...\n');
  const startTime = Date.now();

  for (const t of testsQueue) {
    if (beforeEachFn) beforeEachFn();
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
