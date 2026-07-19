const express = require("express");
const request = require("supertest");

let mockCurrentUser = {
  id: "owner-user",
  companyId: "company-1",
  role: "OWNER",
};
let mockUploadedProofFile = {
  filename: "proof-test.png",
  originalname: "proof.png",
  mimetype: "image/png",
  path: "H:\\fake\\proof-test.png",
};
let mockUploadedIdentityDocumentFile = {
  filename: "identity-test.pdf",
  originalname: "identity.pdf",
  mimetype: "application/pdf",
  path: "H:\\fake\\identity-test.pdf",
};

const affiliateService = require("../../services/affiliateService");
const commissionService = require("../../services/commissionService");

const mockPrisma = {
  affiliate: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
  },
  affiliatePayout: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  customer: {
    upsert: jest.fn(),
  },
  product: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
  },
  order: {
    create: jest.fn(),
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

jest.mock("../../services/affiliateService", () => ({
  listAffiliates: jest.fn(),
  updateAffiliateStatus: jest.fn(),
  updateAffiliateDocumentReview: jest.fn(),
  getAffiliateReviewHistory: jest.fn(),
  getAffiliateDocumentHistory: jest.fn(),
  updateAffiliateCommission: jest.fn(),
  updateAffiliatePolicy: jest.fn(),
  registerAffiliate: jest.fn(),
  replaceAffiliateIdentityDocument: jest.fn(),
  normalizePaymentMethod: jest.fn((value) => value),
  getAffiliateOrders: jest.fn(),
  getAffiliateOrderById: jest.fn(),
  getAffiliateOrderTickets: jest.fn(),
  createAffiliateOrderTicket: jest.fn(),
  getAffiliateCustomers: jest.fn(),
  createAffiliateProduct: jest.fn(),
  getAffiliateProductPrice: jest.fn(),
  updateAffiliateStats: jest.fn(),
}));

jest.mock("../../services/commissionService", () => ({
  processPayout: jest.fn(),
  recordExternalPayout: jest.fn(),
  cancelPayoutRequest: jest.fn(),
  attachPayoutProof: jest.fn(),
  calculateCommissions: jest.fn(),
}));

jest.mock("../../middleware/affiliatePayoutProofUpload", () => ({
  single: jest.fn(() => (req, _res, next) => {
    req.file = mockUploadedProofFile;
    next();
  }),
}));

jest.mock("../../middleware/affiliateIdentityDocumentUpload", () => ({
  single: jest.fn(() => (req, _res, next) => {
    req.file = mockUploadedIdentityDocumentFile;
    next();
  }),
}));

jest.mock("../../services/internalSyncService", () => ({
  pushOrderToProvider: jest.fn(() => Promise.resolve()),
}));

jest.mock("../../controller/companyConnectionController", () => ({
  fetchOrdersFromProvider: jest.fn((_req, res) => res.json({ success: true })),
  importInternalOrders: jest.fn((_req, res) => res.json({ success: true })),
}));

jest.mock("../../services/wooCommerceAutoExportService", () => ({
  getWooCommerceAutoExportService: jest.fn(() => ({
    exportOrderAsync: jest.fn(),
  })),
}));

jest.mock("../../services/orderService", () => ({
  generateOrderNumber: jest.fn(async () => "AFF-UAT-0001"),
}));

jest.mock("../../middleware/performanceOptimization", () => ({
  cacheMiddleware: () => (_req, _res, next) => next(),
}));

jest.mock("../../utils/planLimitPayloads", () => ({
  ensureWithinPlanLimit: jest.fn(async () => ({
    allowed: true,
  })),
}));

const affiliateRoutes = require("../../routes/affiliateRoutes");

describe("affiliate admin routes", () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUploadedProofFile = {
      filename: "proof-test.png",
      originalname: "proof.png",
      mimetype: "image/png",
      path: "H:\\fake\\proof-test.png",
    };
    mockUploadedIdentityDocumentFile = {
      filename: "identity-test.pdf",
      originalname: "identity.pdf",
      mimetype: "application/pdf",
      path: "H:\\fake\\identity-test.pdf",
    };
    mockCurrentUser = {
      id: "owner-user",
      companyId: "company-1",
      role: "OWNER",
    };

    app = express();
    app.use(express.json());
    app.use("/affiliates", affiliateRoutes);

    mockPrisma.affiliate.findUnique.mockResolvedValue({
      id: "affiliate-1",
      userId: "owner-user",
      companyId: "company-1",
      status: "ACTIVE",
      affiliateCode: "AFF-1",
      minPayout: 100,
      pendingEarnings: 500,
      paymentMethod: "WALLET",
      canCreateOrdersForOthers: true,
      canViewCustomerData: true,
      identityDocumentUrl: null,
      identityDocumentUploadedAt: null,
      identityDocumentStatus: "NOT_SUBMITTED",
      identityDocumentReviewNote: null,
      identityDocumentReviewedAt: null,
      statusReason: null,
      reviewedAt: null,
      reviewedBy: null,
    });
  });

  test("lists affiliates for the current company only", async () => {
    affiliateService.listAffiliates.mockResolvedValue([
      { id: "affiliate-1", companyId: "company-1" },
    ]);

    const response = await request(app).get("/affiliates/list");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(affiliateService.listAffiliates).toHaveBeenCalledWith("company-1");
  });

  test("updates affiliate status only when the affiliate belongs to the current company", async () => {
    mockPrisma.affiliate.findFirst.mockResolvedValue({ id: "affiliate-1" });

    const response = await request(app)
      .put("/affiliates/affiliate-1/status")
      .send({ status: "ACTIVE", statusReason: "تمت الموافقة بعد المراجعة" });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(affiliateService.updateAffiliateStatus).toHaveBeenCalledWith(
      "affiliate-1",
      "ACTIVE",
      {
        statusReason: "تمت الموافقة بعد المراجعة",
        reviewedBy: "owner-user",
      },
    );
    expect(mockPrisma.affiliate.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "affiliate-1",
          companyId: "company-1",
        },
      }),
    );
  });

  test("returns 404 when trying to update another company's affiliate status", async () => {
    mockPrisma.affiliate.findFirst.mockResolvedValue(null);

    const response = await request(app)
      .put("/affiliates/affiliate-2/status")
      .send({ status: "ACTIVE" });

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(affiliateService.updateAffiliateStatus).not.toHaveBeenCalled();
  });

  test("rejects invalid affiliate status values", async () => {
    mockPrisma.affiliate.findFirst.mockResolvedValue({ id: "affiliate-1" });

    const response = await request(app)
      .put("/affiliates/affiliate-1/status")
      .send({ status: "NOT_A_STATUS" });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(affiliateService.updateAffiliateStatus).not.toHaveBeenCalled();
  });

  test("requires a review reason when suspending an affiliate", async () => {
    mockPrisma.affiliate.findFirst.mockResolvedValue({ id: "affiliate-1" });

    const response = await request(app)
      .put("/affiliates/affiliate-1/status")
      .send({ status: "SUSPENDED" });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(affiliateService.updateAffiliateStatus).not.toHaveBeenCalled();
  });

  test("updates affiliate document review only when the affiliate belongs to the current company", async () => {
    mockPrisma.affiliate.findFirst.mockResolvedValue({ id: "affiliate-1" });
    affiliateService.updateAffiliateDocumentReview.mockResolvedValue({
      id: "affiliate-1",
      identityDocumentStatus: "APPROVED",
    });

    const response = await request(app)
      .put("/affiliates/affiliate-1/document-review")
      .send({ status: "APPROVED" });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(affiliateService.updateAffiliateDocumentReview).toHaveBeenCalledWith(
      "affiliate-1",
      {
        status: "APPROVED",
        reviewNote: undefined,
        reviewedBy: "owner-user",
      },
    );
  });

  test("requires a reason before rejecting an affiliate document", async () => {
    mockPrisma.affiliate.findFirst.mockResolvedValue({ id: "affiliate-1" });

    const response = await request(app)
      .put("/affiliates/affiliate-1/document-review")
      .send({ status: "REJECTED", reviewNote: "   " });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(
      affiliateService.updateAffiliateDocumentReview,
    ).not.toHaveBeenCalled();
  });

  test("lists affiliate review history for the current company only", async () => {
    mockPrisma.affiliate.findFirst.mockResolvedValue({ id: "affiliate-1" });
    affiliateService.getAffiliateReviewHistory.mockResolvedValue([
      { id: "log-1", title: "تم إنشاء طلب مسوق جديد" },
    ]);

    const response = await request(app).get(
      "/affiliates/affiliate-1/review-history",
    );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(affiliateService.getAffiliateReviewHistory).toHaveBeenCalledWith(
      "affiliate-1",
      { limit: undefined },
    );
  });

  test("lists affiliate document history for the current company only", async () => {
    mockPrisma.affiliate.findFirst.mockResolvedValue({ id: "affiliate-1" });
    affiliateService.getAffiliateDocumentHistory.mockResolvedValue([
      {
        id: "doc-1",
        fileUrl: "/uploads/affiliate-documents/identity-test.pdf",
        isCurrent: true,
      },
    ]);

    const response = await request(app).get(
      "/affiliates/affiliate-1/document-history",
    );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(affiliateService.getAffiliateDocumentHistory).toHaveBeenCalledWith(
      "affiliate-1",
      { limit: undefined },
    );
  });

  test("updates affiliate commission only when the affiliate belongs to the current company", async () => {
    mockPrisma.affiliate.findFirst.mockResolvedValue({
      id: "affiliate-1",
      commissionType: "PERCENTAGE",
    });

    const response = await request(app)
      .put("/affiliates/affiliate-1/commission")
      .send({ commissionRate: 11.5 });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(affiliateService.updateAffiliateCommission).toHaveBeenCalledWith(
      "affiliate-1",
      11.5,
    );
  });

  test("rejects invalid affiliate commission values", async () => {
    mockPrisma.affiliate.findFirst.mockResolvedValue({
      id: "affiliate-1",
      commissionType: "PERCENTAGE",
    });

    const response = await request(app)
      .put("/affiliates/affiliate-1/commission")
      .send({ commissionRate: 150 });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(affiliateService.updateAffiliateCommission).not.toHaveBeenCalled();
  });

  test("lists admin payout requests for the current company only", async () => {
    mockPrisma.affiliatePayout.findMany.mockResolvedValue([
      { id: "payout-1", amount: 200 },
    ]);

    const response = await request(app).get("/affiliates/admin/payouts");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(mockPrisma.affiliatePayout.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          affiliate: {
            companyId: "company-1",
          },
        },
      }),
    );
  });

  test("blocks affiliate users from admin affiliate actions", async () => {
    mockCurrentUser = {
      id: "affiliate-user",
      companyId: "company-1",
      role: "AFFILIATE",
    };

    const scenarios = [
      { method: "get", path: "/affiliates/list" },
      {
        method: "put",
        path: "/affiliates/affiliate-1/status",
        payload: { status: "ACTIVE" },
      },
      {
        method: "put",
        path: "/affiliates/affiliate-1/document-review",
        payload: { status: "APPROVED" },
      },
      {
        method: "get",
        path: "/affiliates/affiliate-1/review-history",
      },
      {
        method: "get",
        path: "/affiliates/affiliate-1/document-history",
      },
      {
        method: "put",
        path: "/affiliates/affiliate-1/commission",
        payload: { commissionRate: 10 },
      },
      {
        method: "post",
        path: "/affiliates/payouts/payout-1/record-external",
        payload: { transactionId: "tx-1" },
      },
      {
        method: "post",
        path: "/affiliates/payouts/payout-1/cancel",
        payload: { reason: "بيانات الحساب غير مكتملة" },
      },
      {
        method: "post",
        path: "/affiliates/payouts/payout-1/proof",
      },
      {
        method: "get",
        path: "/affiliates/admin/payouts",
      },
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

  test("returns 404 when recording an external payout for another company", async () => {
    mockPrisma.affiliatePayout.findFirst.mockResolvedValue(null);

    const response = await request(app)
      .post("/affiliates/payouts/payout-2/record-external")
      .send({ transactionId: "tx-2" });

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(commissionService.recordExternalPayout).not.toHaveBeenCalled();
  });

  test("cancels an affiliate payout request for the current company with a required reason", async () => {
    mockPrisma.affiliatePayout.findFirst.mockResolvedValue({ id: "payout-1" });
    commissionService.cancelPayoutRequest.mockResolvedValue({
      id: "payout-1",
      status: "CANCELLED",
    });

    const response = await request(app)
      .post("/affiliates/payouts/payout-1/cancel")
      .send({ reason: "بيانات الحساب غير مكتملة" });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(commissionService.cancelPayoutRequest).toHaveBeenCalledWith(
      "payout-1",
      {
        reason: "بيانات الحساب غير مكتملة",
        processedBy: "owner-user",
      },
    );
  });

  test("requires a reason before cancelling an affiliate payout request", async () => {
    const response = await request(app)
      .post("/affiliates/payouts/payout-1/cancel")
      .send({ reason: "   " });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(commissionService.cancelPayoutRequest).not.toHaveBeenCalled();
  });

  test("returns 404 when cancelling an external payout for another company", async () => {
    mockPrisma.affiliatePayout.findFirst.mockResolvedValue(null);

    const response = await request(app)
      .post("/affiliates/payouts/payout-2/cancel")
      .send({ reason: "سبب تجريبي" });

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(commissionService.cancelPayoutRequest).not.toHaveBeenCalled();
  });

  test("uploads payout proof for a processed affiliate payout in the current company", async () => {
    mockPrisma.affiliatePayout.findFirst.mockResolvedValue({
      id: "payout-1",
      status: "PROCESSED",
    });
    commissionService.attachPayoutProof.mockResolvedValue({
      id: "payout-1",
      proofFileUrl: "/uploads/affiliate-payouts/proof-test.png",
    });

    const response = await request(app).post("/affiliates/payouts/payout-1/proof");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(commissionService.attachPayoutProof).toHaveBeenCalledWith(
      "payout-1",
      {
        proofFileUrl: "/uploads/affiliate-payouts/proof-test.png",
      },
    );
  });

  test("rejects payout proof upload before the payout is processed", async () => {
    mockPrisma.affiliatePayout.findFirst.mockResolvedValue({
      id: "payout-1",
      status: "PENDING",
    });

    const response = await request(app).post("/affiliates/payouts/payout-1/proof");

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(commissionService.attachPayoutProof).not.toHaveBeenCalled();
  });

  test("requires an uploaded file when attaching payout proof", async () => {
    mockUploadedProofFile = null;
    mockPrisma.affiliatePayout.findFirst.mockResolvedValue({
      id: "payout-1",
      status: "PROCESSED",
    });

    const response = await request(app).post("/affiliates/payouts/payout-1/proof");

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(commissionService.attachPayoutProof).not.toHaveBeenCalled();
  });

  test("allows an affiliate to resubmit an identity document", async () => {
    mockCurrentUser = {
      id: "affiliate-user",
      companyId: "company-1",
      role: "AFFILIATE",
    };
    mockPrisma.affiliate.findUnique.mockResolvedValue({
      id: "affiliate-1",
      userId: "affiliate-user",
      companyId: "company-1",
      status: "PENDING",
      affiliateCode: "AFF-1",
      minPayout: 100,
      pendingEarnings: 0,
      paymentMethod: "WALLET",
      canCreateOrdersForOthers: true,
      canViewCustomerData: true,
      identityDocumentUrl: "/uploads/affiliate-documents/old.pdf",
      identityDocumentUploadedAt: "2026-05-01T09:00:00.000Z",
      identityDocumentStatus: "REJECTED",
      identityDocumentReviewNote: "الصورة غير واضحة",
      identityDocumentReviewedAt: "2026-05-02T10:00:00.000Z",
      statusReason: "المستند مرفوض",
      reviewedAt: "2026-05-02T10:00:00.000Z",
      reviewedBy: "owner-user",
    });
    affiliateService.replaceAffiliateIdentityDocument.mockResolvedValue({
      id: "affiliate-1",
      identityDocumentUrl: "/uploads/affiliate-documents/identity-test.pdf",
      identityDocumentStatus: "PENDING_REVIEW",
      status: "PENDING",
    });

    const response = await request(app).post("/affiliates/me/identity-document");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(affiliateService.replaceAffiliateIdentityDocument).toHaveBeenCalledWith(
      "affiliate-1",
      expect.objectContaining({
        fileUrl: "/uploads/affiliate-documents/identity-test.pdf",
        uploadedByUserId: "affiliate-user",
      }),
    );
  });

  test("requires an uploaded identity document when an affiliate resubmits", async () => {
    mockCurrentUser = {
      id: "affiliate-user",
      companyId: "company-1",
      role: "AFFILIATE",
    };
    mockUploadedIdentityDocumentFile = null;

    const response = await request(app).post("/affiliates/me/identity-document");

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(
      affiliateService.replaceAffiliateIdentityDocument,
    ).not.toHaveBeenCalled();
  });

  test("creates an affiliate direct order using the current Prisma customer compound key", async () => {
    mockCurrentUser = {
      id: "affiliate-user",
      companyId: "company-1",
      role: "AFFILIATE",
    };

    mockPrisma.affiliate.findUnique.mockResolvedValue({
      id: "affiliate-1",
      userId: "affiliate-user",
      companyId: "company-1",
      status: "ACTIVE",
      affiliateCode: "AFF-1",
      minPayout: 100,
      pendingEarnings: 500,
      paymentMethod: "WALLET",
      canCreateOrdersForOthers: true,
      canViewCustomerData: true,
    });
    mockPrisma.customer.upsert.mockResolvedValue({ id: "customer-1" });
    mockPrisma.product.findUnique.mockResolvedValue({
      id: "product-1",
      price: 100,
    });
    mockPrisma.product.findFirst.mockResolvedValue({
      id: "product-1",
      price: 100,
    });
    affiliateService.getAffiliateProductPrice.mockResolvedValue({ price: 135 });
    mockPrisma.order.create.mockResolvedValue({
      id: "order-1",
      orderNumber: "AFF-UAT-0001",
      customer: { id: "customer-1" },
      orderItems: [],
    });

    const response = await request(app)
      .post("/affiliates/orders")
      .send({
        customerData: {
          firstName: "UAT",
          lastName: "Customer",
          phone: "01000000004",
        },
        items: [{ productId: "product-1", quantity: 2 }],
        shippingAddress: {
          address: "Giza Test Address",
          governorate: "الجيزة",
          area: "الدقي",
          shippingCost: 0,
        },
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(mockPrisma.customer.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          whatsappId_companyId: {
            whatsappId: "01000000004",
            companyId: "company-1",
          },
        },
      }),
    );
    expect(commissionService.calculateCommissions).not.toHaveBeenCalled();
  });

  test("blocks direct order creation when affiliate direct ordering is disabled", async () => {
    mockCurrentUser = {
      id: "affiliate-user",
      companyId: "company-1",
      role: "AFFILIATE",
    };

    mockPrisma.affiliate.findUnique.mockResolvedValue({
      id: "affiliate-1",
      userId: "affiliate-user",
      companyId: "company-1",
      status: "ACTIVE",
      affiliateCode: "AFF-1",
      canCreateOrdersForOthers: false,
      canViewCustomerData: true,
      minPayout: 100,
      pendingEarnings: 500,
      paymentMethod: "WALLET",
    });

    const response = await request(app).post("/affiliates/orders").send({
      customerData: {
        firstName: "UAT",
        lastName: "Customer",
        phone: "01000000004",
      },
      items: [{ productId: "product-1", quantity: 1 }],
    });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(mockPrisma.customer.upsert).not.toHaveBeenCalled();
  });

  test("blocks customer listing when customer data visibility is disabled", async () => {
    mockCurrentUser = {
      id: "affiliate-user",
      companyId: "company-1",
      role: "AFFILIATE",
    };

    mockPrisma.affiliate.findUnique.mockResolvedValue({
      id: "affiliate-1",
      userId: "affiliate-user",
      companyId: "company-1",
      status: "ACTIVE",
      affiliateCode: "AFF-1",
      canCreateOrdersForOthers: true,
      canViewCustomerData: false,
      minPayout: 100,
      pendingEarnings: 500,
      paymentMethod: "WALLET",
    });

    const response = await request(app).get("/affiliates/customers");

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(affiliateService.getAffiliateCustomers).not.toHaveBeenCalled();
  });

  test("requests affiliate orders without customer details when visibility is disabled", async () => {
    mockCurrentUser = {
      id: "affiliate-user",
      companyId: "company-1",
      role: "AFFILIATE",
    };

    mockPrisma.affiliate.findUnique.mockResolvedValue({
      id: "affiliate-1",
      userId: "affiliate-user",
      companyId: "company-1",
      status: "ACTIVE",
      affiliateCode: "AFF-1",
      canCreateOrdersForOthers: true,
      canViewCustomerData: false,
      minPayout: 100,
      pendingEarnings: 500,
      paymentMethod: "WALLET",
    });
    affiliateService.getAffiliateOrders.mockResolvedValue([]);

    const response = await request(app).get("/affiliates/orders");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(affiliateService.getAffiliateOrders).toHaveBeenCalledWith(
      "affiliate-1",
      expect.objectContaining({
        includeCustomerData: false,
      }),
    );
  });

  test("shows affiliate order details only through the affiliate-scoped route", async () => {
    mockCurrentUser = {
      id: "affiliate-user",
      companyId: "company-1",
      role: "AFFILIATE",
    };

    mockPrisma.affiliate.findUnique.mockResolvedValue({
      id: "affiliate-1",
      userId: "affiliate-user",
      companyId: "company-1",
      status: "ACTIVE",
      affiliateCode: "AFF-1",
      canCreateOrdersForOthers: true,
      canViewCustomerData: true,
      minPayout: 100,
      pendingEarnings: 500,
      paymentMethod: "WALLET",
    });
    affiliateService.getAffiliateOrderById.mockResolvedValue({
      id: "order-1",
      orderNumber: "ORD-1",
      affiliateId: "affiliate-1",
    });

    const response = await request(app).get("/affiliates/orders/order-1");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.orderNumber).toBe("ORD-1");
    expect(affiliateService.getAffiliateOrderById).toHaveBeenCalledWith(
      "affiliate-1",
      "order-1",
      { includeCustomerData: true },
    );
  });

  test("opens a support ticket on an affiliate-owned order", async () => {
    mockCurrentUser = {
      id: "affiliate-user",
      companyId: "company-1",
      role: "AFFILIATE",
      firstName: "Affiliate",
      lastName: "User",
      email: "affiliate@example.test",
    };

    mockPrisma.affiliate.findUnique.mockResolvedValue({
      id: "affiliate-1",
      userId: "affiliate-user",
      companyId: "company-1",
      status: "ACTIVE",
      affiliateCode: "AFF-1",
      canCreateOrdersForOthers: true,
      canViewCustomerData: true,
      minPayout: 100,
      pendingEarnings: 500,
      paymentMethod: "WALLET",
    });
    affiliateService.createAffiliateOrderTicket.mockResolvedValue({
      ticket: {
        id: "ticket-1",
        ticketId: "TKT-1",
        subject: "طلب إلغاء من العميل - ORD-1",
        status: "OPEN",
      },
      orderNote: {
        id: "note-1",
        orderId: "order-1",
      },
    });

    const payload = {
      reason: "CANCEL_ORDER",
      message: "العميل طلب إلغاء الأوردر قبل الشحن",
    };
    const response = await request(app)
      .post("/affiliates/orders/order-1/tickets")
      .send(payload);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.ticket.ticketId).toBe("TKT-1");
    expect(affiliateService.createAffiliateOrderTicket).toHaveBeenCalledWith(
      "affiliate-1",
      expect.objectContaining({ id: "affiliate-user" }),
      "order-1",
      payload,
    );
  });

  test("legacy payout route enforces minimum payout and reuses the affiliate payout safeguards", async () => {
    mockCurrentUser = {
      id: "affiliate-user",
      companyId: "company-1",
      role: "AFFILIATE",
    };

    mockPrisma.affiliate.findUnique.mockResolvedValue({
      id: "affiliate-1",
      userId: "affiliate-user",
      companyId: "company-1",
      status: "ACTIVE",
      affiliateCode: "AFF-1",
      minPayout: 100,
      pendingEarnings: 500,
      paymentMethod: "WALLET",
      canCreateOrdersForOthers: true,
      canViewCustomerData: true,
    });

    const response = await request(app).post("/affiliates/payout/request").send({
      amount: 50,
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(commissionService.processPayout).not.toHaveBeenCalled();
  });

  test("updates affiliate policy only when the affiliate belongs to the current company", async () => {
    mockPrisma.affiliate.findFirst.mockResolvedValue({ id: "affiliate-1" });
    affiliateService.updateAffiliatePolicy.mockResolvedValue({
      id: "affiliate-1",
      minPayout: 150,
      canCreateOrdersForOthers: false,
      canViewCustomerData: false,
    });

    const response = await request(app)
      .put("/affiliates/affiliate-1/policy")
      .send({
        minPayout: 150,
        canCreateOrdersForOthers: false,
        canViewCustomerData: false,
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(affiliateService.updateAffiliatePolicy).toHaveBeenCalledWith(
      "affiliate-1",
      {
        minPayout: 150,
        canCreateOrdersForOthers: false,
        canViewCustomerData: false,
      },
    );
  });

  test("rejects invalid affiliate policy payout limits", async () => {
    mockPrisma.affiliate.findFirst.mockResolvedValue({ id: "affiliate-1" });

    const response = await request(app)
      .put("/affiliates/affiliate-1/policy")
      .send({
        minPayout: 0,
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(affiliateService.updateAffiliatePolicy).not.toHaveBeenCalled();
  });
});
