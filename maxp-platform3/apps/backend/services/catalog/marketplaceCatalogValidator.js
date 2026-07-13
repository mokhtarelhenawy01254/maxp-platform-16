const PRICING_MODELS = new Set(["FREE", "SUBSCRIPTION", "PAY_PER_USE"]);
const FEATURE_ACCESS_KINDS = new Set(["FREE", "PAID", "PAY_PER_USE"]);
const POSITIONING_FIELDS = ["audience", "surface", "outcome"];

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isBoolean(value) {
  return typeof value === "boolean";
}

function isNonNegativeNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isIsoDateString(value) {
  return isNonEmptyString(value) && !Number.isNaN(Date.parse(value));
}

function pushError(errors, path, message) {
  errors.push({ path, message });
}

function pushWarning(warnings, path, message) {
  warnings.push({ path, message });
}

function validateFeatureEntry(featureValue, path, errors, warnings) {
  if (isBoolean(featureValue)) {
    pushWarning(
      warnings,
      path,
      "boolean feature entries are supported for backward compatibility; prefer object entries with name/description/access"
    );
    return;
  }

  if (!isObject(featureValue)) {
    pushError(errors, path, "feature entry must be boolean or object");
    return;
  }

  if (featureValue.enabled !== undefined && !isBoolean(featureValue.enabled)) {
    pushError(errors, `${path}.enabled`, "enabled must be boolean when provided");
  }

  if (!isNonEmptyString(featureValue.name)) {
    pushWarning(warnings, `${path}.name`, "feature entry should include a non-empty name");
  }

  if (!isNonEmptyString(featureValue.description)) {
    pushWarning(warnings, `${path}.description`, "feature entry should include a non-empty description");
  }

  if (!isNonEmptyString(featureValue.access)) {
    pushWarning(warnings, `${path}.access`, "feature entry should include access: FREE | PAID | PAY_PER_USE");
  } else if (!FEATURE_ACCESS_KINDS.has(featureValue.access)) {
    pushError(
      errors,
      `${path}.access`,
      `access must be one of: ${Array.from(FEATURE_ACCESS_KINDS).join(", ")}`
    );
  }
}

function validatePositioningShape(positioning, path, errors, warnings) {
  if (positioning === undefined || positioning === null) {
    pushWarning(
      warnings,
      path,
      "app should include positioning metadata for audience/surface/outcome"
    );
    return;
  }

  if (!isObject(positioning)) {
    pushError(errors, path, "positioning must be an object when provided");
    return;
  }

  POSITIONING_FIELDS.forEach((field) => {
    if (!isNonEmptyString(positioning[field])) {
      pushWarning(
        warnings,
        `${path}.${field}`,
        `${field} should be a non-empty string`
      );
    }
  });
}

