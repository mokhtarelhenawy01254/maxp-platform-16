jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
}));

jest.mock('../../services/bookingPatientService', () => ({
  findOrCreatePatient: jest.fn(),
}));

jest.mock('../../utils/dicomUtil', () => {
  const actual = jest.requireActual('../../utils/dicomUtil');
  return { ...actual, parseDicomFromBuffer: jest.fn(() => ({})) };
});

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const { findOrCreatePatient } = require('../../services/bookingPatientService');
const controller = require('../../controller/radiologyController');
const dicomUtil = require('../../utils/dicomUtil');
const appointments = require('../../controller/radiologyAppointmentsController');

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
    radiologyExamType: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    radiologyExamCategory: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(({ data }) => Promise.resolve({ id: 'cat-auto', ...data })),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    radiologyAppointment: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    radiologyStudy: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    radiologyStudyImage: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    radiologyReport: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    radiologyStudyStatusHistory: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    radiologyContract: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    radiologyReportTemplate: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    radiologyAppointment: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    company: {
      findUnique: jest.fn(),
    },
    patient: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((fn) => fn(prisma)),
    ...overrides,
  };
  return prisma;
};

const req = (overrides = {}) => ({
  user: { companyId: 'company-1', id: 'user-1', firstName: '╪ú╪¡┘à╪»', lastName: '┘à╪¡┘à┘ê╪»' },
  query: {},
  params: {},
  body: {},
  ...overrides,
});

const makeStudy = (overrides = {}) => ({
  id: 'study-1',
  companyId: 'company-1',
  studyNumber: 'RAD-20260809-1234',
  patientId: null,
  patientName: '┘à╪¡┘à╪» ╪╣┘ä┘è',
  patientPhone: '01001234567',
  patientGender: 'MALE',
  patientAge: '35',
  examTypeId: 'et-1',
  examTypeName: '╪ú╪┤╪╣╪⌐ ┘à┘é╪╖╪╣┘è╪⌐',
  modality: 'CT',
  status: 'PENDING_IMAGING',
  emergency: false,
  withContrast: false,
  referralDoctor: null,
  notes: null,
  accessionNumber: null,
  submissionStatus: 'NOT_SUBMITTED',
  rologyStudyLink: null,
  rologyReportLink: null,
  rologyRadiologist: null,
  reportReceivedAt: null,
  createdBy: 'user-1',
  createdAt: new Date('2026-08-09T10:00:00.000Z'),
  updatedAt: new Date('2026-08-09T10:00:00.000Z'),
  ...overrides,
});

const makeExamType = (overrides = {}) => ({
  id: 'et-1',
  companyId: 'company-1',
  name: '╪ú╪┤╪╣╪⌐ ┘à┘é╪╖╪╣┘è╪⌐',
  category: 'CT',
  abbreviation: 'CT',
  price: 300,
  isActive: true,
  ...overrides,
});

