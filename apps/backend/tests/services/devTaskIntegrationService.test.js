const {
  DEV_TASK_API_SCOPES,
  extractKeyPrefix,
  generateDevTaskApiKey,
  normalizeDevTaskScopes
} = require('../../services/devTaskIntegrationService');

describe('devTaskIntegrationService', () => {
  test('defaults to dev task read/write scopes', () => {
    expect(normalizeDevTaskScopes(undefined)).toEqual(DEV_TASK_API_SCOPES);
  });

  test('filters invalid scopes and keeps explicit valid scopes', () => {
    expect(normalizeDevTaskScopes(['dev-tasks:read', 'unknown-scope'])).toEqual(['dev-tasks:read']);
  });

  test('returns no scopes when caller explicitly clears them', () => {
    expect(normalizeDevTaskScopes([])).toEqual([]);
  });

  test('generates dev task keys that can be authenticated by prefix', () => {
    const generated = generateDevTaskApiKey();

    expect(generated.rawKey).toMatch(/^dtk_[a-f0-9]+_[a-f0-9]+$/);
    expect(extractKeyPrefix(generated.rawKey)).toBe(generated.keyPrefix);
  });
});
