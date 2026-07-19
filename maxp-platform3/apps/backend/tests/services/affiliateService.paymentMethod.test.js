const mockPrisma = {
  affiliate: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  affiliateReviewLog: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  affiliateIdentityDocumentVersion: {
    create: jest.fn(),
    updateMany: jest.fn(),
    findMany: jest.fn(),
  },
  affiliateProduct: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
  affiliateReferral: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  product: {
    findFirst: jest.fn(),
  },
  order: {
    count: jest.fn(),
  },
  commission: {
    aggregate: jest.fn(),
  },
  user: {
    findMany: jest.fn(),
  },
};

jest.mock("../../services/sharedDatabase", () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
}));

const affiliateService = require("../../services/affiliateService");

describe("affiliateService payment method normalization", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.affiliate.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    mockPrisma.affiliate.create.mockImplementation(async ({ data }) => ({
      id: "affiliate-1",
      ...data,
    }));
    mockPrisma.affiliate.update.mockResolvedValue({});
    mockPrisma.affiliate.findFirst.mockResolvedValue(null);
    mockPrisma.affiliateProduct.findUnique.mockResolvedValue(null);
    mockPrisma.affiliateProduct.findFirst.mockResolvedValue(null);
    mockPrisma.affiliateProduct.upsert.mockResolvedValue({});
    mockPrisma.affiliateReferral.findFirst.mockResolvedValue(null);
    mockPrisma.affiliateReferral.create.mockResolvedValue({ id: "referral-1" });
    mockPrisma.affiliateReviewLog.create.mockResolvedValue({ id: "log-1" });
    mockPrisma.affiliateReviewLog.findMany.mockResolvedValue([]);
    mockPrisma.affiliateIdentityDocumentVersion.create.mockResolvedValue({
      id: "doc-version-1",
    });
    mockPrisma.affiliateIdentityDocumentVersion.updateMany.mockResolvedValue({
      count: 1,
    });
    mockPrisma.affiliateIdentityDocumentVersion.findMany.mockResolvedValue([]);
    mockPrisma.product.findFirst.mockResolvedValue(null);
    mockPrisma.order.count.mockResolvedValue(0);
    mockPrisma.commission.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
    mockPrisma.user.findMany.mockResolvedValue([]);
  });

  test("maps BANK_TRANSFER to TRANSFERS when registering an affiliate", async () => {
    const result = await affiliateService.registerAffiliate("user-1", {
      companyId: "company-1",
      paymentMethod: "BANK_TRANSFER",
    });

    expect(mockPrisma.affiliate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          paymentMethod: "TRANSFERS",
        }),
      }),
    );
    expect(result.paymentMethod).toBe("TRANSFERS");
  });

  test("maps wallet-based public payment methods to WALLET", async () => {
    mockPrisma.affiliate.findUnique
      .mockReset()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    const result = await affiliateService.registerAffiliate("user-2", {
      companyId: "company-1",
      paymentMethod: "INSTAPAY",
    });

    expect(mockPrisma.affiliate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          paymentMethod: "WALLET",
        }),
      }),
    );
    expect(result.paymentMethod).toBe("WALLET");
  });

  test("starts uploaded identity documents in pending review and records review logs", async () => {
    mockPrisma.affiliate.findUnique
      .mockReset()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    await affiliateService.registerAffiliate("user-3", {
      companyId: "company-1",
      paymentMethod: "WALLET",
      identityDocumentUrl: "/uploads/affiliate-documents/id-card.pdf",
      identityDocumentUploadedAt: new Date("2026-05-03T09:00:00.000Z"),
      status: "PENDING",
    });

    expect(mockPrisma.affiliate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          identityDocumentStatus: "PENDING_REVIEW",
          identityDocumentUrl: "/uploads/affiliate-documents/id-card.pdf",
        }),
      }),
    );
    expect(mockPrisma.affiliateReviewLog.create).toHaveBeenCalledTimes(2);
    expect(mockPrisma.affiliateReviewLog.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: "REGISTRATION_SUBMITTED",
          nextStatus: "PENDING",
          nextDocumentStatus: "PENDING_REVIEW",
        }),
      }),
    );
    expect(mockPrisma.affiliateReviewLog.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: "DOCUMENT_UPLOADED",
          nextDocumentStatus: "PENDING_REVIEW",
        }),
      }),
    );
    expect(
      mockPrisma.affiliateIdentityDocumentVersion.create,
    ).toHaveBeenCalledWith({
      data: expect.objectContaining({
        affiliateId: "affiliate-1",
        fileUrl: "/uploads/affiliate-documents/id-card.pdf",
        source: "REGISTRATION",
        isCurrent: true,
      }),
    });
  });

  test("counts only unlinked confirmed commissions as pending earnings", async () => {
    mockPrisma.order.count.mockResolvedValue(4);
    mockPrisma.commission.aggregate
      .mockResolvedValueOnce({ _sum: { amount: 500 } })
      .mockResolvedValueOnce({ _sum: { amount: 200 } })
      .mockResolvedValueOnce({ _sum: { amount: 150 } });
    mockPrisma.affiliate.findUnique.mockReset().mockResolvedValue({
      totalClicks: 20,
    });

    await affiliateService.updateAffiliateStats("affiliate-1");

    expect(mockPrisma.commission.aggregate).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        where: {
          affiliateId: "affiliate-1",
          status: "CONFIRMED",
          payoutId: null,
        },
      }),
    );
    expect(mockPrisma.affiliate.update).toHaveBeenCalledWith({
      where: { id: "affiliate-1" },
      data: expect.objectContaining({
        totalEarnings: 500,
        paidEarnings: 200,
        pendingEarnings: 150,
        conversionRate: 20,
      }),
    });
  });

  test("updates affiliate document review with a required rejection note", async () => {
    mockPrisma.affiliate.findUnique.mockReset().mockResolvedValue({
      id: "affiliate-1",
      companyId: "company-1",
      identityDocumentUrl: "/uploads/affiliate-documents/id-card.pdf",
      identityDocumentStatus: "PENDING_REVIEW",
    });
    mockPrisma.affiliate.update.mockResolvedValue({
      id: "affiliate-1",
      identityDocumentStatus: "REJECTED",
    });

    await affiliateService.updateAffiliateDocumentReview("affiliate-1", {
      status: "REJECTED",
      reviewNote: "الصورة غير واضحة",
      reviewedBy: "owner-1",
    });

    expect(mockPrisma.affiliate.update).toHaveBeenCalledWith({
      where: { id: "affiliate-1" },
      data: expect.objectContaining({
        identityDocumentStatus: "REJECTED",
        identityDocumentReviewNote: "الصورة غير واضحة",
        identityDocumentReviewedAt: expect.any(Date),
      }),
    });
    expect(mockPrisma.affiliateReviewLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          affiliateId: "affiliate-1",
          companyId: "company-1",
          actorUserId: "owner-1",
          eventType: "DOCUMENT_REVIEWED",
          previousDocumentStatus: "PENDING_REVIEW",
          nextDocumentStatus: "REJECTED",
          note: "الصورة غير واضحة",
        }),
      }),
    );
  });

  test("enriches affiliate review history with actor details", async () => {
    mockPrisma.affiliateReviewLog.findMany.mockResolvedValue([
      {
        id: "log-1",
        affiliateId: "affiliate-1",
        actorUserId: "owner-1",
        eventType: "STATUS_CHANGED",
        title: "تم تفعيل المسوق",
        createdAt: "2026-05-03T10:00:00.000Z",
      },
    ]);
    mockPrisma.user.findMany.mockResolvedValue([
      {
        id: "owner-1",
        firstName: "Sara",
        lastName: "Admin",
        email: "sara@example.com",
      },
    ]);

    const result = await affiliateService.getAffiliateReviewHistory(
      "affiliate-1",
      { limit: 10 },
    );

    expect(mockPrisma.affiliateReviewLog.findMany).toHaveBeenCalledWith({
      where: { affiliateId: "affiliate-1" },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    expect(result).toEqual([
      expect.objectContaining({
        id: "log-1",
        actor: {
          id: "owner-1",
          name: "Sara Admin",
          email: "sara@example.com",
        },
      }),
    ]);
  });

  test("reopens affiliate document review and stores a new document version on resubmission", async () => {
    mockPrisma.affiliate.findUnique.mockReset().mockResolvedValue({
      id: "affiliate-1",
      companyId: "company-1",
      status: "SUSPENDED",
      statusReason: "المستند مرفوض",
      identityDocumentUrl: "/uploads/affiliate-documents/old.pdf",
      identityDocumentStatus: "REJECTED",
    });
    mockPrisma.affiliate.update.mockResolvedValue({
      id: "affiliate-1",
      status: "PENDING",
      identityDocumentStatus: "PENDING_REVIEW",
      identityDocumentUrl: "/uploads/affiliate-documents/new.pdf",
    });

    const result = await affiliateService.replaceAffiliateIdentityDocument(
      "affiliate-1",
      {
        fileUrl: "/uploads/affiliate-documents/new.pdf",
        uploadedAt: new Date("2026-05-03T12:00:00.000Z"),
        uploadedByUserId: "affiliate-user",
      },
    );

    expect(mockPrisma.affiliateIdentityDocumentVersion.updateMany).toHaveBeenCalledWith({
      where: {
        affiliateId: "affiliate-1",
        isCurrent: true,
      },
      data: {
        isCurrent: false,
        replacedAt: new Date("2026-05-03T12:00:00.000Z"),
      },
    });
    expect(mockPrisma.affiliate.update).toHaveBeenCalledWith({
      where: { id: "affiliate-1" },
      data: expect.objectContaining({
        identityDocumentUrl: "/uploads/affiliate-documents/new.pdf",
        identityDocumentStatus: "PENDING_REVIEW",
        identityDocumentReviewNote: null,
        status: "PENDING",
        statusReason: "تم رفع نسخة جديدة من مستند الاعتماد وبانتظار المراجعة",
        reviewedBy: "affiliate-user",
      }),
    });
    expect(mockPrisma.affiliateIdentityDocumentVersion.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        affiliateId: "affiliate-1",
        fileUrl: "/uploads/affiliate-documents/new.pdf",
        source: "RESUBMISSION",
        isCurrent: true,
      }),
    });
    expect(mockPrisma.affiliateReviewLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: "DOCUMENT_RESUBMITTED",
          previousStatus: "SUSPENDED",
          nextStatus: "PENDING",
          previousDocumentStatus: "REJECTED",
          nextDocumentStatus: "PENDING_REVIEW",
        }),
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: "affiliate-1",
        status: "PENDING",
        identityDocumentStatus: "PENDING_REVIEW",
      }),
    );
  });

  test("returns affiliate document history with a capped limit", async () => {
    mockPrisma.affiliateIdentityDocumentVersion.findMany.mockResolvedValue([
      {
        id: "doc-2",
        fileUrl: "/uploads/affiliate-documents/new.pdf",
        isCurrent: true,
      },
    ]);

    const result = await affiliateService.getAffiliateDocumentHistory(
      "affiliate-1",
      { limit: 50 },
    );

    expect(mockPrisma.affiliateIdentityDocumentVersion.findMany).toHaveBeenCalledWith({
      where: { affiliateId: "affiliate-1" },
      orderBy: { uploadedAt: "desc" },
      take: 20,
    });
    expect(result).toEqual([
      expect.objectContaining({
        id: "doc-2",
        isCurrent: true,
      }),
    ]);
  });

  test("scopes referral tracking to the current company when companyId is provided", async () => {
    await expect(
      affiliateService.trackReferral("AFF-OUTSIDE", null, {
        companyId: "company-1",
        ipAddress: "127.0.0.1",
      }),
    ).rejects.toThrow("كود المسوق");

    expect(mockPrisma.affiliate.findFirst).toHaveBeenCalledWith({
      where: {
        affiliateCode: "AFF-OUTSIDE",
        status: "ACTIVE",
        companyId: "company-1",
      },
    });
    expect(mockPrisma.affiliateReferral.create).not.toHaveBeenCalled();
  });

  test("rejects importing affiliate products outside the affiliate company", async () => {
    mockPrisma.affiliate.findUnique.mockReset().mockResolvedValue({
      id: "affiliate-1",
      companyId: "company-1",
    });
    mockPrisma.product.findFirst.mockResolvedValue(null);

    await expect(
      affiliateService.createAffiliateProduct("affiliate-1", "product-other-company", 25),
    ).rejects.toThrow("المنتج غير موجود");

    expect(mockPrisma.product.findFirst).toHaveBeenCalledWith({
      where: {
        id: "product-other-company",
        companyId: "company-1",
      },
    });
    expect(mockPrisma.affiliateProduct.upsert).not.toHaveBeenCalled();
  });

  test("rejects importing products hidden from the affiliate", async () => {
    mockPrisma.affiliate.findUnique.mockReset().mockResolvedValue({
      id: "affiliate-1",
      companyId: "company-1",
    });
    mockPrisma.product.findFirst.mockResolvedValue({
      id: "product-hidden",
      companyId: "company-1",
      allowAffiliateMarkup: true,
      price: 100,
      metadata: JSON.stringify({ affiliateVisibility: "HIDDEN" }),
    });

    await expect(
      affiliateService.createAffiliateProduct("affiliate-1", "product-hidden", 25),
    ).rejects.toThrow("هذا المنتج غير متاح لهذا المسوق");

    expect(mockPrisma.affiliateProduct.upsert).not.toHaveBeenCalled();
  });

  test("scopes affiliate product pricing lookup to the affiliate company", async () => {
    mockPrisma.affiliate.findUnique.mockReset().mockResolvedValue({
      id: "affiliate-1",
      companyId: "company-1",
      commissionType: "PERCENTAGE",
    });
    mockPrisma.product.findFirst.mockResolvedValue(null);

    await expect(
      affiliateService.getAffiliateProductPrice("affiliate-1", "product-other-company"),
    ).rejects.toThrow("المنتج غير موجود ضمن شركة المسوق");

    expect(mockPrisma.product.findFirst).toHaveBeenCalledWith({
      where: {
        id: "product-other-company",
        companyId: "company-1",
      },
    });
  });

  test("requires MARKUP affiliate products to belong to the affiliate company", async () => {
    mockPrisma.affiliate.findUnique.mockReset().mockResolvedValue({
      id: "affiliate-1",
      companyId: "company-1",
      commissionType: "MARKUP",
    });
    mockPrisma.affiliateProduct.findFirst.mockResolvedValue(null);
    mockPrisma.product.findFirst.mockResolvedValue(null);

    await expect(
      affiliateService.getAffiliateProductPrice("affiliate-1", "legacy-cross-company-product"),
    ).rejects.toThrow("المنتج غير موجود ضمن شركة المسوق");

    expect(mockPrisma.affiliateProduct.findFirst).toHaveBeenCalledWith({
      where: {
        affiliateId: "affiliate-1",
        productId: "legacy-cross-company-product",
        products: {
          companyId: "company-1",
        },
      },
    });
  });
});
