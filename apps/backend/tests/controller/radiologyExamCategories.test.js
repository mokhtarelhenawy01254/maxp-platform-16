jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const controller = require('../../controller/radiologyExamCategoriesController');

const createResponse = () => {
  const response = {
    statusCode: 200,
    payload: null,
    status: jest.fn((code) => { response.statusCode = code; return response; }),
    json: jest.fn((payload) => { response.payload = payload; return response; }),
  };
  return response;
};

const createPrisma = () => ({
  radiologyExamCategory: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  radiologyExamType: { updateMany: jest.fn() },
});

const req = (overrides = {}) => ({
  user: { companyId: 'company-1', id: 'user-1' },
  query: {},
  params: {},
  body: {},
  ...overrides,
});

const makeCategory = (overrides = {}) => ({
  id: 'cat-1',
  companyId: 'company-1',
  name: '╪ú╪┤╪╣╪⌐ ┘à┘é╪╖╪╣┘è╪⌐',
  nameEn: null,
  abbreviation: null,
  modality: 'CT',
  parentId: null,
  isActive: true,
  sortOrder: 0,
  _count: { examTypes: 0, children: 0 },
  ...overrides,
});

describe('radiologyExamCategoriesController', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('listCategories', () => {
    test('returns flat categories with parent names and counts', async () => {
      const prisma = createPrisma();
      prisma.radiologyExamCategory.findMany.mockResolvedValue([
        makeCategory({ id: 'cat-1', name: '╪ú╪┤╪╣╪⌐ ┘à┘é╪╖╪╣┘è╪⌐' }),
        makeCategory({ id: 'cat-2', name: '╪▒┘å┘è┘å ┘à╪║┘å╪º╪╖┘è╪│┘è', parentId: 'cat-1', modality: 'MR', _count: { examTypes: 3, children: 2 } }),
      ]);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.listCategories(req(), res);

      expect(res.statusCode).toBe(200);
      expect(res.payload.data).toHaveLength(2);
      expect(res.payload.data[1].parentName).toBe('╪ú╪┤╪╣╪⌐ ┘à┘é╪╖╪╣┘è╪⌐');
      expect(prisma.radiologyExamCategory.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { companyId: 'company-1', isActive: true },
        include: { _count: { select: { examTypes: true, children: true } } },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }));
    });

    test('builds a nested tree when mode=tree', async () => {
      const prisma = createPrisma();
      prisma.radiologyExamCategory.findMany.mockResolvedValue([
        makeCategory({ id: 'cat-1', name: '╪ú╪┤╪╣╪⌐ ┘à┘é╪╖╪╣┘è╪⌐' }),
        makeCategory({ id: 'cat-2', name: '╪º┘ä┘à╪«', parentId: 'cat-1' }),
        makeCategory({ id: 'cat-3', name: '╪º┘ä╪¿╪╖┘å', parentId: 'cat-1' }),
      ]);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.listCategories(req({ query: { mode: 'tree' } }), res);

      expect(res.statusCode).toBe(200);
      expect(res.payload.data).toHaveLength(1);
      expect(res.payload.data[0].children).toHaveLength(2);
      expect(res.payload.data[0].children.map(c => c.id).sort()).toEqual(['cat-2', 'cat-3']);
    });

    test('filters to top-level categories when parentId=root', async () => {
      const prisma = createPrisma();
      prisma.radiologyExamCategory.findMany.mockResolvedValue([
        makeCategory({ id: 'cat-1' }),
        makeCategory({ id: 'cat-2', parentId: 'cat-1' }),
      ]);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.listCategories(req({ query: { parentId: 'root' } }), res);

      expect(res.statusCode).toBe(200);
      expect(res.payload.data.map(c => c.id)).toEqual(['cat-1']);
    });

    test('returns 403 without a company', async () => {
      const res = createResponse();
      await controller.listCategories(req({ user: {} }), res);
      expect(res.statusCode).toBe(403);
    });
  });

  describe('createCategory', () => {
    test('creates a category with a normalized modality', async () => {
      const prisma = createPrisma();
      prisma.radiologyExamCategory.findFirst.mockResolvedValue(null);
      prisma.radiologyExamCategory.create.mockImplementation(({ data }) => Promise.resolve({ id: 'cat-1', ...data }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createCategory(req({ body: { name: '╪ú╪┤╪╣╪⌐ ┘à┘é╪╖╪╣┘è╪⌐', modality: 'ct' } }), res);

      expect(res.statusCode).toBe(200);
      const data = prisma.radiologyExamCategory.create.mock.calls[0][0].data;
      expect(data.name).toBe('╪ú╪┤╪╣╪⌐ ┘à┘é╪╖╪╣┘è╪⌐');
      expect(data.modality).toBe('CT');
      expect(data.parentId).toBeNull();
      expect(data.isActive).toBe(true);
    });

    test('falls back to the name when no modality is supplied', async () => {
      const prisma = createPrisma();
      prisma.radiologyExamCategory.findFirst.mockResolvedValue(null);
      prisma.radiologyExamCategory.create.mockImplementation(({ data }) => Promise.resolve({ id: 'cat-1', ...data }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createCategory(req({ body: { name: 'MRI' } }), res);

      const data = prisma.radiologyExamCategory.create.mock.calls[0][0].data;
      expect(data.modality).toBe('MR');
    });

    test('rejects a duplicate name within the company', async () => {
      const prisma = createPrisma();
      prisma.radiologyExamCategory.findFirst.mockResolvedValue(makeCategory());
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createCategory(req({ body: { name: '╪ú╪┤╪╣╪⌐ ┘à┘é╪╖╪╣┘è╪⌐' } }), res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toContain('┘å┘ü╪│ ╪º┘ä╪º╪│┘à');
      expect(prisma.radiologyExamCategory.create).not.toHaveBeenCalled();
    });

    test('rejects a missing name', async () => {
      const res = createResponse();
      await controller.createCategory(req({ body: {} }), res);
      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('╪º╪│┘à ╪º┘ä┘ü╪ª╪⌐ ┘à╪╖┘ä┘ê╪¿');
    });

    test('rejects a parent outside the company', async () => {
      const prisma = createPrisma();
      prisma.radiologyExamCategory.findFirst.mockResolvedValue(null);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createCategory(req({ body: { name: '┘ü╪▒╪╣┘è╪⌐', parentId: 'foreign' } }), res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('╪º┘ä┘ü╪ª╪⌐ ╪º┘ä╪ú╪¿ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»╪⌐');
    });
  });

  describe('updateCategory', () => {
    test('updates fields and propagates a rename to exam type snapshots', async () => {
      const prisma = createPrisma();
      prisma.radiologyExamCategory.findFirst
        .mockResolvedValueOnce(makeCategory())
        .mockResolvedValue(null);
      prisma.radiologyExamCategory.update.mockImplementation(({ data }) => Promise.resolve({ ...makeCategory(), ...data }));
      prisma.radiologyExamType.updateMany.mockResolvedValue({ count: 3 });
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.updateCategory(req({ params: { id: 'cat-1' }, body: { name: '╪ú╪┤╪╣╪⌐ CT' } }), res);

      expect(res.statusCode).toBe(200);
      expect(prisma.radiologyExamType.updateMany).toHaveBeenCalledWith({
        where: { companyId: 'company-1', categoryId: 'cat-1' },
        data: { category: '╪ú╪┤╪╣╪⌐ CT' },
      });
    });

    test('rejects setting a category as its own parent', async () => {
      const prisma = createPrisma();
      prisma.radiologyExamCategory.findFirst.mockResolvedValue(makeCategory());
      prisma.radiologyExamCategory.findMany.mockResolvedValue([makeCategory()]);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.updateCategory(req({ params: { id: 'cat-1' }, body: { parentId: 'cat-1' } }), res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toContain('┘å┘ü╪│┘ç╪º');
      expect(prisma.radiologyExamCategory.update).not.toHaveBeenCalled();
    });

    test('rejects a parent that would create a cycle', async () => {
      const prisma = createPrisma();
      prisma.radiologyExamCategory.findFirst
        .mockResolvedValueOnce(makeCategory())
        .mockResolvedValueOnce(makeCategory({ id: 'cat-2', name: '╪º┘ä┘à╪«', parentId: 'cat-1' }));
      prisma.radiologyExamCategory.findMany.mockResolvedValue([
        makeCategory({ id: 'cat-1' }),
        makeCategory({ id: 'cat-2', parentId: 'cat-1' }),
      ]);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.updateCategory(req({ params: { id: 'cat-1' }, body: { parentId: 'cat-2' } }), res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toContain('┘ü╪▒╪╣ ┘à┘å┘ç╪º');
    });

    test('returns 404 for a foreign category', async () => {
      const prisma = createPrisma();
      prisma.radiologyExamCategory.findFirst.mockResolvedValue(null);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.updateCategory(req({ params: { id: 'foreign' }, body: { name: 'X' } }), res);

      expect(res.statusCode).toBe(404);
      expect(res.payload.error).toBe('╪º┘ä┘ü╪ª╪⌐ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»╪⌐');
    });
  });

  describe('deleteCategory', () => {
    test('soft-deletes via isActive false', async () => {
      const prisma = createPrisma();
      prisma.radiologyExamCategory.findFirst.mockResolvedValue(makeCategory());
      prisma.radiologyExamCategory.update.mockImplementation(({ data }) => Promise.resolve({ ...makeCategory(), ...data }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.deleteCategory(req({ params: { id: 'cat-1' } }), res);

      expect(res.statusCode).toBe(200);
      expect(prisma.radiologyExamCategory.update).toHaveBeenCalledWith({
        where: { id: 'cat-1' },
        data: { isActive: false },
      });
      expect(res.payload.message).toBe('╪¬┘à ╪¡╪░┘ü ╪º┘ä┘ü╪ª╪⌐');
    });

    test('returns 404 for a foreign category', async () => {
      const prisma = createPrisma();
      prisma.radiologyExamCategory.findFirst.mockResolvedValue(null);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.deleteCategory(req({ params: { id: 'foreign' } }), res);

      expect(res.statusCode).toBe(404);
      expect(res.payload.error).toBe('╪º┘ä┘ü╪ª╪⌐ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»╪⌐');
      expect(prisma.radiologyExamCategory.update).not.toHaveBeenCalled();
    });
  });
});
