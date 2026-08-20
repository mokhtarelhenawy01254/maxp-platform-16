const loyaltyService = require('../../services/hr/customerLoyaltyService');
const sharedDatabase = require('../../services/sharedDatabase');

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
}));

describe('customerLoyaltyService auto-award & reversal guards', () => {
  const companyId = 'company-1';
  const customerId = 'customer-1';
  const programId = 'program-1';
  const orderId = 'order-1';

  let prisma;

  const program = {
    id: programId,
    companyId,
    type: 'POINTS',
    status: 'ACTIVE',
    pointsPerAmount: '100',
    pointsPerPurchase: '1',
    maxPointsPerTransaction: '500',
  };

  beforeEach(() => {
    prisma = {
      order: { findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
      customer: { findFirst: jest.fn() },
      customerLoyaltyProgram: { findMany: jest.fn(), findFirst: jest.fn() },
      customerLoyaltyTier: { findMany: jest.fn() },
      customerLoyaltyRecord: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
      returnRequest: { findFirst: jest.fn() },
    };
    sharedDatabase.getSharedPrismaClient.mockReturnValue(prisma);
    prisma.order.update.mockResolvedValue({});
    prisma.customerLoyaltyTier.findMany.mockResolvedValue([]);
    prisma.customerLoyaltyProgram.findMany.mockResolvedValue([program]);
    prisma.customerLoyaltyProgram.findFirst.mockResolvedValue(program);
    prisma.customer.findFirst.mockResolvedValue({ tierMethod: null });
  });

  describe('applyLoyaltyPointsForOrder', () => {
    it('skips awarding when points were already awarded for the order (dedup)', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: orderId,
        companyId,
        customerId,
        subtotal: 1000,
        total: 1000,
        orderNumber: 'ORD-1',
        metadata: JSON.stringify({ loyaltyPoints: { applied: true, appliedAt: '2026-08-02T00:00:00Z' } }),
      });

      const result = await loyaltyService.applyLoyaltyPointsForOrder({ orderId, companyId });

      expect(result).toEqual({ applied: false, reason: 'already_awarded' });
      expect(prisma.customerLoyaltyRecord.update).not.toHaveBeenCalled();
      expect(prisma.order.update).not.toHaveBeenCalled();
    });

    it('caps awarded points by maxPointsPerTransaction', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: orderId,
        companyId,
        customerId,
        subtotal: 100000,
        total: 100000,
        orderNumber: 'ORD-2',
        metadata: null,
      });
      const record = {
        id: 'record-1',
        companyId,
        customerId,
        programId,
        currentPoints: '0',
        totalEarned: '0',
        totalRedeemed: '0',
        status: 'ACTIVE',
        metadata: null,
      };
      prisma.customerLoyaltyRecord.findUnique
        .mockResolvedValueOnce(null)      // apply: no record -> enroll
        .mockResolvedValueOnce(null)      // enroll: no existing record -> create
        .mockResolvedValue(record);       // addPoints: record exists
      prisma.customerLoyaltyRecord.create.mockImplementation(async ({ data }) => ({ ...data, id: 'record-1' }));
      prisma.customerLoyaltyRecord.update.mockImplementation(async ({ data }) => ({ ...record, ...data, currentPoints: data.currentPoints.increment }));

      const result = await loyaltyService.applyLoyaltyPointsForOrder({ orderId, companyId });

      // 100000 / 100 = 1000 points, capped at 500
      expect(result.totalPointsAwarded).toBe(500);
      const metaUpdate = JSON.parse(prisma.order.update.mock.calls[0][0].data.metadata);
      expect(metaUpdate.loyaltyPoints.programs[0].points).toBe(500);
    });
  });

  describe('reverseLoyaltyPointsForReturn', () => {
    it('reverses points proportional to refund and prevents double reversal', async () => {
      prisma.returnRequest.findFirst.mockResolvedValue({
        id: 'return-1',
        companyId,
        refundAmount: 1000,
        order: {
          id: orderId,
          companyId,
          customerId,
          total: 1000,
          orderNumber: 'ORD-3',
          metadata: JSON.stringify({
            loyaltyPoints: {
              applied: true,
              programs: [{ programId, points: 10 }],
            },
          }),
        },
      });
      prisma.customerLoyaltyRecord.findUnique.mockResolvedValue({
        id: 'record-1',
        companyId,
        customerId,
        programId,
        currentPoints: '10',
        status: 'ACTIVE',
        metadata: null,
      });
      prisma.customerLoyaltyRecord.update.mockImplementation(async ({ data }) => ({
        currentPoints: data.currentPoints.decrement,
        ...data,
      }));

      const first = await loyaltyService.reverseLoyaltyPointsForReturn({ returnRequestId: 'return-1', companyId });
      expect(first.reversed).toBe(true);
      expect(first.points).toBe(10);
      // reversal recorded in metadata
      const metaUpdate = JSON.parse(prisma.order.update.mock.calls[0][0].data.metadata);
      expect(metaUpdate.loyaltyPoints.reversals['return-1'].points).toBe(10);

      // second attempt is blocked
      prisma.returnRequest.findFirst.mockResolvedValue({
        ...prisma.returnRequest.findFirst.mock.results[0].value,
        order: {
          ...prisma.returnRequest.findFirst.mock.results[0].value.order,
          metadata: JSON.stringify(metaUpdate),
        },
      });
      const second = await loyaltyService.reverseLoyaltyPointsForReturn({ returnRequestId: 'return-1', companyId });
      expect(second.reversed).toBe(false);
      expect(second.reason).toBe('already_reversed');
    });
  });

  describe('reverseLoyaltyPointsForOrder (cancel)', () => {
    it('reverses all awarded points on cancel and prevents double reversal', async () => {
      prisma.order.findFirst.mockResolvedValue({
        id: orderId,
        companyId,
        customerId,
        total: 1000,
        orderNumber: 'ORD-4',
        metadata: JSON.stringify({
          loyaltyPoints: {
            applied: true,
            programs: [{ programId, points: 10 }],
          },
        }),
      });
      prisma.customerLoyaltyRecord.findUnique.mockResolvedValue({
        id: 'record-1',
        companyId,
        customerId,
        programId,
        currentPoints: '10',
        totalEarned: '10',
        status: 'ACTIVE',
        metadata: null,
      });
      prisma.customerLoyaltyRecord.update.mockImplementation(async ({ data }) => ({
        currentPoints: data.currentPoints.decrement,
        totalEarned: data.totalEarned.decrement,
        ...data,
      }));
      prisma.order.update.mockResolvedValue({});

      const first = await loyaltyService.reverseLoyaltyPointsForOrder({ orderId, companyId, reason: '╪Ñ┘ä╪║╪º╪í' });
      expect(first.reversed).toBe(true);
      expect(first.points).toBe(10);
      expect(prisma.customerLoyaltyRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            totalEarned: { decrement: 10 },
          }),
        }),
      );

      // second cancel attempt blocked
      const metaUpdate = JSON.parse(prisma.order.update.mock.calls[0][0].data.metadata);
      expect(metaUpdate.loyaltyPoints.cancelledReversed).toBe(true);
      prisma.order.findFirst.mockResolvedValue({
        id: orderId,
        companyId,
        customerId,
        total: 1000,
        orderNumber: 'ORD-4',
        metadata: JSON.stringify(metaUpdate),
      });
      const second = await loyaltyService.reverseLoyaltyPointsForOrder({ orderId, companyId, reason: '╪Ñ┘ä╪║╪º╪í' });
      expect(second.reversed).toBe(false);
      expect(second.reason).toBe('already_reversed');
    });
  });

  describe('determineTier calculation methods', () => {
    const pointsTiers = [
      { id: 'plat', name: 'Platinum', nameAr: '╪¿┘ä╪º╪¬┘è┘å┘è', calculationType: 'POINTS', minPoints: '100', maxPoints: null, priority: 4 },
      { id: 'gold', name: 'Gold', nameAr: '╪░┘ç╪¿┘è', calculationType: 'POINTS', minPoints: '30', maxPoints: '99', priority: 3 },
      { id: 'silver', name: 'Silver', nameAr: '┘ü╪╢┘è', calculationType: 'POINTS', minPoints: '10', maxPoints: '29', priority: 2 },
      { id: 'bronze', name: 'Bronze', nameAr: '╪¿╪▒┘ê┘å╪▓┘è', calculationType: 'POINTS', minPoints: '0', maxPoints: '9', priority: 1 },
    ];

    const spentTiers = [
      { id: 'gold-spent', name: 'Gold', nameAr: '╪░┘ç╪¿┘è', calculationType: 'SPENT', minSpent: '5000', maxSpent: null, priority: 2 },
      { id: 'silver-spent', name: 'Silver', nameAr: '┘ü╪╢┘è', calculationType: 'SPENT', minSpent: '2000', maxSpent: '4999', priority: 1 },
    ];

    const itemsTiers = [
      { id: 'gold-items', name: 'Gold', nameAr: '╪░┘ç╪¿┘è', calculationType: 'ITEMS', minItems: 10, maxItems: null, priority: 2 },
      { id: 'silver-items', name: 'Silver', nameAr: '┘ü╪╢┘è', calculationType: 'ITEMS', minItems: 3, maxItems: 9, priority: 1 },
    ];

    it('returns Gold (not Platinum) for 30 points', async () => {
      prisma.customerLoyaltyTier.findMany.mockResolvedValue(pointsTiers);
      const tier = await loyaltyService.determineTier(companyId, programId, 30, 'POINTS');
      expect(tier?.id).toBe('gold');
    });

    it('returns Platinum only at 100 points', async () => {
      prisma.customerLoyaltyTier.findMany.mockResolvedValue(pointsTiers);
      const tier = await loyaltyService.determineTier(companyId, programId, 100, 'POINTS');
      expect(tier?.id).toBe('plat');
    });

    it('returns Silver for 10 points', async () => {
      prisma.customerLoyaltyTier.findMany.mockResolvedValue(pointsTiers);
      const tier = await loyaltyService.determineTier(companyId, programId, 10, 'POINTS');
      expect(tier?.id).toBe('silver');
    });

    it('returns Bronze for 5 points', async () => {
      prisma.customerLoyaltyTier.findMany.mockResolvedValue(pointsTiers);
      const tier = await loyaltyService.determineTier(companyId, programId, 5, 'POINTS');
      expect(tier?.id).toBe('bronze');
    });

    it('uses SPENT thresholds (5000 -> Gold, 3000 -> Silver)', async () => {
      prisma.customerLoyaltyTier.findMany.mockResolvedValue(spentTiers);
      const gold = await loyaltyService.determineTier(companyId, programId, 5000, 'SPENT');
      expect(gold?.id).toBe('gold-spent');
      const silver = await loyaltyService.determineTier(companyId, programId, 3000, 'SPENT');
      expect(silver?.id).toBe('silver-spent');
    });

    it('uses ITEMS thresholds (10 -> Gold, 5 -> Silver)', async () => {
      prisma.customerLoyaltyTier.findMany.mockResolvedValue(itemsTiers);
      const gold = await loyaltyService.determineTier(companyId, programId, 10, 'ITEMS');
      expect(gold?.id).toBe('gold-items');
      const silver = await loyaltyService.determineTier(companyId, programId, 5, 'ITEMS');
      expect(silver?.id).toBe('silver-items');
    });

    it('only matches tiers of the given calculation type', async () => {
      prisma.customerLoyaltyTier.findMany.mockImplementation(async ({ where }) =>
        where.calculationType === 'SPENT' ? spentTiers : []
      );
      const tier = await loyaltyService.determineTier(companyId, programId, 30, 'POINTS');
      expect(tier).toBeNull();
      const spent = await loyaltyService.determineTier(companyId, programId, 5000, 'SPENT');
      expect(spent?.id).toBe('gold-spent');
    });
  });
});