function validateAppShape(app, index, errors, warnings) {
  const basePath = `apps[${index}]`;

  if (!isObject(app)) {
    pushError(errors, basePath, "app entry must be an object");
    return;
  }

  const requiredStrings = ["id", "slug", "name", "description", "category", "pricingModel"];
  requiredStrings.forEach((field) => {
    if (!isNonEmptyString(app[field])) {
      pushError(errors, `${basePath}.${field}`, `${field} is required and must be a non-empty string`);
    }
  });

  if (!PRICING_MODELS.has(app.pricingModel)) {
    pushError(
      errors,
      `${basePath}.pricingModel`,
      `pricingModel must be one of: ${Array.from(PRICING_MODELS).join(", ")}`
    );
  }

  const numericFields = ["monthlyPrice", "yearlyPrice", "trialDays"];
  numericFields.forEach((field) => {
    if (!isNonNegativeNumber(app[field])) {
      pushError(errors, `${basePath}.${field}`, `${field} must be a non-negative number`);
    }
  });

  if (app.unitPrice !== null && app.unitPrice !== undefined && !isNonNegativeNumber(app.unitPrice)) {
    pushError(errors, `${basePath}.unitPrice`, "unitPrice must be null or a non-negative number");
  }

  if (app.unitName !== null && app.unitName !== undefined && typeof app.unitName !== "string") {
    pushError(errors, `${basePath}.unitName`, "unitName must be null or string");
  }

  const requiredBooleans = ["isActive", "isPublic", "isFeatured", "isPopular"];
  requiredBooleans.forEach((field) => {
    if (!isBoolean(app[field])) {
      pushError(errors, `${basePath}.${field}`, `${field} must be boolean`);
    }
  });

  if (!Array.isArray(app.requiredApps)) {
    pushError(errors, `${basePath}.requiredApps`, "requiredApps must be an array");
  } else {
    app.requiredApps.forEach((item, requiredIndex) => {
      if (!isNonEmptyString(item)) {
        pushError(
          errors,
          `${basePath}.requiredApps[${requiredIndex}]`,
          "required app slug must be a non-empty string"
        );
      }
    });
  }

  if (!isObject(app.features)) {
    pushError(errors, `${basePath}.features`, "features must be an object");
  } else {
    Object.entries(app.features).forEach(([featureKey, featureValue]) => {
      validateFeatureEntry(
        featureValue,
        `${basePath}.features.${featureKey}`,
        errors,
        warnings
      );
    });
  }

  validatePositioningShape(app.positioning, `${basePath}.positioning`, errors, warnings);

  if (!isIsoDateString(app.createdAt)) {
    pushError(errors, `${basePath}.createdAt`, "createdAt must be an ISO date string");
  }
  if (!isIsoDateString(app.updatedAt)) {
    pushError(errors, `${basePath}.updatedAt`, "updatedAt must be an ISO date string");
  }

  if (app.pricingModel === "PAY_PER_USE" && !(app.unitPrice > 0)) {
    pushError(errors, `${basePath}.unitPrice`, "unitPrice must be > 0 for PAY_PER_USE apps");
  }

  if (app.pricingModel === "FREE") {
    const hasPaidValues = (app.monthlyPrice || 0) > 0 || (app.yearlyPrice || 0) > 0 || (app.unitPrice || 0) > 0;
    if (hasPaidValues) {
      pushWarning(
        warnings,
        basePath,
        "FREE app has paid fields (monthlyPrice/yearlyPrice/unitPrice) greater than zero"
      );
    }
  }

  if (app.pricingModel === "SUBSCRIPTION" && (app.monthlyPrice || 0) <= 0 && (app.yearlyPrice || 0) <= 0) {
    pushWarning(warnings, basePath, "SUBSCRIPTION app has both monthlyPrice and yearlyPrice equal to 0");
  }
}

function validateBundleShape(bundle, index, appSlugSet, errors, warnings) {
  const basePath = `bundles[${index}]`;

  if (!isObject(bundle)) {
    pushError(errors, basePath, "bundle entry must be an object");
    return;
  }

  const requiredStrings = ["id", "slug", "name", "description"];
  requiredStrings.forEach((field) => {
    if (!isNonEmptyString(bundle[field])) {
      pushError(errors, `${basePath}.${field}`, `${field} is required and must be a non-empty string`);
    }
  });

  if (!isNonNegativeNumber(bundle.monthlyPrice)) {
    pushError(errors, `${basePath}.monthlyPrice`, "monthlyPrice must be a non-negative number");
  }

  if (bundle.yearlyPrice !== null && bundle.yearlyPrice !== undefined && !isNonNegativeNumber(bundle.yearlyPrice)) {
    pushError(errors, `${basePath}.yearlyPrice`, "yearlyPrice must be null or a non-negative number");
  }

  if (!isNonNegativeNumber(bundle.discount)) {
    pushError(errors, `${basePath}.discount`, "discount must be a non-negative number");
  } else if (bundle.discount > 100) {
    pushWarning(warnings, `${basePath}.discount`, "discount is greater than 100");
  }

  if (!isBoolean(bundle.isActive)) {
    pushError(errors, `${basePath}.isActive`, "isActive must be boolean");
  }
  if (!isBoolean(bundle.isFeatured)) {
    pushError(errors, `${basePath}.isFeatured`, "isFeatured must be boolean");
  }

  if (!Array.isArray(bundle.appSlugs) || bundle.appSlugs.length === 0) {
    pushError(errors, `${basePath}.appSlugs`, "appSlugs must be a non-empty array");
  } else {
    const seen = new Set();
    bundle.appSlugs.forEach((slug, slugIndex) => {
      if (!isNonEmptyString(slug)) {
        pushError(errors, `${basePath}.appSlugs[${slugIndex}]`, "bundle app slug must be a non-empty string");
        return;
      }
      if (seen.has(slug)) {
        pushWarning(warnings, `${basePath}.appSlugs[${slugIndex}]`, `duplicate app slug "${slug}" in same bundle`);
      }
      seen.add(slug);
      if (!appSlugSet.has(slug)) {
        pushError(errors, `${basePath}.appSlugs[${slugIndex}]`, `unknown app slug reference "${slug}"`);
      }
    });
  }

  if (!isIsoDateString(bundle.createdAt)) {
    pushError(errors, `${basePath}.createdAt`, "createdAt must be an ISO date string");
  }
  if (!isIsoDateString(bundle.updatedAt)) {
    pushError(errors, `${basePath}.updatedAt`, "updatedAt must be an ISO date string");
  }
}

