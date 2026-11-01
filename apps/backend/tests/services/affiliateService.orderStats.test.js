const COMPANY_ID = "cmleybpf70028juo2wwpmp8rt";
const OTHER_COMPANY_ID = "cmlc7s6kh000iju40ei73ez36";

const user54 = { id: "user-54", firstName: "مسوق", lastName: "أول", email: "a@x.com" };
const user12 = { id: "user-12", firstName: "مدير", lastName: "الشركة", email: "b@x.com" };
const user07 = { id: "user-07", firstName: "مسوق", lastName: "تاني", email: "c@x.com" };
const userPending = { id: "user-pending", firstName: "مسوق", lastName: "منتظر", email: "d@x.com" };

const affiliate54 = {
  id: "aff-54",
  userId: user54.id,
  companyId: COMPANY_ID,
  affiliateCode: "54DF7030",
  status: "ACTIVE",
  commissionRate: 5,
  createdAt: new Date("2025-01-01"),
  user: user54,
};
const affiliate12 = {
  id: "aff-12",
  userId: user12.id,
  companyId: COMPANY_ID,
  affiliateCode: "12A3C2A6",
  status: "ACTIVE",
  commissionRate: 3,
  createdAt: new Date("2025-02-01"),
  user: user12,
};
const affiliate07 = {
  id: "aff-07",
  userId: user07.id,
  companyId: OTHER_COMPANY_ID,
  affiliateCode: "077AD902",
  status: "ACTIVE",
  commissionRate: 4,
  createdAt: new Date("2025-03-01"),
  user: user07,
};

const mockPrisma = {
  affiliate: { findMany: jest.fn(), groupBy: jest.fn() },
  userCompany: { findMany: jest.fn() },
  order: { groupBy: jest.fn() },
  commission: { groupBy: jest.fn() },
  company: { findMany: jest.fn() },
};

jest.mock("../../services/sharedDatabase", () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
}));

const affiliateService = require("../../services/affiliateService");

describe("affiliateService.listAffiliatesWithOrderStats", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockPrisma.affiliate.findMany.mockImplementation(async ({ where }) => {
      if (where.companyId) return [affiliate54, affiliate12];
      if (where.id?.in) return where.id.in.includes(affiliate07.id) ? [affiliate07] : [];
      if (where.userId?.in) {
        return [affiliate54, affiliate12, affiliate07].filter((affiliate) =>
          where.userId.in.includes(affiliate.userId),
        );
      }
      return [];
    });

    mockPrisma.userCompany.findMany.mockResolvedValue([
      { userId: user12.id, role: "COMPANY_ADMIN", isActive: true, user: user12 },
      { userId: user07.id, role: "OWNER", isActive: true, user: user07 },
      { userId: userPending.id, role: "AFFILIATE", isActive: true, user: userPending },
    ]);

    mockPrisma.order.groupBy.mockResolvedValue([
      { affiliateId: affiliate54.id, _count: { _all: 139 } },
      { affiliateId: affiliate12.id, _count: { _all: 2 } },
    ]);

    mockPrisma.commission.groupBy.mockResolvedValue([
      { affiliateId: affiliate54.id, _count: { orderId: 139 }, _sum: { amount: 1390.5 } },
      { affiliateId: affiliate12.id, _count: { orderId: 2 }, _sum: { amount: 40 } },
    ]);

    mockPrisma.affiliate.groupBy.mockResolvedValue([]);
    mockPrisma.company.findMany.mockResolvedValue([]);
  });

  test("queries orders and commissions by affiliateId inside the company", async () => {
    await affiliateService.listAffiliatesWithOrderStats(COMPANY_ID);

    expect(mockPrisma.order.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by: ["affiliateId"],
        where: { companyId: COMPANY_ID, affiliateId: { not: null } },
      }),
    );
    expect(mockPrisma.commission.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by: ["affiliateId"],
        where: { companyId: COMPANY_ID, affiliateId: { not: null } },
      }),
    );
    // لا يعتمد على الدور الوظيفي: يجلب كل عضويات الشركة
    expect(mockPrisma.userCompany.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { companyId: COMPANY_ID } }),
    );
  });

  test("returns marketers who own commissions plus the other-company badge and pending member", async () => {
    const rows = await affiliateService.listAffiliatesWithOrderStats(COMPANY_ID);
    const byCode = Object.fromEntries(rows.map((row) => [row.affiliateCode, row]));

    expect(byCode["54DF7030"]).toMatchObject({
      id: affiliate54.id,
      affiliateId: affiliate54.id,
      orderCount: 139,
      totalCommission: 1390.5,
      isOtherCompany: false,
      canFilterOrders: true,
    });

    expect(byCode["12A3C2A6"]).toMatchObject({
      affiliateId: affiliate12.id,
      orderCount: 2,
      totalCommission: 40,
      membershipRole: "COMPANY_ADMIN",
    });

    expect(byCode["077AD902"]).toMatchObject({
      affiliateId: affiliate07.id,
      orderCount: 0,
      isOtherCompany: true,
      canFilterOrders: true,
    });

    const pending = rows.find((row) => row.userId === userPending.id);
    expect(pending).toMatchObject({
      id: `temp_${userPending.id}`,
      affiliateId: null,
      isPendingAffiliateRecord: true,
      canFilterOrders: false,
      totalEarnings: 0,
    });

    expect(rows).toHaveLength(4);
  });
});

describe("affiliateService.listAffiliateStores", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.order.groupBy.mockResolvedValue([
      { companyId: COMPANY_ID, _count: { _all: 141 } },
    ]);
    mockPrisma.affiliate.groupBy.mockResolvedValue([
      { companyId: COMPANY_ID, _count: { _all: 3 } },
    ]);
    mockPrisma.company.findMany.mockResolvedValue([{ id: COMPANY_ID, name: "شركة الإنتاج" }]);
  });

  test("counts orders that carry an affiliate or are direct affiliate orders", async () => {
    const stores = await affiliateService.listAffiliateStores({ companyIds: [] });

    expect(mockPrisma.order.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by: ["companyId"],
        where: {
          OR: [{ affiliateId: { not: null } }, { orderSource: "AFFILIATE_DIRECT" }],
        },
      }),
    );
    expect(stores).toEqual([
      {
        companyId: COMPANY_ID,
        companyName: "شركة الإنتاج",
        orderCount: 141,
        activeMarketersCount: 3,
      },
    ]);
  });
});
