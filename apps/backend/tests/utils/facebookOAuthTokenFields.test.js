const {
  buildFacebookTokenUpdateData,
} = require("../../utils/facebookOAuthTokenFields");

describe("facebookOAuthTokenFields", () => {
  test("keeps pixel OAuth tokens isolated from the ads token column", () => {
    expect(buildFacebookTokenUpdateData("pixel-token", "pixel")).toEqual({
      facebookPixelAccessToken: "pixel-token",
    });
  });

  test("stores page OAuth tokens only in the page OAuth session", () => {
    expect(buildFacebookTokenUpdateData("page-token", "page")).toEqual({
      facebookUserAccessToken: "page-token",
    });
  });

  test("defaults to the page OAuth session when type is missing", () => {
    expect(buildFacebookTokenUpdateData("page-token")).toEqual({
      facebookUserAccessToken: "page-token",
    });
  });

  test("stores ads-only OAuth tokens away from the page OAuth session", () => {
    expect(buildFacebookTokenUpdateData("ads-token", "ads")).toEqual({
      facebookAdsAccessToken: "ads-token",
    });
  });
});
