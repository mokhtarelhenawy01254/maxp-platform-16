/**
 * Test Suite: Billing Notification Service Renewal Reminder Zero-Write Verification
 * 
 * Verifies that:
 * 1. sendRenewalReminders does NOT write to billingHistory under any circumstances.
 * 2. checkUpcomingRenewals does NOT write to billingHistory.
 * 3. Gracefully handles null/missing company emails without crashing.
 * 4. Zero new rows are added to billingHistory (delta = 0).
 *
 * Can be executed via:
 *   node tests/services/billingNotificationService.test.js
 * or via Jest:
 *   jest tests/services/billingNotificationService.test.js
 */

const assert = require('assert');

// In-memory mock database state
const mockBillingHistoryRows = [];
const mockNotifications = [];

const mockPrisma = {
  billingHistory: {
    create: async ({ data }) => {
      mockBillingHistoryRows.push({ id: `bh_${Date.now()}_${Math.random()}`, ...data, createdAt: new Date() });
      return mockBillingHistoryRows[mockBillingHistoryRows.length - 1];
    },
    count: async ({ where } = {}) => {
      if (!where) return mockBillingHistoryRows.length;
      return mockBillingHistoryRows.filter(r => {
        if (where.companyId && r.companyId !== where.companyId) return false;
        if (where.type && r.type !== where.type) return false;
        return true;
      }).length;
    },
    findMany: async () => [...mockBillingHistoryRows],
  },
  platformSubscription: {
    findMany: async ({ where } = {}) => {
      // Return 2 sample active subscriptions due for renewal
      return [
        {
          id: 'sub-active-1',
          companyId: 'comp-swan-1',
          monthlyFee: 499,
          status: 'ACTIVE',
          nextBillingDate: new Date(),
          company: { id: 'comp-swan-1', name: 'Swan Store', email: 'owner@swan.com' },
        },
        {
          id: 'sub-active-2',
          companyId: 'comp-h2m-2',
          monthlyFee: 999,
          status: 'ACTIVE',
          nextBillingDate: new Date(),
          company: { id: 'comp-h2m-2', name: 'H2M Trading', email: 'admin@h2m.com' },
        },
      ];
    },
  },
  companyWallet: {
    findMany: async () => [],
  },
  notification: {
    create: async ({ data }) => {
      mockNotifications.push({ id: `notif_${Date.now()}`, ...data, createdAt: new Date() });
      return mockNotifications[mockNotifications.length - 1];
    },
    count: async () => 0,
  },
  user: {
    findMany: async () => [],
  },
  order: {
    findMany: async () => [],
  },
};

// Track calls to billingHistory.create directly
let billingHistoryCreateCalls = 0;
const originalCreate = mockPrisma.billingHistory.create;
mockPrisma.billingHistory.create = async (...args) => {
  billingHistoryCreateCalls++;
  return originalCreate(...args);
};

// Mock sharedDatabase before requiring billingNotificationService
const sharedDatabase = require('../../services/sharedDatabase');
const originalGetSharedPrismaClient = sharedDatabase.getSharedPrismaClient;
const originalSafeQuery = sharedDatabase.safeQuery;
const originalHealthCheck = sharedDatabase.healthCheck;

sharedDatabase.getSharedPrismaClient = () => mockPrisma;
sharedDatabase.safeQuery = async (fn) => fn();
sharedDatabase.healthCheck = async () => ({ status: 'healthy' });

const billingNotificationService = require('../../services/billingNotificationService');