describe('radiologyController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    findOrCreatePatient.mockResolvedValue({ id: 'patient-resolved-1' });
  });

  describe('transition helpers', () => {
    test('validateRadiologyStudyTransition enforces the forward-only chain', () => {
      expect(controller.validateRadiologyStudyTransition('PENDING_IMAGING', 'IMAGED').valid).toBe(true);
      expect(controller.validateRadiologyStudyTransition('IMAGED', 'PENDING_REPORT').valid).toBe(true);
      expect(controller.validateRadiologyStudyTransition('PENDING_REPORT', 'REPORTED').valid).toBe(true);
      expect(controller.validateRadiologyStudyTransition('REPORTED', 'DELIVERED').valid).toBe(true);
      expect(controller.validateRadiologyStudyTransition('REPORTED', 'PENDING_IMAGING').valid).toBe(false);
      expect(controller.validateRadiologyStudyTransition('PENDING_IMAGING', 'REPORTED').valid).toBe(false);
      expect(controller.validateRadiologyStudyTransition('PENDING_IMAGING', 'PENDING_IMAGING').valid).toBe(false);
      expect(controller.validateRadiologyStudyTransition('PENDING_IMAGING', 'BOGUS').valid).toBe(false);
    });

    test('validateRadiologyReportTransition enforces the report chain', () => {
      expect(controller.validateRadiologyReportTransition('DRAFT', 'REVIEWED').valid).toBe(true);
      expect(controller.validateRadiologyReportTransition('REVIEWED', 'SIGNED').valid).toBe(true);
      expect(controller.validateRadiologyReportTransition('SIGNED', 'DELIVERED').valid).toBe(true);
      expect(controller.validateRadiologyReportTransition('SIGNED', 'DRAFT').valid).toBe(false);
      expect(controller.validateRadiologyReportTransition('DELIVERED', 'REVIEWED').valid).toBe(false);
      expect(controller.validateRadiologyReportTransition('DRAFT', 'DRAFT').valid).toBe(false);
    });
  });

  describe('exam types', () => {
    test('createExamType validates name and price', async () => {
      const prisma = createPrisma();
      prisma.radiologyExamType.create.mockImplementation(({ data }) => Promise.resolve({ id: 'et-1', ...data }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createExamType(
        req({ body: { name: '╪ú╪┤╪╣╪⌐ ┘à┘é╪╖╪╣┘è╪⌐', category: 'CT', abbreviation: 'CT', price: '300' } }),
        res
      );

      expect(res.statusCode).toBe(200);
      const data = prisma.radiologyExamType.create.mock.calls[0][0].data;
      expect(data.companyId).toBe('company-1');
      expect(data.name).toBe('╪ú╪┤╪╣╪⌐ ┘à┘é╪╖╪╣┘è╪⌐');
      expect(data.category).toBe('CT');
      expect(data.price).toBe(300);
      expect(res.payload.data.price).toBe(300);
    });

    test('createExamType rejects an invalid price', async () => {
      const prisma = createPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createExamType(req({ body: { name: '╪ú╪┤╪╣╪⌐', price: -5 } }), res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('╪º┘ä╪│╪╣╪▒ ╪║┘è╪▒ ╪╡╪¡┘è╪¡');
      expect(prisma.radiologyExamType.create).not.toHaveBeenCalled();
    });

    test('createExamType rejects a missing name', async () => {
      const prisma = createPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createExamType(req({ body: {} }), res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('╪º╪│┘à ┘å┘ê╪╣ ╪º┘ä┘ü╪¡╪╡ ┘à╪╖┘ä┘ê╪¿');
    });

    test('listExamTypes scopes to company, filters by search and paginates', async () => {
      const prisma = createPrisma();
      prisma.radiologyExamType.findMany.mockResolvedValue([makeExamType()]);
      prisma.radiologyExamType.count.mockResolvedValue(12);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.listExamTypes(req({ query: { search: '┘à┘é╪╖╪╣┘è╪⌐', page: '2', limit: '10' } }), res);

      const args = prisma.radiologyExamType.findMany.mock.calls[0][0];
      expect(args.where).toEqual({
        companyId: 'company-1',
        isActive: true,
        OR: [
          { name: { contains: '┘à┘é╪╖╪╣┘è╪⌐', mode: 'insensitive' } },
          { category: { contains: '┘à┘é╪╖╪╣┘è╪⌐', mode: 'insensitive' } },
          { abbreviation: { contains: '┘à┘é╪╖╪╣┘è╪⌐', mode: 'insensitive' } },
        ],
      });
      expect(args.skip).toBe(10);
      expect(args.take).toBe(10);
      expect(res.statusCode).toBe(200);
      expect(res.payload.data).toHaveLength(1);
      expect(res.payload.total).toBe(12);
      expect(res.payload.page).toBe(2);
    });

    test('deleteExamType soft-deletes via isActive false', async () => {
      const prisma = createPrisma();
      prisma.radiologyExamType.findFirst.mockResolvedValue(makeExamType());
      prisma.radiologyExamType.update.mockImplementation(({ data }) => Promise.resolve({ ...makeExamType(), ...data }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.deleteExamType(req({ params: { id: 'et-1' } }), res);

      expect(res.statusCode).toBe(200);
      expect(prisma.radiologyExamType.update).toHaveBeenCalledWith({
        where: { id: 'et-1' },
        data: { isActive: false },
      });
      expect(res.payload.message).toBe('╪¬┘à ╪¡╪░┘ü ┘å┘ê╪╣ ╪º┘ä┘ü╪¡╪╡');
    });

    test('deleteExamType returns 404 for a foreign exam type', async () => {
      const prisma = createPrisma();
      prisma.radiologyExamType.findFirst.mockResolvedValue(null);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.deleteExamType(req({ params: { id: 'foreign' } }), res);

      expect(res.statusCode).toBe(404);
      expect(res.payload.error).toBe('┘å┘ê╪╣ ╪º┘ä┘ü╪¡╪╡ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»');
      expect(prisma.radiologyExamType.update).not.toHaveBeenCalled();
    });

    test('createExamType links a category by categoryId and stores the snapshot', async () => {
      const prisma = createPrisma();
      prisma.radiologyExamCategory.findFirst.mockResolvedValue({ id: 'cat-1', name: '╪ú╪┤╪╣╪⌐ ┘à┘é╪╖╪╣┘è╪⌐', modality: 'CT' });
      prisma.radiologyExamType.create.mockImplementation(({ data }) => Promise.resolve({ id: 'et-9', ...data }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createExamType(
        req({ body: { name: '╪ú╪┤╪╣╪⌐ ┘à┘é╪╖╪╣┘è╪⌐ ╪╣┘ä┘ë ╪º┘ä╪¿╪╖┘å', categoryId: 'cat-1', abbreviation: 'CT', price: '300' } }),
        res
      );

      expect(res.statusCode).toBe(200);
      const data = prisma.radiologyExamType.create.mock.calls[0][0].data;
      expect(data.categoryId).toBe('cat-1');
      expect(data.category).toBe('╪ú╪┤╪╣╪⌐ ┘à┘é╪╖╪╣┘è╪⌐');
      expect(prisma.radiologyExamCategory.findFirst).toHaveBeenCalledWith({
        where: { id: 'cat-1', companyId: 'company-1', isActive: true },
      });
    });

    test('createExamType rejects a categoryId that is not in the company', async () => {
      const prisma = createPrisma();
      prisma.radiologyExamCategory.findFirst.mockResolvedValue(null);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createExamType(req({ body: { name: '╪ú╪┤╪╣╪⌐', categoryId: 'foreign' } }), res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('╪º┘ä┘ü╪ª╪⌐ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»╪⌐ ╪ú┘ê ╪║┘è╪▒ ┘à┘ü╪╣┘ä╪⌐');
      expect(prisma.radiologyExamType.create).not.toHaveBeenCalled();
    });

    test('createExamType auto-creates a category from a legacy category string', async () => {
      const prisma = createPrisma();
      prisma.radiologyExamCategory.findFirst.mockResolvedValue(null);
      prisma.radiologyExamType.create.mockImplementation(({ data }) => Promise.resolve({ id: 'et-9', ...data }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createExamType(req({ body: { name: '╪▒┘å┘è┘å', category: 'MRI' } }), res);

      expect(res.statusCode).toBe(200);
      expect(prisma.radiologyExamCategory.create).toHaveBeenCalledWith({
        data: { companyId: 'company-1', name: 'MRI', modality: 'MR' },
      });
      const data = prisma.radiologyExamType.create.mock.calls[0][0].data;
      expect(data.categoryId).toBe('cat-auto');
      expect(data.category).toBe('MRI');
    });

    test('updateExamType re-links a category and refreshes the snapshot', async () => {
      const prisma = createPrisma();
      prisma.radiologyExamType.findFirst.mockResolvedValue(makeExamType());
      prisma.radiologyExamCategory.findFirst.mockResolvedValue({ id: 'cat-2', name: '╪▒┘å┘è┘å ┘à╪║┘å╪º╪╖┘è╪│┘è', modality: 'MR' });
      prisma.radiologyExamType.update.mockImplementation(({ data }) => Promise.resolve({ ...makeExamType(), ...data }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.updateExamType(
        req({ params: { id: 'et-1' }, body: { categoryId: 'cat-2' } }),
        res
      );

      expect(res.statusCode).toBe(200);
      const args = prisma.radiologyExamType.update.mock.calls[0][0];
      expect(args.data.categoryId).toBe('cat-2');
      expect(args.data.category).toBe('╪▒┘å┘è┘å ┘à╪║┘å╪º╪╖┘è╪│┘è');
    });
  });

  describe('createStudy', () => {
    test('generates studyNumber, stores patient fields and resolves exam type modality', async () => {
      const prisma = createPrisma();
      prisma.radiologyExamType.findFirst.mockResolvedValue(makeExamType());
      prisma.radiologyStudy.create.mockImplementation(({ data }) => Promise.resolve({ id: 'study-1', ...data }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createStudy(
        req({
          body: {
            patientName: '┘à╪¡┘à╪» ╪╣┘ä┘è',
            patientPhone: '01001234567',
            patientGender: 'MALE',
            patientAge: '35',
            examTypeId: 'et-1',
            emergency: true,
            withContrast: false,
          },
        }),
        res
      );

      expect(res.statusCode).toBe(200);
      const data = prisma.radiologyStudy.create.mock.calls[0][0].data;
      expect(data.companyId).toBe('company-1');
      expect(data.patientName).toBe('┘à╪¡┘à╪» ╪╣┘ä┘è');
      expect(data.patientPhone).toBe('01001234567');
      expect(data.patientGender).toBe('MALE');
      expect(data.patientAge).toBe('35');
      expect(data.examTypeId).toBe('et-1');
      expect(data.examTypeName).toBe('╪ú╪┤╪╣╪⌐ ┘à┘é╪╖╪╣┘è╪⌐');
      expect(data.modality).toBe('CT');
      expect(data.status).toBe('PENDING_IMAGING');
      expect(data.submissionStatus).toBe('NOT_SUBMITTED');
      expect(data.emergency).toBe(true);
      expect(data.studyNumber).toMatch(/^RAD-\d{8}-\d{4}$/);
      expect(res.payload.data.studyNumber).toMatch(/^RAD-\d{8}-\d{4}$/);
    });

    test('stores patientFlags as a deduplicated JSON array', async () => {
      const prisma = createPrisma();
      prisma.radiologyExamType.findFirst.mockResolvedValue(makeExamType());
      prisma.radiologyStudy.create.mockImplementation(({ data }) => Promise.resolve({ id: 'study-1', ...data }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createStudy(
        req({
          body: {
            patientName: '┘à╪¡┘à╪» ╪╣┘ä┘è',
            examTypeId: 'et-1',
            patientFlags: ['pregnancy', 'renal', 'pregnancy'],
          },
        }),
        res
      );

      expect(res.statusCode).toBe(200);
      const data = prisma.radiologyStudy.create.mock.calls[0][0].data;
      expect(JSON.parse(data.patientFlags)).toEqual(['pregnancy', 'renal']);
    });

    test('stores patientFlags when passed as a JSON string', async () => {
      const prisma = createPrisma();
      prisma.radiologyExamType.findFirst.mockResolvedValue(makeExamType());
      prisma.radiologyStudy.create.mockImplementation(({ data }) => Promise.resolve({ id: 'study-1', ...data }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createStudy(
        req({
          body: {
            patientName: '┘à╪¡┘à╪» ╪╣┘ä┘è',
            examTypeId: 'et-1',
            patientFlags: '["contrast_allergy","bleeding"]',
          },
        }),
        res
      );

      expect(res.statusCode).toBe(200);
      const data = prisma.radiologyStudy.create.mock.calls[0][0].data;
      expect(JSON.parse(data.patientFlags)).toEqual(['contrast_allergy', 'bleeding']);
    });

    test('retries with a fresh studyNumber on a unique collision', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.create
        .mockRejectedValueOnce({ code: 'P2002', message: 'Unique constraint failed on the fields: (`studyNumber`)' })
        .mockImplementationOnce(({ data }) => Promise.resolve({ id: 'study-1', ...data }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createStudy(req({ body: { patientName: '┘à╪▒┘è╪╢' } }), res);

      expect(res.statusCode).toBe(200);
      expect(prisma.radiologyStudy.create).toHaveBeenCalledTimes(2);
      const first = prisma.radiologyStudy.create.mock.calls[0][0].data.studyNumber;
      const second = prisma.radiologyStudy.create.mock.calls[1][0].data.studyNumber;
      expect(first).not.toBe(second);
      expect(second).toMatch(/^RAD-\d{8}-\d{4}$/);
    });

    test('rejects a client-provided studyNumber that already exists', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.create.mockRejectedValue({
        code: 'P2002',
        message: 'Unique constraint failed on the fields: (`studyNumber`)',
      });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createStudy(req({ body: { patientName: '┘à╪▒┘è╪╢', studyNumber: 'RAD-20260809-1111' } }), res);

      expect(res.statusCode).toBe(409);
      expect(res.payload.error).toBe('╪▒┘é┘à ╪º┘ä╪¡╪º┘ä╪⌐ ┘à╪│╪¬╪«╪»┘à ┘à┘å ┘é╪¿┘ä');
      expect(prisma.radiologyStudy.create).toHaveBeenCalledTimes(1);
    });

    test('rejects an examType outside the company', async () => {
      const prisma = createPrisma();
      prisma.radiologyExamType.findFirst.mockResolvedValue(null);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createStudy(req({ body: { patientName: '┘à╪▒┘è╪╢', examTypeId: 'foreign' } }), res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('┘å┘ê╪╣ ╪º┘ä┘ü╪¡╪╡ ┘ä╪º ┘è┘å╪¬┘à┘è ┘ä┘ç╪░┘ç ╪º┘ä╪┤╪▒┘â╪⌐');
      expect(prisma.radiologyStudy.create).not.toHaveBeenCalled();
    });

    test('rejects creating an unpriced (free) study', async () => {
      const prisma = createPrisma();
      prisma.radiologyExamType.findFirst.mockResolvedValue(makeExamType({ price: 0 }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createStudy(req({ body: { patientName: '┘à╪▒┘è╪╢', examTypeId: 'et-1' } }), res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toContain('╪║┘è╪▒ ┘à╪│╪╣┘æ╪▒');
      expect(prisma.radiologyStudy.create).not.toHaveBeenCalled();
    });

    test('allows a study when an exam addition covers the cost even if the exam price is 0', async () => {
      const prisma = createPrisma();
      prisma.radiologyExamType.findFirst.mockResolvedValue(makeExamType({ price: 0 }));
      prisma.radiologyExamType.findMany.mockResolvedValue([{ id: 'ad1', price: 150, isAddition: true }]);
      prisma.radiologyStudy.create.mockImplementation(({ data }) => Promise.resolve({ id: 'study-1', ...data }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createStudy(req({ body: { patientName: '┘à╪▒┘è╪╢', examTypeId: 'et-1', additionIds: ['ad1'] } }), res);

      expect(res.statusCode).toBe(200);
      expect(res.payload.data.additionAmount).toBe(150);
    });

    test('rejects a missing patientName', async () => {
      const prisma = createPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createStudy(req({ body: {} }), res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('╪º╪│┘à ╪º┘ä┘à╪▒┘è╪╢ ┘à╪╖┘ä┘ê╪¿');
      expect(prisma.radiologyStudy.create).not.toHaveBeenCalled();
    });
  });

  describe('listStudies', () => {
    test('applies patientName/status/date filters and returns items + total', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findMany.mockResolvedValue([makeStudy({ status: 'IMAGED' })]);
      prisma.radiologyStudy.count.mockResolvedValue(7);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.listStudies(
        req({
          query: {
            patientName: '┘à╪¡┘à╪»',
            status: 'IMAGED',
            dateFrom: '2026-08-01',
            dateTo: '2026-08-09',
            page: '2',
            limit: '25',
          },
        }),
        res
      );

      const args = prisma.radiologyStudy.findMany.mock.calls[0][0];
      expect(args.where).toEqual({
        companyId: 'company-1',
        patientName: { contains: '┘à╪¡┘à╪»', mode: 'insensitive' },
        status: 'IMAGED',
        createdAt: { gte: expect.any(Date), lte: expect.any(Date) },
      });
      expect(args.skip).toBe(25);
      expect(args.take).toBe(25);
      expect(args.include).toEqual({
        report: true,
      });
      expect(prisma.radiologyStudy.count).toHaveBeenCalledWith({ where: args.where });

      expect(res.statusCode).toBe(200);
      expect(res.payload.data.items).toHaveLength(1);
      expect(res.payload.data.total).toBe(7);
      expect(res.payload.data.page).toBe(2);
      expect(res.payload.data.limit).toBe(25);
    });

    test('rejects an invalid status filter', async () => {
      const prisma = createPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.listStudies(req({ query: { status: 'DONE' } }), res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('╪¡╪º┘ä╪⌐ ╪º┘ä╪ú╪┤╪╣╪⌐ ╪║┘è╪▒ ╪╡╪¡┘è╪¡╪⌐');
      expect(prisma.radiologyStudy.findMany).not.toHaveBeenCalled();
    });

    test('filters studies that have a report (hasReport=true)', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findMany.mockResolvedValue([makeStudy()]);
      prisma.radiologyStudy.count.mockResolvedValue(1);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.listStudies(req({ query: { hasReport: 'true' } }), res);

      const args = prisma.radiologyStudy.findMany.mock.calls[0][0];
      expect(args.where.report).toEqual({ isNot: null });
      expect(res.statusCode).toBe(200);
    });

    test('filters by report status and study number', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findMany.mockResolvedValue([makeStudy()]);
      prisma.radiologyStudy.count.mockResolvedValue(1);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.listStudies(
        req({ query: { reportStatus: 'signed', studyNumber: 'RAD-20260809' } }),
        res
      );

      const args = prisma.radiologyStudy.findMany.mock.calls[0][0];
      expect(args.where.report).toEqual({ is: { reportStatus: 'SIGNED' } });
      expect(args.where.studyNumber).toEqual({ contains: 'RAD-20260809', mode: 'insensitive' });
      expect(res.statusCode).toBe(200);
    });

    test('rejects an invalid report status filter', async () => {
      const prisma = createPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.listStudies(req({ query: { reportStatus: 'BOGUS' } }), res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('╪¡╪º┘ä╪⌐ ╪º┘ä╪¬┘é╪▒┘è╪▒ ╪║┘è╪▒ ╪╡╪¡┘è╪¡╪⌐');
      expect(prisma.radiologyStudy.findMany).not.toHaveBeenCalled();
    });
  });

  describe('getStudy', () => {
    test('includes images (without the raw buffer) and the report', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findFirst.mockResolvedValue(makeStudy());
      prisma.radiologyStudyImage.findMany.mockResolvedValue([
        { id: 'img-1', studyId: 'study-1', fileName: 'a.dcm', storedName: 's1.dcm', data: Buffer.from([1, 2, 3]) },
      ]);
      prisma.radiologyReport.findUnique.mockResolvedValue({ id: 'rep-1', studyId: 'study-1', reportStatus: 'DRAFT' });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getStudy(req({ params: { id: 'study-1' } }), res);

      expect(res.statusCode).toBe(200);
      expect(prisma.radiologyStudy.findFirst).toHaveBeenCalledWith({
        where: { id: 'study-1', companyId: 'company-1' },
      });
      expect(prisma.radiologyStudyImage.findMany).toHaveBeenCalledWith({
        where: { studyId: 'study-1' },
        orderBy: { createdAt: 'asc' },
      });
      expect(res.payload.data.images).toHaveLength(1);
      expect(res.payload.data.images[0].data).toBeUndefined();
      expect(res.payload.data.report.id).toBe('rep-1');
    });

    test('returns 404 for a study outside the company', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findFirst.mockResolvedValue(null);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getStudy(req({ params: { id: 'foreign' } }), res);

      expect(res.statusCode).toBe(404);
      expect(res.payload.error).toBe('╪º┘ä╪¡╪º┘ä╪⌐ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»╪⌐');
    });
  });

  describe('updateStudy', () => {
    test('rejects a backward status transition', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findFirst.mockResolvedValue(makeStudy({ status: 'REPORTED' }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.updateStudy(req({ params: { id: 'study-1' }, body: { status: 'PENDING_IMAGING' } }), res);

      expect(res.statusCode).toBe(400);
      expect(prisma.radiologyStudy.update).not.toHaveBeenCalled();
    });

    test('rejects a forward jump that skips a stage', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findFirst.mockResolvedValue(makeStudy({ status: 'PENDING_IMAGING' }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.updateStudy(req({ params: { id: 'study-1' }, body: { status: 'REPORTED' } }), res);

      expect(res.statusCode).toBe(400);
      expect(prisma.radiologyStudy.update).not.toHaveBeenCalled();
    });

    test('allows a valid forward transition', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findFirst.mockResolvedValue(makeStudy({ status: 'IMAGED' }));
      prisma.radiologyStudy.update.mockImplementation(({ data }) => Promise.resolve({ ...makeStudy(), ...data }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.updateStudy(req({ params: { id: 'study-1' }, body: { status: 'PENDING_REPORT' } }), res);

      expect(res.statusCode).toBe(200);
      expect(prisma.radiologyStudy.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'study-1' },
          data: expect.objectContaining({ status: 'PENDING_REPORT' }),
        })
      );
    });

    test('auto-creates a DRAFT report when the study enters PENDING_REPORT', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findFirst.mockResolvedValue(makeStudy({ status: 'IMAGED' }));
      prisma.radiologyStudy.update.mockImplementation(({ data }) => Promise.resolve({ ...makeStudy(), ...data }));
      prisma.radiologyReport.findUnique.mockResolvedValue(null);
      prisma.radiologyReport.create.mockImplementation(({ data }) => Promise.resolve({ id: 'rep-auto', ...data }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.updateStudy(req({ params: { id: 'study-1' }, body: { status: 'PENDING_REPORT' } }), res);

      expect(res.statusCode).toBe(200);
      expect(prisma.radiologyReport.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ studyId: 'study-1', reportStatus: 'DRAFT', reportText: '' }),
        })
      );
    });

    test('does not duplicate an existing report on transition', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findFirst.mockResolvedValue(makeStudy({ status: 'IMAGED' }));
      prisma.radiologyStudy.update.mockImplementation(({ data }) => Promise.resolve({ ...makeStudy(), ...data }));
      prisma.radiologyReport.findUnique.mockResolvedValue({ id: 'rep-1', studyId: 'study-1', reportStatus: 'DRAFT' });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.updateStudy(req({ params: { id: 'study-1' }, body: { status: 'PENDING_REPORT' } }), res);

      expect(res.statusCode).toBe(200);
      expect(prisma.radiologyReport.create).not.toHaveBeenCalled();
    });

    test('does not auto-create a report for a non-report stage', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findFirst.mockResolvedValue(makeStudy({ status: 'PENDING_IMAGING' }));
      prisma.radiologyStudy.update.mockImplementation(({ data }) => Promise.resolve({ ...makeStudy(), ...data }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.updateStudy(req({ params: { id: 'study-1' }, body: { status: 'IMAGED' } }), res);

      expect(res.statusCode).toBe(200);
      expect(prisma.radiologyReport.create).not.toHaveBeenCalled();
    });

    test('allows setting the same status without a transition error', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findFirst.mockResolvedValue(makeStudy({ status: 'IMAGED' }));
      prisma.radiologyStudy.update.mockImplementation(({ data }) => Promise.resolve({ ...makeStudy(), ...data }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.updateStudy(req({ params: { id: 'study-1' }, body: { status: 'imaged' } }), res);

      expect(res.statusCode).toBe(200);
      expect(prisma.radiologyStudy.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'IMAGED' }) })
      );
    });

    test('recomputes priceSnapshot when the exam type changes on an insured study', async () => {
      const prisma = createPrisma({ radiologyEntityPrice: { findFirst: jest.fn() } });
      prisma.radiologyStudy.findFirst.mockResolvedValue(makeStudy({ status: 'IMAGED', priceSnapshot: 300, insuranceCompanyId: 'ins-1' }));
      prisma.radiologyExamType.findFirst.mockResolvedValue(makeExamType({ id: 'et-2', name: '╪ú╪┤╪╣╪⌐ ┘à┘é╪╖╪╣┘è╪⌐ ╪╣┘ä┘ë ╪º┘ä╪╡╪»╪▒', price: 500, category: 'CT' }));
      prisma.radiologyEntityPrice.findFirst.mockResolvedValue({ price: 850 });
      prisma.radiologyStudy.update.mockImplementation(({ data }) => Promise.resolve({ ...makeStudy(), ...data }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.updateStudy(req({ params: { id: 'study-1' }, body: { examTypeId: 'et-2' } }), res);

      expect(res.statusCode).toBe(200);
      const data = prisma.radiologyStudy.update.mock.calls[0][0].data;
      expect(data.examTypeId).toBe('et-2');
      expect(data.modality).toBe('CT');
      expect(data.priceSnapshot).toBe(850); // entity price for the new exam
    });

    test('recomputes priceSnapshot to the new exam base price for a non-insured study', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findFirst.mockResolvedValue(makeStudy({ status: 'IMAGED', priceSnapshot: 300 }));
      prisma.radiologyExamType.findFirst.mockResolvedValue(makeExamType({ id: 'et-2', name: '╪ú╪┤╪╣╪⌐ ┘à┘é╪╖╪╣┘è╪⌐ ╪╣┘ä┘ë ╪º┘ä╪╡╪»╪▒', price: 500, category: 'CT' }));
      prisma.radiologyStudy.update.mockImplementation(({ data }) => Promise.resolve({ ...makeStudy(), ...data }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.updateStudy(req({ params: { id: 'study-1' }, body: { examTypeId: 'et-2' } }), res);

      expect(res.statusCode).toBe(200);
      const data = prisma.radiologyStudy.update.mock.calls[0][0].data;
      expect(data.priceSnapshot).toBe(500);
    });

    test('updates rology fields and normalizes submissionStatus', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findFirst.mockResolvedValue(makeStudy());
      prisma.radiologyStudy.update.mockImplementation(({ data }) => Promise.resolve({ ...makeStudy(), ...data }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.updateStudy(
        req({
          params: { id: 'study-1' },
          body: {
            submissionStatus: 'submitted',
            rologyStudyLink: 'https://rology.example/study/1',
            rologyReportLink: 'https://rology.example/report/1',
            rologyRadiologist: '╪». ╪│╪º╪▒╪⌐',
            reportReceivedAt: '2026-08-09T12:00:00.000Z',
          },
        }),
        res
      );

      const data = prisma.radiologyStudy.update.mock.calls[0][0].data;
      expect(data.submissionStatus).toBe('SUBMITTED');
      expect(data.rologyStudyLink).toBe('https://rology.example/study/1');
      expect(data.rologyReportLink).toBe('https://rology.example/report/1');
      expect(data.rologyRadiologist).toBe('╪». ╪│╪º╪▒╪⌐');
      expect(data.reportReceivedAt).toBeInstanceOf(Date);
    });

    test('returns 404 for a study outside the company', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findFirst.mockResolvedValue(null);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.updateStudy(req({ params: { id: 'foreign' }, body: { notes: 'x' } }), res);

      expect(res.statusCode).toBe(404);
      expect(prisma.radiologyStudy.update).not.toHaveBeenCalled();
    });

    test('updates patientFlags (dedupe + JSON serialize)', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findFirst.mockResolvedValue(makeStudy());
      prisma.radiologyStudy.update.mockImplementation(({ data }) => Promise.resolve({ ...makeStudy(), ...data }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.updateStudy(
        req({ params: { id: 'study-1' }, body: { patientFlags: ['claustrophobia', 'bleeding', 'claustrophobia'] } }),
        res
      );

      expect(res.statusCode).toBe(200);
      const data = prisma.radiologyStudy.update.mock.calls[0][0].data;
      expect(JSON.parse(data.patientFlags)).toEqual(['claustrophobia', 'bleeding']);
    });

    test('clears patientFlags when an empty array is sent', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findFirst.mockResolvedValue(makeStudy());
      prisma.radiologyStudy.update.mockImplementation(({ data }) => Promise.resolve({ ...makeStudy(), ...data }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.updateStudy(
        req({ params: { id: 'study-1' }, body: { patientFlags: [] } }),
        res
      );

      expect(res.statusCode).toBe(200);
      const data = prisma.radiologyStudy.update.mock.calls[0][0].data;
      expect(data.patientFlags).toBeNull();
    });
  });

  describe('uploadStudyImages', () => {
    test('stores image rows with metadata and advances the study to IMAGED', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findFirst.mockResolvedValue(makeStudy({ status: 'PENDING_IMAGING' }));
      prisma.radiologyStudyImage.create.mockImplementation(({ data }) => Promise.resolve({ id: 'img-x', ...data }));
      prisma.radiologyStudy.update.mockImplementation(({ data }) => Promise.resolve({ ...makeStudy(), ...data }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const buffer = Buffer.from([0x00, 0x01, 0x02, 0x03]);
      const res = createResponse();
      await controller.uploadStudyImages(
        req({
          params: { id: 'study-1' },
          files: [
            { originalname: 'slice-01.dcm', mimetype: 'application/dicom', size: buffer.length, buffer },
            { originalname: 'slice-02.dcm', mimetype: 'application/dicom', size: buffer.length, buffer },
          ],
        }),
        res
      );

      expect(res.statusCode).toBe(200);
      expect(prisma.radiologyStudyImage.create).toHaveBeenCalledTimes(2);
      const first = prisma.radiologyStudyImage.create.mock.calls[0][0].data;
      expect(first.studyId).toBe('study-1');
      expect(first.fileName).toBe('slice-01.dcm');
      expect(first.storedName).toMatch(/\.dcm$/);
      expect(first.mimeType).toBe('application/dicom');
      expect(first.fileSize).toBe(4);
      expect(Buffer.isBuffer(first.data)).toBe(true);
      expect(first.data.length).toBe(4);
      expect(first.metadataJson).toBeNull();

      expect(prisma.radiologyStudy.update).toHaveBeenCalledWith({
        where: { id: 'study-1' },
        data: { status: 'IMAGED' },
      });
      expect(res.payload.data.images).toHaveLength(2);
      expect(res.payload.data.images[0].data).toBeUndefined();
    });

    test('merges parsed DICOM patient fields into an empty study', async () => {
      dicomUtil.parseDicomFromBuffer.mockReturnValueOnce({
        patientName: '╪º╪│┘à ┘à┘å ╪»┘è┘â┘ê┘à',
        patientGender: 'F',
        patientAge: '40Y',
        modality: 'CT',
      });

      const prisma = createPrisma();
      const study = makeStudy({
        status: 'PENDING_IMAGING',
        patientName: '',
        patientGender: null,
        patientAge: null,
        modality: null,
      });
      prisma.radiologyStudy.findFirst.mockResolvedValue(study);
      prisma.radiologyStudyImage.create.mockResolvedValue({ id: 'img-x' });
      prisma.radiologyStudy.update.mockImplementation(({ data }) => Promise.resolve({ ...study, ...data }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const buffer = Buffer.from([0x44, 0x49, 0x43, 0x4d]);
      const res = createResponse();
      await controller.uploadStudyImages(
        req({
          params: { id: 'study-1' },
          files: [{ originalname: 'a.dcm', mimetype: 'application/dicom', size: 4, buffer }],
        }),
        res
      );

      expect(res.statusCode).toBe(200);
      const updateData = prisma.radiologyStudy.update.mock.calls[0][0].data;
      expect(updateData.patientName).toBe('╪º╪│┘à ┘à┘å ╪»┘è┘â┘ê┘à');
      expect(updateData.patientGender).toBe('F');
      expect(updateData.patientAge).toBe('40Y');
      expect(updateData.modality).toBe('CT');
      expect(updateData.status).toBe('IMAGED');
    });

    test('rejects when no files are provided', async () => {
      const prisma = createPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.uploadStudyImages(req({ params: { id: 'study-1' }, files: [] }), res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('┘è╪¼╪¿ ╪▒┘ü╪╣ ┘à┘ä┘ü DICOM ┘ê╪º╪¡╪» ╪╣┘ä┘ë ╪º┘ä╪ú┘é┘ä');
      expect(prisma.radiologyStudyImage.create).not.toHaveBeenCalled();
    });

    test('returns 404 when the study is outside the company', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findFirst.mockResolvedValue(null);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.uploadStudyImages(
        req({
          params: { id: 'foreign' },
          files: [{ originalname: 'a.dcm', mimetype: 'application/dicom', size: 1, buffer: Buffer.from([1]) }],
        }),
        res
      );

      expect(res.statusCode).toBe(404);
      expect(res.payload.error).toBe('╪º┘ä╪¡╪º┘ä╪⌐ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»╪⌐');
      expect(prisma.radiologyStudyImage.create).not.toHaveBeenCalled();
    });
  });

  describe('getStudyImageFile', () => {
    test('streams the DICOM buffer back with correct headers', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findFirst.mockResolvedValue({ id: 'study-1' });
      const data = Buffer.from([0x44, 0x49, 0x43, 0x4d]);
      prisma.radiologyStudyImage.findFirst.mockResolvedValue({
        id: 'img-1',
        studyId: 'study-1',
        fileName: 'slice.dcm',
        mimeType: 'application/dicom',
        data,
      });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getStudyImageFile(req({ params: { id: 'study-1', imageId: 'img-1' } }), res);

      expect(res.statusCode).toBe(200);
      expect(res.sent).toBe(data);
      expect(res.sent).toBeInstanceOf(Buffer);
      expect(res.sent.length).toBe(4);
      expect(res.setHeader.mock.calls).toEqual(
        expect.arrayContaining([
          ['Content-Type', 'application/dicom'],
          ['Content-Length', 4],
        ])
      );
    });

    test('returns 404 for a missing image', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findFirst.mockResolvedValue({ id: 'study-1' });
      prisma.radiologyStudyImage.findFirst.mockResolvedValue(null);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getStudyImageFile(req({ params: { id: 'study-1', imageId: 'missing' } }), res);

      expect(res.statusCode).toBe(404);
      expect(res.payload.error).toBe('╪º┘ä╪╡┘ê╪▒╪⌐ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»╪⌐');
      expect(res.sent).toBeNull();
    });

    test('converts Uint8Array Bytes to a real Buffer before sending', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findFirst.mockResolvedValue({ id: 'study-1' });
      const u8 = new Uint8Array([0x44, 0x49, 0x43, 0x4d, 0x00, 0x01]);
      prisma.radiologyStudyImage.findFirst.mockResolvedValue({
        id: 'img-1',
        studyId: 'study-1',
        fileName: 'slice.dcm',
        mimeType: 'application/dicom',
        data: u8,
      });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getStudyImageFile(req({ params: { id: 'study-1', imageId: 'img-1' } }), res);

      expect(res.statusCode).toBe(200);
      expect(res.sent).toBeInstanceOf(Buffer);
      expect(Buffer.from(res.sent).toString('hex')).toBe(Buffer.from(u8).toString('hex'));
      expect(res.setHeader.mock.calls).toEqual(
        expect.arrayContaining([
          ['Content-Type', 'application/dicom'],
          ['Content-Length', u8.length],
        ])
      );
    });
  });

  describe('deleteStudyImage', () => {
    test('deletes an image inside the company study', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findFirst.mockResolvedValue({ id: 'study-1' });
      prisma.radiologyStudyImage.findFirst.mockResolvedValue({ id: 'img-1', studyId: 'study-1' });
      prisma.radiologyStudyImage.delete.mockResolvedValue({ id: 'img-1' });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.deleteStudyImage(req({ params: { id: 'study-1', imageId: 'img-1' } }), res);

      expect(res.statusCode).toBe(200);
      expect(prisma.radiologyStudyImage.delete).toHaveBeenCalledWith({ where: { id: 'img-1' } });
      expect(res.payload.data.id).toBe('img-1');
    });

    test('returns 404 for a foreign image', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findFirst.mockResolvedValue({ id: 'study-1' });
      prisma.radiologyStudyImage.findFirst.mockResolvedValue(null);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.deleteStudyImage(req({ params: { id: 'study-1', imageId: 'foreign' } }), res);

      expect(res.statusCode).toBe(404);
      expect(prisma.radiologyStudyImage.delete).not.toHaveBeenCalled();
    });
  });

  describe('upsertStudyReport', () => {
    test('creates a report and sets the study to REPORTED', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findFirst.mockResolvedValue(makeStudy({ status: 'IMAGED' }));
      prisma.radiologyReport.findUnique.mockResolvedValue(null);
      prisma.radiologyReport.create.mockImplementation(({ data }) => Promise.resolve({ id: 'rep-1', ...data }));
      prisma.radiologyStudy.update.mockImplementation(({ data }) => Promise.resolve({ ...makeStudy(), ...data }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.upsertStudyReport(req({ params: { id: 'study-1' }, body: { reportText: '┘ä╪º ┘è┘ê╪¼╪» ┘â╪│┘ê╪▒' } }), res);

      expect(res.statusCode).toBe(200);
      const createData = prisma.radiologyReport.create.mock.calls[0][0].data;
      expect(createData.studyId).toBe('study-1');
      expect(createData.reportText).toBe('┘ä╪º ┘è┘ê╪¼╪» ┘â╪│┘ê╪▒');
      expect(createData.reportStatus).toBe('DRAFT');
      expect(prisma.radiologyStudy.update).toHaveBeenCalledWith({
        where: { id: 'study-1' },
        data: { status: 'REPORTED' },
      });
      expect(res.payload.data.reportStatus).toBe('DRAFT');
    });

    test('updates an existing report and advances its status forward', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findFirst.mockResolvedValue(makeStudy({ status: 'REPORTED' }));
      prisma.radiologyReport.findUnique.mockResolvedValue({
        id: 'rep-1',
        studyId: 'study-1',
        reportText: 'x',
        reportStatus: 'DRAFT',
      });
      prisma.radiologyReport.update.mockImplementation(({ data }) => Promise.resolve({ id: 'rep-1', ...data }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.upsertStudyReport(
        req({ params: { id: 'study-1' }, body: { reportText: '╪¬╪¡╪»┘è╪½', reportStatus: 'REVIEWED' } }),
        res
      );

      expect(res.statusCode).toBe(200);
      expect(prisma.radiologyReport.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rep-1' },
          data: expect.objectContaining({ reportText: '╪¬╪¡╪»┘è╪½', reportStatus: 'REVIEWED' }),
        })
      );
      expect(prisma.radiologyStudy.update).not.toHaveBeenCalled();
    });

    test('rejects skipping the report status forward', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findFirst.mockResolvedValue(makeStudy({ status: 'REPORTED' }));
      prisma.radiologyReport.findUnique.mockResolvedValue({
        id: 'rep-1',
        studyId: 'study-1',
        reportText: 'x',
        reportStatus: 'DRAFT',
      });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.upsertStudyReport(req({ params: { id: 'study-1' }, body: { reportStatus: 'SIGNED' } }), res);

      expect(res.statusCode).toBe(400);
      expect(prisma.radiologyReport.update).not.toHaveBeenCalled();
    });

    test('rejects a backward report transition', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findFirst.mockResolvedValue(makeStudy({ status: 'REPORTED' }));
      prisma.radiologyReport.findUnique.mockResolvedValue({
        id: 'rep-1',
        studyId: 'study-1',
        reportText: 'x',
        reportStatus: 'SIGNED',
      });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.upsertStudyReport(req({ params: { id: 'study-1' }, body: { reportStatus: 'REVIEWED' } }), res);

      expect(res.statusCode).toBe(400);
      expect(prisma.radiologyReport.update).not.toHaveBeenCalled();
    });

    test('signs the report when transitioning to SIGNED', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findFirst.mockResolvedValue(makeStudy({ status: 'REPORTED' }));
      prisma.radiologyReport.findUnique.mockResolvedValue({
        id: 'rep-1',
        studyId: 'study-1',
        reportText: 'x',
        reportStatus: 'REVIEWED',
        signedBy: null,
      });
      prisma.radiologyReport.update.mockImplementation(({ data }) => Promise.resolve({ id: 'rep-1', ...data }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.upsertStudyReport(req({ params: { id: 'study-1' }, body: { reportStatus: 'SIGNED' } }), res);

      const data = prisma.radiologyReport.update.mock.calls[0][0].data;
      expect(data.reportStatus).toBe('SIGNED');
      expect(data.signedBy).toBe('╪ú╪¡┘à╪» ┘à╪¡┘à┘ê╪»');
      expect(data.signedAt).toBeInstanceOf(Date);
    });

    test('returns 404 for a study outside the company', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findFirst.mockResolvedValue(null);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.upsertStudyReport(req({ params: { id: 'foreign' }, body: { reportText: 'x' } }), res);

      expect(res.statusCode).toBe(404);
      expect(prisma.radiologyReport.create).not.toHaveBeenCalled();
    });
  });

  describe('advanceReportStatus', () => {
    test('review advances DRAFT -> REVIEWED', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findFirst.mockResolvedValue({ id: 'study-1' });
      prisma.radiologyReport.findUnique.mockResolvedValue({
        id: 'rep-1', studyId: 'study-1', reportText: 'x', reportStatus: 'DRAFT',
      });
      prisma.radiologyReport.update.mockResolvedValue({ id: 'rep-1', studyId: 'study-1', reportStatus: 'REVIEWED' });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.advanceReport(req({ params: { id: 'study-1', kind: 'review' } }), res);

      expect(res.statusCode).toBe(200);
      expect(prisma.radiologyReport.update).toHaveBeenCalledWith({
        where: { id: 'rep-1' },
        data: expect.objectContaining({ reportStatus: 'REVIEWED' }),
      });
    });

    test('sign sets signedBy/signedAt when not already signed', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findFirst.mockResolvedValue({ id: 'study-1' });
      prisma.radiologyReport.findUnique.mockResolvedValue({
        id: 'rep-1', studyId: 'study-1', reportText: 'x', reportStatus: 'REVIEWED',
      });
      prisma.radiologyReport.update.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'rep-1', reportStatus: data.reportStatus, signedBy: data.signedBy }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.advanceReport(req({ params: { id: 'study-1', kind: 'sign' } }), res);

      expect(res.statusCode).toBe(200);
      const call = prisma.radiologyReport.update.mock.calls[0][0];
      expect(call.data.reportStatus).toBe('SIGNED');
      expect(call.data.signedBy).toBeTruthy();
      expect(call.data.signedAt).toBeInstanceOf(Date);
    });

    test('rejects a backward jump', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findFirst.mockResolvedValue({ id: 'study-1' });
      prisma.radiologyReport.findUnique.mockResolvedValue({
        id: 'rep-1', studyId: 'study-1', reportText: 'x', reportStatus: 'SIGNED',
      });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.advanceReport(req({ params: { id: 'study-1', kind: 'review' } }), res);

      expect(res.statusCode).toBe(400);
      expect(prisma.radiologyReport.update).not.toHaveBeenCalled();
    });

    test('rejects an unknown kind', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findFirst.mockResolvedValue({ id: 'study-1' });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.advanceReport(req({ params: { id: 'study-1', kind: 'explode' } }), res);

      expect(res.statusCode).toBe(400);
    });

    test('dispatches deliver kind to markDelivered', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findFirst.mockResolvedValue(makeStudy({ status: 'REPORTED' }));
      prisma.radiologyReport.findUnique.mockResolvedValue({
        id: 'rep-1', studyId: 'study-1', reportText: 'x', reportStatus: 'SIGNED',
      });
      prisma.radiologyStudyImage.count.mockResolvedValue(1);
      prisma.radiologyReport.update.mockResolvedValue({ id: 'rep-1', studyId: 'study-1', reportStatus: 'DELIVERED' });
      prisma.radiologyStudy.update.mockResolvedValue(makeStudy({ status: 'DELIVERED' }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.advanceReport(req({ params: { id: 'study-1', kind: 'deliver' } }), res);

      expect(res.statusCode).toBe(200);
      expect(res.payload.data.report.reportStatus).toBe('DELIVERED');
      expect(res.payload.data.study.status).toBe('DELIVERED');
    });
  });

  describe('markDelivered', () => {
    test('sets both report and study to DELIVERED', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findFirst.mockResolvedValue(makeStudy({ status: 'REPORTED' }));
      prisma.radiologyReport.findUnique.mockResolvedValue({
        id: 'rep-1',
        studyId: 'study-1',
        reportText: 'x',
        reportStatus: 'SIGNED',
      });
      prisma.radiologyStudyImage.count.mockResolvedValue(1);
      prisma.radiologyReport.update.mockResolvedValue({ id: 'rep-1', studyId: 'study-1', reportStatus: 'DELIVERED' });
      prisma.radiologyStudy.update.mockResolvedValue(makeStudy({ status: 'DELIVERED' }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.markDelivered(req({ params: { id: 'study-1' } }), res);

      expect(res.statusCode).toBe(200);
      expect(prisma.radiologyReport.update).toHaveBeenCalledWith({
        where: { id: 'rep-1' },
        data: { reportStatus: 'DELIVERED' },
      });
      expect(prisma.radiologyStudy.update).toHaveBeenCalledWith({
        where: { id: 'study-1' },
        data: { status: 'DELIVERED' },
      });
      expect(res.payload.data.study.status).toBe('DELIVERED');
      expect(res.payload.data.report.reportStatus).toBe('DELIVERED');
    });

    test('rejects delivering a signed report when the study has no images and no external report', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findFirst.mockResolvedValue(makeStudy({ status: 'PENDING_IMAGING' }));
      prisma.radiologyReport.findUnique.mockResolvedValue({ id: 'rep-1', studyId: 'study-1', reportText: 'x', reportStatus: 'SIGNED' });
      prisma.radiologyStudyImage.count.mockResolvedValue(0);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.markDelivered(req({ params: { id: 'study-1' } }), res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('┘ä╪º ┘è┘à┘â┘å ╪¬╪│┘ä┘è┘à ╪º┘ä╪¡╪º┘ä╪⌐ ┘é╪¿┘ä ╪▒┘ü╪╣ ╪º┘ä╪╡┘ê╪▒ ╪ú┘ê ╪º╪│╪¬┘ä╪º┘à ╪¬┘é╪▒┘è╪▒ ╪«╪º╪▒╪¼┘è');
      expect(prisma.radiologyReport.update).not.toHaveBeenCalled();
      expect(prisma.radiologyStudy.update).not.toHaveBeenCalled();
    });

    test('allows delivery when the study has images', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findFirst.mockResolvedValue(makeStudy({ status: 'REPORTED' }));
      prisma.radiologyReport.findUnique.mockResolvedValue({ id: 'rep-1', studyId: 'study-1', reportText: 'x', reportStatus: 'SIGNED' });
      prisma.radiologyStudyImage.count.mockResolvedValue(2);
      prisma.radiologyReport.update.mockResolvedValue({ id: 'rep-1', reportStatus: 'DELIVERED' });
      prisma.radiologyStudy.update.mockResolvedValue(makeStudy({ status: 'DELIVERED' }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.markDelivered(req({ params: { id: 'study-1' } }), res);

      expect(res.statusCode).toBe(200);
    });

    test('rejects delivering a report that is not signed', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findFirst.mockResolvedValue(makeStudy({ status: 'REPORTED' }));
      prisma.radiologyReport.findUnique.mockResolvedValue({
        id: 'rep-1',
        studyId: 'study-1',
        reportText: 'x',
        reportStatus: 'DRAFT',
      });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.markDelivered(req({ params: { id: 'study-1' } }), res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('┘è╪¼╪¿ ╪¬┘ê┘é┘è╪╣ ╪º┘ä╪¬┘é╪▒┘è╪▒ ┘é╪¿┘ä ╪º┘ä╪¬╪│┘ä┘è┘à');
      expect(prisma.radiologyReport.update).not.toHaveBeenCalled();
      expect(prisma.radiologyStudy.update).not.toHaveBeenCalled();
    });

    test('is idempotent when already delivered', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findFirst.mockResolvedValue(makeStudy({ status: 'DELIVERED' }));
      prisma.radiologyReport.findUnique.mockResolvedValue({ id: 'rep-1', studyId: 'study-1', reportStatus: 'DELIVERED' });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.markDelivered(req({ params: { id: 'study-1' } }), res);

      expect(res.statusCode).toBe(200);
      expect(prisma.radiologyReport.update).not.toHaveBeenCalled();
      expect(prisma.radiologyStudy.update).not.toHaveBeenCalled();
    });
  });

  describe('getStudyReport', () => {
    test('returns the report for a study inside the company', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findFirst.mockResolvedValue({ id: 'study-1' });
      prisma.radiologyReport.findUnique.mockResolvedValue({ id: 'rep-1', studyId: 'study-1', reportStatus: 'SIGNED' });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getStudyReport(req({ params: { id: 'study-1' } }), res);

      expect(res.statusCode).toBe(200);
      expect(prisma.radiologyReport.findUnique).toHaveBeenCalledWith({ where: { studyId: 'study-1' } });
      expect(res.payload.data.id).toBe('rep-1');
    });

    test('returns null when no report exists', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findFirst.mockResolvedValue({ id: 'study-1' });
      prisma.radiologyReport.findUnique.mockResolvedValue(null);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getStudyReport(req({ params: { id: 'study-1' } }), res);

      expect(res.statusCode).toBe(200);
      expect(res.payload.data).toBeNull();
    });
  });

  describe('company scoping', () => {
    test('returns 403 when companyId is missing for list', async () => {
      const prisma = createPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.listStudies(req({ user: {} }), res);

      expect(res.statusCode).toBe(403);
      expect(prisma.radiologyStudy.findMany).not.toHaveBeenCalled();
    });

    test('returns 403 when companyId is missing for create', async () => {
      const prisma = createPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createStudy(req({ user: {}, body: { patientName: '┘à╪▒┘è╪╢' } }), res);

      expect(res.statusCode).toBe(403);
      expect(prisma.radiologyStudy.create).not.toHaveBeenCalled();
    });

    test('duplicates a study copying patient/exam/insurance and resetting status', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findFirst.mockResolvedValue(makeStudy({
        patientName: '┘à╪▒┘è╪╢', examTypeId: 'et-1', examTypeName: '╪ú╪┤╪╣╪⌐ CT', insuranceCompanyId: 'ins-1', insuranceCompanyName: '╪¼┘ç╪⌐', nationalId: '123', priceSnapshot: 500, billingType: 'INSURANCE', additionAmount: 100, studyNumber: 'RAD-OLD', notes: '┘à┘ä╪º╪¡╪╕╪⌐',
      }));
      prisma.radiologyStudy.create.mockImplementation(({ data }) => Promise.resolve({ id: 'new-1', ...data }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.duplicateStudy(req({ params: { id: 'study-1' } }), res);

      expect(res.statusCode).toBe(200);
      const call = prisma.radiologyStudy.create.mock.calls[0][0].data;
      expect(call.patientName).toBe('┘à╪▒┘è╪╢');
      expect(call.examTypeName).toBe('╪ú╪┤╪╣╪⌐ CT');
      expect(call.insuranceCompanyId).toBe('ins-1');
      expect(call.status).toBe('PENDING_IMAGING');
      expect(call.submissionStatus).toBe('NOT_SUBMITTED');
      expect(call.studyNumber).toMatch(/^RAD-/);
      expect(call.notes).toContain('╪¬┘â╪▒╪º╪▒');
    });

    test('returns 404 when duplicating a foreign study', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findFirst.mockResolvedValue(null);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.duplicateStudy(req({ params: { id: 'study-1' } }), res);

      expect(res.statusCode).toBe(404);
      expect(prisma.radiologyStudy.create).not.toHaveBeenCalled();
    });
  });

  describe('contracts', () => {
    test('lists company-scoped contracts', async () => {
      const prisma = createPrisma();
      prisma.radiologyContract.findMany.mockResolvedValue([{ id: 'c1', name: '╪┤╪▒┘â╪⌐ ╪¬╪ú┘à┘è┘å' }]);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.listContracts(req(), res);

      expect(res.statusCode).toBe(200);
      expect(res.payload.data).toHaveLength(1);
      expect(prisma.radiologyContract.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { companyId: 'company-1', isActive: true } }));
    });

    test('creates a contract with validated discount type', async () => {
      const prisma = createPrisma();
      prisma.radiologyContract.create.mockResolvedValue({ id: 'c1', name: '╪¬╪╣╪º┘é╪» ╪¬╪¼╪▒┘è╪¿┘è' });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createContract(req({ body: { name: '╪¬╪╣╪º┘é╪» ╪¬╪¼╪▒┘è╪¿┘è', discountType: 'PERCENTAGE', discountPercent: '25' } }), res);

      expect(res.statusCode).toBe(200);
      expect(prisma.radiologyContract.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ name: '╪¬╪╣╪º┘é╪» ╪¬╪¼╪▒┘è╪¿┘è', discountType: 'PERCENTAGE', discountPercent: 25 }),
      });
    });

    test('rejects an invalid discount type', async () => {
      const prisma = createPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createContract(req({ body: { name: '╪¬╪╣╪º┘é╪»', discountType: 'XXX' } }), res);

      expect(res.statusCode).toBe(400);
      expect(prisma.radiologyContract.create).not.toHaveBeenCalled();
    });

    test('soft-deletes a contract', async () => {
      const prisma = createPrisma();
      prisma.radiologyContract.findFirst.mockResolvedValue({ id: 'c1', companyId: 'company-1' });
      prisma.radiologyContract.update.mockResolvedValue({ id: 'c1', isActive: false });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.deleteContract(req({ params: { id: 'c1' } }), res);

      expect(res.statusCode).toBe(200);
      expect(prisma.radiologyContract.update).toHaveBeenCalledWith({ where: { id: 'c1' }, data: { isActive: false } });
    });
  });

  describe('report templates', () => {
    test('creates a template with name + body', async () => {
      const prisma = createPrisma();
      prisma.radiologyReportTemplate.create.mockResolvedValue({ id: 't1', name: '╪╡╪»╪▒ ╪╣╪º╪»┘è' });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createReportTemplate(req({ body: { name: '╪╡╪»╪▒ ╪╣╪º╪»┘è', body: '┘ä╪º ╪¬┘ê╪¼╪» ╪╣┘ä╪º┘à╪º╪¬ ┘à╪▒╪╢┘è╪⌐.' } }), res);

      expect(res.statusCode).toBe(200);
      expect(prisma.radiologyReportTemplate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ name: '╪╡╪»╪▒ ╪╣╪º╪»┘è', body: '┘ä╪º ╪¬┘ê╪¼╪» ╪╣┘ä╪º┘à╪º╪¬ ┘à╪▒╪╢┘è╪⌐.' }),
      });
    });

    test('requires body text', async () => {
      const prisma = createPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createReportTemplate(req({ body: { name: '┘é╪º┘ä╪¿' } }), res);

      expect(res.statusCode).toBe(400);
      expect(prisma.radiologyReportTemplate.create).not.toHaveBeenCalled();
    });

    test('lists active templates', async () => {
      const prisma = createPrisma();
      prisma.radiologyReportTemplate.findMany.mockResolvedValue([{ id: 't1', name: '╪╡╪»╪▒' }]);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.listReportTemplates(req(), res);

      expect(res.statusCode).toBe(200);
      expect(prisma.radiologyReportTemplate.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { companyId: 'company-1', isActive: true } }));
    });
  });

  describe('getStudyReportPdf', () => {
    test('generates a PDF for a study with a report', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findFirst.mockResolvedValue({ id: 'study-1', patientName: '┘à╪▒┘è╪╢', studyNumber: 'RAD-1', report: { reportText: '╪¬┘é╪▒┘è╪▒', reportStatus: 'SIGNED' } });
      prisma.company.findUnique.mockResolvedValue({ name: '┘à╪▒┘â╪▓ ╪º┘ä╪º╪«╪¬╪¿╪º╪▒' });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getStudyReportPdf(req({ params: { id: 'study-1' } }), res);

      expect(res.statusCode).toBe(200);
      expect(res.sent).toBeInstanceOf(Buffer);
      expect(res.sent.toString('latin1').includes('%PDF')).toBe(true);
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    });

    test('returns 404 for a foreign study', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findFirst.mockResolvedValue(null);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getStudyReportPdf(req({ params: { id: 'study-1' } }), res);

      expect(res.statusCode).toBe(404);
      expect(res.sent).toBeNull();
    });
  });
});

