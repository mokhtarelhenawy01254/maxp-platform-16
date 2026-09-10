/**
 * Payload Builders, Settings and Delivery Readiness
 */
const { parseJsonObject, stringifyJson, toMajorCurrencyUnit } = require("./utils");
const { sanitizeFacebookAdAccountForClient, normalizeAdAccountId } = require("./accountHelpers");

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

module.exports = {
  FACEBOOK_ACTIVE_STATUS,
  FACEBOOK_ISSUE_STATUSES,
  buildCampaignMetaSettings,
  buildAdSetMetaSettings,
  buildAdMetaSettings,
  getEntityStatusFromSettings,
  countStatuses,
  buildAdClientPayload,
  buildAdSetClientPayload,
  createDeliveryReason,
  buildCampaignDeliveryReadiness,
  mergeCampaignSettings,
  mergeSettings,
  buildCampaignClientPayload,
  getMetaBudget,
  getMetaCampaignIdFromAdSet,
  getMetaAdSetIdFromAd,
  groupByMetaParentId,
  extractMetaAdCreative,
  sanitizeFacebookPageForClient,
  sortFacebookPageOptions,
};
