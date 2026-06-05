/**
 * @module intentFeatureFlags.test
 * @description Tests for intent feature flags.
 */

const {
  FEATURE_FLAGS,
  getFeatureFlag,
  getAllFeatureFlags,
  getEnvironment,
} = require('../../legacy-ai-agent/aiAgent/intentFeatureFlags');

describe('Intent Feature Flags', () => {
  describe('FEATURE_FLAGS', () => {
    test('has all required flags', () => {
      expect(FEATURE_FLAGS.USE_LLM_STRUCTURED_CLASSIFIER).toBeDefined();
      expect(FEATURE_FLAGS.CUSTOMER_INTENT_REGEX_FALLBACK).toBeDefined();
      expect(FEATURE_FLAGS.USE_EXEMPLAR_RETRIEVAL).toBeDefined();
      expect(FEATURE_FLAGS.ENABLE_PROVIDER_FALLBACK).toBeDefined();
      expect(FEATURE_FLAGS.ENABLE_VALIDATION_LAYER).toBeDefined();
      expect(FEATURE_FLAGS.ENABLE_MONITORING).toBeDefined();
    });

    test('CUSTOMER_INTENT_REGEX_FALLBACK is always false', () => {
      expect(FEATURE_FLAGS.CUSTOMER_INTENT_REGEX_FALLBACK.defaultValue).toBe(false);
      expect(FEATURE_FLAGS.CUSTOMER_INTENT_REGEX_FALLBACK.environments.development).toBe(false);
      expect(FEATURE_FLAGS.CUSTOMER_INTENT_REGEX_FALLBACK.environments.staging).toBe(false);
      expect(FEATURE_FLAGS.CUSTOMER_INTENT_REGEX_FALLBACK.environments.production).toBe(false);
      expect(FEATURE_FLAGS.CUSTOMER_INTENT_REGEX_FALLBACK.immutable).toBe(true);
    });
  });

  describe('getFeatureFlag', () => {
    test('returns default value for unknown flag', () => {
      const value = getFeatureFlag('UNKNOWN_FLAG');
      expect(value).toBe(false);
    });

    test('returns environment-specific value', () => {
      const env = getEnvironment();
      const value = getFeatureFlag('USE_LLM_STRUCTURED_CLASSIFIER');
      expect(typeof value).toBe('boolean');
    });

    test('respects environment variable override', () => {
      process.env.FEATURE_USE_LLM_STRUCTURED_CLASSIFIER = 'false';
      const value = getFeatureFlag('USE_LLM_STRUCTURED_CLASSIFIER');
      expect(value).toBe(false);
      delete process.env.FEATURE_USE_LLM_STRUCTURED_CLASSIFIER;
    });
  });

  describe('getAllFeatureFlags', () => {
    test('returns all flags with values', () => {
      const flags = getAllFeatureFlags();
      expect(Object.keys(flags).length).toBeGreaterThan(0);
      for (const [name, flag] of Object.entries(flags)) {
        expect(flag).toHaveProperty('value');
        expect(flag).toHaveProperty('description');
        expect(flag).toHaveProperty('immutable');
      }
    });
  });

  describe('getEnvironment', () => {
    test('returns environment name', () => {
      const env = getEnvironment();
      expect(typeof env).toBe('string');
    });
  });
});
