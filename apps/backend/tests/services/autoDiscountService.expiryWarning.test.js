const autoDiscountService = require('../../services/autoDiscountService');
const sharedDatabase = require('../../services/sharedDatabase');

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
}));

jest.mock('../../services/hr/customerNotificationScheduleService', () => ({
  sendCustomerNotification: jest.fn(async () => ({ success: true })),
}));

jest.mock('../../services/walletService', () => ({
  addCashbackWithTx: jest.fn(async () => ({ transaction: { id: 'tx-1' } })),
}));

describe('autoDiscountService ΓÇö expiry warnings & notification hooks', () => {
  let prisma;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = {
      customerLoyaltyVoucher: {
        findMany: jest.fn(),
        update: jest.fn(async ({ data }) => ({ id: 'v-1', ...data })),
      },
      customer: {
        findUnique: jest.fn(async () => ({ id: 'c-1', phone: '01000000000', firstName: 'Ahmed', lastName: '' })),
      },
    };
    sharedDatabase.getSharedPrismaClient.mockReturnValue(prisma);
  });

  test('sendExpiryWarnings ┘è╪▒╪│┘ä ╪¬┘å╪¿┘è┘ç ╪º┘å╪¬┘ç╪º╪í ╪º┘ä╪╡┘ä╪º╪¡┘è╪⌐ ┘ê┘è╪╣┘ä┘æ┘à ╪º┘ä┘â┘ê╪¿┘ê┘å ╪ú┘å┘ç ╪ú┘Å┘å╪░╪▒', async () => {
    prisma.customerLoyaltyVoucher.findMany.mockResolvedValue([
      {
        id: 'v-1',
        companyId: 'company-1',
        customerId: 'c-1',
        percent: 10,
        amount: 50,
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
        orderNumber: 'ORD-1',
        lastExpiryWarnedAt: null,
      },
    ]);

    const { sendCustomerNotification } = require('../../services/hr/customerNotificationScheduleService');
    const result = await autoDiscountService.sendExpiryWarnings({ hoursBefore: 24 });

    expect(result).toEqual({ warned: 1 });
    expect(sendCustomerNotification).toHaveBeenCalledTimes(1);
    const callArgs = sendCustomerNotification.mock.calls[0][0];
    expect(callArgs.eventType).toBe('AUTO_DISCOUNT_COUPON_EXPIRING');
    expect(callArgs.variables).toEqual(expect.objectContaining({
      discountPercent: '10',
      voucherAmount: '50.00',
      expiryDate: expect.any(String),
      orderNumber: 'ORD-1',
    }));
    expect(prisma.customerLoyaltyVoucher.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'v-1' }, data: { lastExpiryWarnedAt: expect.any(Date) } }),
    );
  });

  test('sendExpiryWarnings ┘ä╪º ┘è╪▒╪│┘ä ┘ä┘ä┘â┘ê╪¿┘ê┘å╪º╪¬ ╪º┘ä╪¬┘è ╪│╪¿┘é ╪Ñ┘å╪░╪º╪▒┘ç╪º', async () => {
    // ┘à╪¡╪º┘â╪º╪⌐ ╪º┘ä┘Ç where: ╪º┘ä┘â┘ê╪¿┘ê┘å ╪º┘ä┘à┘Å┘å╪░╪▒ (lastExpiryWarnedAt ╪║┘è╪▒ null) ┘ä╪º ┘è╪╕┘ç╪▒ ┘ü┘è ╪º┘ä┘å╪¬╪º╪ª╪¼
    prisma.customerLoyaltyVoucher.findMany.mockImplementation(({ where }) => {
      if (where.lastExpiryWarnedAt === null) return Promise.resolve([]);
      return Promise.resolve([]);
    });

    const { sendCustomerNotification } = require('../../services/hr/customerNotificationScheduleService');
    const result = await autoDiscountService.sendExpiryWarnings({ hoursBefore: 24 });

    expect(result).toEqual({ warned: 0 });
    expect(sendCustomerNotification).not.toHaveBeenCalled();
  });
});
