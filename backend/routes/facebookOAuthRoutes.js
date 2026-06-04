const express = require("express");
const router = express.Router();
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const { getSharedPrismaClient } = require("../services/sharedDatabase");
const {
  buildFacebookPageTokenFailureMessage,
  ensureValidFacebookPageAccessToken,
} = require("../utils/facebookPageTokenUtils");
const {
  buildFacebookTokenUpdateData,
} = require("../utils/facebookOAuthTokenFields");
const {
  getMetaGraphApiBaseUrl,
  getMetaGraphApiVersion,
  getMetaOAuthBaseUrl,
} = require("../config/metaApi");
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

// Import authentication middleware
const { requireAuth } = require("../middleware/auth");
const {
  authenticateToken,
  requireSuperAdmin,
} = require("../middleware/superAdminMiddleware");

// Import environment configuration
const envConfig = require("../config/environment");

// Facebook OAuth Configuration
const DEFAULT_FACEBOOK_APP_ID = "762328696481583";
const DEFAULT_FACEBOOK_APP_SECRET = "9ef40d290082e1d2455ac38646f2b379";
const FACEBOOK_GRAPH_API_VERSION = getMetaGraphApiVersion();
const FACEBOOK_GRAPH_API_BASE_URL = getMetaGraphApiBaseUrl();
const FACEBOOK_OAUTH_BASE_URL = getMetaOAuthBaseUrl();
const FACEBOOK_PAGE_WEBHOOK_FIELDS =
  "messages,messaging_postbacks,messaging_optins,messaging_referrals,message_deliveries,message_reads,message_echoes,feed";
const FACEBOOK_OAUTH_CONFIG_PATH = path.resolve(
  __dirname,
  "../data/facebook-oauth-config.json",
);

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
    appId: typeof config?.appId === "string" ? config.appId.trim() : "",
    appSecret:
      typeof config?.appSecret === "string" ? config.appSecret.trim() : "",
    redirectUri:
      typeof config?.redirectUri === "string" ? config.redirectUri.trim() : "",
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
    appId: stored.appId || DEFAULT_FACEBOOK_APP_ID,
    appSecret: stored.appSecret || DEFAULT_FACEBOOK_APP_SECRET,
    redirectUri: stored.redirectUri || buildFacebookBackendCallbackUrl("page"),
  };
};

// Dynamic Facebook Redirect URI based on environment
const getFacebookRedirectUri = (type = "page") =>
  type === "pixel"
    ? buildFacebookBackendCallbackUrl("pixel")
    : getFacebookOAuthConfig().redirectUri;

const OAUTH_ALLOWED_FRONTEND_ORIGINS = new Set([
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3008",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
  "http://127.0.0.1:3008",
  "https://mokhtarelhenawy.online",
  "https://www.mokhtarelhenawy.online",
  "https://maxp.online",
  "https://www.maxp.online",
]);

const getDefaultFacebookFrontendBaseUrl = () => envConfig.frontendUrl;

const getFacebookOAuthTargetPath = (type) =>
  type === "pixel" ? "/advertising/facebook-pixel" : "/settings/facebook";

const buildFacebookFrontendRedirectUrl = (baseUrl, type, params = {}) => {
  const redirectUrl = new URL(
    getFacebookOAuthTargetPath(type),
    `${baseUrl}/`,
  );

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    redirectUrl.searchParams.set(key, String(value));
  });

  return redirectUrl.toString();
};

const normalizeRequestedFrontendOrigin = (candidate) => {
  if (typeof candidate !== "string" || !candidate.trim()) {
    return null;
  }

  try {
    const normalizedOrigin = new URL(candidate).origin;
    return OAUTH_ALLOWED_FRONTEND_ORIGINS.has(normalizedOrigin)
      ? normalizedOrigin
      : null;
  } catch (error) {
    return null;
  }
};

const getRequestedFrontendOrigin = (req) =>
  normalizeRequestedFrontendOrigin(req.query?.returnOrigin) ||
  normalizeRequestedFrontendOrigin(req.get("origin")) ||
  normalizeRequestedFrontendOrigin(req.get("referer"));

const buildFacebookOAuthState = ({ companyId, userId, type, returnOrigin }) => {
  const stateParts = [
    companyId,
    userId,
    Date.now(),
    Math.random().toString(36).substring(7),
  ];

  if (type) {
    stateParts.push(type);
  }

  if (returnOrigin) {
    stateParts.push(returnOrigin);
  }

  return Buffer.from(stateParts.join("|")).toString("base64");
};

const decodeFacebookOAuthState = (state, fallbackType) => {
  const normalizedState = decodeURIComponent(state).replace(/ /g, "+");
  const decodedState = Buffer.from(normalizedState, "base64").toString("utf8");

  if (decodedState.includes("|")) {
    const [cid, uid, ts, r, fifth, sixth] = decodedState.split("|");

    let type = fallbackType;
    let returnOrigin = null;

    if (fifth === "pixel" || fifth === "page") {
      type = fifth;
      returnOrigin = sixth || null;
    } else if (fifth) {
      returnOrigin = fifth;
    }

    return {
      raw: decodedState,
      stateData: {
        cid,
        uid,
        ts: parseInt(ts, 10),
        r,
        type,
        returnOrigin,
      },
    };
  }

  const parsedState = JSON.parse(decodedState);

  return {
    raw: decodedState,
    stateData: {
      ...parsedState,
      type: parsedState.type || fallbackType,
      returnOrigin:
        parsedState.returnOrigin || parsedState.returnTo || parsedState.origin,
    },
  };
};

const resolveOAuthCallbackContext = (state, fallbackType) => {
  const redirectBaseUrl = getDefaultFacebookFrontendBaseUrl();

  if (!state) {
    return {
      stateData: {},
      decodedState: null,
      redirectBaseUrl,
      redirectType: fallbackType,
      parseError: null,
    };
  }

  try {
    const { raw, stateData } = decodeFacebookOAuthState(state, fallbackType);
    const requestedOrigin = normalizeRequestedFrontendOrigin(
      stateData.returnOrigin,
    );

    return {
      stateData,
      decodedState: raw,
      redirectBaseUrl: requestedOrigin || redirectBaseUrl,
      redirectType: stateData.type || fallbackType,
      parseError: null,
    };
  } catch (error) {
    return {
      stateData: {},
      decodedState: null,
      redirectBaseUrl,
      redirectType: fallbackType,
      parseError: error,
    };
  }
};

// Facebook OAuth Scopes
// 🆕 Added ads_management and ads_read for Pixel access
const FACEBOOK_SCOPES =
  "public_profile,email,pages_show_list,pages_manage_posts,pages_read_engagement,pages_manage_metadata,pages_messaging,instagram_basic,instagram_manage_comments,instagram_manage_messages,pages_read_user_content,pages_manage_engagement,business_management,ads_management,ads_read";

router.get(
  "/config",
  authenticateToken,
  requireSuperAdmin,
  async (req, res) => {
    try {
      return res.json({
        success: true,
        data: getFacebookOAuthConfig(),
      });
    } catch (error) {
      console.error("❌ Error getting Facebook OAuth config:", error);
      return res.status(500).json({
        success: false,
        message: "فشل في جلب إعدادات Facebook OAuth",
        error: error.message,
      });
    }
  },
);

router.post(
  "/config",
  authenticateToken,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const nextConfig = {
        appId: req.body?.appId,
        appSecret: req.body?.appSecret,
        redirectUri: req.body?.redirectUri,
      };

      if (
        !nextConfig.appId ||
        !nextConfig.appSecret ||
        !nextConfig.redirectUri
      ) {
        return res.status(400).json({
          success: false,
          message: "جميع حقول إعدادات Facebook OAuth مطلوبة",
        });
      }

      const savedConfig = saveFacebookOAuthConfig(nextConfig);
      return res.json({
        success: true,
        message: "تم حفظ إعدادات Facebook OAuth بنجاح",
        data: savedConfig,
      });
    } catch (error) {
      console.error("❌ Error saving Facebook OAuth config:", error);
      return res.status(500).json({
        success: false,
        message: "فشل في حفظ إعدادات Facebook OAuth",
        error: error.message,
      });
    }
  },
);

// 🎯 NEW: Function to subscribe page to app webhooks
const subscribePageToApp = async (pageId, pageAccessToken) => {
  try {
    console.log(`🔔 Subscribing page ${pageId} to app webhooks...`);

    const response = await axios.post(
      `${FACEBOOK_GRAPH_API_BASE_URL}/${pageId}/subscribed_apps`,
      {},
      {
        params: {
          access_token: pageAccessToken,
          subscribed_fields: FACEBOOK_PAGE_WEBHOOK_FIELDS,
        },
      },
    );

    console.log(
      `✅ Successfully subscribed page ${pageId} to webhooks:`,
      response.data,
    );
    return { success: true, data: response.data };
  } catch (error) {
    console.error(
      `❌ Failed to subscribe page ${pageId}:`,
      error.response?.data || error.message,
    );
    return { success: false, error: error.response?.data || error.message };
  }
};

