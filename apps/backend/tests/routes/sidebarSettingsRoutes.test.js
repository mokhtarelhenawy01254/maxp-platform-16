const express = require("express");
const request = require("supertest");

let mockCurrentUser = {
  id: "user-1",
  companyId: "company-1",
  role: "OWNER",
};

let mockCompanyRecord = {
  id: "company-1",
  sidebarLayout: "three-tier",
  settings: JSON.stringify({
    currency: "EGP",
    vatRate: 14,
    companyPhone: "01000000000",
  }),
};

const mockPrisma = {
  company: {
    findUnique: jest.fn(async ({ where }) => {
      if (where.id === "company-1") {
        return { ...mockCompanyRecord };
      }
      return null;
    }),
    update: jest.fn(async ({ where, data }) => {
      if (where.id === "company-1") {
        mockCompanyRecord = {
          ...mockCompanyRecord,
          settings: data.settings,
        };
        return { ...mockCompanyRecord };
      }
      return null;
    }),
  },
  companyApp: {
    findMany: jest.fn(async () => [
      {
        id: "ca-1",
        companyId: "company-1",
        appId: "app-crm",
        customName: null,
        app: { id: "app-crm", slug: "crm-app", name: "CRM Pro" }
      }
    ]),
    updateMany: jest.fn(async () => ({ count: 1 })),
  },
};

jest.mock("../../services/sharedDatabase", () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
}));

jest.mock("../../services/orderWebhookService", () => ({
  invalidateWebhookCache: jest.fn(),
}));

// F-04 (TICKET-2026-11-06-RBAC-01): requireDbPermission resolves permissions here.
jest.mock("../../services/permissionService", () => ({
  getUserPermissions: jest.fn(async () => []),
}));

const permissionService = require("../../services/permissionService");

