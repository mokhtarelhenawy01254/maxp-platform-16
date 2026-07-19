const customerBlocklistService = require('../../services/customerBlocklistService');

describe('customerBlocklistService', () => {
  const baseSettings = {
    enabled: true,
    blockCheckout: true,
    blockManualOrders: true,
    blockAffiliateManualOrders: true,
    blockAiOrderCreation: true,
    matchPhone: true,
    matchEmail: true,
    matchFacebook: true,
    matchWhatsapp: true,
    allowManagerOverride: true,
    defaultAction: 'BLOCK_ORDERS',
    checkoutMessage: 'checkout blocked',
    internalWarningMessage: 'internal blocked',
  };

  const createPrisma = (rule = null, settings = baseSettings) => ({
    customerBlockSettings: {
      findUnique: jest.fn().mockResolvedValue(settings),
    },
    customerBlockRule: {
      findFirst: jest.fn().mockResolvedValue(rule),
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('normalizes Egyptian phone numbers for stable matching', () => {
    expect(customerBlocklistService.normalizePhone('+20 101 234 5678')).toBe('01012345678');
    expect(customerBlocklistService.getPhoneVariants('01012345678')).toEqual(
      expect.arrayContaining(['01012345678', '1012345678', '201012345678']),
    );
  });

  test('blocks public checkout when an active phone rule matches', async () => {
    const rule = {
      id: 'rule-1',
      action: 'BLOCK_ORDERS',
      reasonCode: 'REPEATED_REFUSAL',
      status: 'ACTIVE',
      metadata: null,
    };
    const prisma = createPrisma(rule);

    const result = await customerBlocklistService.evaluateCustomerBlock(prisma, {
      companyId: 'company-1',
      phone: '+20 101 234 5678',
      source: 'public_checkout',
      paymentMethod: 'CASH',
    });

    expect(result.blocked).toBe(true);
    expect(result.payload.code).toBe('CUSTOMER_BLOCKED');
    expect(result.payload.message).toBe('checkout blocked');
    expect(prisma.customerBlockRule.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: 'company-1',
          status: 'ACTIVE',
        }),
      }),
    );
  });

  test('allows non-cash orders for COD-only block rules', async () => {
    const rule = {
      id: 'rule-1',
      action: 'BLOCK_COD_ONLY',
      reasonCode: 'REPEATED_REFUSAL',
      status: 'ACTIVE',
      metadata: null,
    };
    const prisma = createPrisma(rule);

    const result = await customerBlocklistService.evaluateCustomerBlock(prisma, {
      companyId: 'company-1',
      phone: '01012345678',
      source: 'manual',
      userRole: 'COMPANY_ADMIN',
      paymentMethod: 'INSTAPAY',
    });

    expect(result.blocked).toBe(false);
    expect(result.warning).toBe(true);
    expect(result.payload.action).toBe('BLOCK_COD_ONLY');
  });

  test('allows admin override for internal manual orders only when requested', async () => {
    const rule = {
      id: 'rule-1',
      action: 'REQUIRE_MANAGER_APPROVAL',
      reasonCode: 'OTHER',
      status: 'ACTIVE',
      metadata: null,
    };
    const prisma = createPrisma(rule);

    const blocked = await customerBlocklistService.evaluateCustomerBlock(prisma, {
      companyId: 'company-1',
      phone: '01012345678',
      source: 'manual',
      userRole: 'COMPANY_ADMIN',
      paymentMethod: 'CASH',
    });

    const overridden = await customerBlocklistService.evaluateCustomerBlock(prisma, {
      companyId: 'company-1',
      phone: '01012345678',
      source: 'manual',
      userRole: 'COMPANY_ADMIN',
      paymentMethod: 'CASH',
      allowOverride: true,
    });

    expect(blocked.blocked).toBe(true);
    expect(blocked.payload.code).toBe('CUSTOMER_REQUIRES_MANAGER_APPROVAL');
    expect(overridden.blocked).toBe(false);
    expect(overridden.overrideApplied).toBe(true);
  });

  test('fails open when customer block tables are missing locally', async () => {
    const prisma = {
      customerBlockSettings: {
        findUnique: jest.fn().mockResolvedValue(baseSettings),
      },
      customerBlockRule: {
        findFirst: jest.fn().mockRejectedValue({
          code: 'P2021',
          meta: { table: 'public.customer_block_rules' },
        }),
      },
    };

    const result = await customerBlocklistService.evaluateCustomerBlock(prisma, {
      companyId: 'company-1',
      phone: '01012345678',
      source: 'ai',
      paymentMethod: 'CASH',
    });

    expect(result.blocked).toBe(false);
    expect(result.payload).toBeNull();
  });
});
