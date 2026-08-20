/**
 * ≡ƒÆ│ Loyalty Tier Card Service ΓÇö unit tests (DB-free)
 * ┘è╪«╪¬╪¿╪▒ ╪¬┘ê┘ä┘è╪» ╪╡┘ê╪▒╪⌐ ╪º┘ä┘â╪º╪▒╪¬ ┘ê╪½╪¿╪º╪¬ ╪▒┘é┘à ╪º┘ä╪╣╪╢┘ê┘è╪⌐.
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
    test('┘è╪▒╪¼╪╣ ╪▒┘é┘à ╪╣╪╢┘ê┘è╪⌐ ╪¿╪╡┘è╪║╪⌐ MP-XXXX-XXXX', () => {
      expect(membershipNumberFromId('cmabc123')).toMatch(/^MP-\d{4}-\d{4}$/);
    });

    test('╪½╪º╪¿╪¬ ┘ä┘å┘ü╪│ ╪º┘ä┘à╪╣╪▒┘æ┘ü', () => {
      const a = membershipNumberFromId('cmabc123');
      const b = membershipNumberFromId('cmabc123');
      expect(a).toBe(b);
    });

    test('╪ú╪▒┘é╪º┘à ┘à╪«╪¬┘ä┘ü╪⌐ ┘ä┘à╪╣╪▒┘æ┘ü╪º╪¬ ┘à╪«╪¬┘ä┘ü╪⌐', () => {
      expect(membershipNumberFromId('cmabc123')).not.toBe(membershipNumberFromId('cmabc456'));
    });
  });

  describe('renderTierCard', () => {
    test('┘è╪▒╪¼╪╣ Buffer PNG ╪╡╪º┘ä╪¡', () => {
      const png = renderTierCard({
        customer: { firstName: '┘à╪¡┘à╪»', lastName: '╪╣╪¿╪»╪º┘ä┘ä┘ç' },
        tier: {
          name: 'GOLD',
          nameAr: '╪º┘ä╪╣┘à┘è┘ä ╪º┘ä╪░┘ç╪¿┘è',
          color: '#d4af37',
          icon: 'crown',
          benefits: JSON.stringify(['╪┤╪¡┘å ┘à╪¼╪º┘å┘è', '╪«╪╡┘à 10%']),
          calculationType: 'POINTS',
        },
        record: { id: 'cmrecord1', joinDate: new Date('2025-01-01') },
        companyName: '┘à╪¬╪¼╪▒ ╪º┘ä╪ú┘å╪º┘é╪⌐',
        membershipNumber: 'MP-1234-5678',
        points: 500,
        metricLabel: '┘å┘é╪╖╪⌐',
      });

      expect(Buffer.isBuffer(png)).toBe(true);
      expect(png.length).toBeGreaterThan(1000);
      expect(png.slice(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    });

    test('┘è╪¬╪¡┘à┘ä ┘ä┘ê┘å ╪║┘è╪▒ ╪╡╪º┘ä╪¡ ┘ê┘è╪▒╪¼╪╣ ┘â╪º╪▒╪¬', () => {
      const png = renderTierCard({
        customer: { firstName: '╪╣┘ä┘è', lastName: '╪¡╪│┘å' },
        tier: {
          name: 'SILVER',
          nameAr: '┘ü╪╢┘è',
          color: 'not-a-color',
          icon: 'gem',
          benefits: null,
          calculationType: 'POINTS',
        },
        record: { id: 'cmr2', joinDate: null },
        companyName: 'Store',
        membershipNumber: 'MP-9999-0000',
        points: 0,
        metricLabel: '┘å┘é╪╖╪⌐',
      });
      expect(Buffer.isBuffer(png)).toBe(true);
    });
  });

  describe('cardPublicPath', () => {
    test('┘è╪¿┘å┘è ┘à╪│╪º╪▒ URL ╪ó┘à┘å', () => {
      const url = cardPublicPath('comp-1', 'cust/../x', 'tier 1');
      expect(url).toMatch(/^\/uploads\/tier-cards\/comp-1\//);
      expect(url).not.toContain('..');
      expect(url).not.toContain(' ');
    });
  });

  describe('getOrGenerateTierCard', () => {
    test('┘è╪▒╪¼╪╣ null ╪¿╪ú┘à╪º┘å ╪╣┘å╪» ╪║┘è╪º╪¿ ╪º┘ä┘à╪│╪¬┘ê┘ë', async () => {
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
