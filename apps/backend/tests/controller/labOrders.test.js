jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const controller = require('../../controller/labOrdersController');

const createResponse = () => {
  const response = {
    statusCode: 200,
    payload: null,
    status: jest.fn((code) => {
      response.statusCode = code;
      return response;
    }),
    json: jest.fn((payload) => {
      response.payload = payload;
      return response;
    }),
  };
  return response;
};

const createPrisma = (overrides = {}) => {
  const prisma = {
    labOrder: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    labOrderTest: {
      update: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
      createMany: jest.fn(),
      create: jest.fn(),
    },
    labTest: { findMany: jest.fn(), findFirst: jest.fn() },
    labTestParameter: { findMany: jest.fn() },
    patient: { findFirst: jest.fn() },
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

const makeOrder = (overrides = {}) => ({
  id: 'order-1',
  companyId: 'company-1',
  orderNumber: 'LAB-20260809-1234',
  patientId: null,
  patientName: 'محمد علي',
  patientPhone: '01001234567',
  patientGender: 'MALE',
  patientAge: '30',
  contractId: null,
  branchId: null,
  doctorName: 'د. أحمد',
  doctorType: null,
  fastingHours: 8,
  externalSample: false,
  collectionDate: null,
  receiveDate: null,
  status: 'PENDING',
  reportStatus: 'PENDING',
  subtotal: 150,
  discount: 0,
  total: 150,
  paid: 0,
  remaining: 150,
  patientFlags: null,
  notes: null,
  signedBy: null,
  signedAt: null,
  createdAt: new Date('2026-08-09T10:00:00.000Z'),
  updatedAt: new Date('2026-08-09T10:00:00.000Z'),
  tests: [
    { id: 'ot1', orderId: 'order-1', testId: 'test-1', price: 100, status: 'PENDING', results: null, test: { id: 'test-1', name: 'صورة دم', abbreviation: 'CBC', category: 'هيماتولوجيا', parameters: [] } },
    { id: 'ot2', orderId: 'order-1', testId: 'test-2', price: 50, status: 'PENDING', results: null, test: { id: 'test-2', name: 'سكر صائم', abbreviation: 'FBS', category: 'كيمياء', parameters: [] } },
  ],
  ...overrides,
});

describe('labOrdersController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('transition helpers', () => {
    test('validateLabReportTransition enforces the report chain', () => {
      expect(controller.validateLabReportTransition('PENDING', 'RESULTS_ENTERED').valid).toBe(true);
      expect(controller.validateLabReportTransition('RESULTS_ENTERED', 'REVIEWED').valid).toBe(true);
      expect(controller.validateLabReportTransition('REVIEWED', 'SIGNED').valid).toBe(true);
      expect(controller.validateLabReportTransition('SIGNED', 'DELIVERED').valid).toBe(true);
      expect(controller.validateLabReportTransition('PENDING', 'REVIEWED').valid).toBe(false);
      expect(controller.validateLabReportTransition('PENDING', 'PENDING').valid).toBe(false);
      expect(controller.validateLabReportTransition('DELIVERED', 'PENDING').valid).toBe(false);
    });

    test('nextReportStatus returns the following chain status', () => {
      expect(controller.nextReportStatus('PENDING')).toBe('RESULTS_ENTERED');
      expect(controller.nextReportStatus('RESULTS_ENTERED')).toBe('REVIEWED');
      expect(controller.nextReportStatus('REVIEWED')).toBe('SIGNED');
      expect(controller.nextReportStatus('SIGNED')).toBe('DELIVERED');
      expect(controller.nextReportStatus('DELIVERED')).toBeNull();
      expect(controller.nextOrderStatus('PENDING')).toBe('COLLECTED');
      expect(controller.nextOrderTestStatus('RESULTS_ENTERED')).toBe('REVIEWED');
    });
  });

  describe('createOrder', () => {
    test('computes totals, generates orderNumber and creates order tests', async () => {
      const prisma = createPrisma();
      prisma.labTest.findMany.mockResolvedValue([
        { id: 'test-1', price: 100 },
        { id: 'test-2', price: 50 },
      ]);
      prisma.labOrder.create.mockResolvedValue(makeOrder());
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createOrder(
        req({
          body: {
            patientName: 'محمد علي',
            patientPhone: '01001234567',
            patientGender: 'MALE',
            fastingHours: 8,
            externalSample: true,
            patientFlags: { bleeding: true },
            testIds: [{ testId: 'test-1' }, { testId: 'test-2' }],
          },
        }),
        res
      );

      expect(res.statusCode).toBe(200);
      const data = prisma.labOrder.create.mock.calls[0][0].data;
      expect(data.companyId).toBe('company-1');
      expect(data.patientName).toBe('محمد علي');
      expect(data.subtotal).toBe(150);
      expect(data.discount).toBe(0);
      expect(data.total).toBe(150);
      expect(data.paid).toBe(0);
      expect(data.remaining).toBe(150);
      expect(data.status).toBe('PENDING');
      expect(data.reportStatus).toBe('PENDING');
      expect(data.orderNumber).toMatch(/^LAB-/);
      expect(data.externalSample).toBe(true);
      expect(data.patientFlags).toEqual({ bleeding: true });
      expect(data.tests.create).toHaveLength(2);
      expect(data.tests.create[0]).toMatchObject({ testId: 'test-1', price: 100, status: 'PENDING', companyId: 'company-1' });
      expect(data.tests.create[1]).toMatchObject({ testId: 'test-2', price: 50, status: 'PENDING' });

      expect(res.payload.data.orderNumber).toMatch(/^LAB-/);
      expect(res.payload.data.subtotal).toBe(150);
      expect(res.payload.data.total).toBe(150);
      expect(res.payload.data.remaining).toBe(150);
    });

    test('respects price overrides and discount/paid amounts', async () => {
      const prisma = createPrisma();
      prisma.labTest.findMany.mockResolvedValue([
        { id: 'test-1', price: 100 },
        { id: 'test-2', price: 50 },
      ]);
      prisma.labOrder.create.mockResolvedValue(makeOrder({ subtotal: 130, discount: 10, total: 120, paid: 30, remaining: 90 }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createOrder(
        req({
          body: {
            patientName: 'مريض',
            discount: 10,
            paid: 30,
            testIds: [{ testId: 'test-1', price: 80 }, { testId: 'test-2' }],
          },
        }),
        res
      );

      expect(res.statusCode).toBe(200);
      const data = prisma.labOrder.create.mock.calls[0][0].data;
      expect(data.subtotal).toBe(130);
      expect(data.discount).toBe(10);
      expect(data.total).toBe(120);
      expect(data.paid).toBe(30);
      expect(data.remaining).toBe(90);
      expect(data.tests.create[0].price).toBe(80);
    });

    test('rejects a test that does not belong to the company', async () => {
      const prisma = createPrisma();
      prisma.labTest.findMany.mockResolvedValue([{ id: 'test-1', price: 100 }]);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createOrder(
        req({ body: { patientName: 'مريض', testIds: [{ testId: 'test-1' }, { testId: 'foreign' }] } }),
        res
      );

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('أحد الاختبارات المحددة لا ينتمي لهذه الشركة');
      expect(prisma.labOrder.create).not.toHaveBeenCalled();
    });

    test('rejects when patientName is missing', async () => {
      const prisma = createPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createOrder(req({ body: { testIds: [{ testId: 'test-1' }] } }), res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('اسم المريض مطلوب');
      expect(prisma.labOrder.create).not.toHaveBeenCalled();
    });

    test('rejects a patientId outside the company', async () => {
      const prisma = createPrisma();
      prisma.patient.findFirst.mockResolvedValue(null);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createOrder(
        req({ body: { patientName: 'مريض', patientId: 'foreign-pat', testIds: [{ testId: 'test-1' }] } }),
        res
      );

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('المريض لا ينتمي لهذه الشركة');
      expect(prisma.labOrder.create).not.toHaveBeenCalled();
    });

    test('retries with a fresh orderNumber when a unique collision occurs', async () => {
      const prisma = createPrisma();
      prisma.labTest.findMany.mockResolvedValue([{ id: 'test-1', price: 100 }]);
      prisma.labOrder.create
        .mockRejectedValueOnce({ code: 'P2002', message: 'Unique constraint failed on the fields: (`orderNumber`)' })
        .mockResolvedValueOnce(makeOrder({ orderNumber: 'LAB-20260809-999999' }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createOrder(
        req({ body: { patientName: 'مريض', testIds: [{ testId: 'test-1' }] } }),
        res
      );

      expect(res.statusCode).toBe(200);
      expect(prisma.labOrder.create).toHaveBeenCalledTimes(2);
      const firstOrderNumber = prisma.labOrder.create.mock.calls[0][0].data.orderNumber;
      const secondOrderNumber = prisma.labOrder.create.mock.calls[1][0].data.orderNumber;
      expect(firstOrderNumber).not.toBe(secondOrderNumber);
      expect(secondOrderNumber).toMatch(/^LAB-/);
    });

    test('rejects a client-provided orderNumber that already exists', async () => {
      const prisma = createPrisma();
      prisma.labTest.findMany.mockResolvedValue([{ id: 'test-1', price: 100 }]);
      prisma.labOrder.create.mockRejectedValue({ code: 'P2002', message: 'Unique constraint failed on the fields: (`orderNumber`)' });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createOrder(
        req({ body: { patientName: 'مريض', orderNumber: 'LAB-20260809-1111', testIds: [{ testId: 'test-1' }] } }),
        res
      );

      expect(res.statusCode).toBe(409);
      expect(res.payload.error).toBe('رقم الطلب مستخدم من قبل');
      expect(prisma.labOrder.create).toHaveBeenCalledTimes(1);
    });

    test('clamps remaining to zero when paid exceeds the total', async () => {
      const prisma = createPrisma();
      prisma.labTest.findMany.mockResolvedValue([{ id: 'test-1', price: 100 }]);
      prisma.labOrder.create.mockResolvedValue(makeOrder());
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createOrder(
        req({ body: { patientName: 'مريض', paid: 500, testIds: [{ testId: 'test-1' }] } }),
        res
      );

      expect(res.statusCode).toBe(200);
      const data = prisma.labOrder.create.mock.calls[0][0].data;
      expect(data.remaining).toBe(0);
      expect(data.remaining).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getAllOrders', () => {
    test('applies filters, search and pagination', async () => {
      const prisma = createPrisma();
      prisma.labOrder.findMany.mockResolvedValue([makeOrder({ status: 'SIGNED', reportStatus: 'REVIEWED' })]);
      prisma.labOrder.count.mockResolvedValue(1);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getAllOrders(
        req({
          query: {
            status: 'SIGNED',
            reportStatus: 'REVIEWED',
            branchId: 'b1',
            search: 'محمد',
            dateFrom: '2026-08-01',
            dateTo: '2026-08-09',
            page: '2',
            limit: '100',
          },
        }),
        res
      );

      const args = prisma.labOrder.findMany.mock.calls[0][0];
      expect(args.where).toEqual({
        companyId: 'company-1',
        status: 'SIGNED',
        reportStatus: 'REVIEWED',
        branchId: 'b1',
        OR: [
          { patientName: { contains: 'محمد', mode: 'insensitive' } },
          { patientPhone: { contains: 'محمد', mode: 'insensitive' } },
          { orderNumber: { contains: 'محمد', mode: 'insensitive' } },
        ],
        createdAt: { gte: expect.any(Date), lte: expect.any(Date) },
      });
      expect(args.skip).toBe(100);
      expect(args.take).toBe(100);
      expect(args.include.tests.include.test.select).toEqual({ id: true, name: true, abbreviation: true, category: true });
      expect(prisma.labOrder.count).toHaveBeenCalledWith({ where: args.where });

      expect(res.statusCode).toBe(200);
      expect(res.payload.data.items).toHaveLength(1);
      expect(res.payload.data.total).toBe(1);
      expect(res.payload.data.page).toBe(2);
      expect(res.payload.data.limit).toBe(100);
    });

    test('defaults to limit 50 and caps at 200', async () => {
      const prisma = createPrisma();
      prisma.labOrder.findMany.mockResolvedValue([]);
      prisma.labOrder.count.mockResolvedValue(0);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getAllOrders(req({ query: {} }), res);

      expect(prisma.labOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { companyId: 'company-1' }, skip: 0, take: 50 })
      );
      expect(res.statusCode).toBe(200);

      prisma.labOrder.findMany.mockClear();
      const res2 = createResponse();
      await controller.getAllOrders(req({ query: { limit: '500' } }), res2);
      expect(prisma.labOrder.findMany.mock.calls[0][0].take).toBe(200);
    });
  });

  describe('getOrderById', () => {
    test('includes full test with parameters for results entry', async () => {
      const prisma = createPrisma();
      prisma.labOrder.findFirst.mockResolvedValue(
        makeOrder({
          tests: [
            {
              id: 'ot1',
              orderId: 'order-1',
              testId: 'test-1',
              price: 100,
              status: 'RESULTS_ENTERED',
              results: [{ parameterId: 'p1', parameterName: 'جلوكوز', unit: 'mg/dL', result: '95', flag: 'normal' }],
              test: {
                id: 'test-1',
                name: 'سكر صائم',
                abbreviation: 'FBS',
                category: 'كيمياء',
                parameters: [{ id: 'p1', name: 'جلوكوز', unit: 'mg/dL', referenceRange: '70-100', showFlag: true, sortOrder: 1 }],
              },
            },
          ],
        })
      );
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getOrderById(req({ params: { id: 'order-1' } }), res);

      const args = prisma.labOrder.findFirst.mock.calls[0][0];
      expect(args.where).toEqual({ id: 'order-1', companyId: 'company-1' });
      expect(args.include.tests.include.test.include.parameters).toBeDefined();
      expect(res.statusCode).toBe(200);
      expect(res.payload.data.tests[0].test.parameters).toHaveLength(1);
      expect(res.payload.data.tests[0].results[0].result).toBe('95');
    });

    test('returns 404 for an order outside the company', async () => {
      const prisma = createPrisma();
      prisma.labOrder.findFirst.mockResolvedValue(null);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getOrderById(req({ params: { id: 'foreign' } }), res);

      expect(res.statusCode).toBe(404);
      expect(res.payload.error).toBe('طلب التحاليل غير موجود');
    });
  });

  describe('enterResults', () => {
    test('stores enriched results and advances reportStatus', async () => {
      const prisma = createPrisma();
      prisma.labOrder.findFirst.mockResolvedValue({
        id: 'order-1',
        companyId: 'company-1',
        reportStatus: 'PENDING',
        tests: [
          { id: 'ot1', orderId: 'order-1', testId: 'test-1', price: 100, status: 'PENDING', results: null },
          { id: 'ot2', orderId: 'order-1', testId: 'test-2', price: 50, status: 'PENDING', results: null },
        ],
      });
      prisma.labTestParameter.findMany.mockResolvedValue([
        { id: 'p1', name: 'جلوكوز', unit: 'mg/dL', testId: 'test-1' },
        { id: 'p2', name: 'كوليسترول', unit: 'mg/dL', testId: 'test-1' },
        { id: 'p3', name: 'يوريا', unit: 'mg/dL', testId: 'test-2' },
      ]);
      prisma.labOrderTest.update.mockResolvedValue({});
      prisma.labOrder.update.mockResolvedValue(makeOrder({ reportStatus: 'RESULTS_ENTERED' }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.enterResults(
        req({
          params: { id: 'order-1' },
          body: {
            tests: [
              {
                testId: 'test-1',
                status: 'RESULTS_ENTERED',
                results: [
                  { parameterId: 'p1', result: '95', flag: 'normal' },
                  { parameterId: 'p2', result: '180' },
                ],
              },
              { testId: 'test-2', results: [{ parameterId: 'p3', result: '88', flag: 'high' }] },
            ],
          },
        }),
        res
      );

      expect(res.statusCode).toBe(200);
      expect(prisma.labTestParameter.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['p1', 'p2', 'p3'] }, companyId: 'company-1' },
      });
      expect(prisma.labOrderTest.update).toHaveBeenCalledWith({
        where: { id: 'ot1' },
        data: {
          status: 'RESULTS_ENTERED',
          results: expect.arrayContaining([
            expect.objectContaining({ parameterId: 'p1', parameterName: 'جلوكوز', unit: 'mg/dL', result: '95', flag: 'normal' }),
            expect.objectContaining({ parameterId: 'p2', parameterName: 'كوليسترول', unit: 'mg/dL', result: '180' }),
          ]),
        },
      });
      expect(prisma.labOrderTest.update).toHaveBeenCalledWith({
        where: { id: 'ot2' },
        data: {
          status: 'RESULTS_ENTERED',
          results: expect.arrayContaining([
            expect.objectContaining({ parameterId: 'p3', parameterName: 'يوريا', result: '88', flag: 'high' }),
          ]),
        },
      });
      expect(prisma.labOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'order-1' }, data: { reportStatus: 'RESULTS_ENTERED' } })
      );
    });

    test('downgrades a signed report to RESULTS_ENTERED and clears the signature when results are re-entered', async () => {
      const prisma = createPrisma();
      prisma.labOrder.findFirst.mockResolvedValue({
        id: 'order-1',
        companyId: 'company-1',
        reportStatus: 'SIGNED',
        signedBy: 'أحمد محمود',
        signedAt: new Date('2026-08-09T12:00:00.000Z'),
        tests: [{ id: 'ot1', orderId: 'order-1', testId: 'test-1', price: 100, status: 'SIGNED', results: null }],
      });
      prisma.labTestParameter.findMany.mockResolvedValue([{ id: 'p1', name: 'جلوكوز', unit: 'mg/dL', testId: 'test-1' }]);
      prisma.labOrderTest.update.mockResolvedValue({});
      prisma.labOrder.update.mockResolvedValue(makeOrder({ reportStatus: 'RESULTS_ENTERED', signedBy: null, signedAt: null }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.enterResults(
        req({
          params: { id: 'order-1' },
          body: { tests: [{ testId: 'test-1', results: [{ parameterId: 'p1', result: '95' }] }] },
        }),
        res
      );

      expect(prisma.labOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { reportStatus: 'RESULTS_ENTERED', signedBy: null, signedAt: null },
        })
      );
    });

    test('rejects entering results on a delivered report', async () => {
      const prisma = createPrisma();
      prisma.labOrder.findFirst.mockResolvedValue({
        id: 'order-1',
        companyId: 'company-1',
        reportStatus: 'DELIVERED',
        tests: [{ id: 'ot1', orderId: 'order-1', testId: 'test-1', price: 100, status: 'DELIVERED', results: null }],
      });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.enterResults(
        req({
          params: { id: 'order-1' },
          body: { tests: [{ testId: 'test-1', results: [{ parameterId: 'p1', result: '95' }] }] },
        }),
        res
      );

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('لا يمكن تعديل نتائج تقرير تم تسليمه');
      expect(prisma.labOrderTest.update).not.toHaveBeenCalled();
    });

    test('rejects a parameter that does not belong to the order test', async () => {
      const prisma = createPrisma();
      prisma.labOrder.findFirst.mockResolvedValue({
        id: 'order-1',
        companyId: 'company-1',
        reportStatus: 'PENDING',
        tests: [
          { id: 'ot1', orderId: 'order-1', testId: 'test-1', price: 100, status: 'PENDING', results: null },
          { id: 'ot2', orderId: 'order-1', testId: 'test-2', price: 50, status: 'PENDING', results: null },
        ],
      });
      prisma.labTestParameter.findMany.mockResolvedValue([{ id: 'p1', name: 'جلوكوز', unit: 'mg/dL', testId: 'test-1' }]);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.enterResults(
        req({
          params: { id: 'order-1' },
          body: {
            tests: [
              { testId: 'test-1', results: [{ parameterId: 'p1', result: '95' }] },
              { testId: 'test-2', results: [{ parameterId: 'p1', result: '88' }] },
            ],
          },
        }),
        res
      );

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('المعامل لا ينتمي لهذا الاختبار');
      expect(prisma.labOrderTest.update).not.toHaveBeenCalled();
      expect(prisma.labOrder.update).not.toHaveBeenCalled();
    });

    test('rejects a test that does not belong to the order', async () => {
      const prisma = createPrisma();
      prisma.labOrder.findFirst.mockResolvedValue({
        id: 'order-1',
        companyId: 'company-1',
        reportStatus: 'PENDING',
        tests: [{ id: 'ot1', orderId: 'order-1', testId: 'test-1', price: 100, status: 'PENDING', results: null }],
      });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.enterResults(
        req({
          params: { id: 'order-1' },
          body: { tests: [{ testId: 'foreign-test', results: [{ parameterId: 'p1', result: '95' }] }] },
        }),
        res
      );

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('الاختبار لا ينتمي لهذا الطلب');
      expect(prisma.labOrderTest.update).not.toHaveBeenCalled();
    });
  });

  describe('reviewOrder', () => {
    test('rejects review before results are entered', async () => {
      const prisma = createPrisma();
      prisma.labOrder.findFirst.mockResolvedValue({ id: 'order-1', companyId: 'company-1', reportStatus: 'PENDING' });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.reviewOrder(req({ params: { id: 'order-1' } }), res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('يجب إدخال النتائج قبل المراجعة');
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    test('advances to REVIEWED when results are entered', async () => {
      const prisma = createPrisma();
      prisma.labOrder.findFirst.mockResolvedValue({
        id: 'order-1',
        companyId: 'company-1',
        reportStatus: 'RESULTS_ENTERED',
        tests: [
          { id: 'ot1', results: [{ parameterId: 'p1', result: '95' }] },
          { id: 'ot2', results: [{ parameterId: 'p2', result: '180' }] },
        ],
      });
      prisma.labOrderTest.updateMany.mockResolvedValue({ count: 2 });
      prisma.labOrder.update.mockResolvedValue(makeOrder({ reportStatus: 'REVIEWED' }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.reviewOrder(req({ params: { id: 'order-1' } }), res);

      expect(res.statusCode).toBe(200);
      expect(prisma.labOrderTest.updateMany).toHaveBeenCalledWith({
        where: { orderId: 'order-1' },
        data: { status: 'REVIEWED' },
      });
      expect(prisma.labOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'order-1' }, data: { reportStatus: 'REVIEWED' } })
      );
      expect(res.payload.data.reportStatus).toBe('REVIEWED');
    });

    test('rejects review when some tests still lack results', async () => {
      const prisma = createPrisma();
      prisma.labOrder.findFirst.mockResolvedValue({
        id: 'order-1',
        companyId: 'company-1',
        reportStatus: 'RESULTS_ENTERED',
        tests: [
          { id: 'ot1', results: [{ parameterId: 'p1', result: '95' }] },
          { id: 'ot2', results: null },
        ],
      });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.reviewOrder(req({ params: { id: 'order-1' } }), res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('يجب إدخال نتائج جميع الاختبارات قبل المراجعة');
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('signOrder', () => {
    test('rejects signing before review', async () => {
      const prisma = createPrisma();
      prisma.labOrder.findFirst.mockResolvedValue({ id: 'order-1', companyId: 'company-1', reportStatus: 'RESULTS_ENTERED' });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.signOrder(req({ params: { id: 'order-1' } }), res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('يجب مراجعة النتائج قبل التوقيع');
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    test('signs from REVIEWED with signedBy and signedAt', async () => {
      const prisma = createPrisma();
      prisma.labOrder.findFirst.mockResolvedValue({ id: 'order-1', companyId: 'company-1', reportStatus: 'REVIEWED' });
      prisma.labOrderTest.updateMany.mockResolvedValue({ count: 2 });
      prisma.labOrder.update.mockResolvedValue(
        makeOrder({ reportStatus: 'SIGNED', status: 'SIGNED', signedBy: 'أحمد محمود', signedAt: new Date('2026-08-09T12:00:00.000Z') })
      );
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.signOrder(
        req({ params: { id: 'order-1' }, user: { companyId: 'company-1', id: 'user-1', firstName: 'أحمد', lastName: 'محمود' } }),
        res
      );

      expect(res.statusCode).toBe(200);
      expect(prisma.labOrderTest.updateMany).toHaveBeenCalledWith({
        where: { orderId: 'order-1' },
        data: { status: 'SIGNED' },
      });
      expect(prisma.labOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order-1' },
          data: expect.objectContaining({
            reportStatus: 'SIGNED',
            status: 'SIGNED',
            signedBy: 'أحمد محمود',
            signedAt: expect.any(Date),
          }),
        })
      );
      expect(res.payload.data.signedBy).toBe('أحمد محمود');
      expect(res.payload.data.signedAt).toBe('2026-08-09T12:00:00.000Z');
    });
  });

  describe('markDelivered', () => {
    test('sets DELIVERED on both statuses', async () => {
      const prisma = createPrisma();
      prisma.labOrder.findFirst.mockResolvedValue({ id: 'order-1', companyId: 'company-1', reportStatus: 'SIGNED', status: 'SIGNED' });
      prisma.labOrder.update.mockResolvedValue(makeOrder({ reportStatus: 'DELIVERED', status: 'DELIVERED' }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.markDelivered(req({ params: { id: 'order-1' } }), res);

      expect(res.statusCode).toBe(200);
      expect(prisma.labOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order-1' },
          data: { reportStatus: 'DELIVERED', status: 'DELIVERED' },
        })
      );
      expect(res.payload.data.reportStatus).toBe('DELIVERED');
      expect(res.payload.data.status).toBe('DELIVERED');
    });

    test('is idempotent when already delivered', async () => {
      const prisma = createPrisma();
      prisma.labOrder.findFirst
        .mockResolvedValueOnce({ id: 'order-1', companyId: 'company-1', reportStatus: 'DELIVERED', status: 'DELIVERED' })
        .mockResolvedValueOnce(makeOrder({ reportStatus: 'DELIVERED', status: 'DELIVERED' }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.markDelivered(req({ params: { id: 'order-1' } }), res);

      expect(res.statusCode).toBe(200);
      expect(prisma.labOrder.update).not.toHaveBeenCalled();
    });

    test('rejects delivering a report that is not signed', async () => {
      const prisma = createPrisma();
      prisma.labOrder.findFirst.mockResolvedValue({
        id: 'order-1',
        companyId: 'company-1',
        reportStatus: 'RESULTS_ENTERED',
        status: 'IN_PROGRESS',
      });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.markDelivered(req({ params: { id: 'order-1' } }), res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('يجب توقيع التقرير قبل التسليم');
      expect(prisma.labOrder.update).not.toHaveBeenCalled();
    });
  });

  describe('updateOrder', () => {
    test('replaces order tests when testIds provided and recomputes totals', async () => {
      const prisma = createPrisma();
      prisma.labOrder.findFirst.mockResolvedValue(makeOrder({ subtotal: 150, discount: 0, total: 150, remaining: 150 }));
      prisma.labTest.findMany.mockResolvedValue([
        { id: 'test-3', price: 60 },
        { id: 'test-4', price: 40 },
      ]);
      prisma.labOrderTest.deleteMany.mockResolvedValue({ count: 2 });
      prisma.labOrderTest.createMany.mockResolvedValue({ count: 2 });
      prisma.labOrder.update.mockResolvedValue(makeOrder({ subtotal: 100, total: 100, remaining: 100 }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.updateOrder(
        req({
          params: { id: 'order-1' },
          body: { testIds: [{ testId: 'test-3' }, { testId: 'test-4', price: 40 }] },
        }),
        res
      );

      expect(res.statusCode).toBe(200);
      expect(prisma.labOrderTest.deleteMany).toHaveBeenCalledWith({ where: { orderId: 'order-1' } });
      expect(prisma.labOrderTest.createMany).toHaveBeenCalledWith({
        data: [
          { testId: 'test-3', price: 60, status: 'PENDING', companyId: 'company-1' },
          { testId: 'test-4', price: 40, status: 'PENDING', companyId: 'company-1' },
        ],
      });
      const updateData = prisma.labOrder.update.mock.calls[0][0].data;
      expect(updateData.subtotal).toBe(100);
      expect(updateData.total).toBe(100);
      expect(updateData.remaining).toBe(100);
    });

    test('whitelists fields and normalizes status', async () => {
      const prisma = createPrisma();
      prisma.labOrder.findFirst.mockResolvedValue(makeOrder());
      prisma.labOrder.update.mockResolvedValue(makeOrder({ doctorName: 'د. سارة', status: 'COLLECTED' }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.updateOrder(
        req({
          params: { id: 'order-1' },
          body: { doctorName: 'د. سارة', status: 'collected', evil: 'injected', tests: [{ testId: 'x' }] },
        }),
        res
      );

      const data = prisma.labOrder.update.mock.calls[0][0].data;
      expect(data.doctorName).toBe('د. سارة');
      expect(data.status).toBe('COLLECTED');
      expect(data.evil).toBeUndefined();
      expect(data.tests).toBeUndefined();
    });

    test('returns 404 for an order outside the company', async () => {
      const prisma = createPrisma();
      prisma.labOrder.findFirst.mockResolvedValue(null);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.updateOrder(req({ params: { id: 'foreign' }, body: { notes: 'x' } }), res);

      expect(res.statusCode).toBe(404);
      expect(prisma.labOrder.update).not.toHaveBeenCalled();
    });

    test('rejects jumping the order status forward to bypass the workflow', async () => {
      const prisma = createPrisma();
      prisma.labOrder.findFirst.mockResolvedValue(makeOrder());
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.updateOrder(req({ params: { id: 'order-1' }, body: { status: 'SIGNED' } }), res);

      expect(res.statusCode).toBe(400);
      expect(prisma.labOrder.update).not.toHaveBeenCalled();
    });

    test('allows setting the same status without a transition error', async () => {
      const prisma = createPrisma();
      prisma.labOrder.findFirst.mockResolvedValue(makeOrder());
      prisma.labOrder.update.mockResolvedValue(makeOrder());
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.updateOrder(req({ params: { id: 'order-1' }, body: { status: 'pending' } }), res);

      expect(res.statusCode).toBe(200);
      expect(prisma.labOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'PENDING' }) })
      );
    });

    test('rejects replacing tests after results have been entered', async () => {
      const prisma = createPrisma();
      prisma.labOrder.findFirst.mockResolvedValue(makeOrder({ reportStatus: 'RESULTS_ENTERED' }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.updateOrder(
        req({ params: { id: 'order-1' }, body: { testIds: [{ testId: 'test-3' }] } }),
        res
      );

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('لا يمكن تعديل اختبارات الطلب بعد بدء إدخال النتائج');
      expect(prisma.labOrderTest.deleteMany).not.toHaveBeenCalled();
      expect(prisma.labOrder.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteOrder', () => {
    test('deletes an order inside the company', async () => {
      const prisma = createPrisma();
      prisma.labOrder.findFirst.mockResolvedValue({ id: 'order-1', companyId: 'company-1' });
      prisma.labOrder.delete.mockResolvedValue({ id: 'order-1' });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.deleteOrder(req({ params: { id: 'order-1' } }), res);

      expect(res.statusCode).toBe(200);
      expect(prisma.labOrder.delete).toHaveBeenCalledWith({ where: { id: 'order-1' } });
      expect(res.payload.data.id).toBe('order-1');
    });

    test('returns 404 for a foreign order', async () => {
      const prisma = createPrisma();
      prisma.labOrder.findFirst.mockResolvedValue(null);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.deleteOrder(req({ params: { id: 'foreign' } }), res);

      expect(res.statusCode).toBe(404);
      expect(prisma.labOrder.delete).not.toHaveBeenCalled();
    });
  });

  describe('company scoping', () => {
    test('returns 403 when companyId is missing for list', async () => {
      const prisma = createPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getAllOrders(req({ user: {} }), res);

      expect(res.statusCode).toBe(403);
      expect(prisma.labOrder.findMany).not.toHaveBeenCalled();
    });

    test('returns 404 for review/sign/deliver on a foreign order', async () => {
      const prisma = createPrisma();
      prisma.labOrder.findFirst.mockResolvedValue(null);
      getSharedPrismaClient.mockReturnValue(prisma);

      for (const action of ['reviewOrder', 'signOrder', 'markDelivered']) {
        const res = createResponse();
        await controller[action](req({ params: { id: 'foreign' } }), res);
        expect(res.statusCode).toBe(404);
        expect(res.payload.error).toBe('طلب التحاليل غير موجود');
      }
    });
  });
});
