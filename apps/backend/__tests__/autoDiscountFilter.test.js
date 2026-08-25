/**
 * Regression test: auto-discount status filter (getCustomerIdsByAutoDiscountStatus)
 * Verifies the AVAILABLE and PRE_ACTIVATION branches return the correct customer
 * ids given active/unexpired vouchers and pre-activation delivered orders.
 */

const store = {};

const mockPrisma = {
  company: {
    findUnique: jest.fn(async ({ where }) => store[where.id] || null),
  },
  customerLoyaltyVoucher: {
    findMany: jest.fn(async ({ where }) => {
      const now = new Date();
      return store.vouchers.filter((v) => {
        if (v.companyId !== where.companyId) return false;
        if (where.status && v.status !== where.status) return false;
        if (where.customerId?.not === null && v.customerId === null) return false;
        if (where.expiresAt?.gt && !(new Date(v.expiresAt) > now)) return false;
        return true;
      });
    }),
  },
  order: {
    findMany: jest.fn(async ({ where }) => {
      return store.orders.filter((o) => {
        if (o.companyId !== where.companyId) return false;
        if (where.status && o.status !== where.status) return false;
        if (where.createdAt?.lt && !(new Date(o.createdAt) < where.createdAt.lt)) return false;
        if (where.createdAt?.gte && !(new Date(o.createdAt) >= where.createdAt.gte)) return false;
        return true;
      });
    }),
  },
};

jest.mock('../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
}));

const svc = require('../services/autoDiscountService');

beforeEach(() => {
  jest.clearAllMocks();
  store.c1 = {
    id: 'c1',
    loyaltySettings: JSON.stringify({
      autoDiscountEnabled: true,
      enabled: true,
      loyaltyActivatedAt: '2026-08-01T00:00:00.000Z',
      discountPercent: 10,
      validityDays: 3,
    }),
  };
  store.vouchers = [];
  store.orders = [];
});

describe('getCustomerIdsByAutoDiscountStatus', () => {
  it('returns customers with an ACTIVE, unexpired voucher for AVAILABLE', async () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    store.vouchers = [
      { companyId: 'c1', customerId: 'cust-a', status: 'ACTIVE', expiresAt: future },
      { companyId: 'c1', customerId: 'cust-b', status: 'ACTIVE', expiresAt: '2026-01-01T00:00:00.000Z' }, // expired
      { companyId: 'c1', customerId: null, status: 'ACTIVE', expiresAt: future }, // no customer
      { companyId: 'c1', customerId: 'cust-c', status: 'USED', expiresAt: future }, // used
    ];

    const ids = await svc.getCustomerIdsByAutoDiscountStatus('c1', 'AVAILABLE');
    expect(ids).toEqual(['cust-a']);
  });

  it('returns [] when auto-discount is not enabled', async () => {
    store.c1.loyaltySettings = JSON.stringify({ autoDiscountEnabled: false, enabled: true });
    store.vouchers = [
      { companyId: 'c1', customerId: 'cust-a', status: 'ACTIVE', expiresAt: new Date(Date.now() + 86400000).toISOString() },
    ];
    expect(await svc.getCustomerIdsByAutoDiscountStatus('c1', 'AVAILABLE')).toEqual([]);
  });

  it('returns customers with only pre-activation delivered orders for PRE_ACTIVATION', async () => {
    store.orders = [
      { companyId: 'c1', customerId: 'cust-p', status: 'DELIVERED', createdAt: '2026-07-15T00:00:00.000Z' },
      { companyId: 'c1', customerId: 'cust-both', status: 'DELIVERED', createdAt: '2026-07-15T00:00:00.000Z' },
      { companyId: 'c1', customerId: 'cust-both', status: 'DELIVERED', createdAt: '2026-08-15T00:00:00.000Z' },
      { companyId: 'c1', customerId: 'cust-post', status: 'DELIVERED', createdAt: '2026-08-15T00:00:00.000Z' },
    ];

    const ids = await svc.getCustomerIdsByAutoDiscountStatus('c1', 'PRE_ACTIVATION');
    expect(ids.sort()).toEqual(['cust-p']);
  });

  it('returns [] for unknown status', async () => {
    expect(await svc.getCustomerIdsByAutoDiscountStatus('c1', 'UNKNOWN')).toEqual([]);
  });
});