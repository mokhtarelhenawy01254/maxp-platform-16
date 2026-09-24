const STOREFRONT_ATTRIBUTION_STORAGE_KEY = 'storefront_order_attribution_v1';

const MARKETING_PARAM_KEYS = new Set([
  'ad_id',
  'ad_set_id',
  'adid',
  'adset_id',
  'adsetid',
  'campaign_id',
  'campaignid',
  'fbc',
  'fbclid',
  'fbp',
  'gclid',
  'mc_cid',
  'mc_eid',
  'ttclid',
]);

export interface StorefrontOrderAttributionSnapshot {
  platform?: string;
  source: string;
  medium?: string;
  campaignName?: string;
  campaignId?: string;
  adSetId?: string;
  adId?: string;
  content?: string;
  term?: string;
  landingPath?: string;
  referrer?: string;
  fbclid?: string;
  gclid?: string;
  ttclid?: string;
  fbc?: string;
  fbp?: string;
  capturedAt: string;
  rawParams?: Record<string, string>;
}

const normalizeText = (value: unknown, maxLength = 320): string | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  const normalized = String(value).trim().replace(/\s+/g, ' ');
  if (!normalized) {
    return undefined;
  }

  return normalized.slice(0, maxLength);
};

const normalizeToken = (value: unknown, maxLength = 120): string | undefined =>
  normalizeText(value, maxLength)?.toLowerCase();