const stats = require('../../controller/radiologyStatisticsController');
describe('radiologyStatisticsController', () => {
  test('groups studies without a modality under ╪║┘è╪▒ ┘à╪¡╪»╪» instead of the exam name', async () => {
    jest.clearAllMocks();
    const prisma = createPrisma();
    prisma.radiologyStudy.findMany.mockResolvedValue([
      { status: 'DELIVERED', modality: 'CT', examTypeName: '╪ú╪┤╪╣╪⌐ ┘à┘é╪╖╪╣┘è╪⌐', assignedRadiologistName: null, referralDoctor: null },
      { status: 'PENDING_IMAGING', modality: null, examTypeName: '╪ú╪┤╪╣╪⌐ ╪º┘ä╪╡╪»╪▒', assignedRadiologistName: null, referralDoctor: null },
    ]);
    prisma.radiologyExamType.findMany.mockResolvedValue([{ category: 'CT' }]);
    prisma.radiologyAppointment.findMany.mockResolvedValue([]);
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await stats.getStatistics(req(), res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.data.byModality).toEqual({ CT: 1, '╪║┘è╪▒ ┘à╪¡╪»╪»': 1 });
    expect(res.payload.data.byModality['╪ú╪┤╪╣╪⌐ ╪º┘ä╪╡╪»╪▒']).toBeUndefined();
    expect(res.payload.data.total).toBe(2);
  });
});

