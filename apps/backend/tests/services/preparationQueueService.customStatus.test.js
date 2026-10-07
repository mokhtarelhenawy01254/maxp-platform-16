const mockSharedPrisma = {
  company: {
    findUnique: jest.fn(),
  },
  orderStatusConfig: {
    findMany: jest.fn(),
  },
  order: {
    findMany: jest.fn(),
  },
  guestOrder: {
    findMany: jest.fn(),
  },
  inventory: {
    findMany: jest.fn(),
  },
  $queryRawUnsafe: jest.fn(),
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => mockSharedPrisma),
}));

const {
  getEffectivePreparationStatus,
  normalizePreparationStage,
  getMappedRegularOrderStatus,
  getPreparationQueue,
} = require('../../services/preparationQueueService');

describe('preparationQueueService custom status support (BDONKODTERBO & custom statuses)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getEffectivePreparationStatus', () => {
    it('returns customStatusCode when order is PENDING with custom status', () => {
      const effective = getEffectivePreparationStatus('PENDING', {}, 'BDONKODTERBO');
      expect(effective).toBe('BDONKODTERBO');
    });

    it('returns metadata.preparationStatus when prep status is explicitly set', () => {
      const metadata = JSON.stringify({ preparationStatus: 'PREPARING' });
      const effective = getEffectivePreparationStatus('PENDING', metadata, 'BDONKODTERBO');
      expect(effective).toBe('PREPARING');
    });

    it('returns terminal status if regular status is terminal even if custom code is present', () => {
      const effective = getEffectivePreparationStatus('DELIVERED', {}, 'BDONKODTERBO');
      expect(effective).toBe('DELIVERED');
    });

    it('falls back to status when no custom status or metadata status', () => {
      const effective = getEffectivePreparationStatus('CONFIRMED', {}, null);
      expect(effective).toBe('CONFIRMED');
    });
  });

  describe('normalizePreparationStage', () => {
    it('maps BDONKODTERBO to WAITING stage', () => {
      const stage = normalizePreparationStage('BDONKODTERBO');
      expect(stage).toBe('WAITING');
    });

    it('maps custom status with statusType preparation to WAITING', () => {
      const customMap = new Map([
        ['CUSTOM_PREP', { code: 'CUSTOM_PREP', statusType: 'preparation', isActive: true }]
      ]);
      const stage = normalizePreparationStage('CUSTOM_PREP', customMap);
      expect(stage).toBe('WAITING');
    });

    it('maps custom status via mapsToSystem', () => {
      const customMap = new Map([
        ['CUSTOM_HOLD', { code: 'CUSTOM_HOLD', mapsToSystem: 'STOCK_SHORTAGE', isActive: true }]
      ]);
      const stage = normalizePreparationStage('CUSTOM_HOLD', customMap);
      expect(stage).toBe('STOCK_SHORTAGE');
    });

    it('keeps standard statuses mapped correctly', () => {
      expect(normalizePreparationStage('PENDING_PREPARATION')).toBe('WAITING');
      expect(normalizePreparationStage('CONFIRMED')).toBe('WAITING');
      expect(normalizePreparationStage('PREPARING')).toBe('PREPARING');
      expect(normalizePreparationStage('READY_TO_SHIP')).toBe('READY_TO_SHIP');
      expect(normalizePreparationStage('STOCK_SHORTAGE')).toBe('STOCK_SHORTAGE');
    });

    it('returns null for unknown non-prep statuses', () => {
      expect(normalizePreparationStage('UNKNOWN_STATUS')).toBeNull();
    });
  });

  describe('getMappedRegularOrderStatus', () => {
    it('maps BDONKODTERBO to PENDING', () => {
      expect(getMappedRegularOrderStatus('BDONKODTERBO')).toBe('PENDING');
    });

    it('maps standard preparation statuses to regular statuses', () => {
      expect(getMappedRegularOrderStatus('PENDING_PREPARATION')).toBe('CONFIRMED');
      expect(getMappedRegularOrderStatus('STOCK_SHORTAGE')).toBe('STOCK_SHORTAGE');
      expect(getMappedRegularOrderStatus('PREPARING')).toBe('PROCESSING');
    });

    it('maps custom status via customStatusMap mapsToSystem', () => {
      const customMap = new Map([
        ['CUSTOM_WAIT', { mapsToSystem: 'PENDING' }]
      ]);
      expect(getMappedRegularOrderStatus('CUSTOM_WAIT', customMap)).toBe('PENDING');
    });
  });

  describe('getPreparationQueue integration', () => {
    const swanUser = { id: 'u_swan', companyId: 'company_swan', role: 'ADMIN' };
    const otherUser = { id: 'u_other', companyId: 'company_other', role: 'ADMIN' };

    it('includes BDONKODTERBO orders in preparation queue for Swan with stage WAITING', async () => {
      // 1. Swan company settings with active BDONKODTERBO config
      mockSharedPrisma.company.findUnique.mockResolvedValue({
        id: 'company_swan',
        settings: JSON.stringify({ orderPreparation: { includeCustomStatuses: true } })
      });
      mockSharedPrisma.orderStatusConfig.findMany.mockResolvedValue([
        {
          code: 'BDONKODTERBO',
          name: 'بدون كود تيربو',
          color: '#71717A',
          statusType: 'preparation',
          mapsToSystem: 'PENDING',
          isActive: true
        }
      ]);

      // 2. Candidate rows returned from DB: 1 regular order, 1 guest order, 1 standard confirmed order
      mockSharedPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([
          { orderType: 'regular', id: 'ord_reg_1', orderNumber: 'ORD-REG-1', createdAt: new Date() },
          { orderType: 'guest', id: 'ord_gst_1', orderNumber: 'ORD-GST-1', createdAt: new Date() },
          { orderType: 'regular', id: 'ord_std_1', orderNumber: 'ORD-STD-1', createdAt: new Date() }
        ])
        .mockResolvedValueOnce([]);

      // 3. Batch orders
      mockSharedPrisma.order.findMany.mockResolvedValue([
        {
          id: 'ord_reg_1',
          orderNumber: 'ORD-REG-1',
          status: 'PENDING',
          customStatusCode: 'BDONKODTERBO',
          customerName: 'عميل منتظم',
          customerPhone: '01000000001',
          total: 250,
          orderItems: [{ productId: 'prod_1', quantity: 1, productName: 'منتج أ' }],
          metadata: JSON.stringify({})
        },
        {
          id: 'ord_std_1',
          orderNumber: 'ORD-STD-1',
          status: 'CONFIRMED',
          customStatusCode: null,
          customerName: 'عميل مؤكد',
          customerPhone: '01000000002',
          total: 300,
          orderItems: [{ productId: 'prod_1', quantity: 1, productName: 'منتج أ' }],
          metadata: JSON.stringify({ preparationStatus: 'PENDING_PREPARATION' })
        }
      ]);

      mockSharedPrisma.guestOrder.findMany.mockResolvedValue([
        {
          id: 'ord_gst_1',
          orderNumber: 'ORD-GST-1',
          status: 'BDONKODTERBO',
          guestName: 'عميل زائر',
          guestPhone: '01000000003',
          total: 150,
          items: JSON.stringify([{ productId: 'prod_1', quantity: 1, name: 'منتج أ' }]),
          metadata: JSON.stringify({})
        }
      ]);

      mockSharedPrisma.inventory.findMany.mockResolvedValue([
        {
          productId: 'prod_1',
          warehouseId: 'wh_1',
          warehouse: { id: 'wh_1', name: 'المخزن الرئيسي' },
          product: { id: 'prod_1', name: 'منتج أ', sku: 'SKU-A' },
          available: 10,
          reserved: 0
        }
      ]);

      const result = await getPreparationQueue({
        user: swanUser,
        query: { page: 1, limit: 10, stage: 'ALL' }
      });

      expect(result.success).toBe(true);
      expect(result.data.length).toBe(3);

      const regOrder = result.data.find(o => o.orderNumber === 'ORD-REG-1');
      expect(regOrder).toBeDefined();
      expect(regOrder.stage).toBe('WAITING');
      expect(regOrder.normalizedStatus).toBe('BDONKODTERBO');
      expect(regOrder.customStatusCode).toBe('BDONKODTERBO');

      const gstOrder = result.data.find(o => o.orderNumber === 'ORD-GST-1');
      expect(gstOrder).toBeDefined();
      expect(gstOrder.stage).toBe('WAITING');
      expect(gstOrder.normalizedStatus).toBe('BDONKODTERBO');
      expect(gstOrder.customStatusCode).toBe('BDONKODTERBO');

      const stdOrder = result.data.find(o => o.orderNumber === 'ORD-STD-1');
      expect(stdOrder).toBeDefined();
      expect(stdOrder.stage).toBe('WAITING');
      expect(stdOrder.normalizedStatus).toBe('PENDING_PREPARATION');

      expect(result.summary.stageCounts.WAITING).toBe(3);
      expect(result.summary.statusCounts.BDONKODTERBO).toBe(2);
      expect(result.summary.statusCounts.PENDING_PREPARATION).toBe(1);
    });

    it('has zero impact on other company with no custom status configuration', async () => {
      // Other company has no custom status configs
      mockSharedPrisma.company.findUnique.mockResolvedValue({
        id: 'company_other',
        settings: JSON.stringify({})
      });
      mockSharedPrisma.orderStatusConfig.findMany.mockResolvedValue([]);

      // SQL candidate rows return only confirmed order
      mockSharedPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([
          { orderType: 'regular', id: 'ord_other_1', orderNumber: 'ORD-OTH-1', createdAt: new Date() }
        ])
        .mockResolvedValueOnce([]);

      mockSharedPrisma.order.findMany.mockResolvedValue([
        {
          id: 'ord_other_1',
          orderNumber: 'ORD-OTH-1',
          status: 'CONFIRMED',
          customStatusCode: null,
          customerName: 'عميل شركة أخرى',
          total: 500,
          orderItems: [],
          metadata: JSON.stringify({ preparationStatus: 'PENDING_PREPARATION' })
        }
      ]);

      mockSharedPrisma.guestOrder.findMany.mockResolvedValue([]);
      mockSharedPrisma.inventory.findMany.mockResolvedValue([]);

      const result = await getPreparationQueue({
        user: otherUser,
        query: { page: 1, limit: 10, stage: 'ALL' }
      });

      expect(result.success).toBe(true);
      expect(result.data.length).toBe(1);
      expect(result.data[0].orderNumber).toBe('ORD-OTH-1');
      expect(result.summary.statusCounts.BDONKODTERBO).toBeUndefined();
    });

    it('excludes custom statuses if company settings explicitly disables includeCustomStatuses', async () => {
      mockSharedPrisma.company.findUnique.mockResolvedValue({
        id: 'company_swan',
        settings: JSON.stringify({ orderPreparation: { includeCustomStatuses: false } })
      });
      mockSharedPrisma.orderStatusConfig.findMany.mockResolvedValue([
        { code: 'BDONKODTERBO', statusType: 'preparation', isActive: true }
      ]);

      mockSharedPrisma.$queryRawUnsafe.mockResolvedValue([]);

      const result = await getPreparationQueue({
        user: swanUser,
        query: { page: 1, limit: 10, stage: 'ALL' }
      });

      expect(result.success).toBe(true);
      expect(result.data.length).toBe(0);
      // orderStatusConfig.findMany should NOT even be called when includeCustomStatuses is false
      expect(mockSharedPrisma.orderStatusConfig.findMany).not.toHaveBeenCalled();
    });
  });
});
