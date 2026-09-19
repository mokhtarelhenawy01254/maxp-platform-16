const mockPrisma = {
  companyApp: {
    findMany: jest.fn(),
  },
  companyWallet: {
    findUnique: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn(),
  },
  appUsageLog: {
    create: jest.fn(),
  },
  billingHistory: {
    create: jest.fn(),
  },
  order: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  user: {
    findMany: jest.fn(),
  },
  notification: {
    create: jest.fn(),
  },
  transaction: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  $transaction: jest.fn((callback) => callback(mockPrisma)),
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
  executeWithRetry: jest.fn((callback) => callback()),
}));

jest.mock('../../services/companyTrialService', () => ({
  isCompanyTrialActive: jest.fn().mockResolvedValue(false),
}));

const { computePpuCosts, billOrderPpuApps } = require('../../services/orderBasedBillingService');

describe('Order-Based PPU Billing Firewall & Safety Guards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('🛡️ SAFETY: AI Chat Basic must NEVER be billed on orders even if PAY_PER_USE and unitPrice > 0', async () => {
    mockPrisma.companyApp.findMany.mockResolvedValue([
      {
        id: 'ca-ai-chat',
        app: {
          id: 'app-ai-chat',
          slug: 'ai-chat-basic',
          name: 'AI Chat Basic',
          category: 'AI',
          unitPrice: 0.5,
          unitName: 'محادثة',
          ppuBillingMethod: 'PER_ORDER', // Even if database has PER_ORDER, whitelist must block it
        },
      },
    ]);

    const result = await computePpuCosts({
      companyId: 'comp-1',
      orderTotal: 500,
      itemsCount: 2,
    });

    expect(result.apps).toHaveLength(0);
    expect(result.totalCost).toBe(0);
  });

  test('🛡️ SAFETY: HR Basic must NEVER be billed on orders', async () => {
    mockPrisma.companyApp.findMany.mockResolvedValue([
      {
        id: 'ca-hr-basic',
        app: {
          id: 'app-hr-basic',
          slug: 'hr-basic',
          name: 'إدارة الموارد البشرية الأساسية',
          category: 'HR',
          unitPrice: 5,
          unitName: 'موظف',
          ppuBillingMethod: 'PER_ORDER',
        },
      },
    ]);

    const result = await computePpuCosts({
      companyId: 'comp-1',
      orderTotal: 300,
      itemsCount: 1,
    });

    expect(result.apps).toHaveLength(0);
    expect(result.totalCost).toBe(0);
  });

  test('🛡️ SAFETY: WhatsApp Integration must NEVER be billed on orders', async () => {
    mockPrisma.companyApp.findMany.mockResolvedValue([
      {
        id: 'ca-wa',
        app: {
          id: 'app-wa',
          slug: 'whatsapp-integration',
          name: 'تكامل WhatsApp Business',
          category: 'COMMUNICATION',
          unitPrice: 0.1,
          unitName: 'رسالة',
          ppuBillingMethod: 'PER_ORDER',
        },
      },
    ]);

    const result = await computePpuCosts({
      companyId: 'comp-1',
      orderTotal: 250,
      itemsCount: 1,
    });

    expect(result.apps).toHaveLength(0);
    expect(result.totalCost).toBe(0);
  });

  test('🛡️ SAFETY: Missing ppuBillingMethod must NOT fall back to PER_ORDER', async () => {
    mockPrisma.companyApp.findMany.mockResolvedValue([
      {
        id: 'ca-store-no-method',
        app: {
          id: 'app-store',
          slug: 'store',
          name: 'المتجر',
          category: 'ECOMMERCE',
          unitPrice: 1,
          unitName: 'طلب',
          ppuBillingMethod: null, // Null method should not default to PER_ORDER
        },
      },
    ]);

    const result = await computePpuCosts({
      companyId: 'comp-1',
      orderTotal: 100,
      itemsCount: 1,
    });

    expect(result.apps).toHaveLength(0);
    expect(result.totalCost).toBe(0);
  });

  test('✅ ALLOWED: Only whitelisted "store" app with unitName "طلب" and category "ECOMMERCE" is billed', async () => {
    mockPrisma.companyApp.findMany.mockResolvedValue([
      {
        id: 'ca-store',
        app: {
          id: 'app-store',
          slug: 'store',
          name: 'المتجر',
          category: 'ECOMMERCE',
          unitPrice: 1,
          unitName: 'طلب',
          ppuBillingMethod: 'PER_ORDER',
        },
      },
      {
        id: 'ca-ai-chat',
        app: {
          id: 'app-ai-chat',
          slug: 'ai-chat-basic',
          name: 'AI Chat Basic',
          category: 'AI',
          unitPrice: 0.5,
          unitName: 'محادثة',
          ppuBillingMethod: 'PER_ORDER',
        },
      },
    ]);

    const result = await computePpuCosts({
      companyId: 'comp-1',
      orderTotal: 1000,
      itemsCount: 2,
    });

    // Only 'store' should be billed, 'ai-chat-basic' MUST be ignored!
    expect(result.apps).toHaveLength(1);
    expect(result.apps[0].appSlug).toBe('store');
    expect(result.apps[0].cost).toBe(1);
    expect(result.totalCost).toBe(1);
  });

  test('🛡️ INTEGRATION: billOrderPpuApps does not bill or hold orders when non-store PPU apps are installed', async () => {
    mockPrisma.companyApp.findMany.mockResolvedValue([
      {
        id: 'ca-ai-chat',
        app: {
          id: 'app-ai-chat',
          slug: 'ai-chat-basic',
          name: 'AI Chat Basic',
          category: 'AI',
          unitPrice: 0.5,
          unitName: 'محادثة',
          ppuBillingMethod: 'PER_ORDER',
        },
      },
    ]);

    const result = await billOrderPpuApps({
      companyId: 'comp-red-line',
      orderNumber: 'ORD-123456',
      orderTotal: 250,
      itemsCount: 1,
      metadata: {},
      orderId: 'order-123',
    });

    expect(result.billed).toBe(false);
    expect(result.reason).toBe('no-ppu-apps');
    expect(mockPrisma.billingHistory.create).not.toHaveBeenCalled();
    expect(mockPrisma.order.update).not.toHaveBeenCalled();
  });
});
