const express = require("express");
const request = require("supertest");

let mockAuthUser = { id: "user-1", companyId: "company-1", role: "OWNER" };
const mockAxiosGet = jest.fn();
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
  },
  company: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  facebookAdsConnectionSource: {
    upsert: jest.fn(),
    update: jest.fn(),
  },
  facebookAdAccount: {
    findFirst: jest.fn(),
    updateMany: jest.fn(),
    upsert: jest.fn(),
  },
};

jest.mock("axios", () => ({
  get: (...args) => mockAxiosGet(...args),
}));

jest.mock("../../services/sharedDatabase", () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
}));

jest.mock("../../utils/verifyToken", () => ({
  authenticateToken: (req, res, next) => {
    if (!mockCurrentUser) {
      return res.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
    }
    req.user = mockCurrentUser;
    return next();
  },
  requireRole: (roles) => (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions', code: 'INSUFFICIENT_PERMISSIONS' });
    }
    return next();
  },
  requireSuperAdmin: (req, res, next) => {
    if (!req.user || req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    return next();
  },
  requireCompanyAccess: (req, res, next) => next(),
  optionalAuth: (req, res, next) => next(),
}));

jest.mock("../../middleware/superAdminMiddleware", () => ({
  authenticateToken: (_req, _res, next) => next(),
  requireSuperAdmin: (_req, _res, next) => next(),
}));

const facebookOAuthRoutes = require("../../routes/facebookOAuthRoutes");

describe("facebookOAuthRoutes ads OAuth", () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthUser = { id: "user-1", companyId: "company-1", role: "OWNER" };
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      role: "OWNER",
      companyId: "company-1",
      isActive: true,
      userCompanies: [],
    });
    mockPrisma.company.findUnique.mockResolvedValue({
      id: "company-1",
    });
    mockPrisma.company.update.mockResolvedValue({});
    mockPrisma.facebookAdsConnectionSource.upsert.mockResolvedValue({
      id: "source-1",
      companyId: "company-1",
      facebookUserId: "fb-user-1",
      facebookUserName: "Owner One",
      facebookUserEmail: "owner@example.com",
      accessToken: "ads-token",
      status: "connected",
    });
    mockPrisma.facebookAdsConnectionSource.update.mockResolvedValue({});
    mockPrisma.facebookAdAccount.findFirst.mockResolvedValue(null);
    mockPrisma.facebookAdAccount.updateMany.mockResolvedValue({ count: 0 });
    mockPrisma.facebookAdAccount.upsert.mockResolvedValue({
      id: "ad-account-1",
      accountId: "112",
    });
    app = express();
    app.use("/facebook-oauth", facebookOAuthRoutes);
  });

  const decodeSignedStatePayload = (state) => {
    const [encodedPayload, signature] = state.split(".");
    const base64 = encodedPayload
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(
        encodedPayload.length + ((4 - (encodedPayload.length % 4)) % 4),
        "=",
      );

    return {
      payload: JSON.parse(Buffer.from(base64, "base64").toString("utf8")),
      signature,
    };
  };

  test("creates an ads OAuth URL that returns to the isolated ads connection page", async () => {
    const response = await request(app)
      .get("/facebook-oauth/ads-authorize")
      .query({
        companyId: "company-1",
        returnOrigin: "https://maxp.online",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    const authUrl = new URL(response.body.authUrl);
    expect(authUrl.pathname).toMatch(/\/dialog\/oauth$/);
    expect(authUrl.searchParams.get("scope")).toContain("ads_management");
    expect(authUrl.searchParams.get("redirect_uri")).toContain(
      "/api/v1/facebook-oauth/callback",
    );

    const { payload, signature } = decodeSignedStatePayload(
      authUrl.searchParams.get("state"),
    );
    expect(signature).toBeTruthy();
    expect(payload).toEqual(
      expect.objectContaining({
        cid: "company-1",
        uid: "user-1",
        type: "ads",
        returnOrigin: "https://maxp.online",
      }),
    );
  });

  test("blocks non-manager users from starting ads OAuth", async () => {
    mockAuthUser = { id: "agent-1", companyId: "company-1", role: "AGENT" };

    const response = await request(app)
      .get("/facebook-oauth/ads-authorize")
      .query({
        companyId: "company-1",
        returnOrigin: "https://maxp.online",
      });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("INSUFFICIENT_PERMISSIONS");
  });

  test("rejects forged unsigned ads callback state before token exchange", async () => {
    const forgedState = Buffer.from(
      `company-1|user-1|${Date.now()}|abc123|ads|https://maxp.online`,
    ).toString("base64");

    const response = await request(app)
      .get("/facebook-oauth/callback")
      .query({
        code: "oauth-code",
        state: forgedState,
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toContain("/advertising/facebook-ads/connection");
    expect(response.headers.location).toContain("error=invalid_state");
  });

  test("stores ads OAuth as a Facebook account source and syncs ad accounts", async () => {
    const authorizeResponse = await request(app)
      .get("/facebook-oauth/ads-authorize")
      .query({
        companyId: "company-1",
        returnOrigin: "https://maxp.online",
      });
    const authUrl = new URL(authorizeResponse.body.authUrl);
    const state = authUrl.searchParams.get("state");

    mockAxiosGet.mockImplementation(async (url) => {
      if (url.includes("/oauth/access_token")) {
        return { data: { access_token: "ads-token", expires_in: 3600 } };
      }

      if (url.includes("/me/adaccounts")) {
        return {
          data: {
            data: [
              {
                id: "act_112",
                account_id: "112",
                name: "Swan Ads",
                currency: "EGP",
                timezone_name: "Africa/Cairo",
              },
            ],
          },
        };
      }

      if (url.endsWith("/me")) {
        return {
          data: {
            id: "fb-user-1",
            name: "Owner One",
            email: "owner@example.com",
          },
        };
      }

      throw new Error(`Unexpected axios URL: ${url}`);
    });

    const response = await request(app)
      .get("/facebook-oauth/callback")
      .query({
        code: "oauth-code",
        state,
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toContain("/advertising/facebook-ads/connection");
    expect(response.headers.location).toContain("success=ads_connected");
    expect(response.headers.location).toContain("sourceId=source-1");
    expect(mockPrisma.company.update).toHaveBeenCalledWith({
      where: { id: "company-1" },
      data: { facebookAdsAccessToken: "ads-token" },
    });
    expect(mockPrisma.facebookAdsConnectionSource.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          companyId_facebookUserId: {
            companyId: "company-1",
            facebookUserId: "fb-user-1",
          },
        },
        update: expect.objectContaining({
          accessToken: "ads-token",
          status: "connected",
          facebookUserName: "Owner One",
          facebookUserEmail: "owner@example.com",
        }),
        create: expect.objectContaining({
          companyId: "company-1",
          facebookUserId: "fb-user-1",
          accessToken: "ads-token",
        }),
      }),
    );
    expect(mockPrisma.facebookAdAccount.updateMany).toHaveBeenCalledWith({
      where: {
        companyId: "company-1",
        accountId: { not: "112" },
      },
      data: { isActive: false },
    });
    expect(mockPrisma.facebookAdAccount.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          accessToken: "ads-token",
          connectionSourceId: "source-1",
          isActive: true,
        }),
        create: expect.objectContaining({
          accessToken: "ads-token",
          connectionSourceId: "source-1",
          isActive: true,
        }),
      }),
    );
  });
});
