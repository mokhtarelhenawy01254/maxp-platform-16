jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
}));

jest.mock('../../utils/dicomUtil', () => {
  const actual = jest.requireActual('../../utils/dicomUtil');
  return { ...actual, parseDicomFromBuffer: jest.fn(() => ({})) };
});

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const controller = require('../../controller/radiologyController');
const dicomUtil = require('../../utils/dicomUtil');

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
    },
    radiologyReport: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
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

const makeStudy = (overrides = {}) => ({
  id: 'study-1',
  companyId: 'company-1',
  studyNumber: 'RAD-20260809-1234',
  patientId: null,
  patientName: 'محمد علي',
  patientPhone: '01001234567',
  patientGender: 'MALE',
  patientAge: '35',
  examTypeId: 'et-1',
  examTypeName: 'أشعة مقطعية',
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
  name: 'أشعة مقطعية',
  category: 'CT',
  abbreviation: 'CT',
  price: 300,
  isActive: true,
  ...overrides,
});

describe('radiologyController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
        req({ body: { name: 'أشعة مقطعية', category: 'CT', abbreviation: 'CT', price: '300' } }),
        res
      );

      expect(res.statusCode).toBe(200);
      const data = prisma.radiologyExamType.create.mock.calls[0][0].data;
      expect(data.companyId).toBe('company-1');
      expect(data.name).toBe('أشعة مقطعية');
      expect(data.category).toBe('CT');
      expect(data.price).toBe(300);
      expect(res.payload.data.price).toBe(300);
    });

    test('createExamType rejects an invalid price', async () => {
      const prisma = createPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createExamType(req({ body: { name: 'أشعة', price: -5 } }), res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('السعر غير صحيح');
      expect(prisma.radiologyExamType.create).not.toHaveBeenCalled();
    });

    test('createExamType rejects a missing name', async () => {
      const prisma = createPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createExamType(req({ body: {} }), res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('اسم نوع الفحص مطلوب');
    });

    test('listExamTypes scopes to company, filters by search and paginates', async () => {
      const prisma = createPrisma();
      prisma.radiologyExamType.findMany.mockResolvedValue([makeExamType()]);
      prisma.radiologyExamType.count.mockResolvedValue(12);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.listExamTypes(req({ query: { search: 'مقطعية', page: '2', limit: '10' } }), res);

      const args = prisma.radiologyExamType.findMany.mock.calls[0][0];
      expect(args.where).toEqual({
        companyId: 'company-1',
        isActive: true,
        OR: [
          { name: { contains: 'مقطعية', mode: 'insensitive' } },
          { category: { contains: 'مقطعية', mode: 'insensitive' } },
          { abbreviation: { contains: 'مقطعية', mode: 'insensitive' } },
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
      expect(res.payload.message).toBe('تم حذف نوع الفحص');
    });

    test('deleteExamType returns 404 for a foreign exam type', async () => {
      const prisma = createPrisma();
      prisma.radiologyExamType.findFirst.mockResolvedValue(null);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.deleteExamType(req({ params: { id: 'foreign' } }), res);

      expect(res.statusCode).toBe(404);
      expect(res.payload.error).toBe('نوع الفحص غير موجود');
      expect(prisma.radiologyExamType.update).not.toHaveBeenCalled();
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
            patientName: 'محمد علي',
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
      expect(data.patientName).toBe('محمد علي');
      expect(data.patientPhone).toBe('01001234567');
      expect(data.patientGender).toBe('MALE');
      expect(data.patientAge).toBe('35');
      expect(data.examTypeId).toBe('et-1');
      expect(data.examTypeName).toBe('أشعة مقطعية');
      expect(data.modality).toBe('CT');
      expect(data.status).toBe('PENDING_IMAGING');
      expect(data.submissionStatus).toBe('NOT_SUBMITTED');
      expect(data.emergency).toBe(true);
      expect(data.studyNumber).toMatch(/^RAD-\d{8}-\d{4}$/);
      expect(res.payload.data.studyNumber).toMatch(/^RAD-\d{8}-\d{4}$/);
    });

    test('retries with a fresh studyNumber on a unique collision', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.create
        .mockRejectedValueOnce({ code: 'P2002', message: 'Unique constraint failed on the fields: (`studyNumber`)' })
        .mockImplementationOnce(({ data }) => Promise.resolve({ id: 'study-1', ...data }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createStudy(req({ body: { patientName: 'مريض' } }), res);

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
      await controller.createStudy(req({ body: { patientName: 'مريض', studyNumber: 'RAD-20260809-1111' } }), res);

      expect(res.statusCode).toBe(409);
      expect(res.payload.error).toBe('رقم الدراسة مستخدم من قبل');
      expect(prisma.radiologyStudy.create).toHaveBeenCalledTimes(1);
    });

    test('rejects an examType outside the company', async () => {
      const prisma = createPrisma();
      prisma.radiologyExamType.findFirst.mockResolvedValue(null);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createStudy(req({ body: { patientName: 'مريض', examTypeId: 'foreign' } }), res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('نوع الفحص لا ينتمي لهذه الشركة');
      expect(prisma.radiologyStudy.create).not.toHaveBeenCalled();
    });

    test('rejects a missing patientName', async () => {
      const prisma = createPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createStudy(req({ body: {} }), res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('اسم المريض مطلوب');
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
            patientName: 'محمد',
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
        patientName: { contains: 'محمد', mode: 'insensitive' },
        status: 'IMAGED',
        createdAt: { gte: expect.any(Date), lte: expect.any(Date) },
      });
      expect(args.skip).toBe(25);
      expect(args.take).toBe(25);
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
      expect(res.payload.error).toBe('حالة الدراسة غير صحيحة');
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
      expect(res.payload.error).toBe('الدراسة غير موجودة');
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
            rologyRadiologist: 'د. سارة',
            reportReceivedAt: '2026-08-09T12:00:00.000Z',
          },
        }),
        res
      );

      const data = prisma.radiologyStudy.update.mock.calls[0][0].data;
      expect(data.submissionStatus).toBe('SUBMITTED');
      expect(data.rologyStudyLink).toBe('https://rology.example/study/1');
      expect(data.rologyReportLink).toBe('https://rology.example/report/1');
      expect(data.rologyRadiologist).toBe('د. سارة');
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
        patientName: 'اسم من ديكوم',
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
      expect(updateData.patientName).toBe('اسم من ديكوم');
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
      expect(res.payload.error).toBe('يجب رفع ملف DICOM واحد على الأقل');
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
      expect(res.payload.error).toBe('الدراسة غير موجودة');
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
      expect(res.payload.error).toBe('الصورة غير موجودة');
      expect(res.sent).toBeNull();
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
      await controller.upsertStudyReport(req({ params: { id: 'study-1' }, body: { reportText: 'لا يوجد كسور' } }), res);

      expect(res.statusCode).toBe(200);
      const createData = prisma.radiologyReport.create.mock.calls[0][0].data;
      expect(createData.studyId).toBe('study-1');
      expect(createData.reportText).toBe('لا يوجد كسور');
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
        req({ params: { id: 'study-1' }, body: { reportText: 'تحديث', reportStatus: 'REVIEWED' } }),
        res
      );

      expect(res.statusCode).toBe(200);
      expect(prisma.radiologyReport.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rep-1' },
          data: expect.objectContaining({ reportText: 'تحديث', reportStatus: 'REVIEWED' }),
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
      expect(data.signedBy).toBe('أحمد محمود');
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
      expect(res.payload.error).toBe('يجب توقيع التقرير قبل التسليم');
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
      await controller.createStudy(req({ user: {}, body: { patientName: 'مريض' } }), res);

      expect(res.statusCode).toBe(403);
      expect(prisma.radiologyStudy.create).not.toHaveBeenCalled();
    });
  });
});
