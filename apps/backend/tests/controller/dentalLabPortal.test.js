jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
  getSharedPrismaClientAsync: jest.fn(),
}));

jest.mock('../../utils/jwtSecret', () => ({
  getJwtSecret: () => 'test-secret',
  getJwtRefreshSecret: () => 'test-secret',
  isMissingAuthSecretError: () => false,
}));

jest.mock('jsonwebtoken', () => {
  const actual = jest.requireActual('jsonwebtoken');
  return { ...actual, verify: jest.fn() };
});

const { getSharedPrismaClient, getSharedPrismaClientAsync } = require('../../services/sharedDatabase');
const jwt = require('jsonwebtoken');
const controller = require('../../controller/dentalLabPortalController');
const { dentalPortalAuth } = require('../../utils/dentalPortalAuth');

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
    company: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'company-1',
        name: 'معمل النور',
        installedApps: [{ app: { slug: 'dental-lab-app' } }],
      }),
      findFirst: jest.fn().mockResolvedValue({
        id: 'company-1',
        name: 'معمل النور',
        installedApps: [{ app: { slug: 'dental-lab-app' } }],
      }),
    },
    dentalLabDoctor: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([makeDentist()]),
    },
    dentalWorkType: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    dentalLabCase: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      groupBy: jest.fn(),
    },
    dentalCaseStage: {
      update: jest.fn(),
    },
    dentalCaseAssignment: {
      create: jest.fn(),
    },
    dentalCaseAttachment: {
      create: jest.fn(),
    },
    dentalInvoice: {
      findMany: jest.fn(),
      aggregate: jest.fn(),
    },
    dentalCaseStatusHistory: {
      create: jest.fn(),
    },
    dentalSetting: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn((fn) => fn(prisma)),
    ...overrides,
  };
  return prisma;
};

const req = (overrides = {}) => ({
  user: null,
  dentist: { id: 'dent-1', companyId: 'company-1', name: 'د. سارة', clinicName: 'عيادة النور' },
  query: {},
  params: {},
  body: {},
  headers: {},
  file: null,
  ...overrides,
});

const makeDentist = (overrides = {}) => ({
  id: 'dent-1',
  companyId: 'company-1',
  name: 'د. سارة',
  phone: '01001234567',
  clinicName: 'عيادة النور',
  governorate: 'القاهرة',
  portalPin: '1234',
  creditLimit: 1000,
  isActive: true,
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
  priceSnapshot: 150,
  discount: 0,
  total: 150,
  paid: 0,
  remaining: 150,
  paymentStatus: 'UNPAID',
  stages: [{ id: 'stage-1', name: 'الاستلام', status: 'PENDING', sortOrder: 0 }],
  ...overrides,
});

