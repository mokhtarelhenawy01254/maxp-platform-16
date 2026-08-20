const mockPrisma = {
  $transaction: jest.fn((fn) => fn(mockPrisma)),
  product: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  productPresentation: {
    findFirst: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
  },
  inventory: {
    findMany: jest.fn(),
    upsert: jest.fn(),
  },
  orderItem: {
    updateMany: jest.fn(),
  },
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
  initializeSharedDatabase: jest.fn(),
  executeWithRetry: jest.fn(async (operation) => operation()),
  safeQuery: jest.fn(async (operation) => operation()),
}));

jest.mock('../../utils/productMediaUtils', () => ({
  sanitizeImageCollection: jest.fn((value) => value),
}));

jest.mock('../../utils/merchantAccountScope', () => ({
  isMerchantUser: jest.fn(() => false),
  requireMerchantAccountForUser: jest.fn(),
  syncMerchantProductStock: jest.fn(() => Promise.resolve()),
}));

const {
  convertProductToPresentation,
  convertBulkProductsToPresentations,
} = require('../../controller/productConversionController');

const createMockResponse = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
  redirect: jest.fn().mockReturnThis(),
});

const sourceProduct = {
  id: 'src-1',
  companyId: 'company-1',
  deletedAt: null,
  name: 'Sparkle Sneakers Duplicate',
  slug: 'sparkle-sneakers-duplicate',
  sku: 'SPARK-002',
  description: 'A duplicated pair',
  images: '["/uploads/sparkle.jpg"]',
  mainImage: '/uploads/sparkle.jpg',
  stock: 5,
  isDropshipped: false,
  merchantProductId: null,
};

const targetProduct = {
  id: 'tgt-1',
  companyId: 'company-1',
  deletedAt: null,
  name: 'Sparkle Sneakers',
  slug: 'sparkle-sneakers',
  sku: 'SPARK-001',
  stock: 2,
};

const createProduct = ({ id, productId, ...data }) => ({
  id,
  productId,
  ...data,
});

const productUpdates = [];

