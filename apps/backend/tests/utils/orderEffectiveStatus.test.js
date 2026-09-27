/**
 * Tests for utils/orderEffectiveStatus — المصدر الموحّد لـ "الحالة الفعلية"
 * (كود مخصص ← مرحلة تجهيز محوّلة ← enum). نفس الأولوية لازم تتعامل في
 * الليست والفلتر والإحصائيات عشان الصورة تبقى حقيقية.
 */

const {
  computeEffectiveOrderStatus,
  getMappedRegularOrderStatus,
  getEffectiveOrderStatusCounts,
} = require('../../utils/orderEffectiveStatus');

describe('utils/orderEffectiveStatus', () => {
  describe('computeEffectiveOrderStatus', () => {
    test('custom status code wins over enum and prep metadata', () => {
      const order = {
        status: 'ON_HOLD',
        customStatusCode: 'DELAYED-WITH-CAPTAIN',
        metadata: JSON.stringify({ preparationStatus: 'PREPARING' }),
      };
      expect(computeEffectiveOrderStatus(order)).toBe('DELAYED-WITH-CAPTAIN');
    });

    test('prep metadata maps to its regular status when no custom code', () => {
      expect(
        computeEffectiveOrderStatus({
          status: 'PROCESSING',
          metadata: JSON.stringify({ preparationStatus: 'PREPARING' }),
        })
      ).toBe('PROCESSING');
      expect(
        computeEffectiveOrderStatus({
          status: 'CONFIRMED',
          metadata: JSON.stringify({ preparationStatus: 'PENDING_PREPARATION' }),
        })
      ).toBe('CONFIRMED');
      expect(
        computeEffectiveOrderStatus({
          status: 'STOCK_SHORTAGE',
          metadata: JSON.stringify({ preparationStatus: 'ON_HOLD_STOCK' }),
        })
      ).toBe('STOCK_SHORTAGE');
      expect(
        computeEffectiveOrderStatus({
          status: 'ON_HOLD_PREP',
          metadata: JSON.stringify({ preparationStatus: 'ON_HOLD_PREP' }),
        })
      ).toBe('ON_HOLD_PREP');
    });

    test('falls back to the enum status (metadata as object, string, or broken JSON)', () => {
      expect(computeEffectiveOrderStatus({ status: 'SHIPPED', metadata: null })).toBe('SHIPPED');
      expect(computeEffectiveOrderStatus({ status: 'DELIVERED', metadata: { preparationStatus: null } })).toBe('DELIVERED');
      expect(computeEffectiveOrderStatus({ status: 'PENDING', metadata: '{broken' })).toBe('PENDING');
      expect(computeEffectiveOrderStatus(null)).toBe('PENDING');
    });

    test('terminal statuses (DELIVERED, RETURNED, SHIPPED) are not overridden by stale prep metadata', () => {
      expect(
        computeEffectiveOrderStatus({
          status: 'DELIVERED',
          metadata: JSON.stringify({ preparationStatus: 'PREPARING' }),
        })
      ).toBe('DELIVERED');
      expect(
        computeEffectiveOrderStatus({
          status: 'RETURNED',
          metadata: JSON.stringify({ preparationStatus: 'PACKAGED' }),
        })
      ).toBe('RETURNED');
      expect(
        computeEffectiveOrderStatus({
          status: 'SHIPPED',
          metadata: JSON.stringify({ preparationStatus: 'READY' }),
        })
      ).toBe('SHIPPED');
    });
  });

  describe('getMappedRegularOrderStatus', () => {
    test('mirrors the SQL CASE mapping exactly', () => {
      expect(getMappedRegularOrderStatus('PENDING_PREPARATION')).toBe('CONFIRMED');
      expect(getMappedRegularOrderStatus('STOCK_SHORTAGE')).toBe('STOCK_SHORTAGE');
      expect(getMappedRegularOrderStatus('PENDING_STOCK')).toBe('STOCK_SHORTAGE');
      expect(getMappedRegularOrderStatus('ON_HOLD_STOCK')).toBe('STOCK_SHORTAGE');
      expect(getMappedRegularOrderStatus('ON_HOLD_PREP')).toBe('ON_HOLD_PREP');
      expect(getMappedRegularOrderStatus('PREPARING')).toBe('PROCESSING');
      expect(getMappedRegularOrderStatus('PACKAGED')).toBe('PROCESSING');
    });
  });

  describe('getEffectiveOrderStatusCounts', () => {
    test('groups counts by effective status via raw SQL', async () => {
      const prisma = {
        $queryRawUnsafe: jest.fn().mockResolvedValue([
          { effective_status: 'PENDING', cnt: 12 },
          { effective_status: 'delayed_with_captain', cnt: 3 },
        ]),
      };
      const counts = await getEffectiveOrderStatusCounts(prisma, 'comp_1');
      expect(prisma.$queryRawUnsafe).toHaveBeenCalledTimes(1);
      expect(counts).toEqual({ PENDING: 12, DELAYED_WITH_CAPTAIN: 3 });
    });

    test('normalizes empty effective status to PENDING', async () => {
      const prisma = {
        $queryRawUnsafe: jest.fn().mockResolvedValue([{ effective_status: '', cnt: 1 }]),
      };
      const counts = await getEffectiveOrderStatusCounts(prisma, 'comp_1');
      expect(counts).toEqual({ PENDING: 1 });
    });
  });
});
