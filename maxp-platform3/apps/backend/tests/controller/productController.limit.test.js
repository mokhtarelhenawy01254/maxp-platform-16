const mockEnsureWithinPlanLimit = jest.fn();
const mockPrisma = {
  product: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  category: {
    findFirst: jest.fn(),
  },
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
  initializeSharedDatabase: jest.fn(),
  executeWithRetry: jest.fn(async (operation) => operation()),
  safeQuery: jest.fn(async (operation) => operation()),
}));

jest.mock('../../utils/imageProcessor', () => ({
  processImage: jest.fn(),
  isProcessableImage: jest.fn(() => false),
}));

jest.mock('../../services/internalSyncService', () => ({}));

jest.mock('../../utils/jsonUtils', () => ({
  safeJsonParse: jest.fn((value, fallback = {}) => fallback),
}));

jest.mock('../../utils/productMetadataUtils', () => ({
  parseProductMetadata: jest.fn(() => ({})),
}));

jest.mock('../../utils/productMediaUtils', () => ({
  cloneImageCollection: jest.fn(() => []),
  cloneMetadataMedia: jest.fn((value) => value),
  cloneStoredAssetUrl: jest.fn((value) => value),
  mergeUniqueImages: jest.fn((value) => value),
  normalizeImageCollection: jest.fn((value) => value),
  normalizeStoredAssetUrl: jest.fn((value) => value),
  resolveProductMediaState: jest.fn(({ nextImages = [], nextMainImage = null }) => ({
    images: Array.isArray(nextImages) ? nextImages : [],
    mainImage: nextMainImage || null,
  })),
  sanitizeImageCollection: jest.fn((value) => value),
  sanitizeMetadataMedia: jest.fn((value) => value),
  sanitizeStoredAssetUrl: jest.fn((value) => value),
  serializeJsonField: jest.fn((value) => value),
}));

jest.mock('../../utils/productNormalizationUtils', () => ({
  formatProductResponse: jest.fn((value) => value),
}));

jest.mock('../../utils/productWorkflowUtils', () => ({
  PRODUCT_WORKFLOW_STATUSES: {
    DRAFT: 'DRAFT',
  },
  resolveProductWorkflow: jest.fn(() => ({
    status: 'DRAFT',
    isActive: false,
  })),
  buildWorkflowTransition: jest.fn(),
  withWorkflowMetadata: jest.fn((value) => value),
  createWorkflowUpdatePayload: jest.fn(({ metadata }) => ({
    metadata,
    isActive: false,
  })),
  decorateProductWithWorkflow: jest.fn((value) => value),
}));

jest.mock('../../utils/planLimitPayloads', () => ({
  ensureWithinPlanLimit: (...args) => mockEnsureWithinPlanLimit(...args),
}));

const {
  createProduct,
  duplicateProduct,
} = require('../../controller/productController');

function createMockResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe('productController plan limit enforcement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('blocks product creation when the company reached its product limit', async () => {
    const payload = {
      success: false,
      error: 'LIMIT_EXCEEDED',
      message: 'تم تجاوز حد المنتجات المسموح به في خطتك الحالية',
    };

    mockEnsureWithinPlanLimit.mockResolvedValue({
      allowed: false,
      payload,
    });

    const req = {
      user: { companyId: 'company-1' },
      body: {
        name: 'Test Product',
        price: 99.99,
      },
    };
    const res = createMockResponse();

    await createProduct(req, res);

    expect(mockEnsureWithinPlanLimit).toHaveBeenCalledWith('company-1', 'products', 1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(payload);
    expect(mockPrisma.product.create).not.toHaveBeenCalled();
  });

  test('blocks product duplication when the company reached its product limit', async () => {
    const payload = {
      success: false,
      error: 'LIMIT_EXCEEDED',
      message: 'تم تجاوز حد المنتجات المسموح به في خطتك الحالية',
    };

    mockPrisma.product.findFirst.mockResolvedValue({
      id: 'product-1',
      name: 'Original Product',
      metadata: null,
      images: null,
      mainImage: null,
      productVariants: [],
      categoryId: null,
      description: '',
      sku: 'SKU-1',
      price: 10,
      stock: 0,
      comparePrice: null,
      cost: null,
      trackInventory: true,
      weight: null,
      dimensions: null,
      isFeatured: false,
      isHidden: false,
      tags: null,
      hasPromotedAd: false,
      enableCheckoutForm: true,
      showAddToCartButton: true,
      saleStartDate: null,
      saleEndDate: null,
      sizeGuide: null,
      allowAffiliateMarkup: false,
      affiliateCommission: null,
      commissionType: 'PERCENTAGE',
      showFakeStock: false,
    });
    mockEnsureWithinPlanLimit.mockResolvedValue({
      allowed: false,
      payload,
    });

    const req = {
      user: { companyId: 'company-1' },
      params: { id: 'product-1' },
    };
    const res = createMockResponse();

    await duplicateProduct(req, res);

    expect(mockEnsureWithinPlanLimit).toHaveBeenCalledWith('company-1', 'products', 1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(payload);
    expect(mockPrisma.product.create).not.toHaveBeenCalled();
  });
});
