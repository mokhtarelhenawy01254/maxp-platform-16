const { safeJsonParse } = require('../utils/jsonUtils');

function normalizeAttributionText(value, maxLength = 320) {
  if (value === undefined || value === null) return null;

  const normalized = String(value).trim().replace(/\s+/g, ' ');
  if (!normalized) return null;

  return normalized.slice(0, maxLength);
}

function sanitizeAttributionRawParams(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const entries = Object.entries(value)
    .slice(0, 24)
    .map(([key, rawValue]) => {
      const normalizedKey = normalizeAttributionText(key, 80)?.toLowerCase();
      const normalizedValue = normalizeAttributionText(rawValue, 320);
      return normalizedKey && normalizedValue ? [normalizedKey, normalizedValue] : null;
    })
    .filter(Boolean);

  return entries.length > 0 ? Object.fromEntries(entries) : null;
}

function sanitizeLandingPageAttribution(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const sanitized = {
    source: normalizeAttributionText(value.source, 120),
    landingPageId: normalizeAttributionText(value.landingPageId, 160),
    landingPageSlug: normalizeAttributionText(value.landingPageSlug, 160),
    generationMode: normalizeAttributionText(value.generationMode, 80),
    productId: normalizeAttributionText(value.productId, 160),
  };

  return Object.entries(sanitized).reduce((acc, [key, rawValue]) => {
    if (rawValue !== null && rawValue !== undefined) {
      acc[key] = rawValue;
    }
    return acc;
  }, {});
}

