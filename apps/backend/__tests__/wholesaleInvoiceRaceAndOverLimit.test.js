function createLockableMockPrisma({
  initialBalance = 150,
  customerCompanyId = 'comp-1',
  orderRecord = null,
  overLimitAggregate = null,
} = {}) {
  let balance = initialBalance;
  const transactions = [];
  let lockChain = Promise.resolve();
  let txSeq = 0;

  const client = {
    wholesaleCustomer: {
      findFirst: jest.fn(async ({ where }) => {
        if (where.companyId !== customerCompanyId) return null;
        if (where.id && where.id !== 'wc-1') return null;
        if (where.customerId && where.customerId !== 'cust-1') return null;
        return {
          id: 'wc-1',
          customerId: 'cust-1',
          companyId: customerCompanyId,
          currentBalance: balance,
          creditLimit: 10000,
          isActive: true,
        };
      }),
      findUnique: jest.fn(async ({ where }) => {
        if (where.id !== 'wc-1') return null;
        return {
          id: 'wc-1',
          customerId: 'cust-1',
          companyId: customerCompanyId,
          currentBalance: balance,
        };
      }),
      findMany: jest.fn(async () => []),
      update: jest.fn(async ({ where, data }) => {
        if (where.id !== 'wc-1') throw new Error('Not found');
        balance = Number(data.currentBalance);
        return { id: 'wc-1', currentBalance: balance };
      }),
    },
    order: {
      findUnique: jest.fn(async ({ where }) => {
        if (!orderRecord || where.id !== orderRecord.id) return null;
        return orderRecord;
      }),
      findMany: jest.fn(async () => []),
      count: jest.fn(async () => 0),
      aggregate: jest.fn(async () => ({ _sum: { total: 0 } })),
    },
    wholesaleTransaction: {
      findFirst: jest.fn(async ({ where }) => {
        return (
          transactions.find(
            (t) =>
              t.wholesaleCustomerId === where.wholesaleCustomerId &&
              (!where.companyId || t.companyId === where.companyId) &&
              t.referenceType === where.referenceType &&
              t.referenceId === where.referenceId &&
              t.type === where.type
          ) || null
        );
      }),
      create: jest.fn(async ({ data }) => {
        txSeq += 1;
        const row = { id: `tx-${txSeq}`, ...data };
        transactions.push(row);
        return row;
      }),
    },
    $queryRawUnsafe: jest.fn(async (sql, ...params) => {
      if (sql.includes('FOR UPDATE')) {
        const [wcId, compId] = params;
        if (wcId !== 'wc-1' || compId !== customerCompanyId) return [];
        return [{ id: 'wc-1' }];
      }
      if (sql.includes('totalOverLimitAmount')) {
        return overLimitAggregate || [{ count: 0, totalOverLimitAmount: 0 }];
      }
      return [];
    }),
    $transaction: jest.fn(async (cb) => {
      // Simulate PostgreSQL row lock serialization across concurrent transactions
      const run = lockChain.then(() => cb(client));
      lockChain = run.catch(() => {});
      return run;
    }),
    _getState: () => ({ balance, transactions: [...transactions] }),
  };

  return client;
}

let activeMockPrisma = createLockableMockPrisma();

jest.mock('../services/sharedDatabase', () => ({
  getSharedPrismaClient: () => activeMockPrisma,
}));

const { wholesaleService } = require('../services/wholesaleService');

