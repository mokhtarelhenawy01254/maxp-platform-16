const cashbackService = require('../../services/cashbackService');
const sharedDatabase = require('../../services/sharedDatabase');

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
}));

describe('cashbackService.reverseCashbackForOrder', () => {
  const companyId = 'company-1';
  const customerId = 'customer-1';
  const orderId = 'order-1';

  let prisma;

  beforeEach(() => {
    prisma = {
      order: { findFirst: jest.fn(), update: jest.fn() },
      customerWallet: { findFirst: jest.fn(), update: jest.fn() },
      walletTransaction: { create: jest.fn() },
    };
    sharedDatabase.getSharedPrismaClient.mockReturnValue(prisma);
    prisma.order.update.mockResolvedValue({});
  });

  it('reverses awarded cashback on cancel and prevents double reversal', async () => {
    prisma.order.findFirst.mockResolvedValue({
      id: orderId,
      companyId,
      customerId,
      total: 1000,
      orderNumber: 'ORD-5',
      metadata: JSON.stringify({
        cashback: { applied: true, amount: '100', base: 'total', percent: 10 },
      }),
    });
    prisma.customerWallet.findFirst.mockResolvedValue({
      id: 'wallet-1',
      customerId,
      companyId,
      balance: 150,
      totalSpent: 0,
      isActive: true,
    });
    prisma.customerWallet.update.mockResolvedValue({});
    prisma.walletTransaction.create.mockImplementation(async ({ data }) => ({ id: 'tx-1', ...data }));

    const first = await cashbackService.reverseCashbackForOrder({ orderId, companyId });
    expect(first.reversed).toBe(true);
    expect(first.amount).toBe(100);
    // balance reduced
    expect(prisma.customerWallet.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'wallet-1' } }),
    );
    const metaUpdate = JSON.parse(prisma.order.update.mock.calls[0][0].data.metadata);
    expect(metaUpdate.cashback.cancelledReversed).toBe(true);

    // second attempt blocked
    prisma.order.findFirst.mockResolvedValue({
      id: orderId,
      companyId,
      customerId,
      total: 1000,
      orderNumber: 'ORD-5',
      metadata: JSON.stringify(metaUpdate),
    });
    const second = await cashbackService.reverseCashbackForOrder({ orderId, companyId });
    expect(second.reversed).toBe(false);
    expect(second.reason).toBe('already_reversed');
  });

  it('no-ops when no cashback was applied', async () => {
    prisma.order.findFirst.mockResolvedValue({
      id: orderId,
      companyId,
      customerId,
      total: 1000,
      orderNumber: 'ORD-6',
      metadata: null,
    });
    const result = await cashbackService.reverseCashbackForOrder({ orderId, companyId });
    expect(result.reversed).toBe(false);
    expect(result.reason).toBe('no_cashback_on_order');
  });
});
