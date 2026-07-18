const fs = require("fs");
const path = require("path");

const envConfig = require("./environment");

const DEFAULT_FACEBOOK_APP_ID = "762328696481583";
const DEFAULT_FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET || "";
const FACEBOOK_LOGIN_CONFIG_ID = "2158986791329815";
// NOTE: Hardcoded fallback removed — single source of truth is facebook-oauth-config.json (managed via /super-admin/facebook-oauth)
const FACEBOOK_OAUTH_CONFIG_PATH = path.resolve(
  __dirname,
  "../data/facebook-oauth-config.json",
);

const PLACEHOLDER_PATTERNS = [
  /^$/,
  /^configured$/i,
  /^your[-_]/i,
  /^your-production-facebook-app-/i,
  /^your-facebook-app-/i,
];

const normalizeCredential = (value) =>
  typeof value === "string" ? value.trim() : "";

const isPlaceholderFacebookCredential = (value) => {
  const normalized = normalizeCredential(value);
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(normalized));
};

const chooseCredential = (...candidates) => {
  for (const candidate of candidates) {
    const normalized = normalizeCredential(candidate);
    if (normalized && !isPlaceholderFacebookCredential(normalized)) {
      return normalized;
    }
  }
  return "";
};

const buildFacebookBackendCallbackUrl = (type = "page") =>
  new URL(
    type === "pixel"
      ? "/api/v1/facebook-oauth/pixel-callback"
      : "/api/v1/facebook-oauth/callback",
    `${envConfig.backendUrl}/`,
  ).toString();

const getStoredFacebookOAuthConfig = () => {
  try {
    if (!fs.existsSync(FACEBOOK_OAUTH_CONFIG_PATH)) {
      return null;
    }

    const raw = fs.readFileSync(FACEBOOK_OAUTH_CONFIG_PATH, "utf8");
    if (!raw.trim()) {
      return null;
    }

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (error) {
    console.error("❌ Failed to read Facebook OAuth config:", error.message);
    return null;
  }
};

const saveFacebookOAuthConfig = (config) => {
  const payload = {
    appId: normalizeCredential(config?.appId),
    appSecret: normalizeCredential(config?.appSecret),
    redirectUri: normalizeCredential(config?.redirectUri),
    updatedAt: new Date().toISOString(),
  };

  fs.mkdirSync(path.dirname(FACEBOOK_OAUTH_CONFIG_PATH), { recursive: true });
  fs.writeFileSync(
    FACEBOOK_OAUTH_CONFIG_PATH,
    JSON.stringify(payload, null, 2),
    "utf8",
  );

  return payload;
};

const getFacebookOAuthConfig = (env = process.env) => {
  const stored = getStoredFacebookOAuthConfig() || {};

  return {
    appId: chooseCredential(
      stored.appId,
      env.FACEBOOK_APP_ID,
      DEFAULT_FACEBOOK_APP_ID,
    ),
    appSecret: chooseCredential(
      stored.appSecret,
      env.FACEBOOK_APP_SECRET,
      DEFAULT_FACEBOOK_APP_SECRET,
    ),
    redirectUri:
      normalizeCredential(stored.redirectUri) ||
      buildFacebookBackendCallbackUrl("page"),
    configId: normalizeCredential(FACEBOOK_LOGIN_CONFIG_ID || env.FACEBOOK_LOGIN_CONFIG_ID),
  };
};

const getFacebookRedirectUri = (type = "page") =>
  type === "pixel"
    ? buildFacebookBackendCallbackUrl("pixel")
    : getFacebookOAuthConfig().redirectUri;

const getFacebookAppSecret = (env = process.env) =>
  getFacebookOAuthConfig(env).appSecret;

const getFacebookConfigId = (env = process.env) =>
  getFacebookOAuthConfig(env).configId;

module.exports = {
  DEFAULT_FACEBOOK_APP_ID,
  FACEBOOK_OAUTH_CONFIG_PATH,
  FACEBOOK_LOGIN_CONFIG_ID,
  buildFacebookBackendCallbackUrl,
  getFacebookAppSecret,
  getFacebookConfigId,
  getFacebookOAuthConfig,
  getFacebookRedirectUri,
  getStoredFacebookOAuthConfig,
  isPlaceholderFacebookCredential,
  saveFacebookOAuthConfig,
};
