const {
  AFFILIATE_MEMBERSHIP_ROLE,
  isOtherCompanyAffiliate,
  normalizeAffiliateIdList,
  buildAffiliateOrderWhere,
  buildOrderCountIndex,
  buildCommissionIndex,
  mergeAffiliateMarketers,
  summarizeAffiliateStores,
} = require("../../utils/affiliateOrderFilter");

// سيناريو الإنتاج: شركة cmleybpf70028juo2wwpmp8rt
// 141 طلبًا تحمل عمولة موزعة على مسوقين اثنين فقط، أحدهما بلا عضوية والآخر مدير شركة،
// إضافة إلى مسوق مسجل في شركة أخرى وعضو هنا بدور OWNER.
const COMPANY_ID = "cmleybpf70028juo2wwpmp8rt";
const OTHER_COMPANY_ID = "cmlc7s6kh000iju40ei73ez36";

const user54 = {
  id: "user-54DF7030",
  firstName: "مسوق",
  lastName: "أول",
  email: "a@example.com",
  phone: "0100",
};

const user12 = {
  id: "user-12A3C2A6",
  firstName: "مدير",
  lastName: "الشركة",
  email: "b@example.com",
  phone: "0101",
};

const user07 = {
  id: "user-077AD902",
  firstName: "مسوق",
  lastName: "شركة أخرى",
  email: "c@example.com",
  phone: "0102",
};

const userPending = {
  id: "user-PENDING01",
  firstName: "مسوق",
  lastName: "بدون سجل",
  email: "d@example.com",
  phone: "0103",
};

const affiliate54 = {
  id: "aff-54DF7030",
  userId: user54.id,
  companyId: COMPANY_ID,
  affiliateCode: "54DF7030",
  status: "ACTIVE",
  commissionRate: 5,
  createdAt: new Date("2025-01-01"),
  user: user54,
};

const affiliate12 = {
  id: "aff-12A3C2A6",
  userId: user12.id,
  companyId: COMPANY_ID,
  affiliateCode: "12A3C2A6",
  status: "ACTIVE",
  commissionRate: 3,
  createdAt: new Date("2025-02-01"),
  user: user12,
};

const affiliate07 = {
  id: "aff-077AD902",
  userId: user07.id,
  companyId: OTHER_COMPANY_ID,
  affiliateCode: "077AD902",
  status: "ACTIVE",
  commissionRate: 4,
  createdAt: new Date("2025-03-01"),
  user: user07,
};

const memberships = [
  { userId: user12.id, role: "COMPANY_ADMIN", isActive: true, user: user12 },
  { userId: user07.id, role: "OWNER", isActive: true, user: user07 },
  { userId: userPending.id, role: AFFILIATE_MEMBERSHIP_ROLE, isActive: true, user: userPending },
];

const orderStats = [
  { affiliateId: affiliate54.id, _count: { _all: 139 } },
  { affiliateId: affiliate12.id, _count: { _all: 2 } },
  // طلبات بدون مسوق لا تظهر في groupBy لأن affiliateId = null مستبعد في الاستعلام
];

const commissionStats = [
  { affiliateId: affiliate54.id, _count: { orderId: 139 }, _sum: { amount: 1390.5 } },
  { affiliateId: affiliate12.id, _count: { orderId: 2 }, _sum: { amount: 40 } },
];

