/**
 * Regression test: global points & cashback settings
 * Verifies that updating cashback/points settings broadcasts to ALL company
 * programs, and that cashback `status` is applied ONLY to the cashback program
 * (the bug we fixed) — not force-flipped onto every other loyalty program.
 */

const mockPrisma = {
  customerLoyaltyProgram: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
};

jest.mock('../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
}));
jest.mock('../services/hr/customerLoyaltyService', () => ({}));
jest.mock('../services/autoDiscountService', () => ({}));

const controller = require('../controller/customerLoyaltyController');

function makeRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.customerLoyaltyProgram.update.mockResolvedValue({});
  mockPrisma.customerLoyaltyProgram.updateMany.mockResolvedValue({ count: 0 });
  mockPrisma.customerLoyaltyProgram.create.mockResolvedValue({ id: 'cb' });
});

describe('updateCashbackSettings (global)', () => {
  const cashbackProgram = {
    id: 'cb',
    type: 'CASHBACK',
    rules: JSON.stringify({ cashbackPercent: 0, base: 'total', trigger: 'payment_completed' }),
  };

  it('broadcasts cashback rules to every program but sets status only on the cashback program', async () => {
    mockPrisma.customerLoyaltyProgram.findFirst.mockResolvedValue(cashbackProgram);
    mockPrisma.customerLoyaltyProgram.findMany.mockResolvedValue([
      cashbackProgram,
      { id: 'p2', type: 'POINTS', rules: '{}' },
      { id: 'p3', type: 'TIER', rules: '{}' },
    ]);

    const req = {
      user: { companyId: 'c1', id: 'u1' },
      body: { cashbackPercent: 5, base: 'subtotal', status: 'ACTIVE', maxPerOrder: 50, tierOverrides: {} },
    };
    const res = makeRes();
    await controller.updateCashbackSettings(req, res);

    // 3 programs updated
    expect(mockPrisma.customerLoyaltyProgram.update).toHaveBeenCalledTimes(3);
    const calls = mockPrisma.customerLoyaltyProgram.update.mock.calls;

    const cbUpdate = calls.find((c) => c[0].where.id === 'cb')[0];
    const p2Update = calls.find((c) => c[0].where.id === 'p2')[0];
    const p3Update = calls.find((c) => c[0].where.id === 'p3')[0];

    // cashback program: status + merged rules
    expect(cbUpdate.data.status).toBe('ACTIVE');
    expect(cbUpdate.data.rules).toContain('"cashbackPercent":5');
    expect(cbUpdate.data.rules).toContain('"base":"subtotal"');
    expect(cbUpdate.data.rules).toContain('"maxPerOrder":50');

    // other programs: rules broadcast, status untouched
    expect(p2Update.data.rules).toContain('"cashbackPercent":5');
    expect(p2Update.data.status).toBeUndefined();
    expect(p3Update.data.rules).toContain('"cashbackPercent":5');
    expect(p3Update.data.status).toBeUndefined();

    // response reflects the normalized rules
    const data = res.json.mock.calls[0][0].data;
    expect(data.rules.cashbackPercent).toBe(5);
    expect(data.rules.base).toBe('subtotal');
    expect(data.status).toBe('ACTIVE');
  });

  it('never forces status onto non-cashback programs even when cashback is INACTIVE', async () => {
    mockPrisma.customerLoyaltyProgram.findFirst.mockResolvedValue(cashbackProgram);
    mockPrisma.customerLoyaltyProgram.findMany.mockResolvedValue([
      cashbackProgram,
      { id: 'p2', type: 'POINTS', rules: '{}' },
    ]);

    const req = {
      user: { companyId: 'c1', id: 'u1' },
      body: { cashbackPercent: 0, base: 'total', status: 'INACTIVE', maxPerOrder: 0, tierOverrides: {} },
    };
    const res = makeRes();
    await controller.updateCashbackSettings(req, res);

    const calls = mockPrisma.customerLoyaltyProgram.update.mock.calls;
    const p2Update = calls.find((c) => c[0].where.id === 'p2')[0];
    expect(p2Update.data.status).toBeUndefined();
    const cbUpdate = calls.find((c) => c[0].where.id === 'cb')[0];
    expect(cbUpdate.data.status).toBe('INACTIVE');
  });
});

