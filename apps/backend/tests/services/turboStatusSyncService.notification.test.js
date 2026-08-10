/**
 * Regression test: turbo auto-sync (webhook / sync-status / refresh) must route
 * order.status changes through orderService.updateOrderStatus / updateGuestOrderStatus
 * so WhatsApp notifications + statusHistory fire — exactly like the manual button.
 * See PRODUCTION-FIX (turbo-notification-gap) in turboStatusSyncService.js.
 */

const mockPrisma = {
  company: {
    findUnique: jest.fn(),
  },
  order: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  guestOrder: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: () => mockPrisma,
  safeQuery: async (fn) => fn(),
}));

jest.mock('../../services/orderService', () => ({
  updateOrderStatus: jest.fn(),
  updateGuestOrderStatus: jest.fn(),
}));

jest.mock('../../services/partialReturnService', () => ({
  ensureReturnOrder: jest.fn(),
}));

jest.mock('../../services/socketService', () => ({
  getIO: () => null,
}));

const { syncTurboStatusToOrder } = require('../../services/turboStatusSyncService');
const orderService = require('../../services/orderService');

// Swan-like custom mapping: turbo `processing` (code 3) → SHIPPED
const swanLikeSettings = JSON.stringify({
  turboStatusMapping: {
    processing: { orderStatus: 'SHIPPED' },
  },
});

const baseOrder = {
  id: 'order-1',
  orderNumber: 'ORD-100',
  companyId: 'company-1',
  status: 'PENDING',
  turboShipmentStatus: 'turbo_sent',
  turboMetadata: null,
  turboShipmentId: 'SHIP-1',
  turboTrackingNumber: 'SHIP-1',
  turboCaptainName: null,
  turboCaptainPhone: null,
  turboBranchName: null,
  turboBranchPhone: null,
  turboDelayReason: null,
  turboReturnReason: null,
  turboExpectedBranch: null,
};

describe('turboStatusSyncService auto status change → notification routing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.company.findUnique.mockResolvedValue({ settings: swanLikeSettings });
    mockPrisma.order.findFirst.mockResolvedValue({ ...baseOrder });
    mockPrisma.order.update.mockResolvedValue({ ...baseOrder, status: 'SHIPPED' });
  });

  test('routes a status change through orderService.updateOrderStatus (so WhatsApp + history fire)', async () => {
    await syncTurboStatusToOrder({
      orderId: 'order-1',
      orderNumber: 'ORD-100',
      companyId: 'company-1',
      rawStatus: '3', // turbo processing → custom mapping SHIPPED
      payload: { code: 'ORD-100', isWebhook: true, source: 'webhook' },
      isGuestOrder: false,
    });

    expect(orderService.updateOrderStatus).toHaveBeenCalledTimes(1);
    const [orderNumber, companyId, status, notes, userId, userName, existing, isOverride, options] =
      orderService.updateOrderStatus.mock.calls[0];
    expect(orderNumber).toBe('ORD-100');
    expect(companyId).toBe('company-1');
    expect(status).toBe('SHIPPED');
    expect(userId).toBe('SYSTEM');
    expect(isOverride).toBe(true);
    expect(options).toEqual({ skipCallAttemptGuard: true, skipTransitionValidation: true });
    expect(String(notes)).toContain('تربو');

    // Direct turbo-metadata update must still happen
    expect(mockPrisma.order.update).toHaveBeenCalledTimes(1);
    const updateData = mockPrisma.order.update.mock.calls[0][0].data;
    expect(updateData.turboShipmentStatus).toBe('processing');
    expect(updateData.status).toBe('SHIPPED');
  });

  test('does NOT call updateOrderStatus when the order status is already the target', async () => {
    mockPrisma.order.findFirst.mockResolvedValue({ ...baseOrder, status: 'SHIPPED' });

    await syncTurboStatusToOrder({
      orderId: 'order-1',
      orderNumber: 'ORD-100',
      companyId: 'company-1',
      rawStatus: '3',
      payload: { code: 'ORD-100', isWebhook: true, source: 'webhook' },
      isGuestOrder: false,
    });

    expect(orderService.updateOrderStatus).not.toHaveBeenCalled();
    expect(mockPrisma.order.update).toHaveBeenCalledTimes(1);
  });

  test('routes guest order status changes through updateGuestOrderStatus', async () => {
    mockPrisma.guestOrder.findFirst.mockResolvedValue({
      id: 'guest-1',
      orderNumber: 'GORD-200',
      companyId: 'company-1',
      status: 'PENDING',
      metadata: null,
      turboShipmentStatus: 'turbo_sent',
    });
    mockPrisma.guestOrder.update.mockResolvedValue({ id: 'guest-1', status: 'SHIPPED' });

    await syncTurboStatusToOrder({
      orderId: 'guest-1',
      orderNumber: 'GORD-200',
      companyId: 'company-1',
      rawStatus: '3',
      payload: { code: 'GORD-200', isWebhook: true, source: 'webhook' },
      isGuestOrder: true,
    });

    expect(orderService.updateGuestOrderStatus).toHaveBeenCalledTimes(1);
    const [orderNumber, companyId, status, , , , existing, options] =
      orderService.updateGuestOrderStatus.mock.calls[0];
    expect(orderNumber).toBe('GORD-200');
    expect(companyId).toBe('company-1');
    expect(status).toBe('SHIPPED');
    expect(options).toEqual({ skipCallAttemptGuard: true, skipTransitionValidation: true });
    expect(mockPrisma.guestOrder.update).toHaveBeenCalledTimes(1);
  });

  test('keeps working (does not throw) when orderService update fails — falls back to direct status write', async () => {
    orderService.updateOrderStatus.mockRejectedValue(new Error('transition blocked'));

    const result = await syncTurboStatusToOrder({
      orderId: 'order-1',
      orderNumber: 'ORD-100',
      companyId: 'company-1',
      rawStatus: '3',
      payload: { code: 'ORD-100', isWebhook: true, source: 'webhook' },
      isGuestOrder: false,
    });

    expect(result.success).toBe(true);
    // direct update still applied the status (previous behavior preserved)
    const updateData = mockPrisma.order.update.mock.calls[0][0].data;
    expect(updateData.status).toBe('SHIPPED');
  });
});
