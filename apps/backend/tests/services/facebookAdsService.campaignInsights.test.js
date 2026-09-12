const axios = require("axios");

jest.mock("axios");
jest.mock("../../services/sharedDatabase", () => ({
  getSharedPrismaClient: jest.fn(),
}));

const FacebookAdsService = require("../../services/facebookAdsService");

describe("FacebookAdsService.getCampaignInsightsSummary", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("requests campaign-level insights from the act account id", async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        data: [
          {
            campaign_id: "campaign-1",
            spend: "25.00",
          },
        ],
        paging: { cursors: { after: "next" } },
      },
    });

    const service = new FacebookAdsService("token", "1120545302307751");
    const result = await service.getCampaignInsightsSummary(null, {
      since: "2026-04-01",
      until: "2026-04-30",
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual([
      expect.objectContaining({ campaign_id: "campaign-1" }),
    ]);
    expect(axios.get).toHaveBeenCalledWith(
      "https://graph.facebook.com/v26.0/act_1120545302307751/insights",
      expect.objectContaining({
        params: expect.objectContaining({
          access_token: "token",
          level: "campaign",
          time_range: JSON.stringify({
            since: "2026-04-01",
            until: "2026-04-30",
          }),
        }),
      }),
    );
  });

  test("follows Meta pagination for campaign insights", async () => {
    axios.get
      .mockResolvedValueOnce({
        data: {
          data: [{ campaign_id: "campaign-1", spend: "25.00" }],
          paging: { next: "https://graph.facebook.com/v26.0/next-insights" },
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: [{ campaign_id: "campaign-2", spend: "30.00" }],
        },
      });

    const service = new FacebookAdsService("token", "1120545302307751");
    const result = await service.getCampaignInsightsSummary();

    expect(result.success).toBe(true);
    expect(result.data).toEqual([
      expect.objectContaining({ campaign_id: "campaign-1" }),
      expect.objectContaining({ campaign_id: "campaign-2" }),
    ]);
    expect(axios.get).toHaveBeenNthCalledWith(
      2,
      "https://graph.facebook.com/v26.0/next-insights",
      expect.objectContaining({ params: undefined }),
    );
  });
});

describe("FacebookAdsService.getGeoPerformanceBreakdown", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("requests account-scoped regional campaign insights", async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        data: [
          {
            campaign_id: "campaign-1",
            region: "Cairo Governorate",
            spend: "125.00",
          },
        ],
      },
    });

    const service = new FacebookAdsService("token", "1120545302307751");
    const result = await service.getGeoPerformanceBreakdown(null, {
      since: "2026-04-01",
      until: "2026-04-30",
    });

    expect(result.success).toBe(true);
    expect(result.breakdown).toBe("region");
    expect(axios.get).toHaveBeenCalledWith(
      "https://graph.facebook.com/v26.0/act_1120545302307751/insights",
      expect.objectContaining({
        params: expect.objectContaining({
          access_token: "token",
          level: "campaign",
          breakdowns: "region",
          time_range: JSON.stringify({
            since: "2026-04-01",
            until: "2026-04-30",
          }),
        }),
      }),
    );
    expect(axios.get.mock.calls[0][1].params.fields).toContain(
      "cost_per_action_type",
    );
  });

  test("normalizes unsupported geo breakdowns to region", async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        data: [],
      },
    });

    const service = new FacebookAdsService("token", "act_1120545302307751");
    const result = await service.getGeoPerformanceBreakdown(
      "1120545302307751",
      null,
      "city",
    );

    expect(result.success).toBe(true);
    expect(result.breakdown).toBe("region");
    expect(axios.get.mock.calls[0][1].params).toEqual(
      expect.objectContaining({
        breakdowns: "region",
        date_preset: "last_30d",
      }),
    );
  });
});

describe("FacebookAdsService.getCampaigns", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("normalizes bare ad account ids before reading campaigns", async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        data: [{ id: "campaign-1", name: "Swan campaign" }],
      },
    });

    const service = new FacebookAdsService("token");
    const result = await service.getCampaigns("1120545302307751");

    expect(result.success).toBe(true);
    expect(axios.get).toHaveBeenCalledWith(
      "https://graph.facebook.com/v26.0/act_1120545302307751/campaigns",
      expect.objectContaining({
        params: expect.objectContaining({
          access_token: "token",
          fields:
            "id,name,objective,account_id,status,configured_status,effective_status",
          limit: 100,
        }),
      }),
    );
  });

  test("follows Meta pagination when syncing campaigns", async () => {
    axios.get
      .mockResolvedValueOnce({
        data: {
          data: [{ id: "campaign-1", name: "Swan campaign 1" }],
          paging: { next: "https://graph.facebook.com/v26.0/next-campaigns" },
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: [{ id: "campaign-2", name: "Swan campaign 2" }],
        },
      });

    const service = new FacebookAdsService("token");
    const result = await service.getCampaigns("1120545302307751");

    expect(result.success).toBe(true);
    expect(result.data).toEqual([
      expect.objectContaining({ id: "campaign-1" }),
      expect.objectContaining({ id: "campaign-2" }),
    ]);
    expect(axios.get).toHaveBeenNthCalledWith(
      2,
      "https://graph.facebook.com/v26.0/next-campaigns",
      { params: undefined },
    );
  });
});

describe("FacebookAdsService.getAds", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("uses lightweight ad fields for account structure sync", async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        data: [{ id: "ad-1", name: "Swan ad" }],
      },
    });

    const service = new FacebookAdsService("token");
    const result = await service.getAds("1120545302307751");

    expect(result.success).toBe(true);
    expect(axios.get).toHaveBeenCalledWith(
      "https://graph.facebook.com/v26.0/act_1120545302307751/ads",
      expect.objectContaining({
        params: expect.objectContaining({
          access_token: "token",
          fields:
            "id,name,campaign{id,name},adset{id,name},status,configured_status,effective_status,created_time,updated_time",
          limit: 100,
        }),
      }),
    );
  });
});
