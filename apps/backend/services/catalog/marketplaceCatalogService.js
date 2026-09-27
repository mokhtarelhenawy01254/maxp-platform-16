const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const { assertValidMarketplaceCatalog } = require("./marketplaceCatalogValidator");

const DEFAULT_CACHE_TTL_MS = 30 * 1000;

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function normalizeDateIso(value) {
  if (typeof value === "string" && !Number.isNaN(Date.parse(value))) return value;
  return new Date().toISOString();
}

class MarketplaceCatalogService {
  constructor(options = {}) {
    this.catalogRoot =
      options.catalogRoot ||
      process.env.MARKETPLACE_CATALOG_DIR ||
      path.resolve(__dirname, "../../catalog/marketplace");
    this.cacheTtlMs = options.cacheTtlMs || parsePositiveInt(process.env.MARKETPLACE_CATALOG_CACHE_MS, DEFAULT_CACHE_TTL_MS);

    this._snapshot = null;
    this._loadedAtMs = 0;
  }

  getCatalogRoot() {
    return this.catalogRoot;
  }

  clearCache() {
    this._snapshot = null;
    this._loadedAtMs = 0;
  }

  async _readJson(filePath) {
    const raw = await fs.readFile(filePath, "utf8");
    try {
      return JSON.parse(raw);
    } catch (error) {
      const parseError = new Error(`Failed parsing JSON file: ${filePath}`);
      parseError.code = "MARKETPLACE_CATALOG_JSON_PARSE_ERROR";
      parseError.cause = error;
      throw parseError;
    }
  }

  _computeHash(snapshotSource) {
    return crypto.createHash("sha256").update(JSON.stringify(snapshotSource)).digest("hex");
  }

  _sortApps(apps, sort) {
    const list = [...apps];
    switch (sort) {
      case "featured":
        list.sort((a, b) => {
          if (a.isFeatured !== b.isFeatured) return Number(b.isFeatured) - Number(a.isFeatured);
          if (a.isPopular !== b.isPopular) return Number(b.isPopular) - Number(a.isPopular);
          return a.slug.localeCompare(b.slug);
        });
        break;
      case "popular":
        list.sort((a, b) => (b.installCount || 0) - (a.installCount || 0));
        break;
      case "price_low":
        list.sort((a, b) => (a.monthlyPrice || 0) - (b.monthlyPrice || 0));
        break;
      case "price_high":
        list.sort((a, b) => (b.monthlyPrice || 0) - (a.monthlyPrice || 0));
        break;
      case "newest":
        list.sort((a, b) => Date.parse(b.createdAt || 0) - Date.parse(a.createdAt || 0));
        break;
      default:
        list.sort((a, b) => a.slug.localeCompare(b.slug));
    }
    return list;
  }

  _normalizePaging(page, limit) {
    const safePage = Math.max(1, parsePositiveInt(page, 1));
    const rawLimit = Math.max(1, parsePositiveInt(limit, 20));
    const safeLimit = Math.min(rawLimit, 200);
    return { page: safePage, limit: safeLimit };
  }

  _withDefaultsForApp(app) {
    return {
      id: String(app.id),
      slug: String(app.slug),
      name: String(app.name),
      nameEn: app.nameEn || null,
      description: String(app.description || ""),
      category: String(app.category),
      pricingModel: String(app.pricingModel),
      monthlyPrice: Number(app.monthlyPrice || 0),
      yearlyPrice: Number(app.yearlyPrice || 0),
      unitPrice: app.unitPrice === null || app.unitPrice === undefined ? null : Number(app.unitPrice),
      unitName: app.unitName || null,
      ppuBillingMethod: app.ppuBillingMethod || null,
      trialDays: Number(app.trialDays || 0),
      requiredApps: Array.isArray(app.requiredApps) ? app.requiredApps : [],
      features: app.features && typeof app.features === "object" ? app.features : {},
      positioning:
        app.positioning && typeof app.positioning === "object" && !Array.isArray(app.positioning)
          ? app.positioning
          : null,
      isActive: Boolean(app.isActive),
      isPublic: Boolean(app.isPublic),
      isFeatured: Boolean(app.isFeatured),
      isPopular: Boolean(app.isPopular),
      icon: app.icon || null,
      logo: app.logo || null,
      coverImage: app.coverImage || null,
      engineCompatibility: app.engineCompatibility || null,
      mainRoute: app.mainRoute || null,
      adminRoute: app.adminRoute || null,
      createdAt: normalizeDateIso(app.createdAt),
      updatedAt: normalizeDateIso(app.updatedAt),
      installCount: Number(app.installCount || 0),
      rating: Number(app.rating || 0),
      reviewCount: Number(app.reviewCount || 0)
    };
  }

