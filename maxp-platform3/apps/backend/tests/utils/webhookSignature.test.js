const crypto = require('crypto');
const {
  shouldStrictlyEnforceMetaWebhookSignature,
  verifyMetaWebhookSignature,
} = require('../../utils/webhookSignature');

describe('webhookSignature helper', () => {
  const payload = JSON.stringify({
    object: 'page',
    entry: [{ id: 'page-1' }],
  });

  test('rejects requests when the secret is missing', () => {
    const result = verifyMetaWebhookSignature(
      {
        headers: {},
        rawBody: payload,
      },
      '',
    );

    expect(result).toEqual({
      ok: false,
      reason: 'missing_secret',
    });
  });

  test('rejects requests when the raw body is unavailable', () => {
    const result = verifyMetaWebhookSignature(
      {
        headers: {},
      },
      'webhook-secret',
    );

    expect(result).toEqual({
      ok: false,
      reason: 'missing_raw_body',
    });
  });

  test('rejects requests when no signature header is provided', () => {
    const result = verifyMetaWebhookSignature(
      {
        headers: {},
        rawBody: payload,
      },
      'webhook-secret',
    );

    expect(result).toEqual({
      ok: false,
      reason: 'missing_signature',
    });
  });

  test('accepts valid sha256 signatures', () => {
    const secret = 'webhook-secret';
    const signature = `sha256=${crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')}`;

    const result = verifyMetaWebhookSignature(
      {
        headers: {
          'x-hub-signature-256': signature,
        },
        rawBody: payload,
      },
      secret,
    );

    expect(result).toEqual({
      ok: true,
      reason: 'invalid_signature',
    });
  });

  test('accepts valid sha1 signatures for Facebook webhooks', () => {
    const secret = 'webhook-secret';
    const signature = `sha1=${crypto
      .createHmac('sha1', secret)
      .update(payload)
      .digest('hex')}`;

    const result = verifyMetaWebhookSignature(
      {
        headers: {
          'x-hub-signature': signature,
        },
        rawBody: payload,
      },
      secret,
    );

    expect(result).toEqual({
      ok: true,
      reason: 'invalid_signature',
    });
  });
});

describe('Meta webhook signature enforcement mode', () => {
  test('defaults to warn-only mode so existing page messaging keeps receiving events', () => {
    expect(shouldStrictlyEnforceMetaWebhookSignature({})).toBe(false);
  });

  test('enables strict mode through the legacy boolean flag', () => {
    expect(shouldStrictlyEnforceMetaWebhookSignature({
      FACEBOOK_WEBHOOK_STRICT_SIGNATURE: 'true',
    })).toBe(true);
  });

  test('enables strict mode through the explicit mode flag', () => {
    expect(shouldStrictlyEnforceMetaWebhookSignature({
      FACEBOOK_WEBHOOK_SIGNATURE_MODE: 'strict',
      FACEBOOK_WEBHOOK_STRICT_SIGNATURE: 'false',
    })).toBe(true);
  });
});
