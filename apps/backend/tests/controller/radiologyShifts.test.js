jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const controller = require('../../controller/radiologyShiftsController');

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
    radiologyShift: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    radiologyShiftPayment: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
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

const makeShift = (overrides = {}) => ({
  id: 'shift-1',
  companyId: 'company-1',
  cashierName: 'شروق',
  status: 'OPEN',
  openedAt: new Date('2026-08-12T10:00:00.000Z'),
  ...overrides,
});

describe('radiologyShiftsController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('company scoping', () => {
    test('returns 403 when companyId is missing', async () => {
      const prisma = createPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.listShifts(req({ user: {} }), res);

      expect(res.statusCode).toBe(403);
      expect(res.payload.error).toBe('غير مصرح');
      expect(prisma.radiologyShift.findMany).not.toHaveBeenCalled();
    });
  });

  describe('getActiveShift summary', () => {
    test('splits patient cash from insurance collections in the summary', async () => {
      const prisma = createPrisma();
      prisma.radiologyShift.findFirst.mockResolvedValue(makeShift());
      prisma.radiologyShiftPayment.findMany.mockResolvedValue([
        { id: 'p1', type: 'PAYMENT', amount: 350, method: 'CASH', source: 'STUDY', studyId: 's1' },
        { id: 'p2', type: 'PAYMENT', amount: 300, method: 'BANK', source: 'INSURANCE', invoiceId: 'inv-1' },
        { id: 'p3', type: 'PAYMENT', amount: 100, method: 'CARD', source: 'STUDY', studyId: 's2' },
        { id: 'p4', type: 'REFUND', amount: 50, method: 'CASH', source: 'STUDY', studyId: 's1' },
      ]);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getActiveShift(req(), res);

      expect(res.statusCode).toBe(200);
      const summary = res.payload.data.summary;
      expect(summary.collected).toBe(750);
      expect(summary.patientCollected).toBe(450);
      expect(summary.insuranceCollected).toBe(300);
      expect(summary.refunded).toBe(50);
      expect(summary.net).toBe(700);
      expect(summary.byMethod).toEqual({ CASH: 350, CARD: 100, VODAFONE_CASH: 0, BANK: 0 });
    });

    test('returns null when no shift is open', async () => {
      const prisma = createPrisma();
      prisma.radiologyShift.findFirst.mockResolvedValue(null);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getActiveShift(req(), res);

      expect(res.statusCode).toBe(200);
      expect(res.payload.data).toBeNull();
    });
  });

  describe('attachToActiveShift', () => {
    test('creates an INSURANCE shift payment with invoice id when an open shift exists', async () => {
      const prisma = createPrisma();
      prisma.radiologyShift.findFirst.mockResolvedValue({ id: 'shift-1' });
      prisma.radiologyShiftPayment.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'sp-1', ...data }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const result = await controller.attachToActiveShift(
        prisma,
        'company-1',
        null,
        'PAYMENT',
        300,
        'BANK',
        'تحصيل من الأهرام',
        'INSURANCE',
        'inv-1'
      );

      expect(prisma.radiologyShift.findFirst).toHaveBeenCalledWith({
        where: { companyId: 'company-1', status: 'OPEN' },
        select: { id: true },
      });
      expect(prisma.radiologyShiftPayment.create).toHaveBeenCalledWith({
        data: {
          companyId: 'company-1',
          shiftId: 'shift-1',
          studyId: null,
          invoiceId: 'inv-1',
          source: 'INSURANCE',
          type: 'PAYMENT',
          amount: 300,
          method: 'BANK',
          note: 'تحصيل من الأهرام',
        },
      });
      expect(result.id).toBe('sp-1');
    });

    test('creates a STUDY shift payment when source is omitted', async () => {
      const prisma = createPrisma();
      prisma.radiologyShift.findFirst.mockResolvedValue({ id: 'shift-1' });
      prisma.radiologyShiftPayment.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'sp-1', ...data }));
      getSharedPrismaClient.mockReturnValue(prisma);

      await controller.attachToActiveShift(prisma, 'company-1', 'study-1', 'PAYMENT', 350, 'CASH', null);

      const data = prisma.radiologyShiftPayment.create.mock.calls[0][0].data;
      expect(data.source).toBe('STUDY');
      expect(data.studyId).toBe('study-1');
      expect(data.invoiceId).toBeNull();
      expect(data.method).toBe('CASH');
    });

    test('returns null when no open shift exists', async () => {
      const prisma = createPrisma();
      prisma.radiologyShift.findFirst.mockResolvedValue(null);
      getSharedPrismaClient.mockReturnValue(prisma);

      const result = await controller.attachToActiveShift(prisma, 'company-1', null, 'PAYMENT', 100, 'BANK', null, 'INSURANCE', 'inv-1');

      expect(result).toBeNull();
      expect(prisma.radiologyShiftPayment.create).not.toHaveBeenCalled();
    });
  });

  describe('listShifts', () => {
    test('is company-scoped with pagination and per-shift summaries', async () => {
      const prisma = createPrisma();
      prisma.radiologyShift.findMany.mockResolvedValue([makeShift(), makeShift({ id: 'shift-2', status: 'CLOSED' })]);
      prisma.radiologyShift.count.mockResolvedValue(2);
      prisma.radiologyShiftPayment.findMany.mockResolvedValue([
        { id: 'p1', shiftId: 'shift-1', type: 'PAYMENT', amount: 300, method: 'BANK', source: 'INSURANCE', invoiceId: 'inv-1' },
        { id: 'p2', shiftId: 'shift-2', type: 'PAYMENT', amount: 200, method: 'CASH', source: 'STUDY', studyId: 's1' },
      ]);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.listShifts(req({ query: { page: '1', limit: '50' } }), res);

      expect(prisma.radiologyShift.findMany).toHaveBeenCalledWith({
        where: { companyId: 'company-1' },
        orderBy: { openedAt: 'desc' },
        skip: 0,
        take: 50,
      });
      expect(res.statusCode).toBe(200);
      expect(res.payload.data.items).toHaveLength(2);
      expect(res.payload.data.items[0].summary.insuranceCollected).toBe(300);
      expect(res.payload.data.items[0].summary.patientCollected).toBe(0);
      expect(res.payload.data.items[1].summary.patientCollected).toBe(200);
    });
  });

  describe('closeShift', () => {
    test('closes an open shift and returns the settled summary', async () => {
      const prisma = createPrisma();
      prisma.radiologyShift.findFirst.mockResolvedValue(makeShift());
      prisma.radiologyShiftPayment.findMany.mockResolvedValue([
        { id: 'p1', type: 'PAYMENT', amount: 250, method: 'CASH', source: 'STUDY', studyId: 's1' },
      ]);
      prisma.radiologyShift.update.mockImplementation(({ data }) =>
        Promise.resolve({ ...makeShift({ status: 'CLOSED' }), ...data }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.closeShift(req({ params: { id: 'shift-1' } }), res);

      expect(prisma.radiologyShift.update).toHaveBeenCalledWith({
        where: { id: 'shift-1' },
        data: { status: 'CLOSED', closedAt: expect.any(Date), closedBy: 'user-1' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.payload.data.summary.patientCollected).toBe(250);
      expect(res.payload.data.summary.net).toBe(250);
    });

    test('rejects closing an already closed shift', async () => {
      const prisma = createPrisma();
      prisma.radiologyShift.findFirst.mockResolvedValue(makeShift({ status: 'CLOSED' }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.closeShift(req({ params: { id: 'shift-1' } }), res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('الوردية مغلقة بالفعل');
      expect(prisma.radiologyShift.update).not.toHaveBeenCalled();
    });

    test('returns 404 for a shift outside the company', async () => {
      const prisma = createPrisma();
      prisma.radiologyShift.findFirst.mockResolvedValue(null);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.closeShift(req({ params: { id: 'foreign' } }), res);

      expect(res.statusCode).toBe(404);
      expect(res.payload.error).toBe('الوردية غير موجودة');
    });
  });
});
