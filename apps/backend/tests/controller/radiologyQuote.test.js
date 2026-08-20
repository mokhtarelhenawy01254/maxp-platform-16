jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const controller = require('../../controller/radiologyQuoteController');

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
    radiologyExamType: {
      findMany: jest.fn(),
    },
    priceListItem: {
      findFirst: jest.fn(),
    },
    ...overrides,
  };
  return prisma;
};

const req = (overrides = {}) => ({
  user: { companyId: 'company-1', id: 'user-1' },
  body: {},
  ...overrides,
});

const makeExamType = (overrides = {}) => ({
  id: 'et-1',
  companyId: 'company-1',
  name: '╪ú╪┤╪╣╪⌐ ┘à┘é╪╖╪╣┘è╪⌐',
  category: 'CT',
  abbreviation: 'CT',
  price: 300,
  isActive: true,
  ...overrides,
});

describe('radiologyQuoteController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('previewQuote sums prices and returns items', async () => {
    const prisma = createPrisma();
    prisma.radiologyExamType.findMany.mockResolvedValue([
      makeExamType(),
      makeExamType({ id: 'et-2', name: '╪▒┘å┘è┘å ┘à╪║┘å╪º╪╖┘è╪│┘è', category: 'MRI', price: 800 }),
    ]);
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await controller.previewQuote(req({ body: { examTypeIds: ['et-1', 'et-2'] } }), res);

    expect(res.statusCode).toBe(200);
    expect(prisma.radiologyExamType.findMany).toHaveBeenCalledWith({
      where: { id: { in: ['et-1', 'et-2'] }, companyId: 'company-1', isActive: true },
    });
    expect(res.payload.success).toBe(true);
    expect(res.payload.data.items).toEqual([
      { examTypeId: 'et-1', name: '╪ú╪┤╪╣╪⌐ ┘à┘é╪╖╪╣┘è╪⌐', category: 'CT', price: 300 },
      { examTypeId: 'et-2', name: '╪▒┘å┘è┘å ┘à╪║┘å╪º╪╖┘è╪│┘è', category: 'MRI', price: 800 },
    ]);
    expect(res.payload.data.total).toBe(1100);
  });

  test('previewQuote rejects an empty examTypeIds list', async () => {
    const prisma = createPrisma();
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await controller.previewQuote(req({ body: { examTypeIds: [] } }), res);

    expect(res.statusCode).toBe(400);
    expect(prisma.radiologyExamType.findMany).not.toHaveBeenCalled();
  });

  test('previewQuote excludes exam types outside the company', async () => {
    const prisma = createPrisma();
    prisma.radiologyExamType.findMany.mockResolvedValue([makeExamType()]);
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await controller.previewQuote(req({ body: { examTypeIds: ['et-1', 'foreign'] } }), res);

    expect(res.statusCode).toBe(200);
    expect(prisma.radiologyExamType.findMany).toHaveBeenCalledWith({
      where: { id: { in: ['et-1', 'foreign'] }, companyId: 'company-1', isActive: true },
    });
    expect(res.payload.data.items).toHaveLength(1);
    expect(res.payload.data.items[0].examTypeId).toBe('et-1');
    expect(res.payload.data.total).toBe(300);
  });

  test('previewQuote returns 403 when companyId is missing', async () => {
    const prisma = createPrisma();
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await controller.previewQuote(req({ user: {}, body: { examTypeIds: ['et-1'] } }), res);

    expect(res.statusCode).toBe(403);
    expect(res.payload.error).toBe('╪║┘è╪▒ ┘à╪╡╪▒╪¡');
    expect(prisma.radiologyExamType.findMany).not.toHaveBeenCalled();
  });

  test('previewQuote applies a priceList override when the item is found', async () => {
    const prisma = createPrisma();
    prisma.radiologyExamType.findMany.mockResolvedValue([makeExamType()]);
    prisma.priceListItem.findFirst.mockResolvedValue({
      priceListId: 'pl-1',
      serviceId: 'et-1',
      price: 250,
      isActive: true,
    });
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await controller.previewQuote(req({ body: { examTypeIds: ['et-1'], priceListId: 'pl-1' } }), res);

    expect(res.statusCode).toBe(200);
    expect(prisma.priceListItem.findFirst).toHaveBeenCalledWith({
      where: { priceListId: 'pl-1', serviceId: 'et-1', isActive: true },
    });
    expect(res.payload.data.items[0].price).toBe(250);
    expect(res.payload.data.total).toBe(250);
  });

  test('previewQuote falls back to exam type price when no priceList item is found', async () => {
    const prisma = createPrisma();
    prisma.radiologyExamType.findMany.mockResolvedValue([makeExamType()]);
    prisma.priceListItem.findFirst.mockResolvedValue(null);
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await controller.previewQuote(req({ body: { examTypeIds: ['et-1'], priceListId: 'pl-1' } }), res);

    expect(res.statusCode).toBe(200);
    expect(prisma.priceListItem.findFirst).toHaveBeenCalled();
    expect(res.payload.data.items[0].price).toBe(300);
    expect(res.payload.data.total).toBe(300);
  });
});
