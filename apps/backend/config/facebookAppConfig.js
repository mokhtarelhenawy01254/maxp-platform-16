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
    facebookWebhookVerifyToken: normalizeCredential(
      config?.facebookWebhookVerifyToken || config?.webhookVerifyToken
    ),
    whatsappAppId: normalizeCredential(config?.whatsappAppId),
    whatsappAppSecret: normalizeCredential(config?.whatsappAppSecret),
    whatsappConfigId: normalizeCredential(config?.whatsappConfigId),
    whatsappWebhookVerifyToken: normalizeCredential(config?.whatsappWebhookVerifyToken),
    growthAppId: normalizeCredential(config?.growthAppId),
    growthAppSecret: normalizeCredential(config?.growthAppSecret),
    growthConfigId: normalizeCredential(config?.growthConfigId || config?.growthLoginConfigId),
    growthWebhookVerifyToken: normalizeCredential(config?.growthWebhookVerifyToken),
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

const getFacebookOAuthConfig = () => {
  const stored = getStoredFacebookOAuthConfig() || {};

  return {
    appId: chooseCredential(stored.appId, process.env.FACEBOOK_APP_ID),
    appSecret: chooseCredential(stored.appSecret, process.env.FACEBOOK_APP_SECRET),
    redirectUri:
      normalizeCredential(stored.redirectUri) ||
      buildFacebookBackendCallbackUrl("page"),
    configId: normalizeCredential(stored.configId || FACEBOOK_LOGIN_CONFIG_ID),
    facebookWebhookVerifyToken:
      normalizeCredential(stored.facebookWebhookVerifyToken) ||
      normalizeCredential(process.env.FACEBOOK_VERIFY_TOKEN) ||
      normalizeCredential(process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN) ||
      "",
    whatsappAppId: chooseCredential(stored.whatsappAppId),
    whatsappAppSecret: chooseCredential(stored.whatsappAppSecret),
    whatsappConfigId: normalizeCredential(stored.whatsappConfigId),
    whatsappWebhookVerifyToken: normalizeCredential(stored.whatsappWebhookVerifyToken),
  };
};

const getFacebookRedirectUri = (type = "page") =>
  type === "pixel"
    ? buildFacebookBackendCallbackUrl("pixel")
    : getFacebookOAuthConfig().redirectUri;

const getFacebookAppSecret = () =>
  getFacebookOAuthConfig().appSecret;

const getFacebookConfigId = () =>
  getFacebookOAuthConfig().configId;

/**
 * فحص ما إذا كان تطبيق Growth مفعل
 * @returns {boolean}
 */
const isGrowthActive = () => process.env.META_GROWTH_ACTIVE !== "false";

/**
 * جلب إعدادات تطبيق فيسبوك بحسب المفتاح ('primary' أو 'growth')
 * مع التراجع التلقائي إلى primary إذا لم يكن growth مضبوطاً أو إذا كان معطلاً
 * @param {string} [key='primary']
 * @returns {{ appId: string, appSecret: string, loginConfigId: string, webhookVerifyToken: string }}
 */
