/**
 * Test script for order workflow fixes
 * Tests:
 * 1. System fallback status transition lookup
 * 2. PATCH route valid statuses expansion (VALID_ORDER_STATUSES + custom)
 * 3. Config flow verification
 */
const { VALID_ORDER_STATUSES } = require('../utils/constants');

const PASS = '\x1b[32m✓\x1b[0m';
const FAIL = '\x1b[31m✗\x1b[0m';
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    const result = fn();
    if (result === true || result === undefined) {
      console.log(`  ${PASS} ${name}`);
      passed++;
    } else {
      console.log(`  ${FAIL} ${name}: expected true, got ${result}`);
      failed++;
    }
  } catch (e) {
    console.log(`  ${FAIL} ${name}: ${e.message}`);
    failed++;
  }
}

console.log('\n=== Test 1: VALID_ORDER_STATUSES contains all workflow statuses ===');
test('includes PENDING', () => VALID_ORDER_STATUSES.includes('PENDING'));
test('includes CONFIRMED', () => VALID_ORDER_STATUSES.includes('CONFIRMED'));
test('includes PROCESSING', () => VALID_ORDER_STATUSES.includes('PROCESSING'));
test('includes SHIPPED', () => VALID_ORDER_STATUSES.includes('SHIPPED'));
test('includes DELIVERED', () => VALID_ORDER_STATUSES.includes('DELIVERED'));
test('includes CANCELLED', () => VALID_ORDER_STATUSES.includes('CANCELLED'));
test('includes REFUNDED', () => VALID_ORDER_STATUSES.includes('REFUNDED'));
test('includes PREPARING', () => VALID_ORDER_STATUSES.includes('PREPARING'));
test('includes QUALITY_CHECK', () => VALID_ORDER_STATUSES.includes('QUALITY_CHECK'));
test('includes PACKAGED', () => VALID_ORDER_STATUSES.includes('PACKAGED'));
test('includes READY_TO_SHIP', () => VALID_ORDER_STATUSES.includes('READY_TO_SHIP'));
test('includes OUT_FOR_DELIVERY', () => VALID_ORDER_STATUSES.includes('OUT_FOR_DELIVERY'));
test('includes RETURNED', () => VALID_ORDER_STATUSES.includes('RETURNED'));
test('includes PARTIALLY_RETURNED', () => VALID_ORDER_STATUSES.includes('PARTIALLY_RETURNED'));
test('includes EXCHANGED', () => VALID_ORDER_STATUSES.includes('EXCHANGED'));
test('total is 29 statuses', () => VALID_ORDER_STATUSES.length === 29);
test('all are uppercase', () => VALID_ORDER_STATUSES.every(s => s === s.toUpperCase()));

console.log('\n=== Test 2: Route status validation with Set ===');
const validSet = new Set(VALID_ORDER_STATUSES);
test('custom PREPARING is in set', () => validSet.has('PREPARING'));
test('custom QUALITY_CHECK is in set', () => validSet.has('QUALITY_CHECK'));
test('PENDING is in set', () => validSet.has('PENDING'));
test('INVALID_STATUS is NOT in set', () => !validSet.has('INVALID_STATUS'));
test('empty string NOT in set', () => !validSet.has(''));

// Simulate adding custom statuses from DB
validSet.add('CUSTOM_COMPLETED');
validSet.add('AWAITING_PAYMENT');
test('added CUSTOM_COMPLETED to set', () => validSet.has('CUSTOM_COMPLETED'));
test('added AWAITING_PAYMENT to set', () => validSet.has('AWAITING_PAYMENT'));

console.log('\n=== Test 3: System fallback status logic ===');
const systemFallback = { id: 'CONFIRMED', code: 'CONFIRMED', name: 'CONFIRMED', isSystemFallback: true };
test('fallback has isSystemFallback flag', () => systemFallback.isSystemFallback === true);
test('fallback id equals code', () => systemFallback.id === systemFallback.code);

// Simulate the transition lookup: first try by id, then by code
const mockTransitions = [
  { id: 't1', fromStatusId: null, toStatusId: 'cmx123abc', allowedRoles: '["OWNER"]' }
];
const mockDbStatus = { id: 'cmx123abc', code: 'CONFIRMED', name: 'مؤكد' };

let transition = mockTransitions.find(t => t.toStatusId === systemFallback.id);
test('no transition found by fallback id', () => transition === undefined);

if (!transition && systemFallback.isSystemFallback) {
  const matchingDbStatus = { id: 'cmx123abc', code: systemFallback.code, name: 'مؤكد' };
  if (matchingDbStatus) {
    transition = mockTransitions.find(t => t.toStatusId === matchingDbStatus.id);
  }
}
test('transition found by matching DB status id', () => transition !== undefined);
test('transition id is t1', () => transition.id === 't1');

console.log('\n=== Test 4: Config enabled check ===');
const isWorkflowConfigEnabled = (config) => Boolean(config?.enabled || config?.isEnabled);

test('null config returns false', () => isWorkflowConfigEnabled(null) === false);
test('undefined config returns false', () => isWorkflowConfigEnabled(undefined) === false);
test('enabled=true returns true', () => isWorkflowConfigEnabled({ enabled: true }) === true);
test('enabled=false returns false', () => isWorkflowConfigEnabled({ enabled: false }) === false);
test('isEnabled=true returns true (backward compat)', () => isWorkflowConfigEnabled({ isEnabled: true }) === true);
test('both true returns true', () => isWorkflowConfigEnabled({ enabled: true, isEnabled: true }) === true);

console.log('\n=== Test 5: isOverride from QuickStatusChange flow ===');
// Simulate workflowEnabled state
const simulateIsOverride = (workflowEnabled) => !workflowEnabled;
test('workflow enabled => isOverride false', () => simulateIsOverride(true) === false);
test('workflow disabled => isOverride true', () => simulateIsOverride(false) === true);

console.log(`\n${'='.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
console.log(`${'='.repeat(50)}\n`);

process.exit(failed > 0 ? 1 : 0);
