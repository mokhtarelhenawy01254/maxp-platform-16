jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn()
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const controller = require('../../controller/labSampleTypesController');

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
    })
  };
  return response;
};

const createMockPrisma = () => {
  const prisma = {
    labSampleType: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'st-new', ...data })),
      update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'st1', ...data }))
    }
  };
  return prisma;
};

describe('labSampleTypesController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllSampleTypes', () => {
    test('returns company-scoped sample types ordered by name asc', async () => {
      const prisma = createMockPrisma();
      prisma.labSampleType.findMany.mockResolvedValue([
        { id: 'st1', name: '╪»┘à ┘ê╪▒┘è╪»┘è', instructions: '┘è╪ñ╪«╪░ ╪╣┘ä┘ë ┘à╪╣╪»╪⌐ ┘ü╪º╪▒╪║╪⌐', isActive: true },
        { id: 'st2', name: '╪¿┘ê┘ä', isActive: true }
      ]);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getAllSampleTypes({ user: { companyId: 'c1' }, query: {} }, res);

      expect(res.statusCode).toBe(200);
      expect(prisma.labSampleType.findMany).toHaveBeenCalledWith({
        where: { companyId: 'c1', isActive: true },
        orderBy: { name: 'asc' }
      });
      expect(res.payload.data).toHaveLength(2);
    });

    test('applies search by name', async () => {
      const prisma = createMockPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getAllSampleTypes({ user: { companyId: 'c1' }, query: { search: '╪»┘à' } }, res);

      expect(prisma.labSampleType.findMany).toHaveBeenCalledWith({
        where: {
          companyId: 'c1',
          isActive: true,
          name: { contains: '╪»┘à', mode: 'insensitive' }
        },
        orderBy: { name: 'asc' }
      });
    });

    test('shows inactive types when includeInactive=true', async () => {
      const prisma = createMockPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getAllSampleTypes({ user: { companyId: 'c1' }, query: { includeInactive: 'true' } }, res);

      expect(prisma.labSampleType.findMany).toHaveBeenCalledWith({
        where: { companyId: 'c1' },
        orderBy: { name: 'asc' }
      });
    });

    test('returns 403 when companyId is missing', async () => {
      const res = createResponse();
      await controller.getAllSampleTypes({ user: {}, query: {} }, res);
      expect(res.statusCode).toBe(403);
      expect(res.payload.success).toBe(false);
    });
  });

  describe('createSampleType', () => {
    test('creates a sample type with optional instructions', async () => {
      const prisma = createMockPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createSampleType({
        user: { companyId: 'c1' },
        body: { name: '╪»┘à ┘ê╪▒┘è╪»┘è', instructions: '┘è╪ñ╪«╪░ ┘é╪¿┘ä ╪º┘ä╪ú┘â┘ä' }
      }, res);

      expect(res.statusCode).toBe(200);
      expect(prisma.labSampleType.create).toHaveBeenCalledWith({
        data: {
          companyId: 'c1',
          name: '╪»┘à ┘ê╪▒┘è╪»┘è',
          instructions: '┘è╪ñ╪«╪░ ┘é╪¿┘ä ╪º┘ä╪ú┘â┘ä'
        }
      });
      expect(res.payload.data.companyId).toBe('c1');
    });

    test('trims and normalizes instructions to null when empty', async () => {
      const prisma = createMockPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createSampleType({
        user: { companyId: 'c1' },
        body: { name: '╪¿┘ê┘ä', instructions: '   ' }
      }, res);

      expect(prisma.labSampleType.create).toHaveBeenCalledWith({
        data: {
          companyId: 'c1',
          name: '╪¿┘ê┘ä',
          instructions: null
        }
      });
      expect(res.statusCode).toBe(200);
    });

    test('requires the sample type name', async () => {
      getSharedPrismaClient.mockReturnValue(createMockPrisma());
      const res = createResponse();
      await controller.createSampleType({ user: { companyId: 'c1' }, body: { name: '' } }, res);
      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('╪º╪│┘à ┘å┘ê╪╣ ╪º┘ä╪╣┘è┘å╪⌐ ┘à╪╖┘ä┘ê╪¿');
    });

    test('returns 403 when companyId is missing', async () => {
      const res = createResponse();
      await controller.createSampleType({ user: {}, body: { name: '╪»┘à' } }, res);
      expect(res.statusCode).toBe(403);
      expect(res.payload.success).toBe(false);
    });
  });

  describe('updateSampleType', () => {
    test('updates whitelisted fields (name, instructions, isActive)', async () => {
      const prisma = createMockPrisma();
      prisma.labSampleType.findFirst.mockResolvedValueOnce({ id: 'st1', companyId: 'c1', name: '┘é╪»┘è┘à' });
      prisma.labSampleType.update.mockResolvedValue({ id: 'st1', name: '┘à╪¡╪»╪½', instructions: null, isActive: false });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.updateSampleType({
        user: { companyId: 'c1' },
        params: { id: 'st1' },
        body: { name: '┘à╪¡╪»╪½', instructions: '', isActive: false }
      }, res);

      expect(res.statusCode).toBe(200);
      expect(prisma.labSampleType.findFirst).toHaveBeenCalledWith({ where: { id: 'st1', companyId: 'c1' } });
      expect(prisma.labSampleType.update).toHaveBeenCalledWith({
        where: { id: 'st1' },
        data: { name: '┘à╪¡╪»╪½', instructions: null, isActive: false }
      });
    });

    test('ignores fields outside the whitelist', async () => {
      const prisma = createMockPrisma();
      prisma.labSampleType.findFirst.mockResolvedValue({ id: 'st1', companyId: 'c1', name: '╪»┘à' });
      prisma.labSampleType.update.mockResolvedValue({ id: 'st1', name: '╪»┘à' });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.updateSampleType({
        user: { companyId: 'c1' },
        params: { id: 'st1' },
        body: { name: '╪»┘à', companyId: 'other', createdAt: '2020-01-01' }
      }, res);

      expect(prisma.labSampleType.update).toHaveBeenCalledWith({
        where: { id: 'st1' },
        data: { name: '╪»┘à' }
      });
      expect(res.statusCode).toBe(200);
    });

    test('requires a non-empty name when updating it', async () => {
      const prisma = createMockPrisma();
      prisma.labSampleType.findFirst.mockResolvedValue({ id: 'st1', companyId: 'c1', name: '╪»┘à' });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.updateSampleType({
        user: { companyId: 'c1' },
        params: { id: 'st1' },
        body: { name: '  ' }
      }, res);
      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('╪º╪│┘à ┘å┘ê╪╣ ╪º┘ä╪╣┘è┘å╪⌐ ┘à╪╖┘ä┘ê╪¿');
    });

    test('returns 404 for a sample type from another company', async () => {
      const prisma = createMockPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.updateSampleType({
        user: { companyId: 'c1' },
        params: { id: 'other' },
        body: { name: 'x' }
      }, res);
      expect(res.statusCode).toBe(404);
      expect(res.payload.success).toBe(false);
    });
  });

  describe('deleteSampleType', () => {
    test('soft deletes the sample type (isActive=false)', async () => {
      const prisma = createMockPrisma();
      prisma.labSampleType.findFirst.mockResolvedValue({ id: 'st1', companyId: 'c1', name: '╪»┘à' });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.deleteSampleType({ user: { companyId: 'c1' }, params: { id: 'st1' } }, res);

      expect(res.statusCode).toBe(200);
      expect(prisma.labSampleType.findFirst).toHaveBeenCalledWith({ where: { id: 'st1', companyId: 'c1' } });
      expect(prisma.labSampleType.update).toHaveBeenCalledWith({ where: { id: 'st1' }, data: { isActive: false } });
      expect(res.payload.message).toBe('╪¬┘à ╪¡╪░┘ü ┘å┘ê╪╣ ╪º┘ä╪╣┘è┘å╪⌐');
    });

    test('returns 404 for a sample type from another company', async () => {
      const prisma = createMockPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.deleteSampleType({ user: { companyId: 'c1' }, params: { id: 'other' } }, res);
      expect(res.statusCode).toBe(404);
      expect(res.payload.success).toBe(false);
    });
  });
});
