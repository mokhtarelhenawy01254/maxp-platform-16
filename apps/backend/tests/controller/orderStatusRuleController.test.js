/**
 * Tests for P0.1 — orderStatusRuleController validation hardening
 * (PRODUCTION-FIX cron-validation-2026-08-23).
 *
 * Covers:
 *  - Field presence + same-status rejection
 *  - timeUnit whitelist (no more silent "fortnights" → Minutes fallback)
 *  - waitTime: integer + bounded (no more NaN poisoning the cron)
 *  - fromStatus: must be a known enum value (the cron queries `order.status` by it)
 *  - toStatus: enum value OR custom code with valid mapsToSystem
 *  - P0.1 part 2: deleteRule uses deleteMany (no more TOCTOU on ownership)
 */

// ── Mocks: must be set BEFORE the controller is required ────────────
// NOTE: jest.mock() is hoisted to the top of the file by Jest's
// transform — string literals are required (not variables).
jest.mock('../../services/sharedDatabase', () => {
  const mockPrisma = {
    orderStatusAutoChangeRule: {
      findMany: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    orderStatusConfig: {
      findFirst: jest.fn(),
    },
  };
  return {
    getSharedPrismaClient: () => mockPrisma,
    __esModule: true,
  };
});

jest.mock('../../utils/orderStatusEnum', () => ({
  isValidOrderStatusEnum: (s) => {
    const valid = new Set([
      'PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED',
      'PROCESSING', 'ON_HOLD', 'PENDING_CANCELLATION', 'REFUNDED',
    ]);
    return valid.has(String(s || '').toUpperCase());
  },
}));

const path = require('path');
const controller = require('../../controller/orderStatusRuleController');

// Pull the mock Prisma instance back out (via the same module path)
const sharedDatabase = require('../../services/sharedDatabase');
const mockPrisma = sharedDatabase.getSharedPrismaClient();

const buildReq = (overrides = {}) => ({
  user: { effectiveCompanyId: 'comp_1', companyId: 'comp_1', role: 'MANAGER' },
  body: {},
  ...overrides,
});

const buildRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

// ── createRule ───────────────────────────────────────────────────────
describe('orderStatusRuleController.createRule — validation hardening', () => {
  beforeEach(() => jest.clearAllMocks());

  const happyPath = async () => {
    mockPrisma.orderStatusConfig.findFirst.mockResolvedValue(null);
    mockPrisma.orderStatusAutoChangeRule.create.mockResolvedValue({ id: 'r1' });
    const req = buildReq({
      body: { fromStatus: 'CONFIRMED', toStatus: 'SHIPPED', waitTime: 30, timeUnit: 'Minutes' },
    });
    const res = buildRes();
    await controller.createRule(req, res);
    return { res, req };
  };

  test('accepts a valid rule and creates it (happy path)', async () => {
    const { res } = await happyPath();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: expect.objectContaining({ id: 'r1' }) })
    );
    // verify normalization + integer conversion
    expect(mockPrisma.orderStatusAutoChangeRule.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        companyId: 'comp_1',
        fromStatus: 'CONFIRMED',
        toStatus: 'SHIPPED',
        waitTime: 30,            // number, not string
        timeUnit: 'Minutes',
      }),
    });
  });

  // ── Field presence ──────────────────────────────────────────────
  test('rejects when fields are missing', async () => {
    const cases = [
      {},
      { toStatus: 'SHIPPED', waitTime: 30, timeUnit: 'Minutes' },
      { fromStatus: 'CONFIRMED', waitTime: 30, timeUnit: 'Minutes' },
      { fromStatus: 'CONFIRMED', toStatus: 'SHIPPED', timeUnit: 'Minutes' },
      { fromStatus: 'CONFIRMED', toStatus: 'SHIPPED', waitTime: 30 },
    ];
    for (const body of cases) {
      const res = buildRes();
      await controller.createRule(buildReq({ body }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    }
  });

  // ── Same-status check ───────────────────────────────────────────
  test('rejects when fromStatus === toStatus (no-op rule)', async () => {
    const res = buildRes();
    await controller.createRule(buildReq({
      body: { fromStatus: 'SHIPPED', toStatus: 'SHIPPED', waitTime: 30, timeUnit: 'Minutes' },
    }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].message).toMatch(/مختلفتين/);
  });

  // ── timeUnit whitelist (kills "fortnights" silent Minutes fallback) ─
  test('rejects unknown timeUnit (no more silent fallback to Minutes)', async () => {
    const res = buildRes();
    await controller.createRule(buildReq({
      body: { fromStatus: 'CONFIRMED', toStatus: 'SHIPPED', waitTime: 30, timeUnit: 'fortnights' },
    }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].message).toMatch(/Minutes.*Hours.*Days/);
  });

  // ── waitTime: integer + bounded (kills NaN poisoning) ────────────
  test('rejects non-integer waitTime', async () => {
    const cases = [
      { fromStatus: 'CONFIRMED', toStatus: 'SHIPPED', waitTime: 'abc', timeUnit: 'Minutes' },
      { fromStatus: 'CONFIRMED', toStatus: 'SHIPPED', waitTime: 1.5, timeUnit: 'Minutes' },
      { fromStatus: 'CONFIRMED', toStatus: 'SHIPPED', waitTime: NaN, timeUnit: 'Minutes' },
    ];
    for (const body of cases) {
      const res = buildRes();
      await controller.createRule(buildReq({ body }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    }
  });

  test('rejects waitTime < 1 (kills zero-wait destructive rules)', async () => {
    const res = buildRes();
    await controller.createRule(buildReq({
      body: { fromStatus: 'CONFIRMED', toStatus: 'SHIPPED', waitTime: 0, timeUnit: 'Minutes' },
    }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('rejects waitTime > 525600 (1 year in minutes — abuse guard)', async () => {
    const res = buildRes();
    await controller.createRule(buildReq({
      body: { fromStatus: 'CONFIRMED', toStatus: 'SHIPPED', waitTime: 999999, timeUnit: 'Minutes' },
    }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  // ── fromStatus: enum OR custom with valid mapsToSystem ─────────
  test('rejects fromStatus that is not a known enum and not in orderStatusConfig', async () => {
    mockPrisma.orderStatusConfig.findFirst.mockResolvedValue(null);
    const res = buildRes();
    await controller.createRule(buildReq({
      body: { fromStatus: 'UNKNOWN_RANDOM_STATUS', toStatus: 'SHIPPED', waitTime: 30, timeUnit: 'Minutes' },
    }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].message).toMatch(/حالة المصدر/);
  });

  test('accepts fromStatus = custom code with valid mapsToSystem', async () => {
    mockPrisma.orderStatusConfig.findFirst.mockImplementation(async ({ where }) => {
      if (where.code.equals === 'WITH_THE_CAPTAIN') {
        return { code: 'WITH_THE_CAPTAIN', mapsToSystem: 'SHIPPED' };
      }
      return null;
    });
    mockPrisma.orderStatusAutoChangeRule.create.mockResolvedValue({ id: 'r_custom_from' });
    const res = buildRes();
    await controller.createRule(buildReq({
      body: { fromStatus: 'WITH_THE_CAPTAIN', toStatus: 'DELIVERED', waitTime: 30, timeUnit: 'Minutes' },
    }), res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(mockPrisma.orderStatusAutoChangeRule.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        fromStatus: 'WITH_THE_CAPTAIN',
        toStatus: 'DELIVERED',
      }),
    });
  });

  test('accepts BOTH fromStatus and toStatus as custom codes with valid mapsToSystem', async () => {
    mockPrisma.orderStatusConfig.findFirst.mockImplementation(async ({ where }) => {
      if (where.code.equals === 'WITH_THE_CAPTAIN') {
        return { code: 'WITH_THE_CAPTAIN', mapsToSystem: 'SHIPPED' };
      }
      if (where.code.equals === 'DELAYED-WITH-CAPTAIN') {
        return { code: 'DELAYED-WITH-CAPTAIN', mapsToSystem: 'ON_HOLD' };
      }
      return null;
    });
    mockPrisma.orderStatusAutoChangeRule.create.mockResolvedValue({ id: 'r_both_custom' });
    const res = buildRes();
    await controller.createRule(buildReq({
      body: { fromStatus: 'WITH_THE_CAPTAIN', toStatus: 'DELAYED-WITH-CAPTAIN', waitTime: 60, timeUnit: 'Minutes' },
    }), res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(mockPrisma.orderStatusAutoChangeRule.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        fromStatus: 'WITH_THE_CAPTAIN',
        toStatus: 'DELAYED-WITH-CAPTAIN',
      }),
    });
  });

  // ── toStatus: enum OR custom with valid mapsToSystem ───────────
  test('accepts toStatus = custom code with valid mapsToSystem', async () => {
    mockPrisma.orderStatusConfig.findFirst.mockResolvedValue({ mapsToSystem: 'ON_HOLD' });
    mockPrisma.orderStatusAutoChangeRule.create.mockResolvedValue({ id: 'r2' });
    const res = buildRes();
    await controller.createRule(buildReq({
      body: { fromStatus: 'CONFIRMED', toStatus: 'delayed_with_captain', waitTime: 30, timeUnit: 'Minutes' },
    }), res);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('rejects toStatus = custom code WITHOUT valid mapsToSystem', async () => {
    mockPrisma.orderStatusConfig.findFirst.mockResolvedValue({ mapsToSystem: '' });
    const res = buildRes();
    await controller.createRule(buildReq({
      body: { fromStatus: 'CONFIRMED', toStatus: 'FAKE_STATUS', waitTime: 30, timeUnit: 'Minutes' },
    }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].message).toMatch(/حالة الهدف/);
  });

  // ── Edge case: normalization works (lowercase, whitespace) ──────
  test('normalizes lowercase fromStatus to uppercase (frontend may send lowercase)', async () => {
    mockPrisma.orderStatusAutoChangeRule.create.mockResolvedValue({ id: 'r3' });
    const res = buildRes();
    await controller.createRule(buildReq({
      body: { fromStatus: 'pending', toStatus: 'SHIPPED', waitTime: 30, timeUnit: 'Minutes' },
    }), res);
    expect(res.status).toHaveBeenCalledWith(201);
    // Verify the DB write used the uppercase form
    expect(mockPrisma.orderStatusAutoChangeRule.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ fromStatus: 'PENDING' }),
    });
  });

  test('trims whitespace from timeUnit (frontend may send "  Minutes  ")', async () => {
    mockPrisma.orderStatusAutoChangeRule.create.mockResolvedValue({ id: 'r4' });
    const res = buildRes();
    await controller.createRule(buildReq({
      body: { fromStatus: 'CONFIRMED', toStatus: 'SHIPPED', waitTime: 30, timeUnit: '  Minutes  ' },
    }), res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(mockPrisma.orderStatusAutoChangeRule.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ timeUnit: 'Minutes' }),
    });
  });

  test('accepts numeric waitTime (not just string)', async () => {
    mockPrisma.orderStatusAutoChangeRule.create.mockResolvedValue({ id: 'r5' });
    const res = buildRes();
    await controller.createRule(buildReq({
      body: { fromStatus: 'CONFIRMED', toStatus: 'SHIPPED', waitTime: 30, timeUnit: 'Minutes' },
    }), res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(mockPrisma.orderStatusAutoChangeRule.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ waitTime: 30 }),  // number, not "30"
    });
  });

  test('accepts toStatus = custom code in lowercase (case-insensitive lookup)', async () => {
    mockPrisma.orderStatusConfig.findFirst.mockResolvedValue({ mapsToSystem: 'ON_HOLD' });
    mockPrisma.orderStatusAutoChangeRule.create.mockResolvedValue({ id: 'r6' });
    const res = buildRes();
    await controller.createRule(buildReq({
      body: { fromStatus: 'CONFIRMED', toStatus: 'cancelled', waitTime: 30, timeUnit: 'Minutes' },
    }), res);
    expect(res.status).toHaveBeenCalledWith(201);
    // The custom code is stored as-is (uppercased for consistency)
    expect(mockPrisma.orderStatusAutoChangeRule.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ toStatus: 'CANCELLED' }),
    });
  });

  // ── Auth: no companyId → 401 ───────────────────────────────────
  test('returns 401 when no companyId in request context', async () => {
    const res = buildRes();
    await controller.createRule({ user: {}, body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  // ── The exact "1-Click Wipe" attack from the review is now blocked ─
  test('REGRESSION: DELIVERED → PENDING with waitTime=0 is REJECTED (not 201)', async () => {
    const res = buildRes();
    await controller.createRule(buildReq({
      body: { fromStatus: 'DELIVERED', toStatus: 'PENDING', waitTime: 0, timeUnit: 'Minutes' },
    }), res);
    // 0 waitTime is now caught by the integer >= 1 check
    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockPrisma.orderStatusAutoChangeRule.create).not.toHaveBeenCalled();
  });
});

// ── deleteRule: TOCTOU fix ──────────────────────────────────────────
describe('orderStatusRuleController.deleteRule — TOCTOU fix', () => {
  beforeEach(() => jest.clearAllMocks());

  test('uses deleteMany with compound where (no findUnique + manual check)', async () => {
    mockPrisma.orderStatusAutoChangeRule.deleteMany.mockResolvedValue({ count: 1 });
    const res = buildRes();
    await controller.deleteRule(
      buildReq({ params: { id: 'rule_1' } }),
      res
    );
    expect(mockPrisma.orderStatusAutoChangeRule.deleteMany).toHaveBeenCalledWith({
      where: { id: 'rule_1', companyId: 'comp_1' },
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, message: 'تم حذف القاعدة بنجاح' })
    );
  });

  test('returns 404 when rule does not belong to company (count === 0)', async () => {
    mockPrisma.orderStatusAutoChangeRule.deleteMany.mockResolvedValue({ count: 0 });
    const res = buildRes();
    await controller.deleteRule(
      buildReq({ params: { id: 'rule_OTHER_COMPANY' } }),
      res
    );
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('does not leak which rule ids exist (uniform 404 response)', async () => {
    mockPrisma.orderStatusAutoChangeRule.deleteMany.mockResolvedValue({ count: 0 });
    const res = buildRes();
    await controller.deleteRule(
      buildReq({ params: { id: 'NONEXISTENT' } }),
      res
    );
    // No timing / message side-channel: same 404 whether rule exists in another
    // company or simply doesn't exist.
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'القاعدة غير موجودة' })
    );
  });
});