// 🎯 NEW: Function to check if page is subscribed
const checkPageSubscription = async (pageId, pageAccessToken) => {
  try {
    const response = await axios.get(
      `${FACEBOOK_GRAPH_API_BASE_URL}/${pageId}/subscribed_apps`,
      {
        params: { access_token: pageAccessToken },
      },
    );

    console.log(`📋 Page ${pageId} subscriptions:`, response.data);
    return response.data;
  } catch (error) {
    console.error(
      `❌ Failed to check page ${pageId} subscriptions:`,
      error.response?.data || error.message,
    );
    return null;
  }
};

const ensurePageWebhookSubscription = async (pageId, pageAccessToken) => {
  const existingSubscription = await checkPageSubscription(pageId, pageAccessToken);
  if (
    existingSubscription &&
    Array.isArray(existingSubscription.data) &&
    existingSubscription.data.length > 0
  ) {
    return { success: true, alreadySubscribed: true };
  }

  return subscribePageToApp(pageId, pageAccessToken);
};

const loadCompanyFacebookPages = async (
  companyId,
  { includeDisconnected = true, validateTokens = false } = {},
) => {
  const where = includeDisconnected
    ? { companyId }
    : { companyId, status: "connected" };

  const facebookPages = await getSharedPrismaClient().facebookPage.findMany({
    where,
    select: {
      id: true,
      pageId: true,
      pageName: true,
      pageAccessToken: true,
      status: true,
      connectedAt: true,
      disconnectedAt: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: [
      { status: "asc" },
      { connectedAt: "desc" },
      { updatedAt: "desc" },
    ],
  });

  const pages = await Promise.all(
    facebookPages.map(async (page) => {
      const basePage = {
        id: page.id,
        pageId: page.pageId,
        pageName: page.pageName,
        status: page.status,
        connectedAt: page.connectedAt,
        disconnectedAt: page.disconnectedAt,
        updatedAt: page.updatedAt,
        lastActivity: page.updatedAt,
      };

      if (page.status !== "connected") {
        return {
          ...basePage,
          tokenHealth: page.pageAccessToken ? "disconnected" : "missing_token",
          tokenSource: null,
          needsReconnect: true,
          canReconnect: Boolean(page.pageAccessToken),
          healthMessage: page.pageAccessToken
            ? null
            : "No stored Facebook page token is available for this page.",
        };
      }

      if (!page.pageAccessToken) {
        return {
          ...basePage,
          tokenHealth: "missing_token",
          tokenSource: null,
          needsReconnect: true,
          canReconnect: false,
          healthMessage: "No stored Facebook page token is available for this page.",
        };
      }

      if (!validateTokens) {
        return {
          ...basePage,
          tokenHealth: "stored",
          tokenSource: "stored_page_token",
          needsReconnect: false,
          canReconnect: true,
          healthMessage: null,
        };
      }

      const tokenState = await ensureValidFacebookPageAccessToken({
        companyId,
        pageId: page.pageId,
        pageAccessToken: page.pageAccessToken,
        allowRefresh: true,
      });

      return {
        ...basePage,
        pageName: tokenState.ok ? tokenState.page?.name || page.pageName : page.pageName,
        tokenHealth: tokenState.ok ? "healthy" : "needs_reconnect",
        tokenSource: tokenState.ok ? tokenState.source : null,
        needsReconnect: !tokenState.ok,
        canReconnect: Boolean(page.pageAccessToken),
        healthMessage: tokenState.ok
          ? null
          : buildFacebookPageTokenFailureMessage(tokenState, page.pageId),
      };
    }),
  );

  const connectedPages = pages.filter((page) => page.status === "connected");
  const disconnectedPages = pages.filter((page) => page.status !== "connected");
  const unhealthyPages = connectedPages.filter((page) => page.needsReconnect);

  return {
    pages,
    connectedPages,
    disconnectedPages,
    unhealthyPages,
  };
};

const disconnectCompanyFacebookPages = async ({ companyId, pageIds }) => {
  const pages = await getSharedPrismaClient().facebookPage.findMany({
    where: {
      id: { in: pageIds },
      companyId,
    },
    select: {
      id: true,
      pageId: true,
      pageName: true,
      pageAccessToken: true,
    },
  });

  const pageIdSet = new Set(pages.map((page) => page.id));
  const missingPageIds = pageIds.filter((pageId) => !pageIdSet.has(pageId));

  const disconnectedPages = [];

  for (const page of pages) {
    let webhookUnsubscribed = false;

    if (page.pageAccessToken) {
      try {
        await axios.delete(
          `${FACEBOOK_GRAPH_API_BASE_URL}/${page.pageId}/subscribed_apps`,
          {
            params: {
              access_token: page.pageAccessToken,
            },
            timeout: 10000,
          },
        );
        webhookUnsubscribed = true;
      } catch (error) {
        console.warn(
          `⚠️ Could not unsubscribe page ${page.pageId} from webhooks:`,
          error.response?.data?.error?.message || error.message,
        );
      }
    }

    await getSharedPrismaClient().facebookPage.update({
      where: { id: page.id },
      data: {
        status: "disconnected",
        disconnectedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    disconnectedPages.push({
      id: page.id,
      pageId: page.pageId,
      pageName: page.pageName,
      webhookUnsubscribed,
    });
  }

  return {
    disconnectedPages,
    missingPageIds,
  };
};

const reconnectCompanyFacebookPages = async ({ companyId, pageIds }) => {
  const pages = await getSharedPrismaClient().facebookPage.findMany({
    where: {
      id: { in: pageIds },
      companyId,
    },
    select: {
      id: true,
      pageId: true,
      pageName: true,
      pageAccessToken: true,
      status: true,
    },
  });

  const pageIdSet = new Set(pages.map((page) => page.id));
  const failedPages = pageIds
    .filter((pageId) => !pageIdSet.has(pageId))
    .map((pageId) => ({
      id: pageId,
      pageId: null,
      pageName: null,
      reason: "PAGE_NOT_FOUND",
      message: "الصفحة غير موجودة أو لا تملك صلاحية الوصول إليها",
    }));

  const reconnectedPages = [];
  const warningPages = [];

  for (const page of pages) {
    if (!page.pageAccessToken) {
      failedPages.push({
        id: page.id,
        pageId: page.pageId,
        pageName: page.pageName,
        reason: "MISSING_PAGE_ACCESS_TOKEN",
        message: "لا يوجد Page Access Token محفوظ لهذه الصفحة. أعيدي الربط من Facebook.",
      });
      continue;
    }

    let pageAccessToken = page.pageAccessToken;
    let pageName = page.pageName;
    const warnings = [];

    const tokenState = await ensureValidFacebookPageAccessToken({
      companyId,
      pageId: page.pageId,
      pageAccessToken,
      allowRefresh: true,
    });

    if (tokenState.ok) {
      pageAccessToken = tokenState.pageAccessToken;
      pageName = tokenState.page?.name || pageName;
    } else {
      warnings.push({
        reason:
          tokenState.validation?.reason ||
          tokenState.refresh?.reason ||
          "TOKEN_VALIDATION_FAILED",
        message: buildFacebookPageTokenFailureMessage(tokenState, page.pageId),
      });
    }

    let webhookSubscribed = false;
    const webhookResult = await ensurePageWebhookSubscription(
      page.pageId,
      pageAccessToken,
    );

    if (webhookResult.success) {
      webhookSubscribed = true;
    } else {
      const webhookMessage =
        webhookResult.error?.error?.message ||
        webhookResult.error?.message ||
        webhookResult.error ||
        "Failed to subscribe page to Facebook webhooks";

      warnings.push({
        reason: "WEBHOOK_SUBSCRIPTION_FAILED",
        message: webhookMessage,
      });
    }

    const updatedPage = await getSharedPrismaClient().facebookPage.update({
      where: { id: page.id },
      data: {
        pageAccessToken,
        pageName,
        status: "connected",
        connectedAt: new Date(),
        disconnectedAt: null,
        updatedAt: new Date(),
      },
    });

    reconnectedPages.push({
      id: updatedPage.id,
      pageId: updatedPage.pageId,
      pageName: updatedPage.pageName,
      status: updatedPage.status,
      webhookSubscribed,
      warnings,
    });

    if (warnings.length > 0) {
      warningPages.push({
        id: updatedPage.id,
        pageId: updatedPage.pageId,
        pageName: updatedPage.pageName,
        warnings,
      });
    }
  }

  return {
    reconnectedPages,
    failedPages,
    warningPages,
  };
};

/**
 * Step 1: Generate Facebook OAuth URL
 * GET /api/v1/facebook-oauth/authorize
 * ✅ REQUIRES AUTHENTICATION
 */
router.get("/authorize", requireAuth, async (req, res) => {
  try {
    const { appId } = getFacebookOAuthConfig();
    const { companyId } = req.query;
    const returnOrigin = getRequestedFrontendOrigin(req);

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: "Company ID is required",
        message: "معرف الشركة مطلوب",
      });
    }

    // Verify user has access to this company
    if (req.user.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        error: "Unauthorized access to company",
        message: "غير مصرح لك بالوصول لهذه الشركة",
      });
    }

    // 🚀 Use a more compact pipe-delimited format to avoid truncation
    // Format: cid|uid|ts|r (legacy support for JSON will remain in callback)
    const encodedState = buildFacebookOAuthState({
      companyId,
      userId: req.user.id,
      returnOrigin,
    });

    const authUrl =
      `${FACEBOOK_OAUTH_BASE_URL}/dialog/oauth?` +
      `client_id=${appId}&` +
      `redirect_uri=${encodeURIComponent(getFacebookRedirectUri("page"))}&` +
      `scope=${FACEBOOK_SCOPES}&` +
      `response_type=code&` +
      `auth_type=rerequest&` +
      `state=${encodeURIComponent(encodedState)}`;

    res.json({
      success: true,
      authUrl: authUrl,
      message: "Facebook authorization URL generated successfully",
    });
  } catch (error) {
    console.error("❌ Error generating auth URL:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to generate Facebook authorization URL",
    });
  }
});

