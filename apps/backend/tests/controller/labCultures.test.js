jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn()
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const controller = require('../../controller/labCulturesController');

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
    labCulture: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'c-new', ...data })),
      update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'c1', ...data }))
    },
    labCultureOrganism: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'o-new', ...data })),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      createMany: jest.fn().mockImplementation(({ data }) => Promise.resolve({ count: data.length })),
      delete: jest.fn().mockImplementation(({ where }) => Promise.resolve({ id: where.id }))
    },
    labCultureAntibiotic: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'a-new', ...data })),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      createMany: jest.fn().mockImplementation(({ data }) => Promise.resolve({ count: data.length })),
      delete: jest.fn().mockImplementation(({ where }) => Promise.resolve({ id: where.id }))
    }
  };
  return prisma;
};

describe('labCulturesController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllCultures', () => {
    test('returns paginated cultures with active counts ordered by name asc', async () => {
      const prisma = createMockPrisma();
      prisma.labCulture.findMany.mockResolvedValue([
        { id: 'c1', name: 'زراعة بول', category: 'ميكروبيولوجيا', sampleType: 'بول', price: 150, isActive: true, _count: { organisms: 2, antibiotics: 3 } },
        { id: 'c2', name: 'زراعة دم', category: 'ميكروبيولوجيا', sampleType: 'دم وريدي', price: 200, isActive: true, _count: { organisms: 0, antibiotics: 0 } }
      ]);
      prisma.labCulture.count.mockResolvedValue(9);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getAllCultures({ user: { companyId: 'c1' }, query: {} }, res);

      expect(res.statusCode).toBe(200);
      expect(prisma.labCulture.findMany).toHaveBeenCalledWith({
        where: { companyId: 'c1', isActive: true },
        include: {
          _count: {
            select: {
              organisms: { where: { isActive: true } },
              antibiotics: { where: { isActive: true } }
            }
          }
        },
        orderBy: { name: 'asc' },
        skip: 0,
        take: 50
      });
      expect(res.payload.data).toHaveLength(2);
      expect(res.payload.data[0].organismCount).toBe(2);
      expect(res.payload.data[0].antibioticCount).toBe(3);
      expect(res.payload.data[0]._count).toBeUndefined();
      expect(res.payload.total).toBe(9);
      expect(res.payload.page).toBe(1);
      expect(res.payload.limit).toBe(50);
    });

    test('applies search + category filter + pagination', async () => {
      const prisma = createMockPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getAllCultures(
        { user: { companyId: 'c1' }, query: { search: 'بول', category: 'ميكروبيولوجيا', page: '2', limit: '10' } },
        res
      );

      const expectedWhere = {
        companyId: 'c1',
        isActive: true,
        category: 'ميكروبيولوجيا',
        OR: [
          { name: { contains: 'بول', mode: 'insensitive' } },
          { category: { contains: 'بول', mode: 'insensitive' } },
          { sampleType: { contains: 'بول', mode: 'insensitive' } }
        ]
      };
      expect(prisma.labCulture.findMany).toHaveBeenCalledWith({
        where: expectedWhere,
        include: {
          _count: {
            select: {
              organisms: { where: { isActive: true } },
              antibiotics: { where: { isActive: true } }
            }
          }
        },
        orderBy: { name: 'asc' },
        skip: 10,
        take: 10
      });
      expect(prisma.labCulture.count).toHaveBeenCalledWith({ where: expectedWhere });
    });

    test('caps limit at 200 and shows inactive when includeInactive=true', async () => {
      const prisma = createMockPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getAllCultures({ user: { companyId: 'c1' }, query: { limit: '999', includeInactive: 'true' } }, res);

      expect(prisma.labCulture.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { companyId: 'c1' },
        take: 200
      }));
    });

    test('returns 403 when companyId is missing', async () => {
      const res = createResponse();
      await controller.getAllCultures({ user: {}, query: {} }, res);
      expect(res.statusCode).toBe(403);
      expect(res.payload.success).toBe(false);
    });
  });

  describe('getCultureById', () => {
    test('returns the culture with organisms/antibiotics ordered by sortOrder', async () => {
      const prisma = createMockPrisma();
      prisma.labCulture.findFirst.mockResolvedValue({
        id: 'c1',
        companyId: 'c1',
        name: 'زراعة بول',
        organisms: [
          { id: 'o1', name: 'إي كولاي', sortOrder: 0 },
          { id: 'o2', name: 'مكورات عنقودية', sortOrder: 1 }
        ],
        antibiotics: [{ id: 'a1', name: 'أموكسيسيلين', sortOrder: 0 }]
      });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getCultureById({ user: { companyId: 'c1' }, params: { id: 'c1' } }, res);

      expect(res.statusCode).toBe(200);
      expect(prisma.labCulture.findFirst).toHaveBeenCalledWith({
        where: { id: 'c1', companyId: 'c1' },
        include: {
          organisms: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
          antibiotics: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } }
        }
      });
      expect(res.payload.data.organisms).toHaveLength(2);
    });

    test('returns 404 for a culture from another company', async () => {
      const prisma = createMockPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.getCultureById({ user: { companyId: 'c1' }, params: { id: 'other' } }, res);

      expect(res.statusCode).toBe(404);
      expect(res.payload.success).toBe(false);
    });
  });

  describe('createCulture', () => {
    test('requires the culture name', async () => {
      getSharedPrismaClient.mockReturnValue(createMockPrisma());
      const res = createResponse();
      await controller.createCulture({ user: { companyId: 'c1' }, body: { name: '' } }, res);
      expect(res.statusCode).toBe(400);
      expect(res.payload.success).toBe(false);
    });

    test('creates a culture with nested organisms and antibiotics', async () => {
      const prisma = createMockPrisma();
      prisma.labCulture.create.mockResolvedValue({
        id: 'c-new',
        companyId: 'c1',
        name: 'زراعة بول',
        price: 150,
        organisms: [{ id: 'o1', name: 'إي كولاي', sortOrder: 0 }],
        antibiotics: [{ id: 'a1', name: 'أموكسيسيلين', sortOrder: 2 }]
      });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createCulture({
        user: { companyId: 'c1' },
        body: {
          name: 'زراعة بول',
          category: 'ميكروبيولوجيا',
          sampleType: 'بول',
          price: '150',
          organisms: [{ name: 'إي كولاي' }, { name: 'مكورات عنقودية' }],
          antibiotics: [{ name: 'أموكسيسيلين', sortOrder: 2 }, { name: 'سيفترياكسون' }]
        }
      }, res);

      expect(res.statusCode).toBe(200);
      expect(prisma.labCulture.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          companyId: 'c1',
          name: 'زراعة بول',
          category: 'ميكروبيولوجيا',
          sampleType: 'بول',
          price: 150,
          organisms: {
            create: [
              expect.objectContaining({ companyId: 'c1', name: 'إي كولاي', sortOrder: 0 }),
              expect.objectContaining({ companyId: 'c1', name: 'مكورات عنقودية', sortOrder: 1 })
            ]
          },
          antibiotics: {
            create: [
              expect.objectContaining({ companyId: 'c1', name: 'أموكسيسيلين', sortOrder: 2 }),
              expect.objectContaining({ companyId: 'c1', name: 'سيفترياكسون', sortOrder: 1 })
            ]
          }
        })
      }));
    });

    test('rejects a negative price', async () => {
      const prisma = createMockPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createCulture({ user: { companyId: 'c1' }, body: { name: 'مزرعة', price: -5 } }, res);
      expect(res.statusCode).toBe(400);
      expect(res.payload.success).toBe(false);
    });

    test('rejects an organism without a name', async () => {
      const prisma = createMockPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createCulture({
        user: { companyId: 'c1' },
        body: { name: 'مزرعة', organisms: [{ sortOrder: 0 }] }
      }, res);
      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('اسم الكائن الدقيق مطلوب');
    });

    test('rejects an antibiotic without a name', async () => {
      const prisma = createMockPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createCulture({
        user: { companyId: 'c1' },
        body: { name: 'مزرعة', antibiotics: [{ sortOrder: 0 }] }
      }, res);
      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('اسم المضاد الحيوي مطلوب');
    });

    test('returns 403 when companyId is missing', async () => {
      const res = createResponse();
      await controller.createCulture({ user: {}, body: { name: 'مزرعة' } }, res);
      expect(res.statusCode).toBe(403);
      expect(res.payload.success).toBe(false);
    });
  });

  describe('updateCulture', () => {
    test('updates whitelisted fields and replaces all organisms/antibiotics', async () => {
      const prisma = createMockPrisma();
      prisma.labCulture.findFirst
        .mockResolvedValueOnce({ id: 'c1', companyId: 'c1', name: 'قديم' })
        .mockResolvedValue({ id: 'c1', companyId: 'c1', name: 'محدث', organisms: [], antibiotics: [] });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.updateCulture({
        user: { companyId: 'c1' },
        params: { id: 'c1' },
        body: {
          name: 'محدث',
          price: 100,
          organisms: [{ name: 'بكتيريا أ' }],
          antibiotics: [{ name: 'مضاد ب' }]
        }
      }, res);

      expect(prisma.labCultureOrganism.deleteMany).toHaveBeenCalledWith({ where: { cultureId: 'c1' } });
      expect(prisma.labCultureOrganism.createMany).toHaveBeenCalledWith({
        data: [expect.objectContaining({ companyId: 'c1', cultureId: 'c1', name: 'بكتيريا أ', sortOrder: 0 })]
      });
      expect(prisma.labCultureAntibiotic.deleteMany).toHaveBeenCalledWith({ where: { cultureId: 'c1' } });
      expect(prisma.labCultureAntibiotic.createMany).toHaveBeenCalledWith({
        data: [expect.objectContaining({ companyId: 'c1', cultureId: 'c1', name: 'مضاد ب', sortOrder: 0 })]
      });
      expect(prisma.labCulture.update).toHaveBeenCalledWith({
        where: { id: 'c1' },
        data: expect.objectContaining({ name: 'محدث', price: 100 })
      });
      expect(res.statusCode).toBe(200);
    });

    test('clears all organisms/antibiotics when empty arrays are provided', async () => {
      const prisma = createMockPrisma();
      prisma.labCulture.findFirst.mockResolvedValue({ id: 'c1', companyId: 'c1', name: 'قديم' });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.updateCulture({
        user: { companyId: 'c1' },
        params: { id: 'c1' },
        body: { organisms: [], antibiotics: [] }
      }, res);

      expect(prisma.labCultureOrganism.deleteMany).toHaveBeenCalledWith({ where: { cultureId: 'c1' } });
      expect(prisma.labCultureOrganism.createMany).not.toHaveBeenCalled();
      expect(prisma.labCultureAntibiotic.deleteMany).toHaveBeenCalledWith({ where: { cultureId: 'c1' } });
      expect(prisma.labCultureAntibiotic.createMany).not.toHaveBeenCalled();
    });

    test('returns 404 for a culture from another company', async () => {
      const prisma = createMockPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.updateCulture({ user: { companyId: 'c1' }, params: { id: 'other' }, body: { name: 'x' } }, res);
      expect(res.statusCode).toBe(404);
      expect(res.payload.success).toBe(false);
    });
  });

  describe('deleteCulture', () => {
    test('soft deletes the culture (isActive=false)', async () => {
      const prisma = createMockPrisma();
      prisma.labCulture.findFirst.mockResolvedValue({ id: 'c1', companyId: 'c1' });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.deleteCulture({ user: { companyId: 'c1' }, params: { id: 'c1' } }, res);

      expect(res.statusCode).toBe(200);
      expect(prisma.labCulture.findFirst).toHaveBeenCalledWith({ where: { id: 'c1', companyId: 'c1' } });
      expect(prisma.labCulture.update).toHaveBeenCalledWith({ where: { id: 'c1' }, data: { isActive: false } });
      expect(res.payload.message).toBe('تم حذف المزرعة');
    });

    test('returns 404 for a culture from another company', async () => {
      const prisma = createMockPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.deleteCulture({ user: { companyId: 'c1' }, params: { id: 'other' } }, res);
      expect(res.statusCode).toBe(404);
      expect(res.payload.success).toBe(false);
    });
  });

  describe('addOrganism', () => {
    test('creates an organism with the next sortOrder when not provided', async () => {
      const prisma = createMockPrisma();
      prisma.labCulture.findFirst.mockResolvedValue({ id: 'c1', companyId: 'c1' });
      prisma.labCultureOrganism.findFirst.mockResolvedValue({ sortOrder: 4 });
      prisma.labCultureOrganism.create.mockResolvedValue({ id: 'o-new', name: 'إي كولاي', sortOrder: 5 });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.addOrganism({
        user: { companyId: 'c1' },
        params: { id: 'c1' },
        body: { name: 'إي كولاي' }
      }, res);

      expect(res.statusCode).toBe(200);
      expect(prisma.labCultureOrganism.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          companyId: 'c1',
          cultureId: 'c1',
          name: 'إي كولاي',
          sortOrder: 5
        })
      });
    });

    test('uses the provided sortOrder directly', async () => {
      const prisma = createMockPrisma();
      prisma.labCulture.findFirst.mockResolvedValue({ id: 'c1', companyId: 'c1' });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.addOrganism({
        user: { companyId: 'c1' },
        params: { id: 'c1' },
        body: { name: 'بكتيريا', sortOrder: 7 }
      }, res);

      expect(prisma.labCultureOrganism.findFirst).not.toHaveBeenCalled();
      expect(prisma.labCultureOrganism.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ name: 'بكتيريا', sortOrder: 7 })
      });
    });

    test('requires an organism name', async () => {
      const prisma = createMockPrisma();
      prisma.labCulture.findFirst.mockResolvedValue({ id: 'c1', companyId: 'c1' });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.addOrganism({ user: { companyId: 'c1' }, params: { id: 'c1' }, body: {} }, res);
      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('اسم الكائن الدقيق مطلوب');
    });

    test('returns 404 when the culture belongs to another company', async () => {
      const prisma = createMockPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.addOrganism({ user: { companyId: 'c1' }, params: { id: 'other' }, body: { name: 'بكتيريا' } }, res);
      expect(res.statusCode).toBe(404);
      expect(res.payload.success).toBe(false);
    });
  });

  describe('removeOrganism', () => {
    test('hard deletes the organism', async () => {
      const prisma = createMockPrisma();
      prisma.labCulture.findFirst.mockResolvedValue({ id: 'c1', companyId: 'c1' });
      prisma.labCultureOrganism.findFirst.mockResolvedValue({ id: 'o1', cultureId: 'c1', companyId: 'c1', name: 'إي كولاي' });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.removeOrganism({
        user: { companyId: 'c1' },
        params: { id: 'c1', organismId: 'o1' }
      }, res);

      expect(res.statusCode).toBe(200);
      expect(prisma.labCultureOrganism.findFirst).toHaveBeenCalledWith({
        where: { id: 'o1', cultureId: 'c1', companyId: 'c1' }
      });
      expect(prisma.labCultureOrganism.delete).toHaveBeenCalledWith({ where: { id: 'o1' } });
      expect(res.payload.message).toBe('تم حذف الكائن الدقيق');
    });

    test('returns 404 when the organism is not found in the company', async () => {
      const prisma = createMockPrisma();
      prisma.labCulture.findFirst.mockResolvedValue({ id: 'c1', companyId: 'c1' });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.removeOrganism({
        user: { companyId: 'c1' },
        params: { id: 'c1', organismId: 'other' }
      }, res);
      expect(res.statusCode).toBe(404);
      expect(res.payload.success).toBe(false);
    });
  });

  describe('addAntibiotic', () => {
    test('creates an antibiotic with the next sortOrder when not provided', async () => {
      const prisma = createMockPrisma();
      prisma.labCulture.findFirst.mockResolvedValue({ id: 'c1', companyId: 'c1' });
      prisma.labCultureAntibiotic.findFirst.mockResolvedValue({ sortOrder: 2 });
      prisma.labCultureAntibiotic.create.mockResolvedValue({ id: 'a-new', name: 'أموكسيسيلين', sortOrder: 3 });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.addAntibiotic({
        user: { companyId: 'c1' },
        params: { id: 'c1' },
        body: { name: 'أموكسيسيلين' }
      }, res);

      expect(res.statusCode).toBe(200);
      expect(prisma.labCultureAntibiotic.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          companyId: 'c1',
          cultureId: 'c1',
          name: 'أموكسيسيلين',
          sortOrder: 3
        })
      });
    });

    test('returns 404 when the culture belongs to another company', async () => {
      const prisma = createMockPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.addAntibiotic({ user: { companyId: 'c1' }, params: { id: 'other' }, body: { name: 'مضاد' } }, res);
      expect(res.statusCode).toBe(404);
      expect(res.payload.success).toBe(false);
    });
  });

  describe('removeAntibiotic', () => {
    test('hard deletes the antibiotic', async () => {
      const prisma = createMockPrisma();
      prisma.labCulture.findFirst.mockResolvedValue({ id: 'c1', companyId: 'c1' });
      prisma.labCultureAntibiotic.findFirst.mockResolvedValue({ id: 'a1', cultureId: 'c1', companyId: 'c1', name: 'أموكسيسيلين' });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.removeAntibiotic({
        user: { companyId: 'c1' },
        params: { id: 'c1', antibioticId: 'a1' }
      }, res);

      expect(res.statusCode).toBe(200);
      expect(prisma.labCultureAntibiotic.findFirst).toHaveBeenCalledWith({
        where: { id: 'a1', cultureId: 'c1', companyId: 'c1' }
      });
      expect(prisma.labCultureAntibiotic.delete).toHaveBeenCalledWith({ where: { id: 'a1' } });
      expect(res.payload.message).toBe('تم حذف المضاد الحيوي');
    });

    test('returns 404 when the antibiotic is not found in the company', async () => {
      const prisma = createMockPrisma();
      prisma.labCulture.findFirst.mockResolvedValue({ id: 'c1', companyId: 'c1' });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.removeAntibiotic({
        user: { companyId: 'c1' },
        params: { id: 'c1', antibioticId: 'other' }
      }, res);
      expect(res.statusCode).toBe(404);
      expect(res.payload.success).toBe(false);
    });
  });
});
