jest.mock('../../services/analyticsService', () => ({}));

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn()
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const {
  getCancellationReasonSettings,
  updateCancellationReasonSettings,
} = require('../../controller/analyticsController');

const createResponse = () => {
  const response = {
    statusCode: 200,
    payload: null,
    status: jest.fn((code) => {
      response.statusCode = code;
      return response;
    }),
    json: jest.fn((payload) => {
      response.payload = payload;
      return response;
    }),
  };

  return response;
};

describe('analyticsController cancellation reason settings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns normalized preset reasons from settings', async () => {
    const prisma = {
      orderInvoiceSettings: {
        findUnique: jest.fn().mockResolvedValue({ id: 'settings-1' }),
      },
      $queryRawUnsafe: jest.fn().mockResolvedValue([
        {
          cancellationReasonOptions: JSON.stringify([
            'العميل طلب الإلغاء',
            '  الرقم غير صحيح  ',
            'العميل طلب الإلغاء',
          ]),
        },
      ]),
    };

    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await getCancellationReasonSettings(
      { user: { id: 'user-1', companyId: 'company-1' } },
      res,
    );

    expect(res.statusCode).toBe(200);
    expect(res.payload).toEqual({
      success: true,
      data: {
        reasonOptions: ['العميل طلب الإلغاء', 'الرقم غير صحيح'],
      },
    });
  });

  test('upserts normalized preset reasons', async () => {
    const prisma = {
      orderInvoiceSettings: {
        findUnique: jest.fn().mockResolvedValue({ id: 'settings-1' }),
      },
      $executeRawUnsafe: jest.fn().mockResolvedValue(1),
      $queryRawUnsafe: jest.fn().mockResolvedValue([
        {
          cancellationReasonOptions: JSON.stringify([
            'العميل طلب الإلغاء',
            'نفاد المخزون',
          ]),
        },
      ]),
    };

    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await updateCancellationReasonSettings(
      {
        user: { id: 'user-1', companyId: 'company-1' },
        body: {
          reasonOptions: [
            'العميل طلب الإلغاء',
            'نفاد المخزون',
            'العميل طلب الإلغاء',
            '  ',
          ],
        },
      },
      res,
    );

    expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith(
      'UPDATE "order_invoice_settings" SET "cancellationReasonOptions" = $2, "updatedAt" = NOW() WHERE "companyId" = $1',
      'company-1',
      JSON.stringify(['العميل طلب الإلغاء', 'نفاد المخزون']),
    );

    expect(res.statusCode).toBe(200);
    expect(res.payload).toEqual({
      success: true,
      message: 'تم حفظ أسباب الإلغاء الجاهزة',
      data: {
        reasonOptions: ['العميل طلب الإلغاء', 'نفاد المخزون'],
      },
    });
  });
});
