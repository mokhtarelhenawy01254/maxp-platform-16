
const fs = require('fs/promises');
const path = require('path');
const {
  getSharedPrismaClientAsync,
  executeWithRetry,
} = require('./sharedDatabase');

const THEME_CATEGORY = 'THEME';
const DEFAULT_STOREFRONT_THEME_ID = 'modern-minimal';
const DEFAULT_THEME_CURRENCY = 'EGP';
const DEFAULT_PRICING_MODEL = 'FREE';
const DEFAULT_SUPPORTED_LANGUAGES = 'ar,en';
const DEFAULT_THEME_DESCRIPTION_PLACEHOLDER =
  'قالب storefront رسمي قابل للتفعيل من لوحة المتجر.';
const PRESET_CACHE_TTL_MS = 30 * 1000;
const DEFAULT_THEME_CACHE_TTL_MS = 30 * 1000;
const CATALOG_SYNC_TTL_MS = 5 * 60 * 1000;
const CATALOG_SYNC_FAILURE_COOLDOWN_MS = 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const ONE_MONTH_MS = 30 * ONE_DAY_MS;
const ACTIVE_INSTALLATION_STATUSES = new Set(['ACTIVE', 'TRIAL']);
const THEME_PRESETS_DIR_ENV_KEY = 'STOREFRONT_THEME_PRESETS_DIR';

const DEFAULT_THEME_DESCRIPTIONS = {
  'modern-minimal': 'قالب متجر عام هادئ يوازن بين بساطة العرض، سرعة التصفح، ومسارات شراء أوضح للمتاجر متعددة الأقسام.',
  'bold-fashion': 'طابع بصري أقوى مناسب للمتاجر ذات الرسائل التسويقية الواضحة.',
  'elegant-luxe': 'أسلوب أكثر فخامة مع إبراز قوي للمحتوى والصور.',
  'elessi-classic': 'تصميم عصري كلاسيكي مع شريط جانبي للفئات وسلايدر جذاب.',
  'tech-cyber': 'تصميم مستقبلي للأجهزة الإلكترونية يعتمد على الـ Glassmorphism والتدرجات اللونية.',
  'zen-organic': 'تصميم مستوحى من الطبيعة للجمال والعافية مع زوايا ناعمة وتخطيط مريح.',
  'fakhama-elite': 'تصميم يجسد الفخامة والرقي، مثالي للماركات الراقية للأحذية والمنتجات اليدوية.',
  'kids-play': 'عالم من الألوان والمرح؛ تصميم مبهج مصمم خصيصاً لمتاجر لعب الأطفال ليجذب الصغار ويطمئن الكبار.',
  'green-haven': 'واجهة طبيعية خضراء بمظهر عضوي ناعم ومنحنيات جذابة لمحبي النباتات ومستلزمات الحدائق.',
  'cyber-gear': 'قالب حماسي مخصص لمعدات الألعاب الإلكترونية، بألوان قوية، وأسلوب سايبر-بانك يلائم عالم הגייمرز.',
  'baby-cloud': 'تصميم دافئ وناعم خصيصاً لمستلزمات الأطفال، بخطوط مرحة، وألوان مريحة تبعث على الاطمئنان.',
  'spice-route': 'واجهة كلاسيكية شرقية مخصصة للتوابل العضوية والبهارات الفاخرة، تقدم طابعاً دافئاً وموثوقاً.',
  'anjella-boutique': 'قالب بوتيك أزياء وعبايات محتشمة بتصميم أنيق وبسيط، يعتمد على نقاء المساحات البيضاء وصور الكولكشن وتجربة شراء سلسة.'
};

const isRecord = (value) =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const isDefaultStorefrontTheme = (features) =>
  isRecord(features) && features.isDefaultStorefrontTheme === true;

const toSafeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizePrice = (value, fallback = 0) => {
  const parsed = toSafeNumber(value, fallback);
  return Math.max(0, Number(parsed.toFixed(2)));
};

const normalizePricingModel = (value, fallback = DEFAULT_PRICING_MODEL) => {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized === 'FREE') {
    return 'FREE';
  }
  if (normalized === 'ONE_TIME' || normalized === 'SUBSCRIPTION') {
    return 'ONE_TIME';
  }
  if (String(fallback || '').trim().toUpperCase() === 'SUBSCRIPTION') {
    return 'ONE_TIME';
  }
  return String(fallback || '').trim().toUpperCase() === 'ONE_TIME'
    ? 'ONE_TIME'
    : 'FREE';
};

const toStoredPricingModel = (value, fallback = DEFAULT_PRICING_MODEL) => {
  const normalized = normalizePricingModel(value, fallback);
  return normalized === 'ONE_TIME' ? 'SUBSCRIPTION' : 'FREE';
};

const normalizeText = (value, fallback = '') => {
  const trimmed = String(value || '').trim();
  return trimmed || fallback;
};

const getThemePresetDirectoryCandidates = () => {
  const envOverride = normalizeText(process.env[THEME_PRESETS_DIR_ENV_KEY], '');

  return [
    envOverride ? path.resolve(envOverride) : null,
    path.resolve(__dirname, '../../frontend2/src/storefront/themes'),
    path.resolve(__dirname, '../../frontend/src/storefront/themes'),
  ].filter(Boolean);
};

const dedupePathList = (paths) => {
  const seen = new Set();
  return paths.filter((candidate) => {
    const normalized = normalizeText(candidate, '');
    if (!normalized || seen.has(normalized)) {
      return false;
    }
    seen.add(normalized);
    return true;
  });
};

const isIgnorableThemePresetDirectoryError = (error) =>
  ['ENOENT', 'ENOTDIR', 'EACCES'].includes(String(error?.code || '').trim().toUpperCase());

const resolveThemePresetsDirectory = async ({
  candidateDirs = getThemePresetDirectoryCandidates(),
} = {}) => {
  const candidates = dedupePathList(candidateDirs);
  const readableDirectories = [];

  for (const directory of candidates) {
    try {
      const files = (await fs.readdir(directory))
        .filter((fileName) => fileName.endsWith('.json'))
        .sort();

      if (files.length > 0) {
        readableDirectories.push({
          directory,
          files,
        });
      }
    } catch (error) {
      if (isIgnorableThemePresetDirectoryError(error)) {
        continue;
      }

      throw error;
    }
  }

  if (readableDirectories.length === 0) {
    const triedDirectories = candidates.length > 0 ? candidates.join(', ') : '(none)';
    throw new Error(
      `Unable to resolve storefront theme presets directory. Tried: ${triedDirectories}`,
    );
  }

  readableDirectories.sort((left, right) => {
    if (right.files.length !== left.files.length) {
      return right.files.length - left.files.length;
    }

    return candidates.indexOf(left.directory) - candidates.indexOf(right.directory);
  });

  return readableDirectories[0];
};

