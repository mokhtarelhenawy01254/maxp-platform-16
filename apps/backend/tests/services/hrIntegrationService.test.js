const {
  generateHrApiKey,
  extractKeyPrefix,
  hashHrApiKey,
  credentialHasScope,
  normalizeScopes,
  generateWebhookSignature,
  HR_API_SCOPES,
  HR_WEBHOOK_EVENTS
} = require('../../services/hrIntegrationService');

describe('HR Integration Service Unit Tests', () => {
  test('generateHrApiKey creates properly structured keys with hrk_ prefix', () => {
    const keyData = generateHrApiKey();
    expect(keyData).toBeDefined();
    expect(keyData.rawKey).toMatch(/^hrk_[a-f0-9]{16}_[a-f0-9]{48}$/);
    expect(keyData.keyPrefix).toMatch(/^hrk_[a-f0-9]{16}$/);
    expect(keyData.keyHash).toHaveLength(64); // SHA-256 hex
  });

  test('extractKeyPrefix extracts the public prefix correctly', () => {
    const { rawKey, keyPrefix } = generateHrApiKey();
    const extracted = extractKeyPrefix(rawKey);
    expect(extracted).toBe(keyPrefix);

    expect(extractKeyPrefix('invalid_key')).toBeNull();
    expect(extractKeyPrefix('tsk_12345678_abcdef')).toBeNull(); // Only hrk_ allowed
    expect(extractKeyPrefix(null)).toBeNull();
  });

  test('hashHrApiKey deterministically hashes raw keys', () => {
    const { rawKey, keyHash } = generateHrApiKey();
    const recomputed = hashHrApiKey(rawKey);
    expect(recomputed).toBe(keyHash);
  });

  test('credentialHasScope validates wildcards and granular permissions', () => {
    const credWithWildcard = { scopes: JSON.stringify(['*']) };
    expect(credentialHasScope(credWithWildcard, 'hr:employees:read')).toBe(true);
    expect(credentialHasScope(credWithWildcard, 'hr:attendance:ingest')).toBe(true);

    const credWithReadWrite = { scopes: JSON.stringify(['hr:employees:read', 'hr:attendance:ingest']) };
    expect(credentialHasScope(credWithReadWrite, 'hr:employees:read')).toBe(true);
    expect(credentialHasScope(credWithReadWrite, 'hr:attendance:ingest')).toBe(true);
    expect(credentialHasScope(credWithReadWrite, 'hr:payroll:read')).toBe(false);

    const credWithGeneralWrite = { scopes: JSON.stringify(['hr:write']) };
    expect(credentialHasScope(credWithGeneralWrite, 'hr:employees:write')).toBe(true);
  });

  test('normalizeScopes filters out invalid scopes and deduplicates', () => {
    const raw = ['hr:employees:read', 'INVALID_SCOPE', 'hr:employees:read', 'hr:attendance:ingest'];
    const normalized = normalizeScopes(raw);
    expect(normalized).toEqual(['hr:employees:read', 'hr:attendance:ingest']);

    expect(normalizeScopes(['*'])).toEqual(['*']);
  });

  test('generateWebhookSignature creates valid HMAC SHA-256 signature', () => {
    const payload = JSON.stringify({ event: 'hr.leave.requested', employeeId: 'emp_123' });
    const secret = 'super_secret_test_key_123';
    const sig = generateWebhookSignature(payload, secret);
    expect(sig).toHaveLength(64);

    expect(generateWebhookSignature(payload, null)).toBeNull();
  });

  test('Constants contain expected events and scopes', () => {
    expect(HR_API_SCOPES).toContain('hr:attendance:ingest');
    expect(HR_WEBHOOK_EVENTS).toContain('hr.attendance.punch_recorded');
    expect(HR_WEBHOOK_EVENTS).toContain('hr.leave.requested');
  });
});
