const mockPrisma = {
  order: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  guestOrder: {
    findFirst: jest.fn(),
    updateMany: jest.fn(),
  },
  company: {
    findUnique: jest.fn(),
  },
  shippingCompany: {
    findFirst: jest.fn(),
  },
  shipment: {
    findFirst: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({ id: 'ship-1' }),
    update: jest.fn().mockResolvedValue({ id: 'ship-1' }),
  },
};

const mockCreateShipment = jest.fn();
const mockFormatOrderForTurbo = jest.fn();

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
  safeQuery: jest.fn(async (operation) => operation()),
}));

jest.mock('../../services/turboService', () => {
  return jest.fn().mockImplementation(() => ({
    createShipment: (...args) => mockCreateShipment(...args),
    formatOrderForTurbo: (...args) => mockFormatOrderForTurbo(...args),
    translateTurboErrorToArabic: (msg) => msg,
  }));
});

jest.mock('../../services/orderService', () => ({
  updateOrderStatus: jest.fn(),
  updateGuestOrderStatus: jest.fn(),
  checkDuplicateActiveTurboShipment: jest.fn().mockResolvedValue(null),
}));

jest.mock('../../utils/turbo/shipmentValidator', () => ({
  validateOrderForTurbo: jest.fn(() => ({ isValid: true })),
}));

const turboController = require('../../controller/turboController');

function createMockResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe('turboController.createShipment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('reverts held order to CONFIRMED and PENDING_PREPARATION when resending to Turbo', async () => {
    mockPrisma.company.findUnique
      .mockResolvedValueOnce({
        id: 'company-swan',
        turboApiKey: 'swan-api-key',
        turboEnabled: true,
      })
      .mockResolvedValueOnce({
        id: 'company-swan',
        settings: JSON.stringify({
          turboAutomationEnabled: true,
          turboAutomationStatus: 'PROCESSING',
        }),
      });

    const mockOrder = {
      id: 'ord-swan-1',
      orderNumber: 'ORD-SWAN-1',
      companyId: 'company-swan',
      status: 'ON_HOLD_PREP',
      metadata: JSON.stringify({
        preparationStatus: 'ON_HOLD_PREP',
        preparationHold: { state: 'held', reason: 'مشكلة في التجهيز' },
      }),
      company: {
        id: 'company-swan',
        turboApiKey: 'swan-api-key',
        turboEnabled: true,
      },
      customer: { firstName: 'Swan Customer', phone: '01099999999' },
      customerAddress: 'القاهرة - مصر الجديدة',
      governorate: 'القاهرة',
      orderItems: [{ productName: 'فستان سواريه', quantity: 1, price: 1200, total: 1200 }],
      turboShipmentId: null,
      turboMetadata: null,
    };

    mockPrisma.order.findFirst.mockResolvedValue(mockOrder);
    mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
    mockPrisma.order.updateMany.mockResolvedValue({ count: 1 });

    mockFormatOrderForTurbo.mockReturnValue({
      orderId: 'ord-swan-1',
      orderNumber: 'ORD-SWAN-1',
    });

    mockCreateShipment.mockResolvedValue({
      shipmentId: 'TURBO-SWAN-1',
      trackingNumber: '38199999',
      status: 'created',
      labelUrl: 'https://label.turbo/swan1',
      data: { id: 'TURBO-SWAN-1' },
    });

    const req = {
      user: { companyId: 'company-swan', name: 'Swan Admin' },
      params: { orderId: 'ord-swan-1' },
      body: {},
    };
    const res = createMockResponse();

    await turboController.createShipment(req, res);

    expect(mockPrisma.order.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { orderNumber: 'ORD-SWAN-1', companyId: 'company-swan' },
        data: expect.objectContaining({
          status: 'CONFIRMED',
          turboShipmentId: 'TURBO-SWAN-1',
          turboTrackingNumber: '38199999',
        }),
      })
    );

    const updateCall = mockPrisma.order.updateMany.mock.calls[0][0];
    const savedMeta = JSON.parse(updateCall.data.metadata);
    expect(savedMeta.preparationStatus).toBe('PENDING_PREPARATION');
    expect(savedMeta.preparationHold.state).toBe('released');

    const orderService = require('../../services/orderService');
    expect(orderService.updateOrderStatus).not.toHaveBeenCalled();

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          shipmentId: 'TURBO-SWAN-1',
          trackingNumber: '38199999',
          orderStatus: 'CONFIRMED',
          metadata: expect.objectContaining({
            preparationStatus: 'PENDING_PREPARATION',
            preparationHold: expect.objectContaining({
              state: 'released',
            }),
          }),
        }),
      })
    );
  });
});
