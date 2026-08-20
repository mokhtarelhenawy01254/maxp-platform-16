const WalletService = require('../../services/walletService');
const sharedDatabase = require('../../services/sharedDatabase');

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
}));

describe('WalletService.addToWallet auto-creates wallet', () => {
  const customerId = 'customer-1';
  const companyId = 'company-1';

  let prisma;

  beforeEach(() => {
    prisma = {
      customerWallet: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      customer: {
        findUnique: jest.fn(),
      },
      walletTransaction: {
        create: jest.fn(),
      },
    };
    sharedDatabase.getSharedPrismaClient.mockReturnValue(prisma);
  });

  test('creates a wallet when the customer has none, then credits it', async () => {
    prisma.customerWallet.findFirst.mockResolvedValueOnce(null);
    prisma.customer.findUnique.mockResolvedValue({ companyId });
    prisma.customerWallet.create.mockResolvedValue({
      id: 'wallet-1',
      customerId,
      companyId,
      balance: 0,
      totalEarned: 0,
      isActive: true,
    });
    prisma.customerWallet.update.mockResolvedValue({ id: 'wallet-1', balance: 50, totalEarned: 50 });
    prisma.walletTransaction.create.mockImplementation(async ({ data }) => ({ id: 'tx-1', ...data }));

    const result = await WalletService.addToWallet(customerId, 50, 'CASHBACK', 'test');

    expect(prisma.customerWallet.create).toHaveBeenCalledWith({
      customerId,
      companyId,
      balance: 0,
      totalEarned: 0,
      totalSpent: 0,
      currency: 'EGP',
      isActive: true,
    });
    expect(prisma.walletTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: 'CASHBACK', amount: 50 }),
      }),
    );
    expect(result.transaction.amount).toBe(50);
  });

  test('uses the existing wallet when present', async () => {
    prisma.customerWallet.findFirst.mockResolvedValueOnce({
      id: 'wallet-1',
      customerId,
      companyId,
      balance: 100,
      totalEarned: 100,
      isActive: true,
    });
    prisma.customerWallet.update.mockResolvedValue({ id: 'wallet-1', balance: 150, totalEarned: 150 });
    prisma.walletTransaction.create.mockImplementation(async ({ data }) => ({ id: 'tx-2', ...data }));

    await WalletService.addToWallet(customerId, 50, 'CREDIT', 'test');

    expect(prisma.customerWallet.create).not.toHaveBeenCalled();
    expect(prisma.customerWallet.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'wallet-1' },
        data: expect.objectContaining({ balance: 150 }),
      }),
    );
  });
});
