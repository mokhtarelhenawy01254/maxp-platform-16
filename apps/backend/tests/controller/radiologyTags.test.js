jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const controller = require('../../controller/radiologyTagsController');

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
    radiologyExamTag: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    radiologyExamType: {
      findMany: jest.fn(),
      count: jest.fn(),
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

const makeTag = (overrides = {}) => ({
  id: 'tag-1',
  companyId: 'company-1',
  name: '╪╖┘ê╪º╪▒╪ª',
  isActive: true,
  createdAt: new Date('2026-08-11T10:00:00.000Z'),
  updatedAt: new Date('2026-08-11T10:00:00.000Z'),
  ...overrides,
});

describe('radiologyTagsController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listTags', () => {
    test('lists company-scoped tags with search and active filter', async () => {
      const prisma = createPrisma();
      prisma.radiologyExamTag.findMany.mockResolvedValue([makeTag()]);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.listTags(req({ query: { search: '╪╖┘ê╪º╪▒╪ª' } }), res);

      expect(res.statusCode).toBe(200);
      expect(prisma.radiologyExamTag.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { companyId: 'company-1', isActive: true, name: { contains: '╪╖┘ê╪º╪▒╪ª', mode: 'insensitive' } },
          orderBy: { name: 'asc' },
        })
      );
      expect(res.payload.data).toHaveLength(1);
    });

    test('includes inactive tags when includeInactive is true', async () => {
      const prisma = createPrisma();
      prisma.radiologyExamTag.findMany.mockResolvedValue([makeTag({ isActive: false })]);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.listTags(req({ query: { includeInactive: 'true' } }), res);

      const args = prisma.radiologyExamTag.findMany.mock.calls[0][0];
      expect(args.where).toEqual({ companyId: 'company-1' });
      expect(res.payload.data[0].isActive).toBe(false);
    });

    test('returns 403 when companyId is missing', async () => {
      const prisma = createPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.listTags(req({ user: {} }), res);

      expect(res.statusCode).toBe(403);
      expect(res.payload.error).toBe('╪║┘è╪▒ ┘à╪╡╪▒╪¡');
      expect(prisma.radiologyExamTag.findMany).not.toHaveBeenCalled();
    });
  });

  describe('createTag', () => {
    test('creates a tag with a trimmed name', async () => {
      const prisma = createPrisma();
      prisma.radiologyExamTag.create.mockImplementation(({ data }) => Promise.resolve({ id: 'tag-1', ...data }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createTag(req({ body: { name: '  ╪╖┘ê╪º╪▒╪ª  ' } }), res);

      expect(res.statusCode).toBe(200);
      const data = prisma.radiologyExamTag.create.mock.calls[0][0].data;
      expect(data.companyId).toBe('company-1');
      expect(data.name).toBe('╪╖┘ê╪º╪▒╪ª');
      expect(res.payload.data.name).toBe('╪╖┘ê╪º╪▒╪ª');
    });

    test('rejects a missing name', async () => {
      const prisma = createPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createTag(req({ body: {} }), res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('╪º╪│┘à ╪º┘ä╪¬╪º╪¼ ┘à╪╖┘ä┘ê╪¿');
      expect(prisma.radiologyExamTag.create).not.toHaveBeenCalled();
    });

    test('returns 403 when companyId is missing', async () => {
      const prisma = createPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.createTag(req({ user: {}, body: { name: '╪╖┘ê╪º╪▒╪ª' } }), res);

      expect(res.statusCode).toBe(403);
      expect(prisma.radiologyExamTag.create).not.toHaveBeenCalled();
    });
  });

  describe('updateTag', () => {
    test('updates the name of a company tag', async () => {
      const prisma = createPrisma();
      prisma.radiologyExamTag.findFirst.mockResolvedValue(makeTag());
      prisma.radiologyExamTag.update.mockImplementation(({ data }) => Promise.resolve({ ...makeTag(), ...data }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.updateTag(req({ params: { id: 'tag-1' }, body: { name: '╪╖┘ê╪º╪▒╪ª ┘é┘ä╪¿' } }), res);

      expect(res.statusCode).toBe(200);
      expect(prisma.radiologyExamTag.findFirst).toHaveBeenCalledWith({
        where: { id: 'tag-1', companyId: 'company-1' },
      });
      expect(prisma.radiologyExamTag.update).toHaveBeenCalledWith({
        where: { id: 'tag-1' },
        data: { name: '╪╖┘ê╪º╪▒╪ª ┘é┘ä╪¿' },
      });
    });

    test('rejects a blank name', async () => {
      const prisma = createPrisma();
      prisma.radiologyExamTag.findFirst.mockResolvedValue(makeTag());
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.updateTag(req({ params: { id: 'tag-1' }, body: { name: '   ' } }), res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('╪º╪│┘à ╪º┘ä╪¬╪º╪¼ ┘à╪╖┘ä┘ê╪¿');
      expect(prisma.radiologyExamTag.update).not.toHaveBeenCalled();
    });

    test('returns 404 for a tag outside the company', async () => {
      const prisma = createPrisma();
      prisma.radiologyExamTag.findFirst.mockResolvedValue(null);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.updateTag(req({ params: { id: 'foreign' }, body: { name: 'x' } }), res);

      expect(res.statusCode).toBe(404);
      expect(res.payload.error).toBe('╪º┘ä╪¬╪º╪¼ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»');
      expect(prisma.radiologyExamTag.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteTag', () => {
    test('soft-deletes via isActive false', async () => {
      const prisma = createPrisma();
      prisma.radiologyExamTag.findFirst.mockResolvedValue(makeTag());
      prisma.radiologyExamTag.update.mockImplementation(({ data }) => Promise.resolve({ ...makeTag(), ...data }));
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.deleteTag(req({ params: { id: 'tag-1' } }), res);

      expect(res.statusCode).toBe(200);
      expect(prisma.radiologyExamTag.update).toHaveBeenCalledWith({
        where: { id: 'tag-1' },
        data: { isActive: false },
      });
      expect(res.payload.message).toBe('╪¬┘à ╪¡╪░┘ü ╪º┘ä╪¬╪º╪¼');
    });

    test('returns 404 for a tag outside the company', async () => {
      const prisma = createPrisma();
      prisma.radiologyExamTag.findFirst.mockResolvedValue(null);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.deleteTag(req({ params: { id: 'foreign' } }), res);

      expect(res.statusCode).toBe(404);
      expect(res.payload.error).toBe('╪º┘ä╪¬╪º╪¼ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»');
      expect(prisma.radiologyExamTag.update).not.toHaveBeenCalled();
    });
  });

  describe('listModalities', () => {
    test('returns distinct categories with counts', async () => {
      const prisma = createPrisma();
      prisma.radiologyExamType.findMany.mockResolvedValue([
        { category: 'CT' },
        { category: 'MRI' },
        { category: null },
      ]);
      prisma.radiologyExamType.count
        .mockResolvedValueOnce(4)
        .mockResolvedValueOnce(2);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.listModalities(req(), res);

      expect(res.statusCode).toBe(200);
      expect(prisma.radiologyExamType.findMany).toHaveBeenCalledWith({
        where: { companyId: 'company-1' },
        select: { category: true },
        distinct: ['category'],
      });
      expect(res.payload.data).toEqual([
        { category: 'CT', count: 4 },
        { category: 'MRI', count: 2 },
      ]);
    });

    test('returns an empty list when no categories exist', async () => {
      const prisma = createPrisma();
      prisma.radiologyExamType.findMany.mockResolvedValue([{ category: null }]);
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.listModalities(req(), res);

      expect(res.statusCode).toBe(200);
      expect(res.payload.data).toEqual([]);
      expect(prisma.radiologyExamType.count).not.toHaveBeenCalled();
    });

    test('returns 403 when companyId is missing', async () => {
      const prisma = createPrisma();
      getSharedPrismaClient.mockReturnValue(prisma);

      const res = createResponse();
      await controller.listModalities(req({ user: {} }), res);

      expect(res.statusCode).toBe(403);
      expect(res.payload.error).toBe('╪║┘è╪▒ ┘à╪╡╪▒╪¡');
      expect(prisma.radiologyExamType.findMany).not.toHaveBeenCalled();
    });
  });
});
