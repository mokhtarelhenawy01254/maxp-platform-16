const orderService = require('../../services/orderService');
const TurboService = require('../../services/turboService');

jest.mock('../../services/turboService');

describe('OrderService - Turbo Auto-Shipment Creation & Idempotency', () => {
  let mockPrisma;
  let mockTurboInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    mockTurboInstance = {
      formatOrderForTurbo: jest.fn().mockReturnValue({ orderNumber: 'ORD-123' }),
      createShipment: jest.fn().mockResolvedValue({
        success: true,
        shipmentId: 'TURBO-SHP-001',
        trackingNumber: 'TRK-998877',
        status: 'created',
        labelUrl: 'https://turbo-eg.com/label/001',
        data: { code: 'TURBO-SHP-001', bar_code: 'TRK-998877' }
      })
    };
    TurboService.mockImplementation(() => mockTurboInstance);

    mockPrisma = {
      order: {
        findFirst: jest.fn(),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'ord_1', ...data })),
        updateMany: jest.fn().mockResolvedValue({ count: 1 })
      },
      guestOrder: {
        findFirst: jest.fn(),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'guest_1', ...data })),
        updateMany: jest.fn().mockResolvedValue({ count: 1 })
      },
      shippingCompany: {
        findFirst: jest.fn().mockResolvedValue(null)
      },
      company: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'comp_1',
          turboEnabled: true,
          turboAutoCreate: true,
          turboApiKey: 'test-api-key'
        })
      }
    };

    jest.spyOn(orderService, 'getPrisma').mockReturnValue(mockPrisma);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('autoCreateTurboShipmentForOrder', () => {
    test('1. Idempotency: skips when order already has turboShipmentId', async () => {
      const order = {
        id: 'ord_1',
        orderNumber: 'ORD-123',
        companyId: 'comp_1',
        turboShipmentId: 'EXISTING_SHIPMENT',
        turboTrackingNumber: null,
        shipments: [],
        customer: { name: 'John Doe' },
        orderItems: [{ id: 'item_1' }],
        company: { turboEnabled: true, turboAutoCreate: true, turboApiKey: 'key' }
      };

      const result = await orderService.autoCreateTurboShipmentForOrder(order, 'comp_1');

      expect(result.skipped).toBe(true);
      expect(result.reason).toBe('ALREADY_HAS_SHIPMENT');
      expect(TurboService).not.toHaveBeenCalled();
    });

    test('2. Idempotency: skips when order already has tracking number in shipments array', async () => {
      const order = {
        id: 'ord_1',
        orderNumber: 'ORD-123',
        companyId: 'comp_1',
        turboShipmentId: null,
        turboTrackingNumber: null,
        shipments: [{ trackingNumber: 'SHIP-TRK-123' }],
        customer: { name: 'John Doe' },
        orderItems: [{ id: 'item_1' }],
        company: { turboEnabled: true, turboAutoCreate: true, turboApiKey: 'key' }
      };

      const result = await orderService.autoCreateTurboShipmentForOrder(order, 'comp_1');

      expect(result.skipped).toBe(true);
      expect(result.reason).toBe('ALREADY_HAS_SHIPMENT');
      expect(TurboService).not.toHaveBeenCalled();
    });

    test('3. Skips cleanly when Turbo is disabled for the company', async () => {
      const order = {
        id: 'ord_1',
        orderNumber: 'ORD-123',
        companyId: 'comp_1',
        turboShipmentId: null,
        customer: { name: 'John Doe' },
        orderItems: [{ id: 'item_1' }],
        company: { turboEnabled: false, turboAutoCreate: false, turboApiKey: null }
      };

      mockPrisma.shippingCompany.findFirst.mockResolvedValue(null);

      const result = await orderService.autoCreateTurboShipmentForOrder(order, 'comp_1');

      expect(result.skipped).toBe(true);
      expect(result.reason).toBe('TURBO_NOT_ENABLED');
      expect(mockPrisma.order.update).not.toHaveBeenCalled();
      expect(TurboService).not.toHaveBeenCalled();
    });

    test('4. Records clear note and log when Turbo is enabled but autoCreate is disabled in settings', async () => {
      const order = {
        id: 'ord_1',
        orderNumber: 'ORD-123',
        companyId: 'comp_1',
        notes: 'ملاحظة قديمة',
        turboShipmentId: null,
        customer: { name: 'John' },
        orderItems: [{ id: 'item_1' }],
        company: { turboEnabled: true, turboAutoCreate: false, turboApiKey: 'key_123' }
      };

      const result = await orderService.autoCreateTurboShipmentForOrder(order, 'comp_1');

      expect(result.skipped).toBe(true);
      expect(result.reason).toBe('AUTO_CREATE_DISABLED');
      expect(mockPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ord_1' },
          data: expect.objectContaining({
            notes: expect.stringContaining('ميزة الإنشاء التلقائي غير مفعلة')
          })
        })
      );
      expect(TurboService).not.toHaveBeenCalled();
    });

    test('5. Records clear note and log when Turbo is enabled and autoCreate=true but API key is missing', async () => {
      const order = {
        id: 'ord_1',
        orderNumber: 'ORD-123',
        companyId: 'comp_1',
        notes: null,
        turboShipmentId: null,
        customer: { name: 'John' },
        orderItems: [{ id: 'item_1' }],
        company: { turboEnabled: true, turboAutoCreate: true, turboApiKey: '' }
      };

      const result = await orderService.autoCreateTurboShipmentForOrder(order, 'comp_1');

      expect(result.success).toBe(false);
      expect(result.reason).toBe('MISSING_API_KEY');
      expect(mockPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ord_1' },
          data: expect.objectContaining({
            notes: expect.stringContaining('مفتاح API غير مضبوط')
          })
        })
      );
      expect(TurboService).not.toHaveBeenCalled();
    });

    test('6. Successfully creates shipment and saves tracking number & shipmentId', async () => {
      const order = {
        id: 'ord_1',
        orderNumber: 'ORD-123',
        companyId: 'comp_1',
        customerPhone: '01012345678',
        turboShipmentId: null,
        customer: { name: 'John' },
        orderItems: [{ id: 'item_1' }],
        company: { turboEnabled: true, turboAutoCreate: true, turboApiKey: 'key_123' }
      };

      jest.spyOn(orderService, 'checkDuplicateActiveTurboShipment').mockResolvedValue(null);

      const result = await orderService.autoCreateTurboShipmentForOrder(order, 'comp_1');

      expect(result.success).toBe(true);
      expect(result.shipmentId).toBe('TURBO-SHP-001');
      expect(result.trackingNumber).toBe('TRK-998877');
      expect(mockPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ord_1' },
          data: expect.objectContaining({
            turboShipmentId: 'TURBO-SHP-001',
            turboTrackingNumber: 'TRK-998877',
            turboShipmentStatus: 'created',
            turboLabelUrl: 'https://turbo-eg.com/label/001'
          })
        })
      );
      expect(mockPrisma.guestOrder.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { companyId: 'comp_1', orderNumber: 'ORD-123' },
          data: expect.objectContaining({
            turboShipmentId: 'TURBO-SHP-001',
            turboTrackingNumber: 'TRK-998877'
          })
        })
      );
    });

    test('7. Records failure note on order when Turbo API rejects/throws without throwing', async () => {
      const order = {
        id: 'ord_1',
        orderNumber: 'ORD-123',
        companyId: 'comp_1',
        customerPhone: '01012345678',
        turboShipmentId: null,
        notes: 'ملاحظة',
        customer: { name: 'John' },
        orderItems: [{ id: 'item_1' }],
        company: { turboEnabled: true, turboAutoCreate: true, turboApiKey: 'key_123' }
      };

      jest.spyOn(orderService, 'checkDuplicateActiveTurboShipment').mockResolvedValue(null);
      mockTurboInstance.createShipment.mockRejectedValue(new Error('رقم هاتف العميل غير صحيح'));

      const result = await orderService.autoCreateTurboShipmentForOrder(order, 'comp_1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('رقم هاتف العميل غير صحيح');
      expect(mockPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ord_1' },
          data: expect.objectContaining({
            notes: expect.stringContaining('فشل إنشاء شحنة تربو تلقائياً: رقم هاتف العميل غير صحيح')
          })
        })
      );
    });
  });

  describe('autoCreateTurboShipmentForGuestOrder', () => {
    test('8. Formats guest order and creates Turbo shipment successfully', async () => {
      const guestOrder = {
        id: 'guest_1',
        orderNumber: 'ORD-GUEST-99',
        companyId: 'comp_1',
        guestName: 'أحمد علي',
        guestPhone: '01012345678',
        guestEmail: 'guest@example.com',
        total: 250,
        shippingCost: 50,
        items: JSON.stringify([{ id: 'p1', name: 'تيشيرت', quantity: 1, price: 200 }]),
        turboShipmentId: null
      };

      const result = await orderService.autoCreateTurboShipmentForGuestOrder(guestOrder, 'comp_1');

      expect(result.success).toBe(true);
      expect(result.shipmentId).toBe('TURBO-SHP-001');
      expect(result.trackingNumber).toBe('TRK-998877');
      expect(mockPrisma.guestOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'guest_1' },
          data: expect.objectContaining({
            turboShipmentId: 'TURBO-SHP-001',
            turboTrackingNumber: 'TRK-998877'
          })
        })
      );
      expect(mockPrisma.order.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { companyId: 'comp_1', orderNumber: 'ORD-GUEST-99' },
          data: expect.objectContaining({
            turboShipmentId: 'TURBO-SHP-001',
            turboTrackingNumber: 'TRK-998877'
          })
        })
      );
    });
  });
});
