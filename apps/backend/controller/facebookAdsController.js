/**
 * Facebook Ads Controller
 *
 * Controller للتعامل مع طلبات Facebook Ads Management
 */

const FacebookAdsService = require("../services/facebookAdsService");
const facebookAdsDecisionService = require("../services/facebookAdsDecisionService");
const { FacebookAdLibraryService } = require("../services/facebookAdLibraryService");
const { getSharedPrismaClient } = require("../services/sharedDatabase");
const { validateFacebookPageAccessToken } = require("../utils/facebookPageTokenUtils");
const crypto = require("crypto");
const axios = require("axios");
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

const PRODUCT_LAUNCH_ALLOWED_HOSTS = [
  "maxp.online",
  "mokhtarelhenawy.online",
];
const PRODUCT_LAUNCH_DEV_HOSTS = [
  "localhost",
  "127.0.0.1",
];

/**
 * جلب Access Token للشركة
 */
async function getCompanyAdsAccessToken(companyId) {
  try {
    const company = await getSharedPrismaClient().company.findUnique({
      where: { id: companyId },
      select: {
        facebookAdsAccessToken: true,
        facebookUserAccessToken: true,
      },
    });

    // أولوية لـ Ads Access Token، ثم User Access Token
    const companyToken =
      company?.facebookAdsAccessToken ||
      company?.facebookUserAccessToken ||
      null;

    if (companyToken) return companyToken;

    // Fallback: قراءة من ConnectionSource إذا لم يوجد token في Company
    const source = await getSharedPrismaClient().facebookAdsConnectionSource.findFirst({
      where: { companyId, status: "connected" },
      select: { accessToken: true },
      orderBy: { updatedAt: "desc" },
    });
    return source?.accessToken || null;
  } catch (error) {
    console.error("❌ Error getting company access token:", error);
    return null;
  }
}

async function getCompanyFacebookTokens(companyId) {
  try {
    const company = await getSharedPrismaClient().company.findUnique({
      where: { id: companyId },
      select: {
        facebookAdsAccessToken: true,
        facebookUserAccessToken: true,
      },
    });

    return {
      adsAccessToken: company?.facebookAdsAccessToken || null,
      userAccessToken: company?.facebookUserAccessToken || null,
    };
  } catch (error) {
    console.error("❌ Error getting company Facebook tokens:", error);
    return {
      adsAccessToken: null,
      userAccessToken: null,
    };
  }
}

async function getCompanyPageAccessToken(companyId) {
  const tokens = await getCompanyFacebookTokens(companyId);
  return tokens.userAccessToken || tokens.adsAccessToken || null;
}

function sanitizeFacebookAdAccountForClient(adAccount) {
  if (!adAccount || typeof adAccount !== "object") {
    return adAccount;
  }

  const safeAdAccount = { ...adAccount };
  delete safeAdAccount.accessToken;
  delete safeAdAccount.access_token;

  return safeAdAccount;
}

