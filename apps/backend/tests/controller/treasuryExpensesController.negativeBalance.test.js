const mockTx = {
  treasuryAccount: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  companyExpense: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  expenseCategory: {
    findUnique: jest.fn(),
  },
  treasuryTransaction: {
    create: jest.fn(),
  },
};

const mockPrisma = {
  $transaction: jest.fn(async (cb) => cb(mockTx)),
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
  safeQuery: jest.fn((fn) => fn()),
}));

const controller = require('../../controller/treasuryExpensesController');

function createMockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

describe('treasuryExpensesController - Negative Treasury Balance (Overdraft Support)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('createExpense allows recording a PAID expense when treasury balance is 0 and calculates negative balance', async () => {
    mockTx.treasuryAccount.findFirst.mockResolvedValue({
      id: 'acc-cash-1',
      companyId: 'comp-1',
      name: 'الخزينة النقدية الرئيسية (الكاش)',
      type: 'CASH',
      balance: 0,
      currency: 'EGP',
      isActive: true,
    });
    mockTx.companyExpense.findFirst.mockResolvedValue(null);
    mockTx.companyExpense.create.mockImplementation(async ({ data }) => ({
      id: 'exp-1',
      ...data,
    }));
    mockTx.treasuryAccount.update.mockResolvedValue({ id: 'acc-cash-1', balance: -250 });
    mockTx.treasuryTransaction.create.mockResolvedValue({ id: 'tx-1' });

    const req = {
      user: { companyId: 'comp-1', id: 'user-1' },
      body: {
        title: 'مصروف نقل وشحن',
        amount: 250,
        treasuryAccountId: 'acc-cash-1',
        status: 'PAID',
        type: 'OPEX',
      },
    };
    const res = createMockRes();

    await controller.createExpense(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.updatedBalance).toBe(-250);
    expect(mockTx.treasuryAccount.update).toHaveBeenCalledWith({
      where: { id: 'acc-cash-1' },
      data: { balance: -250 },
    });
    expect(mockTx.treasuryTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          treasuryAccountId: 'acc-cash-1',
          amount: -250,
          type: 'EXPENSE',
          runningBalance: -250,
        }),
      })
    );
  });

  test('updateExpense allows increasing a PAID expense beyond treasury balance and updates balance to negative', async () => {
    mockTx.companyExpense.findFirst.mockResolvedValue({
      id: 'exp-1',
      companyId: 'comp-1',
      expenseNumber: 'EXP-2609-0001',
      title: 'مصروف صيانة',
      amount: 100,
      treasuryAccountId: 'acc-cash-1',
      status: 'PAID',
      type: 'OPEX',
      paymentDate: new Date('2026-09-24T10:00:00Z'),
    });

    // First call in updateExpense: reverse previous deduction (-100 + 100 = 0)
    // Second call in updateExpense: deduct new amount (0 - 400 = -400)
    mockTx.treasuryAccount.findFirst
      .mockResolvedValueOnce({
        id: 'acc-cash-1',
        companyId: 'comp-1',
        balance: -100,
        isActive: true,
      })
      .mockResolvedValueOnce({
        id: 'acc-cash-1',
        companyId: 'comp-1',
        balance: 0,
        isActive: true,
      });

    mockTx.companyExpense.update.mockImplementation(async ({ data }) => ({
      id: 'exp-1',
      ...data,
    }));
    mockTx.treasuryAccount.findUnique.mockResolvedValue({ balance: -400 });

    const req = {
      user: { companyId: 'comp-1', id: 'user-1' },
      params: { id: 'exp-1' },
      body: {
        amount: 400,
        status: 'PAID',
      },
    };
    const res = createMockRes();

    await controller.updateExpense(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.updatedBalance).toBe(-400);
    expect(mockTx.treasuryAccount.update).toHaveBeenLastCalledWith({
      where: { id: 'acc-cash-1' },
      data: { balance: -400 },
    });
  });
});
