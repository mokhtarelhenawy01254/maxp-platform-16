const fs = require("fs");

describe("facebookAppConfig", () => {
  let facebookAppConfig;

  beforeEach(() => {
    jest.resetModules();
    jest.spyOn(fs, "existsSync").mockReturnValue(false);
    facebookAppConfig = require("../../config/facebookAppConfig");
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("ignores placeholder environment app credentials", () => {
    const config = facebookAppConfig.getFacebookOAuthConfig({
      FACEBOOK_APP_ID: "your-production-facebook-app-id",
      FACEBOOK_APP_SECRET: "your-production-facebook-app-secret",
    });

    expect(config.appId).toBe(facebookAppConfig.DEFAULT_FACEBOOK_APP_ID);
    expect(config.appSecret).toBeTruthy();
    expect(config.appSecret).not.toBe("your-production-facebook-app-secret");
  });

  it("uses real environment app credentials when configured", () => {
    const config = facebookAppConfig.getFacebookOAuthConfig({
      FACEBOOK_APP_ID: "1234567890",
      FACEBOOK_APP_SECRET: "real-secret",
    });

    expect(config.appId).toBe("1234567890");
    expect(config.appSecret).toBe("real-secret");
  });

  it("detects common placeholder credential values", () => {
    expect(
      facebookAppConfig.isPlaceholderFacebookCredential(
        "your-facebook-app-id",
      ),
    ).toBe(true);
    expect(
      facebookAppConfig.isPlaceholderFacebookCredential("configured"),
    ).toBe(true);
    expect(
      facebookAppConfig.isPlaceholderFacebookCredential("1234567890"),
    ).toBe(false);
  });
});
