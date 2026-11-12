const test = require('node:test');
const assert = require('node:assert/strict');
const {
  checkStatusAlertDedup,
  clearStatusAlertDedupCache,
} = require('../../utils/statusAlertDedup');

test('TASK 1eff9f7a: statusAlertDedup TTL guard', async (t) => {
  t.beforeEach(() => {
    clearStatusAlertDedupCache();
  });

  await t.test('allows first alert and blocks duplicate within 5-minute window', () => {
    const t0 = 1_700_000_000_000;
    const first = checkStatusAlertDedup({
      companyId: 'comp-1',
      orderId: 'ord-1',
      statusCode: 'SHIPPED',
      windowMinutes: 5,
      now: t0,
    });
    assert.equal(first.allowed, true);
    assert.equal(first.retryAfterMs, 0);

    const second = checkStatusAlertDedup({
      companyId: 'comp-1',
      orderId: 'ord-1',
      statusCode: 'SHIPPED',
      windowMinutes: 5,
      now: t0 + 60_000, // +1 min
    });
    assert.equal(second.allowed, false);
    assert.equal(second.retryAfterMs, 4 * 60_000);
  });

  await t.test('allows different status for the same order immediately', () => {
    const t0 = 1_700_000_000_000;
    const shipped = checkStatusAlertDedup({
      companyId: 'comp-1',
      orderId: 'ord-1',
      statusCode: 'SHIPPED',
      windowMinutes: 5,
      now: t0,
    });
    const delivered = checkStatusAlertDedup({
      companyId: 'comp-1',
      orderId: 'ord-1',
      statusCode: 'DELIVERED',
      windowMinutes: 5,
      now: t0 + 5_000,
    });

    assert.equal(shipped.allowed, true);
    assert.equal(delivered.allowed, true);
  });

  await t.test('isolates dedup keys across companies and orders and normalizes case', () => {
    const t0 = 1_700_000_000_000;
    assert.equal(
      checkStatusAlertDedup({ companyId: 'comp-1', orderId: 'ord-1', statusCode: 'shipped', now: t0 }).allowed,
      true
    );
    // Same key differing only by case is blocked
    assert.equal(
      checkStatusAlertDedup({ companyId: 'comp-1', orderId: 'ord-1', statusCode: 'SHIPPED', now: t0 + 1_000 }).allowed,
      false
    );
    // Different order or company is allowed
    assert.equal(
      checkStatusAlertDedup({ companyId: 'comp-1', orderId: 'ord-2', statusCode: 'SHIPPED', now: t0 + 1_000 }).allowed,
      true
    );
    assert.equal(
      checkStatusAlertDedup({ companyId: 'comp-2', orderId: 'ord-1', statusCode: 'SHIPPED', now: t0 + 1_000 }).allowed,
      true
    );
  });

  await t.test('allows alert again once TTL expires', () => {
    const t0 = 1_700_000_000_000;
    const first = checkStatusAlertDedup({
      companyId: 'comp-1',
      orderId: 'ord-1',
      statusCode: 'SHIPPED',
      windowMinutes: 5,
      now: t0,
    });
    assert.equal(first.allowed, true);

    const beforeExpiry = checkStatusAlertDedup({
      companyId: 'comp-1',
      orderId: 'ord-1',
      statusCode: 'SHIPPED',
      windowMinutes: 5,
      now: t0 + 5 * 60_000 - 1,
    });
    assert.equal(beforeExpiry.allowed, false);
    assert.equal(beforeExpiry.retryAfterMs, 1);

    const afterExpiry = checkStatusAlertDedup({
      companyId: 'comp-1',
      orderId: 'ord-1',
      statusCode: 'SHIPPED',
      windowMinutes: 5,
      now: t0 + 5 * 60_000,
    });
    assert.equal(afterExpiry.allowed, true);
    assert.equal(afterExpiry.retryAfterMs, 0);
  });

  await t.test('windowMinutes=0 disables dedup blocking', () => {
    const t0 = 1_700_000_000_000;
    assert.equal(
      checkStatusAlertDedup({ companyId: 'comp-1', orderId: 'ord-1', statusCode: 'SHIPPED', windowMinutes: 0, now: t0 }).allowed,
      true
    );
    assert.equal(
      checkStatusAlertDedup({ companyId: 'comp-1', orderId: 'ord-1', statusCode: 'SHIPPED', windowMinutes: 0, now: t0 + 100 }).allowed,
      true
    );
  });
});
