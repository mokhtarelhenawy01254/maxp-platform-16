const {
  AGENT_INBOX_DEFAULT_SCOPES,
  extractKeyPrefix,
  generateAgentInboxApiKey,
  normalizeScopes
} = require('../../services/taskIntegrationService');

describe('taskIntegrationService Agent Inbox scopes', () => {
  test('keeps task credentials defaulted to task scopes only', () => {
    expect(normalizeScopes(undefined)).toEqual(['tasks:read', 'tasks:write']);
  });

  test('accepts Agent Inbox scopes when explicitly requested', () => {
    expect(normalizeScopes(['facebook-inbox:read', 'facebook-inbox:evaluate'])).toEqual(
      AGENT_INBOX_DEFAULT_SCOPES
    );
  });

  test('generates Agent Inbox keys that can be authenticated by prefix', () => {
    const generated = generateAgentInboxApiKey();

    expect(generated.rawKey).toMatch(/^ain_[a-f0-9]+_[a-f0-9]+$/);
    expect(extractKeyPrefix(generated.rawKey)).toBe(generated.keyPrefix);
  });
});
