const mockPrisma = {
  affiliate: {
    findUnique: jest.fn(),
  },
  affiliatePayout: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  merchant: {
    findUnique: jest.fn(),
  },
  merchantPayout: {
    aggregate: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  commission: {
    aggregate: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  $transaction: jest.fn((runner) => runner(mockPrisma)),
};

const mockUpdateAffiliateStats = jest.fn();

jest.mock("../../services/sharedDatabase", () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
}));

jest.mock("../../services/affiliateService", () => ({
  updateAffiliateStats: (...args) => mockUpdateAffiliateStats(...args),
}));

const commissionService = require("../../services/commissionService");

describe("commissionService.processPayout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.affiliate.findUnique.mockResolvedValue({
      id: "affiliate-1",
      minPayout: 100,
      pendingEarnings: 300,
    });
    mockPrisma.affiliatePayout.create.mockResolvedValue({
      id: "payout-1",
      affiliateId: "affiliate-1",
      amount: 300,
      status: "PENDING",
    });
    mockPrisma.commission.updateMany.mockResolvedValue({ count: 2 });
  });

  test("creates a payout for the full available confirmed commission balance", async () => {
    mockPrisma.commission.findMany.mockResolvedValue([
      { id: "commission-1", amount: 125 },
      { id: "commission-2", amount: 175 },
    ]);

    const payout = await commissionService.processPayout("affiliate-1", 300, {
      method: "INSTAPAY",
      details: { note: "01000000000" },
    });

    expect(payout.id).toBe("payout-1");
    expect(mockPrisma.affiliatePayout.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        affiliateId: "affiliate-1",
        amount: 300,
        paymentMethod: "WALLET",
        status: "PENDING",
      }),
    });
    expect(mockPrisma.commission.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["commission-1", "commission-2"] },
        affiliateId: "affiliate-1",
        status: "CONFIRMED",
        payoutId: null,
      },
      data: { payoutId: "payout-1" },
    });
    expect(mockUpdateAffiliateStats).toHaveBeenCalledWith("affiliate-1");
  });

  test("rejects partial payouts so linked commissions always match payout amount", async () => {
    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mockPrisma.commission.findMany.mockResolvedValue([
      { id: "commission-1", amount: 125 },
      { id: "commission-2", amount: 175 },
    ]);

    try {
      await expect(
        commissionService.processPayout("affiliate-1", 200, {
          method: "WALLET",
        }),
      ).rejects.toThrow("يمكن طلب سحب الرصيد المتاح بالكامل");
    } finally {
      consoleErrorSpy.mockRestore();
    }

    expect(mockPrisma.affiliatePayout.create).not.toHaveBeenCalled();
    expect(mockPrisma.commission.updateMany).not.toHaveBeenCalled();
    expect(mockUpdateAffiliateStats).not.toHaveBeenCalled();
  });
});

describe("commissionService.cancelPayoutRequest", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.affiliatePayout.findUnique.mockResolvedValue({
      id: "payout-1",
      affiliateId: "affiliate-1",
      status: "PENDING",
      notes: null,
    });
    mockPrisma.commission.updateMany.mockResolvedValue({ count: 2 });
    mockPrisma.affiliatePayout.update.mockResolvedValue({
      id: "payout-1",
      affiliateId: "affiliate-1",
      status: "CANCELLED",
      notes: "تم إلغاء طلب السحب: بيانات الحساب غير مكتملة",
      processedBy: "owner-user",
    });
  });

  test("cancels a pending payout request and returns linked commissions to the available balance", async () => {
    const payout = await commissionService.cancelPayoutRequest("payout-1", {
      reason: "بيانات الحساب غير مكتملة",
      processedBy: "owner-user",
    });

    expect(mockPrisma.affiliatePayout.findUnique).toHaveBeenCalledWith({
      where: { id: "payout-1" },
      select: {
        id: true,
        affiliateId: true,
        status: true,
        notes: true,
      },
    });
    expect(mockPrisma.commission.updateMany).toHaveBeenCalledWith({
      where: {
        payoutId: "payout-1",
        affiliateId: "affiliate-1",
        status: "CONFIRMED",
      },
      data: {
        payoutId: null,
      },
    });
    expect(mockPrisma.affiliatePayout.update).toHaveBeenCalledWith({
      where: { id: "payout-1" },
      data: expect.objectContaining({
        status: "CANCELLED",
        notes: "تم إلغاء طلب السحب: بيانات الحساب غير مكتملة",
        processedBy: "owner-user",
      }),
    });
    expect(payout.status).toBe("CANCELLED");
    expect(mockUpdateAffiliateStats).toHaveBeenCalledWith("affiliate-1");
  });

  test("rejects cancelling payout requests without a reason", async () => {
    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    try {
      await expect(
        commissionService.cancelPayoutRequest("payout-1", {
          reason: "   ",
          processedBy: "owner-user",
        }),
      ).rejects.toThrow("سبب إلغاء طلب السحب مطلوب");
    } finally {
      consoleErrorSpy.mockRestore();
    }

    expect(mockPrisma.affiliatePayout.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.commission.updateMany).not.toHaveBeenCalled();
    expect(mockUpdateAffiliateStats).not.toHaveBeenCalled();
  });
});

