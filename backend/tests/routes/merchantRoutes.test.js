const express = require("express");
const request = require("supertest");

let mockCurrentUser = {
  id: "admin-user",
  companyId: "company-1",
  role: "OWNER",
};

const merchantService = require("../../services/merchantService");
const commissionService = require("../../services/commissionService");

const mockPrisma = {
  merchant: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
  product: {
    findFirst: jest.fn(),
  },
};

jest.mock("../../utils/verifyToken", () => ({
  authenticateToken: (req, _res, next) => {
    req.user = mockCurrentUser;
    next();
  },
}));

jest.mock("../../services/sharedDatabase", () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
}));

jest.mock("../../services/merchantService", () => ({
  createMerchant: jest.fn(),
  updateMerchant: jest.fn(),
  addMerchantProduct: jest.fn(),
  getMerchantOrders: jest.fn(),
  getMerchantOperationsSummary: jest.fn(),
  decorateMerchantRecordWithInventorySnapshot: jest.fn(),
  syncMerchantInventory: jest.fn(),
}));

jest.mock("../../services/commissionService", () => ({
  getMerchantPayoutSummary: jest.fn(),
  recordExternalMerchantPayout: jest.fn(),
  cancelMerchantPayoutRequest: jest.fn(),
}));

const merchantRoutes = require("../../routes/merchantRoutes");

