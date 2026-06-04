const { getSharedPrismaClientAsync } = require('./sharedDatabase');

const ACTIVE_COMPANY_APP_STATUSES = ['TRIAL', 'ACTIVE'];
const MAX_FEATURE_LENGTH = 80;
const MAX_METADATA_DEPTH = 2;
const MAX_METADATA_KEYS = 16;
const MAX_STRING_LENGTH = 240;

const isRecord = (value) =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const normalizeFeature = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().slice(0, MAX_FEATURE_LENGTH);
};

const normalizeQuantity = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 1;
  }

  return Math.min(500, Math.max(1, Math.round(parsed)));
};

const normalizeTotalCost = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return Number(parsed.toFixed(2));
};

const parseSettings = (value) => {
  if (isRecord(value)) {
    return value;
  }

  if (typeof value !== 'string' || !value.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(value);
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

const sanitizeMetadata = (value, depth = 0) => {
  if (depth > MAX_METADATA_DEPTH || value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value === 'string') {
    return value.slice(0, MAX_STRING_LENGTH);
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? Number(value.toFixed(2)) : undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    const nextItems = value
      .slice(0, 8)
      .map((item) => sanitizeMetadata(item, depth + 1))
      .filter((item) => item !== undefined);

    return nextItems.length > 0 ? nextItems : undefined;
  }

  if (!isRecord(value)) {
    return undefined;
  }

  const entries = Object.entries(value).slice(0, MAX_METADATA_KEYS);
  const output = {};

  for (const [key, entryValue] of entries) {
    if (typeof key !== 'string' || !key.trim()) {
      continue;
    }

    const sanitizedValue = sanitizeMetadata(entryValue, depth + 1);
    if (sanitizedValue !== undefined) {
      output[key.slice(0, 48)] = sanitizedValue;
    }
  }

  return Object.keys(output).length > 0 ? output : undefined;
};

const resolveCompanyApp = async (prisma, companyId, slug) => {
  if (!companyId || !slug) {
    return null;
  }

  return prisma.companyApp.findFirst({
    where: {
      companyId,
      status: { in: ACTIVE_COMPANY_APP_STATUSES },
      app: {
        slug,
      },
    },
    select: {
      id: true,
      settings: true,
    },
  });
};

const isCompanyAppEnabled = (companyApp) => {
  const settings = parseSettings(companyApp?.settings);
  const generalSettings = isRecord(settings.general) ? settings.general : {};
  return generalSettings.enabled !== false;
};

const trackStorefrontAppUsage = async ({
  companyId,
  slug,
  feature,
  quantity = 1,
  totalCost = 0,
  metadata,
}) => {
  const normalizedFeature = normalizeFeature(feature);
  if (!companyId || !slug || !normalizedFeature) {
    return {
      tracked: false,
      reason: 'invalid-input',
    };
  }

  const prisma = await getSharedPrismaClientAsync();
  const companyApp = await resolveCompanyApp(prisma, companyId, slug);

  if (!companyApp) {
    return {
      tracked: false,
      reason: 'app-not-installed',
    };
  }

  if (!isCompanyAppEnabled(companyApp)) {
    return {
      tracked: false,
      reason: 'app-disabled',
    };
  }

  const usageLog = await prisma.appUsageLog.create({
    data: {
      companyAppId: companyApp.id,
      feature: normalizedFeature,
      quantity: normalizeQuantity(quantity),
      totalCost: normalizeTotalCost(totalCost),
      metadata: sanitizeMetadata(metadata),
    },
    select: {
      id: true,
      companyAppId: true,
    },
  });

  return {
    tracked: true,
    companyAppId: usageLog.companyAppId,
    logId: usageLog.id,
  };
};

module.exports = {
  trackStorefrontAppUsage,
  sanitizeStorefrontAppUsageMetadata: sanitizeMetadata,
};
