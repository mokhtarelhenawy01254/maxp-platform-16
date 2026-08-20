const mockGetAdAccounts = jest.fn();
const constructedServices = [];

jest.mock("../../services/facebookAdsService", () =>
  jest.fn().mockImplementation((token, adAccountId) => {
    constructedServices.push({ token, adAccountId });
    return {
      getAdAccounts: mockGetAdAccounts,
    };
  }),
);

const mockPrisma = {
  company: {
    findUnique: jest.fn(),
  },
  facebookAdsConnectionSource: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  facebookAdAccount: {
    findMany: jest.fn(),
    updateMany: jest.fn(),
  },
  facebookPage: {
    count: jest.fn(),
  },
};

jest.mock("../../services/sharedDatabase", () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
}));

const facebookAdsController = require("../../controller/facebookAdsController");

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

describe("facebookAdsController Isolated Ads Connection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    constructedServices.length = 0;
    mockPrisma.facebookAdsConnectionSource.findMany.mockResolvedValue([]);
    mockPrisma.facebookAdAccount.findMany.mockResolvedValue([]);
    mockPrisma.facebookPage.count.mockResolvedValue(3);
    mockPrisma.company.findUnique.mockResolvedValue({
      facebookAdsAccessToken: null,
      facebookUserAccessToken: null,
    });
  });

  describe("getAdsConnectionStatus", () => {
    test("returns empty connection state when nothing is connected", async () => {
      const req = { user: { companyId: "company-1" } };
      const res = createResponseMock();

      await facebookAdsController.getAdsConnectionStatus(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.payload.success).toBe(true);
      expect(res.payload.connected).toBe(false);
      expect(res.payload.connectedFacebookAccountsCount).toBe(0);
      expect(res.payload.savedAdAccounts).toEqual([]);
      expect(res.payload.connectionSources).toEqual([]);
      expect(res.payload.pageConnection.connectedPagesCount).toBe(3);
      expect(res.payload.pageConnection.messengerTokensProtected).toBe(true);
    });

    test("never leaks access tokens to the client", async () => {
      mockPrisma.facebookAdsConnectionSource.findMany.mockResolvedValue([
        {
          id: "source-1",
          companyId: "company-1",
          facebookUserId: "fb-1",
          facebookUserName: "Owner",
          facebookUserEmail: "owner@example.com",
          accessToken: "super-secret-token",
          status: "connected",
          connectedAt: new Date(),
          lastSyncedAt: new Date(),
          lastError: null,
          adAccounts: [{ id: "acc-1" }],
        },
      ]);
      mockPrisma.facebookAdAccount.findMany.mockResolvedValue([
        {
          id: "acc-1",
          accountId: "112",
          name: "Swan Ads",
          currency: "EGP",
          timezone: "Africa/Cairo",
          accessToken: "super-secret-token",
          connectionSourceId: "source-1",
          isActive: true,
          connectionSource: {
            id: "source-1",
            facebookUserName: "Owner",
            facebookUserEmail: "owner@example.com",
          },
        },
      ]);
      mockGetAdAccounts.mockResolvedValue({
        success: true,
        data: [{ id: "act_112", account_id: "112" }],
      });

      const req = { user: { companyId: "company-1" } };
      const res = createResponseMock();

      await facebookAdsController.getAdsConnectionStatus(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.payload.success).toBe(true);
      expect(res.payload.connected).toBe(true);
      expect(res.payload.connectionSources).toHaveLength(1);
      expect(res.payload.connectionSources[0]).toHaveProperty("hasToken", true);
      expect(JSON.stringify(res.payload)).not.toContain("super-secret-token");
      expect(JSON.stringify(res.payload)).not.toContain("accessToken");
    });

    test("reports source test failure from Meta", async () => {
      mockPrisma.facebookAdsConnectionSource.findMany.mockResolvedValue([
        {
          id: "source-1",
          companyId: "company-1",
          facebookUserId: "fb-1",
          facebookUserName: "Owner",
          facebookUserEmail: null,
          accessToken: "token",
          status: "connected",
          connectedAt: new Date(),
          lastSyncedAt: null,
          lastError: null,
          adAccounts: [],
        },
      ]);
      mockGetAdAccounts.mockResolvedValue({
        success: false,
        error: "Invalid OAuth access token.",
      });

      const req = { user: { companyId: "company-1" } };
      const res = createResponseMock();

      await facebookAdsController.getAdsConnectionStatus(req, res);

      expect(res.payload.remoteSources[0]).toEqual(
        expect.objectContaining({
          sourceId: "source-1",
          checked: true,
          ok: false,
          accountsCount: 0,
        }),
      );
    });

    test("requires a company id", async () => {
      const req = { user: {} };
      const res = createResponseMock();

      await facebookAdsController.getAdsConnectionStatus(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.payload.success).toBe(false);
    });
  });

  describe("disconnectAdsConnectionSource", () => {
    test("disconnects a source and clears its ad account links", async () => {
      mockPrisma.facebookAdsConnectionSource.findFirst.mockResolvedValue({
        id: "source-1",
        companyId: "company-1",
        status: "connected",
      });
      mockPrisma.facebookAdAccount.updateMany.mockResolvedValue({ count: 2 });
      mockPrisma.facebookAdsConnectionSource.update.mockResolvedValue({
        id: "source-1",
        status: "disconnected",
      });

      const req = {
        user: { companyId: "company-1" },
        params: { sourceId: "source-1" },
      };
      const res = createResponseMock();

      await facebookAdsController.disconnectAdsConnectionSource(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.payload.success).toBe(true);
      expect(mockPrisma.facebookAdAccount.updateMany).toHaveBeenCalledWith({
        where: { companyId: "company-1", connectionSourceId: "source-1" },
        data: { connectionSourceId: null, isActive: false },
      });
      expect(mockPrisma.facebookAdsConnectionSource.update).toHaveBeenCalledWith({
        where: { id: "source-1" },
        data: expect.objectContaining({
          status: "disconnected",
          accessToken: null,
        }),
      });
    });

    test("404 when the source does not belong to the company", async () => {
      mockPrisma.facebookAdsConnectionSource.findFirst.mockResolvedValue(null);

      const req = {
        user: { companyId: "company-1" },
        params: { sourceId: "missing" },
      };
      const res = createResponseMock();

      await facebookAdsController.disconnectAdsConnectionSource(req, res);

      expect(res.statusCode).toBe(404);
      expect(res.payload.success).toBe(false);
    });
  });
});
