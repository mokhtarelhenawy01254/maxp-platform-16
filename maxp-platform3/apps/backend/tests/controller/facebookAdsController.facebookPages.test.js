const mockGetFacebookPages = jest.fn();
const mockGetUserPermissions = jest.fn();
const constructedTokens = [];
const mockPrisma = {
  company: {
    findUnique: jest.fn(),
  },
  facebookPage: {
    findMany: jest.fn(),
  },
  facebookAdAccount: {
    findMany: jest.fn(),
  },
};

jest.mock("../../services/facebookAdsService", () =>
  jest.fn().mockImplementation((token) => {
    constructedTokens.push(token);
    return {
    getFacebookPages: mockGetFacebookPages,
    getUserPermissions: mockGetUserPermissions,
    };
  }),
);

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

describe("facebookAdsController.getFacebookPages", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    constructedTokens.length = 0;
  });

  test("merges Meta pages with company pages and exposes diagnostics", async () => {
    mockPrisma.company.findUnique.mockResolvedValue({
      id: "company-1",
      name: "Swan",
      facebookAdsAccessToken: "token-1",
      facebookUserAccessToken: null,
    });
    mockPrisma.facebookPage.findMany.mockResolvedValue([
      {
        pageId: "page-ready",
        pageName: "Swan Official",
        status: "connected",
      },
      {
        pageId: "page-missing",
        pageName: "Swan Legacy",
        status: "connected",
      },
    ]);
    mockGetFacebookPages.mockResolvedValue({
      success: true,
      data: [
        {
          id: "page-unlinked",
          name: "Triple M",
          category: "Education",
        },
        {
          id: "page-ready",
          name: "Swan Official",
          category: "Shopping",
          access_token: "remote-page-token",
        },
      ],
    });
    mockGetUserPermissions.mockResolvedValue({
      success: true,
      data: [
        { permission: "pages_show_list", status: "granted" },
        { permission: "ads_management", status: "granted" },
        { permission: "pages_read_engagement", status: "declined" },
      ],
    });

    const req = {
      user: {
        companyId: "company-1",
      },
    };
    const res = createResponseMock();

    await facebookAdsController.getFacebookPages(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(res.payload.data).toEqual([
      expect.objectContaining({
        id: "page-ready",
        status: "READY",
        isConnectedToCompany: true,
        isSelectable: true,
      }),
      expect.objectContaining({
        id: "page-unlinked",
        status: "ACCESSIBLE_BUT_NOT_CONNECTED",
        isConnectedToCompany: false,
        source: "page_token_only",
      }),
      expect.objectContaining({
        id: "page-missing",
        status: "CONNECTED_BUT_NOT_ACCESSIBLE",
        isAccessibleByAdsToken: false,
        isSelectable: false,
      }),
    ]);
    expect(res.payload.data[0]).not.toHaveProperty("access_token");
    expect(res.payload.meta).toEqual(
      expect.objectContaining({
        company: {
          id: "company-1",
          name: "Swan",
        },
        counts: {
          total: 3,
          ready: 1,
          accessibleButNotConnected: 1,
          connectedButNotAccessible: 1,
        },
        permissions: expect.objectContaining({
          granted: ["pages_show_list", "ads_management"],
        }),
        primaryWarning: null,
      }),
    );
    expect(res.payload.meta.permissions.missingRecommended).toEqual(
      expect.arrayContaining([
        "pages_read_engagement",
        "pages_manage_metadata",
        "business_management",
        "ads_read",
      ]),
    );
  });

  test("warns when the company has connected pages that are missing from the active Meta token", async () => {
    mockPrisma.company.findUnique.mockResolvedValue({
      id: "company-1",
      name: "Swan",
      facebookAdsAccessToken: "token-1",
      facebookUserAccessToken: null,
    });
    mockPrisma.facebookPage.findMany.mockResolvedValue([
      {
        pageId: "page-missing",
        pageName: "Swan Official",
        status: "connected",
      },
    ]);
    mockGetFacebookPages.mockResolvedValue({
      success: true,
      data: [],
    });
    mockGetUserPermissions.mockResolvedValue({
      success: true,
      data: [],
    });

    const req = {
      user: {
        companyId: "company-1",
      },
    };
    const res = createResponseMock();

    await facebookAdsController.getFacebookPages(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.meta.primaryWarning).toContain(
      "الصفحات المربوطة بهذه الشركة غير ظاهرة",
    );
    expect(res.payload.data[0]).toEqual(
      expect.objectContaining({
        id: "page-missing",
        status: "CONNECTED_BUT_NOT_ACCESSIBLE",
        isSelectable: false,
      }),
    );
  });

  test("prefers the company user token for page discovery when an ads-only token is also stored", async () => {
    mockPrisma.company.findUnique
      .mockResolvedValueOnce({
        facebookAdsAccessToken: "ads-only-token",
        facebookUserAccessToken: "page-user-token",
      })
      .mockResolvedValueOnce({
        id: "company-1",
        name: "Swan",
      });
    mockPrisma.facebookPage.findMany.mockResolvedValue([]);
    mockGetFacebookPages.mockResolvedValue({
      success: true,
      data: [],
    });
    mockGetUserPermissions.mockResolvedValue({
      success: true,
      data: [],
    });

    const req = {
      user: {
        companyId: "company-1",
      },
    };
    const res = createResponseMock();

    await facebookAdsController.getFacebookPages(req, res);

    expect(res.statusCode).toBe(200);
    expect(constructedTokens).toContain("page-user-token");
    expect(constructedTokens).not.toContain("ads-only-token");
  });
});

describe("facebookAdsController.getSavedAdAccounts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("does not expose stored Meta access tokens to clients", async () => {
    mockPrisma.facebookAdAccount.findMany.mockResolvedValue([
      {
        id: "saved-account-1",
        companyId: "company-1",
        accountId: "1120545302307751",
        name: "swan",
        currency: "EGP",
        timezone: "Africa/Cairo",
        accessToken: "stored-ads-token",
        isActive: true,
        createdAt: new Date("2026-05-01T00:00:00.000Z"),
        updatedAt: new Date("2026-05-01T00:00:00.000Z"),
      },
    ]);

    const req = {
      user: {
        companyId: "company-1",
      },
    };
    const res = createResponseMock();

    await facebookAdsController.getSavedAdAccounts(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(res.payload.data[0]).toEqual(
      expect.objectContaining({
        accountId: "1120545302307751",
        name: "swan",
        isActive: true,
      }),
    );
    expect(res.payload.data[0]).not.toHaveProperty("accessToken");
    expect(res.payload.data[0]).not.toHaveProperty("access_token");
  });
});
