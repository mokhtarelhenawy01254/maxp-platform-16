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
const bulkController = require('../../controller/radiologyBulkController');

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
    radiologyAppointment: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    radiologyStudy: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
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
    radiologyExamType: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    radiologyEntityPrice: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    radiologySetting: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    patient: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    insuranceCompany: {
      findFirst: jest.fn(),
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

const makeAppointment = (overrides = {}) => ({
  id: 'ap-1',
  companyId: 'company-1',
  status: 'SCHEDULED',
  patientId: 'patient-1',
  patientName: 'محمد علي',
  patientPhone: null,
  patientGender: null,
  patientAge: null,
  nationalId: null,
  insuranceNumber: null,
  patientFlags: null,
  examTypeId: 'et-1',
  examTypeName: 'أشعة مقطعية',
  examTypeIds: JSON.stringify(['et-1']),
  deviceId: null,
  deviceName: null,
  insuranceCompanyId: null,
  additionIds: null,
  additionAmount: 0,
  referringPhysicianId: null,
  referralDoctor: null,
  emergency: false,
  studyId: null,
  ...overrides,
});

const makeStudy = (overrides = {}) => ({
  id: 's1',
  companyId: 'company-1',
  studyNumber: 'RAD-20260814-1001',
  patientId: 'patient-1',
  patientName: 'محمد علي',
  patientPhone: null,
  patientGender: null,
  patientAge: null,
  nationalId: null,
  insuranceNumber: null,
  patientFlags: null,
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
  billingType: 'PATIENT',
  priceSnapshot: 500,
  additionAmount: 0,
  paidAmount: 500,
  createdBy: 'user-1',
  ...overrides,
});

const makeReport = (overrides = {}) => ({
  id: 'rep-1',
  studyId: 's1',
  reportText: 'تقرير',
  reportStatus: 'SIGNED',
  signedBy: 'أحمد',
  typedBy: 'أحمد',
  ...overrides,
});

const mockFindFirstById = (mock, byId) => {
  mock.mockImplementation(({ where }) => Promise.resolve((byId[where.id] || null) ?? null));
};

describe('radiologyBulkController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    findOrCreatePatient.mockResolvedValue({ id: 'patient-resolved-1' });
  });

  describe('bulkConvertAppointments', () => {
    test('converts multiple scheduled appointments into studies', async () => {
      const prisma = createPrisma();
      prisma.radiologyAppointment.findFirst.mockImplementation(({ where }) => {
        if (where.id === 'ap-1') return Promise.resolve(makeAppointment({ id: 'ap-1' }));
        if (where.id === 'ap-2') return Promise.resolve(makeAppointment({ id: 'ap-2' }));
        return Promise.resolve(null);
      });
      prisma.radiologyExamType.findMany.mockResolvedValue([
        { id: 'et-1', name: 'أشعة مقطعية', price: 500, category: 'CT', examCategory: null },
      ]);
      prisma.radiologyStudy.create.mockImplementation(({ data }) => Promise.resolve({ id: `study-${data.examTypeId}`, ...data }));
      prisma.radiologyAppointment.update.mockImplementation(({ where, data }) => Promise.resolve({ id: where.id, ...data }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await bulkController.bulkConvertAppointments(req({ body: { ids: ['ap-1', 'ap-2'] } }), res);

      expect(res.statusCode).toBe(200);
      expect(res.payload.success).toBe(true);
      expect(res.payload.data.successCount).toBe(2);
      expect(res.payload.data.failed).toEqual([]);
      expect(prisma.radiologyStudy.create).toHaveBeenCalledTimes(2);
    });

    test('keeps processing the rest when one appointment is cancelled', async () => {
      const prisma = createPrisma();
      prisma.radiologyAppointment.findFirst.mockImplementation(({ where }) => {
        if (where.id === 'ap-1') return Promise.resolve(makeAppointment({ id: 'ap-1' }));
        if (where.id === 'ap-2') return Promise.resolve(makeAppointment({ id: 'ap-2', status: 'CANCELLED' }));
        if (where.id === 'ap-3') return Promise.resolve(makeAppointment({ id: 'ap-3' }));
        return Promise.resolve(null);
      });
      prisma.radiologyExamType.findMany.mockResolvedValue([
        { id: 'et-1', name: 'أشعة مقطعية', price: 500, category: 'CT', examCategory: null },
      ]);
      prisma.radiologyStudy.create.mockImplementation(({ data }) => Promise.resolve({ id: `study-${data.examTypeId}`, ...data }));
      prisma.radiologyAppointment.update.mockImplementation(({ where, data }) => Promise.resolve({ id: where.id, ...data }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await bulkController.bulkConvertAppointments(req({ body: { ids: ['ap-1', 'ap-2', 'ap-3'] } }), res);

      expect(res.payload.data.successCount).toBe(2);
      expect(res.payload.data.failed).toEqual([{ id: 'ap-2', error: 'لا يمكن تحويل حجز ملغي' }]);
    });

    test('rejects an appointment that belongs to another company', async () => {
      const prisma = createPrisma();
      prisma.radiologyAppointment.findFirst.mockResolvedValue(null);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await bulkController.bulkConvertAppointments(req({ body: { ids: ['ap-other'] } }), res);

      expect(res.payload.data.successCount).toBe(0);
      expect(res.payload.data.failed).toEqual([{ id: 'ap-other', error: 'الحجز غير موجود' }]);
    });
  });

  describe('bulkCheckinAppointments', () => {
    test('checks in multiple scheduled appointments', async () => {
      const prisma = createPrisma();
      prisma.radiologyAppointment.findFirst.mockImplementation(({ where }) => {
        if (where.id === 'ap-1') return Promise.resolve(makeAppointment({ id: 'ap-1' }));
        if (where.id === 'ap-2') return Promise.resolve(makeAppointment({ id: 'ap-2' }));
        return Promise.resolve(null);
      });
      prisma.radiologyAppointment.update.mockImplementation(({ where, data }) => Promise.resolve({ id: where.id, ...data }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await bulkController.bulkCheckinAppointments(req({ body: { ids: ['ap-1', 'ap-2'] } }), res);

      expect(res.statusCode).toBe(200);
      expect(res.payload.data.successCount).toBe(2);
      expect(res.payload.data.failed).toEqual([]);
      expect(prisma.radiologyAppointment.update).toHaveBeenCalledTimes(2);
      expect(prisma.radiologyAppointment.update).toHaveBeenCalledWith({ where: { id: 'ap-1' }, data: { status: 'CHECKED_IN' } });
    });

    test('keeps processing when one appointment is not scheduled', async () => {
      const prisma = createPrisma();
      prisma.radiologyAppointment.findFirst.mockImplementation(({ where }) => {
        if (where.id === 'ap-1') return Promise.resolve(makeAppointment({ id: 'ap-1' }));
        if (where.id === 'ap-2') return Promise.resolve(makeAppointment({ id: 'ap-2', status: 'DONE' }));
        if (where.id === 'ap-3') return Promise.resolve(makeAppointment({ id: 'ap-3' }));
        return Promise.resolve(null);
      });
      prisma.radiologyAppointment.update.mockImplementation(({ where, data }) => Promise.resolve({ id: where.id, ...data }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await bulkController.bulkCheckinAppointments(req({ body: { ids: ['ap-1', 'ap-2', 'ap-3'] } }), res);

      expect(res.payload.data.successCount).toBe(2);
      expect(res.payload.data.failed).toEqual([{ id: 'ap-2', error: 'يمكن تسجيل الحضور للحجوزات المجدولة فقط' }]);
    });

    test('rejects an appointment that belongs to another company', async () => {
      const prisma = createPrisma();
      prisma.radiologyAppointment.findFirst.mockResolvedValue(null);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await bulkController.bulkCheckinAppointments(req({ body: { ids: ['ap-other'] } }), res);

      expect(res.payload.data.successCount).toBe(0);
      expect(res.payload.data.failed).toEqual([{ id: 'ap-other', error: 'الحجز غير موجود' }]);
    });
  });

  describe('bulkAdvanceStudies', () => {
    test('advances each study to the next stage in the chain', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findFirst.mockImplementation(({ where }) => {
        if (where.id === 's1') return Promise.resolve(makeStudy({ id: 's1', status: 'PENDING_IMAGING' }));
        if (where.id === 's2') return Promise.resolve(makeStudy({ id: 's2', status: 'IMAGED' }));
        return Promise.resolve(null);
      });
      prisma.radiologyStudy.update.mockImplementation(({ where, data }) => Promise.resolve({ id: where.id, ...data }));
      prisma.radiologyReport.findUnique.mockResolvedValue(null);
      prisma.radiologyReport.create.mockImplementation(({ data }) => Promise.resolve({ id: 'rep-new', ...data }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await bulkController.bulkAdvanceStudies(req({ body: { ids: ['s1', 's2'] } }), res);

      expect(res.statusCode).toBe(200);
      expect(res.payload.data.successCount).toBe(2);
      expect(res.payload.data.failed).toEqual([]);
      expect(prisma.radiologyStudy.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 's1' }, data: expect.objectContaining({ status: 'IMAGED' }) }),
      );
      expect(prisma.radiologyStudy.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 's2' }, data: expect.objectContaining({ status: 'PENDING_REPORT' }) }),
      );
    });

    test('keeps processing when one study is already delivered', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findFirst.mockImplementation(({ where }) => {
        if (where.id === 's1') return Promise.resolve(makeStudy({ id: 's1', status: 'PENDING_IMAGING' }));
        if (where.id === 's2') return Promise.resolve(makeStudy({ id: 's2', status: 'DELIVERED' }));
        if (where.id === 's3') return Promise.resolve(makeStudy({ id: 's3', status: 'IMAGED' }));
        return Promise.resolve(null);
      });
      prisma.radiologyStudy.update.mockImplementation(({ where, data }) => Promise.resolve({ id: where.id, ...data }));
      prisma.radiologyReport.findUnique.mockResolvedValue(null);
      prisma.radiologyReport.create.mockImplementation(({ data }) => Promise.resolve({ id: 'rep-new', ...data }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await bulkController.bulkAdvanceStudies(req({ body: { ids: ['s1', 's2', 's3'] } }), res);

      expect(res.payload.data.successCount).toBe(2);
      expect(res.payload.data.failed).toEqual([{ id: 's2', error: 'الحالة في المرحلة الأخيرة ولا يمكن تقديمها' }]);
    });

    test('rejects a study that belongs to another company', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findFirst.mockResolvedValue(null);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await bulkController.bulkAdvanceStudies(req({ body: { ids: ['s-other'] } }), res);

      expect(res.payload.data.successCount).toBe(0);
      expect(res.payload.data.failed).toEqual([{ id: 's-other', error: 'الحالة غير موجودة' }]);
    });
  });

  describe('bulkDeliverStudies', () => {
    const deliverSetup = ({ reportByStudy, studies }) => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findFirst.mockImplementation(({ where }) => Promise.resolve(studies[where.id] || null));
      prisma.radiologyReport.findUnique.mockImplementation(({ where }) => Promise.resolve(reportByStudy[where.studyId] || null));
      prisma.radiologyStudyImage.count.mockResolvedValue(1);
      prisma.radiologyReport.update.mockImplementation(({ where, data }) => Promise.resolve({ id: where.id, ...data }));
      prisma.radiologyStudy.update.mockImplementation(({ where, data }) => Promise.resolve({ id: where.id, ...data }));
      getSharedPrismaClient.mockReturnValue(prisma);
      return prisma;
    };

    test('delivers multiple signed studies', async () => {
      const studies = {
        s1: makeStudy({ id: 's1', status: 'REPORTED' }),
        s2: makeStudy({ id: 's2', status: 'REPORTED' }),
      };
      const reportByStudy = {
        s1: makeReport({ id: 'rep-1', studyId: 's1', reportStatus: 'SIGNED' }),
        s2: makeReport({ id: 'rep-2', studyId: 's2', reportStatus: 'SIGNED' }),
      };
      const prisma = deliverSetup({ studies, reportByStudy });

      const res = createResponse();
      await bulkController.bulkDeliverStudies(req({ body: { ids: ['s1', 's2'] } }), res);

      expect(res.statusCode).toBe(200);
      expect(res.payload.data.successCount).toBe(2);
      expect(res.payload.data.failed).toEqual([]);
      expect(prisma.radiologyReport.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ reportStatus: 'DELIVERED' }) }),
      );
      expect(prisma.radiologyStudy.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'DELIVERED' }) }),
      );
    });

    test('keeps processing when one study report is not signed', async () => {
      const studies = {
        s1: makeStudy({ id: 's1', status: 'REPORTED' }),
        s2: makeStudy({ id: 's2', status: 'REPORTED' }),
        s3: makeStudy({ id: 's3', status: 'REPORTED' }),
      };
      const reportByStudy = {
        s1: makeReport({ id: 'rep-1', studyId: 's1', reportStatus: 'SIGNED' }),
        s2: makeReport({ id: 'rep-2', studyId: 's2', reportStatus: 'DRAFT' }),
        s3: makeReport({ id: 'rep-3', studyId: 's3', reportStatus: 'SIGNED' }),
      };
      deliverSetup({ studies, reportByStudy });

      const res = createResponse();
      await bulkController.bulkDeliverStudies(req({ body: { ids: ['s1', 's2', 's3'] } }), res);

      expect(res.payload.data.successCount).toBe(2);
      expect(res.payload.data.failed).toEqual([{ id: 's2', error: 'يجب توقيع التقرير قبل التسليم' }]);
    });

    test('rejects a study that belongs to another company', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findFirst.mockResolvedValue(null);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await bulkController.bulkDeliverStudies(req({ body: { ids: ['s-other'] } }), res);

      expect(res.payload.data.successCount).toBe(0);
      expect(res.payload.data.failed).toEqual([{ id: 's-other', error: 'الحالة غير موجودة' }]);
    });
  });

  describe('bulkStudiesLabels', () => {
    test('returns id + studyNumber for every valid study', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findFirst.mockImplementation(({ where }) => {
        if (where.id === 's1') return Promise.resolve({ id: 's1', studyNumber: 'RAD-1' });
        if (where.id === 's2') return Promise.resolve({ id: 's2', studyNumber: 'RAD-2' });
        return Promise.resolve(null);
      });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await bulkController.bulkStudiesLabels(req({ body: { ids: ['s1', 's2', 's-missing'] } }), res);

      expect(res.statusCode).toBe(200);
      expect(res.payload.data.successCount).toBe(2);
      expect(res.payload.data.items).toEqual([
        { id: 's1', studyNumber: 'RAD-1' },
        { id: 's2', studyNumber: 'RAD-2' },
      ]);
      expect(res.payload.data.failed).toEqual([{ id: 's-missing', error: 'الحالة غير موجودة' }]);
    });
  });

  describe('bulkAdvanceReports', () => {
    test('reviews multiple reports', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findFirst.mockImplementation(({ where }) => Promise.resolve({ id: where.id, companyId: 'company-1' }));
      prisma.radiologyReport.findUnique.mockImplementation(({ where }) =>
        Promise.resolve(makeReport({ id: `rep-${where.studyId}`, studyId: where.studyId, reportStatus: 'DRAFT' })),
      );
      prisma.radiologyReport.update.mockImplementation(({ where, data }) => Promise.resolve({ id: where.id, ...data }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await bulkController.bulkAdvanceReports(req({ body: { ids: ['s1', 's2'], action: 'review' } }), res);

      expect(res.statusCode).toBe(200);
      expect(res.payload.data.successCount).toBe(2);
      expect(res.payload.data.failed).toEqual([]);
      expect(prisma.radiologyReport.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ reportStatus: 'REVIEWED' }) }),
      );
    });

    test('keeps processing when one report cannot advance to the target status', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findFirst.mockImplementation(({ where }) => Promise.resolve({ id: where.id, companyId: 'company-1' }));
      prisma.radiologyReport.findUnique.mockImplementation(({ where }) => {
        const status = where.studyId === 's2' ? 'SIGNED' : 'DRAFT';
        return Promise.resolve(makeReport({ id: `rep-${where.studyId}`, studyId: where.studyId, reportStatus: status }));
      });
      prisma.radiologyReport.update.mockImplementation(({ where, data }) => Promise.resolve({ id: where.id, ...data }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await bulkController.bulkAdvanceReports(req({ body: { ids: ['s1', 's2', 's3'], action: 'review' } }), res);

      expect(res.payload.data.successCount).toBe(2);
      expect(res.payload.data.failed).toHaveLength(1);
      expect(res.payload.data.failed[0].id).toBe('s2');
      expect(res.payload.data.failed[0].error).toContain('لا يمكن الانتقال في حالة التقرير');
    });

    test('signs reports when action is sign', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findFirst.mockImplementation(({ where }) => Promise.resolve({ id: where.id, companyId: 'company-1' }));
      prisma.radiologyReport.findUnique.mockImplementation(({ where }) =>
        Promise.resolve(makeReport({ id: `rep-${where.studyId}`, studyId: where.studyId, reportStatus: 'REVIEWED' })),
      );
      prisma.radiologyReport.update.mockImplementation(({ where, data }) => Promise.resolve({ id: where.id, ...data }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await bulkController.bulkAdvanceReports(req({ body: { ids: ['s1'], action: 'sign' } }), res);

      expect(res.payload.data.successCount).toBe(1);
      expect(res.payload.data.failed).toEqual([]);
      expect(prisma.radiologyReport.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ reportStatus: 'SIGNED' }) }),
      );
    });

    test('delivers studies when action is deliver', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findFirst.mockImplementation(({ where }) =>
        Promise.resolve(makeStudy({ id: where.id, status: 'REPORTED' })),
      );
      prisma.radiologyReport.findUnique.mockImplementation(({ where }) =>
        Promise.resolve(makeReport({ id: `rep-${where.studyId}`, studyId: where.studyId, reportStatus: 'SIGNED' })),
      );
      prisma.radiologyStudyImage.count.mockResolvedValue(1);
      prisma.radiologyReport.update.mockImplementation(({ where, data }) => Promise.resolve({ id: where.id, ...data }));
      prisma.radiologyStudy.update.mockImplementation(({ where, data }) => Promise.resolve({ id: where.id, ...data }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await bulkController.bulkAdvanceReports(req({ body: { ids: ['s1'], action: 'deliver' } }), res);

      expect(res.payload.data.successCount).toBe(1);
      expect(res.payload.data.failed).toEqual([]);
      expect(prisma.radiologyReport.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ reportStatus: 'DELIVERED' }) }),
      );
    });

    test('rejects an invalid action', async () => {
      const prisma = createPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await bulkController.bulkAdvanceReports(req({ body: { ids: ['s1'], action: 'bogus' } }), res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.success).toBe(false);
      expect(res.payload.error).toBe('إجراء غير صحيح');
    });
  });

  describe('authorization', () => {
    test('returns 403 when the user has no company', async () => {
      const res = createResponse();
      await bulkController.bulkDeliverStudies(req({ user: {} }), res);

      expect(res.statusCode).toBe(403);
      expect(res.payload.error).toBe('غير مصرح');
    });
  });
});
