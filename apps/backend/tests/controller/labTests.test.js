jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn()
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const controller = require('../../controller/labTestsController');

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
    $transaction: jest.fn(async (arg) => {
      if (typeof arg === 'function') return arg(prisma);
      if (Array.isArray(arg)) {
        for (const op of arg) await op;
      }
      return undefined;
    }),
    labTest: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 't-new', ...data })),
      update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 't1', ...data }))
    },
    labTestParameter: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'p-new', ...data })),
      update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'p1', ...data })),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      createMany: jest.fn().mockImplementation(({ data }) => Promise.resolve({ count: data.length }))
    }
  };
  return prisma;
};

describe('labTestsController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllTests', () => {
    test('returns paginated tests with active parameter counts ordered by name asc', async () => {
      const prisma = createMockPrisma();
      prisma.labTest.findMany.mockResolvedValue([
        { id: 't1', name: '╪╡┘ê╪▒╪⌐ ╪»┘à ┘â╪º┘à┘ä╪⌐', category: '╪»┘à', abbreviation: 'CBC', sampleType: '╪»┘à ┘ê╪▒┘è╪»┘è', price: 50, isActive: true, _count: { parameters: 2 } },
        { id: 't2', name: '╪│┘â╪▒ ╪╡╪º╪ª┘à', category: '┘â┘è┘à┘è╪º╪í', price: 40, isActive: true, _count: { parameters: 0 } }
      ]);
      prisma.labTest.count.mockResolvedValue(37);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getAllTests({ user: { companyId: 'c1' }, query: {} }, res);

      expect(res.statusCode).toBe(200);
      expect(prisma.labTest.findMany).toHaveBeenCalledWith({
        where: { companyId: 'c1', isActive: true },
        include: { _count: { select: { parameters: { where: { isActive: true } } } } },
        orderBy: { name: 'asc' },
        skip: 0,
        take: 50
      });
      expect(res.payload.data).toHaveLength(2);
      expect(res.payload.data[0].parameterCount).toBe(2);
      expect(res.payload.data[0]._count).toBeUndefined();
      expect(res.payload.total).toBe(37);
      expect(res.payload.page).toBe(1);
      expect(res.payload.limit).toBe(50);
    });

    test('applies search + category filter + pagination', async () => {
      const prisma = createMockPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getAllTests(
        { user: { companyId: 'c1' }, query: { search: '╪»┘à', category: '┘â┘è┘à┘è╪º╪í', page: '2', limit: '10' } },
        res
      );

      expect(prisma.labTest.findMany).toHaveBeenCalledWith({
        where: {
          companyId: 'c1',
          isActive: true,
          category: '┘â┘è┘à┘è╪º╪í',
          OR: [
            { name: { contains: '╪»┘à', mode: 'insensitive' } },
            { category: { contains: '╪»┘à', mode: 'insensitive' } },
            { abbreviation: { contains: '╪»┘à', mode: 'insensitive' } }
          ]
        },
        include: { _count: { select: { parameters: { where: { isActive: true } } } } },
        orderBy: { name: 'asc' },
        skip: 10,
        take: 10
      });
      expect(prisma.labTest.count).toHaveBeenCalledWith({
        where: {
          companyId: 'c1',
          isActive: true,
          category: '┘â┘è┘à┘è╪º╪í',
          OR: [
            { name: { contains: '╪»┘à', mode: 'insensitive' } },
            { category: { contains: '╪»┘à', mode: 'insensitive' } },
            { abbreviation: { contains: '╪»┘à', mode: 'insensitive' } }
          ]
        }
      });
    });

    test('caps limit at 200 and shows inactive when includeInactive=true', async () => {
      const prisma = createMockPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getAllTests({ user: { companyId: 'c1' }, query: { limit: '999', includeInactive: 'true' } }, res);

      expect(prisma.labTest.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { companyId: 'c1' },
        take: 200
      }));
    });

    test('returns 403 when companyId is missing', async () => {
      const res = createResponse();
      await controller.getAllTests({ user: {}, query: {} }, res);
      expect(res.statusCode).toBe(403);
      expect(res.payload.success).toBe(false);
    });
  });

  describe('getTestById', () => {
    test('returns the test with active parameters ordered by sortOrder', async () => {
      const prisma = createMockPrisma();
      prisma.labTest.findFirst.mockResolvedValue({
        id: 't1',
        companyId: 'c1',
        name: '╪│┘â╪▒ ╪╡╪º╪ª┘à',
        parameters: [
          { id: 'p1', name: '╪º┘ä╪¼┘ä┘ê┘â┘ê╪▓', sortOrder: 0 },
          { id: 'p2', name: '╪º┘ä╪│┘â╪▒ ╪º┘ä╪¬╪▒╪º┘â┘à┘è', sortOrder: 1 }
        ]
      });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getTestById({ user: { companyId: 'c1' }, params: { id: 't1' } }, res);

      expect(res.statusCode).toBe(200);
      expect(prisma.labTest.findFirst).toHaveBeenCalledWith({
        where: { id: 't1', companyId: 'c1' },
        include: { parameters: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } } }
      });
      expect(res.payload.data.parameters).toHaveLength(2);
    });

    test('returns 404 for a test from another company', async () => {
      const prisma = createMockPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getTestById({ user: { companyId: 'c1' }, params: { id: 'other' } }, res);

      expect(res.statusCode).toBe(404);
      expect(res.payload.success).toBe(false);
    });
  });

  describe('createTest', () => {
    test('requires the test name', async () => {
      getSharedPrismaClient.mockReturnValue(createMockPrisma());
      const res = createResponse();
      await controller.createTest({ user: { companyId: 'c1' }, body: { name: '' } }, res);
      expect(res.statusCode).toBe(400);
      expect(res.payload.success).toBe(false);
    });

    test('creates a test with nested parameters and normalizes resultOptions', async () => {
      const prisma = createMockPrisma();
      prisma.labTest.create.mockResolvedValue({
        id: 't-new',
        companyId: 'c1',
        name: '╪╡┘ê╪▒╪⌐ ╪»┘à ┘â╪º┘à┘ä╪⌐',
        price: 75,
        parameters: [{ id: 'p1', name: '┘ç┘è┘à┘ê╪¼┘ä┘ê╪¿┘è┘å', unit: 'g/dL', referenceRange: '13-17', resultOptions: ['┘à┘å╪«┘ü╪╢', '╪╖╪¿┘è╪╣┘è', '┘à╪▒╪¬┘ü╪╣'], showFlag: true, sortOrder: 0 }]
      });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createTest({
        user: { companyId: 'c1' },
        body: {
          name: '╪╡┘ê╪▒╪⌐ ╪»┘à ┘â╪º┘à┘ä╪⌐',
          category: '╪»┘à',
          abbreviation: 'CBC',
          price: '75',
          parameters: [
            { name: '┘ç┘è┘à┘ê╪¼┘ä┘ê╪¿┘è┘å', unit: 'g/dL', referenceRange: '13-17', resultOptions: '["┘à┘å╪«┘ü╪╢","╪╖╪¿┘è╪╣┘è","┘à╪▒╪¬┘ü╪╣"]', showFlag: true, sortOrder: 0 }
          ]
        }
      }, res);

      expect(res.statusCode).toBe(200);
      expect(prisma.labTest.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          companyId: 'c1',
          name: '╪╡┘ê╪▒╪⌐ ╪»┘à ┘â╪º┘à┘ä╪⌐',
          category: '╪»┘à',
          abbreviation: 'CBC',
          price: 75,
          parameters: {
            create: [
              expect.objectContaining({
                companyId: 'c1',
                name: '┘ç┘è┘à┘ê╪¼┘ä┘ê╪¿┘è┘å',
                unit: 'g/dL',
                referenceRange: '13-17',
                resultOptions: ['┘à┘å╪«┘ü╪╢', '╪╖╪¿┘è╪╣┘è', '┘à╪▒╪¬┘ü╪╣'],
                showFlag: true,
                sortOrder: 0
              })
            ]
          }
        })
      }));
    });

    test('accepts comma-separated string resultOptions', async () => {
      const prisma = createMockPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createTest({
        user: { companyId: 'c1' },
        body: {
          name: '╪¬╪¡┘ä┘è┘ä ╪¿┘ê┘ä',
          price: 30,
          parameters: [{ name: '╪º┘ä╪¿╪▒┘ê╪¬┘è┘å', resultOptions: '╪│╪º┘ä╪¿,┘à┘ê╪¼╪¿' }]
        }
      }, res);

      expect(prisma.labTest.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          parameters: {
            create: [expect.objectContaining({ name: '╪º┘ä╪¿╪▒┘ê╪¬┘è┘å', resultOptions: ['╪│╪º┘ä╪¿', '┘à┘ê╪¼╪¿'] })]
          }
        })
      }));
      expect(res.statusCode).toBe(200);
    });

    test('rejects a negative price', async () => {
      const prisma = createMockPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createTest({ user: { companyId: 'c1' }, body: { name: '╪¬╪¡┘ä┘è┘ä', price: -5 } }, res);
      expect(res.statusCode).toBe(400);
      expect(res.payload.success).toBe(false);
    });

    test('rejects a parameter without a name', async () => {
      const prisma = createMockPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createTest({
        user: { companyId: 'c1' },
        body: { name: '╪¬╪¡┘ä┘è┘ä', parameters: [{ unit: 'mg' }] }
      }, res);
      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('╪º╪│┘à ╪º┘ä╪¿╪º╪▒╪º┘à┘è╪¬╪▒ ┘à╪╖┘ä┘ê╪¿');
    });

    test('returns 403 when companyId is missing', async () => {
      const res = createResponse();
      await controller.createTest({ user: {}, body: { name: '╪¬╪¡┘ä┘è┘ä' } }, res);
      expect(res.statusCode).toBe(403);
      expect(res.payload.success).toBe(false);
    });
  });

  describe('updateTest', () => {
    test('updates whitelisted fields and replaces all parameters', async () => {
      const prisma = createMockPrisma();
      prisma.labTest.findFirst
        .mockResolvedValueOnce({ id: 't1', companyId: 'c1', name: '┘é╪»┘è┘à' })
        .mockResolvedValue({ id: 't1', companyId: 'c1', name: '┘à╪¡╪»╪½', parameters: [] });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.updateTest({
        user: { companyId: 'c1' },
        params: { id: 't1' },
        body: {
          name: '┘à╪¡╪»╪½',
          price: 100,
          parameters: [
            { name: '╪¿-╪ú', unit: 'mg', referenceRange: '1-2', resultOptions: ['╪ú', '╪¿'], showFlag: false, sortOrder: 0 }
          ]
        }
      }, res);

      expect(prisma.labTestParameter.deleteMany).toHaveBeenCalledWith({ where: { testId: 't1' } });
      expect(prisma.labTestParameter.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            companyId: 'c1',
            testId: 't1',
            name: '╪¿-╪ú',
            unit: 'mg',
            referenceRange: '1-2',
            resultOptions: ['╪ú', '╪¿'],
            showFlag: false,
            sortOrder: 0
          })
        ]
      });
      expect(prisma.labTest.update).toHaveBeenCalledWith({
        where: { id: 't1' },
        data: expect.objectContaining({ name: '┘à╪¡╪»╪½', price: 100 })
      });
      expect(res.statusCode).toBe(200);
    });

    test('clears all parameters when an empty array is provided', async () => {
      const prisma = createMockPrisma();
      prisma.labTest.findFirst.mockResolvedValue({ id: 't1', companyId: 'c1', name: '┘é╪»┘è┘à' });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.updateTest({
        user: { companyId: 'c1' },
        params: { id: 't1' },
        body: { parameters: [] }
      }, res);

      expect(prisma.labTestParameter.deleteMany).toHaveBeenCalledWith({ where: { testId: 't1' } });
      expect(prisma.labTestParameter.createMany).not.toHaveBeenCalled();
    });

    test('returns 404 for a test from another company', async () => {
      const prisma = createMockPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.updateTest({ user: { companyId: 'c1' }, params: { id: 'other' }, body: { name: 'x' } }, res);
      expect(res.statusCode).toBe(404);
      expect(res.payload.success).toBe(false);
    });
  });

  describe('deleteTest', () => {
    test('soft deletes the test (isActive=false)', async () => {
      const prisma = createMockPrisma();
      prisma.labTest.findFirst.mockResolvedValue({ id: 't1', companyId: 'c1' });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.deleteTest({ user: { companyId: 'c1' }, params: { id: 't1' } }, res);

      expect(res.statusCode).toBe(200);
      expect(prisma.labTest.findFirst).toHaveBeenCalledWith({ where: { id: 't1', companyId: 'c1' } });
      expect(prisma.labTest.update).toHaveBeenCalledWith({ where: { id: 't1' }, data: { isActive: false } });
      expect(res.payload.message).toBe('╪¬┘à ╪¡╪░┘ü ╪º┘ä╪º╪«╪¬╪¿╪º╪▒');
    });

    test('returns 404 for a test from another company', async () => {
      const prisma = createMockPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.deleteTest({ user: { companyId: 'c1' }, params: { id: 'other' } }, res);
      expect(res.statusCode).toBe(404);
      expect(res.payload.success).toBe(false);
    });
  });

  describe('addParameter', () => {
    test('creates a parameter with the next sortOrder when not provided', async () => {
      const prisma = createMockPrisma();
      prisma.labTest.findFirst.mockResolvedValue({ id: 't1', companyId: 'c1' });
      prisma.labTestParameter.findFirst.mockResolvedValue({ sortOrder: 4 });
      prisma.labTestParameter.create.mockResolvedValue({ id: 'p-new', name: '╪¿┘è┘ä┘è╪▒┘ê╪¿┘è┘å', sortOrder: 5 });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.addParameter({
        user: { companyId: 'c1' },
        params: { id: 't1' },
        body: { name: '╪¿┘è┘ä┘è╪▒┘ê╪¿┘è┘å', unit: 'mg/dL', resultOptions: ['╪│╪º┘ä╪¿', '┘à┘ê╪¼╪¿'] }
      }, res);

      expect(res.statusCode).toBe(200);
      expect(prisma.labTestParameter.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          companyId: 'c1',
          testId: 't1',
          name: '╪¿┘è┘ä┘è╪▒┘ê╪¿┘è┘å',
          unit: 'mg/dL',
          resultOptions: ['╪│╪º┘ä╪¿', '┘à┘ê╪¼╪¿'],
          sortOrder: 5
        })
      });
    });

    test('uses the provided sortOrder directly', async () => {
      const prisma = createMockPrisma();
      prisma.labTest.findFirst.mockResolvedValue({ id: 't1', companyId: 'c1' });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.addParameter({
        user: { companyId: 'c1' },
        params: { id: 't1' },
        body: { name: '╪¿1', sortOrder: 7 }
      }, res);

      expect(prisma.labTestParameter.findFirst).not.toHaveBeenCalled();
      expect(prisma.labTestParameter.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ name: '╪¿1', sortOrder: 7 })
      });
    });

    test('requires a parameter name', async () => {
      const prisma = createMockPrisma();
      prisma.labTest.findFirst.mockResolvedValue({ id: 't1', companyId: 'c1' });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.addParameter({ user: { companyId: 'c1' }, params: { id: 't1' }, body: { unit: 'mg' } }, res);
      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('╪º╪│┘à ╪º┘ä╪¿╪º╪▒╪º┘à┘è╪¬╪▒ ┘à╪╖┘ä┘ê╪¿');
    });

    test('returns 404 when the test belongs to another company', async () => {
      const prisma = createMockPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.addParameter({ user: { companyId: 'c1' }, params: { id: 'other' }, body: { name: '╪¿' } }, res);
      expect(res.statusCode).toBe(404);
      expect(res.payload.success).toBe(false);
    });
  });

  describe('updateParameter', () => {
    test('updates whitelisted parameter fields including resultOptions', async () => {
      const prisma = createMockPrisma();
      prisma.labTest.findFirst.mockResolvedValue({ id: 't1', companyId: 'c1' });
      prisma.labTestParameter.findFirst.mockResolvedValue({ id: 'p1', testId: 't1', companyId: 'c1', name: '┘é╪»┘è┘à' });
      prisma.labTestParameter.update.mockResolvedValue({ id: 'p1', name: '╪¼╪»┘è╪»' });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.updateParameter({
        user: { companyId: 'c1' },
        params: { id: 't1', parameterId: 'p1' },
        body: { name: '╪¼╪»┘è╪»', referenceRange: '3.5-5.5', resultOptions: '["low","high"]', showFlag: false }
      }, res);

      expect(res.statusCode).toBe(200);
      expect(prisma.labTestParameter.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: expect.objectContaining({
          name: '╪¼╪»┘è╪»',
          referenceRange: '3.5-5.5',
          resultOptions: ['low', 'high'],
          showFlag: false
        })
      });
    });

    test('returns 404 when the parameter is not found in the company', async () => {
      const prisma = createMockPrisma();
      prisma.labTest.findFirst.mockResolvedValue({ id: 't1', companyId: 'c1' });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.updateParameter({
        user: { companyId: 'c1' },
        params: { id: 't1', parameterId: 'other' },
        body: { name: 'x' }
      }, res);
      expect(res.statusCode).toBe(404);
      expect(res.payload.error).toBe('╪º┘ä╪¿╪º╪▒╪º┘à┘è╪¬╪▒ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»');
    });

    test('returns 404 when the test belongs to another company', async () => {
      const prisma = createMockPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.updateParameter({
        user: { companyId: 'c1' },
        params: { id: 'other', parameterId: 'p1' },
        body: { name: 'x' }
      }, res);
      expect(res.statusCode).toBe(404);
      expect(res.payload.error).toBe('╪º┘ä╪º╪«╪¬╪¿╪º╪▒ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»');
    });
  });

  describe('removeParameter', () => {
    test('soft deletes the parameter (isActive=false)', async () => {
      const prisma = createMockPrisma();
      prisma.labTest.findFirst.mockResolvedValue({ id: 't1', companyId: 'c1' });
      prisma.labTestParameter.findFirst.mockResolvedValue({ id: 'p1', testId: 't1', companyId: 'c1', name: '╪¿' });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.removeParameter({ user: { companyId: 'c1' }, params: { id: 't1', parameterId: 'p1' } }, res);

      expect(res.statusCode).toBe(200);
      expect(prisma.labTestParameter.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { isActive: false }
      });
      expect(res.payload.message).toBe('╪¬┘à ╪¡╪░┘ü ╪º┘ä╪¿╪º╪▒╪º┘à┘è╪¬╪▒');
    });

    test('returns 404 when the parameter is not found in the company', async () => {
      const prisma = createMockPrisma();
      prisma.labTest.findFirst.mockResolvedValue({ id: 't1', companyId: 'c1' });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.removeParameter({ user: { companyId: 'c1' }, params: { id: 't1', parameterId: 'other' } }, res);
      expect(res.statusCode).toBe(404);
      expect(res.payload.success).toBe(false);
    });
  });
});