  _withDefaultsForBundle(bundle) {
    return {
      id: String(bundle.id),
      slug: String(bundle.slug),
      name: String(bundle.name),
      nameEn: bundle.nameEn || null,
      description: String(bundle.description || ""),
      monthlyPrice: Number(bundle.monthlyPrice || 0),
      yearlyPrice: bundle.yearlyPrice === null || bundle.yearlyPrice === undefined ? null : Number(bundle.yearlyPrice),
      discount: Number(bundle.discount || 0),
      isActive: Boolean(bundle.isActive),
      isFeatured: Boolean(bundle.isFeatured),
      appSlugs: Array.isArray(bundle.appSlugs) ? bundle.appSlugs : [],
      createdAt: normalizeDateIso(bundle.createdAt),
      updatedAt: normalizeDateIso(bundle.updatedAt)
    };
  }

  async _loadFromDisk() {
    const indexPath = path.join(this.catalogRoot, "index.json");
    const indexData = await this._readJson(indexPath);

    const appsPath = path.join(this.catalogRoot, indexData.appsFile || "apps.json");
    const bundlesPath = path.join(this.catalogRoot, indexData.bundlesFile || "bundles.json");
    const categoriesPath = path.join(this.catalogRoot, indexData.categoriesFile || "categories.json");

    const [appsData, bundlesData, categoriesData] = await Promise.all([
      this._readJson(appsPath),
      this._readJson(bundlesPath),
      this._readJson(categoriesPath)
    ]);

    const snapshotSource = {
      meta: {
        schemaVersion: indexData.schemaVersion || 1,
        catalogVersion: indexData.catalogVersion || "unknown",
        generatedAt: normalizeDateIso(indexData.generatedAt)
      },
      apps: Array.isArray(appsData) ? appsData.map((app) => this._withDefaultsForApp(app)) : [],
      bundles: Array.isArray(bundlesData) ? bundlesData.map((bundle) => this._withDefaultsForBundle(bundle)) : [],
      categories: Array.isArray(categoriesData) ? categoriesData : []
    };

    const validation = assertValidMarketplaceCatalog(snapshotSource, this.catalogRoot);

    return {
      ...snapshotSource,
      hash: this._computeHash(snapshotSource),
      loadedAt: new Date().toISOString(),
      validation
    };
  }

  async getSnapshot(options = {}) {
    const forceReload = Boolean(options.forceReload);
    const now = Date.now();
    const isCacheValid = this._snapshot && now - this._loadedAtMs <= this.cacheTtlMs;

    if (!forceReload && isCacheValid) {
      return this._snapshot;
    }

    const snapshot = await this._loadFromDisk();
    this._snapshot = snapshot;
    this._loadedAtMs = now;
    return snapshot;
  }

  async getAllApps(options = {}) {
    const snapshot = await this.getSnapshot();
    const { page, limit } = this._normalizePaging(options.page, options.limit);
    const category = options.category;
    const search = typeof options.search === "string" ? options.search.trim().toLowerCase() : "";
    const sort = options.sort || "featured";
    const onlyActive = options.onlyActive !== false;
    const onlyPublic = options.onlyPublic !== false;

    let apps = snapshot.apps;

    if (onlyActive) apps = apps.filter((app) => app.isActive);
    if (onlyPublic) apps = apps.filter((app) => app.isPublic);
    if (category) apps = apps.filter((app) => app.category === category);
    if (search) {
      apps = apps.filter((app) => {
        return (
          app.name.toLowerCase().includes(search) ||
          (app.nameEn || "").toLowerCase().includes(search) ||
          app.description.toLowerCase().includes(search)
        );
      });
    }

    apps = this._sortApps(apps, sort);

    const total = apps.length;
    const offset = (page - 1) * limit;
    const data = apps.slice(offset, offset + limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      meta: {
        catalogVersion: snapshot.meta.catalogVersion,
        catalogHash: snapshot.hash
      }
    };
  }

  async getAppBySlug(slug, options = {}) {
    if (!slug) return null;
    const snapshot = await this.getSnapshot();
    const onlyActive = options.onlyActive !== false;
    const onlyPublic = options.onlyPublic !== false;

    const app = snapshot.apps.find((item) => item.slug === slug);
    if (!app) return null;
    if (onlyActive && !app.isActive) return null;
    if (onlyPublic && !app.isPublic) return null;
    return app;
  }

