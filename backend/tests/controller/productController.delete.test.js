const mockPrisma = {
  product: {
    count: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  affiliateSetting: {
    findUnique: jest.fn(),
  },
  affiliate: {
    findUnique: jest.fn(),
  },
  backInStockNotification: {
    groupBy: jest.fn(),
  },
  affiliateProduct: {
    findMany: jest.fn(),
  },
  inventory: {
    groupBy: jest.fn(),
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
  ensureWithinPlanLimit: jest.fn(async () => ({
    allowed: true,
  })),
}));

const {
  getAllProducts,
  deleteSingleProduct,
  getDeletedProducts,
  restoreProduct,
  permanentDeleteProduct,
} = require('../../controller/productController');

function createMockResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe('productController delete and trash flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.affiliateSetting.findUnique.mockResolvedValue(null);
    mockPrisma.product.count.mockResolvedValue(0);
    mockPrisma.product.findMany.mockResolvedValue([]);
    mockPrisma.product.findUnique.mockResolvedValue(null);
    mockPrisma.affiliate.findUnique.mockResolvedValue(null);
    mockPrisma.affiliateProduct.findMany.mockResolvedValue([]);
    mockPrisma.backInStockNotification.groupBy.mockResolvedValue([]);
    mockPrisma.inventory.groupBy.mockResolvedValue([]);
  });

  test('getAllProducts excludes soft-deleted products from the default listing', async () => {
    mockPrisma.product.count.mockResolvedValue(1);
    mockPrisma.product.findMany.mockResolvedValue([
      {
        id: 'product-1',
        name: 'Visible Product',
        price: 99,
        metadata: null,
      },
    ]);

    const req = {
      user: {
        id: 'user-1',
        companyId: 'company-1',
        role: 'OWNER',
      },
      query: {},
    };
    const res = createMockResponse();

    await getAllProducts(req, res);

    expect(mockPrisma.product.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: 'company-1',
          deletedAt: null,
        }),
      }),
    );
    expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: 'company-1',
          deletedAt: null,
        }),
      }),
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({ id: 'product-1' }),
        ]),
      }),
    );
  });

  test('getAllProducts exposes fulfillable merchant stock for affiliate manual orders', async () => {
    mockPrisma.affiliate.findUnique.mockResolvedValue({
      id: 'affiliate-1',
      companyId: 'company-1',
    });
    mockPrisma.product.findMany.mockResolvedValue([
      {
        id: 'self-ship-product',
        name: 'Self Ship Product',
        price: 120,
        stock: 0,
        metadata: null,
        merchantProducts: [
          {
            id: 'mp-1',
            merchantId: 'merchant-1',
            stock: 14,
            isActive: true,
            syncEnabled: true,
            merchant: {
              id: 'merchant-1',
              isActive: true,
              fulfillmentMode: 'MERCHANT',
            },
          },
        ],
        productVariants: [],
      },
      {
        id: 'company-warehouse-product',
        name: 'Company Warehouse Product',
        price: 160,
        stock: 0,
        metadata: null,
        merchantProducts: [
          {
            id: 'mp-2',
            merchantId: 'merchant-2',
            stock: 0,
            isActive: true,
            syncEnabled: true,
            merchant: {
              id: 'merchant-2',
              isActive: true,
              fulfillmentMode: 'COMPANY_WAREHOUSE',
              defaultWarehouseId: 'warehouse-1',
            },
          },
        ],
        productVariants: [],
      },
    ]);
    mockPrisma.inventory.groupBy.mockResolvedValue([
      {
        productId: 'company-warehouse-product',
        _max: { available: 23 },
      },
    ]);

    const req = {
      user: {
        id: 'user-1',
        companyId: 'company-1',
        role: 'AFFILIATE',
      },
      query: {
        manualOrder: 'true',
        page: '1',
        limit: '20',
      },
    };
    const res = createMockResponse();

    await getAllProducts(req, res);

    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'self-ship-product',
          stock: 14,
          availableStock: 14,
          fulfillableStock: 14,
        }),
        expect.objectContaining({
          id: 'company-warehouse-product',
          stock: 23,
          availableStock: 23,
          fulfillableStock: 23,
        }),
      ]),
    );
    expect(mockPrisma.inventory.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          productId: { in: ['company-warehouse-product'] },
          warehouse: expect.objectContaining({
            companyId: 'company-1',
            isActive: true,
          }),
        }),
      }),
    );
  });

  test('deleteSingleProduct stamps deletedAt and clears the product from retrieval cache', async () => {
    mockPrisma.product.findUnique.mockResolvedValue({
      id: 'product-1',
      companyId: 'company-1',
      deletedAt: null,
    });
    mockPrisma.product.update.mockResolvedValue({
      id: 'product-1',
      deletedAt: new Date(),
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
    };
    const res = createMockResponse();

    await deleteSingleProduct(req, res);

    expect(mockPrisma.product.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'product-1' },
        select: expect.objectContaining({
          id: true,
          companyId: true,
          deletedAt: true,
        }),
      }),
    );
    expect(mockPrisma.product.update).toHaveBeenCalledWith({
      where: { id: 'product-1' },
      data: {
        deletedAt: expect.any(Date),
      },
    });
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
      }),
    );
  });

  test('getDeletedProducts only returns products that are already in trash', async () => {
    const deletedAt = new Date('2026-04-30T12:00:00.000Z');
    mockPrisma.product.findMany.mockResolvedValue([
      {
        id: 'product-trashed',
        name: 'Deleted Product',
        deletedAt,
      },
    ]);

    const req = {
      user: {
        companyId: 'company-1',
      },
    };
    const res = createMockResponse();

    await getDeletedProducts(req, res);

    expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
      where: {
        companyId: 'company-1',
        deletedAt: { not: null },
      },
      orderBy: {
        deletedAt: 'desc',
      },
      include: {
        category: true,
      },
    });
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        count: 1,
      }),
    );
  });

  test('restoreProduct clears deletedAt for trashed products only', async () => {
    mockPrisma.product.findFirst.mockResolvedValue({
      id: 'product-1',
      companyId: 'company-1',
      deletedAt: new Date('2026-04-30T10:00:00.000Z'),
    });
    mockPrisma.product.update.mockResolvedValue({
      id: 'product-1',
      deletedAt: null,
    });

    const req = {
      user: {
        companyId: 'company-1',
      },
      params: {
        id: 'product-1',
      },
    };
    const res = createMockResponse();

    await restoreProduct(req, res);

    expect(mockPrisma.product.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'product-1',
        companyId: 'company-1',
        deletedAt: { not: null },
      },
    });
    expect(mockPrisma.product.update).toHaveBeenCalledWith({
      where: { id: 'product-1' },
      data: {
        deletedAt: null,
      },
    });
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
      }),
    );
  });

  test('permanentDeleteProduct only hard-deletes items that are already in trash', async () => {
    mockPrisma.product.findFirst.mockResolvedValue({
      id: 'product-1',
      companyId: 'company-1',
      deletedAt: new Date('2026-04-30T10:00:00.000Z'),
    });
    mockPrisma.product.delete.mockResolvedValue({
      id: 'product-1',
    });

    const req = {
      user: {
        companyId: 'company-1',
      },
      params: {
        id: 'product-1',
      },
    };
    const res = createMockResponse();

    await permanentDeleteProduct(req, res);

    expect(mockPrisma.product.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'product-1',
        companyId: 'company-1',
        deletedAt: { not: null },
      },
    });
    expect(mockPrisma.product.delete).toHaveBeenCalledWith({
      where: { id: 'product-1' },
    });
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
      }),
    );
  });
});
