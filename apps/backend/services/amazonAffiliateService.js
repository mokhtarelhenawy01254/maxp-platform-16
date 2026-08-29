// Amazon Affiliate (Amazon Associates) service.
// Import Amazon products into a company store, link to the merchant's own Associates tag,
// auto-sync price/stock, and build affiliate (Buy-on-Amazon) URLs with geotargeting.
// Data sources (auto-detect order): Creators API (merchant creds) -> OG meta scrape -> manual.

const { getSharedPrismaClient, executeWithRetry } = require('./sharedDatabase');
const {
  getItems,
  normalizeCreatorsItem,
} = require('./amazonCreatorsApiClient');

const AMAZON_ASIN_REGEX = /^[A-Z0-9]{10}$/;
const ISBN_REGEX = /^(?:\d{9}[\dX]|\d{13})$/;
const DEFAULT_MARKETPLACE = 'www.amazon.com';

// country code (ISO 3166-1 alpha-2) -> Amazon marketplace domain
const MARKETPLACE_BY_COUNTRY = {
  EG: 'amazon.eg',
  SA: 'amazon.sa',
  AE: 'amazon.ae',
  US: 'www.amazon.com',
  CA: 'amazon.ca',
  BR: 'amazon.com.br',
  MX: 'amazon.com.mx',
  GB: 'amazon.co.uk',
  UK: 'amazon.co.uk',
  DE: 'amazon.de',
  FR: 'amazon.fr',
  IT: 'amazon.it',
  ES: 'amazon.es',
  NL: 'amazon.nl',
  BE: 'amazon.com.be',
  PL: 'amazon.pl',
  SE: 'amazon.se',
  TR: 'amazon.com.tr',
  IN: 'amazon.in',
  AU: 'amazon.com.au',
  JP: 'amazon.co.jp',
  SG: 'amazon.sg',
};

const MARKETPLACE_OPTIONS = [
  { code: 'EG', domain: 'amazon.eg', label: 'مصر', labelEn: 'Egypt' },
  { code: 'SA', domain: 'amazon.sa', label: 'السعودية', labelEn: 'Saudi Arabia' },
  { code: 'AE', domain: 'amazon.ae', label: 'الإمارات', labelEn: 'UAE' },
  { code: 'US', domain: 'www.amazon.com', label: 'أمريكا', labelEn: 'USA' },
  { code: 'UK', domain: 'amazon.co.uk', label: 'بريطانيا', labelEn: 'UK' },
  { code: 'DE', domain: 'amazon.de', label: 'ألمانيا', labelEn: 'Germany' },
  { code: 'FR', domain: 'amazon.fr', label: 'فرنسا', labelEn: 'France' },
  { code: 'TR', domain: 'amazon.com.tr', label: 'تركيا', labelEn: 'Turkey' },
  { code: 'IN', domain: 'amazon.in', label: 'الهند', labelEn: 'India' },
];

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

const AMAZON_DOMAINS = new Set(Object.values(MARKETPLACE_BY_COUNTRY));

/** If the input is an Amazon URL, return its marketplace domain (e.g. amazon.eg). */
function resolveMarketplaceFromUrl(input) {
  if (!input || typeof input !== 'string') return null;
  try {
    const u = new URL(input.trim());
    const host = u.hostname.replace(/^www\./, '').toLowerCase();
    if (AMAZON_DOMAINS.has(host)) return host;
  } catch {
    /* not a URL */
  }
  return null;
}