  async getAllBundles(options = {}) {
    const snapshot = await this.getSnapshot();
    const onlyActive = options.onlyActive !== false;

    const appsBySlug = new Map(snapshot.apps.map((app) => [app.slug, app]));
    let bundles = snapshot.bundles;
    if (onlyActive) bundles = bundles.filter((bundle) => bundle.isActive);

    bundles = [...bundles].sort((a, b) => {
      if (a.isFeatured !== b.isFeatured) return Number(b.isFeatured) - Number(a.isFeatured);
      return a.slug.localeCompare(b.slug);
    });

    const data = bundles.map((bundle) => {
      const apps = bundle.appSlugs
        .map((slug) => appsBySlug.get(slug))
        .filter(Boolean)
        .map((app) => ({
          id: app.id,
          slug: app.slug,
          name: app.name,
          description: app.description,
          monthlyPrice: app.monthlyPrice,
          logo: app.logo
        }));

      return {
        ...bundle,
        appIds: apps.map((app) => app.id),
        apps
      };
    });

    return {
      data,
      meta: {
        catalogVersion: snapshot.meta.catalogVersion,
        catalogHash: snapshot.hash
      }
    };
  }

  async getBundleBySlug(slug, options = {}) {
    if (!slug) return null;
    const allBundles = await this.getAllBundles(options);
    return allBundles.data.find((bundle) => bundle.slug === slug) || null;
  }

  async getCategories(options = {}) {
    const snapshot = await this.getSnapshot();
    const onlyActive = options.onlyActive !== false;
    const onlyPublic = options.onlyPublic !== false;

    let apps = snapshot.apps;
    if (onlyActive) apps = apps.filter((app) => app.isActive);
    if (onlyPublic) apps = apps.filter((app) => app.isPublic);

    const counts = new Map();
    apps.forEach((app) => {
      counts.set(app.category, (counts.get(app.category) || 0) + 1);
    });

    const metaByCategory = new Map(
      (snapshot.categories || []).map((category) => [category.category, category])
    );

    const allCategories = new Set([
      ...Array.from(counts.keys()),
      ...Array.from(metaByCategory.keys())
    ]);

    const data = Array.from(allCategories).map((categoryKey) => {
      const meta = metaByCategory.get(categoryKey) || {};
      return {
        category: categoryKey,
        name: meta.name || categoryKey,
        nameEn: meta.nameEn || categoryKey,
        iconKey: meta.iconKey || "Package",
        count: counts.get(categoryKey) || 0
      };
    });

    data.sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));

    return {
      data,
      meta: {
        catalogVersion: snapshot.meta.catalogVersion,
        catalogHash: snapshot.hash
      }
    };
  }

  async updateAppFile(slug, updateData) {
    if (!slug || !updateData || typeof updateData !== "object") {
      return { success: false, reason: "invalid_arguments" };
    }
    const appsFilePath = path.join(this.catalogRoot, "apps.json");
    try {
      const apps = await this._readJson(appsFilePath);
      const appIndex = apps.findIndex((a) => a.slug === slug);
      if (appIndex === -1) {
        return { success: false, reason: "app_not_in_catalog" };
      }

      const app = apps[appIndex];
      const ALLOWED_UPDATE_FIELDS = [
        "name", "nameEn", "description", "category", "pricingModel",
        "monthlyPrice", "yearlyPrice", "unitPrice", "unitName", "ppuBillingMethod",
        "trialDays", "isActive", "isPublic", "isFeatured", "isPopular",
        "features", "requiredApps"
      ];

      let modified = false;
      ALLOWED_UPDATE_FIELDS.forEach((field) => {
        if (field in updateData && updateData[field] !== undefined) {
          if (JSON.stringify(app[field]) !== JSON.stringify(updateData[field])) {
            app[field] = updateData[field];
            modified = true;
          }
        }
      });

      if (modified) {
        app.updatedAt = new Date().toISOString();
        await fs.writeFile(appsFilePath, JSON.stringify(apps, null, 2) + "\n", "utf8");
        this.clearCache();
      }

      return { success: true, modified };
    } catch (err) {
      console.warn(`[catalog:updateAppFile] Could not sync app ${slug} to apps.json:`, err.message);
      return { success: false, reason: "fs_error", error: err.message };
    }
  }
}

const marketplaceCatalogService = new MarketplaceCatalogService();

module.exports = {
  MarketplaceCatalogService,
  marketplaceCatalogService
};
