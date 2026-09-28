const orderService = require('../../services/orderService');

describe('Duplicate Order Detection System', () => {
  let mockPrisma;

  beforeEach(() => {
    mockPrisma = {
      company: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      orderInvoiceSettings: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
      order: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      guestOrder: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      user: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      notification: {
        create: jest.fn().mockResolvedValue({ id: 'notif-1' }),
      },
    };
    orderService.getPrisma = () => mockPrisma;
  });

  describe('Acceptance Criteria 1: Terminal/completed orders are not treated as duplicate', () => {
    test('when customer has previous order in DELIVERED or RETURNED, it does not match as duplicate', async () => {
      // Setup: company uses default active statuses (PENDING, CONFIRMED, PROCESSING, PREPARING, SHIPPED, ON_HOLD)
      mockPrisma.company.findUnique.mockResolvedValue({
        id: 'comp-1',
        settings: JSON.stringify({
          duplicateOrderSettings: {
            enabled: true,
            criteria: 'phone',
            activeStatuses: ['PENDING', 'CONFIRMED', 'PROCESSING', 'PREPARING', 'SHIPPED', 'ON_HOLD'],
            windowEnabled: false,
          },
        }),
      });

      // Mock DB: DELIVERED or RETURNED orders are filtered out by the status query
      mockPrisma.order.findMany.mockImplementation(async (query) => {
        const statusesQueried = query.where.status.in;
        expect(statusesQueried).not.toContain('DELIVERED');
        expect(statusesQueried).not.toContain('RETURNED');
        expect(statusesQueried).not.toContain('CANCELLED');
        // Since DB query only looks for active statuses, it returns empty
        return [];
      });

      const duplicate = await orderService.findDuplicateOrder({
        companyId: 'comp-1',
        customerPhone: '01012345678',
        total: 500,
        includeGuest: false,
      });

      expect(duplicate).toBeNull();
    });
  });

  describe('Acceptance Criteria 2: In-progress/active orders are treated as duplicate', () => {
    test('when customer has order in PREPARING or SHIPPED, it matches as duplicate', async () => {
      mockPrisma.company.findUnique.mockResolvedValue({
        id: 'comp-1',
        settings: JSON.stringify({
          duplicateOrderSettings: {
            enabled: true,
            criteria: 'phone',
            activeStatuses: ['PENDING', 'CONFIRMED', 'PROCESSING', 'PREPARING', 'SHIPPED', 'ON_HOLD'],
            windowEnabled: false,
            action: 'record_visible',
          },
        }),
      });

      const activeOrder = {
        id: 'ord-active-1',
        orderNumber: 'ORD-101',
        customerPhone: '01012345678',
        status: 'SHIPPED',
        total: 450,
        orderItems: [{ productId: 'p1', productName: 'حذاء كاجوال', quantity: 1, price: 450 }],
        createdAt: new Date(),
      };

      mockPrisma.order.findMany.mockResolvedValue([activeOrder]);

      const duplicate = await orderService.findDuplicateOrder({
        companyId: 'comp-1',
        customerPhone: '01012345678',
        total: 450,
        includeGuest: false,
      });

      expect(duplicate).not.toBeNull();
      expect(duplicate.type).toBe('order');
      expect(duplicate.order.id).toBe('ord-active-1');
      expect(duplicate.settings.action).toBe('record_visible');
    });
  });

  describe('Acceptance Criteria 3: Time window enabling and duration toggle', () => {
    test('when window is disabled, old active orders match as duplicate', async () => {
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);

      mockPrisma.company.findUnique.mockResolvedValue({
        id: 'comp-1',
        settings: JSON.stringify({
          duplicateOrderSettings: {
            enabled: true,
            criteria: 'phone',
            windowEnabled: false, // disabled
          },
        }),
      });

      let capturedWhere = null;
      mockPrisma.order.findMany.mockImplementation(async ({ where }) => {
        capturedWhere = where;
        return [
          {
            id: 'ord-old',
            orderNumber: 'ORD-OLD',
            customerPhone: '01012345678',
            status: 'PREPARING',
            total: 300,
            createdAt: tenDaysAgo,
          },
        ];
      });

      const duplicate = await orderService.findDuplicateOrder({
        companyId: 'comp-1',
        customerPhone: '01012345678',
        total: 300,
        includeGuest: false,
      });

      expect(capturedWhere.createdAt).toBeUndefined(); // No time limit!
      expect(duplicate).not.toBeNull();
      expect(duplicate.order.id).toBe('ord-old');
    });

    test('when window is enabled (60m), an order older than 60m does not match', async () => {
      mockPrisma.company.findUnique.mockResolvedValue({
        id: 'comp-1',
        settings: JSON.stringify({
          duplicateOrderSettings: {
            enabled: true,
            criteria: 'phone',
            windowEnabled: true,
            windowMinutes: 60,
          },
        }),
      });

      let capturedWhere = null;
      mockPrisma.order.findMany.mockImplementation(async ({ where }) => {
        capturedWhere = where;
        // In DB, if order is older than gte, findMany returns []
        return [];
      });

      const duplicate = await orderService.findDuplicateOrder({
        companyId: 'comp-1',
        customerPhone: '01012345678',
        total: 300,
        includeGuest: false,
      });

      expect(capturedWhere.createdAt).toBeDefined();
      expect(capturedWhere.createdAt.gte).toBeInstanceOf(Date);
      expect(duplicate).toBeNull();
    });
  });

  describe('Acceptance Criteria 4: Tenant settings isolation', () => {
    test('company A settings do not affect company B', async () => {
      mockPrisma.company.findUnique.mockImplementation(async ({ where }) => {
        if (where.id === 'comp-A') {
          return {
            id: 'comp-A',
            settings: JSON.stringify({
              duplicateOrderSettings: {
                enabled: true,
                criteria: 'phone_amount',
                action: 'block',
              },
            }),
          };
        }
        if (where.id === 'comp-B') {
          return {
            id: 'comp-B',
            settings: JSON.stringify({
              duplicateOrderSettings: {
                enabled: false, // disabled for B
                criteria: 'phone',
                action: 'record_visible',
              },
            }),
          };
        }
        return null;
      });

      const settingsA = await orderService.getDuplicateSettings('comp-A');
      const settingsB = await orderService.getDuplicateSettings('comp-B');

      expect(settingsA.enabled).toBe(true);
      expect(settingsA.criteria).toBe('phone_amount');
      expect(settingsA.action).toBe('block');

      expect(settingsB.enabled).toBe(false);
      expect(settingsB.criteria).toBe('phone');
      expect(settingsB.action).toBe('record_visible');
    });
  });

  describe('Criteria tests: phone vs phone_amount vs phone_items', () => {
    test('criteria: phone matches regardless of amount or items', async () => {
      const settings = {
        enabled: true,
        criteria: 'phone',
        activeStatuses: ['PENDING', 'SHIPPED'],
        windowEnabled: false,
      };

      mockPrisma.order.findMany.mockResolvedValue([
        { id: 'o-1', customerPhone: '01011112222', total: 100, orderItems: [] },
      ]);

      const match = await orderService.findDuplicateOrder({
        companyId: 'comp-1',
        customerPhone: '01011112222',
        total: 999, // different total
        items: [{ productId: 'different-prod', quantity: 5 }],
        settings,
        includeGuest: false,
      });

      expect(match).not.toBeNull();
      expect(match.order.id).toBe('o-1');
    });

    test('criteria: phone_amount only matches when total is identical', async () => {
      const settings = {
        enabled: true,
        criteria: 'phone_amount',
        activeStatuses: ['PENDING', 'SHIPPED'],
        windowEnabled: false,
      };

      mockPrisma.order.findMany.mockResolvedValue([
        { id: 'o-1', customerPhone: '01011112222', total: 250, orderItems: [] },
      ]);

      // Different total -> no match
      const noMatch = await orderService.findDuplicateOrder({
        companyId: 'comp-1',
        customerPhone: '01011112222',
        total: 300,
        settings,
        includeGuest: false,
      });
      expect(noMatch).toBeNull();

      // Same total -> match
      const match = await orderService.findDuplicateOrder({
        companyId: 'comp-1',
        customerPhone: '01011112222',
        total: 250,
        settings,
        includeGuest: false,
      });
      expect(match).not.toBeNull();
      expect(match.order.id).toBe('o-1');
    });

    test('criteria: phone_items matches when products and quantities match', async () => {
      const settings = {
        enabled: true,
        criteria: 'phone_items',
        activeStatuses: ['PENDING'],
        windowEnabled: false,
      };

      mockPrisma.order.findMany.mockResolvedValue([
        {
          id: 'o-1',
          customerPhone: '01011112222',
          total: 200,
          orderItems: [
            { productId: 'prod-A', productName: 'تيشيرت أسود', quantity: 2 },
          ],
        },
      ]);

      // Different product -> no match
      const diffProduct = await orderService.findDuplicateOrder({
        companyId: 'comp-1',
        customerPhone: '01011112222',
        total: 200,
        items: [{ productId: 'prod-B', productName: 'تيشيرت أبيض', quantity: 2 }],
        settings,
        includeGuest: false,
      });
      expect(diffProduct).toBeNull();

      // Same product, different quantity -> no match
      const diffQuantity = await orderService.findDuplicateOrder({
        companyId: 'comp-1',
        customerPhone: '01011112222',
        total: 200,
        items: [{ productId: 'prod-A', productName: 'تيشيرت أسود', quantity: 1 }],
        settings,
        includeGuest: false,
      });
      expect(diffQuantity).toBeNull();

      // Same product and quantity -> match
      const match = await orderService.findDuplicateOrder({
        companyId: 'comp-1',
        customerPhone: '01011112222',
        total: 200,
        items: [{ productId: 'prod-A', productName: 'تيشيرت أسود', quantity: 2 }],
        settings,
        includeGuest: false,
      });
      expect(match).not.toBeNull();
      expect(match.order.id).toBe('o-1');
    });
  });

  describe('Whitelist / Exempt phones', () => {
    test('phone in exemptPhones bypasses duplicate detection completely', async () => {
      const settings = {
        enabled: true,
        criteria: 'phone',
        exemptPhones: ['01099998888', '01233334444'],
        activeStatuses: ['PENDING', 'SHIPPED'],
        windowEnabled: false,
      };

      mockPrisma.order.findMany.mockResolvedValue([
        { id: 'o-vip', customerPhone: '01099998888', total: 1000 },
      ]);

      const match = await orderService.findDuplicateOrder({
        companyId: 'comp-1',
        customerPhone: '01099998888',
        total: 1000,
        settings,
      });

      expect(match).toBeNull();
      // Notice: order.findMany was not even called because whitelist check returned early!
      expect(mockPrisma.order.findMany).not.toHaveBeenCalled();
    });
  });

  describe('Cross-channel Storefront Guest Orders comparison', () => {
    test('checks guestOrder table when includeStoreOrders is true', async () => {
      const settings = {
        enabled: true,
        criteria: 'phone',
        includeStoreOrders: true,
        activeStatuses: ['PENDING'],
        windowEnabled: false,
      };

      // No match in regular order table
      mockPrisma.order.findMany.mockResolvedValue([]);
      // Match found in guestOrder table
      mockPrisma.guestOrder.findMany.mockResolvedValue([
        {
          id: 'guest-1',
          guestPhone: '01055556666',
          status: 'PENDING',
          total: 350,
          items: JSON.stringify([{ productId: 'p1', quantity: 1 }]),
        },
      ]);

      const match = await orderService.findDuplicateOrder({
        companyId: 'comp-1',
        customerPhone: '01055556666',
        total: 350,
        settings,
      });

      expect(match).not.toBeNull();
      expect(match.type).toBe('guest');
      expect(match.order.id).toBe('guest-1');
    });
  });
});
