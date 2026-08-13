/**
 * 💳 Loyalty Tier Card Service — unit tests (DB-free)
 * يختبر توليد صورة الكارت وثبات رقم العضوية.
 */

const {
  renderTierCard,
  membershipNumberFromId,
  getOrGenerateTierCard,
  cardPublicPath,
} = require('../../services/loyalty/loyaltyTierCardService');

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
}));

describe('loyaltyTierCardService', () => {
  describe('membershipNumberFromId', () => {
    test('يرجع رقم عضوية بصيغة MP-XXXX-XXXX', () => {
      expect(membershipNumberFromId('cmabc123')).toMatch(/^MP-\d{4}-\d{4}$/);
    });

    test('ثابت لنفس المعرّف', () => {
      const a = membershipNumberFromId('cmabc123');
      const b = membershipNumberFromId('cmabc123');
      expect(a).toBe(b);
    });

    test('أرقام مختلفة لمعرّفات مختلفة', () => {
      expect(membershipNumberFromId('cmabc123')).not.toBe(membershipNumberFromId('cmabc456'));
    });
  });

  describe('renderTierCard', () => {
    test('يرجع Buffer PNG صالح', () => {
      const png = renderTierCard({
        customer: { firstName: 'محمد', lastName: 'عبدالله' },
        tier: {
          name: 'GOLD',
          nameAr: 'العميل الذهبي',
          color: '#d4af37',
          icon: 'crown',
          benefits: JSON.stringify(['شحن مجاني', 'خصم 10%']),
          calculationType: 'POINTS',
        },
        record: { id: 'cmrecord1', joinDate: new Date('2025-01-01') },
        companyName: 'متجر الأناقة',
        membershipNumber: 'MP-1234-5678',
        points: 500,
        metricLabel: 'نقطة',
      });

      expect(Buffer.isBuffer(png)).toBe(true);
      expect(png.length).toBeGreaterThan(1000);
      expect(png.slice(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    });

    test('يتحمل لون غير صالح ويرجع كارت', () => {
      const png = renderTierCard({
        customer: { firstName: 'علي', lastName: 'حسن' },
        tier: {
          name: 'SILVER',
          nameAr: 'فضي',
          color: 'not-a-color',
          icon: 'gem',
          benefits: null,
          calculationType: 'POINTS',
        },
        record: { id: 'cmr2', joinDate: null },
        companyName: 'Store',
        membershipNumber: 'MP-9999-0000',
        points: 0,
        metricLabel: 'نقطة',
      });
      expect(Buffer.isBuffer(png)).toBe(true);
    });
  });

  describe('cardPublicPath', () => {
    test('يبني مسار URL آمن', () => {
      const url = cardPublicPath('comp-1', 'cust/../x', 'tier 1');
      expect(url).toMatch(/^\/uploads\/tier-cards\/comp-1\//);
      expect(url).not.toContain('..');
      expect(url).not.toContain(' ');
    });
  });

  describe('getOrGenerateTierCard', () => {
    test('يرجع null بأمان عند غياب المستوى', async () => {
      const sharedDatabase = require('../../services/sharedDatabase');
      const prisma = {
        customerLoyaltyTier: { findFirst: jest.fn().mockResolvedValue(null) },
        customerLoyaltyRecord: { findFirst: jest.fn().mockResolvedValue(null) },
        customer: { findFirst: jest.fn().mockResolvedValue(null) },
        company: { findUnique: jest.fn().mockResolvedValue(null) },
      };
      sharedDatabase.getSharedPrismaClient.mockReturnValue(prisma);

      const result = await getOrGenerateTierCard({
        companyId: 'comp-1',
        customerId: 'cust-1',
        tierId: 'tier-1',
      });

      expect(result.url).toBeNull();
      expect(result.tierId).toBeNull();
    });
  });
});
