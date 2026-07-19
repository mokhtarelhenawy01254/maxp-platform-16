const mockGetAdAccounts = jest.fn();
const mockCreateAsyncReport = jest.fn();
const constructedServices = [];

jest.mock("../../services/facebookAdsService", () =>
  jest.fn().mockImplementation((token, adAccountId) => {
    constructedServices.push({ token, adAccountId });
    return {
      getAdAccounts: mockGetAdAccounts,
      createAsyncReport: mockCreateAsyncReport,
    };
  }),
);

const mockPrisma = {
  company: {
    findUnique: jest.fn(),
  },
  facebookAdAccount: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
  facebookAdset: {
    findFirst: jest.fn(),
  },
  facebookAd: {
    findMany: jest.fn(),
  },
  facebookCampaign: {
    findFirst: jest.fn(),
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

describe("facebookAdsController Ad Account context", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    constructedServices.length = 0;
    mockPrisma.company.findUnique.mockResolvedValue({
      facebookAdsAccessToken: "ads-token",
      facebookUserAccessToken: null,
    });
  });

  test("returns billing health without exposing funding source details", async () => {
    mockGetAdAccounts.mockResolvedValue({
      success: true,
      data: [
        {
          id: "act_1120545302307751",
          account_id: "1120545302307751",
          name: "swan",
          currency: "EGP",
          account_status: 1,
          amount_spent: "27640466",
          balance: "0",
          spend_cap: "50000000",
          funding_source: "123456789",
          funding_source_details: {
            id: "123456789",
            type: "CREDIT_CARD",
            display_string: "Visa ending in 4242",
          },
          business: {
            id: "1812162589296555",
            name: "Swan Business",
          },
        },
      ],
    });
    mockPrisma.facebookAdAccount.findMany.mockResolvedValue([
      {
        accountId: "1120545302307751",
        isActive: true,
      },
    ]);

    const req = { user: { companyId: "company-1" } };
    const res = createResponseMock();

    await facebookAdsController.getAdAccounts(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(res.payload.data[0]).toEqual(
      expect.objectContaining({
        account_id: "1120545302307751",
        isActive: true,
        business: {
          id: "1812162589296555",
          name: "Swan Business",
        },
        billingHealth: expect.objectContaining({
          accountStatusLabel: "نشط",
          hasFundingSource: true,
          amountSpent: 276404.66,
          spendCap: 500000,
        }),
      }),
    );
    expect(res.payload.data[0]).not.toHaveProperty("funding_source");
    expect(res.payload.data[0]).not.toHaveProperty("funding_source_details");
  });

  test("falls back to saved ad accounts when Meta returns no accounts", async () => {
    mockGetAdAccounts.mockResolvedValue({
      success: true,
      data: [],
    });
    mockPrisma.facebookAdAccount.findMany.mockResolvedValue([
      {
        id: "local-swan",
        accountId: "1120545302307751",
        name: "swan",
        currency: "EGP",
        timezone: "Africa/Cairo",
        isActive: true,
      },
    ]);

    const req = { user: { companyId: "company-1" } };
    const res = createResponseMock();

    await facebookAdsController.getAdAccounts(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(res.payload.data).toHaveLength(1);
    expect(res.payload.data[0]).toEqual(
      expect.objectContaining({
        id: "act_1120545302307751",
        account_id: "1120545302307751",
        name: "swan",
        isSaved: true,
        isActive: true,
        source: "local",
        billingHealth: expect.objectContaining({
          currency: "EGP",
          warnings: expect.arrayContaining([
            expect.objectContaining({
              code: "REMOTE_ACCOUNT_NOT_RETURNED",
            }),
          ]),
        }),
      }),
    );
  });

  test("creates async reports on the requested ad account instead of the silent active fallback", async () => {
    mockPrisma.facebookAdAccount.findFirst.mockResolvedValue({
      id: "local-swan",
      accountId: "1120545302307751",
      isActive: true,
    });
    mockCreateAsyncReport.mockResolvedValue({
      success: true,
      reportRunId: "report-run-1",
    });

    const req = {
      user: { companyId: "company-1" },
      query: {},
      body: {
        adAccountId: "1120545302307751",
        level: "campaign",
        fields: ["spend"],
      },
    };
    const res = createResponseMock();

    await facebookAdsController.createAsyncReport(req, res);

    expect(res.statusCode).toBe(200);
    expect(mockPrisma.facebookAdAccount.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: "company-1",
          OR: expect.arrayContaining([
            { accountId: "1120545302307751" },
            { accountId: "act_1120545302307751" },
          ]),
        }),
      }),
    );
    expect(constructedServices[0]).toEqual({
      token: "ads-token",
      adAccountId: "1120545302307751",
    });
    expect(mockCreateAsyncReport).toHaveBeenCalledWith(
      expect.objectContaining({
        adAccountId: "1120545302307751",
        level: "campaign",
      }),
    );
    expect(res.payload.data.reportRunId).toBe("report-run-1");
  });

  test("returns ads with the correct Prisma insight relation", async () => {
    mockPrisma.facebookAdset.findFirst.mockResolvedValue({
      id: "adset-1",
      facebookCampaign: {
        companyId: "company-1",
      },
    });
    mockPrisma.facebookAd.findMany.mockResolvedValue([
      {
        id: "ad-1",
        name: "Chunky Sneaker Creative",
        facebookAdInsights: [],
      },
    ]);

    const req = {
      user: { companyId: "company-1" },
      params: { adSetId: "adset-1" },
    };
    const res = createResponseMock();

    await facebookAdsController.getAds(req, res);

    expect(res.statusCode).toBe(200);
    expect(mockPrisma.facebookAd.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { adSetId: "adset-1" },
        include: {
          facebookAdInsights: {
            take: 7,
            orderBy: { date: "desc" },
          },
        },
      }),
    );
    expect(res.payload.data).toHaveLength(1);
  });

  test("returns campaign details without requiring report date range variables", async () => {
    const campaign = {
      id: "campaign-1",
      companyId: "company-1",
      name: "Swan synced campaign",
      objective: "OUTCOME_SALES",
      status: "ACTIVE",
      budgetType: "DAILY",
      budgetAmount: 100,
      settings: JSON.stringify({
        meta: {
          accountId: "1120545302307751",
          effectiveStatus: "ACTIVE",
        },
      }),
      facebookAdsets: [
        {
          id: "adset-1",
          facebookAds: [
            {
              id: "ad-1",
              facebookAdInsights: [],
            },
          ],
        },
      ],
      facebookAdAccount: {
        accountId: "1120545302307751",
        name: "swan",
      },
    };
    mockPrisma.facebookCampaign.findFirst.mockResolvedValue(campaign);

    const req = {
      user: { companyId: "company-1" },
      params: { id: "campaign-1" },
    };
    const res = createResponseMock();

    await facebookAdsController.getCampaign(req, res);

    expect(res.statusCode).toBe(200);
    expect(mockPrisma.facebookCampaign.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          facebookAdsets: expect.objectContaining({
            include: expect.objectContaining({
              facebookAds: {
                include: {
                  facebookAdInsights: {
                    take: 30,
                    orderBy: { date: "desc" },
                  },
                },
              },
            }),
          }),
        }),
      }),
    );
    expect(res.payload.data.metaAccountId).toBe("1120545302307751");
  });
});
