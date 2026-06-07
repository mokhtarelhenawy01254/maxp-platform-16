/**
 * @module intentFeatureFlags
 * @description Feature flags for intent classification system.
 * Controls gradual rollout and provides rollback capabilities.
 */

/**
 * Feature flags for intent classification.
 */
const FEATURE_FLAGS = {
  /**
   * Enable LLM structured classifier for customer channels.
   * When false, falls back to legacy classifier.
   */
  USE_LLM_STRUCTURED_CLASSIFIER: {
    defaultValue: true,
    description: 'Use LLM structured output for intent classification',
    environments: {
      development: true,
      staging: true,
      production: false, // Start disabled in production
    },
  },

  /**
   * Enable regex fallback for customer channels.
   * MUST always be false per project rules.
   */
  CUSTOMER_INTENT_REGEX_FALLBACK: {
    defaultValue: false,
    description: 'Allow regex fallback for customer intent detection',
    environments: {
      development: false,
      staging: false,
      production: false, // Always false
    },
    immutable: true, // Cannot be changed
  },

  /**
   * Enable few-shot exemplars from pgvector.
   */
  USE_EXEMPLAR_RETRIEVAL: {
    defaultValue: true,
    description: 'Retrieve few-shot exemplars for classification',
    environments: {
      development: true,
      staging: true,
      production: true,
    },
  },

  /**
   * Enable provider fallback (primary → fallback).
   */
  ENABLE_PROVIDER_FALLBACK: {
    defaultValue: true,
    description: 'Fall back to secondary provider if primary fails',
    environments: {
      development: true,
      staging: true,
      production: true,
    },
  },

  /**
   * Enable validation layer.
   */
  ENABLE_VALIDATION_LAYER: {
    defaultValue: true,
    description: 'Validate classification results before execution',
    environments: {
      development: true,
      staging: true,
      production: true,
    },
  },

  /**
   * Enable monitoring and metrics collection.
   */
  ENABLE_MONITORING: {
    defaultValue: true,
    description: 'Collect classification metrics for observability',
    environments: {
      development: true,
      staging: true,
      production: true,
    },
  },
};

/**
 * Get current environment.
 * @returns {string} Environment name
 */
function getEnvironment() {
  return process.env.NODE_ENV || 'development';
}

/**
 * Get feature flag value.
 * @param {string} flagName - Feature flag name
 * @param {string} [companyId] - Company ID for per-company overrides
 * @returns {boolean} Feature flag value
 */
function getFeatureFlag(flagName, companyId = null) {
  const flag = FEATURE_FLAGS[flagName];
  if (!flag) {
    console.warn(`[FEATURE-FLAG] Unknown flag: ${flagName}`);
    return false;
  }

  // Check for environment variable override
  const envVarName = `FEATURE_${flagName}`;
  if (process.env[envVarName] !== undefined) {
    return process.env[envVarName] === 'true';
  }

  // Check for company-specific override
  if (companyId) {
    const companyOverride = getCompanyFeatureFlag(companyId, flagName);
    if (companyOverride !== null) {
      return companyOverride;
    }
  }

  // Use environment default
  const env = getEnvironment();
  return flag.environments[env] ?? flag.defaultValue;
}

/**
 * Get company-specific feature flag override.
 * @param {string} companyId - Company ID
 * @param {string} flagName - Feature flag name
 * @returns {boolean|null} Override value or null
 */
function getCompanyFeatureFlag(companyId, flagName) {
  // This could be loaded from database in production
  // For now, return null (no override)
  return null;
}

/**
 * Set company-specific feature flag override.
 * @param {string} companyId - Company ID
 * @param {string} flagName - Feature flag name
 * @param {boolean} value - Override value
 */
function setCompanyFeatureFlag(companyId, flagName, value) {
  const flag = FEATURE_FLAGS[flagName];
  if (!flag) {
    console.warn(`[FEATURE-FLAG] Unknown flag: ${flagName}`);
    return;
  }

  if (flag.immutable) {
    console.warn(`[FEATURE-FLAG] Cannot modify immutable flag: ${flagName}`);
    return;
  }

  // In production, this would save to database
  console.log(`[FEATURE-FLAG] Set ${flagName} = ${value} for company ${companyId}`);
}

/**
 * Get all feature flags with their current values.
 * @param {string} [companyId] - Company ID
 * @returns {Object} All feature flags
 */
function getAllFeatureFlags(companyId = null) {
  const flags = {};
  for (const [name, flag] of Object.entries(FEATURE_FLAGS)) {
    flags[name] = {
      value: getFeatureFlag(name, companyId),
      description: flag.description,
      immutable: flag.immutable || false,
    };
  }
  return flags;
}

module.exports = {
  FEATURE_FLAGS,
  getFeatureFlag,
  setCompanyFeatureFlag,
  getAllFeatureFlags,
  getEnvironment,
};