function toNullableNumber(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function toMajorCurrencyUnit(value) {
  const numericValue = toNullableNumber(value);
  return numericValue === null ? null : numericValue / 100;
}

function getFacebookAdAccountStatusLabel(statusCode) {
  const normalizedStatus = String(statusCode || "").trim();
  const statusLabels = {
    "1": "نشط",
    "2": "معطل",
    "3": "غير مستقر",
    "7": "في انتظار المراجعة",
    "8": "في انتظار التسوية",
    "9": "في فترة سماح",
    "100": "مغلق",
    "101": "معلق",
    "201": "أي تسوية مطلوبة",
  };

  return statusLabels[normalizedStatus] || normalizedStatus || "غير معروف";
}

function isAllowedProductLaunchHost(hostname) {
  const normalizedHostname = String(hostname || "").toLowerCase();
  const allowedHosts =
    process.env.NODE_ENV === "production"
      ? PRODUCT_LAUNCH_ALLOWED_HOSTS
      : PRODUCT_LAUNCH_ALLOWED_HOSTS.concat(PRODUCT_LAUNCH_DEV_HOSTS);

  return allowedHosts.some(
    (allowedHost) =>
      normalizedHostname === allowedHost ||
      normalizedHostname.endsWith(`.${allowedHost}`),
  );
}

function parseProductLaunchUrl(rawUrl) {
  const parsedUrl = new URL(String(rawUrl || "").trim());
  const protocol = parsedUrl.protocol.toLowerCase();

  if (!["http:", "https:"].includes(protocol)) {
    throw new Error("Product URL must use http or https");
  }

  if (!isAllowedProductLaunchHost(parsedUrl.hostname)) {
    throw new Error("Product URL host is not allowed for ad launch metadata");
  }

  const segments = parsedUrl.pathname.split("/").filter(Boolean);
  const productIndex = segments.indexOf("product");
  const productSlug =
    productIndex >= 0
      ? segments[productIndex + 1]
      : segments[segments.length - 1];

  if (!productSlug) {
    throw new Error("Product slug is missing from URL");
  }

  return {
    url: parsedUrl.toString(),
    origin: parsedUrl.origin,
    hostname: parsedUrl.hostname,
    storeSlug: parsedUrl.hostname.split(".")[0] || null,
    productSlug,
  };
}

function decodeProductLaunchSlug(value) {
  const rawValue = String(value || "").trim();
  if (!rawValue) {
    return "";
  }

  try {
    return decodeURIComponent(rawValue);
  } catch {
    return rawValue;
  }
}

const PRODUCT_LAUNCH_METADATA_PRODUCT_SELECT = Object.freeze({
  id: true,
  name: true,
  description: true,
  sku: true,
  price: true,
  comparePrice: true,
  category: {
    select: {
      name: true,
    },
  },
  isActive: true,
  isHidden: true,
  stock: true,
  trackInventory: true,
  mainImage: true,
  images: true,
  slug: true,
  productVariants: {
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: {
      image: true,
      mainImage: true,
      images: true,
    },
  },
});

function stripHtml(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeProductLaunchImageUrl(value, origin) {
  if (!value || typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return null;
  }

  try {
    const url = trimmedValue.startsWith("//")
      ? new URL(`https:${trimmedValue}`)
      : new URL(trimmedValue, origin);

    if (!["http:", "https:"].includes(url.protocol)) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

function collectProductLaunchImages(product, origin) {
  const images = [];
  const seen = new Set();

  const addImage = (value) => {
    if (!value) return;

    if (Array.isArray(value)) {
      value.forEach(addImage);
      return;
    }

    if (typeof value === "string") {
      const trimmedValue = value.trim();

      if (trimmedValue.startsWith("[") || trimmedValue.startsWith("{")) {
        try {
          addImage(JSON.parse(trimmedValue));
          return;
        } catch {
          // Fall through and treat it as a normal URL/path.
        }
      }

      const normalizedUrl = normalizeProductLaunchImageUrl(trimmedValue, origin);
      if (normalizedUrl && !seen.has(normalizedUrl)) {
        seen.add(normalizedUrl);
        images.push(normalizedUrl);
      }
      return;
    }

    if (typeof value === "object") {
      addImage(
        value.fullUrl ||
          value.url ||
          value.src ||
          value.image ||
          value.mainImage ||
          value.thumbnail,
      );
    }
  };

  addImage(product?.mainImage);
  addImage(product?.images);
  (product?.variants || product?.productVariants || []).forEach((variant) => {
    addImage(variant?.image);
    addImage(variant?.mainImage);
    addImage(variant?.images);
  });

  return images;
}

function normalizeFacebookBusiness(business) {
  if (!business || typeof business !== "object") {
    return null;
  }

  return {
    id: business.id || null,
    name: business.name || null,
  };
}

function getSafeFundingSourceSummary(accountData) {
  const details =
    accountData?.funding_source_details &&
    typeof accountData.funding_source_details === "object"
      ? accountData.funding_source_details
      : {};

  return {
    hasFundingSource: Boolean(
      accountData?.funding_source ||
        details.id ||
        details.type ||
        details.display_string ||
        details.displayString,
    ),
    type: details.type || null,
    display:
      details.display_string ||
      details.displayString ||
      (details.type ? String(details.type) : null),
  };
}

function buildAdAccountBillingHealth(accountData) {
  const fundingSource = getSafeFundingSourceSummary(accountData);
  const statusCode = String(accountData?.account_status || "").trim() || null;
  const disableReason = accountData?.disable_reason || null;
  const balanceRaw = toNullableNumber(accountData?.balance);
  const spendCapRaw = toNullableNumber(accountData?.spend_cap);
  const amountSpentRaw = toNullableNumber(accountData?.amount_spent);
  const adTrustDslRaw = toNullableNumber(accountData?.adtrust_dsl);
  const warnings = [];

  if (!fundingSource.hasFundingSource) {
    warnings.push({
      code: "MISSING_FUNDING_SOURCE",
      message:
        "لا توجد وسيلة دفع ظاهرة من Meta لهذا الحساب. قد لا يستطيع نشر إعلانات نشطة.",
    });
  }

  if (statusCode && statusCode !== "1") {
    warnings.push({
      code: "ACCOUNT_STATUS_ATTENTION",
      message: `حالة الحساب تحتاج مراجعة: ${getFacebookAdAccountStatusLabel(statusCode)}.`,
    });
  }

  if (disableReason) {
    warnings.push({
      code: "DISABLE_REASON",
      message: `Meta أرجعت سبب تعطيل/تقييد: ${disableReason}.`,
    });
  }

  return {
    currency: accountData?.currency || null,
    business: normalizeFacebookBusiness(accountData?.business),
    accountStatusCode: statusCode,
    accountStatusLabel: getFacebookAdAccountStatusLabel(statusCode),
    isAccountUsable: !statusCode || statusCode === "1",
    disableReason,
    hasFundingSource: fundingSource.hasFundingSource,
    fundingSourceType: fundingSource.type,
    fundingSourceDisplay: fundingSource.display,
    amountSpent: toMajorCurrencyUnit(amountSpentRaw),
    amountSpentRaw,
    balance: toMajorCurrencyUnit(balanceRaw),
    balanceRaw,
    spendCap: toMajorCurrencyUnit(spendCapRaw),
    spendCapRaw,
    adTrustDsl: toMajorCurrencyUnit(adTrustDslRaw),
    adTrustDslRaw,
    warnings,
  };
}

function sanitizeRemoteFacebookAdAccountForClient(accountData) {
  const safeAccount = sanitizeFacebookAdAccountForClient(accountData) || {};

  delete safeAccount.funding_source;
  delete safeAccount.funding_source_details;

  safeAccount.business = normalizeFacebookBusiness(accountData?.business);
  safeAccount.billingHealth = buildAdAccountBillingHealth(accountData);

  return safeAccount;
}

function parseJsonObject(value) {
  if (!value) {
    return {};
  }

  if (typeof value === "object" && !Array.isArray(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return {};
  }

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch (error) {
    return {};
  }
}

function stringifyJson(value, fallback = "{}") {
  try {
    return JSON.stringify(value ?? {});
  } catch (error) {
    return fallback;
  }
}

function buildCampaignMetaSettings(fbCampaign = {}, adAccount = {}) {
  const normalizedAccountId = normalizeAdAccountId(
    fbCampaign.account_id || adAccount.accountId,
  );

  return {
    accountId: normalizedAccountId || null,
    adAccountId: adAccount.id || null,
    adAccountName: adAccount.name || null,
    configuredStatus:
      fbCampaign.configured_status || fbCampaign.status || null,
    effectiveStatus:
      fbCampaign.effective_status ||
      fbCampaign.configured_status ||
      fbCampaign.status ||
      null,
    createdTime: fbCampaign.created_time || null,
    updatedTime: fbCampaign.updated_time || null,
    startTime: fbCampaign.start_time || null,
    stopTime: fbCampaign.stop_time || null,
    source: "META",
  };
}

function buildAdSetMetaSettings(fbAdSet = {}) {
  return {
    configuredStatus: fbAdSet.configured_status || fbAdSet.status || null,
    effectiveStatus:
      fbAdSet.effective_status ||
      fbAdSet.configured_status ||
      fbAdSet.status ||
      null,
    createdTime: fbAdSet.created_time || null,
    updatedTime: fbAdSet.updated_time || null,
    startTime: fbAdSet.start_time || null,
    endTime: fbAdSet.end_time || null,
    promotedObject: fbAdSet.promoted_object || null,
    source: "META",
  };
}

function buildAdMetaSettings(fbAd = {}) {
  return {
    configuredStatus: fbAd.configured_status || fbAd.status || null,
    effectiveStatus:
      fbAd.effective_status ||
      fbAd.configured_status ||
      fbAd.status ||
      null,
    createdTime: fbAd.created_time || null,
    updatedTime: fbAd.updated_time || null,
    source: "META",
  };
}

const FACEBOOK_ACTIVE_STATUS = "ACTIVE";
const FACEBOOK_ISSUE_STATUSES = new Set([
  "WITH_ISSUES",
  "DISAPPROVED",
  "PENDING_REVIEW",
  "PREAPPROVED",
]);

function getEntityStatusFromSettings(entity = {}, fallbackStatus = "PAUSED") {
  const settings = parseJsonObject(entity.settings);
  const meta = settings.meta || {};
  const configuredStatus =
    meta.configuredStatus ||
    meta.configured_status ||
    entity.configuredStatus ||
    entity.status ||
    fallbackStatus;
  const effectiveStatus =
    meta.effectiveStatus ||
    meta.effective_status ||
    configuredStatus ||
    fallbackStatus;

  return {
    settings,
    configuredStatus,
    effectiveStatus,
  };
}

function countStatuses(items = []) {
  return items.reduce((counts, item) => {
    const status = item.effectiveStatus || item.status || "UNKNOWN";
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {});
}

function buildAdClientPayload(ad = {}) {
  const { settings, configuredStatus, effectiveStatus } =
    getEntityStatusFromSettings(ad);
  const safeAd = { ...ad };

  if (safeAd.facebookAdset) {
    safeAd.facebookAdset = buildAdSetClientPayload({
      ...safeAd.facebookAdset,
      facebookAds: [],
      ads: [],
    });
  }

  return {
    ...safeAd,
    settings,
    configuredStatus,
    effectiveStatus,
  };
}

function buildAdSetClientPayload(adSet = {}) {
  const { settings, configuredStatus, effectiveStatus } =
    getEntityStatusFromSettings(adSet);
  const ads = (adSet.facebookAds || adSet.ads || []).map(buildAdClientPayload);
  const safeAdSet = { ...adSet };

  if (safeAdSet.facebookCampaign) {
    safeAdSet.facebookCampaign = buildCampaignClientPayload({
      ...safeAdSet.facebookCampaign,
      facebookAdsets: [],
      adSets: [],
    });
  }

  return {
    ...safeAdSet,
    settings,
    ads,
    configuredStatus,
    effectiveStatus,
  };
}

function createDeliveryReason(code, label, severity = "warning") {
  return { code, label, severity };
}

function buildCampaignDeliveryReadiness(campaign, adSets, campaignStatus) {
  const activeAdSets = adSets.filter(
    (adSet) => adSet.effectiveStatus === FACEBOOK_ACTIVE_STATUS,
  );
  const ads = adSets.flatMap((adSet) => adSet.ads || []);
  const activeAds = ads.filter(
    (ad) => ad.effectiveStatus === FACEBOOK_ACTIVE_STATUS,
  );
  const activeAdsInActiveAdSets = activeAdSets.flatMap((adSet) =>
    (adSet.ads || []).filter(
      (ad) => ad.effectiveStatus === FACEBOOK_ACTIVE_STATUS,
    ),
  );
  const reasons = [];

  if (FACEBOOK_ISSUE_STATUSES.has(campaignStatus)) {
    reasons.push(
      createDeliveryReason(
        "CAMPAIGN_WITH_ISSUES",
        "الحملة عليها مشكلة أو ما زالت في المراجعة داخل Meta",
        "error",
      ),
    );
  } else if (campaignStatus !== FACEBOOK_ACTIVE_STATUS) {
    reasons.push(
      createDeliveryReason(
        "CAMPAIGN_NOT_ACTIVE",
        "الحملة نفسها ليست نشطة",
      ),
    );
  }

  if (adSets.length === 0) {
    reasons.push(
      createDeliveryReason(
        "NO_ADSETS",
        "لا توجد مجموعات إعلانية محفوظة لهذه الحملة",
      ),
    );
  } else if (activeAdSets.length === 0) {
    reasons.push(
      createDeliveryReason(
        "NO_ACTIVE_ADSETS",
        "لا توجد مجموعة إعلانية نشطة تحت الحملة",
      ),
    );
  }

  if (ads.length === 0) {
    reasons.push(
      createDeliveryReason("NO_ADS", "لا توجد إعلانات محفوظة داخل المجموعات"),
    );
  } else if (activeAdsInActiveAdSets.length === 0) {
    reasons.push(
      createDeliveryReason(
        "NO_ACTIVE_ADS",
        "لا يوجد إعلان نشط داخل مجموعة نشطة",
      ),
    );
  }

  if (!campaign.facebookCampaignId) {
    reasons.push(
      createDeliveryReason(
        "LOCAL_ONLY",
        "الحملة محلية فقط وليست مرتبطة بحملة Meta",
      ),
    );
  }

  const isDeliverable =
    campaignStatus === FACEBOOK_ACTIVE_STATUS &&
    activeAdSets.length > 0 &&
    activeAdsInActiveAdSets.length > 0 &&
    Boolean(campaign.facebookCampaignId);

  const status = isDeliverable
    ? "DELIVERING"
    : FACEBOOK_ISSUE_STATUSES.has(campaignStatus)
      ? "WITH_ISSUES"
      : campaignStatus === FACEBOOK_ACTIVE_STATUS
        ? "ACTIVE_NOT_DELIVERING"
        : campaignStatus;

  return {
    isDeliverable,
    status,
    label: isDeliverable
      ? "يسلم فعلياً"
      : status === "ACTIVE_NOT_DELIVERING"
        ? "نشط لكن لا يسلم"
        : "لا يسلم حالياً",
    reasonText: reasons.map((reason) => reason.label).join("، "),
    reasons,
    counts: {
      adSetsTotal: adSets.length,
      adSetsActive: activeAdSets.length,
      adsTotal: ads.length,
      adsActive: activeAds.length,
      adsActiveInActiveAdSets: activeAdsInActiveAdSets.length,
      adSetStatuses: countStatuses(adSets),
      adStatuses: countStatuses(ads),
    },
  };
}

function mergeCampaignSettings(existingSettings, patch) {
  return {
    ...existingSettings,
    ...patch,
    meta: {
      ...(existingSettings?.meta || {}),
      ...(patch?.meta || {}),
    },
  };
}

function mergeSettings(existingSettings, patch) {
  return {
    ...existingSettings,
    ...patch,
    meta: {
      ...(existingSettings?.meta || {}),
      ...(patch?.meta || {}),
    },
  };
}

function buildCampaignClientPayload(campaign, fallbackAdAccount = null) {
  const settings = parseJsonObject(campaign?.settings);
  const meta = settings.meta || {};
  const relatedAdAccount = campaign?.facebookAdAccount || fallbackAdAccount;
  const safeAdAccount = relatedAdAccount
    ? sanitizeFacebookAdAccountForClient(relatedAdAccount)
    : null;
  const metaAccountId = normalizeAdAccountId(
    meta.accountId ||
      meta.account_id ||
      relatedAdAccount?.accountId ||
      relatedAdAccount?.account_id,
  );
  const localAdSets = (campaign?.facebookAdsets || campaign?.adSets || []).map(
    (adSet) =>
      buildAdSetClientPayload({
        ...adSet,
        facebookCampaign: undefined,
      }),
  );
  const configuredStatus =
    meta.configuredStatus || campaign?.status || "PAUSED";
  const effectiveStatus =
    meta.effectiveStatus || meta.configuredStatus || campaign?.status || "PAUSED";
  const deliveryReadiness = buildCampaignDeliveryReadiness(
    campaign,
    localAdSets,
    effectiveStatus,
  );

  return {
    ...campaign,
    settings,
    facebookAdAccount: safeAdAccount,
    facebookAdsets: localAdSets,
    adSets: localAdSets,
    metaAccountId,
    metaAccountName: meta.adAccountName || relatedAdAccount?.name || null,
    configuredStatus,
    effectiveStatus,
    deliveryReadiness,
    facebookCreatedTime: meta.createdTime || null,
    facebookUpdatedTime: meta.updatedTime || null,
    facebookStartTime: meta.startTime || null,
    facebookStopTime: meta.stopTime || null,
    adAccount: safeAdAccount,
  };
}

function getMetaBudget(fbObject = {}, fallbackType = "DAILY", fallbackAmount = 0) {
  const dailyBudget = toMajorCurrencyUnit(fbObject.daily_budget);
  const lifetimeBudget = toMajorCurrencyUnit(fbObject.lifetime_budget);

  if (dailyBudget !== null) {
    return { budgetType: "DAILY", budgetAmount: dailyBudget };
  }

  if (lifetimeBudget !== null) {
    return { budgetType: "LIFETIME", budgetAmount: lifetimeBudget };
  }

  return {
    budgetType: fallbackType || "DAILY",
    budgetAmount: Number.isFinite(Number(fallbackAmount))
      ? Number(fallbackAmount)
      : 0,
  };
}

function getMetaCampaignIdFromAdSet(fbAdSet = {}) {
  return fbAdSet.campaign?.id || fbAdSet.campaign_id || null;
}

function getMetaAdSetIdFromAd(fbAd = {}) {
  return fbAd.adset?.id || fbAd.adset_id || null;
}

function groupByMetaParentId(items, getParentId) {
  const grouped = new Map();

  for (const item of items || []) {
    const parentId = getParentId(item);
    if (!parentId) continue;
    const existing = grouped.get(parentId) || [];
    grouped.set(parentId, [...existing, item]);
  }

  return grouped;
}

function extractMetaAdCreative(fbAd = {}) {
  const creative = fbAd.creative || {};
  const storySpec = creative.object_story_spec || {};
  const linkData = storySpec.link_data || null;
  const videoData = storySpec.video_data || null;
  const carouselCards = Array.isArray(linkData?.child_attachments)
    ? linkData.child_attachments
    : [];
  const firstCarouselCard = carouselCards[0] || {};
  const callToAction =
    linkData?.call_to_action?.type ||
    videoData?.call_to_action?.type ||
    firstCarouselCard?.call_to_action?.type ||
    null;
  const linkUrl =
    linkData?.link ||
    videoData?.call_to_action?.value?.link ||
    firstCarouselCard?.link ||
    null;
  const creativeType =
    carouselCards.length > 0
      ? "CAROUSEL"
      : videoData
        ? "SINGLE_VIDEO"
        : linkData
          ? "SINGLE_IMAGE"
          : "SYNCED_META";

  return {
    creativeType,
    primaryText:
      linkData?.message ||
      videoData?.message ||
      firstCarouselCard?.message ||
      fbAd.name ||
      "Synced from Meta",
    headline:
      linkData?.name ||
      videoData?.title ||
      firstCarouselCard?.name ||
      creative.name ||
      null,
    description:
      linkData?.description ||
      videoData?.link_description ||
      firstCarouselCard?.description ||
      null,
    callToAction,
    imageUrl: creative.thumbnail_url || null,
    imageHash: linkData?.image_hash || firstCarouselCard?.image_hash || null,
    videoId: videoData?.video_id || null,
    linkUrl,
    carouselImages:
      carouselCards.length > 0
        ? stringifyJson(
            carouselCards.map((card) => ({
              imageHash: card.image_hash || null,
              imageUrl: card.picture || card.image_url || null,
              headline: card.name || null,
              description: card.description || null,
              linkUrl: card.link || null,
            })),
            "[]",
          )
        : null,
    carouselCount: carouselCards.length || 1,
    creative: stringifyJson(creative),
  };
}

function sanitizeSavedFacebookAdAccountForClient(savedAccount, warningReason) {
  const normalizedAccountId = normalizeAdAccountId(savedAccount?.accountId);
  const accountData = {
    id: normalizedAccountId ? `act_${normalizedAccountId}` : savedAccount?.id,
    account_id: normalizedAccountId,
    name: savedAccount?.name || normalizedAccountId || "Saved Ad Account",
    currency: savedAccount?.currency || "EGP",
    timezone_name: savedAccount?.timezone || null,
  };
  const billingHealth = buildAdAccountBillingHealth(accountData);

  billingHealth.warnings.push({
    code: warningReason || "REMOTE_ACCOUNT_NOT_RETURNED",
    message:
      "هذا الحساب محفوظ محلياً، لكن Meta لم ترجعه في قائمة الحسابات الحالية. يمكن استخدامه لتصفية البيانات المحلية، وقد تحتاج لإعادة ربط صلاحيات ads_read/ads_management قبل المزامنة أو إنشاء إعلان.",
  });

  return {
    ...accountData,
    business: null,
    billingHealth,
    isSaved: true,
    isActive: Boolean(savedAccount?.isActive),
    source: "local",
  };
}

function buildSavedAdAccountFallbacks(
  savedAdAccounts,
  remoteAccountIds = new Set(),
  warningReason,
) {
  return savedAdAccounts
    .filter((account) => {
      const normalizedAccountId = normalizeAdAccountId(account.accountId);
      return normalizedAccountId && !remoteAccountIds.has(normalizedAccountId);
    })
    .map((account) =>
      sanitizeSavedFacebookAdAccountForClient(account, warningReason),
    );
}

function sanitizeFacebookPageForClient(page) {
  if (!page || typeof page !== "object") {
    return page;
  }

  const safePage = { ...page };
  delete safePage.accessToken;
  delete safePage.access_token;
  delete safePage.pageAccessToken;

  return safePage;
}

const SUPPORTED_FULL_AD_CREATIVE_TYPES = new Set([
  "SINGLE_IMAGE",
  "SINGLE_VIDEO",
  "CAROUSEL",
]);

const PURCHASE_ACTION_TYPES = [
  "offsite_conversion.fb_pixel_purchase",
  "omni_purchase",
  "purchase",
];

const CONVERSION_ACTION_TYPES = [
  ...PURCHASE_ACTION_TYPES,
  "offsite_conversion.fb_pixel_lead",
  "lead",
  "complete_registration",
];

function normalizeFullAdCreativeType(creativeType) {
  return String(creativeType || "SINGLE_IMAGE").trim().toUpperCase();
}

function normalizeFullAdBidStrategy(bidStrategy) {
  const normalized = String(bidStrategy || "LOWEST_COST").trim().toUpperCase();

  if (
    normalized === "LOWEST_COST" ||
    normalized === "LOWEST_COST_WITHOUT_CAP"
  ) {
    return "LOWEST_COST";
  }

  if (normalized === "BID_CAP" || normalized === "LOWEST_COST_WITH_BID_CAP") {
    return "BID_CAP";
  }

  if (normalized === "TARGET_COST") {
    return "COST_CAP";
  }

  return normalized;
}

function normalizeFullAdDeliverySettings(data) {
  const objective = String(data.objective || "").trim().toUpperCase();
  const supportsConversionOptimization =
    objective === "OUTCOME_SALES" || objective === "OUTCOME_LEADS";
  const hasConversionSignal = Boolean(
    supportsConversionOptimization && data.pixelId && data.conversionEvent,
  );
  const normalizedBidStrategy = normalizeFullAdBidStrategy(data.bidStrategy);
  const normalized = {
    ...data,
    bidStrategy: normalizedBidStrategy,
  };

  if (hasConversionSignal) {
    normalized.optimizationGoal =
      data.optimizationGoal || "OFFSITE_CONVERSIONS";
    normalized.attributionWindow =
      data.attributionWindow || "7d_click_1d_view";
    return normalized;
  }

  if (!supportsConversionOptimization) {
    normalized.pixelId = undefined;
    normalized.conversionEvent = undefined;
    normalized.conversionLocation = undefined;
    normalized.performanceGoal = undefined;
  }

  if (objective === "OUTCOME_TRAFFIC" || !data.optimizationGoal) {
    normalized.optimizationGoal = data.optimizationGoal || "LINK_CLICKS";
  }

  if (normalized.optimizationGoal === "LINK_CLICKS") {
    normalized.attributionWindow = "1d_click";
  } else {
    normalized.attributionWindow =
      data.attributionWindow || "7d_click_1d_view";
  }

  return normalized;
}

function toFiniteNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const FULL_AD_MINIMUM_BUDGET_BY_CURRENCY = {
  EGP: 200,
};

function getFullAdMinimumBudgetAmount(currency) {
  const normalizedCurrency = String(currency || "").trim().toUpperCase();
  return FULL_AD_MINIMUM_BUDGET_BY_CURRENCY[normalizedCurrency] || 1;
}

function buildFullAdBudgetValidationError({ budgetAmount, adAccount }) {
  const minimumBudgetAmount = getFullAdMinimumBudgetAmount(adAccount?.currency);

  if (budgetAmount >= minimumBudgetAmount) {
    return null;
  }

  const currencyLabel = String(adAccount?.currency || "account currency")
    .trim()
    .toUpperCase();

  return {
    success: false,
    error: `ميزانية حساب Facebook Ads بعملة ${currencyLabel} يجب ألا تقل عن ${minimumBudgetAmount} ${currencyLabel}.`,
    errorCode: "BUDGET_BELOW_ACCOUNT_MINIMUM",
    field: "budgetAmount",
    minimumBudgetAmount,
    currency: currencyLabel,
  };
}


const ACTIVE_PUBLISH_CONFIRMATION_TOKEN = "ACTIVE_PUBLISH_CONFIRMED";
const PUBLISH_REQUEST_LOCK_TTL_MS = 20 * 60 * 1000;

function normalizeFullAdStatus(status) {
  const normalized = String(status || "PAUSED").trim().toUpperCase();
  return normalized === "ACTIVE" ? "ACTIVE" : "PAUSED";
}

function normalizeClientRequestId(value, options = {}) {
  const normalized = String(value || "").trim();
  if (normalized) return normalized.slice(0, 160);
  if (options.allowGeneratedFallback) return crypto.randomUUID();
  return "";
}

function safeStringifyJson(value) {
  try {
    return JSON.stringify(value ?? null);
  } catch {
    return null;
  }
}

function safeParseJson(value, fallback = null) {
  if (!value) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value ?? null);
}

function buildPublishRequestHash(data) {
  const {
    clientRequestId,
    idempotencyKey,
    activePublishConfirmationToken,
    allowActivePublish,
    ...hashableData
  } = data || {};

  return crypto
    .createHash("sha256")
    .update(stableStringify(hashableData))
    .digest("hex");
}

function isPublishRequestLockExpired(existingRequest) {
  return (
    existingRequest?.status === "IN_PROGRESS" &&
    existingRequest.lockExpiresAt &&
    new Date(existingRequest.lockExpiresAt).getTime() < Date.now()
  );
}

function isPublishRequestStale(existingRequest) {
  return existingRequest?.status === "STALE" || isPublishRequestLockExpired(existingRequest);
}

function hasActivePublishConfirmation(data) {
  return (
    data?.allowActivePublish === true &&
    data?.activePublishConfirmationToken === ACTIVE_PUBLISH_CONFIRMATION_TOKEN
  );
}

async function getExistingPublishRequest(prisma, companyId, clientRequestId) {
  if (!prisma?.facebookAdsPublishRequest?.findUnique) return null;

  return prisma.facebookAdsPublishRequest.findUnique({
    where: {
      companyId_clientRequestId: {
        companyId,
        clientRequestId,
      },
    },
  });
}

function buildStoredPublishResponse(existingRequest) {
  const storedResponse = safeParseJson(existingRequest.responsePayload, null);
  if (storedResponse) {
    return storedResponse;
  }

  return {
    success: existingRequest.status === "SUCCEEDED",
    error: existingRequest.errorMessage || undefined,
    step: existingRequest.step || undefined,
    partialSuccess: existingRequest.partialSuccess,
    facebookIds: {
      campaignId: existingRequest.facebookCampaignId,
      adSetId: existingRequest.facebookAdSetId,
      adId: existingRequest.facebookAdId,
      creativeId: existingRequest.facebookCreativeId,
    },
    idempotency: {
      clientRequestId: existingRequest.clientRequestId,
      reused: true,
    },
  };
}

function sendExistingPublishRequestResponse(res, existingRequest, clientRequestId, requestHash = null) {
  if (
    requestHash &&
    existingRequest.requestHash &&
    existingRequest.requestHash !== requestHash
  ) {
    return res.status(409).json({
      success: false,
      error:
        "مفتاح النشر مستخدم قبل كده مع بيانات مختلفة. استخدم محاولة جديدة لتجنب خلط النتائج.",
      errorCode: "FACEBOOK_AD_PUBLISH_PAYLOAD_MISMATCH",
      field: "clientRequestId",
      idempotency: {
        clientRequestId,
        reused: true,
      },
    });
  }

  if (
    ["SUCCEEDED", "LOCAL_SAVE_FAILED", "META_PARTIAL_FAILED"].includes(
      existingRequest.status,
    )
  ) {
    return res.json({
      ...buildStoredPublishResponse(existingRequest),
      idempotency: {
        clientRequestId,
        reused: true,
        status: existingRequest.status,
      },
    });
  }

  const isStaleLock = isPublishRequestStale(existingRequest);

  return res.status(409).json({
    success: false,
    error:
      isStaleLock
        ? "طلب النشر السابق انتهت مهلة متابعته. راجع مدير الإعلانات ثم استخدم محاولة جديدة."
        : existingRequest.status === "IN_PROGRESS"
        ? "طلب النشر نفسه ما زال قيد التنفيذ. انتظر النتيجة قبل إعادة المحاولة."
        : "طلب النشر السابق بنفس المفتاح فشل. استخدم محاولة جديدة بعد مراجعة الحالة.",
    errorCode: isStaleLock
      ? "FACEBOOK_AD_PUBLISH_REQUEST_STALE"
      : "FACEBOOK_AD_PUBLISH_REQUEST_LOCKED",
    retryableWithNewRequestId:
      isStaleLock || ["FAILED", "STALE"].includes(existingRequest.status),
    status: isStaleLock ? "STALE_IN_PROGRESS" : existingRequest.status,
    idempotency: {
      clientRequestId,
      reused: true,
    },
  });
}

async function createPublishRequest(prisma, {
  companyId,
  userId,
  clientRequestId,
  requestHash,
  data,
}) {
  if (!prisma?.facebookAdsPublishRequest?.create) return null;

  try {
    return await prisma.facebookAdsPublishRequest.create({
      data: {
        companyId,
        userId,
        clientRequestId,
        requestHash,
        status: "IN_PROGRESS",
        requestPayload: safeStringifyJson(data),
        lockExpiresAt: new Date(Date.now() + PUBLISH_REQUEST_LOCK_TTL_MS),
      },
    });
  } catch (error) {
    if (error?.code === "P2002") {
      const existingByClientRequest = await getExistingPublishRequest(
        prisma,
        companyId,
        clientRequestId,
      );
      if (existingByClientRequest) {
        return { ...existingByClientRequest, __duplicateLock: true };
      }
    }
    throw error;
  }
}

async function updatePublishRequest(prisma, publishRequest, data) {
  if (!publishRequest?.id || !prisma?.facebookAdsPublishRequest?.update) return null;

  return prisma.facebookAdsPublishRequest.update({
    where: { id: publishRequest.id },
    data,
  }).catch((error) => {
    console.warn("⚠️ Failed to update Facebook Ads publish request:", error.message);
    return null;
  });
}

function didFullAdAttemptReachMeta(result) {
  return Boolean(
    result?.metaWriteUncertain ||
      result?.partialSuccess ||
      result?.campaignId ||
      result?.adSetId ||
      result?.adId ||
      result?.creativeId ||
      result?.results?.campaign?.metaWriteUncertain ||
      result?.results?.campaign?.campaignId ||
      result?.results?.adSet?.adSetId ||
      result?.results?.ad?.adId ||
      result?.results?.creative?.creativeId,
  );
}

async function validateFullAdStorefrontPixelReadiness({ companyId, pixelId, data }) {
  if (!requiresFullAdPixel(data) || !pixelId || !getSharedPrismaClient().storefrontSettings?.findUnique) {
    return null;
  }

  const storefrontSettings = await getSharedPrismaClient().storefrontSettings.findUnique({
    where: { companyId },
    select: {
      facebookPixelEnabled: true,
      facebookPixelId: true,
      pixelStatus: true,
      pixelTrackPurchase: true,
      facebookPixelConfigs: {
        where: { pixelId: String(pixelId) },
        select: {
          id: true,
          isActive: true,
          trackPurchase: true,
        },
      },
    },
  });

  const matchingConfig = storefrontSettings?.facebookPixelConfigs?.find(
    (config) =>
      config.isActive !== false &&
      config.trackPurchase !== false &&
      String(config.pixelId || pixelId) === String(pixelId),
  );
  const legacyPixelReady =
    storefrontSettings?.facebookPixelEnabled === true &&
    String(storefrontSettings.facebookPixelId || "") === String(pixelId) &&
    storefrontSettings.pixelTrackPurchase !== false &&
    !["not_configured", "disabled", "inactive"].includes(
      String(storefrontSettings.pixelStatus || "").toLowerCase(),
    );

  if (matchingConfig || legacyPixelReady) {
    return null;
  }

  return {
    success: false,
    errorCode: "FACEBOOK_PIXEL_NOT_READY_FOR_STORE",
    field: "pixelId",
    error:
      "البكسل المختار موجود في الحساب الإعلاني لكنه غير مفعل كتتبع Purchase على متجر الشركة. فعّل Pixel Purchase في إعدادات المتجر قبل نشر حملة مبيعات.",
  };
}

async function validateFullAdAssetReadiness({ companyId, pageId, pixelId, adAccount, adsService, data }) {
  if (pageId) {
    const storedPage = await getSharedPrismaClient().facebookPage.findFirst({
      where: {
        companyId,
        pageId: String(pageId),
        status: "connected",
      },
      select: {
        id: true,
        pageId: true,
        pageAccessToken: true,
      },
    });
    if (!storedPage) {
      return {
        success: false,
        errorCode: "FACEBOOK_PAGE_NOT_READY_FOR_COMPANY",
        field: "pageId",
        error:
          "صفحة فيسبوك المختارة ليست مربوطة وجاهزة لهذه الشركة داخل Max P. اربط الصفحة بالشركة قبل النشر.",
      };
    }

    // توكِن الصفحة المخزّن هو الصحيح لجلب الصفحات — توكِن المستخدم/الإعلانات
    // ممكن مايقدرش يجلبها (scopes مختلفة) فيفشل النشر بـ NOT_ACCESSIBLE بلا سبب
    const pageAccessToken =
      storedPage.pageAccessToken || (await getCompanyPageAccessToken(companyId));
    if (pageAccessToken) {
      const pageService = new FacebookAdsService(pageAccessToken, adAccount.accountId);
      const pagesResult = await pageService.getFacebookPages();
      const pages = Array.isArray(pagesResult?.data) ? pagesResult.data : [];
      let selectedPage = pages.find((page) => String(page.id) === String(pageId));

      // Page Token لا يستطيع تعداد الحسابات عبر /me/accounts — يرجع قائمة فارغة دائماً.
      // نتحقق من الصفحة مباشرة عبر /me باستخدام توكن الصفحة المخزن.
      if (!selectedPage && storedPage.pageAccessToken) {
        try {
          const tokenCheck = await validateFacebookPageAccessToken({
            pageId: String(pageId),
            pageAccessToken: storedPage.pageAccessToken,
          });
          if (tokenCheck.isValid) {
            selectedPage = tokenCheck.page;
          } else {
            console.warn(
              "⚠️ [FULL-AD] Stored page token check failed:",
              tokenCheck.reason,
              tokenCheck.error?.message || "",
            );
          }
        } catch (meError) {
          console.error(
            "⚠️ [FULL-AD] Page token verification error:",
            meError.response?.data?.error?.message || meError.message,
          );
        }
      }

      // الصفحة متصلة في MaxP ولها توكن صفحة تم التحقق منه عند الربط — نثق بالسجل المحلي
      // بدل منع النشر بسبب فشل فحص مباشر (شبكة/صلاحيات قراءة إضافية غير ضرورية للنشر).
      if (!selectedPage && !storedPage.pageAccessToken) {
        return {
          success: false,
          errorCode: "FACEBOOK_PAGE_NOT_ACCESSIBLE",
          field: "pageId",
          error: "صفحة فيسبوك المختارة غير متاحة للتوكن الحالي. اختر صفحة جاهزة قبل النشر.",
        };
      }
    }
  }

  if (pixelId) {
    const pixelsResult = await adsService.getFacebookPixels();
    const pixels = Array.isArray(pixelsResult?.data) ? pixelsResult.data : [];
    const selectedPixel = pixels.find((pixel) => String(pixel.id) === String(pixelId));
    if (!selectedPixel) {
      return {
        success: false,
        errorCode: "FACEBOOK_PIXEL_NOT_IN_ACCOUNT",
        field: "pixelId",
        error: "البكسل المختار غير متاح داخل الحساب الإعلاني الحالي. راجع اختيار الحساب والبكسل.",
      };
    }

    const storefrontPixelError = await validateFullAdStorefrontPixelReadiness({
      companyId,
      pixelId,
      data,
    });
    if (storefrontPixelError) {
      return storefrontPixelError;
    }
  }

  return null;
}

function requiresFullAdPixel(data) {
  const objective = String(data?.objective || "").toUpperCase();
  const optimizationGoal = String(data?.optimizationGoal || "").toUpperCase();
  const conversionLocation = String(data?.conversionLocation || "").toUpperCase();
  const conversionEvent = String(data?.conversionEvent || "").toUpperCase();

  return (
    ["OUTCOME_SALES", "OUTCOME_LEADS", "CONVERSIONS", "CATALOG_SALES"].includes(
      objective,
    ) ||
    ["OFFSITE_CONVERSIONS", "PURCHASE", "LEAD"].includes(optimizationGoal) ||
    ["WEBSITE", "WEB"].includes(conversionLocation) ||
    ["PURCHASE", "LEAD"].includes(conversionEvent)
  );
}


function getInsightActionValue(rows, actionTypes) {
  if (!Array.isArray(rows)) {
    return 0;
  }

  const normalizedActionTypes = actionTypes.map((type) => type.toLowerCase());
  const match = rows.find((row) =>
    normalizedActionTypes.includes(String(row?.action_type || "").toLowerCase()),
  );

  return toFiniteNumber(match?.value);
}

function aggregateMetaInsights(insights = []) {
  const totals = createEmptyPerformanceTotals();
  insights.forEach((insight) => addMetaInsightToTotals(totals, insight));
  return withDerivedPerformance(totals);
}

function getPurchaseRoas(insight, spend, purchaseValue) {
  const roasFromMeta = getInsightActionValue(
    insight.purchase_roas,
    PURCHASE_ACTION_TYPES,
  );

  if (roasFromMeta > 0) {
    return roasFromMeta;
  }

  return spend > 0 ? purchaseValue / spend : 0;
}

function buildInsightPersistenceData(insight) {
  const spend = toFiniteNumber(insight.spend);
  const purchases = getInsightActionValue(insight.actions, PURCHASE_ACTION_TYPES);
  const purchaseValue = getInsightActionValue(
    insight.action_values,
    PURCHASE_ACTION_TYPES,
  );
  const conversions = getInsightActionValue(
    insight.actions,
    CONVERSION_ACTION_TYPES,
  );
  const linkClicks =
    toFiniteNumber(insight.inline_link_clicks) ||
    getInsightActionValue(insight.actions, ["link_click", "omni_link_click"]);
  const landingPageViews = getInsightActionValue(insight.actions, [
    "landing_page_view",
    "omni_landing_page_view",
  ]);
  const cpa =
    getInsightActionValue(insight.cost_per_action_type, PURCHASE_ACTION_TYPES) ||
    (purchases > 0 ? spend / purchases : 0);

  return {
    impressions: Math.trunc(toFiniteNumber(insight.impressions)),
    clicks: Math.trunc(toFiniteNumber(insight.clicks)),
    ctr: toFiniteNumber(insight.ctr),
    cpc: toFiniteNumber(insight.cpc),
    spend,
    conversions: Math.trunc(conversions),
    cpa,
    reach: Math.trunc(toFiniteNumber(insight.reach)),
    frequency: toFiniteNumber(insight.frequency),
    linkClicks: Math.trunc(linkClicks),
    costPerLinkClick: toFiniteNumber(insight.cost_per_inline_link_click),
    landingPageViews: Math.trunc(landingPageViews),
    purchases: Math.trunc(purchases),
    purchaseValue,
    roas: getPurchaseRoas(insight, spend, purchaseValue),
    breakdown: JSON.stringify({
      actions: insight.actions || [],
      actionValues: insight.action_values || [],
      costPerActionType: insight.cost_per_action_type || [],
      purchaseRoas: insight.purchase_roas || [],
      dateStart: insight.date_start || null,
      dateStop: insight.date_stop || null,
    }),
  };
}

function validateFullAdCreativePayload(data, creativeType) {
  if (!SUPPORTED_FULL_AD_CREATIVE_TYPES.has(creativeType)) {
    return "هذا النوع غير مدعوم حالياً في إنشاء الإعلان الكامل. استخدم صورة أو فيديو أو دوّار.";
  }

  if (creativeType === "SINGLE_IMAGE" && !data.imageUrl && !data.imageHash) {
    return "الصورة مطلوبة لإعلان الصورة الواحدة.";
  }

  if (creativeType === "SINGLE_VIDEO" && !data.videoUrl && !data.videoId) {
    return "الفيديو مطلوب لإعلان الفيديو الواحد.";
  }

  if (creativeType === "CAROUSEL") {
    const cards = Array.isArray(data.carouselCards) ? data.carouselCards : [];
    if (cards.length < 2) {
      return "إعلان الدوّار يحتاج بطاقتين على الأقل.";
    }

    const invalidIndex = cards.findIndex(
      (card) =>
        (!card?.imageUrl && !card?.imageHash) ||
        !String(card?.headline || "").trim() ||
        !String(card?.linkUrl || "").trim(),
    );

    if (invalidIndex >= 0) {
      return `بطاقة الدوّار رقم ${invalidIndex + 1} تحتاج صورة وعنوان ورابط وجهة.`;
    }
  }

  return null;
}

function getPersistedCreativePayload(data, result, creativeType) {
  return {
    creativeId: result.creativeId,
    pageId: data.pageId,
    creativeType,
    primaryText: data.primaryText,
    headline: data.headline || null,
    description: data.description || null,
    callToAction: data.callToAction || "LEARN_MORE",
    linkUrl: data.linkUrl,
    productId: data.productId || null,
    displayLink: data.displayLink || null,
    urlParameters: data.urlParameters || null,
    imageHash: result.imageHash || data.imageHash || null,
    videoId: result.videoId || data.videoId || null,
    carouselCards: result.carouselCards || data.carouselCards || [],
    advantageCreative: Boolean(data.advantageCreative),
    enhancements: {
      textGeneration: Boolean(data.textGeneration),
      imageEnhancement: Boolean(data.imageEnhancement),
      musicEnhancement: Boolean(data.musicEnhancement),
      imageTemplates: Boolean(data.imageTemplates),
      videoHighlight: Boolean(data.videoHighlight),
      textOptimizations: Boolean(data.textOptimizations),
    },
  };
}

function createEmptyPerformanceTotals() {
  return {
    impressions: 0,
    clicks: 0,
    spend: 0,
    reach: 0,
    conversions: 0,
    purchases: 0,
    purchaseValue: 0,
    linkClicks: 0,
    landingPageViews: 0,
    frequencySum: 0,
    frequencySamples: 0,
  };
}

function addInsightToTotals(totals, insight) {
  totals.impressions += insight.impressions;
  totals.clicks += insight.clicks;
  totals.spend += insight.spend;
  totals.reach += insight.reach;
  totals.conversions += insight.conversions;
  totals.purchases += insight.purchases;
  totals.purchaseValue += insight.purchaseValue;
  totals.linkClicks += insight.linkClicks;
  totals.landingPageViews += insight.landingPageViews;

  if (insight.frequency > 0) {
    totals.frequencySum += insight.frequency;
    totals.frequencySamples += 1;
  }
}

function addMetaInsightToTotals(totals, insight) {
  addInsightToTotals(totals, buildInsightPersistenceData(insight));
}

function withDerivedPerformance(totals) {
  return {
    impressions: totals.impressions,
    clicks: totals.clicks,
    spend: Number(totals.spend.toFixed(2)),
    reach: totals.reach,
    conversions: totals.conversions,
    purchases: totals.purchases,
    purchaseValue: Number(totals.purchaseValue.toFixed(2)),
    linkClicks: totals.linkClicks,
    landingPageViews: totals.landingPageViews,
    ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
    cpc: totals.clicks > 0 ? totals.spend / totals.clicks : 0,
    cpa: totals.purchases > 0 ? totals.spend / totals.purchases : 0,
    roas: totals.spend > 0 ? totals.purchaseValue / totals.spend : 0,
    frequency:
      totals.frequencySamples > 0
        ? totals.frequencySum / totals.frequencySamples
        : 0,
  };
}

function buildPerformanceRecommendations(summary, campaigns) {
  const recommendations = [];

  if (summary.impressions === 0) {
    recommendations.push({
      priority: "HIGH",
      title: "لا توجد بيانات أداء كافية",
      message:
        "زامن الإحصائيات بعد إطلاق الإعلان أو انتظر أول delivery من Meta قبل اتخاذ قرارات تحسين.",
    });
    return recommendations;
  }

  if (summary.spend > 0 && summary.purchases === 0) {
    recommendations.push({
      priority: "HIGH",
      title: "إنفاق بدون مشتريات",
      message:
        "راجع ربط Pixel swam-maxp وأحداث Purchase/InitiateCheckout، ثم اختبر صفحة الهبوط والعرض قبل رفع الميزانية.",
    });
  }

  if (summary.ctr > 0 && summary.ctr < 1) {
    recommendations.push({
      priority: "MEDIUM",
      title: "CTR منخفض",
      message:
        "جرّب Hook أقوى في أول سطر وصورة/كاروسيل أوضح للمنتج، لأن الجمهور يرى الإعلان ولا يضغط كفاية.",
    });
  }

  if (summary.frequency > 3) {
    recommendations.push({
      priority: "MEDIUM",
      title: "احتمال إرهاق للجمهور",
      message:
        "التكرار أعلى من 3. جهز نسخة كريتيف جديدة أو وسّع الجمهور قبل ما تكلفة النتيجة تزيد.",
    });
  }

  if (summary.purchases > 0 && summary.roas < 1) {
    recommendations.push({
      priority: "HIGH",
      title: "ROAS أقل من 1",
      message:
        "الإعلان يبيع لكن العائد أقل من المصروف. راجع السعر، الشحن، صفحة المنتج، وقيمة العرض.",
    });
  }

  const campaignsMissingPixel = campaigns.filter(
    (campaign) =>
      /SALES|CONVERSIONS/i.test(campaign.objective || "") &&
      !campaign.pixelId &&
      campaign.performanceSource !== "META",
  );

  if (campaignsMissingPixel.length > 0) {
    recommendations.push({
      priority: "HIGH",
      title: "حملات مبيعات بدون Pixel محلي",
      message:
        "بعض حملات المبيعات غير مسجل عليها Pixel في النظام، وهذا يصعب قراءة التحويلات والتحسين.",
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      priority: "LOW",
      title: "الأداء مستقر مبدئياً",
      message:
        "استمر في مراقبة CPC وROAS يومياً، وابدأ A/B test للعنوان أو أول صورة عند توفر بيانات أكثر.",
    });
  }

  return recommendations;
}

function normalizeGeoPerformanceBreakdown(value) {
  const normalized = String(value || "region").trim().toLowerCase();
  return ["country", "region"].includes(normalized) ? normalized : "region";
}

function getGeoPerformanceLabel(insight, breakdown) {
  if (breakdown === "country") {
    return insight.country || insight.country_code || "غير محدد";
  }

  return insight.region || insight.region_name || insight.country || "غير محدد";
}

function buildGeoPerformanceRecommendations(rows) {
  if (rows.length === 0) {
    return [
      {
        priority: "HIGH",
        title: "لا توجد بيانات جغرافية كافية",
        message:
          "انتظر أول delivery من Meta أو وسّع المدة قبل تقسيم الميزانية بين محافظات.",
      },
    ];
  }

  const topRow = rows[0];
  const recommendations = [
    {
      priority: "MEDIUM",
      title: `أعلى منطقة إنفاقاً: ${topRow.label}`,
      message:
        "راجع ROAS وCPA لهذه المنطقة قبل التوسع. لا تزود الميزانية بناءً على الإنفاق وحده.",
    },
  ];

  if (topRow.metrics.spend < 100) {
    recommendations.push({
      priority: "LOW",
      title: "العينة ما زالت صغيرة",
      message:
        "استنى إنفاق ونتائج أكثر قبل إيقاف محافظات أو نقل الميزانية بينها.",
    });
  }

  return recommendations;
}

function normalizePerformanceBreakdown(value) {
  const normalized = String(value || "age_gender").trim().toLowerCase();
  return [
    "age_gender",
    "placement",
    "platform",
    "device",
    "country",
    "region",
  ].includes(normalized)
    ? normalized
    : "age_gender";
}

function getTranslatedGender(value) {
  const labels = {
    male: "رجال",
    female: "نساء",
    unknown: "غير محدد",
  };
  const normalized = String(value || "unknown").toLowerCase();
  return labels[normalized] || value || "غير محدد";
}

function getTranslatedPublisherPlatform(value) {
  const labels = {
    facebook: "Facebook",
    instagram: "Instagram",
    messenger: "Messenger",
    audience_network: "Audience Network",
    threads: "Threads",
    whatsapp: "WhatsApp",
  };
  const normalized = String(value || "unknown").toLowerCase();
  return labels[normalized] || value || "غير محدد";
}

function getTranslatedPlatformPosition(value) {
  const labels = {
    feed: "Feed",
    stories: "Stories",
    story: "Stories",
    reels: "Reels",
    instagram_reels: "Instagram Reels",
    instagram_stories: "Instagram Stories",
    marketplace: "Marketplace",
    video_feeds: "Video feeds",
    search: "Search",
    right_hand_column: "Right column",
    instream_video: "In-stream video",
    profile_feed: "Profile feed",
    explore: "Explore",
    unknown: "غير محدد",
  };
  const normalized = String(value || "unknown").toLowerCase();
  return labels[normalized] || value || "غير محدد";
}

function getTranslatedDevicePlatform(value) {
  const labels = {
    mobile: "موبايل",
    desktop: "Desktop",
    unknown: "غير محدد",
  };
  const normalized = String(value || "unknown").toLowerCase();
  return labels[normalized] || value || "غير محدد";
}

function getPerformanceBreakdownLabel(insight, breakdown) {
  if (breakdown === "age_gender") {
    return `${insight.age || "غير محدد"} / ${getTranslatedGender(insight.gender)}`;
  }

  if (breakdown === "placement") {
    return `${getTranslatedPublisherPlatform(
      insight.publisher_platform,
    )} - ${getTranslatedPlatformPosition(insight.platform_position)}`;
  }

  if (breakdown === "platform") {
    return getTranslatedPublisherPlatform(insight.publisher_platform);
  }

  if (breakdown === "device") {
    return getTranslatedDevicePlatform(insight.device_platform);
  }

  if (breakdown === "country") {
    return insight.country || insight.country_code || "غير محدد";
  }

  return insight.region || insight.region_name || insight.country || "غير محدد";
}

function getPerformanceBreakdownKey(insight, breakdown) {
  if (breakdown === "age_gender") {
    return `age_gender:${insight.age || "unknown"}:${insight.gender || "unknown"}`;
  }

  if (breakdown === "placement") {
    return `placement:${insight.publisher_platform || "unknown"}:${
      insight.platform_position || "unknown"
    }`;
  }

  if (breakdown === "platform") {
    return `platform:${insight.publisher_platform || "unknown"}`;
  }

  if (breakdown === "device") {
    return `device:${insight.device_platform || "unknown"}`;
  }

  if (breakdown === "country") {
    return `country:${insight.country || insight.country_code || "unknown"}`;
  }

  return `region:${insight.region || insight.region_name || insight.country || "unknown"}`;
}

function buildPerformanceBreakdownRecommendations(rows, campaigns, breakdown) {
  const recommendations = [];

  if (rows.length === 0) {
    return [
      {
        priority: "HIGH",
        title: "لا توجد بيانات breakdown كافية",
        message:
          "وسّع الفترة الزمنية أو انتظر مزامنة Meta؛ بدون شرائح لا نقدر نحدد هل المشكلة جمهور، موضع، أو صفحة هبوط.",
      },
    ];
  }

  const expensiveLowReturn = rows.find(
    (row) => row.metrics.spend >= 100 && row.metrics.purchases === 0,
  );
  if (expensiveLowReturn) {
    recommendations.push({
      priority: "HIGH",
      title: `إنفاق بدون مشتريات: ${expensiveLowReturn.label}`,
      message:
        "هذه الشريحة تسحب ميزانية ولا ترجع مشتريات. راجع الكريتيف/العرض أو استبعدها في اختبار منفصل.",
    });
  }

  const bestRow = rows.find((row) => row.metrics.purchases > 0);
  if (bestRow) {
    recommendations.push({
      priority: "MEDIUM",
      title: `أفضل شريحة حالياً: ${bestRow.label}`,
      message:
        "قسّم القرار على CPA وROAS وليس الإنفاق فقط، ثم اختبر رفع الميزانية تدريجياً إذا العينة كافية.",
    });
  }

  const weakCampaign = campaigns.find(
    (campaign) =>
      campaign.metrics.spend >= 150 &&
      campaign.metrics.purchases === 0 &&
      campaign.rows.length > 0,
  );
  if (weakCampaign) {
    recommendations.push({
      priority: "HIGH",
      title: `حملة تحتاج فحص: ${weakCampaign.campaignName}`,
      message:
        "الحملة تصرف بدون Purchase. افصل التشخيص بين CTR، Landing Page Views، Pixel Purchase، والتكرار قبل إيقافها بالكامل.",
    });
  }

  if (breakdown === "placement") {
    recommendations.push({
      priority: "LOW",
      title: "راجع Advantage+ Placements قبل الاستبعاد",
      message:
        "لو موضع واحد ضعيف، اختبره وحده أو راجع الكريتيف الخاص به بدل إلغاء كل المواضع مرة واحدة.",
    });
  }

  return recommendations.length > 0
    ? recommendations
    : [
        {
          priority: "LOW",
          title: "التوزيع لا يظهر مشكلة حادة",
          message:
            "لا توجد شريحة واضحة تستنزف الميزانية حالياً. راقب الحجم الإحصائي واستكمل التشخيص على مستوى الإعلان.",
        },
      ];
}

function toIsoDateOnly(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseReportDateInput(value) {
  const normalized = String(value || "").trim();
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);

  if (dateOnlyMatch) {
    return new Date(
      Number(dateOnlyMatch[1]),
      Number(dateOnlyMatch[2]) - 1,
      Number(dateOnlyMatch[3]),
    );
  }

  if (!normalized) {
    return null;
  }

  const parsedDate = new Date(normalized);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function normalizeReportDateRange(startDate, endDate, days = 30) {
  const today = new Date();
  const rangeEnd = parseReportDateInput(endDate) || today;
  const parsedStartDate = parseReportDateInput(startDate);
  const rangeStart = parsedStartDate || new Date(rangeEnd);

  if (!startDate) {
    rangeStart.setDate(rangeStart.getDate() - days + 1);
  }

  rangeStart.setHours(0, 0, 0, 0);
  rangeEnd.setHours(23, 59, 59, 999);

  return {
    rangeStart,
    rangeEnd,
    startDate: toIsoDateOnly(rangeStart),
    endDate: toIsoDateOnly(rangeEnd),
  };
}

function getPreviousDateRange(rangeStart, rangeEnd) {
  const durationMs = Math.max(24 * 60 * 60 * 1000, rangeEnd - rangeStart);
  const previousEnd = new Date(rangeStart);
  previousEnd.setDate(previousEnd.getDate() - 1);
  previousEnd.setHours(23, 59, 59, 999);

  const previousStart = new Date(previousEnd.getTime() - durationMs);
  previousStart.setHours(0, 0, 0, 0);

  return {
    rangeStart: previousStart,
    rangeEnd: previousEnd,
    startDate: toIsoDateOnly(previousStart),
    endDate: toIsoDateOnly(previousEnd),
  };
}

function aggregatePersistedInsights(insights = []) {
  const totals = createEmptyPerformanceTotals();
  insights.forEach((insight) => addInsightToTotals(totals, insight));
  return withDerivedPerformance(totals);
}

async function getMetaInsightsOrNull(adsService, metaNodeId, dateRange) {
  if (!adsService || !metaNodeId) {
    return null;
  }

  const result = await adsService.getInsights(metaNodeId, {
    since: dateRange.startDate,
    until: dateRange.endDate,
  });

  return result.success ? result.data || [] : null;
}

function percentChange(current, baseline) {
  if (!baseline) {
    return current > 0 ? 100 : 0;
  }

  return ((current - baseline) / baseline) * 100;
}

function buildAdComparison(current, baseline) {
  return {
    spend: percentChange(current.spend, baseline.spend),
    purchases: percentChange(current.purchases, baseline.purchases),
    roas: percentChange(current.roas, baseline.roas),
    cpa: percentChange(current.cpa, baseline.cpa),
    ctr: percentChange(current.ctr, baseline.ctr),
    frequency: percentChange(current.frequency, baseline.frequency),
  };
}

function buildAdFunnel(summary) {
  const steps = [
    {
      key: "impressions",
      label: "الظهور",
      value: summary.impressions,
      rate: 100,
    },
    {
      key: "linkClicks",
      label: "ضغطات الرابط",
      value: summary.linkClicks || summary.clicks,
      rate:
        summary.impressions > 0
          ? ((summary.linkClicks || summary.clicks) / summary.impressions) * 100
          : 0,
    },
    {
      key: "landingPageViews",
      label: "مشاهدات صفحة الهبوط",
      value: summary.landingPageViews,
      rate:
        (summary.linkClicks || summary.clicks) > 0
          ? (summary.landingPageViews / (summary.linkClicks || summary.clicks)) *
            100
          : 0,
    },
    {
      key: "conversions",
      label: "أحداث التحويل",
      value: summary.conversions,
      rate:
        summary.landingPageViews > 0
          ? (summary.conversions / summary.landingPageViews) * 100
          : 0,
    },
    {
      key: "purchases",
      label: "المشتريات",
      value: summary.purchases,
      rate:
        summary.landingPageViews > 0
          ? (summary.purchases / summary.landingPageViews) * 100
          : 0,
    },
  ];

  let diagnosis = {
    key: "stable",
    title: "لا توجد نقطة تسريب حادة",
    message:
      "الفانل لا يظهر كسر واضح حالياً. راقب الحجم الإحصائي وقارن الشرائح قبل القرار.",
    severity: "LOW",
  };

  if (summary.impressions === 0) {
    diagnosis = {
      key: "no_delivery",
      title: "لا يوجد Delivery كافٍ",
      message:
        "الإعلان لم يجمع ظهوراً كافياً في الفترة الحالية. افحص الحالة والميزانية والـ ad set.",
      severity: "HIGH",
    };
  } else if (summary.ctr > 0 && summary.ctr < 1) {
    diagnosis = {
      key: "creative",
      title: "المشكلة غالباً في الكريتيف أو أول Hook",
      message:
        "CTR أقل من 1%؛ الجمهور يرى الإعلان لكن لا يضغط بما يكفي. اختبر صورة/فيديو ونص افتتاحي جديد.",
      severity: "MEDIUM",
    };
  } else if (
    (summary.linkClicks || summary.clicks) > 0 &&
    summary.landingPageViews / (summary.linkClicks || summary.clicks) < 0.65
  ) {
    diagnosis = {
      key: "landing_page_load",
      title: "تسريب بين الضغط وصفحة الهبوط",
      message:
        "نسبة Landing Page Views من الضغطات ضعيفة. راجع سرعة الصفحة، الرابط، والـ Pixel/PageView.",
      severity: "HIGH",
    };
  } else if (summary.spend >= 100 && summary.purchases === 0) {
    diagnosis = {
      key: "offer_or_tracking",
      title: "إنفاق بدون Purchase",
      message:
        "الإعلان يصرف بدون مشتريات. راجع العرض، صفحة المنتج، checkout، وصحة حدث Purchase/CAPI.",
      severity: "HIGH",
    };
  } else if (summary.frequency > 3.5 && summary.ctr < 1.5) {
    diagnosis = {
      key: "fatigue",
      title: "احتمال إرهاق إعلاني",
      message:
        "التكرار مرتفع والضغط ضعيف نسبياً. جهز نسخة كريتيف جديدة أو وسع الجمهور.",
      severity: "MEDIUM",
    };
  }

  return { steps, diagnosis };
}

function buildAdVerdict(summary, previousSummary, adSetSummary, campaignSummary) {
  if (summary.impressions === 0) {
    return {
      status: "NO_DATA",
      label: "لا توجد بيانات كافية",
      tone: "slate",
      reason: "الإعلان يحتاج مزامنة أو فترة أطول قبل تقييم الأداء.",
    };
  }

  if (summary.spend >= 100 && summary.purchases === 0) {
    return {
      status: "FIX",
      label: "يحتاج إصلاح",
      tone: "red",
      reason: "يوجد إنفاق بدون مشتريات، فلا تزود الميزانية قبل فحص الفانل والتتبع.",
    };
  }

  if (summary.purchases >= 2 && summary.roas >= 3) {
    return {
      status: "SCALE",
      label: "قابل للتوسيع",
      tone: "green",
      reason: "ROAS جيد ومعه مشتريات كافية مبدئياً. التوسيع يكون تدريجياً مع مراقبة CPA.",
    };
  }

  if (adSetSummary.cpa > 0 && summary.cpa > adSetSummary.cpa * 1.25) {
    return {
      status: "FIX",
      label: "أضعف من متوسط المجموعة",
      tone: "amber",
      reason: "CPA أعلى من متوسط الـ Ad Set بأكثر من 25%. راجع الشرائح والكريتيف.",
    };
  }

  if (campaignSummary.roas > 0 && summary.roas < campaignSummary.roas * 0.75) {
    return {
      status: "WATCH",
      label: "راقب قبل القرار",
      tone: "amber",
      reason: "ROAS أقل من متوسط الحملة، لكنه لا يكفي وحده للإيقاف بدون قراءة الفانل.",
    };
  }

  if (previousSummary.spend > 0 && summary.cpa > previousSummary.cpa * 1.25) {
    return {
      status: "WATCH",
      label: "الأداء يتراجع",
      tone: "amber",
      reason: "CPA ارتفع مقارنة بالفترة السابقة. راقب التكرار والمواضع.",
    };
  }

  return {
    status: "MONITOR",
    label: "مستقر مبدئياً",
    tone: "blue",
    reason: "الأداء لا يظهر مشكلة حادة. القرار القادم يعتمد على breakdowns والحجم الإحصائي.",
  };
}

function buildAdDetailRecommendations({
  summary,
  previousSummary,
  adSetSummary,
  campaignSummary,
  funnel,
  ad,
  campaign,
}) {
  const recommendations = [];

  if (summary.impressions === 0) {
    recommendations.push({
      priority: "HIGH",
      title: "ابدأ بالمزامنة أو توسيع الفترة",
      message:
        "لا توجد بيانات Delivery كافية. زامن الإعلان أو اختر فترة أطول قبل أي حكم.",
    });
  }

  if (summary.spend >= 100 && summary.purchases === 0) {
    recommendations.push({
      priority: "HIGH",
      title: "لا تزود الميزانية الآن",
      message:
        "فيه إنفاق بدون Purchase. افحص Pixel/CAPI، صفحة المنتج، العرض، وسعر الشحن قبل التوسيع.",
    });
  }

  if (summary.ctr > 0 && summary.ctr < 1) {
    recommendations.push({
      priority: "MEDIUM",
      title: "اختبر Hook وكريتيف جديد",
      message:
        "CTR منخفض. حضّر نسخة أول سطر أقوى وصورة/فيديو يوضح المنتج مباشرة.",
    });
  }

  if (summary.frequency > 3.5) {
    recommendations.push({
      priority: "MEDIUM",
      title: "راجع إرهاق الجمهور",
      message:
        "Frequency مرتفعة. جهز إعلان جديد أو وسّع الجمهور قبل ما CPA يزيد أكثر.",
    });
  }

  if (adSetSummary.cpa > 0 && summary.cpa > adSetSummary.cpa * 1.25) {
    recommendations.push({
      priority: "HIGH",
      title: "قارنه بباقي إعلانات المجموعة",
      message:
        "الإعلان أغلى من متوسط الـ Ad Set. لو الـ breakdowns لا تظهر شريحة رابحة، اختبر بديل أو أوقفه.",
    });
  }

  if (campaignSummary.roas > 0 && summary.roas > campaignSummary.roas * 1.25) {
    recommendations.push({
      priority: "MEDIUM",
      title: "مرشح لتوسيع تدريجي",
      message:
        "ROAS أعلى من متوسط الحملة. زوّد 15-20% فقط مع مراقبة CPA يومياً.",
    });
  }

  if (previousSummary.spend > 0 && summary.roas < previousSummary.roas * 0.75) {
    recommendations.push({
      priority: "MEDIUM",
      title: "راجع سبب التراجع",
      message:
        "ROAS تراجع مقارنة بالفترة السابقة. افتح تقسيم المواضع والعمر/الجنس لتحديد مصدر الهبوط.",
    });
  }

  if (/SALES|CONVERSIONS/i.test(campaign?.objective || "") && !campaign?.pixelId) {
    recommendations.push({
      priority: "HIGH",
      title: "Pixel غير واضح على حملة مبيعات",
      message:
        "الحملة هدفها مبيعات لكن Pixel غير مسجل محلياً؛ ده يضعف قراءة Purchase وROAS.",
    });
  }

  if (funnel?.diagnosis?.key && funnel.diagnosis.key !== "stable") {
    recommendations.push({
      priority: funnel.diagnosis.severity || "MEDIUM",
      title: funnel.diagnosis.title,
      message: funnel.diagnosis.message,
    });
  }

  if (!ad?.facebookAdId) {
    recommendations.push({
      priority: "MEDIUM",
      title: "الإعلان غير مربوط بمعرف Meta",
      message:
        "بدون Facebook Ad ID لن تظهر المعاينة أو breakdowns الدقيقة من Meta.",
    });
  }

  return recommendations.length > 0
    ? recommendations
    : [
        {
          priority: "LOW",
          title: "لا توجد مشكلة حادة الآن",
          message:
            "راقب الأداء يومياً وافتح breakdowns قبل أي رفع كبير في الميزانية.",
        },
      ];
}

function buildAdBreakdownRecommendations(rows, breakdown) {
  if (rows.length === 0) {
    return [
      {
        priority: "HIGH",
        title: "لا توجد بيانات تفصيلية لهذا التقسيم",
        message:
          "زامن الإعلان من Meta أو وسّع الفترة. بدون breakdown لا يمكن تحديد هل المشكلة جمهور أو موضع أو جهاز.",
      },
    ];
  }

  const recommendations = [];
  const wasteRow = rows.find(
    (row) => row.metrics.spend >= 50 && row.metrics.purchases === 0,
  );
  if (wasteRow) {
    recommendations.push({
      priority: "HIGH",
      title: `إنفاق بدون مشتريات: ${wasteRow.label}`,
      message:
        "هذه الشريحة تسحب من الميزانية دون Purchase. اختبر استبعادها أو افصل لها كريتيف/عرض مختلف.",
    });
  }

  const bestRow = rows.find((row) => row.metrics.purchases > 0);
  if (bestRow) {
    recommendations.push({
      priority: "MEDIUM",
      title: `أفضل شريحة حالياً: ${bestRow.label}`,
      message:
        "استخدم هذه الشريحة كنقطة مقارنة عند تقييم باقي الشرائح، ولا توسع قبل حجم عينة كاف.",
    });
  }

  if (breakdown === "placement") {
    recommendations.push({
      priority: "LOW",
      title: "لا تستبعد المواضع دفعة واحدة",
      message:
        "لو موضع ضعيف، اختبر نسخة كريتيف مناسبة له قبل تعطيله بالكامل.",
    });
  }

  return recommendations.length > 0
    ? recommendations
    : [
        {
          priority: "LOW",
          title: "التوزيع مستقر",
          message:
            "لا توجد شريحة واضحة تستنزف الميزانية في هذا التقسيم حالياً.",
        },
      ];
}

function normalizeAdAccountId(adAccountId) {
  if (adAccountId === undefined || adAccountId === null) {
    return null;
  }

  const trimmedAccountId = String(adAccountId).trim();
  if (!trimmedAccountId) {
    return null;
  }

  return trimmedAccountId.startsWith("act_")
    ? trimmedAccountId.slice(4)
    : trimmedAccountId;
}

function getAdAccountLookupVariants(adAccountId) {
  const rawAccountId =
    adAccountId === undefined || adAccountId === null
      ? null
      : String(adAccountId).trim();
  const normalizedAccountId = normalizeAdAccountId(adAccountId);

  return Array.from(
    new Set(
      [
        rawAccountId,
        normalizedAccountId,
        normalizedAccountId ? `act_${normalizedAccountId}` : null,
      ].filter(Boolean),
    ),
  );
}

function doesAdAccountMatch(account, requestedAccountId) {
  const accountVariants = getAdAccountLookupVariants(
    account?.account_id || account?.accountId || account?.id,
  );
  const requestedVariants = getAdAccountLookupVariants(requestedAccountId);

  return requestedVariants.some((variant) => accountVariants.includes(variant));
}

async function setActiveAdAccount(companyId, facebookAdAccountRecordId) {
  const prisma = getSharedPrismaClient();

  await prisma.facebookAdAccount.updateMany({
    where: {
      companyId,
      id: { not: facebookAdAccountRecordId },
    },
    data: {
      isActive: false,
    },
  });

  return prisma.facebookAdAccount.update({
    where: { id: facebookAdAccountRecordId },
    data: {
      isActive: true,
      updatedAt: new Date(),
    },
  });
}

async function upsertAdAccount(companyId, accessToken, accountData) {
  const normalizedAccountId = normalizeAdAccountId(
    accountData?.account_id || accountData?.accountId || accountData?.id,
  );

  if (!normalizedAccountId) {
    return null;
  }

  const prisma = getSharedPrismaClient();
  const name = accountData?.name || `Facebook Ad Account ${normalizedAccountId}`;
  const currency = accountData?.currency || "USD";
  const timezone = accountData?.timezone_name || accountData?.timezone || null;

  const adAccount = await prisma.$transaction(async (tx) => {
    await tx.facebookAdAccount.updateMany({
      where: {
        companyId,
        accountId: { not: normalizedAccountId },
      },
      data: {
        isActive: false,
      },
    });

    return tx.facebookAdAccount.upsert({
      where: {
        companyId_accountId: {
          companyId,
          accountId: normalizedAccountId,
        },
      },
      update: {
        name,
        currency,
        timezone,
        accessToken,
        isActive: true,
        updatedAt: new Date(),
      },
      create: {
        companyId,
        accountId: normalizedAccountId,
        name,
        currency,
        timezone,
        accessToken,
        isActive: true,
      },
    });
  });

  return adAccount;
}

async function hydrateRemoteAdAccount(companyId, accessToken, adAccountId = null) {
  if (!accessToken) {
    return null;
  }

  try {
    const adsService = new FacebookAdsService(accessToken);
    const remoteAccountsResult = await adsService.getAdAccounts();

    if (
      !remoteAccountsResult.success ||
      !Array.isArray(remoteAccountsResult.data) ||
      remoteAccountsResult.data.length === 0
    ) {
      return null;
    }

    const remoteAccount = adAccountId
      ? remoteAccountsResult.data.find((account) =>
          doesAdAccountMatch(account, adAccountId),
        )
      : remoteAccountsResult.data.length === 1
        ? remoteAccountsResult.data[0]
        : null;

    if (!remoteAccount) {
      return null;
    }

    return upsertAdAccount(companyId, accessToken, remoteAccount);
  } catch (error) {
    console.error("❌ Error hydrating remote Ad Account:", error);
    return null;
  }
}

/**
 * جلب أو إنشاء Ad Account للشركة
 */
async function getOrCreateAdAccount(
  companyId,
  accessToken,
  adAccountId = null,
) {
  try {
    const prisma = getSharedPrismaClient();
    const lookupVariants = getAdAccountLookupVariants(adAccountId);

    // إذا كان هناك adAccountId، احصل عليه
    if (lookupVariants.length > 0) {
      const account = await prisma.facebookAdAccount.findFirst({
        where: {
          companyId,
          OR: lookupVariants.map((variant) => ({ accountId: variant })),
        },
      });

      if (account) {
        return account.isActive
          ? account
          : setActiveAdAccount(companyId, account.id);
      }

      const hydratedAccount = await hydrateRemoteAdAccount(
        companyId,
        accessToken,
        adAccountId,
      );
      if (hydratedAccount) {
        return hydratedAccount;
      }
    }

    // جلب Ad Account الافتراضي للشركة
    const defaultAccount = await prisma.facebookAdAccount.findFirst({
      where: {
        companyId,
        isActive: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    if (defaultAccount) {
      return defaultAccount;
    }

    return hydrateRemoteAdAccount(companyId, accessToken);
  } catch (error) {
    console.error("❌ Error getting Ad Account:", error);
    return null;
  }
}

async function getAdAccountReadScope(companyId, requestedAdAccountId = null) {
  const prisma = getSharedPrismaClient();
  const normalizedRequestedId =
    requestedAdAccountId === undefined || requestedAdAccountId === null
      ? null
      : String(requestedAdAccountId).trim();
  const lookupVariants = getAdAccountLookupVariants(requestedAdAccountId);

  if (normalizedRequestedId || lookupVariants.length > 0) {
    return prisma.facebookAdAccount.findFirst({
      where: {
        companyId,
        OR: [
          normalizedRequestedId ? { id: normalizedRequestedId } : null,
          ...lookupVariants.map((variant) => ({ accountId: variant })),
        ].filter(Boolean),
      },
    });
  }

  const activeAccount = await prisma.facebookAdAccount.findFirst({
    where: {
      companyId,
      isActive: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  if (activeAccount) {
    return activeAccount;
  }

  return prisma.facebookAdAccount.findFirst({
    where: { companyId },
    orderBy: {
      updatedAt: "desc",
    },
  });
}

async function syncCampaignStructureFromMeta({
  prisma,
  companyId,
  campaign,
  fbAdSets,
  adsByAdSetId,
}) {
  const counters = {
    adSets: 0,
    ads: 0,
  };

  for (const fbAdSet of fbAdSets || []) {
    const budget = getMetaBudget(
      fbAdSet,
      campaign.budgetType,
      campaign.budgetAmount,
    );
    const targeting = parseJsonObject(fbAdSet.targeting);
    const existingAdSet = await prisma.facebookAdset.findFirst({
      where: {
        campaignId: campaign.id,
        facebookAdSetId: fbAdSet.id,
      },
    });
    const adSetSettings = mergeSettings(
      parseJsonObject(existingAdSet?.settings),
      {
        meta: buildAdSetMetaSettings(fbAdSet),
        targeting,
      },
    );
    const adSetData = {
      campaignId: campaign.id,
      name: fbAdSet.name || `Meta Ad Set ${fbAdSet.id}`,
      status: fbAdSet.status || "PAUSED",
      facebookAdSetId: fbAdSet.id,
      targeting: stringifyJson(targeting),
      ageMin: toNullableNumber(targeting.age_min),
      ageMax: toNullableNumber(targeting.age_max),
      genders: targeting.genders ? stringifyJson(targeting.genders) : null,
      locations: targeting.geo_locations
        ? stringifyJson(targeting.geo_locations)
        : null,
      interests: targeting.interests ? stringifyJson(targeting.interests) : null,
      behaviors: targeting.behaviors ? stringifyJson(targeting.behaviors) : null,
      customAudiencesJson: targeting.custom_audiences
        ? stringifyJson(targeting.custom_audiences)
        : null,
      lookalikeAudiencesJson: targeting.lookalike_spec
        ? stringifyJson(targeting.lookalike_spec)
        : null,
      budgetType: budget.budgetType,
      budgetAmount: budget.budgetAmount,
      optimizationGoal: fbAdSet.optimization_goal || null,
      billingEvent: fbAdSet.billing_event || null,
      settings: stringifyJson(adSetSettings),
      lastSyncAt: new Date(),
    };

    const adSet = existingAdSet
      ? await prisma.facebookAdset.update({
          where: { id: existingAdSet.id },
          data: adSetData,
        })
      : await prisma.facebookAdset.create({
          data: adSetData,
        });

    counters.adSets += 1;

    for (const fbAd of adsByAdSetId.get(fbAdSet.id) || []) {
      const creative = extractMetaAdCreative(fbAd);
      const existingAd = await prisma.facebookAd.findFirst({
        where: {
          adSetId: adSet.id,
          facebookAdId: fbAd.id,
        },
      });
      const adData = {
        adSetId: adSet.id,
        companyId,
        name: fbAd.name || `Meta Ad ${fbAd.id}`,
        status: fbAd.status || "PAUSED",
        facebookAdId: fbAd.id,
        creativeType: creative.creativeType,
        primaryText: creative.primaryText || "Synced from Meta",
        headline: creative.headline,
        description: creative.description,
        callToAction: creative.callToAction,
        imageUrl: creative.imageUrl,
        videoUrl: null,
        imageHash: creative.imageHash,
        videoId: creative.videoId,
        carouselImages: creative.carouselImages,
        carouselCount: creative.carouselCount,
        linkUrl: creative.linkUrl,
        creative: stringifyJson(
          mergeSettings(parseJsonObject(existingAd?.creative), {
            meta: buildAdMetaSettings(fbAd),
            rawCreative: parseJsonObject(creative.creative),
          }),
        ),
        lastSyncAt: new Date(),
      };

      if (existingAd) {
        await prisma.facebookAd.update({
          where: { id: existingAd.id },
          data: adData,
        });
      } else {
        await prisma.facebookAd.create({
          data: adData,
        });
      }

      counters.ads += 1;
    }
  }

  return counters;
}

/**
 * ============================================
 * Campaign Endpoints
 * ============================================
 */

/**
 * GET /api/v1/facebook-ads/campaigns
 * جلب جميع الحملات
 */
const getCampaigns = async (req, res) => {
  try {
    const companyId = req.user?.companyId || req.body.companyId;
    const requestedAdAccountId = req.query?.adAccountId || req.body?.adAccountId;
    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: "Company ID is required",
      });
    }

    const adAccountScope = await getAdAccountReadScope(
      companyId,
      requestedAdAccountId,
    );

    if (!adAccountScope) {
      return res.json({
        success: true,
        data: [],
        count: 0,
        meta: {
          accountScoped: true,
          adAccount: null,
        },
      });
    }

    // جلب الحملات من قاعدة البيانات
    const campaigns = await getSharedPrismaClient().facebookCampaign.findMany({
      where: {
        companyId,
        adAccountId: adAccountScope.id,
      },
      include: {
        facebookAdsets: {
          include: {
            facebookAds: {
              include: {
                facebookAdInsights: {
                  take: 1,
                  orderBy: { date: "desc" },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    const clientCampaigns = campaigns.map((campaign) =>
      buildCampaignClientPayload(campaign, adAccountScope),
    );

    res.json({
      success: true,
      data: clientCampaigns,
      count: clientCampaigns.length,
      meta: {
        accountScoped: true,
        adAccount: sanitizeFacebookAdAccountForClient(adAccountScope),
      },
    });
  } catch (error) {
    console.error("❌ Error getting campaigns:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * POST /api/v1/facebook-ads/campaigns
 * إنشاء حملة جديدة
 */
const createCampaign = async (req, res) => {
  try {
    const companyId = req.user?.companyId || req.body.companyId;
    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: "Company ID is required",
      });
    }

    const {
      name,
      objective,
      status = "PAUSED",
      budgetType,
      budgetAmount,
      startDate,
      endDate,
      pixelId,
      adAccountId,
      // Campaign settings
      description,
      specialAdCategories,
      budgetOptimization,
      spendLimit,
      timezone,
      buyingType = "AUCTION",
      bidStrategy,
      // Targeting settings
      conversionLocation,
      optimizationGoal,
      targeting,
      // Placements settings
      placementType,
      placements,
    } = req.body;

    // التحقق من البيانات المطلوبة
    if (!name || !objective || !budgetType || !budgetAmount) {
      return res.status(400).json({
        success: false,
        error:
          "Missing required fields: name, objective, budgetType, budgetAmount",
      });
    }

    // جلب Access Token
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error:
          "Facebook Access Token not found. Please connect your Facebook account first.",
      });
    }

    // جلب أو إنشاء Ad Account
    const adAccount = await getOrCreateAdAccount(
      companyId,
      accessToken,
      adAccountId,
    );
    if (!adAccount) {
      return res.status(400).json({
        success: false,
        error:
          "Ad Account not found. Please choose and activate your Ad Account first.",
      });
    }

    // إنشاء Service
    const adsService = new FacebookAdsService(accessToken, adAccount.accountId);

    // إنشاء الحملة في Facebook مع كل البيانات
    const facebookResult = await adsService.createCampaign({
      name,
      objective,
      status,
      adAccountId: adAccount.accountId,
      specialAdCategories: specialAdCategories || [],
      budgetOptimization: budgetOptimization || false,
      budgetType,
      budgetAmount,
      spendLimit,
      buyingType,
      bidStrategy,
    });

    if (!facebookResult.success) {
      return res.status(400).json({
        success: false,
        error: facebookResult.error,
      });
    }

    // حفظ الحملة في قاعدة البيانات مع كل البيانات
    const campaign = await getSharedPrismaClient().facebookCampaign.create({
      data: {
        companyId,
        adAccountId: adAccount.id,
        name,
        objective,
        status,
        facebookCampaignId: facebookResult.campaignId,
        budgetType,
        budgetAmount,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        pixelId,
        // حفظ كل الإعدادات في JSON
        settings: JSON.stringify({
          description,
          specialAdCategories,
          budgetOptimization,
          spendLimit,
          timezone,
          buyingType,
          bidStrategy,
          // Targeting settings
          conversionLocation,
          optimizationGoal,
          targeting,
          // Placements settings
          placementType,
          placements,
          meta: buildCampaignMetaSettings(
            {
              id: facebookResult.campaignId,
              status,
              configured_status: status,
              effective_status: status,
            },
            adAccount,
          ),
        }),
      },
    });

    // إذا كان هناك targeting، ننشئ Ad Set تلقائياً
    if (targeting && facebookResult.campaignId) {
      try {
        const adSetResult = await adsService.createAdSet(
          facebookResult.campaignId,
          {
            name: `${name} - Ad Set`,
            status,
            targeting,
            budgetType: budgetOptimization ? undefined : budgetType,
            budgetAmount: budgetOptimization ? undefined : budgetAmount,
            optimizationGoal: optimizationGoal || "LINK_CLICKS",
            billingEvent: "IMPRESSIONS",
            placementType,
            placements,
          },
        );

        if (adSetResult.success) {
          // حفظ Ad Set في قاعدة البيانات
          await getSharedPrismaClient().facebookAdset.create({
            data: {
              campaignId: campaign.id,
              facebookAdSetId: adSetResult.adSetId,
              name: `${name} - Ad Set`,
              status,
              targeting: JSON.stringify(targeting),
              budgetType: budgetType || "DAILY",
              budgetAmount: toFiniteNumber(budgetAmount),
              optimizationGoal: optimizationGoal || "LINK_CLICKS",
              settings: JSON.stringify({
                budgetOptimization: Boolean(budgetOptimization),
                budgetSource: budgetOptimization ? "CAMPAIGN" : "AD_SET",
              }),
            },
          });
          console.log("✅ Ad Set created automatically:", adSetResult.adSetId);
        }
      } catch (adSetError) {
        console.warn(
          "⚠️ Failed to create automatic Ad Set:",
          adSetError.message,
        );
        // لا نفشل الحملة إذا فشل إنشاء Ad Set
      }
    }

    res.json({
      success: true,
      data: campaign,
      message: "Campaign created successfully",
    });
  } catch (error) {
    console.error("❌ Error creating campaign:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * POST /api/v1/facebook-ads/full-ad
 * إنشاء إعلان كامل (Campaign + AdSet + Ad) في خطوة واحدة
 * هذا هو الـ endpoint الرئيسي لإنشاء إعلان من الـ Wizard
 */
const createFullAd = async (req, res) => {
  let publishRequest = null;
  let publishPrisma = null;
  try {
    const companyId = req.user?.companyId;
    const data = req.body;
    const userId = req.user?.id || req.user?.userId || null;
    publishPrisma = getSharedPrismaClient();
    if (!companyId) {
      return res.status(401).json({
        success: false,
        error: "Company ID is required",
        errorCode: "COMPANY_ID_REQUIRED",
      });
    }
    const clientRequestId = normalizeClientRequestId(
      data.clientRequestId || data.idempotencyKey,
    );
    if (!clientRequestId) {
      return res.status(400).json({
        success: false,
        error:
          "طلب إنشاء الإعلان يحتاج مفتاح idempotency ثابت من الواجهة قبل النشر لمنع إنشاء إعلان مكرر.",
        errorCode: "FACEBOOK_AD_PUBLISH_IDEMPOTENCY_REQUIRED",
        field: "clientRequestId",
      });
    }
    data.clientRequestId = clientRequestId;
    data.status = normalizeFullAdStatus(data.status);
    const requestHash = buildPublishRequestHash(data);

    const existingPublishRequest = await getExistingPublishRequest(
      publishPrisma,
      companyId,
      clientRequestId,
    );

    if (existingPublishRequest) {
      return sendExistingPublishRequestResponse(
        res,
        existingPublishRequest,
        clientRequestId,
        requestHash,
      );
    }

    // التحقق من وجود Access Token
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error:
          "Facebook Ads Access Token not found. Please connect your Facebook account first.",
      });
    }

    const adAccount = await getOrCreateAdAccount(
      companyId,
      accessToken,
      data.adAccountId,
    );

    if (!adAccount) {
      return res.status(404).json({
        success: false,
        error:
          "No Facebook Ad Account is ready yet. Please choose and activate an Ad Account first.",
      });
    }

    // إنشاء الـ Service
    const adsService = new FacebookAdsService(accessToken, adAccount.accountId);

    // التحقق من البيانات المطلوبة
    const {
      campaignName,
      objective,
      budgetAmount,
      pageId,
      primaryText,
      headline,
      linkUrl,
    } = data;
    const creativeType = normalizeFullAdCreativeType(data.creativeType);
    const normalizedBudgetType = data.budgetType || "DAILY";
    const normalizedBudgetAmount = toFiniteNumber(budgetAmount);

    if (!campaignName) {
      return res
        .status(400)
        .json({ success: false, error: "Campaign name is required" });
    }
    if (!objective) {
      return res
        .status(400)
        .json({ success: false, error: "Campaign objective is required" });
    }
    if (!normalizedBudgetAmount || normalizedBudgetAmount <= 0) {
      return res
        .status(400)
        .json({ success: false, error: "Valid budget amount is required" });
    }
    const budgetValidationError = buildFullAdBudgetValidationError({
      budgetAmount: normalizedBudgetAmount,
      adAccount,
    });
    if (budgetValidationError) {
      return res.status(400).json(budgetValidationError);
    }
    if (!pageId) {
      return res
        .status(400)
        .json({ success: false, error: "Facebook Page ID is required" });
    }
    if (!primaryText) {
      return res
        .status(400)
        .json({ success: false, error: "Ad primary text is required" });
    }
    if (!linkUrl) {
      return res
        .status(400)
        .json({ success: false, error: "Destination URL is required" });
    }
    if (requiresFullAdPixel(data) && !String(data.pixelId || "").trim()) {
      return res.status(400).json({
        success: false,
        error:
          "مسار المبيعات أو التحويلات يحتاج Facebook Pixel واضح قبل النشر.",
        errorCode: "FACEBOOK_PIXEL_REQUIRED",
        field: "pixelId",
      });
    }
    if (data.status === "ACTIVE" && !hasActivePublishConfirmation(data)) {
      return res.status(409).json({
        success: false,
        error:
          "تشغيل الإعلان كـ ACTIVE يحتاج تأكيد نشر صريح من الواجهة لمنع صرف غير مقصود.",
        errorCode: "ACTIVE_PUBLISH_CONFIRMATION_REQUIRED",
        field: "status",
      });
    }

    const creativeValidationError = validateFullAdCreativePayload(
      data,
      creativeType,
    );
    if (creativeValidationError) {
      return res.status(400).json({
        success: false,
        error: creativeValidationError,
      });
    }

    data.creativeType = creativeType;
    data.budgetType = normalizedBudgetType;
    data.budgetAmount = normalizedBudgetAmount;
    Object.assign(data, normalizeFullAdDeliverySettings(data));

    if (
      data.bidStrategy !== "LOWEST_COST" &&
      (!toFiniteNumber(data.bidValue) || toFiniteNumber(data.bidValue) <= 0)
    ) {
      return res.status(400).json({
        success: false,
        error:
          "Bid amount is required when using bid cap, cost cap, or ROAS bidding.",
        errorCode: "BID_VALUE_REQUIRED",
        field: "bidValue",
      });
    }

    const readinessError = await validateFullAdAssetReadiness({
      companyId,
      pageId,
      pixelId: data.pixelId,
      adAccount,
      adsService,
      data,
    });
    if (readinessError) {
      return res.status(400).json(readinessError);
    }

    publishRequest = await createPublishRequest(publishPrisma, {
      companyId,
      userId,
      clientRequestId,
      requestHash,
      data,
    });
    if (publishRequest?.__duplicateLock) {
      return sendExistingPublishRequestResponse(
        res,
        publishRequest,
        clientRequestId,
        requestHash,
      );
    }

    console.log("🚀 Creating Full Ad for company:", companyId);

    // إنشاء الإعلان الكامل
    const result = await adsService.createFullAd(data);

    if (!result.success) {
      const reachedMeta = didFullAdAttemptReachMeta(result);
      const publishFailureStatus = reachedMeta ? "META_PARTIAL_FAILED" : "FAILED";
      const failurePayload = {
        success: false,
        error: result.error,
        errorCode: reachedMeta
          ? "FACEBOOK_AD_PUBLISH_META_PARTIAL_FAILED"
          : "FACEBOOK_AD_PUBLISH_PRE_META_FAILED",
        retryableWithNewRequestId: !reachedMeta,
        step: result.step,
        partialSuccess: result.partialSuccess,
        results: result.results,
      };
      await updatePublishRequest(publishPrisma, publishRequest, {
        status: publishFailureStatus,
        responsePayload: safeStringifyJson(failurePayload),
        errorMessage: result.error || null,
        step: result.step || null,
        partialSuccess: Boolean(result.partialSuccess),
        facebookCampaignId: result.results?.campaign?.campaignId || null,
        facebookAdSetId: result.results?.adSet?.adSetId || null,
        facebookAdId: result.results?.ad?.adId || null,
        facebookCreativeId: result.results?.creative?.creativeId || null,
        completedAt: new Date(),
        lockExpiresAt: null,
      });
      return res.status(400).json({
        ...failurePayload,
        idempotency: {
          clientRequestId: data.clientRequestId,
        },
      });
    }

    // حفظ البيانات في قاعدة البيانات
    try {
      // حفظ Campaign
      const campaign = await getSharedPrismaClient().facebookCampaign.create({
        data: {
          companyId,
          adAccountId: adAccount.id,
          name: data.campaignName,
          objective: data.objective,
          status: data.status || "PAUSED",
          facebookCampaignId: result.campaignId,
          budgetType: normalizedBudgetType,
          budgetAmount: normalizedBudgetAmount,
          startDate: data.startTime ? new Date(data.startTime) : null,
          endDate: data.endTime ? new Date(data.endTime) : null,
          pixelId: data.pixelId || null,
          settings: JSON.stringify({
            budgetOptimization: data.budgetOptimization,
            bidStrategy: data.bidStrategy,
            specialAdCategories: data.specialAdCategories,
            meta: buildCampaignMetaSettings(
              {
                id: result.campaignId,
                status: data.status || "PAUSED",
                configured_status: data.status || "PAUSED",
                effective_status: data.status || "PAUSED",
              },
              adAccount,
            ),
          }),
        },
      });

      // حفظ AdSet
      const adSet = await getSharedPrismaClient().facebookAdset.create({
        data: {
          campaignId: campaign.id,
          facebookAdSetId: result.adSetId,
          name: data.adSetName || `${data.campaignName} - AdSet`,
          status: data.status || "PAUSED",
          targeting: JSON.stringify(data.targeting || {}),
          budgetType: normalizedBudgetType,
          budgetAmount: normalizedBudgetAmount,
          optimizationGoal: data.optimizationGoal || "LINK_CLICKS",
          settings: JSON.stringify({
            budgetOptimization: Boolean(data.budgetOptimization),
            budgetSource: data.budgetOptimization ? "CAMPAIGN" : "AD_SET",
            billingEvent: data.billingEvent || "IMPRESSIONS",
            performanceGoal: data.performanceGoal || null,
            conversionEvent: data.conversionEvent || null,
            conversionLocation: data.conversionLocation || null,
            attributionWindow: data.attributionWindow || null,
            pixelId: data.pixelId || null,
          }),
        },
      });

      // حفظ Ad
      const storedCreative = getPersistedCreativePayload(
        data,
        result,
        creativeType,
      );
      const storedCarouselCards = storedCreative.carouselCards || [];
      const ad = await getSharedPrismaClient().facebookAd.create({
        data: {
          companyId,
          adSetId: adSet.id,
          facebookAdId: result.adId,
          name: data.adName || `${data.campaignName} - Ad`,
          status: data.status || "PAUSED",
          creativeType,
          primaryText: data.primaryText,
          headline: data.headline || null,
          description: data.description || null,
          callToAction: data.callToAction || "LEARN_MORE",
          imageUrl: data.imageUrl || null,
          videoUrl: data.videoUrl || null,
          imageHash: result.imageHash || data.imageHash || null,
          videoId: result.videoId || data.videoId || null,
          carouselImages:
            creativeType === "CAROUSEL"
              ? JSON.stringify(storedCarouselCards)
              : null,
          carouselCount:
            creativeType === "CAROUSEL" ? storedCarouselCards.length : 1,
          linkUrl: data.linkUrl,
          productId: data.productId || null,
          creative: JSON.stringify(storedCreative),
        },
      });

      console.log("✅ Full Ad saved to database");

      const successPayload = {
        success: true,
        data: {
          campaign,
          adSet,
          ad,
          facebookIds: {
            campaignId: result.campaignId,
            adSetId: result.adSetId,
            adId: result.adId,
            creativeId: result.creativeId,
          },
        },
        message: "Full ad created successfully!",
        idempotency: {
          clientRequestId: data.clientRequestId,
        },
      };

      await updatePublishRequest(publishPrisma, publishRequest, {
        status: "SUCCEEDED",
        responsePayload: safeStringifyJson(successPayload),
        facebookCampaignId: result.campaignId,
        facebookAdSetId: result.adSetId,
        facebookAdId: result.adId,
        facebookCreativeId: result.creativeId,
        completedAt: new Date(),
        lockExpiresAt: null,
      });

      res.json(successPayload);
    } catch (dbError) {
      console.error(
        "⚠️ Database save error (ad was created on Facebook):",
        dbError,
      );

      // الإعلان تم إنشاؤه على Facebook لكن فشل الحفظ في DB
      const warningPayload = {
        success: true,
        warning: "Ad created on Facebook but failed to save locally",
        facebookIds: {
          campaignId: result.campaignId,
          adSetId: result.adSetId,
          adId: result.adId,
          creativeId: result.creativeId,
        },
        message: result.message,
        idempotency: {
          clientRequestId: data.clientRequestId,
        },
      };

      await updatePublishRequest(publishPrisma, publishRequest, {
        status: "LOCAL_SAVE_FAILED",
        responsePayload: safeStringifyJson(warningPayload),
        errorMessage: dbError.message || "Local DB save failed after Meta creation",
        facebookCampaignId: result.campaignId,
        facebookAdSetId: result.adSetId,
        facebookAdId: result.adId,
        facebookCreativeId: result.creativeId,
        completedAt: new Date(),
        lockExpiresAt: null,
      });

      res.json(warningPayload);
    }
  } catch (error) {
    console.error("❌ Error creating full ad:", error);
    await updatePublishRequest(publishPrisma, publishRequest, {
      status: "FAILED",
      responsePayload: safeStringifyJson({
        success: false,
        error: error.message,
        errorCode: "FACEBOOK_AD_PUBLISH_FAILED",
      }),
      errorMessage: error.message || "Failed to create full ad",
      completedAt: new Date(),
      lockExpiresAt: null,
    });
    res.status(500).json({
      success: false,
      error: error.message,
      errorCode: "FACEBOOK_AD_PUBLISH_FAILED",
    });
  }
};

/**
 * GET /api/v1/facebook-ads/campaigns/:id
 * جلب تفاصيل حملة
 */
const getCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;

    const campaign = await getSharedPrismaClient().facebookCampaign.findFirst({
      where: {
        id,
        companyId,
      },
      include: {
        facebookAdsets: {
          include: {
            facebookAds: {
              include: {
                facebookAdInsights: {
                  take: 30,
                  orderBy: { date: "desc" },
                },
              },
            },
          },
        },
        facebookAdAccount: true,
      },
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: "Campaign not found",
      });
    }

    res.json({
      success: true,
      data: buildCampaignClientPayload(campaign, campaign.facebookAdAccount),
    });
  } catch (error) {
    console.error("❌ Error getting campaign:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * PUT /api/v1/facebook-ads/campaigns/:id
 * تحديث حملة
 */
const updateCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;
    const updateData = req.body;

    // جلب الحملة
    const campaign = await getSharedPrismaClient().facebookCampaign.findFirst({
      where: { id, companyId },
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: "Campaign not found",
      });
    }

    // تحديث في Facebook إذا كان موجود
    if (campaign.facebookCampaignId) {
      const accessToken = await getCompanyAdsAccessToken(companyId);
      if (accessToken) {
        const adsService = new FacebookAdsService(accessToken);
        await adsService.updateCampaign(
          campaign.facebookCampaignId,
          updateData,
        );
      }
    }

    // تحديث في قاعدة البيانات
    const updated = await getSharedPrismaClient().facebookCampaign.update({
      where: { id },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
    });

    res.json({
      success: true,
      data: updated,
      message: "Campaign updated successfully",
    });
  } catch (error) {
    console.error("❌ Error updating campaign:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * DELETE /api/v1/facebook-ads/campaigns/:id
 * حذف حملة
 */
const deleteCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;

    // جلب الحملة
    const campaign = await getSharedPrismaClient().facebookCampaign.findFirst({
      where: { id, companyId },
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: "Campaign not found",
      });
    }

    // حذف من Facebook إذا كان موجود
    if (campaign.facebookCampaignId) {
      const accessToken = await getCompanyAdsAccessToken(companyId);
      if (accessToken) {
        const adsService = new FacebookAdsService(accessToken);
        await adsService.deleteCampaign(campaign.facebookCampaignId);
      }
    }

    // حذف من قاعدة البيانات (CASCADE سيحذف AdSets و Ads تلقائياً)
    await getSharedPrismaClient().facebookCampaign.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "Campaign deleted successfully",
    });
  } catch (error) {
    console.error("❌ Error deleting campaign:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * POST /api/v1/facebook-ads/campaigns/:id/pause
 * إيقاف حملة
 */
const pauseCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;

    const campaign = await getSharedPrismaClient().facebookCampaign.findFirst({
      where: { id, companyId },
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: "Campaign not found",
      });
    }

    // إيقاف في Facebook
    if (campaign.facebookCampaignId) {
      const accessToken = await getCompanyAdsAccessToken(companyId);
      if (accessToken) {
        const adsService = new FacebookAdsService(accessToken);
        await adsService.updateCampaign(campaign.facebookCampaignId, {
          status: "PAUSED",
        });
      }
    }

    // تحديث في قاعدة البيانات
    const updated = await getSharedPrismaClient().facebookCampaign.update({
      where: { id },
      data: { status: "PAUSED" },
    });

    res.json({
      success: true,
      data: updated,
      message: "Campaign paused successfully",
    });
  } catch (error) {
    console.error("❌ Error pausing campaign:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * POST /api/v1/facebook-ads/campaigns/:id/resume
 * استئناف حملة
 */
const resumeCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;

    const campaign = await getSharedPrismaClient().facebookCampaign.findFirst({
      where: { id, companyId },
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: "Campaign not found",
      });
    }

    // تفعيل في Facebook
    if (campaign.facebookCampaignId) {
      const accessToken = await getCompanyAdsAccessToken(companyId);
      if (accessToken) {
        const adsService = new FacebookAdsService(accessToken);
        await adsService.updateCampaign(campaign.facebookCampaignId, {
          status: "ACTIVE",
        });
      }
    }

    // تحديث في قاعدة البيانات
    const updated = await getSharedPrismaClient().facebookCampaign.update({
      where: { id },
      data: { status: "ACTIVE" },
    });

    res.json({
      success: true,
      data: updated,
      message: "Campaign resumed successfully",
    });
  } catch (error) {
    console.error("❌ Error resuming campaign:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const getBulkStatusModel = (entityType) => {
  switch (String(entityType || "").toLowerCase()) {
    case "campaign":
    case "campaigns":
      return {
        type: "campaign",
        prismaKey: "facebookCampaign",
        metaIdKey: "facebookCampaignId",
        findWhere: (ids, companyId) => ({ id: { in: ids }, companyId }),
        serviceUpdate: (adsService, metaId, status) =>
          adsService.updateCampaign(metaId, { status }),
      };
    case "adset":
    case "adsets":
    case "ad_set":
    case "ad_sets":
      return {
        type: "adset",
        prismaKey: "facebookAdset",
        metaIdKey: "facebookAdSetId",
        findWhere: (ids, companyId) => ({
          id: { in: ids },
          facebookCampaign: { companyId },
        }),
        serviceUpdate: (adsService, metaId, status) =>
          adsService.updateAdSet(metaId, { status }),
      };
    case "ad":
    case "ads":
      return {
        type: "ad",
        prismaKey: "facebookAd",
        metaIdKey: "facebookAdId",
        findWhere: (ids, companyId) => ({ id: { in: ids }, companyId }),
        serviceUpdate: (adsService, metaId, status) =>
          adsService.updateAd(metaId, { status }),
      };
    default:
      return null;
  }
};

const resolveBulkStatus = (action, explicitStatus) => {
  const normalizedAction = String(action || "").toLowerCase();
  const normalizedStatus = String(explicitStatus || "").toUpperCase();

  if (normalizedAction === "pause") return "PAUSED";
  if (normalizedAction === "resume") return "ACTIVE";
  if (normalizedAction === "delete") return "DELETE_NOT_SUPPORTED";
  if (["PAUSED", "ACTIVE"].includes(normalizedStatus)) return normalizedStatus;
  return null;
};

/**
 * POST /api/v1/facebook-ads/bulk/status
 * تحديث حالة عدة Campaigns / AdSets / Ads بأمان
 */
const bulkUpdateStatus = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { entityType, targetType, ids, action, status } = req.body || {};
    const model = getBulkStatusModel(entityType || targetType);
    const nextStatus = resolveBulkStatus(action, status);
    const uniqueIds = Array.from(
      new Set(
        (Array.isArray(ids) ? ids : [])
          .map((id) => String(id || "").trim())
          .filter(Boolean),
      ),
    );

    if (!companyId) {
      return res.status(401).json({
        success: false,
        error: "Company context is required.",
      });
    }

    if (!model) {
      return res.status(400).json({
        success: false,
        error: "entityType must be one of campaign, adset, or ad.",
      });
    }

    if (nextStatus === "DELETE_NOT_SUPPORTED") {
      return res.status(400).json({
        success: false,
        error: "Bulk delete is not enabled. Use single-item delete routes with explicit confirmation.",
      });
    }

    if (!nextStatus) {
      return res.status(400).json({
        success: false,
        error: "Bulk status supports only pause/resume actions or ACTIVE/PAUSED status.",
      });
    }

    if (uniqueIds.length === 0 || uniqueIds.length > 50) {
      return res.status(400).json({
        success: false,
        error: "ids must include between 1 and 50 local record ids.",
      });
    }

    const prisma = getSharedPrismaClient();
    const records = await prisma[model.prismaKey].findMany({
      where: model.findWhere(uniqueIds, companyId),
    });
    const recordsById = new Map(records.map((record) => [record.id, record]));
    const accessToken = await getCompanyAdsAccessToken(companyId);
    const adsService = accessToken ? new FacebookAdsService(accessToken) : null;
    const results = [];

    for (const id of uniqueIds) {
      const record = recordsById.get(id);

      if (!record) {
        results.push({
          id,
          success: false,
          error: "Record not found for this company.",
        });
        continue;
      }

      const metaId = record[model.metaIdKey];
      if (metaId && !adsService) {
        results.push({
          id,
          success: false,
          error: "Facebook Ads Access Token not found.",
        });
        continue;
      }

      if (metaId) {
        const metaResult = await model.serviceUpdate(
          adsService,
          metaId,
          nextStatus,
        );

        if (!metaResult?.success) {
          results.push({
            id,
            success: false,
            metaId,
            error: metaResult?.error || "Meta status update failed.",
          });
          continue;
        }
      }

      const updated = await prisma[model.prismaKey].update({
        where: { id },
        data: {
          status: nextStatus,
          updatedAt: new Date(),
        },
      });

      results.push({
        id,
        success: true,
        status: nextStatus,
        metaId: metaId || null,
        metaUpdated: Boolean(metaId),
        data: updated,
      });
    }

    const failed = results.filter((result) => !result.success);

    return res.status(failed.length > 0 ? 207 : 200).json({
      success: failed.length === 0,
      entityType: model.type,
      status: nextStatus,
      updatedCount: results.length - failed.length,
      failedCount: failed.length,
      results,
    });
  } catch (error) {
    console.error("❌ Error bulk updating Facebook Ads status:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * ============================================
 * Ad Accounts Endpoints
 * ============================================
 */

const AD_ACCOUNTS_CACHE_TTL_MS = 60 * 1000;
const adAccountsMemoryCache = new Map();
const PERFORMANCE_CACHE_TTL_MS = 60 * 1000;
const performanceSummaryMemoryCache = new Map();

/**
 * GET /api/v1/facebook-ads/ad-accounts
 * جلب Ad Accounts المتاحة
 */
const getAdAccounts = async (req, res) => {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: "Company ID is required",
      });
    }

    if (process.env.NODE_ENV !== "test" && req.query?.refresh !== "true") {
      const cached = adAccountsMemoryCache.get(companyId);
      if (cached && Date.now() < cached.expiresAt) {
        return res.json({
          success: true,
          data: cached.data,
          meta: {
            ...cached.meta,
            cached: true,
          },
        });
      }
    }

    const savedAdAccounts = await getSharedPrismaClient().facebookAdAccount.findMany(
      {
        where: { companyId },
        select: {
          id: true,
          accountId: true,
          name: true,
          currency: true,
          timezone: true,
          isActive: true,
        },
        orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
      },
    );

    const accessToken = await getCompanyAdsAccessToken(companyId);

    if (!accessToken) {
      return res.json({
        success: true,
        data: buildSavedAdAccountFallbacks(
          savedAdAccounts,
          new Set(),
          "NO_COMPANY_ACCESS_TOKEN",
        ),
        meta: {
          configured: false,
          reason: "NO_ACCESS_TOKEN",
        },
      });
    }

    const adsService = new FacebookAdsService(accessToken);
    const result = await adsService.getAdAccounts();

    if (!result.success) {
      return res.json({
        success: true,
        data: buildSavedAdAccountFallbacks(
          savedAdAccounts,
          new Set(),
          "FACEBOOK_API_ERROR",
        ),
        meta: {
          configured: false,
          reason: "FACEBOOK_API_ERROR",
          error: result.error || "Failed to fetch Ad Accounts from Facebook",
        },
      });
    }

    const savedAdAccountsById = new Map(
      savedAdAccounts.map((account) => [
        normalizeAdAccountId(account.accountId),
        account,
      ]),
    );

    const enrichedAdAccounts = (result.data || []).map((account) => {
      const normalizedAccountId = normalizeAdAccountId(
        account.account_id || account.id,
      );
      const savedAccount = savedAdAccountsById.get(normalizedAccountId);
      const safeAccount = sanitizeRemoteFacebookAdAccountForClient(account);

      return {
        ...safeAccount,
        account_id: normalizedAccountId,
        isSaved: Boolean(savedAccount),
        isActive: Boolean(savedAccount?.isActive),
      };
    });
    const remoteAccountIds = new Set(
      enrichedAdAccounts
        .map((account) => normalizeAdAccountId(account.account_id || account.id))
        .filter(Boolean),
    );
    const savedFallbackAccounts = buildSavedAdAccountFallbacks(
      savedAdAccounts,
      remoteAccountIds,
      "REMOTE_ACCOUNT_NOT_RETURNED",
    );

    const finalAccounts = [...enrichedAdAccounts, ...savedFallbackAccounts];
    adAccountsMemoryCache.set(companyId, {
      data: finalAccounts,
      meta: {
        total: finalAccounts.length,
      },
      expiresAt: Date.now() + AD_ACCOUNTS_CACHE_TTL_MS,
    });

    res.json({
      success: true,
      data: finalAccounts,
    });
  } catch (error) {
    console.error("❌ Error getting Ad Accounts:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error while fetching Ad Accounts",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * ============================================
 * AdSet Endpoints
 * ============================================
 */

/**
 * GET /api/v1/facebook-ads/campaigns/:campaignId/adsets
 * جلب جميع AdSets في حملة
 */
const getAdSets = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const companyId = req.user?.companyId;

    // التحقق من أن الحملة تخص الشركة
    const campaign = await getSharedPrismaClient().facebookCampaign.findFirst({
      where: { id: campaignId, companyId },
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: "Campaign not found",
      });
    }

    const adSets = await getSharedPrismaClient().facebookAdset.findMany({
      where: { campaignId },
      include: {
        facebookAds: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      data: adSets,
      count: adSets.length,
    });
  } catch (error) {
    console.error("❌ Error getting AdSets:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * POST /api/v1/facebook-ads/campaigns/:campaignId/adsets
 * إنشاء AdSet جديد
 */
const createAdSet = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const companyId = req.user?.companyId;
    const {
      name,
      status = "PAUSED",
      targeting,
      budgetType,
      budgetAmount,
      optimizationGoal,
      billingEvent,
      ageMin,
      ageMax,
      genders,
      locations,
      interests,
      behaviors,
    } = req.body;

    // التحقق من البيانات المطلوبة
    if (!name || !budgetType || !budgetAmount) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: name, budgetType, budgetAmount",
      });
    }

    // التحقق من الحملة
    const campaign = await getSharedPrismaClient().facebookCampaign.findFirst({
      where: { id: campaignId, companyId },
      include: { facebookAdAccount: true },
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: "Campaign not found",
      });
    }

    // جلب Access Token
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: "Facebook Access Token not found",
      });
    }

    // الحصول على Ad Account
    const adAccount =
      campaign.facebookAdAccount ||
      (await getSharedPrismaClient().facebookAdAccount.findFirst({
        where: { companyId, isActive: true },
      }));

    if (!adAccount) {
      return res.status(400).json({
        success: false,
        error: "Ad Account not found. Please set up your Ad Account first.",
      });
    }

    // إنشاء AdSet في Facebook
    const adsService = new FacebookAdsService(accessToken, adAccount.accountId);

    // استخدام Facebook Campaign ID إذا كان موجود، وإلا استخدام campaign ID
    const fbCampaignId = campaign.facebookCampaignId || campaign.id;
    const targetingPayload = targeting || {
      ageMin,
      ageMax,
      genders,
      locations,
      interests,
      behaviors,
    };
    const persistedGeoLocations =
      targetingPayload.locations || targetingPayload.regions || targetingPayload.cities
        ? {
            countries: targetingPayload.locations || [],
            regions: targetingPayload.regions || [],
            cities: targetingPayload.cities || [],
            locationTypes: targetingPayload.locationTypes || [],
          }
        : null;

    const facebookResult = await adsService.createAdSet(fbCampaignId, {
      name,
      status,
      targeting: targetingPayload,
      budgetType,
      budgetAmount,
      optimizationGoal,
      billingEvent,
    });

    if (!facebookResult.success) {
      return res.status(400).json({
        success: false,
        error: facebookResult.error,
      });
    }

    // حفظ AdSet في قاعدة البيانات
    const adSet = await getSharedPrismaClient().facebookAdset.create({
      data: {
        campaignId,
        name,
        status,
        facebookAdSetId: facebookResult.adSetId,
        targeting: targetingPayload ? JSON.stringify(targetingPayload) : null,
        ageMin: targetingPayload.ageMin || ageMin,
        ageMax: targetingPayload.ageMax || ageMax,
        genders: targetingPayload.genders
          ? JSON.stringify(targetingPayload.genders)
          : null,
        locations: persistedGeoLocations
          ? JSON.stringify(persistedGeoLocations)
          : null,
        interests: targetingPayload.interests
          ? JSON.stringify(targetingPayload.interests)
          : null,
        behaviors: targetingPayload.behaviors
          ? JSON.stringify(targetingPayload.behaviors)
          : null,
        budgetType,
        budgetAmount,
        optimizationGoal,
        billingEvent,
      },
    });

    res.json({
      success: true,
      data: adSet,
      message: "AdSet created successfully",
    });
  } catch (error) {
    console.error("❌ Error creating AdSet:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * DELETE /api/v1/facebook-ads/adsets/:id
 * حذف AdSet
 */
const deleteAdSet = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;

    const adSet = await getSharedPrismaClient().facebookAdset.findFirst({
      where: { id },
      include: {
        facebookCampaign: true,
      },
    });

    if (!adSet || adSet.facebookCampaign.companyId !== companyId) {
      return res.status(404).json({
        success: false,
        error: "AdSet not found",
      });
    }

    // حذف من Facebook
    if (adSet.facebookAdSetId) {
      const accessToken = await getCompanyAdsAccessToken(companyId);
      if (accessToken) {
        // TODO: إضافة deleteAdSet في Service
      }
    }

    // حذف من قاعدة البيانات
    await getSharedPrismaClient().facebookAdset.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "AdSet deleted successfully",
    });
  } catch (error) {
    console.error("❌ Error deleting AdSet:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * ============================================
 * Ads Endpoints
 * ============================================
 */

/**
 * GET /api/v1/facebook-ads/adsets/:adSetId/ads
 * جلب جميع الإعلانات في AdSet
 */
const getAds = async (req, res) => {
  try {
    const { adSetId } = req.params;
    const companyId = req.user?.companyId;

    // التحقق من أن AdSet تخص الشركة
    const adSet = await getSharedPrismaClient().facebookAdset.findFirst({
      where: { id: adSetId },
      include: { facebookCampaign: true },
    });

    if (!adSet || adSet.facebookCampaign.companyId !== companyId) {
      return res.status(404).json({
        success: false,
        error: "AdSet not found",
      });
    }

    const ads = await getSharedPrismaClient().facebookAd.findMany({
      where: { adSetId },
      include: {
        facebookAdInsights: {
          take: 7,
          orderBy: { date: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      data: ads,
      count: ads.length,
    });
  } catch (error) {
    console.error("❌ Error getting Ads:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * POST /api/v1/facebook-ads/adsets/:adSetId/ads
 * إنشاء إعلان جديد
 */
const createAd = async (req, res) => {
  try {
    const { adSetId } = req.params;
    const companyId = req.user?.companyId;
    const {
      name,
      status = "PAUSED",
      creativeType = "SINGLE_IMAGE",
      pageId,
      primaryText,
      headline,
      description,
      callToAction,
      imageUrl,
      imageHash: providedImageHash,
      videoUrl,
      videoId,
      linkUrl,
      displayLink,
      urlParameters,
      carouselCards,
      advantageCreative,
      textGeneration,
      imageEnhancement,
      musicEnhancement,
      imageTemplates,
      videoHighlight,
      textOptimizations,
      productId,
    } = req.body;
    const normalizedCreativeType = normalizeFullAdCreativeType(creativeType);

    // التحقق من البيانات المطلوبة
    if (!name || !primaryText) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: name, primaryText",
      });
    }
    if (!pageId) {
      return res.status(400).json({
        success: false,
        error: "Facebook Page ID is required",
      });
    }
    if (!linkUrl) {
      return res.status(400).json({
        success: false,
        error: "Destination URL is required",
      });
    }

    const creativeValidationError = validateFullAdCreativePayload(
      {
        ...req.body,
        creativeType: normalizedCreativeType,
        imageHash: providedImageHash,
      },
      normalizedCreativeType,
    );
    if (creativeValidationError) {
      return res.status(400).json({
        success: false,
        error: creativeValidationError,
      });
    }

    // التحقق من AdSet
    const adSet = await getSharedPrismaClient().facebookAdset.findFirst({
      where: { id: adSetId },
      include: {
        facebookCampaign: {
          include: { facebookAdAccount: true },
        },
      },
    });

    if (!adSet || adSet.facebookCampaign.companyId !== companyId) {
      return res.status(404).json({
        success: false,
        error: "AdSet not found",
      });
    }

    // جلب Access Token
    const accessToken = await getCompanyAdsAccessToken(companyId);

    let facebookAdId = null;
    let creativeId = null;
    let imageHash = providedImageHash || null;
    let finalVideoId = videoId || null;
    let preparedCarouselCards = Array.isArray(carouselCards)
      ? carouselCards.map((card) => ({ ...card }))
      : [];

    // إنشاء الإعلان في Facebook إذا كان هناك Access Token و AdSet ID
    if (accessToken && adSet.facebookAdSetId) {
      const adAccount =
        adSet.facebookCampaign.facebookAdAccount ||
        (await getSharedPrismaClient().facebookAdAccount.findFirst({
          where: { companyId, isActive: true },
        }));

      if (adAccount) {
        const adsService = new FacebookAdsService(
          accessToken,
          adAccount.accountId,
        );

        // رفع الصورة إذا كانت موجودة
        if (
          imageUrl &&
          normalizedCreativeType === "SINGLE_IMAGE" &&
          !imageHash
        ) {
          const uploadResult = await adsService.uploadImage(imageUrl);
          if (uploadResult.success) {
            imageHash = uploadResult.hash;
          } else {
            return res.status(400).json({
              success: false,
              step: "imageUpload",
              error: uploadResult.error,
            });
          }
        }

        if (
          videoUrl &&
          normalizedCreativeType === "SINGLE_VIDEO" &&
          !finalVideoId
        ) {
          const uploadResult = await adsService.uploadVideo(videoUrl, {
            name,
            description,
          });
          if (uploadResult.success) {
            finalVideoId = uploadResult.videoId;
          } else {
            return res.status(400).json({
              success: false,
              step: "videoUpload",
              error: uploadResult.error,
            });
          }
        }

        if (normalizedCreativeType === "CAROUSEL") {
          preparedCarouselCards = [];

          for (const [index, card] of (carouselCards || []).entries()) {
            let cardImageHash = card.imageHash || null;

            if (!cardImageHash && card.imageUrl) {
              const uploadResult = await adsService.uploadImage(card.imageUrl);
              if (!uploadResult.success) {
                return res.status(400).json({
                  success: false,
                  step: "carouselImageUpload",
                  error: uploadResult.error,
                  cardIndex: index + 1,
                });
              }

              cardImageHash = uploadResult.hash;
            }

            preparedCarouselCards.push({
              ...card,
              imageHash: cardImageHash,
              linkUrl: card.linkUrl || linkUrl,
            });
          }
        }

        // إنشاء الإعلان في Facebook
        const facebookResult = await adsService.createAd(
          adSet.facebookAdSetId,
          {
            name,
            status,
            pageId,
            creativeType: normalizedCreativeType,
            primaryText,
            headline,
            description,
            callToAction,
            imageHash,
            videoId: finalVideoId,
            linkUrl,
            displayLink,
            urlParameters,
            carouselCards: preparedCarouselCards,
            advantageCreative,
            textGeneration,
            imageEnhancement,
            musicEnhancement,
            imageTemplates,
            videoHighlight,
            textOptimizations,
          },
        );

        if (facebookResult.success) {
          facebookAdId = facebookResult.adId;
          creativeId = facebookResult.creativeId || null;
        } else {
          return res.status(400).json({
            success: false,
            step: "ad",
            error: facebookResult.error,
          });
        }
      }
    }

    const storedCreative = getPersistedCreativePayload(
      {
        ...req.body,
        pageId,
        creativeType: normalizedCreativeType,
        imageHash,
        videoId: finalVideoId,
        carouselCards: preparedCarouselCards,
      },
      {
        creativeId,
        imageHash,
        videoId: finalVideoId,
        carouselCards: preparedCarouselCards,
      },
      normalizedCreativeType,
    );

    // حفظ الإعلان في قاعدة البيانات
    const ad = await getSharedPrismaClient().facebookAd.create({
      data: {
        adSetId,
        companyId,
        name,
        status,
        facebookAdId,
        creativeType: normalizedCreativeType,
        primaryText,
        headline,
        description,
        callToAction,
        imageUrl,
        videoUrl,
        imageHash,
        videoId: finalVideoId,
        carouselImages:
          normalizedCreativeType === "CAROUSEL"
            ? JSON.stringify(preparedCarouselCards)
            : null,
        carouselCount:
          normalizedCreativeType === "CAROUSEL"
            ? preparedCarouselCards.length
            : 1,
        linkUrl,
        productId,
        creative: JSON.stringify(storedCreative),
      },
    });

    res.json({
      success: true,
      data: ad,
      message: "Ad created successfully",
    });
  } catch (error) {
    console.error("❌ Error creating Ad:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * PUT /api/v1/facebook-ads/ads/:id
 * تحديث إعلان
 */
const updateAd = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;
    const updateData = req.body;

    const ad = await getSharedPrismaClient().facebookAd.findFirst({
      where: { id, companyId },
    });

    if (!ad) {
      return res.status(404).json({
        success: false,
        error: "Ad not found",
      });
    }

    // تحديث في قاعدة البيانات
    const updated = await getSharedPrismaClient().facebookAd.update({
      where: { id },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
    });

    res.json({
      success: true,
      data: updated,
      message: "Ad updated successfully",
    });
  } catch (error) {
    console.error("❌ Error updating Ad:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * DELETE /api/v1/facebook-ads/ads/:id
 * حذف إعلان
 */
const deleteAd = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;

    const ad = await getSharedPrismaClient().facebookAd.findFirst({
      where: { id, companyId },
    });

    if (!ad) {
      return res.status(404).json({
        success: false,
        error: "Ad not found",
      });
    }

    // حذف من قاعدة البيانات
    await getSharedPrismaClient().facebookAd.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "Ad deleted successfully",
    });
  } catch (error) {
    console.error("❌ Error deleting Ad:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * ============================================
 * Insights Endpoints
 * ============================================
 */

/**
 * GET /api/v1/facebook-ads/ads/:adId/insights
 * جلب إحصائيات إعلان
 */
const getAdInsights = async (req, res) => {
  try {
    const { adId } = req.params;
    const { startDate, endDate } = req.query;
    const companyId = req.user?.companyId;

    const ad = await getSharedPrismaClient().facebookAd.findFirst({
      where: { id: adId, companyId },
    });

    if (!ad) {
      return res.status(404).json({
        success: false,
        error: "Ad not found",
      });
    }

    // جلب من قاعدة البيانات المحلية
    const whereClause = { adId };
    if (startDate && endDate) {
      whereClause.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const insights = await getSharedPrismaClient().facebookAdInsight.findMany({
      where: whereClause,
      orderBy: { date: "desc" },
      take: 30,
    });

    res.json({
      success: true,
      data: insights,
    });
  } catch (error) {
    console.error("❌ Error getting Ad insights:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * GET /api/v1/facebook-ads/ads/:adId/details
 * صفحة تشخيص أداء إعلان فردي
 */
const getAdDetails = async (req, res) => {
  try {
    const { adId } = req.params;
    const { startDate, endDate } = req.query;
    const companyId = req.user?.companyId;
    const prisma = getSharedPrismaClient();
    const dateRange = normalizeReportDateRange(startDate, endDate);
    const previousDateRange = getPreviousDateRange(
      dateRange.rangeStart,
      dateRange.rangeEnd,
    );

    const ad = await prisma.facebookAd.findFirst({
      where: { id: adId, companyId },
      include: {
        facebookAdset: {
          include: {
            facebookCampaign: {
              include: { facebookAdAccount: true },
            },
          },
        },
        facebookAdInsights: {
          where: {
            date: {
              gte: dateRange.rangeStart,
              lte: dateRange.rangeEnd,
            },
          },
          orderBy: { date: "desc" },
        },
      },
    });

    if (!ad) {
      return res.status(404).json({
        success: false,
        error: "Ad not found",
      });
    }

    const adSet = ad.facebookAdset;
    const campaign = adSet.facebookCampaign;
    const dateWhere = {
      date: {
        gte: dateRange.rangeStart,
        lte: dateRange.rangeEnd,
      },
    };
    const previousDateWhere = {
      date: {
        gte: previousDateRange.rangeStart,
        lte: previousDateRange.rangeEnd,
      },
    };

    const [
      previousInsights,
      adSetInsights,
      campaignInsights,
      siblingAds,
    ] = await Promise.all([
      prisma.facebookAdInsight.findMany({
        where: { adId, ...previousDateWhere },
      }),
      prisma.facebookAdInsight.findMany({
        where: {
          ...dateWhere,
          facebookAd: { adSetId: adSet.id },
        },
      }),
      prisma.facebookAdInsight.findMany({
        where: {
          ...dateWhere,
          facebookAd: {
            facebookAdset: { campaignId: campaign.id },
          },
        },
      }),
      prisma.facebookAd.findMany({
        where: { adSetId: adSet.id, companyId },
        include: {
          facebookAdInsights: {
            where: dateWhere,
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    let metaInsights = null;
    let previousMetaInsights = null;
    let adSetMetaInsights = null;
    let campaignMetaInsights = null;
    let quality = {
      available: false,
      source: ad.facebookAdId ? "META" : "LOCAL",
      metrics: null,
      error: ad.facebookAdId ? null : "Ad is not synced with Meta",
    };
    const siblingMetaInsightsByAdId = new Map();
    let performanceSource = "LOCAL";
    let metaInsightError = null;
    let accessToken = null;
    let adsService = null;

    if (ad.facebookAdId) {
      accessToken = await getCompanyAdsAccessToken(companyId);
      if (accessToken) {
        adsService = new FacebookAdsService(
          accessToken,
          campaign.facebookAdAccount?.accountId,
        );
        const siblingAdsToHydrate = siblingAds
          .filter((siblingAd) => siblingAd.facebookAdId)
          .slice(0, 25);
        const metaRequests = [
          getMetaInsightsOrNull(adsService, ad.facebookAdId, dateRange),
          getMetaInsightsOrNull(adsService, ad.facebookAdId, previousDateRange),
          getMetaInsightsOrNull(adsService, adSet.facebookAdSetId, dateRange),
          getMetaInsightsOrNull(
            adsService,
            campaign.facebookCampaignId,
            dateRange,
          ),
          adsService.getAdQualityMetrics(ad.facebookAdId),
          ...siblingAdsToHydrate.map((siblingAd) =>
            getMetaInsightsOrNull(adsService, siblingAd.facebookAdId, dateRange),
          ),
        ];
        const metaResults = await Promise.allSettled(metaRequests);

        if (metaResults[0].status === "fulfilled") {
          metaInsights = metaResults[0].value;
        } else {
          metaInsightError = metaResults[0].reason?.message || "Meta insights failed";
        }

        if (metaResults[1].status === "fulfilled") {
          previousMetaInsights = metaResults[1].value;
        }

        if (metaResults[2].status === "fulfilled") {
          adSetMetaInsights = metaResults[2].value;
        }

        if (metaResults[3].status === "fulfilled") {
          campaignMetaInsights = metaResults[3].value;
        }

        const qualityResult = metaResults[4];
        if (qualityResult?.status === "fulfilled" && qualityResult.value?.success) {
          quality = {
            available: true,
            source: "META",
            metrics: qualityResult.value.metrics,
            error: null,
          };
        } else if (qualityResult?.status === "fulfilled") {
          quality = {
            available: false,
            source: "META",
            metrics: null,
            error: qualityResult.value?.error,
          };
        } else if (qualityResult?.status === "rejected") {
          quality = {
            available: false,
            source: "META",
            metrics: null,
            error: qualityResult.reason?.message || "Meta quality metrics failed",
          };
        }

        siblingAdsToHydrate.forEach((siblingAd, index) => {
          const result = metaResults[index + 5];
          if (result?.status === "fulfilled" && Array.isArray(result.value)) {
            siblingMetaInsightsByAdId.set(siblingAd.id, result.value);
          }
        });
      } else {
        metaInsightError = "Facebook Access Token not found";
      }
    }

    const hasLiveMetaInsights = Array.isArray(metaInsights);
    if (hasLiveMetaInsights) {
      performanceSource = "META";
    }

    const summary = hasLiveMetaInsights
      ? aggregateMetaInsights(metaInsights)
      : aggregatePersistedInsights(ad.facebookAdInsights);
    const previousSummary = Array.isArray(previousMetaInsights)
      ? aggregateMetaInsights(previousMetaInsights)
      : aggregatePersistedInsights(previousInsights);
    const adSetSummary = Array.isArray(adSetMetaInsights)
      ? aggregateMetaInsights(adSetMetaInsights)
      : aggregatePersistedInsights(adSetInsights);
    const campaignSummary = Array.isArray(campaignMetaInsights)
      ? aggregateMetaInsights(campaignMetaInsights)
      : aggregatePersistedInsights(campaignInsights);
    const funnel = buildAdFunnel(summary);
    const siblingPerformance = siblingAds.map((siblingAd) => ({
      id: siblingAd.id,
      name: siblingAd.name,
      status: siblingAd.status,
      effectiveStatus: buildAdClientPayload(siblingAd).effectiveStatus,
      facebookAdId: siblingAd.facebookAdId,
      metrics: siblingMetaInsightsByAdId.has(siblingAd.id)
        ? aggregateMetaInsights(siblingMetaInsightsByAdId.get(siblingAd.id))
        : aggregatePersistedInsights(siblingAd.facebookAdInsights || []),
    }));
    const verdict = buildAdVerdict(
      summary,
      previousSummary,
      adSetSummary,
      campaignSummary,
    );
    const recommendations = buildAdDetailRecommendations({
      summary,
      previousSummary,
      adSetSummary,
      campaignSummary,
      funnel,
      ad,
      campaign,
    });
    const decision = await facebookAdsDecisionService.buildAdDecisionForAd({
      prisma,
      companyId,
      ad,
      summary,
      previousSummary,
      adSetSummary,
      campaignSummary,
      dateRange,
    });

    res.json({
      success: true,
      data: {
        ad: buildAdClientPayload(ad),
        adSet: buildAdSetClientPayload({ ...adSet, facebookAds: [] }),
        campaign: buildCampaignClientPayload(campaign),
        adAccount: campaign.facebookAdAccount || null,
        dateRange: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        },
        previousDateRange: {
          startDate: previousDateRange.startDate,
          endDate: previousDateRange.endDate,
        },
        insights: ad.facebookAdInsights,
        summary,
        previousSummary,
        adSetSummary,
        campaignSummary,
        comparisons: {
          previousPeriod: buildAdComparison(summary, previousSummary),
          adSetAverage: buildAdComparison(summary, adSetSummary),
          campaignAverage: buildAdComparison(summary, campaignSummary),
        },
        funnel,
        verdict,
        decision,
        recommendations,
        siblingAds: siblingPerformance,
        quality,
        meta: {
          performanceSource,
          insightsCount: hasLiveMetaInsights
            ? metaInsights.length
            : ad.facebookAdInsights.length,
          fallbackSource: hasLiveMetaInsights ? null : "LOCAL",
          metaInsightError,
          siblingAdsCount: siblingPerformance.length,
        },
      },
    });
  } catch (error) {
    console.error("❌ Error getting Ad details:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * GET /api/v1/facebook-ads/reports/decision-summary
 * ملخص قرارات read-only مبني على الربحية والتتبع والـ insights المتزامنة
 */
const DECISION_TIMEOUT_MS = 25000;

const getDecisionSummary = async (req, res) => {
  const timeoutHandle = setTimeout(() => {
    console.warn('⚠️ [DecisionSummary] Request timed out, sending empty response');
    if (!res.headersSent) {
      res.json({
        success: true,
        data: {
          dateRange: { startDate: '', endDate: '' },
          totals: { ads: 0, statusCounts: {} },
          rows: [],
        },
      });
    }
  }, DECISION_TIMEOUT_MS);

  try {
    const companyId = req.user?.companyId;
    const { startDate, endDate, adAccountId, limit = 5 } = req.query;
    const prisma = getSharedPrismaClient();
    const dateRange = normalizeReportDateRange(startDate, endDate);
    const normalizedLimit = Math.min(10, Math.max(1, Number(limit) || 5));
    const accountReference = String(adAccountId || "").trim();
    const normalizedAccountReference = accountReference.replace(/^act_/i, "");

    const ads = await prisma.facebookAd.findMany({
      where: {
        companyId,
        facebookAdset: {
          facebookCampaign: {
            companyId,
            ...(accountReference
              ? {
                  facebookAdAccount: {
                    is: {
                      OR: [
                        { id: accountReference },
                        { accountId: accountReference },
                        { accountId: normalizedAccountReference },
                        { accountId: `act_${normalizedAccountReference}` },
                      ],
                    },
                  },
                }
              : {}),
          },
        },
      },
      include: {
        facebookAdset: {
          include: {
            facebookCampaign: {
              include: { facebookAdAccount: true },
            },
          },
        },
        facebookAdInsights: {
          where: {
            date: {
              gte: dateRange.rangeStart,
              lte: dateRange.rangeEnd,
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: normalizedLimit,
    });

    const adProductIds = ads.map((a) => a.productId).filter(Boolean);
    const adProductSlugs = ads.map((a) => parseJsonObject(a.settings)?.linkUrl || a.linkUrl).filter(Boolean);
    const allSlugs = [...new Set(adProductSlugs.map((url) => {
      try { return new URL(url).pathname.split("/").filter(Boolean).findLast(() => true) || ""; } catch { return ""; }
    }).filter(Boolean))];
    const allProductIds = [...new Set([...adProductIds, ...allSlugs])];
    const allProducts = allProductIds.length > 0 ? await prisma.product.findMany({
      where: { companyId, OR: [{ id: { in: allProductIds } }, { slug: { in: allProductIds } }] },
      include: { productVariants: { select: { cost: true, price: true } } },
    }) : [];
    const productMap = new Map(allProducts.map((p) => [p.id, p]));
    allProducts.forEach((p) => { if (p.slug) productMap.set(p.slug, p); });

    const allOrders = await prisma.order.findMany({
      where: {
        companyId,
        createdAt: {
          gte: dateRange.rangeStart,
          lte: dateRange.rangeEnd,
        },
        status: { notIn: ["DRAFT", "TRASH"] },
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        total: true,
        shipping: true,
        metadata: true,
        createdAt: true,
        orderItems: {
          include: {
            product: {
              select: { id: true, name: true, price: true, cost: true },
            },
            productVariant: {
              select: { id: true, price: true, cost: true },
            },
          },
        },
      },
    });

    const rows = await Promise.all(
      ads.map(async (ad) => {
        const summary = aggregatePersistedInsights(ad.facebookAdInsights || []);
        const decision = await facebookAdsDecisionService.buildAdDecisionForAd({
          prisma,
          companyId,
          ad,
          summary,
          campaignSummary: summary,
          dateRange,
          preFetchedOrders: allOrders,
          preFetchedProductMap: productMap,
        });

        return {
          ad: buildAdClientPayload(ad),
          adSet: buildAdSetClientPayload({
            ...ad.facebookAdset,
            facebookAds: [],
          }),
          campaign: buildCampaignClientPayload(ad.facebookAdset.facebookCampaign),
          summary,
          decision,
        };
      }),
    );

    const statusCounts = rows.reduce((accumulator, row) => {
      const status = row.decision?.status || "UNKNOWN";
      accumulator[status] = (accumulator[status] || 0) + 1;
      return accumulator;
    }, {});

    const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    rows.sort((left, right) => {
      const priorityDelta =
        (priorityOrder[left.decision?.priority] ?? 3) -
        (priorityOrder[right.decision?.priority] ?? 3);
      if (priorityDelta !== 0) return priorityDelta;
      return (right.summary?.spend || 0) - (left.summary?.spend || 0);
    });

    clearTimeout(timeoutHandle);
    res.json({
      success: true,
      data: {
        dateRange: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        },
        totals: {
          ads: rows.length,
          statusCounts,
        },
        rows,
      },
    });
  } catch (error) {
    clearTimeout(timeoutHandle);
    console.error("❌ Error getting Ads decision summary:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * GET /api/v1/facebook-ads/ads/:adId/performance-breakdown
 * جلب breakdowns تفصيلية لإعلان فردي من Meta
 */
const getAdPerformanceBreakdown = async (req, res) => {
  try {
    const { adId } = req.params;
    const { startDate, endDate } = req.query;
    const breakdown = normalizePerformanceBreakdown(req.query.breakdown);
    const breakdownMap = {
      age_gender: ["age", "gender"],
      placement: ["publisher_platform", "platform_position"],
      platform: ["publisher_platform"],
      device: ["device_platform"],
      country: ["country"],
      region: ["region"],
    };
    const companyId = req.user?.companyId;
    const prisma = getSharedPrismaClient();
    const dateRange = normalizeReportDateRange(startDate, endDate);

    const ad = await prisma.facebookAd.findFirst({
      where: { id: adId, companyId },
      include: {
        facebookAdset: {
          include: { facebookCampaign: true },
        },
      },
    });

    if (!ad) {
      return res.status(404).json({
        success: false,
        error: "Ad not found",
      });
    }

    if (!ad.facebookAdId) {
      return res.json({
        success: true,
        data: {
          dateRange: {
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
          },
          breakdown,
          dimensions: breakdownMap[breakdown],
          rows: [],
          totals: withDerivedPerformance(createEmptyPerformanceTotals()),
          recommendations: buildAdBreakdownRecommendations([], breakdown),
          meta: {
            source: "LOCAL",
            rawRows: 0,
            reason: "Ad is not synced with Meta",
          },
        },
      });
    }

    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: "Facebook Access Token not found",
      });
    }

    const adsService = new FacebookAdsService(accessToken);
    const result = await adsService.getInsights(
      ad.facebookAdId,
      { since: dateRange.startDate, until: dateRange.endDate },
      breakdownMap[breakdown],
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    const totals = createEmptyPerformanceTotals();
    const rowMap = new Map();

    (result.data || []).forEach((insight) => {
      const key = getPerformanceBreakdownKey(insight, breakdown);
      const label = getPerformanceBreakdownLabel(insight, breakdown);
      const metrics = buildInsightPersistenceData(insight);

      addInsightToTotals(totals, metrics);

      if (!rowMap.has(key)) {
        rowMap.set(key, {
          breakdown,
          key,
          label,
          totals: createEmptyPerformanceTotals(),
        });
      }

      addInsightToTotals(rowMap.get(key).totals, metrics);
    });

    const rows = Array.from(rowMap.values())
      .map((row) => ({
        breakdown: row.breakdown,
        key: row.key,
        label: row.label,
        metrics: withDerivedPerformance(row.totals),
      }))
      .sort((a, b) => b.metrics.spend - a.metrics.spend);

    res.json({
      success: true,
      data: {
        dateRange: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        },
        breakdown,
        dimensions: breakdownMap[breakdown],
        rows,
        totals: withDerivedPerformance(totals),
        recommendations: buildAdBreakdownRecommendations(rows, breakdown),
        meta: {
          source: "META",
          rawRows: result.data?.length || 0,
          facebookAdId: ad.facebookAdId,
        },
      },
    });
  } catch (error) {
    console.error("❌ Error getting Ad performance breakdown:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * POST /api/v1/facebook-ads/ads/:adId/sync-insights
 * مزامنة إحصائيات إعلان من Facebook
 */
const syncAdInsights = async (req, res) => {
  try {
    const { adId } = req.params;
    const { startDate, endDate } = req.body;
    const companyId = req.user?.companyId;

    const ad = await getSharedPrismaClient().facebookAd.findFirst({
      where: { id: adId, companyId },
    });

    if (!ad || !ad.facebookAdId) {
      return res.status(404).json({
        success: false,
        error: "Ad not found or not synced with Facebook",
      });
    }

    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: "Facebook Access Token not found",
      });
    }

    const adsService = new FacebookAdsService(accessToken);
    const dateRange =
      startDate && endDate ? { since: startDate, until: endDate } : null;

    const result = await adsService.getInsights(ad.facebookAdId, dateRange);

    if (!result.success) {
      return res.status(400).json(result);
    }

    // حفظ الإحصائيات في قاعدة البيانات
    const savedInsights = [];
    for (const insight of result.data) {
      const persistenceData = buildInsightPersistenceData(insight);
      const saved = await getSharedPrismaClient().facebookAdInsight.upsert({
        where: {
          adId_date: {
            adId,
            date: new Date(insight.date_start || new Date()),
          },
        },
        update: persistenceData,
        create: {
          adId,
          date: new Date(insight.date_start || new Date()),
          ...persistenceData,
        },
      });
      savedInsights.push(saved);
    }

    // تحديث lastSyncAt
    await getSharedPrismaClient().facebookAd.update({
      where: { id: adId },
      data: { lastSyncAt: new Date() },
    });

    res.json({
      success: true,
      data: savedInsights,
      message: `Synced ${savedInsights.length} insights`,
    });
  } catch (error) {
    console.error("❌ Error syncing Ad insights:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * GET /api/v1/facebook-ads/campaigns/:campaignId/insights
 * جلب إحصائيات حملة (مجمعة)
 */
const getCampaignInsights = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { startDate, endDate } = req.query;
    const companyId = req.user?.companyId;
    const today = new Date();
    const defaultStartDate = new Date(today);
    defaultStartDate.setDate(defaultStartDate.getDate() - 30);
    const rangeStart = startDate ? new Date(startDate) : defaultStartDate;
    const rangeEnd = endDate ? new Date(endDate) : today;

    const campaign = await getSharedPrismaClient().facebookCampaign.findFirst({
      where: { id: campaignId, companyId },
      include: {
        facebookAdAccount: true,
        facebookAdsets: {
          include: {
            facebookAds: {
              include: {
                facebookAdInsights: {
                  where: {
                    date: {
                      gte: rangeStart,
                      lte: rangeEnd,
                    },
                  },
                  take: 30,
                  orderBy: { date: "desc" },
                },
              },
            },
          },
        },
      },
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: "Campaign not found",
      });
    }

    // تجميع الإحصائيات
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalSpend = 0;
    let totalReach = 0;
    let totalConversions = 0;
    let totalPurchases = 0;
    let totalPurchaseValue = 0;

    campaign.facebookAdsets.forEach((adSet) => {
      adSet.facebookAds.forEach((ad) => {
        ad.facebookAdInsights.forEach((insight) => {
          totalImpressions += insight.impressions;
          totalClicks += insight.clicks;
          totalSpend += insight.spend;
          totalReach += insight.reach;
          totalConversions += insight.conversions;
          totalPurchases += insight.purchases;
          totalPurchaseValue += insight.purchaseValue;
        });
      });
    });

    const aggregatedInsights = {
      impressions: totalImpressions,
      clicks: totalClicks,
      spend: totalSpend,
      reach: totalReach,
      conversions: totalConversions,
      purchases: totalPurchases,
      purchaseValue: totalPurchaseValue,
      ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
      cpc: totalClicks > 0 ? totalSpend / totalClicks : 0,
      roas: totalSpend > 0 ? totalPurchaseValue / totalSpend : 0,
    };
    let performanceSource = "LOCAL";

    if (campaign.facebookCampaignId) {
      try {
        const accessToken = await getCompanyAdsAccessToken(companyId);
        if (accessToken) {
          const adsService = new FacebookAdsService(
            accessToken,
            campaign.facebookAdAccount?.accountId,
          );
          const metaResult = await adsService.getCampaignInsights(
            campaign.facebookCampaignId,
            {
              since: rangeStart.toISOString().slice(0, 10),
              until: rangeEnd.toISOString().slice(0, 10),
            },
          );

          if (metaResult.success && (metaResult.data || []).length > 0) {
            const metaTotals = createEmptyPerformanceTotals();
            for (const insight of metaResult.data || []) {
              addMetaInsightToTotals(metaTotals, insight);
            }
            Object.assign(aggregatedInsights, withDerivedPerformance(metaTotals));
            performanceSource = "META";
          }
        }
      } catch (metaError) {
        console.warn(
          "⚠️ Falling back to local campaign detail insights:",
          metaError.message,
        );
      }
    }

    res.json({
      success: true,
      data: aggregatedInsights,
      performanceSource,
      dateRange: {
        startDate: rangeStart.toISOString().slice(0, 10),
        endDate: rangeEnd.toISOString().slice(0, 10),
      },
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        facebookCampaignId: campaign.facebookCampaignId,
        metaAccountId: campaign.facebookAdAccount?.accountId || null,
        adSetsCount: campaign.facebookAdsets.length,
        adsCount: campaign.facebookAdsets.reduce(
          (sum, adSet) => sum + adSet.facebookAds.length,
          0,
        ),
      },
    });
  } catch (error) {
    console.error("❌ Error getting campaign insights:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * GET /api/v1/facebook-ads/reports/performance-summary
 * ملخص أداء محلي للحملات مع توصيات تحسين عملية
 */
const PERFORMANCE_TIMEOUT_MS = 15000;

const getPerformanceSummary = async (req, res) => {
  const timeoutHandle = setTimeout(() => {
    console.warn('⚠️ [PerformanceSummary] Request timed out, sending empty response');
    if (!res.headersSent) {
      res.status(200).json({
        success: true,
        data: {
          dateRange: { startDate: '', endDate: '' },
          adAccount: null,
          totals: withDerivedPerformance(createEmptyPerformanceTotals()),
          campaigns: [],
          recommendations: [],
        },
      });
    }
  }, PERFORMANCE_TIMEOUT_MS);

  try {
    const companyId = req.user?.companyId;
    const { startDate, endDate, adAccountId } = req.query;
    const prisma = getSharedPrismaClient();
    const today = new Date();
    const defaultStartDate = new Date(today);
    defaultStartDate.setDate(defaultStartDate.getDate() - 30);

    const rangeStart = startDate ? new Date(startDate) : defaultStartDate;
    const rangeEnd = endDate ? new Date(endDate) : today;
    rangeEnd.setHours(23, 59, 59, 999);
    const metaDateRange = {
      since: rangeStart.toISOString().slice(0, 10),
      until: rangeEnd.toISOString().slice(0, 10),
    };

    const adAccountScope = await getAdAccountReadScope(companyId, adAccountId);
    if (!adAccountScope) {
      const emptySummary = withDerivedPerformance(createEmptyPerformanceTotals());
      clearTimeout(timeoutHandle);

      return res.json({
        success: true,
        data: {
          dateRange: {
            startDate: rangeStart.toISOString().slice(0, 10),
            endDate: rangeEnd.toISOString().slice(0, 10),
          },
          adAccount: null,
          totals: emptySummary,
          campaigns: [],
          recommendations: buildPerformanceRecommendations(emptySummary, []),
        },
      });
    }

    const perfCacheKey = `${companyId}:${adAccountScope.id}:${metaDateRange.since}:${metaDateRange.until}`;
    if (process.env.NODE_ENV !== "test" && req.query?.refresh !== "true") {
      const cached = performanceSummaryMemoryCache.get(perfCacheKey);
      if (cached && Date.now() < cached.expiresAt) {
        clearTimeout(timeoutHandle);
        return res.json({
          success: true,
          data: cached.data,
          meta: { cached: true },
        });
      }
    }

    const campaigns = await prisma.facebookCampaign.findMany({
      where: {
        companyId,
        adAccountId: adAccountScope.id,
      },
      include: {
        facebookAdsets: {
          include: {
            facebookAds: {
              include: {
                facebookAdInsights: {
                  where: {
                    date: {
                      gte: rangeStart,
                      lte: rangeEnd,
                    },
                  },
                  orderBy: { date: "desc" },
                },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const metaInsightsByCampaignId = new Map();
    try {
      const accessToken = await getCompanyAdsAccessToken(companyId);
      if (accessToken) {
        if (adAccountScope.accountId) {
          const adsService = new FacebookAdsService(
            accessToken,
            adAccountScope.accountId,
          );
          const insightsResult = await adsService.getCampaignInsightsSummary(
            adAccountScope.accountId,
            metaDateRange,
          );

          if (insightsResult.success) {
            for (const insight of insightsResult.data || []) {
              if (!insight.campaign_id) continue;
              const existingRows =
                metaInsightsByCampaignId.get(insight.campaign_id) || [];
              metaInsightsByCampaignId.set(insight.campaign_id, [
                ...existingRows,
                insight,
              ]);
            }
          } else {
            console.warn(
              "⚠️ Could not load Meta campaign insights for summary:",
              insightsResult.error,
            );
          }
        }
      }
    } catch (metaError) {
      console.warn(
        "⚠️ Falling back to local Facebook Ads insights summary:",
        metaError.message,
      );
    }

    const totals = createEmptyPerformanceTotals();
    const campaignSummaries = campaigns.map((campaign) => {
      const campaignSettings = parseJsonObject(campaign.settings);
      const campaignMeta = campaignSettings.meta || {};
      const campaignTotals = createEmptyPerformanceTotals();
      let adsCount = 0;
      let performanceSource = "LOCAL";
      const metaInsights = campaign.facebookCampaignId
        ? metaInsightsByCampaignId.get(campaign.facebookCampaignId) || []
        : [];

      if (metaInsights.length > 0) {
        performanceSource = "META";
        metaInsights.forEach((insight) => {
          addMetaInsightToTotals(campaignTotals, insight);
          addMetaInsightToTotals(totals, insight);
        });
      } else {
        campaign.facebookAdsets.forEach((adSet) => {
          adsCount += adSet.facebookAds.length;
          adSet.facebookAds.forEach((ad) => {
            ad.facebookAdInsights.forEach((insight) => {
              addInsightToTotals(campaignTotals, insight);
              addInsightToTotals(totals, insight);
            });
          });
        });
      }

      if (metaInsights.length > 0) {
        campaign.facebookAdsets.forEach((adSet) => {
          adsCount += adSet.facebookAds.length;
        });
      }

      return {
        id: campaign.id,
        facebookCampaignId: campaign.facebookCampaignId,
        name: campaign.name,
        objective: campaign.objective,
        status: campaign.status,
        configuredStatus: campaignMeta.configuredStatus || campaign.status,
        effectiveStatus:
          campaignMeta.effectiveStatus ||
          campaignMeta.configuredStatus ||
          campaign.status,
        metaAccountId: campaignMeta.accountId || adAccountScope.accountId,
        pixelId: campaign.pixelId,
        adSetsCount: campaign.facebookAdsets.length,
        adsCount,
        performanceSource,
        performance: withDerivedPerformance(campaignTotals),
      };
    });

    const summary = withDerivedPerformance(totals);
    const responsePayload = {
      dateRange: {
        startDate: rangeStart.toISOString().slice(0, 10),
        endDate: rangeEnd.toISOString().slice(0, 10),
      },
      adAccount: sanitizeFacebookAdAccountForClient(adAccountScope),
      totals: summary,
      campaigns: campaignSummaries,
      recommendations: buildPerformanceRecommendations(
        summary,
        campaignSummaries,
      ),
    };

    performanceSummaryMemoryCache.set(perfCacheKey, {
      data: responsePayload,
      expiresAt: Date.now() + PERFORMANCE_CACHE_TTL_MS,
    });

    clearTimeout(timeoutHandle);
    res.json({
      success: true,
      data: responsePayload,
    });
  } catch (error) {
    clearTimeout(timeoutHandle);
    console.error("❌ Error getting Facebook Ads performance summary:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * GET /api/v1/facebook-ads/reports/geo-performance
 * أداء الحساب المختار حسب الدولة أو المحافظة من Meta Insights
 */
const getGeoPerformanceBreakdown = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { startDate, endDate, adAccountId } = req.query;
    const breakdown = normalizeGeoPerformanceBreakdown(req.query.breakdown);
    const today = new Date();
    const defaultStartDate = new Date(today);
    defaultStartDate.setDate(defaultStartDate.getDate() - 30);

    const rangeStart = startDate ? new Date(startDate) : defaultStartDate;
    const rangeEnd = endDate ? new Date(endDate) : today;
    rangeEnd.setHours(23, 59, 59, 999);
    const dateRange = {
      startDate: rangeStart.toISOString().slice(0, 10),
      endDate: rangeEnd.toISOString().slice(0, 10),
    };
    const metaDateRange = {
      since: dateRange.startDate,
      until: dateRange.endDate,
    };

    const adAccountScope = await getAdAccountReadScope(companyId, adAccountId);
    if (!adAccountScope) {
      const emptySummary = withDerivedPerformance(createEmptyPerformanceTotals());

      return res.json({
        success: true,
        data: {
          dateRange,
          adAccount: null,
          breakdown,
          rows: [],
          totals: emptySummary,
          recommendations: buildGeoPerformanceRecommendations([]),
          meta: {
            source: "META",
            rawRows: 0,
          },
        },
      });
    }

    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error:
          "Facebook Ads Access Token not found. Please connect your Facebook account first.",
      });
    }

    const adsService = new FacebookAdsService(
      accessToken,
      adAccountScope.accountId,
    );
    const insightsResult = await adsService.getGeoPerformanceBreakdown(
      adAccountScope.accountId,
      metaDateRange,
      breakdown,
    );

    if (!insightsResult.success) {
      return res.status(502).json({
        success: false,
        error: insightsResult.error,
      });
    }

    const totals = createEmptyPerformanceTotals();
    const buckets = new Map();

    for (const insight of insightsResult.data || []) {
      const label = getGeoPerformanceLabel(insight, breakdown);
      const key = `${breakdown}:${label}`;

      if (!buckets.has(key)) {
        buckets.set(key, {
          key,
          label,
          totals: createEmptyPerformanceTotals(),
          campaignIds: new Set(),
          campaignNames: new Set(),
        });
      }

      const bucket = buckets.get(key);
      addMetaInsightToTotals(bucket.totals, insight);
      addMetaInsightToTotals(totals, insight);

      if (insight.campaign_id) {
        bucket.campaignIds.add(insight.campaign_id);
      }

      if (insight.campaign_name) {
        bucket.campaignNames.add(insight.campaign_name);
      }
    }

    const rows = Array.from(buckets.values())
      .map((bucket) => ({
        breakdown,
        key: bucket.key,
        label: bucket.label,
        metrics: withDerivedPerformance(bucket.totals),
        campaignsCount: bucket.campaignIds.size,
        campaigns: Array.from(bucket.campaignNames).slice(0, 5),
      }))
      .sort((a, b) => b.metrics.spend - a.metrics.spend);

    const summary = withDerivedPerformance(totals);

    res.json({
      success: true,
      data: {
        dateRange,
        adAccount: sanitizeFacebookAdAccountForClient(adAccountScope),
        breakdown,
        rows,
        totals: summary,
        recommendations: buildGeoPerformanceRecommendations(rows),
        meta: {
          source: "META",
          rawRows: (insightsResult.data || []).length,
          adAccountId: adAccountScope.accountId,
        },
      },
    });
  } catch (error) {
    console.error("❌ Error getting Facebook Ads geo performance:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * GET /api/v1/facebook-ads/reports/performance-breakdown
 * تقرير شرائح قرار: العمر/الجنس، المواضع، المنصة، الجهاز، الدولة، المحافظة
 */
const getPerformanceBreakdownReport = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { startDate, endDate, adAccountId } = req.query;
    const breakdown = normalizePerformanceBreakdown(req.query.breakdown);
    const today = new Date();
    const defaultStartDate = new Date(today);
    defaultStartDate.setDate(defaultStartDate.getDate() - 30);

    const rangeStart = startDate ? new Date(startDate) : defaultStartDate;
    const rangeEnd = endDate ? new Date(endDate) : today;
    rangeEnd.setHours(23, 59, 59, 999);
    const dateRange = {
      startDate: rangeStart.toISOString().slice(0, 10),
      endDate: rangeEnd.toISOString().slice(0, 10),
    };
    const metaDateRange = {
      since: dateRange.startDate,
      until: dateRange.endDate,
    };

    const adAccountScope = await getAdAccountReadScope(companyId, adAccountId);
    if (!adAccountScope) {
      const emptySummary = withDerivedPerformance(createEmptyPerformanceTotals());

      return res.json({
        success: true,
        data: {
          dateRange,
          adAccount: null,
          breakdown,
          rows: [],
          campaigns: [],
          totals: emptySummary,
          recommendations: buildPerformanceBreakdownRecommendations(
            [],
            [],
            breakdown,
          ),
          meta: {
            source: "META",
            rawRows: 0,
          },
        },
      });
    }

    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error:
          "Facebook Ads Access Token not found. Please connect your Facebook account first.",
      });
    }

    const adsService = new FacebookAdsService(
      accessToken,
      adAccountScope.accountId,
    );
    const insightsResult = await adsService.getPerformanceBreakdown(
      adAccountScope.accountId,
      metaDateRange,
      breakdown,
    );

    if (!insightsResult.success) {
      return res.status(502).json({
        success: false,
        error: insightsResult.error,
      });
    }

    const totals = createEmptyPerformanceTotals();
    const rowBuckets = new Map();
    const campaignBuckets = new Map();

    for (const insight of insightsResult.data || []) {
      const rowKey = getPerformanceBreakdownKey(insight, breakdown);
      const label = getPerformanceBreakdownLabel(insight, breakdown);

      if (!rowBuckets.has(rowKey)) {
        rowBuckets.set(rowKey, {
          key: rowKey,
          label,
          totals: createEmptyPerformanceTotals(),
          campaignIds: new Set(),
          campaignNames: new Set(),
        });
      }

      const rowBucket = rowBuckets.get(rowKey);
      addMetaInsightToTotals(rowBucket.totals, insight);
      addMetaInsightToTotals(totals, insight);

      const campaignId =
        insight.campaign_id || `unknown:${insight.campaign_name || "unknown"}`;
      const campaignName = insight.campaign_name || "حملة غير محددة";

      rowBucket.campaignIds.add(campaignId);
      rowBucket.campaignNames.add(campaignName);

      if (!campaignBuckets.has(campaignId)) {
        campaignBuckets.set(campaignId, {
          campaignId,
          campaignName,
          totals: createEmptyPerformanceTotals(),
          rows: new Map(),
        });
      }

      const campaignBucket = campaignBuckets.get(campaignId);
      addMetaInsightToTotals(campaignBucket.totals, insight);

      if (!campaignBucket.rows.has(rowKey)) {
        campaignBucket.rows.set(rowKey, {
          key: rowKey,
          label,
          totals: createEmptyPerformanceTotals(),
        });
      }
      addMetaInsightToTotals(campaignBucket.rows.get(rowKey).totals, insight);
    }

    const rows = Array.from(rowBuckets.values())
      .map((bucket) => ({
        breakdown,
        key: bucket.key,
        label: bucket.label,
        metrics: withDerivedPerformance(bucket.totals),
        campaignsCount: bucket.campaignIds.size,
        campaigns: Array.from(bucket.campaignNames).slice(0, 5),
      }))
      .sort((a, b) => b.metrics.spend - a.metrics.spend);

    const campaigns = Array.from(campaignBuckets.values())
      .map((bucket) => ({
        campaignId: bucket.campaignId,
        campaignName: bucket.campaignName,
        metrics: withDerivedPerformance(bucket.totals),
        rows: Array.from(bucket.rows.values())
          .map((row) => ({
            breakdown,
            key: row.key,
            label: row.label,
            metrics: withDerivedPerformance(row.totals),
          }))
          .sort((a, b) => b.metrics.spend - a.metrics.spend),
      }))
      .sort((a, b) => b.metrics.spend - a.metrics.spend);

    const summary = withDerivedPerformance(totals);

    res.json({
      success: true,
      data: {
        dateRange,
        adAccount: sanitizeFacebookAdAccountForClient(adAccountScope),
        breakdown,
        dimensions: insightsResult.dimensions || [],
        rows,
        campaigns,
        totals: summary,
        recommendations: buildPerformanceBreakdownRecommendations(
          rows,
          campaigns,
          breakdown,
        ),
        meta: {
          source: "META",
          rawRows: (insightsResult.data || []).length,
          adAccountId: adAccountScope.accountId,
        },
      },
    });
  } catch (error) {
    console.error("❌ Error getting Facebook Ads performance breakdown:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * ============================================
 * Sync Endpoints
 * ============================================
 */

/**
 * POST /api/v1/facebook-ads/sync
 * مزامنة جميع الحملات من Facebook
 */
const syncFromFacebook = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { adAccountId, includeStructure = true, syncScope } = req.body;
    const shouldSyncStructure =
      includeStructure !== false && syncScope !== "campaigns";

    // Invalidate caches for this company so subsequent reads are fresh
    if (companyId) {
      adAccountsMemoryCache.delete(companyId);
      for (const key of performanceSummaryMemoryCache.keys()) {
        if (key.startsWith(`${companyId}:`)) {
          performanceSummaryMemoryCache.delete(key);
        }
      }
    }

    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: "Facebook Access Token not found",
      });
    }

    // جلب Ad Account
    const adAccount = await getOrCreateAdAccount(
      companyId,
      accessToken,
      adAccountId,
    );
    if (!adAccount) {
      return res.status(400).json({
        success: false,
        error: "Ad Account not found",
      });
    }

    const adsService = new FacebookAdsService(accessToken, adAccount.accountId);
    const prisma = getSharedPrismaClient();

    // جلب الحملات من Facebook
    const campaignsResult = await adsService.getCampaigns(adAccount.accountId, [
      "id",
      "name",
      "objective",
      "account_id",
      "status",
      "configured_status",
      "effective_status",
      "created_time",
      "updated_time",
      "start_time",
      "stop_time",
      "daily_budget",
      "lifetime_budget",
    ]);

    if (!campaignsResult.success) {
      return res.status(400).json(campaignsResult);
    }

    const structureSyncWarnings = [];
    let fbAdSetsByCampaignId = new Map();
    let fbAdsByAdSetId = new Map();

    if (shouldSyncStructure) {
      const [adSetsResult, adsResult] = await Promise.all([
        adsService.getAdSets(adAccount.accountId),
        adsService.getAds(adAccount.accountId),
      ]);

      if (adSetsResult.success) {
        fbAdSetsByCampaignId = groupByMetaParentId(
          adSetsResult.data,
          getMetaCampaignIdFromAdSet,
        );
      } else {
        structureSyncWarnings.push({
          level: "adset",
          error: adSetsResult.error,
        });
      }

      if (adsResult.success) {
        fbAdsByAdSetId = groupByMetaParentId(
          adsResult.data,
          getMetaAdSetIdFromAd,
        );
      } else {
        structureSyncWarnings.push({
          level: "ad",
          error: adsResult.error,
        });
      }
    }

    const syncedCampaigns = [];
    const skippedCampaigns = [];
    let syncedAdSetsCount = 0;
    let syncedAdsCount = 0;
    const selectedMetaAccountId = normalizeAdAccountId(adAccount.accountId);

    for (const fbCampaign of campaignsResult.data) {
      const campaignMetaAccountId = normalizeAdAccountId(
        fbCampaign.account_id || adAccount.accountId,
      );

      if (
        campaignMetaAccountId &&
        selectedMetaAccountId &&
        campaignMetaAccountId !== selectedMetaAccountId
      ) {
        skippedCampaigns.push({
          id: fbCampaign.id,
          name: fbCampaign.name,
          accountId: campaignMetaAccountId,
        });
        console.warn(
          `⚠️ Skipping campaign ${fbCampaign.id} from ad account ${campaignMetaAccountId}; expected ${selectedMetaAccountId}`,
        );
        continue;
      }

      // البحث عن الحملة المحلية أو إنشاء جديدة
      const existingCampaign = await prisma.facebookCampaign.findFirst({
        where: {
          companyId,
          facebookCampaignId: fbCampaign.id,
          OR: [{ adAccountId: adAccount.id }, { adAccountId: null }],
        },
      });
      const campaignBudget = getMetaBudget(fbCampaign);

      const campaignData = {
        name: fbCampaign.name,
        objective: fbCampaign.objective,
        status: fbCampaign.status,
        facebookCampaignId: fbCampaign.id,
        budgetType: campaignBudget.budgetType,
        budgetAmount: campaignBudget.budgetAmount,
        adAccountId: adAccount.id,
        settings: JSON.stringify(
          mergeCampaignSettings(parseJsonObject(existingCampaign?.settings), {
            meta: buildCampaignMetaSettings(fbCampaign, adAccount),
          }),
        ),
        lastSyncAt: new Date(),
      };

      let campaign;
      if (existingCampaign) {
        campaign = await prisma.facebookCampaign.update({
          where: { id: existingCampaign.id },
          data: campaignData,
        });
      } else {
        campaign = await prisma.facebookCampaign.create({
          data: {
            ...campaignData,
            companyId,
            adAccountId: adAccount.id,
          },
        });
      }

      if (shouldSyncStructure) {
        const structureCounters = await syncCampaignStructureFromMeta({
          prisma,
          companyId,
          campaign,
          fbAdSets: fbAdSetsByCampaignId.get(fbCampaign.id) || [],
          adsByAdSetId: fbAdsByAdSetId,
        });
        syncedAdSetsCount += structureCounters.adSets;
        syncedAdsCount += structureCounters.ads;
      }

      syncedCampaigns.push(campaign);
    }

    res.json({
      success: true,
      data: syncedCampaigns,
      meta: {
        adAccount: sanitizeFacebookAdAccountForClient(adAccount),
        skippedCampaigns,
        syncedAdSets: syncedAdSetsCount,
        syncedAds: syncedAdsCount,
        structureSyncWarnings,
        structureSyncSkipped: !shouldSyncStructure,
      },
      message: `Synced ${syncedCampaigns.length} campaigns from Facebook${
        skippedCampaigns.length
          ? `, skipped ${skippedCampaigns.length} outside selected ad account`
          : ""
      }${
        shouldSyncStructure
          ? `, ${syncedAdSetsCount} ad sets, ${syncedAdsCount} ads`
          : ", campaign structure sync skipped"
      }`,
    });
  } catch (error) {
    console.error("❌ Error syncing from Facebook:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * POST /api/v1/facebook-ads/ad-accounts/save
 * حفظ Ad Account
 */
const saveAdAccount = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { accountId, name, currency, timezone } = req.body;

    if (!accountId || !name) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: accountId, name",
      });
    }

    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: "Facebook Access Token not found",
      });
    }

    const adAccount = await upsertAdAccount(companyId, accessToken, {
      accountId,
      name,
      currency,
      timezone,
    });

    res.json({
      success: true,
      data: sanitizeFacebookAdAccountForClient(adAccount),
      message: "Ad Account saved successfully",
    });
  } catch (error) {
    console.error("❌ Error saving Ad Account:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * GET /api/v1/facebook-ads/saved-ad-accounts
 * جلب Ad Accounts المحفوظة
 */
const getSavedAdAccounts = async (req, res) => {
  try {
    const companyId = req.user?.companyId;

    const adAccounts = await getSharedPrismaClient().facebookAdAccount.findMany(
      {
        where: { companyId },
        orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
      },
    );

    res.json({
      success: true,
      data: adAccounts.map(sanitizeFacebookAdAccountForClient),
    });
  } catch (error) {
    console.error("❌ Error getting saved Ad Accounts:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * GET /api/v1/facebook-ads/connection/status
 * حالة ربط الإعلانات المعزول — المصادر + الحسابات المحفوظة + صحة التوكنات.
 * لا يُرجِع أي access token إلى المتصفح.
 */
const getAdsConnectionStatus = async (req, res) => {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: "Company ID is required",
      });
    }

    const [sources, adAccounts, connectedPagesCount] = await Promise.all([
      getSharedPrismaClient().facebookAdsConnectionSource.findMany({
        where: { companyId },
        orderBy: [{ status: "asc" }, { connectedAt: "desc" }],
        include: {
          adAccounts: { select: { id: true } },
        },
      }),
      getSharedPrismaClient().facebookAdAccount.findMany({
        where: { companyId },
        orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
        include: {
          connectionSource: {
            select: {
              id: true,
              facebookUserName: true,
              facebookUserEmail: true,
            },
          },
        },
      }),
      getSharedPrismaClient().facebookPage.count({
        where: { companyId, status: "connected" },
      }),
    ]);

    const connectionSources = sources.map((source) => ({
      id: source.id,
      facebookUserId: source.facebookUserId,
      facebookUserName: source.facebookUserName,
      facebookUserEmail: source.facebookUserEmail,
      status: source.status,
      hasToken: Boolean(source.accessToken),
      syncedAdAccountsCount: source.adAccounts?.length || 0,
      connectedAt: source.connectedAt,
      lastSyncedAt: source.lastSyncedAt,
      lastError: source.lastError,
    }));

    const savedAdAccounts = adAccounts.map((account) => {
      const hasIsolatedToken = Boolean(account.accessToken);
      const tokenSource = account.connectionSourceId
        ? "facebook_account"
        : hasIsolatedToken
          ? "isolated"
          : "company_connection_only";
      return {
        id: account.id,
        accountId: account.accountId,
        name: account.name,
        currency: account.currency,
        timezone: account.timezone,
        isActive: account.isActive,
        connectionSourceId: account.connectionSourceId,
        connectionSource: account.connectionSource
          ? {
              id: account.connectionSource.id,
              facebookUserName: account.connectionSource.facebookUserName,
              facebookUserEmail: account.connectionSource.facebookUserEmail,
            }
          : null,
        tokenSource,
        hasIsolatedToken,
      };
    });

    const activeAdAccount =
      adAccounts.find((account) => account.isActive) || null;

    // فحص كل مصدر عبر Meta دون إرجاع التوكن
    const remoteSources = [];
    for (const source of sources) {
      if (!source.accessToken) {
        remoteSources.push({
          sourceId: source.id,
          checked: true,
          ok: false,
          accountsCount: 0,
          error: "MISSING_TOKEN",
        });
        continue;
      }

      try {
        const adsService = new FacebookAdsService(source.accessToken);
        const result = await adsService.getAdAccounts();
        const accountsCount = result.success
          ? (result.data || []).length
          : 0;
        remoteSources.push({
          sourceId: source.id,
          checked: true,
          ok: result.success,
          accountsCount,
          error: result.success ? null : (typeof result.error === "string" ? result.error : result.error?.error?.message || result.error?.message || "FACEBOOK_API_ERROR"),
        });
      } catch (checkError) {
        remoteSources.push({
          sourceId: source.id,
          checked: true,
          ok: false,
          accountsCount: 0,
          error:
            checkError.response?.data?.error?.message || checkError.message,
        });
      }
    }

    const companyAdsToken = await getCompanyAdsAccessToken(companyId);

    res.json({
      success: true,
      connected: connectionSources.some(
        (source) => source.status === "connected" && source.hasToken,
      ),
      connectedFacebookAccountsCount: connectionSources.length,
      isolatedAdAccountsCount: savedAdAccounts.filter(
        (account) => account.hasIsolatedToken,
      ).length,
      savedAdAccounts,
      connectionSources,
      remoteSources,
      remote: {
        checked: Boolean(companyAdsToken) && remoteSources.length > 0,
        ok: remoteSources.some((entry) => entry.ok),
        accountsCount: remoteSources.reduce(
          (sum, entry) => sum + (entry.accountsCount || 0),
          0,
        ),
        error: null,
      },
      activeAdAccount: activeAdAccount
        ? { accountId: activeAdAccount.accountId }
        : null,
      pageConnection: {
        connectedPagesCount,
        messengerTokensProtected: true,
      },
    });
  } catch (error) {
    console.error("❌ Error getting Ads connection status:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * DELETE /api/v1/facebook-ads/connection/sources/:sourceId
 * فصل مصدر إعلانات معزول — لا يمس توكنات الصفحات/الماسنجر.
 */
const disconnectAdsConnectionSource = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { sourceId } = req.params;

    if (!companyId || !sourceId) {
      return res.status(400).json({
        success: false,
        error: "Company ID and source ID are required",
      });
    }

    const source = await getSharedPrismaClient().facebookAdsConnectionSource.findFirst(
      {
        where: { id: sourceId, companyId },
      },
    );

    if (!source) {
      return res.status(404).json({
        success: false,
        error: "Connection source not found",
      });
    }

    // فصل الحسابات المربوطة بهذا المصدر (بدون حذف التوكنات القديمة للشركة)
    await getSharedPrismaClient().facebookAdAccount.updateMany({
      where: { companyId, connectionSourceId: sourceId },
      data: {
        connectionSourceId: null,
        isActive: false,
      },
    });

    await getSharedPrismaClient().facebookAdsConnectionSource.update({
      where: { id: sourceId },
      data: {
        status: "disconnected",
        accessToken: null,
        lastError: "FCM: disconnected by owner",
        updatedAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: "تم فصل مصدر الإعلانات بنجاح",
      sourceId,
    });
  } catch (error) {
    console.error("❌ Error disconnecting Ads connection source:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * POST /api/v1/facebook-ads/upload-image
 * رفع صورة إلى Facebook
 */
const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "لم يتم رفع أي ملف",
      });
    }

    const companyId = req.user?.companyId;
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.status(401).json({
        success: false,
        error: "Access Token غير موجود",
      });
    }

    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst(
      {
        where: { companyId, isActive: true },
      },
    );

    if (!adAccount) {
      return res.status(404).json({
        success: false,
        error: "Ad Account غير موجود",
      });
    }

    const adsService = new FacebookAdsService(accessToken, adAccount.accountId);
    const uploadResult = await adsService.uploadImageBuffer(req.file.buffer, {
      filename: req.file.originalname || "image.jpg",
      contentType: req.file.mimetype || "image/jpeg",
    });

    if (!uploadResult.success || !uploadResult.hash) {
      throw new Error(uploadResult.error || "فشل في الحصول على Image Hash");
    }

    res.json({
      success: true,
      hash: uploadResult.hash,
      data: uploadResult.data,
    });
  } catch (error) {
    console.error("❌ Error uploading image:", error);
    res.status(500).json({
      success: false,
      error:
        error.response?.data?.error?.message ||
        error.message ||
        "فشل في رفع الصورة",
    });
  }
};

/**
 * POST /api/v1/facebook-ads/upload-video
 * رفع فيديو إلى Facebook
 */
const uploadVideo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "لم يتم رفع أي ملف",
      });
    }

    const { name } = req.body;
    const companyId = req.user?.companyId;
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.status(401).json({
        success: false,
        error: "Access Token غير موجود",
      });
    }

    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst(
      {
        where: { companyId, isActive: true },
      },
    );

    if (!adAccount) {
      return res.status(404).json({
        success: false,
        error: "Ad Account غير موجود",
      });
    }

    const adsService = new FacebookAdsService(accessToken, adAccount.accountId);
    const uploadResult = await adsService.uploadVideoBuffer(req.file.buffer, {
      name: name || "Video Ad",
      filename: req.file.originalname || "video.mp4",
      contentType: req.file.mimetype || "video/mp4",
    });

    if (!uploadResult.success || !uploadResult.videoId) {
      throw new Error(uploadResult.error || "فشل في الحصول على Video ID");
    }

    res.json({
      success: true,
      videoId: uploadResult.videoId,
      data: uploadResult.data,
    });
  } catch (error) {
    console.error("❌ Error uploading video:", error);
    res.status(500).json({
      success: false,
      error:
        error.response?.data?.error?.message ||
        error.message ||
        "فشل في رفع الفيديو",
    });
  }
};

/**
 * GET /api/v1/facebook-ads/ad-library/search
 * بحث في Meta Ads Archive / Ad Library
 */
const searchAdLibrary = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const accessToken = await getCompanyAdsAccessToken(companyId);

    if (!accessToken) {
      return res.status(401).json({
        success: false,
        error: "Facebook Ads Access Token غير موجود",
      });
    }

    const adLibraryService = new FacebookAdLibraryService(accessToken);
    const result = await adLibraryService.search(req.query);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message || "فشل البحث في مكتبة الإعلانات",
      data: [],
    });
  }
};

/**
 * ============================================
 * v22.0 New Features: Custom Audiences
 * ============================================
 */

/**
 * GET /api/v1/facebook-ads/audiences
 * جلب Custom Audiences
 */
const getCustomAudiences = async (req, res) => {
  try {
    const companyId = req.user?.companyId;

    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: "Facebook Access Token not found",
      });
    }

    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst(
      {
        where: { companyId, isActive: true },
      },
    );

    if (!adAccount) {
      return res.status(404).json({
        success: false,
        error: "Ad Account not found",
      });
    }

    const adsService = new FacebookAdsService(accessToken, adAccount.accountId);
    const result = await adsService.getCustomAudiences();

    res.json({
      success: true,
      data: result.data || [],
    });
  } catch (error) {
    console.error("❌ Error getting Custom Audiences:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * POST /api/v1/facebook-ads/audiences
 * إنشاء Custom Audience
 */
const createCustomAudience = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { name, description, subtype } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: "Audience name is required",
      });
    }

    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: "Facebook Access Token not found",
      });
    }

    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst(
      {
        where: { companyId, isActive: true },
      },
    );

    if (!adAccount) {
      return res.status(404).json({
        success: false,
        error: "Ad Account not found",
      });
    }

    const adsService = new FacebookAdsService(accessToken, adAccount.accountId);
    const result = await adsService.createCustomAudience({
      name,
      description,
      subtype,
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    res.json({
      success: true,
      data: {
        audienceId: result.audienceId,
        ...result.data,
      },
    });
  } catch (error) {
    console.error("❌ Error creating Custom Audience:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * POST /api/v1/facebook-ads/audiences/:id/users
 * إضافة مستخدمين لـ Custom Audience
 */
const addUsersToAudience = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { id } = req.params;
    const { users } = req.body;

    if (!users || !Array.isArray(users) || users.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Users array is required",
      });
    }

    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: "Facebook Access Token not found",
      });
    }

    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst(
      {
        where: { companyId, isActive: true },
      },
    );

    const adsService = new FacebookAdsService(
      accessToken,
      adAccount?.accountId,
    );
    const result = await adsService.addUsersToCustomAudience(id, users);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error("❌ Error adding users to audience:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * POST /api/v1/facebook-ads/audiences/lookalike
 * إنشاء Lookalike Audience
 */
const createLookalikeAudience = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { name, sourceAudienceId, country, ratio } = req.body;

    if (!name || !sourceAudienceId || !country) {
      return res.status(400).json({
        success: false,
        error: "name, sourceAudienceId, and country are required",
      });
    }

    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: "Facebook Access Token not found",
      });
    }

    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst(
      {
        where: { companyId, isActive: true },
      },
    );

    if (!adAccount) {
      return res.status(404).json({
        success: false,
        error: "Ad Account not found",
      });
    }

    const adsService = new FacebookAdsService(accessToken, adAccount.accountId);
    const result = await adsService.createLookalikeAudience({
      name,
      sourceAudienceId,
      country,
      ratio,
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    res.json({
      success: true,
      data: {
        audienceId: result.audienceId,
        ...result.data,
      },
    });
  } catch (error) {
    console.error("❌ Error creating Lookalike Audience:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * ============================================
 * v22.0 New Features: A/B Testing
 * ============================================
 */

/**
 * POST /api/v1/facebook-ads/ab-tests
 * إنشاء A/B Test
 */
const createABTest = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { name, description, startTime, endTime, cells } = req.body;

    if (!name || !cells || cells.length < 2) {
      return res.status(400).json({
        success: false,
        error: "name and at least 2 cells are required",
      });
    }

    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: "Facebook Access Token not found",
      });
    }

    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst(
      {
        where: { companyId, isActive: true },
      },
    );

    if (!adAccount) {
      return res.status(404).json({
        success: false,
        error: "Ad Account not found",
      });
    }

    const adsService = new FacebookAdsService(accessToken, adAccount.accountId);
    const result = await adsService.createABTest({
      name,
      description,
      startTime,
      endTime,
      cells,
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    res.json({
      success: true,
      data: {
        studyId: result.studyId,
        ...result.data,
      },
    });
  } catch (error) {
    console.error("❌ Error creating A/B Test:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * GET /api/v1/facebook-ads/ab-tests/:id
 * جلب نتائج A/B Test
 */
const getABTestResults = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { id } = req.params;

    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: "Facebook Access Token not found",
      });
    }

    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst(
      {
        where: { companyId, isActive: true },
      },
    );

    const adsService = new FacebookAdsService(
      accessToken,
      adAccount?.accountId,
    );
    const result = await adsService.getABTestResults(id);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error("❌ Error getting A/B Test results:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * ============================================
 * v22.0 New Features: Lead Generation
 * ============================================
 */

/**
 * POST /api/v1/facebook-ads/lead-forms
 * إنشاء Lead Form
 */
const createLeadForm = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { pageId, name, questions, privacyPolicyUrl, thankYouPage } =
      req.body;

    if (!pageId || !name || !questions || !privacyPolicyUrl) {
      return res.status(400).json({
        success: false,
        error: "pageId, name, questions, and privacyPolicyUrl are required",
      });
    }

    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: "Facebook Access Token not found",
      });
    }

    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst(
      {
        where: { companyId, isActive: true },
      },
    );

    const adsService = new FacebookAdsService(
      accessToken,
      adAccount?.accountId,
    );
    const result = await adsService.createLeadForm(pageId, {
      name,
      questions,
      privacyPolicyUrl,
      thankYouPage,
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    res.json({
      success: true,
      data: {
        formId: result.formId,
        ...result.data,
      },
    });
  } catch (error) {
    console.error("❌ Error creating Lead Form:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * GET /api/v1/facebook-ads/lead-forms/:id/leads
 * جلب Leads من Form
 */
const getLeads = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { id } = req.params;

    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: "Facebook Access Token not found",
      });
    }

    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst(
      {
        where: { companyId, isActive: true },
      },
    );

    const adsService = new FacebookAdsService(
      accessToken,
      adAccount?.accountId,
    );
    const result = await adsService.getLeads(id);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error("❌ Error getting Leads:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * ============================================
 * v22.0 New Features: Conversion API (CAPI)
 * ============================================
 */

/**
 * POST /api/v1/facebook-ads/conversions
 * إرسال Conversion Event
 */
const sendConversionEvent = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const {
      pixelId,
      eventName,
      eventId,
      eventTime,
      testEventCode,
      eventSourceUrl,
      userData,
      customData,
      actionSource,
    } = req.body;

    if (!pixelId || !eventName) {
      return res.status(400).json({
        success: false,
        error: "pixelId and eventName are required",
      });
    }

    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: "Facebook Access Token not found",
      });
    }

    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst(
      {
        where: { companyId, isActive: true },
      },
    );

    const adsService = new FacebookAdsService(
      accessToken,
      adAccount?.accountId,
    );
    const result = await adsService.sendConversionEvent(pixelId, {
      eventName,
      eventId,
      eventTime,
      testEventCode,
      eventSourceUrl,
      userData,
      customData,
      actionSource,
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error("❌ Error sending Conversion Event:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * ============================================
 * v22.0 New Features: Ad Scheduling
 * ============================================
 */

/**
 * PUT /api/v1/facebook-ads/adsets/:id/schedule
 * تحديث جدولة Ad Set
 */
const updateAdSetSchedule = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { id } = req.params;
    const { schedule } = req.body;

    if (!schedule || !Array.isArray(schedule)) {
      return res.status(400).json({
        success: false,
        error: "schedule array is required",
      });
    }

    // جلب Ad Set من قاعدة البيانات
    const adSet = await getSharedPrismaClient().facebookAdset.findFirst({
      where: { id, companyId },
    });

    if (!adSet) {
      return res.status(404).json({
        success: false,
        error: "Ad Set not found",
      });
    }

    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: "Facebook Access Token not found",
      });
    }

    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst(
      {
        where: { companyId, isActive: true },
      },
    );

    const adsService = new FacebookAdsService(
      accessToken,
      adAccount?.accountId,
    );
    const result = await adsService.updateAdSetSchedule(
      adSet.facebookAdSetId,
      schedule,
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error("❌ Error updating Ad Set schedule:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// v22.0: Dynamic Creative Optimization
const createDynamicCreative = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const data = req.body;
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken)
      return res
        .status(400)
        .json({ success: false, error: "Access Token not found" });
    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst(
      { where: { companyId, isActive: true } },
    );
    if (!adAccount)
      return res
        .status(404)
        .json({ success: false, error: "Ad Account not found" });
    const adsService = new FacebookAdsService(accessToken, adAccount.accountId);
    const result = await adsService.createDynamicCreative(data);
    if (!result.success)
      return res.status(400).json({ success: false, error: result.error });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// v22.0: Advantage+ Shopping
const createAdvantagePlusShoppingCampaign = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const data = req.body;
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken)
      return res
        .status(400)
        .json({ success: false, error: "Access Token not found" });
    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst(
      { where: { companyId, isActive: true } },
    );
    if (!adAccount)
      return res
        .status(404)
        .json({ success: false, error: "Ad Account not found" });
    const adsService = new FacebookAdsService(accessToken, adAccount.accountId);
    const result = await adsService.createAdvantagePlusShoppingCampaign(data);
    if (!result.success)
      return res.status(400).json({ success: false, error: result.error });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// v22.0: Async Reports
const createAsyncReport = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const data = req.body;
    const requestedAdAccountId = data?.adAccountId || req.query?.adAccountId;
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken)
      return res
        .status(400)
        .json({ success: false, error: "Access Token not found" });
    const adAccount = await getOrCreateAdAccount(
      companyId,
      accessToken,
      requestedAdAccountId,
    );
    if (!adAccount)
      return res
        .status(404)
        .json({ success: false, error: "Ad Account not found" });
    const adsService = new FacebookAdsService(accessToken, adAccount.accountId);
    const result = await adsService.createAsyncReport(data);
    if (!result.success)
      return res.status(400).json({ success: false, error: result.error });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getAsyncReportStatus = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { reportRunId } = req.params;
    const requestedAdAccountId = req.query?.adAccountId || req.body?.adAccountId;
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken)
      return res
        .status(400)
        .json({ success: false, error: "Access Token not found" });
    const adAccount = await getOrCreateAdAccount(
      companyId,
      accessToken,
      requestedAdAccountId,
    );
    if (!adAccount)
      return res
        .status(404)
        .json({ success: false, error: "Ad Account not found" });
    const adsService = new FacebookAdsService(
      accessToken,
      adAccount?.accountId,
    );
    const result = await adsService.getAsyncReportStatus(reportRunId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getAsyncReportResults = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { reportRunId } = req.params;
    const requestedAdAccountId = req.query?.adAccountId || req.body?.adAccountId;
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken)
      return res
        .status(400)
        .json({ success: false, error: "Access Token not found" });
    const adAccount = await getOrCreateAdAccount(
      companyId,
      accessToken,
      requestedAdAccountId,
    );
    if (!adAccount)
      return res
        .status(404)
        .json({ success: false, error: "Ad Account not found" });
    const adsService = new FacebookAdsService(
      accessToken,
      adAccount?.accountId,
    );
    const result = await adsService.getAsyncReportResults(reportRunId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// v22.0: Creative Formats
const createCollectionCreative = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const data = req.body;
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken)
      return res
        .status(400)
        .json({ success: false, error: "Access Token not found" });
    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst(
      { where: { companyId, isActive: true } },
    );
    if (!adAccount)
      return res
        .status(404)
        .json({ success: false, error: "Ad Account not found" });
    const adsService = new FacebookAdsService(accessToken, adAccount.accountId);
    const result = await adsService.createCollectionCreative(data);
    if (!result.success)
      return res.status(400).json({ success: false, error: result.error });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const createStoriesReelsCreative = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const data = req.body;
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken)
      return res
        .status(400)
        .json({ success: false, error: "Access Token not found" });
    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst(
      { where: { companyId, isActive: true } },
    );
    if (!adAccount)
      return res
        .status(404)
        .json({ success: false, error: "Ad Account not found" });
    const adsService = new FacebookAdsService(accessToken, adAccount.accountId);
    const result = await adsService.createStoriesReelsCreative(data);
    if (!result.success)
      return res.status(400).json({ success: false, error: result.error });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const createInstantExperience = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { pageId, name, components } = req.body;
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken)
      return res
        .status(400)
        .json({ success: false, error: "Access Token not found" });
    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst(
      { where: { companyId, isActive: true } },
    );
    const adsService = new FacebookAdsService(
      accessToken,
      adAccount?.accountId,
    );
    const result = await adsService.createInstantExperience(pageId, {
      name,
      components,
    });
    if (!result.success)
      return res.status(400).json({ success: false, error: result.error });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// v22.0: Automation Rules