describe("commissionService.attachPayoutProof", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.affiliatePayout.findUnique.mockResolvedValue({
      id: "payout-1",
      status: "PROCESSED",
    });
    mockPrisma.affiliatePayout.update.mockResolvedValue({
      id: "payout-1",
      status: "PROCESSED",
      proofFileUrl: "/uploads/affiliate-payouts/proof-test.png",
    });
  });

  test("stores the uploaded proof URL for processed payouts", async () => {
    const payout = await commissionService.attachPayoutProof("payout-1", {
      proofFileUrl: "/uploads/affiliate-payouts/proof-test.png",
    });

    expect(mockPrisma.affiliatePayout.findUnique).toHaveBeenCalledWith({
      where: { id: "payout-1" },
      select: {
        id: true,
        status: true,
      },
    });
    expect(mockPrisma.affiliatePayout.update).toHaveBeenCalledWith({
      where: { id: "payout-1" },
      data: expect.objectContaining({
        proofFileUrl: "/uploads/affiliate-payouts/proof-test.png",
      }),
    });
    expect(payout.proofFileUrl).toBe("/uploads/affiliate-payouts/proof-test.png");
  });

  test("rejects proof uploads before the payout is processed", async () => {
    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mockPrisma.affiliatePayout.findUnique.mockResolvedValue({
      id: "payout-1",
      status: "PENDING",
    });

    try {
      await expect(
        commissionService.attachPayoutProof("payout-1", {
          proofFileUrl: "/uploads/affiliate-payouts/proof-test.png",
        }),
      ).rejects.toThrow("يمكن رفع إثبات التحويل بعد تسجيل الدفعة فقط");
    } finally {
      consoleErrorSpy.mockRestore();
    }

    expect(mockPrisma.affiliatePayout.update).not.toHaveBeenCalled();
  });
});

describe("commissionService merchant payouts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.merchant.findUnique.mockResolvedValue({
      id: "merchant-1",
      name: "Merchant Co",
      email: "merchant@example.com",
      companyId: "company-1",
      isActive: true,
    });
    mockPrisma.merchantPayout.create.mockResolvedValue({
      id: "merchant-payout-1",
      merchantId: "merchant-1",
      amount: 450,
      status: "PENDING",
    });
    mockPrisma.commission.updateMany.mockResolvedValue({ count: 2 });
  });

  test("creates a merchant payout only for delivered confirmed merchant commissions", async () => {
    mockPrisma.commission.findMany.mockResolvedValue([
      { id: "merchant-commission-1", amount: 200 },
      { id: "merchant-commission-2", amount: 250 },
    ]);

    const payout = await commissionService.processMerchantPayout("merchant-1", 450, {
      method: "INSTAPAY",
      details: { walletPhone: "01000000000" },
    });

    expect(payout.id).toBe("merchant-payout-1");
    expect(mockPrisma.commission.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          merchantId: "merchant-1",
          type: "MERCHANT",
          status: "CONFIRMED",
          merchantPayoutId: null,
          order: { status: "DELIVERED" },
        }),
      }),
    );
    expect(mockPrisma.merchantPayout.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        merchantId: "merchant-1",
        amount: 450,
        paymentMethod: "WALLET",
        status: "PENDING",
      }),
    });
    expect(mockPrisma.commission.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["merchant-commission-1", "merchant-commission-2"] },
        merchantId: "merchant-1",
        status: "CONFIRMED",
        merchantPayoutId: null,
      },
      data: { merchantPayoutId: "merchant-payout-1" },
    });
  });

  test("marks linked merchant commissions paid when the company records the transfer", async () => {
    mockPrisma.merchantPayout.update.mockResolvedValue({
      id: "merchant-payout-1",
      merchantId: "merchant-1",
      status: "PROCESSED",
      merchant: { id: "merchant-1" },
    });

    const payout = await commissionService.recordExternalMerchantPayout(
      "merchant-payout-1",
      {
        transactionId: "TX-1",
        processedBy: "owner-1",
      },
    );

    expect(payout.status).toBe("PROCESSED");
    expect(mockPrisma.commission.updateMany).toHaveBeenCalledWith({
      where: {
        merchantPayoutId: "merchant-payout-1",
        merchantId: "merchant-1",
      },
      data: {
        status: "PAID",
        paidAt: expect.any(Date),
      },
    });
  });
});
