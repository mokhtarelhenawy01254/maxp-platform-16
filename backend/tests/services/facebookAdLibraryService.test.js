const axios = require("axios");

jest.mock("axios");

const {
  FacebookAdLibraryService,
} = require("../../services/facebookAdLibraryService");

describe("FacebookAdLibraryService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("searches Meta Ads Archive on Graph API v25 with safe filters", async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        data: [
          {
            id: "archive-ad-1",
            page_name: "Swan",
            ad_snapshot_url: "https://www.facebook.com/ads/archive/render_ad/",
          },
        ],
        paging: { cursors: { after: "cursor" } },
      },
    });

    const service = new FacebookAdLibraryService("token");
    const result = await service.search({
      searchTerms: "boots",
      countries: "eg,sa",
      adActiveStatus: "ALL",
      adType: "ALL",
      mediaType: "VIDEO",
      publisherPlatforms: "facebook,instagram,unknown",
      limit: 250,
      fields: "id,page_name,ad_snapshot_url,not_a_real_field",
    });

    expect(result.success).toBe(true);
    expect(result.apiVersion).toBe("v25.0");
    expect(result.data).toHaveLength(1);
    expect(axios.get).toHaveBeenCalledWith(
      "https://graph.facebook.com/v25.0/ads_archive",
      {
        params: expect.objectContaining({
          access_token: "token",
          search_terms: "boots",
          ad_reached_countries: JSON.stringify(["EG", "SA"]),
          ad_active_status: "ALL",
          ad_type: "ALL",
          media_type: "VIDEO",
          publisher_platforms: JSON.stringify(["FACEBOOK", "INSTAGRAM"]),
          fields: "id,page_name,ad_snapshot_url",
          limit: 100,
        }),
      },
    );
  });

  test("supports page id searches and requires a query", () => {
    const service = new FacebookAdLibraryService("token");

    expect(
      service.buildSearchParams({
        pageIds: "123,456,789",
        countries: ["US"],
      }),
    ).toEqual(
      expect.objectContaining({
        search_page_ids: JSON.stringify(["123", "456", "789"]),
        ad_reached_countries: JSON.stringify(["US"]),
      }),
    );

    expect(() => service.buildSearchParams({ countries: "EG" })).toThrow(
      "searchTerms or up to 10 pageIds are required",
    );
  });
});