describe('updatePointsSettings (global)', () => {
  it('updates points fields on all programs via updateMany and never touches status/rules', async () => {
    mockPrisma.customerLoyaltyProgram.updateMany.mockResolvedValue({ count: 3 });

    const req = {
      user: { companyId: 'c1', id: 'u1' },
      body: {
        pointsPerAmount: 2,
        pointsPerPurchase: 3,
        pointsPerReferral: 4,
        redemptionRate: 5,
        minimumPoints: 6,
        maxPointsPerTransaction: 7,
        expiryMonths: 8,
      },
    };
    const res = makeRes();
    await controller.updatePointsSettings(req, res);

    expect(mockPrisma.customerLoyaltyProgram.updateMany).toHaveBeenCalledTimes(1);
    const arg = mockPrisma.customerLoyaltyProgram.updateMany.mock.calls[0][0];
    expect(arg.where).toEqual({ companyId: 'c1' });
    expect(arg.data).toEqual({
      pointsPerAmount: 2,
      pointsPerPurchase: 3,
      pointsPerReferral: 4,
      redemptionRate: 5,
      minimumPoints: 6,
      maxPointsPerTransaction: 7,
      expiryMonths: 8,
    });
    expect(arg.data.status).toBeUndefined();
    expect(arg.data.rules).toBeUndefined();

    const data = res.json.mock.calls[0][0].data;
    expect(data.updatedCount).toBe(3);
  });

  it('coerces invalid numbers to safe defaults', async () => {
    mockPrisma.customerLoyaltyProgram.updateMany.mockResolvedValue({ count: 1 });
    const req = {
      user: { companyId: 'c1', id: 'u1' },
      body: { pointsPerAmount: 'abc', pointsPerPurchase: null, expiryMonths: 12.7 },
    };
    const res = makeRes();
    await controller.updatePointsSettings(req, res);
    const arg = mockPrisma.customerLoyaltyProgram.updateMany.mock.calls[0][0];
    expect(arg.data.pointsPerAmount).toBe(1); // fallback default
    expect(arg.data.pointsPerPurchase).toBe(0); // fallback default
    expect(arg.data.expiryMonths).toBe(13); // Math.round(12.7)
  });
});

describe('getPointsSettings (global)', () => {
  it('prefers a non-CASHBACK program so cashback zeroed defaults do not leak', async () => {
    const nonCb = {
      id: 'p2',
      type: 'POINTS',
      pointsPerAmount: '2',
      pointsPerPurchase: '3',
      pointsPerReferral: '4',
      redemptionRate: '5',
      minimumPoints: '6',
      maxPointsPerTransaction: '7',
      expiryMonths: 9,
    };
    mockPrisma.customerLoyaltyProgram.findFirst.mockResolvedValueOnce(nonCb);

    const req = { user: { companyId: 'c1' } };
    const res = makeRes();
    await controller.getPointsSettings(req, res);

    // found a non-cashback program on the first try → no fallback query
    expect(mockPrisma.customerLoyaltyProgram.findFirst).toHaveBeenCalledTimes(1);
    const data = res.json.mock.calls[0][0].data;
    expect(data.pointsPerAmount).toBe(2);
    expect(data.redemptionRate).toBe(5);
    expect(data.expiryMonths).toBe(9);
  });

  it('falls back to the first program when no non-CASHBACK program exists', async () => {
    const onlyCb = {
      id: 'cb',
      type: 'CASHBACK',
      pointsPerAmount: '0',
      pointsPerPurchase: '0',
      pointsPerReferral: '0',
      redemptionRate: '1',
      minimumPoints: '0',
      maxPointsPerTransaction: null,
      expiryMonths: 12,
    };
    mockPrisma.customerLoyaltyProgram.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(onlyCb);

    const req = { user: { companyId: 'c1' } };
    const res = makeRes();
    await controller.getPointsSettings(req, res);

    expect(mockPrisma.customerLoyaltyProgram.findFirst).toHaveBeenCalledTimes(2);
    const data = res.json.mock.calls[0][0].data;
    expect(data.pointsPerAmount).toBe(0);
    expect(data.redemptionRate).toBe(1);
    expect(data.expiryMonths).toBe(12);
  });
});
