jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const controller = require('../../controller/radiologyTatController');

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

const req = (overrides = {}) => ({
  user: { companyId: 'company-1', id: 'user-1' },
  query: {},
  params: {},
  body: {},
  ...overrides,
});

// دراسة واحدة مسلّمة ببيانات زمنية معروفة:
// 08:00 → 09:00 PREP (PENDING_IMAGING→IMAGED)    = 1h
// 09:00 → 11:00 PREP (IMAGED→REPORTED)           = 2h
// 11:00 → 12:00 PREP (REPORTED→DELIVERED)        = 1h
// 10:00 → 10:30 REPORT (DRAFT→SIGNED)            = 0.5h
// 10:30 → 12:00 REPORT (SIGNED→DELIVERED)        = 1.5h
// الإجمالي: createdAt 08:00 → DELIVERED 12:00    = 4h
const deliveredStudy = {
  id: 's1',
  companyId: 'company-1',
  modality: 'CT',
  assignedRadiologistName: 'د. أحمد',
  emergency: true,
  status: 'DELIVERED',
  createdAt: new Date('2026-08-01T08:00:00.000Z'),
  statusHistory: [
    { id: 'h1', dimension: 'PREP', status: 'PENDING_IMAGING', oldStatus: null, createdAt: new Date('2026-08-01T08:00:00.000Z') },
    { id: 'h2', dimension: 'PREP', status: 'IMAGED', oldStatus: 'PENDING_IMAGING', createdAt: new Date('2026-08-01T09:00:00.000Z') },
    { id: 'h3', dimension: 'PREP', status: 'REPORTED', oldStatus: 'IMAGED', createdAt: new Date('2026-08-01T11:00:00.000Z') },
    { id: 'h4', dimension: 'PREP', status: 'DELIVERED', oldStatus: 'REPORTED', createdAt: new Date('2026-08-01T12:00:00.000Z') },
    { id: 'h5', dimension: 'REPORT', status: 'DRAFT', oldStatus: null, createdAt: new Date('2026-08-01T10:00:00.000Z') },
    { id: 'h6', dimension: 'REPORT', status: 'SIGNED', oldStatus: 'DRAFT', createdAt: new Date('2026-08-01T10:30:00.000Z') },
    { id: 'h7', dimension: 'REPORT', status: 'DELIVERED', oldStatus: 'SIGNED', createdAt: new Date('2026-08-01T12:00:00.000Z') },
  ],
};

const stuckEmergency = {
  id: 's2',
  companyId: 'company-1',
  studyNumber: 'RAD-20260801-0002',
  patientName: 'مريض طارئ',
  examTypeName: 'MRI',
  modality: 'MR',
  status: 'IMAGED',
  createdAt: new Date('2026-07-20T10:00:00.000Z'),
  assignedRadiologistName: 'د. محمد',
};

const createPrisma = () => {
  const prisma = {
    radiologyStudy: {
      findMany: jest.fn((args) => {
        if (args.include?.statusHistory) return Promise.resolve([deliveredStudy]);
        return Promise.resolve([stuckEmergency]);
      }),
    },
  };
  return prisma;
};

describe('radiologyTatController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('company scoping', () => {
    test('returns 403 when companyId is missing', async () => {
      const prisma = createPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getTatStatistics(req({ user: {} }), res);

      expect(res.statusCode).toBe(403);
      expect(res.payload.error).toBe('غير مصرح');
      expect(prisma.radiologyStudy.findMany).not.toHaveBeenCalled();
    });
  });

  describe('getTatStatistics', () => {
    test('computes stageTimes avg/min/max hours from status history', async () => {
      const prisma = createPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getTatStatistics(req(), res);

      expect(res.statusCode).toBe(200);
      const { stageTimes } = res.payload.data;

      const stage = (fromStatus, toStatus, dimension) =>
        stageTimes.find((s) => s.fromStatus === fromStatus && s.toStatus === toStatus && s.dimension === dimension);

      const pendingToImaged = stage('PENDING_IMAGING', 'IMAGED', 'PREP');
      expect(pendingToImaged).toBeTruthy();
      expect(pendingToImaged.count).toBe(1);
      expect(pendingToImaged.avgHours).toBe(1);
      expect(pendingToImaged.minHours).toBe(1);
      expect(pendingToImaged.maxHours).toBe(1);

      const imagedToReported = stage('IMAGED', 'REPORTED', 'PREP');
      expect(imagedToReported.avgHours).toBe(2);

      const draftToSigned = stage('DRAFT', 'SIGNED', 'REPORT');
      expect(draftToSigned.avgHours).toBe(0.5);
    });

    test('computes overall, byModality and byRadiologist delivery turnaround', async () => {
      const prisma = createPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getTatStatistics(req(), res);

      const { overall, byModality, byRadiologist } = res.payload.data;

      expect(overall).toEqual({ count: 1, avgHours: 4, minHours: 4, maxHours: 4 });
      expect(byModality).toEqual([{ modality: 'CT', count: 1, avgHours: 4, minHours: 4, maxHours: 4 }]);
      expect(byRadiologist).toEqual([{ radiologist: 'د. أحمد', count: 1, avgHours: 4, minHours: 4, maxHours: 4 }]);
    });

    test('returns stuck emergencies from a separate query', async () => {
      const prisma = createPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getTatStatistics(req(), res);

      const { stuckEmergencies } = res.payload.data;
      expect(stuckEmergencies).toHaveLength(1);
      expect(stuckEmergencies[0].id).toBe('s2');
      expect(stuckEmergencies[0].status).toBe('IMAGED');

      // تأكد من أن استعلامات findMany تمت مرتين: الأولى بالدراسات + التالتاريخ، الثانية للطارئة
      const calls = prisma.radiologyStudy.findMany.mock.calls.map((c) => c[0]);
      expect(calls.some((c) => c.include?.statusHistory)).toBe(true);
      expect(calls.some((c) => c.where?.status?.notIn)).toBe(true);
    });

    test('uses last 30 days as default range when no dates given', async () => {
      const prisma = createPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getTatStatistics(req(), res);

      const mainCall = prisma.radiologyStudy.findMany.mock.calls
        .map((c) => c[0])
        .find((c) => c.include?.statusHistory);
      const gte = new Date(mainCall.where.createdAt.gte).getTime();
      const now = Date.now();
      expect(now - gte).toBeGreaterThan(29 * 24 * 60 * 60 * 1000);
      expect(now - gte).toBeLessThan(31 * 24 * 60 * 60 * 1000);
    });
  });
});