const readCookieValue = (key: string): string | undefined => {
  if (typeof document === 'undefined') {
    return undefined;
  }

  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${escapedKey}=([^;]*)`));
  return match?.[1] ? decodeURIComponent(match[1]) : undefined;
};

const getReferrerHost = (referrer?: string): string | undefined => {
  if (!referrer) {
    return undefined;
  }

  try {
    return new URL(referrer).hostname.replace(/^www\./i, '') || undefined;
  } catch {
    return undefined;
  }
};

const inferPlatform = (input: {
  source?: string;
  referrer?: string;
  fbclid?: string;
  gclid?: string;
  ttclid?: string;
  fbc?: string;
  fbp?: string;
  igshid?: string;
}): string | undefined => {
  const haystack = [
    input.source,
    input.referrer,
    input.fbclid ? 'facebook' : '',
    input.fbc ? 'facebook' : '',
    input.fbp ? 'facebook' : '',
    input.gclid ? 'google' : '',
    input.ttclid ? 'tiktok' : '',
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  // Instagram-specific signals take priority
  if (
    haystack.includes('instagram') ||
    haystack.includes('igshid') ||
    input.igshid ||
    input.source?.toLowerCase() === 'instagram'
  ) {
    return 'instagram';
  }

  if (
    haystack.includes('facebook') ||
    haystack.includes('meta') ||
    haystack.includes('l.facebook.com')
  ) {
    return 'facebook';
  }

  if (haystack.includes('google')) {
    return 'google';
  }

  if (haystack.includes('tiktok')) {
    return 'tiktok';
  }

  if (haystack.includes('youtube')) {
    return 'youtube';
  }

  return undefined;
};

const inferSource = (platform?: string, referrer?: string): string => {
  if (platform) {
    return platform;
  }

  const host = getReferrerHost(referrer);
  if (host) {
    return host;
  }

  return 'direct';
};

const inferMedium = (input: {
  source?: string;
  platform?: string;
  referrer?: string;
  gclid?: string;
}): string => {
  if (input.source === 'direct') {
    return 'none';
  }

  if (input.gclid) {
    return 'cpc';
  }

  if (input.platform && ['facebook', 'instagram', 'tiktok'].includes(input.platform)) {
    return 'paid_social';
  }

  if (input.referrer) {
    return 'referral';
  }

  return 'unknown';
};

const AUDIENCE_NETWORK_SOURCE_VALUES = new Set([
  'audience_network',
  'audience-network',
  'audience network',
  'audience',
  'an',
]);

const isAudienceNetworkReferrer = (referrer?: string): boolean => {
  if (!referrer) return false;
  try {
    const host = new URL(referrer).hostname.replace(/^www\./i, '').toLowerCase();
    return (
      host.includes('an.facebook') ||
      host === 'audience.network' ||
      host.includes('audience')
    );
  } catch {
    return false;
  }
};

const isAudienceNetworkSignal = (input: {
  source?: string;
  medium?: string;
  referrer?: string;
}): boolean => {
  const source = normalizeToken(input.source, 120);
  const medium = normalizeToken(input.medium, 120);
  if (source && AUDIENCE_NETWORK_SOURCE_VALUES.has(source)) return true;
  if (medium && AUDIENCE_NETWORK_SOURCE_VALUES.has(medium)) return true;
  return isAudienceNetworkReferrer(input.referrer);
};

const extractMarketingParams = (searchParams: URLSearchParams): Record<string, string> => {
  const params: Record<string, string> = {};

  searchParams.forEach((value, key) => {
    const normalizedKey = normalizeToken(key, 80);
    const normalizedValue = normalizeText(value);

    if (!normalizedKey || !normalizedValue) {
      return;
    }

    if (
      normalizedKey.startsWith('utm_') ||
      normalizedKey.endsWith('clid') ||
      MARKETING_PARAM_KEYS.has(normalizedKey)
    ) {
      params[normalizedKey] = normalizedValue;
    }
  });

  return params;
};

const sanitizeRawParams = (
  rawParams?: Record<string, string>,
): Record<string, string> | undefined => {
  if (!rawParams || typeof rawParams !== 'object') {
    return undefined;
  }

  const sanitizedEntries = Object.entries(rawParams)
    .slice(0, 24)
    .map(([key, value]) => {
      const normalizedKey = normalizeToken(key, 80);
      const normalizedValue = normalizeText(value);
      return normalizedKey && normalizedValue ? [normalizedKey, normalizedValue] : null;
    })
    .filter((entry): entry is [string, string] => Boolean(entry));

  return sanitizedEntries.length > 0 ? Object.fromEntries(sanitizedEntries) : undefined;
};

const buildSnapshot = (
  snapshot: Partial<StorefrontOrderAttributionSnapshot>,
): StorefrontOrderAttributionSnapshot | null => {
  const source = normalizeToken(snapshot.source, 120);
  const capturedAt = normalizeText(snapshot.capturedAt, 80) || new Date().toISOString();

  if (!source) {
    return null;
  }

  const payload: StorefrontOrderAttributionSnapshot = {
    source,
    capturedAt,
  };

  const optionalFields: Array<[keyof StorefrontOrderAttributionSnapshot, unknown, number?]> = [
    ['platform', snapshot.platform, 80],
    ['medium', snapshot.medium, 120],
    ['campaignName', snapshot.campaignName, 160],
    ['campaignId', snapshot.campaignId, 160],
    ['adSetId', snapshot.adSetId, 160],
    ['adId', snapshot.adId, 160],
    ['content', snapshot.content, 160],
    ['term', snapshot.term, 160],
    ['landingPath', snapshot.landingPath, 1024],
    ['referrer', snapshot.referrer, 1024],
    ['fbclid', snapshot.fbclid, 255],
    ['gclid', snapshot.gclid, 255],
    ['ttclid', snapshot.ttclid, 255],
    ['fbc', snapshot.fbc, 255],
    ['fbp', snapshot.fbp, 255],
  ];

  optionalFields.forEach(([key, value, maxLength]) => {
    const normalized =
      key === 'platform' || key === 'medium'
        ? normalizeToken(value, maxLength)
        : normalizeText(value, maxLength);

    if (normalized) {
      payload[key] = normalized as never;
    }
  });

  const rawParams = sanitizeRawParams(snapshot.rawParams);
  if (rawParams) {
    payload.rawParams = rawParams;
  }

  return payload;
};

export const resolveStorefrontAttributionKey = (companyId?: string | null): string => {
  const normalized = companyId?.trim();
  return normalized
    ? `${STOREFRONT_ATTRIBUTION_STORAGE_KEY}:${normalized}`
    : STOREFRONT_ATTRIBUTION_STORAGE_KEY;
};

export const getStoredStorefrontAttribution = (
  companyId?: string | null,
): StorefrontOrderAttributionSnapshot | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const primaryKey = resolveStorefrontAttributionKey(companyId);

  try {
    let raw = window.sessionStorage.getItem(primaryKey);
    if (!raw && !companyId) {
      raw = window.sessionStorage.getItem(STOREFRONT_ATTRIBUTION_STORAGE_KEY);
    }
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<StorefrontOrderAttributionSnapshot>;
    return buildSnapshot(parsed);
  } catch {
    window.sessionStorage.removeItem(primaryKey);
    return null;
  }
};

export const clearStoredStorefrontAttribution = (companyId?: string | null) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const key = resolveStorefrontAttributionKey(companyId);
    window.sessionStorage.removeItem(key);
    if (!companyId) {
      window.sessionStorage.removeItem(STOREFRONT_ATTRIBUTION_STORAGE_KEY);
    }
  } catch {
    // Ignore storage clearance failures in restricted browser environments
  }
};

export const captureStorefrontAttribution = (
  companyId?: string | null,
): StorefrontOrderAttributionSnapshot | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const existing = getStoredStorefrontAttribution(companyId);
  const searchParams = new URLSearchParams(window.location.search);
  const currentMarketingParams = extractMarketingParams(searchParams);
  const hasFreshMarketingParams = Object.keys(currentMarketingParams).length > 0;
  const rawParams = {
    ...(existing?.rawParams || {}),
    ...currentMarketingParams,
  };

  const referrer = normalizeText(existing?.referrer || document.referrer, 1024);
  const fbclid = normalizeText(currentMarketingParams.fbclid || existing?.fbclid, 255);
  const gclid = normalizeText(currentMarketingParams.gclid || existing?.gclid, 255);
  const ttclid = normalizeText(currentMarketingParams.ttclid || existing?.ttclid, 255);
  const fbc = normalizeText(currentMarketingParams.fbc || existing?.fbc || readCookieValue('_fbc'), 255);
  const fbp = normalizeText(currentMarketingParams.fbp || existing?.fbp || readCookieValue('_fbp'), 255);
  const platform =
    normalizeToken(currentMarketingParams.platform || existing?.platform, 80) ||
    inferPlatform({
      source: currentMarketingParams.utm_source || existing?.source,
      referrer,
      fbclid,
      gclid,
      ttclid,
      fbc,
      fbp,
    });
  const rawSource =
    normalizeToken(currentMarketingParams.utm_source || existing?.source, 120) ||
    inferSource(platform, referrer);
  const medium =
    normalizeToken(currentMarketingParams.utm_medium || existing?.medium, 120) ||
    inferMedium({
      source: rawSource,
      platform,
      referrer,
      gclid,
    });
  const source =
    isAudienceNetworkSignal({ source: rawSource, medium, referrer }) &&
    rawSource !== 'direct'
      ? 'audience_network'
      : rawSource;
  const snapshot = buildSnapshot({
    platform,
    source,
    medium,
    campaignName: currentMarketingParams.utm_campaign || existing?.campaignName,
    campaignId:
      currentMarketingParams.utm_id ||
      currentMarketingParams.campaign_id ||
      currentMarketingParams.campaignid ||
      existing?.campaignId,
    adSetId:
      currentMarketingParams.adset_id ||
      currentMarketingParams.ad_set_id ||
      currentMarketingParams.adsetid ||
      existing?.adSetId,
    adId:
      currentMarketingParams.ad_id ||
      currentMarketingParams.adid ||
      existing?.adId,
    content: currentMarketingParams.utm_content || existing?.content,
    term: currentMarketingParams.utm_term || existing?.term,
    landingPath:
      (hasFreshMarketingParams
        ? `${window.location.pathname}${window.location.search}`
        : existing?.landingPath) || `${window.location.pathname}${window.location.search}`,
    referrer,
    fbclid,
    gclid,
    ttclid,
    fbc,
    fbp,
    capturedAt:
      (hasFreshMarketingParams ? new Date().toISOString() : existing?.capturedAt) ||
      new Date().toISOString(),
    rawParams,
  });

  if (!snapshot) {
    return null;
  }

  const storageKey = resolveStorefrontAttributionKey(companyId);
  window.sessionStorage.setItem(
    storageKey,
    JSON.stringify(snapshot),
  );
  if (!companyId) {
    window.sessionStorage.setItem(
      STOREFRONT_ATTRIBUTION_STORAGE_KEY,
      JSON.stringify(snapshot),
    );
  }

  return snapshot;
};

export const getOrderAttributionPayload = (
  companyId?: string | null,
): StorefrontOrderAttributionSnapshot | null =>
  getStoredStorefrontAttribution(companyId) || captureStorefrontAttribution(companyId);
