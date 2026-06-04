const mockPrisma = {
  order: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    updateMany: jest.fn(),
    update: jest.fn(),
  },
  guestOrder: {
    findFirst: jest.fn(),
    updateMany: jest.fn(),
  },
  company: {
    findUnique: jest.fn(),
  },
};

const mockCancelShipment = jest.fn();

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
  safeQuery: jest.fn(async (operation) => operation()),
}));

jest.mock('../../services/turboService', () => {
  return jest.fn().mockImplementation(() => ({
    cancelShipment: (...args) => mockCancelShipment(...args),
  }));
});

const turboController = require('../../controller/turboController');

function createMockResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe('turboController.cancelShipment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('cancels guest-order shipments using tracking fallback keys and updates the guest order record', async () => {
    mockPrisma.order.findFirst.mockResolvedValue(null);
    mockPrisma.order.findUnique.mockResolvedValue(null);
    mockPrisma.guestOrder.findFirst.mockResolvedValue({
      id: 'guest-order-1',
      orderNumber: 'ORD-941086-907',
      companyId: 'company-1',
      guestName: 'Guest Customer',
      guestPhone: '01000000000',
      guestEmail: null,
      shippingAddress: JSON.stringify({ address: 'Street 1', city: 'Cairo' }),
      items: JSON.stringify([]),
      finalTotal: 100,
      total: 100,
      shippingCost: 0,
      paymentMethod: 'CASH',
      notes: '',
      turboShipmentId: 'CODE-123',
      turboTrackingNumber: 'BAR-999',
      turboShipmentStatus: 'created',
      turboLabelUrl: null,
      turboMetadata: JSON.stringify({
        code: 'CODE-123',
        bar_code: 'BAR-999',
      }),
    });
    mockPrisma.company.findUnique.mockResolvedValue({
      id: 'company-1',
      turboApiKey: 'api-key',
      turboEnabled: true,
      turboAutoCreate: true,
    });
    mockPrisma.guestOrder.updateMany.mockResolvedValue({ count: 1 });
    mockCancelShipment.mockResolvedValue({
      success: true,
      data: {
        success: 1,
        message: 'Cancelled successfully',
      },
    });

    const req = {
      params: {
        orderId: 'ORD-941086-907',
      },
      body: {},
      user: {
        companyId: 'company-1',
      },
    };
    const res = createMockResponse();

    await turboController.cancelShipment(req, res);

    expect(mockCancelShipment).toHaveBeenCalledWith(['BAR-999', 'CODE-123', 'ORD-941086-907'], undefined);
    expect(mockPrisma.guestOrder.updateMany).toHaveBeenCalledWith({
      where: {
        orderNumber: 'ORD-941086-907',
        companyId: 'company-1',
      },
      data: {
        turboShipmentStatus: 'cancelled',
        turboMetadata: JSON.stringify({
          success: 1,
          message: 'Cancelled successfully',
        }),
      },
    });
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        success: true,
        data: {
          success: 1,
          message: 'Cancelled successfully',
        },
      },
    });
  });
});

describe('turboController.unlinkShipment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('clears Turbo fields from a regular order without calling Turbo API', async () => {
    mockPrisma.order.findFirst.mockResolvedValue(null);
    mockPrisma.guestOrder.findFirst.mockResolvedValue(null);
    mockPrisma.order.findUnique.mockResolvedValue({
      id: 'order-1',
      orderNumber: 'ORD-100',
      companyId: 'company-1',
      turboShipmentId: 'CODE-100',
      turboTrackingNumber: 'BAR-100',
      turboShipmentStatus: 'created',
      turboLabelUrl: 'https://turbo.example/label.pdf',
      turboMetadata: JSON.stringify({ code: 'CODE-100' }),
      turboBranchId: 'branch-1',
      company: {
        id: 'company-1',
        turboApiKey: 'api-key',
        turboEnabled: true,
        turboAutoCreate: true,
      },
    });
    mockPrisma.order.updateMany.mockResolvedValue({ count: 1 });

    const req = {
      params: {
        orderId: 'order-1',
      },
      user: {
        companyId: 'company-1',
      },
    };
    const res = createMockResponse();

    await turboController.unlinkShipment(req, res);

    expect(mockCancelShipment).not.toHaveBeenCalled();
    expect(mockPrisma.order.updateMany).toHaveBeenCalledWith({
      where: {
        orderNumber: 'ORD-100',
        companyId: 'company-1',
      },
      data: {
        turboShipmentId: null,
        turboTrackingNumber: null,
        turboShipmentStatus: null,
        turboLabelUrl: null,
        turboMetadata: null,
        turboBranchId: null,
      },
    });
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'تم إلغاء ربط Turbo من الطلب بنجاح',
      data: {
        orderId: 'order-1',
        orderNumber: 'ORD-100',
        turboShipmentId: null,
        turboTrackingNumber: null,
        turboShipmentStatus: null,
        turboLabelUrl: null,
        turboMetadata: null,
        turboBranchId: null,
      },
    });
  });

  test('clears Turbo fields from a guest order without Order-only fields', async () => {
    mockPrisma.order.findFirst.mockResolvedValue(null);
    mockPrisma.order.findUnique.mockResolvedValue(null);
    mockPrisma.guestOrder.findFirst.mockResolvedValue({
      id: 'guest-order-2',
      orderNumber: 'ORD-200',
      companyId: 'company-1',
      guestName: 'Guest Customer',
      guestPhone: '01000000000',
      guestEmail: null,
      shippingAddress: JSON.stringify({ address: 'Street 1', city: 'Cairo' }),
      items: JSON.stringify([]),
      finalTotal: 100,
      total: 100,
      shippingCost: 0,
      paymentMethod: 'CASH',
      notes: '',
      turboShipmentId: 'CODE-200',
      turboTrackingNumber: 'BAR-200',
      turboShipmentStatus: 'created',
      turboLabelUrl: 'https://turbo.example/guest-label.pdf',
      turboMetadata: JSON.stringify({ code: 'CODE-200' }),
    });
    mockPrisma.company.findUnique.mockResolvedValue({
      id: 'company-1',
      turboApiKey: 'api-key',
      turboEnabled: true,
      turboAutoCreate: true,
    });
    mockPrisma.guestOrder.updateMany.mockResolvedValue({ count: 1 });

    const req = {
      params: {
        orderId: 'ORD-200',
      },
      user: {
        companyId: 'company-1',
      },
    };
    const res = createMockResponse();

    await turboController.unlinkShipment(req, res);

    expect(mockCancelShipment).not.toHaveBeenCalled();
    expect(mockPrisma.guestOrder.updateMany).toHaveBeenCalledWith({
      where: {
        orderNumber: 'ORD-200',
        companyId: 'company-1',
      },
      data: {
        turboShipmentId: null,
        turboTrackingNumber: null,
        turboShipmentStatus: null,
        turboLabelUrl: null,
        turboMetadata: null,
      },
    });
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'تم إلغاء ربط Turbo من الطلب بنجاح',
      data: {
        orderId: 'guest-order-2',
        orderNumber: 'ORD-200',
        turboShipmentId: null,
        turboTrackingNumber: null,
        turboShipmentStatus: null,
        turboLabelUrl: null,
        turboMetadata: null,
        turboBranchId: null,
      },
    });
  });
});
