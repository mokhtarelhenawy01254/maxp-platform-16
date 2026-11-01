jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
  initializeSharedDatabase: jest.fn(),
  executeWithRetry: jest.fn((fn) => fn()),
  safeQuery: jest.fn((fn) => (typeof fn === 'function' ? fn() : fn)),
}));

// Native/heavy deps that are not installed in a bare worktree.
jest.mock('../../utils/imageProcessor', () => ({
  processImage: jest.fn(),
  uploadImage: jest.fn(),
  deleteImage: jest.fn(),
}));

jest.mock('sharp', () => jest.fn(), { virtual: true });

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const productController = require('../../controller/productController');

const createResponse = () => {
  const res = {
    statusCode: 200,
    payload: null,
    status: jest.fn((code) => {
      res.statusCode = code;
      return res;
    }),
    json: jest.fn((payload) => {
      res.payload = payload;
      return res;
    }),
  };
  return res;
};

const createRequest = ({ role = 'COMPANY_ADMIN', query = {}, isOwner = false, companyId = 'company-test-1' } = {}) => ({
  user: {
    id: 'user-test-1',
    companyId,
    role,
    isOwner,
  },
  query,
});

describe('productController - active & inactive filter in getAllProducts', () => {
  let mockPrisma;

  beforeEach(() => {
    jest.clearAllMocks();

    mockPrisma = {
      product: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'prod-1',
            name: 'Test Product',
            price: 100,
            isActive: true,
            deletedAt: null,
            companyId: 'company-test-1',
            productVariants: [],
            merchantProducts: [],
          },
        ]),
      },
      affiliateSetting: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      affiliate: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      affiliateProduct: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      backInStockNotification: {
        groupBy: jest.fn().mockResolvedValue([]),
      },
    };

    getSharedPrismaClient.mockReturnValue(mockPrisma);
  });

  describe('Default behavior (without includeInactive)', () => {
    test('getAllProducts without includeInactive sets isActive: true and deletedAt: null in where', async () => {
      const req = createRequest({ role: 'COMPANY_ADMIN', query: {} });
      const res = createResponse();

      await productController.getAllProducts(req, res);

      expect(res.statusCode).toBe(200);
      expect(mockPrisma.product.findMany).toHaveBeenCalled();

      const findManyCall = mockPrisma.product.findMany.mock.calls[0][0];
      expect(findManyCall.where.isActive).toBe(true);
      expect(findManyCall.where.deletedAt).toBeNull();
      expect(findManyCall.where.companyId).toBe('company-test-1');

      const countCall = mockPrisma.product.count.mock.calls[0][0];
      expect(countCall.where.isActive).toBe(true);
      expect(countCall.where.deletedAt).toBeNull();
    });

    test('manualOrder=true without includeInactive also enforces isActive: true and deletedAt: null', async () => {
      const req = createRequest({
        role: 'COMPANY_ADMIN',
        query: { manualOrder: 'true', page: '1', limit: '200' },
      });
      const res = createResponse();

      await productController.getAllProducts(req, res);

      expect(res.statusCode).toBe(200);
      const findManyCall = mockPrisma.product.findMany.mock.calls[0][0];
      expect(findManyCall.where.isActive).toBe(true);
      expect(findManyCall.where.deletedAt).toBeNull();
    });
  });

  describe('Administrative role with includeInactive=true or ?status=all', () => {
    test('includeInactive=true with role COMPANY_ADMIN does not restrict isActive but maintains deletedAt: null', async () => {
      const req = createRequest({
        role: 'COMPANY_ADMIN',
        query: { includeInactive: 'true' },
      });
      const res = createResponse();

      await productController.getAllProducts(req, res);

      expect(res.statusCode).toBe(200);
      const findManyCall = mockPrisma.product.findMany.mock.calls[0][0];
      expect(findManyCall.where.isActive).toBeUndefined();
      expect(findManyCall.where.deletedAt).toBeNull();
      expect(findManyCall.where.companyId).toBe('company-test-1');

      const countCall = mockPrisma.product.count.mock.calls[0][0];
      expect(countCall.where.isActive).toBeUndefined();
      expect(countCall.where.deletedAt).toBeNull();
    });

    test('includeInactive=true with role SUPER_ADMIN allows inactive products with deletedAt: null', async () => {
      const req = createRequest({
        role: 'SUPER_ADMIN',
        query: { includeInactive: 'true' },
      });
      const res = createResponse();

      await productController.getAllProducts(req, res);

      expect(res.statusCode).toBe(200);
      const findManyCall = mockPrisma.product.findMany.mock.calls[0][0];
      expect(findManyCall.where.isActive).toBeUndefined();
      expect(findManyCall.where.deletedAt).toBeNull();
    });

    test('includeInactive=true with role OWNER allows inactive products with deletedAt: null', async () => {
      const req = createRequest({
        role: 'OWNER',
        query: { includeInactive: 'true' },
      });
      const res = createResponse();

      await productController.getAllProducts(req, res);

      expect(res.statusCode).toBe(200);
      const findManyCall = mockPrisma.product.findMany.mock.calls[0][0];
      expect(findManyCall.where.isActive).toBeUndefined();
      expect(findManyCall.where.deletedAt).toBeNull();
    });

    test('status=all with role COMPANY_ADMIN does not restrict isActive but maintains deletedAt: null', async () => {
      const req = createRequest({
        role: 'COMPANY_ADMIN',
        query: { status: 'all' },
      });
      const res = createResponse();

      await productController.getAllProducts(req, res);

      expect(res.statusCode).toBe(200);
      const findManyCall = mockPrisma.product.findMany.mock.calls[0][0];
      expect(findManyCall.where.isActive).toBeUndefined();
      expect(findManyCall.where.deletedAt).toBeNull();
    });
  });

  describe('Non-administrative roles attempting includeInactive or status=all', () => {
    test('includeInactive=true with role EMPLOYEE falls back to active only (isActive: true, deletedAt: null)', async () => {
      const req = createRequest({
        role: 'EMPLOYEE',
        query: { includeInactive: 'true' },
      });
      const res = createResponse();

      await productController.getAllProducts(req, res);

      expect(res.statusCode).toBe(200);
      const findManyCall = mockPrisma.product.findMany.mock.calls[0][0];
      expect(findManyCall.where.isActive).toBe(true);
      expect(findManyCall.where.deletedAt).toBeNull();

      const countCall = mockPrisma.product.count.mock.calls[0][0];
      expect(countCall.where.isActive).toBe(true);
      expect(countCall.where.deletedAt).toBeNull();
    });

    test('includeInactive=true with role AFFILIATE falls back to active only', async () => {
      const req = createRequest({
        role: 'AFFILIATE',
        query: { includeInactive: 'true' },
      });
      const res = createResponse();

      await productController.getAllProducts(req, res);

      expect(res.statusCode).toBe(200);
      const findManyCall = mockPrisma.product.findMany.mock.calls[0][0];
      expect(findManyCall.where.isActive).toBe(true);
      expect(findManyCall.where.deletedAt).toBeNull();
    });

    test('status=all with role EMPLOYEE falls back to active only', async () => {
      const req = createRequest({
        role: 'EMPLOYEE',
        query: { status: 'all' },
      });
      const res = createResponse();

      await productController.getAllProducts(req, res);

      expect(res.statusCode).toBe(200);
      const findManyCall = mockPrisma.product.findMany.mock.calls[0][0];
      expect(findManyCall.where.isActive).toBe(true);
      expect(findManyCall.where.deletedAt).toBeNull();
    });
  });

  describe('Deleted products defense (deletedAt: null guarantee)', () => {
    test('deletedAt: null is always enforced even with includeInactive=true and admin role', async () => {
      const req = createRequest({
        role: 'SUPER_ADMIN',
        query: { includeInactive: 'true', page: '1', limit: '50' },
      });
      const res = createResponse();

      await productController.getAllProducts(req, res);

      const findManyCall = mockPrisma.product.findMany.mock.calls[0][0];
      expect(findManyCall.where.deletedAt).toBeNull();
    });
  });
});
