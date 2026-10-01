const mockExecuteWithRetry = jest.fn(async (operation) => operation());

const mockPrisma = {
  company: {
    findUnique: jest.fn(),
  },
  employee: {
    count: jest.fn(),
  },
  order: {
    count: jest.fn(),
  },
  companyApp: {
    findMany: jest.fn(),
  },
  appUsageLog: {
    aggregate: jest.fn(),
    groupBy: jest.fn(),
  },
  invoice: {
    findMany: jest.fn(),
    groupBy: jest.fn(),
  },
  payment: {
    findMany: jest.fn(),
    groupBy: jest.fn(),
  },
  paymentReceipt: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  billingHistory: {
    findMany: jest.fn(),
  },
};

jest.mock("../../services/sharedDatabase", () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
  initializeSharedDatabase: jest.fn(),
  executeWithRetry: (...args) => mockExecuteWithRetry(...args),
}));

const mockGetUsagePercentage = jest.fn((current, limit) => {
  const numericLimit = Number(limit);
  if (!Number.isFinite(numericLimit) || numericLimit <= 0 || numericLimit === -1) {
    return 0;
  }

  return (Number(current || 0) / numericLimit) * 100;
});

const mockSerializeCoupon = jest.fn((coupon) => ({
  id: coupon.id,
  code: coupon.code,
  name: coupon.name,
  benefitSummary: ["2 مستخدم إضافي", "10 عميل إضافي"],
  state: "live",
  redemptionsCount: coupon._count?.redemptions || 0,
}));

const mockFindCouponByCode = jest.fn();

jest.mock("../../services/platformSignupCouponService", () => ({
  findCouponByCode: (...args) => mockFindCouponByCode(...args),
  getUsagePercentage: (...args) => mockGetUsagePercentage(...args),
  serializeCoupon: (...args) => mockSerializeCoupon(...args),
}));

jest.mock("../../utils/companySlug", () => ({
  generateUniqueCompanySlug: jest.fn(),
  ensureCompanySlug: jest.fn(async (company) => company),
}));

jest.mock("bcryptjs", () => ({
  hash: jest.fn(async () => "hashed-password"),
}), { virtual: true });

jest.mock("jsonwebtoken", () => ({
  sign: jest.fn(() => "token"),
}), { virtual: true });

jest.mock("../../services/socketService", () => ({}));

jest.mock("../../services/browserPushService", () => ({
  sendBrowserPushToUser: jest.fn(),
}));

const adminCompnayController = require("../../controller/adminCompnayController");

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

