jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
  getSharedPrismaClientAsync: jest.fn(),
}));

jest.mock('../../services/dentalWorkOrderService', () => ({
  generateWorkOrderPdf: jest.fn(),
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const { generateWorkOrderPdf } = require('../../services/dentalWorkOrderService');
const { estimateLeadDays, suggestDueDate } = require('../../services/dentalDeliveryEstimate');
const { parseScanImage } = require('../../services/dentalScanParser');
const adminController = require('../../controller/dentalLabController');
const portalController = require('../../controller/dentalLabPortalController');

const createResponse = () => {
  const response = {
    statusCode: 200,
    payload: null,
    sent: null,
    headers: {},
    status: jest.fn((code) => {
      response.statusCode = code;
      return response;
    }),
    json: jest.fn((payload) => {
      response.payload = payload;
      return response;
    }),
    setHeader: jest.fn((name, value) => {
      response.headers[name] = value;
      return response;
    }),
    send: jest.fn((body) => {
      response.sent = body;
      return response;
    }),
  };
  return response;
};

const createPrisma = (overrides = {}) => {
  const prisma = {
    dentalLabDoctor: {
      findFirst: jest.fn(),
    },
    dentalWorkType: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    dentalLabCase: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    dentalCaseStatusHistory: {
      create: jest.fn(),
    },
    dentalSetting: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn(),
    },
    workTypeStageTemplate: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    financialPosting: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    $transaction: jest.fn((fn) => fn(prisma)),
    ...overrides,
  };
  return prisma;
};

const req = (overrides = {}) => ({
  user: { companyId: 'company-1', id: 'user-1', firstName: 'أحمد', lastName: 'محمود', role: 'COMPANY_ADMIN' },
  dentist: { id: 'dent-1', companyId: 'company-1', name: 'د. سارة', clinicName: 'عيادة النور' },
  query: {},
  params: {},
  body: {},
  headers: {},
  file: null,
  ...overrides,
});

const makeCase = (overrides = {}) => ({
  id: 'case-1',
  companyId: 'company-1',
  caseNumber: 'DL-20260809-0001',
  doctorId: 'dent-1',
  doctorName: 'د. سارة',
  patientName: 'مريض',
  workTypeId: 'wt-1',
  workTypeName: 'تاج إيماكس',
  status: 'RECEIVED',
  orderStatus: 'PENDING',
  source: 'PORTAL',
  dueDate: new Date('2026-08-13T00:00:00.000Z'),
  priceSnapshot: 150,
  discount: 0,
  total: 150,
  paid: 0,
  remaining: 150,
  paymentStatus: 'UNPAID',
  stages: [],
  ...overrides,
});

describe('dentalLabWave2', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('estimateLeadDays', () => {
    test('averages historical delivered/closed lead times rounded to 1 decimal', async () => {
      const prisma = createPrisma();
      prisma.dentalLabCase.findMany.mockResolvedValue([
        { receivedDate: new Date('2026-08-01T10:00:00.000Z'), deliveredAt: new Date('2026-08-04T10:00:00.000Z') },
        { receivedDate: new Date('2026-08-01T10:00:00.000Z'), deliveredAt: new Date('2026-08-07T10:00:00.000Z') },
      ]);
      getSharedPrismaClient.mockReturnValue(prisma);

      const estimate = await estimateLeadDays(prisma, 'company-1', 'wt-1');

      expect(prisma.dentalLabCase.findMany).toHaveBeenCalledWith({
        where: {
          companyId: 'company-1',
          workTypeId: 'wt-1',
          status: { in: ['DELIVERED', 'CLOSED'] },
          deliveredAt: { not: null },
        },
        select: { receivedDate: true, deliveredAt: true },
      });
      expect(estimate).toEqual({ days: 4.5, source: 'history', sampleSize: 2 });
    });

    test('falls back to the work type leadTimeDays when there is no history', async () => {
      const prisma = createPrisma();
      prisma.dentalLabCase.findMany.mockResolvedValue([]);
      prisma.dentalWorkType.findUnique.mockResolvedValue({ id: 'wt-1', leadTimeDays: 7 });
      getSharedPrismaClient.mockReturnValue(prisma);

      const estimate = await estimateLeadDays(prisma, 'company-1', 'wt-1');

      expect(prisma.dentalWorkType.findUnique).toHaveBeenCalledWith({ where: { id: 'wt-1' } });
      expect(estimate).toEqual({ days: 7, source: 'default', sampleSize: 0 });
    });

    test('defaults to 5 days when the work type is missing', async () => {
      const prisma = createPrisma();
      prisma.dentalLabCase.findMany.mockResolvedValue([]);
      prisma.dentalWorkType.findUnique.mockResolvedValue(null);
      getSharedPrismaClient.mockReturnValue(prisma);

      const estimate = await estimateLeadDays(prisma, 'company-1', 'wt-x');

      expect(estimate).toEqual({ days: 5, source: 'default', sampleSize: 0 });
    });

    test('clamps the historical estimate to a minimum of 1 day', async () => {
      const prisma = createPrisma();
      prisma.dentalLabCase.findMany.mockResolvedValue([
        { receivedDate: new Date('2026-08-01T10:00:00.000Z'), deliveredAt: new Date('2026-08-01T12:00:00.000Z') },
      ]);
      getSharedPrismaClient.mockReturnValue(prisma);

      const estimate = await estimateLeadDays(prisma, 'company-1', 'wt-1');

      expect(estimate.days).toBe(1);
    });
  });

  describe('suggestDueDate', () => {
    test('adds the estimated days to the base date', async () => {
      const prisma = createPrisma();
      prisma.dentalLabCase.findMany.mockResolvedValue([]);
      prisma.dentalWorkType.findUnique.mockResolvedValue({ id: 'wt-1', leadTimeDays: 3 });
      getSharedPrismaClient.mockReturnValue(prisma);

      const base = new Date('2026-08-10T12:00:00.000Z');
      const due = await suggestDueDate(prisma, 'company-1', 'wt-1', base);

      expect(due.toISOString().split('T')[0]).toBe('2026-08-13');
    });
  });

  describe('admin createCase', () => {
    test('sets a smart dueDate when body.dueDate is empty', async () => {
      const prisma = createPrisma();
      prisma.dentalWorkType.findFirst.mockResolvedValue({ id: 'wt-1', name: 'تاج زيركون', price: 200, category: 'تجميلي' });
      prisma.dentalSetting.findMany.mockResolvedValue([]);
      prisma.dentalLabCase.findMany.mockResolvedValue([]);
      prisma.dentalWorkType.findUnique.mockResolvedValue({ id: 'wt-1', leadTimeDays: 4 });
      prisma.dentalLabCase.findFirst.mockResolvedValue(null);
      prisma.dentalLabCase.create.mockResolvedValue(makeCase({ workTypeName: 'تاج زيركون', priceSnapshot: 200, total: 200 }));
      prisma.dentalCaseStatusHistory.create.mockResolvedValue({});
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await adminController.createCase(req({ body: { workTypeId: 'wt-1', patientName: 'مريض' } }), res);

      expect(res.statusCode).toBe(200);
      const data = prisma.dentalLabCase.create.mock.calls[0][0].data;
      const expected = await suggestDueDate(prisma, undefined, 'wt-1');
      expect(Math.abs(data.dueDate.getTime() - expected.getTime())).toBeLessThan(1000);
    });
  });

  describe('portal placeOrder', () => {
    test('multi-item cart creates N cases with shared patient fields and returns created + totalAll', async () => {
      const prisma = createPrisma();
      prisma.dentalWorkType.findFirst
        .mockResolvedValueOnce({ id: 'wt-1', name: 'تاج إيماكس', price: 150, category: 'تجميلي' })
        .mockResolvedValueOnce({ id: 'wt-2', name: 'جسر', price: 300, category: 'جسر' });
      prisma.dentalSetting.findMany.mockResolvedValue([]);
      prisma.dentalLabCase.findMany.mockResolvedValue([]);
      prisma.dentalWorkType.findUnique.mockResolvedValue({ id: 'wt-1', leadTimeDays: 3 });
      prisma.dentalLabCase.findFirst.mockResolvedValue(null);
      prisma.dentalLabCase.create
        .mockResolvedValueOnce(makeCase({ id: 'case-1', caseNumber: 'DL-20260809-0001', workTypeName: 'تاج إيماكس', total: 150 }))
        .mockResolvedValueOnce(makeCase({ id: 'case-2', caseNumber: 'DL-20260809-0002', workTypeName: 'جسر', total: 300 }));
      prisma.dentalCaseStatusHistory.create.mockResolvedValue({});
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await portalController.placeOrder(
        req({
          body: {
            items: [
              { workTypeId: 'wt-1', teeth: '11', shade: 'A1' },
              { workTypeId: 'wt-2', teeth: '12', material: 'زيركون' },
            ],
            patientName: 'مريض مشترك',
            patientPhone: '0111',
          },
        }),
        res
      );

      expect(res.statusCode).toBe(200);
      expect(prisma.$transaction).toHaveBeenCalled();

      const createCalls = prisma.dentalLabCase.create.mock.calls;
      expect(createCalls).toHaveLength(2);
      for (const call of createCalls) {
        expect(call[0].data.companyId).toBe('company-1');
        expect(call[0].data.doctorId).toBe('dent-1');
        expect(call[0].data.doctorName).toBe('د. سارة');
        expect(call[0].data.patientName).toBe('مريض مشترك');
        expect(call[0].data.patientPhone).toBe('0111');
        expect(call[0].data.status).toBe('RECEIVED');
        expect(call[0].data.source).toBe('PORTAL');
        expect(call[0].data.dueDate).toBeInstanceOf(Date);
      }
      expect(createCalls[0][0].data.workTypeName).toBe('تاج إيماكس');
      expect(createCalls[0][0].data.teeth).toBe('11');
      expect(createCalls[0][0].data.shade).toBe('A1');
      expect(createCalls[1][0].data.workTypeName).toBe('جسر');
      expect(createCalls[1][0].data.material).toBe('زيركون');

      expect(res.payload.data.created).toEqual([
        { id: 'case-1', caseNumber: 'DL-20260809-0001', workTypeName: 'تاج إيماكس', total: 150 },
        { id: 'case-2', caseNumber: 'DL-20260809-0002', workTypeName: 'جسر', total: 300 },
      ]);
      expect(res.payload.data.totalAll).toBe(450);
      expect(prisma.dentalCaseStatusHistory.create).toHaveBeenCalledTimes(2);
    });

    test('multi-item requires a workTypeId per item', async () => {
      const prisma = createPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await portalController.placeOrder(
        req({ body: { items: [{ teeth: '11' }], patientName: 'مريض' } }),
        res
      );

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('نوع الشغل مطلوب لكل عنصر');
      expect(prisma.dentalLabCase.create).not.toHaveBeenCalled();
    });

    test('single-item keeps id/caseNumber and also exposes created + totalAll', async () => {
      const prisma = createPrisma();
      prisma.dentalWorkType.findFirst.mockResolvedValue({ id: 'wt-1', name: 'تاج إيماكس', price: 150, category: 'تجميلي' });
      prisma.dentalSetting.findMany.mockResolvedValue([]);
      prisma.dentalLabCase.findMany.mockResolvedValue([]);
      prisma.dentalWorkType.findUnique.mockResolvedValue({ id: 'wt-1', leadTimeDays: 3 });
      prisma.dentalLabCase.findFirst.mockResolvedValue(null);
      prisma.dentalLabCase.create.mockResolvedValue(makeCase());
      prisma.dentalCaseStatusHistory.create.mockResolvedValue({});
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await portalController.placeOrder(req({ body: { workTypeId: 'wt-1', patientName: 'مريض' } }), res);

      expect(res.statusCode).toBe(200);
      expect(res.payload.data.id).toBe('case-1');
      expect(res.payload.data.caseNumber).toBe('DL-20260809-0001');
      expect(res.payload.data.total).toBe(150);
      expect(res.payload.data.created).toEqual([
        { id: 'case-1', caseNumber: 'DL-20260809-0001', workTypeName: 'تاج إيماكس', total: 150 },
      ]);
      expect(res.payload.data.totalAll).toBe(150);
      expect(res.payload.data.dueDate).toBeInstanceOf(Date);
    });
  });

  describe('portal getWorkOrderPdf', () => {
    test('returns a 200 application/pdf buffered response for a case owned by the dentist', async () => {
      const prisma = createPrisma();
      prisma.dentalLabCase.findFirst.mockResolvedValue(makeCase());
      prisma.dentalSetting.findMany.mockResolvedValue([
        { key: 'workOrderHeader', value: { labName: 'معمل النور', address: 'شارع 1' } },
      ]);
      generateWorkOrderPdf.mockResolvedValue({
        buffer: Buffer.from('%PDF-1.4 portal'),
        caseNumber: 'DL-20260809-0001',
      });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await portalController.getWorkOrderPdf(req({ params: { id: 'case-1' } }), res);

      expect(prisma.dentalLabCase.findFirst).toHaveBeenCalledWith({
        where: { id: 'case-1', companyId: 'company-1', doctorId: 'dent-1' },
        include: expect.any(Object),
      });
      expect(res.statusCode).toBe(200);
      expect(res.headers['Content-Type']).toBe('application/pdf');
      expect(res.headers['Content-Disposition']).toBe('inline; filename="work-order-DL-20260809-0001.pdf"');
      expect(Buffer.isBuffer(res.sent)).toBe(true);
      expect(res.sent.toString()).toBe('%PDF-1.4 portal');
      expect(generateWorkOrderPdf).toHaveBeenCalledWith(
        expect.objectContaining({
          company: expect.objectContaining({ name: 'عيادة النور' }),
          caseRow: expect.objectContaining({ id: 'case-1', caseNumber: 'DL-20260809-0001' }),
          workOrderHeader: expect.objectContaining({ labName: 'معمل النور' }),
        })
      );
    });

    test('returns 404 for a case outside the dentist', async () => {
      const prisma = createPrisma();
      prisma.dentalLabCase.findFirst.mockResolvedValue(null);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await portalController.getWorkOrderPdf(req({ params: { id: 'foreign' } }), res);

      expect(res.statusCode).toBe(404);
      expect(generateWorkOrderPdf).not.toHaveBeenCalled();
    });
  });

  describe('parseScan (AI OCR)', () => {
    test('service returns AI_NOT_CONFIGURED when no DB AI key exists', async () => {
      getSharedPrismaClient.mockReturnValue(createPrisma());
      const result = await parseScanImage({ base64: 'ZmFrZQ==', mimeType: 'image/jpeg', companyId: 'c1' });
      expect(result).toEqual({ success: false, error: 'AI_NOT_CONFIGURED' });
    });

    test('controller forwards the AI_NOT_CONFIGURED result', async () => {
      const prisma = createPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await adminController.parseScan(
        req({ file: { buffer: Buffer.from('fake-image'), mimetype: 'image/jpeg' } }),
        res
      );

      expect(res.statusCode).toBe(200);
      expect(res.payload).toEqual({ success: false, error: 'AI_NOT_CONFIGURED' });
    });

    test('rejects a request without a file', async () => {
      const prisma = createPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await adminController.parseScan(req({}), res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('لم يتم رفع أي ملف');
    });

    test('returns AI_QUOTA_EXCEEDED when all keys return 429', async () => {
      const prisma = createPrisma({
        aiKey: {
          findMany: jest.fn().mockResolvedValue([
            { id: 'k1', provider: 'GOOGLE', apiKey: 'fake-key-1', isActive: true, priority: 1 },
          ]),
        },
      });
      getSharedPrismaClient.mockReturnValue(prisma);

      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: jest.fn().mockResolvedValue('{"error":{"code":429,"message":"Resource has been exhausted"}}'),
      });

      try {
        const result = await parseScanImage({ base64: 'ZmFrZQ==', mimeType: 'image/jpeg', companyId: 'c1' });
        expect(result.success).toBe(false);
        expect(result.error).toBe('AI_QUOTA_EXCEEDED');
      } finally {
        global.fetch = originalFetch;
      }
    });

    test('falls back to second key if first key returns 429', async () => {
      const prisma = createPrisma({
        aiKey: {
          findMany: jest.fn().mockResolvedValue([
            { id: 'k1', provider: 'GOOGLE', apiKey: 'fake-key-1', isActive: true, priority: 1 },
            { id: 'k2', provider: 'GOOGLE', apiKey: 'fake-key-2', isActive: true, priority: 2 },
          ]),
        },
      });
      getSharedPrismaClient.mockReturnValue(prisma);

      const originalFetch = global.fetch;
      let callCount = 0;
      global.fetch = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: false,
            status: 429,
            text: () => Promise.resolve('Resource exhausted'),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            candidates: [
              {
                content: {
                  parts: [{ text: JSON.stringify({ patientName: 'سارة أحمد', teeth: '11,12' }) }],
                },
              },
            ],
          }),
        });
      });

      try {
        const result = await parseScanImage({ base64: 'ZmFrZQ==', mimeType: 'image/jpeg', companyId: 'c1' });
        expect(result.success).toBe(true);
        expect(result.data.patientName).toBe('سارة أحمد');
        expect(callCount).toBe(2);
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe('dentalStageTemplateService auto-seed', () => {
    const {
      seedDefaultStageTemplatesForWorkType,
      getStageTemplatesForWorkType,
      resolveRoleForStageName,
    } = require('../../services/dentalStageTemplateService');

    test('auto-seeding a new work type ensures every stage requiredRole is specialized and NOT GENERAL_TECHNICIAN', async () => {
      const createdRows = [];
      const prisma = createPrisma({
        workTypeStageTemplate: {
          findMany: jest.fn().mockResolvedValue([]),
          create: jest.fn().mockImplementation(({ data }) => {
            const row = { id: `st-${createdRows.length + 1}`, ...data };
            createdRows.push(row);
            return Promise.resolve(row);
          }),
        },
      });

      const seeded = await seedDefaultStageTemplatesForWorkType(prisma, 'company-1', 'wt-new-zircon');
      expect(seeded.length).toBe(5);

      // Verify each stage has a specialized role and none is GENERAL_TECHNICIAN
      const roles = seeded.map((s) => s.requiredRole);
      for (const role of roles) {
        expect(role).toBeDefined();
        expect(role).not.toBe('GENERAL_TECHNICIAN');
      }

      expect(roles).toEqual([
        'RECEPTION_LOGISTICS',
        'CAD_DESIGNER',
        'CERAMIST',
        'QC_INSPECTOR',
        'RECEPTION_LOGISTICS',
      ]);
    });

    test('resolves legacy production stage names to correct specialized roles', () => {
      expect(resolveRoleForStageName('designer')).toBe('CAD_DESIGNER');
      expect(resolveRoleForStageName('cad cam .printer')).toBe('CERAMIST');
      expect(resolveRoleForStageName('finish')).toBe('FINISHING_POLISHING');
      expect(resolveRoleForStageName('مراجعه')).toBe('QC_INSPECTOR');
      expect(resolveRoleForStageName('خروج')).toBe('RECEPTION_LOGISTICS');
      expect(resolveRoleForStageName('الاستلام')).toBe('RECEPTION_LOGISTICS');
      expect(resolveRoleForStageName('التصميم')).toBe('CAD_DESIGNER');
      expect(resolveRoleForStageName('التصنيع')).toBe('CERAMIST');
      expect(resolveRoleForStageName('مراجعة الجودة')).toBe('QC_INSPECTOR');
      expect(resolveRoleForStageName('التسليم')).toBe('RECEPTION_LOGISTICS');
    });
  });
});
