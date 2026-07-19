const {
  buildFacebookPixelTokenCandidates,
} = require("../../utils/facebookPixelTokenCandidates");

describe("facebookPixelTokenCandidates", () => {
  test("prefers the dedicated pixel OAuth token for CAPI setup", () => {
    expect(
      buildFacebookPixelTokenCandidates({
        facebookPixelAccessToken: " pixel-token ",
        facebookAdsAccessToken: "ads-token",
      }),
    ).toEqual([
      { source: "facebookPixelAccessToken", token: "pixel-token" },
      { source: "facebookAdsAccessToken", token: "ads-token" },
    ]);
  });

  test("falls back to the ads token without using page or messenger tokens", () => {
    expect(
      buildFacebookPixelTokenCandidates({
        facebookAdsAccessToken: "ads-token",
        facebookUserAccessToken: "page-session-token",
        pageAccessToken: "page-token",
      }),
    ).toEqual([{ source: "facebookAdsAccessToken", token: "ads-token" }]);
  });

  test("deduplicates matching pixel and ads tokens", () => {
    expect(
      buildFacebookPixelTokenCandidates({
        facebookPixelAccessToken: "shared-token",
        facebookAdsAccessToken: "shared-token",
      }),
    ).toEqual([
      { source: "facebookPixelAccessToken", token: "shared-token" },
    ]);
  });
});
