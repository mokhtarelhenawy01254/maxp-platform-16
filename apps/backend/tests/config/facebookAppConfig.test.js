const fs = require("fs");

describe("facebookAppConfig", () => {
  let facebookAppConfig;

  beforeEach(() => {
    jest.resetModules();
    facebookAppConfig = require("../../config/facebookAppConfig");
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns empty credentials when configuration file does not exist", () => {
    jest.spyOn(fs, "existsSync").mockReturnValue(false);

    const config = facebookAppConfig.getFacebookOAuthConfig();

    expect(config.appId).toBe("");
    expect(config.appSecret).toBe("");
  });

  it("uses real credentials from the configuration file when they are valid", () => {
    jest.spyOn(fs, "existsSync").mockReturnValue(true);
    jest.spyOn(fs, "readFileSync").mockReturnValue(
      JSON.stringify({
        appId: "1234567890",
        appSecret: "real-secret",
        redirectUri: "https://example.com/callback",
      })
    );

    const config = facebookAppConfig.getFacebookOAuthConfig();

    expect(config.appId).toBe("1234567890");
    expect(config.appSecret).toBe("real-secret");
    expect(config.redirectUri).toBe("https://example.com/callback");
  });

  it("ignores placeholder credential values in the configuration file", () => {
    jest.spyOn(fs, "existsSync").mockReturnValue(true);
    jest.spyOn(fs, "readFileSync").mockReturnValue(
      JSON.stringify({
        appId: "your-facebook-app-id",
        appSecret: "your-facebook-app-secret",
      })
    );

    const config = facebookAppConfig.getFacebookOAuthConfig();

    expect(config.appId).toBe("");
    expect(config.appSecret).toBe("");
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
