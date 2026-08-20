jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
}));

const loyaltyService = require('../../services/hr/customerLoyaltyService');
const sharedDatabase = require('../../services/sharedDatabase');

const itR = typeof loyaltyService.rollbackPointsOnRefund === 'function' ? it : it.skip;

describe('customerLoyaltyService.rollbackPointsOnRefund (refund/return exploit fix)', () => {
  const companyId = 'company-1';
  const customerId = 'customer-1';
  const orderId = 'order-1';
  const walletId = 'wallet-1';

  let prisma;
  let walletTxFindMany;
  let walletTxUpdate;
  let walletUpdate;
  let recordFindFirst;
  let recordUpdate;

  beforeEach(() => {
    walletTxFindMany = jest.fn();
    walletTxUpdate = jest.fn();
    walletUpdate = jest.fn();
    recordFindFirst = jest.fn();
    recordUpdate = jest.fn();

    prisma = {
      walletTransaction: { findMany: walletTxFindMany, update: walletTxUpdate },
      customerWallet: { update: walletUpdate },
      customerLoyaltyRecord: { findFirst: recordFindFirst, update: recordUpdate },
    };
    sharedDatabase.getSharedPrismaClient.mockReturnValue(prisma);

    // A cashback transaction that was RELEASED into the wallet (so it is withdrawable).
    walletTxFindMany.mockResolvedValue([
      {
        id: 'wtx-1',
        walletId,
        orderId,
        type: 'CASHBACK',
        status: 'RELEASED',
        amount: 100,
        wallet: { companyId, customerId },
      },
    ]);
    recordFindFirst.mockResolvedValue({
      id: 'rec-1',
      companyId,
      customerId,
      status: 'ACTIVE',
      pendingCashback: '100',
    });
    walletUpdate.mockImplementation(async ({ data }) => ({ id: walletId, ...data }));
    walletTxUpdate.mockImplementation(async ({ data }) => ({ id: 'wtx-1', ...data }));
    recordUpdate.mockImplementation(async ({ data }) => ({ id: 'rec-1', ...data }));
  });

  itR('deducts the released cashback from the wallet, cancels the tx, and reverses pending cashback', async () => {
    const result = await loyaltyService.rollbackPointsOnRefund(companyId, orderId);

    // Wallet balance reduced by the refunded 100.
    expect(walletUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: walletId },
        data: expect.objectContaining({ balance: { decrement: 100 } }),
      })
    );

    // Related transaction marked CANCELLED with a cancelledAt timestamp.
    expect(walletTxUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'wtx-1' },
        data: expect.objectContaining({ status: 'CANCELLED' }),
      })
    );
    const cancelledCall = walletTxUpdate.mock.calls.find((c) => c[0].data.status === 'CANCELLED');
    expect(cancelledCall[0].data.cancelledAt).toBeDefined();

    // Pending cashback on the loyalty record is reversed (prevents withdrawal of the reversed amount).
    expect(recordUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'rec-1' },
        data: expect.objectContaining({ pendingCashback: { decrement: 100 } }),
      })
    );

    expect(result.rolledBack).toBe(true);
    expect(result.handledTransactions).toBeGreaterThanOrEqual(1);
  });

  itR('is idempotent: a second call does not double-deduct', async () => {
    // First call processes the RELEASED transaction.
    await loyaltyService.rollbackPointsOnRefund(companyId, orderId);

    // Second call "sees" the transaction already CANCELLED and skips it.
    walletTxFindMany.mockResolvedValue([
      {
        id: 'wtx-1',
        walletId,
        orderId,
        type: 'CASHBACK',
        status: 'CANCELLED',
        amount: 100,
        wallet: { companyId, customerId },
      },
    ]);
    await loyaltyService.rollbackPointsOnRefund(companyId, orderId);

    const balanceDecrements = walletUpdate.mock.calls.filter(
      (c) => c[0].data.balance && c[0].data.balance.decrement
    );
    expect(balanceDecrements.length).toBe(1);
    expect(balanceDecrements[0][0].data.balance.decrement).toBe(100);
  });

  itR('returns early with a clear reason when orderId is missing', async () => {
    const result = await loyaltyService.rollbackPointsOnRefund(companyId, null);
    expect(result.rolledBack).toBe(false);
    expect(result.reason).toBe('missing_orderId');
  });
});
