const axios = require("axios");

jest.mock("axios");
jest.mock("dns", () => ({
  promises: {
    lookup: jest.fn(),
  },
}));

const dns = require("dns").promises;

const FacebookAdsService = require("../../services/facebookAdsService");

describe("FacebookAdsService creative creation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    dns.lookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
  });

  test("creates non-CBO campaigns against act-prefixed ad account paths", async () => {
    axios.post.mockResolvedValue({ data: { id: "campaign-1" } });
    const service = new FacebookAdsService("token", "123456789");

    const result = await service.createCampaign({
      name: "Swan campaign",
      objective: "OUTCOME_SALES",
      status: "PAUSED",
    });

    expect(result.success).toBe(true);
    expect(result.campaignId).toBe("campaign-1");
    expect(axios.post).toHaveBeenCalledWith(
      "https://graph.facebook.com/v26.0/act_123456789/campaigns",
      expect.objectContaining({
        name: "Swan campaign",
        objective: "OUTCOME_SALES",
        status: "PAUSED",
        is_adset_budget_sharing_enabled: false,
      }),
      expect.any(Object),
    );
    expect(axios.post.mock.calls[0][1]).not.toHaveProperty("bid_strategy");
  });

  test("marks campaign write timeouts as uncertain instead of safe retry failures", async () => {
    axios.post.mockRejectedValue({
      code: "ECONNABORTED",
      message: "timeout of 30000ms exceeded",
      request: {},
    });
    const service = new FacebookAdsService("token", "123456789");

    const result = await service.createCampaign({
      name: "Swan uncertain campaign",
      objective: "OUTCOME_SALES",
      status: "PAUSED",
    });

    expect(result.success).toBe(false);
    expect(result.metaWriteUncertain).toBe(true);
  });

  test("keeps bid strategy on campaign payload only when CBO is enabled", async () => {
    axios.post.mockResolvedValue({ data: { id: "campaign-1" } });
    const service = new FacebookAdsService("token", "123456789");

    const result = await service.createCampaign({
      name: "Swan CBO campaign",
      objective: "OUTCOME_SALES",
      status: "PAUSED",
      budgetOptimization: true,
      budgetType: "DAILY",
      budgetAmount: 200,
      bidStrategy: "LOWEST_COST",
    });

    expect(result.success).toBe(true);
    expect(axios.post.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        is_campaign_budget_optimization_on: true,
        daily_budget: 20000,
        bid_strategy: "LOWEST_COST_WITHOUT_CAP",
      }),
    );
  });

  test("accepts Meta literal lowest-cost bid strategy aliases", async () => {
    axios.post.mockResolvedValue({ data: { id: "campaign-1" } });
    const service = new FacebookAdsService("token", "123456789");

    const result = await service.createCampaign({
      name: "Swan CBO alias campaign",
      objective: "OUTCOME_TRAFFIC",
      status: "PAUSED",
      budgetOptimization: true,
      budgetType: "DAILY",
      budgetAmount: 200,
      bidStrategy: "LOWEST_COST_WITHOUT_CAP",
    });

    expect(result.success).toBe(true);
    expect(axios.post.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        bid_strategy: "LOWEST_COST_WITHOUT_CAP",
      }),
    );
  });

  test("keeps automatic placements out while sending the required Advantage Audience flag", async () => {
    axios.post.mockResolvedValue({ data: { id: "adset-1" } });
    const service = new FacebookAdsService("token", "123456789");

    const result = await service.createAdSet("campaign-1", {
      name: "Swan ad set",
      status: "PAUSED",
      targeting: {
        locations: ["EG"],
        advantageAudience: false,
      },
      placementType: "AUTOMATIC",
      conversionEvent: "PURCHASE",
      pixelId: "pixel-1",
      attributionWindow: "7d_click_1d_view",
    });

    expect(result.success).toBe(true);
    const payload = axios.post.mock.calls[0][1];
    expect(payload.targeting.targeting_automation).toEqual({
      advantage_audience: 0,
    });
    expect(JSON.stringify(payload)).not.toContain("advantage_placement");
  });

  test("sends active wizard targeting signals and v25-safe link-click attribution", async () => {
    axios.post.mockResolvedValue({ data: { id: "adset-1" } });
    const service = new FacebookAdsService("token", "123456789");

    const result = await service.createAdSet("campaign-1", {
      name: "Swan traffic ad set",
      status: "PAUSED",
      targeting: {
        locations: ["EG"],
        interests: [{ id: "6003139266461", name: "Shoes" }],
        customAudiences: ["238custom"],
        lookalikeAudiences: ["238lookalike"],
        excludedAudiences: ["238exclude"],
        locales: [6],
        devices: { platforms: ["iOS"] },
        relationshipStatuses: [4],
        education: { statuses: [3] },
        advantageAudience: false,
      },
      optimizationGoal: "LINK_CLICKS",
      attributionWindow: "7d_click_1d_view",
      bidStrategy: "LOWEST_COST_WITHOUT_CAP",
    });

    expect(result.success).toBe(true);
    const payload = axios.post.mock.calls[0][1];
    expect(payload.attribution_spec).toEqual([
      { event_type: "CLICK_THROUGH", window_days: 1 },
    ]);
    expect(payload.targeting).toEqual(
      expect.objectContaining({
        interests: [{ id: "6003139266461", name: "Shoes" }],
        custom_audiences: [{ id: "238custom" }, { id: "238lookalike" }],
        excluded_custom_audiences: [{ id: "238exclude" }],
        locales: [6],
        user_os: ["iOS"],
        relationship_statuses: [4],
        education_statuses: [3],
      }),
    );
    expect(payload.bid_strategy).toBe("LOWEST_COST_WITHOUT_CAP");
  });

  test("keeps full traffic ads on link-click delivery even if a pixel was sent", async () => {
    axios.post
      .mockResolvedValueOnce({ data: { id: "campaign-1" } })
      .mockResolvedValueOnce({ data: { id: "adset-1" } })
      .mockResolvedValueOnce({ data: { id: "creative-1" } })
      .mockResolvedValueOnce({ data: { id: "ad-1" } });
    const service = new FacebookAdsService("token", "123456789");

    const result = await service.createFullAd({
      campaignName: "Swan traffic full ad",
      objective: "OUTCOME_TRAFFIC",
      status: "PAUSED",
      budgetOptimization: false,
      budgetType: "DAILY",
      budgetAmount: 200,
      bidStrategy: "LOWEST_COST_WITHOUT_CAP",
      optimizationGoal: "LINK_CLICKS",
      attributionWindow: "7d_click_1d_view",
      conversionEvent: "PURCHASE",
      pixelId: "pixel-1",
      targeting: { locations: ["EG"], advantageAudience: false },
      pageId: "page-1",
      creativeType: "SINGLE_IMAGE",
      primaryText: "Shop Swan",
      headline: "Swan",
      callToAction: "SHOP_NOW",
      linkUrl: "https://swan.example",
      imageHash: "hash-1",
    });

    expect(result.success).toBe(true);
    const adSetPayload = axios.post.mock.calls[1][1];
    expect(adSetPayload.optimization_goal).toBe("LINK_CLICKS");
    expect(adSetPayload.promoted_object).toBeUndefined();
    expect(adSetPayload.attribution_spec).toEqual([
      { event_type: "CLICK_THROUGH", window_days: 1 },
    ]);
  });

  test("targets Meta regions and cities without overlapping country targets", async () => {
    axios.post.mockResolvedValue({ data: { id: "adset-1" } });
    const service = new FacebookAdsService("token", "123456789");

    const result = await service.createAdSet("campaign-1", {
      name: "Swan Cairo ad set",
      status: "PAUSED",
      targeting: {
        locations: ["EG"],
        regions: [{ key: "1001", name: "محافظة القاهرة" }],
        cities: [
          {
            key: "658536",
            name: "القاهرة",
            radius: 15,
            distance_unit: "kilometer",
          },
        ],
        locationTypes: ["home"],
        advantageAudience: false,
      },
    });

    expect(result.success).toBe(true);
    const payload = axios.post.mock.calls[0][1];
    expect(payload.targeting.geo_locations).toEqual({
      regions: [{ key: "1001" }],
      cities: [
        {
          key: "658536",
          radius: 15,
          distance_unit: "kilometer",
        },
      ],
      location_types: ["home"],
    });
    expect(payload.targeting.geo_locations).not.toHaveProperty("countries");
  });

  test("passes reliable advanced targeting fields into created Ad Sets", async () => {
    axios.post.mockResolvedValue({ data: { id: "adset-1" } });
    const service = new FacebookAdsService("token", "123456789");

    const result = await service.createAdSet("campaign-1", {
      name: "Swan advanced ad set",
      status: "PAUSED",
      targeting: {
        locations: ["EG"],
        relationshipStatuses: [1, 2],
        locales: [24],
        devices: {
          platforms: ["iOS", "Android"],
        },
        customAudiences: ["aud-1"],
        excludedAudiences: ["aud-2"],
        advantageAudience: false,
      },
      conversionEvent: "PURCHASE",
      pixelId: "pixel-1",
    });

    expect(result.success).toBe(true);
    const payload = axios.post.mock.calls[0][1];
    expect(payload.targeting).toEqual(
      expect.objectContaining({
        relationship_statuses: [1, 2],
        locales: [24],
        user_os: ["iOS", "Android"],
        custom_audiences: [{ id: "aud-1" }],
        excluded_custom_audiences: [{ id: "aud-2" }],
      }),
    );
  });

  test("searches Meta geo locations with country and location type filters", async () => {
    axios.get.mockResolvedValue({
      data: {
        data: [{ key: "1001", name: "محافظة القاهرة", type: "region" }],
      },
    });
    const service = new FacebookAdsService("token", "123456789");

    const result = await service.searchTargetingOptions("Cairo", "adgeolocation", {
      countryCode: "EG",
      locationTypes: ["region", "city"],
      limit: 12,
    });

    expect(result.success).toBe(true);
    expect(axios.get).toHaveBeenCalledWith(
      "https://graph.facebook.com/v26.0/search",
      {
        params: expect.objectContaining({
          access_token: "token",
          type: "adgeolocation",
          q: "Cairo",
          country_code: "EG",
          location_types: JSON.stringify(["region", "city"]),
          limit: 12,
        }),
      },
    );
  });

  test("passes pageId through createAd into createCreative", async () => {
    const service = new FacebookAdsService("token", "123456789");
    jest.spyOn(service, "createCreative").mockResolvedValue({
      success: true,
      creativeId: "creative-1",
    });
    axios.post.mockResolvedValue({ data: { id: "ad-1" } });

    const result = await service.createAd("adset-1", {
      name: "Swan ad",
      pageId: "page-1",
      creativeType: "SINGLE_IMAGE",
      primaryText: "Primary",
      headline: "Headline",
      callToAction: "SHOP_NOW",
      imageHash: "hash-1",
      linkUrl: "https://swan.example/products/1",
    });

    expect(result.success).toBe(true);
    expect(service.createCreative).toHaveBeenCalledWith(
      expect.objectContaining({
        pageId: "page-1",
        creativeType: "SINGLE_IMAGE",
      }),
    );
    expect(axios.post).toHaveBeenCalledWith(
      "https://graph.facebook.com/v26.0/act_123456789/ads",
      expect.objectContaining({
        adset_id: "adset-1",
        creative: { creative_id: "creative-1" },
      }),
      expect.any(Object),
    );
  });

  test("updates ad status through the Meta ad node", async () => {
    axios.post.mockResolvedValue({ data: { success: true } });
    const service = new FacebookAdsService("token", "123456789");

    const result = await service.updateAd("120-meta-ad", {
      status: "PAUSED",
    });

    expect(result.success).toBe(true);
    expect(axios.post).toHaveBeenCalledWith(
      "https://graph.facebook.com/v26.0/120-meta-ad",
      { status: "PAUSED" },
      {
        params: {
          access_token: "token",
        },
      },
    );
  });

  test("reads creative previews from the creative preview edge", async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        data: [{ body: "<iframe>preview</iframe>" }],
      },
    });
    const service = new FacebookAdsService("token", "123456789");

    const result = await service.getCreativePreview(
      "creative-1",
      "DESKTOP_FEED_STANDARD",
    );

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(axios.get).toHaveBeenCalledWith(
      "https://graph.facebook.com/v26.0/creative-1/previews",
      {
        params: {
          access_token: "token",
          ad_format: "DESKTOP_FEED_STANDARD",
        },
      },
    );
  });

  test("falls back to generatepreviews with Meta's v25 creative parameter", async () => {
    axios.get
      .mockRejectedValueOnce({
        response: {
          data: {
            error: {
              message: "Preview edge unavailable",
            },
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: [{ body: "<iframe>fallback</iframe>" }],
        },
      });
    const service = new FacebookAdsService("token", "123456789");

    const result = await service.getCreativePreview(
      "creative-1",
      "INSTAGRAM_STANDARD",
    );

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(axios.get).toHaveBeenNthCalledWith(
      2,
      "https://graph.facebook.com/v26.0/act_123456789/generatepreviews",
      {
        params: {
          access_token: "token",
          creative: JSON.stringify({ creative_id: "creative-1" }),
          ad_format: "INSTAGRAM_STANDARD",
        },
      },
    );
  });

  test("sends Conversion API deduplication and Events Manager test fields", async () => {
    axios.post.mockResolvedValue({
      data: { events_received: 1, fbtrace_id: "trace-1" },
    });
    const service = new FacebookAdsService("token", "123456789");

    const result = await service.sendConversionEvent("pixel-1", {
      eventName: "Purchase",
      eventId: "purchase-dedupe-1",
      eventTime: 1778236800,
      testEventCode: "TEST123",
      eventSourceUrl: "https://swan.maxp.online/product/swan",
      userData: {
        email: "Buyer@Example.com",
        fbp: "fb.1.123.456",
      },
      customData: {
        value: 499,
        currency: "EGP",
      },
    });

    expect(result.success).toBe(true);
    expect(axios.post).toHaveBeenCalledWith(
      "https://graph.facebook.com/v26.0/pixel-1/events",
      {
        data: [
          expect.objectContaining({
            event_name: "Purchase",
            event_id: "purchase-dedupe-1",
            event_time: 1778236800,
            event_source_url: "https://swan.maxp.online/product/swan",
            user_data: expect.objectContaining({
              em: [expect.any(String)],
              fbp: "fb.1.123.456",
            }),
            custom_data: expect.objectContaining({
              value: 499,
              currency: "EGP",
            }),
          }),
        ],
        test_event_code: "TEST123",
      },
      {
        params: {
          access_token: "token",
        },
      },
    );
  });

  test("validates an existing ad with include_recommendations instead of reading a removed edge", async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        id: "120-meta-ad",
        name: "Swan ad",
        status: "PAUSED",
        adset_id: "120-meta-adset",
        creative: { id: "creative-1" },
      },
    });
    axios.post.mockResolvedValueOnce({
      data: {
        success: true,
        recommendations: [{ title: "Use broader audience" }],
      },
    });
    const service = new FacebookAdsService("token", "123456789");

    const result = await service.getAdRecommendations("120-meta-ad");

    expect(result.success).toBe(true);
    expect(result.recommendations).toHaveLength(1);
    expect(axios.get).toHaveBeenCalledWith(
      "https://graph.facebook.com/v26.0/120-meta-ad",
      {
        params: {
          access_token: "token",
          fields: "id,name,status,adset_id,creative{id}",
        },
      },
    );
    expect(axios.post).toHaveBeenCalledWith(
      "https://graph.facebook.com/v26.0/act_123456789/ads",
      expect.objectContaining({
        adset_id: "120-meta-adset",
        creative: { creative_id: "creative-1" },
        execution_options: ["validate_only", "include_recommendations"],
      }),
      {
        params: {
          access_token: "token",
        },
      },
    );
  });

  test("reads ad relevance diagnostics from insights", async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        data: [
          {
            ad_id: "120-meta-ad",
            impressions: "650",
            quality_ranking: "AVERAGE",
            engagement_rate_ranking: "ABOVE_AVERAGE",
            conversion_rate_ranking: "BELOW_AVERAGE",
          },
        ],
      },
    });
    const service = new FacebookAdsService("token", "123456789");

    const result = await service.getAdQualityMetrics("120-meta-ad");

    expect(result.success).toBe(true);
    expect(result.metrics).toEqual({
      qualityRanking: "AVERAGE",
      engagementRateRanking: "ABOVE_AVERAGE",
      conversionRateRanking: "BELOW_AVERAGE",
      impressions: 650,
    });
    expect(axios.get).toHaveBeenCalledWith(
      "https://graph.facebook.com/v26.0/120-meta-ad/insights",
      {
        params: {
          access_token: "token",
          fields:
            "ad_id,ad_name,impressions,quality_ranking,engagement_rate_ranking,conversion_rate_ranking",
          date_preset: "last_30d",
        },
      },
    );
  });

  test("builds carousel creatives with child attachments", async () => {
    axios.post.mockResolvedValue({ data: { id: "creative-carousel" } });
    const service = new FacebookAdsService("token", "123456789");

    const result = await service.createCreative({
      pageId: "page-1",
      creativeType: "CAROUSEL",
      primaryText: "Swan picks",
      headline: "Shop the drop",
      description: "New arrivals",
      callToAction: "SHOP_NOW",
      linkUrl: "https://swan.example",
      carouselCards: [
        {
          imageHash: "hash-1",
          headline: "Black boot",
          description: "Soft leather",
          linkUrl: "https://swan.example/products/black",
        },
        {
          imageHash: "hash-2",
          headline: "White boot",
          description: "Fresh drop",
          linkUrl: "https://swan.example/products/white",
        },
      ],
    });

    expect(result.success).toBe(true);
    const payload = axios.post.mock.calls[0][1];
    expect(payload.object_story_spec.page_id).toBe("page-1");
    expect(payload.object_story_spec.link_data.child_attachments).toHaveLength(
      2,
    );
    expect(payload.object_story_spec.link_data.child_attachments[0]).toEqual(
      expect.objectContaining({
        image_hash: "hash-1",
        name: "Black boot",
        link: "https://swan.example/products/black",
      }),
    );
  });

  test("uploads ad images as a Meta file field instead of raw bytes", async () => {
    axios.get.mockResolvedValue({
      data: Buffer.alloc(128, 1),
      headers: {
        "content-type": "image/jpeg",
      },
    });
    axios.post.mockResolvedValue({
      data: {
        images: {
          "ad-image.jpg": {
            hash: "image-hash-1",
          },
        },
      },
    });

    const service = new FacebookAdsService("token", "123456789");
    const result = await service.uploadImage("https://swan.example/image.jpg");

    expect(result.success).toBe(true);
    expect(result.hash).toBe("image-hash-1");
    expect(axios.get).toHaveBeenCalledWith(
      "https://swan.example/image.jpg",
      expect.objectContaining({
        responseType: "arraybuffer",
        maxRedirects: 0,
        httpsAgent: expect.any(Object),
        headers: expect.objectContaining({
          "User-Agent": "MaxP-FacebookAds/1.0",
        }),
      }),
    );

    const formData = axios.post.mock.calls[0][1];
    const streamHeaders = formData._streams
      .filter((entry) => typeof entry === "string")
      .join("\n");

    expect(streamHeaders).toContain('name="filename"');
    expect(streamHeaders).toContain('filename="ad-image.jpg"');
    expect(streamHeaders).not.toContain('name="bytes"');
  });

  test("rejects ad image redirects to private networks", async () => {
    axios.get.mockResolvedValueOnce({
      status: 302,
      headers: {
        location: "http://127.0.0.1/internal.jpg",
      },
    });

    const service = new FacebookAdsService("token", "123456789");
    const result = await service.uploadImage("https://swan.example/image.jpg");

    expect(result.success).toBe(false);
    expect(String(result.error)).toContain("Local image URLs are not allowed");
    expect(axios.post).not.toHaveBeenCalled();
  });

  test("rejects ad images when DNS resolves to IPv4-mapped localhost", async () => {
    dns.lookup.mockResolvedValueOnce([{ address: "::ffff:127.0.0.1", family: 6 }]);

    const service = new FacebookAdsService("token", "123456789");
    const result = await service.uploadImage("https://swan.example/image.jpg");

    expect(result.success).toBe(false);
    expect(String(result.error)).toContain(
      "Image URL resolved to a private or unavailable address",
    );
    expect(axios.get).not.toHaveBeenCalled();
    expect(axios.post).not.toHaveBeenCalled();
  });

  test("uploads in-memory ad images through the v25 service client", async () => {
    axios.post.mockResolvedValue({
      data: {
        images: {
          "upload.jpg": {
            hash: "buffer-hash-1",
          },
        },
      },
    });

    const service = new FacebookAdsService("token", "123456789");
    const result = await service.uploadImageBuffer(Buffer.alloc(128, 1), {
      filename: "upload.jpg",
      contentType: "image/jpeg",
    });

    expect(result.success).toBe(true);
    expect(result.hash).toBe("buffer-hash-1");
    expect(axios.post).toHaveBeenCalledWith(
      "https://graph.facebook.com/v26.0/act_123456789/adimages",
      expect.any(Object),
      expect.any(Object),
    );
  });
});
