const crypto = require('crypto');
const {
  shouldStrictlyEnforceMetaWebhookSignature,
  shouldStrictlyEnforceFacebookWebhookSignature,
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

describe('WhatsApp webhook signature enforcement mode', () => {
  test('defaults to disabled (opt-in — lets WhatsApp webhooks through without App Secret)', () => {
    expect(shouldStrictlyEnforceMetaWebhookSignature({})).toBe(false);
  });

  test('stays disabled in production unless explicitly opted in', () => {
    expect(shouldStrictlyEnforceMetaWebhookSignature({
      NODE_ENV: 'production',
    })).toBe(false);
  });

  test('enables strict mode through META_WA_WEBHOOK_STRICT flag', () => {
    expect(shouldStrictlyEnforceMetaWebhookSignature({
      META_WA_WEBHOOK_STRICT: 'true',
    })).toBe(true);
  });

  test('enables strict mode through the legacy META_WEBHOOK_STRICT flag', () => {
    expect(shouldStrictlyEnforceMetaWebhookSignature({
      META_WEBHOOK_STRICT: 'true',
    })).toBe(true);
  });

  test('remains disabled when opt-out flag is set', () => {
    expect(shouldStrictlyEnforceMetaWebhookSignature({
      META_WA_WEBHOOK_STRICT: 'false',
    })).toBe(false);
  });
});

describe('Facebook (Messenger) webhook signature enforcement mode', () => {
  test('defaults to enabled (default-on to keep Messenger stable)', () => {
    expect(shouldStrictlyEnforceFacebookWebhookSignature({})).toBe(true);
  });

  test('mandatory in production — ignores opt-out flags', () => {
    expect(shouldStrictlyEnforceFacebookWebhookSignature({
      NODE_ENV: 'production',
      FACEBOOK_WEBHOOK_STRICT_SIGNATURE: 'false',
      FACEBOOK_WEBHOOK_SIGNATURE_MODE: 'warn',
    })).toBe(true);
  });

  test('enables strict mode through FACEBOOK_WEBHOOK_SIGNATURE_MODE flag', () => {
    expect(shouldStrictlyEnforceFacebookWebhookSignature({
      FACEBOOK_WEBHOOK_SIGNATURE_MODE: 'strict',
    })).toBe(true);
  });

  test('allows opting out in non-production environments', () => {
    expect(shouldStrictlyEnforceFacebookWebhookSignature({
      NODE_ENV: 'development',
      FACEBOOK_WEBHOOK_STRICT_SIGNATURE: 'false',
    })).toBe(false);
  });
});
