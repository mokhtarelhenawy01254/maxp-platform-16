jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const controller = require('../../controller/radiologyQueueController');

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
      count: jest.fn(),
    },
    radiologyStudy: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    radiologyStudyStatusHistory: {
      groupBy: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
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
  studyNumber: 'RAD-20260813-1001',
  patientId: null,
  patientName: '┘à╪¡┘à╪» ╪╣┘ä┘è',
  patientPhone: '01001234567',
  examTypeId: 'et-1',
  examTypeName: '╪ú╪┤╪╣╪⌐ ┘à┘é╪╖╪╣┘è╪⌐',
  modality: 'CT',
  deviceId: 'dev-1',
  deviceName: '╪¼┘ç╪º╪▓ CT 1',
  status: 'PENDING_IMAGING',
  orderStatus: 'IN_PROGRESS',
  emergency: false,
  withContrast: false,
  paymentStatus: 'UNPAID',
  createdAt: new Date(Date.now() - 5 * 3600 * 1000),
  updatedAt: new Date(Date.now() - 5 * 3600 * 1000),
  ...overrides,
});

const makeAppointment = (overrides = {}) => ({
  id: 'appt-1',
  companyId: 'company-1',
  bookingNo: 12,
  patientId: null,
  patientName: '╪│╪º╪▒╪⌐ ╪ú╪¡┘à╪»',
  patientPhone: '01005551234',
  examTypeId: 'et-2',
  examTypeName: '╪ú╪┤╪╣╪⌐ ╪│┘è┘å┘è╪⌐',
  deviceId: 'dev-2',
  deviceName: '╪¼┘ç╪º╪▓ X-Ray 2',
  status: 'SCHEDULED',
  emergency: false,
  appointmentDate: new Date(),
  appointmentTime: '10:30',
  createdAt: new Date(Date.now() - 3600 * 1000),
  updatedAt: new Date(Date.now() - 3600 * 1000),
  ...overrides,
});

