/**
 * Integration test for /api/v1/order-status-rules route.
 *
 * This is the full HTTP chain test (P0.1 + P0.2) that verifies:
 *  - Routes are mounted with the correct middlewares
 *  - requireRole blocks unauthorized users (e.g., AGENT, regular EMPLOYEE)
 *  - The controller's validation is reached for authorized users
 *  - Role check is bypassed for SUPER_ADMIN
 *
 * Mocks:
 *  - verifyToken.authenticateToken: injects mockCurrentUser
 *  - checkAppAccess: bypassed (returns next) — we test the role layer here
 *  - sharedDatabase.getSharedPrismaClient: returns our mockPrisma
 *
 * Companion to:
 *  - tests/controller/orderStatusRuleController.test.js (unit tests)
 *  - tests/middleware/globalSecurity.tenantIsolation.test.js (tenant isolation)
 */

const express = require("express");
const request = require("supertest");

// Mutable so each test can change the user identity
let mockCurrentUser = {
  id: "user-1",
  companyId: "company-1",
  effectiveCompanyId: "company-1",
  role: "OWNER",
};

const mockPrisma = {
  orderStatusAutoChangeRule: {
    findMany: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn(),
  },
  orderStatusConfig: {
    findFirst: jest.fn(),
  },
};

jest.mock("../../utils/verifyToken", () => ({
  authenticateToken: (req, _res, next) => {
    req.user = { ...mockCurrentUser };
    next();
  },
  // requireRole is real — we WANT to test it
  requireRole: jest.requireActual("../../utils/verifyToken").requireRole,
}));

jest.mock("../../middleware/checkAppAccess", () => ({
  checkAppAccess: () => (_req, _res, next) => next(),  // bypass for this test
}));

jest.mock("../../services/sharedDatabase", () => ({
  getSharedPrismaClient: () => mockPrisma,
}));

jest.mock("../../utils/orderStatusEnum", () => ({
  isValidOrderStatusEnum: (s) => {
    const valid = new Set([
      "PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED",
      "PROCESSING", "ON_HOLD", "PENDING_CANCELLATION", "REFUNDED",
    ]);
    return valid.has(String(s || "").toUpperCase());
  },
}));

const ruleRoutes = require("../../routes/orderStatusRuleRoutes");

// ── Setup ───────────────────────────────────────────────────────────
let app;

const buildApp = () => {
  const a = express();
  a.use(express.json());
  a.use("/api/v1/order-status-rules", ruleRoutes);
  return a;
};

const VALID_RULE_BODY = {
  fromStatus: "CONFIRMED",
  toStatus: "SHIPPED",
  waitTime: 30,
  timeUnit: "Minutes",
};

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.orderStatusConfig.findFirst.mockResolvedValue(null);
  mockPrisma.orderStatusAutoChangeRule.create.mockResolvedValue({ id: "rule-1" });
  mockPrisma.orderStatusAutoChangeRule.findMany.mockResolvedValue([]);
  mockPrisma.orderStatusAutoChangeRule.deleteMany.mockResolvedValue({ count: 1 });
  mockCurrentUser = {
    id: "user-1",
    companyId: "company-1",
    effectiveCompanyId: "company-1",
    role: "OWNER",
  };
  app = buildApp();
});