const resolveSyncedThemeDescription = (existingDescription, manifestDescription) => {
  const normalizedExisting = normalizeText(existingDescription, '');
  if (
    !normalizedExisting ||
    normalizedExisting === DEFAULT_THEME_DESCRIPTION_PLACEHOLDER
  ) {
    return normalizeText(manifestDescription, DEFAULT_THEME_DESCRIPTION_PLACEHOLDER);
  }

  return normalizedExisting;
};

const normalizeDateString = (value) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const isFutureDateValue = (value) => {
  if (!value) {
    return true;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return date.getTime() >= Date.now();
};

const compareByLatestDate = (left, right) => {
  const leftDate = left ? new Date(left).getTime() : 0;
  const rightDate = right ? new Date(right).getTime() : 0;
  return rightDate - leftDate;
};

const serializeInstallation = (installation) => {
  if (!installation) {
    return null;
  }

  return {
    id: installation.id || null,
    status: normalizeText(installation.status).toUpperCase() || null,
    activePricingModel: normalizePricingModel(
      installation.activePricingModel,
      DEFAULT_PRICING_MODEL,
    ),
    trialEndsAt: normalizeDateString(installation.trialEndsAt),
    validUntil: normalizeDateString(installation.validUntil),
    nextBillingAt: normalizeDateString(installation.nextBillingAt),
  };
};

const isOwnedInstallation = (installation) => {
  const serialized = serializeInstallation(installation);
  if (!serialized) {
    return false;
  }

  if (!ACTIVE_INSTALLATION_STATUSES.has(serialized.status || '')) {
    return false;
  }

  if (serialized.status === 'TRIAL') {
    return isFutureDateValue(serialized.trialEndsAt);
  }

  if (serialized.activePricingModel === 'ONE_TIME') {
    return true;
  }

  return isFutureDateValue(serialized.validUntil);
};

const isPaidThemePricingModel = (pricingModel) =>
  normalizePricingModel(pricingModel, DEFAULT_PRICING_MODEL) === 'ONE_TIME';

const getThemePurchaseAmount = (app) =>
  normalizePrice(app?.monthlyPrice, 0);

const normalizeThemeDesignTokens = (designTokens, { themeId, company, manifest }) => {
  const current = isRecord(designTokens) ? designTokens : {};

  // ✅ ROBUST RESET: Whitelist only essential storefront metadata.
  // This ensures that ALL design overrides (nested or flat legacy keys) are cleared,
  // allowing the new theme's defaults to be correctly applied.
  const next = {
    themeId,
    storeName: normalizeText(current.storeName || company?.name, 'Storefront'),
    currency: normalizeText(current.currency || company?.currency, DEFAULT_THEME_CURRENCY),
  };

  // Merge manifest tokens if available
  if (isRecord(manifest?.tokens)) {
    Object.assign(next, manifest.tokens);
  }

  // Preserve non-design metadata if present
  if (current.logoUrl) next.logoUrl = current.logoUrl;
  if (current.faviconUrl) next.faviconUrl = current.faviconUrl;
  if (current.storefrontPageAssignments) {
    next.storefrontPageAssignments = current.storefrontPageAssignments;
  }

  return next;
};

const buildPageStats = (theme) => {
  const pages = isRecord(theme?.pages) ? theme.pages : {};
  const homeSections = Array.isArray(pages.home?.sections)
    ? pages.home.sections.length
    : 0;
  const shopSections = Array.isArray(pages.shop?.sections)
    ? pages.shop.sections.length
    : 0;
  const checkoutSections = Array.isArray(pages.checkout?.sections)
    ? pages.checkout.sections.length
    : 0;
  const pdpSections = Array.isArray(pages.pdp?.sections)
    ? pages.pdp.sections.length
    : 0;
  const cartSections = Array.isArray(pages.cart?.sections)
    ? pages.cart.sections.length
    : 0;

  return {
    homeSections,
    shopSections,
    checkoutSections,
    pdpSections,
    cartSections,
    totalSections:
      homeSections + shopSections + checkoutSections + pdpSections + cartSections,
  };
};

const runCatalogQuery = async (operation, maxRetries = 3) =>
  executeWithRetry(async () => {
    const prisma = await getSharedPrismaClientAsync();
    return operation(prisma);
  }, maxRetries);

class StorefrontThemeCatalogService {
  constructor() {
    this._presetCache = null;
    this._presetCacheAt = 0;
    this._syncPromise = null;
    this._lastCatalogSyncAt = 0;
    this._lastCatalogSyncFailureAt = 0;
    this._defaultThemeCache = null;
    this._defaultThemeCacheAt = 0;
  }

  async ensureCatalogSynced({ force = false } = {}) {
    if (
      !force &&
      this._lastCatalogSyncAt &&
      Date.now() - this._lastCatalogSyncAt <= CATALOG_SYNC_TTL_MS
    ) {
      return;
    }

    if (!this._syncPromise) {
      this._syncPromise = this.syncCatalog()
        .then((result) => {
          this._lastCatalogSyncAt = Date.now();
          this._lastCatalogSyncFailureAt = 0;
          return result;
        })
        .catch((error) => {
          this._lastCatalogSyncFailureAt = Date.now();
          throw error;
        })
        .finally(() => {
          this._syncPromise = null;
        });
    }

    return this._syncPromise;
  }

  async syncCatalogForRead() {
    if (
      this._lastCatalogSyncAt &&
      Date.now() - this._lastCatalogSyncAt <= CATALOG_SYNC_TTL_MS
    ) {
      return;
    }

    if (
      this._lastCatalogSyncFailureAt &&
      Date.now() - this._lastCatalogSyncFailureAt <= CATALOG_SYNC_FAILURE_COOLDOWN_MS
    ) {
      return;
    }

    try {
      await this.ensureCatalogSynced();
    } catch (error) {
      console.warn(
        '⚠️ [THEME-CATALOG] Catalog sync skipped during read:',
        error.message,
      );
    }
  }

  async loadPresetManifests({ forceReload = false } = {}) {
    const isCacheFresh =
      this._presetCache &&
      Date.now() - this._presetCacheAt <= PRESET_CACHE_TTL_MS;

    if (!forceReload && isCacheFresh) {
      return this._presetCache;
    }

    const { directory: themePresetsDir, files } =
      await resolveThemePresetsDirectory();
    const manifests = await Promise.all(
      files
        .sort()
        .map(async (fileName) => {
          const absolutePath = path.join(themePresetsDir, fileName);
          const raw = await fs.readFile(absolutePath, 'utf8');
          const parsed = JSON.parse(raw);
          const themeId = normalizeText(parsed?.id, fileName.replace(/\.json$/i, ''));
          const colors = isRecord(parsed?.tokens?.colors) ? parsed.tokens.colors : {};

          return {
            id: themeId,
            slug: themeId,
            name: normalizeText(parsed?.name, themeId),
            description: normalizeText(
              parsed?.description || DEFAULT_THEME_DESCRIPTIONS[themeId],
              'قالب storefront رسمي قابل للتفعيل من لوحة المتجر.',
            ),
            preview: {
              imageUrl: normalizeText(
                parsed?.preview?.imageUrl || parsed?.blueprint?.metadata?.previewImage || parsed?.thumbnailUrl,
                '',
              ),
              colors: [
                colors.primary || '',
                colors.secondary || '',
                colors.accent || '',
              ].filter(Boolean),
            },
            pageStats: buildPageStats(parsed),
          };
        }),
    );

    this._presetCache = manifests;
    this._presetCacheAt = Date.now();
    return manifests;
  }

  mergeFeatures(existingFeatures, manifest) {
    const safeExisting = isRecord(existingFeatures) ? existingFeatures : {};
    const preview = isRecord(safeExisting.preview) ? safeExisting.preview : {};

    return {
      ...safeExisting,
      themeId: manifest.id,
      source: 'storefront-preset',
      preview: {
        ...preview,
        imageUrl: manifest.preview.imageUrl || preview.imageUrl || '',
        colors: manifest.preview.colors,
      },
      pageStats: manifest.pageStats,
    };
  }

  clearDefaultThemeCache() {
    this._defaultThemeCache = null;
    this._defaultThemeCacheAt = 0;
  }

  async syncCatalog() {
    const manifests = await this.loadPresetManifests();
    const themeIds = manifests.map((manifest) => manifest.id);

    const existingRows = await this.loadCatalogRows(themeIds, {
      includeCategory: true,
    });

    const existingBySlug = new Map(existingRows.map((row) => [row.slug, row]));

    for (const manifest of manifests) {
      const existing = existingBySlug.get(manifest.id);
      const nextFeatures = this.mergeFeatures(existing?.features, manifest);

      await runCatalogQuery(async (prisma) => {
        return prisma.marketplaceApp.upsert({
          where: { slug: manifest.id },
          update: {
            category: THEME_CATEGORY,
            name: manifest.name,
            description: resolveSyncedThemeDescription(
              existing?.description,
              manifest.description,
            ),
            // Preserve intentional super-admin archive/visibility decisions.
            isActive: existing?.isActive !== false,
            isPublic: existing?.isPublic !== false,
            features: nextFeatures,
            icon: normalizeText(existing?.icon, 'Storefront'),
          },
          create: {
            slug: manifest.id,
            name: manifest.name,
            description: manifest.description,
            monthlyPrice: 0,
            yearlyPrice: 0,
            pricingModel: DEFAULT_PRICING_MODEL,
            trialDays: 0,
            isActive: true,
            isPublic: true,
            isFeatured: false,
            category: THEME_CATEGORY,
            features: nextFeatures,
            icon: 'Storefront',
          },
        });
      });
    }
  }

  async loadCatalogRows(themeIds, { includeCategory = false } = {}) {
    return runCatalogQuery(async (prisma) => prisma.marketplaceApp.findMany({
      where: {
        category: THEME_CATEGORY,
        slug: { in: themeIds },
      },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        monthlyPrice: true,
        yearlyPrice: true,
        pricingModel: true,
        isActive: true,
        isPublic: true,
        isFeatured: true,
        trialDays: true,
        installCount: true,
        features: true,
        icon: true,
        ...(includeCategory ? { category: true } : {}),
      },
    }));
  }

  async loadCatalogRowsForRead(themeIds) {
    let rows = await this.loadCatalogRows(themeIds);
    const hasMissingThemeRows = rows.length < themeIds.length;

    if (!hasMissingThemeRows) {
      return rows;
    }

    await this.syncCatalogForRead();
    rows = await this.loadCatalogRows(themeIds);
    return rows;
  }

  serializeCatalogItem(
    row,
    manifest,
    currentThemeId = '',
    installation = undefined,
    usageStats = undefined,
  ) {
    const safeFeatures = isRecord(row?.features) ? row.features : {};
    const preview = isRecord(safeFeatures.preview) ? safeFeatures.preview : {};
    const pageStats = isRecord(safeFeatures.pageStats)
      ? safeFeatures.pageStats
      : manifest.pageStats;
    const isCurrentTheme = currentThemeId === manifest.id;
    const hasCompanyContext = installation !== undefined;
    const availability = Boolean(row?.isActive && row?.isPublic);
    const installationSnapshot = hasCompanyContext
      ? serializeInstallation(installation)
      : null;
    const isOwned = hasCompanyContext ? isOwnedInstallation(installation) : false;
    const pricingModel = normalizePricingModel(
      row?.pricingModel,
      toSafeNumber(row?.monthlyPrice, 0) > 0 ? 'ONE_TIME' : 'FREE',
    );
    const canSelect = hasCompanyContext
      ? isCurrentTheme || isOwned
      : availability || isCurrentTheme;
    const canActivate = hasCompanyContext
      ? availability && !isCurrentTheme && (isOwned || pricingModel === 'FREE')
      : availability;
    const canPurchase = hasCompanyContext
      ? availability && !isOwned && pricingModel === 'ONE_TIME'
      : availability && pricingModel === 'ONE_TIME';

    return {
      id: manifest.id,
      themeId: manifest.id,
      slug: manifest.id,
      appId: row?.id || null,
      name: normalizeText(row?.name, manifest.name),
      description: normalizeText(row?.description, manifest.description),
      pricingModel,
      monthlyPrice: normalizePrice(row?.monthlyPrice, 0),
      yearlyPrice: normalizePrice(row?.yearlyPrice, 0),
      currency: DEFAULT_THEME_CURRENCY,
      isActive: row?.isActive !== false,
      isPublic: row?.isPublic !== false,
      isFeatured: row?.isFeatured === true,
      isDefaultTheme: isDefaultStorefrontTheme(safeFeatures),
      isCurrentTheme,
      isOwned,
      canSelect,
      canActivate,
      canPurchase,
      requiresPurchase: hasCompanyContext ? !isCurrentTheme && !isOwned && pricingModel === 'ONE_TIME' : pricingModel === 'ONE_TIME',
      isOwned,
      canSelect,
      canActivate,
      canPurchase,
      requiresPurchase: hasCompanyContext ? !isCurrentTheme && !isOwned && pricingModel === 'ONE_TIME' : pricingModel === 'ONE_TIME',
      requiresActivation:
        hasCompanyContext ? !isCurrentTheme && !isOwned && pricingModel === 'FREE' : pricingModel === 'FREE',
      trialDays: Math.max(0, Math.floor(toSafeNumber(row?.trialDays, 0))),
      installationId: installationSnapshot?.id || null,
      installationStatus: installationSnapshot?.status || null,
      activePricingModel: installationSnapshot?.activePricingModel || null,
      trialEndsAt: installationSnapshot?.trialEndsAt || null,
      validUntil: installationSnapshot?.validUntil || null,
      nextBillingAt: installationSnapshot?.nextBillingAt || null,
      preview: {
        colors: Array.isArray(preview.colors)
          ? preview.colors.filter(Boolean)
          : manifest.preview.colors,
        imageUrl: normalizeText(
          preview.imageUrl || safeFeatures.previewImage || manifest.preview.imageUrl,
          "",
        ),
      },
      pageStats,
      usageStats: usageStats || {
        installations: 0,
        activeInstallations: 0,
        purchases: 0,
        currentCompanies: 0,
        installCount: Math.max(0, Math.floor(toSafeNumber(row?.installCount, 0))),
      },
      features: safeFeatures,
    };
  }

  sortCatalogItems(items) {
    return [...items].sort((left, right) => {
      if (left.isDefaultTheme !== right.isDefaultTheme) {
        return Number(right.isDefaultTheme) - Number(left.isDefaultTheme);
      }
      if (left.isFeatured !== right.isFeatured) {
        return Number(right.isFeatured) - Number(left.isFeatured);
      }
      if (left.isActive !== right.isActive) {
        return Number(right.isActive) - Number(left.isActive);
      }
      return left.name.localeCompare(right.name);
    });
  }

  async buildAdminUsageStats(rows) {
    const rowsById = new Map(
      rows
        .filter((row) => row?.id && row?.slug)
        .map((row) => [row.id, row]),
    );
    const appIds = Array.from(rowsById.keys());
    const statsByThemeId = new Map(
      rows.map((row) => [
        row.slug,
        {
          installations: 0,
          activeInstallations: 0,
          purchases: 0,
          currentCompanies: 0,
          installCount: Math.max(0, Math.floor(toSafeNumber(row?.installCount, 0))),
        },
      ]),
    );

    if (appIds.length === 0) {
      return statsByThemeId;
    }

    const prisma = await getSharedPrismaClientAsync();
    const [installations, storefrontSettings] = await Promise.all([
      executeWithRetry(async () =>
        prisma.companyApp.findMany({
          where: {
            appId: { in: appIds },
          },
          select: {
            appId: true,
            status: true,
            settings: true,
          },
        }),
      ),
      executeWithRetry(async () =>
        prisma.storefrontSettings.findMany({
          select: {
            designTokens: true,
          },
        }),
      ),
    ]);

    installations.forEach((installation) => {
      const row = rowsById.get(installation.appId);
      if (!row) return;

      const stats = statsByThemeId.get(row.slug);
      if (!stats) return;

      stats.installations += 1;
      if (ACTIVE_INSTALLATION_STATUSES.has(String(installation.status || '').toUpperCase())) {
        stats.activeInstallations += 1;
      }

      const settings = isRecord(installation.settings) ? installation.settings : {};
      if (normalizePrice(settings.purchaseAmount, 0) > 0 || normalizeText(settings.purchasedAt)) {
        stats.purchases += 1;
      }
    });

    storefrontSettings.forEach((settings) => {
      const designTokens = isRecord(settings?.designTokens) ? settings.designTokens : {};
      const themeId = normalizeText(designTokens.themeId);
      if (!themeId) return;

      const stats = statsByThemeId.get(themeId);
      if (stats) {
        stats.currentCompanies += 1;
      }
    });

    return statsByThemeId;
  }

  async getAdminCatalog({ currentThemeId = '' } = {}) {
    const manifests = await this.loadPresetManifests();
    const themeIds = manifests.map((manifest) => manifest.id);
    const rows = await this.loadCatalogRowsForRead(themeIds);

    const rowsBySlug = new Map(rows.map((row) => [row.slug, row]));
    const usageStatsByThemeId = await this.buildAdminUsageStats(rows);
    return this.sortCatalogItems(
      manifests.map((manifest) =>
        this.serializeCatalogItem(
          rowsBySlug.get(manifest.id),
          manifest,
          currentThemeId,
          undefined,
          usageStatsByThemeId.get(manifest.id),
        ),
      ),
    );
  }

  async getDefaultThemeId({
    fallbackThemeId = DEFAULT_STOREFRONT_THEME_ID,
  } = {}) {
    if (
      this._defaultThemeCache &&
      Date.now() - this._defaultThemeCacheAt <= DEFAULT_THEME_CACHE_TTL_MS
    ) {
      return this._defaultThemeCache;
    }

    try {
      const manifests = await this.loadPresetManifests();
      const themeIds = manifests.map((manifest) => manifest.id);
      const rows = await this.loadCatalogRowsForRead(themeIds);
      const defaultRow = rows.find(
        (row) =>
          row?.isActive !== false &&
          row?.isPublic !== false &&
          isDefaultStorefrontTheme(row.features),
      );
      const fallbackManifest = manifests.find(
        (manifest) => manifest.id === fallbackThemeId,
      );
      const fallbackRow = rows.find(
        (row) =>
          row?.slug === fallbackThemeId &&
          row?.isActive !== false &&
          row?.isPublic !== false,
      );
      const fallbackActiveRow = rows.find(
        (row) => row?.isActive !== false && row?.isPublic !== false,
      );
      const resolvedThemeId =
        defaultRow?.slug ||
        fallbackRow?.slug ||
        fallbackActiveRow?.slug ||
        fallbackManifest?.id ||
        manifests[0]?.id ||
        fallbackThemeId;

      this._defaultThemeCache = resolvedThemeId;
      this._defaultThemeCacheAt = Date.now();
      return resolvedThemeId;
    } catch (error) {
      console.warn(
        '⚠️ [THEME-CATALOG] Failed to resolve default storefront theme:',
        error.message,
      );
      return fallbackThemeId;
    }
  }

  async setDefaultTheme(themeId) {
    const normalizedThemeId = normalizeText(themeId);
    if (!normalizedThemeId) {
      const error = new Error('Theme id is required');
      error.code = 'THEME_ID_REQUIRED';
      throw error;
    }

    await this.ensureCatalogSynced();
    const manifests = await this.loadPresetManifests();
    const manifest = manifests.find((item) => item.id === normalizedThemeId);

    if (!manifest) {
      const error = new Error('Theme preset not found');
      error.code = 'THEME_NOT_FOUND';
      throw error;
    }

    const themeIds = manifests.map((item) => item.id);
    const rows = await this.loadCatalogRowsForRead(themeIds);
    const targetRow = rows.find((row) => row.slug === normalizedThemeId);

    if (!targetRow) {
      const error = new Error('Theme preset not found');
      error.code = 'THEME_NOT_FOUND';
      throw error;
    }

    const defaultSetAt = new Date().toISOString();
    await Promise.all(
      rows.map((row) => {
        const currentFeatures = isRecord(row.features) ? row.features : {};
        const isTarget = row.slug === normalizedThemeId;
        const nextFeatures = {
          ...currentFeatures,
          isDefaultStorefrontTheme: isTarget,
          defaultStorefrontThemeSetAt: isTarget ? defaultSetAt : null,
        };

        return runCatalogQuery(async (prisma) =>
          prisma.marketplaceApp.update({
            where: { slug: row.slug },
            data: {
              features: nextFeatures,
              ...(isTarget
                ? {
                    isActive: true,
                    isPublic: true,
                  }
                : {}),
            },
          })
        );
      }),
    );

    this.clearDefaultThemeCache();
    const items = await this.getAdminCatalog();
    const updated = items.find((item) => item.themeId === normalizedThemeId);
    if (!updated) {
      throw new Error('Failed to load updated default theme');
    }
    return updated;
  }

  async getCompanyCatalog({
    companyId = '',
    currentThemeId = '',
    includeUnavailable = true,
  } = {}) {
    const manifests = await this.loadPresetManifests();
    const themeIds = manifests.map((manifest) => manifest.id);
    const rows = await this.loadCatalogRowsForRead(themeIds);

    const rowsBySlug = new Map(rows.map((row) => [row.slug, row]));
    let installationsByAppId = new Map();

    if (companyId) {
      const appIds = rows.map((row) => row.id).filter(Boolean);
      if (appIds.length > 0) {
        const installations = await runCatalogQuery(async (prisma) => {
          return prisma.companyApp.findMany({
            where: {
              companyId,
              appId: { in: appIds },
            },
            select: {
              id: true,
              appId: true,
              status: true,
              activePricingModel: true,
              trialEndsAt: true,
              validUntil: true,
              nextBillingAt: true,
            },
          });
        });

        installationsByAppId = new Map(
          installations.map((installation) => [installation.appId, installation]),
        );
      }
    }

    const items = this.sortCatalogItems(
      manifests.map((manifest) => {
        const row = rowsBySlug.get(manifest.id);
        const installation =
          companyId && row?.id
            ? installationsByAppId.get(row.id) || null
            : undefined;

        return this.serializeCatalogItem(
          row,
          manifest,
          currentThemeId,
          installation,
        );
      }),
    );

    return items.filter((item) => {
      if (item.isCurrentTheme) {
        return true;
      }
      if (item.isOwned) {
        return true;
      }
      if (!item.isPublic) {
        return false;
      }
      return includeUnavailable ? true : item.canSelect || item.canActivate;
    });
  }

  async getCompanyPurchaseHistory({
    companyId = '',
    limit = 10,
  } = {}) {
    if (!companyId) {
      const error = new Error('Company context is required');
      error.code = 'COMPANY_REQUIRED';
      throw error;
    }

    const prisma = await getSharedPrismaClientAsync();
    const manifests = await this.loadPresetManifests();
    const themeIds = manifests.map((manifest) => manifest.id);

    const [apps, installations, storefrontSettings] = await Promise.all([
      this.loadCatalogRowsForRead(themeIds),
      executeWithRetry(async () => {
        return await prisma.companyApp.findMany({
          where: {
            companyId,
          },
          select: {
            id: true,
            appId: true,
            status: true,
            activePricingModel: true,
            settings: true,
            createdAt: true,
            updatedAt: true,
          },
        });
      }),
      executeWithRetry(async () => {
        return await prisma.storefrontSettings.findUnique({
          where: { companyId },
          select: {
            designTokens: true,
          },
        });
      }),
    ]);

    const appsById = new Map(apps.map((app) => [app.id, app]));
    const currentThemeId =
      typeof storefrontSettings?.designTokens?.themeId === 'string'
        ? storefrontSettings.designTokens.themeId.trim()
        : '';

    const historyItems = installations
      .map((installation) => {
        const app = appsById.get(installation.appId);
        if (!app || !themeIds.includes(app.slug)) {
          return null;
        }

        const installationSettings = isRecord(installation.settings)
          ? installation.settings
          : {};
        const purchaseAmount = normalizePrice(
          installationSettings.purchaseAmount,
          toSafeNumber(app.monthlyPrice, 0),
        );
        const walletTransactionId = normalizeText(
          installationSettings.walletTransactionId,
        );
        const walletReferenceId = normalizeText(
          installationSettings.walletReferenceId,
        );
        const purchasedAt =
          normalizeDateString(installationSettings.purchasedAt) ||
          (purchaseAmount > 0 ? normalizeDateString(installation.createdAt) : null);
        const activatedAt =
          normalizeDateString(installationSettings.activatedAt) ||
          normalizeDateString(installation.updatedAt);
        const pricingModel = normalizePricingModel(
          app.pricingModel,
          purchaseAmount > 0 ? 'ONE_TIME' : DEFAULT_PRICING_MODEL,
        );

        if (!purchaseAmount && !walletTransactionId && !purchasedAt) {
          return null;
        }

        return {
          installationId: installation.id,
          themeId: app.slug,
          name: normalizeText(app.name, app.slug),
          description: normalizeText(app.description, ''),
          pricingModel,
          purchaseAmount,
          currency: normalizeText(
            installationSettings.purchaseCurrency,
            DEFAULT_THEME_CURRENCY,
          ),
          purchasedAt,
          activatedAt,
          installationStatus: normalizeText(installation.status).toUpperCase() || null,
          activePricingModel: normalizePricingModel(
            installation.activePricingModel,
            pricingModel,
          ),
          isCurrentTheme: currentThemeId === app.slug,
          walletTransactionId: walletTransactionId || null,
          walletReferenceId: walletReferenceId || null,
        };
      })
      .filter(Boolean)
      .sort((left, right) =>
        compareByLatestDate(
          left?.purchasedAt || left?.activatedAt,
          right?.purchasedAt || right?.activatedAt,
        ),
      )
      .slice(0, Math.max(1, Math.min(Number(limit) || 10, 50)));

    const transactionIds = historyItems
      .map((item) => item.walletTransactionId)
      .filter(Boolean);

    let transactionsById = new Map();
    if (transactionIds.length > 0) {
      const transactions = await executeWithRetry(async () => {
        return await prisma.transaction.findMany({
          where: {
            id: { in: transactionIds },
          },
          select: {
            id: true,
            type: true,
            status: true,
            amount: true,
            description: true,
            referenceId: true,
            createdAt: true,
          },
        });
      });

      transactionsById = new Map(transactions.map((item) => [item.id, item]));
    }

    return historyItems.map((item) => {
      const transaction = item.walletTransactionId
        ? transactionsById.get(item.walletTransactionId) || null
        : null;

      return {
        ...item,
        walletTransaction: transaction
          ? {
              id: transaction.id,
              type: normalizeText(transaction.type).toUpperCase(),
              status: normalizeText(transaction.status).toUpperCase(),
              amount: normalizePrice(transaction.amount, item.purchaseAmount),
              description: normalizeText(transaction.description),
              referenceId: normalizeText(
                transaction.referenceId,
                item.walletReferenceId || '',
              ),
              createdAt: normalizeDateString(transaction.createdAt),
            }
          : null,
      };
    });
  }

  async updateTheme(themeId, payload = {}) {
    const normalizedThemeId = normalizeText(themeId);
    if (!normalizedThemeId) {
      throw new Error('Theme id is required');
    }

    await this.ensureCatalogSynced();
    const prisma = await getSharedPrismaClientAsync();
    const manifests = await this.loadPresetManifests();
    const manifest = manifests.find((item) => item.id === normalizedThemeId);

    if (!manifest) {
      const error = new Error('Theme preset not found');
      error.code = 'THEME_NOT_FOUND';
      throw error;
    }

    const existing = await executeWithRetry(async () => {
      return await prisma.marketplaceApp.findUnique({
        where: { slug: normalizedThemeId },
        select: {
          id: true,
          slug: true,
          description: true,
          isActive: true,
          isPublic: true,
          features: true,
        },
      });
    });

    const nextFeatures = this.mergeFeatures(existing?.features, manifest);
    const currentlyDefault = isDefaultStorefrontTheme(existing?.features);
    const nextIsActive = payload.isActive !== false;
    const nextIsPublic = payload.isPublic !== false;

    if (currentlyDefault && (!nextIsActive || !nextIsPublic)) {
      const error = new Error(
        'Default storefront theme must remain active and public',
      );
      error.code = 'DEFAULT_THEME_LOCKED';
      throw error;
    }

    if (typeof payload.badgeText === 'string') {
      nextFeatures.badgeText = payload.badgeText.trim();
    }

    if (typeof payload.previewImage === 'string') {
      nextFeatures.previewImage = payload.previewImage.trim();
    }

    if (typeof payload.imageUrl === 'string') {
      if (!isRecord(nextFeatures.preview)) {
        nextFeatures.preview = {};
      }
      nextFeatures.preview.imageUrl = payload.imageUrl.trim();
      // Sync legacy field too
      nextFeatures.previewImage = payload.imageUrl.trim();
    }

    const nextPricingModel = normalizePricingModel(
      payload.pricingModel,
      toSafeNumber(payload.monthlyPrice, 0) > 0 ? 'ONE_TIME' : DEFAULT_PRICING_MODEL,
    );
    const nextStoredPricingModel = toStoredPricingModel(nextPricingModel);
    const nextMonthlyPrice =
      nextPricingModel === 'FREE' ? 0 : normalizePrice(payload.monthlyPrice, 0);
    const nextYearlyPrice =
      nextPricingModel === 'FREE' ? 0 : normalizePrice(payload.yearlyPrice, 0);

    await executeWithRetry(async () => {
      return await prisma.marketplaceApp.update({
        where: { slug: normalizedThemeId },
        data: {
          category: THEME_CATEGORY,
          name: manifest.name,
          description: normalizeText(payload.description, existing?.description || manifest.description),
          pricingModel: nextStoredPricingModel,
          monthlyPrice: nextMonthlyPrice,
          yearlyPrice: nextYearlyPrice,
          isActive: nextIsActive,
          isPublic: nextIsPublic,
          isFeatured: payload.isFeatured === true,
          features: nextFeatures,
        },
      });
    });

    const items = await this.getAdminCatalog();
    const updated = items.find((item) => item.themeId === normalizedThemeId);
    if (!updated) {
      throw new Error('Failed to load updated theme');
    }
    return updated;
  }

  async purchaseThemeForCompany(
    themeId,
    {
      companyId = '',
    } = {},
  ) {
    const normalizedThemeId = normalizeText(themeId);
    if (!normalizedThemeId) {
      const error = new Error('Theme id is required');
      error.code = 'THEME_ID_REQUIRED';
      throw error;
    }

    if (!companyId) {
      const error = new Error('Company context is required');
      error.code = 'COMPANY_REQUIRED';
      throw error;
    }

    await this.ensureCatalogSynced();
    const prisma = await getSharedPrismaClientAsync();
    const manifests = await this.loadPresetManifests();
    const manifest = manifests.find((item) => item.id === normalizedThemeId);

    if (!manifest) {
      const error = new Error('Theme preset not found');
      error.code = 'THEME_NOT_FOUND';
      throw error;
    }

    const [company, app, existingSettings] = await Promise.all([
      executeWithRetry(async () => {
        return await prisma.company.findUnique({
          where: { id: companyId },
          select: {
            id: true,
            name: true,
            currency: true,
            settings: true,
          },
        });
      }),
      executeWithRetry(async () => {
        return await prisma.marketplaceApp.findUnique({
          where: { slug: normalizedThemeId },
          select: {
            id: true,
            slug: true,
            name: true,
            category: true,
            pricingModel: true,
            monthlyPrice: true,
            yearlyPrice: true,
            trialDays: true,
            isActive: true,
            isPublic: true,
          },
        });
      }),
      executeWithRetry(async () => {
        return await prisma.storefrontSettings.findUnique({
          where: { companyId },
          select: {
            companyId: true,
            supportedLanguages: true,
            designTokens: true,
          },
        });
      }),
    ]);

    if (!company) {
      const error = new Error('Company not found');
      error.code = 'COMPANY_NOT_FOUND';
      throw error;
    }

    if (!app || app.category !== THEME_CATEGORY) {
      const error = new Error('Theme preset not found');
      error.code = 'THEME_NOT_FOUND';
      throw error;
    }

    const existingInstallation = await executeWithRetry(async () => {
      return await prisma.companyApp.findUnique({
        where: {
          companyId_appId: {
            companyId,
            appId: app.id,
          },
        },
        select: {
          id: true,
          status: true,
          activePricingModel: true,
          trialEndsAt: true,
          validUntil: true,
          nextBillingAt: true,
          settings: true,
        },
      });
    });

    if (!app.isActive || !app.isPublic) {
      const error = new Error('Theme is not available for activation');
      error.code = 'THEME_UNAVAILABLE';
      throw error;
    }

    const finalPricingModel = normalizePricingModel(
      app.pricingModel,
      toSafeNumber(app.monthlyPrice, 0) > 0 ? 'ONE_TIME' : DEFAULT_PRICING_MODEL,
    );
    const finalStoredPricingModel = toStoredPricingModel(finalPricingModel);
    const purchaseAmount = getThemePurchaseAmount(app);

    if (!isPaidThemePricingModel(finalPricingModel) || purchaseAmount <= 0) {
      const error = new Error('Theme does not require a paid purchase');
      error.code = 'THEME_FREE';
      throw error;
    }

    if (isOwnedInstallation(existingInstallation)) {
      const currentThemeId =
        typeof existingSettings?.designTokens?.themeId === 'string'
          ? existingSettings.designTokens.themeId.trim()
          : '';
      const catalog = await this.getCompanyCatalog({
        companyId,
        currentThemeId,
        includeUnavailable: true,
      });

      return {
        theme: catalog.find((item) => item.themeId === normalizedThemeId) || null,
        catalog,
        installation: serializeInstallation(existingInstallation),
        wallet: null,
      };
    }

    const transactionResult = await executeWithRetry(async () => {
      return await prisma.$transaction(async (tx) => {
        const marketplaceApp = await tx.marketplaceApp.findUnique({
          where: { slug: normalizedThemeId },
          select: {
            id: true,
          },
        });

        if (!marketplaceApp?.id) {
          const error = new Error('Theme preset not found');
          error.code = 'THEME_NOT_FOUND';
          throw error;
        }

        let wallet = await tx.companyWallet.findUnique({
          where: { companyId },
        });

        if (!wallet) {
          wallet = await tx.companyWallet.create({
            data: {
              companyId,
              balance: 0,
              currency: normalizeText(company.currency, DEFAULT_THEME_CURRENCY),
            },
          });
        }

        if (Number(wallet.balance) < purchaseAmount) {
          const error = new Error(
            `رصيد المحفظة غير كافٍ. المطلوب: ${purchaseAmount} ${wallet.currency}، المتوفر: ${wallet.balance} ${wallet.currency}`,
          );
          error.code = 'INSUFFICIENT_WALLET_BALANCE';
          error.requiredAmount = purchaseAmount;
          error.currentBalance = Number(wallet.balance);
          error.currency = wallet.currency;
          throw error;
        }

        const existingCompanyApp = await tx.companyApp.findUnique({
          where: {
            companyId_appId: {
              companyId,
              appId: marketplaceApp.id,
            },
          },
          select: {
            id: true,
            status: true,
            activePricingModel: true,
            trialEndsAt: true,
            validUntil: true,
            nextBillingAt: true,
            settings: true,
          },
        });

        const walletReferenceId = `THEME_PURCHASE_${normalizedThemeId}_${Date.now()}`;
        const updatedWallet = await tx.companyWallet.update({
          where: { companyId },
          data: {
            balance: { decrement: purchaseAmount },
            totalSpent: { increment: purchaseAmount },
          },
        });

        const transaction = await tx.transaction.create({
          data: {
            walletId: wallet.id,
            type: 'PAYMENT',
            status: 'COMPLETED',
            amount: purchaseAmount,
            description: `شراء قالب المتجر: ${app.name}`,
            referenceId: walletReferenceId,
          },
        });

        const nextInstallationSettings = {
          ...(isRecord(existingCompanyApp?.settings) ? existingCompanyApp.settings : {}),
          source: 'storefront-theme-marketplace',
          themeId: normalizedThemeId,
          purchasedAt: new Date().toISOString(),
          purchaseAmount,
          purchaseCurrency: normalizeText(wallet.currency, DEFAULT_THEME_CURRENCY),
          walletTransactionId: transaction.id,
          walletReferenceId,
          activatedAt: new Date().toISOString(),
        };

        let installation;
        if (existingCompanyApp) {
          installation = await tx.companyApp.update({
            where: { id: existingCompanyApp.id },
            data: {
              activePricingModel: finalStoredPricingModel,
              status: 'ACTIVE',
              trialEndsAt: null,
              validUntil: null,
              nextBillingAt: null,
              settings: nextInstallationSettings,
              updatedAt: new Date(),
            },
          });
        } else {
          installation = await tx.companyApp.create({
            data: {
              companyId,
              appId: marketplaceApp.id,
              activePricingModel: finalStoredPricingModel,
              status: 'ACTIVE',
              trialEndsAt: null,
              validUntil: null,
              nextBillingAt: null,
              settings: nextInstallationSettings,
            },
          });

          await tx.marketplaceApp.update({
            where: { id: marketplaceApp.id },
            data: {
              installCount: { increment: 1 },
            },
          });
        }

        if (typeof tx.billingHistory?.create === 'function') {
          await tx.billingHistory.create({
            data: {
              companyId,
              type: 'MARKETPLACE_PURCHASE',
              amount: purchaseAmount,
              description: `شراء قالب المتجر: ${app.name}`,
              status: 'SUCCESS',
              referenceId: walletReferenceId,
            },
          });
        }

        return {
          installation,
          wallet: updatedWallet,
        };
      });
    });

    const currentThemeId =
      typeof existingSettings?.designTokens?.themeId === 'string'
        ? existingSettings.designTokens.themeId.trim()
        : '';
    const catalog = await this.getCompanyCatalog({
      companyId,
      currentThemeId,
      includeUnavailable: true,
    });
    const purchasedTheme = catalog.find((item) => item.themeId === normalizedThemeId) || null;

    return {
      theme: purchasedTheme,
      catalog,
      installation: serializeInstallation(transactionResult.installation),
      wallet: transactionResult.wallet
        ? {
            balance: normalizePrice(transactionResult.wallet.balance, 0),
            currency: normalizeText(
              transactionResult.wallet.currency,
              DEFAULT_THEME_CURRENCY,
            ),
          }
        : null,
    };
  }

  async applyThemeForCompany(
    themeId,
    {
      companyId = '',
    } = {},
  ) {
    const normalizedThemeId = normalizeText(themeId);
    if (!normalizedThemeId) {
      const error = new Error('Theme id is required');
      error.code = 'THEME_ID_REQUIRED';
      throw error;
    }

    if (!companyId) {
      const error = new Error('Company context is required');
      error.code = 'COMPANY_REQUIRED';
      throw error;
    }

    await this.ensureCatalogSynced();
    const prisma = await getSharedPrismaClientAsync();
    const manifests = await this.loadPresetManifests();
    const manifest = manifests.find((item) => item.id === normalizedThemeId);

    if (!manifest) {
      const error = new Error('Theme preset not found');
      error.code = 'THEME_NOT_FOUND';
      throw error;
    }

    const [company, app, existingSettings] = await Promise.all([
      executeWithRetry(async () => {
        return await prisma.company.findUnique({
          where: { id: companyId },
          select: {
            id: true,
            name: true,
            currency: true,
            settings: true,
          },
        });
      }),
      executeWithRetry(async () => {
        return await prisma.marketplaceApp.findUnique({
          where: { slug: normalizedThemeId },
          select: {
            id: true,
            slug: true,
            name: true,
            category: true,
            pricingModel: true,
            monthlyPrice: true,
            yearlyPrice: true,
            trialDays: true,
            isActive: true,
            isPublic: true,
          },
        });
      }),
      executeWithRetry(async () => {
        return await prisma.storefrontSettings.findUnique({
          where: { companyId },
          select: {
            companyId: true,
            supportedLanguages: true,
            designTokens: true,
          },
        });
      }),
    ]);

    if (!company) {
      const error = new Error('Company not found');
      error.code = 'COMPANY_NOT_FOUND';
      throw error;
    }

    if (!app || app.category !== THEME_CATEGORY) {
      const error = new Error('Theme preset not found');
      error.code = 'THEME_NOT_FOUND';
      throw error;
    }

    const existingInstallation = await executeWithRetry(async () => {
      return await prisma.companyApp.findUnique({
        where: {
          companyId_appId: {
            companyId,
            appId: app.id,
          },
        },
        select: {
          id: true,
          status: true,
          activePricingModel: true,
          trialEndsAt: true,
          validUntil: true,
          nextBillingAt: true,
          settings: true,
        },
      });
    });

    if (!app.isActive || !app.isPublic) {
      const error = new Error('Theme is not available for activation');
      error.code = 'THEME_UNAVAILABLE';
      throw error;
    }

    const finalPricingModel = normalizePricingModel(
      app.pricingModel,
      toSafeNumber(app.monthlyPrice, 0) > 0 ? 'ONE_TIME' : DEFAULT_PRICING_MODEL,
    );
    const finalStoredPricingModel = toStoredPricingModel(finalPricingModel);
    const requiresPurchase =
      isPaidThemePricingModel(finalPricingModel) && !isOwnedInstallation(existingInstallation);

    if (requiresPurchase) {
      const error = new Error('Theme purchase is required before applying');
      error.code = 'THEME_PURCHASE_REQUIRED';
      throw error;
    }

    const currentDesignTokens =
      isRecord(existingSettings?.designTokens) ? existingSettings.designTokens : {};
    const parsedCompanySettings = (() => {
      try {
        return company.settings ? JSON.parse(company.settings) : {};
      } catch {
        return {};
      }
    })();
    const nextDesignTokens = normalizeThemeDesignTokens(currentDesignTokens, {
      themeId: normalizedThemeId,
      company,
      manifest,
    });
    const shouldStartTrial =
      finalPricingModel === 'FREE' &&
      !existingInstallation &&
      Math.max(0, Math.floor(toSafeNumber(app.trialDays, 0))) > 0;
    const nextTrialEndsAt = shouldStartTrial
      ? new Date(
          Date.now() + Math.max(0, Math.floor(toSafeNumber(app.trialDays, 0))) * ONE_DAY_MS,
        )
      : null;
    const nextStatus = shouldStartTrial ? 'TRIAL' : 'ACTIVE';

    const transactionResult = await executeWithRetry(async () => {
      return await prisma.$transaction(async (tx) => {
        const marketplaceApp = await tx.marketplaceApp.findUnique({
          where: { slug: normalizedThemeId },
          select: {
            id: true,
          },
        });

        if (!marketplaceApp?.id) {
          const error = new Error('Theme preset not found');
          error.code = 'THEME_NOT_FOUND';
          throw error;
        }

        const existingCompanyApp = await tx.companyApp.findUnique({
          where: {
            companyId_appId: {
              companyId,
              appId: marketplaceApp.id,
            },
          },
          select: {
            id: true,
            settings: true,
          },
        });

        const nextInstallationSettings = {
          ...(isRecord(existingCompanyApp?.settings) ? existingCompanyApp.settings : {}),
          source: existingCompanyApp ? 'storefront-theme-catalog' : 'storefront-theme-free',
          themeId: normalizedThemeId,
          activatedAt: new Date().toISOString(),
        };

        let installation;
        if (existingCompanyApp) {
          installation = await tx.companyApp.update({
            where: { id: existingCompanyApp.id },
            data: {
              activePricingModel: finalStoredPricingModel,
              status: nextStatus,
              trialEndsAt: nextTrialEndsAt,
              validUntil: null,
              nextBillingAt: null,
              settings: nextInstallationSettings,
              updatedAt: new Date(),
            },
          });
        } else {
          installation = await tx.companyApp.create({
            data: {
              companyId,
              appId: marketplaceApp.id,
              activePricingModel: finalStoredPricingModel,
              status: nextStatus,
              trialEndsAt: nextTrialEndsAt,
              validUntil: null,
              nextBillingAt: null,
              settings: nextInstallationSettings,
            },
          });

          await tx.marketplaceApp.update({
            where: { id: marketplaceApp.id },
            data: {
              installCount: { increment: 1 },
            },
          });
        }

        const settings = await tx.storefrontSettings.upsert({
          where: { companyId },
          update: {
            designTokens: nextDesignTokens,
          },
          create: {
            companyId,
            supportedLanguages:
              normalizeText(existingSettings?.supportedLanguages, DEFAULT_SUPPORTED_LANGUAGES),
            designTokens: nextDesignTokens,
          },
        });

        return {
          installation,
          settings,
        };
      });
    });

    const catalog = await this.getCompanyCatalog({
      companyId,
      currentThemeId: normalizedThemeId,
      includeUnavailable: true,
    });
    const activatedTheme = catalog.find((item) => item.themeId === normalizedThemeId) || null;

    return {
      theme: activatedTheme,
      catalog,
      installation: serializeInstallation(transactionResult.installation),
      settings: {
        ...transactionResult.settings,
        companyId: company.id,
        storeName: company.name,
        description: normalizeText(parsedCompanySettings.description),
        currency: normalizeText(company.currency, DEFAULT_THEME_CURRENCY),
        themeId: normalizedThemeId,
        designTokens: nextDesignTokens,
      },
    };
  }

  async activateThemeForCompany(themeId, options = {}) {
    return this.applyThemeForCompany(themeId, options);
  }

  async ensureThemeSelection(themeId, { currentThemeId = '', companyId = '' } = {}) {
    const normalizedThemeId = normalizeText(themeId);
    const items = companyId
      ? await this.getCompanyCatalog({
          companyId,
          currentThemeId,
          includeUnavailable: true,
        })
      : await this.getCompanyCatalog({
          currentThemeId,
          includeUnavailable: true,
        });
    const matched = items.find((item) => item.themeId === normalizedThemeId);

    if (!matched) {
      return {
        ok: false,
        reason: 'not_found',
      };
    }

    if (!matched.canSelect && normalizedThemeId !== currentThemeId) {
      return {
        ok: false,
        reason: matched.canPurchase
          ? 'purchase_required'
          : matched.canActivate
            ? 'activation_required'
            : 'inactive',
        item: matched,
      };
    }

    return {
      ok: true,
      item: matched,
    };
  }
}

module.exports = {
  THEME_CATEGORY,
  DEFAULT_STOREFRONT_THEME_ID,
  DEFAULT_THEME_CURRENCY,
  resolveThemePresetsDirectory,
  storefrontThemeCatalogService: new StorefrontThemeCatalogService(),
};
