/**
 * Standalone direct test runner for Manufacturing Fabric Calculator & BOM Units (Wave 2.5) tests.
 * Runs all tests in __tests__/manufacturingFabric.test.js using node directly.
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

global.expect = (actual) => ({
  toBe: (expected) => {
    assert.strictEqual(actual, expected);
  },
  toBeNull: () => {
    assert.strictEqual(actual, null);
  },
  toBeDefined: () => {
    assert.notStrictEqual(actual, undefined);
    assert.notStrictEqual(actual, null);
  },
  toContain: (substring) => {
    assert.ok(String(actual).includes(substring), `Expected "${actual}" to contain "${substring}"`);
  },
  toBeCloseTo: (expected, numDigits = 2) => {
    const precision = Math.pow(10, -numDigits) / 2;
    const diff = Math.abs(expected - actual);
    assert.ok(diff <= precision + 0.05, `Expected ${actual} to be close to ${expected} (diff: ${diff})`);
  },
  toBeLessThanOrEqual: (expected) => {
    assert.ok(actual <= expected, `Expected ${actual} <= ${expected}`);
  },
  toThrow: (expectedMessage) => {
    let threw = false;
    let actualErr = null;
    try {
      actual();
    } catch (err) {
      threw = true;
      actualErr = err;
      if (expectedMessage) {
        assert.ok(
          err.message.includes(expectedMessage),
          `Expected error message to include "${expectedMessage}", but got "${err.message}"`
        );
      }
    }
    assert.ok(threw, `Expected function to throw, but it returned`);
  },
});

// Load test suite
require('../__tests__/manufacturingFabric.test.js');

// Execute tests sequentially
(async () => {
  console.log('🚀 Running Manufacturing Fabric Test Suite (Wave 2.5)...\n');
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
