const crypto = require('crypto');

const PREFIX = 'enc:v1:';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

let warnedMissingKey = false;
let warnedUsingJwtFallback = false;

function getEncryptionKey() {
  const isProd = String(process.env.NODE_ENV).trim().toLowerCase() === 'production';
  const dedicated = process.env.DATA_ENCRYPTION_KEY;
  const secret = dedicated || process.env.JWT_SECRET;

  if (!secret) {
    const msg = '[FIELD-ENCRYPTION] No DATA_ENCRYPTION_KEY/JWT_SECRET configured — cannot encrypt WhatsApp authState/Meta tokens. Set DATA_ENCRYPTION_KEY.';
    if (isProd) {
      throw new Error(msg);
    }
    if (!warnedMissingKey) {
      warnedMissingKey = true;
      console.error(msg + ' Storing PLAINTEXT in non-production.');
    }
    return null;
  }

  if (!dedicated && isProd && !warnedUsingJwtFallback) {
    warnedUsingJwtFallback = true;
    console.warn('[FIELD-ENCRYPTION] Using JWT_SECRET as encryption key in production — set a dedicated DATA_ENCRYPTION_KEY so the signing key is not reused for at-rest encryption.');
  }

  return crypto.createHash('sha256').update('maxp-field-encryption-v1:' + secret).digest();
}

function encryptField(value) {
  if (value === null || value === undefined || value === '') return value;
  const key = getEncryptionKey();
  if (!key) return value;
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return PREFIX + Buffer.concat([iv, tag, encrypted]).toString('base64');
  } catch (e) {
    console.error('[FIELD-ENCRYPTION] encrypt failed:', e.message);
    return value;
  }
}

function decryptField(value) {
  if (!value || typeof value !== 'string' || !value.startsWith(PREFIX)) return value;
  const key = getEncryptionKey();
  if (!key) return value;
  try {
    const buf = Buffer.from(value.slice(PREFIX.length), 'base64');
    const iv = buf.subarray(0, IV_LENGTH);
    const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const data = buf.subarray(IV_LENGTH + TAG_LENGTH);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  } catch (e) {
    console.error('[FIELD-ENCRYPTION] decrypt failed:', e.message);
    return value;
  }
}

module.exports = { encryptField, decryptField };