function validateCategoryShape(category, index, errors) {
  const basePath = `categories[${index}]`;

  if (!isObject(category)) {
    pushError(errors, basePath, "category entry must be an object");
    return;
  }

  ["category", "name", "nameEn", "iconKey"].forEach((field) => {
    if (!isNonEmptyString(category[field])) {
      pushError(errors, `${basePath}.${field}`, `${field} is required and must be a non-empty string`);
    }
  });
}

function validateMarketplaceCatalog(payload) {
  const errors = [];
  const warnings = [];

  if (!isObject(payload)) {
    return {
      valid: false,
      errors: [{ path: "catalog", message: "catalog payload must be an object" }],
      warnings: [],
      stats: { apps: 0, bundles: 0, categories: 0 }
    };
  }

  const apps = Array.isArray(payload.apps) ? payload.apps : [];
  const bundles = Array.isArray(payload.bundles) ? payload.bundles : [];
  const categories = Array.isArray(payload.categories) ? payload.categories : [];

  if (!Array.isArray(payload.apps)) {
    pushError(errors, "apps", "apps must be an array");
  }
  if (!Array.isArray(payload.bundles)) {
    pushError(errors, "bundles", "bundles must be an array");
  }
  if (!Array.isArray(payload.categories)) {
    pushError(errors, "categories", "categories must be an array");
  }

  const appSlugSet = new Set();

  apps.forEach((app, index) => {
    validateAppShape(app, index, errors, warnings);
    if (isObject(app) && isNonEmptyString(app.slug)) {
      if (appSlugSet.has(app.slug)) {
        pushError(errors, `apps[${index}].slug`, `duplicate app slug "${app.slug}"`);
      } else {
        appSlugSet.add(app.slug);
      }
    }
  });

  apps.forEach((app, index) => {
    if (!isObject(app) || !Array.isArray(app.requiredApps)) {
      return;
    }
    app.requiredApps.forEach((requiredSlug, requiredIndex) => {
      if (isNonEmptyString(requiredSlug) && !appSlugSet.has(requiredSlug)) {
        pushError(
          errors,
          `apps[${index}].requiredApps[${requiredIndex}]`,
          `unknown required app slug "${requiredSlug}"`
        );
      }
    });
  });

  const bundleSlugSet = new Set();
  bundles.forEach((bundle, index) => {
    validateBundleShape(bundle, index, appSlugSet, errors, warnings);
    if (isObject(bundle) && isNonEmptyString(bundle.slug)) {
      if (bundleSlugSet.has(bundle.slug)) {
        pushError(errors, `bundles[${index}].slug`, `duplicate bundle slug "${bundle.slug}"`);
      } else {
        bundleSlugSet.add(bundle.slug);
      }
    }
  });

  categories.forEach((category, index) => {
    validateCategoryShape(category, index, errors);
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: {
      apps: apps.length,
      bundles: bundles.length,
      categories: categories.length
    }
  };
}

function assertValidMarketplaceCatalog(payload, contextLabel = "marketplace-catalog") {
  const report = validateMarketplaceCatalog(payload);
  if (!report.valid) {
    const details = report.errors.map((error) => `${error.path}: ${error.message}`).join("\n");
    const failure = new Error(`[${contextLabel}] catalog validation failed\n${details}`);
    failure.code = "MARKETPLACE_CATALOG_INVALID";
    failure.details = report;
    throw failure;
  }
  return report;
}

module.exports = {
  PRICING_MODELS,
  validateMarketplaceCatalog,
  assertValidMarketplaceCatalog
};
