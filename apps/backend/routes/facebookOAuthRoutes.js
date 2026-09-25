const express = require("express");
const router = express.Router();
const axios = require("axios");
const crypto = require("crypto");
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
const verifyToken = require("../utils/verifyToken");
const {
  authenticateToken,
  requireSuperAdmin,
} = require("../middleware/superAdminMiddleware");

// Import environment configuration
const envConfig = require("../config/environment");
const {
  getFacebookOAuthConfig,
  getStoredFacebookOAuthConfig,
  saveFacebookOAuthConfig,
  buildFacebookBackendCallbackUrl,
} = require("../config/facebookAppConfig");

// Facebook OAuth Configuration — single source of truth: facebook-oauth-config.json (managed via /super-admin/facebook-oauth)
function getFacebookAppConfig() {
  const config = getFacebookOAuthConfig();
  const id = config.appId;
  const secret = config.appSecret;
  if (!id || !secret) {
    console.error('❌ [FACEBOOK-OAUTH] FACEBOOK_APP_ID and FACEBOOK_APP_SECRET must be configured via /super-admin/facebook-oauth');
  }
  return { id, secret };
}
const FACEBOOK_GRAPH_API_VERSION = getMetaGraphApiVersion();
const FACEBOOK_GRAPH_API_BASE_URL = getMetaGraphApiBaseUrl();
const FACEBOOK_OAUTH_BASE_URL = getMetaOAuthBaseUrl();
const FACEBOOK_PAGE_WEBHOOK_FIELDS =
  "messages,messaging_postbacks,messaging_optins,messaging_referrals,message_deliveries,message_reads,message_echoes,feed";

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

const getFacebookOAuthTargetPath = (type) => {
  if (type === "pixel") return "/advertising/facebook-pixel";
  if (type === "ads") return "/advertising/facebook-ads/connection";
  return "/settings/facebook-oauth";
};

const sendPopupResponse = (res, data) => {
  const message = { type: "facebook-oauth-callback", ...data };
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <title>Facebook Integration</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #090a0f;
      --card-bg: rgba(255, 255, 255, 0.03);
      --border: rgba(255, 255, 255, 0.08);
      --text: #f3f4f6;
      --text-muted: #9ca3af;
      --primary: #1877f2;
      --success: #10b981;
      --error: #ef4444;
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: 'Cairo', 'Outfit', system-ui, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      overflow: hidden;
      position: relative;
    }

    body::before {
      content: '';
      position: absolute;
      width: 300px;
      height: 300px;
      background: radial-gradient(circle, rgba(24, 119, 242, 0.15) 0%, transparent 70%);
      top: -50px;
      left: -50px;
      z-index: 0;
    }
    body::after {
      content: '';
      position: absolute;
      width: 350px;
      height: 350px;
      background: radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, transparent 70%);
      bottom: -100px;
      right: -100px;
      z-index: 0;
    }

    .container {
      position: relative;
      z-index: 1;
      width: 90%;
      max-width: 440px;
      background: var(--card-bg);
      border: 1px solid var(--border);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-radius: 24px;
      padding: 40px 32px;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
      animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(20px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .icon-wrapper {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      margin: 0 auto 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }

    .icon-wrapper::after {
      content: '';
      position: absolute;
      inset: -8px;
      border-radius: 50%;
      border: 2px dashed rgba(255, 255, 255, 0.1);
      animation: spin 20s linear infinite;
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }

    .success-bg {
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.2);
      color: var(--success);
    }

    .error-bg {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.2);
      color: var(--error);
    }

    h1 {
      font-size: 22px;
      font-weight: 700;
      margin-bottom: 12px;
      letter-spacing: -0.01em;
    }

    p {
      color: var(--text-muted);
      font-size: 14px;
      line-height: 1.6;
      margin-bottom: 32px;
    }

    .btn {
      width: 100%;
      padding: 14px 28px;
      border-radius: 12px;
      font-size: 15px;
      font-weight: 600;
      border: none;
      cursor: pointer;
      transition: all 0.2s ease;
      font-family: inherit;
    }

    .btn-primary {
      background: var(--primary);
      color: white;
      box-shadow: 0 4px 12px rgba(24, 119, 242, 0.3);
    }

    .btn-primary:hover {
      background: #1565c0;
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(24, 119, 242, 0.4);
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.08);
      color: var(--text);
      border: 1px solid var(--border);
    }

    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.12);
      transform: translateY(-2px);
    }

    .btn:active {
      transform: translateY(0);
    }
  </style>
</head>
<body>
  <div class="container">
    <div id="status-icon" class="icon-wrapper"></div>
    <h1 id="status-title">جاري معالجة الطلب...</h1>
    <p id="status-desc">يرجى الانتظار بينما نقوم بإنهاء الإجراءات.</p>
    <button id="close-btn" class="btn" style="display: none;">إغلاق النافذة</button>
  </div>

  <script type="application/json" id="fb-oauth-result">${JSON.stringify(message).replace(/</g, "\\u003c")}</script>
  <script src="/api/v1/facebook-oauth/popup-close.js"></script>