describe("merchantRoutes permissions", () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentUser = {
      id: "admin-user",
      companyId: "company-1",
      role: "OWNER",
    };
    merchantService.decorateMerchantRecordWithInventorySnapshot.mockImplementation(
      async (merchant) => merchant,
    );
    merchantService.getMerchantOperationsSummary.mockResolvedValue({
      summary: {},
      rows: [],
      pagination: { total: 0, limit: 3, offset: 0 },
    });
    commissionService.getMerchantPayoutSummary.mockResolvedValue({
      merchant: { id: "merchant-1" },
      balances: {
        availableAmount: 0,
        availableCommissionsCount: 0,
        confirmedAmount: 0,
        pendingPayoutAmount: 0,
        paidAmount: 0,
      },
      payouts: [],
    });
    app = express();
    app.use(express.json());
    app.use("/merchants", merchantRoutes);
  });

  test("allows admins to list company merchants", async () => {
    mockPrisma.merchant.findMany.mockResolvedValue([
      { id: "merchant-1", companyId: "company-1", email: "merchant@example.com" },
    ]);

    const response = await request(app).get("/merchants");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(mockPrisma.merchant.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { companyId: "company-1" },
      }),
    );
  });

  test("allows admins to create merchants for their company", async () => {
    merchantService.createMerchant.mockResolvedValue({
      id: "merchant-1",
      companyId: "company-1",
      name: "Merchant Co",
    });

    const payload = {
      name: "Merchant Co",
      email: "merchant@example.com",
    };

    const response = await request(app).post("/merchants").send(payload);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(merchantService.createMerchant).toHaveBeenCalledWith(
      "company-1",
      payload,
    );
  });

  test("allows admins to update merchants in their own company", async () => {
    mockPrisma.merchant.findFirst.mockResolvedValue({ id: "merchant-1" });
    merchantService.updateMerchant.mockResolvedValue({
      id: "merchant-1",
      name: "Updated Merchant",
    });

    const response = await request(app)
      .put("/merchants/merchant-1")
      .send({ name: "Updated Merchant" });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(merchantService.updateMerchant).toHaveBeenCalledWith(
      "merchant-1",
      { name: "Updated Merchant" },
    );
  });

  test("returns 404 when linking a product to a merchant from another company", async () => {
    mockPrisma.merchant.findFirst.mockResolvedValue(null);
    mockPrisma.product.findFirst.mockResolvedValue({ id: "product-1" });

    const response = await request(app)
      .post("/merchants/merchant-2/products")
      .send({ productId: "product-1", merchantPrice: 100 });

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(merchantService.addMerchantProduct).not.toHaveBeenCalled();
  });

  test("returns 404 when linking another company's product to a merchant", async () => {
    mockPrisma.merchant.findFirst.mockResolvedValue({ id: "merchant-1" });
    mockPrisma.product.findFirst.mockResolvedValue(null);

    const response = await request(app)
      .post("/merchants/merchant-1/products")
      .send({ productId: "product-2", merchantPrice: 100 });

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(merchantService.addMerchantProduct).not.toHaveBeenCalled();
  });

  test("allows admins to link company products to company merchants", async () => {
    mockPrisma.merchant.findFirst.mockResolvedValue({ id: "merchant-1" });
    mockPrisma.product.findFirst.mockResolvedValue({ id: "product-1" });
    merchantService.addMerchantProduct.mockResolvedValue({
      id: "merchant-product-1",
    });

    const response = await request(app)
      .post("/merchants/merchant-1/products")
      .send({ productId: "product-1", merchantPrice: 100, stock: 7 });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(merchantService.addMerchantProduct).toHaveBeenCalledWith(
      "merchant-1",
      "product-1",
      { merchantPrice: 100, stock: 7 },
    );
  });

  test("returns 404 when reading orders for another company's merchant", async () => {
    mockPrisma.merchant.findFirst.mockResolvedValue(null);

    const response = await request(app).get("/merchants/merchant-2/orders");

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(merchantService.getMerchantOrders).not.toHaveBeenCalled();
  });

  test("allows admins to sync inventory for merchants in their own company", async () => {
    mockPrisma.merchant.findFirst.mockResolvedValue({ id: "merchant-1" });
    merchantService.syncMerchantInventory.mockResolvedValue({
      synced: 2,
      timestamp: new Date("2026-05-01T10:00:00.000Z"),
    });

    const response = await request(app).post("/merchants/merchant-1/sync");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(merchantService.syncMerchantInventory).toHaveBeenCalledWith(
      "merchant-1",
    );
  });

  test("allows admins to read a unified merchant settlement summary", async () => {
    mockPrisma.merchant.findFirst.mockResolvedValue({
      id: "merchant-1",
      companyId: "company-1",
      merchantProducts: [],
    });
    merchantService.decorateMerchantRecordWithInventorySnapshot.mockResolvedValue({
      id: "merchant-1",
      companyId: "company-1",
      inventorySummary: {
        availableForSale: 12,
        reservedQuantity: 3,
      },
    });
    merchantService.getMerchantOperationsSummary.mockResolvedValue({
      summary: {
        deliveredPayableAmount: 370,
        deliveredOrdersCount: 1,
      },
      rows: [],
      pagination: { total: 1, limit: 8, offset: 0 },
    });
    commissionService.getMerchantPayoutSummary.mockResolvedValue({
      merchant: { id: "merchant-1" },
      balances: {
        availableAmount: 370,
        availableCommissionsCount: 1,
        confirmedAmount: 370,
        pendingPayoutAmount: 0,
        paidAmount: 0,
      },
      payouts: [],
    });

    const response = await request(app).get(
      "/merchants/merchant-1/settlement-summary",
    );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.inventorySummary.availableForSale).toBe(12);
    expect(response.body.data.operationsSummary.summary.deliveredPayableAmount).toBe(370);
    expect(response.body.data.payoutSummary.balances.availableAmount).toBe(370);
    expect(merchantService.getMerchantOperationsSummary).toHaveBeenCalledWith(
      "merchant-1",
      { limit: 8 },
    );
    expect(commissionService.getMerchantPayoutSummary).toHaveBeenCalledWith(
      "merchant-1",
    );
  });

  test("returns 404 when reading settlement summary for another company's merchant", async () => {
    mockPrisma.merchant.findFirst.mockResolvedValue(null);

    const response = await request(app).get(
      "/merchants/merchant-2/settlement-summary",
    );

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(commissionService.getMerchantPayoutSummary).not.toHaveBeenCalled();
  });

  test("blocks affiliates from merchant management APIs", async () => {
    mockCurrentUser = {
      id: "affiliate-user",
      companyId: "company-1",
      role: "AFFILIATE",
    };

    const scenarios = [
      { method: "get", path: "/merchants" },
      { method: "get", path: "/merchants/merchant-1" },
      { method: "get", path: "/merchants/merchant-1/settlement-summary" },
      { method: "get", path: "/merchants/merchant-1/orders" },
      { method: "post", path: "/merchants", payload: { name: "Merchant Co", email: "merchant@example.com" } },
      { method: "put", path: "/merchants/merchant-1", payload: { name: "Updated Merchant" } },
      { method: "post", path: "/merchants/merchant-1/products", payload: { productId: "product-1" } },
      { method: "post", path: "/merchants/merchant-1/sync" },
    ];

    for (const scenario of scenarios) {
      let req = request(app)[scenario.method](scenario.path);
      if (scenario.payload) {
        req = req.send(scenario.payload);
      }

      const response = await req;
      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    }
  });
});