/**
 * Step 2: Handle Facebook OAuth Callback
 * GET /api/v1/facebook-oauth/callback
 * ⚠️ NO AUTHENTICATION - Facebook redirects here directly
 */
router.get("/callback", async (req, res) => {
  try {
    const { appId, appSecret } = getFacebookOAuthConfig();
    const { code, state, error } = req.query;
    const {
      decodedState: callbackDecodedState,
      redirectBaseUrl: callbackRedirectBaseUrl,
      redirectType: callbackRedirectType,
    } = resolveOAuthCallbackContext(state);

    console.log("📥 Received Facebook OAuth callback");

    if (state) {
      console.log("ðŸ” [DEBUG] Raw state from query:", state);
    }
    if (callbackDecodedState) {
      console.log("ðŸ” [DEBUG] Decoded state string:", callbackDecodedState);
    }

    if (error) {
      console.error(`❌ Facebook OAuth error: ${error}`);
      return res.redirect(
        buildFacebookFrontendRedirectUrl(
          callbackRedirectBaseUrl,
          callbackRedirectType,
          {
            error: `facebook_oauth_${error}`,
          },
        ),
      );
    }

    if (!code || !state) {
      console.error("❌ Missing code or state in callback");
      return res.redirect(
        buildFacebookFrontendRedirectUrl(
          callbackRedirectBaseUrl,
          callbackRedirectType,
          {
            error: "missing_code_or_state",
          },
        ),
      );
    }

    let stateData = {};
    try {
      console.log("🔍 [DEBUG] Raw state from query:", state);

      // 🛡️ Robust decoding: fix potential space-to-plus conversion issues and URL decode
      const normalizedState = decodeURIComponent(state).replace(/ /g, "+");
      console.log("🔍 [DEBUG] Normalized state (Base64):", normalizedState);

      const decodedState = Buffer.from(normalizedState, "base64").toString(
        "utf8",
      );
      console.log("🔍 [DEBUG] Decoded state string:", decodedState);

      // 🔄 Check if it's the new delimited format or legacy JSON
      if (decodedState.includes("|")) {
        const [cid, uid, ts, r, type] = decodedState.split("|");
        stateData = { cid, uid, ts: parseInt(ts), r, type };
        console.log("✅ [DEBUG] Parsed as pipe-delimited format");
      } else {
        stateData = JSON.parse(decodedState);
        console.log("✅ [DEBUG] Parsed as legacy JSON format");
      }
    } catch (stateError) {
      console.error(
        "❌ [DEBUG] Invalid state parameter error:",
        stateError.message,
      );
      console.error("❌ [DEBUG] Problematic string was:", state);
      return res.redirect(
        buildFacebookFrontendRedirectUrl(
          callbackRedirectBaseUrl,
          callbackRedirectType,
          {
            error: "invalid_state",
          },
        ),
      );
    }

    // 🔄 Support both old and new (shorter) keys
    const companyId = stateData.cid || stateData.companyId;
    const userId = stateData.uid || stateData.userId;
    const timestamp = stateData.ts || stateData.timestamp;
    const type = stateData.type || callbackRedirectType;

    if (!companyId) {
      console.error("❌ No companyId in state");
      return res.redirect(
        buildFacebookFrontendRedirectUrl(callbackRedirectBaseUrl, type, {
          error: "no_company_id",
        }),
      );
    }

    const stateAge = Date.now() - timestamp;
    const maxStateAge = 10 * 60 * 1000; // 10 minutes
    if (stateAge > maxStateAge) {
      console.error("❌ State expired");
      return res.redirect(
        buildFacebookFrontendRedirectUrl(callbackRedirectBaseUrl, type, {
          error: "state_expired",
        }),
      );
    }

    const company = await getSharedPrismaClient().company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      console.error(`❌ Company not found: ${companyId}`);
      return res.redirect(
        buildFacebookFrontendRedirectUrl(callbackRedirectBaseUrl, type, {
          error: "company_not_found",
        }),
      );
    }

    // ✅ تبادل الكود مع Facebook Access Token
    const tokenResponse = await axios.get(
      `${FACEBOOK_GRAPH_API_BASE_URL}/oauth/access_token`,
      {
        params: {
          client_id: appId,
          client_secret: appSecret,
          redirect_uri: getFacebookRedirectUri("page"),
          code: code,
        },
      },
    );

    const { access_token: userAccessToken, expires_in } = tokenResponse.data;
    console.log("✅ Got user access token");

    // 🔍 تسجيل معلومات Token (خاصة للـ Pixels)
    if (type === "pixel") {
      console.log(
        `📊 [PIXELS] Token info: expires_in=${expires_in}, length=${userAccessToken?.length}`,
      );
      // لا نحاول التحقق من Token هنا لأنه قد يحتاج وقت لتفعيله في Facebook
      console.log("⏳ [PIXELS] Token will be validated when first used");
    }

    // Keep Messenger/page OAuth isolated from Ads and Pixel reconnects.
    // Page OAuth is the only flow allowed to update facebookUserAccessToken.
    const updateData = buildFacebookTokenUpdateData(userAccessToken, type);

    await getSharedPrismaClient().company.update({
      where: { id: companyId },
      data: updateData,
    });

    if (type === "pixel") {
      console.log("✅ [PIXELS] Saved pixel access token to company");

      // ✅ التحقق من أن Token تم حفظه بشكل صحيح
      const savedCompany = await getSharedPrismaClient().company.findUnique({
        where: { id: companyId },
        select: { facebookPixelAccessToken: true },
      });

      if (savedCompany?.facebookPixelAccessToken) {
        console.log("✅ [PIXELS] Token confirmed saved in database");
        console.log(
          `📊 [PIXELS] Token length: ${savedCompany.facebookPixelAccessToken.length}`,
        );
        console.log(
          `📊 [PIXELS] Token starts with: ${savedCompany.facebookPixelAccessToken.substring(0, 10)}...`,
        );
      } else {
        console.error("❌ [PIXELS] Token NOT found in database after save!");
      }

      // ✅ توجيه مباشرة لصفحة Pixels بعد نجاح الربط
      // لا نحتاج delay هنا لأن Token سيتم استخدامه لاحقاً من Frontend
      return res.redirect(
        buildFacebookFrontendRedirectUrl(callbackRedirectBaseUrl, type, {
          success: "pixel_connected",
        }),
      );
    } else {
      console.log("✅ Saved user access token to company");
    }

    // ✅ الحصول على كل الصفحات المرتبطة بالحساب مع دعم paging (للصفحات فقط)
    let allPages = [];
    let currentLimit = 20; // ابدأ بـ limit أصغر
    let nextUrl = `${FACEBOOK_GRAPH_API_BASE_URL}/me/accounts?access_token=${userAccessToken}&fields=id,name,access_token&limit=${currentLimit}`;
    let pageCount = 0;
    let retryCount = 0;
    const maxRetries = 2;

    while (nextUrl && retryCount <= maxRetries) {
      try {
        const pagesResponse = await axios.get(nextUrl, {
          timeout: 30000, // 30 seconds timeout
          headers: {
            Accept: "application/json",
          },
        });

        if (pagesResponse.data && Array.isArray(pagesResponse.data.data)) {
          allPages = allPages.concat(pagesResponse.data.data);
          pageCount += pagesResponse.data.data.length;
          console.log(`📄 Fetched ${pageCount} pages so far...`);
          retryCount = 0; // reset retry count on success
        }

        // تحقق من وجود paging.next
        nextUrl =
          pagesResponse.data.paging && pagesResponse.data.paging.next
            ? pagesResponse.data.paging.next
            : null;
      } catch (pagingError) {
        console.error(
          "❌ Error fetching pages batch:",
          pagingError.response?.data || pagingError.message,
        );

        // إذا Facebook طلب تقليل البيانات
        if (
          pagingError.response?.data?.error?.code === 1 &&
          currentLimit > 10
        ) {
          currentLimit = Math.max(10, Math.floor(currentLimit / 2));
          console.log(`⚠️ Reducing limit to ${currentLimit} and retrying...`);
          nextUrl = `${FACEBOOK_GRAPH_API_BASE_URL}/me/accounts?access_token=${userAccessToken}&fields=id,name,access_token&limit=${currentLimit}`;
          retryCount++;
          await new Promise((resolve) => setTimeout(resolve, 1000)); // wait 1 second
          continue;
        }

        // لو فيه صفحات اتجمعت، استخدمهم
        if (allPages.length > 0) {
          console.log(`⚠️ Using ${allPages.length} pages fetched before error`);
          break;
        }

        throw pagingError;
      }
    }
    console.log(`✅ Found ${allPages.length} pages (with paging)`);

    if (!allPages || !Array.isArray(allPages) || allPages.length === 0) {
      const redirectUrl = buildFacebookFrontendRedirectUrl(
        callbackRedirectBaseUrl,
        type,
        {
          success: true,
          pages: 0,
          message: "no_pages_found",
        },
      );
      return res.redirect(redirectUrl);
    }

    // 🚀 NEW: Background processing for high volumes to avoid timeouts
    const redirectUrl = buildFacebookFrontendRedirectUrl(
      callbackRedirectBaseUrl,
      type,
      {
        success: true,
        pages: allPages.length,
        isProcessing: allPages.length > 10,
        companyId,
      },
    );
    res.redirect(redirectUrl);

    // Process pages in background (capturing necessary data in closure)
    setImmediate(async () => {
      try {
        const savedPages = [];
        const skippedPages = [];

        // 🔍 Fetch existing pages from DB to check for company ownership
        const existingPages =
          await getSharedPrismaClient().facebookPage.findMany({
            where: {
              pageId: { in: allPages.map((p) => p.id) },
            },
          });
        const existingPagesMap = new Map(
          existingPages.map((p) => [p.pageId, p]),
        );

        for (const page of allPages) {
          try {
            const existingPageInDB = existingPagesMap.get(page.id);

            // 🚫 لا نمنع الربط إلا إذا كانت الصفحة connected فعلياً لدى شركة أخرى.
            // إذا كان السجل القديم disconnected، نسمح بإعادة ربطها للشركة الحالية.
            const isConnectedToAnotherCompany = Boolean(
              existingPageInDB &&
              existingPageInDB.companyId &&
              existingPageInDB.companyId !== companyId &&
              existingPageInDB.status === "connected",
            );

            if (isConnectedToAnotherCompany) {
              skippedPages.push({
                pageId: page.id,
                pageName: page.name,
                reason: "already_connected_to_another_company",
                connectedCompanyId: existingPageInDB.companyId,
                attemptedCompanyId: companyId,
              });
              continue;
            }

            // Update or Create page
            if (existingPageInDB && existingPageInDB.companyId === companyId) {
              await getSharedPrismaClient().facebookPage.update({
                where: { pageId: page.id },
                data: {
                  pageAccessToken: page.access_token,
                  pageName: page.name,
                  status: "connected",
                  connectedAt: new Date(),
                  disconnectedAt: null,
                },
              });
            } else {
              await getSharedPrismaClient().facebookPage.upsert({
                where: { pageId: page.id },
                update: {
                  pageAccessToken: page.access_token,
                  pageName: page.name,
                  status: "connected",
                  connectedAt: new Date(),
                  disconnectedAt: null,
                  companyId: companyId,
                },
                create: {
                  id: uuidv4(),
                  pageId: page.id,
                  pageName: page.name,
                  pageAccessToken: page.access_token,
                  status: "connected",
                  connectedAt: new Date(),
                  updatedAt: new Date(),
                  company: { connect: { id: companyId } },
                },
              });
            }

            // Subscribe to webhooks (Facebook Messenger)
            subscribePageToApp(page.id, page.access_token).catch(() => { });

            // 🆕 Fetch and store linked Instagram Business Account
            try {
              const igResponse = await axios.get(
                `${FACEBOOK_GRAPH_API_BASE_URL}/${page.id}`,
                {
                  params: {
                    fields: "instagram_business_account",
                    access_token: page.access_token,
                  },
                  timeout: 10000,
                },
              );
              const igAccountId = igResponse.data?.instagram_business_account?.id;
              if (igAccountId) {
                // Fetch the Instagram account name
                let igAccountName = null;
                try {
                  const igNameResponse = await axios.get(
                    `${FACEBOOK_GRAPH_API_BASE_URL}/${igAccountId}`,
                    {
                      params: {
                        fields: "name,username",
                        access_token: page.access_token,
                      },
                      timeout: 10000,
                    },
                  );
                  igAccountName = igNameResponse.data?.name || igNameResponse.data?.username || null;
                } catch (_) { /* ignore */ }

                await getSharedPrismaClient().facebookPage.update({
                  where: { pageId: page.id },
                  data: {
                    instagramAccountId: igAccountId,
                    instagramAccountName: igAccountName,
                  },
                });
                console.log(`📸 [BG-OAuth] Linked Instagram account ${igAccountId} (${igAccountName}) to page ${page.name}`);
              }
            } catch (igError) {
              console.warn(`⚠️ [BG-OAuth] Could not fetch Instagram account for page ${page.name}:`, igError.message);
            }
          } catch (pageError) {
            console.error(
              `❌ [BG-OAuth] Error processing page ${page.name}:`,
              pageError.message,
            );
          }
        }

        // Save skipped pages record
        if (skippedPages.length > 0) {
          try {
            await getSharedPrismaClient().skippedFacebookPage.createMany({
              data: skippedPages.map((sp) => ({
                pageId: sp.pageId,
                pageName: sp.pageName,
                reason: sp.reason,
                attemptedCompanyId: sp.attemptedCompanyId,
                connectedToCompanyId: sp.connectedCompanyId,
                isResolved: false,
                updatedAt: new Date(),
              })),
              skipDuplicates: true,
            });
          } catch (skipError) {
            console.error(
              `❌ [BG-OAuth] Error saving skipped pages:`,
              skipError.message,
            );
          }
        }
        console.log(
          `✅ [BG-OAuth] Finished background processing for ${allPages.length} pages.`,
        );
      } catch (fatalBgError) {
        console.error(
          "❌ [BG-OAuth] Fatal error in background processing:",
          fatalBgError.message,
        );
      }
    });
  } catch (error) {
    // تحسين طباعة الخطأ
    if (error.response) {
      console.error("❌ Error in OAuth callback:", {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
      });
    } else if (error.request) {
      console.error(
        "❌ Error in OAuth callback: No response received from Facebook.",
        error.message,
      );
    } else {
      console.error("❌ Error in OAuth callback:", error.message);
    }

    let errorMessage = "unknown_error";
    if (error.response) {
      // لو فيه رسالة خطأ واضحة من فيسبوك
      errorMessage =
        error.response.data?.error?.message ||
        `Facebook API error: ${error.response.status} ${error.response.statusText}`;
    } else if (error.request) {
      errorMessage = "network_error";
    } else {
      errorMessage = error.message;
    }

    const redirectBaseUrl = getDefaultFacebookFrontendBaseUrl();

    // إضافة تفاصيل أكثر للمستخدم لو فيه status code
    let userError = errorMessage;
    if (error.response && error.response.status) {
      userError = `Facebook API error (${error.response.status}): ${errorMessage}`;
    }

    const redirectUrl = buildFacebookFrontendRedirectUrl(
      redirectBaseUrl,
      undefined,
      {
        error: userError,
      },
    );
    res.redirect(redirectUrl);
  }
});

