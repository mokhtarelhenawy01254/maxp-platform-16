jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn()
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const controller = require('../../controller/labContractsController');

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
    labContract: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'c-new', ...data })),
      update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'c1', ...data }))
    }
  };
  return prisma;
};

describe('labContractsController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllContracts', () => {
    test('returns company-scoped active contracts ordered by name asc', async () => {
      const prisma = createMockPrisma();
      prisma.labContract.findMany.mockResolvedValue([
        { id: 'c2', companyId: 'c1', name: '┘à╪│╪¬╪┤┘ü┘ë ╪º┘ä┘å┘ê╪▒', region: '╪º┘ä┘é╪º┘ç╪▒╪⌐', discountType: 'PERCENTAGE', discountPercent: 10, externalSample: false, isActive: true },
        { id: 'c1', companyId: 'c1', name: '┘à╪╣┘à┘ä ╪º┘ä┘ü╪º', region: '╪º┘ä╪¼┘è╪▓╪⌐', discountType: 'CUSTOM', discountPercent: 0, externalSample: true, isActive: true }
      ]);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getAllContracts({ user: { companyId: 'c1' }, query: {} }, res);

      expect(res.statusCode).toBe(200);
      expect(prisma.labContract.findMany).toHaveBeenCalledWith({
        where: { companyId: 'c1', isActive: true },
        orderBy: { name: 'asc' }
      });
      expect(res.payload.data).toHaveLength(2);
      expect(res.payload.success).toBe(true);
    });

    test('applies search filter on name and region', async () => {
      const prisma = createMockPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getAllContracts({ user: { companyId: 'c1' }, query: { search: '╪º┘ä┘å┘ê╪▒' } }, res);

      expect(prisma.labContract.findMany).toHaveBeenCalledWith({
        where: {
          companyId: 'c1',
          isActive: true,
          OR: [
            { name: { contains: '╪º┘ä┘å┘ê╪▒', mode: 'insensitive' } },
            { region: { contains: '╪º┘ä┘å┘ê╪▒', mode: 'insensitive' } }
          ]
        },
        orderBy: { name: 'asc' }
      });
      expect(res.statusCode).toBe(200);
    });

    test('includes inactive when includeInactive=true', async () => {
      const prisma = createMockPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getAllContracts({ user: { companyId: 'c1' }, query: { includeInactive: 'true' } }, res);

      expect(prisma.labContract.findMany).toHaveBeenCalledWith({
        where: { companyId: 'c1' },
        orderBy: { name: 'asc' }
      });
    });

    test('returns 403 when companyId is missing', async () => {
      const res = createResponse();
      await controller.getAllContracts({ user: {}, query: {} }, res);
      expect(res.statusCode).toBe(403);
      expect(res.payload.success).toBe(false);
    });
  });

  describe('createContract', () => {
    test('requires the contract name', async () => {
      getSharedPrismaClient.mockReturnValue(createMockPrisma());
      const res = createResponse();
      await controller.createContract({ user: { companyId: 'c1' }, body: { name: '' } }, res);
      expect(res.statusCode).toBe(400);
      expect(res.payload.success).toBe(false);
      expect(res.payload.error).toBe('╪º╪│┘à ╪º┘ä╪¬╪╣╪º┘é╪» ┘à╪╖┘ä┘ê╪¿');
    });

    test('creates a contract with normalized fields and defaults', async () => {
      const prisma = createMockPrisma();
      prisma.labContract.create.mockResolvedValue({
        id: 'c-new',
        companyId: 'c1',
        name: '┘à╪╣┘à┘ä ╪º┘ä┘ü╪º',
        region: '╪º┘ä╪¼┘è╪▓╪⌐',
        governorate: '╪º┘ä╪¼┘è╪▓╪⌐',
        discountType: 'PERCENTAGE',
        discountPercent: 10,
        externalSample: true,
        isActive: true
      });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createContract({
        user: { companyId: 'c1' },
        body: { name: '  ┘à╪╣┘à┘ä ╪º┘ä┘ü╪º  ', region: '╪º┘ä╪¼┘è╪▓╪⌐', governorate: '╪º┘ä╪¼┘è╪▓╪⌐', discountType: 'percentage', discountPercent: '10', externalSample: 'true' }
      }, res);

      expect(res.statusCode).toBe(200);
      expect(prisma.labContract.create).toHaveBeenCalledWith({
        data: {
          companyId: 'c1',
          name: '┘à╪╣┘à┘ä ╪º┘ä┘ü╪º',
          region: '╪º┘ä╪¼┘è╪▓╪⌐',
          governorate: '╪º┘ä╪¼┘è╪▓╪⌐',
          discountType: 'PERCENTAGE',
          discountPercent: 10,
          externalSample: true
        }
      });
      expect(res.payload.data.discountType).toBe('PERCENTAGE');
    });

    test('clamps discountPercent to 0-100', async () => {
      const prisma = createMockPrisma();
      prisma.labContract.create.mockResolvedValue({ id: 'c-new', name: '╪¬╪╣╪º┘é╪»', discountType: 'PERCENTAGE', discountPercent: 100, externalSample: false });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createContract({ user: { companyId: 'c1' }, body: { name: '╪¬╪╣╪º┘é╪»', discountPercent: 150 } }, res);

      expect(prisma.labContract.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ discountPercent: 100 })
      }));
      expect(res.statusCode).toBe(200);

      const res2 = createResponse();
      await controller.createContract({ user: { companyId: 'c1' }, body: { name: '╪¬╪╣╪º┘é╪»', discountPercent: -20 } }, res2);
      expect(prisma.labContract.create).toHaveBeenLastCalledWith(expect.objectContaining({
        data: expect.objectContaining({ discountPercent: 0 })
      }));
    });

    test('rejects an invalid discountType', async () => {
      getSharedPrismaClient.mockReturnValue(createMockPrisma());
      const res = createResponse();
      await controller.createContract({ user: { companyId: 'c1' }, body: { name: '╪¬╪╣╪º┘é╪»', discountType: 'FIXED' } }, res);
      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('┘å┘ê╪╣ ╪º┘ä╪«╪╡┘à ╪║┘è╪▒ ╪╡╪º┘ä╪¡');
    });

    test('returns 403 when companyId is missing', async () => {
      const res = createResponse();
      await controller.createContract({ user: {}, body: { name: '╪¬╪╣╪º┘é╪»' } }, res);
      expect(res.statusCode).toBe(403);
      expect(res.payload.success).toBe(false);
    });
  });

  describe('updateContract', () => {
    test('updates only whitelisted fields and clamps discountPercent', async () => {
      const prisma = createMockPrisma();
      prisma.labContract.findFirst.mockResolvedValue({ id: 'c1', companyId: 'c1', name: '┘é╪»┘è┘à' });
      prisma.labContract.update.mockResolvedValue({ id: 'c1', name: '┘à╪¡╪»╪½', region: '╪º┘ä┘é╪º┘ç╪▒╪⌐', governorate: '╪º┘ä┘é╪º┘ç╪▒╪⌐', discountType: 'CUSTOM', discountPercent: 100, externalSample: true, isActive: false });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.updateContract({
        user: { companyId: 'c1' },
        params: { id: 'c1' },
        body: {
          name: '┘à╪¡╪»╪½',
          region: '╪º┘ä┘é╪º┘ç╪▒╪⌐',
          governorate: '╪º┘ä┘é╪º┘ç╪▒╪⌐',
          discountType: 'custom',
          discountPercent: 200,
          externalSample: true,
          isActive: false
        }
      }, res);

      expect(res.statusCode).toBe(200);
      expect(prisma.labContract.findFirst).toHaveBeenCalledWith({ where: { id: 'c1', companyId: 'c1' } });
      expect(prisma.labContract.update).toHaveBeenCalledWith({
        where: { id: 'c1' },
        data: {
          name: '┘à╪¡╪»╪½',
          region: '╪º┘ä┘é╪º┘ç╪▒╪⌐',
          governorate: '╪º┘ä┘é╪º┘ç╪▒╪⌐',
          discountType: 'CUSTOM',
          discountPercent: 100,
          externalSample: true,
          isActive: false
        }
      });
    });

    test('rejects an invalid discountType on update', async () => {
      const prisma = createMockPrisma();
      prisma.labContract.findFirst.mockResolvedValue({ id: 'c1', companyId: 'c1', name: '┘é╪»┘è┘à' });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.updateContract({
        user: { companyId: 'c1' },
        params: { id: 'c1' },
        body: { discountType: 'INVALID' }
      }, res);
      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('┘å┘ê╪╣ ╪º┘ä╪«╪╡┘à ╪║┘è╪▒ ╪╡╪º┘ä╪¡');
    });

    test('returns 404 for a contract from another company', async () => {
      const prisma = createMockPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.updateContract({ user: { companyId: 'c1' }, params: { id: 'other' }, body: { name: 'x' } }, res);
      expect(res.statusCode).toBe(404);
      expect(res.payload.success).toBe(false);
      expect(res.payload.error).toBe('╪º┘ä╪¬╪╣╪º┘é╪» ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»');
    });
  });

  describe('deleteContract', () => {
    test('soft deletes the contract (isActive=false)', async () => {
      const prisma = createMockPrisma();
      prisma.labContract.findFirst.mockResolvedValue({ id: 'c1', companyId: 'c1' });
      prisma.labContract.update.mockResolvedValue({ id: 'c1', isActive: false });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.deleteContract({ user: { companyId: 'c1' }, params: { id: 'c1' } }, res);

      expect(res.statusCode).toBe(200);
      expect(prisma.labContract.findFirst).toHaveBeenCalledWith({ where: { id: 'c1', companyId: 'c1' } });
      expect(prisma.labContract.update).toHaveBeenCalledWith({ where: { id: 'c1' }, data: { isActive: false } });
      expect(res.payload.message).toBe('╪¬┘à ╪¡╪░┘ü ╪º┘ä╪¬╪╣╪º┘é╪»');
    });

    test('returns 404 for a contract from another company', async () => {
      const prisma = createMockPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.deleteContract({ user: { companyId: 'c1' }, params: { id: 'other' } }, res);
      expect(res.statusCode).toBe(404);
      expect(res.payload.success).toBe(false);
      expect(res.payload.error).toBe('╪º┘ä╪¬╪╣╪º┘é╪» ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»');
    });
  });
});