describe('dentalLabPortalController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('portalLogin', () => {
    test('returns a token and dentist info on valid phone + pin', async () => {
      const prisma = createPrisma();
      prisma.dentalLabDoctor.findFirst.mockResolvedValue(makeDentist());
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.portalLogin(req({ body: { phone: '01001234567', pin: '1234', companyId: 'company-1' } }), res);

      expect(res.statusCode).toBe(200);
      expect(res.payload.data.token).toBeTruthy();
      expect(res.payload.data.dentist).toMatchObject({
        id: 'dent-1',
        name: 'د. سارة',
        clinicName: 'عيادة النور',
      });
      expect(res.payload.data.dentist.portalPin).toBeUndefined();
    });

    test('rejects a wrong pin', async () => {
      const prisma = createPrisma();
      prisma.dentalLabDoctor.findFirst.mockResolvedValue(makeDentist({ portalPin: '9999' }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.portalLogin(req({ body: { phone: '01001234567', pin: '1234' } }), res);

      expect(res.statusCode).toBe(401);
      expect(res.payload.error).toBe('رقم الهاتف أو الرقم السري غير صحيح');
    });

    test('rejects an unknown phone', async () => {
      const prisma = createPrisma();
      prisma.dentalLabDoctor.findMany.mockResolvedValue([]);
      prisma.dentalLabDoctor.findFirst.mockResolvedValue(null);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.portalLogin(req({ body: { phone: '01000000000', pin: '1234' } }), res);

      expect(res.statusCode).toBe(401);
    });

    test('requires phone and pin', async () => {
      const prisma = createPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);
      const res = createResponse();
      await controller.portalLogin(req({ body: {} }), res);
      expect(res.statusCode).toBe(400);
      expect(prisma.dentalLabDoctor.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('placeOrder', () => {
    test('creates a PORTAL case with work type snapshot, totals and default stages', async () => {
      const prisma = createPrisma();
      prisma.dentalWorkType.findFirst.mockResolvedValue({ id: 'wt-1', name: 'تاج إيماكس', price: 150, category: 'تجميلي' });
      prisma.dentalSetting.findMany.mockResolvedValue([]);
      prisma.dentalLabCase.findFirst.mockResolvedValue(null);
      prisma.dentalLabCase.create.mockResolvedValue(makeCase());
      prisma.dentalCaseStatusHistory.create.mockResolvedValue({});
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.placeOrder(
        req({ body: { workTypeId: 'wt-1', teeth: '11,21', shade: 'A1', patientName: 'مريض', patientPhone: '0111' } }),
        res
      );

      expect(res.statusCode).toBe(200);
      const data = prisma.dentalLabCase.create.mock.calls[0][0].data;
      expect(data.companyId).toBe('company-1');
      expect(data.source).toBe('PORTAL');
      expect(data.doctorId).toBe('dent-1');
      expect(data.doctorName).toBe('د. سارة');
      expect(data.workTypeId).toBe('wt-1');
      expect(data.workTypeName).toBe('تاج إيماكس');
      expect(data.status).toBe('RECEIVED');
      expect(data.priceSnapshot).toBe(150);
      expect(data.total).toBe(150);
      expect(data.paid).toBe(0);
      expect(data.remaining).toBe(150);
      expect(data.teeth).toBe('11,21');
      expect(data.shade).toBe('A1');
      expect(data.caseNumber).toMatch(/^DL-\d{8}-\d{4}$/);
      expect(data.stages.create).toHaveLength(5);

      expect(prisma.dentalCaseStatusHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            caseId: 'case-1',
            dimension: 'STAGE',
            status: 'RECEIVED',
            changedBy: 'doctor:dent-1',
            userName: 'د. سارة',
          }),
        })
      );
    });

    test('rejects an unavailable work type', async () => {
      const prisma = createPrisma();
      prisma.dentalWorkType.findFirst.mockResolvedValue(null);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.placeOrder(req({ body: { workTypeId: 'wt-x' } }), res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('نوع الشغل غير متاح');
      expect(prisma.dentalLabCase.create).not.toHaveBeenCalled();
    });
  });

  describe('myCases', () => {
    test('scopes to the dentist and exposes the current stage name', async () => {
      const prisma = createPrisma();
      prisma.dentalLabCase.findMany.mockResolvedValue([
        makeCase(),
        makeCase({ id: 'case-2', status: 'DESIGN', stages: [
          { id: 's1', name: 'الاستلام', status: 'DONE', sortOrder: 0 },
          { id: 's2', name: 'التصميم', status: 'PENDING', sortOrder: 1 },
        ] }),
      ]);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.myCases(req({ query: { status: 'RECEIVED' } }), res);

      expect(res.statusCode).toBe(200);
      expect(prisma.dentalLabCase.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { companyId: 'company-1', doctorId: 'dent-1', status: 'RECEIVED' } })
      );
      expect(res.payload.data).toHaveLength(2);
      expect(res.payload.data[0].currentStage).toBe('الاستلام');
      expect(res.payload.data[1].currentStage).toBe('التصميم');
    });
  });

  describe('myCaseDetail', () => {
    test('scopes to the dentist and returns 404 otherwise', async () => {
      const prisma = createPrisma();
      prisma.dentalLabCase.findFirst.mockResolvedValue(null);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.myCaseDetail(req({ params: { id: 'foreign' } }), res);

      expect(res.statusCode).toBe(404);
      expect(prisma.dentalLabCase.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'foreign', companyId: 'company-1', doctorId: 'dent-1' } })
      );
    });
  });

  describe('myInvoices', () => {
    test('scopes invoices to the dentist', async () => {
      const prisma = createPrisma();
      prisma.dentalInvoice.findMany.mockResolvedValue([]);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.myInvoices(req(), res);

      expect(res.statusCode).toBe(200);
      expect(prisma.dentalInvoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { companyId: 'company-1', doctorId: 'dent-1' } })
      );
    });
  });

  describe('portalDashboard', () => {
    test('returns case counts and outstanding for the dentist', async () => {
      const prisma = createPrisma();
      prisma.dentalLabCase.count.mockResolvedValueOnce(5).mockResolvedValueOnce(1);
      prisma.dentalLabCase.groupBy.mockResolvedValue([
        { status: 'RECEIVED', _count: { _all: 3 } },
        { status: 'READY', _count: { _all: 1 } },
      ]);
      prisma.dentalInvoice.aggregate.mockResolvedValue({ _sum: { remaining: 250 } });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.portalDashboard(req(), res);

      expect(res.statusCode).toBe(200);
      expect(res.payload.data.totalCases).toBe(5);
      expect(res.payload.data.statusCounts).toEqual({ RECEIVED: 3, READY: 1 });
      expect(res.payload.data.readyForDelivery).toBe(1);
      expect(res.payload.data.outstanding).toBe(250);
    });
  });

  describe('dentalPortalAuth middleware', () => {
    test('attaches req.dentist for a valid token', async () => {
      const prisma = createPrisma();
      prisma.dentalLabDoctor.findUnique.mockResolvedValue(makeDentist());
      getSharedPrismaClientAsync.mockResolvedValue(prisma);
      jwt.verify.mockReturnValue({ dentistId: 'dent-1', companyId: 'company-1', role: 'DENTAL_DOCTOR' });

      const response = createResponse();
      const request = {
        headers: { authorization: 'Bearer valid-token' },
        dentist: null,
      };
      const next = jest.fn();
      await dentalPortalAuth(request, response, next);

      expect(request.dentist).toMatchObject({ id: 'dent-1', companyId: 'company-1', name: 'د. سارة' });
      expect(next).toHaveBeenCalled();
    });

    test('rejects a missing token', async () => {
      const response = createResponse();
      const request = { headers: {}, dentist: null };
      const next = jest.fn();
      await dentalPortalAuth(request, response, next);

      expect(response.statusCode).toBe(401);
      expect(next).not.toHaveBeenCalled();
    });

    test('rejects a token without the DENTAL_DOCTOR role', async () => {
      jwt.verify.mockReturnValue({ dentistId: 'dent-1', companyId: 'company-1', role: 'CUSTOMER' });
      const response = createResponse();
      const request = { headers: { authorization: 'Bearer bad' }, dentist: null };
      const next = jest.fn();
      await dentalPortalAuth(request, response, next);

      expect(response.statusCode).toBe(401);
      expect(next).not.toHaveBeenCalled();
    });
  });
});