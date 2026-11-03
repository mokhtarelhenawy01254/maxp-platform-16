const mockSharedPrisma = {
  order: {
    findFirst: jest.fn(),
    update: jest.fn()
  },
  guestOrder: {
    findFirst: jest.fn(),
    update: jest.fn()
  },
  orderStatusConfig: {
    findFirst: jest.fn().mockResolvedValue(null)
  }
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => mockSharedPrisma)
}));

jest.mock('../../services/whatsapp/WhatsAppNotificationService', () => ({
  isDuplicateNotification: jest.fn().mockResolvedValue(null),
  sendOrderStatusNotification: jest.fn().mockResolvedValue({ success: true })
}));

const mockAutoCreateTurboShipmentForOrder = jest.fn().mockResolvedValue({ success: true });
const mockAutoCreateTurboShipmentForGuestOrder = jest.fn().mockResolvedValue({ success: true });

jest.mock('../../services/orderService', () => ({
  autoCreateTurboShipmentForOrder: mockAutoCreateTurboShipmentForOrder,
  autoCreateTurboShipmentForGuestOrder: mockAutoCreateTurboShipmentForGuestOrder
}));

const { updatePreparationOrderStatus } = require('../../services/preparationQueueService');

describe('preparationQueueService -> Auto Shipment on Hold Release', () => {
  const companyId = 'comp_test_123';

  beforeEach(() => {
    jest.clearAllMocks();
    mockSharedPrisma.orderStatusConfig.findFirst.mockResolvedValue(null);
  });

  test('1. Releases ON_HOLD_PREP to PENDING_PREPARATION without existing tracking code -> triggers autoCreateTurboShipmentForOrder', async () => {
    const existingOrder = {
      id: 'ord_held_1',
      orderNumber: 'ORD-HELD-001',
      companyId,
      status: 'ON_HOLD_PREP',
      turboTrackingNumber: null,
      turboShipmentId: null,
      customerPhone: '01012345678',
      metadata: JSON.stringify({ preparationStatus: 'ON_HOLD_PREP' })
    };

    mockSharedPrisma.order.findFirst.mockResolvedValue(existingOrder);
    mockSharedPrisma.order.update.mockResolvedValue({
      ...existingOrder,
      status: 'CONFIRMED',
      metadata: JSON.stringify({ preparationStatus: 'PENDING_PREPARATION' })
    });

    await updatePreparationOrderStatus({
      orderIdentifier: 'ORD-HELD-001',
      companyId,
      status: 'PENDING_PREPARATION',
      userId: 'user_1',
      userName: 'Admin'
    });

    // Wait for setImmediate to fire
    await new Promise(resolve => setImmediate(resolve));

    expect(mockAutoCreateTurboShipmentForOrder).toHaveBeenCalledTimes(1);
    expect(mockAutoCreateTurboShipmentForOrder).toHaveBeenCalledWith('ord_held_1', companyId);
  });

  test('1b. Releases ON_HOLD_PREP directly to PREPARING with isOverride=true -> triggers autoCreateTurboShipmentForOrder', async () => {
    const existingOrder = {
      id: 'ord_held_override',
      orderNumber: 'ORD-HELD-002',
      companyId,
      status: 'ON_HOLD_PREP',
      turboTrackingNumber: null,
      turboShipmentId: null,
      customerPhone: '01012345678',
      metadata: JSON.stringify({ preparationStatus: 'ON_HOLD_PREP' })
    };

    mockSharedPrisma.order.findFirst.mockResolvedValue(existingOrder);
    mockSharedPrisma.order.update.mockResolvedValue({
      ...existingOrder,
      status: 'PROCESSING',
      metadata: JSON.stringify({ preparationStatus: 'PREPARING' })
    });

    await updatePreparationOrderStatus({
      orderIdentifier: 'ORD-HELD-002',
      companyId,
      status: 'PREPARING',
      isOverride: true,
      userId: 'user_1',
      userName: 'Admin'
    });

    await new Promise(resolve => setImmediate(resolve));

    expect(mockAutoCreateTurboShipmentForOrder).toHaveBeenCalledTimes(1);
    expect(mockAutoCreateTurboShipmentForOrder).toHaveBeenCalledWith('ord_held_override', companyId);
  });

  test('2. Releases STOCK_SHORTAGE to PREPARING without existing tracking code -> triggers autoCreateTurboShipmentForOrder', async () => {
    const existingOrder = {
      id: 'ord_shortage_1',
      orderNumber: 'ORD-SHORT-001',
      companyId,
      status: 'STOCK_SHORTAGE',
      turboTrackingNumber: null,
      turboShipmentId: null,
      customerPhone: '01012345678',
      metadata: JSON.stringify({ preparationStatus: 'STOCK_SHORTAGE' })
    };

    mockSharedPrisma.order.findFirst.mockResolvedValue(existingOrder);
    mockSharedPrisma.order.update.mockResolvedValue({
      ...existingOrder,
      status: 'PROCESSING',
      metadata: JSON.stringify({ preparationStatus: 'PREPARING' })
    });

    await updatePreparationOrderStatus({
      orderIdentifier: 'ORD-SHORT-001',
      companyId,
      status: 'PREPARING',
      userId: 'user_1',
      userName: 'Admin'
    });

    await new Promise(resolve => setImmediate(resolve));

    expect(mockAutoCreateTurboShipmentForOrder).toHaveBeenCalledTimes(1);
    expect(mockAutoCreateTurboShipmentForOrder).toHaveBeenCalledWith('ord_shortage_1', companyId);
  });

  test('3. Releases ON_HOLD_PREP but order ALREADY has tracking code -> does NOT call autoCreateTurboShipmentForOrder', async () => {
    const existingOrder = {
      id: 'ord_with_code',
      orderNumber: 'ORD-WITH-CODE-001',
      companyId,
      status: 'ON_HOLD_PREP',
      turboTrackingNumber: 'TRK-ALREADY-EXISTS',
      turboShipmentId: 'TURBO-SHP-EXISTS',
      customerPhone: '01012345678',
      metadata: JSON.stringify({ preparationStatus: 'ON_HOLD_PREP' })
    };

    mockSharedPrisma.order.findFirst.mockResolvedValue(existingOrder);
    mockSharedPrisma.order.update.mockResolvedValue({
      ...existingOrder,
      status: 'PROCESSING',
      metadata: JSON.stringify({ preparationStatus: 'PREPARING' })
    });

    await updatePreparationOrderStatus({
      orderIdentifier: 'ORD-WITH-CODE-001',
      companyId,
      status: 'PREPARING',
      isOverride: true,
      userId: 'user_1',
      userName: 'Admin'
    });

    await new Promise(resolve => setImmediate(resolve));

    expect(mockAutoCreateTurboShipmentForOrder).not.toHaveBeenCalled();
  });

  test('4. Transitions from ON_HOLD_PREP to STOCK_SHORTAGE (still a hold stage) -> does NOT call autoCreateTurboShipmentForOrder', async () => {
    const existingOrder = {
      id: 'ord_still_held',
      orderNumber: 'ORD-STILL-HELD-001',
      companyId,
      status: 'ON_HOLD_PREP',
      turboTrackingNumber: null,
      turboShipmentId: null,
      customerPhone: '01012345678',
      metadata: JSON.stringify({ preparationStatus: 'ON_HOLD_PREP' })
    };

    mockSharedPrisma.order.findFirst.mockResolvedValue(existingOrder);
    mockSharedPrisma.order.update.mockResolvedValue({
      ...existingOrder,
      status: 'STOCK_SHORTAGE',
      metadata: JSON.stringify({ preparationStatus: 'STOCK_SHORTAGE' })
    });

    await updatePreparationOrderStatus({
      orderIdentifier: 'ORD-STILL-HELD-001',
      companyId,
      status: 'STOCK_SHORTAGE',
      notes: 'عجز في المخزون',
      userId: 'user_1',
      userName: 'Admin',
      isOverride: true
    });

    await new Promise(resolve => setImmediate(resolve));

    expect(mockAutoCreateTurboShipmentForOrder).not.toHaveBeenCalled();
  });
});
