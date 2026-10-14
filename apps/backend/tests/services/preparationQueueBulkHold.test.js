jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => mockSharedPrisma),
}));

jest.mock('../../services/whatsapp/WhatsAppNotificationService', () => ({
  isDuplicateNotification: jest.fn().mockResolvedValue(true),
  sendOrderStatusNotification: jest.fn().mockResolvedValue({ success: true }),
}));

const mockSharedPrisma = {
  order: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  guestOrder: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  orderStatusConfig: {
    findFirst: jest.fn().mockResolvedValue(null),
  },
};

const {
  updatePreparationOrderStatus,
  assertPreparationHoldRule,
} = require('../../services/preparationQueueService');

describe('Preparation Queue Bulk Hold & Override Rules', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSharedPrisma.orderStatusConfig.findFirst.mockResolvedValue(null);
  });

  afterEach(async () => {
    await new Promise((resolve) => setImmediate(resolve));
  });

  describe('updatePreparationOrderStatus (Hold & Release metadata)', () => {
    it('(1) bulk-hold with reason -> succeeds and writes preparationHold metadata with state: held', async () => {
      const existingOrder = {
        id: 'ord-bulk-1',
        orderNumber: 'ORD-BULK-001',
        companyId: 'comp-1',
        status: 'PROCESSING',
        metadata: JSON.stringify({ preparationStatus: 'PREPARING' }),
      };

      mockSharedPrisma.order.findFirst.mockResolvedValue(existingOrder);
      mockSharedPrisma.order.update.mockImplementation(({ data }) => Promise.resolve({
        ...existingOrder,
        ...data,
      }));

      const result = await updatePreparationOrderStatus({
        orderIdentifier: 'ORD-BULK-001',
        companyId: 'comp-1',
        status: 'ON_HOLD_PREP',
        notes: 'العميل لا يرد لتأكيد العنوان',
        userId: 'user-100',
        userName: 'Admin User',
      });

      expect(result.orderType).toBe('regular');
      expect(mockSharedPrisma.order.update).toHaveBeenCalledTimes(1);

      const updateCall = mockSharedPrisma.order.update.mock.calls[0][0];
      const savedMetadata = JSON.parse(updateCall.data.metadata);

      expect(savedMetadata.preparationStatus).toBe('ON_HOLD_PREP');
      expect(savedMetadata.preparationHold).toBeDefined();
      expect(savedMetadata.preparationHold.reason).toBe('العميل لا يرد لتأكيد العنوان');
      expect(savedMetadata.preparationHold.heldBy).toBe('Admin User');
      expect(savedMetadata.preparationHold.state).toBe('held');
      expect(typeof savedMetadata.preparationHold.heldAt).toBe('string');
    });

    it('(2) bulk-hold without reason -> fails with "سبب تعليق الطلب مطلوب"', async () => {
      const existingOrder = {
        id: 'ord-bulk-2',
        orderNumber: 'ORD-BULK-002',
        companyId: 'comp-1',
        status: 'PROCESSING',
        metadata: JSON.stringify({ preparationStatus: 'PREPARING' }),
      };

      mockSharedPrisma.order.findFirst.mockResolvedValue(existingOrder);

      let caught = null;
      try {
        await updatePreparationOrderStatus({
          orderIdentifier: 'ORD-BULK-002',
          companyId: 'comp-1',
          status: 'ON_HOLD_PREP',
          notes: '',
          userId: 'user-100',
          userName: 'Admin User',
        });
      } catch (err) {
        caught = err;
      }

      expect(caught).not.toBeNull();
      expect(caught.statusCode).toBe(400);
      expect(caught.message).toContain('سبب تعليق الطلب مطلوب');
      expect(mockSharedPrisma.order.update).not.toHaveBeenCalled();
    });

    it('(3) bulk-release by admin (isOverride: true) -> succeeds and updates preparationHold metadata to state: released', async () => {
      const heldOrder = {
        id: 'ord-bulk-3',
        orderNumber: 'ORD-BULK-003',
        companyId: 'comp-1',
        status: 'ON_HOLD_PREP',
        metadata: JSON.stringify({
          preparationStatus: 'ON_HOLD_PREP',
          preparationHold: {
            reason: 'مشكلة فنية',
            heldAt: '2026-10-14T10:00:00.000Z',
            heldBy: 'Staff Member',
            state: 'held',
          },
        }),
      };

      mockSharedPrisma.order.findFirst.mockResolvedValue(heldOrder);
      mockSharedPrisma.order.update.mockImplementation(({ data }) => Promise.resolve({
        ...heldOrder,
        ...data,
      }));

      // Moving directly from ON_HOLD_PREP to READY_TO_SHIP with isOverride: true
      const result = await updatePreparationOrderStatus({
        orderIdentifier: 'ORD-BULK-003',
        companyId: 'comp-1',
        status: 'READY_TO_SHIP',
        notes: 'تم حل المشكلة وتجهيز الشحنة',
        userId: 'admin-1',
        userName: 'Store Owner',
        isOverride: true,
      });

      expect(result.orderType).toBe('regular');
      expect(mockSharedPrisma.order.update).toHaveBeenCalledTimes(1);

      const updateCall = mockSharedPrisma.order.update.mock.calls[0][0];
      const savedMetadata = JSON.parse(updateCall.data.metadata);

      expect(savedMetadata.preparationStatus).toBe('READY_TO_SHIP');
      expect(savedMetadata.preparationHold).toBeDefined();
      expect(savedMetadata.preparationHold.reason).toBe('مشكلة فنية'); // Preserves original reason
      expect(savedMetadata.preparationHold.releasedBy).toBe('Store Owner');
      expect(savedMetadata.preparationHold.state).toBe('released');
      expect(typeof savedMetadata.preparationHold.releasedAt).toBe('string');
    });

    it('blocks releasing directly to forward stage when isOverride is false', async () => {
      const heldOrder = {
        id: 'ord-bulk-4',
        orderNumber: 'ORD-BULK-004',
        companyId: 'comp-1',
        status: 'ON_HOLD_PREP',
        metadata: JSON.stringify({
          preparationStatus: 'ON_HOLD_PREP',
          preparationHold: {
            reason: 'مشكلة فنية',
            heldAt: '2026-10-14T10:00:00.000Z',
            heldBy: 'Staff Member',
            state: 'held',
          },
        }),
      };

      mockSharedPrisma.order.findFirst.mockResolvedValue(heldOrder);

      let caught = null;
      try {
        await updatePreparationOrderStatus({
          orderIdentifier: 'ORD-BULK-004',
          companyId: 'comp-1',
          status: 'READY_TO_SHIP',
          notes: 'محاولة نقل بدون صلاحية',
          userId: 'user-2',
          userName: 'Regular User',
          isOverride: false,
        });
      } catch (err) {
        caught = err;
      }

      expect(caught).not.toBeNull();
      expect(caught.statusCode).toBe(400);
      expect(caught.message).toContain('الطلب معلق بانتظار حل المشكلة');
      expect(mockSharedPrisma.order.update).not.toHaveBeenCalled();
    });

    it('supports guest order hold and release with metadata merging', async () => {
      const guestOrder = {
        id: 'guest-1',
        orderNumber: 'GST-001',
        companyId: 'comp-1',
        status: 'PREPARING',
        metadata: JSON.stringify({ preparationStatus: 'PREPARING' }),
      };

      mockSharedPrisma.order.findFirst.mockResolvedValue(null);
      mockSharedPrisma.guestOrder.findFirst.mockResolvedValue(guestOrder);
      mockSharedPrisma.guestOrder.update.mockImplementation(({ data }) => Promise.resolve({
        ...guestOrder,
        ...data,
      }));

      // Hold guest order
      const holdResult = await updatePreparationOrderStatus({
        orderIdentifier: 'GST-001',
        companyId: 'comp-1',
        status: 'ON_HOLD_PREP',
        notes: 'مشكلة عنوان الضيف',
        userId: 'admin-1',
        userName: 'Admin',
      });

      expect(holdResult.orderType).toBe('guest');
      const holdUpdateCall = mockSharedPrisma.guestOrder.update.mock.calls[0][0];
      const holdMetadata = JSON.parse(holdUpdateCall.data.metadata);
      expect(holdMetadata.preparationStatus).toBe('ON_HOLD_PREP');
      expect(holdMetadata.preparationHold.reason).toBe('مشكلة عنوان الضيف');
      expect(holdMetadata.preparationHold.state).toBe('held');

      // Release guest order
      mockSharedPrisma.guestOrder.findFirst.mockResolvedValue({
        ...guestOrder,
        status: 'ON_HOLD_PREP',
        metadata: JSON.stringify(holdMetadata),
      });

      const releaseResult = await updatePreparationOrderStatus({
        orderIdentifier: 'GST-001',
        companyId: 'comp-1',
        status: 'PREPARING',
        notes: 'تم تصحيح العنوان',
        userId: 'admin-1',
        userName: 'Admin',
        isOverride: true,
      });

      expect(releaseResult.orderType).toBe('guest');
      const releaseUpdateCall = mockSharedPrisma.guestOrder.update.mock.calls[1][0];
      const releaseMetadata = JSON.parse(releaseUpdateCall.data.metadata);
      expect(releaseMetadata.preparationStatus).toBe('PREPARING');
      expect(releaseMetadata.preparationHold.state).toBe('released');
      expect(releaseMetadata.preparationHold.releasedBy).toBe('Admin');
    });
  });
});
