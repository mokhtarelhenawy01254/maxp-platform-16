const {
  consolidateProducts,
  listDuplicateGroups,
} = require("../../services/productConsolidationService");

jest.mock("../../services/sharedDatabase", () => ({
  getSharedPrismaClient: () => mockPrisma,
}));

let mockPrisma;

const baseProduct = (overrides = {}) => ({
  id: "prod-1",
  name: "Sneaker",
  sku: "SKU-1",
  price: 499,
  comparePrice: 599,
  cost: 200,
  images: JSON.stringify(["img1.jpg"]),
  mainImage: "img1.jpg",
  stock: 10,
  trackInventory: true,
  categoryId: null,
  companyId: "company-1",
  isActive: true,
  isFeatured: false,
  tags: null,
  deletedAt: null,
  ...overrides,
});

describe("productConsolidationService", () => {
  beforeEach(() => {
    mockPrisma = {
      product: {
        findMany: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(({ data }) => Promise.resolve({ id: "new-product-1", ...data })),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        delete: jest.fn().mockResolvedValue({}),
      },
      productVariant: {
        create: jest.fn(({ data }) => Promise.resolve({ id: `variant-${data.name}`, ...data })),
      },
      orderItem: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      productPresentation: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      productAnalytic: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      stockMovement: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      wishlist: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      recentlyViewed: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("creates a new product with variants keeping each source SKU", async () => {
    const products = [
      baseProduct({ id: "prod-1", name: "Sneaker A", sku: "SKU-A" }),
      baseProduct({ id: "prod-2", name: "Sneaker B", sku: "SKU-B" }),
    ];
    mockPrisma.product.findMany.mockResolvedValue(products);

    const result = await consolidateProducts({
      companyId: "company-1",
      userId: "user-1",
      userName: "Test User",
      name: "New Sneaker",
      description: "Merged sneaker",
      sourceProductIds: ["prod-1", "prod-2"],
      variantSelections: [
        { productId: "prod-1", name: "High Sole", sku: "SKU-A" },
        { productId: "prod-2", name: "Low Sole", sku: "SKU-B" },
      ],
      originalsAction: "HIDE",
    });

    expect(mockPrisma.product.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.productVariant.create).toHaveBeenCalledTimes(2);

    const createdVariants = mockPrisma.productVariant.create.mock.calls.map((c) => c[0].data);
    expect(createdVariants.map((v) => v.sku)).toEqual(["SKU-A", "SKU-B"]);
    expect(createdVariants.map((v) => v.name)).toEqual(["High Sole", "Low Sole"]);

    expect(result.variants).toHaveLength(2);
    expect(result.product.name).toBe("New Sneaker");

    expect(mockPrisma.product.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ["prod-1", "prod-2"] } }, data: { deletedAt: expect.any(Date) } })
    );
  });

  test("rejects duplicate SKUs in the variant selections", async () => {
    const products = [
      baseProduct({ id: "prod-1", sku: "SKU-X" }),
      baseProduct({ id: "prod-2", sku: "SKU-Y" }),
    ];
    mockPrisma.product.findMany.mockResolvedValue(products);

    await expect(
      consolidateProducts({
        companyId: "company-1",
        userId: "user-1",
        userName: "Test User",
        name: "New Sneaker",
        sourceProductIds: ["prod-1", "prod-2"],
        variantSelections: [
          { productId: "prod-1", sku: "SAME" },
          { productId: "prod-2", sku: "SAME" },
        ],
        originalsAction: "HIDE",
      })
    ).rejects.toThrow("تعارض في SKU");

    expect(mockPrisma.product.create).not.toHaveBeenCalled();
  });

  test("transfers order items to the new product before originals are hidden", async () => {
    const products = [
      baseProduct({ id: "prod-1", sku: "SKU-A" }),
      baseProduct({ id: "prod-2", sku: "SKU-B" }),
    ];
    mockPrisma.product.findMany.mockResolvedValue(products);

    await consolidateProducts({
      companyId: "company-1",
      userId: "user-1",
      userName: "Test User",
      name: "New Sneaker",
      sourceProductIds: ["prod-1", "prod-2"],
      variantSelections: [
        { productId: "prod-1", sku: "SKU-A" },
        { productId: "prod-2", sku: "SKU-B" },
      ],
      originalsAction: "DELETE",
    });

    const orderUpdateCalls = mockPrisma.orderItem.updateMany.mock.calls;
    expect(orderUpdateCalls.length).toBeGreaterThanOrEqual(1);
    expect(orderUpdateCalls[0][0].where.productId).toEqual({ in: ["prod-1", "prod-2"] });
    expect(orderUpdateCalls[0][0].data.productId).toBe("new-product-1");
  });

  test("keeps originals untouched when originalsAction is KEEP", async () => {
    const products = [
      baseProduct({ id: "prod-1", sku: "SKU-A" }),
      baseProduct({ id: "prod-2", sku: "SKU-B" }),
    ];
    mockPrisma.product.findMany.mockResolvedValue(products);

    const result = await consolidateProducts({
      companyId: "company-1",
      userId: "user-1",
      userName: "Test User",
      name: "New Sneaker",
      sourceProductIds: ["prod-1", "prod-2"],
      variantSelections: [
        { productId: "prod-1", sku: "SKU-A" },
        { productId: "prod-2", sku: "SKU-B" },
      ],
      originalsAction: "KEEP",
    });

    expect(mockPrisma.product.updateMany).not.toHaveBeenCalled();
    expect(mockPrisma.product.delete).not.toHaveBeenCalled();
    expect(result.originalsHandled.every((o) => o.action === "KEEP")).toBe(true);
  });

  test("lists duplicate product groups by name", async () => {
    mockPrisma.product.findMany.mockResolvedValue([
      baseProduct({ id: "prod-1", name: "Sneaker", sku: "SKU-1" }),
      baseProduct({ id: "prod-2", name: "Sneaker", sku: "SKU-2" }),
      baseProduct({ id: "prod-3", name: "Boot", sku: "SKU-3" }),
    ]);

    const groups = await listDuplicateGroups({ companyId: "company-1" });
    expect(groups).toHaveLength(1);
    expect(groups[0].name).toBe("Sneaker");
    expect(groups[0].count).toBe(2);
  });
});