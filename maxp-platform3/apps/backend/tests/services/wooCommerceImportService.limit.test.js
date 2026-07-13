const mockEnsureWithinPlanLimit = jest.fn();
const mockCreateLimitExceededError = jest.fn();

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
}));

jest.mock('../../services/wooCommerceStatusService', () => ({
  mapWooStatusToLocal: jest.fn(() => 'PENDING'),
  cleanLocationName: jest.fn((value) => value || null),
}));

jest.mock('../../utils/planLimitPayloads', () => ({
  ensureWithinPlanLimit: (...args) => mockEnsureWithinPlanLimit(...args),
  createLimitExceededError: (...args) => mockCreateLimitExceededError(...args),
}));

const { importSingleOrder } = require('../../services/wooCommerceImportService');

describe('wooCommerceImportService plan limit enforcement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('throws a limit error before importing a new WooCommerce order when monthly order limit is reached', async () => {
    const payload = {
      success: false,
      error: 'LIMIT_EXCEEDED',
      message: 'تم تجاوز حد الطلبات المسموح به في خطتك الحالية',
    };
    const limitError = new Error(payload.message);
    limitError.statusCode = 400;
    limitError.payload = payload;

    mockEnsureWithinPlanLimit.mockResolvedValue({
      allowed: false,
      payload,
    });
    mockCreateLimitExceededError.mockReturnValue(limitError);

    const prisma = {
      order: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
      },
      customer: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'customer-1' }),
      },
      orderItem: {
        create: jest.fn(),
      },
      productVariant: {
        findFirst: jest.fn(),
      },
      product: {
        findFirst: jest.fn(),
      },
    };

    await expect(
      importSingleOrder(prisma, 'company-1', {
        id: 'woo-1',
        total: '150',
        shipping_total: '0',
        status: 'processing',
        billing: {
          first_name: 'Test',
          last_name: 'Customer',
          email: 'test@example.com',
          phone: '01000000000',
        },
        line_items: [],
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      payload: expect.objectContaining({
        error: 'LIMIT_EXCEEDED',
      }),
    });

    expect(mockEnsureWithinPlanLimit).toHaveBeenCalledWith('company-1', 'orders', 1);
    expect(mockCreateLimitExceededError).toHaveBeenCalledWith(payload);
    expect(prisma.order.create).not.toHaveBeenCalled();
  });
});