describe('radiologyQueueController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDailyQueue', () => {
    test('rejects a missing companyId', async () => {
      const prisma = createPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getDailyQueue(req({ user: {} }), res);

      expect(res.statusCode).toBe(403);
      expect(res.payload.error).toBe('╪║┘è╪▒ ┘à╪╡╪▒╪¡');
    });

    test('groups the queue and scopes every query to the company', async () => {
      const prisma = createPrisma();
      prisma.radiologyAppointment.findMany.mockResolvedValue([makeAppointment()]);
      prisma.radiologyStudy.findMany.mockImplementation(({ where }) => {
        if (where.status === 'PENDING_IMAGING') return Promise.resolve([makeStudy()]);
        if (where.status && Array.isArray(where.status.in)) return Promise.resolve([makeStudy({ id: 'study-2', status: 'IMAGED' })]);
        if (where.status === 'REPORTED') return Promise.resolve([]);
        return Promise.resolve([]);
      });
      prisma.radiologyAppointment.count.mockResolvedValue(3);
      prisma.radiologyStudy.count.mockResolvedValue(1);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getDailyQueue(req({ query: {} }), res);

      expect(res.statusCode).toBe(200);
      expect(res.payload.success).toBe(true);

      const data = res.payload.data;
      expect(data.pendingCheckIn).toHaveLength(1);
      expect(data.imagingQueue).toHaveLength(1);
      expect(data.readyForReport).toHaveLength(1);
      expect(data.readyForDelivery).toHaveLength(0);
      expect(data.counts.pendingCheckIn).toBe(3);
      expect(data.counts.totalActive).toBe(1);

      // ┘â┘ä ╪º┘ä╪º╪│╪¬╪╣┘ä╪º┘à╪º╪¬ ┘à┘é┘è╪»╪⌐ ╪¿╪º┘ä╪┤╪▒┘â╪⌐
      prisma.radiologyStudy.findMany.mock.calls.forEach(call => {
        expect(call[0].where.companyId).toBe('company-1');
      });
      prisma.radiologyAppointment.findMany.mock.calls.forEach(call => {
        expect(call[0].where.companyId).toBe('company-1');
      });
      prisma.radiologyStudy.count.mock.calls.forEach(call => {
        expect(call[0].where.companyId).toBe('company-1');
      });
    });

    test('pendingCheckIn only takes SCHEDULED appointments within today, ordered by time', async () => {
      const prisma = createPrisma();
      prisma.radiologyAppointment.findMany.mockResolvedValue([
        makeAppointment({ id: 'appt-2', appointmentTime: '11:00', createdAt: new Date(Date.now() - 2 * 3600 * 1000) }),
        makeAppointment({ id: 'appt-1', appointmentTime: '10:30', createdAt: new Date(Date.now() - 3 * 3600 * 1000) }),
      ]);
      prisma.radiologyAppointment.count.mockResolvedValue(2);
      prisma.radiologyStudy.findMany.mockResolvedValue([]);
      prisma.radiologyStudy.count.mockResolvedValue(0);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getDailyQueue(req({ query: {} }), res);

      const args = prisma.radiologyAppointment.findMany.mock.calls[0][0];
      expect(args.where.status).toBe('SCHEDULED');
      expect(args.where.appointmentDate.gte).toBeInstanceOf(Date);
      expect(args.where.appointmentDate.lte).toBeInstanceOf(Date);

      // ┘à╪▒╪¬╪¿╪⌐ ╪¡╪│╪¿ ╪º┘ä┘ê┘é╪¬ ╪¬╪╡╪º╪╣╪»┘è┘ï╪º
      expect(res.payload.data.pendingCheckIn.map(a => a.id)).toEqual(['appt-1', 'appt-2']);
    });

    test('imagingQueue filters by PENDING_IMAGING and orders oldest createdAt first', async () => {
      const prisma = createPrisma();
      prisma.radiologyAppointment.findMany.mockResolvedValue([]);
      prisma.radiologyAppointment.count.mockResolvedValue(0);
      prisma.radiologyStudy.findMany.mockResolvedValue([
        makeStudy({ id: 'study-new', createdAt: new Date(Date.now() - 1000) }),
        makeStudy({ id: 'study-old', createdAt: new Date(Date.now() - 7200 * 1000) }),
      ]);
      prisma.radiologyStudy.count.mockResolvedValue(2);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getDailyQueue(req({ query: {} }), res);

      const imagingArgs = prisma.radiologyStudy.findMany.mock.calls.find(c => c[0].where.status === 'PENDING_IMAGING');
      expect(imagingArgs[0].where.status).toBe('PENDING_IMAGING');
      expect(imagingArgs[0].orderBy).toEqual({ createdAt: 'asc' });
      // ┘é╪º╪ª┘à╪⌐ ┘à┘å┘ü╪╡┘ä╪⌐ (╪║┘è╪▒ ┘à┘ü╪▒┘ê╪▓╪⌐ ┘ü┘è JS) ΓÇö ╪º┘ä╪¬╪▒╪¬┘è╪¿ ┘à╪¡┘ü┘ê╪╕ ┘â┘à╪º ╪ú╪╣╪º╪»┘ç ╪º┘ä┘à┘ê┘â
      expect(res.payload.data.imagingQueue.map(s => s.id)).toEqual(['study-new', 'study-old']);
    });

    test('readyForReport uses status IN (IMAGED, PENDING_REPORT) and readyForDelivery uses REPORTED', async () => {
      const prisma = createPrisma();
      prisma.radiologyAppointment.findMany.mockResolvedValue([]);
      prisma.radiologyAppointment.count.mockResolvedValue(0);
      prisma.radiologyStudy.findMany.mockResolvedValue([makeStudy({ status: 'PENDING_REPORT' })]);
      prisma.radiologyStudy.count.mockResolvedValue(1);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getDailyQueue(req({ query: {} }), res);

      const reportArgs = prisma.radiologyStudy.findMany.mock.calls.find(c => Array.isArray(c[0].where.status?.in));
      expect(reportArgs[0].where.status.in).toEqual(['IMAGED', 'PENDING_REPORT']);

      const deliveryArgs = prisma.radiologyStudy.findMany.mock.calls.find(c => c[0].where.status === 'REPORTED');
      expect(deliveryArgs[0].where.status).toBe('REPORTED');
    });

    test('stuck excludes DELIVERED/CANCELLED/COMPLETED, uses createdAt < cutoff, and attaches stuckHours from statusHistory', async () => {
      const prisma = createPrisma();
      prisma.radiologyAppointment.findMany.mockResolvedValue([]);
      prisma.radiologyAppointment.count.mockResolvedValue(0);
      prisma.radiologyStudy.findMany.mockResolvedValue([makeStudy({ id: 'study-stuck' })]);
      prisma.radiologyStudy.count.mockResolvedValue(1);
      prisma.radiologyStudyStatusHistory.groupBy.mockResolvedValue([
        { studyId: 'study-stuck', _max: { createdAt: new Date(Date.now() - 4 * 3600 * 1000) } },
      ]);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getDailyQueue(req({ query: {} }), res);

      const stuckArgs = prisma.radiologyStudy.findMany.mock.calls.find(c => c[0].where.createdAt && c[0].where.createdAt.lt);
      expect(stuckArgs[0].where.orderStatus.in).toEqual(['PENDING', 'CHECKED_IN', 'IN_PROGRESS']);
      expect(stuckArgs[0].where.status.notIn).toEqual(['DELIVERED', 'CANCELLED']);
      expect(stuckArgs[0].where.createdAt.lt).toBeInstanceOf(Date);

      expect(prisma.radiologyStudyStatusHistory.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          by: ['studyId'],
          _max: { createdAt: true },
        })
      );

      const stuck = res.payload.data.stuck;
      expect(stuck).toHaveLength(1);
      expect(stuck[0].stuckHours).toBeCloseTo(4, 0);
    });

    test('stuckHours falls back to createdAt when no statusHistory exists', async () => {
      const prisma = createPrisma();
      prisma.radiologyAppointment.findMany.mockResolvedValue([]);
      prisma.radiologyAppointment.count.mockResolvedValue(0);
      prisma.radiologyStudy.findMany.mockResolvedValue([makeStudy({ id: 'study-stuck', createdAt: new Date(Date.now() - 6 * 3600 * 1000) })]);
      prisma.radiologyStudy.count.mockResolvedValue(1);
      prisma.radiologyStudyStatusHistory.groupBy.mockResolvedValue([]);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getDailyQueue(req({ query: {} }), res);

      expect(res.payload.data.stuck[0].stuckHours).toBeCloseTo(6, 0);
    });

    test('does not break the queue when statusHistory grouping fails', async () => {
      const prisma = createPrisma();
      prisma.radiologyAppointment.findMany.mockResolvedValue([]);
      prisma.radiologyAppointment.count.mockResolvedValue(0);
      prisma.radiologyStudy.findMany.mockResolvedValue([makeStudy({ id: 'study-stuck' })]);
      prisma.radiologyStudy.count.mockResolvedValue(1);
      prisma.radiologyStudyStatusHistory.groupBy.mockRejectedValue(new Error('db down'));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getDailyQueue(req({ query: {} }), res);

      expect(res.statusCode).toBe(200);
      expect(Number.isFinite(res.payload.data.stuck[0].stuckHours)).toBe(true);
    });

    test('applies deviceName and modality filters and caps the limit at 100', async () => {
      const prisma = createPrisma();
      prisma.radiologyAppointment.findMany.mockResolvedValue([]);
      prisma.radiologyAppointment.count.mockResolvedValue(0);
      prisma.radiologyStudy.findMany.mockResolvedValue([]);
      prisma.radiologyStudy.count.mockResolvedValue(0);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getDailyQueue(req({ query: { deviceName: 'CT', modality: 'CT', limit: '500' } }), res);

      expect(res.statusCode).toBe(200);

      const studyArgs = prisma.radiologyStudy.findMany.mock.calls.filter(c => c[0].where.status === 'PENDING_IMAGING');
      expect(studyArgs[0][0].where.deviceName).toEqual({ contains: 'CT', mode: 'insensitive' });
      expect(studyArgs[0][0].where.modality).toBe('CT');

      const apptArgs = prisma.radiologyAppointment.findMany.mock.calls[0][0];
      expect(apptArgs.where.deviceName).toEqual({ contains: 'CT', mode: 'insensitive' });
      expect(apptArgs.take).toBe(100);
    });

    test('limit defaults to 100 when not provided', async () => {
      const prisma = createPrisma();
      prisma.radiologyAppointment.findMany.mockResolvedValue([]);
      prisma.radiologyAppointment.count.mockResolvedValue(0);
      prisma.radiologyStudy.findMany.mockResolvedValue([]);
      prisma.radiologyStudy.count.mockResolvedValue(0);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getDailyQueue(req({ query: {} }), res);

      expect(prisma.radiologyAppointment.findMany.mock.calls[0][0].take).toBe(100);
    });
  });
});
