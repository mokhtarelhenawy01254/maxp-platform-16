const mockPrisma = {
  product: {
    findFirst: jest.fn(),
  },
  productPresentation: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  productReview: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
}));

jest.mock('../../services/productReviewMediaService', () => ({
  deleteReviewMediaByReviewIds: jest.fn().mockResolvedValue(undefined),
  getReviewMediaMap: jest.fn().mockResolvedValue(new Map()),
  saveReviewMedia: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../services/storefrontAppUsageService', () => ({
  trackStorefrontAppUsage: jest.fn().mockResolvedValue(undefined),
}));

const controller = require('../../controller/productReviewController');

const COMPANY_ID = 'company-1';

const buildRes = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res;
};

const buildReq = (productId, overrides = {}) => ({
  params: { productId },
  query: { limit: '10' },
  company: { id: COMPANY_ID },
  companyId: COMPANY_ID,
  ...overrides,
});

const seedReviews = () => {
  mockPrisma.productReview.findMany.mockResolvedValue([
    { id: 'rev-1', rating: 5, comment: 'ممتاز', productId: 'prod-1' },
  ]);
  mockPrisma.productReview.count.mockResolvedValue(1);
};

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.product.findFirst.mockReset();
  mockPrisma.productPresentation.findFirst.mockReset();
  mockPrisma.productPresentation.findMany.mockReset();
  mockPrisma.productReview.findMany.mockReset();
  mockPrisma.productReview.count.mockReset();
});

describe('getProductReviews product resolution', () => {
  it('resolves a direct active product slug and returns reviews', async () => {
    mockPrisma.product.findFirst.mockResolvedValue({ id: 'prod-1' });
    seedReviews();

    const req = buildReq('aura');
    const res = buildRes();

    await controller.getProductReviews(req, res);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    );
    expect(mockPrisma.product.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: COMPANY_ID,
          isActive: true,
          OR: [{ id: 'aura' }, { slug: 'aura' }],
        }),
      }),
    );
  });

  it('resolves a direct active product id and returns reviews', async () => {
    mockPrisma.product.findFirst.mockResolvedValue({ id: 'prod-1' });
    seedReviews();

    await controller.getProductReviews(buildReq('prod-1'), buildRes());

    expect(mockPrisma.productReview.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ productId: 'prod-1' }),
      }),
    );
  });

  it('returns 404 when the product does not exist', async () => {
    mockPrisma.product.findFirst.mockResolvedValue(null);
    mockPrisma.productPresentation.findFirst.mockResolvedValue(null);
    mockPrisma.productPresentation.findMany.mockResolvedValue([]);

    const res = buildRes();
    await controller.getProductReviews(buildReq('unknown'), res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'المنتج غير موجود',
    });
  });

  it('resolves a presentation slug to its active product', async () => {
    mockPrisma.product.findFirst.mockResolvedValue(null);
    mockPrisma.productPresentation.findFirst.mockResolvedValue({ productId: 'prod-2' });
    seedReviews();

    await controller.getProductReviews(buildReq('aura-presents'), buildRes());

    expect(mockPrisma.productPresentation.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          slug: 'aura-presents',
          isActive: true,
          product: expect.objectContaining({
            companyId: COMPANY_ID,
            isActive: true,
            deletedAt: null,
          }),
        }),
      }),
    );
    expect(mockPrisma.productReview.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ productId: 'prod-2' }),
      }),
    );
  });

  it('resolves a converted presentation (deleted source) to the target product', async () => {
    mockPrisma.product.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'legacy-prod',
        slug: 'legacy-prod',
        sku: 'LEGACY-SKU',
      })
      .mockResolvedValueOnce({ id: 'target-prod', slug: 'target-prod' })
      .mockResolvedValueOnce({ id: 'target-prod' });

    mockPrisma.productPresentation.findFirst.mockResolvedValue(null);
    mockPrisma.productPresentation.findMany.mockResolvedValue([
      {
        id: 'pres-1',
        slug: 'aura-presentation',
        productId: 'target-prod',
        metadata: JSON.stringify({ convertedFromSku: 'LEGACY-SKU' }),
      },
    ]);
    seedReviews();

    await controller.getProductReviews(buildReq('aura-presentation'), buildRes());

    expect(mockPrisma.productReview.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ productId: 'target-prod' }),
      }),
    );
  });

  it('returns 404 when a converted presentation target product is inactive', async () => {
    mockPrisma.product.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'legacy-prod',
        slug: 'legacy-prod',
        sku: 'LEGACY-SKU',
      })
      .mockResolvedValueOnce({ id: 'target-prod', slug: 'target-prod' })
      .mockResolvedValueOnce(null);

    mockPrisma.productPresentation.findFirst.mockResolvedValue(null);
    mockPrisma.productPresentation.findMany.mockResolvedValue([
      {
        id: 'pres-1',
        slug: 'aura-presentation',
        productId: 'target-prod',
        metadata: JSON.stringify({ convertedFromSku: 'LEGACY-SKU' }),
      },
    ]);

    const res = buildRes();
    await controller.getProductReviews(buildReq('aura-presentation'), res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 404 when no company is resolved', async () => {
    const res = buildRes();
    await controller.getProductReviews(
      buildReq('aura', { company: null, companyId: null }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(404);
  });
});