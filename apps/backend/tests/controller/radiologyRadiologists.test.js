jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const controller = require('../../controller/radiologyRadiologistsController');

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
    radiologyRadiologist: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    radiologyStudy: {
      findFirst: jest.fn(),
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

const makeRadiologist = (overrides = {}) => ({
  id: 'rad-1',
  companyId: 'company-1',
  name: '╪». ╪│╪º╪▒╪⌐ ╪ú╪¡┘à╪»',
  location: 'ON_SITE',
  isActive: true,
  createdAt: new Date('2026-08-10T10:00:00.000Z'),
  updatedAt: new Date('2026-08-10T10:00:00.000Z'),
  ...overrides,
});

const makeStudy = (overrides = {}) => ({
  id: 'study-1',
  companyId: 'company-1',
  studyNumber: 'RAD-20260810-1234',
  patientName: '┘à╪¡┘à╪» ╪╣┘ä┘è',
  status: 'PENDING_REPORT',
  ...overrides,
});

describe('radiologyRadiologistsController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listRadiologists', () => {
    test('lists active radiologists scoped to the company and filters by search', async () => {
      const prisma = createPrisma();
      prisma.radiologyRadiologist.findMany.mockResolvedValue([makeRadiologist()]);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.listRadiologists(req({ query: { search: '╪│╪º╪▒╪⌐' } }), res);

      const args = prisma.radiologyRadiologist.findMany.mock.calls[0][0];
      expect(args.where).toEqual({
        companyId: 'company-1',
        isActive: true,
        OR: [{ name: { contains: '╪│╪º╪▒╪⌐', mode: 'insensitive' } }],
      });
      expect(res.statusCode).toBe(200);
      expect(res.payload.data).toHaveLength(1);
    });

    test('includes inactive radiologists when includeInactive=true', async () => {
      const prisma = createPrisma();
      prisma.radiologyRadiologist.findMany.mockResolvedValue([]);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.listRadiologists(req({ query: { includeInactive: 'true' } }), res);

      const args = prisma.radiologyRadiologist.findMany.mock.calls[0][0];
      expect(args.where).toEqual({ companyId: 'company-1' });
    });

    test('returns 403 when companyId is missing', async () => {
      const prisma = createPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.listRadiologists(req({ user: {} }), res);

      expect(res.statusCode).toBe(403);
      expect(res.payload.error).toBe('╪║┘è╪▒ ┘à╪╡╪▒╪¡');
      expect(prisma.radiologyRadiologist.findMany).not.toHaveBeenCalled();
    });
  });

  describe('createRadiologist', () => {
    test('creates a radiologist with a default ON_SITE location', async () => {
      const prisma = createPrisma();
      prisma.radiologyRadiologist.create.mockImplementation(({ data }) => Promise.resolve({ id: 'rad-1', ...data }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createRadiologist(req({ body: { name: '╪». ╪│╪º╪▒╪⌐ ╪ú╪¡┘à╪»' } }), res);

      expect(res.statusCode).toBe(200);
      const data = prisma.radiologyRadiologist.create.mock.calls[0][0].data;
      expect(data.companyId).toBe('company-1');
      expect(data.name).toBe('╪». ╪│╪º╪▒╪⌐ ╪ú╪¡┘à╪»');
      expect(data.location).toBe('ON_SITE');
    });

    test('accepts an OFF_SITE location', async () => {
      const prisma = createPrisma();
      prisma.radiologyRadiologist.create.mockImplementation(({ data }) => Promise.resolve({ id: 'rad-2', ...data }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createRadiologist(req({ body: { name: '╪». ┘à╪¡┘à╪»', location: 'OFF_SITE' } }), res);

      expect(res.statusCode).toBe(200);
      expect(prisma.radiologyRadiologist.create.mock.calls[0][0].data.location).toBe('OFF_SITE');
    });

    test('rejects an invalid location', async () => {
      const prisma = createPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createRadiologist(req({ body: { name: '╪». ╪│╪º╪▒╪⌐', location: 'REMOTE_X' } }), res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('┘à┘ê┘é╪╣ ╪ú╪«╪╡╪º╪ª┘è ╪º┘ä╪ú╪┤╪╣╪⌐ ╪║┘è╪▒ ╪╡╪¡┘è╪¡');
      expect(prisma.radiologyRadiologist.create).not.toHaveBeenCalled();
    });

    test('rejects a missing name', async () => {
      const prisma = createPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createRadiologist(req({ body: {} }), res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('╪º╪│┘à ╪ú╪«╪╡╪º╪ª┘è ╪º┘ä╪ú╪┤╪╣╪⌐ ┘à╪╖┘ä┘ê╪¿');
      expect(prisma.radiologyRadiologist.create).not.toHaveBeenCalled();
    });
  });

  describe('updateRadiologist', () => {
    test('updates name and location of a company radiologist', async () => {
      const prisma = createPrisma();
      prisma.radiologyRadiologist.findFirst.mockResolvedValue(makeRadiologist());
      prisma.radiologyRadiologist.update.mockImplementation(({ data }) => Promise.resolve({ ...makeRadiologist(), ...data }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.updateRadiologist(
        req({ params: { id: 'rad-1' }, body: { name: '╪». ╪│╪º╪▒╪⌐ ┘à╪¡┘à╪»', location: 'off_site' } }),
        res
      );

      expect(res.statusCode).toBe(200);
      expect(prisma.radiologyRadiologist.update).toHaveBeenCalledWith({
        where: { id: 'rad-1' },
        data: { name: '╪». ╪│╪º╪▒╪⌐ ┘à╪¡┘à╪»', location: 'OFF_SITE' },
      });
    });

    test('rejects an invalid location on update', async () => {
      const prisma = createPrisma();
      prisma.radiologyRadiologist.findFirst.mockResolvedValue(makeRadiologist());
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.updateRadiologist(req({ params: { id: 'rad-1' }, body: { location: 'BAD' } }), res);

      expect(res.statusCode).toBe(400);
      expect(prisma.radiologyRadiologist.update).not.toHaveBeenCalled();
    });

    test('returns 404 for a foreign radiologist', async () => {
      const prisma = createPrisma();
      prisma.radiologyRadiologist.findFirst.mockResolvedValue(null);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.updateRadiologist(req({ params: { id: 'foreign' }, body: { name: 'x' } }), res);

      expect(res.statusCode).toBe(404);
      expect(res.payload.error).toBe('╪ú╪«╪╡╪º╪ª┘è ╪º┘ä╪ú╪┤╪╣╪⌐ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»');
      expect(prisma.radiologyRadiologist.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteRadiologist', () => {
    test('soft-deletes via isActive false', async () => {
      const prisma = createPrisma();
      prisma.radiologyRadiologist.findFirst.mockResolvedValue(makeRadiologist());
      prisma.radiologyRadiologist.update.mockImplementation(({ data }) =>
        Promise.resolve({ ...makeRadiologist(), ...data }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.deleteRadiologist(req({ params: { id: 'rad-1' } }), res);

      expect(res.statusCode).toBe(200);
      expect(prisma.radiologyRadiologist.update).toHaveBeenCalledWith({
        where: { id: 'rad-1' },
        data: { isActive: false },
      });
      expect(res.payload.message).toBe('╪¬┘à ╪¡╪░┘ü ╪ú╪«╪╡╪º╪ª┘è ╪º┘ä╪ú╪┤╪╣╪⌐');
    });

    test('returns 404 for a foreign radiologist', async () => {
      const prisma = createPrisma();
      prisma.radiologyRadiologist.findFirst.mockResolvedValue(null);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.deleteRadiologist(req({ params: { id: 'foreign' } }), res);

      expect(res.statusCode).toBe(404);
      expect(prisma.radiologyRadiologist.update).not.toHaveBeenCalled();
    });
  });

  describe('assignRadiologist', () => {
    test('assigns a radiologist and sets the snapshot fields', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findFirst.mockResolvedValue(makeStudy());
      prisma.radiologyRadiologist.findFirst.mockResolvedValue(makeRadiologist());
      prisma.radiologyStudy.update.mockImplementation(({ data }) => Promise.resolve({ ...makeStudy(), ...data }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.assignRadiologist(req({ params: { id: 'study-1' }, body: { radiologistId: 'rad-1' } }), res);

      expect(res.statusCode).toBe(200);
      const args = prisma.radiologyStudy.update.mock.calls[0][0];
      expect(args.where).toEqual({ id: 'study-1' });
      expect(args.data.assignedRadiologistId).toBe('rad-1');
      expect(args.data.assignedRadiologistName).toBe('╪». ╪│╪º╪▒╪⌐ ╪ú╪¡┘à╪»');
      expect(args.data.radiologistLocation).toBe('ON_SITE');
      expect(args.data.reportAssignedAt).toBeInstanceOf(Date);
      expect(prisma.radiologyRadiologist.findFirst).toHaveBeenCalledWith({
        where: { id: 'rad-1', companyId: 'company-1' },
      });
    });

    test('rejects a foreign radiologist', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findFirst.mockResolvedValue(makeStudy());
      prisma.radiologyRadiologist.findFirst.mockResolvedValue(null);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.assignRadiologist(req({ params: { id: 'study-1' }, body: { radiologistId: 'foreign' } }), res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('╪ú╪«╪╡╪º╪ª┘è ╪º┘ä╪ú╪┤╪╣╪⌐ ┘ä╪º ┘è┘å╪¬┘à┘è ┘ä┘ç╪░┘ç ╪º┘ä╪┤╪▒┘â╪⌐');
      expect(prisma.radiologyStudy.update).not.toHaveBeenCalled();
    });

    test('rejects a study outside the company', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findFirst.mockResolvedValue(null);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.assignRadiologist(req({ params: { id: 'foreign' }, body: { radiologistId: 'rad-1' } }), res);

      expect(res.statusCode).toBe(404);
      expect(res.payload.error).toBe('╪º┘ä╪¡╪º┘ä╪⌐ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»╪⌐');
      expect(prisma.radiologyStudy.update).not.toHaveBeenCalled();
    });

    test('clears the assignment when radiologistId is null', async () => {
      const prisma = createPrisma();
      prisma.radiologyStudy.findFirst.mockResolvedValue(makeStudy({ assignedRadiologistId: 'rad-1' }));
      prisma.radiologyStudy.update.mockImplementation(({ data }) => Promise.resolve({ ...makeStudy(), ...data }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.assignRadiologist(req({ params: { id: 'study-1' }, body: { radiologistId: null } }), res);

      expect(res.statusCode).toBe(200);
      const args = prisma.radiologyStudy.update.mock.calls[0][0];
      expect(args.data.assignedRadiologistId).toBeNull();
      expect(args.data.assignedRadiologistName).toBeNull();
      expect(args.data.radiologistLocation).toBeNull();
      expect(args.data.reportAssignedAt).toBeNull();
      expect(prisma.radiologyRadiologist.findFirst).not.toHaveBeenCalled();
    });

    test('returns 403 when companyId is missing', async () => {
      const prisma = createPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.assignRadiologist(req({ user: {}, params: { id: 'study-1' }, body: { radiologistId: 'rad-1' } }), res);

      expect(res.statusCode).toBe(403);
      expect(res.payload.error).toBe('╪║┘è╪▒ ┘à╪╡╪▒╪¡');
      expect(prisma.radiologyStudy.findFirst).not.toHaveBeenCalled();
    });
  });
});
