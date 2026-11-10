/**
 * English names for the public storefront API (?lang=en).
 *
 * The catalogue stores one `name` per row (Arabic today) plus an optional `nameEn`. Rather than
 * touching every handler's Prisma `select` in a 2.4k-line router, this middleware rewrites the
 * outgoing payload: any object whose `id` has an English name gets `name` swapped. The lookup is one
 * raw query per company, cached for five minutes, so a page of 24 products costs one query at most.
 *
 * Arabic requests never enter this path, so existing responses and Redis cache keys stay untouched.
 */
const { getSharedPrismaClientAsync } = require('../services/sharedDatabase');

const CACHE_TTL_MS = 5 * 60 * 1000;
const nameCache = new Map();

async function loadEnglishNames(companyId) {
  if (!companyId) {
    return new Map();
  }

  const cached = nameCache.get(companyId);
  if (cached && Date.now() - cached.loadedAt < CACHE_TTL_MS) {
    return cached.names;
  }

  const prisma = await getSharedPrismaClientAsync();
  const names = new Map();

  const [products, categories] = await Promise.all([
    prisma.$queryRawUnsafe(
      'SELECT id, "nameEn" FROM products WHERE "companyId" = $1 AND "nameEn" IS NOT NULL AND "nameEn" <> \'\'',
      companyId,
    ),
    prisma.$queryRawUnsafe(
      'SELECT id, "nameEn" FROM categories WHERE "companyId" = $1 AND "nameEn" IS NOT NULL AND "nameEn" <> \'\'',
      companyId,
    ),
  ]);

  [...products, ...categories].forEach((row) => {
    if (row && row.id && row.nameEn) {
      names.set(row.id, row.nameEn);
    }
  });

  nameCache.set(companyId, { loadedAt: Date.now(), names });
  return names;
}

const withEnglishName = (item, names) =>
  item && item.id && names.has(item.id) ? { ...item, name: names.get(item.id) } : item;

function localizePublicResponse(req, res, next) {
  const lang = String(req.query.lang || '').trim().toLowerCase();
  if (lang !== 'en') {
    return next();
  }

  const originalJson = res.json.bind(res);
  res.json = (payload) => {
    if (!payload || typeof payload !== 'object') {
      return originalJson(payload);
    }

    const data = payload.data;
    const isList = Array.isArray(data);
    const isSingle = data && typeof data === 'object' && !Array.isArray(data);
    if (!isList && !isSingle) {
      return originalJson(payload);
    }

    loadEnglishNames(req.companyId)
      .then((names) => {
        if (!names.size) {
          return originalJson(payload);
        }
        const nextPayload = isList
          ? { ...payload, data: data.map((item) => withEnglishName(item, names)) }
          : { ...payload, data: withEnglishName(data, names) };
        return originalJson(nextPayload);
      })
      .catch((error) => {
        console.warn('[storefront-i18n] english name lookup failed:', error?.message || error);
        return originalJson(payload);
      });

    return res;
  };

  return next();
}

module.exports = { localizePublicResponse, loadEnglishNames };
