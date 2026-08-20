/**
 * Tests for the per-status order status editing lock (allowStatusEdit).
 * ┘â┘ä ╪¡╪º┘ä╪⌐ ┘ä┘ç╪º ╪▓╪▒ "┘à╪│┘à┘ê╪¡ ╪º┘ä╪¬╪╣╪»┘è┘ä / ╪║┘è╪▒ ┘à╪│┘à┘ê╪¡". ╪╣┘å╪»┘à╪º ╪¬┘â┘ê┘å ╪º┘ä╪¡╪º┘ä╪⌐ ╪º┘ä╪¡╪º┘ä┘è╪⌐ ┘ä┘ä╪╖┘ä╪¿
 * ╪║┘è╪▒ ┘à╪│┘à┘ê╪¡ ╪¬╪╣╪»┘è┘ä┘ç╪º╪î ┘è╪▒┘ü╪╢ ╪ú┘è ╪¬╪║┘è┘è╪▒ ┘ä┘ä╪¡╪º┘ä╪⌐ (403).
 */

const {
  isOrderStatusEditingLocked,
  assertOrderStatusEditable,
} = require('../../utils/orderStatusLock');

describe('orderStatusLock util (per-status)', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('isOrderStatusEditingLocked', () => {
    test('returns true when the current status config has allowStatusEdit=false', async () => {
      const prismaMock = {
        orderStatusConfig: {
          findFirst: jest.fn().mockResolvedValue({ allowStatusEdit: false }),
        },
      };
      await expect(isOrderStatusEditingLocked(prismaMock, 'comp_1', 'DELIVERED')).resolves.toBe(true);
      expect(prismaMock.orderStatusConfig.findFirst).toHaveBeenCalledWith({
        where: {
          companyId: 'comp_1',
          OR: [
            { code: { equals: 'DELIVERED', mode: 'insensitive' } },
            { mapsToSystem: 'DELIVERED' },
          ],
        },
        select: { allowStatusEdit: true },
      });
    });

    test('returns false when the status allows editing', async () => {
      const prismaMock = {
        orderStatusConfig: {
          findFirst: jest.fn().mockResolvedValue({ allowStatusEdit: true }),
        },
      };
      await expect(isOrderStatusEditingLocked(prismaMock, 'comp_1', 'PENDING')).resolves.toBe(false);
    });

    test('returns false when no matching status config exists (fail-open)', async () => {
      const prismaMock = {
        orderStatusConfig: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
      };
      await expect(isOrderStatusEditingLocked(prismaMock, 'comp_1', 'PENDING')).resolves.toBe(false);
    });

    test('returns false (fail-open) when DB lookup throws', async () => {
      const prismaMock = {
        orderStatusConfig: {
          findFirst: jest.fn().mockRejectedValue(new Error('db down')),
        },
      };
      await expect(isOrderStatusEditingLocked(prismaMock, 'comp_1', 'PENDING')).resolves.toBe(false);
    });

    test('returns false when companyId or currentStatusCode is missing', async () => {
      const prismaMock = { orderStatusConfig: { findFirst: jest.fn() } };
      await expect(isOrderStatusEditingLocked(prismaMock, null, 'PENDING')).resolves.toBe(false);
      await expect(isOrderStatusEditingLocked(prismaMock, 'comp_1', null)).resolves.toBe(false);
      expect(prismaMock.orderStatusConfig.findFirst).not.toHaveBeenCalled();
    });

    test('matches custom status via mapsToSystem (stored enum code)', async () => {
      const prismaMock = {
        orderStatusConfig: {
          findFirst: jest.fn().mockResolvedValue({ allowStatusEdit: false }),
        },
      };
      await expect(isOrderStatusEditingLocked(prismaMock, 'comp_1', 'ON_HOLD')).resolves.toBe(true);
    });
  });

  describe('assertOrderStatusEditable', () => {
    test('throws 403 when the current status is locked', async () => {
      const prismaMock = {
        orderStatusConfig: {
          findFirst: jest.fn().mockResolvedValue({ allowStatusEdit: false }),
        },
      };
      await expect(
        assertOrderStatusEditable(prismaMock, 'comp_1', 'DELIVERED'),
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    test('resolves when the current status allows editing', async () => {
      const prismaMock = {
        orderStatusConfig: {
          findFirst: jest.fn().mockResolvedValue({ allowStatusEdit: true }),
        },
      };
      await expect(
        assertOrderStatusEditable(prismaMock, 'comp_1', 'PENDING'),
      ).resolves.toBeUndefined();
    });
  });
});
