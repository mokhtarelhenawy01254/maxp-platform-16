const mockPrisma = {
  user: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  userInvitation: {
    findFirst: jest.fn(),
  },
};

jest.mock("../../services/sharedDatabase", () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
  initializeSharedDatabase: jest.fn().mockResolvedValue(undefined),
  executeWithRetry: jest.fn(async (operation) => operation()),
}));

jest.mock("bcryptjs", () => ({
  compare: jest.fn().mockResolvedValue(true),
  hash: jest.fn(),
}));

process.env.JWT_SECRET = 'test-jwt-secret-12345678901234567890';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-12345678901234567890';

jest.mock("jsonwebtoken", () => ({
  sign: jest.fn().mockReturnValue("mock-jwt-token"),
}));

jest.mock("nodemailer", () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({ messageId: "mock-mail" }),
  })),
}));

const { login, forgotPassword } = require("../../controller/authController");

const createResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("authController email normalization", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("normalizes login email and queries users case-insensitively", async () => {
    const req = {
      body: {
        email: "MixedCaseUser@Login.Test",
        password: "TestPassword123!",
      },
    };
    const res = createResponse();

    mockPrisma.user.findFirst.mockResolvedValue({
      id: "user-1",
      email: "MixedCaseUser@Login.Test",
      password: "hashed-password",
      firstName: "Mixed",
      lastName: "Case",
      role: "OWNER",
      companyId: "company-1",
      isActive: true,
      timezone: "Africa/Cairo",
      lastLoginAt: null,
      company: {
        id: "company-1",
        name: "PEARLEG",
        slug: "pearleg",
        logo: null,
        currency: "EGP",
        isActive: true,
        sidebarLayout: "three-tier",
        installedApps: [],
      },
      userCompanies: [],
    });

    await login(req, res);

    expect(mockPrisma.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          email: {
            equals: "mixedcaseuser@login.test",
            mode: "insensitive",
          },
        },
      }),
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          token: "mock-jwt-token",
        }),
      }),
    );
  });

  it("normalizes forgot-password email before user and invitation lookup", async () => {
    const req = {
      body: {
        email: "MixedCaseUser@Login.Test",
      },
    };
    const res = createResponse();

    mockPrisma.user.findFirst.mockResolvedValue(null);
    mockPrisma.userInvitation.findFirst.mockResolvedValue(null);

    await forgotPassword(req, res);

    expect(mockPrisma.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          email: {
            equals: "mixedcaseuser@login.test",
            mode: "insensitive",
          },
        },
      }),
    );
    expect(mockPrisma.userInvitation.findFirst).toHaveBeenCalledWith({
      where: {
        email: "mixedcaseuser@login.test",
        status: "PENDING",
      },
    });
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
      }),
    );
  });
});
