/**
 * AI Video Studio service tests — cost estimation, billing-mode resolution,
 * atomic wallet charge idempotency, and refund idempotency (mocked prisma).
 */
const mockPrisma = {
  systemSettings: { findUnique: jest.fn(), upsert: jest.fn() },
  aiKey: { findFirst: jest.fn() },
  companyWallet: { findUnique: jest.fn(), create: jest.fn(), updateMany: jest.fn(), update: jest.fn() },
  transaction: { findFirst: jest.fn(), create: jest.fn() },
  appUsageLog: { create: jest.fn() },
  companyApp: { findFirst: jest.fn() },
  videoJob: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn(),
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: () => mockPrisma,
  getSharedPrismaClientAsync: async () => mockPrisma,
}));

const videoStudioService = require('../../services/videoStudioService');

const SETTINGS_CONFIG = JSON.stringify({
  usdToEgp: 50,
  markupPercent: 30,
  minChargeEgp: 1,
  maxJobsPerDayPerCompany: 50,
  simulationMode: 'never',
});

describe('videoStudioService.estimateCost', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.systemSettings.findUnique.mockResolvedValue({ config: SETTINGS_CONFIG });
  });

  it('estimates video cost = price/s × duration × fx × markup', async () => {
    // kling-4.0 = $0.11/s → 10s = $1.1 → ×50×1.3 = 71.5 EGP
    const est = await videoStudioService.estimateCost({ model: 'kling-4.0', durationSeconds: 10 });
    expect(est.costUsd).toBeCloseTo(1.1, 2);
    expect(est.costEgp).toBeCloseTo(71.5, 2);
    expect(est.modelKind).toBe('video');
  });

  it('estimates image cost per image and enforces minChargeEgp', async () => {
    const est = await videoStudioService.estimateCost({ model: 'soul-2', quantity: 1 });
    // $0.003 ×50×1.3 = 0.195 → below min 1 EGP → floored to 1
    expect(est.costUsd).toBeCloseTo(0.003, 4);
    expect(est.costEgp).toBe(1);
  });

  it('rejects unknown models', async () => {
    await expect(videoStudioService.estimateCost({ model: 'nope' })).rejects.toThrow(/Unknown model/);
  });
});

describe('videoStudioService.resolveKeys', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('prefers the company BYOK key (keyType COMPANY semantics)', async () => {
    mockPrisma.aiKey.findFirst.mockImplementation(({ where }) => {
      if (where.companyId === 'c1') return Promise.resolve({ apiKey: 'kid:sec', id: 'k1', name: 'own' });
      return Promise.resolve(null);
    });
    const res = await videoStudioService.resolveKeys('c1');
    expect(res.billingMode).toBe('BYOK');
    expect(res.apiKey).toBe('kid:sec');
  });

  it('falls back to the central key as PLATFORM', async () => {
    mockPrisma.aiKey.findFirst.mockImplementation(({ where }) => {
      if (where.companyId === 'c2') return Promise.resolve(null);
      return Promise.resolve({ apiKey: 'central:secret', id: 'kc', name: 'central', maxRequestsPerDay: 1500 });
    });
    const res = await videoStudioService.resolveKeys('c2');
    expect(res.billingMode).toBe('PLATFORM');
    expect(res.apiKey).toBe('central:secret');
  });
});

describe('videoStudioService.chargeWallet (atomic + idempotent)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('refuses to charge when balance is insufficient (402-like error)', async () => {
    mockPrisma.companyWallet.findUnique.mockResolvedValue({ id: 'w1', companyId: 'c1', balance: 5 });
    mockPrisma.$transaction.mockImplementation(async (fn) => fn({
      transaction: {
        findFirst: mockPrisma.transaction.findFirst,
        create: mockPrisma.transaction.create,
      },
      companyWallet: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    }));
    await expect(videoStudioService.chargeWallet('c1', 'job1', 20)).rejects.toThrow(/رصيد المحفظة غير كافٍ/);
  });

  it('never double-charges the same job (idempotency via referenceId)', async () => {
    mockPrisma.companyWallet.findUnique.mockResolvedValue({ id: 'w1', companyId: 'c1', balance: 100 });
    const txTransactionFindFirst = jest.fn().mockResolvedValue({ id: 'existing-tx' });
    mockPrisma.$transaction.mockImplementation(async (fn) =>
      fn({
        transaction: { findFirst: txTransactionFindFirst, create: mockPrisma.transaction.create },
        companyWallet: { updateMany: mockPrisma.companyWallet.updateMany },
      }),
    );
    const res = await videoStudioService.chargeWallet('c1', 'job1', 20);
    expect(res).toEqual({ charged: false, transactionId: 'existing-tx' });
    expect(mockPrisma.companyWallet.updateMany).not.toHaveBeenCalled();
  });

  it('debits atomically and records a DEDUCT transaction on success', async () => {
    mockPrisma.companyWallet.findUnique.mockResolvedValue({ id: 'w1', companyId: 'c1', balance: 100 });
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const txCreate = jest.fn().mockResolvedValue({ id: 'tx-new' });
    mockPrisma.$transaction.mockImplementation(async (fn) =>
      fn({
        transaction: { findFirst: jest.fn().mockResolvedValue(null), create: txCreate },
        companyWallet: { updateMany },
      }),
    );
    const res = await videoStudioService.chargeWallet('c1', 'job1', 20);
    expect(res).toEqual({ charged: true, transactionId: 'tx-new' });
    expect(updateMany).toHaveBeenCalledWith({
      where: { companyId: 'c1', balance: { gte: 20 } },
      data: { balance: { decrement: 20 }, totalSpent: { increment: 20 } },
    });
    expect(txCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ amount: 20, type: 'DEDUCT', status: 'COMPLETED', referenceId: 'VIDEO_JOB_job1' }),
      }),
    );
  });
});