function inferAttributionPlatform(source, referrer, clickIds = {}) {
  const haystack = [
    source,
    referrer,
    clickIds.fbclid ? 'facebook' : '',
    clickIds.fbc ? 'facebook' : '',
    clickIds.fbp ? 'facebook' : '',
    clickIds.gclid ? 'google' : '',
    clickIds.ttclid ? 'tiktok' : '',
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (haystack.includes('instagram')) return 'instagram';
  if (
    haystack.includes('facebook') ||
    haystack.includes('meta') ||
    haystack.includes('l.facebook.com')
  ) {
    return 'facebook';
  }
  if (haystack.includes('google')) return 'google';
  if (haystack.includes('tiktok')) return 'tiktok';
  if (haystack.includes('youtube')) return 'youtube';

  return null;
}

const AUDIENCE_NETWORK_SOURCE_VALUES = new Set([
  'audience_network',
  'audience-network',
  'audience network',
  'audience',
  'an',
]);

function isAudienceNetworkReferrer(referrer) {
  if (!referrer) return false;
  try {
    const host = new URL(referrer).hostname.replace(/^www\./i, '').toLowerCase();
    return (
      host.includes('an.facebook') ||
      host === 'audience.network' ||
      host.includes('audience')
    );
  } catch (_) {
    return false;
  }
}

function isAudienceNetworkSignal({ source, medium, referrer }) {
  const s = normalizeAttributionText(source, 120)?.toLowerCase();
  const m = normalizeAttributionText(medium, 120)?.toLowerCase();
  if (s && AUDIENCE_NETWORK_SOURCE_VALUES.has(s)) return true;
  if (m && AUDIENCE_NETWORK_SOURCE_VALUES.has(m)) return true;
  return isAudienceNetworkReferrer(referrer);
}

function sanitizeOrderAttribution(rawAttribution, fallbacks = {}) {
  const attribution =
    typeof rawAttribution === 'string'
      ? safeJsonParse(rawAttribution, null)
      : rawAttribution;

  if (!attribution || typeof attribution !== 'object' || Array.isArray(attribution)) {
    return null;
  }

  const rawParams = sanitizeAttributionRawParams(attribution.rawParams);
  const landingPage =
    sanitizeLandingPageAttribution(attribution.landingPage) ||
    sanitizeLandingPageAttribution({
      source: attribution.landingPageSource,
      landingPageId: attribution.landingPageId,
      landingPageSlug: attribution.landingPageSlug,
      generationMode: attribution.generationMode,
      productId: attribution.productId,
    });
  const referrer = normalizeAttributionText(attribution.referrer, 1024);
  const clickIds = {
    fbclid: normalizeAttributionText(attribution.fbclid, 255),
    gclid: normalizeAttributionText(attribution.gclid, 255),
    ttclid: normalizeAttributionText(attribution.ttclid, 255),
    fbc: normalizeAttributionText(attribution.fbc || fallbacks.fbc, 255),
    fbp: normalizeAttributionText(attribution.fbp || fallbacks.fbp, 255),
  };
  const platform =
    normalizeAttributionText(attribution.platform, 80)?.toLowerCase() ||
    inferAttributionPlatform(attribution.source, referrer, clickIds);

  let source = normalizeAttributionText(attribution.source || attribution.utm_source, 120)?.toLowerCase();
  if (!source) {
    if (platform) {
      source = platform;
    } else if (referrer) {
      try {
        source = new URL(referrer).hostname.replace(/^www\./i, '').slice(0, 120);
      } catch (_) {
        source = null;
      }
    }
  }

  if (!source) {
    source = 'direct';
  }

  let medium = normalizeAttributionText(attribution.medium || attribution.utm_medium, 120)?.toLowerCase();
  if (!medium) {
    if (source === 'direct') {
      medium = 'none';
    } else if (clickIds.gclid) {
      medium = 'cpc';
    } else if (platform && ['facebook', 'instagram', 'tiktok'].includes(platform)) {
      medium = 'paid_social';
    } else if (referrer) {
      medium = 'referral';
    }
  }

  // ╪¬┘à┘è┘è╪▓ ╪┤╪¿┘â╪⌐ ╪º┘ä╪¼┘à┘ç┘ê╪▒ (Meta Audience Network) ┘â┘à╪╡╪»╪▒ ┘à╪│╪¬┘é┘ä ╪╢┘à┘å ┘à┘å╪╡╪⌐ ╪º┘ä┘ü┘è╪│╪¿┘ê┘â
  if (source !== 'direct' && isAudienceNetworkSignal({ source, medium, referrer })) {
    source = 'audience_network';
  }

  const sanitized = {
    platform,
    source,
    medium,
    campaignName: normalizeAttributionText(
      attribution.campaignName || attribution.campaign || attribution.utm_campaign,
      160,
    ),
    campaignId: normalizeAttributionText(
      attribution.campaignId ||
        attribution.campaign_id ||
        attribution.utm_id,
      160,
    ),
    adSetId: normalizeAttributionText(
      attribution.adSetId ||
        attribution.adset_id ||
        attribution.ad_set_id,
      160,
    ),
    adId: normalizeAttributionText(
      attribution.adId ||
        attribution.ad_id,
      160,
    ),
    content: normalizeAttributionText(
      attribution.content || attribution.utm_content,
      160,
    ),
    term: normalizeAttributionText(
      attribution.term || attribution.utm_term,
      160,
    ),
    landingPath: normalizeAttributionText(attribution.landingPath, 1024),
    referrer,
    fbclid: clickIds.fbclid,
    gclid: clickIds.gclid,
    ttclid: clickIds.ttclid,
    fbc: clickIds.fbc,
    fbp: clickIds.fbp,
    capturedAt:
      normalizeAttributionText(attribution.capturedAt, 80) || new Date().toISOString(),
    rawParams,
    landingPage:
      landingPage && Object.keys(landingPage).length > 0 ? landingPage : null,
  };

  return Object.entries(sanitized).reduce((acc, [key, value]) => {
    if (
      value !== null &&
      value !== undefined &&
      (!(typeof value === 'object' && !Array.isArray(value)) || Object.keys(value).length > 0)
    ) {
      acc[key] = value;
    }
    return acc;
  }, {});
}

// ╪º╪│╪¬╪«╪▒╪º╪¼ attribution ┘à┘å checkoutData ╪º┘ä╪«╪º╪╡ ╪¿╪│┘ä╪⌐ ╪║┘è╪▒ ┘à┘â╪¬┘à┘ä╪⌐ (┘å╪╡ ╪ú┘ê ┘â╪º╪ª┘å)
function extractAttributionFromCheckoutData(checkoutData) {
  if (!checkoutData) return null;

  let data = checkoutData;
  if (typeof checkoutData === 'string') {
    try {
      data = safeJsonParse(checkoutData, {});
    } catch (_) {
      return null;
    }
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return null;
  }

  const attribution =
    data.attribution ||
    data.campaignAttribution ||
    data.orderAttribution ||
    null;

  return sanitizeOrderAttribution(attribution);
}

module.exports = {
  normalizeAttributionText,
  sanitizeAttributionRawParams,
  sanitizeLandingPageAttribution,
  inferAttributionPlatform,
  sanitizeOrderAttribution,
  extractAttributionFromCheckoutData,
  isAudienceNetworkSignal,
  isAudienceNetworkReferrer,
};
