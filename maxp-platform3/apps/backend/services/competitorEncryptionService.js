const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

function getKey() {
  const secret = process.env.COMPETITOR_ENCRYPTION_KEY || 'dev-default-key-change-in-production-32';
  return crypto.scryptSync(secret, 'salt', 32);
}

class CompetitorEncryptionService {
  static encrypt(text) {
    if (!text) return null;
    const key = getKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag().toString('hex');
    return { encrypted, iv: iv.toString('hex'), tag };
  }

  static decrypt(encrypted, iv, tag) {
    if (!encrypted || !iv || !tag) return null;
    try {
      const key = getKey();
      const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'hex'));
      decipher.setAuthTag(Buffer.from(tag, 'hex'));
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch {
      return null;
    }
  }

  static encryptField(text) {
    const result = this.encrypt(text);
    if (!result) return null;
    return JSON.stringify(result);
  }

  static decryptField(stored) {
    if (!stored) return null;
    try {
      const { encrypted, iv, tag } = JSON.parse(stored);
      return this.decrypt(encrypted, iv, tag);
    } catch {
      return null;
    }
  }
}

module.exports = CompetitorEncryptionService;
