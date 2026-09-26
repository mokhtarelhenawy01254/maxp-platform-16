/**
 * Voice Call Helpers
 * Normalization, calling window verification, and secure DB-backed credentials resolution.
 */

const { getSharedPrismaClient } = require('../sharedDatabase');

const DEFAULT_SETTINGS = {
  enabled: true,
  provider: 'VAPI',
  startHour: 10,
  endHour: 22,
  agentVoice: 'eleven_multilingual_v2',
  maxCallsNoAnswer: 3,
  intervalMinutes: 30,
};

/**
 * Standardize telephone numbers to E.164 international format (+20... / +966...)
 */
function normalizeCallingPhone(phone, defaultCountryCode = '20') {
  if (!phone) return '';
  let cleaned = String(phone).trim().replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) return cleaned;

  if (cleaned.startsWith('00')) {
    return `+${cleaned.substring(2)}`;
  }
  // Egyptian mobile format: 01xxxxxxxxx (11 digits)
  if (/^01[0125]\d{8}$/.test(cleaned)) {
    return `+20${cleaned.substring(1)}`;
  }
  // Saudi mobile format: 05xxxxxxxx (10 digits)
  if (/^05\d{8}$/.test(cleaned)) {
    return `+966${cleaned.substring(1)}`;
  }
  if (!cleaned.startsWith(defaultCountryCode)) {
    return `+${defaultCountryCode}${cleaned}`;
  }
  return `+${cleaned}`;
}

/**
 * Check if current time falls within allowed calling window
 */
function isCallingWindowPermitted(settings = {}, now = new Date()) {
  const currentHour = now.getHours();
  const startHour = settings.startHour ?? DEFAULT_SETTINGS.startHour;
  const endHour = settings.endHour ?? DEFAULT_SETTINGS.endHour;

  if (startHour <= endHour) {
    return currentHour >= startHour && currentHour < endHour;
  }
  return currentHour >= startHour || currentHour < endHour;
}

/**
 * Safely resolve Voice API credentials from PostgreSQL (public.ai_keys)
 * Strictly conforms to platform security law: never read AI keys from .env
 */
async function resolveVoiceCredentials(companyId, provider = 'VAPI') {
  const prisma = getSharedPrismaClient();
  const providerUpper = String(provider).toUpperCase();

  try {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT id, "apiKey", name, "keyType", "companyId" 
       FROM public.ai_keys 
       WHERE ("companyId" = $1 OR "keyType" = 'CENTRAL')
         AND (provider::text ILIKE $2 OR name ILIKE $3)
         AND "isActive" = true 
       ORDER BY priority ASC LIMIT 1`,
      companyId,
      `%${providerUpper}%`,
      `%${providerUpper}%`
    );

    if (rows && rows.length > 0) {
      return {
        apiKey: rows[0].apiKey,
        keyId: rows[0].id,
        keyName: rows[0].name,
      };
    }
  } catch (error) {
    console.warn('[VOICE-CALL] Could not resolve key from ai_keys:', error.message);
  }

  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { settings: true },
    });
    if (company?.settings) {
      const parsedSettings = typeof company.settings === 'string' ? JSON.parse(company.settings) : company.settings;
      const voiceConfig = parsedSettings.voiceIntegration || parsedSettings.vapi || {};
      if (voiceConfig.apiKey) {
        return { apiKey: voiceConfig.apiKey, keyId: 'company_settings', keyName: 'Company Voice Key' };
      }
    }
  } catch (err) {
    console.warn('[VOICE-CALL] Could not read company settings:', err.message);
  }

  return null;
}

module.exports = {
  DEFAULT_SETTINGS,
  normalizeCallingPhone,
  isCallingWindowPermitted,
  resolveVoiceCredentials,
};