const getFacebookAppKeyConfig = (key = "primary") => {
  const normalizedKey = String(key || "primary").trim().toLowerCase();
  const primaryOAuth = getFacebookOAuthConfig();
  const primaryConfig = {
    appId: primaryOAuth.appId || DEFAULT_FACEBOOK_APP_ID,
    appSecret: primaryOAuth.appSecret,
    loginConfigId: primaryOAuth.configId,
    webhookVerifyToken: primaryOAuth.facebookWebhookVerifyToken,
  };

  if (normalizedKey === "growth") {
    if (!isGrowthActive()) {
      return primaryConfig;
    }

    const stored = getStoredFacebookOAuthConfig() || {};

    const growthAppId = chooseCredential(
      stored.growthAppId,
      process.env.FACEBOOK_GROWTH_APP_ID,
      process.env.FB_GROWTH_APP_ID
    );
    const growthAppSecret = chooseCredential(
      stored.growthAppSecret,
      process.env.FACEBOOK_GROWTH_APP_SECRET,
      process.env.FB_GROWTH_APP_SECRET
    );
    const growthLoginConfigId = normalizeCredential(
      stored.growthConfigId ||
      stored.growthLoginConfigId ||
      process.env.FACEBOOK_GROWTH_LOGIN_CONFIG_ID ||
      process.env.FB_GROWTH_LOGIN_CONFIG_ID
    );
    const growthWebhookVerifyToken = chooseCredential(
      stored.growthWebhookVerifyToken,
      process.env.FACEBOOK_GROWTH_WEBHOOK_VERIFY_TOKEN,
      process.env.FACEBOOK_GROWTH_VERIFY_TOKEN,
      process.env.FB_GROWTH_VERIFY_TOKEN,
      process.env.FB_GROWTH_WEBHOOK_VERIFY_TOKEN
    );

    // الرجوع إلى primary كـ fallback إذا لم يكن معرف تطبيق النمو مضبوطاً
    if (!growthAppId || isPlaceholderFacebookCredential(growthAppId)) {
      return primaryConfig;
    }

    return {
      appId: growthAppId,
      appSecret: growthAppSecret || primaryConfig.appSecret,
      loginConfigId: growthLoginConfigId || primaryConfig.loginConfigId,
      webhookVerifyToken: growthWebhookVerifyToken || primaryConfig.webhookVerifyToken,
    };
  }

  return primaryConfig;
};

/**
 * جلب قائمة كافة أسرار التطبيقات المهيأة للتحقق من تواقيع الويب هوك (Primary + Growth)
 * @returns {Array<{ key: string, appSecret: string, appId: string }>}
 */
const getAllFacebookAppSecrets = () => {
  const primaryConfig = getFacebookAppKeyConfig("primary");
  const secrets = [];

  if (primaryConfig.appSecret && !isPlaceholderFacebookCredential(primaryConfig.appSecret)) {
    secrets.push({
      key: "primary",
      appId: primaryConfig.appId,
      appSecret: primaryConfig.appSecret,
    });
  }

  if (isGrowthActive()) {
    const growthConfig = getFacebookAppKeyConfig("growth");
    if (
      growthConfig.appSecret &&
      growthConfig.appSecret !== primaryConfig.appSecret &&
      !isPlaceholderFacebookCredential(growthConfig.appSecret)
    ) {
      secrets.push({
        key: "growth",
        appId: growthConfig.appId,
        appSecret: growthConfig.appSecret,
      });
    }
  }

  return secrets;
};

/**
 * جلب رموز التحقق المقبولة لـ Webhook Verification من التطبيقين
 * @returns {Set<string>}
 */
const getFacebookWebhookVerifyTokens = () => {
  const primaryOAuth = getFacebookOAuthConfig();
  const growthConfig = getFacebookAppKeyConfig("growth");

  const tokens = [
    process.env.FACEBOOK_VERIFY_TOKEN,
    process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN,
    primaryOAuth.facebookWebhookVerifyToken,
    primaryOAuth.whatsappWebhookVerifyToken,
    growthConfig.webhookVerifyToken,
    process.env.FACEBOOK_GROWTH_WEBHOOK_VERIFY_TOKEN,
    process.env.FACEBOOK_GROWTH_VERIFY_TOKEN,
    process.env.FB_GROWTH_WEBHOOK_VERIFY_TOKEN,
    process.env.FB_GROWTH_VERIFY_TOKEN,
  ];

  return new Set(
    tokens
      .filter((t) => typeof t === "string" && t.trim() !== "")
      .map((t) => t.trim())
  );
};

module.exports = {
  DEFAULT_FACEBOOK_APP_ID,
  FACEBOOK_OAUTH_CONFIG_PATH,
  FACEBOOK_LOGIN_CONFIG_ID,
  buildFacebookBackendCallbackUrl,
  getAllFacebookAppSecrets,
  getFacebookAppKeyConfig,
  getFacebookAppSecret,
  getFacebookConfigId,
  getFacebookOAuthConfig,
  getFacebookRedirectUri,
  getFacebookWebhookVerifyTokens,
  getStoredFacebookOAuthConfig,
  isGrowthActive,
  isPlaceholderFacebookCredential,
  saveFacebookOAuthConfig,
};
