/**
 * Tests for the per-status order status editing lock (allowStatusEdit).
 * كل حالة لها زر "مسموح التعديل / غير مسموح". عندما تكون الحالة الحالية للطلب
 * غير مسموح تعديلها، يرفض أي تعديل لبيانات الطلب (403).
 */

const {
  isOrderStatusEditingLocked,
  assertOrderStatusEditable,
  resolveStatusCode,
  createLockError,
} = require('../../utils/orderStatusLock');

describe('orderStatusLock util (per-status)', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('resolveStatusCode helper', () => {
    test('extracts customStatusCode from order object when present', () => {
      expect(resolveStatusCode({ customStatusCode: 'vip_confirmed', status: 'CONFIRMED' })).toBe('VIP_CONFIRMED');
    });

    test('falls back to status from order object when customStatusCode is not present', () => {
      expect(resolveStatusCode({ status: 'shipped' })).toBe('SHIPPED');
    });

    test('normalizes raw string code', () => {
      expect(resolveStatusCode('  pending  ')).toBe('PENDING');
    });

    test('returns empty string for null or empty input', () => {
      expect(resolveStatusCode(null)).toBe('');
      expect(resolveStatusCode({})).toBe('');
    });
  });

  describe('isOrderStatusEditingLocked', () => {
    test('queries by exact code (insensitive) and returns true when allowStatusEdit=false', async () => {
      const prismaMock = {
        orderStatusConfig: {
          findFirst: jest.fn().mockResolvedValue({ allowStatusEdit: false }),
        },
      };
      await expect(isOrderStatusEditingLocked(prismaMock, 'comp_1', 'DELIVERED')).resolves.toBe(true);
      expect(prismaMock.orderStatusConfig.findFirst).toHaveBeenCalledWith({
        where: {
          companyId: 'comp_1',
          code: { equals: 'DELIVERED', mode: 'insensitive' },
        },
        select: { allowStatusEdit: true },
      });
    });

    // (1) الحالة التي كانت تقفل طلباً نظامياً بالخطأ:
    test('(Fix 1 Proof) regular system order (SHIPPED) is NOT locked by another custom status mapping to SHIPPED', async () => {
      const prismaMock = {
        orderStatusConfig: {
          // The database returns null for code: 'SHIPPED' because only a custom status (e.g. OUT_FOR_DELIVERY_2)
          // had allowStatusEdit=false with mapsToSystem='SHIPPED'. Since we no longer search by mapsToSystem,
          // code: 'SHIPPED' returns null (or allowStatusEdit=true) and regular order is editable!
          findFirst: jest.fn().mockImplementation(({ where }) => {
            if (where.code?.equals === 'SHIPPED') {
              return Promise.resolve(null); // System status row has no lock
            }
            return Promise.resolve({ allowStatusEdit: false });
          }),
        },
      };

      // Order with status: 'SHIPPED' and no customStatusCode
      const regularOrder = { status: 'SHIPPED', customStatusCode: null };
      const isLocked = await isOrderStatusEditingLocked(prismaMock, 'comp_1', regularOrder);
      expect(isLocked).toBe(false);
      expect(prismaMock.orderStatusConfig.findFirst).toHaveBeenCalledWith({
        where: {
          companyId: 'comp_1',
          code: { equals: 'SHIPPED', mode: 'insensitive' },
        },
        select: { allowStatusEdit: true },
      });
    });

    // (2) الحالة السليمة للقفل على الحالة المخصصة:
    test('(Fix 2 Proof) custom status order IS locked when custom status has allowStatusEdit=false', async () => {
      const prismaMock = {
        orderStatusConfig: {
          findFirst: jest.fn().mockImplementation(({ where }) => {
            if (where.code?.equals === 'OUT_FOR_DELIVERY_2') {
              return Promise.resolve({ allowStatusEdit: false });
            }
            return Promise.resolve({ allowStatusEdit: true });
          }),
        },
      };

      const customOrder = { status: 'SHIPPED', customStatusCode: 'OUT_FOR_DELIVERY_2' };
      const isLocked = await isOrderStatusEditingLocked(prismaMock, 'comp_1', customOrder);
      expect(isLocked).toBe(true);
      expect(prismaMock.orderStatusConfig.findFirst).toHaveBeenCalledWith({
        where: {
          companyId: 'comp_1',
          code: { equals: 'OUT_FOR_DELIVERY_2', mode: 'insensitive' },
        },
        select: { allowStatusEdit: true },
      });
    });

    // (3) الحالة السليمة للقفل الصريح على الحالة النظامية نفسها:
    test('(Fix 3 Proof) regular order IS locked when its own system status has allowStatusEdit=false', async () => {
      const prismaMock = {
        orderStatusConfig: {
          findFirst: jest.fn().mockImplementation(({ where }) => {
            if (where.code?.equals === 'DELIVERED') {
              return Promise.resolve({ allowStatusEdit: false });
            }
            return Promise.resolve({ allowStatusEdit: true });
          }),
        },
      };

      const regularDeliveredOrder = { status: 'DELIVERED', customStatusCode: null };
      const isLocked = await isOrderStatusEditingLocked(prismaMock, 'comp_1', regularDeliveredOrder);
      expect(isLocked).toBe(true);
      expect(prismaMock.orderStatusConfig.findFirst).toHaveBeenCalledWith({
        where: {
          companyId: 'comp_1',
          code: { equals: 'DELIVERED', mode: 'insensitive' },
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

    // (4) اختبار مسار التجاوز: التحقق من قفل تعديل البيانات على طلب مقفل
    test('(Bypassed Route Guard) protects discount approval and order edits when status is locked', async () => {
      const prismaMock = {
        orderStatusConfig: {
          findFirst: jest.fn().mockResolvedValue({ allowStatusEdit: false }),
        },
      };
      const order = { id: 'ord_123', orderNumber: '1001', status: 'DELIVERED', customStatusCode: null };

      // Simulate a route attempting to modify discount or order details:
      const handleDiscountApproval = async (ord) => {
        await assertOrderStatusEditable(prismaMock, 'comp_1', ord.customStatusCode || ord.status);
        return { success: true };
      };

      await expect(handleDiscountApproval(order)).rejects.toMatchObject({
        statusCode: 403,
        message: expect.stringContaining('DELIVERED'),
      });
    });
  });
});
