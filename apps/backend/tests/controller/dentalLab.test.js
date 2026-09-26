jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const controller = require('../../controller/dentalLabController');

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
    dentalLabDoctor: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    dentalWorkType: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    dentalTechnician: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    dentalLabCase: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      groupBy: jest.fn().mockResolvedValue([]),
    },
    dentalCaseStage: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    dentalCaseAssignment: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    dentalCaseAttachment: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    dentalInvoice: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn(),
    },
    dentalCreditNote: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }),
      groupBy: jest.fn().mockResolvedValue([]),
    },
    dentalPayment: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    dentalCustomFieldDef: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    dentalCaseCustomValue: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    dentalCaseStatusHistory: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    dentalRefabrication: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
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
    user: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    userCompany: {
      findFirst: jest.fn(),
      create: jest.fn(),
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
  doctorId: null,
  doctorName: null,
  patientName: 'محمد علي',
  patientPhone: '01001234567',
  workTypeId: null,
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
  doctor: null,
  workType: null,
  stages: [],
  ...overrides,
});

describe('dentalLabController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createCase', () => {
    test('generates caseNumber, computes totals, creates default stages and records history', async () => {
      const prisma = createPrisma();
      prisma.dentalSetting.findMany.mockResolvedValue([]);
      prisma.dentalLabCase.findFirst.mockResolvedValue(null);
      prisma.dentalLabCase.create.mockResolvedValue(makeCase({ priceSnapshot: 200, discount: 20, total: 180, remaining: 180 }));
      prisma.dentalCaseStatusHistory.create.mockResolvedValue({});
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createCase(
        req({
          body: { workTypeName: 'تاج زيركون', priceSnapshot: 200, discount: 20, patientName: 'محمد علي', priority: 'URGENT' },
        }),
        res
      );

      expect(res.statusCode).toBe(200);
      const data = prisma.dentalLabCase.create.mock.calls[0][0].data;
      expect(data.companyId).toBe('company-1');
      expect(data.caseNumber).toMatch(/^DL-\d{8}-\d{4}$/);
      expect(data.status).toBe('RECEIVED');
      expect(data.orderStatus).toBe('PENDING');
      expect(data.priority).toBe('URGENT');
      expect(data.source).toBe('MANUAL');
      expect(data.workTypeName).toBe('تاج زيركون');
      expect(data.priceSnapshot).toBe(200);
      expect(data.discount).toBe(20);
      expect(data.total).toBe(180);
      expect(data.paid).toBe(0);
      expect(data.remaining).toBe(180);
      expect(data.paymentStatus).toBe('UNPAID');
      expect(data.stages.create).toHaveLength(5);
      expect(data.stages.create[0]).toMatchObject({ name: 'الاستلام', status: 'PENDING', sortOrder: 0, companyId: 'company-1' });
      expect(data.stages.create[4]).toMatchObject({ name: 'التسليم', sortOrder: 4 });

      expect(prisma.dentalCaseStatusHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ caseId: 'case-1', dimension: 'STAGE', status: 'RECEIVED', oldStatus: null, changedBy: 'user-1' }),
        })
      );
    });

    test('uses workType price snapshot and category-specific stage templates from settings', async () => {
      const prisma = createPrisma();
      prisma.dentalWorkType.findFirst.mockResolvedValue({ id: 'wt-1', name: 'جسر', price: 300, category: 'جسر', pricingMode: 'FLAT' });
      prisma.dentalSetting.findMany.mockResolvedValue([
        { key: 'stageTemplates', value: { 'جسر': ['أخذ مقاس', 'تركيب'] } },
      ]);
      prisma.dentalLabCase.findFirst.mockResolvedValue(null);
      prisma.dentalLabCase.create.mockResolvedValue(makeCase({ workTypeName: 'جسر', priceSnapshot: 300, total: 300 }));
      prisma.dentalCaseStatusHistory.create.mockResolvedValue({});
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createCase(req({ body: { workTypeId: 'wt-1', patientName: 'مريض' } }), res);

      expect(res.statusCode).toBe(200);
      const data = prisma.dentalLabCase.create.mock.calls[0][0].data;
      expect(data.workTypeId).toBe('wt-1');
      expect(data.workTypeName).toBe('جسر');
      expect(data.priceSnapshot).toBe(300);
      expect(data.total).toBe(300);
      expect(data.stages.create.map((s) => s.name)).toEqual(['أخذ مقاس', 'تركيب']);
    });

    test('multiplies unitPrice by unitsCount when pricingMode is PER_UNIT and derives from teeth', async () => {
      const prisma = createPrisma();
      prisma.dentalWorkType.findFirst.mockResolvedValue({
        id: 'wt-crown',
        name: 'تاج زيركون',
        price: 500,
        category: 'CROWN',
        pricingMode: 'PER_UNIT',
        defaultMaterial: 'Zirconia Katana',
        defaultWarrantyYears: 5,
      });
      prisma.dentalSetting.findMany.mockResolvedValue([]);
      prisma.dentalLabCase.findFirst.mockResolvedValue(null);
      prisma.dentalLabCase.create.mockResolvedValue(makeCase({ unitsCount: 3, unitPrice: 500, priceSnapshot: 1500, total: 1500 }));
      prisma.dentalCaseStatusHistory.create.mockResolvedValue({});
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createCase(req({
        body: {
          workTypeId: 'wt-crown',
          patientName: 'عمر خالد',
          teeth: '11, 12, 13',
        },
      }), res);

      expect(res.statusCode).toBe(200);
      const data = prisma.dentalLabCase.create.mock.calls[0][0].data;
      expect(data.unitsCount).toBe(3);
      expect(data.unitPrice).toBe(500);
      expect(data.priceSnapshot).toBe(1500); // 3 * 500
      expect(data.total).toBe(1500);
      expect(data.material).toBe('Zirconia Katana');
      expect(data.warrantyYears).toBe(5);
    });