</body>
</html>`);
};

// سكربت خارجي same-origin — CSP بتمنع السكربتات الـ inline في صفحة البوب أب،
// و'script-src self' بيسمح بالملفات من نفس النطاق فقط
router.get("/popup-close.js", (req, res) => {
  res.setHeader("Content-Type", "application/javascript; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.send(`(function () {
  var block = document.getElementById("fb-oauth-result");
  var data = {};
  try {
    data = JSON.parse(block ? block.textContent : "{}");
  } catch (e) {
    data = {};
  }
  data.type = "facebook-oauth-callback";
  var isSuccess = data.success === true;

  try {
    var targetWindow = window.opener || window.parent;
    if (targetWindow) {
      targetWindow.postMessage(data, "*");
    }
  } catch (e) {
    console.error("Failed to post message", e);
  }

  if (isSuccess) {
    setTimeout(function () {
      window.close();
    }, 1500);
  }

  var statusIcon = document.getElementById("status-icon");
  var statusTitle = document.getElementById("status-title");
  var statusDesc = document.getElementById("status-desc");
  var closeBtn = document.getElementById("close-btn");

  if (isSuccess) {
    statusIcon.className = "icon-wrapper success-bg";
    statusIcon.innerHTML = '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
    statusTitle.textContent = "تم الربط بنجاح";
    statusDesc.textContent = "تم ربط حسابك فيسبوك بالمنصة بنجاح. سيتم إغلاق هذه النافذة تلقائياً.";
    closeBtn.className = "btn btn-primary";
    closeBtn.style.display = "block";
  } else {
    statusIcon.className = "icon-wrapper error-bg";
    statusIcon.innerHTML = '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
    statusTitle.textContent = "فشل الربط";

    var errorMsg = data.error || "حدث خطأ غير معروف أثناء الاتصال";
    if (errorMsg === "state_expired") {
      errorMsg = "انتهت صلاحية جلسة الربط لمرور أكثر من 10 دقائق. يرجى إعادة المحاولة من الإعدادات.";
    } else if (errorMsg === "no_company_id") {
      errorMsg = "معرف الشركة مفقود أو غير صالح.";
    } else if (errorMsg === "invalid_state") {
      errorMsg = "جلسة الربط غير صالحة أو منتهية. يرجى إعادة المحاولة من الإعدادات.";
    }

    statusDesc.textContent = errorMsg;
    closeBtn.className = "btn btn-secondary";
    closeBtn.style.display = "block";
  }

  closeBtn.addEventListener("click", function () {
    window.close();
  });
})();`);
});

const sendCallbackRedirect = (res, popup, baseUrl, type, params) => {
  if (popup) {
    sendPopupResponse(res, params);
  } else {
    res.redirect(buildFacebookFrontendRedirectUrl(baseUrl, type, params));
  }
};

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

const buildFacebookOAuthState = ({ companyId, userId, type, returnOrigin, popup }) => {
  const nonce = Math.random().toString(36).substring(7) + Date.now().toString(36);
  const stateParts = [
    companyId,
    userId,
    nonce,
  ];

  if (type) {
    stateParts.push(type);
  }

  if (returnOrigin) {
    stateParts.push(returnOrigin);
  }

  if (popup) {
    stateParts.push("popup");
  }

  const payload = stateParts.join("|");
  const hmac = crypto.createHmac('sha256', getFacebookOAuthConfig().appSecret).update(payload).digest('hex').substring(0, 16);
  return Buffer.from(payload + "|hmac=" + hmac).toString("base64");
};

/**
 * Ads OAuth state — signed JWT-style payload (base64url(payload).signature).
 * The payload carries { cid, uid, ts, type: "ads", returnOrigin } and the
 * signature is an HMAC-SHA256 over the encoded payload using the app secret.
 * Callbacks reject unsigned or forged states BEFORE exchanging the code.
 */
const buildAdsOAuthState = ({ companyId, userId, returnOrigin }) => {
  const payload = {
    cid: companyId,
    uid: userId,
    ts: Date.now(),
    type: "ads",
  };
  if (returnOrigin) {
    payload.returnOrigin = returnOrigin;
  }

  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", getFacebookOAuthConfig().appSecret)
    .update(encoded)
    .digest("hex");

  return `${encoded}.${signature}`;
};

const decodeAdsOAuthState = (state) => {
  if (typeof state !== "string" || !state.includes(".")) {
    return { ok: false, reason: "not_signed" };
  }

  const dotIndex = state.indexOf(".");
  if (dotIndex === -1 || dotIndex === 0 || dotIndex === state.length - 1) {
    return { ok: false, reason: "malformed" };
  }

  const encoded = state.slice(0, dotIndex);
  const signature = state.slice(dotIndex + 1);

  let payload;
  try {
    const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (!parsed || typeof parsed !== "object") {
      return { ok: false, reason: "malformed" };
    }
    payload = parsed;
  } catch (error) {
    return { ok: false, reason: "malformed" };
  }

  let signatureValid = false;
  try {
    const expected = crypto
      .createHmac("sha256", getFacebookOAuthConfig().appSecret)
      .update(encoded)
      .digest("hex");
    signatureValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected),
    );
  } catch (error) {
    signatureValid = false;
  }

  if (!signatureValid) {
    return { ok: false, reason: "bad_signature" };
  }

  return {
    ok: true,
    stateData: {
      cid: payload.cid || payload.companyId,
      uid: payload.uid || payload.userId,
      ts: payload.ts || payload.timestamp || null,
      type: payload.type || "ads",
      returnOrigin: payload.returnOrigin || payload.returnTo || payload.origin,
      popup: Boolean(payload.popup),
    },
  };
};

const decodeFacebookOAuthState = (state, fallbackType) => {
  const normalizedState = decodeURIComponent(state).replace(/ /g, "+");
  const decodedState = Buffer.from(normalizedState, "base64").toString("utf8");

  // Strip HMAC suffix if present and verify
  let hmacValid = false;
  let strippedState = decodedState;
  const hmacIdx = decodedState.lastIndexOf('|hmac=');
  if (hmacIdx !== -1) {
    const sig = decodedState.substring(hmacIdx + 6);
    strippedState = decodedState.substring(0, hmacIdx);
    try {
      const expected = crypto.createHmac('sha256', getFacebookOAuthConfig().appSecret).update(strippedState).digest('hex').substring(0, 16);
      hmacValid = crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
    } catch { hmacValid = false; }
  }

  if (strippedState.includes("|")) {
    const parts = strippedState.split("|");
    const [cid, uid, nonce, ...rest] = parts;

    let type = fallbackType;
    let returnOrigin = null;
    let popup = false;

    for (const val of rest) {
      if (val === "pixel" || val === "page" || val === "ads") {
        type = val;
      } else if (val === "popup") {
        popup = true;
      } else if (val && !returnOrigin && !val.startsWith("hmac=")) {
        returnOrigin = val;
      }
    }

    let ts = null;
    if (nonce && nonce.length >= 8) {
      try {
        const tsBase36 = nonce.slice(-8);
        const parsedTs = parseInt(tsBase36, 36);
        if (!isNaN(parsedTs)) {
          ts = parsedTs;
        }
      } catch (e) {
        // ignore
      }
    }

    const stateData = {
      cid,
      uid,
      ts,
      type,
      returnOrigin,
      popup,
    };

    return { raw: decodedState, stateData, hmacValid };
  }

  try {
    const parsedState = JSON.parse(strippedState);
    return {
      raw: decodedState,
      stateData: {
        ...parsedState,
        ts: parsedState.ts || parsedState.timestamp || null,
        type: parsedState.type || fallbackType,
        returnOrigin:
          parsedState.returnOrigin || parsedState.returnTo || parsedState.origin,
      },
      hmacValid: false,
    };
  } catch {
    return { raw: decodedState, stateData: {}, hmacValid: false };
  }
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
      hmacValid: false,
    };
  }

  try {
    const adsState = decodeAdsOAuthState(state);
    if (adsState.ok) {
      const requestedOrigin = normalizeRequestedFrontendOrigin(
        adsState.stateData.returnOrigin,
      );

      return {
        stateData: adsState.stateData,
        decodedState: state,
        redirectBaseUrl: requestedOrigin || redirectBaseUrl,
        redirectType: adsState.stateData.type || fallbackType,
        parseError: null,
        hmacValid: true,
      };
    }

    const { raw, stateData, hmacValid } = decodeFacebookOAuthState(state, fallbackType);
    const requestedOrigin = normalizeRequestedFrontendOrigin(
      stateData.returnOrigin,
    );

    if (hmacValid === false) {
      console.warn('⚠️ [FACEBOOK-OAUTH] State parameter missing or invalid HMAC signature');
    }

    return {
      stateData,
      decodedState: raw,
      redirectBaseUrl: requestedOrigin || redirectBaseUrl,
      redirectType: stateData.type || fallbackType,
      parseError: null,
      hmacValid,
    };
  } catch (error) {
    return {
      stateData: {},
      decodedState: null,
      redirectBaseUrl,
      redirectType: fallbackType,
      parseError: error,
      hmacValid: false,
    };
  }
};

// Facebook OAuth Scopes - Pages/Messenger (بدون business_management عشان المستخدم يقدر يختار الصفحات)
// بدون pages_read_engagement — Advanced Access غير معتمد في التطبيق حاليًا،
// وطلبه من فيسبوك كان بيمنع الصفحات اللي محتاجته من الظهور في /me/accounts.
// (يُضاف لاحقًا عند تفعيل الكومنتات/المنشورات بعد App Review)
const FACEBOOK_PAGE_SCOPES =
  "public_profile,email,pages_show_list,pages_manage_metadata,pages_messaging,pages_read_user_content,pages_manage_engagement";

// Facebook OAuth Scopes - Pixel/Ads (بـ business_management للوصول للأعمال)
const FACEBOOK_PIXEL_SCOPES =
  "business_management,ads_management,ads_read";

// Facebook OAuth Scopes - Isolated Ads connection
// pages_show_list + pages_manage_ads مطلوبة لإنشاء Ad Creative يشير للصفحة
const FACEBOOK_ADS_SCOPES =
  "business_management,ads_management,ads_read,pages_show_list,pages_read_engagement,pages_manage_ads";

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
        facebookWebhookVerifyToken: req.body?.facebookWebhookVerifyToken,
        whatsappAppId: req.body?.whatsappAppId,
        whatsappAppSecret: req.body?.whatsappAppSecret,
        whatsappConfigId: req.body?.whatsappConfigId,
        whatsappWebhookVerifyToken: req.body?.whatsappWebhookVerifyToken,
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

/**
 * فك صفحة عالقة مربوطة بشركة أخرى — سوبر أدمن فقط
 * POST /api/v1/facebook-oauth/force-disconnect-page
 * يفك ارتباط الصفحة من شركتها الحالية (مع إلغاء اشتراك الويب هوك)
 * حتى يستطيع مالكها ربطها بالشركة الصحيحة.
 */
router.post(
  "/force-disconnect-page",
  authenticateToken,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { pageId } = req.body;

      if (!pageId) {
        return res.status(400).json({
          success: false,
          message: "Page ID مطلوب",
        });
      }

      const page = await getSharedPrismaClient().facebookPage.findUnique({
        where: { pageId },
        select: {
          id: true,
          pageId: true,
          pageName: true,
          companyId: true,
          status: true,
        },
      });

      if (!page) {
        return res.status(404).json({
          success: false,
          message: "الصفحة غير موجودة على المنصة",
        });
      }

      const { disconnectedPages } = await disconnectCompanyFacebookPages({
        companyId: page.companyId,
        pageIds: [page.id],
      });

      await getSharedPrismaClient().skippedFacebookPage.updateMany({
        where: { pageId, isResolved: false },
        data: { isResolved: true, resolvedAt: new Date() },
      });

      return res.json({
        success: true,
        disconnectedPages,
        message: `تم فك ربط "${page.pageName}" من الشركة السابقة — يمكن ربطها الآن من الشركة الصحيحة`,
      });
    } catch (error) {
      console.error("❌ Error force-disconnecting Facebook page:", error);
      return res.status(500).json({
        success: false,
        message: "فشل فك ربط الصفحة",
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
        timeout: 10000,
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
        timeout: 10000,
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

// 🔄 تحويل التوكِن القصير (~ساعة) إلى توكِن طويل العمر (~60 يوم) —
// توكِنات الصفحات المشتقة من التوكِن الطويل تبقى دائمة ولا تنقطع بعد ساعات
const exchangeForLongLivedFacebookToken = async (shortLivedToken) => {
  if (!shortLivedToken) {
    return shortLivedToken;
  }

  const { appId, appSecret } = getFacebookOAuthConfig();
  try {
    const response = await axios.get(
      `${FACEBOOK_GRAPH_API_BASE_URL}/oauth/access_token`,
      {
        params: {
          grant_type: "fb_exchange_token",
          client_id: appId,
          client_secret: appSecret,
          fb_exchange_token: shortLivedToken,
        },
        timeout: 15000,
      },
    );

    const longLivedToken = response.data?.access_token;
    if (typeof longLivedToken === "string" && longLivedToken) {
      console.log("✅ [FACEBOOK-OAUTH] Exchanged short-lived token for long-lived token");
      return longLivedToken;
    }

    return shortLivedToken;
  } catch (error) {
    console.warn(
      "⚠️ [FACEBOOK-OAUTH] Long-lived token exchange failed, keeping short-lived:",
      error.response?.data?.error?.message || error.message,
    );
    return shortLivedToken;
  }
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
      facebookAccountId: true,
      facebookAccount: {
        select: {
          id: true,
          facebookUserId: true,
          facebookUserName: true,
          facebookUserEmail: true,
          status: true,
        },
      },
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
        account: page.facebookAccount
          ? {
              id: page.facebookAccount.id,
              facebookUserId: page.facebookAccount.facebookUserId,
              name: page.facebookAccount.facebookUserName || null,
              email: page.facebookAccount.facebookUserEmail || null,
              status: page.facebookAccount.status,
            }
          : null,
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

  const accountMap = new Map();
  for (const page of pages) {
    if (!page.account) {
      continue;
    }
    const existing = accountMap.get(page.account.id);
    if (existing) {
      existing.pagesCount += 1;
      existing.connectedPagesCount += page.status === "connected" ? 1 : 0;
    } else {
      accountMap.set(page.account.id, {
        id: page.account.id,
        facebookUserId: page.account.facebookUserId,
        name: page.account.name,
        email: page.account.email,
        status: page.account.status,
        pagesCount: 1,
        connectedPagesCount: page.status === "connected" ? 1 : 0,
      });
    }
  }
  const accounts = Array.from(accountMap.values());

  return {
    pages,
    connectedPages,
    disconnectedPages,
    unhealthyPages,
    accounts,
  };
};

const disconnectCompanyFacebookPages = async ({ companyId, pageIds, permanent = false }) => {
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

    if (permanent) {
      // ponytail: delete related posts first (no cascade on FacebookPost)
      await getSharedPrismaClient().facebookPost.deleteMany({
        where: { pageId: page.pageId, companyId },
      });
      await getSharedPrismaClient().facebookPage.delete({
        where: { id: page.id },
      });
    } else {
      await getSharedPrismaClient().facebookPage.update({
        where: { id: page.id },
        data: {
          status: "disconnected",
          disconnectedAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }

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
 * Step 1 (Ads): Generate isolated Facebook Ads OAuth URL
 * GET /api/v1/facebook-oauth/ads-authorize
 * ✅ REQUIRES AUTHENTICATION + OWNER/MANAGER role
 */
router.get(
  "/ads-authorize",
  verifyToken.authenticateToken,
  verifyToken.requireRole(["OWNER", "MANAGER", "COMPANY_ADMIN", "SUPER_ADMIN"]),
  async (req, res) => {
    try {
      const { appId } = getFacebookOAuthConfig();
      const { companyId, popup } = req.query;
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

      const encodedState = buildAdsOAuthState({
        companyId,
        userId: req.user.id,
        returnOrigin,
      });

      const authUrl =
        `${FACEBOOK_OAUTH_BASE_URL}/dialog/oauth?` +
        `client_id=${appId}&` +
        `redirect_uri=${encodeURIComponent(getFacebookRedirectUri("ads"))}&` +
        `scope=${FACEBOOK_ADS_SCOPES}&` +
        `response_type=code&` +
        `auth_type=rerequest&` +
        `state=${encodeURIComponent(encodedState)}`;

      res.json({
        success: true,
        authUrl,
        message: "Facebook Ads authorization URL generated successfully",
      });
    } catch (error) {
      console.error("❌ Error generating Ads auth URL:", error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: "Failed to generate Facebook Ads authorization URL",
      });
    }
  },
);

/**
 * Step 1: Generate Facebook OAuth URL
 * GET /api/v1/facebook-oauth/authorize
 * ✅ REQUIRES AUTHENTICATION
 */
router.get("/authorize", verifyToken.authenticateToken, async (req, res) => {
  try {
    const { appId } = getFacebookOAuthConfig();
    const { companyId, popup } = req.query;
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
      popup: popup === "true",
    });

    const authUrl =
      `${FACEBOOK_OAUTH_BASE_URL}/dialog/oauth?` +
      `client_id=${appId}&` +
      `redirect_uri=${encodeURIComponent(getFacebookRedirectUri("page"))}&` +
      `scope=${FACEBOOK_PAGE_SCOPES}&` +
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
 * Step 0b: Re-consent eligibility check (New Pages Experience page-grant drift)
 * GET /api/v1/facebook-oauth/reauthorize-consent/check?companyId=
 * ✅ REQUIRES AUTHENTICATION
 * Detects the "valid token but zero page grants" state: identity resolves and
 * permissions are granted, yet /me/accounts is empty because the per-user
 * page opt-in was never granted (or was cleared from Business Integrations).
 * Reports which other companies would be affected by a full de-authorization.
 */
router.get("/reauthorize-consent/check", verifyToken.authenticateToken, async (req, res) => {
  try {
    const { companyId } = req.query;

    if (!companyId) {
      return res.status(400).json({ success: false, message: "معرف الشركة مطلوب" });
    }
    if (req.user.companyId !== companyId) {
      return res.status(403).json({ success: false, message: "غير مصرح لك بالوصول لهذه الشركة" });
    }

    const company = await getSharedPrismaClient().company.findUnique({
      where: { id: companyId },
      select: { facebookUserAccessToken: true },
    });
    const token = company?.facebookUserAccessToken;
    if (!token) {
      return res.json({ success: true, eligible: false, reason: "no_token" });
    }

    let identity = null;
    try {
      const meResponse = await axios.get(`${FACEBOOK_GRAPH_API_BASE_URL}/me`, {
        params: { access_token: token, fields: "id,name" },
        timeout: 8000,
      });
      identity = meResponse.data || null;
    } catch (identityError) {
      return res.json({ success: true, eligible: false, reason: "token_invalid" });
    }
    if (!identity?.id) {
      return res.json({ success: true, eligible: false, reason: "token_invalid" });
    }

    let pagesVisible = 0;
    try {
      const accountsResponse = await axios.get(
        `${FACEBOOK_GRAPH_API_BASE_URL}/me/accounts`,
        { params: { access_token: token, fields: "id", limit: 100 }, timeout: 10000 },
      );
      pagesVisible = Array.isArray(accountsResponse.data?.data)
        ? accountsResponse.data.data.length
        : 0;
    } catch (accountsError) {
      pagesVisible = 0;
    }

    if (pagesVisible > 0) {
      return res.json({
        success: true,
        eligible: false,
        reason: "pages_visible",
        pagesVisible,
        facebookUserName: identity.name,
      });
    }

    let affectedCompanies = [];
    try {
      const otherConnections =
        await getSharedPrismaClient().facebookAccountConnection.findMany({
          where: {
            facebookUserId: identity.id,
            companyId: { not: companyId },
            status: "connected",
          },
          select: { id: true, companyId: true },
        });
      for (const connection of otherConnections) {
        const pages = await getSharedPrismaClient().facebookPage.findMany({
          where: { facebookAccountId: connection.id, status: "connected" },
          select: { pageName: true },
        });
        const linkedCompany = await getSharedPrismaClient().company.findUnique({
          where: { id: connection.companyId },
          select: { name: true },
        });
        affectedCompanies.push({
          companyName: linkedCompany?.name || connection.companyId,
          pages: pages.map((page) => page.pageName),
        });
      }
    } catch (affectedError) {
      console.warn(
        "⚠️ [FACEBOOK-OAUTH] reauthorize check: could not list affected companies:",
        affectedError.message,
      );
    }

    return res.json({
      success: true,
      eligible: true,
      facebookUserId: identity.id,
      facebookUserName: identity.name,
      affectedCompanies,
    });
  } catch (error) {
    console.error("❌ Error checking reauthorize eligibility:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to check re-authorization eligibility",
    });
  }
});

/**
 * Step 0c: Full re-consent — de-authorize the app for this Facebook user and
 * return a fresh OAuth URL so the page-selection screen appears again.
 * Only executes when the stored token still sees ZERO pages (nothing to lose).
 * POST /api/v1/facebook-oauth/reauthorize-consent?companyId=
 * ✅ REQUIRES AUTHENTICATION
 */
router.post("/reauthorize-consent", verifyToken.authenticateToken, async (req, res) => {
  try {
    const { companyId } = req.query;

    if (!companyId) {
      return res.status(400).json({ success: false, message: "معرف الشركة مطلوب" });
    }
    if (req.user.companyId !== companyId) {
      return res.status(403).json({ success: false, message: "غير مصرح لك بالوصول لهذه الشركة" });
    }

    const company = await getSharedPrismaClient().company.findUnique({
      where: { id: companyId },
      select: { facebookUserAccessToken: true },
    });
    const token = company?.facebookUserAccessToken;
    if (!token) {
      return res.status(409).json({
        success: false,
        reason: "no_token",
        message: "لا يوجد توكن فيسبوك محفوظ — ابدأ بربط عادي جديد",
      });
    }

    let identity = null;
    try {
      const meResponse = await axios.get(`${FACEBOOK_GRAPH_API_BASE_URL}/me`, {
        params: { access_token: token, fields: "id,name" },
        timeout: 8000,
      });
      identity = meResponse.data || null;
    } catch (identityError) {
      return res.status(409).json({
        success: false,
        reason: "token_invalid",
        message: "التوكن الحالي منتهي — ابدأ بربط عادي جديد",
      });
    }
    if (!identity?.id) {
      return res.status(409).json({
        success: false,
        reason: "token_invalid",
        message: "التوكن الحالي منتهي — ابدأ بربط عادي جديد",
      });
    }

    let pagesVisible = 0;
    try {
      const accountsResponse = await axios.get(
        `${FACEBOOK_GRAPH_API_BASE_URL}/me/accounts`,
        { params: { access_token: token, fields: "id", limit: 100 }, timeout: 10000 },
      );
      pagesVisible = Array.isArray(accountsResponse.data?.data)
        ? accountsResponse.data.data.length
        : 0;
    } catch (accountsError) {
      pagesVisible = 0;
    }
    if (pagesVisible > 0) {
      return res.status(409).json({
        success: false,
        reason: "pages_visible",
        pagesVisible,
        message: "الحساب يرى صفحات بالفعل — استخدم إعادة الربط العادية بدلاً من إعادة الموافقة",
      });
    }

    try {
      await axios.delete(`${FACEBOOK_GRAPH_API_BASE_URL}/me/permissions`, {
        params: { access_token: token },
        timeout: 10000,
      });
      console.log(
        `🔓 [FACEBOOK-OAUTH] App de-authorized for ${identity.name} (${identity.id}) to restore page-selection consent`,
      );
    } catch (deauthError) {
      console.warn(
        "⚠️ [FACEBOOK-OAUTH] De-authorization call failed (continuing with fresh consent):",
        deauthError.response?.data || deauthError.message,
      );
    }

    try {
      await getSharedPrismaClient().facebookAccountConnection.updateMany({
        where: { facebookUserId: identity.id, status: "connected" },
        data: { status: "disconnected", updatedAt: new Date() },
      });
    } catch (connectionError) {
      console.warn(
        "⚠️ [FACEBOOK-OAUTH] Could not mark account connections disconnected:",
        connectionError.message,
      );
    }

    const { appId } = getFacebookOAuthConfig();
    const returnOrigin = getRequestedFrontendOrigin(req);
    const encodedState = buildFacebookOAuthState({
      companyId,
      userId: req.user.id,
      returnOrigin,
      popup: true,
    });
    const authUrl =
      `${FACEBOOK_OAUTH_BASE_URL}/dialog/oauth?` +
      `client_id=${appId}&` +
      `redirect_uri=${encodeURIComponent(getFacebookRedirectUri("page"))}&` +
      `scope=${FACEBOOK_PAGE_SCOPES}&` +
      `response_type=code&` +
      `state=${encodeURIComponent(encodedState)}`;

    return res.json({
      success: true,
      authUrl,
      facebookUserName: identity.name,
      message: "تم إلغاء التوكيل — أكمل الموافقة واختر صفحاتك من الشاشة القادمة",
    });
  } catch (error) {
    console.error("❌ Error executing full re-consent:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to execute full re-consent",
    });
  }
});

/**
 * Handle the isolated Ads OAuth callback flow.
 * Stores the token as a Facebook account source (isolated from Messenger/page
 * tokens), then syncs the user's ad accounts into FacebookAdAccount.
 */
const handleAdsOAuthCallback = async ({
  res,
  companyId,
  userId,
  userAccessToken,
  isPopup,
  callbackRedirectBaseUrl,
}) => {
  const normalizeAdAccountId = (adAccountId) => {
    if (adAccountId === undefined || adAccountId === null) {
      return null;
    }
    const trimmedAccountId = String(adAccountId).trim();
    return trimmedAccountId.startsWith("act_")
      ? trimmedAccountId.slice(4)
      : trimmedAccountId;
  };

  try {
    // 1️⃣ Fetch the Facebook user profile (id/name/email)
    const userResponse = await axios.get(
      `${FACEBOOK_GRAPH_API_BASE_URL}/me`,
      {
        params: {
          access_token: userAccessToken,
          fields: "id,name,email",
        },
        timeout: 10000,
      },
    );
    const facebookUser = userResponse.data || {};
    const facebookUserId = facebookUser.id;
    const facebookUserName = facebookUser.name;
    const facebookUserEmail = facebookUser.email;

    if (!facebookUserId) {
      console.error("❌ [ADS] Could not resolve Facebook user id from /me");
      return sendCallbackRedirect(
        res,
        isPopup,
        callbackRedirectBaseUrl,
        "ads",
        { error: "facebook_user_unavailable" },
      );
    }

    console.log(
      `✅ [ADS] Connected Facebook user: ${facebookUserName} (${facebookUserId})`,
    );

    // 2️⃣ Upsert the isolated connection source for this Facebook account
    const source = await getSharedPrismaClient().facebookAdsConnectionSource.upsert(
      {
        where: {
          companyId_facebookUserId: { companyId, facebookUserId },
        },
        update: {
          accessToken: userAccessToken,
          status: "connected",
          facebookUserName,
          facebookUserEmail,
          lastSyncedAt: new Date(),
          lastError: null,
        },
        create: {
          id: crypto.randomUUID(),
          companyId,
          facebookUserId,
          facebookUserName,
          facebookUserEmail,
          accessToken: userAccessToken,
          status: "connected",
          connectedByUserId: userId,
        },
      },
    );

    console.log(
      `✅ [ADS] Upserted connection source ${source.id} for user ${facebookUserId}`,
    );

    // 3️⃣ Fetch the user's ad accounts from Meta
    const adAccountsResponse = await axios.get(
      `${FACEBOOK_GRAPH_API_BASE_URL}/me/adaccounts`,
      {
        params: {
          access_token: userAccessToken,
          fields: "account_id,name,currency,timezone_name",
          limit: 100,
        },
        timeout: 15000,
      },
    );

    const adAccounts = (adAccountsResponse.data?.data || []).map((account) => ({
      accountId: normalizeAdAccountId(account.account_id || account.id),
      name: account.name,
      currency: account.currency,
      timezone: account.timezone_name,
    })).filter((account) => account.accountId);

    console.log(`✅ [ADS] Found ${adAccounts.length} ad accounts from Meta`);

    // 4️⃣ Deactivate any saved ad accounts not returned by Meta for this company
    if (adAccounts.length > 0) {
      const remoteAccountIds = adAccounts.map((account) => account.accountId);
      const accountIdNotMatch =
        remoteAccountIds.length === 1
          ? { not: remoteAccountIds[0] }
          : { not: { in: remoteAccountIds } };
      await getSharedPrismaClient().facebookAdAccount.updateMany({
        where: {
          companyId,
          accountId: accountIdNotMatch,
        },
        data: { isActive: false },
      });
    }

    // 5️⃣ Upsert each ad account linked to the new connection source
    for (const account of adAccounts) {
      await getSharedPrismaClient().facebookAdAccount.upsert({
        where: {
          companyId_accountId: {
            companyId,
            accountId: account.accountId,
          },
        },
        update: {
          name: account.name,
          currency: account.currency,
          timezone: account.timezone,
          accessToken: userAccessToken,
          connectionSourceId: source.id,
          isActive: true,
        },
        create: {
          id: crypto.randomUUID(),
          companyId,
          accountId: account.accountId,
          name: account.name,
          currency: account.currency,
          timezone: account.timezone,
          accessToken: userAccessToken,
          connectionSourceId: source.id,
          isActive: true,
        },
      });
    }

    console.log(
      `✅ [ADS] Synced ${adAccounts.length} ad accounts for company ${companyId}`,
    );

    // 6️⃣ Redirect back to the isolated ads connection page
    return sendCallbackRedirect(
      res,
      isPopup,
      callbackRedirectBaseUrl,
      "ads",
      {
        success: "ads_connected",
        sourceId: source.id,
        syncedAdAccounts: adAccounts.length,
        activeAdAccountId: adAccounts[0]?.accountId || "",
      },
    );
  } catch (error) {
    console.error(
      "❌ [ADS] Error in ads OAuth callback:",
      error.response?.data || error.message,
    );

    let errorMessage = "callback_failed";
    if (error.response?.data?.error?.message) {
      errorMessage = error.response.data.error.message;
    }

    return sendCallbackRedirect(
      res,
      isPopup,
      callbackRedirectBaseUrl,
      "ads",
      { error: errorMessage },
    );
  }
};

/**
 * Step 2: Handle Facebook OAuth Callback
 * GET /api/v1/facebook-oauth/callback
 * ⚠️ NO AUTHENTICATION - Facebook redirects here directly
 */
router.get("/callback", async (req, res) => {
  let isPopup = false;
  let callbackRedirectBaseUrl = getDefaultFacebookFrontendBaseUrl();
  let callbackRedirectType = "page";

  try {
    const { appId, appSecret } = getFacebookOAuthConfig();
    const { code, state, error } = req.query;
    const {
      decodedState: callbackDecodedState,
      redirectBaseUrl: resolvedRedirectBaseUrl,
      redirectType: resolvedRedirectType,
      stateData: callbackStateData,
      hmacValid: callbackHmacValid,
    } = resolveOAuthCallbackContext(state);
    
    isPopup = callbackStateData?.popup === true;
    if (resolvedRedirectBaseUrl) callbackRedirectBaseUrl = resolvedRedirectBaseUrl;
    if (resolvedRedirectType) callbackRedirectType = resolvedRedirectType;

    console.log("📥 Received Facebook OAuth callback");

    if (state) {
      console.log("🔍 [DEBUG] Raw state from query:", state);
    }
    if (callbackDecodedState) {
      console.log("🔍 [DEBUG] Decoded state string:", callbackDecodedState);
    }

    if (error) {
      console.error(`❌ Facebook OAuth error: ${error}`);
      return sendCallbackRedirect(res, isPopup, callbackRedirectBaseUrl, callbackRedirectType, {
        error: `facebook_oauth_${error}`,
      });
    }

    if (!code || !state) {
      console.error("❌ Missing code or state in callback");
      return sendCallbackRedirect(res, isPopup, callbackRedirectBaseUrl, callbackRedirectType, {
        error: "missing_code_or_state",
      });
    }

    if (!callbackStateData || !callbackStateData.cid) {
      console.error("❌ Invalid state parameters in callback");
      return sendCallbackRedirect(res, isPopup, callbackRedirectBaseUrl, callbackRedirectType, {
        error: "invalid_state",
      });
    }

    const companyId = callbackStateData.cid || callbackStateData.companyId;
    const userId = callbackStateData.uid || callbackStateData.userId;
    const timestamp = callbackStateData.ts || callbackStateData.timestamp;
    const type = callbackStateData.type || callbackRedirectType;

    // 🔐 All flows: reject unsigned/forged states BEFORE token exchange.
    // كل المسارات (page/pixel/ads) بتبني state موقّع HMAC ومعاه timestamp.
    if (callbackHmacValid !== true) {
      console.error("❌ [FACEBOOK-OAUTH] Rejected unsigned or forged OAuth state");
      return sendCallbackRedirect(res, isPopup, callbackRedirectBaseUrl, type, {
        error: "invalid_state",
      });
    }

    if (!companyId) {
      console.error("❌ No companyId in state");
      return sendCallbackRedirect(res, isPopup, callbackRedirectBaseUrl, type, {
        error: "no_company_id",
      });
    }

    if (!timestamp) {
      console.error("❌ [FACEBOOK-OAUTH] State has no timestamp");
      return sendCallbackRedirect(res, isPopup, callbackRedirectBaseUrl, type, {
        error: "invalid_state",
      });
    }

    const stateAge = Date.now() - timestamp;
    const maxStateAge = 10 * 60 * 1000; // 10 minutes
    if (stateAge > maxStateAge) {
      console.error("❌ State expired");
      return sendCallbackRedirect(res, isPopup, callbackRedirectBaseUrl, type, {
        error: "state_expired",
      });
    }

    const company = await getSharedPrismaClient().company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      console.error(`❌ Company not found: ${companyId}`);
      return sendCallbackRedirect(res, isPopup, callbackRedirectBaseUrl, type, {
        error: "company_not_found",
      });
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
        timeout: 15000,
      },
    );

    const { access_token: shortLivedToken, expires_in } = tokenResponse.data;
    // 🔄 تحويل فوري لتوكِن طويل العمر قبل أي استخدام أو تخزين
    const userAccessToken = await exchangeForLongLivedFacebookToken(shortLivedToken);
    console.log("✅ Got user access token");

    // 🔗 Resolve the Facebook user identity so every page links to the
    // account connection that granted it (enables multi-account linking).
    // Page linking REQUIRES a resolved identity: saving the company token
    // without it re-creates the "pages stuck under the old account" bug
    // (silent half-link), so we abort loudly instead — BEFORE any DB write.
    const isPageOAuthFlow = type !== "pixel" && type !== "ads";
    let facebookUserId = null;
    let facebookUserName = null;
    let facebookUserEmail = null;
    let identityResolved = false;
    for (let identityAttempt = 1; identityAttempt <= 2 && !identityResolved; identityAttempt++) {
      try {
        const meResponse = await axios.get(
          `${FACEBOOK_GRAPH_API_BASE_URL}/me`,
          {
            params: {
              access_token: userAccessToken,
              fields: "id,name,email",
            },
            timeout: 10000,
          },
        );
        facebookUserId = meResponse.data?.id || null;
        facebookUserName = meResponse.data?.name || null;
        facebookUserEmail = meResponse.data?.email || null;
        identityResolved = Boolean(facebookUserId);
        console.log(`👤 [FACEBOOK-OAUTH] OAuth account: ${facebookUserName} (${facebookUserId})`);
      } catch (meError) {
        console.warn(
          `⚠️ [FACEBOOK-OAUTH] Could not resolve Facebook user identity (attempt ${identityAttempt}/2):`,
          meError.response?.data || meError.message,
        );
        if (identityAttempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    }

    if (!identityResolved && isPageOAuthFlow) {
      console.error("❌ [FACEBOOK-OAUTH] Aborting page linking: identity unresolved — company token NOT saved to avoid stale page attribution");
      return sendCallbackRedirect(res, isPopup, callbackRedirectBaseUrl, type, {
        error: "account_identity_failed",
      });
    }

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
      return sendCallbackRedirect(res, isPopup, callbackRedirectBaseUrl, type, {
        success: "pixel_connected",
      });
    }

    if (type === "ads") {
      return handleAdsOAuthCallback({
        res,
        companyId,
        userId,
        userAccessToken,
        isPopup,
        callbackRedirectBaseUrl,
      });
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
      return sendCallbackRedirect(res, isPopup, callbackRedirectBaseUrl, type, {
        success: true,
        pages: 0,
        message: "no_pages_found",
      });
    }

    // حفظ الصفحات وكشف المتخطاة قبل إرسال الرد حتى تصل النتيجة الحقيقية
    // للمستخدم لحظة إغلاق البوب أب (مش بعد ساعة)
    const savedPages = [];
    const skippedPages = [];
    const failedPages = [];

    // 🔗 Upsert the Facebook account connection so every page fetched in
    // this OAuth session is refreshable from THIS account's token even
    // after other accounts connect to the same company.
    let accountConnectionId = null;
    if (facebookUserId) {
      try {
        const accountConnection =
          await getSharedPrismaClient().facebookAccountConnection.upsert({
            where: {
              companyId_facebookUserId: { companyId, facebookUserId },
            },
            update: {
              accessToken: userAccessToken,
              facebookUserName: facebookUserName || undefined,
              facebookUserEmail: facebookUserEmail || undefined,
              status: "connected",
              lastSyncedAt: new Date(),
              connectedByUserId: userId || undefined,
              updatedAt: new Date(),
            },
            create: {
              companyId,
              facebookUserId,
              facebookUserName,
              facebookUserEmail,
              accessToken: userAccessToken,
              status: "connected",
              connectedByUserId: userId || null,
              connectedAt: new Date(),
              updatedAt: new Date(),
            },
          });
        accountConnectionId = accountConnection.id;
        console.log(
          `✅ [OAUTH] Account connection ready for ${facebookUserName} (${facebookUserId}): ${accountConnectionId}`,
        );
      } catch (accountError) {
        // Page linking without a persisted account connection re-creates the
        // stale-attribution bug (pages silently keep the previous account),
        // so abort loudly instead of continuing half-linked.
        console.error(
          "❌ [OAUTH] Could not save Facebook account connection — aborting page linking:",
          accountError.message,
        );
        return sendCallbackRedirect(res, isPopup, callbackRedirectBaseUrl, type, {
          error: "account_link_failed",
        });
      }
    }

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
        const pageDataToUpdate = {
          pageAccessToken: page.access_token,
          pageName: page.name,
          status: "connected",
          connectedAt: new Date(),
          disconnectedAt: null,
          companyId: companyId,
          ...(accountConnectionId ? { facebookAccountId: accountConnectionId } : {}),
        };

        const pageDataToCreate = {
          id: uuidv4(),
          pageId: page.id,
          pageName: page.name,
          pageAccessToken: page.access_token,
          status: "connected",
          connectedAt: new Date(),
          updatedAt: new Date(),
          companyId: companyId,
          ...(accountConnectionId ? { facebookAccountId: accountConnectionId } : {}),
        };

        // ✅ الحفظ دائمًا مع ربط الحساب — لا يوجد fallback يسقط الربط بصمت
        if (existingPageInDB && existingPageInDB.companyId === companyId) {
          await getSharedPrismaClient().facebookPage.update({
            where: { pageId: page.id },
            data: pageDataToUpdate,
          });
        } else {
          await getSharedPrismaClient().facebookPage.upsert({
            where: { pageId: page.id },
            update: pageDataToUpdate,
            create: pageDataToCreate,
          });
        }

        savedPages.push({
          pageId: page.id,
          pageAccessToken: page.access_token,
        });
      } catch (pageError) {
        console.error(
          `❌ [OAUTH] Error processing page ${page.name}:`,
          pageError.message,
        );
        failedPages.push({
          pageId: page.id,
          pageName: page.name,
          reason: pageError.message,
        });
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
          `❌ [OAUTH] Error saving skipped pages:`,
          skipError.message,
        );
      }
    }

    sendCallbackRedirect(res, isPopup, callbackRedirectBaseUrl, type, {
      success: true,
      pages: savedPages.length,
      skipped: skippedPages.length,
      failed: failedPages.length,
      failedPages: failedPages.map((fp) => ({
        pageId: fp.pageId,
        pageName: fp.pageName,
      })),
      skippedPages: skippedPages.map((sp) => ({
        pageId: sp.pageId,
        pageName: sp.pageName,
        reason: sp.reason,
      })),
      companyId,
    });

    // المعالجة البطيئة (اشتراكات الويب هوك + بيانات إنستجرام) بالتوازي في الخلفية
    setImmediate(async () => {
      try {
        await Promise.all(
          savedPages.map(async (page) => {
            // Subscribe to webhooks (Facebook Messenger)
            subscribePageToApp(page.pageId, page.pageAccessToken).catch(() => { });

            // 🆕 Fetch and store linked Instagram Business Account
            try {
              const igResponse = await axios.get(
                `${FACEBOOK_GRAPH_API_BASE_URL}/${page.pageId}`,
                {
                  params: {
                    fields: "instagram_business_account",
                    access_token: page.pageAccessToken,
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
                        access_token: page.pageAccessToken,
                      },
                      timeout: 10000,
                    },
                  );
                  igAccountName = igNameResponse.data?.name || igNameResponse.data?.username || null;
                } catch (_) { /* ignore */ }

                await getSharedPrismaClient().facebookPage.update({
                  where: { pageId: page.pageId },
                  data: {
                    instagramAccountId: igAccountId,
                    instagramAccountName: igAccountName,
                  },
                });
                console.log(`📸 [BG-OAuth] Linked Instagram account ${igAccountId} (${igAccountName}) to page ${page.pageId}`);

                // Subscribe Instagram account to webhooks for DM delivery
                try {
                  await axios.post(
                    `${FACEBOOK_GRAPH_API_BASE_URL}/${igAccountId}/subscribed_apps`,
                    {},
                    {
                      params: {
                        subscribed_fields: "messages,messaging_seen",
                        access_token: page.pageAccessToken,
                      },
                      timeout: 10000,
                    },
                  );
                  console.log(`✅ [BG-OAuth] Subscribed Instagram account ${igAccountId} to webhooks`);
                } catch (igSubError) {
                  console.warn(`⚠️ [BG-OAuth] Could not subscribe Instagram account ${igAccountId} to webhooks:`, igSubError.response?.data?.error?.message || igSubError.message);
                }
              }
            } catch (igError) {
              console.warn(`⚠️ [BG-OAuth] Could not fetch Instagram account for page ${page.pageId}:`, igError.message);
            }
          }),
        );
        console.log(
          `✅ [BG-OAuth] Finished background processing for ${savedPages.length} pages.`,
        );
      } catch (fatalBgError) {
        console.error(
          "❌ [BG-OAuth] Fatal error in background processing:",
          fatalBgError.message,
        );
      }
    });
  } catch (error) {
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
      errorMessage =
        error.response.data?.error?.message ||
        `Facebook API error: ${error.response.status} ${error.response.statusText}`;
    } else if (error.request) {
      errorMessage = "network_error";
    } else {
      errorMessage = error.message;
    }

    let userError = errorMessage;
    if (error.response && error.response.status) {
      userError = `Facebook API error (${error.response.status}): ${errorMessage}`;
    }

    return sendCallbackRedirect(res, isPopup, callbackRedirectBaseUrl, callbackRedirectType, {
      error: userError,
    });
  }
});

/**
 * 🎯 NEW: Test webhook subscription for a specific page
 * POST /api/v1/facebook-oauth/test-subscription
 * ✅ REQUIRES AUTHENTICATION
 */
router.post("/test-subscription", verifyToken.authenticateToken, async (req, res) => {
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
router.get("/status", verifyToken.authenticateToken, async (req, res) => {
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
    const { pages, connectedPages, disconnectedPages, unhealthyPages, accounts } =
      await loadCompanyFacebookPages(companyId, {
        validateTokens: shouldValidateTokens,
      });

    const company = await getSharedPrismaClient().company.findUnique({
      where: { id: companyId },
      select: { facebookUserAccessToken: true },
    });

    let facebookUser = null;
    if (company?.facebookUserAccessToken) {
      try {
        const fbUserResponse = await axios.get(
          `${FACEBOOK_GRAPH_API_BASE_URL}/me`,
          {
            params: {
              access_token: company.facebookUserAccessToken,
              fields: "id,name,picture",
            },
            timeout: 5000,
          }
        );
        if (fbUserResponse.data && fbUserResponse.data.name) {
          facebookUser = {
            id: fbUserResponse.data.id,
            name: fbUserResponse.data.name,
            picture: fbUserResponse.data.picture?.data?.url || null,
          };
        }
      } catch (fbUserError) {
        console.warn(
          "⚠️ [FACEBOOK-OAUTH] Could not fetch Facebook user profile for status:",
          fbUserError.response?.data || fbUserError.message
        );
      }
    }

    // 🔍 كشف تناقض نسبة الصفحات لحساب الربط (attribution drift):
    // - stale: الصفحة مسبوطة بحساب ربط مختلف عن آخر حساب اتعمل منه ربط للشركة
    //   (نتيجة شائعة لربط قديم فشل بصمت قبل حماية account_identity_failed).
    // - unattributed: الصفحة مش مربوطة بأي حساب فيسبوك (سجلات قديمة قبل
    //   حسابات الربط المتعددة) — تجديد التوكن ليها أقل ضمان.
    // ملاحظة: تعدد الحسابات مشروع، فده مؤشر factual مش خطأ إجباري.
    const pagesWithAttribution = pages.map((page) => {
      let attribution = "ok";
      if (!page.account) {
        attribution = "unattributed";
      } else if (
        facebookUser?.id &&
        page.account.facebookUserId &&
        page.account.facebookUserId !== facebookUser.id
      ) {
        attribution = "stale";
      }
      return { ...page, attribution };
    });
    const attributionIssues = pagesWithAttribution.filter(
      (page) => page.attribution !== "ok"
    ).length;

    res.json({
      success: true,
      connected: connectedPages.length > 0,
      tokenValidation: shouldValidateTokens ? "live" : "skipped",
      pagesCount: pages.length,
      connectedPagesCount: connectedPages.length,
      disconnectedPagesCount: disconnectedPages.length,
      pages: pagesWithAttribution,
      accounts,
      needsAttention:
        unhealthyPages.length > 0 || disconnectedPages.length > 0 || attributionIssues > 0,
      unhealthyPagesCount: unhealthyPages.length,
      attributionIssues,
      facebookUser,
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
router.delete("/disconnect", verifyToken.authenticateToken, async (req, res) => {
  try {
    const { pageIds, permanent } = req.body;
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
        permanent: permanent === true,
      });

    res.json({
      success: true,
      disconnectedCount: disconnectedPages.length,
      disconnectedPages,
      missingPageIds,
      message: permanent
        ? `تم حذف ${disconnectedPages.length} صفحة نهائياً بنجاح`
        : `تم قطع الاتصال مع ${disconnectedPages.length} صفحة بنجاح`,
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
router.post("/reconnect", verifyToken.authenticateToken, async (req, res) => {
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
router.get("/skipped-pages", verifyToken.authenticateToken, async (req, res) => {
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
router.post("/resolve-skipped", verifyToken.authenticateToken, async (req, res) => {
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
router.get("/debug", verifyToken.authenticateToken, async (req, res) => {
  try {
    const { companyId } = req.query;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: "Company ID is required",
      });
    }

    // Verify user has access to this company
    if (req.user.companyId !== companyId && req.user.role !== "SUPER_ADMIN") {
      return res.status(403).json({
        success: false,
        error: "Unauthorized access to company",
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
router.get(["/pixel-authorize", "/auth"], verifyToken.authenticateToken, async (req, res) => {
  try {
    const { appId } = getFacebookOAuthConfig();
    const companyId = req.query?.companyId || req.user?.companyId;
    const returnOrigin = getRequestedFrontendOrigin(req);

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: "Company ID is required",
        message: "معرف الشركة مطلوب",
      });
    }

    // Verify user has access to this company
    if (req.user?.companyId && req.user.companyId !== companyId) {
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
      `scope=${FACEBOOK_PIXEL_SCOPES}&` +
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
  let callbackRedirectBaseUrl = getDefaultFacebookFrontendBaseUrl();
  let callbackRedirectType = "pixel";

  try {
    const { appId, appSecret } = getFacebookOAuthConfig();
    const { code, state, error } = req.query;
    const {
      decodedState: callbackDecodedState,
      redirectBaseUrl: resolvedRedirectBaseUrl,
      redirectType: resolvedRedirectType,
      stateData: callbackStateData,
      hmacValid: callbackHmacValid,
    } = resolveOAuthCallbackContext(state, "pixel");

    if (resolvedRedirectBaseUrl) callbackRedirectBaseUrl = resolvedRedirectBaseUrl;
    if (resolvedRedirectType) callbackRedirectType = resolvedRedirectType;

    console.log("📥 [PIXELS] Received Facebook OAuth callback for Pixels");

    if (state) {
      console.log("🔍 [PIXELS DEBUG] Raw state from query:", state);
    }
    if (callbackDecodedState) {
      console.log(
        "🔍 [PIXELS DEBUG] Decoded state string:",
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

    if (!callbackStateData || !callbackStateData.cid) {
      console.error("❌ [PIXELS] Invalid state parameters in callback");
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

    const companyId = callbackStateData.cid || callbackStateData.companyId;
    const userId = callbackStateData.uid || callbackStateData.userId;
    const timestamp = callbackStateData.ts || callbackStateData.timestamp;
    const type = callbackStateData.type || callbackRedirectType;

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

    // 🔐 رفض الـ state غير الموقّع أو المزوّر قبل تبادل الكود
    if (callbackHmacValid !== true) {
      console.error("❌ [PIXELS] Rejected unsigned or forged OAuth state");
      return res.redirect(
        buildFacebookFrontendRedirectUrl(callbackRedirectBaseUrl, type, {
          error: "invalid_state",
        }),
      );
    }

    if (!timestamp) {
      console.error("❌ [PIXELS] State has no timestamp");
      return res.redirect(
        buildFacebookFrontendRedirectUrl(callbackRedirectBaseUrl, type, {
          error: "invalid_state",
        }),
      );
    }

    const pixelStateAge = Date.now() - timestamp;
    const pixelMaxStateAge = 10 * 60 * 1000; // 10 minutes
    if (pixelStateAge > pixelMaxStateAge) {
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
        timeout: 15000,
      },
    );

    const { access_token: pixelShortLivedToken } = tokenResponse.data;
    // 🔄 تحويل فوري لتوكِن طويل العمر قبل التخزين
    const pixelAccessToken = await exchangeForLongLivedFacebookToken(pixelShortLivedToken);
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
router.get("/pixels", verifyToken.authenticateToken, async (req, res) => {
  try {
    const companyId = req.query?.companyId || req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: "Company ID is required",
        message: "معرف الشركة مطلوب",
      });
    }

    // Verify user has access to this company
    if (req.user?.companyId && req.user.companyId !== companyId) {
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
router.post(["/generate-pixel-token", "/token"], verifyToken.authenticateToken, async (req, res) => {
  try {
    const companyId = req.query?.companyId || req.user?.companyId || req.body?.companyId;
    const { pixelId, businessId } = req.body;

    if (!companyId || !pixelId) {
      return res.status(400).json({
        success: false,
        error: "Company ID and Pixel ID are required",
        message: "معرف الشركة و Pixel ID مطلوبان",
      });
    }

    // Verify user has access to this company
    if (req.user?.companyId && req.user.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        error: "Unauthorized access to company",
        message: "غير مصرح لك بالوصول لهذه الشركة",
      });
    }

    console.log("🔑 [TOKEN] Generating access token for pixel:", pixelId);

    // Prioritize real Meta User / Ads tokens that have Pixel management & CAPI permissions
    const company = await getSharedPrismaClient().company.findUnique({
      where: { id: companyId },
      select: {
        facebookPixelAccessToken: true,
        facebookAdsAccessToken: true,
        facebookUserAccessToken: true,
      },
    });

    let userAccessToken =
      company?.facebookPixelAccessToken ||
      company?.facebookAdsAccessToken ||
      company?.facebookUserAccessToken;

    // If no direct account token, fall back to connected page token
    if (!userAccessToken) {
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

      if (pages && pages.length > 0) {
        userAccessToken = pages[0].pageAccessToken;
      }
    }

    if (!userAccessToken) {
      return res.status(404).json({
        success: false,
        message: "لم يتم العثور على حساب Facebook أو صفحات مربوطة",
      });
    }

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

/**
 * 🔄 v26.0: Silent Background Token Refresh Endpoint
 * POST /api/v1/facebook-oauth/refresh-token
 * تجديد استباقي للتوكن طويل العمر قبل انقضاء صلاحيته
 */
router.post("/refresh-token", verifyToken.authenticateToken, async (req, res) => {
  try {
    const { companyId } = req.body;
    if (!companyId) {
      return res.status(400).json({ success: false, message: "Company ID is required" });
    }

    const company = await getSharedPrismaClient().company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        facebookUserAccessToken: true,
        facebookPixelAccessToken: true,
        facebookAdsAccessToken: true
      }
    });

    if (!company) {
      return res.status(404).json({ success: false, message: "Company not found" });
    }

    const activeToken = company.facebookAdsAccessToken || company.facebookPixelAccessToken || company.facebookUserAccessToken;
    if (!activeToken) {
      return res.status(400).json({ success: false, message: "No active token found to refresh" });
    }

    const refreshedToken = await exchangeForLongLivedFacebookToken(activeToken);

    if (refreshedToken && refreshedToken !== activeToken) {
      await getSharedPrismaClient().company.update({
        where: { id: companyId },
        data: {
          facebookUserAccessToken: refreshedToken,
          ...(company.facebookPixelAccessToken ? { facebookPixelAccessToken: refreshedToken } : {}),
          ...(company.facebookAdsAccessToken ? { facebookAdsAccessToken: refreshedToken } : {})
        }
      });
      console.log(`✅ [TOKEN-REFRESH] Successfully refreshed Facebook token for company ${companyId}`);
      return res.json({ success: true, message: "Token refreshed successfully", refreshed: true });
    }

    res.json({ success: true, message: "Token is already healthy and up to date", refreshed: false });
  } catch (error) {
    console.error("❌ [TOKEN-REFRESH] Error refreshing token:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
module.exports.exchangeForLongLivedFacebookToken = exchangeForLongLivedFacebookToken;
