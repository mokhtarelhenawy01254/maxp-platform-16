jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const controller = require('../../controller/radiologyInsuranceController');

const createResponse = () => {
  const response = {
    statusCode: 200,
    payload: null,
    sent: null,
    status: jest.fn((code) => {
      response.statusCode = code;
      return response;
    }),
    json: jest.fn((payload) => {
      response.payload = payload;
      return response;
    }),
    setHeader: jest.fn(),
    send: jest.fn((data) => {
      response.sent = data;
      return response;
    }),
  };
  return response;
};

const createPrisma = (overrides = {}) => {
  const prisma = {
    insuranceCompany: {
      findFirst: jest.fn(),
    },
    radiologyExamType: {
      findMany: jest.fn(),
    },
    radiologyStudy: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    radiologyInsuranceInvoice: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    radiologyInsuranceInvoiceItem: {
      createMany: jest.fn(),
    },
    radiologyInsuranceLedgerEntry: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn((fn) => fn(prisma)),
    ...overrides,
  };
  return prisma;
};

const req = (overrides = {}) => ({
  user: { companyId: 'company-1', id: 'user-1', firstName: 'أحمد', lastName: 'محمود' },
  query: {},
  params: {},
  body: {},
  ...overrides,
});

const makeEntity = (overrides = {}) => ({
  id: 'ins-1',
  companyId: 'company-1',
  name: 'شركة الأهلية للتأمين',
  priceListId: null,
  isActive: true,
  ...overrides,
});

const makeStudy = (overrides = {}) => ({
  id: 'study-1',
  companyId: 'company-1',
  patientName: 'محمد علي',
  examTypeId: 'et-1',
  examTypeName: 'أشعة مقطعية',
  status: 'IMAGED',
  ...overrides,
});

const makeInvoice = (overrides = {}) => ({
  id: 'inv-1',
  companyId: 'company-1',
  invoiceNumber: 'INS-20260810-1234',
  insuranceCompanyId: 'ins-1',
  insuranceCompanyName: 'شركة الأهلية للتأمين',
  totalAmount: 800,
  paidAmount: 0,
  remainingAmount: 800,
  status: 'OPEN',
  periodFrom: null,
  periodTo: null,
  notes: null,
  createdAt: new Date('2026-08-10T10:00:00.000Z'),
  updatedAt: new Date('2026-08-10T10:00:00.000Z'),
  ...overrides,
});

