jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
}));

jest.mock('../../services/dentalWorkOrderService', () => ({
  generateWorkOrderPdf: jest.fn(),
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const { generateWorkOrderPdf } = require('../../services/dentalWorkOrderService');
const controller = require('../../controller/dentalLabController');
const { dentalRoleGuard, checkDentalTechnicianUser } = require('../../services/dentalRoles');

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
    dentalLabCase: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      groupBy: jest.fn(),
    },
    dentalCaseStage: {
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    dentalCaseAssignment: {
      findMany: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
      groupBy: jest.fn(),
    },
    dentalQualityCheck: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
dentalRefabrication: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    dentalCreditNote: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }),
      groupBy: jest.fn().mockResolvedValue([]),
    },
    dentalCaseStatusHistory: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    dentalSetting: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    dentalInvoice: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn(),
    },
    dentalLabDoctor: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    dentalTechnician: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    dentalTechnicianPayout: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    dentalMonthlySettlement: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    userCompany: {
      findMany: jest.fn(),
    },
    company: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn((fn) => fn(prisma)),
    ...overrides,
  };
  return prisma;
};

const req = (overrides = {}) => ({
  user: { companyId: 'company-1', id: 'user-1', firstName: 'أحمد', lastName: 'محمود', role: 'COMPANY_ADMIN' },
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
  doctorId: 'doc-1',
  doctorName: 'د. أحمد',
  patientName: 'محمد علي',
  patientPhone: '01001234567',
  workTypeId: 'wt-1',
  workTypeName: 'تاج زيركون',
  teeth: '11,21',
  shade: 'A1',
  material: 'زيركون',
  status: 'RECEIVED',
  orderStatus: 'PENDING',
  priority: 'NORMAL',
  dueDate: null,
  receivedDate: new Date('2026-08-09T10:00:00.000Z'),
  deliveredAt: null,
  source: 'MANUAL',
  priceSnapshot: 200,
  discount: 0,
  total: 200,
  paid: 0,
  remaining: 200,
  paymentStatus: 'UNPAID',
  notes: null,
  createdBy: 'user-1',
  createdAt: new Date('2026-08-09T10:00:00.000Z'),
  updatedAt: new Date('2026-08-09T10:00:00.000Z'),
  stages: [],
  doctor: null,
  workType: null,
  ...overrides,
});

