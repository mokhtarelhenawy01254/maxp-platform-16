const mockPrisma = {
  user: {
    findUnique: jest.fn(),
  },
  userCompany: {
    findUnique: jest.fn(),
    count: jest.fn(),
  },
};

jest.mock("../../services/sharedDatabase", () => ({
  getSharedPrismaClientAsync: jest.fn(),
  executeWithRetry: jest.fn(async (operation) => operation()),
}));

jest.mock("../../services/tenantContext", () => ({
  run: jest.fn((companyId, callback) => callback()),
}));

jest.mock("jsonwebtoken", () => ({
  verify: jest.fn(),
}));

const sharedDatabase = require("../../services/sharedDatabase");
const tenantContext = require("../../services/tenantContext");
const jwt = require("jsonwebtoken");
const {
  authenticateToken,
  requireCompanyAccess,
} = require("../../utils/verifyToken");

const createResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("verifyToken middleware", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sharedDatabase.executeWithRetry.mockImplementation(async (operation) => operation());
    sharedDatabase.getSharedPrismaClientAsync.mockResolvedValue(mockPrisma);
  });

  it("authenticates with the guaranteed async Prisma client", async () => {
    const req = {
      method: "GET",
      path: "/storefront-settings",
      headers: {
        authorization: "Bearer mock-token",
      },
      query: {},
      body: {},
    };
    const res = createResponse();
    const next = jest.fn();

    jwt.verify.mockReturnValue({
      userId: "user-1",
      companyId: "company-1",
      role: "OWNER",
    });

    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      firstName: "Store",
      lastName: "Owner",
      email: "owner@test.com",
      role: "OWNER",
      companyId: "company-1",
      isActive: true,
    });

    mockPrisma.userCompany.findUnique.mockResolvedValue({
      role: "OWNER",
      isActive: true,
    });

    await authenticateToken(req, res, next);

    expect(sharedDatabase.getSharedPrismaClientAsync).toHaveBeenCalled();
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: "user-1" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        companyId: true,
        isActive: true,
      },
    });
    expect(tenantContext.run).toHaveBeenCalledWith("company-1", expect.any(Function));
    expect(req.user).toEqual(
      expect.objectContaining({
        id: "user-1",
        companyId: "company-1",
        role: "OWNER",
      }),
    );
    expect(next).toHaveBeenCalled();
  });

  it("returns 503 when company access fails because the database is still warming up", async () => {
    const req = {
      originalUrl: "/api/v1/storefront-settings",
      params: {},
      query: {},
      body: {},
      user: {
        id: "user-1",
        role: "OWNER",
        companyId: "company-1",
      },
    };
    const res = createResponse();
    const next = jest.fn();

    sharedDatabase.getSharedPrismaClientAsync.mockRejectedValueOnce(
      new Error("Engine is not yet connected"),
    );

    await requireCompanyAccess(req, res, next);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "قاعدة البيانات غير متاحة حالياً",
      code: "DB_UNAVAILABLE",
    });
    expect(next).not.toHaveBeenCalled();
  });
});