describe('radiologyInsuranceController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('company scoping', () => {
    test('returns 403 when companyId is missing', async () => {
      const prisma = createPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createInvoice(req({ user: {}, body: { insuranceCompanyId: 'ins-1' } }), res);

      expect(res.statusCode).toBe(403);
      expect(res.payload.error).toBe('غير مصرح');
      expect(prisma.insuranceCompany.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('assignStudyInsurance', () => {
    test('assigns an insurance company to a study in the company', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findFirst.mockResolvedValue(makeStudy());
      prisma.insuranceCompany.findFirst.mockResolvedValue(makeEntity());
      prisma.radiologyStudy.update.mockImplementation(({ data }) => Promise.resolve({ ...makeStudy(), ...data }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.assignStudyInsurance(
        req({ params: { id: 'study-1' }, body: { insuranceCompanyId: 'ins-1' } }),
        res
      );

      expect(res.statusCode).toBe(200);
      expect(prisma.radiologyStudy.findFirst).toHaveBeenCalledWith({
        where: { id: 'study-1', companyId: 'company-1' },
      });
      expect(prisma.insuranceCompany.findFirst).toHaveBeenCalledWith({
        where: { id: 'ins-1', companyId: 'company-1' },
        select: { id: true, name: true },
      });
      expect(prisma.radiologyStudy.update).toHaveBeenCalledWith({
        where: { id: 'study-1' },
        data: { insuranceCompanyId: 'ins-1', insuranceCompanyName: 'شركة الأهلية للتأمين' },
      });
      expect(res.payload.data.insuranceCompanyId).toBe('ins-1');
      expect(res.payload.data.insuranceCompanyName).toBe('شركة الأهلية للتأمين');
    });

    test('clears the insurance fields when insuranceCompanyId is null', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findFirst.mockResolvedValue(makeStudy({ insuranceCompanyId: 'ins-1', insuranceCompanyName: 'x' }));
      prisma.radiologyStudy.update.mockImplementation(({ data }) => Promise.resolve({ ...makeStudy(), ...data }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.assignStudyInsurance(req({ params: { id: 'study-1' }, body: { insuranceCompanyId: null } }), res);

      expect(res.statusCode).toBe(200);
      expect(prisma.insuranceCompany.findFirst).not.toHaveBeenCalled();
      expect(prisma.radiologyStudy.update).toHaveBeenCalledWith({
        where: { id: 'study-1' },
        data: { insuranceCompanyId: null, insuranceCompanyName: null },
      });
    });

    test('rejects an insurance company outside the company', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findFirst.mockResolvedValue(makeStudy());
      prisma.insuranceCompany.findFirst.mockResolvedValue(null);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.assignStudyInsurance(
        req({ params: { id: 'study-1' }, body: { insuranceCompanyId: 'foreign' } }),
        res
      );

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('شركة التأمين غير موجودة');
      expect(prisma.radiologyStudy.update).not.toHaveBeenCalled();
    });

    test('returns 404 for a study outside the company', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findFirst.mockResolvedValue(null);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.assignStudyInsurance(
        req({ params: { id: 'foreign' }, body: { insuranceCompanyId: 'ins-1' } }),
        res
      );

      expect(res.statusCode).toBe(404);
      expect(res.payload.error).toBe('الدراسة غير موجودة');
      expect(prisma.radiologyStudy.update).not.toHaveBeenCalled();
    });
  });

  describe('createInvoice', () => {
    test('sums exam type prices, creates items and a formatted invoice number', async () => {
      const prisma = createPrisma();
      prisma.insuranceCompany.findFirst.mockResolvedValue(makeEntity());
      prisma.radiologyStudy.findMany.mockResolvedValue([
        makeStudy({ id: 's1', patientName: 'محمد علي', examTypeId: 'et-1', examTypeName: 'أشعة مقطعية' }),
        makeStudy({ id: 's2', patientName: 'سارة', examTypeId: 'et-2', examTypeName: 'رنين مغناطيسي' }),
      ]);
      prisma.radiologyExamType.findMany.mockResolvedValue([
        { id: 'et-1', price: 300 },
        { id: 'et-2', price: 500 },
      ]);
      prisma.radiologyInsuranceInvoice.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'inv-1', ...data }));
      prisma.radiologyInsuranceInvoiceItem.createMany.mockResolvedValue({ count: 2 });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createInvoice(
        req({ body: { insuranceCompanyId: 'ins-1', studyIds: ['s1', 's2'] } }),
        res
      );

      expect(res.statusCode).toBe(200);
      const where = prisma.radiologyStudy.findMany.mock.calls[0][0].where;
      expect(where).toEqual({
        companyId: 'company-1',
        insuranceCompanyId: 'ins-1',
        id: { in: ['s1', 's2'] },
      });

      const createData = prisma.radiologyInsuranceInvoice.create.mock.calls[0][0].data;
      expect(createData.companyId).toBe('company-1');
      expect(createData.insuranceCompanyId).toBe('ins-1');
      expect(createData.insuranceCompanyName).toBe('شركة الأهلية للتأمين');
      expect(createData.totalAmount).toBe(800);
      expect(createData.paidAmount).toBe(0);
      expect(createData.remainingAmount).toBe(800);
      expect(createData.status).toBe('OPEN');
      expect(createData.invoiceNumber).toMatch(/^INS-\d{8}-\d{4}$/);

      const itemsData = prisma.radiologyInsuranceInvoiceItem.createMany.mock.calls[0][0].data;
      expect(itemsData).toHaveLength(2);
      expect(itemsData[0]).toEqual({
        studyId: 's1',
        patientName: 'محمد علي',
        examTypeName: 'أشعة مقطعية',
        amount: 300,
        invoiceId: 'inv-1',
      });
      expect(itemsData[1].amount).toBe(500);
      expect(res.payload.data.totalAmount).toBe(800);
    });

    test('falls back to 0 when a study has no exam type price', async () => {
      const prisma = createPrisma();
      prisma.insuranceCompany.findFirst.mockResolvedValue(makeEntity());
      prisma.radiologyStudy.findMany.mockResolvedValue([
        makeStudy({ id: 's1', examTypeId: 'et-1', examTypeName: 'أشعة' }),
        makeStudy({ id: 's2', examTypeId: 'et-2', examTypeName: 'بدون سعر' }),
      ]);
      prisma.radiologyExamType.findMany.mockResolvedValue([{ id: 'et-1', price: 100 }]);
      prisma.radiologyInsuranceInvoice.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'inv-1', ...data }));
      prisma.radiologyInsuranceInvoiceItem.createMany.mockResolvedValue({ count: 2 });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createInvoice(req({ body: { insuranceCompanyId: 'ins-1' } }), res);

      expect(res.statusCode).toBe(200);
      const itemsData = prisma.radiologyInsuranceInvoiceItem.createMany.mock.calls[0][0].data;
      expect(itemsData[0].amount).toBe(100);
      expect(itemsData[1].amount).toBe(0);
      expect(prisma.radiologyInsuranceInvoice.create.mock.calls[0][0].data.totalAmount).toBe(100);
    });

    test('retries with a fresh invoice number on a unique collision', async () => {
      const prisma = createPrisma();
      prisma.insuranceCompany.findFirst.mockResolvedValue(makeEntity());
      prisma.radiologyStudy.findMany.mockResolvedValue([
        makeStudy({ id: 's1', examTypeId: 'et-1', examTypeName: 'أشعة' }),
      ]);
      prisma.radiologyExamType.findMany.mockResolvedValue([{ id: 'et-1', price: 100 }]);
      prisma.radiologyInsuranceInvoice.create
        .mockRejectedValueOnce({ code: 'P2002', message: 'Unique constraint failed on the fields: (`invoiceNumber`)' })
        .mockImplementationOnce(({ data }) => Promise.resolve({ id: 'inv-1', ...data }));
      prisma.radiologyInsuranceInvoiceItem.createMany.mockResolvedValue({ count: 1 });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createInvoice(req({ body: { insuranceCompanyId: 'ins-1' } }), res);

      expect(res.statusCode).toBe(200);
      expect(prisma.radiologyInsuranceInvoice.create).toHaveBeenCalledTimes(2);
      const first = prisma.radiologyInsuranceInvoice.create.mock.calls[0][0].data.invoiceNumber;
      const second = prisma.radiologyInsuranceInvoice.create.mock.calls[1][0].data.invoiceNumber;
      expect(first).not.toBe(second);
      expect(second).toMatch(/^INS-\d{8}-\d{4}$/);
    });

    test('rejects a missing insurance company', async () => {
      const prisma = createPrisma();
      prisma.insuranceCompany.findFirst.mockResolvedValue(null);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createInvoice(req({ body: { insuranceCompanyId: 'foreign' } }), res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('شركة التأمين غير موجودة');
      expect(prisma.radiologyInsuranceInvoice.create).not.toHaveBeenCalled();
    });

    test('rejects when no studies match the entity', async () => {
      const prisma = createPrisma();
      prisma.insuranceCompany.findFirst.mockResolvedValue(makeEntity());
      prisma.radiologyStudy.findMany.mockResolvedValue([]);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createInvoice(req({ body: { insuranceCompanyId: 'ins-1' } }), res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('لا توجد دراسات لإنشاء الفاتورة');
      expect(prisma.radiologyInsuranceInvoice.create).not.toHaveBeenCalled();
    });
  });

  describe('listInvoices', () => {
    test('is company-scoped and applies filters and pagination', async () => {
      const prisma = createPrisma();
      prisma.radiologyInsuranceInvoice.findMany.mockResolvedValue([makeInvoice({ status: 'PARTIAL' })]);
      prisma.radiologyInsuranceInvoice.count.mockResolvedValue(9);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.listInvoices(
        req({ query: { insuranceCompanyId: 'ins-1', status: 'PARTIAL', page: '2', limit: '10' } }),
        res
      );

      const args = prisma.radiologyInsuranceInvoice.findMany.mock.calls[0][0];
      expect(args.where).toEqual({
        companyId: 'company-1',
        insuranceCompanyId: 'ins-1',
        status: 'PARTIAL',
      });
      expect(args.skip).toBe(10);
      expect(args.take).toBe(10);
      expect(args.include).toEqual({ items: true });
      expect(prisma.radiologyInsuranceInvoice.count).toHaveBeenCalledWith({ where: args.where });

      expect(res.statusCode).toBe(200);
      expect(res.payload.data.items).toHaveLength(1);
      expect(res.payload.data.total).toBe(9);
      expect(res.payload.data.page).toBe(2);
    });

    test('rejects an invalid status filter', async () => {
      const prisma = createPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.listInvoices(req({ query: { status: 'DONE' } }), res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('حالة الفاتورة غير صحيحة');
      expect(prisma.radiologyInsuranceInvoice.findMany).not.toHaveBeenCalled();
    });
  });

  describe('getInvoice', () => {
    test('returns the invoice with items', async () => {
      const prisma = createPrisma();
      prisma.radiologyInsuranceInvoice.findFirst.mockResolvedValue(makeInvoice({ items: [] }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getInvoice(req({ params: { id: 'inv-1' } }), res);

      expect(res.statusCode).toBe(200);
      expect(prisma.radiologyInsuranceInvoice.findFirst).toHaveBeenCalledWith({
        where: { id: 'inv-1', companyId: 'company-1' },
        include: { items: true },
      });
      expect(res.payload.data.id).toBe('inv-1');
    });

    test('returns 404 for an invoice outside the company', async () => {
      const prisma = createPrisma();
      prisma.radiologyInsuranceInvoice.findFirst.mockResolvedValue(null);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getInvoice(req({ params: { id: 'foreign' } }), res);

      expect(res.statusCode).toBe(404);
      expect(res.payload.error).toBe('الفاتورة غير موجودة');
    });
  });

  describe('recordPayment', () => {
    test('updates status to PAID at 100% and creates a ledger entry', async () => {
      const prisma = createPrisma();
      prisma.radiologyInsuranceInvoice.findFirst.mockResolvedValue(
        makeInvoice({ paidAmount: 300, remainingAmount: 500, status: 'PARTIAL' })
      );
      prisma.radiologyInsuranceInvoice.update.mockImplementation(({ data }) =>
        Promise.resolve({ ...makeInvoice(), ...data }));
      prisma.radiologyInsuranceLedgerEntry.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'ledger-1', ...data }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.recordPayment(req({ params: { id: 'inv-1' }, body: { amount: 500, note: 'دفعة نهائية' } }), res);

      expect(res.statusCode).toBe(200);
      expect(prisma.radiologyInsuranceInvoice.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: { paidAmount: 800, remainingAmount: 0, status: 'PAID' },
      });
      const ledgerData = prisma.radiologyInsuranceLedgerEntry.create.mock.calls[0][0].data;
      expect(ledgerData).toEqual({
        companyId: 'company-1',
        insuranceCompanyId: 'ins-1',
        insuranceCompanyName: 'شركة الأهلية للتأمين',
        type: 'PAYMENT',
        amount: 500,
        note: 'دفعة نهائية',
      });
      expect(res.payload.data.status).toBe('PAID');
    });

    test('stays PARTIAL when the payment does not cover the full amount', async () => {
      const prisma = createPrisma();
      prisma.radiologyInsuranceInvoice.findFirst.mockResolvedValue(
        makeInvoice({ paidAmount: 100, remainingAmount: 700, status: 'PARTIAL' })
      );
      prisma.radiologyInsuranceInvoice.update.mockImplementation(({ data }) =>
        Promise.resolve({ ...makeInvoice(), ...data }));
      prisma.radiologyInsuranceLedgerEntry.create.mockResolvedValue({ id: 'ledger-1' });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.recordPayment(req({ params: { id: 'inv-1' }, body: { amount: 200 } }), res);

      expect(res.statusCode).toBe(200);
      expect(prisma.radiologyInsuranceInvoice.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: { paidAmount: 300, remainingAmount: 500, status: 'PARTIAL' },
      });
    });

    test('rejects a non-positive amount', async () => {
      const prisma = createPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.recordPayment(req({ params: { id: 'inv-1' }, body: { amount: 0 } }), res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('المبلغ غير صحيح');
      expect(prisma.radiologyInsuranceLedgerEntry.create).not.toHaveBeenCalled();
    });

    test('returns 404 for a foreign invoice', async () => {
      const prisma = createPrisma();
      prisma.radiologyInsuranceInvoice.findFirst.mockResolvedValue(null);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.recordPayment(req({ params: { id: 'foreign' }, body: { amount: 100 } }), res);

      expect(res.statusCode).toBe(404);
      expect(res.payload.error).toBe('الفاتورة غير موجودة');
      expect(prisma.radiologyInsuranceInvoice.update).not.toHaveBeenCalled();
    });
  });

  describe('listLedger', () => {
    test('is company-scoped with type filter and pagination', async () => {
      const prisma = createPrisma();
      prisma.radiologyInsuranceLedgerEntry.findMany.mockResolvedValue([
        { id: 'ledger-1', type: 'PAYMENT', amount: 300 },
      ]);
      prisma.radiologyInsuranceLedgerEntry.count.mockResolvedValue(4);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.listLedger(
        req({ query: { insuranceCompanyId: 'ins-1', type: 'PAYMENT', page: '1', limit: '25' } }),
        res
      );

      const args = prisma.radiologyInsuranceLedgerEntry.findMany.mock.calls[0][0];
      expect(args.where).toEqual({ companyId: 'company-1', insuranceCompanyId: 'ins-1', type: 'PAYMENT' });
      expect(res.statusCode).toBe(200);
      expect(res.payload.data.items).toHaveLength(1);
      expect(res.payload.data.total).toBe(4);
    });

    test('rejects an invalid ledger type filter', async () => {
      const prisma = createPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.listLedger(req({ query: { type: 'CASH' } }), res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('نوع القيد غير صحيح');
      expect(prisma.radiologyInsuranceLedgerEntry.findMany).not.toHaveBeenCalled();
    });
  });

  describe('insuranceSummary', () => {
    test('groups invoices per insurance entity', async () => {
      const prisma = createPrisma();
      prisma.radiologyInsuranceInvoice.findMany.mockResolvedValue([
        { insuranceCompanyId: 'ins-1', insuranceCompanyName: 'شركة الأهلية', totalAmount: 800, paidAmount: 300, remainingAmount: 500 },
        { insuranceCompanyId: 'ins-1', insuranceCompanyName: 'شركة الأهلية', totalAmount: 200, paidAmount: 200, remainingAmount: 0 },
        { insuranceCompanyId: 'ins-2', insuranceCompanyName: 'التكافلية', totalAmount: 500, paidAmount: 0, remainingAmount: 500 },
      ]);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.insuranceSummary(req(), res);

      expect(res.statusCode).toBe(200);
      expect(prisma.radiologyInsuranceInvoice.findMany).toHaveBeenCalledWith({
        where: { companyId: 'company-1' },
        select: {
          insuranceCompanyId: true,
          insuranceCompanyName: true,
          totalAmount: true,
          paidAmount: true,
          remainingAmount: true,
        },
      });
      expect(res.payload.data).toEqual([
        { insuranceCompanyId: 'ins-1', name: 'شركة الأهلية', total: 1000, paid: 500, remaining: 500 },
        { insuranceCompanyId: 'ins-2', name: 'التكافلية', total: 500, paid: 0, remaining: 500 },
      ]);
    });
  });
});