/**
 * 🎯 NEW: Test webhook subscription for a specific page
 * POST /api/v1/facebook-oauth/test-subscription
 * ✅ REQUIRES AUTHENTICATION
 */
router.post("/test-subscription", requireAuth, async (req, res) => {
  try {
    const { pageId } = req.body;
    const { companyId } = req.query;

    if (!companyId || !pageId) {
      return res.status(400).json({
        success: false,
        error: "Company ID and Page ID are required",
      });
    }

    // Verify user has access to this company
    if (req.user.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        error: "Unauthorized access to company",
      });
    }

    // Get page from database
    const page = await getSharedPrismaClient().facebookPage.findFirst({
      where: {
        pageId: pageId,
        companyId: companyId,
      },
    });

    if (!page) {
      return res.status(404).json({
        success: false,
        error: "Page not found",
      });
    }

    // Check current subscription
    const currentSubscription = await checkPageSubscription(
      page.pageId,
      page.pageAccessToken,
    );

    // Try to subscribe
    const subscriptionResult = await subscribePageToApp(
      page.pageId,
      page.pageAccessToken,
    );

    // Check subscription again
    const newSubscription = await checkPageSubscription(
      page.pageId,
      page.pageAccessToken,
    );

    res.json({
      success: subscriptionResult.success,
      pageId: page.pageId,
      pageName: page.pageName,
      currentSubscription,
      subscriptionResult: subscriptionResult.data || subscriptionResult.error,
      newSubscription,
      message: subscriptionResult.success
        ? "Page subscribed to webhooks successfully"
        : "Failed to subscribe page to webhooks",
    });
  } catch (error) {
    console.error("❌ Error testing subscription:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to test webhook subscription",
    });
  }
});

