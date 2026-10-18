const mockPrisma = {
  order: {
    findMany: jest.fn(),
    updateMany: jest.fn(),
    update: jest.fn(),
  },
  guestOrder: {
    findMany: jest.fn(),
    updateMany: jest.fn(),
  },
  company: {
    findUnique: jest.fn(),
  },
  shippingCompany: {
    findFirst: jest.fn(),
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

const turboController = require('../../controller/turboController');

function createMockResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe('turboController.bulkCreateShipments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('creates shipments in bulk for both regular orders and guest orders', async () => {
    mockPrisma.company.findUnique.mockResolvedValue({
      id: 'company-1',
      turboApiKey: 'valid-api-key',
      turboEnabled: true,
      settings: JSON.stringify({
        turboAutomationEnabled: true,
        turboAutomationStatus: 'READY_TO_SHIP',
      }),
    });

    // 1 regular order found
    mockPrisma.order.findMany.mockResolvedValue([
      {
        id: 'ord-reg-1',
        orderNumber: 'ORD-REG-1',
        companyId: 'company-1',
        turboShipmentId: null,
        status: 'CONFIRMED',
        customer: { firstName: 'Ahmed', phone: '01011111111' },
        orderItems: [],
        turboMetadata: null,
      },
    ]);

    // 1 guest order found
    mockPrisma.guestOrder.findMany.mockResolvedValue([
      {
        id: 'gst-1',
        orderNumber: 'GST-1',
        companyId: 'company-1',
        turboShipmentId: null,
        status: 'PENDING',
        guestName: 'Mona Guest',
        guestPhone: '01022222222',
        shippingAddress: JSON.stringify({ city: 'Cairo', address: 'Street 1' }),
        items: JSON.stringify([]),
        turboMetadata: null,
      },
    ]);

    mockFormatOrderForTurbo.mockImplementation((order) => ({
      orderId: order.id,
      orderNumber: order.orderNumber,
    }));

    mockCreateShipment
      .mockResolvedValueOnce({
        shipmentId: 'TURBO-REG-1',
        trackingNumber: '38120001',
        status: 'created',
        labelUrl: 'https://label.turbo/1',
        data: { id: 'TURBO-REG-1' },
      })
      .mockResolvedValueOnce({
        shipmentId: 'TURBO-GST-1',
        trackingNumber: '38120002',
        status: 'created',
        labelUrl: 'https://label.turbo/2',
        data: { id: 'TURBO-GST-1' },
      });

    mockPrisma.order.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.guestOrder.updateMany.mockResolvedValue({ count: 1 });

    const req = {
      user: { companyId: 'company-1' },
      body: { orderIds: ['ORD-REG-1', 'GST-1'] },
    };
    const res = createMockResponse();

    await turboController.bulkCreateShipments(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          total: 2,
          success: 2,
          failed: 0,
        }),
      })
    );

    expect(mockPrisma.order.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { orderNumber: 'ORD-REG-1', companyId: 'company-1' },
        data: expect.objectContaining({
          turboShipmentId: 'TURBO-REG-1',
          turboTrackingNumber: '38120001',
        }),
      })
    );

    expect(mockPrisma.guestOrder.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { orderNumber: 'GST-1', companyId: 'company-1' },
        data: expect.objectContaining({
          turboShipmentId: 'TURBO-GST-1',
          turboTrackingNumber: '38120002',
        }),
      })
    );
  });
});
