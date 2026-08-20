const loyaltyService = require('../../services/hr/customerLoyaltyService');
const sharedDatabase = require('../../services/sharedDatabase');

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
}));

describe('customerLoyaltyService.getPrograms cashback customersCount', () => {
  const companyId = 'company-1';

  const programFindMany = jest.fn();
  const walletGroupBy = jest.fn();
  const recordFindMany = jest.fn();

  const prisma = {
    customerLoyaltyProgram: { findMany: programFindMany },
    walletTransaction: { groupBy: walletGroupBy },
    customerLoyaltyRecord: { findMany: recordFindMany },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    sharedDatabase.getSharedPrismaClient.mockReturnValue(prisma);
    recordFindMany.mockResolvedValue([]);
  });

  test('CASHBACK program customersCount = distinct wallets with CASHBACK transactions', async () => {
    programFindMany.mockResolvedValue([
      { id: 'cb', companyId, type: 'CASHBACK', status: 'ACTIVE', _count: { customerLoyaltyRecords: 0 } },
    ]);
    walletGroupBy.mockResolvedValue([{ walletId: 'w1' }, { walletId: 'w2' }, { walletId: 'w3' }]);

    const result = await loyaltyService.getPrograms(companyId);

    expect(walletGroupBy).toHaveBeenCalledWith({
      by: ['walletId'],
      where: { type: 'CASHBACK', wallet: { companyId } },
    });
    expect(result[0].customersCount).toBe(3);
  });

  test('non-CASHBACK program keeps enrollment record count and skips wallet groupBy', async () => {
    programFindMany.mockResolvedValue([
      { id: 'pts', companyId, type: 'POINTS', status: 'ACTIVE', _count: { customerLoyaltyRecords: 42 } },
    ]);

    const result = await loyaltyService.getPrograms(companyId);

    expect(walletGroupBy).not.toHaveBeenCalled();
    expect(result[0].customersCount).toBe(42);
  });

  test('mixed programs: cashback uses wallet count, points uses records', async () => {
    programFindMany.mockResolvedValue([
      { id: 'cb', companyId, type: 'CASHBACK', status: 'ACTIVE', _count: { customerLoyaltyRecords: 0 } },
      { id: 'pts', companyId, type: 'POINTS', status: 'ACTIVE', _count: { customerLoyaltyRecords: 7 } },
    ]);
    walletGroupBy.mockResolvedValue([{ walletId: 'w1' }, { walletId: 'w2' }]);

    const result = await loyaltyService.getPrograms(companyId);
    const byId = Object.fromEntries(result.map(p => [p.id, p.customersCount]));
    expect(byId.cb).toBe(2);
    expect(byId.pts).toBe(7);
  });

  test('groupBy failure falls back to 0 instead of breaking the whole programs list', async () => {
    programFindMany.mockResolvedValue([
      { id: 'cb', companyId, type: 'CASHBACK', status: 'ACTIVE', _count: { customerLoyaltyRecords: 0 } },
    ]);
    walletGroupBy.mockRejectedValue(new Error('db down'));

    const result = await loyaltyService.getPrograms(companyId);

    expect(result[0].customersCount).toBe(0);
  });
});