// ── Tests ───────────────────────────────────────────────────────────
describe("POST /api/v1/order-status-rules (full chain)", () => {
  test("OWNER can create a valid rule", async () => {
    mockCurrentUser.role = "OWNER";
    const res = await request(app).post("/api/v1/order-status-rules").send(VALID_RULE_BODY);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(mockPrisma.orderStatusAutoChangeRule.create).toHaveBeenCalled();
  });

  test("MANAGER can create a valid rule", async () => {
    mockCurrentUser.role = "MANAGER";
    const res = await request(app).post("/api/v1/order-status-rules").send(VALID_RULE_BODY);

    expect(res.status).toBe(201);
  });

  test("COMPANY_ADMIN can create a valid rule", async () => {
    mockCurrentUser.role = "COMPANY_ADMIN";
    const res = await request(app).post("/api/v1/order-status-rules").send(VALID_RULE_BODY);

    expect(res.status).toBe(201);
  });

  test("SUPER_ADMIN can create a valid rule (role bypass)", async () => {
    mockCurrentUser.role = "SUPER_ADMIN";
    const res = await request(app).post("/api/v1/order-status-rules").send(VALID_RULE_BODY);

    expect(res.status).toBe(201);
  });

  test("AGENT is blocked (403) — only admins can create rules", async () => {
    mockCurrentUser.role = "AGENT";
    const res = await request(app).post("/api/v1/order-status-rules").send(VALID_RULE_BODY);

    expect(res.status).toBe(403);
    expect(mockPrisma.orderStatusAutoChangeRule.create).not.toHaveBeenCalled();
  });

  test("Regular EMPLOYEE (no admin role) is blocked (403)", async () => {
    mockCurrentUser.role = "EMPLOYEE";
    const res = await request(app).post("/api/v1/order-status-rules").send(VALID_RULE_BODY);

    expect(res.status).toBe(403);
  });

  test("AFFILIATE is blocked (403) — order-core is not for affiliates", async () => {
    mockCurrentUser.role = "AFFILIATE";
    const res = await request(app).post("/api/v1/order-status-rules").send(VALID_RULE_BODY);

    expect(res.status).toBe(403);
  });

  test("Validation still applies after role check (P0.1 + P0.2 combined)", async () => {
    mockCurrentUser.role = "OWNER";
    const res = await request(app)
      .post("/api/v1/order-status-rules")
      // The "1-Click Wipe" attack: even OWNER is now blocked
      .send({ fromStatus: "DELIVERED", toStatus: "PENDING", waitTime: 0, timeUnit: "Minutes" });

    expect(res.status).toBe(400);  // controller validation, not 403
    expect(res.body.message).toMatch(/1 و 525600/);  // waitTime range message
    expect(mockPrisma.orderStatusAutoChangeRule.create).not.toHaveBeenCalled();
  });

  test("timeUnit whitelist enforced (P0.1)", async () => {
    mockCurrentUser.role = "OWNER";
    const res = await request(app)
      .post("/api/v1/order-status-rules")
      .send({ ...VALID_RULE_BODY, timeUnit: "fortnights" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/وحدة الوقت/);
  });
});

describe("GET /api/v1/order-status-rules (read-only, no requireRole)", () => {
  test("Any authenticated user can read rules (no role check on GET)", async () => {
    mockCurrentUser.role = "AGENT";
    const res = await request(app).get("/api/v1/order-status-rules");

    expect(res.status).toBe(200);
    expect(mockPrisma.orderStatusAutoChangeRule.findMany).toHaveBeenCalledWith({
      where: { companyId: "company-1" },
      orderBy: { createdAt: "desc" },
    });
  });
});

describe("DELETE /api/v1/order-status-rules/:id", () => {
  test("OWNER can delete a rule", async () => {
    mockCurrentUser.role = "OWNER";
    const res = await request(app).delete("/api/v1/order-status-rules/rule-1");

    expect(res.status).toBe(200);
    expect(mockPrisma.orderStatusAutoChangeRule.deleteMany).toHaveBeenCalledWith({
      where: { id: "rule-1", companyId: "company-1" },
    });
  });

  test("AGENT is blocked from deleting (403)", async () => {
    mockCurrentUser.role = "AGENT";
    const res = await request(app).delete("/api/v1/order-status-rules/rule-1");

    expect(res.status).toBe(403);
    expect(mockPrisma.orderStatusAutoChangeRule.deleteMany).not.toHaveBeenCalled();
  });

  test("Cross-company deletion returns 404 (deleteMany count=0)", async () => {
    mockCurrentUser.role = "OWNER";
    mockPrisma.orderStatusAutoChangeRule.deleteMany.mockResolvedValue({ count: 0 });

    const res = await request(app).delete("/api/v1/order-status-rules/other-company-rule");

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/القاعدة غير موجودة/);
  });
});

/**
 * End-to-end reproduction of the original BUG-1 attack:
 *
 *   POST /api/v1/order-status-rules
 *   Headers: { Authorization: Bearer <jwt_for_company_1> }
 *   Body:   { fromStatus: "DELIVERED", toStatus: "PENDING",
 *             waitTime: 0, timeUnit: "Minutes" }
 *
 * After the fix chain (P0.1 + P0.2 + P0.3), this MUST be blocked at the
 * controller layer (400) — even if the attacker has a valid OWNER JWT
 * and the order-core app is installed.
 */
describe("BUG-1 end-to-end reproduction (the 1-Click Wipe)", () => {
  test("OWNER with valid order-core access still cannot create a destructive rule", async () => {
    mockCurrentUser.role = "OWNER";
    mockCurrentUser.companyId = "company-victim";
    mockCurrentUser.effectiveCompanyId = "company-victim";

    const res = await request(app)
      .post("/api/v1/order-status-rules")
      .send({ fromStatus: "DELIVERED", toStatus: "PENDING", waitTime: 0, timeUnit: "Minutes" });

    // Validation rejects the waitTime=0 BEFORE the rule is created.
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(mockPrisma.orderStatusAutoChangeRule.create).not.toHaveBeenCalled();
  });

  test("Even an INVALID timeUnit is blocked at the controller layer (not the cron)", async () => {
    mockCurrentUser.role = "OWNER";
    const res = await request(app)
      .post("/api/v1/order-status-rules")
      .send({ fromStatus: "DELIVERED", toStatus: "PENDING", waitTime: 30, timeUnit: "fortnights" });

    expect(res.status).toBe(400);
    expect(mockPrisma.orderStatusAutoChangeRule.create).not.toHaveBeenCalled();
  });
});