describe('dentalLabController advanced features', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('recordQualityCheck', () => {
    test('creates a quality check row for the case', async () => {
      const prisma = createPrisma();
      prisma.dentalLabCase.findFirst.mockResolvedValue({ id: 'case-1', companyId: 'company-1' });
      prisma.dentalQualityCheck.create.mockResolvedValue({ id: 'qc-1', passed: true, notes: 'ممتاز' });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.recordQualityCheck(
        req({ params: { id: 'case-1' }, body: { passed: true, notes: 'ممتاز' } }),
        res
      );

      expect(res.statusCode).toBe(200);
      expect(prisma.dentalQualityCheck.create).toHaveBeenCalledWith({
        data: {
          companyId: 'company-1',
          caseId: 'case-1',
          checkedBy: 'user-1',
          checkedByName: 'أحمد محمود',
          passed: true,
          notes: 'ممتاز',
        },
      });
      expect(res.payload.data).toEqual({ id: 'qc-1', passed: true, notes: 'ممتاز' });
    });

    test('defaults passed to true and rejects a foreign case with 404', async () => {
      const prisma = createPrisma();
      prisma.dentalLabCase.findFirst.mockResolvedValue(null);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.recordQualityCheck(req({ params: { id: 'foreign' } }), res);
      expect(res.statusCode).toBe(404);
      expect(prisma.dentalQualityCheck.create).not.toHaveBeenCalled();
    });
  });

  describe('flagRefabrication', () => {
    const caseWithStages = {
      id: 'case-1',
      companyId: 'company-1',
      status: 'QC',
      stages: [
        { id: 'stage-1', name: 'الاستلام', status: 'DONE', sortOrder: 0 },
        { id: 'stage-2', name: 'التصميم', status: 'DONE', sortOrder: 1 },
        { id: 'stage-3', name: 'التصنيع', status: 'DONE', sortOrder: 2 },
        { id: 'stage-4', name: 'مراجعة الجودة', status: 'IN_PROGRESS', sortOrder: 3 },
        { id: 'stage-5', name: 'التسليم', status: 'PENDING', sortOrder: 4 },
      ],
    };

    test('creates a refabrication, resets the case status + stages and records history', async () => {
      const prisma = createPrisma();
      prisma.dentalLabCase.findFirst.mockResolvedValue(caseWithStages);
      prisma.dentalRefabrication.create.mockResolvedValue({ id: 'refab-1', status: 'OPEN', stageFrom: 'DESIGN' });
      prisma.dentalLabCase.update.mockResolvedValue({ id: 'case-1', status: 'DESIGN', orderStatus: 'IN_PROGRESS' });
      prisma.dentalCaseStage.updateMany.mockResolvedValue({ count: 5 });
      prisma.dentalCaseAssignment.deleteMany.mockResolvedValue({ count: 2 });
      prisma.dentalCaseStatusHistory.create.mockResolvedValue({});
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.flagRefabrication(
        req({ params: { id: 'case-1' }, body: { reason: 'انكسر أثناء التركيب', stageFrom: 'DESIGN' } }),
        res
      );

      expect(res.statusCode).toBe(200);
      expect(prisma.dentalRefabrication.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            companyId: 'company-1',
            caseId: 'case-1',
            reason: 'انكسر أثناء التركيب',
            stageFrom: 'DESIGN',
            status: 'OPEN',
            createdBy: 'user-1',
            createdByName: 'أحمد محمود',
          }),
        })
      );
      expect(prisma.dentalLabCase.update).toHaveBeenCalledWith({
        where: { id: 'case-1' },
        data: { status: 'DESIGN', orderStatus: 'IN_PROGRESS' },
      });
      expect(prisma.dentalCaseStage.updateMany).toHaveBeenCalledWith({
        where: { caseId: 'case-1', sortOrder: { gte: 1 } },
        data: { status: 'PENDING', startedAt: null, completedAt: null },
      });
      expect(prisma.dentalCaseStatusHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            caseId: 'case-1',
            dimension: 'STAGE',
            status: 'DESIGN',
            oldStatus: 'QC',
            reason: 'إعادة تصنيع: انكسر أثناء التركيب',
          }),
        })
      );
    });

    test('defaults stageFrom to DESIGN', async () => {
      const prisma = createPrisma();
      prisma.dentalLabCase.findFirst.mockResolvedValue({ ...caseWithStages, status: null });
      prisma.dentalRefabrication.create.mockResolvedValue({ id: 'refab-1', stageFrom: 'DESIGN' });
      prisma.dentalLabCase.update.mockResolvedValue({});
      prisma.dentalCaseStage.updateMany.mockResolvedValue({});
      prisma.dentalCaseAssignment.deleteMany.mockResolvedValue({});
      prisma.dentalCaseStatusHistory.create.mockResolvedValue({});
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.flagRefabrication(req({ params: { id: 'case-1' }, body: { reason: 'خطأ' } }), res);

      expect(prisma.dentalRefabrication.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ stageFrom: 'DESIGN' }) })
      );
    });

    test('rejects missing reason', async () => {
      const prisma = createPrisma();
      prisma.dentalLabCase.findFirst.mockResolvedValue(caseWithStages);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.flagRefabrication(req({ params: { id: 'case-1' }, body: {} }), res);
      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('سبب إعادة التصنيع مطلوب');
      expect(prisma.dentalRefabrication.create).not.toHaveBeenCalled();
    });

    test('rejects a DELIVERED stageFrom', async () => {
      const prisma = createPrisma();
      prisma.dentalLabCase.findFirst.mockResolvedValue(caseWithStages);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.flagRefabrication(
        req({ params: { id: 'case-1' }, body: { reason: 'خطأ', stageFrom: 'DELIVERED' } }),
        res
      );
      expect(res.statusCode).toBe(400);
      expect(prisma.dentalRefabrication.create).not.toHaveBeenCalled();
    });
  });

  describe('resolveRefabrication', () => {
    test('marks the refabrication as RESOLVED', async () => {
      const prisma = createPrisma();
      prisma.dentalRefabrication.findFirst.mockResolvedValue({ id: 'refab-1', status: 'OPEN' });
      prisma.dentalRefabrication.update.mockResolvedValue({ id: 'refab-1', status: 'RESOLVED' });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.resolveRefabrication(
        req({ params: { id: 'case-1', refabId: 'refab-1' }, body: { note: 'تمت المعالجة' } }),
        res
      );

      expect(res.statusCode).toBe(200);
      expect(prisma.dentalRefabrication.findFirst).toHaveBeenCalledWith({
        where: { id: 'refab-1', companyId: 'company-1', caseId: 'case-1' },
      });
      expect(prisma.dentalRefabrication.update).toHaveBeenCalledWith({
        where: { id: 'refab-1' },
        data: {
          status: 'RESOLVED',
          resolvedAt: expect.any(Date),
          resolvedBy: 'user-1',
          resolvedNote: 'تمت المعالجة',
        },
      });
    });

    test('returns 404 for a refabrication outside the case', async () => {
      const prisma = createPrisma();
      prisma.dentalRefabrication.findFirst.mockResolvedValue(null);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.resolveRefabrication(req({ params: { id: 'case-1', refabId: 'foreign' } }), res);
      expect(res.statusCode).toBe(404);
      expect(prisma.dentalRefabrication.update).not.toHaveBeenCalled();
    });
  });

  describe('getWorkOrderPdf', () => {
    test('generates a PDF and streams it with the correct headers', async () => {
      const prisma = createPrisma();
      prisma.dentalLabCase.findFirst.mockResolvedValue(makeCase({ stages: [] }));
      prisma.dentalSetting.findMany.mockResolvedValue([
        { key: 'workOrderHeader', value: { labName: 'معمل النور', address: 'شارع 1', phone: '0100' } },
      ]);
      prisma.company.findFirst.mockResolvedValue({ id: 'company-1', name: 'شركة' });
      generateWorkOrderPdf.mockResolvedValue({ buffer: Buffer.from('%PDF-1.4 test'), caseNumber: 'DL-20260809-0001' });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getWorkOrderPdf(req({ params: { id: 'case-1' } }), res);

      expect(res.statusCode).toBe(200);
      expect(res.headers['Content-Type']).toBe('application/pdf');
      expect(res.headers['Content-Disposition']).toBe('inline; filename="work-order-DL-20260809-0001.pdf"');
      expect(Buffer.isBuffer(res.sent)).toBe(true);
      expect(res.sent.toString()).toBe('%PDF-1.4 test');
      expect(generateWorkOrderPdf).toHaveBeenCalledWith(
        expect.objectContaining({
          company: expect.objectContaining({ id: 'company-1' }),
          caseRow: expect.objectContaining({ id: 'case-1', caseNumber: 'DL-20260809-0001' }),
          workOrderHeader: expect.objectContaining({ labName: 'معمل النور' }),
        })
      );
    });

    test('returns 404 for a foreign case', async () => {
      const prisma = createPrisma();
      prisma.dentalLabCase.findFirst.mockResolvedValue(null);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getWorkOrderPdf(req({ params: { id: 'foreign' } }), res);
      expect(res.statusCode).toBe(404);
      expect(generateWorkOrderPdf).not.toHaveBeenCalled();
    });
  });

  describe('team roles', () => {
    test('listTeam merges platform roles, dental roles and owner flags', async () => {
      const prisma = createPrisma();
      prisma.dentalSetting.findMany.mockResolvedValue([
        { key: 'teamRoles', value: { 'user-1': 'TECHNICIAN', 'user-2': 'MANAGER' } },
      ]);
      prisma.userCompany.findMany.mockResolvedValue([
        { user: { id: 'user-1', email: 'a@b.com', firstName: 'أحمد', lastName: 'محمود', role: 'AGENT' } },
        { user: { id: 'user-2', email: 'c@d.com', firstName: 'سارة', lastName: 'علي', role: 'COMPANY_ADMIN' } },
        { user: { id: 'user-3', email: 'e@f.com', firstName: 'محمد', lastName: 'سمير', role: 'AGENT' } },
      ]);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.listTeam(req(), res);

      expect(res.statusCode).toBe(200);
      expect(prisma.userCompany.findMany).toHaveBeenCalledWith({
        where: { companyId: 'company-1', isActive: true },
        include: { user: { select: { id: true, email: true, firstName: true, lastName: true, role: true } } },
        orderBy: { createdAt: 'asc' },
      });
      const data = res.payload.data;
      expect(data).toHaveLength(3);
      expect(data[0]).toMatchObject({
        userId: 'user-1',
        email: 'a@b.com',
        name: 'أحمد محمود',
        platformRole: 'AGENT',
        dentalRole: 'TECHNICIAN',
        isOwnerFlag: false,
      });
      expect(data[1]).toMatchObject({ userId: 'user-2', dentalRole: 'OWNER', isOwnerFlag: true });
      expect(data[2]).toMatchObject({ userId: 'user-3', dentalRole: null, isOwnerFlag: false });
    });

    test('setTeamRole persists the whole teamRoles map and returns the updated list', async () => {
      const prisma = createPrisma();
      prisma.dentalSetting.findMany.mockResolvedValue([
        { key: 'teamRoles', value: { 'user-2': 'MANAGER' } },
      ]);
      prisma.dentalSetting.upsert.mockResolvedValue({});
      prisma.userCompany.findMany.mockResolvedValue([
        { user: { id: 'user-1', email: 'a@b.com', firstName: 'أحمد', lastName: 'محمود', role: 'AGENT' } },
      ]);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.setTeamRole(
        req({ params: { userId: 'user-1' }, body: { role: 'TECHNICIAN' } }),
        res
      );

      expect(res.statusCode).toBe(200);
      expect(prisma.dentalSetting.upsert).toHaveBeenCalledWith({
        where: { companyId_key: { companyId: 'company-1', key: 'teamRoles' } },
        update: { value: { 'user-2': 'MANAGER', 'user-1': 'TECHNICIAN' } },
        create: { companyId: 'company-1', key: 'teamRoles', value: { 'user-2': 'MANAGER', 'user-1': 'TECHNICIAN' } },
      });
      expect(res.payload.data[0]).toMatchObject({ userId: 'user-1', dentalRole: 'TECHNICIAN' });
    });

    test('setTeamRole rejects an invalid role', async () => {
      const prisma = createPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.setTeamRole(req({ params: { userId: 'user-1' }, body: { role: 'HACKER' } }), res);
      expect(res.statusCode).toBe(400);
      expect(prisma.dentalSetting.upsert).not.toHaveBeenCalled();
    });

    test('dentalRoleGuard blocks a RECEPTION user from OWNER/MANAGER endpoints', async () => {
      const prisma = createPrisma();
      prisma.dentalSetting.findMany.mockResolvedValue([]);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      const next = jest.fn();
      const guard = dentalRoleGuard(['OWNER', 'MANAGER']);
      await guard(req({ user: { companyId: 'company-1', id: 'user-1', role: 'AGENT' } }), res, next);

      expect(res.statusCode).toBe(403);
      expect(res.payload.error).toBe('غير مصرح بهذا الدور');
      expect(next).not.toHaveBeenCalled();
    });

    test('dentalRoleGuard allows an OWNER and a teamRoles MANAGER', async () => {
      const guard = dentalRoleGuard(['OWNER', 'MANAGER']);

      const prismaOwner = createPrisma();
      prismaOwner.dentalSetting.findMany.mockResolvedValue([]);
      getSharedPrismaClient.mockReturnValue(prismaOwner);
      const resOwner = createResponse();
      const nextOwner = jest.fn();
      await guard(req({ user: { companyId: 'company-1', id: 'user-1', role: 'COMPANY_ADMIN' } }), resOwner, nextOwner);
      expect(nextOwner).toHaveBeenCalled();

      const prismaManager = createPrisma();
      prismaManager.dentalSetting.findMany.mockResolvedValue([
        { key: 'teamRoles', value: { 'user-2': 'MANAGER' } },
      ]);
      getSharedPrismaClient.mockReturnValue(prismaManager);
      const resManager = createResponse();
      const nextManager = jest.fn();
      await guard(req({ user: { companyId: 'company-1', id: 'user-2', role: 'AGENT' } }), resManager, nextManager);
      expect(nextManager).toHaveBeenCalled();
      expect(resManager.statusCode).toBe(200);
    });

    test('checkDentalTechnicianUser guarantees OWNER is never flagged as a technician', async () => {
      const prisma = createPrisma();
      prisma.user.findUnique.mockResolvedValue({ role: 'OWNER' });
      getSharedPrismaClient.mockReturnValue(prisma);

      const result = await checkDentalTechnicianUser('owner-id', 'company-1');
      expect(result).toEqual({ isTechnician: false, dentalRole: 'OWNER', technician: null });
      expect(prisma.dentalTechnician.findFirst).not.toHaveBeenCalled();
    });

    test('checkDentalTechnicianUser detects technician for non-owner users', async () => {
      const prisma = createPrisma();
      prisma.user.findUnique.mockResolvedValue({ role: 'AGENT' });
      prisma.dentalTechnician.findFirst.mockResolvedValue({ id: 'tech-1', name: 'أحمد فني', role: 'TECHNICIAN' });
      getSharedPrismaClient.mockReturnValue(prisma);

      const result = await checkDentalTechnicianUser('agent-id', 'company-1');
      expect(result).toEqual({
        isTechnician: true,
        dentalRole: 'TECHNICIAN',
        technician: { id: 'tech-1', name: 'أحمد فني', role: 'TECHNICIAN' },
      });
    });
  });

  describe('reports', () => {
    test('getDoctorStatement returns doctor, cases, invoices and totals', async () => {
      const prisma = createPrisma();
      prisma.dentalLabDoctor.findFirst.mockResolvedValue({ id: 'doc-1', name: 'د. أحمد' });
      prisma.dentalLabCase.findMany.mockResolvedValue([makeCase()]);
      prisma.dentalInvoice.findMany.mockResolvedValue([
        { id: 'inv-1', doctorName: 'د. أحمد', payments: [{ amount: 50 }] },
      ]);
      prisma.dentalInvoice.aggregate.mockResolvedValue({
        _sum: { total: 200, paid: 50, remaining: 150 },
        _count: { _all: 1 },
      });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getDoctorStatement(
        req({ query: { doctorId: 'doc-1', from: '2026-01-01', to: '2026-12-31' } }),
        res
      );

      expect(res.statusCode).toBe(200);
      expect(res.payload.data.doctor).toEqual({ id: 'doc-1', name: 'د. أحمد' });
      expect(res.payload.data.cases).toHaveLength(1);
      expect(res.payload.data.invoices).toHaveLength(1);
      expect(res.payload.data.invoices[0].payments).toHaveLength(1);
      expect(res.payload.data.totals).toEqual({ cases: 1, invoicesCount: 1, invoiced: 200, paid: 50, remaining: 150, creditTotal: 0, openingBalance: 0, closingBalance: 150, totalCards: 1, totalUnits: 1 });
      const invoiceWhere = prisma.dentalInvoice.aggregate.mock.calls[0][0].where;
      expect(invoiceWhere).toMatchObject({ companyId: 'company-1', doctorId: 'doc-1', status: { not: 'VOID' } });
    });

    test('getTechnicianProductivity aggregates assignments, stages and average days', async () => {
      const prisma = createPrisma();
      prisma.dentalTechnician.findMany.mockResolvedValue([
        { id: 'tech-1', name: 'أحمد فني', role: 'TECHNICIAN' },
      ]);
      prisma.dentalCaseAssignment.groupBy.mockResolvedValue([
        { technicianId: 'tech-1', _count: { _all: 3 } },
      ]);
      prisma.dentalCaseStage.findMany.mockResolvedValue([
        { id: 's1', assigneeId: 'tech-1', startedAt: new Date('2026-08-01T10:00:00.000Z'), completedAt: new Date('2026-08-03T10:00:00.000Z') },
        { id: 's2', assigneeId: 'tech-1', startedAt: new Date('2026-08-05T10:00:00.000Z'), completedAt: new Date('2026-08-09T10:00:00.000Z') },
      ]);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getTechnicianProductivity(req({ query: {} }), res);

      expect(res.statusCode).toBe(200);
      expect(prisma.dentalCaseStage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ companyId: 'company-1', status: 'DONE' }) })
      );
      expect(res.payload.data).toEqual([
        expect.objectContaining({
          technicianId: 'tech-1',
          name: 'أحمد فني',
          role: 'TECHNICIAN',
          assignedCases: 3,
          completedStages: 2,
          avgDaysPerStage: 3,
        }),
      ]);
    });

    test('getWorkTypeRevenue groups cases by workTypeName', async () => {
      const prisma = createPrisma();
      prisma.dentalLabCase.groupBy.mockResolvedValue([
        { workTypeName: 'تاج زيركون', _count: { _all: 2 }, _sum: { total: 400, paid: 100, remaining: 300 } },
        { workTypeName: null, _count: { _all: 1 }, _sum: { total: 50, paid: 0, remaining: 50 } },
      ]);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getWorkTypeRevenue(req({ query: {} }), res);

      expect(res.statusCode).toBe(200);
      expect(res.payload.data).toEqual([
        { workType: 'تاج زيركون', cases: 2, total: 400, paid: 100, remaining: 300 },
        { workType: 'غير محدد', cases: 1, total: 50, paid: 0, remaining: 50 },
      ]);
    });

    test('getOverdueReport lists overdue cases with days overdue', async () => {
      const prisma = createPrisma();
      prisma.dentalLabCase.findMany.mockResolvedValue([
        makeCase({ dueDate: new Date(Date.now() - 3 * 86400000), status: 'MANUFACTURING', doctorName: 'د. أحمد' }),
      ]);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getOverdueReport(req(), res);

      expect(res.statusCode).toBe(200);
      expect(prisma.dentalLabCase.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ companyId: 'company-1', dueDate: { lt: expect.any(Date) }, status: { notIn: ['DELIVERED', 'CLOSED'] } }),
        })
      );
      expect(res.payload.data).toHaveLength(1);
      expect(res.payload.data[0]).toMatchObject({
        caseNumber: 'DL-20260809-0001',
        doctorName: 'د. أحمد',
        status: 'MANUFACTURING',
        daysOverdue: 3,
      });
    });
  });

  describe('advanceCaseStatus quality gate', () => {
    test('blocks READY when the guard is enabled and no passed check exists', async () => {
      const prisma = createPrisma();
      prisma.dentalLabCase.findFirst.mockResolvedValue({
        id: 'case-1',
        companyId: 'company-1',
        status: 'QC',
        stages: [],
      });
      prisma.dentalSetting.findMany.mockResolvedValue([
        { key: 'guards', value: { requireQualityCheckBeforeReady: true } },
      ]);
      prisma.dentalQualityCheck.findFirst.mockResolvedValue(null);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.advanceCaseStatus(req({ params: { id: 'case-1' }, body: { to: 'READY' } }), res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('مطلوب فحص جودة ناجح قبل التسليم');
      expect(prisma.dentalLabCase.update).not.toHaveBeenCalled();
    });

test('allows READY when a passed quality check exists', async () => {
      const prisma = createPrisma();
      prisma.dentalLabCase.findFirst.mockResolvedValue({
        id: 'case-1',
        companyId: 'company-1',
        status: 'QC',
        stages: [],
      });
      prisma.dentalSetting.findMany.mockResolvedValue([
        { key: 'guards', value: { requireQualityCheckBeforeReady: true } },
      ]);
      prisma.dentalQualityCheck.findFirst.mockResolvedValue({ id: 'qc-1' });
      prisma.dentalLabCase.update.mockResolvedValue(makeCase({ status: 'READY' }));
      prisma.dentalCaseStatusHistory.create.mockResolvedValue({});
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.advanceCaseStatus(req({ params: { id: 'case-1' }, body: { to: 'READY' } }), res);

      expect(res.statusCode).toBe(200);
      expect(prisma.dentalLabCase.update).toHaveBeenCalled();
    });
  });

  describe('technician scope (my-cases / my-wage / detail)', () => {
    test('getMyCases returns only cases with a stage assigned to the technician', async () => {
      const prisma = createPrisma();
      prisma.dentalTechnician.findFirst.mockResolvedValue({ id: 'tech-1', companyId: 'company-1', userId: 'user-1', name: 'فني' });
      prisma.dentalLabCase.findMany.mockResolvedValue([
        { id: 'case-1', caseNumber: 'DL-1', patientName: 'مريض', status: 'MANUFACTURING', workTypeName: 'تاج',
          stages: [{ id: 's2', name: 'التصنيع', status: 'IN_PROGRESS', assigneeId: 'tech-1', assigneeName: 'فني' }] },
      ]);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getMyCases(req(), res);

      expect(res.statusCode).toBe(200);
      expect(res.payload.data.items).toHaveLength(1);
      expect(res.payload.data.items[0]).toMatchObject({ caseNumber: 'DL-1' });
      expect(res.payload.data.items[0].total).toBeUndefined();
      expect(prisma.dentalLabCase.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ stages: expect.objectContaining({ some: expect.objectContaining({ status: { in: ['IN_PROGRESS', 'PENDING'] } }) }) }) })
      );
    });

    test('getMyCases returns empty when the user is not linked to a technician', async () => {
      const prisma = createPrisma();
      prisma.dentalTechnician.findFirst.mockResolvedValue(null);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getMyCases(req(), res);

      expect(res.statusCode).toBe(200);
      expect(res.payload.data.items).toEqual([]);
      expect(prisma.dentalLabCase.findMany).not.toHaveBeenCalled();
    });

    test('getMyWage computes earnings from completed stages with the technician rate', async () => {
      const prisma = createPrisma();
      prisma.dentalTechnician.findFirst.mockResolvedValue({ id: 'tech-1', companyId: 'company-1', userId: 'user-1', name: 'فني', wagePerStage: 50 });
      prisma.dentalCaseStage.findMany.mockResolvedValue([
        { assigneeId: 'tech-1' },
        { assigneeId: 'tech-1' },
        { assigneeId: 'tech-1' },
      ]);
      prisma.dentalTechnician.findMany.mockResolvedValue([{ id: 'tech-1', name: 'فني', wagePerStage: 50 }]);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getMyWage(req(), res);

      expect(res.statusCode).toBe(200);
      expect(res.payload.data.rate).toBe(50);
      expect(res.payload.data.completedStages).toBe(3);
      expect(res.payload.data.totalWage).toBe(150);
    });

    test('getCaseDetail blocks a TECHNICIAN without a stage on the case', async () => {
      const prisma = createPrisma();
      prisma.dentalLabCase.findFirst.mockResolvedValue({
        id: 'case-1',
        companyId: 'company-1',
        stages: [{ id: 's1', assigneeId: 'tech-2', status: 'IN_PROGRESS' }],
      });
      prisma.dentalSetting.findMany.mockResolvedValue([{ key: 'teamRoles', value: { 'user-1': 'TECHNICIAN' } }]);
      prisma.dentalTechnician.findFirst.mockResolvedValue({ id: 'tech-1', companyId: 'company-1', userId: 'user-1' });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      const techReq = { ...req(), user: { companyId: 'company-1', id: 'user-1', role: 'USER' } };
      await controller.getCaseDetail(techReq, res);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('resolveRefabrication creates credit note', () => {
    test('creates a credit note for the case total when no credit exists', async () => {
      const prisma = createPrisma();
      prisma.dentalRefabrication.findFirst.mockResolvedValue({ id: 'rf-1', caseId: 'case-1', companyId: 'company-1' });
      prisma.dentalRefabrication.update.mockResolvedValue({ id: 'rf-1', status: 'RESOLVED' });
      prisma.dentalLabCase.findFirst.mockResolvedValue({ id: 'case-1', companyId: 'company-1', total: 500, doctorId: 'doc-1', doctorName: 'د. أحمد' });
      prisma.dentalCreditNote.count.mockResolvedValue(0);
      prisma.dentalCreditNote.create.mockResolvedValue({ id: 'cn-1' });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.resolveRefabrication(req({ params: { id: 'case-1', refabId: 'rf-1' }, body: { note: 'مقاس خاطئ' } }), res);

      expect(res.statusCode).toBe(200);
      expect(prisma.dentalCreditNote.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ caseId: 'case-1', amount: 500, doctorId: 'doc-1' }) })
      );
    });
  });

  describe('aging report', () => {
    test('buckets outstanding invoices by days overdue', async () => {
      const prisma = createPrisma();
      prisma.dentalInvoice.findMany.mockResolvedValue([
        { id: 'a', invoiceNumber: 'INV-1', doctorName: 'د', total: 100, paid: 0, remaining: 100, dueDate: new Date(), status: 'OPEN' },
        { id: 'b', invoiceNumber: 'INV-2', doctorName: 'د', total: 200, paid: 0, remaining: 200, dueDate: new Date(Date.now() - 45 * 86400000), status: 'OPEN' },
        { id: 'c', invoiceNumber: 'INV-3', doctorName: 'د', total: 300, paid: 0, remaining: 300, dueDate: new Date(Date.now() - 120 * 86400000), status: 'OPEN' },
      ]);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getAgingReport(req(), res);

      expect(res.statusCode).toBe(200);
      const buckets = res.payload.data.buckets;
      const find = (l) => buckets.find((b) => b.label === l).total;
      expect(find('current')).toBe(100);
      expect(find('31_60')).toBe(200);
      expect(find('90_plus')).toBe(300);
    });
  });

  describe('doctor-specific pricing', () => {
    test('resolveDoctorWorkTypePrice uses the doctor override when present', async () => {
      const prisma = createPrisma();
      prisma.dentalSetting.findMany.mockResolvedValue([
        { key: 'doctorPricing', value: { 'doc-1': { 'wt-1': 700 } } },
      ]);
      getSharedPrismaClient.mockReturnValue(prisma);
      const pricing = require('../../services/dentalPricing');
      const price = await pricing.resolveDoctorWorkTypePrice(prisma, 'company-1', 'doc-1', { id: 'wt-1', price: 500 });
      expect(price).toBe(700);
      const fallback = await pricing.resolveDoctorWorkTypePrice(prisma, 'company-1', 'doc-1', { id: 'wt-9', price: 500 });
      expect(fallback).toBe(500);
    });
  });

  describe('technician payouts & ledger', () => {
    test('recordTechnicianPayout validates positive amount and valid type', async () => {
      const prisma = createPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res1 = createResponse();
      await controller.recordTechnicianPayout(req({ params: { id: 'tech-1' }, body: { amount: -50 } }), res1);
      expect(res1.statusCode).toBe(400);

      const res2 = createResponse();
      await controller.recordTechnicianPayout(req({ params: { id: 'tech-1' }, body: { amount: 100, type: 'INVALID' } }), res2);
      expect(res2.statusCode).toBe(400);
    });

    test('recordTechnicianPayout creates payout record successfully', async () => {
      const prisma = createPrisma();
      prisma.dentalTechnician.findFirst.mockResolvedValue({ id: 'tech-1', companyId: 'company-1', name: 'أحمد' });
      prisma.dentalTechnicianPayout.create.mockResolvedValue({
        id: 'pay-1',
        technicianId: 'tech-1',
        companyId: 'company-1',
        type: 'PAYOUT',
        amount: 500,
        paymentMethod: 'CASH',
      });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.recordTechnicianPayout(
        req({
          params: { id: 'tech-1' },
          body: { amount: 500, type: 'PAYOUT', paymentMethod: 'CASH', reference: 'REC-001', notes: 'دفعة أسبوعية' },
          user: { companyId: 'company-1', id: 'user-1', name: 'المدير' },
        }),
        res
      );

      expect(res.statusCode).toBe(201);
      expect(prisma.dentalTechnicianPayout.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            companyId: 'company-1',
            technicianId: 'tech-1',
            type: 'PAYOUT',
            amount: 500,
            paymentMethod: 'CASH',
            reference: 'REC-001',
            notes: 'دفعة أسبوعية',
          }),
        })
      );
    });

    test('listTechnicianPayouts aggregates earnings, payouts, advances and calculates netDue', async () => {
      const prisma = createPrisma();
      prisma.dentalTechnician.findFirst.mockResolvedValue({
        id: 'tech-1',
        name: 'أحمد فني',
        role: 'CAD_DESIGNER',
        wagePerStage: 50,
      });
      prisma.dentalCaseStage.findMany.mockResolvedValue([
        { assigneeId: 'tech-1', case: { teeth: '11,12' } },
        { assigneeId: 'tech-1', case: { teeth: '21' } },
      ]);
      prisma.dentalTechnician.findMany.mockResolvedValue([
        { id: 'tech-1', name: 'أحمد فني', wagePerStage: 50 },
      ]);
      prisma.dentalSetting.findMany.mockResolvedValue([]);

      prisma.dentalTechnicianPayout.findMany.mockResolvedValue([
        { id: 'p1', type: 'PAYOUT', amount: 70, paidAt: new Date() },
        { id: 'p2', type: 'ADVANCE', amount: 30, paidAt: new Date() },
        { id: 'p3', type: 'BONUS', amount: 20, paidAt: new Date() },
        { id: 'p4', type: 'DEDUCTION', amount: 10, paidAt: new Date() },
      ]);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.listTechnicianPayouts(req({ params: { id: 'tech-1' }, query: {} }), res);

      expect(res.statusCode).toBe(200);
      expect(res.payload.data.summary).toEqual(
        expect.objectContaining({
          totalEarned: 150,
          totalPayouts: 70,
          totalAdvances: 30,
          totalPaid: 100,
          totalBonuses: 20,
          totalDeductions: 10,
          netDue: 60,
        })
      );
    });

    test('deleteTechnicianPayout removes payout record', async () => {
      const prisma = createPrisma();
      prisma.dentalTechnicianPayout.findFirst.mockResolvedValue({ id: 'p1', companyId: 'company-1' });
      prisma.dentalTechnicianPayout.delete.mockResolvedValue({ id: 'p1' });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.deleteTechnicianPayout(req({ params: { payoutId: 'p1' } }), res);

      expect(res.statusCode).toBe(200);
      expect(prisma.dentalTechnicianPayout.delete).toHaveBeenCalledWith({ where: { id: 'p1' } });
    });
  });

  describe('monthlySettlements (تقفيل المستحقات الشهرية وترحيل الأرصدة)', () => {
    test('listMonthlySettlements computes preview calculation with opening balance carry forward', async () => {
      const prisma = createPrisma();
      // Doctor list
      prisma.dentalLabDoctor.findMany.mockResolvedValue([
        { id: 'doc-1', name: 'د. كريم', clinicName: 'عيادة النور', phone: '01000000000', isActive: true },
      ]);
      // Existing settlement in period: none
      prisma.dentalMonthlySettlement.findMany.mockResolvedValue([]);
      // Previous month settlement: has closing balance 500
      prisma.dentalMonthlySettlement.findFirst.mockResolvedValue({
        id: 'prev-1',
        doctorId: 'doc-1',
        periodKey: '2026-08',
        closingBalance: 500,
      });
      // Invoice aggregate for this period: 1000 billed, 2 invoices
      prisma.dentalInvoice.aggregate.mockResolvedValue({
        _sum: { total: 1000 },
        _count: { _all: 2 },
      });
      // Cases count: 3
      prisma.dentalLabCase.count.mockResolvedValue(3);
      // Credit notes aggregate: 50
      prisma.dentalCreditNote.aggregate.mockResolvedValue({
        _sum: { amount: 50 },
      });
      // Payments aggregate: 400
      prisma.dentalPayment = {
        aggregate: jest.fn().mockResolvedValue({
          _sum: { amount: 400 },
        }),
      };
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.listMonthlySettlements(req({ query: { period: '2026-09' } }), res);

      expect(res.statusCode).toBe(200);
      expect(res.payload.success).toBe(true);
      expect(res.payload.data.periodKey).toBe('2026-09');
      expect(res.payload.data.settlements).toHaveLength(1);

      const row = res.payload.data.settlements[0];
      expect(row.doctorId).toBe('doc-1');
      expect(row.openingBalance).toBe(500);
      expect(row.totalBilled).toBe(1000);
      expect(row.totalPaid).toBe(400);
      expect(row.totalAdjustments).toBe(50);
      // closingBalance = (500 + 1000) - (400 + 50) = 1050
      expect(row.closingBalance).toBe(1050);
      expect(row.status).toBe('DRAFT');
      expect(row.isClosed).toBe(false);

      expect(res.payload.data.summary.totalClosingBalance).toBe(1050);
      expect(res.payload.data.summary.closedCount).toBe(0);
    });

    test('closeMonthlySettlement saves closed settlement with frozen balance and audit user', async () => {
      const prisma = createPrisma();
      prisma.dentalLabDoctor.findMany.mockResolvedValue([
        { id: 'doc-1', name: 'د. كريم', isActive: true },
      ]);
      prisma.dentalMonthlySettlement.findFirst.mockResolvedValue(null);
      prisma.dentalInvoice.aggregate.mockResolvedValue({
        _sum: { total: 800 },
        _count: { _all: 1 },
      });
      prisma.dentalLabCase.count.mockResolvedValue(1);
      prisma.dentalCreditNote.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
      prisma.dentalPayment = {
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 300 } }),
      };
      prisma.dentalMonthlySettlement.upsert = jest.fn().mockImplementation(({ create }) =>
        Promise.resolve({ id: 'settle-1', ...create })
      );
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.closeMonthlySettlement(
        req({
          body: {
            period: '2026-09',
            doctorId: 'doc-1',
            notes: 'تمت المراجعة مع الطبيب',
          },
          user: { companyId: 'company-1', id: 'user-admin', name: 'المحاسب المسؤول' },
        }),
        res
      );

      expect(res.statusCode).toBe(200);
      expect(res.payload.success).toBe(true);
      expect(prisma.dentalMonthlySettlement.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            companyId_doctorId_periodKey: {
              companyId: 'company-1',
              doctorId: 'doc-1',
              periodKey: '2026-09',
            },
          },
          create: expect.objectContaining({
            status: 'CLOSED',
            openingBalance: 0,
            totalBilled: 800,
            totalPaid: 300,
            closingBalance: 500,
            closedBy: 'user-admin',
            closedByName: 'المحاسب المسؤول',
            notes: 'تمت المراجعة مع الطبيب',
          }),
        })
      );
    });

    test('reopenMonthlySettlement requires valid reason and updates status to REOPENED', async () => {
      const prisma = createPrisma();
      prisma.dentalMonthlySettlement.findFirst.mockResolvedValue({
        id: 'settle-1',
        companyId: 'company-1',
        status: 'CLOSED',
      });
      prisma.dentalMonthlySettlement.update.mockResolvedValue({
        id: 'settle-1',
        status: 'REOPENED',
        reopenedReason: 'تصحيح دفعة نقدية سقطت سهواً',
      });
      getSharedPrismaClient.mockReturnValue(prisma);

      // Attempt without reason -> 400
      const resErr = createResponse();
      await controller.reopenMonthlySettlement(
        req({ params: { id: 'settle-1' }, body: { reason: '' } }),
        resErr
      );
      expect(resErr.statusCode).toBe(400);

      // With valid audit reason -> 200
      const resOk = createResponse();
      await controller.reopenMonthlySettlement(
        req({
          params: { id: 'settle-1' },
          body: { reason: 'تصحيح دفعة نقدية سقطت سهواً' },
          user: { companyId: 'company-1', id: 'user-mgr' },
        }),
        resOk
      );
      expect(resOk.statusCode).toBe(200);
      expect(prisma.dentalMonthlySettlement.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'settle-1' },
          data: expect.objectContaining({
            status: 'REOPENED',
            reopenedBy: 'user-mgr',
            reopenedReason: 'تصحيح دفعة نقدية سقطت سهواً',
          }),
        })
      );
    });
  });
});

