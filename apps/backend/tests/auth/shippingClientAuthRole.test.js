const mockPrisma = {
  user: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  company: {
    findUnique: jest.fn(),
    findFirst: jest.fn().mockResolvedValue(null),
    update: jest.fn().mockImplementation(async ({ data }) => ({ id: "company-1", name: "Express Shipping Co", slug: data?.slug || "express-shipping-co" })),
  },
  userCompany: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  activityLog: {
    create: jest.fn(),
  },
};

jest.mock("../../services/sharedDatabase", () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
  getSharedPrismaClientAsync: jest.fn(async () => mockPrisma),
  initializeSharedDatabase: jest.fn().mockResolvedValue(undefined),
  executeWithRetry: jest.fn(async (operation) => operation()),
}));

jest.mock("bcryptjs", () => ({
  compare: jest.fn().mockResolvedValue(true),
  hash: jest.fn(),
}));

process.env.JWT_SECRET = 'test-jwt-secret-12345678901234567890';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-12345678901234567890';

const jwt = require("jsonwebtoken");
const { login, me } = require("../../controller/authController");
const verifyToken = require("../../utils/verifyToken");

const createResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  return res;
};

describe("SHIP-W13: Shipping client role and auth/me truth preservation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("1. Login for SHIPPING_CLIENT returns role='SHIPPING_CLIENT', merchantId, and signs JWT with role='SHIPPING_CLIENT'", async () => {
    const clientUser = {
      id: "client-user-1",
      email: "client@test.com",
      password: "hashed-password",
      firstName: "Test",
      lastName: "Client",
      role: "SHIPPING_CLIENT",
      merchantId: "merchant-123",
      companyId: "company-1",
      isActive: true,
      timezone: "Africa/Cairo",
      lastLoginAt: null,
      company: {
        id: "company-1",
        name: "Express Shipping Co",
        slug: "express-shipping-co",
        isActive: true,
        installedApps: [],
      },
      userCompanies: [
        // Even if an old stale UserCompany record exists with role AGENT
        {
          companyId: "company-1",
          role: "AGENT",
          roleId: null,
          isActive: true,
          isDefault: true,
          company: { id: "company-1", name: "Express Shipping Co", isActive: true, installedApps: [] },
        },
      ],
    };

    mockPrisma.user.findFirst.mockResolvedValue(clientUser);
    mockPrisma.user.update.mockResolvedValue(clientUser);
    mockPrisma.activityLog.create.mockResolvedValue({ id: "act-1" });

    const req = {
      body: {
        email: "client@test.com",
        password: "password123",
      },
      headers: {},
      ip: "127.0.0.1",
    };
    const res = createResponse();

    await login(req, res);

    expect(res.json).toHaveBeenCalled();
    const responseData = res.json.mock.calls[0][0];
    expect(responseData.success).toBe(true);
    expect(responseData.data.user.role).toBe("SHIPPING_CLIENT");
    expect(responseData.data.user.merchantId).toBe("merchant-123");

    // Verify JWT payload
    const token = responseData.data.token;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    expect(decoded.role).toBe("SHIPPING_CLIENT");
    expect(decoded.merchantId).toBe("merchant-123");
  });

  test("2. /auth/me returns role='SHIPPING_CLIENT' and merchantId, never downgrades to AGENT", async () => {
    const token = jwt.sign(
      {
        userId: "client-user-1",
        email: "client@test.com",
        role: "SHIPPING_CLIENT",
        merchantId: "merchant-123",
        companyId: "company-1",
      },
      process.env.JWT_SECRET
    );

    const clientUser = {
      id: "client-user-1",
      email: "client@test.com",
      firstName: "Test",
      lastName: "Client",
      role: "SHIPPING_CLIENT",
      merchantId: "merchant-123",
      companyId: "company-1",
      isActive: true,
      company: {
        id: "company-1",
        name: "Express Shipping Co",
        slug: "express-shipping-co",
        isActive: true,
        installedApps: [],
      },
      userCompanies: [
        {
          companyId: "company-1",
          role: "AGENT",
          roleId: null,
          isActive: true,
          isDefault: true,
          company: { id: "company-1", name: "Express Shipping Co", isActive: true, installedApps: [] },
        },
      ],
    };

    mockPrisma.user.findUnique.mockResolvedValue(clientUser);

    const req = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    };
    const res = createResponse();

    await me(req, res);

    expect(res.json).toHaveBeenCalled();
    const responseData = res.json.mock.calls[0][0];
    expect(responseData.success).toBe(true);
    expect(responseData.data.role).toBe("SHIPPING_CLIENT");
    expect(responseData.data.merchantId).toBe("merchant-123");
  });

  test("3. verifyToken middleware sets req.user.role = 'SHIPPING_CLIENT' and attaches merchantId", async () => {
    const token = jwt.sign(
      {
        userId: "client-user-1",
        email: "client@test.com",
        role: "SHIPPING_CLIENT",
        companyId: "company-1",
      },
      process.env.JWT_SECRET
    );

    const clientUser = {
      id: "client-user-1",
      firstName: "Test",
      lastName: "Client",
      email: "client@test.com",
      role: "SHIPPING_CLIENT",
      merchantId: "merchant-123",
      companyId: "company-1",
      isActive: true,
    };

    mockPrisma.user.findUnique.mockResolvedValue(clientUser);

    const req = {
      headers: {
        authorization: `Bearer ${token}`,
      },
      method: "GET",
      path: "/api/v1/client-portal/shipping",
    };
    const res = createResponse();
    const next = jest.fn();

    await verifyToken.authenticateToken(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user.role).toBe("SHIPPING_CLIENT");
    expect(req.user.merchantId).toBe("merchant-123");
  });
});
