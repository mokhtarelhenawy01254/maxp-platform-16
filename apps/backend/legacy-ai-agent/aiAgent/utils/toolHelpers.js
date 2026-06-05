/**
 * @module toolHelpers
 * @description Shared pure utility and DB helper functions for AI Agent tools.
 */

const path = require('path');
const { getSharedPrismaClient } = require(path.resolve(__dirname, '../../../services/sharedDatabase'));

function periodToRange(period = 'today') {
  const now = new Date();
  const startOf = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
  switch (period) {
    case 'today':
      return { gte: startOf(now) };
    case 'yesterday': {
      const y = new Date(now); y.setDate(y.getDate() - 1);
      return { gte: startOf(y), lt: startOf(now) };
    }
    case 'week': {
      const w = new Date(now); w.setDate(w.getDate() - 7);
      return { gte: startOf(w) };
    }
    case 'month': {
      const m = new Date(now); m.setDate(m.getDate() - 30);
      return { gte: startOf(m) };
    }
    default:
      return {};
  }
}

function formatCurrency(amount, currency = 'EGP') {
  const value = Number(amount || 0);
  return {
    amount: Number.isFinite(value) ? value : 0,
    currency,
  };
}

function normalizeOptionalString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeStringList(value) {
  if (Array.isArray(value)) {
    return value.map(item => normalizeOptionalString(item)).filter(Boolean);
  }
  if (typeof value !== 'string') return [];
  return value
    .split(/[,\u060C\n]/)
    .map(item => normalizeOptionalString(item))
    .filter(Boolean);
}

function publicBaseUrl() {
  const rawBase = process.env.BACKEND_URL
    || process.env.PUBLIC_BACKEND_URL
    || process.env.PUBLIC_API_BASE_URL
    || process.env.FRONTEND_URL
    || process.env.CLIENT_URL
    || 'https://maxp.online';
  return String(rawBase || '')
    .replace(/\/api\/v1\/?$/i, '')
    .replace(/\/+$/g, '');
}

function toPublicUrl(value) {
  const text = normalizeOptionalString(value);
  if (!text) return null;
  if (/^https?:\/\//i.test(text)) return text;
  if (text.startsWith('//')) return `https:${text}`;
  if (text.startsWith('/')) return `${publicBaseUrl()}${text}`;
  return text;
}

function toPublicUrlList(values = []) {
  return (Array.isArray(values) ? values : [values])
    .map(toPublicUrl)
    .filter(Boolean);
}

function normalizeComparableText(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[\u0623\u0625\u0622]/g, '\u0627')
    .replace(/\u0649/g, '\u064A')
    .replace(/\u0629/g, '\u0647')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseVariantMetadata(variant = {}) {
  if (!variant?.metadata) return {};
  if (typeof variant.metadata === 'object') return variant.metadata;
  try {
    return JSON.parse(variant.metadata);
  } catch {
    return {};
  }
}

function getVariantAttribute(variant = {}, names = []) {
  const metadata = parseVariantMetadata(variant);
  const values = metadata.attributeValues || metadata.attributes || {};
  const entries = Object.entries(values || {});
  for (const wantedName of names) {
    const wanted = normalizeComparableText(wantedName);
    const match = entries.find(([key]) => normalizeComparableText(key) === wanted);
    if (match && match[1] !== undefined && match[1] !== null && String(match[1]).trim()) {
      return String(match[1]).trim();
    }
  }
  return null;
}

function aggregateVariantOptions(variants = [], directType = '', attributeNames = []) {
  const byValue = new Map();
  const addOption = (variant, value) => {
    const label = normalizeOptionalString(value);
    if (!label) return;
    const key = normalizeComparableText(label);
    const existing = byValue.get(key);
    const stock = Number(variant.stock || 0);
    if (existing) {
      existing.stock += stock;
      existing.trackInventory = existing.trackInventory !== false && variant.trackInventory !== false;
      existing.sku = existing.sku || variant.sku || null;
      existing.isActive = existing.isActive !== false && variant.isActive !== false;
      return;
    }
    byValue.set(key, {
      name: label,
      type: directType,
      sku: variant.sku || null,
      stock,
      trackInventory: variant.trackInventory,
      isActive: variant.isActive,
    });
  };

  for (const variant of variants) {
    if (normalizeComparableText(variant.type) === normalizeComparableText(directType)) {
      addOption(variant, variant.name);
      continue;
    }
    const attributeValue = getVariantAttribute(variant, attributeNames);
    if (attributeValue) addOption(variant, attributeValue);
  }

  return [...byValue.values()];
}

function variantMatchesConstraint(variant, requestedValue) {
  const wanted = normalizeComparableText(requestedValue);
  if (!wanted) return true;
  const name = normalizeComparableText(variant?.name);
  const sku = normalizeComparableText(variant?.sku);
  return Boolean(name && (name === wanted || name.includes(wanted) || wanted.includes(name)))
    || Boolean(sku && sku === wanted);
}

function variantAvailabilityStatus(variant) {
  if (!variant) return 'NOT_FOUND';
  if (variant.isActive === false) return 'INACTIVE';
  if (variant.trackInventory === false) return 'AVAILABLE';
  if (Number(variant.stock || 0) <= 0) return 'OUT_OF_STOCK';
  if (Number(variant.stock || 0) <= 5) return 'LOW_STOCK';
  return 'AVAILABLE';
}

function productAvailabilityStatus(product) {
  if (!product) return 'NOT_FOUND';
  if (product.trackInventory === false) return 'AVAILABLE';
  if (Number(product.stock || 0) <= 0) return 'OUT_OF_STOCK';
  if (Number(product.stock || 0) <= 5) return 'LOW_STOCK';
  return 'AVAILABLE';
}

function slugify(value = '') {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return normalized || `product-${Date.now()}`;
}

async function uniqueProductSlug(prisma, companyId, desiredSlug) {
  const base = slugify(desiredSlug);
  let candidate = base;
  let suffix = 1;
  while (await prisma.product.findFirst({ where: { companyId, slug: candidate }, select: { id: true } })) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
  return candidate;
}

function buildAgentProductDescription({ name, description, colors, sizes }) {
  if (normalizeOptionalString(description)) return description.trim();
  void colors;
  void sizes;
  return normalizeOptionalString(name) || 'Product draft pending merchant review.';
}

module.exports = {
  getSharedPrismaClient,
  periodToRange,
  formatCurrency,
  normalizeOptionalString,
  normalizeStringList,
  toPublicUrl,
  toPublicUrlList,
  normalizeComparableText,
  parseVariantMetadata,
  getVariantAttribute,
  aggregateVariantOptions,
  variantMatchesConstraint,
  variantAvailabilityStatus,
  productAvailabilityStatus,
  slugify,
  uniqueProductSlug,
  buildAgentProductDescription,
};
