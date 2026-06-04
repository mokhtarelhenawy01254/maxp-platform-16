const axios = require("axios");

jest.mock("axios", () => ({
  get: jest.fn(),
}));

jest.mock("../../services/facebookAdsService", () => jest.fn());

jest.mock("../../services/sharedDatabase", () => ({
  getSharedPrismaClient: jest.fn(() => ({})),
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

  test("loads Swan product metadata using storefront subdomain headers", async () => {
    axios.get.mockResolvedValue({
      status: 200,
      data: {
        success: true,
        data: {
          id: "product-1",
          name: "Swan Flat Skotch",
          slug: "swan-flat-skotch",
          description: "<p>Comfortable flat skotch sneaker.</p>",
          sku: "S130",
          price: 470,
          comparePrice: 550,
          category: { name: "Shoes" },
          isActive: true,
          mainImage: "/uploads/products/main.png",
          images: [
            "/uploads/products/main.png",
            "/uploads/products/angle.png",
          ],
        },
      },
    });

    const req = {
      query: {
        url: "https://swan.maxp.online/product/swan-flat-skotch",
      },
    };
    const res = createResponseMock();

    await facebookAdsController.getProductLaunchMetadata(req, res);

    expect(res.statusCode).toBe(200);
    expect(axios.get).toHaveBeenCalledWith(
      "https://swan.maxp.online/api/v1/public/products/swan-flat-skotch?companyId=swan",
      expect.objectContaining({
        headers: expect.objectContaining({
          "X-Store-Subdomain": "swan",
          "X-Company-Subdomain": "swan",
          "X-Subdomain": "swan",
          "X-Company-Slug": "swan",
        }),
      }),
    );
    expect(res.payload.success).toBe(true);
    expect(res.payload.data).toEqual(
      expect.objectContaining({
        name: "Swan Flat Skotch",
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
