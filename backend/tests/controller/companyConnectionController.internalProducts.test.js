const mockEnsureWithinPlanLimit = jest.fn();
const mockResolveProductMediaState = jest.fn();

const mockPrisma = {
  companyConnection: {
    findUnique: jest.fn(),
  },
  product: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  productVariant: {
    create: jest.fn(),
  },
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
  executeWithRetry: jest.fn(async (operation) => operation()),
}));

jest.mock('../../utils/productMediaUtils', () => ({
  resolveProductMediaState: (...args) => mockResolveProductMediaState(...args),
}));

jest.mock('../../utils/planLimitPayloads', () => ({
  ensureWithinPlanLimit: (...args) => mockEnsureWithinPlanLimit(...args),
}));

const {
  fetchProductsFromProvider,
  importInternalProducts,
} = require('../../controller/companyConnectionController');

const createMockResponse = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
});

describe('companyConnectionController internal product sync', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockPrisma.companyConnection.findUnique.mockResolvedValue({
      id: 'conn-1',
      status: 'ACTIVE',
      allowProductPull: true,
    });
    mockEnsureWithinPlanLimit.mockResolvedValue({ allowed: true });
    mockResolveProductMediaState.mockImplementation(({ nextImages = [] }) => ({
      images: Array.isArray(nextImages) ? nextImages : [],
      mainImage: Array.isArray(nextImages) && nextImages.length > 0 ? nextImages[0] : null,
    }));
    mockPrisma.product.findFirst.mockResolvedValue(null);
    mockPrisma.product.create.mockImplementation(async ({ data }) => ({
      id: 'product-imported-1',
      ...data,
    }));
    mockPrisma.productVariant.create.mockImplementation(async ({ data }) => ({
      id: `variant-${data.name}`,
      ...data,
    }));
  });

  test('fetchProductsFromProvider returns variants with parsed images and decimals', async () => {
    mockPrisma.product.findMany.mockResolvedValue([
      {
        id: 'provider-product-1',
        name: 'Runner',
        description: 'Lightweight',
        price: '499.00',
        comparePrice: '599.00',
        sku: 'RUN-1',
        stock: 12,
        images: '["/shoe-a.png","/shoe-b.png"]',
        categoryId: 'cat-1',
        category: { name: 'Shoes' },
        productVariants: [
          {
            id: 'variant-1',
            name: 'Black 42',
            type: 'size',
            sku: 'RUN-1-42',
            price: '499.00',
            comparePrice: null,
            cost: '220.00',
            images: '["/variant-42.png"]',
            stock: 5,
            trackInventory: true,
            isActive: true,
            sortOrder: 1,
            metadata: '{"size":"42"}',
          },
        ],
      },
    ]);

    const req = {
      user: { companyId: 'consumer-1' },
      params: { providerId: 'provider-1' },
    };
    const res = createMockResponse();

    await fetchProductsFromProvider(req, res);

    expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { companyId: 'provider-1', isActive: true },
      }),
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          count: 1,
          products: [
            expect.objectContaining({
              internalId: 'provider-product-1',
              images: ['/shoe-a.png', '/shoe-b.png'],
              variants: [
                expect.objectContaining({
                  internalId: 'variant-1',
                  images: ['/variant-42.png'],
                  price: 499,
                  cost: 220,
                }),
              ],
            }),
          ],
        }),
      }),
    );
  });

  test('importInternalProducts creates variants for imported internal products', async () => {
    const req = {
      user: { companyId: 'consumer-1' },
      params: { providerId: 'provider-1' },
      body: {
        products: [
          {
            internalId: 'provider-product-1',
            name: 'Runner',
            description: 'Lightweight',
            price: 499,
            comparePrice: 599,
            sku: 'RUN-1',
            stock: 12,
            images: ['/shoe-a.png', '/shoe-b.png'],
            variants: [
              {
                internalId: 'variant-1',
                name: 'Black 42',
                type: 'size',
                sku: 'RUN-1-42',
                price: 499,
                comparePrice: null,
                cost: 220,
                images: ['/variant-42.png'],
                stock: 5,
                trackInventory: true,
                isActive: true,
                sortOrder: 1,
                metadata: '{"size":"42"}',
              },
              {
                internalId: 'variant-2',
                name: 'Black 43',
                type: 'size',
                sku: 'RUN-1-43',
                price: 499,
                comparePrice: null,
                cost: 220,
                images: [],
                stock: 7,
                trackInventory: true,
                isActive: true,
                sortOrder: 2,
                metadata: null,
              },
            ],
          },
        ],
      },
    };
    const res = createMockResponse();

    await importInternalProducts(req, res);

    expect(mockEnsureWithinPlanLimit).toHaveBeenCalledWith('consumer-1', 'products', 1);
    expect(mockPrisma.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          externalId: 'provider-product-1',
          source: 'internal',
          mainImage: '/shoe-a.png',
        }),
      }),
    );
    expect(mockPrisma.productVariant.create).toHaveBeenCalledTimes(2);
    expect(mockPrisma.productVariant.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          productId: 'product-imported-1',
          name: 'Black 42',
          sku: 'RUN-1-42',
          images: '["/variant-42.png"]',
          stock: 5,
          metadata: '{"size":"42"}',
        }),
      }),
    );
    expect(mockPrisma.productVariant.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          productId: 'product-imported-1',
          name: 'Black 43',
          sku: 'RUN-1-43',
          images: null,
          stock: 7,
          metadata: null,
        }),
      }),
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          imported: 1,
          skipped: 0,
          failed: 0,
        }),
      }),
    );
  });
});