const createAutomatedRule = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const data = req.body;
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken)
      return res
        .status(400)
        .json({ success: false, error: "Access Token not found" });
    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst(
      { where: { companyId, isActive: true } },
    );
    if (!adAccount)
      return res
        .status(404)
        .json({ success: false, error: "Ad Account not found" });
    const adsService = new FacebookAdsService(accessToken, adAccount.accountId);
    const result = await adsService.createAutomatedRule(data);
    if (!result.success)
      return res.status(400).json({ success: false, error: result.error });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getAutomatedRules = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.json({
        success: true,
        data: [],
        meta: {
          configured: false,
          reason: "NO_ACCESS_TOKEN",
        },
      });
    }
    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst(
      { where: { companyId, isActive: true } },
    );
    if (!adAccount) {
      return res.json({
        success: true,
        data: [],
        meta: {
          configured: false,
          reason: "NO_AD_ACCOUNT",
        },
      });
    }
    const adsService = new FacebookAdsService(accessToken, adAccount.accountId);
    const result = await adsService.getAutomatedRules();
    if (!result.success) {
      return res.json({
        success: true,
        data: [],
        meta: {
          configured: false,
          reason: "FACEBOOK_API_ERROR",
          error: result.error,
        },
      });
    }
    res.json({ success: true, data: result.data || [] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const updateAutomatedRule = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { id } = req.params;
    const data = req.body;
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken)
      return res
        .status(400)
        .json({ success: false, error: "Access Token not found" });
    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst(
      { where: { companyId, isActive: true } },
    );
    const adsService = new FacebookAdsService(
      accessToken,
      adAccount?.accountId,
    );
    const result = await adsService.updateAutomatedRule(id, data);
    if (!result.success)
      return res.status(400).json({ success: false, error: result.error });
    res.json({ success: true, data: result.data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const deleteAutomatedRule = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { id } = req.params;
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken)
      return res
        .status(400)
        .json({ success: false, error: "Access Token not found" });
    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst(
      { where: { companyId, isActive: true } },
    );
    const adsService = new FacebookAdsService(
      accessToken,
      adAccount?.accountId,
    );
    const result = await adsService.deleteAutomatedRule(id);
    if (!result.success)
      return res.status(400).json({ success: false, error: result.error });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// v22.0: Attribution Settings
const updateAttributionSettings = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { adSetId } = req.params;
    const settings = req.body;
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken)
      return res
        .status(400)
        .json({ success: false, error: "Access Token not found" });
    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst(
      { where: { companyId, isActive: true } },
    );
    const adsService = new FacebookAdsService(
      accessToken,
      adAccount?.accountId,
    );
    const result = await adsService.updateAttributionSettings(
      adSetId,
      settings,
    );
    if (!result.success)
      return res.status(400).json({ success: false, error: result.error });
    res.json({ success: true, data: result.data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// v22.0: Ad Set Management
const updateAdSet = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { id } = req.params;
    const data = req.body;
    const adSet = await getSharedPrismaClient().facebookAdset.findFirst({
      where: { id, companyId },
    });
    if (!adSet)
      return res
        .status(404)
        .json({ success: false, error: "Ad Set not found" });
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken)
      return res
        .status(400)
        .json({ success: false, error: "Access Token not found" });
    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst(
      { where: { companyId, isActive: true } },
    );
    const adsService = new FacebookAdsService(
      accessToken,
      adAccount?.accountId,
    );
    const result = await adsService.updateAdSet(adSet.facebookAdSetId, data);
    if (!result.success)
      return res.status(400).json({ success: false, error: result.error });
    res.json({ success: true, data: result.data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const updateFrequencyCap = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { id } = req.params;
    const { maxFrequency, intervalDays } = req.body;
    const adSet = await getSharedPrismaClient().facebookAdset.findFirst({
      where: { id, companyId },
    });
    if (!adSet)
      return res
        .status(404)
        .json({ success: false, error: "Ad Set not found" });
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken)
      return res
        .status(400)
        .json({ success: false, error: "Access Token not found" });
    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst(
      { where: { companyId, isActive: true } },
    );
    const adsService = new FacebookAdsService(
      accessToken,
      adAccount?.accountId,
    );
    const result = await adsService.updateFrequencyCap(adSet.facebookAdSetId, {
      maxFrequency,
      intervalDays,
    });
    if (!result.success)
      return res.status(400).json({ success: false, error: result.error });
    res.json({ success: true, data: result.data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// v22.0: Advanced Targeting
const searchTargetingOptions = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const {
      query,
      type,
      countryCode,
      regionId,
      locationTypes,
      limit,
    } = req.query;
    if (!query || String(query).trim().length < 2) {
      return res.json({ success: true, data: [] });
    }
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken)
      return res
        .status(400)
        .json({ success: false, error: "Access Token not found" });
    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst(
      { where: { companyId, isActive: true } },
    );
    const adsService = new FacebookAdsService(
      accessToken,
      adAccount?.accountId,
    );
    const parsedLocationTypes =
      typeof locationTypes === "string"
        ? locationTypes
            .split(",")
            .map((locationType) => locationType.trim())
            .filter(Boolean)
        : undefined;
    const result = await adsService.searchTargetingOptions(query, type, {
      countryCode,
      regionId,
      locationTypes: parsedLocationTypes,
      limit: toFiniteNumber(limit) || undefined,
    });
    res.json({ success: true, data: result.data || [] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getTargetingSuggestions = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { targetingList } = req.body;
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken)
      return res
        .status(400)
        .json({ success: false, error: "Access Token not found" });
    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst(
      { where: { companyId, isActive: true } },
    );
    if (!adAccount)
      return res
        .status(404)
        .json({ success: false, error: "Ad Account not found" });
    const adsService = new FacebookAdsService(accessToken, adAccount.accountId);
    const result = await adsService.getTargetingSuggestions(targetingList);
    res.json({ success: true, data: result.data || [] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getReachEstimate = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { targeting } = req.body;
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken)
      return res
        .status(400)
        .json({ success: false, error: "Access Token not found" });
    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst(
      { where: { companyId, isActive: true } },
    );
    if (!adAccount)
      return res
        .status(404)
        .json({ success: false, error: "Ad Account not found" });
    const adsService = new FacebookAdsService(accessToken, adAccount.accountId);
    const result = await adsService.getReachEstimate(targeting);
    res.json({ success: true, data: result.data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// v22.0: Ad Preview
const getAdPreview = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { adId } = req.params;
    const { format } = req.query;
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken)
      return res
        .status(400)
        .json({ success: false, error: "Access Token not found" });
    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst(
      { where: { companyId, isActive: true } },
    );
    const adsService = new FacebookAdsService(
      accessToken,
      adAccount?.accountId,
    );
    const result = await adsService.getAdPreview(adId, format);
    res.json({ success: true, data: result.data || [] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getCreativePreview = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { creativeId } = req.params;
    const { format } = req.query;
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken)
      return res
        .status(400)
        .json({ success: false, error: "Access Token not found" });
    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst(
      { where: { companyId, isActive: true } },
    );
    if (!adAccount)
      return res
        .status(404)
        .json({ success: false, error: "Ad Account not found" });
    const adsService = new FacebookAdsService(accessToken, adAccount.accountId);
    const result = await adsService.getCreativePreview(creativeId, format);
    res.json({ success: true, data: result.data || [] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// v22.0: Saved Audiences
const createSavedAudience = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { name, description, targeting } = req.body;
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken)
      return res
        .status(400)
        .json({ success: false, error: "Access Token not found" });
    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst(
      { where: { companyId, isActive: true } },
    );
    if (!adAccount)
      return res
        .status(404)
        .json({ success: false, error: "Ad Account not found" });
    const adsService = new FacebookAdsService(accessToken, adAccount.accountId);
    const result = await adsService.createSavedAudience({
      name,
      description,
      targeting,
    });
    if (!result.success)
      return res.status(400).json({ success: false, error: result.error });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getSavedAudiences = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.json({
        success: true,
        data: [],
        message: "No Facebook Ads access token configured yet.",
      });
    }
    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst(
      { where: { companyId, isActive: true } },
    );
    if (!adAccount) {
      return res.json({
        success: true,
        data: [],
        message: "No active Facebook Ad Account found.",
      });
    }
    const adsService = new FacebookAdsService(accessToken, adAccount.accountId);
    const result = await adsService.getSavedAudiences();
    res.json({ success: true, data: result.data || [] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const deleteSavedAudience = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { id } = req.params;
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken)
      return res
        .status(400)
        .json({ success: false, error: "Access Token not found" });
    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst(
      { where: { companyId, isActive: true } },
    );
    const adsService = new FacebookAdsService(
      accessToken,
      adAccount?.accountId,
    );
    const result = await adsService.deleteSavedAudience(id);
    if (!result.success)
      return res.status(400).json({ success: false, error: result.error });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * ============================================
 * Facebook Pages & Pixels
 * ============================================
 */

const FACEBOOK_PAGE_RECOMMENDED_PERMISSIONS = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_metadata",
  "business_management",
  "ads_management",
  "ads_read",
];

function sortFacebookPageOptions(a, b) {
  const statusOrder = {
    READY: 0,
    ACCESSIBLE_BUT_NOT_CONNECTED: 1,
    CONNECTED_BUT_NOT_ACCESSIBLE: 2,
  };

  const leftOrder = statusOrder[a.status] ?? 99;
  const rightOrder = statusOrder[b.status] ?? 99;

  if (leftOrder !== rightOrder) {
    return leftOrder - rightOrder;
  }

  return String(a.name || "").localeCompare(String(b.name || ""), "ar");
}

/**
 * GET /api/v1/facebook-ads/pages
 * جلب Facebook Pages
 */
const getFacebookPages = async (req, res) => {
  try {
    const companyId = req.user?.companyId;

    const accessToken = await getCompanyPageAccessToken(companyId);
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error:
          "Facebook Page Access Token not found. Please connect your Facebook account.",
      });
    }

    const adsService = new FacebookAdsService(accessToken);
    const prisma = getSharedPrismaClient();
    const [company, storedPages, pagesResult, permissionsResult] =
      await Promise.all([
        prisma.company.findUnique({
          where: { id: companyId },
          select: { id: true, name: true },
        }),
        prisma.facebookPage.findMany({
          where: {
            companyId,
            status: "connected",
          },
          select: {
            pageId: true,
            pageName: true,
            status: true,
            connectedAt: true,
            updatedAt: true,
          },
          orderBy: {
            updatedAt: "desc",
          },
        }),
        adsService.getFacebookPages(),
        adsService.getUserPermissions(),
      ]);

    const remotePages = Array.isArray(pagesResult.data) ? pagesResult.data : [];
    const grantedPermissions = Array.isArray(permissionsResult.data)
      ? permissionsResult.data
          .filter((permission) => permission?.status === "granted")
          .map((permission) => permission.permission)
      : [];
    const missingRecommendedPermissions =
      FACEBOOK_PAGE_RECOMMENDED_PERMISSIONS.filter(
        (permission) => !grantedPermissions.includes(permission),
      );

    const remotePagesById = new Map(
      remotePages.map((page) => [String(page.id), page]),
    );
    const storedPagesById = new Map(
      storedPages.map((page) => [String(page.pageId), page]),
    );

    const mergedPages = remotePages.map((page) => {
      const pageId = String(page.id);
      const storedPage = storedPagesById.get(pageId);
      const isConnectedToCompany = Boolean(storedPage);

      return {
        id: pageId,
        name: page.name || storedPage?.pageName || pageId,
        category: page.category || undefined,
        source: isConnectedToCompany ? "page_token+company" : "page_token_only",
        isAccessibleByAdsToken: true,
        isConnectedToCompany,
        isSelectable: true,
        status: isConnectedToCompany
          ? "READY"
          : "ACCESSIBLE_BUT_NOT_CONNECTED",
        warning: isConnectedToCompany
          ? null
          : "هذه الصفحة ظهرت من حساب Meta الحالي لكنها غير مربوطة بهذه الشركة داخل Max P.",
      };
    });

    for (const storedPage of storedPages) {
      const pageId = String(storedPage.pageId);
      if (remotePagesById.has(pageId)) {
        continue;
      }

      mergedPages.push({
        id: pageId,
        name: storedPage.pageName || pageId,
        category: undefined,
        source: "company_connection_only",
        isAccessibleByAdsToken: false,
        isConnectedToCompany: true,
        isSelectable: false,
        status: "CONNECTED_BUT_NOT_ACCESSIBLE",
        warning:
          "هذه الصفحة مربوطة بهذه الشركة داخل Max P لكنها غير ظاهرة في ربط Meta الحالي.",
      });
    }

    mergedPages.sort(sortFacebookPageOptions);

    const counts = {
      total: mergedPages.length,
      ready: mergedPages.filter((page) => page.status === "READY").length,
      accessibleButNotConnected: mergedPages.filter(
        (page) => page.status === "ACCESSIBLE_BUT_NOT_CONNECTED",
      ).length,
      connectedButNotAccessible: mergedPages.filter(
        (page) => page.status === "CONNECTED_BUT_NOT_ACCESSIBLE",
      ).length,
    };

    let primaryWarning = null;
    if (counts.ready === 0 && counts.connectedButNotAccessible > 0) {
      primaryWarning =
        "الصفحات المربوطة بهذه الشركة غير ظاهرة في ربط Meta الحالي. أعد ربط Facebook بالحساب الذي يملك الصفحة الصحيحة.";
    } else if (counts.ready === 0 && counts.accessibleButNotConnected > 0) {
      primaryWarning =
        "يوجد صفحات متاحة من Meta، لكنها غير مربوطة بهذه الشركة داخل النظام. اختر بحذر أو اربط الصفحة الصحيحة أولاً.";
    }

    res.json({
      success: true,
      data: mergedPages.map(sanitizeFacebookPageForClient),
      meta: {
        company: company
          ? {
              id: company.id,
              name: company.name,
            }
          : null,
        counts,
        permissions: {
          granted: grantedPermissions,
          missingRecommended: missingRecommendedPermissions,
        },
        remoteFetchOk: pagesResult.success,
        remoteError: pagesResult.success ? null : pagesResult.error || null,
        primaryWarning,
      },
    });
  } catch (error) {
    console.error("Error getting Facebook Pages:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * GET /api/v1/facebook-ads/pixels
 * جلب Facebook Pixels
 */
const getFacebookPixels = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const requestedAdAccountId = req.query?.adAccountId || req.body?.adAccountId;

    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error:
          "Facebook Ads Access Token not found. Please connect your Facebook account.",
      });
    }

    const adAccount = await getOrCreateAdAccount(
      companyId,
      accessToken,
      requestedAdAccountId,
    );

    if (!adAccount) {
      return res.status(404).json({
        success: false,
        error:
          "No Facebook Ad Account is ready yet. Please choose and activate an Ad Account first.",
      });
    }

    const adsService = new FacebookAdsService(accessToken, adAccount.accountId);
    const result = await adsService.getFacebookPixels();

    res.json({
      success: true,
      data: result.data || [],
    });
  } catch (error) {
    console.error("Error getting Facebook Pixels:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const getProductLaunchMetadata = async (req, res) => {
  try {
    const { url } = req.query;
    const companyId = req.user?.companyId;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: "Product URL is required",
      });
    }

    if (!companyId) {
      return res.status(401).json({
        success: false,
        error: "Company authentication is required",
      });
    }

    const parsedProductUrl = parseProductLaunchUrl(url);
    const decodedProductSlug = decodeProductLaunchSlug(
      parsedProductUrl.productSlug,
    );
    const productApiUrl = new URL(
      `${parsedProductUrl.origin}/api/v1/public/products/${encodeURIComponent(
        decodedProductSlug,
      )}`,
    );
    productApiUrl.searchParams.set("companyId", parsedProductUrl.storeSlug);

    const product = await getSharedPrismaClient().product.findFirst({
      where: {
        companyId,
        deletedAt: null,
        isActive: true,
        OR: [
          { id: decodedProductSlug },
          { slug: decodedProductSlug },
          { slug: parsedProductUrl.productSlug },
        ],
      },
      select: PRODUCT_LAUNCH_METADATA_PRODUCT_SELECT,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: "Product metadata could not be loaded",
      });
    }

    const imageUrls = collectProductLaunchImages(
      product,
      parsedProductUrl.origin,
    );

    return res.json({
      success: true,
      data: {
        sourceUrl: parsedProductUrl.url,
        productApiUrl: productApiUrl.toString(),
        storeSlug: parsedProductUrl.storeSlug,
        productSlug: product.slug || parsedProductUrl.productSlug,
        id: product.id,
        name: product.name,
        description: stripHtml(product.description),
        sku: product.sku || null,
        price: toNullableNumber(product.price),
        comparePrice: toNullableNumber(product.comparePrice),
        category: product.category?.name || product.category || null,
        isActive: product.isActive !== false,
        isHidden: product.isHidden === true,
        stock: toNullableNumber(product.stock),
        trackInventory: product.trackInventory !== false,
        mainImage: imageUrls[0] || null,
        imageUrls,
        imageCount: imageUrls.length,
        carouselCardLimit: 10,
      },
    });
  } catch (error) {
    const status =
      error.message?.includes("not allowed") ||
      error.message?.includes("missing") ||
      error.message?.includes("must use")
        ? 400
        : 500;

    console.error("❌ Error loading product launch metadata:", {
      message: error.message,
      url: req.query?.url,
    });

    return res.status(status).json({
      success: false,
      error: error.message || "Failed to load product metadata",
    });
  }
};

module.exports = {
  // Campaigns
  getCampaigns,
  createCampaign,
  getCampaign,
  updateCampaign,
  deleteCampaign,
  pauseCampaign,
  resumeCampaign,
  bulkUpdateStatus,

  // 🚀 Full Ad Creation (Campaign + AdSet + Ad)
  createFullAd,
  getProductLaunchMetadata,

  // Ad Accounts
  getAdAccounts,
  saveAdAccount,
  getSavedAdAccounts,

  // Isolated Ads Connection
  getAdsConnectionStatus,
  disconnectAdsConnectionSource,

  // AdSets
  getAdSets,
  createAdSet,
  deleteAdSet,

  // Ads
  getAds,
  createAd,
  updateAd,
  deleteAd,

  // Insights
  getAdInsights,
  getAdDetails,
  getAdPerformanceBreakdown,
  syncAdInsights,
  getCampaignInsights,
  getPerformanceSummary,
  getDecisionSummary,
  getGeoPerformanceBreakdown,
  getPerformanceBreakdownReport,

  // Sync
  syncFromFacebook,

  // Upload
  uploadImage,
  uploadVideo,

  // Meta Ad Library / Ads Archive
  searchAdLibrary,

  // v22.0: Custom Audiences
  getCustomAudiences,
  createCustomAudience,
  addUsersToAudience,
  createLookalikeAudience,

  // v22.0: A/B Testing
  createABTest,
  getABTestResults,

  // v22.0: Lead Generation
  createLeadForm,
  getLeads,

  // v22.0: Conversion API
  sendConversionEvent,

  // Facebook Pages & Pixels
  getFacebookPages,
  getFacebookPixels,

  // v22.0: Ad Scheduling
  updateAdSetSchedule,

  // v22.0: Dynamic Creative Optimization
  createDynamicCreative,

  // v22.0: Advantage+ Shopping
  createAdvantagePlusShoppingCampaign,

  // v22.0: Async Reports
  createAsyncReport,
  getAsyncReportStatus,
  getAsyncReportResults,

  // v22.0: Creative Formats
  createCollectionCreative,
  createStoriesReelsCreative,
  createInstantExperience,

  // v22.0: Automation Rules
  createAutomatedRule,
  getAutomatedRules,
  updateAutomatedRule,
  deleteAutomatedRule,

  // v22.0: Attribution
  updateAttributionSettings,

  // v22.0: Ad Set Management
  updateAdSet,
  updateFrequencyCap,

  // v22.0: Advanced Targeting
  searchTargetingOptions,
  getTargetingSuggestions,
  getReachEstimate,

  // v22.0: Ad Preview
  getAdPreview,
  getCreativePreview,

  // v22.0: Saved Audiences
  createSavedAudience,
  getSavedAudiences,
  deleteSavedAudience,

  // v22.0: Ad Recommendations
  getAdRecommendations: async (req, res) => {
    try {
      const { adId } = req.params;
      const companyId = req.user?.companyId;

      const accessToken = await getCompanyAdsAccessToken(companyId);
      if (!accessToken) {
        return res.status(400).json({
          success: false,
          error: "Facebook Ads Access Token not found.",
        });
      }

      const adAccount =
        await getSharedPrismaClient().facebookAdAccount.findFirst({
          where: { companyId, isActive: true },
        });

      if (!adAccount) {
        return res.status(404).json({
          success: false,
          error: "No active Facebook Ad Account found.",
        });
      }

      const adsService = new FacebookAdsService(
        accessToken,
        adAccount.accountId,
      );
      const result = await adsService.getAdRecommendations(adId);

      res.json(result);
    } catch (error) {
      console.error("Error getting Ad Recommendations:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },

  applyAdRecommendation: async (req, res) => {
    try {
      const { adId } = req.params;
      const { recommendationId } = req.body;
      const companyId = req.user?.companyId;

      const accessToken = await getCompanyAdsAccessToken(companyId);
      if (!accessToken) {
        return res.status(400).json({
          success: false,
          error: "Facebook Ads Access Token not found.",
        });
      }

      const adAccount =
        await getSharedPrismaClient().facebookAdAccount.findFirst({
          where: { companyId, isActive: true },
        });

      if (!adAccount) {
        return res.status(404).json({
          success: false,
          error: "No active Facebook Ad Account found.",
        });
      }

      const adsService = new FacebookAdsService(
        accessToken,
        adAccount.accountId,
      );
      const result = await adsService.applyAdRecommendation(
        adId,
        recommendationId,
      );

      res.json(result);
    } catch (error) {
      console.error("Error applying Ad Recommendation:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },

  // v22.0: Instagram Reels Ads
  createInstagramReelsCreative: async (req, res) => {
    try {
      const companyId = req.user?.companyId;
      const accessToken = await getCompanyAdsAccessToken(companyId);

      if (!accessToken) {
        return res.status(400).json({
          success: false,
          error: "Facebook Ads Access Token not found.",
        });
      }

      const adAccount =
        await getSharedPrismaClient().facebookAdAccount.findFirst({
          where: { companyId, isActive: true },
        });

      if (!adAccount) {
        return res.status(404).json({
          success: false,
          error: "No active Facebook Ad Account found.",
        });
      }

      const adsService = new FacebookAdsService(
        accessToken,
        adAccount.accountId,
      );
      const result = await adsService.createInstagramReelsCreative(req.body);

      res.json(result);
    } catch (error) {
      console.error("Error creating Instagram Reels Creative:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },

  // v22.0: WhatsApp Ads
  createWhatsAppAd: async (req, res) => {
    try {
      const companyId = req.user?.companyId;
      const accessToken = await getCompanyAdsAccessToken(companyId);

      if (!accessToken) {
        return res.status(400).json({
          success: false,
          error: "Facebook Ads Access Token not found.",
        });
      }

      const adAccount =
        await getSharedPrismaClient().facebookAdAccount.findFirst({
          where: { companyId, isActive: true },
        });

      if (!adAccount) {
        return res.status(404).json({
          success: false,
          error: "No active Facebook Ad Account found.",
        });
      }

      const adsService = new FacebookAdsService(
        accessToken,
        adAccount.accountId,
      );
      const result = await adsService.createWhatsAppAd(req.body);

      res.json(result);
    } catch (error) {
      console.error("Error creating WhatsApp Ad:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },

  // v22.0: Ad Quality Metrics
  getAdQualityMetrics: async (req, res) => {
    try {
      const { adId } = req.params;
      const companyId = req.user?.companyId;

      const accessToken = await getCompanyAdsAccessToken(companyId);
      if (!accessToken) {
        return res.status(400).json({
          success: false,
          error: "Facebook Ads Access Token not found.",
        });
      }

      const adAccount =
        await getSharedPrismaClient().facebookAdAccount.findFirst({
          where: { companyId, isActive: true },
        });

      if (!adAccount) {
        return res.status(404).json({
          success: false,
          error: "No active Facebook Ad Account found.",
        });
      }

      const adsService = new FacebookAdsService(
        accessToken,
        adAccount.accountId,
      );
      const result = await adsService.getAdQualityMetrics(adId);

      res.json(result);
    } catch (error) {
      console.error("Error getting Ad Quality Metrics:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },
};