jest.mock("../../utils/verifyToken", () => ({
  authenticateToken: (req, res, next) => {
    if (!mockCurrentUser) {
      return res.status(401).json({ error: "Authentication required", code: "AUTH_REQUIRED" });
    }
    req.user = mockCurrentUser;
    return next();
  },
  requireRole: (roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    return next();
  },
  requireSuperAdmin: (req, res, next) => {
    if (!req.user || req.user.role !== "SUPER_ADMIN") {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    return next();
  },
  requireCompanyAccess: (req, res, next) => next(),
  optionalAuth: (req, res, next) => next(),
}));

const settingsRoutes = require("../../routes/settingsRoutes");

describe("sidebar settings routes (PUT/GET /settings/sidebar)", () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentUser = {
      id: "user-1",
      companyId: "company-1",
      role: "OWNER",
    };
    mockCompanyRecord = {
      id: "company-1",
      sidebarLayout: "three-tier",
      settings: JSON.stringify({
        currency: "EGP",
        vatRate: 14,
        companyPhone: "01000000000",
      }),
    };

    app = express();
    app.use(express.json());
    app.use("/api/v1/settings", settingsRoutes);
  });

  test("PUT /settings/sidebar requires OWNER or COMPANY_ADMIN (rejects regular employee with 403 and Arabic message)", async () => {
    mockCurrentUser = {
      id: "user-emp",
      companyId: "company-1",
      role: "EMPLOYEE",
    };

    const res = await request(app)
      .put("/api/v1/settings/sidebar")
      .send([
        { key: "dashboard", order: 0, visible: true },
        { key: "orders", order: 1, visible: true },
      ]);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/غير مصرح لك/);
  });

  test("PUT /settings/sidebar validates payload shape (rejects invalid payload)", async () => {
    // Non-array
    let res = await request(app)
      .put("/api/v1/settings/sidebar")
      .send({ invalid: "not-an-array" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/يجب إرسال مصفوفة/);

    // Missing key
    res = await request(app)
      .put("/api/v1/settings/sidebar")
      .send([{ order: 1, visible: true }]);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/مفتاح العنصر/);

    // Invalid order
    res = await request(app)
      .put("/api/v1/settings/sidebar")
      .send([{ key: "orders", order: "first", visible: true }]);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/ترتيب العنصر/);

    // Invalid visible
    res = await request(app)
      .put("/api/v1/settings/sidebar")
      .send([{ key: "orders", order: 1, visible: "yes" }]);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/حالة ظهور العنصر/);

    // Label length > 60 chars
    res = await request(app)
      .put("/api/v1/settings/sidebar")
      .send([
        {
          key: "orders",
          order: 1,
          visible: true,
          labelAr: "أ".repeat(61),
        },
      ]);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/60 حرفاً/);

    // More than 200 items
    const manyItems = Array.from({ length: 201 }, (_, i) => ({
      key: `item-${i}`,
      order: i,
      visible: true,
    }));
    res = await request(app)
      .put("/api/v1/settings/sidebar")
      .send(manyItems);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/200 عنصر/);
  });

  test("PUT /settings/sidebar merges into company settings without wiping unrelated settings keys, and GET returns what was saved", async () => {
    const payload = [
      { key: "dashboard", order: 0, visible: true, labelAr: "الرئيسية المخصصة", labelEn: "Custom Dashboard" },
      { key: "orders", order: 1, visible: true, labelAr: "طلبات العملاء", labelEn: "Customer Orders" },
      { key: "marketing", order: 2, visible: false },
    ];

    const putRes = await request(app)
      .put("/api/v1/settings/sidebar")
      .send(payload);

    expect(putRes.status).toBe(200);
    expect(putRes.body.success).toBe(true);
    expect(putRes.body.data).toEqual(payload);

    // Verify company settings in DB kept unrelated fields (currency, vatRate, companyPhone)
    const stored = JSON.parse(mockCompanyRecord.settings);
    expect(stored.currency).toBe("EGP");
    expect(stored.vatRate).toBe(14);
    expect(stored.companyPhone).toBe("01000000000");
    expect(stored.sidebarSettings).toEqual(payload);

    // GET /settings/sidebar returns what was saved
    const getRes = await request(app)
      .get("/api/v1/settings/sidebar");

    expect(getRes.status).toBe(200);
    expect(getRes.body.success).toBe(true);
    expect(getRes.body.data.settings).toEqual(payload);
  });

  test("PUT /settings/sidebar supports structured payload with sections, items, and apps", async () => {
    const payload = {
      sections: {
        dashboard: { visible: true, order: 0, label: "الرئيسية" },
      },
      items: {
        orders: { visible: true, order: 1, label: "الطلبات" },
      },
      apps: {
        "crm-app": { customName: "<b>إدارة العملاء</b>" },
      },
    };

    const res = await request(app)
      .put("/api/v1/settings/sidebar")
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockPrisma.companyApp.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ companyId: "company-1" }),
        data: { customName: "إدارة العملاء" }, // stripped HTML tags
      })
    );
  });

  test("PUT /settings/sidebar rejects app customName that is too short or too long", async () => {
    let res = await request(app)
      .put("/api/v1/settings/sidebar")
      .send({
        apps: { "crm-app": { customName: "A" } },
      });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("INVALID_APP_CUSTOM_NAME");

    res = await request(app)
      .put("/api/v1/settings/sidebar")
      .send({
        apps: { "crm-app": { customName: "A".repeat(25) } },
      });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("INVALID_APP_CUSTOM_NAME");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TICKET-2026-11-06-RBAC-01 F-04 — PUT /settings/company must require
// settings.manage and must not let non-OWNERs write subscription bypass keys.
// ─────────────────────────────────────────────────────────────────────────────
describe("company settings authorization (PUT /settings/company — F-04)", () => {
  let app;

  const resetState = () => {
    jest.clearAllMocks();
    mockCurrentUser = {
      id: "user-1",
      companyId: "company-1",
      role: "OWNER",
    };
    mockCompanyRecord = {
      id: "company-1",
      name: "Company One",
      settings: JSON.stringify({
        currency: "EGP",
        vatRate: 14,
      }),
    };
    permissionService.getUserPermissions.mockResolvedValue([]);

    app = express();
    app.use(express.json());
    app.use("/api/v1/settings", settingsRoutes);
  };

  beforeEach(resetState);

  test("AGENT without settings.manage gets 403 and nothing is written", async () => {
    mockCurrentUser = { id: "user-agent", companyId: "company-1", role: "AGENT" };

    const res = await request(app)
      .put("/api/v1/settings/company")
      .send({ settings: { bypassAppExpiry: ["hr-core", "whatsapp-business"] } });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("INSUFFICIENT_PERMISSIONS");
    expect(res.body.requiredPermission).toBe("settings.manage");
    expect(mockPrisma.company.update).not.toHaveBeenCalled();
  });

  test("COMPANY_ADMIN keeps normal keys but bypass keys are stripped", async () => {
    mockCurrentUser = { id: "user-admin", companyId: "company-1", role: "COMPANY_ADMIN" };
    permissionService.getUserPermissions.mockResolvedValue(["settings.manage"]);

    const res = await request(app)
      .put("/api/v1/settings/company")
      .send({
        settings: {
          currency: "USD",
          bypassExpiry: true,
          allowAccessWhenExpired: true,
          graceAccess: 999,
          bypassAppExpiry: ["hr-core"],
          whatsappAccessBypass: true,
        },
      });

    expect(res.status).toBe(200);

    const stored = JSON.parse(mockCompanyRecord.settings);
    expect(stored.currency).toBe("USD");
    expect(stored.vatRate).toBe(14); // pre-existing key survived the merge
    for (const key of [
      "bypassExpiry",
      "allowAccessWhenExpired",
      "graceAccess",
      "bypassAppExpiry",
      "whatsappAccessBypass",
    ]) {
      expect(stored[key]).toBeUndefined();
    }
  });

  test("MANAGER keeps write access (no regression) but never bypass keys", async () => {
    mockCurrentUser = { id: "user-manager", companyId: "company-1", role: "MANAGER" };
    // MANAGER does not have settings.manage in the seed — write access comes from the
    // role allowlist so operational admins keep working after the F-04 hardening.
    permissionService.getUserPermissions.mockResolvedValue(["settings.view"]);

    const res = await request(app)
      .put("/api/v1/settings/company")
      .send({ settings: { currency: "SAR", bypassAppExpiry: ["hr-core"] } });

    expect(res.status).toBe(200);

    const stored = JSON.parse(mockCompanyRecord.settings);
    expect(stored.currency).toBe("SAR");
    expect(stored.bypassAppExpiry).toBeUndefined();
  });

  test("OWNER can write bypass keys (intentional bypass preserved)", async () => {
    const res = await request(app)
      .put("/api/v1/settings/company")
      .send({ settings: { bypassAppExpiry: ["hr-core"] } });

    expect(res.status).toBe(200);
    expect(JSON.parse(mockCompanyRecord.settings).bypassAppExpiry).toEqual(["hr-core"]);
  });
});

