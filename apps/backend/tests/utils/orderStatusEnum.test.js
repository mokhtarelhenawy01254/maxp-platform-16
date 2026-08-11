/**
 * Tests for custom-status → enum resolution (PRODUCTION-FIX custom-status-enum).
 * Custom statuses (e.g. DELAYED-WITH-CAPTAIN) are not in the OrderStatus enum, so they
 * must be stored via their mapsToSystem while keeping the custom code for display/notification.
 */

const { isValidOrderStatusEnum, resolveOrderStatusForStorage } = require('../../utils/orderStatusEnum');
const { getPersistedNotificationEventType } = require('../../services/whatsapp/notificationTypes');

const prismaMock = {
  orderStatusConfig: {
    findFirst: jest.fn(),
  },
};

describe('orderStatusEnum util', () => {
  beforeEach(() => jest.clearAllMocks());

  test('valid enum statuses pass through unchanged (stored === notify)', async () => {
    const res = await resolveOrderStatusForStorage(prismaMock, 'comp_1', 'SHIPPED');
    expect(res).toEqual({ stored: 'SHIPPED', notify: 'SHIPPED' });
    expect(prismaMock.orderStatusConfig.findFirst).not.toHaveBeenCalled();
  });

  test('custom status with valid mapsToSystem → stored = mapped enum, notify = custom code', async () => {
    prismaMock.orderStatusConfig.findFirst.mockResolvedValue({ mapsToSystem: 'ON_HOLD' });

    const res = await resolveOrderStatusForStorage(prismaMock, 'comp_1', 'DELAYED-WITH-CAPTAIN');
    expect(prismaMock.orderStatusConfig.findFirst).toHaveBeenCalledWith({
      where: { companyId: 'comp_1', code: { equals: 'DELAYED-WITH-CAPTAIN', mode: 'insensitive' }, isActive: true },
      select: { mapsToSystem: true },
    });
    expect(res).toEqual({ stored: 'ON_HOLD', notify: 'DELAYED-WITH-CAPTAIN' });
  });

  test('custom status WITHOUT valid mapsToSystem → stored = null (cannot be stored)', async () => {
    prismaMock.orderStatusConfig.findFirst.mockResolvedValue({ mapsToSystem: '' });
    const res = await resolveOrderStatusForStorage(prismaMock, 'comp_1', 'MY_CUSTOM_STATUS');
    expect(res).toEqual({ stored: null, notify: 'MY_CUSTOM_STATUS' });

    prismaMock.orderStatusConfig.findFirst.mockResolvedValue({ mapsToSystem: 'NOT_A_STATUS' });
    const res2 = await resolveOrderStatusForStorage(prismaMock, 'comp_1', 'MY_CUSTOM_STATUS');
    expect(res2.stored).toBeNull();
  });

  test('isValidOrderStatusEnum', () => {
    expect(isValidOrderStatusEnum('SHIPPED')).toBe(true);
    expect(isValidOrderStatusEnum('shipped')).toBe(true);
    expect(isValidOrderStatusEnum('DELAYED-WITH-CAPTAIN')).toBe(false);
    expect(isValidOrderStatusEnum('')).toBe(false);
  });
});

describe('getPersistedNotificationEventType fallback (log enum safety)', () => {
  test('standard order statuses map to ORDER_* enum values', () => {
    expect(getPersistedNotificationEventType('SHIPPED')).toBe('ORDER_SHIPPED');
    expect(getPersistedNotificationEventType('DELIVERED')).toBe('ORDER_DELIVERED');
    expect(getPersistedNotificationEventType('CANCELLED')).toBe('ORDER_CANCELLED');
  });

  test('known enum values pass through', () => {
    expect(getPersistedNotificationEventType('ON_HOLD')).toBe('ON_HOLD');
    expect(getPersistedNotificationEventType('ORDER_CREATED')).toBe('ORDER_CREATED');
  });

  test('custom status codes not in the enum fall back to a safe value (no log crash)', () => {
    expect(getPersistedNotificationEventType('DELAYED-WITH-CAPTAIN')).toBe('ANNOUNCEMENT');
    expect(getPersistedNotificationEventType('CUSTOM_SOMETHING')).toBe('ANNOUNCEMENT');
  });
});
