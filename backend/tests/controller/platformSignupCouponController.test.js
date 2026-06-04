const mockExecuteWithRetry = jest.fn(async (operation) => operation());
const mockPrisma = {
  platformSignupCoupon: {
    findMany: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

jest.mock("../../services/sharedDatabase", () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
  executeWithRetry: (...args) => mockExecuteWithRetry(...args),
}));

jest.mock("../../services/platformSignupCouponService", () => ({
  serializeCoupon: jest.fn(),
  sanitizeCouponInput: jest.fn(),
  ensureCouponPayloadIsValid: jest.fn(),
  getAdminCouponSummary: jest.fn(),
  validateCouponForRegistration: jest.fn(),
  applySignupCouponRedemption: jest.fn(),
  buildBenefitSummary: jest.fn(),
}));

const platformSignupCouponService = require("../../services/platformSignupCouponService");
const platformSignupCouponController = require("../../controller/platformSignupCouponController");

const createResponseMock = () => ({
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
});

describe("platformSignupCouponController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("listCoupons returns coupon items with admin summary", async () => {
    const req = {
      query: {
        search: "",
        state: "all",
      },
    };
    const res = createResponseMock();

    mockPrisma.platformSignupCoupon.findMany.mockResolvedValue([
      {
        id: "coupon-1",
        code: "WELCOME14",
        redemptions: [
          {
            redeemedAt: "2026-04-22T10:00:00.000Z",
            email: "owner@example.com",
            company: { name: "Demo Co" },
          },
        ],
      },
    ]);

    platformSignupCouponService.getAdminCouponSummary.mockResolvedValue({
      totalCoupons: 1,
      liveCoupons: 1,
      scheduledCoupons: 0,
      expiredCoupons: 0,
      inactiveCoupons: 0,
      depletedCoupons: 0,
      totalRedemptions: 1,
    });
    platformSignupCouponService.serializeCoupon.mockReturnValue({
      id: "coupon-1",
      code: "WELCOME14",
      name: "Welcome 14",
      state: "live",
      redemptionsCount: 1,
    });

    await platformSignupCouponController.listCoupons(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(res.payload.data.summary.totalCoupons).toBe(1);
    expect(res.payload.data.items[0]).toEqual(
      expect.objectContaining({
        code: "WELCOME14",
        state: "live",
        lastRedemption: expect.objectContaining({
          companyName: "Demo Co",
        }),
      }),
    );
  });

  test("createCoupon stores createdBy from current super admin", async () => {
    const req = {
      user: {
        email: "root@example.com",
      },
      body: {
        code: "WELCOME14",
        name: "Welcome 14",
      },
    };
    const res = createResponseMock();

    platformSignupCouponService.sanitizeCouponInput.mockReturnValue({
      code: "WELCOME14",
      name: "Welcome 14",
      description: "",
      usageLimit: null,
      isActive: true,
      validFrom: new Date("2026-04-22T00:00:00.000Z"),
      validTo: new Date("2026-05-22T00:00:00.000Z"),
      benefits: {
        trialDays: 14,
        bonusUsers: 0,
        bonusProducts: 0,
        bonusOrdersPerMonth: 200,
        bonusCustomers: 0,
      },
    });

    mockPrisma.platformSignupCoupon.create.mockResolvedValue({
      id: "coupon-1",
      code: "WELCOME14",
      name: "Welcome 14",
      redemptions: [],
      _count: { redemptions: 0 },
    });

    platformSignupCouponService.serializeCoupon.mockReturnValue({
      id: "coupon-1",
      code: "WELCOME14",
      name: "Welcome 14",
      state: "live",
      redemptionsCount: 0,
    });

    await platformSignupCouponController.createCoupon(req, res);

    expect(mockPrisma.platformSignupCoupon.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          code: "WELCOME14",
          createdBy: "root@example.com",
        }),
      }),
    );
    expect(res.statusCode).toBe(201);
    expect(res.payload.success).toBe(true);
    expect(res.payload.data.code).toBe("WELCOME14");
  });

  test("removeCoupon deletes unused coupon permanently", async () => {
    const req = {
      params: {
        id: "coupon-unused",
      },
    };
    const res = createResponseMock();

    mockPrisma.platformSignupCoupon.findUnique.mockResolvedValue({
      id: "coupon-unused",
      code: "UNUSED10",
      usageCount: 0,
      _count: { redemptions: 0 },
      redemptions: [],
    });

    await platformSignupCouponController.removeCoupon(req, res);

    expect(mockPrisma.platformSignupCoupon.delete).toHaveBeenCalledWith({
      where: { id: "coupon-unused" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.payload.data.action).toBe("deleted");
    expect(res.payload.data.couponId).toBe("coupon-unused");
  });

  test("removeCoupon deactivates redeemed coupon to preserve history", async () => {
    const req = {
      params: {
        id: "coupon-used",
      },
    };
    const res = createResponseMock();

    mockPrisma.platformSignupCoupon.findUnique.mockResolvedValue({
      id: "coupon-used",
      code: "WELCOME14",
      usageCount: 3,
      validTo: new Date("2026-05-22T00:00:00.000Z"),
      _count: { redemptions: 3 },
      redemptions: [
        {
          redeemedAt: "2026-04-22T10:00:00.000Z",
          email: "owner@example.com",
          company: { name: "Demo Co" },
        },
      ],
    });

    mockPrisma.platformSignupCoupon.update.mockResolvedValue({
      id: "coupon-used",
      code: "WELCOME14",
      isActive: false,
      usageCount: 3,
      redemptions: [
        {
          redeemedAt: "2026-04-22T10:00:00.000Z",
          email: "owner@example.com",
          company: { name: "Demo Co" },
        },
      ],
      _count: { redemptions: 3 },
    });

    platformSignupCouponService.serializeCoupon.mockReturnValue({
      id: "coupon-used",
      code: "WELCOME14",
      name: "Welcome 14",
      state: "inactive",
      redemptionsCount: 3,
    });

    await platformSignupCouponController.removeCoupon(req, res);

    expect(mockPrisma.platformSignupCoupon.update).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    expect(res.payload.data.action).toBe("deactivated");
    expect(res.payload.data.coupon).toEqual(
      expect.objectContaining({
        code: "WELCOME14",
        state: "inactive",
      }),
    );
  });
});
