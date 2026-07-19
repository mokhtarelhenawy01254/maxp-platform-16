const {
  buildFacebookTokenUpdateData,
} = require("../../utils/facebookOAuthTokenFields");

describe("facebookOAuthTokenFields", () => {
  test("keeps pixel OAuth tokens out of the page OAuth session", () => {
    expect(buildFacebookTokenUpdateData("pixel-token", "pixel")).toEqual({
      facebookPixelAccessToken: "pixel-token",
      facebookAdsAccessToken: "pixel-token",
    });
  });

  test("stores page OAuth tokens only in the page OAuth session", () => {
    expect(buildFacebookTokenUpdateData("page-token", "page")).toEqual({
      facebookUserAccessToken: "page-token",
    });
  });

  test("stores ads-only OAuth tokens away from the page OAuth session", () => {
    expect(buildFacebookTokenUpdateData("ads-token", "ads")).toEqual({
      facebookAdsAccessToken: "ads-token",
    });
  });
});
