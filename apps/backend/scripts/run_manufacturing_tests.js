/**
 * Standalone direct test runner for Manufacturing Engine (Wave 1) tests.
 * Runs all tests in __tests__/manufacturing.test.js using node directly.
 */

const assert = require('assert');

// Minimal Jest compatibility layer for direct node execution
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

global.jest = {
  mock: () => {},
  spyOn: (obj, method) => {
    const original = obj[method];
    const calls = [];
    const spy = function (...args) {
      calls.push(args);
      return original.apply(this, args);
    };
    spy.mock = { calls };
    obj[method] = spy;
    return spy;
  },
};

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
  toHaveBeenCalledTimes: (count) => {
    assert.strictEqual(actual.mock?.calls?.length, count);
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
require('../__tests__/manufacturing.test.js');

// Execute tests sequentially
(async () => {
  console.log('🚀 Running Manufacturing Engine Test Suite (Wave 1)...\n');
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