describe("affiliateOrderFilter helpers", () => {
  describe("buildAffiliateOrderWhere", () => {
    it("returns null when no ids are provided", () => {
      expect(buildAffiliateOrderWhere("")).toBeNull();
      expect(buildAffiliateOrderWhere(undefined)).toBeNull();
      expect(buildAffiliateOrderWhere(" , ,")).toBeNull();
    });

    it("never produces a condition that would match orders with a null affiliateId", () => {
      const where = buildAffiliateOrderWhere("aff-54DF7030");
      expect(where).toEqual({ affiliateId: "aff-54DF7030" });
      expect(Object.prototype.hasOwnProperty.call(where, "NOT")).toBe(false);
      expect(JSON.stringify(where)).not.toContain("null");
    });

    it("builds an `in` filter for multiple ids and removes duplicates", () => {
      const where = buildAffiliateOrderWhere("aff-1, aff-2,aff-1 , aff-3");
      expect(where).toEqual({ affiliateId: { in: ["aff-1", "aff-2", "aff-3"] } });
    });

    it("ignores literal null/undefined strings coming from the query string", () => {
      expect(normalizeAffiliateIdList("null,undefined,aff-1")).toEqual(["aff-1"]);
    });
  });

  describe("mergeAffiliateMarketers", () => {
    const buildRows = () =>
      mergeAffiliateMarketers({
        companyId: COMPANY_ID,
        ownAffiliates: [affiliate54, affiliate12],
        linkedAffiliates: [affiliate07],
        memberships,
        orderStats,
        commissionStats,
      });

    it("includes the marketers who own commissions even without a UserCompany row", () => {
      const rows = buildRows();
      const row54 = rows.find((row) => row.affiliateCode === "54DF7030");

      expect(row54).toBeDefined();
      expect(row54.isMember).toBe(false);
      expect(row54.hasAffiliateRecord).toBe(true);
      expect(row54.orderCount).toBe(139);
      expect(row54.totalCommission).toBe(1390.5);
      expect(row54.isOtherCompany).toBe(false);
      expect(row54.canFilterOrders).toBe(true);
    });

    it("includes members whose company role is not AFFILIATE (e.g. COMPANY_ADMIN)", () => {
      const rows = buildRows();
      const row12 = rows.find((row) => row.affiliateCode === "12A3C2A6");

      expect(row12).toBeDefined();
      expect(row12.membershipRole).toBe("COMPANY_ADMIN");
      expect(row12.orderCount).toBe(2);
      expect(row12.commissionOrderCount).toBe(2);
      expect(row12.totalCommission).toBe(40);
    });

    it("flags a marketer registered in another company and keeps them visible with 0 orders", () => {
      const rows = buildRows();
      const row07 = rows.find((row) => row.affiliateCode === "077AD902");

      expect(row07).toBeDefined();
      expect(row07.isOtherCompany).toBe(true);
      expect(row07.affiliateCompanyId).toBe(OTHER_COMPANY_ID);
      expect(row07.orderCount).toBe(0);
      expect(row07.membershipRole).toBe("OWNER");
      expect(row07.canFilterOrders).toBe(true);
    });

    it("shows AFFILIATE-role members without an affiliate record as PENDING and unfilterable", () => {
      const rows = buildRows();
      const pending = rows.find((row) => row.userId === userPending.id);

      expect(pending).toBeDefined();
      expect(pending.isPendingAffiliateRecord).toBe(true);
      expect(pending.affiliateCode).toBe("PENDING");
      expect(pending.affiliateId).toBeNull();
      expect(pending.canFilterOrders).toBe(false);
      expect(pending.orderCount).toBe(0);
    });

    it("dedupes the same marketer across sources (userId key)", () => {
      const rows = mergeAffiliateMarketers({
        companyId: COMPANY_ID,
        ownAffiliates: [affiliate54],
        linkedAffiliates: [affiliate54, affiliate12],
        memberships,
        orderStats,
        commissionStats,
      });

      expect(rows.filter((row) => row.userId === user54.id)).toHaveLength(1);
      expect(rows.filter((row) => row.userId === user12.id)).toHaveLength(1);
    });

    it("never yields a row with orders for a marketer lacking an affiliate id", () => {
      const rows = buildRows();
      rows.forEach((row) => {
        if (!row.affiliateId) {
          expect(row.orderCount).toBe(0);
          expect(row.totalCommission).toBe(0);
          expect(row.canFilterOrders).toBe(false);
        }
      });
    });

    it("sorts by order count descending", () => {
      const rows = buildRows();
      expect(rows.map((row) => row.affiliateCode)).toEqual([
        "54DF7030",
        "12A3C2A6",
        "PENDING",
        "077AD902",
      ]);
    });

    it("resolves display names and codes for the filter UI", () => {
      const rows = buildRows();
      const row54 = rows.find((row) => row.affiliateCode === "54DF7030");
      expect(row54.name).toBe("مسوق أول");
      expect(row54.email).toBe("a@example.com");
    });
  });

  describe("indexes", () => {
    it("ignores null affiliate ids from groupBy results", () => {
      const index = buildOrderCountIndex([
        { affiliateId: null, _count: { _all: 12 } },
        { affiliateId: "aff-1", _count: { _all: 3 } },
      ]);
      expect(index.has("null")).toBe(false);
      expect(index.get("aff-1")).toBe(3);
      expect(index.size).toBe(1);
    });

    it("rounds commission totals to two decimals", () => {
      const index = buildCommissionIndex([
        { affiliateId: "aff-1", _count: { orderId: 2 }, _sum: { amount: 10.005 } },
      ]);
      expect(index.get("aff-1")).toEqual({ commissionOrderCount: 2, totalCommission: 10.01 });
    });
  });

  describe("isOtherCompanyAffiliate", () => {
    it("detects affiliates owned by another company", () => {
      expect(isOtherCompanyAffiliate(affiliate07, COMPANY_ID)).toBe(true);
      expect(isOtherCompanyAffiliate(affiliate54, COMPANY_ID)).toBe(false);
      expect(isOtherCompanyAffiliate({ companyId: null }, COMPANY_ID)).toBe(false);
    });
  });

  describe("summarizeAffiliateStores", () => {
    const companies = [
      { id: COMPANY_ID, name: "شركة الإنتاج" },
      { id: OTHER_COMPANY_ID, name: "شركة أخرى" },
      { id: "empty-company", name: "شركة بلا نشاط" },
    ];

    it("keeps only companies with affiliate orders or active marketers, with counts", () => {
      const stores = summarizeAffiliateStores({
        companies,
        companyStats: [
          { companyId: COMPANY_ID, _count: { _all: 141 } },
          { companyId: OTHER_COMPANY_ID, _count: { _all: 0 } },
        ],
        activeMarketerStats: [
          { companyId: COMPANY_ID, _count: { _all: 3 } },
          { companyId: "empty-company", _count: { _all: 0 } },
        ],
      });

      expect(stores).toHaveLength(1);
      expect(stores[0]).toEqual({
        companyId: COMPANY_ID,
        companyName: "شركة الإنتاج",
        orderCount: 141,
        activeMarketersCount: 3,
      });
    });

    it("includes a company that only has an active marketer", () => {
      const stores = summarizeAffiliateStores({
        companies,
        companyStats: [],
        activeMarketerStats: [{ companyId: OTHER_COMPANY_ID, _count: { _all: 2 } }],
      });

      expect(stores).toHaveLength(1);
      expect(stores[0].companyId).toBe(OTHER_COMPANY_ID);
      expect(stores[0].orderCount).toBe(0);
      expect(stores[0].activeMarketersCount).toBe(2);
    });
  });
});
