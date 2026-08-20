jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const repsController = require('../../controller/radiologyMarketingRepsController');
const sourcesController = require('../../controller/radiologyReferralSourcesController');
const partnersController = require('../../controller/radiologyExternalPartnersController');

const createResponse = () => {
  const response = {
    statusCode: 200,
    payload: null,
    status: jest.fn((code) => { response.statusCode = code; return response; }),
    json: jest.fn((payload) => { response.payload = payload; return response; }),
    setHeader: jest.fn(),
    send: jest.fn(),
  };
  return response;
};

const createPrisma = (overrides = {}) => {
  const prisma = {
    radiologyMarketingRep: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    radiologyReferralSource: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    radiologyPhysicianSourceLink: {
      findMany: jest.fn(),
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    radiologyExternalPartner: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    radiologyReferringPhysician: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    radiologyStudy: {
      findMany: jest.fn(),
    },
    insuranceCompany: {
      findFirst: jest.fn(),
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

const makeRep = (overrides = {}) => ({
  id: 'rep-1', companyId: 'company-1', name: 'علي إسماعيل', phone: '0100', userId: null, isActive: true,
  createdAt: new Date(), updatedAt: new Date(), ...overrides,
});

const makeSource = (overrides = {}) => ({
  id: 'src-1', companyId: 'company-1', name: 'عيادات النخبة', type: 'CLINIC', phone: null,
  contactName: null, marketingRepId: null, insuranceCompanyId: null, isActive: true,
  createdAt: new Date(), updatedAt: new Date(), ...overrides,
});

const makePartner = (overrides = {}) => ({
  id: 'part-1', companyId: 'company-1', name: 'مستشفى النيل', phone: null, contactName: null, isActive: true,
  createdAt: new Date(), updatedAt: new Date(), ...overrides,
});

describe('radiologyMarketingRepsController', () => {
  beforeEach(() => jest.clearAllMocks());

  test('list — scoped to company, filters search, 403 without company', async () => {
    const prisma = createPrisma();
    prisma.radiologyMarketingRep.findMany.mockResolvedValue([makeRep()]);
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await repsController.listMarketingReps(req({ query: { search: 'علي' } }), res);
    expect(res.statusCode).toBe(200);
    expect(prisma.radiologyMarketingRep.findMany.mock.calls[0][0].where).toEqual({
      companyId: 'company-1', isActive: true,
      OR: [{ name: { contains: 'علي', mode: 'insensitive' } }, { phone: { contains: 'علي', mode: 'insensitive' } }],
    });

    const res2 = createResponse();
    await repsController.listMarketingReps(req({ user: {} }), res2);
    expect(res2.statusCode).toBe(403);
  });

  test('create — stores company + name', async () => {
    const prisma = createPrisma();
    prisma.radiologyMarketingRep.create.mockImplementation(({ data }) => Promise.resolve({ id: 'rep-1', ...data }));
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await repsController.createMarketingRep(req({ body: { name: 'علي إسماعيل', phone: '0100' } }), res);
    expect(res.statusCode).toBe(200);
    expect(prisma.radiologyMarketingRep.create.mock.calls[0][0].data).toMatchObject({ companyId: 'company-1', name: 'علي إسماعيل' });
  });

  test('create — rejects missing name', async () => {
    const prisma = createPrisma();
    getSharedPrismaClient.mockReturnValue(prisma);
    const res = createResponse();
    await repsController.createMarketingRep(req({ body: {} }), res);
    expect(res.statusCode).toBe(400);
  });

  test('update — 404 for foreign rep', async () => {
    const prisma = createPrisma();
    prisma.radiologyMarketingRep.findFirst.mockResolvedValue(null);
    getSharedPrismaClient.mockReturnValue(prisma);
    const res = createResponse();
    await repsController.updateMarketingRep(req({ params: { id: 'x' }, body: { name: 'x' } }), res);
    expect(res.statusCode).toBe(404);
  });

  test('update — sets marketingRepId via company-scoped lookup', async () => {
    const prisma = createPrisma();
    prisma.radiologyMarketingRep.findFirst.mockResolvedValue(makeRep());
    prisma.radiologyMarketingRep.update.mockImplementation(({ data }) => Promise.resolve({ ...makeRep(), ...data }));
    getSharedPrismaClient.mockReturnValue(prisma);
    const res = createResponse();
    await repsController.updateMarketingRep(req({ params: { id: 'rep-1' }, body: { name: 'علي الجديد' } }), res);
    expect(res.statusCode).toBe(200);
    expect(prisma.radiologyMarketingRep.update.mock.calls[0][0]).toEqual({
      where: { id: 'rep-1' }, data: { name: 'علي الجديد' },
    });
  });

  test('delete — soft delete (isActive=false), 404 for foreign', async () => {
    const prisma = createPrisma();
    prisma.radiologyMarketingRep.findFirst.mockResolvedValue(makeRep());
    prisma.radiologyMarketingRep.update.mockImplementation(({ data }) => Promise.resolve({ ...makeRep(), ...data }));
    getSharedPrismaClient.mockReturnValue(prisma);
    const res = createResponse();
    await repsController.deleteMarketingRep(req({ params: { id: 'rep-1' } }), res);
    expect(res.statusCode).toBe(200);
    expect(prisma.radiologyMarketingRep.update).toHaveBeenCalledWith({ where: { id: 'rep-1' }, data: { isActive: false } });

    const prisma2 = createPrisma();
    prisma2.radiologyMarketingRep.findFirst.mockResolvedValue(null);
    getSharedPrismaClient.mockReturnValue(prisma2);
    const res2 = createResponse();
    await repsController.deleteMarketingRep(req({ params: { id: 'x' } }), res2);
    expect(res2.statusCode).toBe(404);
  });

  test('portfolio — aggregates studies per rep (count/revenue/delivered/cash/insurance)', async () => {
    const prisma = createPrisma();
    prisma.radiologyStudy.findMany.mockResolvedValue([
      { marketingRepId: 'rep-1', priceSnapshot: 500, additionAmount: 0, billingType: 'CASH', status: 'DELIVERED', referralSourceId: 'src-1', referringPhysicianId: 'doc-1' },
      { marketingRepId: 'rep-1', priceSnapshot: 300, additionAmount: 0, billingType: 'INSURANCE', status: 'PENDING_REPORT', referralSourceId: null, referringPhysicianId: null },
      { marketingRepId: null, priceSnapshot: 999, additionAmount: 0, billingType: 'CASH', status: 'DELIVERED', referralSourceId: null, referringPhysicianId: null },
    ]);
    prisma.radiologyMarketingRep.findMany.mockResolvedValue([{ id: 'rep-1', name: 'علي إسماعيل' }]);
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await repsController.repPortfolio(req(), res);
    expect(res.statusCode).toBe(200);
    expect(res.payload.data.rows).toHaveLength(1);
    const row = res.payload.data.rows[0];
    expect(row.count).toBe(2);
    expect(row.deliveredCount).toBe(1);
    expect(row.revenue).toBe(800);
    expect(row.cashRevenue).toBe(500);
    expect(row.insuranceRevenue).toBe(300);
    expect(row.sourceCount).toBe(1);
    expect(row.physicianCount).toBe(1);
    expect(res.payload.data.totalRevenue).toBe(800);
    expect(res.payload.data.totalCount).toBe(2);
  });
});

describe('radiologyReferralSourcesController', () => {
  beforeEach(() => jest.clearAllMocks());

  test('list — resolves marketingRepName and physician links', async () => {
    const prisma = createPrisma();
    prisma.radiologyReferralSource.findMany.mockResolvedValue([makeSource({ marketingRepId: 'rep-1' })]);
    prisma.radiologyMarketingRep.findMany.mockResolvedValue([{ id: 'rep-1', name: 'علي إسماعيل' }]);
    prisma.radiologyPhysicianSourceLink.findMany.mockResolvedValue([{ sourceId: 'src-1', physicianId: 'doc-1' }]);
    prisma.radiologyReferringPhysician.findMany.mockResolvedValue([{ id: 'doc-1', name: 'د. محمد أحمد' }]);
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await sourcesController.listSources(req(), res);
    expect(res.statusCode).toBe(200);
    const row = res.payload.data[0];
    expect(row.marketingRepName).toBe('علي إسماعيل');
    expect(row.physicianIds).toEqual(['doc-1']);
    expect(row.physicians).toEqual([{ id: 'doc-1', name: 'د. محمد أحمد' }]);
  });

  test('create — rejects duplicate name (P2002 → 400)', async () => {
    const prisma = createPrisma();
    prisma.radiologyReferralSource.create.mockRejectedValue({ code: 'P2002' });
    getSharedPrismaClient.mockReturnValue(prisma);
    const res = createResponse();
    await sourcesController.createSource(req({ body: { name: 'عيادات النخبة' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.payload.error).toBe('جهة إحالة بهذا الاسم موجودة بالفعل');
  });

  test('create — rejects invalid type and missing name', async () => {
    const prisma = createPrisma();
    getSharedPrismaClient.mockReturnValue(prisma);
    const res = createResponse();
    await sourcesController.createSource(req({ body: { name: 'x', type: 'BAD' } }), res);
    expect(res.statusCode).toBe(400);
    const res2 = createResponse();
    await sourcesController.createSource(req({ body: {} }), res2);
    expect(res2.statusCode).toBe(400);
  });

  test('create — validates optional marketingRepId (company-scoped)', async () => {
    const prisma = createPrisma();
    prisma.radiologyMarketingRep.findFirst.mockResolvedValue(null); // invalid rep
    getSharedPrismaClient.mockReturnValue(prisma);
    const res = createResponse();
    await sourcesController.createSource(req({ body: { name: 'عيادات', marketingRepId: 'foreign' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.payload.error).toBe('المندوب غير موجود');
    expect(prisma.radiologyReferralSource.create).not.toHaveBeenCalled();
  });

  test('update — 404 for foreign source', async () => {
    const prisma = createPrisma();
    prisma.radiologyReferralSource.findFirst.mockResolvedValue(null);
    getSharedPrismaClient.mockReturnValue(prisma);
    const res = createResponse();
    await sourcesController.updateSource(req({ params: { id: 'x' }, body: {} }), res);
    expect(res.statusCode).toBe(404);
  });

  test('setSourcePhysicians — replaces links transactionally and validates physicians', async () => {
    const prisma = createPrisma();
    prisma.radiologyReferralSource.findFirst.mockResolvedValue(makeSource());
    prisma.radiologyReferringPhysician.findMany.mockResolvedValue([{ id: 'doc-1' }]); // only 1 of 2 found → 400
    getSharedPrismaClient.mockReturnValue(prisma);
    const res = createResponse();
    await sourcesController.setSourcePhysicians(req({ params: { id: 'src-1' }, body: { physicianIds: ['doc-1', 'doc-2'] } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.payload.error).toBe('أحد الأطباء غير موجود');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  test('setSourcePhysicians — 404 for foreign source', async () => {
    const prisma = createPrisma();
    prisma.radiologyReferralSource.findFirst.mockResolvedValue(null);
    getSharedPrismaClient.mockReturnValue(prisma);
    const res = createResponse();
    await sourcesController.setSourcePhysicians(req({ params: { id: 'x' }, body: { physicianIds: [] } }), res);
    expect(res.statusCode).toBe(404);
  });

  test('getPhysicianSources — 404 for foreign physician', async () => {
    const prisma = createPrisma();
    prisma.radiologyReferringPhysician.findFirst.mockResolvedValue(null);
    getSharedPrismaClient.mockReturnValue(prisma);
    const res = createResponse();
    await sourcesController.getPhysicianSources(req({ params: { id: 'x' } }), res);
    expect(res.statusCode).toBe(404);
  });
});

describe('radiologyExternalPartnersController', () => {
  beforeEach(() => jest.clearAllMocks());

  test('list — scoped, search filter', async () => {
    const prisma = createPrisma();
    prisma.radiologyExternalPartner.findMany.mockResolvedValue([makePartner()]);
    getSharedPrismaClient.mockReturnValue(prisma);
    const res = createResponse();
    await partnersController.listExternalPartners(req({ query: { search: 'نيل' } }), res);
    expect(res.statusCode).toBe(200);
    expect(prisma.radiologyExternalPartner.findMany.mock.calls[0][0].where.OR).toBeTruthy();
  });

  test('create — stores partner, rejects missing name', async () => {
    const prisma = createPrisma();
    prisma.radiologyExternalPartner.create.mockImplementation(({ data }) => Promise.resolve({ id: 'part-1', ...data }));
    getSharedPrismaClient.mockReturnValue(prisma);
    const res = createResponse();
    await partnersController.createExternalPartner(req({ body: { name: 'مستشفى النيل' } }), res);
    expect(res.statusCode).toBe(200);
    expect(prisma.radiologyExternalPartner.create.mock.calls[0][0].data.name).toBe('مستشفى النيل');

    const res2 = createResponse();
    await partnersController.createExternalPartner(req({ body: {} }), res2);
    expect(res2.statusCode).toBe(400);
  });

  test('update — 404 for foreign partner', async () => {
    const prisma = createPrisma();
    prisma.radiologyExternalPartner.findFirst.mockResolvedValue(null);
    getSharedPrismaClient.mockReturnValue(prisma);
    const res = createResponse();
    await partnersController.updateExternalPartner(req({ params: { id: 'x' }, body: {} }), res);
    expect(res.statusCode).toBe(404);
  });

  test('delete — soft delete', async () => {
    const prisma = createPrisma();
    prisma.radiologyExternalPartner.findFirst.mockResolvedValue(makePartner());
    prisma.radiologyExternalPartner.update.mockImplementation(({ data }) => Promise.resolve({ ...makePartner(), ...data }));
    getSharedPrismaClient.mockReturnValue(prisma);
    const res = createResponse();
    await partnersController.deleteExternalPartner(req({ params: { id: 'part-1' } }), res);
    expect(res.statusCode).toBe(200);
    expect(prisma.radiologyExternalPartner.update).toHaveBeenCalledWith({ where: { id: 'part-1' }, data: { isActive: false } });
  });
});