describe('Wholesale Invoice Race-Safety & Over-Limit Uncap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('concurrent Promise.all recordOrderInvoice creates only 1 INVOICE and increments balance once', async () => {
    activeMockPrisma = createLockableMockPrisma({
      initialBalance: 150,
      customerCompanyId: 'comp-1',
      orderRecord: { id: 'ord-race-1', companyId: 'comp-1', status: 'CONFIRMED' },
    });

    const order = {
      id: 'ord-race-1',
      orderNumber: 'ORD-RACE-1',
      wholesaleCustomerId: 'wc-1',
      companyId: 'comp-1',
      total: 500,
      status: 'CONFIRMED',
    };

    const [tx1, tx2] = await Promise.all([
      wholesaleService.recordOrderInvoice(order),
      wholesaleService.recordOrderInvoice(order),
    ]);

    expect(tx1).toBeTruthy();
    expect(tx2).toBeTruthy();
    expect(tx1.id).toBe(tx2.id);

    const state = activeMockPrisma._getState();
    expect(state.transactions).toHaveLength(1);
    expect(state.transactions[0].amount).toBe(500);
    expect(state.transactions[0].balanceBefore).toBe(150);
    expect(state.transactions[0].balanceAfter).toBe(650);
    expect(state.balance).toBe(650);
  });

  test('returns null safely for null order, missing companyId, cross-tenant order, or cancelled order', async () => {
    activeMockPrisma = createLockableMockPrisma({
      initialBalance: 150,
      customerCompanyId: 'comp-1',
      orderRecord: { id: 'ord-other-comp', companyId: 'comp-2', status: 'CONFIRMED' },
    });

    await expect(wholesaleService.recordOrderInvoice(null)).resolves.toBeNull();
    await expect(wholesaleService.recordOrderInvoice({ id: 'o1' })).resolves.toBeNull();
    await expect(
      wholesaleService.recordOrderInvoice({
        id: 'o-cancelled',
        wholesaleCustomerId: 'wc-1',
        companyId: 'comp-1',
        total: 500,
        status: 'CANCELLED',
      })
    ).resolves.toBeNull();
    await expect(
      wholesaleService.recordOrderInvoice({
        id: 'ord-other-comp',
        wholesaleCustomerId: 'wc-1',
        companyId: 'comp-1',
        total: 500,
        status: 'CONFIRMED',
      })
    ).resolves.toBeNull();

    const state = activeMockPrisma._getState();
    expect(state.transactions).toHaveLength(0);
    expect(state.balance).toBe(150);
  });

  test('rejects DB order that was cancelled before invoice transaction ran or belongs to another wholesale customer', async () => {
    activeMockPrisma = createLockableMockPrisma({
      initialBalance: 300,
      customerCompanyId: 'comp-1',
      orderRecord: {
        id: 'ord-db-cancelled',
        companyId: 'comp-1',
        status: 'CANCELLED',
        wholesaleCustomerId: 'wc-1',
      },
    });

    const res = await wholesaleService.recordOrderInvoice({
      id: 'ord-db-cancelled',
      wholesaleCustomerId: 'wc-1',
      companyId: 'comp-1',
      total: 400,
    });

    expect(res).toBeNull();
    expect(activeMockPrisma._getState().transactions).toHaveLength(0);
    expect(activeMockPrisma._getState().balance).toBe(300);

    // Order belongs to a different wholesaleCustomerId in DB
    activeMockPrisma = createLockableMockPrisma({
      initialBalance: 300,
      customerCompanyId: 'comp-1',
      orderRecord: {
        id: 'ord-wc2',
        companyId: 'comp-1',
        status: 'CONFIRMED',
        wholesaleCustomerId: 'wc-2',
      },
    });

    const mismatchRes = await wholesaleService.recordOrderInvoice({
      id: 'ord-wc2',
      wholesaleCustomerId: 'wc-1',
      companyId: 'comp-1',
      total: 400,
    });

    expect(mismatchRes).toBeNull();
    expect(activeMockPrisma._getState().transactions).toHaveLength(0);
  });

  test('getManageQueue uses uncapped SQL aggregate for overLimitDistributorsCount & totalOverLimitAmount while list stays capped <= 200', async () => {
    activeMockPrisma = createLockableMockPrisma({
      overLimitAggregate: [{ count: 72, totalOverLimitAmount: 498119 }],
    });

    const cappedCustomers = Array.from({ length: 200 }, (_, idx) => ({
      id: `wc-${idx + 1}`,
      customerId: `cust-${idx + 1}`,
      currentBalance: 10000 + idx,
      creditLimit: idx < 71 ? 3000 + idx : 20000,
      isActive: true,
      notes: null,
      updatedAt: new Date(),
      customer: { id: `cust-${idx + 1}`, firstName: 'موزع', lastName: `${idx + 1}`, phone: '010' },
    }));

    activeMockPrisma.wholesaleCustomer.findMany.mockImplementation(async ({ where }) => {
      if (where.isActive === false) return [];
      return cappedCustomers;
    });

    const result = await wholesaleService.getManageQueue({
      companyId: 'qr5vitkkllbbksib3tu9walg',
      period: 'all',
    });

    expect(result.counts.overLimitDistributorsCount).toBe(72);
    expect(result.counts.totalOverLimitAmount).toBe(498119);
    expect(result.groups.overLimitDistributors.length).toBeLessThanOrEqual(200);
    expect(result.groups.overLimitDistributors.length).toBe(71);
    expect(activeMockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('FROM "wholesale_customers"'),
      'qr5vitkkllbbksib3tu9walg'
    );

    // Rejects missing companyId
    await expect(wholesaleService.getManageQueue({ companyId: '' })).rejects.toThrow('معرف الشركة مطلوب');
  });
});