/**
 * Step 3: Get OAuth Status
 * GET /api/v1/facebook-oauth/status
 * ✅ REQUIRES AUTHENTICATION
 */
router.get("/status", requireAuth, async (req, res) => {
  try {
    const { companyId, validateTokens } = req.query;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: "Company ID is required",
        message: "معرف الشركة مطلوب",
      });
    }

    // Verify user has access to this company
    if (req.user.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        error: "Unauthorized access to company",
      });
    }

    const shouldValidateTokens = validateTokens === "true";
    const { pages, connectedPages, disconnectedPages, unhealthyPages } =
      await loadCompanyFacebookPages(companyId, {
        validateTokens: shouldValidateTokens,
      });

    res.json({
      success: true,
      connected: connectedPages.length > 0,
      tokenValidation: shouldValidateTokens ? "live" : "skipped",
      pagesCount: pages.length,
      connectedPagesCount: connectedPages.length,
      disconnectedPagesCount: disconnectedPages.length,
      pages,
      needsAttention:
        unhealthyPages.length > 0 || disconnectedPages.length > 0,
      unhealthyPagesCount: unhealthyPages.length,
      message:
        pages.length === 0
          ? "No Facebook pages connected"
          : connectedPages.length === 0
            ? "Facebook pages are saved, but all of them are currently disconnected"
            : unhealthyPages.length > 0 || disconnectedPages.length > 0
              ? "Facebook pages connected, but some pages need attention"
            : "Facebook pages connected successfully",
    });
  } catch (error) {
    console.error("❌ Error getting status:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to get Facebook OAuth status",
    });
  }
});

/**
 * Step 4: Disconnect Facebook Pages
 * DELETE /api/v1/facebook-oauth/disconnect
 * ✅ REQUIRES AUTHENTICATION
 */
router.delete("/disconnect", requireAuth, async (req, res) => {
  try {
    const { pageIds } = req.body;
    const { companyId } = req.query;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: "Company ID is required",
      });
    }

    if (!pageIds || !Array.isArray(pageIds)) {
      return res.status(400).json({
        success: false,
        error: "Page IDs array is required",
      });
    }

    // Verify user has access to this company
    if (req.user.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        error: "Unauthorized access to company",
      });
    }

    const { disconnectedPages, missingPageIds } =
      await disconnectCompanyFacebookPages({
        companyId,
        pageIds,
      });

    res.json({
      success: true,
      disconnectedCount: disconnectedPages.length,
      disconnectedPages,
      missingPageIds,
      message: `تم قطع الاتصال مع ${disconnectedPages.length} صفحة بنجاح`,
    });
  } catch (error) {
    console.error("❌ Error disconnecting pages:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to disconnect Facebook pages",
    });
  }
});

/**
 * Step 5: Reconnect Facebook Pages
 * POST /api/v1/facebook-oauth/reconnect
 * ✅ REQUIRES AUTHENTICATION
 */
router.post("/reconnect", requireAuth, async (req, res) => {
  try {
    const { pageIds } = req.body;
    const { companyId } = req.query;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: "Company ID is required",
      });
    }

    if (!pageIds || !Array.isArray(pageIds)) {
      return res.status(400).json({
        success: false,
        error: "Page IDs array is required",
      });
    }

    if (req.user.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        error: "Unauthorized access to company",
      });
    }

    const { reconnectedPages, failedPages, warningPages } =
      await reconnectCompanyFacebookPages({
        companyId,
        pageIds,
      });

    return res.json({
      success: failedPages.length === 0,
      reconnectedCount: reconnectedPages.length,
      reconnectedPages,
      failedPages,
      warningPages,
      warningsCount: warningPages.length,
      message:
        warningPages.length > 0
          ? `تمت إعادة ربط ${reconnectedPages.length} صفحة، لكن بعض صلاحيات Facebook تحتاج تجديد`
          : failedPages.length === 0
          ? `تمت إعادة ربط ${reconnectedPages.length} صفحة بنجاح`
          : `تمت إعادة ربط ${reconnectedPages.length} صفحة وتعذر إعادة ربط ${failedPages.length} صفحة`,
    });
  } catch (error) {
    console.error("❌ Error reconnecting pages:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to reconnect Facebook pages",
    });
  }
});

/**
 * Step 6: Get Skipped Pages
 * GET /api/v1/facebook-oauth/skipped-pages
 * ✅ REQUIRES AUTHENTICATION
 */