describe("adminCompnayController.getCompanyDetails review payload", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns structured review data for company audit screen", async () => {
    const req = {
      params: {
        companyId: "company-1",
      },
    };
    const res = createResponseMock();

    mockPrisma.company.findUnique.mockResolvedValue({
      id: "company-1",
      name: "Acme Co",
      email: "acme@example.com",
      currency: "EGP",
      isActive: true,
      createdAt: new Date("2026-04-01T00:00:00.000Z"),
      updatedAt: new Date("2026-04-20T00:00:00.000Z"),
      aiSetting: { useModernAgent: true },
      signupCouponCode: "BONUS50",
      signupBonusUsers: 2,
      signupBonusProducts: 10,
      signupBonusOrdersPerMonth: 20,
      signupBonusCustomers: 5,
      signupTrialBonusDays: 7,
      wallet: {
        balance: 1000,
        totalSpent: 250,
        totalDeposited: 1250,
        currency: "EGP",
        updatedAt: new Date("2026-04-25T12:00:00.000Z"),
        transactions: [
          {
            id: "txn-1",
            amount: 500,
            type: "DEPOSIT",
            status: "COMPLETED",
            description: "Manual Top-up",
            referenceId: "super-admin-1",
            createdAt: new Date("2026-04-25T10:00:00.000Z"),
          },
        ],
      },
      platformSubscription: {
        id: "sub-1",
        companyId: "company-1",
        monthlyFee: 199,
        status: "ACTIVE",
        billingDay: 5,
        nextBillingDate: new Date("2026-05-05T00:00:00.000Z"),
        lastBillingDate: new Date("2026-04-05T00:00:00.000Z"),
        failedAttempts: 1,
      },
      platformSignupCouponRedemptions: [
        {
          appliedCode: "BONUS50",
          redeemedAt: new Date("2026-04-10T00:00:00.000Z"),
          coupon: {
            id: "coupon-1",
            code: "BONUS50",
            name: "Bonus 50",
            _count: {
              redemptions: 1,
            },
          },
        },
      ],
      users: [
        {
          id: "user-1",
          firstName: "Owner",
          lastName: "One",
          email: "owner@example.com",
          role: "OWNER",
          isActive: true,
          createdAt: new Date("2026-04-01T00:00:00.000Z"),
        },
      ],
      _count: {
        users: 2,
        customers: 12,
        products: 25,
        conversations: 5,
        facebookPages: 3,
      },
    });

    mockPrisma.employee.count.mockResolvedValue(2);
    mockPrisma.order.count.mockResolvedValue(18);
    mockPrisma.companyApp.findMany.mockResolvedValue([
      {
        id: "company-app-1",
        status: "ACTIVE",
        trialEndsAt: null,
        validUntil: new Date("2026-05-10T00:00:00.000Z"),
        nextBillingAt: new Date("2026-05-10T00:00:00.000Z"),
        totalSpent: 150,
        createdAt: new Date("2026-04-01T00:00:00.000Z"),
        updatedAt: new Date("2026-04-20T00:00:00.000Z"),
        app: {
          id: "app-1",
          slug: "crm",
          name: "CRM",
          category: "OPERATIONS",
          pricingModel: "SUBSCRIPTION",
          monthlyPrice: 50,
          yearlyPrice: 500,
        },
      },
      {
        id: "company-app-2",
        status: "TRIAL",
        trialEndsAt: new Date("2026-05-02T00:00:00.000Z"),
        validUntil: null,
        nextBillingAt: null,
        totalSpent: 0,
        createdAt: new Date("2026-04-15T00:00:00.000Z"),
        updatedAt: new Date("2026-04-20T00:00:00.000Z"),
        app: {
          id: "app-2",
          slug: "bot",
          name: "Bot",
          category: "AI",
          pricingModel: "HYBRID",
          monthlyPrice: 30,
          yearlyPrice: 300,
        },
      },
    ]);

    mockPrisma.appUsageLog.aggregate.mockResolvedValue({
      _sum: {
        totalCost: 75,
        quantity: 120,
      },
      _count: {
        id: 8,
      },
    });
    mockPrisma.appUsageLog.groupBy.mockImplementation(async ({ by }) => {
      if (Array.isArray(by) && by.includes("companyAppId")) {
        return [
          {
            companyAppId: "company-app-1",
            _sum: { totalCost: 60, quantity: 100 },
            _count: { _all: 5 },
          },
          {
            companyAppId: "company-app-2",
            _sum: { totalCost: 15, quantity: 20 },
            _count: { _all: 3 },
          },
        ];
      }

      return [
        {
          feature: "messages",
          _sum: { totalCost: 60, quantity: 100 },
          _count: { _all: 5 },
        },
        {
          feature: null,
          _sum: { totalCost: 15, quantity: 20 },
          _count: { _all: 3 },
        },
      ];
    });

    mockPrisma.invoice.findMany.mockResolvedValue([
      {
        id: "invoice-1",
        invoiceNumber: "INV-202604-001",
        status: "OVERDUE",
        type: "SUBSCRIPTION",
        issueDate: new Date("2026-04-01T00:00:00.000Z"),
        dueDate: new Date("2026-04-10T00:00:00.000Z"),
        paidDate: null,
        totalAmount: 199,
        currency: "EGP",
        payments: [
          {
            id: "payment-1",
            amount: 100,
            status: "COMPLETED",
            paidAt: new Date("2026-04-02T00:00:00.000Z"),
            method: "BANK_TRANSFER",
          },
        ],
        paymentReceipts: [
          {
            id: "receipt-1",
            status: "PENDING",
            submittedAt: new Date("2026-04-03T00:00:00.000Z"),
            reviewedAt: null,
          },
        ],
      },
    ]);

    mockPrisma.payment.findMany.mockResolvedValue([
      {
        id: "payment-1",
        paymentNumber: "PAY-202604-001",
        amount: 199,
        currency: "EGP",
        status: "FAILED",
        method: "BANK_TRANSFER",
        gateway: null,
        transactionId: null,
        paidAt: null,
        createdAt: new Date("2026-04-03T00:00:00.000Z"),
        invoice: {
          id: "invoice-1",
          invoiceNumber: "INV-202604-001",
          status: "OVERDUE",
          totalAmount: 199,
          dueDate: new Date("2026-04-10T00:00:00.000Z"),
        },
      },
    ]);

    mockPrisma.paymentReceipt.findMany.mockResolvedValue([
      {
        id: "receipt-1",
        status: "PENDING",
        submittedAt: new Date("2026-04-03T00:00:00.000Z"),
        reviewedAt: null,
        notes: "",
        walletNumber: {
          id: "wallet-number-1",
          name: "Vodafone Cash",
          number: "01000000000",
        },
        invoice: {
          id: "invoice-1",
          invoiceNumber: "INV-202604-001",
          totalAmount: 199,
          currency: "EGP",
          status: "OVERDUE",
        },
      },
    ]);
    mockPrisma.paymentReceipt.count.mockResolvedValue(1);
    mockPrisma.billingHistory.findMany.mockResolvedValue([
      {
        id: "bill-1",
        type: "PLATFORM_FEE",
        amount: 199,
        status: "SUCCESS",
        description: "رسوم منصة",
        referenceId: null,
        createdAt: new Date("2026-04-04T00:00:00.000Z"),
      },
    ]);
    mockPrisma.invoice.groupBy.mockResolvedValue([
      { status: "PAID", _count: { _all: 1 } },
      { status: "OVERDUE", _count: { _all: 1 } },
    ]);
    mockPrisma.payment.groupBy.mockResolvedValue([
      { status: "COMPLETED", _count: { _all: 1 } },
      { status: "FAILED", _count: { _all: 1 } },
    ]);

    await adminCompnayController.getCompanyDetails(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(res.payload.data.company.name).toBe("Acme Co");
    expect(res.payload.data.company.legacyAiRouting).toEqual(
      expect.objectContaining({
        isDeprecated: true,
        selectedMode: "CORE_ONLY",
        productionRuntime: "CORE",
      }),
    );
    expect(res.payload.data.review).toEqual(
      expect.objectContaining({
        wallet: expect.objectContaining({
          balance: 1000,
          totalSpent: 250,
          totalDeposited: 1250,
          recentTransactions: expect.arrayContaining([
            expect.objectContaining({
              id: "txn-1",
              amount: 500,
              type: "DEPOSIT",
            }),
          ]),
        }),
        subscription: expect.objectContaining({
          id: "sub-1",
          monthlyFee: 199,
          failedAttempts: 1,
        }),
        usage: expect.objectContaining({
          activeApps: 2,
          totalActions: 8,
          costs: expect.objectContaining({
            subscriptions: 80,
            usage: 75,
            total: 155,
          }),
          usageBreakdown: expect.arrayContaining([
            expect.objectContaining({
              feature: "messages",
              totalCost: 60,
            }),
          ]),
          installedApps: expect.arrayContaining([
            expect.objectContaining({
              id: "company-app-1",
              monthlyUsage: expect.objectContaining({
                totalCost: 60,
                totalActions: 5,
              }),
            }),
          ]),
        }),
        limits: expect.objectContaining({
          coupon: expect.objectContaining({
            code: "BONUS50",
            appliedCode: "BONUS50",
          }),
          entries: expect.arrayContaining([
            expect.objectContaining({
              key: "users",
              current: 2,
              limit: 7,
            }),
            expect.objectContaining({
              key: "orders",
              current: 18,
              limit: 70,
            }),
          ]),
        }),
        billing: expect.objectContaining({
          stats: expect.objectContaining({
            totalInvoices: 2,
            overdueInvoices: 1,
            failedPayments: 1,
            pendingReceipts: 1,
          }),
          recentInvoices: expect.arrayContaining([
            expect.objectContaining({
              invoiceNumber: "INV-202604-001",
              receiptStatus: "PENDING",
            }),
          ]),
          recentPayments: expect.arrayContaining([
            expect.objectContaining({
              paymentNumber: "PAY-202604-001",
              status: "FAILED",
            }),
          ]),
        }),
      }),
    );
    expect(mockFindCouponByCode).not.toHaveBeenCalled();
  });

  test("returns 404 when company does not exist", async () => {
    const req = {
      params: {
        companyId: "missing-company",
      },
    };
    const res = createResponseMock();

    mockPrisma.company.findUnique.mockResolvedValue(null);

    await adminCompnayController.getCompanyDetails(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.payload.success).toBe(false);
    expect(res.payload.message).toMatch(/الشركة غير موجودة/);
  });
});
