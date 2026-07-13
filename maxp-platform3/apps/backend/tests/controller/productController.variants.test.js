const mockIsMerchantUser = jest.fn(() => false);
const mockRequireMerchantAccountForUser = jest.fn();
const mockAssertMerchantProductAccess = jest.fn();

const normalizeImages = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value !== 'string' || !value.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [value];
  } catch {
    return [value];
  }
};

const mockPrisma = {
  product: {
    findUnique: jest.fn(),
  },
  productVariant: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  userCompany: {
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
  normalizeImageCollection: jest.fn((value) => normalizeImages(value)),
  normalizeStoredAssetUrl: jest.fn((value) => value),
  resolveProductMediaState: jest.fn(({ nextImages = [], nextMainImage = null }) => ({
    images: Array.isArray(nextImages) ? nextImages : [],
    mainImage: nextMainImage || null,
  })),
  sanitizeImageCollection: jest.fn((value) => normalizeImages(value)),
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
  ensureWithinPlanLimit: jest.fn(async () => ({
    allowed: true,
  })),
}));

jest.mock('../../utils/affiliateProductVisibility', () => ({
  filterProductsVisibleToAffiliate: jest.fn((products) => products),
}));

jest.mock('../../utils/merchantAccountScope', () => ({
  assertMerchantProductAccess: (...args) => mockAssertMerchantProductAccess(...args),
  ensureMerchantWarehouse: jest.fn(),
  getMerchantProductWhere: jest.fn(() => ({})),
  isMerchantUser: (...args) => mockIsMerchantUser(...args),
  requireMerchantAccountForUser: (...args) => mockRequireMerchantAccountForUser(...args),
  resolveCompanyWarehouseForMerchant: jest.fn(),
  resolveMerchantAccount: jest.fn(),
  syncMerchantProductStock: jest.fn(() => Promise.resolve()),
}));

const { updateProductVariant } = require('../../controller/productController');

const createMockResponse = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
});

describe('productController.updateProductVariant', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockIsMerchantUser.mockReturnValue(false);
    mockRequireMerchantAccountForUser.mockResolvedValue(null);
    mockAssertMerchantProductAccess.mockResolvedValue(undefined);

    mockPrisma.product.findUnique.mockResolvedValue({
      id: 'product-1',
      companyId: 'company-1',
      deletedAt: null,
    });
    mockPrisma.productVariant.findFirst.mockResolvedValue({
      id: 'variant-1',
      productId: 'product-1',
      images: null,
    });
    mockPrisma.productVariant.update.mockImplementation(async ({ where, data }) => ({
      id: where.id,
      ...data,
    }));
    mockPrisma.userCompany.findFirst.mockResolvedValue(null);
  });

  test('updates variant stock and clears nullable decimal fields for company users', async () => {
    const req = {
      user: {
        id: 'user-1',
        companyId: 'company-1',
        role: 'OWNER',
      },
      params: {
        id: 'product-1',
        variantId: 'variant-1',
      },
      body: {
        name: 'Red',
        type: 'color',
        price: null,
        comparePrice: null,
        cost: '',
        images: '["https://cdn.example.com/red.jpg"]',
        stock: '7',
        trackInventory: false,
        sortOrder: '2',
        metadata: '{"attributeValues":{"color":"Red"}}',
      },
    };
    const res = createMockResponse();

    await updateProductVariant(req, res);

    expect(res.status).not.toHaveBeenCalledWith(500);
    expect(mockPrisma.productVariant.update).toHaveBeenCalledWith({
      where: { id: 'variant-1' },
      data: expect.objectContaining({
        name: 'Red',
        type: 'color',
        price: null,
        comparePrice: null,
        cost: null,
        images: JSON.stringify(['https://cdn.example.com/red.jpg']),
        stock: 7,
        trackInventory: false,
        sortOrder: 2,
        metadata: '{"attributeValues":{"color":"Red"}}',
        updatedAt: expect.any(Date),
      }),
    });
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          id: 'variant-1',
          stock: 7,
        }),
      }),
    );
  });

  test('does not mutate variant stock for company-warehouse merchants', async () => {
    mockIsMerchantUser.mockReturnValue(true);
    mockRequireMerchantAccountForUser.mockResolvedValue({
      id: 'merchant-1',
      fulfillmentMode: 'COMPANY_WAREHOUSE',
    });

    const req = {
      user: {
        id: 'merchant-user-1',
        companyId: 'company-1',
        role: 'MERCHANT',
      },
      params: {
        id: 'product-1',
        variantId: 'variant-1',
      },
      body: {
        price: '120',
        stock: '99',
        trackInventory: false,
      },
    };
    const res = createMockResponse();

    await updateProductVariant(req, res);

    const updateCall = mockPrisma.productVariant.update.mock.calls[0][0];
    expect(updateCall.data).toEqual(
      expect.objectContaining({
        price: 120,
        updatedAt: expect.any(Date),
      }),
    );
    expect(updateCall.data).not.toHaveProperty('stock');
    expect(updateCall.data).not.toHaveProperty('trackInventory');
    expect(res.status).not.toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
      }),
    );
  });
});