router.get("/skipped-pages", requireAuth, async (req, res) => {
  try {
    const { companyId } = req.query;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: "Company ID is required",
      });
    }

    // Verify user has access to this company
    if (req.user.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        error: "Unauthorized access to company",
      });
    }

    // جلب الصفحات المتخطاة غير المحلولة
    const skippedPages =
      await getSharedPrismaClient().skippedFacebookPage.findMany({
        where: {
          attemptedCompanyId: companyId,
          isResolved: false,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

    if (skippedPages.length === 0) {
      return res.json({
        success: true,
        skippedPages: [],
        count: 0,
      });
    }

    // لا نعرض التنبيه إلا إذا كانت الصفحة ما تزال connected فعلياً
    // لدى شركة أخرى الآن. هذا يمنع ظهور تحذيرات قديمة بعد فك الربط.
    const currentPages = await getSharedPrismaClient().facebookPage.findMany({
      where: {
        pageId: { in: skippedPages.map((page) => page.pageId) },
      },
      select: {
        pageId: true,
        companyId: true,
        status: true,
      },
    });

    const currentPageMap = new Map(
      currentPages.map((page) => [page.pageId, page]),
    );
    const activeSkippedPages = [];
    const staleSkippedPageIds = [];

    for (const skippedPage of skippedPages) {
      const currentPage = currentPageMap.get(skippedPage.pageId);
      const isStillConnectedElsewhere = Boolean(
        currentPage &&
        currentPage.companyId &&
        currentPage.companyId !== companyId &&
        currentPage.status === "connected",
      );

      if (isStillConnectedElsewhere) {
        activeSkippedPages.push(skippedPage);
      } else {
        staleSkippedPageIds.push(skippedPage.id);
      }
    }

    if (staleSkippedPageIds.length > 0) {
      await getSharedPrismaClient().skippedFacebookPage.updateMany({
        where: {
          id: { in: staleSkippedPageIds },
        },
        data: {
          isResolved: true,
          resolvedAt: new Date(),
        },
      });
    }

    res.json({
      success: true,
      skippedPages: activeSkippedPages,
      count: activeSkippedPages.length,
    });
  } catch (error) {
    console.error("❌ Error getting skipped pages:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Step 7: Mark Skipped Pages as Resolved
 * POST /api/v1/facebook-oauth/resolve-skipped
 * ✅ REQUIRES AUTHENTICATION
 */
router.post("/resolve-skipped", requireAuth, async (req, res) => {
  try {
    const { companyId } = req.query;
    const { pageIds } = req.body; // Array of skipped page IDs to resolve

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: "Company ID is required",
      });
    }

    // Verify user has access to this company
    if (req.user.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        error: "Unauthorized access to company",
      });
    }

    let resolvedCount = 0;

    if (pageIds && Array.isArray(pageIds) && pageIds.length > 0) {
      // Mark specific pages as resolved
      const result =
        await getSharedPrismaClient().skippedFacebookPage.updateMany({
          where: {
            id: { in: pageIds },
            attemptedCompanyId: companyId,
          },
          data: {
            isResolved: true,
            resolvedAt: new Date(),
          },
        });
      resolvedCount = result.count;
    } else {
      // Mark all skipped pages for this company as resolved
      const result =
        await getSharedPrismaClient().skippedFacebookPage.updateMany({
          where: {
            attemptedCompanyId: companyId,
            isResolved: false,
          },
          data: {
            isResolved: true,
            resolvedAt: new Date(),
          },
        });
      resolvedCount = result.count;
    }

    res.json({
      success: true,
      resolvedCount: resolvedCount,
      message: `تم وضع علامة على ${resolvedCount} صفحة كمحلولة`,
    });
  } catch (error) {
    console.error("❌ Error resolving skipped pages:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Step 7: Debug - check pages for a company
 * GET /api/v1/facebook-oauth/debug
 */
router.get("/debug", requireAuth, async (req, res) => {
  try {
    const { companyId } = req.query;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: "Company ID is required",
      });
    }

    const allPages = await getSharedPrismaClient().facebookPage.findMany({
      where: {
        company: {
          id: companyId,
        },
      },
      include: {
        company: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const connectedPages = await getSharedPrismaClient().facebookPage.findMany({
      where: {
        company: {
          id: companyId,
        },
        status: "connected",
      },
      include: {
        company: true,
      },
    });

    res.json({
      success: true,
      companyId,
      totalPages: allPages.length,
      connectedPages: connectedPages.length,
      disconnectedPages: allPages.filter((p) => p.status === "disconnected")
        .length,
      allPages: allPages.map((page) => ({
        id: page.id,
        pageId: page.pageId,
        pageName: page.pageName,
        status: page.status,
        companyId: page.company ? page.company.id : null,
        connectedAt: page.connectedAt,
        createdAt: page.createdAt,
        updatedAt: page.updatedAt,
      })),
      connectedPages: connectedPages.map((page) => ({
        id: page.id,
        pageId: page.pageId,
        pageName: page.pageName,
        status: page.status,
        connectedAt: page.connectedAt,
      })),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Step 1: Generate Facebook OAuth URL for Pixels (منفصل عن Pages)
 * GET /api/v1/facebook-oauth/pixel-authorize
 * ✅ REQUIRES AUTHENTICATION
 */
router.get("/pixel-authorize", requireAuth, async (req, res) => {
  try {
    const { appId } = getFacebookOAuthConfig();
    const { companyId } = req.query;
    const returnOrigin = getRequestedFrontendOrigin(req);

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: "Company ID is required",
        message: "معرف الشركة مطلوب",
      });
    }

    // Verify user has access to this company
    if (req.user.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        error: "Unauthorized access to company",
        message: "غير مصرح لك بالوصول لهذه الشركة",
      });
    }

    // 🚀 Use a more compact pipe-delimited format for Pixels
    // Format: cid|uid|ts|r|pixel
    const encodedState = buildFacebookOAuthState({
      companyId,
      userId: req.user.id,
      type: "pixel",
      returnOrigin,
    });

    const authUrl =
      `${FACEBOOK_OAUTH_BASE_URL}/dialog/oauth?` +
      `client_id=${appId}&` +
      `redirect_uri=${encodeURIComponent(getFacebookRedirectUri("pixel"))}&` +
      `scope=${FACEBOOK_SCOPES}&` +
      `response_type=code&` +
      `auth_type=rerequest&` +
      `state=${encodeURIComponent(encodedState)}`;

    res.json({
      success: true,
      authUrl: authUrl,
      message: "Facebook authorization URL generated successfully for Pixels",
    });
  } catch (error) {
    console.error("❌ Error generating pixel auth URL:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "فشل إنشاء رابط الترخيص",
    });
  }
});

/**
 * Step 2: Handle Facebook OAuth Callback for Pixels (منفصل عن Pages)
 * GET /api/v1/facebook-oauth/pixel-callback
 * ⚠️ NO AUTHENTICATION - Facebook redirects here directly
 */
router.get("/pixel-callback", async (req, res) => {
  try {
    const { appId, appSecret } = getFacebookOAuthConfig();
    const { code, state, error } = req.query;
    const {
      decodedState: callbackDecodedState,
      redirectBaseUrl: callbackRedirectBaseUrl,
      redirectType: callbackRedirectType,
    } = resolveOAuthCallbackContext(state, "pixel");

    console.log("📥 [PIXELS] Received Facebook OAuth callback for Pixels");

    if (state) {
      console.log("ðŸ” [PIXELS DEBUG] Raw state from query:", state);
    }
    if (callbackDecodedState) {
      console.log(
        "ðŸ” [PIXELS DEBUG] Decoded state string:",
        callbackDecodedState,
      );
    }

    if (error) {
      console.error(`❌ [PIXELS] Facebook OAuth error: ${error}`);
      return res.redirect(
        buildFacebookFrontendRedirectUrl(
          callbackRedirectBaseUrl,
          callbackRedirectType,
          {
            error: `facebook_oauth_${error}`,
          },
        ),
      );
    }

    if (!code || !state) {
      console.error("❌ [PIXELS] Missing code or state in callback");
      return res.redirect(
        buildFacebookFrontendRedirectUrl(
          callbackRedirectBaseUrl,
          callbackRedirectType,
          {
            error: "missing_code_or_state",
          },
        ),
      );
    }

    let stateData = {};
    try {
      console.log("🔍 [PIXELS DEBUG] Raw state from query:", state);

      const normalizedState = decodeURIComponent(state).replace(/ /g, "+");
      const decodedState = Buffer.from(normalizedState, "base64").toString(
        "utf8",
      );
      console.log("🔍 [PIXELS DEBUG] Decoded state string:", decodedState);

      if (decodedState.includes("|")) {
        const [cid, uid, ts, r, type] = decodedState.split("|");
        stateData = { cid, uid, ts: parseInt(ts), r, type: type || "pixel" };
      } else {
        stateData = JSON.parse(decodedState);
      }
    } catch (stateError) {
      console.error(
        "❌ [PIXELS DEBUG] Invalid state parameter:",
        stateError.message,
      );
      return res.redirect(
        buildFacebookFrontendRedirectUrl(
          callbackRedirectBaseUrl,
          callbackRedirectType,
          {
            error: "invalid_state",
          },
        ),
      );
    }

    const companyId = stateData.cid || stateData.companyId;
    const userId = stateData.uid || stateData.userId;
    const timestamp = stateData.ts || stateData.timestamp;
    const type = stateData.type || callbackRedirectType;

    // التحقق من أن هذا callback للـ Pixels وليس Pages
    if (type !== "pixel") {
      console.error("❌ [PIXELS] Invalid callback type:", type);
      return res.redirect(
        buildFacebookFrontendRedirectUrl(callbackRedirectBaseUrl, type, {
          error: "invalid_callback_type",
        }),
      );
    }

    if (!companyId) {
      console.error("❌ [PIXELS] No companyId in state");
      return res.redirect(
        buildFacebookFrontendRedirectUrl(callbackRedirectBaseUrl, type, {
          error: "no_company_id",
        }),
      );
    }

    const stateAge = Date.now() - timestamp;
    const maxStateAge = 10 * 60 * 1000; // 10 minutes
    if (stateAge > maxStateAge) {
      console.error("❌ [PIXELS] State expired");
      return res.redirect(
        buildFacebookFrontendRedirectUrl(callbackRedirectBaseUrl, type, {
          error: "state_expired",
        }),
      );
    }

    const company = await getSharedPrismaClient().company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      console.error(`❌ [PIXELS] Company not found: ${companyId}`);
      return res.redirect(
        buildFacebookFrontendRedirectUrl(callbackRedirectBaseUrl, type, {
          error: "company_not_found",
        }),
      );
    }

    // ✅ تبادل الكود مع Facebook Access Token
    const pixelRedirectUri = getFacebookRedirectUri("pixel");

    const tokenResponse = await axios.get(
      `${FACEBOOK_GRAPH_API_BASE_URL}/oauth/access_token`,
      {
        params: {
          client_id: appId,
          client_secret: appSecret,
          redirect_uri: pixelRedirectUri,
          code: code,
        },
      },
    );

    const { access_token: pixelAccessToken } = tokenResponse.data;
    console.log("✅ [PIXELS] Got user access token for Pixels");

    // 💾 حفظ Pixel Access Token في Company (منفصل عن facebookUserAccessToken)
    await getSharedPrismaClient().company.update({
      where: { id: companyId },
      data: buildFacebookTokenUpdateData(pixelAccessToken, "pixel"),
    });
    console.log("✅ [PIXELS] Saved pixel access token to company");

    // ✅ توجيه المستخدم إلى صفحة Pixels بعد نجاح الربط
    res.redirect(
      buildFacebookFrontendRedirectUrl(callbackRedirectBaseUrl, type, {
        success: "pixel_connected",
      }),
    );
  } catch (error) {
    console.error("❌ [PIXELS] Error in pixel callback:", error);
    res.redirect(
      buildFacebookFrontendRedirectUrl(
        getDefaultFacebookFrontendBaseUrl(),
        "pixel",
        {
          error: "callback_failed",
        },
      ),
    );
  }
});

/**
 * 🆕 Helper function to handle token errors for Pixels
 */
const handlePixelTokenError = async (error, companyId) => {
  // Check if error is OAuthException with code 190 (token decryption error)
  if (
    error.response?.data?.error?.code === 190 ||
    error.response?.data?.error?.code === "190"
  ) {
    console.log(
      "⚠️ [PIXELS] Token expired or invalid (code 190), clearing pixel token...",
    );

    // حذف Pixel Token فقط (لا نمس facebookUserAccessToken)
    try {
      await getSharedPrismaClient().company.update({
        where: { id: companyId },
        data: { facebookPixelAccessToken: null },
      });
      console.log("✅ [PIXELS] Cleared invalid pixel token");
      return true; // Token was cleared
    } catch (dbError) {
      console.error("❌ [PIXELS] Error clearing pixel token:", dbError);
    }
  }
  return false; // Token was not cleared
};

/**
 * 🆕 Get Facebook Pixels for authenticated user
 * GET /api/v1/facebook-oauth/pixels
 * ✅ REQUIRES AUTHENTICATION
 */
router.get("/pixels", requireAuth, async (req, res) => {
  try {
    const { companyId } = req.query;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: "Company ID is required",
        message: "معرف الشركة مطلوب",
      });
    }

    // Verify user has access to this company
    if (req.user.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        error: "Unauthorized access to company",
        message: "غير مصرح لك بالوصول لهذه الشركة",
      });
    }

    console.log("🎯 [PIXELS] Fetching pixels for company:", companyId);

    // Try Pixel token first, then fall back to the latest Ads/Page token.
    // This keeps Pixel discovery working after a fresh OAuth reconnect even if
    // older company fields were previously out of sync.
    const company = await getSharedPrismaClient().company.findUnique({
      where: { id: companyId },
      select: {
        facebookPixelAccessToken: true,
        facebookAdsAccessToken: true,
        facebookUserAccessToken: true,
      },
    });

    const tokenCandidates = Array.from(
      new Map(
        [
          ["facebookPixelAccessToken", company?.facebookPixelAccessToken],
          ["facebookAdsAccessToken", company?.facebookAdsAccessToken],
          ["facebookUserAccessToken", company?.facebookUserAccessToken],
        ]
          .filter(([, token]) => typeof token === "string" && token.trim())
          .map(([source, token]) => [token, { source, token }]),
      ).values(),
    );

    if (!company || tokenCandidates.length === 0) {
      return res.json({
        success: false,
        message: "يرجى ربط حسابك مع Facebook أولاً للوصول إلى Pixels",
        needsAuth: true,
      });
    }

    let pixelAccessToken = null;
    let selectedTokenSource = null;
    let lastMissingPermissions = [];

    const requiredPermissions = {
      business_management: "للوصول إلى Businesses",
      ads_read: "لقراءة بيانات Pixels",
      ads_management: "لإدارة Pixels",
    };

    console.log(
      `🔍 [PIXELS] Checking ${tokenCandidates.length} token candidate(s)...`,
    );

    for (const candidate of tokenCandidates) {
      try {
        console.log(
          `🔍 [PIXELS] Validating token source: ${candidate.source}`,
        );

        const userInfoResponse = await axios.get(
          `${FACEBOOK_GRAPH_API_BASE_URL}/me`,
          {
            params: {
              access_token: candidate.token,
              fields: "id,name,email",
            },
          },
        );
        console.log(
          `✅ [PIXELS] Token is valid for user: ${userInfoResponse.data.name || userInfoResponse.data.id}`,
        );

        const permissionsResponse = await axios.get(
          `${FACEBOOK_GRAPH_API_BASE_URL}/me/permissions`,
          {
            params: {
              access_token: candidate.token,
            },
          },
        );

        const grantedPermissions = permissionsResponse.data.data
          .filter((p) => p.status === "granted")
          .map((p) => p.permission);

        console.log(
          `📊 [PIXELS] Granted permissions (${grantedPermissions.length}) via ${candidate.source}:`,
          grantedPermissions.join(", "),
        );

        const missingPermissions = [];
        for (const [perm, description] of Object.entries(requiredPermissions)) {
          if (!grantedPermissions.includes(perm)) {
            missingPermissions.push(perm);
            console.warn(
              `⚠️ [PIXELS] Missing permission on ${candidate.source}: ${perm} (${description})`,
            );
          } else {
            console.log(`✅ [PIXELS] Permission granted: ${perm}`);
          }
        }

        if (missingPermissions.length > 0) {
          lastMissingPermissions = missingPermissions;
          continue;
        }

        pixelAccessToken = candidate.token;
        selectedTokenSource = candidate.source;
        break;
      } catch (permError) {
        const errorCode = permError.response?.data?.error?.code;
        const errorMessage =
          permError.response?.data?.error?.message || permError.message;

        console.error(
          `❌ [PIXELS] Error checking token permissions for ${candidate.source}: ${errorMessage} (code: ${errorCode})`,
        );
      }
    }

    if (!pixelAccessToken) {
      if (company.facebookPixelAccessToken) {
        console.warn(
          "⚠️ [PIXELS] Clearing stale pixel token after all candidate tokens failed validation.",
        );
        await getSharedPrismaClient().company.update({
          where: { id: companyId },
          data: { facebookPixelAccessToken: null },
        });
      }

      return res.json({
        success: false,
        message:
          "الصلاحيات المطلوبة غير متوفرة. يرجى إعادة الربط مع Facebook والتأكد من الموافقة على جميع الصلاحيات المطلوبة (ads_read و ads_management).",
        needsAuth: true,
        missingPermissions:
          lastMissingPermissions.length > 0
            ? lastMissingPermissions
            : ["ads_read", "ads_management"],
      });
    }

    console.log(
      `✅ [PIXELS] Using token source: ${selectedTokenSource} to fetch businesses and pixels`,
    );

    // 1. Get user's businesses
    console.log("📊 [PIXELS] Fetching businesses...");
    let businessesResponse;

    // Retry logic: Token قد يحتاج وقت لتفعيله في Facebook (خاصة code 190)
    let retryCount = 0;
    const maxRetries = 3; // زيادة عدد المحاولات
    let lastError = null;
    let code190Retries = 0;
    const maxCode190Retries = 2; // محاولات خاصة لـ code 190

    while (retryCount <= maxRetries) {
      try {
        businessesResponse = await axios.get(
          `${FACEBOOK_GRAPH_API_BASE_URL}/me/businesses`,
          {
            params: {
              access_token: pixelAccessToken,
              fields: "id,name",
            },
          },
        );
        // نجح! خروج من الحلقة
        console.log("✅ [PIXELS] Successfully fetched businesses");
        break;
      } catch (error) {
        lastError = error;
        const errorCode = error.response?.data?.error?.code;
        const errorMessage =
          error.response?.data?.error?.message || error.message;

        // إذا كان Token منتهي (code 190)، نحاول مرة أو مرتين قبل الحذف
        if (errorCode === 190 || errorCode === "190") {
          console.error(
            `❌ [PIXELS] Token error (code 190) - Attempt ${code190Retries + 1}/${maxCode190Retries + 1}`,
          );
          console.error(`📊 [PIXELS] Error message: ${errorMessage}`);

          code190Retries++;

          // إذا تجاوزنا عدد المحاولات المسموح لـ code 190، احذف Token
          if (code190Retries > maxCode190Retries) {
            console.error(
              "❌ [PIXELS] Token persistently invalid (code 190), clearing...",
            );
            const tokenCleared = await handlePixelTokenError(error, companyId);
            if (tokenCleared) {
              return res.json({
                success: false,
                message: "انتهت صلاحية الربط مع Facebook. يرجى إعادة الربط",
                needsAuth: true,
              });
            }
            throw error;
          }

          // محاولة أخرى مع delay أطول لـ code 190
          retryCount++;
          const delay = code190Retries * 2000; // 2s, 4s
          console.log(
            `⏳ [PIXELS] Waiting ${delay}ms before retry (code 190 may need activation time)...`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue; // حاول مرة أخرى
        }

        // إذا كان خطأ آخر ويمكن إعادة المحاولة
        if (retryCount < maxRetries) {
          retryCount++;
          const delay = retryCount * 1000; // 1s, 2s, 3s
          console.log(
            `⚠️ [PIXELS] Retry ${retryCount}/${maxRetries} after ${delay}ms...`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          // فشلت جميع المحاولات
          console.error(
            "❌ [PIXELS] Error fetching businesses after retries:",
            error.response?.data || error.message,
          );
          throw error;
        }
      }
    }

    const businesses = businessesResponse.data.data || [];
    console.log(`✅ [PIXELS] Found ${businesses.length} businesses`);

    // 🔍 إذا لم يتم العثور على Businesses، قد يكون المستخدم مسجل بحساب آخر
    if (businesses.length === 0) {
      console.warn(
        "⚠️ [PIXELS] No businesses found - user may be logged in with wrong account",
      );
      console.warn(
        "⚠️ [PIXELS] Clearing token to allow re-authentication with correct account",
      );

      // حذف Token القديم للسماح بإعادة الربط بحساب آخر
      await getSharedPrismaClient().company.update({
        where: { id: companyId },
        data: { facebookPixelAccessToken: null },
      });

      return res.json({
        success: false,
        message:
          "لم يتم العثور على Businesses. قد تكون مسجل بحساب آخر. يرجى إعادة الربط بالحساب الصحيح.",
        needsAuth: true,
        noBusinesses: true,
      });
    }

    // 2. Get pixels for each business
    const allPixels = [];
    let tokenExpired = false;
    let permissionDenied = false;

    for (const business of businesses) {
      try {
        console.log(
          `🔍 [PIXELS] Fetching pixels for business: ${business.name}`,
        );

        const pixelsResponse = await axios.get(
          `${FACEBOOK_GRAPH_API_BASE_URL}/${business.id}/adspixels`,
          {
            params: {
              access_token: pixelAccessToken,
              fields: "id,name,code",
            },
          },
        );

        const pixels = pixelsResponse.data.data || [];
        console.log(`  ✅ Found ${pixels.length} pixels`);

        pixels.forEach((pixel) => {
          allPixels.push({
            pixelId: pixel.id,
            pixelName: pixel.name,
            businessId: business.id,
            businessName: business.name,
          });
        });
      } catch (error) {
        const errorCode = error.response?.data?.error?.code;
        const errorSubcode = error.response?.data?.error?.error_subcode;
        const errorMessage =
          error.response?.data?.error?.message || error.message;

        console.error(
          `❌ [PIXELS] Error fetching pixels for business ${business.id}:`,
          errorMessage,
        );

        // إذا كان الخطأ متعلق بصلاحيات (code 100, subcode 33 = missing permissions)
        if (errorCode === 100 && errorSubcode === 33) {
          console.warn(
            `⚠️ [PIXELS] Permission denied for business ${business.id} - missing ads_read or ads_management permission`,
          );
          permissionDenied = true;
          // لا نكسر الحلقة، نحاول باقي Businesses
          continue;
        }

        // معالجة Token المنتهي
        const tokenCleared = await handlePixelTokenError(error, companyId);
        if (tokenCleared) {
          tokenExpired = true;
          break; // خروج من الحلقة إذا Token منتهي
        }
        // Continue with other businesses if it's not a token error
      }
    }

    // إذا تم رفض الوصول لجميع Businesses بسبب الصلاحيات
    if (permissionDenied && allPixels.length === 0) {
      console.error(
        "❌ [PIXELS] All businesses returned permission denied - missing ads_read/ads_management",
      );
      console.warn(
        "⚠️ [PIXELS] Clearing token due to missing permissions. User needs to re-authorize.",
      );

      // حذف Token وطلب إعادة الربط
      await getSharedPrismaClient().company.update({
        where: { id: companyId },
        data: { facebookPixelAccessToken: null },
      });

      return res.json({
        success: false,
        message:
          "الصلاحيات المطلوبة غير متوفرة. يرجى إعادة الربط مع Facebook والتأكد من الموافقة على جميع الصلاحيات المطلوبة (ads_read و ads_management).",
        needsAuth: true,
        missingPermissions: ["ads_read", "ads_management"],
      });
    }

    // إذا Token منتهي، أعد response يحتاج re-auth
    if (tokenExpired) {
      return res.json({
        success: false,
        message: "انتهت صلاحية الربط مع Facebook. يرجى إعادة الربط",
        needsAuth: true,
      });
    }

    console.log(`✅ [PIXELS] Total pixels found: ${allPixels.length}`);

    res.json({
      success: true,
      pixels: allPixels,
      count: allPixels.length,
      message:
        allPixels.length > 0
          ? `تم العثور على ${allPixels.length} Pixel`
          : "لم يتم العثور على Pixels",
    });
  } catch (error) {
    console.error(
      "❌ [PIXELS] Error fetching pixels:",
      error.response?.data || error.message,
    );

    // محاولة معالجة Token المنتهي
    const { companyId } = req.query;
    if (companyId) {
      const tokenCleared = await handlePixelTokenError(error, companyId);
      if (tokenCleared) {
        return res.json({
          success: false,
          message: "انتهت صلاحية الربط مع Facebook. يرجى إعادة الربط",
          needsAuth: true,
        });
      }
    }

    res.status(500).json({
      success: false,
      error: error.message,
      message: "فشل جلب Pixels من Facebook",
    });
  }
});

