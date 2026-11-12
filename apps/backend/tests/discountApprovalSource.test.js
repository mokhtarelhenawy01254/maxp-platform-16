/**
 * Unit tests for discount approval source & auto-release (TASK 33bf4717)
 * Proves that SYSTEM discounts (electronic payment, etc.) never require approval,
 * while MANUAL discounts (appliedAdminDiscount) still require approval.
 */

const {
  resolveCheckoutPricing,
  resolveDiscountApproval,
  resolveDiscountSource,
  DISCOUNT_SOURCE,
  DISCOUNT_APPROVAL_STATUS,
} = require('../utils/orderDiscountUtils');

describe('Discount Approval Source & Resolution (TASK 33bf4717)', () => {
  const mockCompanyId = 'comp-test-swan-33bf';

  const createMockPrisma = (options = {}) => {
    const {
      discountEnabled = true,
      discountPercent = 10,
      isWalletEnabled = false,
      companySettings = { requireDiscountApproval: true },
    } = options;

    return {
      storefrontSettings: {
        findUnique: jest.fn().mockResolvedValue({
          walletPaymentSettings: JSON.stringify({
            enabled: isWalletEnabled,
            discountEnabled,
            discountPercent,
            showDiscountBadge: true,
          }),
          enabledPaymentMethods: JSON.stringify(['cod', 'card']),
        }),
      },
      company: {
        findUnique: jest.fn().mockResolvedValue({
          settings: JSON.stringify(companySettings),
        }),
      },
      coupon: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      order: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      customer: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      customerLoyaltyTier: {
        count: jest.fn().mockResolvedValue(0),
      },
      storePromotion: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
  };

  test('Case 1: Card + 10% + requireDiscountApproval: true -> walletDiscount = 85 on subtotal 850, orderMetadata.needsDiscountApproval is not true, discountSource === SYSTEM', async () => {
    const prisma = createMockPrisma({ discountEnabled: true, discountPercent: 10 });

    const result = await resolveCheckoutPricing({
      prisma,
      companyId: mockCompanyId,
      subtotal: 850,
      shippingCost: 0,
      paymentMethod: 'card',
    });

    expect(result.subtotal).toBe(850);
    expect(result.walletDiscount).toBe(85);
    expect(result.discountAmount).toBe(85);
    expect(result.orderMetadata.discountSource).toBe(DISCOUNT_SOURCE.SYSTEM);
    expect(result.orderMetadata.needsDiscountApproval).toBeUndefined();
    expect(result.orderMetadata.discountApprovalStatus).toBeUndefined();
  });

  test('Case 2: appliedAdminDiscount: 170 (20%) on subtotal 850 -> discountSource === MANUAL and discountApprovalStatus === PENDING_APPROVAL', async () => {
    const prisma = createMockPrisma({ discountEnabled: false });

    const result = await resolveCheckoutPricing({
      prisma,
      companyId: mockCompanyId,
      subtotal: 850,
      shippingCost: 0,
      appliedAdminDiscount: 170,
      paymentMethod: 'cod',
    });

    expect(result.discountAmount).toBe(170);
    expect(result.orderMetadata.discountSource).toBe(DISCOUNT_SOURCE.MANUAL);
    expect(result.orderMetadata.needsDiscountApproval).toBe(true);
    expect(result.orderMetadata.discountApprovalStatus).toBe('PENDING_APPROVAL');
  });

  test('Case 3: resolveDiscountApproval({ paymentStatus: "COMPLETED", discountSource: "SYSTEM", discountAmount: 85, requireDiscountApproval: true }) -> AUTO_APPROVED_PAID + needsDiscountApproval === false', () => {
    const result = resolveDiscountApproval({
      paymentStatus: 'COMPLETED',
      discountSource: DISCOUNT_SOURCE.SYSTEM,
      discountAmount: 85,
      requireDiscountApproval: true,
    });

    expect(result.discountApprovalStatus).toBe('AUTO_APPROVED_PAID');
    expect(result.needsDiscountApproval).toBe(false);
    expect(result.discountSource).toBe(DISCOUNT_SOURCE.SYSTEM);
  });

  test('Case 4: appliedAdminDiscount + paymentStatus: "COMPLETED" -> still PENDING_APPROVAL (paid does not approve manual discount)', () => {
    const source = resolveDiscountSource({ appliedAdminDiscount: 170 });
    expect(source).toBe(DISCOUNT_SOURCE.MANUAL);

    const result = resolveDiscountApproval({
      paymentStatus: 'COMPLETED',
      discountSource: source,
      discountAmount: 170,
      requireDiscountApproval: true,
    });

    expect(result.discountApprovalStatus).toBe('PENDING_APPROVAL');
    expect(result.needsDiscountApproval).toBe(true);
    expect(result.discountSource).toBe(DISCOUNT_SOURCE.MANUAL);
  });
});
