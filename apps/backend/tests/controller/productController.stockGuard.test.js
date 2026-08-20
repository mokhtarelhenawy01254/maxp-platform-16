const mockEnsureWithinPlanLimit = jest.fn();
const mockPrisma = {
  product: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
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

jest.mock('../../services/rag/RagKnowledgeMaintenanceService', () => ({
  backfillProductEmbeddings: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../services/aiServiceAdminClient', () => ({
  triggerProductEmbeddingSync: jest.fn(() => Promise.resolve()),
  embedKnowledgeItem: jest.fn(() => Promise.resolve()),
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

const { createProduct } = require('../../controller/productController');
const { getSharedPrismaClient } = require('../../services/sharedDatabase');

function createMockResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe('productController stock cap guardrail (createProduct)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getSharedPrismaClient.mockImplementation(() => mockPrisma);
    mockEnsureWithinPlanLimit.mockResolvedValue({ allowed: true });
    mockPrisma.product.findFirst.mockResolvedValue(null);
  });

  test('blocks product creation when stock exceeds the logical cap', async () => {
    const req = {
      user: { companyId: 'company-1' },
      body: {
        name: 'Test Product',
        price: 99.99,
        stock: '99914',
      },
    };
    const res = createMockResponse();

    await createProduct(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining('10000'),
      }),
    );
    expect(mockPrisma.product.create).not.toHaveBeenCalled();
  });

  test('allows product creation when stock is within the cap', async () => {
    mockPrisma.product.create.mockResolvedValue({
      id: 'product-1',
      name: 'Test Product',
      description: '',
      price: 99.99,
      stock: 5000,
      category: null,
      tags: null,
    });
    mockPrisma.product.findUnique.mockResolvedValue({
      id: 'product-1',
      name: 'Test Product',
      description: '',
      stock: 5000,
      category: null,
      tags: null,
    });

    const req = {
      user: { companyId: 'company-1' },
      body: {
        name: 'Test Product',
        price: 99.99,
        stock: '5000',
      },
    };
    const res = createMockResponse();

    await createProduct(req, res);

    expect(res.status).not.toHaveBeenCalledWith(400);
    expect(mockPrisma.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ stock: 5000 }),
      }),
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    );
  });
});