describe('productConversionController.convertProductToPresentation', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    productUpdates.length = 0;

    mockPrisma.product.findFirst.mockImplementation(({ where }) => {
      if (where.id === 'src-1') return Promise.resolve(sourceProduct);
      if (where.id === 'tgt-1') return Promise.resolve(targetProduct);
      return Promise.resolve(null);
    });

    mockPrisma.product.update.mockImplementation(async ({ where, data }) => {
      productUpdates.push({ where, data });
      return { id: where.id, companyId: 'company-1', ...data };
    });

    mockPrisma.productPresentation.findFirst.mockResolvedValue(null);
    mockPrisma.productPresentation.count.mockResolvedValue(0);
    mockPrisma.productPresentation.create.mockImplementation(async ({ data }) =>
      createProduct({ id: 'pres-1', productId: data.productId, ...data }),
    );
    mockPrisma.orderItem.updateMany.mockResolvedValue({ count: 2 });
  });

  test('returns 404 when the source product is missing', async () => {
    mockPrisma.product.findFirst.mockResolvedValue(null);

    const req = {
      user: { id: 'user-1', companyId: 'company-1', role: 'OWNER' },
      params: { id: 'missing-1' },
      body: { targetProductId: 'tgt-1' },
    };
    const res = createMockResponse();

    await convertProductToPresentation(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'المنتج غير موجود' });
    expect(mockPrisma.productPresentation.create).not.toHaveBeenCalled();
  });

  test('returns 404 when the target product is missing', async () => {
    mockPrisma.product.findFirst.mockImplementation(({ where }) => {
      if (where.id === 'src-1') return Promise.resolve(sourceProduct);
      return Promise.resolve(null);
    });

    const req = {
      user: { id: 'user-1', companyId: 'company-1', role: 'OWNER' },
      params: { id: 'src-1' },
      body: { targetProductId: 'missing-target' },
    };
    const res = createMockResponse();

    await convertProductToPresentation(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'المنتج الهدف غير موجود' });
    expect(mockPrisma.productPresentation.create).not.toHaveBeenCalled();
  });

  test('returns 400 when converting a product onto itself', async () => {
    const req = {
      user: { id: 'user-1', companyId: 'company-1', role: 'OWNER' },
      params: { id: 'src-1' },
      body: { targetProductId: 'src-1' },
    };
    const res = createMockResponse();

    await convertProductToPresentation(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'لا يمكن تحويل المنتج إلى نفسه' });
    expect(mockPrisma.productPresentation.create).not.toHaveBeenCalled();
  });

  test('returns 400 when targetProductId is missing', async () => {
    const req = {
      user: { id: 'user-1', companyId: 'company-1', role: 'OWNER' },
      params: { id: 'src-1' },
      body: {},
    };
    const res = createMockResponse();

    await convertProductToPresentation(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'معرف المنتج الهدف مطلوب' });
  });

  test('success path: creates presentation on target, merges stock, re-points orders, nulls SKU then soft-deletes', async () => {
    const req = {
      user: { id: 'user-1', companyId: 'company-1', role: 'OWNER' },
      params: { id: 'src-1' },
      body: { targetProductId: 'tgt-1' },
    };
    const res = createMockResponse();

    await convertProductToPresentation(req, res);

    expect(mockPrisma.productPresentation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          productId: 'tgt-1',
          name: 'Sparkle Sneakers Duplicate',
          slug: 'sparkle-sneakers-duplicate',
          title: 'Sparkle Sneakers Duplicate',
          description: 'A duplicated pair',
          isActive: true,
          sortOrder: 0,
          metadata: expect.stringContaining('"convertedFromProductId":"src-1"'),
        }),
      }),
    );

    const metadata = JSON.parse(
      mockPrisma.productPresentation.create.mock.calls[0][0].data.metadata,
    );
    expect(metadata.convertedFromProductId).toBe('src-1');
    expect(metadata.convertedFromSku).toBe('SPARK-002');
    expect(metadata.convertedAt).toBeDefined();

    const stockMergeCall = productUpdates.find(
      (u) => u.where.id === 'tgt-1' && typeof u.data.stock === 'number',
    );
    expect(stockMergeCall).toBeDefined();
    expect(stockMergeCall.data.stock).toBe(7);

    const skuNullIndex = productUpdates.findIndex(
      (u) => u.where.id === 'src-1' && u.data && u.data.sku === null,
    );
    const softDeleteIndex = productUpdates.findIndex(
      (u) => u.where.id === 'src-1' && u.data && u.data.deletedAt instanceof Date,
    );
    expect(skuNullIndex).toBeGreaterThanOrEqual(0);
    expect(softDeleteIndex).toBeGreaterThan(skuNullIndex);

    expect(mockPrisma.orderItem.updateMany).toHaveBeenCalledWith({
      where: { productId: 'src-1' },
      data: { productId: 'tgt-1' },
    });

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: 'تم تحويل المنتج إلى عرض تقديمي بنجاح',
        data: expect.objectContaining({
          targetProductId: 'tgt-1',
          presentationSlug: 'sparkle-sneakers/sparkle-sneakers-duplicate',
          movedOrderItems: 2,
          mergedStock: true,
        }),
      }),
    );
  });

  test('merges stock into inventory for merchant-managed sources using the source warehouse', async () => {
    mockPrisma.inventory.findMany.mockResolvedValue([
      {
        id: 'inv-1',
        warehouseId: 'warehouse-1',
        quantity: 4,
        available: 4,
        batchNumber: null,
      },
    ]);

    const merchantSource = { ...sourceProduct, isDropshipped: true };
    mockPrisma.product.findFirst.mockImplementation(({ where }) => {
      if (where.id === 'src-1') return Promise.resolve(merchantSource);
      if (where.id === 'tgt-1') return Promise.resolve(targetProduct);
      return Promise.resolve(null);
    });

    const req = {
      user: { id: 'user-1', companyId: 'company-1', role: 'OWNER' },
      params: { id: 'src-1' },
      body: { targetProductId: 'tgt-1' },
    };
    const res = createMockResponse();

    await convertProductToPresentation(req, res);

    expect(mockPrisma.inventory.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          productId_warehouseId_batchNumber: {
            productId: 'tgt-1',
            warehouseId: 'warehouse-1',
            batchNumber: null,
          },
        },
        update: expect.objectContaining({
          quantity: { increment: 4 },
          available: { increment: 4 },
        }),
        create: expect.objectContaining({
          productId: 'tgt-1',
          warehouseId: 'warehouse-1',
          quantity: 4,
          available: 4,
          reserved: 0,
        }),
      }),
    );

    const resJson = res.json.mock.calls[0][0];
    expect(resJson.data.mergedStock).toBe(true);
  });

  test('applies a -2 suffix when the target already has a presentation with the same slug', async () => {
    mockPrisma.productPresentation.findFirst
      .mockResolvedValueOnce({ id: 'existing-pres' })
      .mockResolvedValueOnce(null);

    const req = {
      user: { id: 'user-1', companyId: 'company-1', role: 'OWNER' },
      params: { id: 'src-1' },
      body: { targetProductId: 'tgt-1' },
    };
    const res = createMockResponse();

    await convertProductToPresentation(req, res);

    expect(mockPrisma.productPresentation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ slug: 'sparkle-sneakers-duplicate-2' }),
      }),
    );
  });
});

