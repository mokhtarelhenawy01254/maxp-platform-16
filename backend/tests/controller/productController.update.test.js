const mockSyncProductUpdate = jest.fn(() => Promise.resolve());
const mockIsMerchantUser = jest.fn(() => false);

const mockPrisma = {
  product: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  userCompany: {
    findFirst: jest.fn(),
  },
  category: {
    findUnique: jest.fn(),
  },
  company: {
    findUnique: jest.fn(),
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

jest.mock('../../services/internalSyncService', () => ({
  syncProductUpdate: (...args) => mockSyncProductUpdate(...args),
}));

jest.mock('../../services/merchantService', () => ({
  updateProductDropshippingPrice: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../services/fulfillmentService', () => ({
  normalizeFulfillmentMode: jest.fn((value) => value || 'MERCHANT'),
}));

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
  resolveProductMediaState: jest.fn(
    ({ currentImages = [], currentMainImage = null, nextImages, nextMainImage }) => ({
      images: Array.isArray(nextImages) ? nextImages : currentImages || [],
      mainImage: nextMainImage ?? currentMainImage ?? null,
    }),
  ),
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
    PUBLISHED: 'PUBLISHED',
  },
  resolveProductWorkflow: jest.fn(() => ({
    status: 'DRAFT',
    isActive: false,
  })),
  buildWorkflowTransition: jest.fn((workflow) => workflow),
  withWorkflowMetadata: jest.fn((value) => value),
  createWorkflowUpdatePayload: jest.fn(({ metadata, workflow }) => ({
    metadata,
    isActive: workflow?.status === 'PUBLISHED',
  })),
  decorateProductWithWorkflow: jest.fn((value) => value),
}));

jest.mock('../../utils/planLimitPayloads', () => ({
  ensureWithinPlanLimit: jest.fn(async () => ({
    allowed: true,
  })),
}));

jest.mock('../../utils/affiliateProductVisibility', () => ({
  filterProductsVisibleToAffiliate: jest.fn((products) => products),
}));

jest.mock('../../utils/merchantAccountScope', () => ({
  assertMerchantProductAccess: jest.fn(() => Promise.resolve()),
  ensureMerchantWarehouse: jest.fn(),
  getMerchantProductWhere: jest.fn(() => ({})),
  isMerchantUser: (...args) => mockIsMerchantUser(...args),
  requireMerchantAccountForUser: jest.fn(),
  resolveCompanyWarehouseForMerchant: jest.fn(),
  resolveMerchantAccount: jest.fn(),
  syncMerchantProductStock: jest.fn(() => Promise.resolve()),
}));

const { updateSingleProduct } = require('../../controller/productController');

const createMockResponse = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
});

const baseProduct = {
  id: 'product-1',
  companyId: 'company-1',
  deletedAt: null,
  name: 'Sparkle Sneakers',
  images: null,
  mainImage: null,
  metadata: null,
  isActive: false,
  isHidden: false,
  sku: 'SPARK-001',
};

describe('productController.updateSingleProduct SKU handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockIsMerchantUser.mockReturnValue(false);
    mockPrisma.product.findFirst.mockResolvedValue(null);
    mockPrisma.product.findUnique.mockResolvedValue(baseProduct);
    mockPrisma.product.update.mockImplementation(async ({ where, data }) => ({
      id: where.id,
      companyId: 'company-1',
      ...baseProduct,
      ...data,
    }));
    mockPrisma.userCompany.findFirst.mockResolvedValue(null);
    mockPrisma.category.findUnique.mockResolvedValue(null);
    mockPrisma.company.findUnique.mockResolvedValue(null);
  });

  test('skips rewriting the SKU when the submitted value matches the existing product', async () => {
    const req = {
      user: {
        id: 'user-1',
        companyId: 'company-1',
        role: 'OWNER',
      },
      params: {
        id: 'product-1',
      },
      body: {
        sku: '  SPARK-001  ',
        price: '199.99',
      },
    };
    const res = createMockResponse();

    await updateSingleProduct(req, res);

    expect(mockPrisma.product.findFirst).not.toHaveBeenCalled();
    expect(mockPrisma.product.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'product-1' },
        data: expect.objectContaining({
          price: 199.99,
        }),
      }),
    );
    expect(mockPrisma.product.update.mock.calls[0][0].data).not.toHaveProperty('sku');
    expect(res.status).not.toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
      }),
    );
  });

  test('clears the stored SKU when the submitted value is whitespace only', async () => {
    const req = {
      user: {
        id: 'user-1',
        companyId: 'company-1',
        role: 'OWNER',
      },
      params: {
        id: 'product-1',
      },
      body: {
        sku: '   ',
        name: 'Sparkle Sneakers Updated',
      },
    };
    const res = createMockResponse();

    await updateSingleProduct(req, res);

    expect(mockPrisma.product.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'product-1' },
        data: expect.objectContaining({
          name: 'Sparkle Sneakers Updated',
          sku: null,
        }),
      }),
    );
    expect(res.status).not.toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
      }),
    );
  });

  test('returns a friendly 400 response when another product already uses the requested SKU', async () => {
    mockPrisma.product.findFirst.mockResolvedValue({
      id: 'product-2',
      sku: 'SPARK-002',
    });

    const req = {
      user: {
        id: 'user-1',
        companyId: 'company-1',
        role: 'OWNER',
      },
      params: {
        id: 'product-1',
      },
      body: {
        sku: 'SPARK-002',
      },
    };
    const res = createMockResponse();

    await updateSingleProduct(req, res);

    expect(mockPrisma.product.update).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message:
        'رمز SKU مستخدم بالفعل داخل هذه الشركة. اختر رمزًا مختلفًا أو اترك الحقل فارغًا.',
    });
  });
});
