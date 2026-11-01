const mockPrisma = {
  wholesaleCustomer: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  order: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
  },
  wholesaleTransaction: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  $transaction: jest.fn(async (cb) => cb(mockPrisma)),
};

jest.mock('../services/sharedDatabase', () => ({
  getSharedPrismaClient: () => mockPrisma,
}));

const mockConfirmOrder = jest.fn();
jest.mock('../services/orderConfirmationService', () => ({
  confirmOrder: (...args) => mockConfirmOrder(...args),
}));

const { wholesaleService } = require('../services/wholesaleService');

describe('Wholesale Manage Queue (Daily Workspace) Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. getManageQueue (4 Blocks & Counts)', () => {
    test('returns 4 groups, counts, and filters correctly', async () => {
      const now = new Date();

      // Mock pending orders (Block 1)
      mockPrisma.order.findMany.mockImplementation(({ where }) => {
        if (where.status === 'PENDING') {
          return Promise.resolve([
            {
              id: 'ord-1',
              orderNumber: 'ORD-1001',
              createdAt: now,
              status: 'PENDING',
              total: 5000,
              customer: { id: 'cust-1', firstName: 'أحمد', lastName: 'الموزع', phone: '01000000001' },
              wholesaleCustomer: {
                id: 'wc-1',
                currentBalance: 48000,
                creditLimit: 50000,
                isActive: true,
                notes: 'عميل منتظم',
              },
              orderItems: [
                { id: 'item-1', productName: 'منتج أ', quantity: 10, price: 500, total: 5000 },
              ],
            },
          ]);
        }
        // Fulfillment / Processing orders (Block 4)
        return Promise.resolve([
          {
            id: 'ord-2',
            orderNumber: 'ORD-1002',
            createdAt: now,
            confirmedAt: now,
            status: 'CONFIRMED',
            total: 12000,
            customer: { id: 'cust-2', firstName: 'محمود', lastName: 'الجملة', phone: '01000000002' },
            wholesaleCustomer: { id: 'wc-2', currentBalance: 20000, creditLimit: 100000 },
            orderItems: [{ id: 'item-2', productName: 'منتج ب', quantity: 20, price: 600, total: 12000 }],
          },
        ]);
      });

      mockPrisma.order.count.mockResolvedValue(1);
      mockPrisma.order.aggregate.mockResolvedValue({ _sum: { total: 5000 } });

      // Mock wholesale customers for Over-Limit (Block 2) and Suspended (Block 3)
      mockPrisma.wholesaleCustomer.findMany.mockImplementation(({ where }) => {
        if (where.isActive === false) {
          // Block 3: Suspended
          return Promise.resolve([
            {
              id: 'wc-3',
              customerId: 'cust-3',
              currentBalance: 75000,
              creditLimit: 50000,
              isActive: false,
              notes: '[إيقاف حساب - 2026-11-01]: تجاوز الحد الائتماني وشيكات مؤجلة',
              updatedAt: now,
              customer: { id: 'cust-3', firstName: 'سعيد', lastName: 'التجاري', phone: '01000000003' },
            },
          ]);
        }
        // Block 2: Over limit candidates
        return Promise.resolve([
          {
            id: 'wc-4',
            customerId: 'cust-4',
            currentBalance: 65000,
            creditLimit: 50000,
            isActive: true,
            notes: 'تحذير مسبق',
            updatedAt: now,
            customer: { id: 'cust-4', firstName: 'ياسر', lastName: 'المتحد', phone: '01000000004' },
          },
        ]);
      });

      const res = await wholesaleService.getManageQueue({
        companyId: 'comp-1',
        period: 'today',
      });

      expect(res).toBeDefined();
      expect(res.counts).toBeDefined();
      expect(res.counts.pendingOrdersCount).toBe(1);
      expect(res.counts.pendingOrdersAmount).toBe(5000);
      expect(res.counts.overLimitDistributorsCount).toBe(1);
      expect(res.counts.totalOverLimitAmount).toBe(15000); // 65000 - 50000
      expect(res.counts.suspendedDistributorsCount).toBe(1);
      expect(res.counts.processingOrdersCount).toBe(1);

      // Verify Group 1: Pending order item detects over-limit projection
      expect(res.groups.pendingOrders.length).toBe(1);
      const pendingOrder = res.groups.pendingOrders[0];
      expect(pendingOrder.orderNumber).toBe('ORD-1001');
      expect(pendingOrder.distributor.isOverLimit).toBe(true); // 48000 + 5000 > 50000
      expect(pendingOrder.distributor.excessAmount).toBe(3000); // 53000 - 50000

      // Verify Group 2: Over-limit distributor
      expect(res.groups.overLimitDistributors.length).toBe(1);
      const overLimitDistributor = res.groups.overLimitDistributors[0];
      expect(overLimitDistributor.name).toBe('ياسر المتحد');
      expect(overLimitDistributor.excessAmount).toBe(15000);
      expect(overLimitDistributor.utilizationPercent).toBe(130);

      // Verify Group 3: Suspended distributor
      expect(res.groups.suspendedDistributors.length).toBe(1);
      expect(res.groups.suspendedDistributors[0].name).toBe('سعيد التجاري');
      expect(res.groups.suspendedDistributors[0].isActive).toBe(false);

      // Verify Group 4: Processing orders
      expect(res.groups.processingOrders.length).toBe(1);
      expect(res.groups.processingOrders[0].orderNumber).toBe('ORD-1002');
    });
  });

  describe('2. confirmWholesaleOrder', () => {
    test('confirms order via orderConfirmationService and guarantees recordOrderInvoice', async () => {
      const orderData = {
        id: 'ord-confirm-1',
        orderNumber: 'ORD-999',
        companyId: 'comp-1',
        customerId: 'cust-1',
        wholesaleCustomerId: 'wc-1',
        total: 10000,
        status: 'PENDING',
      };

      mockPrisma.order.findFirst.mockResolvedValue(orderData);
      mockConfirmOrder.mockResolvedValue({
        orderType: 'regular',
        order: { ...orderData, status: 'CONFIRMED', confirmedAt: new Date() },
      });
      mockPrisma.order.findUnique.mockResolvedValue({
        ...orderData,
        status: 'CONFIRMED',
      });

      // Mock wholesale customer and invoice creation
      mockPrisma.wholesaleCustomer.findFirst.mockResolvedValue({
        id: 'wc-1',
        customerId: 'cust-1',
        companyId: 'comp-1',
        currentBalance: 20000,
      });
      mockPrisma.wholesaleCustomer.findUnique.mockResolvedValue({
        id: 'wc-1',
        currentBalance: 20000,
      });
      mockPrisma.wholesaleTransaction.findFirst.mockResolvedValue(null);
      mockPrisma.wholesaleTransaction.create.mockResolvedValue({
        id: 'tx-inv-1',
        type: 'INVOICE',
        amount: 10000,
        balanceBefore: 20000,
        balanceAfter: 30000,
      });
      mockPrisma.wholesaleCustomer.update.mockResolvedValue({
        id: 'wc-1',
        currentBalance: 30000,
      });

      const result = await wholesaleService.confirmWholesaleOrder(
        'ord-confirm-1',
        'comp-1',
        'user-1',
        'موافقة على الائتمان'
      );

      expect(mockConfirmOrder).toHaveBeenCalledWith(
        'comp-1',
        'ord-confirm-1',
        'user-1',
        'موافقة على الائتمان'
      );
      expect(result.order).toBeDefined();
      expect(result.invoiceTransaction).toBeDefined();
      expect(result.invoiceTransaction.amount).toBe(10000);
    });

    test('throws 404 when order is not found', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(null);

      await expect(
        wholesaleService.confirmWholesaleOrder('non-existent', 'comp-1')
      ).rejects.toThrow('طلب الجملة غير موجود');
    });
  });

  describe('3. suspendDistributor & resumeDistributor', () => {
    test('suspends distributor with reason and timestamps note', async () => {
      mockPrisma.wholesaleCustomer.findFirst.mockResolvedValue({
        id: 'wc-suspend-1',
        companyId: 'comp-1',
        isActive: true,
        notes: 'ملاحظة قديمة',
        customer: { id: 'c-1', firstName: 'طارق', lastName: 'الموزع', phone: '0123456789' },
      });

      mockPrisma.wholesaleCustomer.update.mockImplementation(({ data }) => {
        return Promise.resolve({
          id: 'wc-suspend-1',
          isActive: data.isActive,
          notes: data.notes,
          customer: { id: 'c-1', firstName: 'طارق', lastName: 'الموزع', phone: '0123456789' },
        });
      });

      const updated = await wholesaleService.suspendDistributor(
        'wc-suspend-1',
        'comp-1',
        'تأخر في سداد فواتير شهر أكتوبر'
      );

      expect(updated.isActive).toBe(false);
      expect(updated.notes).toContain('[إيقاف حساب -');
      expect(updated.notes).toContain('تأخر في سداد فواتير شهر أكتوبر');
    });

    test('resumes distributor and updates isActive to true', async () => {
      mockPrisma.wholesaleCustomer.findFirst.mockResolvedValue({
        id: 'wc-resume-1',
        companyId: 'comp-1',
        isActive: false,
        notes: '[إيقاف]: سبب قديم',
        customer: { id: 'c-1', firstName: 'طارق', lastName: 'الموزع', phone: '0123456789' },
      });

      mockPrisma.wholesaleCustomer.update.mockImplementation(({ data }) => {
        return Promise.resolve({
          id: 'wc-resume-1',
          isActive: data.isActive,
          notes: data.notes,
          customer: { id: 'c-1', firstName: 'طارق', lastName: 'الموزع', phone: '0123456789' },
        });
      });

      const updated = await wholesaleService.resumeDistributor(
        'wc-resume-1',
        'comp-1',
        'تم تحصيل دفعة نقدية وتعديل الائتمان'
      );

      expect(updated.isActive).toBe(true);
      expect(updated.notes).toContain('[إعادة تفعيل -');
      expect(updated.notes).toContain('تم تحصيل دفعة نقدية وتعديل الائتمان');
    });

    test('throws 400 when suspension reason is empty', async () => {
      mockPrisma.wholesaleCustomer.findFirst.mockResolvedValue({
        id: 'wc-1',
        companyId: 'comp-1',
        isActive: true,
      });

      await expect(
        wholesaleService.suspendDistributor('wc-1', 'comp-1', '   ')
      ).rejects.toThrow('سبب إيقاف الموزع مطلوب');
    });
  });
});