describe('productConversionController.convertBulkProductsToPresentations', () => {
  const createBulkReq = (body) => ({
    user: { id: 'user-1', companyId: 'company-1', role: 'OWNER' },
    body,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.product.findFirst.mockImplementation(({ where }) => {
      if (where.id === 'tgt-1' || where.id === 'tgt-2') {
        return Promise.resolve({ id: where.id, slug: `tgt-${where.id === 'tgt-1' ? '1' : '2'}`, stock: 2 });
      }
      return Promise.resolve(sourceProduct);
    });
    mockPrisma.productPresentation.findFirst.mockResolvedValue(null);
    mockPrisma.productPresentation.count.mockResolvedValue(0);
    mockPrisma.productPresentation.create.mockImplementation(async ({ data }) => ({
      id: 'pres-bulk',
      productId: data.productId,
      ...data,
    }));
    mockPrisma.orderItem.updateMany.mockResolvedValue({ count: 0 });
    mockPrisma.product.update.mockImplementation(async ({ where, data }) => ({
      id: where.id,
      companyId: 'company-1',
      ...data,
    }));
    mockPrisma.inventory.findMany.mockResolvedValue([]);
  });

  test('returns 400 when no source products are provided', async () => {
    const req = createBulkReq({ sourceProductIds: [], targetProductId: 'tgt-1' });
    const res = createMockResponse();

    await convertBulkProductsToPresentations(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'اختر منتجاً واحداً على الأقل للتحويل',
    });
  });

  test('returns 400 when target is missing', async () => {
    const req = createBulkReq({ sourceProductIds: ['src-1'], targetProductId: '' });
    const res = createMockResponse();

    await convertBulkProductsToPresentations(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'معرف المنتج الهدف مطلوب',
    });
  });

  test('returns 404 when the target product does not exist', async () => {
    mockPrisma.product.findFirst.mockResolvedValue(null); // target lookup misses

    const req = createBulkReq({
      sourceProductIds: ['src-1'],
      targetProductId: 'no-such-target',
    });
    const res = createMockResponse();

    await convertBulkProductsToPresentations(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'المنتج الهدف غير موجود',
    });
  });

  test('converts multiple sources and skips invalid ones without stopping the rest', async () => {
    mockPrisma.product.findFirst.mockImplementation(({ where }) => {
      if (where.id === 'tgt-1') {
        return Promise.resolve({ id: 'tgt-1', slug: 'tgt-1', stock: 2 });
      }
      if (where.id === 'src-1' || where.id === 'src-2') {
        return Promise.resolve({ ...sourceProduct, id: where.id });
      }
      return Promise.resolve(null); // src-3 missing -> skipped
    });

    const req = createBulkReq({
      sourceProductIds: ['src-1', 'src-2', 'src-3'],
      targetProductId: 'tgt-1',
    });
    const res = createMockResponse();

    await convertBulkProductsToPresentations(req, res);

    expect(mockPrisma.productPresentation.create).toHaveBeenCalledTimes(2);
    const payload = res.json.mock.calls[0][0];
    expect(payload.data.convertedCount).toBe(2);
    expect(payload.data.skippedCount).toBe(1);
    expect(payload.data.skipped[0].reason).toBe('المنتج غير موجود');
  });

  test('skips converting a product onto itself', async () => {
    const req = createBulkReq({
      sourceProductIds: ['tgt-1', 'src-1'],
      targetProductId: 'tgt-1',
    });
    const res = createMockResponse();

    await convertBulkProductsToPresentations(req, res);

    const payload = res.json.mock.calls[0][0];
    expect(payload.data.convertedCount).toBe(1);
    expect(payload.data.skippedCount).toBe(1);
    expect(payload.data.skipped[0].reason).toBe('لا يمكن تحويل المنتج إلى نفسه');
  });
});