test('rejects when workTypeName is missing and no workTypeId', async () => {
      const prisma = createPrisma();
      prisma.dentalSetting.findMany.mockResolvedValue([]);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createCase(req({ body: { patientName: 'مريض' } }), res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('اسم نوع الشغل مطلوب');
    });

    test('AUTO_ON_RECEIPT creates an invoice automatically with the case', async () => {
      const prisma = createPrisma();
      prisma.dentalSetting.findMany.mockResolvedValue([
        { key: 'billingPolicy', value: { invoiceMode: 'AUTO_ON_RECEIPT' } },
      ]);
      prisma.dentalLabCase.findFirst.mockResolvedValue(null);
      prisma.dentalLabCase.create.mockResolvedValue(makeCase({ priceSnapshot: 200, total: 200 }));
      prisma.dentalCaseStatusHistory.create.mockResolvedValue({});
      prisma.dentalInvoice.findFirst.mockResolvedValue(null);
      prisma.dentalInvoice.create.mockResolvedValue({ id: 'inv-auto' });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createCase(req({ body: { workTypeName: 'تاج زيركون', priceSnapshot: 200 } }), res);

      expect(res.statusCode).toBe(200);
      expect(prisma.dentalInvoice.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ caseId: 'case-1', total: 200, doctorId: null }) })
      );
    });

    test('assigns technician directly on createCase when technicianId is provided', async () => {
      const prisma = createPrisma();
      prisma.dentalSetting.findMany.mockResolvedValue([]);
      prisma.dentalLabCase.findFirst.mockResolvedValue(null);
      prisma.dentalLabCase.create.mockResolvedValue(makeCase({ id: 'case-tech-1' }));
      prisma.dentalTechnician.findFirst.mockResolvedValue({ id: 'tech-1', name: 'أحمد فني', role: 'CAD_DESIGNER', isActive: true });
      prisma.dentalCaseAssignment.create.mockResolvedValue({ id: 'assign-1' });
      prisma.dentalCaseStage.findFirst.mockResolvedValue({ id: 'stage-1', assigneeId: null });
      prisma.dentalCaseStage.update.mockResolvedValue({ id: 'stage-1', assigneeId: 'tech-1' });
      prisma.dentalCaseStatusHistory.create.mockResolvedValue({});
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createCase(req({
        body: {
          workTypeName: 'تاج زيركون',
          patientName: 'محمد حسام',
          technicianId: 'tech-1',
          technicianRole: 'CAD_DESIGNER',
        },
      }), res);

      expect(res.statusCode).toBe(200);
      expect(prisma.dentalCaseAssignment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            caseId: 'case-tech-1',
            technicianId: 'tech-1',
            role: 'CAD_DESIGNER',
          }),
        })
      );
      expect(prisma.dentalCaseStage.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'stage-1' },
          data: expect.objectContaining({
            assigneeId: 'tech-1',
            assigneeName: 'أحمد فني',
          }),
        })
      );
    });

    test('enforceCreditLimit blocks a new case beyond the doctor credit limit', async () => {
      const prisma = createPrisma();
      prisma.dentalSetting.findMany.mockResolvedValue([
        { key: 'billingPolicy', value: { enforceCreditLimit: true } },
      ]);
      prisma.dentalLabDoctor.findFirst.mockResolvedValue({ id: 'doc-1', name: 'د. أحمد', creditLimit: 100 });
      prisma.dentalInvoice.aggregate.mockResolvedValue({ _sum: { remaining: 80 } });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createCase(req({ body: { workTypeName: 'تاج', doctorId: 'doc-1', priceSnapshot: 50 } }), res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toMatch(/حد الائتمان/);
      expect(prisma.dentalLabCase.create).not.toHaveBeenCalled();
    });

    test('rejects a workTypeId outside the company', async () => {
      const prisma = createPrisma();
      prisma.dentalWorkType.findFirst.mockResolvedValue(null);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createCase(req({ body: { workTypeId: 'foreign', patientName: 'مريض' } }), res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('نوع الشغل لا ينتمي لهذه الشركة');
      expect(prisma.dentalLabCase.create).not.toHaveBeenCalled();
    });
  });

  describe('updateCase', () => {
    test('updates unitsCount, unitPrice, recalculates priceSnapshot and total', async () => {
      const prisma = createPrisma();
      const existing = makeCase({
        id: 'case-upd-1',
        unitsCount: 1,
        unitPrice: 200,
        priceSnapshot: 200,
        discount: 0,
        total: 200,
        paid: 50,
      });
      prisma.dentalLabCase.findFirst.mockResolvedValue(existing);
      prisma.dentalLabCase.update.mockImplementation(({ data }) => ({ ...existing, ...data }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.updateCase(
        req({
          params: { id: 'case-upd-1' },
          body: {
            unitsCount: 3,
            unitPrice: 300,
            patientName: 'أحمد محمود المحدث',
          },
        }),
        res
      );

      expect(res.statusCode).toBe(200);
      const updateData = prisma.dentalLabCase.update.mock.calls[0][0].data;
      expect(updateData.unitsCount).toBe(3);
      expect(updateData.unitPrice).toBe(300);
      expect(updateData.priceSnapshot).toBe(900);
      expect(updateData.total).toBe(900);
      expect(updateData.remaining).toBe(850);
      expect(updateData.patientName).toBe('أحمد محمود المحدث');
    });

    test('returns 404 if case does not exist', async () => {
      const prisma = createPrisma();
      prisma.dentalLabCase.findFirst.mockResolvedValue(null);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.updateCase(
        req({ params: { id: 'non-existent' }, body: { patientName: 'test' } }),
        res
      );

      expect(res.statusCode).toBe(404);
      expect(res.payload.error).toBe('الحالة غير موجودة');
    });
  });

  describe('listCases', () => {
    test('applies filters, search, pagination and includes doctor + workType', async () => {
      const prisma = createPrisma();
      prisma.dentalLabCase.findMany.mockResolvedValue([makeCase()]);
      prisma.dentalLabCase.count.mockResolvedValue(1);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.listCases(
        req({ query: { status: 'QC', doctorId: 'doc-1', search: 'محمد', page: '2', limit: '10' } }),
        res
      );

      const args = prisma.dentalLabCase.findMany.mock.calls[0][0];
      expect(args.where).toEqual({
        companyId: 'company-1',
        isDeleted: false,
        status: 'QC',
        doctorId: 'doc-1',
        OR: [
          { caseNumber: { contains: 'محمد', mode: 'insensitive' } },
          { patientName: { contains: 'محمد', mode: 'insensitive' } },
          { doctorName: { contains: 'محمد', mode: 'insensitive' } },
        ],
      });
      expect(args.skip).toBe(10);
      expect(args.take).toBe(10);
      expect(args.include.doctor.select.name).toBe(true);
      expect(args.include.workType.select.price).toBe(true);
      expect(prisma.dentalLabCase.count).toHaveBeenCalledWith({ where: args.where });
      expect(res.payload.data.items).toHaveLength(1);
      expect(res.payload.data.total).toBe(1);
    });

    test('rejects an invalid status filter', async () => {
      const prisma = createPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);
      const res = createResponse();
      await controller.listCases(req({ query: { status: 'BOGUS' } }), res);
      expect(res.statusCode).toBe(400);
      expect(prisma.dentalLabCase.findMany).not.toHaveBeenCalled();
    });
  });

  describe('case deletion and restoration (Trash Bin)', () => {
    test('trashCase moves active case to trash and records history', async () => {
      const prisma = createPrisma();
      prisma.dentalLabCase.findFirst.mockResolvedValue(makeCase({ isDeleted: false }));
      prisma.dentalLabCase.update.mockResolvedValue(makeCase({ isDeleted: true }));
      prisma.dentalCaseStatusHistory.create.mockResolvedValue({});
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.trashCase(req({ params: { id: 'case-1' }, body: { reason: 'طلب الطبيب' } }), res);

      expect(res.statusCode).toBe(200);
      expect(prisma.dentalLabCase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'case-1' },
          data: expect.objectContaining({ isDeleted: true }),
        })
      );
    });

    test('restoreCase restores a trashed case back to active', async () => {
      const prisma = createPrisma();
      prisma.dentalLabCase.findFirst.mockResolvedValue(makeCase({ isDeleted: true }));
      prisma.dentalLabCase.update.mockResolvedValue(makeCase({ isDeleted: false, deletedAt: null }));
      prisma.dentalCaseStatusHistory.create.mockResolvedValue({});
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.restoreCase(req({ params: { id: 'case-1' } }), res);

      expect(res.statusCode).toBe(200);
      expect(prisma.dentalLabCase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'case-1' },
          data: { isDeleted: false, deletedAt: null },
        })
      );
    });

    test('permanentDeleteCase permanently deletes the case within transaction', async () => {
      const prisma = createPrisma();
      prisma.dentalLabCase.findFirst.mockResolvedValue(makeCase());
      prisma.dentalInvoice.updateMany = jest.fn().mockResolvedValue({ count: 1 });
      prisma.dentalLabCase.delete = jest.fn().mockResolvedValue({});
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.permanentDeleteCase(req({ params: { id: 'case-1' } }), res);

      expect(res.statusCode).toBe(200);
      expect(res.payload.success).toBe(true);
    });
  });

  describe('advanceCaseStatus', () => {
    const baseCase = (status, stages) => ({
      id: 'case-1',
      companyId: 'company-1',
      status,
      stages,
    });

    test('advances to the next status in the chain and completes the matching stage', async () => {
      const prisma = createPrisma();
      prisma.dentalLabCase.findFirst.mockResolvedValue(
        baseCase('RECEIVED', [
          { id: 'stage-1', name: 'الاستلام', status: 'PENDING', sortOrder: 0 },
          { id: 'stage-2', name: 'التصميم', status: 'PENDING', sortOrder: 1 },
        ])
      );
      prisma.dentalCaseStage.update.mockResolvedValue({});
      prisma.dentalLabCase.update.mockResolvedValue(makeCase({ status: 'DESIGN' }));
      prisma.dentalCaseStatusHistory.create.mockResolvedValue({});
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.advanceCaseStatus(req({ params: { id: 'case-1' }, body: { to: 'DESIGN', reason: 'تم' } }), res);

      expect(res.statusCode).toBe(200);
      expect(prisma.dentalCaseStage.update).toHaveBeenCalledWith({
        where: { id: 'stage-1' },
        data: { status: 'DONE', completedAt: expect.any(Date) },
      });
      expect(prisma.dentalCaseStage.update).toHaveBeenCalledWith({
        where: { id: 'stage-2' },
        data: { status: 'IN_PROGRESS', startedAt: expect.any(Date) },
      });
      expect(prisma.dentalLabCase.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'case-1' }, data: { status: 'DESIGN' } })
      );
      expect(prisma.dentalCaseStatusHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ caseId: 'case-1', dimension: 'STAGE', status: 'DESIGN', oldStatus: 'RECEIVED', reason: 'تم' }),
        })
      );
    });

    test('rejects jumping forward in the chain via to', async () => {
      const prisma = createPrisma();
      prisma.dentalLabCase.findFirst.mockResolvedValue(baseCase('RECEIVED', []));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.advanceCaseStatus(req({ params: { id: 'case-1' }, body: { to: 'QC' } }), res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toMatch(/لا يمكن الانتقال/);
      expect(prisma.dentalLabCase.update).not.toHaveBeenCalled();
    });

    test('accepts a custom target via status', async () => {
      const prisma = createPrisma();
      prisma.dentalLabCase.findFirst.mockResolvedValue(baseCase('RECEIVED', []));
      prisma.dentalLabCase.update.mockResolvedValue(makeCase({ status: 'DESIGN' }));
      prisma.dentalCaseStatusHistory.create.mockResolvedValue({});
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.advanceCaseStatus(req({ params: { id: 'case-1' }, body: { status: 'DESIGN', reason: 'عميل مستعجل' } }), res);

      expect(res.statusCode).toBe(200);
      expect(prisma.dentalLabCase.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'DESIGN' }) })
      );
    });

    test('rejects status jump that skips stages', async () => {
      const prisma = createPrisma();
      prisma.dentalLabCase.findFirst.mockResolvedValue(baseCase('RECEIVED', []));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.advanceCaseStatus(req({ params: { id: 'case-1' }, body: { status: 'QC', reason: 'عميل مستعجل' } }), res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toMatch(/لا يمكن الانتقال/);
      expect(prisma.dentalLabCase.update).not.toHaveBeenCalled();
    });

    test('DELIVERED sets deliveredAt and orderStatus COMPLETED', async () => {
      const prisma = createPrisma();
      prisma.dentalSetting.findMany.mockResolvedValue([
        { key: 'billingPolicy', value: { invoiceMode: 'MANUAL', requireInvoiceBeforeDelivery: false } },
      ]);
      prisma.dentalLabCase.findFirst.mockResolvedValue(baseCase('READY', []));
      prisma.dentalLabCase.update.mockResolvedValue(makeCase({ status: 'DELIVERED', deliveredAt: new Date(), orderStatus: 'COMPLETED' }));
      prisma.dentalCaseStatusHistory.create.mockResolvedValue({});
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.advanceCaseStatus(req({ params: { id: 'case-1' }, body: { to: 'DELIVERED' } }), res);

      expect(res.statusCode).toBe(200);
      const data = prisma.dentalLabCase.update.mock.calls[0][0].data;
      expect(data.status).toBe('DELIVERED');
      expect(data.deliveredAt).toEqual(expect.any(Date));
      expect(data.orderStatus).toBe('COMPLETED');
    });

    test('blocks DELIVERED when requireInvoiceBeforeDelivery and no invoice exists', async () => {
      const prisma = createPrisma();
      prisma.dentalSetting.findMany.mockResolvedValue([
        { key: 'billingPolicy', value: { invoiceMode: 'MANUAL', requireInvoiceBeforeDelivery: true } },
      ]);
      prisma.dentalLabCase.findFirst.mockResolvedValue(baseCase('READY', []));
      prisma.dentalInvoice.findMany.mockResolvedValue([]);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.advanceCaseStatus(req({ params: { id: 'case-1' }, body: { to: 'DELIVERED' } }), res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toMatch(/قبل إنشاء فاتورة/);
      expect(prisma.dentalLabCase.update).not.toHaveBeenCalled();
    });

    test('blocks DELIVERED when requireFullPaymentBeforeDelivery and balance remains', async () => {
      const prisma = createPrisma();
      prisma.dentalSetting.findMany.mockResolvedValue([
        { key: 'billingPolicy', value: { invoiceMode: 'MANUAL', requireInvoiceBeforeDelivery: false, requireFullPaymentBeforeDelivery: true } },
      ]);
      prisma.dentalLabCase.findFirst.mockResolvedValue(baseCase('READY', []));
      prisma.dentalInvoice.findMany.mockResolvedValue([{ id: 'inv-1', remaining: 150 }]);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.advanceCaseStatus(req({ params: { id: 'case-1' }, body: { to: 'DELIVERED' } }), res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toMatch(/سداد كامل المستحقات/);
      expect(prisma.dentalLabCase.update).not.toHaveBeenCalled();
    });

    test('AUTO_ON_DELIVERY creates an invoice automatically when advancing to DELIVERED', async () => {
      const prisma = createPrisma();
      prisma.dentalSetting.findMany.mockResolvedValue([
        { key: 'billingPolicy', value: { invoiceMode: 'AUTO_ON_DELIVERY', requireInvoiceBeforeDelivery: true } },
      ]);
      prisma.dentalLabCase.findFirst.mockResolvedValue({ ...baseCase('READY', []), total: 200, paid: 0, discount: 0, doctorId: null, doctorName: null, dueDate: null });
      prisma.dentalInvoice.findFirst.mockResolvedValue(null);
      prisma.dentalInvoice.create.mockResolvedValue({ id: 'inv-auto', total: 200, paid: 0, remaining: 200 });
      prisma.dentalInvoice.findMany.mockResolvedValue([{ id: 'inv-auto', remaining: 200 }]);
      prisma.dentalLabCase.update.mockResolvedValue(makeCase({ status: 'DELIVERED', deliveredAt: new Date(), orderStatus: 'COMPLETED' }));
      prisma.dentalCaseStatusHistory.create.mockResolvedValue({});
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.advanceCaseStatus(req({ params: { id: 'case-1' }, body: { to: 'DELIVERED' } }), res);

      expect(res.statusCode).toBe(200);
      expect(prisma.dentalInvoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ caseId: 'case-1', total: 200, doctorId: null }),
        })
      );
    });

    test('returns 404 for a case outside the company', async () => {
      const prisma = createPrisma();
      prisma.dentalLabCase.findFirst.mockResolvedValue(null);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.advanceCaseStatus(req({ params: { id: 'foreign' }, body: { to: 'DESIGN' } }), res);
      expect(res.statusCode).toBe(404);
      expect(res.payload.error).toBe('الحالة غير موجودة');
    });
  });

  describe('assignTechnician', () => {
    test('creates an assignment, assigns the active stage and records history', async () => {
      const prisma = createPrisma();
      prisma.dentalLabCase.findFirst
        .mockResolvedValueOnce({
          id: 'case-1',
          companyId: 'company-1',
          status: 'DESIGN',
          stages: [{ id: 'stage-2', name: 'التصميم', status: 'PENDING', assigneeId: null, sortOrder: 1 }],
        })
        .mockResolvedValueOnce(makeCase());
      prisma.dentalTechnician.findFirst.mockResolvedValue({ id: 'tech-1', name: 'أحمد فني' });
      prisma.dentalCaseAssignment.create.mockResolvedValue({});
      prisma.dentalCaseStage.update.mockResolvedValue({});
      prisma.dentalCaseStatusHistory.create.mockResolvedValue({});
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.assignTechnician(
        req({ params: { id: 'case-1' }, body: { technicianId: 'tech-1', role: 'CAD' } }),
        res
      );

      expect(res.statusCode).toBe(200);
      expect(prisma.dentalCaseAssignment.create).toHaveBeenCalledWith({
        data: { companyId: 'company-1', caseId: 'case-1', technicianId: 'tech-1', role: 'CAD' },
      });
      expect(prisma.dentalCaseStage.update).toHaveBeenCalledWith({
        where: { id: 'stage-2' },
        data: { assigneeId: 'tech-1', assigneeName: 'أحمد فني', startedAt: expect.any(Date) },
      });
      expect(prisma.dentalCaseStatusHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ caseId: 'case-1', dimension: 'STAGE', status: 'ASSIGNED' }),
        })
      );
    });

    test('rejects a technician outside the company', async () => {
      const prisma = createPrisma();
      prisma.dentalLabCase.findFirst.mockResolvedValue({ id: 'case-1', companyId: 'company-1', status: 'RECEIVED', stages: [] });
      prisma.dentalTechnician.findFirst.mockResolvedValue(null);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.assignTechnician(req({ params: { id: 'case-1' }, body: { technicianId: 'foreign' } }), res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('الفني لا ينتمي لهذه الشركة');
      expect(prisma.dentalCaseAssignment.create).not.toHaveBeenCalled();
    });
  });

  describe('removeCaseAssignment', () => {
    test('removes an assignment and records history', async () => {
      const prisma = createPrisma();
      prisma.dentalLabCase.findFirst
        .mockResolvedValueOnce({ id: 'case-1', companyId: 'company-1' })
        .mockResolvedValueOnce(makeCase());
      prisma.dentalCaseAssignment.findFirst.mockResolvedValue({
        id: 'asg-1',
        companyId: 'company-1',
        caseId: 'case-1',
        technicianId: 'tech-1',
        technician: { name: 'أحمد فني' },
      });
      prisma.dentalCaseAssignment.delete.mockResolvedValue({});
      prisma.dentalCaseStage.updateMany.mockResolvedValue({ count: 1 });
      prisma.dentalCaseStatusHistory.create.mockResolvedValue({});
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.removeCaseAssignment(
        req({ params: { id: 'case-1', assignmentId: 'asg-1' } }),
        res
      );

      expect(res.statusCode).toBe(200);
      expect(prisma.dentalCaseAssignment.delete).toHaveBeenCalledWith({ where: { id: 'asg-1' } });
      expect(prisma.dentalCaseStage.updateMany).toHaveBeenCalledWith({
        where: { caseId: 'case-1', companyId: 'company-1', assigneeId: 'tech-1' },
        data: { assigneeId: null, assigneeName: null },
      });
      expect(prisma.dentalCaseStatusHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ caseId: 'case-1', dimension: 'STAGE', status: 'ASSIGNMENT_REMOVED' }),
        })
      );
    });

    test('returns 404 when assignment not found', async () => {
      const prisma = createPrisma();
      prisma.dentalLabCase.findFirst.mockResolvedValue({ id: 'case-1', companyId: 'company-1' });
      prisma.dentalCaseAssignment.findFirst.mockResolvedValue(null);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.removeCaseAssignment(
        req({ params: { id: 'case-1', assignmentId: 'non-existent' } }),
        res
      );

      expect(res.statusCode).toBe(404);
      expect(res.payload.error).toBe('الإسناد غير موجود');
    });
  });

  describe('createInvoice + recordInvoicePayment', () => {
    test('createInvoice from a case copies doctorName and total', async () => {
      const prisma = createPrisma();
      prisma.dentalLabCase.findFirst.mockResolvedValue(makeCase({ total: 200, discount: 10, doctorName: 'د. أحمد' }));
      prisma.dentalInvoice.findFirst.mockResolvedValue(null);
      prisma.dentalInvoice.create.mockResolvedValue({ id: 'inv-1', invoiceNumber: 'INV-DL-20260809-0001' });
      prisma.dentalLabDoctor.findFirst.mockResolvedValue(null);
      prisma.dentalInvoice.findMany.mockResolvedValue([]);
      prisma.dentalLabCase.update.mockResolvedValue({});
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createInvoice(req({ body: { caseId: 'case-1' } }), res);

      expect(res.statusCode).toBe(200);
      const data = prisma.dentalInvoice.create.mock.calls[0][0].data;
      expect(data.caseId).toBe('case-1');
      expect(data.doctorName).toBe('د. أحمد');
      expect(data.total).toBe(200);
      expect(data.discount).toBe(10);
      expect(data.remaining).toBe(200);
      expect(data.status).toBe('OPEN');
      expect(data.invoiceNumber).toMatch(/^INV-DL-\d{8}-\d{4}$/);
    });

    test('recordInvoicePayment recomputes invoice + linked case and records PAYMENT history', async () => {
      const prisma = createPrisma();
      prisma.dentalInvoice.findFirst.mockResolvedValue({
        id: 'inv-1',
        companyId: 'company-1',
        caseId: 'case-1',
        invoiceNumber: 'INV-DL-20260809-0001',
        total: 100,
        paid: 0,
        remaining: 100,
        status: 'OPEN',
      });
      prisma.dentalPayment.create.mockResolvedValue({});
      prisma.dentalPayment.findMany.mockResolvedValue([{ amount: 40 }]);
      prisma.dentalInvoice.update.mockResolvedValue({ id: 'inv-1', paid: 40, remaining: 60, status: 'PARTIAL', payments: [] });
      prisma.dentalLabCase.findFirst.mockResolvedValue({
        id: 'case-1',
        companyId: 'company-1',
        total: 100,
        paid: 0,
        remaining: 100,
        paymentStatus: 'UNPAID',
      });
      prisma.dentalInvoice.findMany.mockResolvedValue([{ paid: 40 }]);
      prisma.dentalLabCase.update.mockResolvedValue({});
      prisma.dentalCaseStatusHistory.create.mockResolvedValue({});
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.recordInvoicePayment(
        req({ params: { id: 'inv-1' }, body: { amount: 40, method: 'CASH', note: 'دفعة أولى' } }),
        res
      );

      expect(res.statusCode).toBe(200);
      expect(prisma.dentalPayment.create).toHaveBeenCalledWith({
        data: {
          companyId: 'company-1',
          invoiceId: 'inv-1',
          amount: 40,
          method: 'CASH',
          note: 'دفعة أولى',
          paidBy: 'user-1',
        },
      });
      expect(prisma.dentalInvoice.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: { paid: 40, remaining: 60, status: 'PARTIAL' },
        include: expect.any(Object),
      });
      expect(prisma.dentalLabCase.update).toHaveBeenCalledWith({
        where: { id: 'case-1' },
        data: { paid: 40, remaining: 60, paymentStatus: 'PARTIAL' },
      });
      expect(prisma.dentalCaseStatusHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ caseId: 'case-1', dimension: 'PAYMENT', status: 'PARTIAL' }),
        })
      );
    });

    test('recordInvoicePayment rejects an invalid amount', async () => {
      const prisma = createPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);
      const res = createResponse();
      await controller.recordInvoicePayment(req({ params: { id: 'inv-1' }, body: { amount: -5 } }), res);
      expect(res.statusCode).toBe(400);
      expect(prisma.dentalPayment.create).not.toHaveBeenCalled();
    });

    test('recordInvoicePayment rejects overpayment beyond the remaining balance', async () => {
      const prisma = createPrisma();
      prisma.dentalInvoice.findFirst.mockResolvedValue({ id: 'inv-1', companyId: 'company-1', caseId: null, total: 100, paid: 40, remaining: 60, status: 'OPEN' });
      getSharedPrismaClient.mockReturnValue(prisma);
      const res = createResponse();
      await controller.recordInvoicePayment(req({ params: { id: 'inv-1' }, body: { amount: 200 } }), res);
      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('المبلغ أكبر من المتبقي على الفاتورة');
      expect(prisma.dentalPayment.create).not.toHaveBeenCalled();
    });

    test('recordInvoicePayment rejects payment on a fully-paid invoice', async () => {
      const prisma = createPrisma();
      prisma.dentalInvoice.findFirst.mockResolvedValue({ id: 'inv-1', companyId: 'company-1', caseId: null, total: 100, paid: 100, remaining: 0, status: 'PAID' });
      getSharedPrismaClient.mockReturnValue(prisma);
      const res = createResponse();
      await controller.recordInvoicePayment(req({ params: { id: 'inv-1' }, body: { amount: 10 } }), res);
      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('الفاتورة مسددة بالكامل');
    });
  });

  describe('listInvoices', () => {
    test('filters invoices by doctorId, status, and search', async () => {
      const prisma = createPrisma();
      prisma.dentalInvoice.findMany.mockResolvedValue([
        { id: 'inv-1', invoiceNumber: 'INV-101', total: 500, doctorName: 'د. سارة' },
      ]);
      prisma.dentalInvoice.count.mockResolvedValue(1);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.listInvoices(
        req({ query: { doctorId: 'doc-1', status: 'OPEN', search: 'سارة' } }),
        res
      );

      expect(res.statusCode).toBe(200);
      expect(res.payload.success).toBe(true);
      expect(res.payload.data.items).toHaveLength(1);
      expect(prisma.dentalInvoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyId: 'company-1',
            doctorId: 'doc-1',
            status: 'OPEN',
            OR: expect.any(Array),
          }),
        })
      );
    });
  });

  describe('getDashboard', () => {
    test('aggregates status counts, revenue, outstanding and top doctors', async () => {
      const prisma = createPrisma();
      prisma.dentalLabCase.groupBy.mockResolvedValue([
        { status: 'RECEIVED', _count: { _all: 3 } },
        { status: 'DELIVERED', _count: { _all: 2 } },
      ]);
      prisma.dentalLabCase.count
        .mockResolvedValueOnce(2) // today received
        .mockResolvedValueOnce(3) // today due
        .mockResolvedValueOnce(1) // ready
        .mockResolvedValueOnce(1); // overdue
      prisma.dentalInvoice.aggregate
        .mockResolvedValueOnce({ _sum: { paid: 150 } })
        .mockResolvedValueOnce({ _sum: { remaining: 50 } });
      prisma.dentalInvoice.groupBy.mockResolvedValue([{ doctorId: 'doc-1', _sum: { paid: 150 } }]);
      prisma.dentalLabDoctor.findMany.mockResolvedValue([{ id: 'doc-1', name: 'د. أحمد' }]);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getDashboard(req(), res);

      expect(res.statusCode).toBe(200);
      expect(res.payload.data.statusCounts).toEqual({ RECEIVED: 3, DELIVERED: 2 });
      expect(res.payload.data.todayReceived).toBe(2);
      expect(res.payload.data.todayDue).toBe(3);
      expect(res.payload.data.readyForDelivery).toBe(1);
      expect(res.payload.data.overdue).toBe(1);
      expect(res.payload.data.totalRevenue).toBe(150);
      expect(res.payload.data.outstanding).toBe(50);
      expect(res.payload.data.topDoctors).toEqual([{ doctorId: 'doc-1', doctorName: 'د. أحمد', revenue: 150, count: 0 }]);
    });
  });

  describe('settings', () => {
    test('getSettings merges stored values with defaults', async () => {
      const prisma = createPrisma();
      prisma.dentalSetting.findMany.mockResolvedValue([
        { key: 'workOrderHeader', value: { labName: 'معمل النور' } },
      ]);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getSettings(req(), res);

      expect(res.statusCode).toBe(200);
      expect(res.payload.data.workOrderHeader.labName).toBe('معمل النور');
      expect(res.payload.data.workOrderHeader.address).toBe('');
      expect(res.payload.data.whatsappTemplates).toEqual({ ready: '', received: '', overdue: '' });
      expect(res.payload.data.enabledCustomFields).toEqual([]);
      expect(res.payload.data.stageTemplates.__default).toHaveLength(5);
    });

    test('updateSettings upserts each provided key', async () => {
      const prisma = createPrisma();
      prisma.dentalSetting.upsert.mockResolvedValue({});
      prisma.dentalSetting.findMany.mockResolvedValue([]);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.updateSettings(
        req({ body: { workOrderHeader: { labName: 'X' }, enabledCustomFields: ['شكل الفك'] } }),
        res
      );

      expect(prisma.dentalSetting.upsert).toHaveBeenCalledWith({
        where: { companyId_key: { companyId: 'company-1', key: 'workOrderHeader' } },
        update: { value: { labName: 'X' } },
        create: { companyId: 'company-1', key: 'workOrderHeader', value: { labName: 'X' } },
      });
      expect(prisma.dentalSetting.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ create: expect.objectContaining({ key: 'enabledCustomFields', value: ['شكل الفك'] }) })
      );
      expect(res.statusCode).toBe(200);
    });
  });

  describe('doctors', () => {
    test('getDoctorDetail returns doctor information, financial aggregations and custom pricing', async () => {
      const prisma = createPrisma();
      prisma.dentalLabDoctor.findFirst.mockResolvedValue({
        id: 'doc-1',
        companyId: 'company-1',
        name: 'د. محمود',
        phone: '01012345678',
        clinicName: 'عيادة النور',
        creditLimit: 5000,
        portalPin: '$2a$10$hashedpin',
        isActive: true,
      });
      prisma.dentalInvoice.aggregate.mockResolvedValue({
        _sum: { total: 10000, paid: 6000, remaining: 4000 },
        _count: { _all: 5 },
      });
      prisma.dentalCreditNote.aggregate.mockResolvedValue({
        _sum: { amount: 500 },
      });
      prisma.dentalLabCase.count
        .mockResolvedValueOnce(12)
        .mockResolvedValueOnce(4)
        .mockResolvedValueOnce(8)
        .mockResolvedValueOnce(1);
      prisma.dentalSetting.findMany.mockResolvedValue([
        { key: 'doctorPricing', value: { 'doc-1': { 'wt-1': 850 } } },
      ]);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getDoctorDetail(req({ params: { id: 'doc-1' } }), res);

      expect(res.statusCode).toBe(200);
      expect(res.payload.success).toBe(true);
      expect(res.payload.data.name).toBe('د. محمود');
      expect(res.payload.data.hasPortalPin).toBe(true);
      expect(res.payload.data.portalPin).toBeUndefined();
      expect(res.payload.data.totalBilled).toBe(10000);
      expect(res.payload.data.totalPaid).toBe(6000);
      expect(res.payload.data.outstanding).toBe(3500);
      expect(res.payload.data.casesCount).toBe(12);
      expect(res.payload.data.activeCases).toBe(4);
      expect(res.payload.data.customPricing).toEqual({ 'wt-1': 850 });
    });

    test('createDoctor requires a name and stores credit limit', async () => {
      const prisma = createPrisma();
      prisma.dentalLabDoctor.create.mockResolvedValue({ id: 'doc-1' });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createDoctor(req({ body: { name: 'د. أحمد', phone: '0100', creditLimit: 500 } }), res);

      expect(res.statusCode).toBe(200);
      expect(prisma.dentalLabDoctor.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          companyId: 'company-1',
          name: 'د. أحمد',
          phone: '0100',
          creditLimit: 500,
          isActive: true,
        }),
      });
    });

    test('deleteDoctor performs hard delete when doctor has 0 cases and 0 invoices', async () => {
      const prisma = createPrisma();
      prisma.dentalLabDoctor.findFirst.mockResolvedValue({ id: 'doc-1', companyId: 'company-1' });
      prisma.dentalLabCase.count.mockResolvedValue(0);
      prisma.dentalInvoice.count.mockResolvedValue(0);
      prisma.dentalLabDoctor.delete.mockResolvedValue({ id: 'doc-1' });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.deleteDoctor(req({ params: { id: 'doc-1' } }), res);

      expect(res.statusCode).toBe(200);
      expect(res.payload.mode).toBe('DELETED');
      expect(prisma.dentalLabDoctor.delete).toHaveBeenCalledWith({ where: { id: 'doc-1' } });
    });

    test('deleteDoctor performs soft archive when doctor has associated cases', async () => {
      const prisma = createPrisma();
      prisma.dentalLabDoctor.findFirst.mockResolvedValue({ id: 'doc-1', companyId: 'company-1' });
      prisma.dentalLabCase.count.mockResolvedValue(3);
      prisma.dentalInvoice.count.mockResolvedValue(1);
      prisma.dentalLabDoctor.update.mockResolvedValue({ id: 'doc-1', isActive: false });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.deleteDoctor(req({ params: { id: 'doc-1' } }), res);

      expect(res.statusCode).toBe(200);
      expect(res.payload.mode).toBe('ARCHIVED');
      expect(prisma.dentalLabDoctor.update).toHaveBeenCalledWith({
        where: { id: 'doc-1' },
        data: { isActive: false },
      });
    });

    test('restoreDoctor sets isActive to true', async () => {
      const prisma = createPrisma();
      prisma.dentalLabDoctor.findFirst.mockResolvedValue({ id: 'doc-1', companyId: 'company-1', isActive: false });
      prisma.dentalLabDoctor.update.mockResolvedValue({ id: 'doc-1', isActive: true });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.restoreDoctor(req({ params: { id: 'doc-1' } }), res);

      expect(res.statusCode).toBe(200);
      expect(prisma.dentalLabDoctor.update).toHaveBeenCalledWith({
        where: { id: 'doc-1' },
        data: { isActive: true },
      });
    });

    test('permanentDeleteDoctor deletes doctor without records', async () => {
      const prisma = createPrisma();
      prisma.dentalLabDoctor.findFirst.mockResolvedValue({ id: 'doc-1', companyId: 'company-1' });
      prisma.dentalLabCase.count.mockResolvedValue(0);
      prisma.dentalInvoice.count.mockResolvedValue(0);
      prisma.dentalLabDoctor.delete.mockResolvedValue({ id: 'doc-1' });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.permanentDeleteDoctor(req({ params: { id: 'doc-1' } }), res);

      expect(res.statusCode).toBe(200);
      expect(prisma.dentalLabDoctor.delete).toHaveBeenCalledWith({ where: { id: 'doc-1' } });
    });

    test('permanentDeleteDoctor blocks deletion when records exist', async () => {
      const prisma = createPrisma();
      prisma.dentalLabDoctor.findFirst.mockResolvedValue({ id: 'doc-1', companyId: 'company-1' });
      prisma.dentalLabCase.count.mockResolvedValue(2);
      prisma.dentalInvoice.count.mockResolvedValue(1);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.permanentDeleteDoctor(req({ params: { id: 'doc-1' } }), res);

      expect(res.statusCode).toBe(400);
      expect(prisma.dentalLabDoctor.delete).not.toHaveBeenCalled();
    });

    test('deleteDoctor returns 404 for a foreign doctor', async () => {
      const prisma = createPrisma();
      prisma.dentalLabDoctor.findFirst.mockResolvedValue(null);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.deleteDoctor(req({ params: { id: 'foreign' } }), res);
      expect(res.statusCode).toBe(404);
      expect(prisma.dentalLabDoctor.update).not.toHaveBeenCalled();
    });
  });

  describe('Try-in Cycles', () => {
    test('sendCaseToTryIn sets isTryIn=true and increments tryInCount', async () => {
      const prisma = createPrisma();
      prisma.dentalLabCase.findFirst.mockResolvedValue({ id: 'case-1', companyId: 'company-1', status: 'MANUFACTURING', tryInCount: 1 });
      prisma.dentalLabCase.update.mockResolvedValue({ id: 'case-1', isTryIn: true, tryInStage: 'WAX_TRY_IN', tryInCount: 2 });
      prisma.dentalCaseStatusHistory.create.mockResolvedValue({});
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.sendCaseToTryIn(req({ params: { id: 'case-1' }, body: { tryInStage: 'WAX_TRY_IN', note: 'بروفة شمع' } }), res);

      expect(res.statusCode).toBe(200);
      expect(prisma.dentalLabCase.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'case-1' },
        data: expect.objectContaining({ isTryIn: true, tryInStage: 'WAX_TRY_IN', tryInCount: 2 }),
      }));
    });

    test('returnCaseFromTryIn clears isTryIn and resumes production stage', async () => {
      const prisma = createPrisma();
      prisma.dentalLabCase.findFirst.mockResolvedValue({ id: 'case-1', companyId: 'company-1', isTryIn: true, tryInStage: 'WAX_TRY_IN' });
      prisma.dentalLabCase.update.mockResolvedValue({ id: 'case-1', isTryIn: false, status: 'MANUFACTURING' });
      prisma.dentalCaseStatusHistory.create.mockResolvedValue({});
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.returnCaseFromTryIn(req({ params: { id: 'case-1' }, body: { targetStage: 'MANUFACTURING', feedbackNotes: 'البروفة ممتازة' } }), res);

      expect(res.statusCode).toBe(200);
      expect(prisma.dentalLabCase.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'case-1' },
        data: expect.objectContaining({ isTryIn: false, status: 'MANUFACTURING' }),
      }));
    });
  });

  describe('Barcode Kiosk Station', () => {
    test('kioskScanCase finds case by barcode, completes active stage and advances status', async () => {
      const prisma = createPrisma();
      const mockCase = {
        id: 'case-1',
        caseNumber: 'DL-1001',
        companyId: 'company-1',
        status: 'RECEIVED',
        stages: [
          { id: 'stg-1', name: 'استلام', status: 'IN_PROGRESS', sortOrder: 0 },
          { id: 'stg-2', name: 'تصميم CAD', status: 'PENDING', sortOrder: 1 },
        ],
        assignments: [],
      };
      prisma.dentalLabCase.findFirst.mockResolvedValue(mockCase);
      prisma.dentalCaseStage.update.mockResolvedValue({});
      prisma.dentalLabCase.update.mockResolvedValue({ ...mockCase, status: 'DESIGN' });
      prisma.dentalCaseStatusHistory.create.mockResolvedValue({});
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.kioskScanCase(req({ body: { barcode: 'DL-1001' } }), res);

      expect(res.statusCode).toBe(200);
      expect(res.payload.success).toBe(true);
      expect(res.payload.data.newStatus).toBe('DESIGN');
    });

    test('kioskScanCase returns 404 for unknown barcode', async () => {
      const prisma = createPrisma();
      prisma.dentalLabCase.findFirst.mockResolvedValue(null);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.kioskScanCase(req({ body: { barcode: 'UNKNOWN-999' } }), res);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('Remakes Root Cause Analytics', () => {
    test('getRemakesAnalysisReport groups refabrications by root cause, doctor, and workType', async () => {
      const prisma = createPrisma();
      prisma.dentalRefabrication.findMany.mockResolvedValue([
        { id: 'rf-1', rootCauseCategory: 'DOCTOR_IMPRESSION', isBillable: true, case: { doctorName: 'د. أحمد', workTypeName: 'Zirconia' } },
        { id: 'rf-2', rootCauseCategory: 'DOCTOR_IMPRESSION', isBillable: false, case: { doctorName: 'د. أحمد', workTypeName: 'Zirconia' } },
        { id: 'rf-3', rootCauseCategory: 'LAB_FIT_MARGIN', isBillable: false, case: { doctorName: 'د. سارة', workTypeName: 'Emax' } },
      ]);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getRemakesAnalysisReport(req({ query: {} }), res);

      expect(res.statusCode).toBe(200);
      expect(res.payload.data.totalCount).toBe(3);
      expect(res.payload.data.billableCount).toBe(1);
      expect(res.payload.data.freeCount).toBe(2);
      expect(res.payload.data.byCategory.DOCTOR_IMPRESSION).toBe(2);
      expect(res.payload.data.byCategory.LAB_FIT_MARGIN).toBe(1);
    });
  });

  describe('Monthly Invoicing & Uninvoiced Cases Cadence', () => {
    test('getUninvoicedSummary groups cases by doctor and computes totals', async () => {
      const prisma = createPrisma();
      prisma.dentalLabCase.findMany.mockResolvedValue([
        { id: 'case-1', caseNumber: 'DL-1', doctorId: 'doc-1', doctorName: 'د. أحمد', total: 1000, status: 'DELIVERED', doctor: { id: 'doc-1', name: 'د. أحمد', phone: '0100', clinicName: 'عيادة 1' }, workType: { id: 'wt-1', name: 'Zirconia' } },
        { id: 'case-2', caseNumber: 'DL-2', doctorId: 'doc-1', doctorName: 'د. أحمد', total: 500, status: 'READY', doctor: { id: 'doc-1', name: 'د. أحمد', phone: '0100', clinicName: 'عيادة 1' }, workType: { id: 'wt-1', name: 'Zirconia' } },
        { id: 'case-3', caseNumber: 'DL-3', doctorId: 'doc-2', doctorName: 'د. منى', total: 800, status: 'DELIVERED', doctor: { id: 'doc-2', name: 'د. منى', phone: '0101', clinicName: 'عيادة 2' }, workType: { id: 'wt-2', name: 'Emax' } },
      ]);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getUninvoicedSummary(req(), res);

      expect(res.statusCode).toBe(200);
      expect(res.payload.success).toBe(true);
      expect(res.payload.data.totalCases).toBe(3);
      expect(res.payload.data.totalAmount).toBe(2300);
      expect(res.payload.data.totalDoctors).toBe(2);
      expect(res.payload.data.doctors[0].doctorId).toBe('doc-1');
      expect(res.payload.data.doctors[0].casesCount).toBe(2);
      expect(res.payload.data.doctors[0].totalAmount).toBe(1500);
    });

    test('batchCreateMonthlyInvoices creates aggregated invoices for doctors', async () => {
      const prisma = createPrisma();
      prisma.dentalLabCase.findMany.mockResolvedValue([
        { id: 'case-1', caseNumber: 'DL-1', doctorId: 'doc-1', doctorName: 'د. أحمد', total: 1000, discount: 0, paid: 200, status: 'DELIVERED', doctor: { id: 'doc-1', name: 'د. أحمد' } },
        { id: 'case-2', caseNumber: 'DL-2', doctorId: 'doc-1', doctorName: 'د. أحمد', total: 500, discount: 50, paid: 0, status: 'READY', doctor: { id: 'doc-1', name: 'د. أحمد' } },
      ]);
      prisma.dentalInvoice.count.mockResolvedValue(10);
      prisma.dentalInvoice.create.mockResolvedValue({ id: 'inv-101', invoiceNumber: 'INV-101', total: 1500, remaining: 1300 });
      prisma.dentalCaseStatusHistory.create.mockResolvedValue({});
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.batchCreateMonthlyInvoices(req({ body: { doctorIds: ['doc-1'] } }), res);

      expect(res.statusCode).toBe(200);
      expect(res.payload.success).toBe(true);
      expect(res.payload.data.createdCount).toBe(1);
      expect(res.payload.data.invoicedCasesCount).toBe(2);
      expect(prisma.dentalInvoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            doctorId: 'doc-1',
            total: 1500,
            remaining: 1300,
          }),
        })
      );
    });
  });

  describe('bulkOperations', () => {
    const mockCase = (id, status, stages = []) => ({
      id,
      companyId: 'company-1',
      status,
      stages,
    });

    test('bulkAdvanceCases updates status and stages for multiple cases', async () => {
      const prisma = createPrisma();
      prisma.dentalLabCase.findMany.mockResolvedValue([
        mockCase('case-1', 'RECEIVED', [{ id: 'st-1', sortOrder: 0, status: 'IN_PROGRESS' }, { id: 'st-2', sortOrder: 1, status: 'PENDING' }]),
        mockCase('case-2', 'RECEIVED', [{ id: 'st-3', sortOrder: 0, status: 'IN_PROGRESS' }, { id: 'st-4', sortOrder: 1, status: 'PENDING' }]),
      ]);
      prisma.dentalCaseStage.update.mockResolvedValue({});
      prisma.dentalLabCase.update.mockResolvedValue({});
      prisma.dentalCaseStatusHistory.create.mockResolvedValue({});
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.bulkAdvanceCases(req({ body: { caseIds: ['case-1', 'case-2'], to: 'DESIGN' } }), res);

      expect(res.statusCode).toBe(200);
      expect(res.payload.success).toBe(true);
      expect(res.payload.count).toBe(2);
    });

    test('bulkAssignTechnician assigns technician to active stage of cases', async () => {
      const prisma = createPrisma();
      prisma.dentalTechnician.findFirst.mockResolvedValue({ id: 'tech-1', name: 'أحمد فني' });
      prisma.dentalLabCase.findMany.mockResolvedValue([
        mockCase('case-1', 'RECEIVED', [{ id: 'st-1', status: 'IN_PROGRESS' }]),
      ]);
      prisma.dentalCaseAssignment.create.mockResolvedValue({});
      prisma.dentalCaseStage.update.mockResolvedValue({});
      prisma.dentalCaseStatusHistory.create.mockResolvedValue({});
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.bulkAssignTechnician(req({ body: { caseIds: ['case-1'], technicianId: 'tech-1' } }), res);

      expect(res.statusCode).toBe(200);
      expect(res.payload.success).toBe(true);
      expect(res.payload.count).toBe(1);
    });

    test('bulkUpdatePriority updates priority for selected cases', async () => {
      const prisma = createPrisma();
      prisma.dentalLabCase.updateMany.mockResolvedValue({ count: 3 });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.bulkUpdatePriority(req({ body: { caseIds: ['c-1', 'c-2', 'c-3'], priority: 'URGENT' } }), res);

      expect(res.statusCode).toBe(200);
      expect(res.payload.success).toBe(true);
      expect(res.payload.count).toBe(3);
    });

    test('bulkTrashCases and bulkRestoreCases update isDeleted flag', async () => {
      const prisma = createPrisma();
      prisma.dentalLabCase.updateMany.mockResolvedValue({ count: 2 });
      getSharedPrismaClient.mockReturnValue(prisma);

      const resTrash = createResponse();
      await controller.bulkTrashCases(req({ body: { caseIds: ['c-1', 'c-2'] } }), resTrash);
      expect(resTrash.statusCode).toBe(200);
      expect(resTrash.payload.count).toBe(2);

      const resRestore = createResponse();
      await controller.bulkRestoreCases(req({ body: { caseIds: ['c-1', 'c-2'] } }), resRestore);
      expect(resRestore.statusCode).toBe(200);
      expect(resRestore.payload.count).toBe(2);
    });
  });

  describe('technicians and direct user accounts', () => {
    test('createTechnician creates User and UserCompany with role AGENT', async () => {
      const prisma = createPrisma();
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: 'user-new-1', email: 'tech@lab.com' });
      prisma.userCompany.findFirst.mockResolvedValue(null);
      prisma.userCompany.create.mockResolvedValue({ id: 'uc-1' });
      prisma.dentalSetting.upsert.mockResolvedValue({});
      prisma.dentalTechnician.create.mockImplementation(({ data }) => Promise.resolve({ id: 'tech-1', ...data }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createTechnician(
        req({
          body: {
            name: 'محمود عبد السلام',
            role: 'CAD_DESIGNER',
            email: 'tech@lab.com',
            password: 'secretPassword123',
          },
        }),
        res
      );

      expect(res.statusCode).toBe(200);
      expect(res.payload.success).toBe(true);
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'tech@lab.com',
            role: 'AGENT',
            companyId: 'company-1',
          }),
        })
      );
      expect(prisma.userCompany.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-new-1',
          companyId: 'company-1',
          role: 'AGENT',
          isActive: true,
          isDefault: true,
        },
      });
      expect(prisma.dentalTechnician.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'محمود عبد السلام',
            userId: 'user-new-1',
          }),
        })
      );
    });

    test('createTechnician links existing company user without overwriting credentials', async () => {
      const prisma = createPrisma();
      prisma.user.findFirst.mockResolvedValue({ id: 'user-existing-1', email: 'existing@lab.com' });
      prisma.dentalTechnician.findFirst.mockResolvedValue(null);
      prisma.userCompany.findFirst.mockResolvedValue({ id: 'uc-1', userId: 'user-existing-1', companyId: 'company-1' });
      prisma.dentalSetting.upsert.mockResolvedValue({});
      prisma.dentalTechnician.create.mockImplementation(({ data }) => Promise.resolve({ id: 'tech-2', ...data }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createTechnician(
        req({
          body: {
            name: 'سامح حسن',
            role: 'CERAMIST',
            email: 'existing@lab.com',
            password: 'newPassword123',
          },
        }),
        res
      );

      expect(res.statusCode).toBe(200);
      expect(res.payload.success).toBe(true);
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(prisma.dentalTechnician.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-existing-1',
          }),
        })
      );
    });

    test('createTechnician rejects existing user from another company (S1 security guard)', async () => {
      const prisma = createPrisma();
      prisma.user.findFirst.mockResolvedValue({ id: 'user-foreign-1', email: 'other@company.com' });
      prisma.userCompany.findFirst.mockResolvedValue(null);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createTechnician(
        req({
          body: {
            name: 'سامح حسن',
            role: 'CERAMIST',
            email: 'other@company.com',
            password: 'newPassword123',
          },
        }),
        res
      );

      expect(res.statusCode).toBe(400);
      expect(res.payload.success).toBe(false);
      expect(res.payload.error).toContain('مسجل بالفعل لمستخدم آخر على المنصة');
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('company scoping', () => {
    test('returns 403 when companyId is missing', async () => {
      const prisma = createPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.listCases(req({ user: {} }), res);
      expect(res.statusCode).toBe(403);
      expect(prisma.dentalLabCase.findMany).not.toHaveBeenCalled();
    });
  });
});