jest.mock("axios");
jest.mock("../../services/sharedDatabase", () => ({
  getSharedPrismaClient: jest.fn(),
}));

const axios = require("axios");
const { getSharedPrismaClient } = require("../../services/sharedDatabase");
const {
  buildFacebookPageTokenFailureMessage,
  ensureValidFacebookPageAccessToken,
  validateFacebookPageAccessToken,
} = require("../../utils/facebookPageTokenUtils");

describe("facebookPageTokenUtils", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("validates a real Facebook page access token against the expected page", async () => {
    axios.get.mockResolvedValue({
      data: {
        id: "page-123",
        name: "Test Page",
        category: "Shopping",
      },
    });

    const result = await validateFacebookPageAccessToken({
      pageId: "page-123",
      pageAccessToken: "page-token",
    });

    expect(result).toEqual({
      isValid: true,
      page: {
        id: "page-123",
        name: "Test Page",
        category: "Shopping",
      },
    });
  });

  test("rejects tokens that belong to a different page", async () => {
    axios.get.mockResolvedValue({
      data: {
        id: "page-999",
        name: "Different Page",
        category: "Shopping",
      },
    });

    const result = await validateFacebookPageAccessToken({
      pageId: "page-123",
      pageAccessToken: "page-token",
    });

    expect(result.isValid).toBe(false);
    expect(result.reason).toBe("PAGE_TOKEN_MISMATCH");
    expect(buildFacebookPageTokenFailureMessage(result, "page-123")).toContain(
      "different page",
    );
  });

  test("refreshes a stale token from the stored company OAuth session", async () => {
    const mockPrisma = {
      company: {
        findUnique: jest.fn().mockResolvedValue({
          facebookUserAccessToken: "company-user-token",
        }),
      },
      facebookAccountConnection: {
        findFirst: jest.fn(),
      },
      facebookPage: {
        findUnique: jest.fn().mockResolvedValue({
          companyId: "company-1",
          facebookAccountId: null,
        }),
        update: jest.fn().mockResolvedValue({}),
      },
    };

    getSharedPrismaClient.mockReturnValue(mockPrisma);

    const { getMetaGraphApiVersion } = require("../../config/metaApi");
    const apiVer = getMetaGraphApiVersion();

    axios.get.mockImplementation((url, config = {}) => {
      if (
        url === `https://graph.facebook.com/${apiVer}/me` &&
        config.params?.access_token === "stale-page-token"
      ) {
        return Promise.reject({
          response: {
            data: {
              error: {
                code: 190,
                message:
                  "Any of the pages_read_engagement permission(s) must be granted before impersonating a user's page.",
              },
            },
          },
        });
      }

      if (url.startsWith(`https://graph.facebook.com/${apiVer}/me/accounts`)) {
        return Promise.resolve({
          data: {
            data: [
              {
                id: "page-123",
                name: "Recovered Page",
                access_token: "fresh-page-token",
              },
            ],
          },
        });
      }

      if (
        url === `https://graph.facebook.com/${apiVer}/me` &&
        config.params?.access_token === "fresh-page-token"
      ) {
        return Promise.resolve({
          data: {
            id: "page-123",
            name: "Recovered Page",
            category: "Shopping",
          },
        });
      }

      throw new Error(`Unexpected axios.get call: ${url}`);
    });

    const result = await ensureValidFacebookPageAccessToken({
      companyId: "company-1",
      pageId: "page-123",
      pageAccessToken: "stale-page-token",
      allowRefresh: true,
    });

    expect(result.ok).toBe(true);
    expect(result.source).toBe("refreshed");
    expect(result.pageAccessToken).toBe("fresh-page-token");
    expect(mockPrisma.facebookPage.update).toHaveBeenCalledWith({
      where: { pageId: "page-123" },
      data: {
        pageAccessToken: "fresh-page-token",
        pageName: "Recovered Page",
        status: "connected",
        disconnectedAt: null,
      },
    });
  });

  test("refreshes a stale token from the page's own account connection", async () => {
    const mockPrisma = {
      company: {
        findUnique: jest.fn().mockResolvedValue({
          facebookUserAccessToken: "other-company-user-token",
        }),
      },
      facebookAccountConnection: {
        findFirst: jest.fn().mockResolvedValue({
          accessToken: "account-b-user-token",
          status: "connected",
        }),
      },
      facebookPage: {
        findUnique: jest.fn().mockResolvedValue({
          companyId: "company-1",
          facebookAccountId: "acct-2",
        }),
        update: jest.fn().mockResolvedValue({}),
      },
    };

    getSharedPrismaClient.mockReturnValue(mockPrisma);

    const { getMetaGraphApiVersion } = require("../../config/metaApi");
    const apiVer = getMetaGraphApiVersion();

    axios.get.mockImplementation((url, config = {}) => {
      if (
        url === `https://graph.facebook.com/${apiVer}/me` &&
        config.params?.access_token === "stale-page-token"
      ) {
        return Promise.reject({
          response: {
            data: {
              error: {
                code: 190,
                message:
                  "Any of the pages_read_engagement permission(s) must be granted before impersonating a user's page.",
              },
            },
          },
        });
      }

      if (
        url.startsWith(`https://graph.facebook.com/${apiVer}/me/accounts`) &&
        url.includes("access_token=account-b-user-token")
      ) {
        return Promise.resolve({
          data: {
            data: [
              {
                id: "page-123",
                name: "Account B Page",
                access_token: "account-b-fresh-page-token",
              },
            ],
          },
        });
      }

      if (
        url === `https://graph.facebook.com/${apiVer}/me` &&
        config.params?.access_token === "account-b-fresh-page-token"
      ) {
        return Promise.resolve({
          data: {
            id: "page-123",
            name: "Account B Page",
            category: "Shopping",
          },
        });
      }

      throw new Error(`Unexpected axios.get call: ${url}`);
    });

    const result = await ensureValidFacebookPageAccessToken({
      companyId: "company-1",
      pageId: "page-123",
      pageAccessToken: "stale-page-token",
      allowRefresh: true,
    });

    expect(result.ok).toBe(true);
    expect(result.source).toBe("refreshed");
    expect(result.pageAccessToken).toBe("account-b-fresh-page-token");
    expect(
      mockPrisma.facebookAccountConnection.findFirst,
    ).toHaveBeenCalledWith({
      where: { id: "acct-2", companyId: "company-1" },
      select: { accessToken: true, status: true },
    });
  });

  test("fails refresh when the page has no matching account connection token", async () => {
    const mockPrisma = {
      company: {
        findUnique: jest.fn().mockResolvedValue({
          facebookUserAccessToken: null,
        }),
      },
      facebookAccountConnection: {
        findFirst: jest.fn().mockResolvedValue({
          accessToken: null,
          status: "disconnected",
        }),
      },
      facebookPage: {
        findUnique: jest.fn().mockResolvedValue({
          companyId: "company-1",
          facebookAccountId: "acct-3",
        }),
        update: jest.fn().mockResolvedValue({}),
      },
    };

    getSharedPrismaClient.mockReturnValue(mockPrisma);

    const result = await ensureValidFacebookPageAccessToken({
      companyId: "company-1",
      pageId: "page-123",
      pageAccessToken: "stale-page-token",
      allowRefresh: true,
    });

    expect(result.ok).toBe(false);
    expect(result.refreshAttempted).toBe(true);
    expect(result.refresh.reason).toBe("MISSING_COMPANY_USER_ACCESS_TOKEN");
    expect(mockPrisma.facebookPage.update).not.toHaveBeenCalled();
  });
});
