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
      facebookPage: {
        update: jest.fn().mockResolvedValue({}),
      },
    };

    getSharedPrismaClient.mockReturnValue(mockPrisma);

    axios.get.mockImplementation((url, config = {}) => {
      if (
        url === "https://graph.facebook.com/v18.0/me" &&
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

      if (url.startsWith("https://graph.facebook.com/v18.0/me/accounts")) {
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
        url === "https://graph.facebook.com/v18.0/me" &&
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
});