/**
 * 🆕 Generate Access Token for specific Pixel
 * POST /api/v1/facebook-oauth/generate-pixel-token
 * ✅ REQUIRES AUTHENTICATION
 */
router.post("/generate-pixel-token", requireAuth, async (req, res) => {
  try {
    const { companyId } = req.query;
    const { pixelId, businessId } = req.body;

    if (!companyId || !pixelId) {
      return res.status(400).json({
        success: false,
        error: "Company ID and Pixel ID are required",
        message: "معرف الشركة و Pixel ID مطلوبان",
      });
    }

    // Verify user has access to this company
    if (req.user.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        error: "Unauthorized access to company",
        message: "غير مصرح لك بالوصول لهذه الشركة",
      });
    }

    console.log("🔑 [TOKEN] Generating access token for pixel:", pixelId);

    // Get Facebook page access token
    const pages = await getSharedPrismaClient().facebookPage.findMany({
      where: {
        companyId: companyId,
        status: "connected",
      },
      select: {
        pageAccessToken: true,
      },
      take: 1,
    });

    if (!pages || pages.length === 0) {
      return res.status(404).json({
        success: false,
        message: "لم يتم العثور على صفحات Facebook مربوطة",
      });
    }

    const userAccessToken = pages[0].pageAccessToken;

    // Try to get a long-lived token for the pixel
    // Note: This requires business_management permission
    try {
      // Method 1: Try to get System User Token (best for long-term)
      if (businessId) {
        const systemUsersResponse = await axios.get(
          `${FACEBOOK_GRAPH_API_BASE_URL}/${businessId}/system_users`,
          {
            params: {
              access_token: userAccessToken,
            },
          },
        );

        console.log("✅ [TOKEN] System users found:", systemUsersResponse.data);
      }

      // For now, return the user access token
      // In production, you should create a System User Token
      res.json({
        success: true,
        accessToken: userAccessToken,
        tokenType: "user_token",
        message: "تم توليد Access Token بنجاح",
        note: "هذا User Access Token - يُنصح بإنشاء System User Token للإنتاج",
      });
    } catch (tokenError) {
      console.error(
        "⚠️ [TOKEN] Could not generate system token:",
        tokenError.response?.data || tokenError.message,
      );

      // Fallback: return user token
      res.json({
        success: true,
        accessToken: userAccessToken,
        tokenType: "user_token",
        message: "تم توليد Access Token بنجاح",
        warning: "تم استخدام User Token - قد تحتاج لتجديده لاحقاً",
      });
    }
  } catch (error) {
    console.error(
      "❌ [TOKEN] Error generating token:",
      error.response?.data || error.message,
    );
    res.status(500).json({
      success: false,
      error: error.message,
      message: "فشل توليد Access Token",
    });
  }
});

module.exports = router;