/** Extract an ASIN from a raw ASIN, an Amazon URL, or a product URL. */
function resolveAsinFromUrl(input) {
  if (!input) return null;
  const text = String(input).trim();
  if (!text) return null;
  if (AMAZON_ASIN_REGEX.test(text) || ISBN_REGEX.test(text)) return text;
  const match = text.match(/(?:dp|gp\/product|product|asin|gp\/aw\/d)\/([A-Z0-9]{10})(?:[\/?#]|$)/i);
  if (match) return match[1];
  return null;
}

/** Resolve the Amazon marketplace domain for a visitor country (defaults to US). */
function resolveMarketplaceForCountry(countryCode) {
  if (!countryCode) return DEFAULT_MARKETPLACE;
  const upper = String(countryCode).toUpperCase();
  return MARKETPLACE_BY_COUNTRY[upper] || DEFAULT_MARKETPLACE;
}

// Only allow known Amazon marketplace domains — protects against SSRF where a
// malicious/compromised admin sets marketplace to an internal host the server would fetch.
function normalizeMarketplace(value) {
  if (!value || typeof value !== 'string') return DEFAULT_MARKETPLACE;
  const domain = value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/^www\./, '');
  return AMAZON_DOMAINS.has(domain) ? domain : DEFAULT_MARKETPLACE;
}

/**
 * Build an affiliate (Buy-on-Amazon) URL.
 * If no associateTag is configured, returns the plain product URL.
 */
function buildAffiliateUrl({ asin, associateTag, marketplace, country }) {
  if (!asin) return null;
  const domain = normalizeMarketplace(marketplace || resolveMarketplaceForCountry(country));
  const base = `https://${domain}/dp/${asin}`;
  if (associateTag) {
    return `${base}?tag=${encodeURIComponent(String(associateTag).trim())}`;
  }
  return base;
}

/** Parse og:* meta tags from an Amazon product page HTML (no cheerio dependency). */
function parseOgMeta(html) {
  if (!html) return null;
  const getMeta = (prop) => {
    const re = new RegExp(`<meta[^>]*property=["']${prop}["'][^>]*content=["']([^"']*)["'][^>]*/?>`, 'i');
    const reversed = new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${prop}["'][^>]*/?>`, 'i');
    const m = html.match(re) || html.match(reversed);
    return m ? m[1].trim() : null;
  };
  const title = getMeta('og:title');
  const imageUrl = getMeta('og:image');
  const priceStr = getMeta('og:price:amount');
  const currency = getMeta('og:price:currency') || 'EGP';
  const availability = (getMeta('og:availability') || '').toLowerCase();
  if (!title && !priceStr && !imageUrl) return null;
  const price = priceStr ? Number(priceStr.replace(/[^0-9.,]/g, '').replace(/,/g, '.')) : null;
  const inStock = availability.includes('instock') || availability.includes('in stock') || availability === '';
  return { name: title, price: Number.isFinite(price) ? price : null, currency, imageUrl, inStock, dataSource: 'og' };
}

/** Fetch an Amazon product page and parse og: meta tags (best-effort, never throws). */
async function fetchOgMeta(asin, marketplace) {
  const url = `https://${marketplace || DEFAULT_MARKETPLACE}/dp/${asin}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ar,en;q=0.8',
      },
    });
    if (!res.ok) return null;
    const html = await res.text();
    return parseOgMeta(html);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Fetch product data for an ASIN.
 * Order: Creators API (when merchant creds configured) -> OG meta -> null.
 */
async function fetchAmazonProductData({ asin, marketplace, settings }) {
  const domain = normalizeMarketplace(marketplace || settings?.marketplace || DEFAULT_MARKETPLACE);
  const hasCreatorsCreds = !!(settings?.credentialId && settings?.credentialSecret && settings?.credentialVersion);
  if (hasCreatorsCreds) {
    try {
      const item = await getItems({
        credentialId: settings.credentialId,
        credentialSecret: settings.credentialSecret,
        credentialVersion: settings.credentialVersion,
        partnerTag: settings.associateTag,
        marketplace: domain,
        asins: [asin],
      });
      const normalized = item ? normalizeCreatorsItem(item, domain) : null;
      if (normalized) return normalized;
    } catch {
      // fall through to og meta
    }
  }
  const og = await fetchOgMeta(asin, domain);
  if (og) return og;
  return null;
}

async function getSettings(companyId) {
  const prisma = getSharedPrismaClient();
  return prisma.amazonAffiliateSettings.findUnique({ where: { companyId } });
}

/** Upsert a Product + AmazonAffiliateProduct link from an ASIN. */
async function importProduct({ companyId, input, manualData }) {
  const prisma = getSharedPrismaClient();
  const asin = resolveAsinFromUrl(input);
  if (!asin) return { ok: false, error: 'INVALID_ASIN', input };

  const settings = await getSettings(companyId);
  const marketplace = normalizeMarketplace(resolveMarketplaceFromUrl(input) || settings?.marketplace || DEFAULT_MARKETPLACE);

  let data = null;
  if (manualData && manualData.name) {
    data = {
      name: manualData.name,
      price: manualData.price != null && manualData.price !== '' ? Number(manualData.price) : null,
      currency: manualData.currency || 'EGP',
      imageUrl: manualData.imageUrl || null,
      inStock: manualData.inStock !== false,
      dataSource: 'manual',
    };
  } else {
    // read via module.exports so tests can jest.spyOn the exported fetcher
    data = await module.exports.fetchAmazonProductData({ asin, marketplace, settings });
  }
  if (!data) {
    data = {
      name: `Amazon ${asin}`,
      price: null,
      currency: 'EGP',
      imageUrl: null,
      inStock: true,
      dataSource: 'manual',
    };
  }

  const sku = `AMZN-${asin}`;
  let product = await prisma.product.findFirst({ where: { companyId, externalId: asin } });
  if (product) {
    product = await prisma.product.update({
      where: { id: product.id },
      data: {
        name: data.name,
        price: data.price ?? product.price,
        mainImage: data.imageUrl || product.mainImage,
        images: data.imageUrl ? JSON.stringify([data.imageUrl]) : product.images,
        stock: data.inStock ? 1 : 0,
        source: 'amazon',
        updatedAt: new Date(),
      },
    });
  } else {
    product = await prisma.product.create({
      data: {
        companyId,
        name: data.name,
        sku,
        price: data.price ?? 0,
        comparePrice: null,
        mainImage: data.imageUrl,
        images: data.imageUrl ? JSON.stringify([data.imageUrl]) : null,
        stock: data.inStock ? 1 : 0,
        trackInventory: false,
        source: 'amazon',
        externalId: asin,
        isActive: true,
      },
    });
  }

  const amazonUrl = buildAffiliateUrl({ asin, associateTag: settings?.associateTag, marketplace });
  const linkData = {
    productId: product.id,
    amazonUrl,
    marketplace,
    lastPrice: data.price,
    lastPriceCurrency: data.currency || 'EGP',
    inStock: data.inStock,
    lastSyncAt: new Date(),
    status: 'SYNCED',
    syncError: null,
  };
  await prisma.amazonAffiliateProduct.upsert({
    where: { companyId_asin: { companyId, asin } },
    update: linkData,
    create: { companyId, asin, ...linkData },
  });

  return { ok: true, product, asin, data };
}

/** Bulk import from an array of URLs/ASINs (creates an AmazonImportJob). */
async function importMany({ companyId, inputs }) {
  const prisma = getSharedPrismaClient();
  const cleanInputs = (inputs || []).map((i) => String(i).trim()).filter(Boolean);
  if (cleanInputs.length === 0) return { ok: false, error: 'EMPTY_INPUT' };

  const job = await prisma.amazonImportJob.create({
    data: { companyId, type: 'manual', status: 'RUNNING', total: cleanInputs.length, asins: JSON.stringify(cleanInputs) },
  });

  let succeeded = 0;
  const errors = [];
  for (const input of cleanInputs) {
    try {
      const result = await importProduct({ companyId, input });
      if (result.ok) succeeded += 1;
      else errors.push(`${input}: ${result.error}`);
    } catch (error) {
      errors.push(`${input}: ${error.message}`);
    }
  }
  const failed = cleanInputs.length - succeeded;
  const status = failed === 0 ? 'SUCCESS' : succeeded > 0 ? 'PARTIAL' : 'FAILED';
  await prisma.amazonImportJob.update({
    where: { id: job.id },
    data: { status, succeeded, failed, error: errors.join(' | ') || null, completedAt: new Date() },
  });
  return { ok: true, jobId: job.id, succeeded, failed, status, errors };
}

/** List imported products (link + product snapshot). */
async function listProducts(companyId) {
  const prisma = getSharedPrismaClient();
  const links = await prisma.amazonAffiliateProduct.findMany({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
  });
  const productIds = links.map((l) => l.productId);
  const products = productIds.length > 0
    ? await prisma.product.findMany({ where: { id: { in: productIds } } })
    : [];
  const productMap = new Map(products.map((p) => [p.id, p]));
  return links.map((link) => ({
    id: link.id,
    productId: link.productId,
    asin: link.asin,
    amazonUrl: link.amazonUrl,
    marketplace: link.marketplace,
    lastPrice: link.lastPrice !== null ? Number(link.lastPrice) : null,
    lastPriceCurrency: link.lastPriceCurrency,
    inStock: link.inStock,
    lastSyncAt: link.lastSyncAt,
    status: link.status,
    syncError: link.syncError,
    createdAt: link.createdAt,
    product: productMap.get(link.productId) || null,
  }));
}

/** Re-sync price/stock for all imported products of a company. */
async function syncProducts(companyId) {
  const prisma = getSharedPrismaClient();
  const settings = await getSettings(companyId);
  const links = await prisma.amazonAffiliateProduct.findMany({ where: { companyId } });
  const job = await prisma.amazonImportJob.create({
    data: { companyId, type: 'sync', status: 'RUNNING', total: links.length },
  });

  let succeeded = 0;
  const errors = [];
  for (const link of links) {
    try {
      // read via module.exports so tests can jest.spyOn the exported fetcher
      const data = await module.exports.fetchAmazonProductData({ asin: link.asin, marketplace: link.marketplace, settings });
      if (data) {
        await prisma.amazonAffiliateProduct.update({
          where: { id: link.id },
          data: {
            lastPrice: data.price,
            lastPriceCurrency: data.currency || link.lastPriceCurrency,
            inStock: data.inStock,
            lastSyncAt: new Date(),
            status: 'SYNCED',
            syncError: null,
          },
        });
        if (data.price !== null) {
          await prisma.product.update({
            where: { id: link.productId },
            data: { price: data.price, stock: data.inStock ? 1 : 0, updatedAt: new Date() },
          });
        }
        succeeded += 1;
      } else {
        await prisma.amazonAffiliateProduct.update({
          where: { id: link.id },
          data: { status: 'ERROR', syncError: 'NO_DATA' },
        });
        errors.push(`${link.asin}: NO_DATA`);
      }
    } catch (error) {
      errors.push(`${link.asin}: ${error.message}`);
      await prisma.amazonAffiliateProduct.update({
        where: { id: link.id },
        data: { status: 'ERROR', syncError: error.message },
      }).catch(() => {});
    }
  }

  const failed = links.length - succeeded;
  const status = failed === 0 ? 'SUCCESS' : succeeded > 0 ? 'PARTIAL' : 'FAILED';
  await prisma.amazonImportJob.update({
    where: { id: job.id },
    data: { status, succeeded, failed, error: errors.join(' | ') || null, completedAt: new Date() },
  });
  return { jobId: job.id, succeeded, failed, status, errors };
}

/** Delete an imported product: removes the link + soft-deletes the Product. */
async function deleteProduct(companyId, id) {
  const prisma = getSharedPrismaClient();
  const link = await prisma.amazonAffiliateProduct.findFirst({ where: { id, companyId } });
  if (!link) return { ok: false, error: 'NOT_FOUND' };
  await prisma.amazonAffiliateProduct.delete({ where: { id: link.id } });
  await prisma.product
    .update({ where: { id: link.productId }, data: { deletedAt: new Date() } })
    .catch(() => {});
  return { ok: true };
}

module.exports = {
  AMAZON_ASIN_REGEX,
  ISBN_REGEX,
  DEFAULT_MARKETPLACE,
  MARKETPLACE_BY_COUNTRY,
  MARKETPLACE_OPTIONS,
  resolveAsinFromUrl,
  resolveMarketplaceFromUrl,
  resolveMarketplaceForCountry,
  normalizeMarketplace,
  buildAffiliateUrl,
  parseOgMeta,
  fetchOgMeta,
  fetchAmazonProductData,
  getSettings,
  importProduct,
  importMany,
  listProducts,
  syncProducts,
  deleteProduct,
};