async function runSuite() {
  console.log('\n===============================================================');
  console.log('🧪 Billing Notification Service: Zero billingHistory Write Tests');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function testCase(description, fn) {
    try {
      fn();
      console.log(`  ✅ PASS: ${description}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${description}`);
      console.error(`     Error: ${err.message}`);
      failed++;
    }
  }

  async function testCaseAsync(description, fn) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${description}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${description}`);
      console.error(`     Error: ${err.message}`);
      failed++;
    }
  }

  // Pre-test initial state
  billingHistoryCreateCalls = 0;
  mockBillingHistoryRows.length = 0;
  const initialRowCount = mockBillingHistoryRows.length;

  // -------------------------------------------------------------------------
  // Test 1: sendRenewalReminders does NOT call billingHistory.create
  // -------------------------------------------------------------------------
  await testCaseAsync('sendRenewalReminders does not call billingHistory.create for multiple subscriptions', async () => {
    const testSubs = [
      {
        companyId: 'comp-101',
        monthlyFee: 500,
        company: { id: 'comp-101', name: 'Alpha Co', email: 'billing@alpha.com' },
      },
      {
        companyId: 'comp-102',
        monthlyFee: 1200,
        company: { id: 'comp-102', name: 'Beta Co', email: 'billing@beta.com' },
      },
      {
        companyId: 'comp-103',
        monthlyFee: 300,
        company: { id: 'comp-103', name: 'Gamma Co', email: 'billing@gamma.com' },
      },
    ];

    await billingNotificationService.sendRenewalReminders(testSubs, 7);

    assert.strictEqual(
      billingHistoryCreateCalls,
      0,
      `Expected 0 calls to billingHistory.create, got ${billingHistoryCreateCalls}`
    );
    assert.strictEqual(
      mockBillingHistoryRows.length,
      initialRowCount,
      `Expected 0 rows added to billingHistory, got ${mockBillingHistoryRows.length - initialRowCount}`
    );
  });

  // -------------------------------------------------------------------------
  // Test 2: Edge cases: null email, missing company object, empty array
  // -------------------------------------------------------------------------
  await testCaseAsync('sendRenewalReminders safely handles subscriptions with missing email or company without crashing', async () => {
    const edgeSubs = [
      {
        companyId: 'comp-edge-1',
        monthlyFee: 100,
        company: null, // null company object
      },
      {
        companyId: 'comp-edge-2',
        monthlyFee: 200,
        company: { id: 'comp-edge-2', name: 'No Email Co' }, // missing email property
      },
    ];

    // Must not throw
    await billingNotificationService.sendRenewalReminders(edgeSubs, 3);
    await billingNotificationService.sendRenewalReminders([], 1);
    await billingNotificationService.sendRenewalReminders(null, 1);
    await billingNotificationService.sendRenewalReminders(undefined, 1);

    assert.strictEqual(
      billingHistoryCreateCalls,
      0,
      'billingHistory.create must still be 0 after edge case inputs'
    );
  });

  // -------------------------------------------------------------------------
  // Test 3: checkUpcomingRenewals does NOT write to billingHistory
  // -------------------------------------------------------------------------
  await testCaseAsync('checkUpcomingRenewals finds renewals and processes reminders with zero billingHistory writes', async () => {
    const beforeCalls = billingHistoryCreateCalls;
    const beforeRows = mockBillingHistoryRows.length;

    await billingNotificationService.checkUpcomingRenewals();

    assert.strictEqual(
      billingHistoryCreateCalls,
      beforeCalls,
      `checkUpcomingRenewals must not call billingHistory.create (before: ${beforeCalls}, after: ${billingHistoryCreateCalls})`
    );
    assert.strictEqual(
      mockBillingHistoryRows.length,
      beforeRows,
      `checkUpcomingRenewals must not insert rows into billingHistory (delta: ${mockBillingHistoryRows.length - beforeRows})`
    );
  });

  // -------------------------------------------------------------------------
  // Test 4: Integration Simulation — billingHistory has zero 'Renewal reminder' rows
  // -------------------------------------------------------------------------
  testCase('Integration Guard: billingHistory contains zero Renewal reminder rows after suite run', () => {
    const reminderRows = mockBillingHistoryRows.filter(
      r => r.description && r.description.startsWith('Renewal reminder')
    );
    assert.strictEqual(
      reminderRows.length,
      0,
      `Expected 0 Renewal reminder rows in billingHistory, found ${reminderRows.length}`
    );
  });

  // -------------------------------------------------------------------------
  // Test 5: Export contract verification
  // -------------------------------------------------------------------------
  testCase('Service exports valid instance and class reference', () => {
    assert.strictEqual(typeof billingNotificationService.sendRenewalReminders, 'function');
    assert.strictEqual(typeof billingNotificationService.checkUpcomingRenewals, 'function');
    assert.strictEqual(typeof billingNotificationService.start, 'function');
    assert.strictEqual(typeof billingNotificationService.stop, 'function');
    assert.strictEqual(typeof billingNotificationService.getStatus, 'function');
    assert.strictEqual(typeof billingNotificationService.BillingNotificationService, 'function');
  });

  // Restore mocks
  sharedDatabase.getSharedPrismaClient = originalGetSharedPrismaClient;
  sharedDatabase.safeQuery = originalSafeQuery;
  sharedDatabase.healthCheck = originalHealthCheck;

  console.log('\n---------------------------------------------------------------');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('---------------------------------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runSuite().catch((err) => {
    console.error('Unhandled test suite error:', err);
    process.exit(1);
  });
}

// Jest integration if Jest runner is used
if (typeof describe === 'function') {
  describe('BillingNotificationService Zero-Write Tests', () => {
    test('runSuite completes with zero errors', async () => {
      await runSuite();
    });
  });
}

module.exports = { runSuite };
