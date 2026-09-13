/**
 * Full Ad Wizard Helpers, Validation and Idempotency Engine
 */
const crypto = require("crypto");
const {
  getSharedPrismaClient,
  FacebookAdsService,
  validateFacebookPageAccessToken,
} = require("./dependencies");
const { getCompanyPageAccessToken } = require("./tokens");
const {
  PRODUCT_LAUNCH_ALLOWED_HOSTS,
  PRODUCT_LAUNCH_DEV_HOSTS,
  SUPPORTED_FULL_AD_CREATIVE_TYPES,
  FULL_AD_MINIMUM_BUDGET_BY_CURRENCY,
  ACTIVE_PUBLISH_CONFIRMATION_TOKEN,
  PUBLISH_REQUEST_LOCK_TTL_MS,
} = require("./constants");
const {
  toFiniteNumber,
  safeStringifyJson,
  safeParseJson,
  stableStringify,
} = require("./utils");

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

function normalizeFullAdCreativeType(creativeType) {
  const upper = String(creativeType || "SINGLE_IMAGE").trim().toUpperCase();
  if (upper === "IMAGE") return "SINGLE_IMAGE";
  if (upper === "VIDEO") return "SINGLE_VIDEO";
  return upper;
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

  // If the destination URL is an external website/landing page (not hosted on MaxP storefront domain),
  // we do not block publishing on storefrontSettings coupling as long as pixel exists in ad account.
  if (data?.linkUrl) {
    try {
      const parsedUrl = new URL(String(data.linkUrl).trim());
      const isStorefrontHost = isAllowedProductLaunchHost(parsedUrl.hostname);
      if (!isStorefrontHost) {
        return null;
      }
    } catch {
      // Ignore URL parse errors here; linkUrl format is validated elsewhere
    }
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
    let selectedPixel = null;
    const pixelsResult = await adsService.getFacebookPixels();
    const pixels = Array.isArray(pixelsResult?.data) ? pixelsResult.data : [];
    selectedPixel = pixels.find((pixel) => String(pixel.id) === String(pixelId));

    // 🛡️ 2026 Resilience: If Meta live query returned empty due to rate limiting or transient latency,
    // verify against local trusted database configuration for this company/storefront.
    if (!selectedPixel) {
      try {
        const prisma = getSharedPrismaClient();
        const storefront = await prisma.storefrontSettings?.findFirst?.({
          where: { companyId },
          select: {
            facebookPixelId: true,
            facebookPixelConfigs: {
              select: { pixelId: true },
            },
          },
        });
        const hasLocalPixelMatch =
          String(storefront?.facebookPixelId || "") === String(pixelId) ||
          storefront?.facebookPixelConfigs?.some(
            (c) => String(c.pixelId) === String(pixelId),
          );

        if (hasLocalPixelMatch) {
          selectedPixel = { id: String(pixelId), name: "Verified Account Pixel" };
        }
      } catch (dbErr) {
        console.warn("⚠️ [FULL-AD] Local pixel assertion check fallback failed:", dbErr.message);
      }
    }

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

  if (creativeType === "EXISTING_POST" && !data.postId) {
    return "معرّف المنشور (Post ID) مطلوب عند استخدام منشور حالي من الصفحة.";
  }

  return null;
}

function getPersistedCreativePayload(data, result, creativeType) {
  return {
    creativeId: result.creativeId,
    pageId: data.pageId,
    creativeType,
    postId: data.postId || null,
    primaryText: data.primaryText || null,
    headline: data.headline || null,
    description: data.description || null,
    callToAction: data.callToAction || "LEARN_MORE",
    linkUrl: data.linkUrl || null,
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

module.exports = {
  isAllowedProductLaunchHost,
  parseProductLaunchUrl,
  decodeProductLaunchSlug,
  normalizeProductLaunchImageUrl,
  collectProductLaunchImages,
  normalizeFullAdCreativeType,
  normalizeFullAdBidStrategy,
  normalizeFullAdDeliverySettings,
  getFullAdMinimumBudgetAmount,
  buildFullAdBudgetValidationError,
  normalizeFullAdStatus,
  normalizeClientRequestId,
  buildPublishRequestHash,
  isPublishRequestLockExpired,
  isPublishRequestStale,
  hasActivePublishConfirmation,
  getExistingPublishRequest,
  buildStoredPublishResponse,
  sendExistingPublishRequestResponse,
  createPublishRequest,
  updatePublishRequest,
  didFullAdAttemptReachMeta,
  validateFullAdStorefrontPixelReadiness,
  validateFullAdAssetReadiness,
  requiresFullAdPixel,
  validateFullAdCreativePayload,
  getPersistedCreativePayload,
};