describe('videoStudioService.maskKey', () => {
  it('masks the key id and secret tails', () => {
    expect(videoStudioService.maskKey('abcdef123456:supersecret9999')).toBe('abcdef••••:••••9999');
    expect(videoStudioService.maskKey(null)).toBe('••••');
  });
});

describe('videoStudioService.validateJobInput', () => {
  it('rejects image models for video types and enforces duration caps', () => {
    expect(() =>
      videoStudioService.validateJobInput({ type: 'TEXT_TO_VIDEO', model: 'soul-2', params: { prompt: 'x' } }),
    ).toThrow(/لا يولّد فيديو/);

    expect(() =>
      videoStudioService.validateJobInput({ type: 'TEXT_TO_VIDEO', model: 'kling-4.0', params: { prompt: 'x', durationSeconds: 99 } }),
    ).toThrow(/المدة/);

    expect(() =>
      videoStudioService.validateJobInput({ type: 'MOTION_TRANSFER', model: 'genjutsu', params: { prompt: 'x' } }),
    ).toThrow(/فيديو مصدر/);
  });
});

describe('videoStudioService.getUsage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('aggregates platform-wide usage and revenue for super admin', async () => {
    mockPrisma.videoJob.count.mockImplementation(({ where }) => {
      if (where && where.createdAt) return Promise.resolve(7); // jobs30
      return Promise.resolve(42); // totalJobs
    });
    mockPrisma.videoJob.findMany.mockResolvedValue([
      { chargedEgp: 35.75, billingMode: 'PLATFORM' },
      { chargedEgp: 64.35, billingMode: 'PLATFORM' },
      { chargedEgp: 0, billingMode: 'BYOK' },
    ]);
    const usage = await videoStudioService.getUsage({});
    expect(usage).toEqual({ totalJobs: 42, jobs30: 7, completed30: 3, platform30: 2, byok30: 1, revenueEgp: 100.1 });
  });

  it('scopes merchant usage by companyId', async () => {
    mockPrisma.videoJob.count.mockResolvedValue(3);
    mockPrisma.videoJob.findMany.mockResolvedValue([{ chargedEgp: 12, billingMode: 'PLATFORM' }]);
    const usage = await videoStudioService.getUsage({ companyId: 'c1' });
    expect(mockPrisma.videoJob.count).toHaveBeenCalledWith(expect.objectContaining({ where: { companyId: 'c1' } }));
    expect(usage.revenueEgp).toBe(12);
  });
});

describe('higgsfieldAdapter.ping', () => {
  const adapter = require('../../services/videoProviders/higgsfieldAdapter');
  const axios = require('axios');

  afterEach(() => jest.restoreAllMocks());

  it('classifies 404 as accepted (authenticated, resource missing)', async () => {
    jest.spyOn(axios, 'get').mockResolvedValue({ status: 404 });
    const res = await adapter.ping({ apiKey: 'id:secret' });
    expect(res.state).toBe('accepted');
  });

  it('classifies 401/403 as rejected', async () => {
    jest.spyOn(axios, 'get').mockResolvedValue({ status: 401 });
    const res = await adapter.ping({ apiKey: 'id:secret' });
    expect(res.state).toBe('rejected');
  });

  it('flags missing or malformed keys without a network call', async () => {
    const spy = jest.spyOn(axios, 'get');
    expect((await adapter.ping({ apiKey: null })).state).toBe('no_key');
    expect((await adapter.ping({ apiKey: 'no-colon-here' })).state).toBe('invalid_format');
    expect(spy).not.toHaveBeenCalled();
  });
});
