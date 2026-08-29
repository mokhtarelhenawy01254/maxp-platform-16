// Lightweight Amazon Creators API client (official successor to the retired PA-API 5.0).
// OAuth 2.0 client-credentials flow with an in-process token cache + getItems/searchItems.
// See: https://affiliate-program.amazon.com/creatorsapi/docs/en-us/migrating-to-creatorsapi-from-paapi
//
// NOTE: PA-API 5.0 was switched off on 2026-05-15. This client targets the Creators API host
// (creatorsapi.amazon) only. Without real credentials the fetch functions resolve to null —
// callers fall back to OG meta / manual entry.

const CREATORS_BASE = 'https://creatorsapi.amazon';
const CREATORS_CATALOG = `${CREATORS_BASE}/catalog/v1`;
const TOKEN_ENDPOINT = 'https://api.amazon.com/auth/o2/token';
const TOKEN_SCOPE = 'creatorsapi/default';
const TOKEN_TTL_BUFFER_MS = 60 * 1000; // refresh 60s before expiry
const REQUEST_TIMEOUT_MS = 10000;

const DEFAULT_RESOURCES = [
  'images.primary.large',
  'itemInfo.title',
  'offersV2.listings.price',
  'offersV2.listings.availability',
];

// in-process token cache: key = credentialId -> { accessToken, expiresAt }
const tokenCache = new Map();

function buildTokenCacheKey({ credentialId, credentialVersion }) {
  return `${credentialVersion || 'v3'}:${credentialId || ''}`;
}

async function fetchAccessToken({ credentialId, credentialSecret, credentialVersion }) {
  if (!credentialId || !credentialSecret) return null;

  const cacheKey = buildTokenCacheKey({ credentialId, credentialVersion });
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() + TOKEN_TTL_BUFFER_MS) {
    return cached.accessToken;
  }

  const form = new URLSearchParams({
    grant_type: 'client_credentials',
    scope: TOKEN_SCOPE,
    client_id: credentialId,
    client_secret: credentialSecret,
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let body;
  try {
    const res = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    body = await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }

  if (!body || !body.access_token) return null;
  const expiresIn = Number(body.expires_in || 3600);
  tokenCache.set(cacheKey, {
    accessToken: body.access_token,
    expiresAt: Date.now() + expiresIn * 1000,
  });
  return body.access_token;
}

async function creatorsRequest({ path, accessToken, marketplace, payload }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${CREATORS_CATALOG}${path}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'x-marketplace': marketplace,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * getItems — look up up to 10 products by ASIN.
 * Returns the first item's normalized shape or null.
 */
async function getItems({ credentialId, credentialSecret, credentialVersion, partnerTag, marketplace, asins }) {
  const accessToken = await fetchAccessToken({ credentialId, credentialSecret, credentialVersion });
  if (!accessToken) return null;
  const data = await creatorsRequest({
    path: '/getItems',
    accessToken,
    marketplace,
    payload: {
      partnerTag,
      itemIds: asins,
      resources: DEFAULT_RESOURCES,
    },
  });
  if (!data || !Array.isArray(data.items) || data.items.length === 0) return null;
  return data.items[0];
}

/**
 * searchItems — search by keyword. Returns first page items array or [].
 */
async function searchItems({ credentialId, credentialSecret, credentialVersion, partnerTag, marketplace, keywords, itemCount = 10 }) {
  const accessToken = await fetchAccessToken({ credentialId, credentialSecret, credentialVersion });
  if (!accessToken) return [];
  const data = await creatorsRequest({
    path: '/searchItems',
    accessToken,
    marketplace,
    payload: {
      partnerTag,
      keywords,
      itemCount,
      resources: DEFAULT_RESOURCES,
    },
  });
  return data && Array.isArray(data.searchResult?.items) ? data.searchResult.items : [];
}

/**
 * Normalize a Creators API item into our generic product shape.
 */
function normalizeCreatorsItem(item, marketplace) {
  if (!item || !item.asin) return null;
  const title = item.itemInfo?.title?.displayValue;
  const imageUrl = item.images?.primary?.large?.url || item.images?.primary?.medium?.url || null;
  const listing = item.offersV2?.listings && item.offersV2.listings[0];
  const price = listing?.price?.amount != null ? Number(listing.price.amount) : null;
  const currency = listing?.price?.currency || 'EGP';
  const availability = String(listing?.availability?.type || '').toLowerCase();
  const inStock = availability.includes('now') || availability.includes('avail');
  return {
    asin: item.asin,
    name: title || null,
    price,
    currency,
    imageUrl,
    inStock,
    dataSource: 'creators',
    marketplace,
  };
}

module.exports = {
  CREATORS_BASE,
  CREATORS_CATALOG,
  TOKEN_ENDPOINT,
  DEFAULT_RESOURCES,
  fetchAccessToken,
  getItems,
  searchItems,
  normalizeCreatorsItem,
  _tokenCache: tokenCache,
};