describe('radiologyAppointmentsController hardening', () => {
  const makeAppointment = (overrides = {}) => ({
    id: 'appt-1',
    companyId: 'company-1',
    patientId: 'pat-1',
    patientName: '┘à╪¡┘à╪» ╪╣┘ä┘è',
    patientPhone: '01001234567',
    nationalId: '29901010123456',
    bookingNo: 12,
    status: 'SCHEDULED',
    studyId: null,
    ...overrides,
  });

  describe('updateAppointment status chain', () => {
    test('rejects CHECKED_IN -> SCHEDULED', async () => {
      const prisma = createPrisma();
      prisma.radiologyAppointment.findFirst.mockResolvedValue(makeAppointment({ status: 'CHECKED_IN' }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await appointments.updateAppointment(req({ params: { id: 'appt-1' }, body: { status: 'SCHEDULED' } }), res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('╪º┘å╪¬┘é╪º┘ä ╪¡╪º┘ä╪⌐ ╪║┘è╪▒ ┘à╪│┘à┘ê╪¡ ╪¿┘ç');
      expect(prisma.radiologyAppointment.update).not.toHaveBeenCalled();
    });

    test('rejects CANCELLED -> SCHEDULED', async () => {
      const prisma = createPrisma();
      prisma.radiologyAppointment.findFirst.mockResolvedValue(makeAppointment({ status: 'CANCELLED' }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await appointments.updateAppointment(req({ params: { id: 'appt-1' }, body: { status: 'SCHEDULED' } }), res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('╪º┘å╪¬┘é╪º┘ä ╪¡╪º┘ä╪⌐ ╪║┘è╪▒ ┘à╪│┘à┘ê╪¡ ╪¿┘ç');
      expect(prisma.radiologyAppointment.update).not.toHaveBeenCalled();
    });

    test('rejects SCHEDULED -> DONE directly', async () => {
      const prisma = createPrisma();
      prisma.radiologyAppointment.findFirst.mockResolvedValue(makeAppointment({ status: 'SCHEDULED' }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await appointments.updateAppointment(req({ params: { id: 'appt-1' }, body: { status: 'DONE' } }), res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('╪º┘å╪¬┘é╪º┘ä ╪¡╪º┘ä╪⌐ ╪║┘è╪▒ ┘à╪│┘à┘ê╪¡ ╪¿┘ç');
      expect(prisma.radiologyAppointment.update).not.toHaveBeenCalled();
    });

    test('rejects DONE -> CHECKED_IN', async () => {
      const prisma = createPrisma();
      prisma.radiologyAppointment.findFirst.mockResolvedValue(makeAppointment({ status: 'DONE' }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await appointments.updateAppointment(req({ params: { id: 'appt-1' }, body: { status: 'CHECKED_IN' } }), res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('╪º┘å╪¬┘é╪º┘ä ╪¡╪º┘ä╪⌐ ╪║┘è╪▒ ┘à╪│┘à┘ê╪¡ ╪¿┘ç');
      expect(prisma.radiologyAppointment.update).not.toHaveBeenCalled();
    });

    test('allows SCHEDULED -> CHECKED_IN', async () => {
      const prisma = createPrisma();
      prisma.radiologyAppointment.findFirst.mockResolvedValue(makeAppointment({ status: 'SCHEDULED' }));
      prisma.radiologyAppointment.update.mockImplementation(({ data }) => Promise.resolve({ id: 'appt-1', ...data }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await appointments.updateAppointment(req({ params: { id: 'appt-1' }, body: { status: 'CHECKED_IN' } }), res);

      expect(res.statusCode).toBe(200);
      expect(prisma.radiologyAppointment.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'CHECKED_IN' }) })
      );
    });

    test('allows CHECKED_IN -> DONE', async () => {
      const prisma = createPrisma();
      prisma.radiologyAppointment.findFirst.mockResolvedValue(makeAppointment({ status: 'CHECKED_IN' }));
      prisma.radiologyAppointment.update.mockImplementation(({ data }) => Promise.resolve({ id: 'appt-1', ...data }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await appointments.updateAppointment(req({ params: { id: 'appt-1' }, body: { status: 'DONE' } }), res);

      expect(res.statusCode).toBe(200);
      expect(prisma.radiologyAppointment.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'DONE' }) })
      );
    });

    test('allows same-status updates (idempotent)', async () => {
      const prisma = createPrisma();
      prisma.radiologyAppointment.findFirst.mockResolvedValue(makeAppointment({ status: 'DONE' }));
      prisma.radiologyAppointment.update.mockImplementation(({ data }) => Promise.resolve({ id: 'appt-1', ...data }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await appointments.updateAppointment(req({ params: { id: 'appt-1' }, body: { status: 'done' } }), res);

      expect(res.statusCode).toBe(200);
      expect(prisma.radiologyAppointment.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'DONE' }) })
      );
    });

    test('allows SCHEDULED -> CANCELLED', async () => {
      const prisma = createPrisma();
      prisma.radiologyAppointment.findFirst.mockResolvedValue(makeAppointment({ status: 'SCHEDULED' }));
      prisma.radiologyAppointment.update.mockResolvedValue({ id: 'appt-1', status: 'CANCELLED' });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await appointments.updateAppointment(req({ params: { id: 'appt-1' }, body: { status: 'CANCELLED' } }), res);

      expect(res.statusCode).toBe(200);
      expect(prisma.radiologyAppointment.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'CANCELLED' }) })
      );
    });
  });

  describe('deleteAppointment protection', () => {
    test('rejects deleting an appointment linked to a study', async () => {
      const prisma = createPrisma({
        radiologyAppointment: {
          findMany: jest.fn(),
          count: jest.fn(),
          findFirst: jest.fn().mockResolvedValue(makeAppointment({ status: 'DONE', studyId: 'study-1' })),
          findUnique: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        },
      });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await appointments.deleteAppointment(req({ params: { id: 'appt-1' } }), res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('┘ä╪º ┘è┘à┘â┘å ╪¡╪░┘ü ╪¡╪¼╪▓ ┘à╪▒╪¬╪¿╪╖ ╪¿╪»╪▒╪º╪│╪⌐');
      expect(prisma.radiologyAppointment.delete).not.toHaveBeenCalled();
    });

    test('allows deleting an appointment without a study link', async () => {
      const prisma = createPrisma({
        radiologyAppointment: {
          findMany: jest.fn(),
          count: jest.fn(),
          findFirst: jest.fn().mockResolvedValue(makeAppointment()),
          findUnique: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
          delete: jest.fn().mockResolvedValue({ id: 'appt-1' }),
        },
      });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await appointments.deleteAppointment(req({ params: { id: 'appt-1' } }), res);

      expect(res.statusCode).toBe(200);
      expect(prisma.radiologyAppointment.delete).toHaveBeenCalledWith({ where: { id: 'appt-1' } });
    });
  });

  describe('listAppointments search', () => {
    test('searches by nationalId and matches bookingNo exactly for a numeric search', async () => {
      const prisma = createPrisma();
      prisma.radiologyAppointment.findMany.mockResolvedValue([makeAppointment()]);
      prisma.radiologyAppointment.count.mockResolvedValue(1);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await appointments.listAppointments(req({ query: { search: '29901010123456' } }), res);

      const args = prisma.radiologyAppointment.findMany.mock.calls[0][0];
      expect(args.where.OR).toEqual([
        { patientName: { contains: '29901010123456', mode: 'insensitive' } },
        { patientPhone: { contains: '29901010123456', mode: 'insensitive' } },
        { nationalId: { contains: '29901010123456', mode: 'insensitive' } },
        { bookingNo: 29901010123456 },
      ]);
      expect(res.statusCode).toBe(200);
    });

    test('searches by phone', async () => {
      const prisma = createPrisma();
      prisma.radiologyAppointment.findMany.mockResolvedValue([makeAppointment()]);
      prisma.radiologyAppointment.count.mockResolvedValue(1);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await appointments.listAppointments(req({ query: { search: '0100123' } }), res);

      const args = prisma.radiologyAppointment.findMany.mock.calls[0][0];
      expect(args.where.OR).toEqual([
        { patientName: { contains: '0100123', mode: 'insensitive' } },
        { patientPhone: { contains: '0100123', mode: 'insensitive' } },
        { nationalId: { contains: '0100123', mode: 'insensitive' } },
        { bookingNo: 100123 },
      ]);
      expect(res.statusCode).toBe(200);
    });

    test('matches bookingNo exactly when the search string is a valid number', async () => {
      const prisma = createPrisma();
      prisma.radiologyAppointment.findMany.mockResolvedValue([makeAppointment()]);
      prisma.radiologyAppointment.count.mockResolvedValue(1);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await appointments.listAppointments(req({ query: { search: '12' } }), res);

      const args = prisma.radiologyAppointment.findMany.mock.calls[0][0];
      expect(args.where.OR).toContainEqual({ bookingNo: 12 });
      expect(res.statusCode).toBe(200);
    });

    test('omits the bookingNo clause for a non-numeric search', async () => {
      const prisma = createPrisma();
      prisma.radiologyAppointment.findMany.mockResolvedValue([makeAppointment()]);
      prisma.radiologyAppointment.count.mockResolvedValue(1);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await appointments.listAppointments(req({ query: { search: '┘à╪¡┘à╪»' } }), res);

      const args = prisma.radiologyAppointment.findMany.mock.calls[0][0];
      expect(args.where.OR).toHaveLength(3);
      expect(args.where.OR.some((clause) => Object.hasOwn(clause, 'bookingNo'))).toBe(false);
      expect(res.statusCode).toBe(200);
    });

    test('keeps the existing patientName filter behavior', async () => {
      const prisma = createPrisma();
      prisma.radiologyAppointment.findMany.mockResolvedValue([makeAppointment()]);
      prisma.radiologyAppointment.count.mockResolvedValue(1);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await appointments.listAppointments(req({ query: { patientName: '┘à╪¡┘à╪»' } }), res);

      const args = prisma.radiologyAppointment.findMany.mock.calls[0][0];
      expect(args.where).toEqual({ companyId: 'company-1', patientName: { contains: '┘à╪¡┘à╪»', mode: 'insensitive' } });
      expect(res.statusCode).toBe(200);
    });
  });
});
