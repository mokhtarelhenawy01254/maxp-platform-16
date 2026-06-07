jest.mock("../../services/facebookAdsService", () => jest.fn());

const mockPrisma = {
  product: {
    findFirst: jest.fn(),
  },
};

jest.mock("../../services/sharedDatabase", () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
}));

const facebookAdsController = require("../../controller/facebookAdsController");

function createResponseMock() {
  return {
    statusCode: 200,
    payload: null,
    status: jest.fn(function setStatus(code) {
      this.statusCode = code;
      return this;
    }),
    json: jest.fn(function setJson(payload) {
      this.payload = payload;
      return this;
    }),
  };
}

describe("facebookAdsController.getProductLaunchMetadata", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("loads hidden product metadata for authenticated ad launch without public visibility filtering", async () => {
    mockPrisma.product.findFirst.mockResolvedValue({
      id: "product-1",
      name: "Swan Flat Skotch",
      slug: "swan-flat-skotch",
      description: "<p>Comfortable flat skotch sneaker.</p>",
      sku: "S130",
      price: 470,
      comparePrice: 550,
      category: { name: "Shoes" },
      isActive: true,
      isHidden: true,
      stock: 12,
      trackInventory: true,
      mainImage: "/uploads/products/main.png",
      images: [
        "/uploads/products/main.png",
        "/uploads/products/angle.png",
      ],
      productVariants: [],
    });

    const req = {
      user: {
        companyId: "company-1",
      },
      query: {
        url: "https://swan.maxp.online/product/swan-flat-skotch",
      },
    };
    const res = createResponseMock();

    await facebookAdsController.getProductLaunchMetadata(req, res);

    expect(res.statusCode).toBe(200);
    expect(mockPrisma.product.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: "company-1",
          deletedAt: null,
          isActive: true,
          OR: expect.arrayContaining([{ slug: "swan-flat-skotch" }]),
        }),
      }),
    );
    expect(mockPrisma.product.findFirst.mock.calls[0][0].where).not.toHaveProperty(
      "isHidden",
    );
    expect(res.payload.success).toBe(true);
    expect(res.payload.data).toEqual(
      expect.objectContaining({
        name: "Swan Flat Skotch",
        isHidden: true,
        imageCount: 2,
        mainImage: "https://swan.maxp.online/uploads/products/main.png",
        imageUrls: [
          "https://swan.maxp.online/uploads/products/main.png",
          "https://swan.maxp.online/uploads/products/angle.png",
        ],
      }),
    );
  });
});
