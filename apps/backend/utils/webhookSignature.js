const crypto = require('crypto');

function safeTimingEqual(a, b) {
  try {
    const left = Buffer.from(String(a || ''));
    const right = Buffer.from(String(b || ''));
    if (left.length !== right.length) {
      return false;
    }
    return crypto.timingSafeEqual(left, right);
  } catch (_) {
    return false;
  }
}

function getRawBody(req) {
  if (typeof req?.rawBody === 'string' && req.rawBody.length > 0) {
    return req.rawBody;
  }

  if (Buffer.isBuffer(req?.rawBody) && req.rawBody.length > 0) {
    return req.rawBody.toString('utf8');
  }

  return null;
}

function verifyMetaWebhookSignature(req, secret) {
  if (!secret) {
    return { ok: false, reason: 'missing_secret' };
  }

  const rawBody = getRawBody(req);
  if (!rawBody) {
    return { ok: false, reason: 'missing_raw_body' };
  }

  const signature256 = req.headers['x-hub-signature-256'];
  if (typeof signature256 === 'string' && signature256) {
    const expected = `sha256=${crypto.createHmac('sha256', secret).update(rawBody).digest('hex')}`;
    return {
      ok: safeTimingEqual(signature256, expected),
      reason: 'invalid_signature'
    };
  }

  const signature1 = req.headers['x-hub-signature'];
  if (typeof signature1 === 'string' && signature1) {
    const expected = `sha1=${crypto.createHmac('sha1', secret).update(rawBody).digest('hex')}`;
    return {
      ok: safeTimingEqual(signature1, expected),
      reason: 'invalid_signature'
    };
  }

  return { ok: false, reason: 'missing_signature' };
}

// WhatsApp Cloud webhook — opt-in (default معطّل) عشان معظم الـ deployments
// بتستخدم Baileys أو لسه مش ضابطة META_WA_APP_SECRET. للتفعيل: META_WA_WEBHOOK_STRICT=true
function shouldStrictlyEnforceMetaWebhookSignature(env = process.env) {
  const mode = String(
    env.META_WA_WEBHOOK_STRICT ||
      env.META_WEBHOOK_STRICT ||
      ''
  )
    .trim()
    .toLowerCase();

  if (['strict', 'enforce', 'required', 'true', '1', 'yes'].includes(mode)) {
    return true;
  }

  return false;
}

// Facebook (Messenger/Pages) webhook — default شغّال (default-on) للمحافظة على الوضع المستقر.
// للإلغاء: FACEBOOK_WEBHOOK_STRICT=false (بس مش بيشتغل في production عشان الأمان).
function shouldStrictlyEnforceFacebookWebhookSignature(env = process.env) {
  // In production, signature enforcement is mandatory — ignore any opt-out env flag.
  // Otherwise an operator could disable the only defense against forged webhooks.
  if (String(env.NODE_ENV).trim().toLowerCase() === 'production') {
    return true;
  }

  const mode = String(env.FACEBOOK_WEBHOOK_SIGNATURE_MODE || '')
    .trim()
    .toLowerCase();

  if (mode) {
    return ['strict', 'enforce', 'required', 'true', '1', 'yes'].includes(mode);
  }

  const strictVar = String(env.FACEBOOK_WEBHOOK_STRICT_SIGNATURE || '')
    .trim()
    .toLowerCase();

  if (strictVar === 'false' || strictVar === '0' || strictVar === 'no') {
    return false;
  }

  return true;
}

module.exports = {
  shouldStrictlyEnforceMetaWebhookSignature,
  shouldStrictlyEnforceFacebookWebhookSignature,
  verifyMetaWebhookSignature
};
